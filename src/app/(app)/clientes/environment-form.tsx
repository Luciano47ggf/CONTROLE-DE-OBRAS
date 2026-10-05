"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { saveEnvironment } from "./environment-actions";
import { Field, Photo } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/submit-button";
import { EnvironmentPhotoUploader } from "@/components/photos/environment-photo";
import { PhotoUploader } from "@/components/photos/uploader";
import { getBrowserClient } from "@/lib/supabase/browser";
import { photoUrl } from "@/lib/format";
import type { ClientEnvironment } from "@/lib/types";

export function EnvironmentForm({ clientId, environment }: { clientId: string; environment?: ClientEnvironment }) {
  const [state, action] = useActionState(saveEnvironment, {});
  const fe = state.fieldErrors ?? {};
  // Só usado no cadastro (sem `environment` ainda): a foto é enviada direto ao Storage antes
  // de o ambiente existir, numa pasta com este id provisório, que vira o id real do ambiente.
  const [draftId] = useState(() => crypto.randomUUID());
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
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

      <div className="border-t border-line pt-6">
        <p className="label mb-2">Foto do ambiente</p>
        {environment ? (
          <>
            {environment.photo_path && (
              <Photo path={environment.photo_path} alt={environment.name} className="mb-3 h-40 w-full rounded-md" />
            )}
            <EnvironmentPhotoUploader clientId={clientId} environmentId={environment.id} hasPhoto={!!environment.photo_path} />
          </>
        ) : (
          <>
            <input type="hidden" name="draft_id" value={draftId} />
            {pendingPhoto && <input type="hidden" name="photo_path" value={pendingPhoto} />}
            {pendingPhoto ? (
              <div className="relative mb-3 h-40 w-full overflow-hidden rounded-md border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(pendingPhoto)!} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={async () => {
                    setPendingPhoto(null);
                    await getBrowserClient().storage.from("acervo").remove([pendingPhoto]);
                  }}
                  aria-label="Remover foto"
                  className="absolute right-2 top-2 rounded-full bg-ink/70 p-1.5 text-paper hover:bg-bad"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <PhotoUploader
                folder={`ambientes/${clientId}/${draftId}`}
                multiple={false}
                label="Enviar foto do ambiente"
                onUploaded={async (paths) => {
                  setPendingPhoto(paths[0]!);
                  return { ok: true };
                }}
              />
            )}
            <p className="mt-2 text-xs text-muted">Uma foto do local ajuda a conferir luz, acesso e entorno.</p>
          </>
        )}
      </div>

      <SubmitButton>{environment ? "Salvar alterações" : "Cadastrar ambiente"}</SubmitButton>
    </form>
  );
}
