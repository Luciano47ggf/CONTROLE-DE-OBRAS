import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { PageHeader, Stat, SwapIndicator, EmptyState } from "@/components/ui";
import { date, swapText, STATUS_LABEL } from "@/lib/format";
import type { ActiveInstallationRow, Dashboard, MovementRow } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const canWrite = !!(await getCurrentUser())?.canWrite;
  const [dash, swaps, moves] = await Promise.all([
    supabase.from("v_dashboard").select("*").single(),
    supabase.from("v_active_installations").select("*").order("expected_swap_at").limit(12),
    supabase.from("v_movements").select("*").order("occurred_at", { ascending: false }).limit(8),
  ]);
  const d = (dash.data ?? {}) as Dashboard;
  const upcoming = (swaps.data ?? []) as ActiveInstallationRow[];
  const recent = (moves.data ?? []) as MovementRow[];

  return (
    <>
      <PageHeader
        title="Visão geral"
        subtitle={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        actions={canWrite && <Link href="/obras/nova" className="btn-primary">Cadastrar obra</Link>}
      />

      <section aria-label="Acervo" className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3 lg:grid-cols-5 [&>*]:bg-paper">
        <Stat label="Obras no acervo" value={d.total_artworks ?? 0} href="/obras?status=todas" />
        <Stat label="Disponíveis" value={d.available ?? 0} href="/obras?status=disponivel" />
        <Stat label="Instaladas" value={d.installed ?? 0} href="/obras?status=instalada" />
        <Stat label="Reservadas ou em trânsito" value={(d.reserved ?? 0) + (d.in_transit ?? 0)} href="/obras?status=reservada" />
        <Stat label="Em manutenção ou restauro" value={d.maintenance ?? 0} href="/obras?status=em_manutencao" />
      </section>

      <section aria-label="Clientes e trocas" className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line lg:grid-cols-4 [&>*]:bg-paper">
        <Stat label="Clientes ativos" value={d.active_clients ?? 0} href="/clientes" />
        <Stat label="Espaços cadastrados" value={d.spaces ?? 0} href="/clientes" />
        <Stat label="Trocas próximas" value={d.swaps_due_soon ?? 0} href="/trocas?filtro=amarelo" tone="warn" />
        <Stat label="Trocas vencidas" value={d.swaps_overdue ?? 0} href="/trocas?filtro=vermelho" tone="bad" />
      </section>

      <div className="mt-10 grid gap-10 xl:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="title-serif text-xl">Próximas trocas</h2>
            <Link href="/trocas" className="link text-sm">Ver todas</Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState title="Nenhuma obra instalada">
              Quando uma obra for instalada em um cliente, o prazo de troca aparece aqui.
            </EmptyState>
          ) : (
            <div className="panel overflow-x-auto">
              <table className="table">
                <thead>
                  <tr><th>Cliente e espaço</th><th>Obra</th><th>Data prevista</th><th>Prazo</th></tr>
                </thead>
                <tbody>
                  {upcoming.map((r) => (
                    <tr key={r.installation_id}>
                      <td>
                        <Link href={`/clientes/${r.client_id}`} className="font-medium hover:underline">{r.client_name}</Link>
                        <span className="block text-muted">{r.space_name}</span>
                      </td>
                      <td>
                        <Link href={`/obras/${r.artwork_id}`} className="font-serif text-base hover:underline">{r.artwork_title}</Link>
                      </td>
                      <td className="tabular-nums">{date(r.expected_swap_at)}</td>
                      <td><SwapIndicator status={r.swap_status}>{swapText(r.days_remaining)}</SwapIndicator></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="title-serif mb-3 text-xl">Movimentações recentes</h2>
          {recent.length === 0 ? (
            <p className="text-muted">Nenhuma movimentação registrada ainda.</p>
          ) : (
            <ol className="panel divide-y divide-line">
              {recent.map((m) => (
                <li key={m.id} className="px-4 py-3 text-sm">
                  <Link href={`/obras/${m.artwork_id}`} className="font-medium hover:underline">{m.artwork_title}</Link>
                  <span className="text-muted">
                    {" "}
                    {m.from_status ? `${STATUS_LABEL[m.from_status]} para ` : "Entrou como "}
                    {STATUS_LABEL[m.to_status].toLowerCase()}
                    {m.client_name ? `, ${m.client_name} (${m.space_name})` : ""}
                  </span>
                  <span className="block text-xs text-muted">{date(m.occurred_at)}{m.user_name ? `, por ${m.user_name}` : ""}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
