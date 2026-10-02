import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

/**
 * Cliente com a chave de serviço: ignora RLS. Usado SOMENTE para a API
 * administrativa do Auth (criar usuário, bloquear login, redefinir senha),
 * sempre depois de confirmar que quem pede é administrador.
 * Retorna null se a chave não estiver configurada.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
