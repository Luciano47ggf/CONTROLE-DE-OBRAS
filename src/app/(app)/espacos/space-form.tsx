"use client";

import { useActionState, useState } from "react";
import { saveSpace } from "./actions";
import { Field } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/submit-button";
import { WallPreview } from "@/components/wall-preview";
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

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <input type="hidden" name="client_id" value={clientId} />
        {space && <input type="hidden" name="id" value={space.id} />}
        <FormAlert error={state.error} />
        <Field label="Ambiente" name="environment_id" error={fe.environment_id} hint="Agrupa os pontos de exposição deste cliente">
          <select
            id="environment_id"
            name="environment_id"
            defaultValue={space?.environment_id ?? defaultEnvironmentId ?? ""}
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
          <input id="name" name="name" defaultValue={space?.name} className="input" required aria-invalid={!!fe.name} />
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
            <select id="space_type_id" name="space_type_id" defaultValue={space?.space_type_id ?? ""} className="input">
              <option value="">Sem tipo</option>
              {spaceTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Prazo de troca (dias)" name="swap_days" error={fe.swap_days} hint="Vazio usa o prazo do cliente">
            <input id="swap_days" name="swap_days" inputMode="numeric" defaultValue={space?.swap_days ?? ""} className="input" />
          </Field>
        </div>
        <Field label="Descrição" name="description">
          <textarea id="description" name="description" rows={2} defaultValue={space?.description ?? ""} className="input" />
        </Field>
        <Field label="Observações" name="notes" hint="Iluminação, fixação, restrições de acesso">
          <textarea id="notes" name="notes" rows={2} defaultValue={space?.notes ?? ""} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          {space && (
            <Field label="Situação" name="active">
              <select id="active" name="active" defaultValue={space.active ? "on" : "off"} className="input">
                <option value="on">Ativo</option>
                <option value="off">Inativo</option>
              </select>
            </Field>
          )}
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
