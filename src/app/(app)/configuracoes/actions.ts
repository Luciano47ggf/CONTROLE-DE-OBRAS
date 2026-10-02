"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbError, formObject, optDecimal, zodErrors } from "@/lib/form";
import type { ActionState } from "@/lib/types";

const int = (min: number, max: number, label: string) =>
  z.coerce.number({ error: `${label}: número inválido.` }).int().min(min, `${label}: mínimo ${min}.`).max(max, `${label}: máximo ${max}.`);

const settingsSchema = z.object({
  edge_margin_m: optDecimal,
  default_swap_days: int(1, 3650, "Prazo"),
  swap_warning_days: int(0, 365, "Aviso"),
  history_window_days: int(1, 10000, "Janela"),
  idle_max_days: int(1, 10000, "Ociosidade"),
});

export async function saveSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = settingsSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const { edge_margin_m, ...rest } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .update({ ...rest, edge_margin_cm: Math.round((edge_margin_m ?? 0) * 100 * 100) / 100 })
    .eq("id", true)
    .select("id");
  if (error) return dbError(error);
  if (!data?.length) return { error: "Somente administradores alteram as configurações." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addCatalogItem(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const table = fd.get("table") === "space_types" ? "space_types" : "categories";
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Informe um nome." };
  const supabase = await createClient();
  const { error } = await supabase.from(table).insert({ name });
  if (error) return dbError(error);
  revalidatePath("/configuracoes");
  return { ok: true };
}

/** Define as categorias preferidas de um tipo de espaço (substitui o conjunto) */
export async function saveSpaceTypePrefs(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const typeId = String(fd.get("space_type_id"));
  const cats = fd.getAll("category_id").map(String);
  const supabase = await createClient();
  const del = await supabase.from("space_type_categories").delete().eq("space_type_id", typeId);
  if (del.error) return dbError(del.error);
  if (cats.length) {
    const ins = await supabase.from("space_type_categories").insert(cats.map((c) => ({ space_type_id: typeId, category_id: c })));
    if (ins.error) return dbError(ins.error);
  }
  revalidatePath("/configuracoes");
  return { ok: true };
}
