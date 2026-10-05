import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, SwapIndicator, EmptyState } from "@/components/ui";
import { date, plural, swapRowClass, swapText, swapUrgency } from "@/lib/format";
import type { ActiveInstallationRow, SwapStatus } from "@/lib/types";

const FILTERS: { value: SwapStatus | "todas"; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "vermelho", label: "Vencidas" },
  { value: "amarelo", label: "Próximas" },
  { value: "verde", label: "No prazo" },
];

export default async function SwapsPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { filtro = "todas" } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("v_active_installations").select("*").order("expected_swap_at").limit(1000);
  const all = (data ?? []) as ActiveInstallationRow[];
  const counts = { vermelho: 0, amarelo: 0, verde: 0 } as Record<SwapStatus, number>;
  all.forEach((r) => counts[r.swap_status]++);
  const rows = filtro === "todas" ? all : all.filter((r) => r.swap_status === filtro);

  return (
    <>
      <PageHeader title="Trocas" subtitle={`${plural(all.length, "obra instalada", "obras instaladas")}, ordenadas pela data prevista`} />

      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Filtro de prazo">
        {FILTERS.map((f) => (
          <Link key={f.value} href={f.value === "todas" ? "/trocas" : `/trocas?filtro=${f.value}`}
            aria-current={filtro === f.value ? "page" : undefined}
            className={filtro === f.value ? "btn-primary" : "btn-secondary"}>
            {f.label}{f.value !== "todas" && <span className="tabular-nums opacity-70">{counts[f.value]}</span>}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState title={filtro === "vermelho" ? "Nenhuma troca vencida" : "Nada por aqui"}>
          {filtro === "vermelho" ? "Todas as obras instaladas estão dentro do prazo." : "Nenhuma instalação neste filtro."}
        </EmptyState>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="table">
            <thead><tr><th>Cliente e espaço</th><th>Obra</th><th>Instalada em</th><th>Troca prevista</th><th>Prazo</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.installation_id} className={swapRowClass(r.days_remaining)}>
                  <td>
                    <Link href={`/clientes/${r.client_id}`} className="font-medium hover:underline">{r.client_name}</Link>
                    <span className="block text-muted">{r.space_name}</span>
                  </td>
                  <td><Link href={`/obras/${r.artwork_id}`} className="font-serif text-base hover:underline">{r.artwork_title}</Link></td>
                  <td className="tabular-nums">{date(r.installed_at)}</td>
                  <td className="tabular-nums">{date(r.expected_swap_at)}</td>
                  <td><SwapIndicator status={swapUrgency(r.swap_status, r.days_remaining)}>{swapText(r.days_remaining)}</SwapIndicator></td>
                  <td className="text-right"><Link href={`/espacos/${r.space_id}`} className="btn-secondary">Encontrar nova obra</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
