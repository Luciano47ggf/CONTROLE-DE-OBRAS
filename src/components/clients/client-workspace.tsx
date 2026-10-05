"use client";

import { useState } from "react";
import Link from "next/link";
import { SpaceOccupantsCard } from "./space-occupants-card";
import { RecommendationCard } from "./recommendation-card";
import { HistoryTimeline } from "./history-timeline";
import { plural, swapText } from "@/lib/format";
import type { ClientWorkspace } from "@/lib/queries";
import type { ActiveInstallationRow } from "@/lib/types";

const TABS = ["visao", "espacos", "sugestoes", "historico"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  visao: "Visão geral",
  espacos: "Espaços e obras",
  sugestoes: "Sugestões",
  historico: "Histórico",
};

/** As 4 abas do cliente, compartilhadas entre o painel lateral e a página maximizada */
export function ClientWorkspaceView({
  data,
  canWrite,
  variant = "page",
}: {
  data: ClientWorkspace;
  canWrite: boolean;
  variant?: "drawer" | "page";
}) {
  const [tab, setTab] = useState<Tab>("visao");
  const { client, spaces, occupants, recommendations, events } = data;

  const occupantsBySpace = new Map<string, ActiveInstallationRow[]>();
  for (const o of occupants) {
    const list = occupantsBySpace.get(o.space_id) ?? [];
    list.push(o);
    occupantsBySpace.set(o.space_id, list);
  }

  const nextSwap = occupants
    .map((o) => o.days_remaining)
    .filter((d) => d !== null)
    .sort((a, b) => a - b)[0];

  const gridCols = variant === "drawer" ? "grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-3";

  return (
    <div>
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Abas do cliente">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-current={tab === t ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </nav>

      {tab === "visao" && (
        <div className="space-y-8">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line [&>*]:bg-paper">
            <div className="px-4 py-3">
              <p className="font-serif text-2xl font-medium tabular-nums">{spaces.length}</p>
              <p className="text-xs text-muted">{plural(spaces.length, "espaço", "espaços")}</p>
            </div>
            <div className="px-4 py-3">
              <p className="font-serif text-2xl font-medium tabular-nums">{occupants.length}</p>
              <p className="text-xs text-muted">{plural(occupants.length, "obra em exibição", "obras em exibição")}</p>
            </div>
            <div className="px-4 py-3">
              <p className="font-serif text-lg font-medium">{nextSwap === undefined ? "—" : swapText(nextSwap)}</p>
              <p className="text-xs text-muted">Próxima troca</p>
            </div>
          </div>

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="title-serif text-lg">Espaços e obras</h3>
              {spaces.length > 3 && (
                <button type="button" className="link text-sm" onClick={() => setTab("espacos")}>Ver todos →</button>
              )}
            </div>
            {spaces.length === 0 ? (
              <p className="text-muted">Nenhum espaço cadastrado.</p>
            ) : (
              <div className={`grid gap-4 ${gridCols}`}>
                {spaces.slice(0, 3).map((s) => (
                  <SpaceOccupantsCard key={s.id} space={s} occupants={occupantsBySpace.get(s.id) ?? []} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="title-serif text-lg">Obras recomendadas</h3>
              {recommendations.length > 4 && (
                <button type="button" className="link text-sm" onClick={() => setTab("sugestoes")}>Ver todas →</button>
              )}
            </div>
            {recommendations.length === 0 ? (
              <p className="text-muted">Nenhuma obra disponível cabe nos espaços deste cliente agora.</p>
            ) : (
              <div className={`grid gap-4 ${gridCols}`}>
                {recommendations.slice(0, 4).map((r) => (
                  <RecommendationCard key={r.artwork_id} r={r} clientId={client.id} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "espacos" && (
        <div>
          {canWrite && (
            <div className="mb-4 text-right">
              <Link href={`/clientes/${client.id}/espacos/novo`} className="btn-primary">Adicionar espaço</Link>
            </div>
          )}
          {spaces.length === 0 ? (
            <p className="text-muted">Nenhum espaço cadastrado.</p>
          ) : (
            <div className={`grid gap-4 ${gridCols}`}>
              {spaces.map((s) => (
                <SpaceOccupantsCard key={s.id} space={s} occupants={occupantsBySpace.get(s.id) ?? []} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "sugestoes" && (
        <div>
          <p className="mb-4 max-w-prose text-sm text-muted">
            Obras disponíveis que cabem em algum espaço deste cliente, sem repetir obras já exibidas aqui — a não ser
            que a repetição seja liberada manualmente.
          </p>
          {recommendations.length === 0 ? (
            <p className="text-muted">Nenhuma obra disponível cabe nos espaços deste cliente agora.</p>
          ) : (
            <div className={`grid gap-4 ${gridCols}`}>
              {recommendations.map((r) => (
                <RecommendationCard key={r.artwork_id} r={r} clientId={client.id} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "historico" && <HistoryTimeline events={events} />}
    </div>
  );
}
