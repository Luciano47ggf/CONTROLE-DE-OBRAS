import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { EnvironmentForm } from "../../../environment-form";

export default async function NewEnvironmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("id, name").eq("id", id).maybeSingle();
  if (!client) notFound();
  return (
    <>
      <PageHeader title="Novo ambiente" subtitle={client.name} back={{ href: `/clientes/${id}`, label: client.name }} />
      <div className="panel max-w-2xl p-6 sm:p-8">
        <EnvironmentForm clientId={id} />
      </div>
    </>
  );
}
