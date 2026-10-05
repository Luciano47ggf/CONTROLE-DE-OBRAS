"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutGrid, List as ListIcon } from "lucide-react";
import { Photo, EmptyState } from "@/components/ui";

export type ArtistSummary = {
  id: string;
  name: string;
  nationality: string | null;
  birth_year: number | null;
  photo_path: string | null;
  artworkCount: number;
};

/** Lista de artistas: alterna entre lista (tabela) e galeria (fotos em grade) */
export function ArtistBoard({ artists }: { artists: ArtistSummary[] }) {
  const [view, setView] = useState<"lista" | "galeria">("lista");

  if (artists.length === 0) {
    return <EmptyState title="Nenhum artista cadastrado">Cadastre o primeiro artista ao lado para poder registrar obras.</EmptyState>;
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
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {artists.map((a) => (
            <Link key={a.id} href={`/artistas/${a.id}`} className="panel block overflow-hidden transition-colors hover:border-muted">
              <div className="aspect-square bg-wall">
                <Photo path={a.photo_path} alt={a.name} className="h-full w-full" />
              </div>
              <div className="p-4">
                <p className="title-serif truncate text-lg leading-snug">
                  {a.name}{a.birth_year && <span className="text-muted"> ({a.birth_year})</span>}
                </p>
                <p className="truncate text-sm text-muted">{a.nationality ?? "Nacionalidade não informada"}</p>
                <p className="mt-1 text-sm text-muted">{a.artworkCount} {a.artworkCount === 1 ? "obra" : "obras"}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="table">
            <thead><tr><th></th><th>Nome</th><th>Nacionalidade</th><th className="text-right">Obras</th></tr></thead>
            <tbody>
              {artists.map((a) => (
                <tr key={a.id}>
                  <td><Photo path={a.photo_path} alt={a.name} className="h-10 w-10 rounded-full" /></td>
                  <td>
                    <Link href={`/artistas/${a.id}`} className="font-medium hover:underline">{a.name}</Link>
                    {a.birth_year && <span className="text-muted"> ({a.birth_year})</span>}
                  </td>
                  <td className="text-muted">{a.nationality ?? "—"}</td>
                  <td className="text-right tabular-nums">
                    <Link href={`/obras?status=todas&artista=${a.id}`} className="link">{a.artworkCount}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
