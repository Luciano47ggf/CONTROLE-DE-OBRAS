"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { saveArtwork } from "./actions";
import { Field } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/submit-button";
import { PhotoUploader } from "@/components/photos/uploader";
import { getBrowserClient } from "@/lib/supabase/browser";
import { photoUrl } from "@/lib/format";
import { parseMeasure } from "@/lib/form";
import type { ArtworkRow } from "@/lib/types";

type Unit = "m" | "cm";

/** Campo de medida com escolha de unidade; converte o valor digitado ao trocar de m para cm (e vice-versa) */
function MeasureField({
  name,
  label,
  cm,
  required,
  error,
  hint,
}: {
  name: string;
  label: string;
  cm: number | null | undefined;
  required?: boolean;
  error?: string;
  hint?: string;
}) {
  const [unit, setUnit] = useState<Unit>("m");
  const [value, setValue] = useState(() => (cm ? String(Number(cm) / 100).replace(".", ",") : ""));

  function changeUnit(next: Unit) {
    if (next !== unit && value.trim() !== "") {
      const n = parseMeasure(value);
      if (Number.isFinite(n)) {
        const converted = next === "cm" ? n * 100 : n / 100;
        setValue(String(Math.round(converted * 100) / 100).replace(".", ","));
      }
    }
    setUnit(next);
  }

  return (
    <Field label={label} name={`${name}_value`} error={error} hint={hint}>
      <div className="flex gap-2">
        <input
          id={`${name}_value`}
          name={`${name}_value`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="decimal"
          required={required}
          className="input flex-1"
          aria-invalid={!!error}
        />
        <select
          name={`${name}_unit`}
          value={unit}
          onChange={(e) => changeUnit(e.target.value as Unit)}
          aria-label={`Unidade de ${label.toLowerCase()}`}
          className="input w-20 flex-none"
        >
          <option value="m">m</option>
          <option value="cm">cm</option>
        </select>
      </div>
    </Field>
  );
}

export function ArtworkForm({
  artwork,
  artists,
  categories,
}: {
  artwork?: ArtworkRow;
  artists: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(saveArtwork, {});
  const fe = state.fieldErrors ?? {};
  const [draftId] = useState(() => crypto.randomUUID());
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);

  // Campos controlados: um <form action> do React 19 limpa inputs não controlados após
  // qualquer submissão (mesmo com erro de validação), então o valor digitado precisa
  // ficar em estado do componente em vez de depender de defaultValue.
  const [values, setValues] = useState<Record<string, string>>(() => ({
    code: artwork?.code ?? "",
    title: artwork?.title ?? "",
    artist_id: artwork?.artist_id ?? "",
    category_id: artwork?.category_id ?? "",
    technique: artwork?.technique ?? "",
    year: artwork?.year?.toString() ?? "",
    weight_kg: artwork?.weight_kg?.toString() ?? "",
    value: artwork?.value?.toString() ?? "",
    status: "disponivel",
    description: artwork?.description ?? "",
    notes: artwork?.notes ?? "",
  }));
  const set = (name: string, v: string) => setValues((cur) => ({ ...cur, [name]: v }));

  async function removePendingPhoto(path: string) {
    setPendingPhotos((cur) => cur.filter((p) => p !== path));
    await getBrowserClient().storage.from("acervo").remove([path]);
  }
  const input = (name: string, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, cls = "", hint?: string) => (
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

  return (
    <form action={action} className="space-y-8">
      {artwork && <input type="hidden" name="id" value={artwork.id} />}
      <FormAlert error={state.error} />

      <fieldset className="grid gap-4 sm:grid-cols-6">
        <legend className="title-serif mb-3 text-lg">Identificação</legend>
        {input("code", "Código interno", { required: true }, "sm:col-span-2")}
        {input("title", "Nome da obra", { required: true }, "sm:col-span-4")}
        <Field label="Artista" name="artist_id" error={fe.artist_id} className="sm:col-span-3">
          <select
            id="artist_id"
            name="artist_id"
            value={values.artist_id}
            onChange={(e) => set("artist_id", e.target.value)}
            className="input"
            required
            aria-invalid={!!fe.artist_id}
          >
            <option value="" disabled>Escolha…</option>
            {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {artists.length === 0 && (
            <p className="mt-1 text-xs text-muted">Nenhum artista cadastrado. <Link href="/artistas" className="link">Cadastre primeiro</Link>.</p>
          )}
        </Field>
        <Field label="Categoria" name="category_id" className="sm:col-span-3">
          <select
            id="category_id"
            name="category_id"
            value={values.category_id}
            onChange={(e) => set("category_id", e.target.value)}
            className="input"
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        {input("technique", "Técnica", {}, "sm:col-span-4")}
        {input("year", "Ano", { inputMode: "numeric" }, "sm:col-span-2")}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-4">
        <legend className="title-serif mb-3 text-lg">Dimensões</legend>
        <MeasureField name="width" label="Largura" cm={artwork?.width_cm} required error={fe.width} hint="Com moldura" />
        <MeasureField name="height" label="Altura" cm={artwork?.height_cm} required error={fe.height} />
        <MeasureField name="depth" label="Profundidade" cm={artwork?.depth_cm} error={fe.depth} />
        {input("weight_kg", "Peso (kg)", { inputMode: "decimal" })}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="title-serif mb-3 text-lg">Acervo</legend>
        {input("value", "Valor (R$)", { inputMode: "decimal" })}
        {!artwork && (
          <Field label="Situação na entrada" name="status">
            <select id="status" name="status" value={values.status} onChange={(e) => set("status", e.target.value)} className="input">
              <option value="disponivel">Disponível</option>
              <option value="em_manutencao">Em manutenção</option>
              <option value="em_restauracao">Em restauração</option>
              <option value="indisponivel">Indisponível</option>
            </select>
          </Field>
        )}
        <Field label="Descrição" name="description" className="sm:col-span-2">
          <textarea
            id="description"
            name="description"
            rows={3}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Observações internas" name="notes" className="sm:col-span-2" hint="Cuidados de transporte, fixação, seguro">
          <textarea
            id="notes"
            name="notes"
            rows={2}
            value={values.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="input"
          />
        </Field>
      </fieldset>

      {!artwork && (
        <fieldset>
          <legend className="title-serif mb-3 text-lg">Fotos</legend>
          <input type="hidden" name="draft_id" value={draftId} />
          {pendingPhotos.map((p) => <input key={p} type="hidden" name="photo_path" value={p} />)}
          <PhotoUploader
            folder={`obras/${draftId}`}
            onUploaded={async (paths) => {
              setPendingPhotos((cur) => [...cur, ...paths]);
              return { ok: true };
            }}
          />
          {pendingPhotos.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-3">
              {pendingPhotos.map((p) => (
                <li key={p} className="relative h-20 w-20 overflow-hidden rounded-sm border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl(p)!} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePendingPhoto(p)}
                    aria-label="Remover foto"
                    className="absolute right-1 top-1 rounded-full bg-ink/70 p-1 text-paper hover:bg-bad"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted">Você poderá reordenar, legendar e definir a capa na página da obra, depois de cadastrar.</p>
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>{artwork ? "Salvar alterações" : "Cadastrar obra"}</SubmitButton>
      </div>
    </form>
  );
}
