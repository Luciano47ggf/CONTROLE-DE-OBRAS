import type { Recommendation } from "@/lib/types";

const PARTS = [
  { key: "score_size", label: "Tamanho", max: 40 },
  { key: "score_history", label: "Histórico", max: 30 },
  { key: "score_idle", label: "Tempo parada", max: 20 },
  { key: "score_category", label: "Categoria", max: 10 },
] as const;

/** Barra única dividida nos quatro critérios, proporcional ao peso de cada um */
export function ScoreBreakdown({ rec }: { rec: Recommendation }) {
  return (
    <div>
      <div className="flex h-2 w-full gap-0.5" aria-hidden>
        {PARTS.map((p) => {
          const v = Number(rec[p.key]);
          return (
            <div key={p.key} className="h-full bg-line" style={{ flexGrow: p.max }}>
              <div className="h-full bg-accent" style={{ width: `${(v / p.max) * 100}%` }} />
            </div>
          );
        })}
      </div>
      <dl className="mt-2 grid grid-cols-4 gap-1 text-xs">
        {PARTS.map((p) => (
          <div key={p.key}>
            <dt className="text-muted">{p.label}</dt>
            <dd className="tabular-nums">{Number(rec[p.key]).toLocaleString("pt-BR")} de {p.max}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
