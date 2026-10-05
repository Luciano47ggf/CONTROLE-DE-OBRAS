"use client";

import { PhotoUploader } from "./uploader";
import { setSpacePhoto } from "@/app/(app)/obras/photo-actions";

export function SpacePhotoUploader({ clientId, spaceId, hasPhoto }: { clientId: string; spaceId: string; hasPhoto: boolean }) {
  return (
    <PhotoUploader
      folder={`espacos/${clientId}/${spaceId}`}
      multiple={false}
      label={hasPhoto ? "Trocar foto do espaço" : "Enviar foto do espaço"}
      onUploaded={(paths) => setSpacePhoto(spaceId, paths[0]!)}
    />
  );
}
