import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { loadClientWorkspace } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { ClientAvatar } from "@/components/clients/client-avatar";
import { ClientWorkspaceView } from "@/components/clients/client-workspace";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const canWrite = !!(await getCurrentUser())?.canWrite;
  const data = await loadClientWorkspace(supabase, id);
  if (!data) notFound();
  const { client } = data;

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            <ClientAvatar name={client.name} logoPath={client.logo_path} size={38} />
            {client.name}
            <span
              className={`rounded px-1.5 py-0.5 text-sm font-medium ${client.active ? "bg-ok-tint text-ok" : "bg-line text-muted"}`}
            >
              {client.active ? "Ativo" : "Inativo"}
            </span>
          </span>
        }
        subtitle={client.segment}
        back={{ href: "/clientes", label: "Voltar para visão geral" }}
        actions={
          canWrite && (
            <>
              <Link href={`/clientes/${id}/editar`} className="btn-secondary">Editar cliente</Link>
              <Link href={`/clientes/${id}/espacos/novo`} className="btn-primary">Adicionar espaço</Link>
            </>
          )
        }
      />

      <ClientWorkspaceView data={data} canWrite={canWrite} variant="page" />
    </>
  );
}
