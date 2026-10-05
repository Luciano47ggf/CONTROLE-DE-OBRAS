import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCatalogs, getSettings } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { SpaceForm } from "../../../../espacos/space-form";

export default async function NewSpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ambiente?: string }>;
}) {
  const { id } = await params;
  const { ambiente } = await searchParams;
  const supabase = await createClient();
  const [{ data: client }, { data: environments }, catalogs, settings] = await Promise.all([
    supabase.from("clients").select("id, name").eq("id", id).maybeSingle(),
    supabase.from("client_environments").select("id, name").eq("client_id", id).eq("active", true).order("position").order("name"),
    getCatalogs(),
    getSettings(),
  ]);
  if (!client) notFound();
  return (
    <>
      <PageHeader title="Novo ponto de exposição" subtitle={client.name} back={{ href: `/clientes/${id}`, label: client.name }} />
      <div className="panel p-6 sm:p-8">
        <SpaceForm
          clientId={id}
          environments={environments ?? []}
          defaultEnvironmentId={ambiente}
          spaceTypes={catalogs.spaceTypes}
          margin={settings.edge_margin_cm}
        />
      </div>
    </>
  );
}
