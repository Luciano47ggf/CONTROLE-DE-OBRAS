import type { ArtworkStatus, SwapStatus, UserRole } from "./types";

export const STATUS_LABEL: Record<ArtworkStatus, string> = {
  disponivel: "Disponível",
  reservada: "Reservada",
  em_transporte: "Em transporte",
  instalada: "Instalada",
  em_manutencao: "Em manutenção",
  em_restauracao: "Em restauração",
  indisponivel: "Indisponível",
};

export const SWAP_LABEL: Record<SwapStatus, string> = {
  verde: "No prazo",
  amarelo: "Troca próxima",
  vermelho: "Troca vencida",
};

const num = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 380 → "3,80" */
export function meters(cm: number | string | null | undefined): string {
  if (cm === null || cm === undefined || cm === "") return "—";
  return num.format(Number(cm) / 100);
}

/** (380, 220) → "3,80 × 2,20 m" */
export function dims(wCm: number | string, hCm: number | string): string {
  return `${meters(wCm)} × ${meters(hCm)} m`;
}

export function money(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return brl.format(Number(v));
}

/** "2026-10-01" ou ISO completo → "01/10/2026" (sem deslocamento de fuso) */
export function date(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${Math.abs(n) === 1 ? one : many}`;
}

/** Texto do prazo de troca a partir dos dias restantes */
export function swapText(daysRemaining: number | null): string {
  if (daysRemaining === null) return "—";
  if (daysRemaining < 0) return `Vencida há ${plural(-daysRemaining, "dia", "dias")}`;
  if (daysRemaining === 0) return "Troca hoje";
  return `Faltam ${plural(daysRemaining, "dia", "dias")}`;
}

/** Texto do histórico de uma recomendação no cliente ("Inédita..." ou "Passou N vezes...") */
export function historyReason(r: { times_at_client: number; last_at_client: string | null }): string {
  if (r.times_at_client === 0) return "Inédita neste cliente";
  const ago = r.last_at_client ? Math.round((Date.now() - new Date(r.last_at_client).getTime()) / 86_400_000) : 0;
  return `Passou por este cliente ${plural(r.times_at_client, "vez", "vezes")}, a última há ${plural(ago, "dia", "dias")}`;
}

export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/acervo/${path}`;
}

/** Hoje como "YYYY-MM-DD" no fuso local de quem executa (navegador ou servidor) */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  operador: "Operador",
  leitura: "Consulta",
};
