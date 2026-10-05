"use client";

import { useActionState } from "react";
import { installArtwork, reserveArtwork } from "@/app/(app)/espacos/actions";
import { FormAlert, SubmitButton } from "@/components/submit-button";
import { todayISO } from "@/lib/format";

/** Instalar (ou reservar) uma obra recomendada neste espaço */
export function InstallForm({
  artworkId,
  spaceId,
  occupiedBy,
  defaultSwapDays,
}: {
  artworkId: string;
  spaceId: string;
  occupiedBy: string | null;
  defaultSwapDays: number;
}) {
  const [state, install] = useActionState(installArtwork, {});
  const [rState, reserve] = useActionState(reserveArtwork, {});

  return (
    <div className="space-y-3">
      <FormAlert error={state.error ?? rState.error} />
      <form action={install} className="grid gap-3 sm:grid-cols-5">
        <input type="hidden" name="artwork_id" value={artworkId} />
        <input type="hidden" name="space_id" value={spaceId} />
        {occupiedBy && <input type="hidden" name="replace" value="1" />}
        <div>
          <label className="label" htmlFor={`d-${artworkId}`}>Data da instalação</label>
          <input id={`d-${artworkId}`} type="date" name="installed_at" defaultValue={todayISO()} max={todayISO()} className="input" />
        </div>
        <div>
          <label className="label" htmlFor={`s-${artworkId}`}>Prazo (dias)</label>
          <input id={`s-${artworkId}`} name="swap_days" inputMode="numeric" placeholder={String(defaultSwapDays)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor={`r-${artworkId}`}>Responsável</label>
          <input id={`r-${artworkId}`} name="responsible" className="input" />
        </div>
        <div>
          <label className="label" htmlFor={`n-${artworkId}`}>Observação</label>
          <input id={`n-${artworkId}`} name="notes" className="input" />
        </div>
        <div>
          <label className="label" htmlFor={`p-${artworkId}`}>Data prevista (se só reservar)</label>
          <input id={`p-${artworkId}`} type="date" name="planned_at" min={todayISO()} className="input" />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-5">
          <SubmitButton pendingText="Instalando…">{occupiedBy ? "Substituir e instalar" : "Instalar agora"}</SubmitButton>
          <button formAction={reserve} className="btn-secondary">Só reservar</button>
          {occupiedBy && (
            <span className="text-sm text-muted">“{occupiedBy}” será retirada e volta ao estoque como disponível.</span>
          )}
        </div>
      </form>
    </div>
  );
}
