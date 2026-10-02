"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadPhoto, removePhoto } from "@/lib/storage";
import { dbError, formObject, metersToCm, optDecimal, optInt, optText, requiredText, zodErrors } from "@/lib/form";
import type { ActionState, ArtworkStatus } from "@/lib/types";

const schema = z.object({
  code: requiredText("Código"),
  title: requiredText("Nome da obra"),
  artist_id: z.uuid("Escolha o artista."),
  category_id: z.union([z.uuid(), z.undefined()]).transform((v) => v ?? null),
  description: optText,
  technique: optText,
  year: optInt(1000, 2100),
  width_m: metersToCm(true),
  height_m: metersToCm(true),
  depth_m: metersToCm(false),
  weight_kg: optDecimal,
  value: optDecimal,
  notes: optText,
});

export async function saveArtwork(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(formObject(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const { width_m, height_m, depth_m, ...rest } = parsed.data;
  const id = fd.get("id") as string | null;
  const supabase = await createClient();

  let photo_path: string | null;
  try {
    photo_path = await uploadPhoto(supabase, fd.get("photo"), "obras");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const values = {
    ...rest,
    width_cm: width_m!,
    height_cm: height_m!,
    depth_cm: depth_m,
    ...(photo_path ? { photo_path } : {}),
  };

  let artworkId = id;
  if (id) {
    const { data: old } = await supabase.from("artworks").select("photo_path").eq("id", id).single();
    const { error } = await supabase.from("artworks").update(values).eq("id", id);
    if (error) {
      if (photo_path) await removePhoto(supabase, photo_path);
      return dbError(error);
    }
    if (photo_path && old?.photo_path) await removePhoto(supabase, old.photo_path);
  } else {
    const initial = fd.get("status");
    const status: ArtworkStatus =
      initial === "em_manutencao" || initial === "em_restauracao" || initial === "indisponivel" ? initial : "disponivel";
    const { data, error } = await supabase.from("artworks").insert({ ...values, status }).select("id").single();
    if (error) {
      if (photo_path) await removePhoto(supabase, photo_path);
      return dbError(error);
    }
    artworkId = data.id;
  }
  revalidatePath("/obras");
  redirect(`/obras/${artworkId}`);
}

const statusOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("dispatch"), artwork_id: z.uuid(), notes: optText }),
  z.object({ op: z.literal("cancel"), artwork_id: z.uuid(), notes: optText }),
  z.object({
    op: z.literal("status"),
    artwork_id: z.uuid(),
    notes: optText,
    new_status: z.enum(["disponivel", "em_manutencao", "em_restauracao", "indisponivel"], {
      error: "Escolha uma situação válida.",
    }),
  }),
]);

/** Ações de status de estoque e reserva, todas validadas no banco */
export async function artworkStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = statusOpSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;
  const p_notes = d.notes ?? undefined;
  const supabase = await createClient();

  const { error } =
    d.op === "dispatch"
      ? await supabase.rpc("dispatch_artwork", { p_artwork_id: d.artwork_id, p_notes })
      : d.op === "cancel"
        ? await supabase.rpc("cancel_reservation", { p_artwork_id: d.artwork_id, p_notes })
        : await supabase.rpc("set_artwork_status", { p_artwork_id: d.artwork_id, p_new_status: d.new_status, p_notes });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: true };
}
