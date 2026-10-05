import "server-only";
import { createClient } from "./supabase/server";
import type { ActiveInstallationRow, Client, ClientEnvironment, ClientEvent, ClientRecommendation, Settings, SpaceRow } from "./types";

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

/** Obra reservada (troca planejada) para um ponto de exposição deste cliente, ainda não instalada */
export type SpaceReservation = {
  artworkId: string;
  title: string;
  artistName: string;
  spaceId: string;
  plannedAt: string | null;
};

export type ClientWorkspace = {
  client: Client;
  environments: ClientEnvironment[];
  spaces: SpaceRow[];
  occupants: ActiveInstallationRow[];
  reservations: SpaceReservation[];
  recommendations: ClientRecommendation[];
  events: ClientEvent[];
  defaultSwapDays: number;
};

/**
 * Tudo que as abas do painel do cliente precisam, numa chamada só. Usada direto pela
 * página maximizada (/clientes/[id]) e por uma Server Action equivalente para o drawer.
 */
export async function loadClientWorkspace(supabase: Supa, clientId: string): Promise<ClientWorkspace | null> {
  const [{ data: client }, { data: environments }, { data: spaces }, { data: occupants }, { data: reserved }, { data: recs }, { data: events }, settings] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
      supabase.from("client_environments").select("*").eq("client_id", clientId).eq("active", true).order("position").order("name"),
      supabase.from("v_spaces").select("*").eq("client_id", clientId).eq("active", true).order("name"),
      supabase.from("v_active_installations").select("*").eq("client_id", clientId).order("expected_swap_at"),
      supabase
        .from("v_artworks")
        .select("id, title, artist_name, reserved_space_id, reserved_planned_at")
        .eq("reserved_client_id", clientId),
      supabase.rpc("recommend_artworks_for_client", { p_client_id: clientId, p_limit: 30 }),
      supabase.from("v_client_events").select("*").eq("client_id", clientId).order("occurred_at", { ascending: false }).limit(200),
      getSettings(),
    ]);
  if (!client) return null;
  const c = client as Client;
  return {
    client: c,
    environments: (environments ?? []) as ClientEnvironment[],
    spaces: (spaces ?? []) as SpaceRow[],
    occupants: (occupants ?? []) as ActiveInstallationRow[],
    reservations: (reserved ?? []).map((r) => ({
      artworkId: r.id!,
      title: r.title!,
      artistName: r.artist_name!,
      spaceId: r.reserved_space_id!,
      plannedAt: r.reserved_planned_at,
    })),
    recommendations: (recs ?? []) as ClientRecommendation[],
    events: (events ?? []) as ClientEvent[],
    defaultSwapDays: c.default_swap_days ?? settings.default_swap_days,
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
