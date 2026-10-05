"use client";

import { useActionState, useState } from "react";
import { installArtwork, reserveArtwork } from "@/app/(app)/espacos/actions";
import { FormAlert, SubmitButton } from "@/components/submit-button";
import { todayISO } from "@/lib/format";

/** Instalar (ou reservar) uma obra recomendada neste espaço; o espaço pode já ter outras obras */
export function InstallForm({
  artworkId,
  spaceId,
  occupants,
  defaultSwapDays,
}: {
  artworkId: string;
  spaceId: string;
  occupants: { installationId: string; title: string }[];
  defaultSwapDays: number;
}) {
  const [state, install] = useActionState(installArtwork, {});
  const [rState, reserve] = useActionState(reserveArtwork, {});
  const [replaceId, setReplaceId] = useState("");
  const replacing = occupants.find((o) => o.installationId === replaceId);

  return (
    <div className="space-y-3">
      <FormAlert error={state.error ?? rState.error} />
      <form action={install} className="grid gap-3 sm:grid-cols-4">
        <input type="hidden" name="artwork_id" value={artworkId} />
        <input type="hidden" name="space_id" value={spaceId} />
        {replaceId && <input type="hidden" name="replace_installation_id" value={replaceId} />}
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
        {occupants.length > 0 && (
          <div className="sm:col-span-4">
            <label className="label" htmlFor={`rep-${artworkId}`}>Substituir uma obra atual (opcional)</label>
            <select
              id={`rep-${artworkId}`}
              value={replaceId}
              onChange={(e) => setReplaceId(e.target.value)}
              className="input"
            >
              <option value="">Não substituir, só adicionar</option>
              {occupants.map((o) => <option key={o.installationId} value={o.installationId}>{o.title}</option>)}
            </select>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
          <SubmitButton pendingText="Instalando…">{replacing ? "Substituir e instalar" : "Instalar agora"}</SubmitButton>
          <button formAction={reserve} className="btn-secondary">Só reservar</button>
          {replacing && (
            <span className="text-sm text-muted">“{replacing.title}” será retirada e volta ao estoque como disponível.</span>
          )}
        </div>
      </form>
    </div>
  );
}
