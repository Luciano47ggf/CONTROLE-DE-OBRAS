import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getSettings } from "@/lib/queries";
import { PageHeader, EmptyState } from "@/components/ui";
import { SpaceCard } from "@/components/space-card";
import { date, plural } from "@/lib/format";
import type { Client, HistoryRow, SpaceRow } from "@/lib/types";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const canWrite = !!(await getCurrentUser())?.canWrite;
  const [{ data: client }, { data: spaces }, { data: history }, settings] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase.from("v_spaces").select("*").eq("client_id", id).order("name"),
    supabase.from("v_installation_history").select("*").eq("client_id", id).order("installed_at", { ascending: false }).limit(200),
    getSettings(),
  ]);
  if (!client) notFound();
  const c = client as Client;
  const all = (spaces ?? []) as SpaceRow[];
  const active = all.filter((s) => s.active);
  const inactive = all.filter((s) => !s.active);
  const hist = (history ?? []) as HistoryRow[];

  const meta = [c.city && `${c.city}${c.state ? `/${c.state}` : ""}`, c.contact_name && `Responsável: ${c.contact_name}`, c.phone, c.email]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PageHeader
        title={c.name}
        back={{ href: "/clientes", label: "Clientes" }}
        subtitle={
          <>
            {!c.active && <span className="mr-2 rounded bg-line px-1.5 py-0.5 text-xs">inativo</span>}
            {meta || "Sem dados de contato"}
          </>
        }
        actions={canWrite &&
          <>
            <Link href={`/clientes/${id}/editar`} className="btn-secondary">Editar cliente</Link>
            <Link href={`/clientes/${id}/espacos/novo`} className="btn-primary">Adicionar espaço</Link>
          </>
        }
      />

      <h2 className="title-serif mb-4 text-xl">
        Espaços <span className="text-base text-muted">({plural(active.length, "ativo", "ativos")})</span>
      </h2>
      {active.length === 0 ? (
        <EmptyState title="Nenhum espaço cadastrado"
          action={<Link href={`/clientes/${id}/espacos/novo`} className="btn-primary">Adicionar espaço</Link>}>
          Cadastre as paredes e ambientes deste cliente com largura e altura. É a partir deles que o sistema sugere obras.
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((s) => <SpaceCard key={s.id} space={s} margin={settings.edge_margin_cm} canWrite={canWrite} />)}
        </div>
      )}
      {inactive.length > 0 && (
        <p className="mt-4 text-sm text-muted">
          Espaços inativos:{" "}
          {inactive.map((s, i) => (
            <span key={s.id}>{i > 0 && ", "}<Link href={`/espacos/${s.id}/editar`} className="link">{s.name}</Link></span>
          ))}
        </p>
      )}

      <section className="mt-12">
        <h2 className="title-serif mb-4 text-xl">Obras que já passaram por aqui</h2>
        {hist.length === 0 ? (
          <p className="text-muted">Nenhuma obra foi instalada neste cliente ainda.</p>
        ) : (
          <div className="panel overflow-x-auto">
            <table className="table">
              <thead><tr><th>Obra</th><th>Espaço</th><th>Instalação</th><th>Retirada</th><th className="text-right">Permanência</th></tr></thead>
              <tbody>
                {hist.map((h) => (
                  <tr key={h.installation_id}>
                    <td>
                      <Link href={`/obras/${h.artwork_id}`} className="font-serif text-base hover:underline">{h.artwork_title}</Link>
                      <span className="block text-xs text-muted">{h.artwork_code}, {h.artist_name}</span>
                    </td>
                    <td>{h.space_name}</td>
                    <td className="tabular-nums">{date(h.installed_at)}</td>
                    <td className="tabular-nums">{h.is_active ? <span className="text-ok">Instalada agora</span> : date(h.removed_at)}</td>
                    <td className="text-right tabular-nums">{plural(h.days_on_site, "dia", "dias")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
