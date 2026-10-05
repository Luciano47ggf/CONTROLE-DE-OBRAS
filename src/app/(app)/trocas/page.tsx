import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { SwapsBoard } from "./swaps-board";
import { plural } from "@/lib/format";
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

      <SwapsBoard
        rows={rows}
        emptyTitle={filtro === "vermelho" ? "Nenhuma troca vencida" : "Nada por aqui"}
        emptyText={filtro === "vermelho" ? "Todas as obras instaladas estão dentro do prazo." : "Nenhuma instalação neste filtro."}
      />
    </>
  );
}
