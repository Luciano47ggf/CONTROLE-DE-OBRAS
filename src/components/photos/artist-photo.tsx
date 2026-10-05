"use client";

import { PhotoUploader } from "./uploader";
import { RemovePhotoButton } from "./remove-photo-button";
import { setArtistPhoto, removeArtistPhoto } from "@/app/(app)/artistas/actions";

export function ArtistPhotoUploader({ artistId, hasPhoto }: { artistId: string; hasPhoto: boolean }) {
  return (
    <div className="space-y-2">
      <PhotoUploader
        folder={`artistas/${artistId}`}
        multiple={false}
        label={hasPhoto ? "Trocar foto" : "Enviar foto do artista"}
        onUploaded={(paths) => setArtistPhoto(artistId, paths[0]!)}
      />
      {hasPhoto && <RemovePhotoButton onRemove={() => removeArtistPhoto(artistId)} />}
    </div>
  );
}
