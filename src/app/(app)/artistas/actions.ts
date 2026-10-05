"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dbError, formObject, optInt, optText, requiredText, zodErrors } from "@/lib/form";
import type { ActionState } from "@/lib/types";

const schema = z.object({
  name: requiredText("Nome"),
  nationality: optText,
  birth_year: optInt(1000, 2100),
  bio: optText,
  notes: optText,
});

export async function saveArtist(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(formObject(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const id = fd.get("id") as string | null;

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("artists").update(parsed.data).eq("id", id)
    : await supabase.from("artists").insert(parsed.data);
  if (error) return dbError(error);

  revalidatePath("/artistas");
  if (id) redirect("/artistas");
  return { ok: true };
}

export async function deleteArtist(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("artists").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") return { error: "Este artista tem obras no acervo e não pode ser removido." };
    return dbError(error);
  }
  revalidatePath("/artistas");
  redirect("/artistas");
}
