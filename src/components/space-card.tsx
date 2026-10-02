import Link from "next/link";
import { WallPreview } from "./wall-preview";
import { SwapIndicator } from "./ui";
import { dims, plural, swapText } from "@/lib/format";
import type { SpaceRow } from "@/lib/types";

export function SpaceCard({ space, margin, canWrite = true }: { space: SpaceRow; margin: number; canWrite?: boolean }) {
  const occupied = !!space.artwork_id;
  return (
    <article className="panel flex flex-col overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{space.name}</h3>
          <p className="text-sm text-muted">
            {dims(space.width_cm, space.height_cm)}
            {space.space_type_name ? `, ${space.space_type_name.toLowerCase()}` : ""}
          </p>
        </div>
        {canWrite && <Link href={`/espacos/${space.id}/editar`} className="shrink-0 text-sm text-muted hover:text-ink">Editar</Link>}
      </div>

      <div className="mx-5 mt-4 flex h-36 items-center justify-center bg-wall/60 p-3">
        <WallPreview
          wallW={space.width_cm}
          wallH={space.height_cm}
          artW={space.artwork_width_cm}
          artH={space.artwork_height_cm}
          margin={margin}
          className="h-full max-w-full"
        />
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        {occupied ? (
          <>
            <Link href={`/obras/${space.artwork_id}`} className="font-serif text-lg leading-snug hover:underline">
              {space.artwork_title}
            </Link>
            <p className="text-sm text-muted">{space.artist_name}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted">Instalada há</dt>
                <dd className="tabular-nums">{plural(space.days_on_site ?? 0, "dia", "dias")}</dd>
              </div>
              <div>
                <dt className="text-muted">Próxima troca</dt>
                <dd>{space.swap_status && <SwapIndicator status={space.swap_status}>{swapText(space.days_remaining)}</SwapIndicator>}</dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <p className="font-serif text-lg italic text-muted">Parede vazia</p>
            <p className="text-sm text-muted">
              {space.compatible_available === 0
                ? "Nenhuma obra disponível cabe neste espaço."
                : `${plural(space.compatible_available, "obra compatível disponível", "obras compatíveis disponíveis")}`}
            </p>
          </>
        )}
        <div className="mt-auto pt-5">
          <Link href={`/espacos/${space.id}`} className={occupied ? "btn-secondary w-full" : "btn-primary w-full"}>
            {occupied ? "Encontrar nova obra" : "Ver sugestões"}
          </Link>
        </div>
      </div>
    </article>
  );
}
