import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getCatalogs } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { ArtworkForm } from "../../artwork-form";
import { ArtworkGallery, type GalleryPhoto } from "@/components/photos/gallery";
import type { ArtworkRow } from "@/lib/types";

export default async function EditArtworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, { artists, categories }, me, { data: photoRows }] = await Promise.all([
    supabase.from("v_artworks").select("*").eq("id", id).maybeSingle(),
    getCatalogs(),
    getCurrentUser(),
    supabase
      .from("artwork_photos")
      .select("id, display_path, thumb_path, original_path, caption, is_cover, width, height")
      .eq("artwork_id", id)
      .order("position")
      .order("created_at"),
  ]);
  if (!data) notFound();
  const a = data as ArtworkRow;
  const photos = (photoRows ?? []) as GalleryPhoto[];
  const canWrite = !!me?.canWrite;
  return (
    <>
      <PageHeader title={`Editar ${a.title}`} back={{ href: `/obras/${id}`, label: a.title }} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="panel p-6 sm:p-8"><ArtworkForm artwork={a} artists={artists} categories={categories} /></div>
        <div>
          <p className="label mb-2">Fotos da obra</p>
          <ArtworkGallery artworkId={a.id} title={a.title} photos={photos} canWrite={canWrite} />
        </div>
      </div>
    </>
  );
}
