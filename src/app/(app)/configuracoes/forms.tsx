"use client";

import { useActionState, useEffect, useRef } from "react";
import { addCatalogItem, saveSettings, saveSpaceTypePrefs } from "./actions";
import { Field } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/submit-button";
import type { Settings } from "@/lib/types";

export function SettingsForm({ settings, canEdit }: { settings: Settings; canEdit: boolean }) {
  const [state, action] = useActionState(saveSettings, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormAlert error={state.error} />
      {state.ok && <p className="text-sm text-ok">Configurações salvas.</p>}
      <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Margem mínima por lado (m)" name="edge_margin_m" error={fe.edge_margin_m}
          hint="Folga entre a obra e as bordas do espaço">
          <input id="edge_margin_m" name="edge_margin_m" inputMode="decimal" className="input"
            defaultValue={String(settings.edge_margin_cm / 100).replace(".", ",")} />
        </Field>
        <Field label="Prazo padrão de troca (dias)" name="default_swap_days" error={fe.default_swap_days}>
          <input id="default_swap_days" name="default_swap_days" inputMode="numeric" className="input" defaultValue={settings.default_swap_days} />
        </Field>
        <Field label="Avisar troca com antecedência de (dias)" name="swap_warning_days" error={fe.swap_warning_days}
          hint="Abaixo disso o indicador fica amarelo">
          <input id="swap_warning_days" name="swap_warning_days" inputMode="numeric" className="input" defaultValue={settings.swap_warning_days} />
        </Field>
        <Field label="Memória do histórico (dias)" name="history_window_days" error={fe.history_window_days}
          hint="Depois desse tempo, uma passagem antiga quase não pesa contra a obra">
          <input id="history_window_days" name="history_window_days" inputMode="numeric" className="input" defaultValue={settings.history_window_days} />
        </Field>
        <Field label="Ociosidade máxima (dias)" name="idle_max_days" error={fe.idle_max_days}
          hint="Obras paradas há esse tempo ou mais ganham os 20 pontos completos">
          <input id="idle_max_days" name="idle_max_days" inputMode="numeric" className="input" defaultValue={settings.idle_max_days} />
        </Field>
      </fieldset>
      {canEdit ? <SubmitButton>Salvar configurações</SubmitButton> : <p className="text-sm text-muted">Somente administradores alteram estes valores.</p>}
    </form>
  );
}

export function AddItemForm({ table, placeholder }: { table: "categories" | "space_types"; placeholder: string }) {
  const [state, action] = useActionState(addCatalogItem, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="flex gap-2">
      <input type="hidden" name="table" value={table} />
      <input name="name" placeholder={placeholder} className="input" aria-label={placeholder} />
      <SubmitButton className="btn-secondary" pendingText="…">Adicionar</SubmitButton>
      {state.error && <p className="self-center text-sm text-bad">{state.error}</p>}
    </form>
  );
}

export function PrefsForm({ typeId, categories, selected }: { typeId: string; categories: { id: string; name: string }[]; selected: string[] }) {
  const [state, action] = useActionState(saveSpaceTypePrefs, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <input type="hidden" name="space_type_id" value={typeId} />
      {categories.map((c) => (
        <label key={c.id} className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="category_id" value={c.id} defaultChecked={selected.includes(c.id)} /> {c.name}
        </label>
      ))}
      <SubmitButton className="btn-ghost" pendingText="Salvando…">Salvar</SubmitButton>
      {state.ok && <span className="text-sm text-ok">Salvo</span>}
      {state.error && <span className="text-sm text-bad">{state.error}</span>}
    </form>
  );
}
