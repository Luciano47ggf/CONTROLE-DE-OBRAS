import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { ClientsBoard, type ClientSummary } from "@/components/clients/clients-board";

export default async function ClientsPage() {
  const supabase = await createClient();
  const canWrite = !!(await getCurrentUser())?.canWrite;

  const [{ data: clients }, { data: environments }, { data: spaces }, { data: occupants }] = await Promise.all([
    supabase.from("clients").select("id, name, segment, active, logo_path").order("name").limit(500),
    supabase.from("client_environments").select("client_id").eq("active", true),
    supabase.from("client_spaces").select("client_id").eq("active", true),
    supabase
      .from("v_active_installations")
      .select("client_id, days_remaining, artwork_photo")
      .order("installed_at", { ascending: false }),
  ]);

  const environmentCount = new Map<string, number>();
  for (const e of environments ?? []) environmentCount.set(e.client_id, (environmentCount.get(e.client_id) ?? 0) + 1);

  const spaceCount = new Map<string, number>();
  for (const s of spaces ?? []) spaceCount.set(s.client_id, (spaceCount.get(s.client_id) ?? 0) + 1);

  type OccSummary = { count: number; nextDays: number | null; photo: string | null };
  const occSummary = new Map<string, OccSummary>();
  for (const o of occupants ?? []) {
    if (!o.client_id) continue;
    const cur = occSummary.get(o.client_id) ?? { count: 0, nextDays: null, photo: null };
    cur.count++;
    if (o.days_remaining !== null && (cur.nextDays === null || o.days_remaining < cur.nextDays)) cur.nextDays = o.days_remaining;
    if (!cur.photo && o.artwork_photo) cur.photo = o.artwork_photo;
    occSummary.set(o.client_id, cur);
  }

  const summaries: ClientSummary[] = (clients ?? []).map((c) => {
    const occ = occSummary.get(c.id) ?? { count: 0, nextDays: null, photo: null };
    return {
      id: c.id,
      name: c.name,
      segment: c.segment,
      active: c.active,
      logoPath: c.logo_path,
      environmentCount: environmentCount.get(c.id) ?? 0,
      spaceCount: spaceCount.get(c.id) ?? 0,
      occupantCount: occ.count,
      nextSwapDays: occ.nextDays,
      previewPhoto: occ.photo,
    };
  });

  return (
    <>
      <PageHeader
        title="Visão geral"
        subtitle="Clientes, seus espaços e obras em circulação"
        actions={canWrite && <Link href="/clientes/novo" className="btn-primary">Cadastrar cliente</Link>}
      />
      <ClientsBoard clients={summaries} canWrite={canWrite} />
    </>
  );
}
