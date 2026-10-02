import Link from "next/link";
import type { ReactNode } from "react";
import { STATUS_LABEL, SWAP_LABEL, photoUrl } from "@/lib/format";
import type { ArtworkStatus, SwapStatus } from "@/lib/types";

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-block text-sm text-muted hover:text-ink">
            ‹ {back.label}
          </Link>
        )}
        <h1 className="title-serif text-3xl font-medium leading-tight sm:text-[2.15rem]">{title}</h1>
        {subtitle && <div className="mt-1.5 text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

const STATUS_STYLE: Record<ArtworkStatus, string> = {
  disponivel: "bg-ok-tint text-ok",
  reservada: "bg-accent-tint text-accent",
  em_transporte: "bg-accent-tint text-accent",
  instalada: "bg-ink text-paper",
  em_manutencao: "bg-warn-tint text-warn",
  em_restauracao: "bg-warn-tint text-warn",
  indisponivel: "bg-line text-muted",
};

export function StatusBadge({ status }: { status: ArtworkStatus }) {
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const SWAP_DOT: Record<SwapStatus, string> = { verde: "bg-ok", amarelo: "bg-warn", vermelho: "bg-bad" };
const SWAP_TEXT: Record<SwapStatus, string> = { verde: "text-ok", amarelo: "text-warn", vermelho: "text-bad" };

export function SwapIndicator({ status, children }: { status: SwapStatus; children?: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${SWAP_TEXT[status]}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${SWAP_DOT[status]}`} aria-hidden />
      {children ?? SWAP_LABEL[status]}
    </span>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-start gap-3 px-6 py-10">
      <p className="title-serif text-xl">{title}</p>
      {children && <div className="max-w-prose text-muted">{children}</div>}
      {action}
    </div>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  className = "",
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-bad">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** Foto da obra/espaço com placeholder neutro */
export function Photo({ path, alt, className = "" }: { path: string | null; alt: string; className?: string }) {
  const url = photoUrl(path);
  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-wall text-xs text-muted ${className}`} aria-label="Sem foto">
        sem foto
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={`object-cover ${className}`} loading="lazy" />;
}

export function Stat({ label, value, href, tone }: { label: string; value: number; href?: string; tone?: "bad" | "warn" }) {
  const color = tone === "bad" && value > 0 ? "text-bad" : tone === "warn" && value > 0 ? "text-warn" : "text-ink";
  const body = (
    <>
      <span className={`font-serif text-3xl font-medium tabular-nums ${color}`}>{value}</span>
      <span className="mt-1 block text-sm text-muted">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className="block px-5 py-4 hover:bg-wall/60">
      {body}
    </Link>
  ) : (
    <div className="px-5 py-4">{body}</div>
  );
}
