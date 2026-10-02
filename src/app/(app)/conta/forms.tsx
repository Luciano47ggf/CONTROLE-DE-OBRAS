"use client";

import { useActionState, useEffect, useRef } from "react";
import { changeMyPassword, updateMyName } from "./actions";
import { Field } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/submit-button";

export function NameForm({ name }: { name: string }) {
  const [state, action] = useActionState(updateMyName, {});
  return (
    <form action={action} className="space-y-4">
      <FormAlert error={state.error} />
      <Field label="Nome exibido" name="full_name" error={state.fieldErrors?.full_name}>
        <input id="full_name" name="full_name" defaultValue={name} className="input" required />
      </Field>
      <div className="flex items-center gap-3">
        <SubmitButton>Salvar nome</SubmitButton>
        {state.ok && <span className="text-sm text-ok">Nome atualizado.</span>}
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changeMyPassword, {});
  const ref = useRef<HTMLFormElement>(null);
  const fe = state.fieldErrors ?? {};
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <FormAlert error={state.error} />
      {state.ok && <p role="status" className="text-sm text-ok">Senha alterada.</p>}
      <Field label="Senha atual" name="current" error={fe.current}>
        <input id="current" name="current" type="password" autoComplete="current-password" className="input" required aria-invalid={!!fe.current} />
      </Field>
      <Field label="Nova senha" name="next" error={fe.next} hint="Mínimo de 10 caracteres">
        <input id="next" name="next" type="password" autoComplete="new-password" className="input" required aria-invalid={!!fe.next} />
      </Field>
      <Field label="Repita a nova senha" name="confirm" error={fe.confirm}>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" required aria-invalid={!!fe.confirm} />
      </Field>
      <SubmitButton pendingText="Trocando…">Trocar senha</SubmitButton>
    </form>
  );
}
