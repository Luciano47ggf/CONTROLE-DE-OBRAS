"use client";

import { useState } from "react";
import Link from "next/link";
import { Photo, EmptyState } from "@/components/ui";
import { WallPreview } from "@/components/wall-preview";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { BlockedBadge } from "@/components/clients/release-repeat";
import { InstallForm } from "@/components/movements/install-form";
import { dims, historyReason, plural } from "@/lib/format";
import type { Recommendation } from "@/lib/types";

const PAGE_SIZE = 12;

/** Lista de obras sugeridas para um ponto de exposição, com busca por código/título/artista/categoria */
export function SpaceRecommendations({
  recommendations,
  spaceId,
  clientId,
  canWrite,
  occupiedBy,
  defaultSwapDays,
  wallW,
  wallH,
  margin,
}: {
  recommendations: Recommendation[];
  spaceId: string;
  clientId: string;
  canWrite: boolean;
  occupiedBy: string | null;
  defaultSwapDays: number;
  wallW: number;
  wallH: number;
  margin: number;
}) {
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? recommendations.filter(
        (r) =>
          r.code.toLowerCase().includes(needle) ||
          r.title.toLowerCase().includes(needle) ||
          r.artist_name.toLowerCase().includes(needle) ||
          (r.category_name ?? "").toLowerCase().includes(needle),
      )
    : recommendations;
  const visible = needle || showAll ? filtered : filtered.slice(0, PAGE_SIZE);

  return (
    <>
      <div className="mb-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por código, título, artista ou categoria…"
          className="input max-w-md"
          aria-label="Buscar obra"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={needle ? "Nenhuma obra encontrada" : "Nenhuma obra disponível cabe aqui"}>
          {needle ? (
            "Nenhuma obra sugerida bate com essa busca."
          ) : (
            <>
              Todas as obras compatíveis estão instaladas, reservadas ou em manutenção. Confira o <Link href="/obras" className="link">estoque</Link> ou revise as medidas do espaço.
            </>
          )}
        </EmptyState>
      ) : (
        <ol className="space-y-4">
          {visible.map((r, i) => (
            <li key={r.artwork_id} className="panel">
              <div className="grid gap-5 p-5 md:grid-cols-[120px_minmax(0,1fr)_140px_110px] md:items-center">
                <Photo path={r.photo_thumb_path} alt={r.title} className="aspect-square w-full max-w-[120px] rounded-sm" />
                <div className="min-w-0">
                  <Link href={`/obras/${r.artwork_id}`} className="title-serif text-xl hover:underline">{r.title}</Link>
                  <p className="text-sm text-muted">
                    {r.artist_name}, {r.code}{r.category_name ? `, ${r.category_name.toLowerCase()}` : ""}
                  </p>
                  <p className="mt-1 text-sm">{dims(r.width_cm, r.height_cm)}</p>
                  {r.blocked && (
                    <div className="mt-2">
                      <BlockedBadge artworkId={r.artwork_id} clientId={clientId} />
                    </div>
                  )}
                  <ul className="mt-2 space-y-0.5 text-sm text-muted">
                    <li>{historyReason(r)}</li>
                    <li>Parada no estoque há {plural(r.idle_days, "dia", "dias")}</li>
                  </ul>
                  <div className="mt-4 max-w-md"><ScoreBreakdown rec={r} /></div>
                </div>
                <div className="hidden h-24 items-center justify-center bg-wall p-2 md:flex">
                  <WallPreview wallW={wallW} wallH={wallH} artW={r.width_cm} artH={r.height_cm}
                    margin={margin} className="h-full max-w-full" title={`${r.title} na parede`} />
                </div>
                <div className="md:text-right">
                  <p className="font-serif text-4xl font-medium tabular-nums">{Math.round(r.score_total)}%</p>
                  <p className="text-sm text-muted">{r.blocked ? "bloqueada" : !needle && i === 0 ? "melhor opção" : "compatível"}</p>
                </div>
              </div>
              {canWrite && !r.blocked && (
                <details className="border-t border-line">
                  <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-accent">Instalar esta obra</summary>
                  <div className="px-5 pb-5">
                    <InstallForm artworkId={r.artwork_id} spaceId={spaceId} occupiedBy={occupiedBy} defaultSwapDays={defaultSwapDays} />
                  </div>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}

      {!needle && !showAll && filtered.length > PAGE_SIZE && (
        <button type="button" onClick={() => setShowAll(true)} className="btn-secondary mt-4">
          Ver mais sugestões ({filtered.length - PAGE_SIZE})
        </button>
      )}
    </>
  );
}
