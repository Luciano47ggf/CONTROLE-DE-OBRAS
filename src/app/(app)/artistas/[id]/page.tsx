import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { ArtistForm } from "../artist-form";
import { DeleteButton } from "@/components/delete-button";
import { deleteArtist } from "../actions";
import type { Artist } from "@/lib/types";

export default async function EditArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("artists").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const artist = data as Artist;

  return (
    <>
      <PageHeader title={artist.name} back={{ href: "/artistas", label: "Artistas" }} />
      <div className="panel max-w-2xl p-6">
        <ArtistForm artist={artist} />
      </div>
      <div className="mt-6">
        <DeleteButton action={deleteArtist.bind(null, artist.id)} label="Remover artista"
          confirm="Remover este artista? Só é possível se ele não tiver obras no acervo." />
      </div>
    </>
  );
}
