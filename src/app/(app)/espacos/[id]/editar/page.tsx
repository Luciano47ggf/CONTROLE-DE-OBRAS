import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCatalogs, getSettings } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { SpaceForm } from "../../space-form";
import { DeleteButton } from "@/components/delete-button";
import { deleteSpace } from "../../actions";
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
  const { data: environments } = await supabase
    .from("client_environments")
    .select("id, name")
    .eq("client_id", space.client_id)
    .eq("active", true)
    .order("position")
    .order("name");
  return (
    <>
      <PageHeader title={`Editar ${space.name}`} subtitle={space.client_name}
        back={{ href: `/clientes/${space.client_id}`, label: space.client_name }} />
      <div className="panel p-6 sm:p-8">
        <SpaceForm
          clientId={space.client_id}
          space={space}
          environments={environments ?? []}
          spaceTypes={catalogs.spaceTypes}
          margin={settings.edge_margin_cm}
        />
      </div>
      <div className="mt-6">
        <DeleteButton action={deleteSpace.bind(null, id, space.client_id)} label="Remover ponto de exposição"
          confirm="Remover este ponto de exposição? Só é possível se ele não tiver movimentações registradas." />
      </div>
    </>
  );
}
