// Tipos de domínio DERIVADOS do schema gerado (database.types.ts).
// Regenere com `npm run db:types` sempre que mudar uma migration: se uma coluna
// for renomeada ou removida, o TypeScript acusa aqui e em cada uso.
import type { Database } from "./database.types";

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type ViewRow<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

/**
 * O Postgres não informa nulabilidade de colunas de views, então o gerador marca
 * todas como `| null`. Aqui declaramos as que SABEMOS que são não nulas (vêm de
 * colunas NOT NULL ou de joins internos). A lista de chaves é checada contra o schema.
 */
type NonNull<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
type Override<T, O> = Omit<T, keyof O> & O;

export type ArtworkStatus = Enums<"artwork_status">;
export type UserRole = Enums<"user_role">;
export type SwapStatus = "verde" | "amarelo" | "vermelho";

export const ARTWORK_STATUSES = [
  "disponivel",
  "reservada",
  "em_transporte",
  "instalada",
  "em_manutencao",
  "em_restauracao",
  "indisponivel",
] as const satisfies readonly ArtworkStatus[];

export const USER_ROLES = ["admin", "operador", "leitura"] as const satisfies readonly UserRole[];

// ---------------------------------------------------------------- tabelas
export type Artist = Tables<"artists">;
export type Category = Tables<"categories">;
export type SpaceType = Tables<"space_types">;
export type Client = Tables<"clients">;
export type Settings = Pick<
  Tables<"app_settings">,
  "edge_margin_cm" | "default_swap_days" | "swap_warning_days" | "history_window_days" | "idle_max_days"
>;

// ---------------------------------------------------------------- views
export type ArtworkRow = NonNull<
  ViewRow<"v_artworks">,
  | "id" | "code" | "title" | "artist_id" | "artist_name" | "width_cm" | "height_cm"
  | "status" | "status_changed_at" | "days_in_status" | "created_at"
>;

export type HistoryRow = NonNull<
  ViewRow<"v_installation_history">,
  | "installation_id" | "artwork_id" | "artwork_code" | "artwork_title" | "artist_name"
  | "space_id" | "space_name" | "client_id" | "client_name"
  | "installed_at" | "expected_swap_at" | "is_active" | "days_on_site"
>;

export type ActiveInstallationRow = Override<
  NonNull<ViewRow<"v_active_installations">, keyof HistoryRow & keyof ViewRow<"v_active_installations"> | "days_remaining">,
  { swap_status: SwapStatus }
>;

/** Um espaço pode ter várias obras instaladas ao mesmo tempo; quem está nele vem de ActiveInstallationRow (uma linha por instalação) */
export type SpaceRow = Override<
  NonNull<
    ViewRow<"v_spaces">,
    | "id" | "client_id" | "client_name" | "name" | "width_cm" | "height_cm" | "active" | "compatible_available"
    | "occupant_count"
  >,
  { next_swap_status: SwapStatus | null }
>;

export type MovementRow = NonNull<
  ViewRow<"v_movements">,
  "id" | "artwork_id" | "artwork_code" | "artwork_title" | "to_status" | "occurred_at"
>;

export type UserRow = NonNull<ViewRow<"v_users">, "id" | "role" | "active" | "created_at" | "movements">;

export type Dashboard = { [K in keyof ViewRow<"v_dashboard">]-?: number };

export type Recommendation = PublicSchema["Functions"]["recommend_artworks"]["Returns"][number];
export type ClientRecommendation = PublicSchema["Functions"]["recommend_artworks_for_client"]["Returns"][number];

/** Linha do tempo do cliente: movimentações de obra + liberações de repetição */
export type ClientEvent = NonNull<
  ViewRow<"v_client_events">,
  "event_id" | "kind" | "client_id" | "occurred_at" | "artwork_id" | "artwork_title" | "artwork_code"
>;

// ---------------------------------------------------------------- actions
export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};
