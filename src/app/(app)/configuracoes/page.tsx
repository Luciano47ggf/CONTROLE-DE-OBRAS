import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getSettings } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { AddItemForm, PrefsForm, SettingsForm } from "./forms";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [settings, user, { data: categories }, { data: types }, { data: prefs }] = await Promise.all([
    getSettings(),
    getCurrentUser(),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("space_types").select("id, name").order("name"),
    supabase.from("space_type_categories").select("space_type_id, category_id"),
  ]);
  const cats = categories ?? [];

  return (
    <>
      <PageHeader title="Configurações" subtitle="Regras de encaixe, prazos e pesos da recomendação" />
      <div className="grid gap-8 xl:grid-cols-2">
        <section className="panel p-6">
          <h2 className="title-serif mb-4 text-xl">Regras gerais</h2>
          <SettingsForm settings={settings} canEdit={user?.role === "admin"} />
        </section>

        <section className="space-y-8">
          <div className="panel p-6">
            <h2 className="title-serif mb-1 text-xl">Categorias de obra</h2>
            <p className="mb-4 text-sm text-muted">{cats.map((c) => c.name).join(", ") || "Nenhuma ainda."}</p>
            <AddItemForm table="categories" placeholder="Nova categoria" />
          </div>
          <div className="panel p-6">
            <h2 className="title-serif mb-1 text-xl">Tipos de espaço</h2>
            <p className="mb-4 text-sm text-muted">
              Marque as categorias que combinam com cada tipo. Elas valem os 10 pontos de adequação; sem marcação, todas recebem 5.
            </p>
            <ul className="mb-5 divide-y divide-line">
              {(types ?? []).map((t) => (
                <li key={t.id} className="py-3">
                  <p className="mb-2 font-medium">{t.name}</p>
                  <PrefsForm typeId={t.id} categories={cats}
                    selected={(prefs ?? []).filter((p) => p.space_type_id === t.id).map((p) => p.category_id)} />
                </li>
              ))}
            </ul>
            <AddItemForm table="space_types" placeholder="Novo tipo de espaço" />
          </div>
        </section>
      </div>
    </>
  );
}
