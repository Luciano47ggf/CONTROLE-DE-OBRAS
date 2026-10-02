import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { NameForm, PasswordForm } from "./forms";
import { ROLE_LABEL } from "../usuarios/forms";

export default async function AccountPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  return (
    <>
      <PageHeader title="Minha conta" subtitle={`${me.email}, ${ROLE_LABEL[me.role].toLowerCase()}`} />
      <div className="grid max-w-4xl gap-8 md:grid-cols-2">
        <section className="panel p-6"><h2 className="title-serif mb-4 text-xl">Dados</h2><NameForm name={me.name} /></section>
        <section className="panel p-6"><h2 className="title-serif mb-4 text-xl">Senha</h2><PasswordForm /></section>
      </div>
    </>
  );
}
