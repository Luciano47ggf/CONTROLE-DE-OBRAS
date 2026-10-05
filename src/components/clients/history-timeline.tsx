import Link from "next/link";
import { date, STATUS_LABEL } from "@/lib/format";
import type { ClientEvent } from "@/lib/types";

function eventText(e: ClientEvent) {
  if (e.kind === "release") {
    return (
      <>
        <span className="font-medium">{e.user_name ?? "Alguém"}</span> liberou a repetição da obra{" "}
        <Link href={`/obras/${e.artwork_id}`} className="font-medium hover:underline">&ldquo;{e.artwork_title}&rdquo;</Link>{" "}
        para este cliente.
        {e.notes && <span className="block text-xs text-muted">Motivo: {e.notes}</span>}
      </>
    );
  }
  const to = e.to_status ? STATUS_LABEL[e.to_status] : "";
  const verb = e.from_status ? `${STATUS_LABEL[e.from_status]} para ${to.toLowerCase()}` : `Entrou como ${to.toLowerCase()}`;
  return (
    <>
      <Link href={`/obras/${e.artwork_id}`} className="font-medium hover:underline">{e.artwork_title}</Link>
      <span className="text-muted"> — {verb}{e.space_name ? `, ${e.space_name}` : ""}</span>
      {(e.notes || e.user_name) && (
        <span className="block text-xs text-muted">{[e.notes, e.user_name && `por ${e.user_name}`].filter(Boolean).join(", ")}</span>
      )}
    </>
  );
}

/** Linha do tempo do cliente: instalações, retiradas, reservas e liberações de repetição juntas */
export function HistoryTimeline({ events }: { events: ClientEvent[] }) {
  if (events.length === 0) return <p className="text-muted">Nenhum evento registrado ainda.</p>;
  return (
    <ol className="divide-y divide-line border-t border-line">
      {events.map((e) => (
        <li key={e.event_id} className="flex items-start gap-3 py-3">
          <span className="w-24 shrink-0 text-xs tabular-nums text-muted">{date(e.occurred_at)}</span>
          <div className="min-w-0 text-sm">{eventText(e)}</div>
        </li>
      ))}
    </ol>
  );
}
