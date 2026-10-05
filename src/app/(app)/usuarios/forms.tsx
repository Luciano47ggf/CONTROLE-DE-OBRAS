"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createUser, resetPassword, setUserActive, updateUser } from "./actions";
import { Field } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/submit-button";
import type { UserRole } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/format";

const ROLE_HINT: Record<UserRole, string> = {
  admin: "Tudo, inclusive usuários e configurações",
  operador: "Cadastros e movimentações de obras",
  leitura: "Só consulta, sem alterar nada",
};

function RoleSelect({ name, defaultValue }: { name: string; defaultValue: UserRole }) {
  return (
    <select id={name} name="role" defaultValue={defaultValue} className="input">
      {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
        <option key={r} value={r}>{ROLE_LABEL[r]}: {ROLE_HINT[r].toLowerCase()}</option>
      ))}
    </select>
  );
}

/** Senha temporária legível (sem caracteres ambíguos) */
function tempPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const buf = new Uint32Array(14);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => chars[n % chars.length]).join("");
}

export function CreateUserForm({ enabled }: { enabled: boolean }) {
  const [state, action] = useActionState(createUser, {});
  const [pwd, setPwd] = useState("");
  const [created, setCreated] = useState<{ email: string; pwd: string } | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok && ref.current) {
      const email = (ref.current.elements.namedItem("email") as HTMLInputElement).value;
      setCreated({ email, pwd });
      ref.current.reset();
      setPwd("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="space-y-4">
      {created && (
        <div role="status" className="rounded-md border border-ok/30 bg-ok-tint px-4 py-3 text-sm">
          <p className="font-medium text-ok">Usuário criado.</p>
          <p className="mt-1">Envie por um canal seguro: <strong>{created.email}</strong>, senha temporária <code className="rounded bg-paper px-1">{created.pwd}</code>. A pessoa pode trocá-la em Minha conta.</p>
        </div>
      )}
      <form ref={ref} action={action} className="space-y-4">
        <FormAlert error={state.error} />
        <fieldset disabled={!enabled} className="space-y-4">
          <Field label="Nome" name="full_name" error={fe.full_name}>
            <input id="full_name" name="full_name" className="input" required aria-invalid={!!fe.full_name} />
          </Field>
          <Field label="E-mail" name="email" error={fe.email}>
            <input id="email" name="email" type="email" className="input" required aria-invalid={!!fe.email} />
          </Field>
          <Field label="Papel" name="new-role">
            <RoleSelect name="new-role" defaultValue="operador" />
          </Field>
          <Field label="Senha temporária" name="password" error={fe.password} hint="Mínimo de 10 caracteres">
            <div className="flex gap-2">
              <input id="password" name="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="input font-[ui-monospace,monospace]" required aria-invalid={!!fe.password} />
              <button type="button" className="btn-secondary" onClick={() => setPwd(tempPassword())}>Gerar</button>
            </div>
          </Field>
        </fieldset>
        {enabled && <SubmitButton pendingText="Criando…">Criar usuário</SubmitButton>}
      </form>
    </div>
  );
}

export function UserRowActions({
  user,
  isSelf,
  adminApi,
}: {
  user: { id: string; full_name: string | null; role: UserRole; active: boolean };
  isSelf: boolean;
  adminApi: boolean;
}) {
  const [state, action] = useActionState(updateUser, {});
  const [pState, pAction] = useActionState(resetPassword, {});
  const [pending, start] = useTransition();
  const [toggleError, setToggleError] = useState<string>();
  const [pwd, setPwd] = useState("");

  return (
    <div className="space-y-5 px-5 pb-5">
      <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
        <input type="hidden" name="user_id" value={user.id} />
        <div>
          <label className="label" htmlFor={`n-${user.id}`}>Nome</label>
          <input id={`n-${user.id}`} name="full_name" defaultValue={user.full_name ?? ""} className="input" required />
        </div>
        <div>
          <label className="label" htmlFor={`r-${user.id}`}>Papel</label>
          <RoleSelect name={`r-${user.id}`} defaultValue={user.role} />
        </div>
        <SubmitButton className="btn-secondary">Salvar</SubmitButton>
        {state.ok && <p className="text-sm text-ok sm:col-span-3">Alterações salvas.</p>}
        {(state.error || state.fieldErrors) && <p className="text-sm text-bad sm:col-span-3">{state.fieldErrors?.full_name ?? state.error}</p>}
      </form>

      {adminApi && (
        <form action={pAction} className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
          <input type="hidden" name="user_id" value={user.id} />
          <div>
            <label className="label" htmlFor={`p-${user.id}`}>Nova senha</label>
            <input id={`p-${user.id}`} name="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="input font-[ui-monospace,monospace]" />
          </div>
          <button type="button" className="btn-ghost" onClick={() => setPwd(tempPassword())}>Gerar</button>
          <SubmitButton className="btn-secondary" pendingText="Redefinindo…">Redefinir senha</SubmitButton>
          {pState.ok && <span className="text-sm text-ok">Senha redefinida. Repasse a nova senha à pessoa.</span>}
          {(pState.error || pState.fieldErrors) && <span className="text-sm text-bad">{pState.fieldErrors?.password ?? pState.error}</span>}
        </form>
      )}

      {!isSelf && (
        <div className="border-t border-line pt-4">
          <button
            type="button"
            className={user.active ? "btn-danger" : "btn-secondary"}
            disabled={pending}
            onClick={() => {
              const msg = user.active
                ? "Desativar este usuário? Ele perde o acesso imediatamente; o histórico de movimentações é mantido."
                : "Reativar este usuário?";
              if (!window.confirm(msg)) return;
              start(async () => {
                const res = await setUserActive(user.id, !user.active);
                setToggleError(res.error);
              });
            }}
          >
            {pending ? "Aplicando…" : user.active ? "Desativar acesso" : "Reativar acesso"}
          </button>
          {toggleError && <p className="mt-2 text-sm text-bad">{toggleError}</p>}
        </div>
      )}
    </div>
  );
}
