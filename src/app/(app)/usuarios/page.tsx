import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui";
import { CreateUserForm, ROLE_LABEL, UserRowActions } from "./forms";
import { date, plural } from "@/lib/format";
import type { UserRow } from "@/lib/types";

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!me?.isAdmin) notFound();

  const supabase = await createClient();
  const { data } = await supabase.from("v_users").select("*").order("active", { ascending: false }).order("full_name");
  const users = (data ?? []) as UserRow[];
  const adminApi = createAdminClient() !== null;
  const activeAdmins = users.filter((u) => u.active && u.role === "admin").length;

  return (
    <>
      <PageHeader title="Usuários" subtitle={`${plural(users.filter((u) => u.active).length, "ativo", "ativos")}, ${plural(activeAdmins, "administrador", "administradores")}`} />

      {!adminApi && (
        <p className="mb-6 rounded-md border border-warn/30 bg-warn-tint px-4 py-3 text-sm text-warn">
          Para criar usuários, bloquear o login e redefinir senhas, defina SUPABASE_SERVICE_ROLE_KEY no servidor.
          Sem ela, você ainda pode mudar nomes, papéis e a situação (que já tira o acesso de escrita).
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <ul className="space-y-3">
            {users.map((u) => (
              <li key={u.id} className={`panel ${u.active ? "" : "opacity-70"}`}>
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {u.full_name ?? u.email}
                        {u.id === me.id && <span className="ml-2 text-sm font-normal text-muted">(você)</span>}
                      </span>
                      <span className="block text-sm text-muted">{u.email}</span>
                    </span>
                    <span className="flex items-center gap-3 text-sm">
                      <span className="text-muted">
                        {u.movements > 0 ? `${plural(u.movements, "movimentação", "movimentações")}, a última em ${date(u.last_movement_at)}` : "Sem movimentações"}
                      </span>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${!u.active ? "bg-line text-muted" : u.role === "admin" ? "bg-ink text-paper" : u.role === "operador" ? "bg-accent-tint text-accent" : "bg-wall text-ink-soft"}`}>
                        {u.active ? ROLE_LABEL[u.role] : "Inativo"}
                      </span>
                    </span>
                  </summary>
                  <UserRowActions user={u} isSelf={u.id === me.id} adminApi={adminApi} />
                </details>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel h-fit p-6">
          <h2 className="title-serif mb-1 text-xl">Novo usuário</h2>
          <p className="mb-5 text-sm text-muted">A conta já nasce confirmada. Entregue a senha temporária pessoalmente ou por um canal seguro.</p>
          <CreateUserForm enabled={adminApi} />
        </section>
      </div>
    </>
  );
}
