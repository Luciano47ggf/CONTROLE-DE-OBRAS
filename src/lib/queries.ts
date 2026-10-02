import "server-only";
import { createClient } from "./supabase/server";
import type { Settings } from "./types";

export async function getSettings(): Promise<Settings> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("app_settings").select("*").single();
  if (error || !data) throw new Error("Não foi possível carregar as configurações.");
  return {
    edge_margin_cm: Number(data.edge_margin_cm),
    default_swap_days: data.default_swap_days,
    swap_warning_days: data.swap_warning_days,
    history_window_days: data.history_window_days,
    idle_max_days: data.idle_max_days,
  };
}

export async function getCatalogs() {
  const supabase = await createClient();
  const [artists, categories, spaceTypes] = await Promise.all([
    supabase.from("artists").select("id, name").order("name"),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("space_types").select("id, name").order("name"),
  ]);
  return {
    artists: (artists.data ?? []) as { id: string; name: string }[],
    categories: (categories.data ?? []) as { id: string; name: string }[],
    spaceTypes: (spaceTypes.data ?? []) as { id: string; name: string }[],
  };
}
