"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { saveArtist } from "./actions";
import { Field, Photo } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/submit-button";
import { ArtistPhotoUploader } from "@/components/photos/artist-photo";
import { PhotoUploader } from "@/components/photos/uploader";
import { getBrowserClient } from "@/lib/supabase/browser";
import { photoUrl } from "@/lib/format";
import type { Artist } from "@/lib/types";

export function ArtistForm({ artist }: { artist?: Artist }) {
  const [state, action] = useActionState(saveArtist, {});
  const ref = useRef<HTMLFormElement>(null);
  const fe = state.fieldErrors ?? {};
  // Só usado no cadastro (sem `artist` ainda): a foto é enviada direto ao Storage antes de o
  // artista existir, numa pasta com este id provisório, que vira o id real do artista. O
  // formulário de cadastro se limpa (e fica pronto para o próximo) sem navegar de página.
  const [draftId, setDraftId] = useState(() => crypto.randomUUID());
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok && !artist) {
      ref.current?.reset();
      setDraftId(crypto.randomUUID());
      setPendingPhoto(null);
    }
  }, [state, artist]);

  return (
    <form ref={ref} action={action} className="space-y-4">
      {artist ? <input type="hidden" name="id" value={artist.id} /> : <input type="hidden" name="draft_id" value={draftId} />}
      {pendingPhoto && <input type="hidden" name="photo_path" value={pendingPhoto} />}
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
      <Field label="Biografia" name="bio">
        <textarea id="bio" name="bio" rows={3} defaultValue={artist?.bio ?? ""} className="input" />
      </Field>
      <Field label="Observações internas" name="notes">
        <textarea id="notes" name="notes" rows={2} defaultValue={artist?.notes ?? ""} className="input" />
      </Field>

      <div className="border-t border-line pt-4">
        <p className="label mb-2">Foto do artista</p>
        {artist ? (
          <>
            {artist.photo_path && <Photo path={artist.photo_path} alt={artist.name} className="mb-3 h-24 w-24 rounded-full" />}
            <ArtistPhotoUploader artistId={artist.id} hasPhoto={!!artist.photo_path} />
          </>
        ) : pendingPhoto ? (
          <div className="relative mb-3 h-24 w-24 overflow-hidden rounded-full border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(pendingPhoto)!} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={async () => {
                setPendingPhoto(null);
                await getBrowserClient().storage.from("acervo").remove([pendingPhoto]);
              }}
              aria-label="Remover foto"
              className="absolute right-1 top-1 rounded-full bg-ink/70 p-1 text-paper hover:bg-bad"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ) : (
          <PhotoUploader
            folder={`artistas/${draftId}`}
            multiple={false}
            label="Enviar foto do artista"
            onUploaded={async (paths) => {
              setPendingPhoto(paths[0]!);
              return { ok: true };
            }}
          />
        )}
      </div>

      <SubmitButton>{artist ? "Salvar alterações" : "Cadastrar artista"}</SubmitButton>
    </form>
  );
}
