import Link from "next/link";
import { Photo } from "@/components/ui";
import { Menu, MenuLink } from "@/components/menu";
import { dims, plural } from "@/lib/format";
import type { ActiveInstallationRow, SpaceRow } from "@/lib/types";

/** Card do espaço: nome, tipo + dimensões ("Parede 4,00 × 2,50 m") e as obras atualmente nele */
export function SpaceOccupantsCard({ space, occupants }: { space: SpaceRow; occupants: ActiveInstallationRow[] }) {
  const typeLabel = space.space_type_name ?? "Espaço";
  return (
    <div className="panel flex flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div className="min-w-0">
          <Link href={`/espacos/${space.id}`} className="truncate font-medium hover:underline">{space.name}</Link>
          <p className="text-sm text-muted">{plural(occupants.length, "obra", "obras")}</p>
          <p className="text-sm">{typeLabel} {dims(space.width_cm, space.height_cm)}</p>
        </div>
        <Menu
          label={`Mais opções de ${space.name}`}
          items={
            <>
              <MenuLink href={`/espacos/${space.id}`}>Ver espaço</MenuLink>
              <MenuLink href={`/espacos/${space.id}/editar`}>Editar espaço</MenuLink>
            </>
          }
        />
      </div>
      {occupants.length === 0 ? (
        <p className="px-4 pb-4 pt-3 text-sm italic text-muted">Vazio, sem obras no momento.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {occupants.map((o) => (
            <li key={o.installation_id} className="flex items-center gap-3 px-4 py-2.5">
              <Photo path={o.artwork_thumb} alt={o.artwork_title} className="h-11 w-11 shrink-0 rounded-sm" />
              <div className="min-w-0 flex-1">
                <Link href={`/obras/${o.artwork_id}`} className="block truncate text-sm font-medium hover:underline">
                  {o.artwork_title}
                </Link>
                <p className="truncate text-xs text-muted">{o.artist_name}</p>
              </div>
              <Menu
                label={`Mais opções de ${o.artwork_title}`}
                items={
                  <>
                    <MenuLink href={`/obras/${o.artwork_id}`}>Ver obra</MenuLink>
                    <MenuLink href={`/espacos/${space.id}`}>Ver espaço</MenuLink>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
