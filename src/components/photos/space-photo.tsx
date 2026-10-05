"use client";

import { PhotoUploader } from "./uploader";
import { RemovePhotoButton } from "./remove-photo-button";
import { setSpacePhoto, removeSpacePhoto } from "@/app/(app)/obras/photo-actions";

export function SpacePhotoUploader({ clientId, spaceId, hasPhoto }: { clientId: string; spaceId: string; hasPhoto: boolean }) {
  return (
    <div className="space-y-2">
      <PhotoUploader
        folder={`espacos/${clientId}/${spaceId}`}
        multiple={false}
        label={hasPhoto ? "Trocar foto do espaço" : "Enviar foto do espaço"}
        onUploaded={(paths) => setSpacePhoto(spaceId, paths[0]!)}
      />
      {hasPhoto && <RemovePhotoButton onRemove={() => removeSpacePhoto(spaceId)} />}
    </div>
  );
}
