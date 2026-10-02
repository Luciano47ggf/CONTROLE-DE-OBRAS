"use client";

import { useActionState } from "react";
import { artworkStatusAction } from "@/app/(app)/obras/actions";
import { FormAlert, SubmitButton } from "@/components/submit-button";
import { STATUS_LABEL } from "@/lib/format";
import type { ArtworkStatus } from "@/lib/types";

const STOCK_TARGETS: ArtworkStatus[] = ["disponivel", "em_manutencao", "em_restauracao", "indisponivel"];

/** Mudança de status de estoque (manutenção, restauração, indisponível, disponível) */
export function StockStatusForm({ artworkId, current }: { artworkId: string; current: ArtworkStatus }) {
  const [state, action] = useActionState(artworkStatusAction, {});
  const targets = STOCK_TARGETS.filter((s) => s !== current);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="artwork_id" value={artworkId} />
      <input type="hidden" name="op" value="status" />
      <FormAlert error={state.error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="new_status">Mudar para</label>
          <select id="new_status" name="new_status" className="input" defaultValue={targets[0]}>
            {targets.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="st-notes">Motivo</label>
          <input id="st-notes" name="notes" className="input" placeholder="Ex.: moldura trincada" />
        </div>
      </div>
      <SubmitButton className="btn-secondary" pendingText="Registrando…">Registrar mudança</SubmitButton>
    </form>
  );
}

/** Reserva em andamento: enviar ou cancelar */
export function ReservationActions({ artworkId, canDispatch }: { artworkId: string; canDispatch: boolean }) {
  const [state, action] = useActionState(artworkStatusAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="artwork_id" value={artworkId} />
      <FormAlert error={state.error} />
      <div>
        <label className="label" htmlFor="rs-notes">Observação</label>
        <input id="rs-notes" name="notes" className="input" />
      </div>
      <div className="flex flex-wrap gap-2">
        {canDispatch && <SubmitButton className="btn-secondary" name="op" value="dispatch" pendingText="Registrando…">Marcar como em transporte</SubmitButton>}
        <SubmitButton className="btn-danger" name="op" value="cancel" pendingText="Cancelando…">Cancelar reserva</SubmitButton>
      </div>
    </form>
  );
}
