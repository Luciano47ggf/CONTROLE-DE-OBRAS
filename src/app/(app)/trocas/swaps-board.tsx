"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutGrid, List as ListIcon } from "lucide-react";
import { Photo, SwapIndicator, EmptyState } from "@/components/ui";
import { date, swapRowClass, swapText, swapUrgency } from "@/lib/format";
import type { ActiveInstallationRow } from "@/lib/types";

/** Lista de trocas: alterna entre lista (tabela) e galeria (fotos em grade) */
export function SwapsBoard({ rows, emptyTitle, emptyText }: { rows: ActiveInstallationRow[]; emptyTitle: string; emptyText: string }) {
  const [view, setView] = useState<"lista" | "galeria">("lista");

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle}>{emptyText}</EmptyState>;
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <div className="flex overflow-hidden rounded-md border border-line" role="group" aria-label="Formato da lista">
          <button
            type="button"
            onClick={() => setView("lista")}
            aria-label="Ver em lista"
            aria-pressed={view === "lista"}
            className={`px-2.5 py-2 ${view === "lista" ? "bg-accent text-white" : "bg-paper text-muted hover:text-ink"}`}
          >
            <ListIcon size={16} />
          </button>
          <button
            type="button"
            onClick={() => setView("galeria")}
            aria-label="Ver em galeria"
            aria-pressed={view === "galeria"}
            className={`px-2.5 py-2 ${view === "galeria" ? "bg-accent text-white" : "bg-paper text-muted hover:text-ink"}`}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {view === "galeria" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((r) => (
            <div key={r.installation_id} className={`panel overflow-hidden ${swapRowClass(r.days_remaining)}`}>
              <div className="aspect-[4/5] bg-wall">
                <Photo path={r.artwork_thumb ?? r.artwork_photo} alt={r.artwork_title} className="h-full w-full" />
              </div>
              <div className="p-4">
                <Link href={`/obras/${r.artwork_id}`} className="title-serif block truncate text-lg leading-snug hover:underline">{r.artwork_title}</Link>
                <Link href={`/clientes/${r.client_id}`} className="block truncate text-sm text-muted hover:text-ink">{r.client_name}, {r.space_name}</Link>
                <div className="mt-2"><SwapIndicator status={swapUrgency(r.swap_status, r.days_remaining)}>{swapText(r.days_remaining)}</SwapIndicator></div>
                <p className="mt-1 text-xs text-muted">Prevista para {date(r.expected_swap_at)}</p>
                <Link href={`/espacos/${r.space_id}`} className="btn-secondary mt-3 w-full">Encontrar nova obra</Link>
              </div>
            </div>
          ))}
        </div>
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
