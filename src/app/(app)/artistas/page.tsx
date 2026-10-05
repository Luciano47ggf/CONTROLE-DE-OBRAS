import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, Photo } from "@/components/ui";
import { ArtistForm } from "./artist-form";

export default async function ArtistsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select("id, name, nationality, birth_year, photo_path, artworks(count)")
    .order("name");
  const artists = (data ?? []) as unknown as {
    id: string; name: string; nationality: string | null; birth_year: number | null; photo_path: string | null;
    artworks: { count: number }[];
  }[];

  return (
    <>
      <PageHeader title="Artistas" subtitle={`${artists.length} no cadastro`} />
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section>
          {artists.length === 0 ? (
            <EmptyState title="Nenhum artista cadastrado">Cadastre o primeiro artista ao lado para poder registrar obras.</EmptyState>
          ) : (
            <div className="panel overflow-x-auto">
              <table className="table">
                <thead><tr><th></th><th>Nome</th><th>Nacionalidade</th><th className="text-right">Obras</th></tr></thead>
                <tbody>
                  {artists.map((a) => (
                    <tr key={a.id}>
                      <td><Photo path={a.photo_path} alt={a.name} className="h-10 w-10 rounded-full" /></td>
                      <td>
                        <Link href={`/artistas/${a.id}`} className="font-medium hover:underline">{a.name}</Link>
                        {a.birth_year && <span className="text-muted"> ({a.birth_year})</span>}
                      </td>
                      <td className="text-muted">{a.nationality ?? "—"}</td>
                      <td className="text-right tabular-nums">
                        <Link href={`/obras?status=todas&artista=${a.id}`} className="link">{a.artworks[0]?.count ?? 0}</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="panel h-fit p-6">
          <h2 className="title-serif mb-4 text-xl">Novo artista</h2>
          <ArtistForm />
        </section>
      </div>
    </>
  );
}
