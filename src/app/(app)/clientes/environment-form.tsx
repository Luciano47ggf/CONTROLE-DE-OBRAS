"use client";

import { useActionState, useState } from "react";
import { saveEnvironment } from "./environment-actions";
import { Field, Photo } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/submit-button";
import { EnvironmentPhotoUploader } from "@/components/photos/environment-photo";
import type { ClientEnvironment } from "@/lib/types";

export function EnvironmentForm({ clientId, environment }: { clientId: string; environment?: ClientEnvironment }) {
  const [state, action] = useActionState(saveEnvironment, {});
  const fe = state.fieldErrors ?? {};
  // Campos controlados: um <form action> do React 19 limpa inputs não controlados após
  // qualquer submissão (mesmo com erro de validação), então o valor digitado precisa
  // ficar em estado do componente em vez de depender de defaultValue.
  const [values, setValues] = useState({
    name: environment?.name ?? "",
    description: environment?.description ?? "",
    position: (environment?.position ?? 0).toString(),
    active: environment?.active === false ? "off" : "on",
  });
  const set = (name: keyof typeof values, v: string) => setValues((cur) => ({ ...cur, [name]: v }));

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="client_id" value={clientId} />
      {environment && <input type="hidden" name="id" value={environment.id} />}
      <FormAlert error={state.error} />

      <Field label="Nome do ambiente" name="name" error={fe.name} hint="Ex.: Recepção, Sala de reunião">
        <input
          id="name"
          name="name"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          className="input"
          required
          aria-invalid={!!fe.name}
        />
      </Field>
      <Field label="Descrição" name="description">
        <textarea
          id="description"
          name="description"
          rows={2}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          className="input"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Ordem" name="position" error={fe.position} hint="Define a ordem de exibição entre os ambientes">
          <input
            id="position"
            name="position"
            inputMode="numeric"
            value={values.position}
            onChange={(e) => set("position", e.target.value)}
            className="input"
          />
        </Field>
        {environment && (
          <Field label="Situação" name="active">
            <select id="active" name="active" value={values.active} onChange={(e) => set("active", e.target.value)} className="input">
              <option value="on">Ativo</option>
              <option value="off">Inativo</option>
            </select>
          </Field>
        )}
      </div>

      <SubmitButton>{environment ? "Salvar alterações" : "Cadastrar ambiente"}</SubmitButton>

      {environment && (
        <div className="border-t border-line pt-6">
          <p className="label mb-2">Foto do ambiente</p>
          {environment.photo_path && (
            <Photo path={environment.photo_path} alt={environment.name} className="mb-3 h-40 w-full rounded-md" />
          )}
          <EnvironmentPhotoUploader clientId={clientId} environmentId={environment.id} hasPhoto={!!environment.photo_path} />
        </div>
      )}
    </form>
  );
}
