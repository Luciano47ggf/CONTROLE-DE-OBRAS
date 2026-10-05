# Acervo · Circulação de obras

Sistema de gestão de acervo, instalações e rodízio de obras de arte em clientes, com
recomendação determinística de obras por espaço.

Stack: Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 ·
Supabase (Postgres, Auth, Storage) · deploy na Vercel.

A arquitetura, o modelo de dados e o algoritmo estão em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Como rodar

1. **Crie um projeto no Supabase.**
2. **Aplique as migrations**, em ordem, no SQL Editor (ou `supabase db push` com a CLI):
   `0001_schema.sql`, `0002_business_rules.sql`, `0003_views_security.sql`,
   `0004_storage.sql`, `0005_users.sql`, `0006_photos.sql`.
3. **Fuso horário** (prazos e "hoje" dependem disso). No SQL Editor:
   ```sql
   alter database postgres set timezone to 'America/Cuiaba';
   ```
4. **Dados de exemplo (opcional):** rode `supabase/seed.sql`.
5. **Crie o primeiro usuário** em Authentication → Users → Add user. Ele vira
   administrador automaticamente. Os demais usuários são criados pela tela **Usuários**.
6. **Variáveis de ambiente:** copie `.env.example` para `.env.local` e preencha.
   `SUPABASE_SERVICE_ROLE_KEY` (Settings → API) habilita criar usuários, bloquear login
   e redefinir senhas. Ela fica só no servidor; nunca use o prefixo `NEXT_PUBLIC_`.
7. ```bash
   npm install
   npm run dev
   ```

## Deploy na Vercel

Importe o repositório, defina `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` e `APP_TIMEZONE`, e publique. Em Supabase → Authentication → URL Configuration, cadastre
o domínio da Vercel.

## Testes e tipos

```bash
npm run db:test          # pgTAP via Supabase CLI (supabase start em execução)
npm run db:test:local    # mesmo conjunto num PostgreSQL 16 comum, sem Docker
npm run db:types         # regenera src/lib/database.types.ts do projeto remoto
npm run db:types:local   # idem, a partir de DATABASE_URL
npm run typecheck
```

`src/lib/types.ts` deriva tudo de `database.types.ts`: ao mudar uma migration,
regenere os tipos e o TypeScript aponta cada uso afetado. A CI (`.github/workflows/ci.yml`)
roda os testes do banco, falha se os tipos gerados estiverem desatualizados e faz o build.

Os testes do banco ficam em `supabase/tests/database/` (109 asserções): estrutura e RLS,
fluxo completo de movimentações, segurança por papel, notas exatas da recomendação,
gestão de usuários e fotos.

### Testes ponta a ponta (Playwright)

```bash
npm run e2e             # sobe a pilha local, faz o build e roda os testes
npm run e2e:stack:down  # derruba a pilha
```

`e2e/stack/up.sh` monta uma pilha Supabase mínima sem Docker: Postgres 16 (banco
novo, migrations reais), **GoTrue** e **PostgREST** oficiais (baixados do GitHub na
primeira vez) e um gateway que imita as rotas do Supabase. O Storage é simulado por um
servidor pequeno que grava em disco; ele exige login para escrever, mas **não aplica as
políticas RLS do bucket** (essas estão nos testes pgTAP). Requisitos: PostgreSQL 16
acessível por senha (variáveis `PG*`), Node 20+ e curl.

Os 9 cenários cobrem: login, redirecionamento e logout; a jornada completa de cadastro,
sugestão, instalação, substituição, histórico e retirada; fotos (envio, versões, rotação,
remoção de GPS, capa, ordem, legenda e exclusão); usuário de consulta, desativação e
troca de senha; e o layout no celular.

## Papéis

| Papel | Pode |
|---|---|
| Administrador | Tudo, inclusive usuários e configurações |
| Operador | Cadastros e movimentações de obras |
| Consulta | Só visualizar |

O banco garante que sempre existe ao menos um administrador ativo. Desativar alguém
corta a escrita na hora (pelo banco) e bloqueia o login (pela API do Auth); o histórico
de movimentações daquela pessoa é preservado.

## Fotos

O navegador envia o original direto ao Storage (sem passar pelo limite de 4,5 MB das
funções da Vercel). O servidor gera uma versão de exibição (até 2000 px) e uma miniatura
(480 px) em WebP com `sharp`, corrigindo a rotação e **removendo metadados como GPS**.
O original fica guardado e pode ser aberto pela galeria. Aceita JPG, PNG e WebP até
30 MB; no iPhone, a câmera em "Mais compatível" (ou o próprio Safari no envio) gera JPG.
Não depende da transformação de imagens do Supabase, que é recurso de plano pago.

## O que já funciona

### Fase 3
Várias fotos por obra com capa, ordem, legenda e miniaturas · foto do espaço visível na
página do espaço · envio direto ao Storage · testes ponta a ponta no navegador · CI com
os três níveis (banco, app, ponta a ponta).

Correções encontradas pelos testes no navegador: a página Minha conta quebrava ao abrir
(fase 2); "Sair" desconectava todos os aparelhos e agora sai só do atual; usuário
desativado agora vê o motivo ao perder o acesso; a legenda da foto agora confirma que
foi salva.

### Fase 2
Gestão de usuários (criar com senha temporária, mudar papel, desativar e reativar,
redefinir senha) · Minha conta (nome e troca de senha com confirmação da atual) ·
interface que esconde ações de escrita para quem só consulta · tipos gerados do schema ·
95 testes pgTAP · CI no GitHub Actions.

### Fase 1

Login · dashboard · clientes · espaços (com prévia em escala) · artistas · obras com foto ·
estoque com filtros · reserva, transporte, instalação, substituição e retirada ·
histórico automático da obra, do cliente e do espaço · controle de trocas com semáforo ·
recomendação por tamanho, histórico, ociosidade e categoria · configurações.

