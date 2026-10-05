"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveArtwork } from "./actions";
import { Field } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/submit-button";
import type { ArtworkRow } from "@/lib/types";

const m = (cm: number | null | undefined) => (cm ? String(Number(cm) / 100).replace(".", ",") : "");

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
  const input = (name: string, label: string, def: string | number | null | undefined, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, cls = "", hint?: string) => (
    <Field label={label} name={name} error={fe[name]} className={cls} hint={hint}>
      <input id={name} name={name} defaultValue={def ?? ""} className="input" aria-invalid={!!fe[name]} {...extra} />
    </Field>
  );

  return (
    <form action={action} className="space-y-8">
      {artwork && <input type="hidden" name="id" value={artwork.id} />}
      <FormAlert error={state.error} />

      <fieldset className="grid gap-4 sm:grid-cols-6">
        <legend className="title-serif mb-3 text-lg">Identificação</legend>
        {input("code", "Código interno", artwork?.code, { required: true }, "sm:col-span-2")}
        {input("title", "Nome da obra", artwork?.title, { required: true }, "sm:col-span-4")}
        <Field label="Artista" name="artist_id" error={fe.artist_id} className="sm:col-span-3">
          <select id="artist_id" name="artist_id" defaultValue={artwork?.artist_id ?? ""} className="input" required aria-invalid={!!fe.artist_id}>
            <option value="" disabled>Escolha…</option>
            {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {artists.length === 0 && (
            <p className="mt-1 text-xs text-muted">Nenhum artista cadastrado. <Link href="/artistas" className="link">Cadastre primeiro</Link>.</p>
          )}
        </Field>
        <Field label="Categoria" name="category_id" className="sm:col-span-3">
          <select id="category_id" name="category_id" defaultValue={artwork?.category_id ?? ""} className="input">
            <option value="">Sem categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        {input("technique", "Técnica", artwork?.technique, {}, "sm:col-span-4")}
        {input("year", "Ano", artwork?.year, { inputMode: "numeric" }, "sm:col-span-2")}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-4">
        <legend className="title-serif mb-3 text-lg">Dimensões</legend>
        {input("width_m", "Largura (m)", m(artwork?.width_cm), { inputMode: "decimal", required: true }, "", "Com moldura")}
        {input("height_m", "Altura (m)", m(artwork?.height_cm), { inputMode: "decimal", required: true })}
        {input("depth_m", "Profundidade (m)", m(artwork?.depth_cm), { inputMode: "decimal" })}
        {input("weight_kg", "Peso (kg)", artwork?.weight_kg, { inputMode: "decimal" })}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="title-serif mb-3 text-lg">Acervo</legend>
        {input("value", "Valor (R$)", artwork?.value, { inputMode: "decimal" })}
        {!artwork && (
          <Field label="Situação na entrada" name="status">
            <select id="status" name="status" defaultValue="disponivel" className="input">
              <option value="disponivel">Disponível</option>
              <option value="em_manutencao">Em manutenção</option>
              <option value="em_restauracao">Em restauração</option>
              <option value="indisponivel">Indisponível</option>
            </select>
          </Field>
        )}
        <Field label="Descrição" name="description" className="sm:col-span-2">
          <textarea id="description" name="description" rows={3} defaultValue={artwork?.description ?? ""} className="input" />
        </Field>
        <Field label="Observações internas" name="notes" className="sm:col-span-2" hint="Cuidados de transporte, fixação, seguro">
          <textarea id="notes" name="notes" rows={2} defaultValue={artwork?.notes ?? ""} className="input" />
        </Field>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>{artwork ? "Salvar alterações" : "Cadastrar obra"}</SubmitButton>
        {!artwork && <span className="text-sm text-muted">As fotos são adicionadas na página da obra, logo depois de cadastrar.</span>}
      </div>
    </form>
  );
}
