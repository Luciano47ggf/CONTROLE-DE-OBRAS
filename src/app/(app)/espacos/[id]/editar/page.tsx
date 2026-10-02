import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCatalogs, getSettings } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { SpaceForm } from "../../space-form";
import type { SpaceRow } from "@/lib/types";

export default async function EditSpacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, catalogs, settings] = await Promise.all([
    supabase.from("v_spaces").select("*").eq("id", id).maybeSingle(),
    getCatalogs(),
    getSettings(),
  ]);
  if (!data) notFound();
  const space = data as SpaceRow;
  return (
    <>
      <PageHeader title={`Editar ${space.name}`} subtitle={space.client_name}
        back={{ href: `/clientes/${space.client_id}`, label: space.client_name }} />
      <div className="panel p-6 sm:p-8">
        <SpaceForm clientId={space.client_id} space={space} spaceTypes={catalogs.spaceTypes} margin={settings.edge_margin_cm} />
      </div>
    </>
  );
}
