"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Photo } from "@/components/ui";
import { BlockedBadge } from "./release-repeat";
import { InstallForm } from "@/components/movements/install-form";
import { getSpaceCandidates } from "@/app/(app)/espacos/actions";
import { dims, historyReason, plural } from "@/lib/format";
import type { Recommendation } from "@/lib/types";

/**
 * Drawer de instalação: obras recomendadas primeiro, com busca por código/título/artista/
 * categoria. Cada resultado já vem filtrado pela RPC recommend_artworks (só o que cabe e
 * está disponível); instalar usa o InstallForm existente, que chama install_artwork.
 */
export function InstallDrawer({
  spaceId,
  spaceName,
  clientId,
  occupiedBy,
  defaultSwapDays,
  onClose,
}: {
  spaceId: string;
  spaceName: string;
  clientId: string;
  occupiedBy: string | null;
  defaultSwapDays: number;
  onClose: () => void;
}) {
  const [candidates, setCandidates] = useState<Recommendation[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    getSpaceCandidates(spaceId).then((data) => {
      if (!cancelled) setCandidates(data);
    });
    return () => {
      cancelled = true;
    };
  }, [spaceId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const needle = q.trim().toLowerCase();
  const filtered = (candidates ?? []).filter((c) =>
    !needle
      ? true
      : c.code.toLowerCase().includes(needle) ||
        c.title.toLowerCase().includes(needle) ||
        c.artist_name.toLowerCase().includes(needle) ||
        (c.category_name ?? "").toLowerCase().includes(needle),
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/30" onClick={onClose} aria-hidden />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-paper shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={occupiedBy ? `Substituir obra em ${spaceName}` : `Adicionar obra em ${spaceName}`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="font-serif text-xl">{occupiedBy ? "Substituir obra" : "Adicionar obra"}</p>
            <p className="truncate text-sm text-muted">{spaceName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="btn-ghost shrink-0 px-2">
            <X size={16} />
          </button>
        </header>
        <div className="border-b border-line px-5 py-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código, título, artista ou categoria…"
            className="input"
            aria-label="Buscar obra"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {candidates === null ? (
            <p className="text-sm text-muted">Carregando…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted">
              {candidates.length === 0
                ? "Nenhuma obra disponível cabe neste ponto agora."
                : "Nenhuma obra encontrada para essa busca."}
            </p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((c) => (
                <li key={c.artwork_id} className="panel overflow-hidden">
                  <div className="flex gap-3 p-3">
                    <Photo path={c.photo_thumb_path} alt={c.title} className="h-20 w-20 shrink-0 rounded-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-base leading-snug">{c.title}</p>
                      <p className="text-sm text-muted">
                        {c.artist_name}, {c.code}
                        {c.category_name ? `, ${c.category_name.toLowerCase()}` : ""}
                      </p>
                      <p className="mt-0.5 text-sm">{dims(c.width_cm, c.height_cm)}</p>
                      <p className="text-xs text-muted">{historyReason(c)} · parada há {plural(c.idle_days, "dia", "dias")}</p>
                      {c.blocked ? (
                        <div className="mt-1.5">
                          <BlockedBadge artworkId={c.artwork_id} clientId={clientId} />
                        </div>
                      ) : (
                        <p className="mt-1.5 text-sm font-medium text-accent">{Math.round(Number(c.score_total))}% compatível</p>
                      )}
                    </div>
                  </div>
                  {!c.blocked && (
                    <details className="border-t border-line">
                      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-accent">
                        {occupiedBy ? "Substituir por esta obra" : "Instalar esta obra"}
                      </summary>
                      <div className="px-3 pb-3">
                        <InstallForm artworkId={c.artwork_id} spaceId={spaceId} occupiedBy={occupiedBy} defaultSwapDays={defaultSwapDays} />
                      </div>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
