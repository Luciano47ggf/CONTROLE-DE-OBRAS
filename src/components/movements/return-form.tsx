"use client";

import { useActionState } from "react";
import { returnArtwork, postponeSwap } from "@/app/(app)/espacos/actions";
import { FormAlert, SubmitButton } from "@/components/submit-button";
import { todayISO } from "@/lib/format";

export function ReturnForm({ installationId, back }: { installationId: string; back: string }) {
  const [state, action] = useActionState(returnArtwork, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="installation_id" value={installationId} />
      <input type="hidden" name="back" value={back} />
      <FormAlert error={state.error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="returned_at">Data da retirada</label>
          <input id="returned_at" type="date" name="returned_at" defaultValue={todayISO()} max={todayISO()} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="new_status">A obra vai para</label>
          <select id="new_status" name="new_status" defaultValue="disponivel" className="input">
            <option value="disponivel">Estoque, disponível</option>
            <option value="em_transporte">Em transporte de volta</option>
            <option value="em_manutencao">Manutenção</option>
            <option value="em_restauracao">Restauração</option>
            <option value="indisponivel">Indisponível</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="ret-notes">Observação</label>
        <input id="ret-notes" name="notes" className="input" />
      </div>
      <SubmitButton className="btn-secondary" pendingText="Registrando…">Registrar retirada</SubmitButton>
    </form>
  );
}

export function PostponeForm({ installationId, current }: { installationId: string; current: string }) {
  const [state, action] = useActionState(postponeSwap, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="installation_id" value={installationId} />
      <div>
        <label className="label" htmlFor="expected_swap_at">Nova data de troca</label>
        <input id="expected_swap_at" type="date" name="expected_swap_at" defaultValue={current} className="input" />
      </div>
      <SubmitButton className="btn-secondary" pendingText="Salvando…">Alterar data</SubmitButton>
      {state.ok && <span className="text-sm text-ok">Data atualizada.</span>}
      {(state.error || state.fieldErrors) && (
        <span className="text-sm text-bad">{state.fieldErrors?.expected_swap_at ?? state.error}</span>
      )}
    </form>
  );
}
