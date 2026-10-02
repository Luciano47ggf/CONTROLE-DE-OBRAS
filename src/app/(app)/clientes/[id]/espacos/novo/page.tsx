import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCatalogs, getSettings } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { SpaceForm } from "../../../../espacos/space-form";

export default async function NewSpacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: client }, catalogs, settings] = await Promise.all([
    supabase.from("clients").select("id, name").eq("id", id).maybeSingle(),
    getCatalogs(),
    getSettings(),
  ]);
  if (!client) notFound();
  return (
    <>
      <PageHeader title="Novo espaço" subtitle={client.name} back={{ href: `/clientes/${id}`, label: client.name }} />
      <div className="panel p-6 sm:p-8">
        <SpaceForm clientId={id} spaceTypes={catalogs.spaceTypes} margin={settings.edge_margin_cm} />
      </div>
    </>
  );
}
