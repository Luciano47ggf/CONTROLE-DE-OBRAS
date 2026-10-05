import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getCatalogs } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { ArtworkBoard } from "./artwork-board";
import { ARTWORK_STATUSES, type ArtworkRow, type ArtworkStatus } from "@/lib/types";
import { plural } from "@/lib/format";

const PAGE = 30;

type Search = {
  q?: string; status?: string; artista?: string; categoria?: string;
  larg?: string; alt?: string; parada?: string; ordem?: string; p?: string;
};

const toCm = (v?: string) => {
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n * 100 : null;
};

export default async function StockPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const status = sp.status ?? "disponivel";
  const page = Math.max(1, Number(sp.p) || 1);
  const supabase = await createClient();
  const canWrite = !!(await getCurrentUser())?.canWrite;
  const { artists, categories } = await getCatalogs();

  let query = supabase.from("v_artworks").select("*", { count: "exact" });
  const isStatus = (v: string): v is ArtworkStatus => (ARTWORK_STATUSES as readonly string[]).includes(v);
  if (isStatus(status)) {
    // "manutenção" agrupa manutenção e restauração; "reservada" agrupa reservada e em transporte
    if (status === "em_manutencao") query = query.in("status", ["em_manutencao", "em_restauracao"]);
    else if (status === "reservada") query = query.in("status", ["reservada", "em_transporte"]);
    else query = query.eq("status", status);
  }
  if (sp.q) query = query.or(`title.ilike.%${sp.q.replace(/[,()]/g, " ")}%,code.ilike.%${sp.q.replace(/[,()]/g, " ")}%`);
  if (sp.artista) query = query.eq("artist_id", sp.artista);
  if (sp.categoria) query = query.eq("category_id", sp.categoria);
  const w = toCm(sp.larg);
  const h = toCm(sp.alt);
  if (w) query = query.lte("width_cm", w);
  if (h) query = query.lte("height_cm", h);
  if (sp.parada) query = query.gte("days_in_status", Number(sp.parada));

  if (sp.ordem === "titulo") query = query.order("title");
  else if (sp.ordem === "recentes") query = query.order("created_at", { ascending: false });
  else if (sp.ordem === "maiores") query = query.order("width_cm", { ascending: false });
  else query = query.order("status_changed_at", { ascending: true }); // parada há mais tempo primeiro

  const { data, count } = await query.range((page - 1) * PAGE, page * PAGE - 1);
  const rows = (data ?? []) as ArtworkRow[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  const qs = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    Object.entries({ ...sp, ...patch }).forEach(([k, v]) => v && p.set(k, v));
    return `/obras?${p.toString()}`;
  };

  const tabs: { value: string; label: string }[] = [
    { value: "disponivel", label: "Disponíveis" },
    { value: "instalada", label: "Instaladas" },
    { value: "reservada", label: "Reservadas ou em trânsito" },
    { value: "em_manutencao", label: "Manutenção e restauro" },
    { value: "indisponivel", label: "Indisponíveis" },
    { value: "todas", label: "Todas" },
  ];

  return (
    <>
      <PageHeader title="Acervo e estoque" subtitle={plural(total, "obra encontrada", "obras encontradas")}
        actions={canWrite && <Link href="/obras/nova" className="btn-primary">Cadastrar obra</Link>} />

      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-line" aria-label="Situação">
        {tabs.map((t) => (
          <Link key={t.value} href={qs({ status: t.value, p: undefined })}
            aria-current={status === t.value ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${status === t.value ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {t.label}
          </Link>
        ))}
      </nav>

      <form className="panel mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1.3fr_1.2fr_0.8fr_0.8fr_1fr_auto] lg:items-end">
        <input type="hidden" name="status" value={status} />
        <div><label className="label" htmlFor="q">Busca</label><input id="q" name="q" defaultValue={sp.q} placeholder="Nome ou código" className="input" /></div>
        <div>
          <label className="label" htmlFor="artista">Artista</label>
          <select id="artista" name="artista" defaultValue={sp.artista ?? ""} className="input">
            <option value="">Todos</option>{artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="categoria">Categoria</label>
          <select id="categoria" name="categoria" defaultValue={sp.categoria ?? ""} className="input">
            <option value="">Todas</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label className="label" htmlFor="larg">Larg. até (m)</label><input id="larg" name="larg" defaultValue={sp.larg} inputMode="decimal" className="input" /></div>
        <div><label className="label" htmlFor="alt">Alt. até (m)</label><input id="alt" name="alt" defaultValue={sp.alt} inputMode="decimal" className="input" /></div>
        <div>
          <label className="label" htmlFor="parada">No status há</label>
          <select id="parada" name="parada" defaultValue={sp.parada ?? ""} className="input">
            <option value="">Qualquer tempo</option>
            <option value="30">30+ dias</option><option value="90">90+ dias</option>
            <option value="180">180+ dias</option><option value="365">1 ano ou mais</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary">Filtrar</button>
          <Link href={`/obras?status=${status}`} className="btn-ghost">Limpar</Link>
        </div>
      </form>

      <ArtworkBoard
        rows={rows}
        canWrite={canWrite}
        emptyHref="/obras?status=todas"
        sortLinks={[["", "Parada há mais tempo"], ["recentes", "Cadastro recente"], ["titulo", "Nome"], ["maiores", "Maiores"]].map(([v, l]) => ({
          value: v!,
          label: l!,
          href: qs({ ordem: v || undefined, p: undefined }),
          active: (sp.ordem ?? "") === v,
        }))}
      />

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm" aria-label="Paginação">
          {page > 1 ? <Link href={qs({ p: String(page - 1) })} className="btn-secondary">Anterior</Link> : <span />}
          <span className="text-muted">Página {page} de {pages}</span>
          {page < pages ? <Link href={qs({ p: String(page + 1) })} className="btn-secondary">Próxima</Link> : <span />}
        </nav>
      )}
    </>
  );
}
