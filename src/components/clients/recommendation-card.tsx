import Link from "next/link";
import { Photo } from "@/components/ui";
import { BlockedBadge } from "./release-repeat";
import { dims } from "@/lib/format";
import type { ClientRecommendation } from "@/lib/types";

function sizeTag(widthCm: number, heightCm: number) {
  const areaM2 = (Number(widthCm) * Number(heightCm)) / 10000;
  if (areaM2 >= 3) return "Grande formato";
  if (areaM2 >= 1) return "Formato médio";
  return "Formato pequeno";
}

/** Card de obra recomendada: encaixe, compatibilidade e, se já exibida no cliente, bloqueio com liberação */
export function RecommendationCard({ r, clientId }: { r: ClientRecommendation; clientId: string }) {
  const pct = Math.round(Number(r.score_total));
  return (
    <div className={`panel flex flex-col overflow-hidden ${r.blocked ? "opacity-90 grayscale-[30%]" : ""}`}>
      <div className="relative aspect-[4/3]">
        <Photo path={r.photo_thumb_path} alt={r.title} className="h-full w-full" />
        {!r.blocked && (
          <span className="absolute left-2 top-2 rounded bg-paper/90 px-1.5 py-0.5 text-xs font-medium text-accent shadow-sm">
            {pct}% compatível
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div>
          <Link href={`/obras/${r.artwork_id}`} className="font-serif text-base leading-snug hover:underline">{r.title}</Link>
          <p className="text-xs text-muted">{r.artist_name}</p>
        </div>
        <p className="text-xs">Obra: {dims(r.width_cm, r.height_cm)}</p>
        <p className="text-xs text-muted">Cabe na {r.space_name} ({dims(r.space_width_cm, r.space_height_cm)})</p>
        <div className="flex flex-wrap gap-1 pt-0.5">
          {r.category_name && <span className="rounded bg-wall px-1.5 py-0.5 text-[11px] text-muted">{r.category_name}</span>}
          <span className="rounded bg-wall px-1.5 py-0.5 text-[11px] text-muted">{sizeTag(r.width_cm, r.height_cm)}</span>
        </div>
        {r.blocked && (
          <div className="mt-auto pt-2">
            <BlockedBadge artworkId={r.artwork_id} clientId={clientId} />
          </div>
        )}
      </div>
    </div>
  );
}
