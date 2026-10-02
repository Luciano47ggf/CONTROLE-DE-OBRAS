import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { PageHeader, Photo, StatusBadge, SwapIndicator } from "@/components/ui";
import { InstallForm } from "@/components/movements/install-form";
import { ReturnForm } from "@/components/movements/return-form";
import { StockStatusForm, ReservationActions } from "@/components/movements/status-actions";
import { getSettings } from "@/lib/queries";
import { STATUS_LABEL, date, dims, meters, money, plural, swapText } from "@/lib/format";
import type { ActiveInstallationRow, ArtworkRow, HistoryRow, MovementRow, SpaceRow } from "@/lib/types";

export default async function ArtworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, { data: hist }, { data: moves }, { data: active }, settings, me] = await Promise.all([
    supabase.from("v_artworks").select("*").eq("id", id).maybeSingle(),
    supabase.from("v_installation_history").select("*").eq("artwork_id", id).order("installed_at", { ascending: false }),
    supabase.from("v_movements").select("*").eq("artwork_id", id).order("occurred_at", { ascending: false }).limit(100),
    supabase.from("v_active_installations").select("*").eq("artwork_id", id).maybeSingle(),
    getSettings(),
    getCurrentUser(),
  ]);
  if (!data) notFound();
  const canWrite = !!me?.canWrite;
  const a = data as ArtworkRow;
  const history = (hist ?? []) as HistoryRow[];
  const movements = (moves ?? []) as MovementRow[];
  const current = active as ActiveInstallationRow | null;

  let reservedSpace: SpaceRow | null = null;
  if (a.reserved_space_id) {
    const { data: s } = await supabase.from("v_spaces").select("*").eq("id", a.reserved_space_id).maybeSingle();
    reservedSpace = s as SpaceRow | null;
  }

  const facts: [string, React.ReactNode][] = [
    ["Artista", a.artist_name],
    ["Dimensões", `${dims(a.width_cm, a.height_cm)}${a.depth_cm ? `, profundidade ${meters(a.depth_cm)} m` : ""}`],
    ["Técnica", a.technique ?? "—"],
    ["Ano", a.year ?? "—"],
    ["Categoria", a.category_name ?? "—"],
    ["Peso", a.weight_kg ? `${Number(a.weight_kg).toLocaleString("pt-BR")} kg` : "—"],
    ["Valor", money(a.value)],
    ["Cadastro", date(a.created_at)],
  ];

  return (
    <>
      <PageHeader
        title={a.title}
        subtitle={`${a.code}, ${a.artist_name}`}
        back={{ href: "/obras", label: "Acervo" }}
        actions={canWrite && <Link href={`/obras/${id}/editar`} className="btn-secondary">Editar obra</Link>}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div>
          <div className="bg-wall p-6 sm:p-10">
            <div className="border-[6px] border-brass bg-paper shadow-[0_8px_24px_-12px_rgba(29,43,42,0.45)]">
              <Photo path={a.photo_path} alt={a.title} className="aspect-[4/3] w-full" />
            </div>
          </div>
          {/* etiqueta de museu */}
          <div className="mt-4 border-l-2 border-brass pl-4">
            <p className="font-serif text-lg">{a.title}{a.year ? `, ${a.year}` : ""}</p>
            <p className="text-sm text-muted">{a.artist_name}{a.technique ? `. ${a.technique}` : ""}. {dims(a.width_cm, a.height_cm)}</p>
          </div>
          {a.description && <p className="mt-4 max-w-prose font-serif leading-relaxed">{a.description}</p>}
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {facts.map(([k, v]) => (
              <div key={k}><dt className="text-muted">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          {a.notes && <p className="mt-4 rounded-md bg-wall px-3 py-2 text-sm text-muted">{a.notes}</p>}
        </div>

        <div className="space-y-6">
          {/* situação atual */}
          <section className="panel p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="title-serif text-xl">Onde está agora</h2>
              <StatusBadge status={a.status} />
            </div>

            {a.status === "instalada" && current ? (
              <>
                <p className="mt-4 text-lg">
                  <Link href={`/clientes/${current.client_id}`} className="font-medium hover:underline">{current.client_name}</Link>
                  <span className="text-muted">, </span>
                  <Link href={`/espacos/${current.space_id}`} className="hover:underline">{current.space_name}</Link>
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-muted">Desde</dt><dd>{date(current.installed_at)}, há {plural(current.days_on_site, "dia", "dias")}</dd></div>
                  <div><dt className="text-muted">Próxima troca</dt><dd><SwapIndicator status={current.swap_status}>{swapText(current.days_remaining)}</SwapIndicator></dd></div>
                </dl>
                {canWrite && <div className="mt-5 border-t border-line pt-5">
                  <ReturnForm installationId={current.installation_id} back={`/obras/${id}`} />
                </div>}
              </>
            ) : a.reserved_space_id && reservedSpace ? (
              <>
                <p className="mt-4">
                  {a.status === "reservada" ? "Reservada" : "A caminho"} para{" "}
                  <Link href={`/espacos/${reservedSpace.id}`} className="font-medium hover:underline">{reservedSpace.client_name}, {reservedSpace.name}</Link>
                  <span className="text-muted">, há {plural(a.days_in_status, "dia", "dias")}</span>
                </p>
                {canWrite && <div className="mt-5 space-y-5 border-t border-line pt-5">
                  <div>
                    <p className="mb-3 text-sm font-medium">Registrar instalação</p>
                    <InstallForm artworkId={a.id} spaceId={reservedSpace.id} occupiedBy={reservedSpace.artwork_title}
                      defaultSwapDays={reservedSpace.swap_days ?? settings.default_swap_days} />
                  </div>
                  <ReservationActions artworkId={a.id} canDispatch={a.status === "reservada"} />
                </div>}
              </>
            ) : (
              <>
                <p className="mt-4">
                  {a.status === "disponivel" ? "No estoque, disponível" : STATUS_LABEL[a.status]} há {plural(a.days_in_status, "dia", "dias")}.
                </p>
                {a.status === "disponivel" && (
                  <p className="mt-1 text-sm text-muted">Para instalar, abra o espaço do cliente e use as sugestões: lá o sistema confere o tamanho e o histórico.</p>
                )}
                {canWrite && <div className="mt-5 border-t border-line pt-5">
                  <StockStatusForm artworkId={a.id} current={a.status} />
                </div>}
              </>
            )}
          </section>

          {/* histórico de passagens */}
          <section>
            <h2 className="title-serif mb-3 text-xl">Por onde passou</h2>
            {history.length === 0 ? (
              <p className="text-muted">Esta obra ainda não foi instalada em nenhum cliente.</p>
            ) : (
              <ol className="relative space-y-0 border-l border-line pl-6">
                {history.map((h) => (
                  <li key={h.installation_id} className="relative pb-5">
                    <span className={`absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full ${h.is_active ? "bg-brass" : "bg-line"}`} aria-hidden />
                    <p className="text-sm tabular-nums text-muted">
                      {date(h.installed_at)} a {h.is_active ? "hoje" : date(h.removed_at)}, {plural(h.days_on_site, "dia", "dias")}
                    </p>
                    <p>
                      <Link href={`/clientes/${h.client_id}`} className="font-medium hover:underline">{h.client_name}</Link>
                      <span className="text-muted">, {h.space_name}</span>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* movimentações */}
          <details className="panel">
            <summary className="cursor-pointer px-5 py-4 font-medium">Todas as movimentações ({movements.length})</summary>
            <ol className="divide-y divide-line border-t border-line">
              {movements.map((m) => (
                <li key={m.id} className="px-5 py-3 text-sm">
                  <span className="tabular-nums text-muted">{date(m.occurred_at)}</span>{" "}
                  {m.from_status ? `${STATUS_LABEL[m.from_status]} para ${STATUS_LABEL[m.to_status].toLowerCase()}` : `Entrada como ${STATUS_LABEL[m.to_status].toLowerCase()}`}
                  {m.client_name && <span className="text-muted">, {m.client_name} ({m.space_name})</span>}
                  {(m.notes || m.user_name) && (
                    <span className="block text-xs text-muted">{[m.notes, m.user_name && `por ${m.user_name}`].filter(Boolean).join(", ")}</span>
                  )}
                </li>
              ))}
            </ol>
          </details>
        </div>
      </div>
    </>
  );
}
