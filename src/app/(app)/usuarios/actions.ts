"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbError, formObject, requiredText, zodErrors } from "@/lib/form";
import { USER_ROLES, type ActionState } from "@/lib/types";

const BAN_FOREVER = "876000h"; // ~100 anos

async function requireAdmin(): Promise<ActionState | null> {
  const me = await getCurrentUser();
  if (!me?.isAdmin) return { error: "Somente administradores gerenciam usuários." };
  return null;
}

const password = z
  .string({ error: "Informe uma senha." })
  .min(10, "A senha precisa de pelo menos 10 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.");

const createSchema = z.object({
  full_name: requiredText("Nome"),
  email: z.email("E-mail inválido."),
  role: z.enum(USER_ROLES),
  password,
});

export async function createUser(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = createSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;

  const admin = createAdminClient();
  if (!admin) return { error: "Configure SUPABASE_SERVICE_ROLE_KEY no servidor para criar usuários." };

  const { data, error } = await admin.auth.admin.createUser({
    email: d.email.toLowerCase(),
    password: d.password,
    email_confirm: true,
    user_metadata: { full_name: d.full_name },
  });
  if (error) {
    if (/already/i.test(error.message)) return { fieldErrors: { email: "Já existe um usuário com este e-mail." }, error: "Revise os campos destacados." };
    return { error: `Não foi possível criar o usuário: ${error.message}` };
  }

  // O perfil nasce como operador (trigger). O papel é ajustado com a sessão do admin,
  // passando pelas regras do banco.
  if (d.role !== "operador") {
    const supabase = await createClient();
    const { error: roleError } = await supabase.from("profiles").update({ role: d.role }).eq("id", data.user.id);
    if (roleError) return dbError(roleError);
  }
  revalidatePath("/usuarios");
  return { ok: true };
}

const updateSchema = z.object({
  user_id: z.uuid(),
  role: z.enum(USER_ROLES),
  full_name: requiredText("Nome"),
});

export async function updateUser(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = updateSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role, full_name: parsed.data.full_name })
    .eq("id", parsed.data.user_id);
  if (error) return dbError(error);
  revalidatePath("/usuarios");
  return { ok: true };
}

export async function setUserActive(userId: string, active: boolean): Promise<ActionState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const me = await getCurrentUser();
  if (me?.id === userId && !active) return { error: "Você não pode desativar a própria conta." };

  const admin = createAdminClient();
  const supabase = await createClient();

  if (active) {
    // Reativar: libera o login primeiro, depois o perfil
    if (admin) {
      const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
      if (error) return { error: `Não foi possível liberar o login: ${error.message}` };
    }
    const { error } = await supabase.from("profiles").update({ active: true }).eq("id", userId);
    if (error) return dbError(error);
  } else {
    // Desativar: o banco valida (ex.: último admin) antes de bloquear o login
    const { error } = await supabase.from("profiles").update({ active: false }).eq("id", userId);
    if (error) return dbError(error);
    if (admin) {
      const { error: banError } = await admin.auth.admin.updateUserById(userId, { ban_duration: BAN_FOREVER });
      if (banError) return { error: `Perfil desativado, mas o login não foi bloqueado: ${banError.message}` };
    }
  }
  revalidatePath("/usuarios");
  return { ok: true };
}

const resetSchema = z.object({ user_id: z.uuid(), password });

export async function resetPassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = resetSchema.safeParse(formObject(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const admin = createAdminClient();
  if (!admin) return { error: "Configure SUPABASE_SERVICE_ROLE_KEY no servidor para redefinir senhas." };
  const { error } = await admin.auth.admin.updateUserById(parsed.data.user_id, { password: parsed.data.password });
  if (error) return { error: `Não foi possível redefinir: ${error.message}` };
  return { ok: true };
}
