"use client";

import { useActionState } from "react";
import { saveClient } from "./actions";
import { Field } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/submit-button";
import type { Client } from "@/lib/types";

export function ClientForm({ client }: { client?: Client }) {
  const [state, action] = useActionState(saveClient, {});
  const fe = state.fieldErrors ?? {};
  const t = (name: keyof Client, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, cls = "", hint?: string) => (
    <Field label={label} name={name} error={fe[name]} className={cls} hint={hint}>
      <input id={name} name={name} defaultValue={(client?.[name] as string | number | null) ?? ""} className="input" aria-invalid={!!fe[name]} {...extra} />
    </Field>
  );

  return (
    <form action={action} className="space-y-6">
      {client && <input type="hidden" name="id" value={client.id} />}
      <FormAlert error={state.error} />

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="title-serif mb-3 text-lg">Identificação</legend>
        {t("name", "Nome", { required: true }, "sm:col-span-2")}
        {t("segment", "Tipo de cliente", {}, "", "Ex.: Galeria corporativa, Escritório, Espaço cultural")}
        {t("legal_name", "Razão social")}
        {t("document", "CPF ou CNPJ", { inputMode: "numeric" })}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-6">
        <legend className="title-serif mb-3 text-lg">Endereço e contato</legend>
        {t("address", "Endereço", {}, "sm:col-span-6")}
        {t("city", "Cidade", {}, "sm:col-span-4")}
        {t("state", "UF", { maxLength: 2 }, "sm:col-span-2")}
        {t("contact_name", "Responsável", {}, "sm:col-span-2")}
        {t("phone", "Telefone", { type: "tel" }, "sm:col-span-2")}
        {t("email", "E-mail", { type: "email" }, "sm:col-span-2")}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="title-serif mb-3 text-lg">Rodízio</legend>
        {t("default_swap_days", "Prazo de troca deste cliente (dias)", { inputMode: "numeric", placeholder: "Usar padrão geral" })}
        <Field label="Situação" name="active">
          <select id="active" name="active" defaultValue={client?.active === false ? "off" : "on"} className="input">
            <option value="on">Ativo</option>
            <option value="off">Inativo</option>
          </select>
        </Field>
        <Field label="Observações" name="notes" className="sm:col-span-2">
          <textarea id="notes" name="notes" rows={3} defaultValue={client?.notes ?? ""} className="input" />
        </Field>
      </fieldset>

      <SubmitButton>{client ? "Salvar alterações" : "Cadastrar cliente"}</SubmitButton>
    </form>
  );
}
