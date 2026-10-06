import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { EnvironmentForm } from "../../../../environment-form";
import { DeleteButton } from "@/components/delete-button";
import { deleteEnvironment } from "../../../../environment-actions";
import type { ClientEnvironment } from "@/lib/types";

export default async function EditEnvironmentPage({
  params,
}: {
  params: Promise<{ id: string; environmentId: string }>;
}) {
  const { id, environmentId } = await params;
  const supabase = await createClient();
  const [{ data: client }, { data: environment }] = await Promise.all([
    supabase.from("clients").select("id, name").eq("id", id).maybeSingle(),
    supabase.from("client_environments").select("*").eq("id", environmentId).eq("client_id", id).maybeSingle(),
  ]);
  if (!client || !environment) notFound();
  return (
    <>
      <PageHeader title={`Editar ${environment.name}`} subtitle={client.name} back={{ href: `/clientes/${id}`, label: client.name }} />
      <div className="panel max-w-2xl p-6 sm:p-8">
        <EnvironmentForm clientId={id} environment={environment as ClientEnvironment} />
      </div>
      <div className="mt-6">
        <DeleteButton action={deleteEnvironment.bind(null, environmentId, id)} label="Remover ambiente"
          confirm="Remover este ambiente? Só é possível se ele não tiver pontos de exposição cadastrados." />
      </div>
    </>
  );
}
