"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { saveClient } from "./actions";
import { Field, Photo } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/submit-button";
import { ClientLogoUploader } from "@/components/photos/client-logo";
import { ClientCoverUploader } from "@/components/photos/client-cover";
import { PhotoUploader } from "@/components/photos/uploader";
import { AddressAutocomplete, type AddressResult } from "@/components/address-autocomplete";
import { getBrowserClient } from "@/lib/supabase/browser";
import { photoUrl } from "@/lib/format";
import type { Client } from "@/lib/types";

/** Pendura a foto enviada ao Storage antes de o registro existir, com remover local */
function PendingImage({
  path,
  onRemove,
  rounded = "rounded-md",
}: {
  path: string;
  onRemove: () => void;
  rounded?: string;
}) {
  return (
    <div className={`relative mb-3 h-24 w-24 overflow-hidden border border-line ${rounded}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl(path)!} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover foto"
        className="absolute right-1 top-1 rounded-full bg-ink/70 p-1 text-paper hover:bg-bad"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export function ClientForm({ client }: { client?: Client }) {
  const [state, action] = useActionState(saveClient, {});
  const fe = state.fieldErrors ?? {};
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    client?.latitude != null && client?.longitude != null ? { lat: client.latitude, lng: client.longitude } : null,
  );
  // Só usado no cadastro (sem `client` ainda): logo e capa são enviados direto ao Storage
  // antes de o cliente existir, numa pasta com este id provisório, que vira o id real dele.
  const [draftId] = useState(() => crypto.randomUUID());
  const [pendingLogo, setPendingLogo] = useState<string | null>(null);
  const [pendingCover, setPendingCover] = useState<string | null>(null);
  async function removePending(path: string, clear: () => void) {
    clear();
    await getBrowserClient().storage.from("acervo").remove([path]);
  }
  // Campos controlados: um <form action> do React 19 limpa inputs não controlados após
  // qualquer submissão (mesmo com erro de validação), então o valor digitado precisa
  // ficar em estado do componente em vez de depender de defaultValue.
  const [values, setValues] = useState<Record<string, string>>(() => ({
    name: client?.name ?? "",
    segment: client?.segment ?? "",
    legal_name: client?.legal_name ?? "",
    document: client?.document ?? "",
    address: client?.address ?? "",
    city: client?.city ?? "",
    state: client?.state ?? "",
    contact_name: client?.contact_name ?? "",
    phone: client?.phone ?? "",
    email: client?.email ?? "",
    default_swap_days: client?.default_swap_days?.toString() ?? "",
    notes: client?.notes ?? "",
    active: client?.active === false ? "off" : "on",
  }));
  const set = (name: string, v: string) => setValues((cur) => ({ ...cur, [name]: v }));
  const t = (name: keyof Client, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, cls = "", hint?: string) => (
    <Field label={label} name={name} error={fe[name]} className={cls} hint={hint}>
      <input
        id={name}
        name={name}
        value={values[name] ?? ""}
        onChange={(e) => set(name, e.target.value)}
        className="input"
        aria-invalid={!!fe[name]}
        {...extra}
      />
    </Field>
  );

  function handleAddressSelect(r: AddressResult) {
    set("address", r.address);
    set("city", r.city);
    set("state", r.state);
    setCoords({ lat: r.latitude, lng: r.longitude });
  }

  return (
    <form action={action} className="space-y-6">
      {client ? <input type="hidden" name="id" value={client.id} /> : <input type="hidden" name="draft_id" value={draftId} />}
      {pendingLogo && <input type="hidden" name="logo_photo_path" value={pendingLogo} />}
      {pendingCover && <input type="hidden" name="cover_photo_path" value={pendingCover} />}
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
        <div className="sm:col-span-6">
          <AddressAutocomplete onSelect={handleAddressSelect} />
        </div>
        {t("address", "Endereço", {}, "sm:col-span-6")}
        {t("city", "Cidade", {}, "sm:col-span-4")}
        {t("state", "UF", { maxLength: 2 }, "sm:col-span-2")}
        {t("contact_name", "Responsável", {}, "sm:col-span-2")}
        {t("phone", "Telefone", { type: "tel" }, "sm:col-span-2")}
        {t("email", "E-mail", { type: "email" }, "sm:col-span-2")}
        <input type="hidden" id="latitude" name="latitude" value={coords?.lat ?? ""} readOnly />
        <input type="hidden" id="longitude" name="longitude" value={coords?.lng ?? ""} readOnly />
        {coords && (
          <p className="text-sm text-muted sm:col-span-6">
            Localização definida ·{" "}
            <a
              href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
              target="_blank"
              rel="noreferrer"
              className="link"
            >
              Ver no mapa ↗
            </a>
          </p>
        )}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="title-serif mb-3 text-lg">Rodízio</legend>
        {t("default_swap_days", "Prazo de troca deste cliente (dias)", { inputMode: "numeric", placeholder: "Usar padrão geral" })}
        <Field label="Situação" name="active">
          <select id="active" name="active" value={values.active} onChange={(e) => set("active", e.target.value)} className="input">
            <option value="on">Ativo</option>
            <option value="off">Inativo</option>
          </select>
        </Field>
        <Field label="Observações" name="notes" className="sm:col-span-2">
          <textarea id="notes" name="notes" rows={3} value={values.notes} onChange={(e) => set("notes", e.target.value)} className="input" />
        </Field>
      </fieldset>

      <div className="grid gap-6 border-t border-line pt-6 sm:grid-cols-2">
        <div>
          <p className="label mb-2">Logo do cliente</p>
          {client ? (
            <>
              {client.logo_path && <Photo path={client.logo_path} alt={client.name} className="mb-3 h-24 w-24 rounded-full" />}
              <ClientLogoUploader clientId={client.id} hasLogo={!!client.logo_path} />
            </>
          ) : pendingLogo ? (
            <PendingImage path={pendingLogo} onRemove={() => removePending(pendingLogo, () => setPendingLogo(null))} rounded="rounded-full" />
          ) : (
            <PhotoUploader
              folder={`clientes/${draftId}`}
              multiple={false}
              label="Enviar logo"
              onUploaded={async (paths) => {
                setPendingLogo(paths[0]!);
                return { ok: true };
              }}
            />
          )}
        </div>
        <div>
          <p className="label mb-2">Foto de capa</p>
          <p className="mb-2 text-xs text-muted">
            Aparece no card do cliente na visão geral — pode ser a fachada, o ambiente ou qualquer outra imagem que identifique o cliente.
          </p>
          {client ? (
            <>
              {client.cover_path && <Photo path={client.cover_path} alt={client.name} className="mb-3 aspect-[16/10] w-full rounded-md" />}
              <ClientCoverUploader clientId={client.id} hasCover={!!client.cover_path} />
            </>
          ) : pendingCover ? (
            <div className="relative mb-3 aspect-[16/10] w-full overflow-hidden rounded-md border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(pendingCover)!} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePending(pendingCover, () => setPendingCover(null))}
                aria-label="Remover foto"
                className="absolute right-2 top-2 rounded-full bg-ink/70 p-1.5 text-paper hover:bg-bad"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : (
            <PhotoUploader
              folder={`clientes/${draftId}/capa`}
              multiple={false}
              label="Enviar foto de capa"
              onUploaded={async (paths) => {
                setPendingCover(paths[0]!);
                return { ok: true };
              }}
            />
          )}
        </div>
      </div>

      <SubmitButton>{client ? "Salvar alterações" : "Cadastrar cliente"}</SubmitButton>
    </form>
  );
}
