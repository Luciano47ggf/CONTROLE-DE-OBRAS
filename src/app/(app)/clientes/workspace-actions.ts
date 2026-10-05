"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { dbError } from "@/lib/form";
import { loadClientWorkspace } from "@/lib/queries";
import type { ActionState } from "@/lib/types";

/** Chamada direto do drawer (componente cliente) para carregar a aba de um cliente sem navegar */
export async function getClientWorkspace(clientId: string) {
  const supabase = await createClient();
  return loadClientWorkspace(supabase, clientId);
}

/**
 * Libera a repetição de uma obra para um cliente: sem isso, uma obra que já passou
 * por este cliente não volta a ser recomendada. Fica registrado quem liberou e quando.
 */
export async function releaseRepeat(artworkId: string, clientId: string, reason: string): Promise<ActionState> {
  const me = await getCurrentUser();
  if (!me?.canWrite) return { error: "Seu usuário não pode liberar repetição de obras." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("release_artwork_repeat", {
    p_artwork_id: artworkId,
    p_client_id: clientId,
    p_reason: reason || undefined,
  });
  if (error) return dbError(error);
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/clientes");
  revalidatePath("/", "layout");
  return { ok: true };
}
