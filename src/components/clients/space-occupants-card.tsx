"use client";

import { useState } from "react";
import Link from "next/link";
import { Photo } from "@/components/ui";
import { Menu, MenuButton, MenuLink } from "@/components/menu";
import { InstallDrawer } from "./install-drawer";
import { ReturnForm } from "@/components/movements/return-form";
import { date, dims, swapText } from "@/lib/format";
import type { ActiveInstallationRow, SpaceRow } from "@/lib/types";
import type { SpaceReservation } from "@/lib/queries";

/** Card do ponto de exposição: nome, tipo + dimensões, a obra atual (ou vaga) e as ações de operar nele */
export function SpaceOccupantsCard({
  space,
  occupants,
  reservation,
  clientId,
  defaultSwapDays,
  canWrite,
}: {
  space: SpaceRow;
  occupants: ActiveInstallationRow[];
  reservation?: SpaceReservation;
  clientId: string;
  defaultSwapDays: number;
  canWrite: boolean;
}) {
  const typeLabel = space.space_type_name ?? "Espaço";
  const occupant = occupants[0] ?? null;
  const [drawer, setDrawer] = useState<"adicionar" | "substituir" | null>(null);
  const [returning, setReturning] = useState(false);

  return (
    <div className="panel flex flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          {space.photo_path && <Photo path={space.photo_path} alt="" className="h-12 w-12 shrink-0 rounded-sm" />}
          <div className="min-w-0">
            <Link href={`/espacos/${space.id}`} className="truncate font-medium hover:underline">{space.name}</Link>
            <p className="text-sm text-muted">{typeLabel} · {dims(space.width_cm, space.height_cm)}</p>
          </div>
        </div>
        <Menu
          label={`Mais opções de ${space.name}`}
          items={
            <>
              <MenuLink href={`/espacos/${space.id}`}>Ver ponto</MenuLink>
              <MenuLink href={`/espacos/${space.id}/editar`}>Editar ponto</MenuLink>
              {occupant && <MenuLink href={`/obras/${occupant.artwork_id}`}>Ver obra</MenuLink>}
              {occupant && <MenuLink href={`/obras/${occupant.artwork_id}/editar`}>Editar obra</MenuLink>}
              {canWrite && !occupant && <MenuButton onClick={() => setDrawer("adicionar")}>Adicionar obra</MenuButton>}
              {canWrite && occupant && <MenuButton onClick={() => setDrawer("substituir")}>Substituir obra</MenuButton>}
              {canWrite && occupant && <MenuButton onClick={() => setReturning((v) => !v)}>Retirar obra</MenuButton>}
            </>
          }
        />
      </div>

      {occupant ? (
        <div className="mt-3 border-t border-line px-4 py-3">
          <div className="flex items-center gap-3">
            <Photo path={occupant.artwork_thumb} alt={occupant.artwork_title} className="h-14 w-14 shrink-0 rounded-sm" />
            <div className="min-w-0 flex-1">
              <Link href={`/obras/${occupant.artwork_id}`} className="block truncate text-sm font-medium hover:underline">
                {occupant.artwork_title}
              </Link>
              <p className="truncate text-xs text-muted">{occupant.artist_name}</p>
              <p className="text-xs text-muted">
                Instalada em {date(occupant.installed_at)} · {swapText(occupant.days_remaining)}
              </p>
            </div>
          </div>
          {reservation && (
            <p className="mt-2 rounded bg-accent-tint px-2 py-1.5 text-xs text-accent">
              Próxima: <span className="font-medium">{reservation.title}</span>
              {reservation.plannedAt && <> · prevista para {date(reservation.plannedAt)}</>}
            </p>
          )}
          {canWrite && returning && (
            <div className="mt-3 border-t border-line pt-3">
              <p className="mb-2 text-xs text-muted">Confirme a retirada de &ldquo;{occupant.artwork_title}&rdquo;:</p>
              <ReturnForm installationId={occupant.installation_id} back={`/clientes/${clientId}`} />
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 pb-4 pt-3">
          <p className="text-sm italic text-muted">Vazio, sem obra no momento.</p>
          {reservation && (
            <p className="mt-2 rounded bg-accent-tint px-2 py-1.5 text-xs text-accent">
              Reservado: <span className="font-medium">{reservation.title}</span>
              {reservation.plannedAt && <> · previsto para {date(reservation.plannedAt)}</>}
            </p>
          )}
          {canWrite && (
            <button type="button" className="btn-secondary mt-3 w-full" onClick={() => setDrawer("adicionar")}>
              Adicionar obra
            </button>
          )}
        </div>
      )}

      {drawer && (
        <InstallDrawer
          spaceId={space.id}
          spaceName={space.name}
          clientId={clientId}
          occupiedBy={drawer === "substituir" ? (occupant?.artwork_title ?? null) : null}
          defaultSwapDays={space.swap_days ?? defaultSwapDays}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}
