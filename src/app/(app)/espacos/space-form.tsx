"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { saveSpace } from "./actions";
import { Field, Photo } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/submit-button";
import { WallPreview } from "@/components/wall-preview";
import { SpacePhotoUploader } from "@/components/photos/space-photo";
import { PhotoUploader } from "@/components/photos/uploader";
import { getBrowserClient } from "@/lib/supabase/browser";
import { photoUrl } from "@/lib/format";
import Link from "next/link";
import type { SpaceRow } from "@/lib/types";

function toM(cm: number | null | undefined) {
  return cm ? String(Number(cm) / 100).replace(".", ",") : "";
}
function parseM(v: string) {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n * 100 : null;
}

export function SpaceForm({
  clientId,
  space,
  spaceTypes,
  environments,
  defaultEnvironmentId,
  margin,
}: {
  clientId: string;
  space?: SpaceRow;
  spaceTypes: { id: string; name: string }[];
  environments: { id: string; name: string }[];
  defaultEnvironmentId?: string;
  margin: number;
}) {
  const [state, action] = useActionState(saveSpace, {});
  const fe = state.fieldErrors ?? {};
  const [w, setW] = useState(toM(space?.width_cm));
  const [h, setH] = useState(toM(space?.height_cm));
  const wc = parseM(w);
  const hc = parseM(h);
  // Só usado no cadastro (sem `space` ainda): a foto é enviada direto ao Storage antes de o
  // ponto existir, numa pasta com este id provisório, que vira o id real do ponto.
  const [draftId] = useState(() => crypto.randomUUID());
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  // Campos controlados: um <form action> do React 19 limpa inputs não controlados após
  // qualquer submissão (mesmo com erro de validação), então o valor digitado precisa
  // ficar em estado do componente em vez de depender de defaultValue.
  const [values, setValues] = useState({
    environment_id: space?.environment_id ?? defaultEnvironmentId ?? "",
    name: space?.name ?? "",
    space_type_id: space?.space_type_id ?? "",
    swap_days: space?.swap_days?.toString() ?? "",
    description: space?.description ?? "",
    notes: space?.notes ?? "",
    active: space?.active === false ? "off" : "on",
  });
  const set = (name: keyof typeof values, v: string) => setValues((cur) => ({ ...cur, [name]: v }));

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <input type="hidden" name="client_id" value={clientId} />
        {space ? <input type="hidden" name="id" value={space.id} /> : <input type="hidden" name="draft_id" value={draftId} />}
        {pendingPhoto && <input type="hidden" name="photo_path" value={pendingPhoto} />}
        <FormAlert error={state.error} />
        <Field label="Ambiente" name="environment_id" error={fe.environment_id} hint="Agrupa os pontos de exposição deste cliente">
          <select
            id="environment_id"
            name="environment_id"
            value={values.environment_id}
            onChange={(e) => set("environment_id", e.target.value)}
            className="input"
            required
            aria-invalid={!!fe.environment_id}
          >
            <option value="" disabled>Escolha…</option>
            {environments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          {environments.length === 0 && (
            <p className="mt-1 text-xs text-muted">
              Nenhum ambiente cadastrado. <Link href={`/clientes/${clientId}/ambientes/novo`} className="link">Cadastre primeiro</Link>.
            </p>
          )}
        </Field>
        <Field label="Nome do ponto de exposição" name="name" error={fe.name} hint="Ex.: Parede A, Nicho 1">
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
        <div className="grid grid-cols-2 gap-4">
          <Field label="Largura disponível (m)" name="width_m" error={fe.width_m}>
            <input id="width_m" name="width_m" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} className="input" required aria-invalid={!!fe.width_m} />
          </Field>
          <Field label="Altura disponível (m)" name="height_m" error={fe.height_m}>
            <input id="height_m" name="height_m" inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} className="input" required aria-invalid={!!fe.height_m} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo de espaço" name="space_type_id" hint="Usado na adequação por categoria">
            <select
              id="space_type_id"
              name="space_type_id"
              value={values.space_type_id}
              onChange={(e) => set("space_type_id", e.target.value)}
              className="input"
            >
              <option value="">Sem tipo</option>
              {spaceTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Prazo de troca (dias)" name="swap_days" error={fe.swap_days} hint="Vazio usa o prazo do cliente">
            <input
              id="swap_days"
              name="swap_days"
              inputMode="numeric"
              value={values.swap_days}
              onChange={(e) => set("swap_days", e.target.value)}
              className="input"
            />
          </Field>
        </div>
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
        <Field label="Observações" name="notes" hint="Iluminação, fixação, restrições de acesso">
          <textarea
            id="notes"
            name="notes"
            rows={2}
            value={values.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="input"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          {space && (
            <Field label="Situação" name="active">
              <select id="active" name="active" value={values.active} onChange={(e) => set("active", e.target.value)} className="input">
                <option value="on">Ativo</option>
                <option value="off">Inativo</option>
              </select>
            </Field>
          )}
        </div>

        <div className="border-t border-line pt-4">
          <p className="label mb-2">Foto do espaço</p>
          {space ? (
            <>
              {space.photo_path && <Photo path={space.photo_path} alt={space.name} className="mb-3 h-40 w-full rounded-md" />}
              <SpacePhotoUploader clientId={clientId} spaceId={space.id} hasPhoto={!!space.photo_path} />
            </>
          ) : pendingPhoto ? (
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
              folder={`espacos/${clientId}/${draftId}`}
              multiple={false}
              label="Enviar foto do espaço"
              onUploaded={async (paths) => {
                setPendingPhoto(paths[0]!);
                return { ok: true };
              }}
            />
          )}
          <p className="mt-2 text-xs text-muted">Uma foto do local ajuda a conferir luz, acesso e entorno.</p>
        </div>

        <SubmitButton>{space ? "Salvar espaço" : "Cadastrar espaço"}</SubmitButton>
      </div>

      <aside className="h-fit">
        <p className="label">Prévia em escala</p>
        <div className="flex h-48 items-center justify-center bg-wall p-4">
          {wc && hc ? (
            <WallPreview wallW={wc} wallH={hc} margin={margin} className="h-full max-w-full" />
          ) : (
            <span className="text-sm text-muted">Informe largura e altura</span>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          A faixa hachurada é a margem de segurança de {String(margin / 100).replace(".", ",")} m por lado. As obras precisam caber na área clara.
        </p>
      </aside>
    </form>
  );
}
