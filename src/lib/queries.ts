import "server-only";
import { createClient } from "./supabase/server";
import type { ActiveInstallationRow, Client, ClientEvent, ClientRecommendation, Settings, SpaceRow } from "./types";

type Supa = Awaited<ReturnType<typeof createClient>>;

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

export type ClientWorkspace = {
  client: Client;
  spaces: SpaceRow[];
  occupants: ActiveInstallationRow[];
  recommendations: ClientRecommendation[];
  events: ClientEvent[];
};

/**
 * Tudo que as abas do painel do cliente precisam, numa chamada só. Usada direto pela
 * página maximizada (/clientes/[id]) e por uma Server Action equivalente para o drawer.
 */
export async function loadClientWorkspace(supabase: Supa, clientId: string): Promise<ClientWorkspace | null> {
  const [{ data: client }, { data: spaces }, { data: occupants }, { data: recs }, { data: events }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
    supabase.from("v_spaces").select("*").eq("client_id", clientId).eq("active", true).order("name"),
    supabase.from("v_active_installations").select("*").eq("client_id", clientId).order("expected_swap_at"),
    supabase.rpc("recommend_artworks_for_client", { p_client_id: clientId, p_limit: 30 }),
    supabase.from("v_client_events").select("*").eq("client_id", clientId).order("occurred_at", { ascending: false }).limit(200),
  ]);
  if (!client) return null;
  return {
    client: client as Client,
    spaces: (spaces ?? []) as SpaceRow[],
    occupants: (occupants ?? []) as ActiveInstallationRow[],
    recommendations: (recs ?? []) as ClientRecommendation[],
    events: (events ?? []) as ClientEvent[],
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
