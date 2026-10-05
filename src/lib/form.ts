import { z } from "zod";
import type { ActionState } from "./types";

/** Lê FormData como objeto de strings aparadas (vazio → undefined). */
export function formObject(fd: FormData): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") out[k] = v.trim() === "" ? undefined : v.trim();
  }
  return out;
}

/** Texto opcional → string | null */
export const optText = z
  .string()
  .optional()
  .transform((v) => v ?? null);

/** Inteiro opcional positivo */
export const optInt = (min = 0, max = 100_000) =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined) return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message: `Informe um número inteiro entre ${min} e ${max}.` });
        return z.NEVER;
      }
      return n;
    });

function parseDecimal(v: string): number {
  return Number(v.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
}
function parseDecimalLoose(v: string): number {
  // aceita "3,8", "3.8", "1.234,50"
  return v.includes(",") ? parseDecimal(v) : Number(v);
}

/** Mesmo parser de número solto, exportado para uso no formulário (conversão m ↔ cm no navegador) */
export const parseMeasure = parseDecimalLoose;

/** Medida digitada em METROS → número em CENTÍMETROS */
export const metersToCm = (required: boolean) =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined) {
        if (required) {
          ctx.addIssue({ code: "custom", message: "Obrigatório." });
          return z.NEVER;
        }
        return null;
      }
      const m = parseDecimalLoose(v);
      if (!Number.isFinite(m) || m <= 0 || m > 100) {
        ctx.addIssue({ code: "custom", message: "Informe em metros, por exemplo 2,5." });
        return z.NEVER;
      }
      return Math.round(m * 10000) / 100; // cm com 2 casas
    });

/** Medida digitada em metros ou centímetros (conforme unidade escolhida) → número em CENTÍMETROS */
export const dimensionToCm = (required: boolean) =>
  z
    .object({ value: z.string().optional(), unit: z.string().optional() })
    .transform((d, ctx) => {
      const raw = d.value?.trim();
      if (!raw) {
        if (required) {
          ctx.addIssue({ code: "custom", message: "Obrigatório." });
          return z.NEVER;
        }
        return null;
      }
      const n = parseDecimalLoose(raw);
      const unit = d.unit === "cm" ? "cm" : "m";
      const cm = unit === "cm" ? n : n * 100;
      if (!Number.isFinite(cm) || cm <= 0 || cm > 10000) {
        ctx.addIssue({
          code: "custom",
          message: unit === "cm" ? "Informe em centímetros, por exemplo 250." : "Informe em metros, por exemplo 2,5.",
        });
        return z.NEVER;
      }
      return Math.round(cm * 100) / 100; // cm com 2 casas
    });

export const optDecimal = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (v === undefined) return null;
    const n = parseDecimalLoose(v);
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: "Valor inválido." });
      return z.NEVER;
    }
    return n;
  });

/** Coordenada opcional (latitude/longitude): número com sinal, dentro do intervalo válido */
export const optCoordinate = (min: number, max: number) =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined) return null;
      const n = Number(v);
      if (!Number.isFinite(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message: "Coordenada inválida." });
        return z.NEVER;
      }
      return n;
    });

export const requiredText = (label: string) =>
  z.string({ error: `${label} é obrigatório.` }).min(1, `${label} é obrigatório.`);

/** Converte erro do zod em ActionState com mensagens por campo */
export function zodErrors(err: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "_");
    fieldErrors[key] ??= issue.message;
  }
  return { error: "Revise os campos destacados.", fieldErrors };
}

/** Traduz erros conhecidos do Postgres; mensagens de regra (P0001) já vêm em português */
export function dbError(err: { code?: string; message: string }): ActionState {
  if (err.code === "23505") return { error: "Já existe um registro com esse valor (código, nome ou documento)." };
  if (err.code === "23503") return { error: "Este registro está ligado a outros dados e não pode ser removido." };
  if (err.code === "42501") return { error: "Seu usuário não tem permissão para esta ação." };
  return { error: err.message };
}

/** Data "YYYY-MM-DD" informada, ou hoje no fuso da operação (APP_TIMEZONE) */
export function todayOr(v: string | undefined): string {
  if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIMEZONE ?? "America/Cuiaba",
  }).format(new Date());
}
