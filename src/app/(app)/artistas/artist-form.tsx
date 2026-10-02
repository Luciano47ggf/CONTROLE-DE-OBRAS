"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveArtist } from "./actions";
import { Field } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/submit-button";
import type { Artist } from "@/lib/types";

export function ArtistForm({ artist }: { artist?: Artist }) {
  const [state, action] = useActionState(saveArtist, {});
  const ref = useRef<HTMLFormElement>(null);
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok && !artist) ref.current?.reset();
  }, [state, artist]);

  return (
    <form ref={ref} action={action} className="space-y-4">
      {artist && <input type="hidden" name="id" value={artist.id} />}
      <FormAlert error={state.error} />
      {state.ok && !artist && <p className="text-sm text-ok">Artista cadastrado.</p>}
      <Field label="Nome" name="name" error={fe.name}>
        <input id="name" name="name" defaultValue={artist?.name} className="input" required aria-invalid={!!fe.name} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nacionalidade" name="nationality">
          <input id="nationality" name="nationality" defaultValue={artist?.nationality ?? ""} className="input" />
        </Field>
        <Field label="Ano de nascimento" name="birth_year" error={fe.birth_year}>
          <input id="birth_year" name="birth_year" inputMode="numeric" defaultValue={artist?.birth_year ?? ""} className="input" aria-invalid={!!fe.birth_year} />
        </Field>
      </div>
      <Field label="Site ou portfólio" name="website">
        <input id="website" name="website" type="url" defaultValue={artist?.website ?? ""} className="input" />
      </Field>
      <Field label="Biografia" name="bio">
        <textarea id="bio" name="bio" rows={3} defaultValue={artist?.bio ?? ""} className="input" />
      </Field>
      <Field label="Observações internas" name="notes">
        <textarea id="notes" name="notes" rows={2} defaultValue={artist?.notes ?? ""} className="input" />
      </Field>
      <SubmitButton>{artist ? "Salvar alterações" : "Cadastrar artista"}</SubmitButton>
    </form>
  );
}
