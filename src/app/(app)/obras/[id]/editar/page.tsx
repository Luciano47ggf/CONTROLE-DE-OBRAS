import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCatalogs } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { ArtworkForm } from "../../artwork-form";
import type { ArtworkRow } from "@/lib/types";

export default async function EditArtworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, { artists, categories }] = await Promise.all([
    supabase.from("v_artworks").select("*").eq("id", id).maybeSingle(),
    getCatalogs(),
  ]);
  if (!data) notFound();
  const a = data as ArtworkRow;
  return (
    <>
      <PageHeader title={`Editar ${a.title}`} back={{ href: `/obras/${id}`, label: a.title }} />
      <div className="panel max-w-4xl p-6 sm:p-8"><ArtworkForm artwork={a} artists={artists} categories={categories} /></div>
    </>
  );
}
