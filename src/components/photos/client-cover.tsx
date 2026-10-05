"use client";

import { PhotoUploader } from "./uploader";
import { RemovePhotoButton } from "./remove-photo-button";
import { setClientCover, removeClientCover } from "@/app/(app)/clientes/actions";

/** Foto de capa do cliente: a prévia do card, separada do logo */
export function ClientCoverUploader({ clientId, hasCover }: { clientId: string; hasCover: boolean }) {
  return (
    <div className="space-y-2">
      <PhotoUploader
        folder={`clientes/${clientId}/capa`}
        multiple={false}
        label={hasCover ? "Trocar foto de capa" : "Enviar foto de capa"}
        onUploaded={(paths) => setClientCover(clientId, paths[0]!)}
      />
      {hasCover && <RemovePhotoButton onRemove={() => removeClientCover(clientId)} label="Remover capa" />}
    </div>
  );
}
