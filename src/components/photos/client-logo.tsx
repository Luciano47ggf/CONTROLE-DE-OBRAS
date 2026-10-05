"use client";

import { PhotoUploader } from "./uploader";
import { RemovePhotoButton } from "./remove-photo-button";
import { setClientLogo, removeClientLogo } from "@/app/(app)/clientes/actions";

export function ClientLogoUploader({ clientId, hasLogo }: { clientId: string; hasLogo: boolean }) {
  return (
    <div className="space-y-2">
      <PhotoUploader
        folder={`clientes/${clientId}`}
        multiple={false}
        label={hasLogo ? "Trocar logo" : "Enviar logo"}
        onUploaded={(paths) => setClientLogo(clientId, paths[0]!)}
      />
      {hasLogo && <RemovePhotoButton onRemove={() => removeClientLogo(clientId)} label="Remover logo" />}
    </div>
  );
}
