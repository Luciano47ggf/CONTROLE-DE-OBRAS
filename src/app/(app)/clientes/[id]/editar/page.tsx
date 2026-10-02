import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { ClientForm } from "../../client-form";
import type { Client } from "@/lib/types";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const client = data as Client;
  return (
    <>
      <PageHeader title={`Editar ${client.name}`} back={{ href: `/clientes/${id}`, label: client.name }} />
      <div className="panel max-w-3xl p-6 sm:p-8"><ClientForm client={client} /></div>
    </>
  );
}
