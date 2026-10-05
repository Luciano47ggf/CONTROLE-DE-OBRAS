import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getSettings } from "@/lib/queries";
import { PageHeader, Photo, SwapIndicator, EmptyState } from "@/components/ui";
import { WallPreview } from "@/components/wall-preview";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { BlockedBadge } from "@/components/clients/release-repeat";
import { SpacePhotoUploader } from "@/components/photos/space-photo";
import { InstallForm } from "@/components/movements/install-form";
import { ReturnForm, PostponeForm } from "@/components/movements/return-form";
import { date, dims, historyReason, plural, swapText } from "@/lib/format";
import type { ActiveInstallationRow, HistoryRow, Recommendation, SpaceRow } from "@/lib/types";

export default async function SpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ instalada?: string; reservada?: string; mais?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const limit = sp.mais ? 60 : 12;

  const [{ data: spaceData }, { data: occupantsData }, { data: recs, error: recError }, { data: hist }, { data: reserved }, settings, me] =
    await Promise.all([
      supabase.from("v_spaces").select("*").eq("id", id).maybeSingle(),
      supabase.from("v_active_installations").select("*").eq("space_id", id).order("expected_swap_at"),
      supabase.rpc("recommend_artworks", { p_space_id: id, p_limit: limit }),
      supabase.from("v_installation_history").select("*").eq("space_id", id).order("installed_at", { ascending: false }).limit(50),
      supabase.from("v_artworks").select("id, code, title, status").eq("reserved_space_id", id),
      getSettings(),
      getCurrentUser(),
    ]);
  if (!spaceData) notFound();
  const canWrite = !!me?.canWrite;
  const space = spaceData as SpaceRow;
  const occupants = (occupantsData ?? []) as ActiveInstallationRow[];
  const recommendations = (recs ?? []) as Recommendation[];
  const history = ((hist ?? []) as HistoryRow[]).filter((h) => !h.is_active);
  const { data: client } = await supabase.from("clients").select("default_swap_days").eq("id", space.client_id).single();
  const swapDays = space.swap_days ?? client?.default_swap_days ?? settings.default_swap_days;
  const usableW = Math.max(space.width_cm - 2 * settings.edge_margin_cm, 0);
  const usableH = Math.max(space.height_cm - 2 * settings.edge_margin_cm, 0);
  // O modelo continua 1 obra ativa por espaço por vez (ver migration 0007)
  const occupiedBy = occupants[0]?.artwork_title ?? null;

  return (
    <>
      <PageHeader
        title={space.name}
        back={{ href: `/clientes/${space.client_id}`, label: space.client_name }}
        subtitle={`${space.environment_name}, ${dims(space.width_cm, space.height_cm)}, área útil ${dims(usableW, usableH)}${space.space_type_name ? `, ${space.space_type_name.toLowerCase()}` : ""}`}
        actions={canWrite && <Link href={`/espacos/${id}/editar`} className="btn-secondary">Editar espaço</Link>}
      />

      {(sp.instalada || sp.reservada) && (
        <p role="status" className="mb-6 rounded-md border border-ok/30 bg-ok-tint px-4 py-3 text-sm text-ok">
          {sp.instalada ? "Obra instalada. O histórico e o prazo de troca foram registrados." : "Obra reservada para este espaço."}
        </p>
      )}

      {/* situação atual: um espaço pode ter mais de uma obra ao mesmo tempo */}
      <section className="panel p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="title-serif text-xl">{occupants.length === 0 ? "Parede vazia" : "Obras neste espaço"}</h2>
          {occupants.length > 0 && <span className="text-sm text-muted">{plural(occupants.length, "obra instalada", "obras instaladas")}</span>}
        </div>

        {occupants.length === 0 ? (
          <>
            <div className="flex min-h-48 items-center justify-center bg-wall p-5">
              <WallPreview wallW={space.width_cm} wallH={space.height_cm} margin={settings.edge_margin_cm} className="h-48 max-w-full" />
            </div>
            <p className="mt-4 text-muted">
              Escolha uma das sugestões abaixo para instalar. O prazo de troca padrão deste espaço é de {plural(swapDays, "dia", "dias")}.
            </p>
          </>
        ) : (
          <ul className="space-y-5">
            {occupants.map((o) => (
              <li key={o.installation_id} className="flex flex-col gap-4 border-t border-line pt-5 first:border-t-0 first:pt-0 sm:flex-row">
                <Photo path={o.artwork_photo} alt={o.artwork_title} className="h-28 w-28 shrink-0 rounded-sm" />
                <div className="min-w-0 flex-1">
                  <Link href={`/obras/${o.artwork_id}`} className="title-serif text-xl hover:underline">{o.artwork_title}</Link>
                  <p className="text-muted">{o.artist_name}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-muted">Instalada em</dt><dd>{date(o.installed_at)} ({plural(o.days_on_site ?? 0, "dia", "dias")})</dd></div>
                    <div><dt className="text-muted">Troca prevista</dt><dd>{date(o.expected_swap_at)}</dd></div>
                  </dl>
                  <div className="mt-2"><SwapIndicator status={o.swap_status}>{swapText(o.days_remaining)}</SwapIndicator></div>
                  {canWrite && (
                    <>
                      <details className="mt-4 border-t border-line pt-3">
                        <summary className="cursor-pointer text-sm font-medium text-accent">Registrar retirada sem substituir</summary>
                        <div className="mt-3"><ReturnForm installationId={o.installation_id} back={`/espacos/${id}`} /></div>
                      </details>
                      <details className="mt-2 border-t border-line pt-3">
                        <summary className="cursor-pointer text-sm font-medium text-accent">Alterar data de troca</summary>
                        <div className="mt-3"><PostponeForm installationId={o.installation_id} current={o.expected_swap_at} /></div>
                      </details>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {reserved && reserved.length > 0 && (
          <p className="mt-5 rounded-md bg-accent-tint px-3 py-2 text-sm text-accent">
            Reservada para cá: {reserved.map((r) => <Link key={r.id} href={`/obras/${r.id}`} className="underline">{r.title}</Link>)}
          </p>
        )}
        {space.notes && <p className="mt-4 text-sm text-muted">{space.notes}</p>}
      </section>

      {(space.photo_path || canWrite) && (
        <section className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {space.photo_path ? (
            <figure>
              <Photo path={space.photo_path} alt={`Foto do espaço ${space.name}`} className="max-h-80 w-full rounded-md" />
              <figcaption className="mt-1 text-xs text-muted">Foto do local, para conferir luz, acesso e entorno.</figcaption>
            </figure>
          ) : (
            <p className="self-center text-sm text-muted">Sem foto do local. Uma foto ajuda a equipe de montagem a conferir luz e acesso.</p>
          )}
          {canWrite && <SpacePhotoUploader clientId={space.client_id} spaceId={space.id} hasPhoto={!!space.photo_path} />}
        </section>
      )}

      {/* recomendações */}
      <section className="mt-12">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="title-serif text-2xl">Obras sugeridas para este espaço</h2>
          <span className="text-sm text-muted">{plural(space.compatible_available, "obra disponível cabe", "obras disponíveis cabem")} aqui</span>
        </div>
        <p className="mb-6 max-w-prose text-sm text-muted">
          Só aparecem obras disponíveis que cabem na área útil. A nota soma tamanho (40), histórico neste cliente (30), tempo parada no estoque (20) e categoria adequada ao tipo de espaço (10). Uma obra que já passou por este cliente fica marcada e só volta a ser recomendada normalmente depois de uma liberação manual.
        </p>

        {recError ? (
          <EmptyState title="Não foi possível calcular as sugestões">{recError.message}</EmptyState>
        ) : recommendations.length === 0 ? (
          <EmptyState title="Nenhuma obra disponível cabe aqui">
            Todas as obras compatíveis estão instaladas, reservadas ou em manutenção. Confira o <Link href="/obras" className="link">estoque</Link> ou revise as medidas do espaço.
          </EmptyState>
        ) : (
          <ol className="space-y-4">
            {recommendations.map((r, i) => (
              <li key={r.artwork_id} className="panel">
                <div className="grid gap-5 p-5 md:grid-cols-[120px_minmax(0,1fr)_140px_110px] md:items-center">
                  <Photo path={r.photo_thumb_path} alt={r.title} className="aspect-square w-full max-w-[120px] rounded-sm" />
                  <div className="min-w-0">
                    <Link href={`/obras/${r.artwork_id}`} className="title-serif text-xl hover:underline">{r.title}</Link>
                    <p className="text-sm text-muted">
                      {r.artist_name}, {r.code}{r.category_name ? `, ${r.category_name.toLowerCase()}` : ""}
                    </p>
                    <p className="mt-1 text-sm">{dims(r.width_cm, r.height_cm)}</p>
                    {r.blocked && (
                      <div className="mt-2">
                        <BlockedBadge artworkId={r.artwork_id} clientId={space.client_id} />
                      </div>
                    )}
                    <ul className="mt-2 space-y-0.5 text-sm text-muted">
                      <li>{historyReason(r)}</li>
                      <li>Parada no estoque há {plural(r.idle_days, "dia", "dias")}</li>
                    </ul>
                    <div className="mt-4 max-w-md"><ScoreBreakdown rec={r} /></div>
                  </div>
                  <div className="hidden h-24 items-center justify-center bg-wall p-2 md:flex">
                    <WallPreview wallW={space.width_cm} wallH={space.height_cm} artW={r.width_cm} artH={r.height_cm}
                      margin={settings.edge_margin_cm} className="h-full max-w-full" title={`${r.title} na parede`} />
                  </div>
                  <div className="md:text-right">
                    <p className="font-serif text-4xl font-medium tabular-nums">{Math.round(r.score_total)}%</p>
                    <p className="text-sm text-muted">{r.blocked ? "bloqueada" : i === 0 ? "melhor opção" : "compatível"}</p>
                  </div>
                </div>
                {canWrite && !r.blocked && <details className="border-t border-line">
                  <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-accent">Instalar esta obra</summary>
                  <div className="px-5 pb-5">
                    <InstallForm artworkId={r.artwork_id} spaceId={id} occupiedBy={occupiedBy} defaultSwapDays={swapDays} />
                  </div>
                </details>}
              </li>
            ))}
          </ol>
        )}
        {!sp.mais && recommendations.length === limit && (
          <Link href={`/espacos/${id}?mais=1`} className="btn-secondary mt-4">Ver mais sugestões</Link>
        )}
      </section>

      {/* histórico do espaço */}
      <section className="mt-12">
        <h2 className="title-serif mb-4 text-xl">Obras que já estiveram neste espaço</h2>
        {history.length === 0 ? (
          <p className="text-muted">Nenhuma obra passou por aqui ainda.</p>
        ) : (
          <div className="panel overflow-x-auto">
            <table className="table">
              <thead><tr><th>Obra</th><th>Período</th><th className="text-right">Permanência</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.installation_id}>
                    <td><Link href={`/obras/${h.artwork_id}`} className="font-serif text-base hover:underline">{h.artwork_title}</Link></td>
                    <td className="tabular-nums">{date(h.installed_at)} a {date(h.removed_at)}</td>
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
