import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import type { SpaceRow } from "@/lib/types";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; inativos?: string }> }) {
  const { q, inativos } = await searchParams;
  const supabase = await createClient();
  const canWrite = !!(await getCurrentUser())?.canWrite;

  let query = supabase.from("clients").select("id, name, city, state, contact_name, active").order("name").limit(500);
  if (!inativos) query = query.eq("active", true);
  if (q) query = query.ilike("name", `%${q}%`);
  const [{ data: clients }, { data: spaces }] = await Promise.all([
    query,
    supabase.from("v_spaces").select("client_id, artwork_id, swap_status").eq("active", true),
  ]);

  const byClient = new Map<string, { total: number; occupied: number; overdue: number }>();
  for (const s of (spaces ?? []) as Pick<SpaceRow, "client_id" | "artwork_id" | "swap_status">[]) {
    const c = byClient.get(s.client_id) ?? { total: 0, occupied: 0, overdue: 0 };
    c.total++;
    if (s.artwork_id) c.occupied++;
    if (s.swap_status === "vermelho") c.overdue++;
    byClient.set(s.client_id, c);
  }

  return (
    <>
      <PageHeader
        title="Clientes e espaços"
        actions={canWrite && <Link href="/clientes/novo" className="btn-primary">Cadastrar cliente</Link>}
      />
      <form className="mb-5 flex flex-wrap items-center gap-3">
        <input name="q" defaultValue={q} placeholder="Buscar por nome" className="input max-w-xs" />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name="inativos" value="1" defaultChecked={!!inativos} /> Incluir inativos
        </label>
        <button className="btn-secondary">Filtrar</button>
      </form>

      {!clients?.length ? (
        <EmptyState title={q ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
          action={<Link href="/clientes/novo" className="btn-primary">Cadastrar cliente</Link>}>
          {q ? "Confira a grafia ou limpe a busca." : "Cadastre um cliente e depois os espaços onde as obras serão instaladas."}
        </EmptyState>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="table">
            <thead><tr><th>Cliente</th><th>Cidade</th><th>Responsável</th><th>Espaços ocupados</th><th>Trocas vencidas</th></tr></thead>
            <tbody>
              {clients.map((c) => {
                const s = byClient.get(c.id) ?? { total: 0, occupied: 0, overdue: 0 };
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                      {!c.active && <span className="ml-2 rounded bg-line px-1.5 py-0.5 text-xs text-muted">inativo</span>}
                    </td>
                    <td className="text-muted">{c.city ? `${c.city}${c.state ? `/${c.state}` : ""}` : "—"}</td>
                    <td className="text-muted">{c.contact_name ?? "—"}</td>
                    <td className="tabular-nums">{s.occupied} de {s.total}</td>
                    <td className={`tabular-nums ${s.overdue ? "font-medium text-bad" : "text-muted"}`}>{s.overdue}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
