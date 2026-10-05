"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SpaceOccupantsCard } from "./space-occupants-card";
import { Menu, MenuLink } from "@/components/menu";
import { Photo } from "@/components/ui";
import { plural } from "@/lib/format";
import type { ActiveInstallationRow, ClientEnvironment, SpaceRow } from "@/lib/types";
import type { SpaceReservation } from "@/lib/queries";

/** Ambiente do cliente: cabeçalho com contagem de pontos de exposição, expande para mostrá-los */
export function EnvironmentCard({
  environment,
  spaces,
  occupantsBySpace,
  reservationsBySpace,
  defaultSwapDays,
  clientId,
  canWrite,
}: {
  environment: ClientEnvironment;
  spaces: SpaceRow[];
  occupantsBySpace: Map<string, ActiveInstallationRow[]>;
  reservationsBySpace: Map<string, SpaceReservation>;
  defaultSwapDays: number;
  clientId: string;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(true);
  const total = spaces.length;
  const occupied = spaces.filter((s) => (occupantsBySpace.get(s.id)?.length ?? 0) > 0).length;
  const free = total - occupied;

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          {environment.photo_path && <Photo path={environment.photo_path} alt="" className="h-12 w-12 shrink-0 rounded-sm" />}
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-serif text-lg">
              {open ? <ChevronDown size={16} className="shrink-0 text-muted" /> : <ChevronRight size={16} className="shrink-0 text-muted" />}
              <span className="truncate">{environment.name}</span>
            </p>
            <p className="text-sm text-muted">
              {plural(total, "ponto de exposição", "pontos de exposição")} · {plural(occupied, "ocupado", "ocupados")} · {plural(free, "livre", "livres")}
            </p>
          </div>
        </button>
        {canWrite && (
          <Menu
            label={`Mais opções de ${environment.name}`}
            items={
              <>
                <MenuLink href={`/clientes/${clientId}/ambientes/${environment.id}/editar`}>Editar ambiente</MenuLink>
                <MenuLink href={`/clientes/${clientId}/espacos/novo?ambiente=${environment.id}`}>Adicionar ponto de exposição</MenuLink>
              </>
            }
          />
        )}
      </div>
      {open && (
        <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2 xl:grid-cols-3">
          {spaces.length === 0 ? (
            <p className="text-sm text-muted">Nenhum ponto de exposição neste ambiente ainda.</p>
          ) : (
            spaces.map((s) => (
              <SpaceOccupantsCard
                key={s.id}
                space={s}
                occupants={occupantsBySpace.get(s.id) ?? []}
                reservation={reservationsBySpace.get(s.id)}
                clientId={clientId}
                defaultSwapDays={defaultSwapDays}
                canWrite={canWrite}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
