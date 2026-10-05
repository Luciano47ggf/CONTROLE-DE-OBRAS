import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { ArtistForm } from "./artist-form";
import { ArtistBoard, type ArtistSummary } from "./artist-board";

export default async function ArtistsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select("id, name, nationality, birth_year, photo_path, artworks(count)")
    .order("name");
  const raw = (data ?? []) as unknown as {
    id: string; name: string; nationality: string | null; birth_year: number | null; photo_path: string | null;
    artworks: { count: number }[];
  }[];
  const artists: ArtistSummary[] = raw.map((a) => ({
    id: a.id,
    name: a.name,
    nationality: a.nationality,
    birth_year: a.birth_year,
    photo_path: a.photo_path,
    artworkCount: a.artworks[0]?.count ?? 0,
  }));

  return (
    <>
      <PageHeader title="Artistas" subtitle={`${artists.length} no cadastro`} />
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <ArtistBoard artists={artists} />
        </section>
        <section className="panel h-fit p-6">
          <h2 className="title-serif mb-4 text-xl">Novo artista</h2>
          <ArtistForm />
        </section>
      </div>
    </>
  );
}
