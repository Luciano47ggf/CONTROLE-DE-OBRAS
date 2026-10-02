"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { dbError, formObject, requiredText, zodErrors } from "@/lib/form";
import type { ActionState } from "@/lib/types";

export async function updateMyName(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = z.object({ full_name: requiredText("Nome") }).safeParse(formObject(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const me = await getCurrentUser();
  if (!me) return { error: "Sessão expirada. Entre novamente." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data.full_name }).eq("id", me.id);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: true };
}

const pwdSchema = z
  .object({
    current: z.string({ error: "Informe a senha atual." }),
    next: z.string({ error: "Informe a nova senha." }).min(10, "Use pelo menos 10 caracteres.").max(72, "No máximo 72 caracteres."),
    confirm: z.string({ error: "Repita a nova senha." }),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "As senhas não conferem." })
  .refine((v) => v.next !== v.current, { path: ["next"], message: "A nova senha deve ser diferente da atual." });

export async function changeMyPassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  // senhas não passam por trim: lidas cruas
  const raw = { current: fd.get("current") || undefined, next: fd.get("next") || undefined, confirm: fd.get("confirm") || undefined };
  const parsed = pwdSchema.safeParse(raw);
  if (!parsed.success) return zodErrors(parsed.error);
  const me = await getCurrentUser();
  if (!me) return { error: "Sessão expirada. Entre novamente." };

  const supabase = await createClient();
  // Confirma a senha atual antes de trocar (protege sessão esquecida aberta)
  const check = await supabase.auth.signInWithPassword({ email: me.email, password: parsed.data.current });
  if (check.error) return { fieldErrors: { current: "Senha atual incorreta." }, error: "Revise os campos destacados." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.next });
  if (error) return { error: `Não foi possível trocar a senha: ${error.message}` };
  return { ok: true };
}
