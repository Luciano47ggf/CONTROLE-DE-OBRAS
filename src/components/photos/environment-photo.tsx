"use client";

import { PhotoUploader } from "./uploader";
import { RemovePhotoButton } from "./remove-photo-button";
import { setEnvironmentPhoto, removeEnvironmentPhoto } from "@/app/(app)/clientes/environment-actions";

export function EnvironmentPhotoUploader({ clientId, environmentId, hasPhoto }: { clientId: string; environmentId: string; hasPhoto: boolean }) {
  return (
    <div className="space-y-2">
      <PhotoUploader
        folder={`ambientes/${clientId}/${environmentId}`}
        multiple={false}
        label={hasPhoto ? "Trocar foto do ambiente" : "Enviar foto do ambiente"}
        onUploaded={(paths) => setEnvironmentPhoto(environmentId, paths[0]!)}
      />
      {hasPhoto && <RemovePhotoButton onRemove={() => removeEnvironmentPhoto(environmentId)} />}
    </div>
  );
}
