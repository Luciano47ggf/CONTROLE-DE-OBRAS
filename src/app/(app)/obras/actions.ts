"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dbError, dimensionToCm, formObject, optDecimal, optInt, optText, requiredText, zodErrors } from "@/lib/form";
import { registerArtworkPhotos } from "./photo-actions";
import { getSettings } from "@/lib/queries";
import { dims } from "@/lib/format";
import type { ActionState, ArtworkStatus } from "@/lib/types";

const schema = z.object({
  code: requiredText("Código"),
  title: requiredText("Nome da obra"),
  artist_id: z.uuid("Escolha o artista."),
  category_id: z.union([z.uuid(), z.undefined()]).transform((v) => v ?? null),
  description: optText,
  technique: optText,
  year: optInt(1000, 2100),
  width: dimensionToCm(true),
  height: dimensionToCm(true),
  depth: dimensionToCm(false),
  weight_kg: optDecimal,
  value: optDecimal,
  notes: optText,
});

export async function saveArtwork(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const raw = formObject(fd);
  const parsed = schema.safeParse({
    ...raw,
    width: { value: raw.width_value, unit: raw.width_unit },
    height: { value: raw.height_value, unit: raw.height_unit },
    depth: { value: raw.depth_value, unit: raw.depth_unit },
  });
  if (!parsed.success) return zodErrors(parsed.error);
  const { width, height, depth, ...rest } = parsed.data;
  const id = fd.get("id") as string | null;
  const supabase = await createClient();

  const values = { ...rest, width_cm: width!, height_cm: height!, depth_cm: depth };

  let artworkId = id;
  if (id) {
    const { data: current } = await supabase
      .from("artworks")
      .select("width_cm, height_cm, reserved_space_id")
      .eq("id", id)
      .single();
    if (current && (Number(current.width_cm) !== width || Number(current.height_cm) !== height)) {
      const { data: activeInstall } = await supabase
        .from("installations")
        .select("space_id")
        .eq("artwork_id", id)
        .is("removed_at", null)
        .maybeSingle();
      // Sem instalação ativa, mas com reserva pendente: o destino da reserva também precisa
      // continuar comportando a obra, senão a reserva fica inválida sem ninguém notar até a instalação.
      const targetSpaceId = activeInstall?.space_id ?? current.reserved_space_id;
      if (targetSpaceId) {
        const [{ data: space }, settings] = await Promise.all([
          supabase.from("client_spaces").select("name, width_cm, height_cm").eq("id", targetSpaceId).single(),
          getSettings(),
        ]);
        if (space) {
          const { data: fits } = await supabase.rpc("fits_space", {
            art_w: width!,
            art_h: height!,
            space_w: space.width_cm,
            space_h: space.height_cm,
            margin: settings.edge_margin_cm,
          });
          if (!fits) {
            const where = activeInstall ? "no ponto onde está instalada" : "no ponto reservado para ela";
            const action = activeInstall ? "Retire-a" : "Cancele a reserva";
            return {
              error: "Revise os campos destacados.",
              fieldErrors: {
                width: `Com este tamanho, a obra não cabe mais ${where} (${space.name}, ${dims(space.width_cm, space.height_cm)}). ${action} antes de alterar as dimensões.`,
              },
            };
          }
        }
      }
    }
    const { error } = await supabase.from("artworks").update(values).eq("id", id);
    if (error) return dbError(error);
  } else {
    const initial = fd.get("status");
    const status: ArtworkStatus =
      initial === "em_manutencao" || initial === "em_restauracao" || initial === "indisponivel" ? initial : "disponivel";
    const draftId = fd.get("draft_id") as string | null;
    const { data, error } = await supabase
      .from("artworks")
      .insert({ ...values, status, ...(draftId ? { id: draftId } : {}) })
      .select("id")
      .single();
    if (error) return dbError(error);
    artworkId = data.id;

    const photoPaths = fd.getAll("photo_path").filter((p): p is string => typeof p === "string" && p.length > 0);
    if (photoPaths.length) await registerArtworkPhotos(artworkId, photoPaths);
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
