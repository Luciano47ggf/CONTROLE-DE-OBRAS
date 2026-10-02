import { getCatalogs } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { ArtworkForm } from "../artwork-form";

export default async function NewArtworkPage() {
  const { artists, categories } = await getCatalogs();
  return (
    <>
      <PageHeader title="Nova obra" back={{ href: "/obras", label: "Acervo" }} />
      <div className="panel max-w-4xl p-6 sm:p-8"><ArtworkForm artists={artists} categories={categories} /></div>
    </>
  );
}
