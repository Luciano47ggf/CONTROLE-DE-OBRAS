import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Database } from "../database.types";

/** Cliente Supabase para Server Components e Server Actions (sessão via cookies). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components não podem gravar cookies; o proxy renova a sessão.
          }
        },
      },
    },
  );
}

/** Usuário + perfil da requisição atual (memoizado por render). */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, active")
    .eq("id", data.user.id)
    .single();
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    name: profile?.full_name ?? data.user.email ?? "",
    role: profile?.role ?? "leitura",
    active: profile?.active ?? false,
    canWrite: !!profile?.active && (profile.role === "admin" || profile.role === "operador"),
    isAdmin: !!profile?.active && profile.role === "admin",
  };
});
