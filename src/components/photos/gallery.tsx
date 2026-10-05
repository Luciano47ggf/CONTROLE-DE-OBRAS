"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Star, Trash2, ExternalLink } from "lucide-react";
import { photoUrl } from "@/lib/format";
import { PhotoUploader } from "./uploader";
import {
  deleteArtworkPhoto, registerArtworkPhotos, reorderArtworkPhotos, setArtworkCover, updatePhotoCaption,
} from "@/app/(app)/obras/photo-actions";

export type GalleryPhoto = {
  id: string;
  display_path: string;
  thumb_path: string;
  original_path: string;
  caption: string | null;
  is_cover: boolean;
  width: number | null;
  height: number | null;
};

/** Galeria da obra: foto grande em moldura + miniaturas; para quem edita, gerenciamento logo abaixo */
export function ArtworkGallery({
  artworkId,
  title,
  photos,
  canWrite,
}: {
  artworkId: string;
  title: string;
  photos: GalleryPhoto[];
  canWrite: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(photos.find((p) => p.is_cover)?.id);
  const current = photos.find((p) => p.id === selectedId) ?? photos[0];
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <div className="bg-wall p-6 sm:p-10">
        <div className="border-[6px] border-brass bg-paper shadow-[0_8px_24px_-12px_rgba(29,43,42,0.45)]">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl(current.display_path)!}
              alt={current.caption ?? title}
              width={current.width ?? undefined}
              height={current.height ?? undefined}
              className="max-h-[70vh] w-full object-contain"
              data-testid="gallery-main"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center text-sm text-muted">Nenhuma foto ainda</div>
          )}
        </div>
      </div>
      {current?.caption && <p className="mt-2 text-sm italic text-muted">{current.caption}</p>}

      {photos.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Fotos da obra">
          {photos.map((p, i) => (
            <li key={p.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelectedId(p.id)}
                aria-label={`Foto ${i + 1}${p.is_cover ? ", capa" : ""}`}
                aria-current={p.id === current?.id}
                className={`block h-16 w-16 overflow-hidden rounded-sm border-2 ${p.id === current?.id ? "border-brass" : "border-transparent opacity-80 hover:opacity-100"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(p.thumb_path)!} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <div className="mt-4">
          {!editing ? (
            <button type="button" className="btn-ghost -ml-3" onClick={() => setEditing(true)}>
              {photos.length ? `Gerenciar fotos (${photos.length})` : "Adicionar fotos"}
            </button>
          ) : (
            <section className="panel space-y-4 p-4" aria-label="Gerenciar fotos">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Fotos da obra</h3>
                <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => setEditing(false)}>Fechar</button>
              </div>
              <PhotoUploader folder={`obras/${artworkId}`} onUploaded={(paths) => registerArtworkPhotos(artworkId, paths)} />
              {photos.length > 0 && (
                <ul className="space-y-2">
                  {photos.map((p, i) => (
                    <ManageRow key={p.id} artworkId={artworkId} photos={photos} photo={p} index={i} />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ManageRow({ artworkId, photos, photo, index }: { artworkId: string; photos: GalleryPhoto[]; photo: GalleryPhoto; index: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [captionSaved, setCaptionSaved] = useState(false);

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const res = await fn();
      setError(res.error);
    });

  const move = (dir: -1 | 1) => {
    const ids = photos.map((p) => p.id);
    const j = index + dir;
    [ids[index], ids[j]] = [ids[j]!, ids[index]!];
    run(() => reorderArtworkPhotos(artworkId, ids));
  };

  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-md border border-line p-2 ${pending ? "opacity-60" : ""}`} data-testid="photo-row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl(photo.thumb_path)!} alt="" className="h-14 w-14 rounded-sm object-cover" />
      <input
        value={caption}
        onChange={(e) => {
          setCaption(e.target.value);
          setCaptionSaved(false);
        }}
        onBlur={() =>
          caption !== (photo.caption ?? "") &&
          run(async () => {
            const res = await updatePhotoCaption(photo.id, caption);
            setCaptionSaved(!res.error);
            return res;
          })
        }
        placeholder="Legenda (opcional)"
        aria-label={`Legenda da foto ${index + 1}`}
        className="input min-w-40 flex-1"
      />
      <div className="flex items-center gap-1">
        {photo.is_cover ? (
          <span className="flex items-center gap-1 px-2 text-xs font-medium text-brass"><Star size={14} fill="currentColor" /> Capa</span>
        ) : (
          <button type="button" className="btn-ghost px-2" disabled={pending} onClick={() => run(() => setArtworkCover(photo.id))}>
            <Star size={14} /> Tornar capa
          </button>
        )}
        <button type="button" className="btn-ghost px-2" disabled={pending || index === 0} onClick={() => move(-1)} aria-label="Mover para a esquerda"><ArrowLeft size={15} /></button>
        <button type="button" className="btn-ghost px-2" disabled={pending || index === photos.length - 1} onClick={() => move(1)} aria-label="Mover para a direita"><ArrowRight size={15} /></button>
        <a href={photoUrl(photo.original_path)!} target="_blank" rel="noreferrer" className="btn-ghost px-2" aria-label="Abrir original"><ExternalLink size={15} /></a>
        <button
          type="button"
          className="btn-ghost px-2 text-bad hover:bg-bad-tint hover:text-bad"
          disabled={pending}
          aria-label="Excluir foto"
          onClick={() => window.confirm("Excluir esta foto? Os arquivos serão apagados.") && run(() => deleteArtworkPhoto(photo.id))}
        >
          <Trash2 size={15} />
        </button>
      </div>
      {captionSaved && !pending && <p role="status" className="w-full text-xs text-ok">Legenda salva</p>}
      {error && <p className="w-full text-sm text-bad">{error}</p>}
    </li>
  );
}
