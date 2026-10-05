"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dbError, formObject, metersToCm, optInt, optText, requiredText, todayOr, zodErrors } from "@/lib/form";
import type { ActionState } from "@/lib/types";

const spaceSchema = z.object({
  client_id: z.uuid(),
  name: requiredText("Nome"),
  description: optText,
  space_type_id: z.union([z.uuid(), z.undefined()]).transform((v) => v ?? null),
  width_m: metersToCm(true),
  height_m: metersToCm(true),
  notes: optText,
  swap_days: optInt(1, 3650),
});

export async function saveSpace(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = spaceSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const { width_m, height_m, ...rest } = parsed.data;
  const id = fd.get("id") as string | null;
  const supabase = await createClient();

  const values = { ...rest, width_cm: width_m!, height_cm: height_m!, active: fd.get("active") !== "off" };

  if (id) {
    const { error } = await supabase.from("client_spaces").update(values).eq("id", id);
    if (error) return dbError(error);
  } else {
    const { error } = await supabase.from("client_spaces").insert(values);
    if (error) return dbError(error);
  }
  revalidatePath(`/clientes/${rest.client_id}`);
  redirect(`/clientes/${rest.client_id}`);
}

// ---------------------------------------------------------------------
// Movimentações: chamam as funções do banco, que validam tudo
// ---------------------------------------------------------------------

const installSchema = z.object({
  artwork_id: z.uuid(),
  space_id: z.uuid(),
  installed_at: z.string().optional(),
  swap_days: optInt(1, 3650),
  responsible: optText,
  notes: optText,
  replace: z.string().optional(),
});

export async function installArtwork(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = installSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("install_artwork", {
    p_artwork_id: d.artwork_id,
    p_space_id: d.space_id,
    p_installed_at: todayOr(d.installed_at),
    p_swap_days: d.swap_days ?? undefined,
    p_responsible: d.responsible ?? undefined,
    p_notes: d.notes ?? undefined,
    p_replace_current: d.replace === "1",
  });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  redirect(`/espacos/${d.space_id}?instalada=1`);
}

export async function reserveArtwork(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const artwork_id = String(fd.get("artwork_id"));
  const space_id = String(fd.get("space_id"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("reserve_artwork", {
    p_artwork_id: artwork_id,
    p_space_id: space_id,
    p_notes: (fd.get("notes") as string) || undefined,
  });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  redirect(`/espacos/${space_id}?reservada=1`);
}

const returnSchema = z.object({
  installation_id: z.uuid(),
  returned_at: z.string().optional(),
  new_status: z.enum(["disponivel", "em_transporte", "em_manutencao", "em_restauracao", "indisponivel"]),
  notes: optText,
  back: z.string().optional(),
});

export async function returnArtwork(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = returnSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("return_artwork", {
    p_installation_id: d.installation_id,
    p_returned_at: todayOr(d.returned_at),
    p_new_status: d.new_status,
    p_notes: d.notes ?? undefined,
  });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  redirect(d.back?.startsWith("/") ? d.back : "/");
}

const postponeSchema = z.object({
  installation_id: z.uuid(),
  expected_swap_at: z.iso.date("Data inválida."),
  back: z.string().optional(),
});

export async function postponeSwap(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = postponeSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("installations")
    .update({ expected_swap_at: parsed.data.expected_swap_at })
    .eq("id", parsed.data.installation_id);
  if (error) {
    if (error.code === "23514") return { error: "A nova data não pode ser anterior à instalação." };
    return dbError(error);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
