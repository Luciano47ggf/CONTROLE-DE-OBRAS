# Arquitetura do sistema de circulação de obras

## 1. Visão geral

```
Navegador ──► Next.js 16 (Vercel)
               ├─ proxy.ts ............ renova sessão e protege rotas
               ├─ Server Components ... leitura (views do Postgres)
               └─ Server Actions ...... validação (zod) + chamadas RPC
                         │
                         ▼
              Supabase
               ├─ Auth ................ login e-mail/senha
               ├─ PostgreSQL .......... tabelas, regras (plpgsql), views, RLS
               └─ Storage ............. bucket "acervo" (fotos)
```

Princípio central: **o banco é a fonte da verdade das regras**. A interface e as
Server Actions validam para dar boa mensagem, mas quem decide se uma obra pode ser
instalada, reservada ou retirada são as funções do Postgres. Mesmo chamando a API do
Supabase diretamente, ninguém consegue mudar status sem gerar movimentação.

## 2. Entidades e relacionamentos

```
artists 1──N artworks N──1 categories
                │
                │ 1
                │
                N
clients 1──N client_spaces 1──N installations N──1 artworks
                │                     │
space_types 1──N┘                     │ 1
     │                                N
     N── space_type_categories ──N categories
                                artwork_movements (artwork, space?, installation?)

profiles 1──1 auth.users          app_settings (linha única)
```

| Tabela | Papel |
|---|---|
| `artworks` | Obra. `status` é o único estado guardado; muda só via funções |
| `installations` | Cada passagem de uma obra por um espaço. `removed_at` nulo = instalação ativa |
| `artwork_movements` | Log imutável de toda mudança de status |
| `client_spaces` | Parede/ambiente com largura e altura (cm) |
| `space_type_categories` | Categorias preferidas por tipo de espaço (10 pts da nota) |
| `app_settings` | Margem, prazos, janela de histórico, ociosidade máxima |

### Sem duplicação de dados

- **Localização atual** não é coluna: é a instalação ativa (`removed_at is null`).
- **Histórico da obra e do cliente** são a mesma view (`v_installation_history`)
  filtrada por `artwork_id` ou `client_id`. O cliente vem do espaço, nunca é copiado.
- **Data da última troca / próxima troca do espaço** vêm da instalação ativa.
- **Tempo no estoque** = hoje − `status_changed_at` (atualizado pelas funções).

### Integridade garantida pelo banco

- Índice único parcial: uma obra só tem uma instalação ativa; um espaço também.
- `on delete restrict` em tudo que tem histórico (obra, espaço, cliente, artista).
- CHECKs: dimensões positivas, CPF/CNPJ com 11/14 dígitos, reserva exige destino,
  datas de retirada ≥ instalação.
- Privilégios por coluna: o papel `authenticated` não pode dar UPDATE em
  `artworks.status`, nem INSERT em `installations`/`artwork_movements`.

## 3. Regras de negócio (supabase/migrations/0002)

| Função | Transição |
|---|---|
| `reserve_artwork(obra, espaço)` | disponível → reservada (confere tamanho) |
| `dispatch_artwork(obra)` | reservada → em transporte |
| `cancel_reservation(obra)` | reservada/em transporte → disponível |
| `install_artwork(obra, espaço, data, prazo, resp., obs., substituir)` | disponível/reservada/em transporte → instalada |
| `return_artwork(instalação, data, novo_status)` | instalada → disponível/em transporte/manutenção/restauração/indisponível |
| `set_artwork_status(obra, status)` | transições de estoque (manutenção, restauração, indisponível, disponível) |

Todas travam a linha da obra (`for update`), validam, gravam a instalação quando for o
caso e registram a movimentação com `auth.uid()` na mesma transação.

Prazo de troca, do mais específico ao mais geral: informado na instalação → espaço →
cliente → configuração global.

Papéis: `admin` (tudo, inclusive configurações), `operador` (cadastros e
movimentações), `leitura` (só consulta). O primeiro usuário criado vira admin.

## 4. Algoritmo de recomendação (`recommend_artworks`)

Filtro obrigatório: status `disponivel` **e** a obra cabe na área útil
(largura e altura do espaço menos 2 × margem).

| Critério | Pontos | Cálculo |
|---|---|---|
| Tamanho | 40 | `40 × √(área obra ÷ área útil)`. Preencher toda a área útil = 40 |
| Histórico | 30 | Nunca esteve no cliente = 30. Já esteve = `24 × min(dias desde a saída ÷ janela, 1) − 3 × (passagens − 1)`, mínimo 0 |
| Ociosidade | 20 | `20 × min(dias parada ÷ ociosidade máxima, 1)` |
| Categoria | 10 | Tipo sem preferência = 5; categoria preferida = 10; outra = 0 |

Por que a raiz quadrada no tamanho: a razão de áreas pune demais obras médias
(uma obra com metade da largura e metade da altura teria 25% da área). A raiz
equivale à média geométrica do preenchimento linear, que corresponde melhor à
percepção de "a obra ocupa bem a parede".

Por que o histórico tem teto de 24: uma obra que passou pelo cliente há muito tempo
nunca empata com uma inédita, como pedido (inéditas primeiro, antigas depois,
recentes por último), mas também nunca é bloqueada.

Desempate: mais tempo parada, depois código. O cálculo é uma única consulta SQL
apoiada no índice `(status, width_cm, height_cm)`; escala para milhares de obras.

## 5. Telas

| Rota | Conteúdo |
|---|---|
| `/login` | Entrada |
| `/` | Indicadores, próximas trocas, movimentações recentes |
| `/obras` | Estoque: abas por situação, filtros (busca, artista, categoria, medidas máximas, tempo no status), ordenação, paginação |
| `/obras/nova`, `/obras/[id]/editar` | Cadastro |
| `/obras/[id]` | Foto, etiqueta, localização atual, ações conforme status, por onde passou, movimentações |
| `/clientes` | Lista com espaços ocupados e trocas vencidas |
| `/clientes/[id]` | Página visual: cartão por espaço com desenho em escala, obra atual, prazo, botão de sugestões; histórico do cliente |
| `/clientes/[id]/espacos/novo`, `/espacos/[id]/editar` | Cadastro de espaço com prévia em escala |
| `/espacos/[id]` | Situação atual, retirada, adiar troca, **obras sugeridas** com nota detalhada e instalação/reserva |
| `/trocas` | Semáforo verde/amarelo/vermelho |
| `/artistas` | Lista e cadastro |
| `/configuracoes` | Margem, prazos, pesos; categorias; preferências por tipo de espaço |

## 6. Pastas

```
supabase/
  migrations/  0001 esquema · 0002 regras · 0003 views+RLS · 0004 storage
  seed.sql     dados de exemplo
src/
  proxy.ts                 sessão + proteção de rotas (Next 16)
  app/
    login/                 página, formulário, action
    (app)/                 área autenticada (layout com sidebar)
      page.tsx             dashboard
      obras/ clientes/ espacos/ trocas/ artistas/ configuracoes/
        actions.ts         Server Actions do módulo
        *-form.tsx         formulários (client components)
  components/
    ui.tsx                 cabeçalho, badges, campos, foto, estatística
    wall-preview.tsx       parede em escala (SVG)
    space-card.tsx, score-breakdown.tsx, sidebar.tsx
    movements/             instalar, retirar, adiar, status
  lib/
    supabase/              clientes server/proxy
    types.ts format.ts form.ts queries.ts storage.ts
```

## 7. Usuários (fase 2, migration 0005)

`profiles` ganhou `email` (espelho de `auth.users`, sincronizado por gatilho) e `active`.
`can_write()` e `is_admin()` exigem perfil ativo, então desativar alguém corta a escrita
na mesma hora, mesmo com sessão aberta. O gatilho `profiles_guard_role` impede que
não-admins mudem papel ou situação e que o sistema fique sem administrador ativo.

A API administrativa do Auth (chave de serviço, `lib/supabase/admin.ts`) só é usada para
o que o banco não alcança: criar a conta, bloquear o login e redefinir senha. Mudanças
de papel e situação passam pela sessão do admin, ou seja, pelas mesmas regras testadas.

## 8. Qualidade

- `supabase/tests/database/*.test.sql`: 95 asserções pgTAP. Cada arquivo roda numa
  transação desfeita ao final, troca de papel (`authenticated`, `anon`) e simula o JWT,
  exercitando RLS e privilégios reais.
- Prova reversa feita durante o desenvolvimento: removendo a margem de `fits_space` ou
  a gravação de `removed_at`, a suíte falha. Ela também revelou que a regra de encaixe
  existia em dois lugares; um teste de consistência agora garante que concordem.
- `database.types.ts` gerado pela CLI; `types.ts` só declara o que o gerador não
  consegue inferir (colunas não nulas de views).
- CI: testes do banco, tipos em dia, typecheck e build.

## 9. Próximos passos sugeridos

- Testes de interface ponta a ponta (Playwright) contra um Supabase local.
- Fotos múltiplas por obra e miniaturas (transformações de imagem do Supabase).
- Agenda de trocas por rota/dia para a equipe de montagem.
- Evoluir a nota: cor/estilo, preferências do cliente, rotação de artistas.
