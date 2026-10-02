import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.active) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?inativo=1");
  }

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar userName={user.name} role={user.role} isAdmin={user.isAdmin} signOut={signOut} />
      <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-6xl">
          {!user.canWrite && (
            <p className="mb-6 rounded-md border border-line bg-paper px-4 py-2.5 text-sm text-muted">
              Seu acesso é só de consulta. Para cadastrar ou movimentar obras, peça a um administrador.
            </p>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
