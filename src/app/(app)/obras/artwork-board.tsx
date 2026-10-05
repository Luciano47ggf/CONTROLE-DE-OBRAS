"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutGrid, List as ListIcon } from "lucide-react";
import { Photo, StatusBadge, EmptyState } from "@/components/ui";
import { dims, plural, STATUS_LABEL } from "@/lib/format";
import type { ArtworkRow, ArtworkStatus } from "@/lib/types";

type SortLink = { value: string; label: string; href: string; active: boolean };

/** Resultados do acervo: alterna entre lista (tabela) e galeria (fotos em grade) */
export function ArtworkBoard({
  rows,
  canWrite,
  sortLinks,
  emptyHref,
}: {
  rows: ArtworkRow[];
  canWrite: boolean;
  sortLinks: SortLink[];
  emptyHref: string;
}) {
  const [view, setView] = useState<"lista" | "galeria">("lista");

  const location = (a: ArtworkRow) =>
    a.current_client_name
      ? `${a.current_client_name}, ${a.current_space_name}`
      : a.reserved_client_name
        ? `Destino: ${a.reserved_client_name}, ${a.reserved_space_name}`
        : "Estoque";

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <div className="flex flex-wrap items-center gap-2">
          Ordenar:
          {sortLinks.map((s) => (
            <Link key={s.value} href={s.href} className={s.active ? "font-medium text-ink" : "hover:text-ink"}>
              {s.label}
            </Link>
          ))}
        </div>
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

      {rows.length === 0 ? (
        <EmptyState title="Nenhuma obra com esses filtros" action={<Link href={emptyHref} className="btn-secondary">Ver todo o acervo</Link>}>
          Amplie as medidas, troque a situação ou limpe a busca.
        </EmptyState>
      ) : view === "galeria" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((a) => (
            <Link key={a.id} href={`/obras/${a.id}`} className="panel block overflow-hidden transition-colors hover:border-muted">
              <div className="aspect-[4/5] bg-wall">
                <Photo path={a.photo_thumb_path} alt={a.title} className="h-full w-full" />
              </div>
              <div className="p-4">
                <p className="title-serif truncate text-lg leading-snug">{a.title}</p>
                <p className="truncate text-sm text-muted">{a.artist_name}, {a.code}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <StatusBadge status={a.status as ArtworkStatus} />
                  <span className="shrink-0 text-xs tabular-nums text-muted">{dims(a.width_cm, a.height_cm)}</span>
                </div>
                <p className="mt-2 truncate text-xs text-muted">{location(a)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="table">
            <thead><tr><th className="w-16"></th><th>Obra</th><th>Dimensões</th><th>Situação</th><th>Onde está</th><th className="text-right">Há</th>{canWrite && <th></th>}</tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td><Photo path={a.photo_thumb_path} alt={a.title} className="h-12 w-12 rounded-sm" /></td>
                  <td className="min-w-48">
                    <Link href={`/obras/${a.id}`} className="font-serif text-base hover:underline">{a.title}</Link>
                    <span className="block text-xs text-muted">{a.code}, {a.artist_name}{a.category_name ? `, ${a.category_name.toLowerCase()}` : ""}</span>
                  </td>
                  <td className="whitespace-nowrap tabular-nums">{dims(a.width_cm, a.height_cm)}</td>
                  <td><StatusBadge status={a.status as ArtworkStatus} /></td>
                  <td className="text-muted">
                    {a.current_client_name ? (
                      <Link href={`/clientes/${a.current_client_id}`} className="hover:text-ink">{a.current_client_name}, {a.current_space_name}</Link>
                    ) : a.reserved_client_name ? (
                      <>Destino: {a.reserved_client_name}, {a.reserved_space_name}</>
                    ) : "Estoque"}
                  </td>
                  <td className="whitespace-nowrap text-right tabular-nums text-muted" title={`${STATUS_LABEL[a.status as ArtworkStatus]} desde então`}>
                    {plural(a.days_in_status, "dia", "dias")}
                  </td>
                  {canWrite && (
                    <td className="whitespace-nowrap text-right">
                      <Link href={`/obras/${a.id}/editar`} className="text-sm text-accent hover:underline">Editar</Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
