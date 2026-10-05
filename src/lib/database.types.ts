export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          default_swap_days: number;
          edge_margin_cm: number;
          history_window_days: number;
          id: boolean;
          idle_max_days: number;
          swap_warning_days: number;
          updated_at: string;
        };
        Insert: {
          default_swap_days?: number;
          edge_margin_cm?: number;
          history_window_days?: number;
          id?: boolean;
          idle_max_days?: number;
          swap_warning_days?: number;
          updated_at?: string;
        };
        Update: {
          default_swap_days?: number;
          edge_margin_cm?: number;
          history_window_days?: number;
          id?: boolean;
          idle_max_days?: number;
          swap_warning_days?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      artists: {
        Row: {
          bio: string | null;
          birth_year: number | null;
          created_at: string;
          id: string;
          name: string;
          nationality: string | null;
          notes: string | null;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          bio?: string | null;
          birth_year?: number | null;
          created_at?: string;
          id?: string;
          name: string;
          nationality?: string | null;
          notes?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          bio?: string | null;
          birth_year?: number | null;
          created_at?: string;
          id?: string;
          name?: string;
          nationality?: string | null;
          notes?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      artwork_movements: {
        Row: {
          artwork_id: string;
          from_status: Database["public"]["Enums"]["artwork_status"] | null;
          id: number;
          installation_id: string | null;
          notes: string | null;
          occurred_at: string;
          space_id: string | null;
          to_status: Database["public"]["Enums"]["artwork_status"];
          user_id: string | null;
        };
        Insert: {
          artwork_id: string;
          from_status?: Database["public"]["Enums"]["artwork_status"] | null;
          id?: never;
          installation_id?: string | null;
          notes?: string | null;
          occurred_at?: string;
          space_id?: string | null;
          to_status: Database["public"]["Enums"]["artwork_status"];
          user_id?: string | null;
        };
        Update: {
          artwork_id?: string;
          from_status?: Database["public"]["Enums"]["artwork_status"] | null;
          id?: never;
          installation_id?: string | null;
          notes?: string | null;
          occurred_at?: string;
          space_id?: string | null;
          to_status?: Database["public"]["Enums"]["artwork_status"];
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "artwork_movements_artwork_id_fkey";
            columns: ["artwork_id"];
            isOneToOne: false;
            referencedRelation: "artworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artwork_movements_artwork_id_fkey";
            columns: ["artwork_id"];
            isOneToOne: false;
            referencedRelation: "v_artworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artwork_movements_installation_id_fkey";
            columns: ["installation_id"];
            isOneToOne: false;
            referencedRelation: "installations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artwork_movements_installation_id_fkey";
            columns: ["installation_id"];
            isOneToOne: false;
            referencedRelation: "v_active_installations";
            referencedColumns: ["installation_id"];
          },
          {
            foreignKeyName: "artwork_movements_installation_id_fkey";
            columns: ["installation_id"];
            isOneToOne: false;
            referencedRelation: "v_artworks";
            referencedColumns: ["current_installation_id"];
          },
          {
            foreignKeyName: "artwork_movements_installation_id_fkey";
            columns: ["installation_id"];
            isOneToOne: false;
            referencedRelation: "v_installation_history";
            referencedColumns: ["installation_id"];
          },
          {
            foreignKeyName: "artwork_movements_installation_id_fkey";
            columns: ["installation_id"];
            isOneToOne: false;
            referencedRelation: "v_spaces";
            referencedColumns: ["installation_id"];
          },
          {
            foreignKeyName: "artwork_movements_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "client_spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artwork_movements_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "v_spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      artwork_photos: {
        Row: {
          artwork_id: string;
          caption: string | null;
          created_at: string;
          created_by: string | null;
          display_path: string;
          height: number | null;
          id: string;
          is_cover: boolean;
          original_path: string;
          position: number;
          thumb_path: string;
          width: number | null;
        };
        Insert: {
          artwork_id: string;
          caption?: string | null;
          created_at?: string;
          created_by?: string | null;
          display_path: string;
          height?: number | null;
          id?: string;
          is_cover?: boolean;
          original_path: string;
          position?: number;
          thumb_path: string;
          width?: number | null;
        };
        Update: {
          artwork_id?: string;
          caption?: string | null;
          created_at?: string;
          created_by?: string | null;
          display_path?: string;
          height?: number | null;
          id?: string;
          is_cover?: boolean;
          original_path?: string;
          position?: number;
          thumb_path?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "artwork_photos_artwork_id_fkey";
            columns: ["artwork_id"];
            isOneToOne: false;
            referencedRelation: "artworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artwork_photos_artwork_id_fkey";
            columns: ["artwork_id"];
            isOneToOne: false;
            referencedRelation: "v_artworks";
            referencedColumns: ["id"];
          },
        ];
      };
      artworks: {
        Row: {
          artist_id: string;
          category_id: string | null;
          code: string;
          created_at: string;
          depth_cm: number | null;
          description: string | null;
          height_cm: number;
          id: string;
          notes: string | null;
          reserved_planned_at: string | null;
          reserved_space_id: string | null;
          status: Database["public"]["Enums"]["artwork_status"];
          status_changed_at: string;
          technique: string | null;
          title: string;
          updated_at: string;
          value: number | null;
          weight_kg: number | null;
          width_cm: number;
          year: number | null;
        };
        Insert: {
          artist_id: string;
          category_id?: string | null;
          code: string;
          created_at?: string;
          depth_cm?: number | null;
          description?: string | null;
          height_cm: number;
          id?: string;
          notes?: string | null;
          reserved_planned_at?: string | null;
          reserved_space_id?: string | null;
          status?: Database["public"]["Enums"]["artwork_status"];
          status_changed_at?: string;
          technique?: string | null;
          title: string;
          updated_at?: string;
          value?: number | null;
          weight_kg?: number | null;
          width_cm: number;
          year?: number | null;
        };
        Update: {
          artist_id?: string;
          category_id?: string | null;
          code?: string;
          created_at?: string;
          depth_cm?: number | null;
          description?: string | null;
          height_cm?: number;
          id?: string;
          notes?: string | null;
          reserved_planned_at?: string | null;
          reserved_space_id?: string | null;
          status?: Database["public"]["Enums"]["artwork_status"];
          status_changed_at?: string;
          technique?: string | null;
          title?: string;
          updated_at?: string;
          value?: number | null;
          weight_kg?: number | null;
          width_cm?: number;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "artworks_artist_id_fkey";
            columns: ["artist_id"];
            isOneToOne: false;
            referencedRelation: "artists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artworks_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artworks_reserved_space_id_fkey";
            columns: ["reserved_space_id"];
            isOneToOne: false;
            referencedRelation: "client_spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artworks_reserved_space_id_fkey";
            columns: ["reserved_space_id"];
            isOneToOne: false;
            referencedRelation: "v_spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      client_environments: {
        Row: {
          active: boolean;
          client_id: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          photo_path: string | null;
          position: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          client_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          photo_path?: string | null;
          position?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          client_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          photo_path?: string | null;
          position?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_environments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      client_spaces: {
        Row: {
          active: boolean;
          client_id: string;
          created_at: string;
          description: string | null;
          environment_id: string;
          height_cm: number;
          id: string;
          name: string;
          notes: string | null;
          photo_path: string | null;
          space_type_id: string | null;
          swap_days: number | null;
          updated_at: string;
          width_cm: number;
        };
        Insert: {
          active?: boolean;
          client_id: string;
          created_at?: string;
          description?: string | null;
          environment_id: string;
          height_cm: number;
          id?: string;
          name: string;
          notes?: string | null;
          photo_path?: string | null;
          space_type_id?: string | null;
          swap_days?: number | null;
          updated_at?: string;
          width_cm: number;
        };
        Update: {
          active?: boolean;
          client_id?: string;
          created_at?: string;
          description?: string | null;
          environment_id?: string;
          height_cm?: number;
          id?: string;
          name?: string;
          notes?: string | null;
          photo_path?: string | null;
          space_type_id?: string | null;
          swap_days?: number | null;
          updated_at?: string;
          width_cm?: number;
        };
        Relationships: [
          {
            foreignKeyName: "client_spaces_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_spaces_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "v_artworks";
            referencedColumns: ["reserved_client_id"];
          },
          {
            foreignKeyName: "client_spaces_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "v_movements";
            referencedColumns: ["client_id"];
          },
          {
            foreignKeyName: "client_spaces_environment_id_fkey";
            columns: ["environment_id"];
            isOneToOne: false;
            referencedRelation: "client_environments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_spaces_space_type_id_fkey";
            columns: ["space_type_id"];
            isOneToOne: false;
            referencedRelation: "space_types";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          active: boolean;
          address: string | null;
          city: string | null;
          contact_name: string | null;
          cover_path: string | null;
          created_at: string;
          default_swap_days: number | null;
          document: string | null;
          email: string | null;
          id: string;
          latitude: number | null;
          legal_name: string | null;
          logo_path: string | null;
          longitude: number | null;
          name: string;
          notes: string | null;
          phone: string | null;
          segment: string | null;
          state: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          address?: string | null;
          city?: string | null;
          contact_name?: string | null;
          cover_path?: string | null;
          created_at?: string;
          default_swap_days?: number | null;
          document?: string | null;
          email?: string | null;
          id?: string;
          latitude?: number | null;
          legal_name?: string | null;
          logo_path?: string | null;
          longitude?: number | null;
          name: string;
          notes?: string | null;
          phone?: string | null;
          segment?: string | null;
          state?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          address?: string | null;
          city?: string | null;
          contact_name?: string | null;
          cover_path?: string | null;
          created_at?: string;
          default_swap_days?: number | null;
          document?: string | null;
          email?: string | null;
          id?: string;
          latitude?: number | null;
          legal_name?: string | null;
          logo_path?: string | null;
          longitude?: number | null;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          segment?: string | null;
          state?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      artwork_repeat_releases: {
        Row: {
          artwork_id: string;
          client_id: string;
          id: string;
          installation_id: string | null;
          reason: string | null;
          released_at: string;
          released_by: string | null;
          used_at: string | null;
        };
        Insert: {
          artwork_id: string;
          client_id: string;
          id?: string;
          installation_id?: string | null;
          reason?: string | null;
          released_at?: string;
          released_by?: string | null;
          used_at?: string | null;
        };
        Update: {
          artwork_id?: string;
          client_id?: string;
          id?: string;
          installation_id?: string | null;
          reason?: string | null;
          released_at?: string;
          released_by?: string | null;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "artwork_repeat_releases_artwork_id_fkey";
            columns: ["artwork_id"];
            isOneToOne: false;
            referencedRelation: "artworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artwork_repeat_releases_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artwork_repeat_releases_installation_id_fkey";
            columns: ["installation_id"];
            isOneToOne: false;
            referencedRelation: "installations";
            referencedColumns: ["id"];
          },
        ];
      };
      installations: {
        Row: {
          artwork_id: string;
          created_at: string;
          expected_swap_at: string;
          id: string;
          installed_at: string;
          installed_by: string | null;
          notes: string | null;
          removed_at: string | null;
          removed_by: string | null;
          responsible: string | null;
          space_id: string;
        };
        Insert: {
          artwork_id: string;
          created_at?: string;
          expected_swap_at: string;
          id?: string;
          installed_at: string;
          installed_by?: string | null;
          notes?: string | null;
          removed_at?: string | null;
          removed_by?: string | null;
          responsible?: string | null;
          space_id: string;
        };
        Update: {
          artwork_id?: string;
          created_at?: string;
          expected_swap_at?: string;
          id?: string;
          installed_at?: string;
          installed_by?: string | null;
          notes?: string | null;
          removed_at?: string | null;
          removed_by?: string | null;
          responsible?: string | null;
          space_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "installations_artwork_id_fkey";
            columns: ["artwork_id"];
            isOneToOne: false;
            referencedRelation: "artworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installations_artwork_id_fkey";
            columns: ["artwork_id"];
            isOneToOne: false;
            referencedRelation: "v_artworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installations_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "client_spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installations_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "v_spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          active: boolean;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      space_type_categories: {
        Row: {
          category_id: string;
          space_type_id: string;
        };
        Insert: {
          category_id: string;
          space_type_id: string;
        };
        Update: {
          category_id?: string;
          space_type_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "space_type_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "space_type_categories_space_type_id_fkey";
            columns: ["space_type_id"];
            isOneToOne: false;
            referencedRelation: "space_types";
            referencedColumns: ["id"];
          },
        ];
      };
      space_types: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      v_active_installations: {
        Row: {
          artist_name: string | null;
          artwork_code: string | null;
          artwork_id: string | null;
          artwork_photo: string | null;
          artwork_thumb: string | null;
          artwork_title: string | null;
          client_id: string | null;
          client_name: string | null;
          days_on_site: number | null;
          days_remaining: number | null;
          expected_swap_at: string | null;
          installation_id: string | null;
          installed_at: string | null;
          is_active: boolean | null;
          notes: string | null;
          removed_at: string | null;
          responsible: string | null;
          space_id: string | null;
          space_name: string | null;
          swap_status: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_spaces_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_spaces_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "v_artworks";
            referencedColumns: ["reserved_client_id"];
          },
          {
            foreignKeyName: "client_spaces_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "v_movements";
            referencedColumns: ["client_id"];
          },
          {
            foreignKeyName: "installations_artwork_id_fkey";
            columns: ["artwork_id"];
            isOneToOne: false;
            referencedRelation: "artworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installations_artwork_id_fkey";
            columns: ["artwork_id"];
            isOneToOne: false;
            referencedRelation: "v_artworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installations_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "client_spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installations_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "v_spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      v_artwork_covers: {
        Row: {
          artwork_id: string | null;
          display_path: string | null;
          thumb_path: string | null;
        };
        Insert: {
          artwork_id?: string | null;
          display_path?: string | null;
          thumb_path?: string | null;
        };
        Update: {
          artwork_id?: string | null;
          display_path?: string | null;
          thumb_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "artwork_photos_artwork_id_fkey";
            columns: ["artwork_id"];
            isOneToOne: false;
            referencedRelation: "artworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artwork_photos_artwork_id_fkey";
            columns: ["artwork_id"];
            isOneToOne: false;
            referencedRelation: "v_artworks";
            referencedColumns: ["id"];
          },
        ];
      };
      v_artworks: {
        Row: {
          artist_id: string | null;
          artist_name: string | null;
          category_id: string | null;
          category_name: string | null;
          code: string | null;
          created_at: string | null;
          current_client_id: string | null;
          current_client_name: string | null;
          current_expected_swap_at: string | null;
          current_installation_id: string | null;
          current_installed_at: string | null;
          current_space_id: string | null;
          current_space_name: string | null;
          days_in_status: number | null;
          depth_cm: number | null;
          description: string | null;
          height_cm: number | null;
          id: string | null;
          notes: string | null;
          photo_count: number | null;
          photo_path: string | null;
          photo_thumb_path: string | null;
          reserved_client_id: string | null;
          reserved_client_name: string | null;
          reserved_planned_at: string | null;
          reserved_space_id: string | null;
          reserved_space_name: string | null;
          status: Database["public"]["Enums"]["artwork_status"] | null;
          status_changed_at: string | null;
          technique: string | null;
          title: string | null;
          updated_at: string | null;
          value: number | null;
          weight_kg: number | null;
          width_cm: number | null;
          year: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "artworks_artist_id_fkey";
            columns: ["artist_id"];
            isOneToOne: false;
            referencedRelation: "artists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artworks_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artworks_reserved_space_id_fkey";
            columns: ["reserved_space_id"];
            isOneToOne: false;
            referencedRelation: "client_spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artworks_reserved_space_id_fkey";
            columns: ["reserved_space_id"];
            isOneToOne: false;
            referencedRelation: "v_spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_spaces_client_id_fkey";
            columns: ["current_client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_spaces_client_id_fkey";
            columns: ["current_client_id"];
            isOneToOne: false;
            referencedRelation: "v_artworks";
            referencedColumns: ["reserved_client_id"];
          },
          {
            foreignKeyName: "client_spaces_client_id_fkey";
            columns: ["current_client_id"];
            isOneToOne: false;
            referencedRelation: "v_movements";
            referencedColumns: ["client_id"];
          },
          {
            foreignKeyName: "installations_space_id_fkey";
            columns: ["current_space_id"];
            isOneToOne: false;
            referencedRelation: "client_spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installations_space_id_fkey";
            columns: ["current_space_id"];
            isOneToOne: false;
            referencedRelation: "v_spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      v_dashboard: {
        Row: {
          active_clients: number | null;
          available: number | null;
          in_transit: number | null;
          installed: number | null;
          maintenance: number | null;
          reserved: number | null;
          spaces: number | null;
          swaps_due_soon: number | null;
          swaps_overdue: number | null;
          total_artworks: number | null;
        };
        Relationships: [];
      };
      v_installation_history: {
        Row: {
          artist_name: string | null;
          artwork_code: string | null;
          artwork_id: string | null;
          artwork_photo: string | null;
          artwork_thumb: string | null;
          artwork_title: string | null;
          client_id: string | null;
          client_name: string | null;
          days_on_site: number | null;
          expected_swap_at: string | null;
          installation_id: string | null;
          installed_at: string | null;
          is_active: boolean | null;
          notes: string | null;
          removed_at: string | null;
          responsible: string | null;
          space_id: string | null;
          space_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_spaces_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_spaces_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "v_artworks";
            referencedColumns: ["reserved_client_id"];
          },
          {
            foreignKeyName: "client_spaces_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "v_movements";
            referencedColumns: ["client_id"];
          },
          {
            foreignKeyName: "installations_artwork_id_fkey";
            columns: ["artwork_id"];
            isOneToOne: false;
            referencedRelation: "artworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installations_artwork_id_fkey";
            columns: ["artwork_id"];
            isOneToOne: false;
            referencedRelation: "v_artworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installations_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "client_spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "installations_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "v_spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      v_movements: {
        Row: {
          artwork_code: string | null;
          artwork_id: string | null;
          artwork_title: string | null;
          client_id: string | null;
          client_name: string | null;
          from_status: Database["public"]["Enums"]["artwork_status"] | null;
          id: number | null;
          installation_id: string | null;
          notes: string | null;
          occurred_at: string | null;
          space_id: string | null;
          space_name: string | null;
          to_status: Database["public"]["Enums"]["artwork_status"] | null;
          user_id: string | null;
          user_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "artwork_movements_artwork_id_fkey";
            columns: ["artwork_id"];
            isOneToOne: false;
            referencedRelation: "artworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artwork_movements_artwork_id_fkey";
            columns: ["artwork_id"];
            isOneToOne: false;
            referencedRelation: "v_artworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artwork_movements_installation_id_fkey";
            columns: ["installation_id"];
            isOneToOne: false;
            referencedRelation: "installations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artwork_movements_installation_id_fkey";
            columns: ["installation_id"];
            isOneToOne: false;
            referencedRelation: "v_active_installations";
            referencedColumns: ["installation_id"];
          },
          {
            foreignKeyName: "artwork_movements_installation_id_fkey";
            columns: ["installation_id"];
            isOneToOne: false;
            referencedRelation: "v_artworks";
            referencedColumns: ["current_installation_id"];
          },
          {
            foreignKeyName: "artwork_movements_installation_id_fkey";
            columns: ["installation_id"];
            isOneToOne: false;
            referencedRelation: "v_installation_history";
            referencedColumns: ["installation_id"];
          },
          {
            foreignKeyName: "artwork_movements_installation_id_fkey";
            columns: ["installation_id"];
            isOneToOne: false;
            referencedRelation: "v_spaces";
            referencedColumns: ["installation_id"];
          },
          {
            foreignKeyName: "artwork_movements_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "client_spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artwork_movements_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "v_spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      v_spaces: {
        Row: {
          active: boolean | null;
          client_id: string | null;
          client_name: string | null;
          compatible_available: number | null;
          created_at: string | null;
          description: string | null;
          environment_id: string | null;
          environment_name: string | null;
          height_cm: number | null;
          id: string | null;
          name: string | null;
          next_days_remaining: number | null;
          next_expected_swap_at: string | null;
          next_swap_status: string | null;
          notes: string | null;
          occupant_count: number | null;
          photo_path: string | null;
          space_type_id: string | null;
          space_type_name: string | null;
          swap_days: number | null;
          updated_at: string | null;
          width_cm: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_spaces_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_spaces_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "v_artworks";
            referencedColumns: ["reserved_client_id"];
          },
          {
            foreignKeyName: "client_spaces_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "v_movements";
            referencedColumns: ["client_id"];
          },
          {
            foreignKeyName: "client_spaces_environment_id_fkey";
            columns: ["environment_id"];
            isOneToOne: false;
            referencedRelation: "client_environments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_spaces_space_type_id_fkey";
            columns: ["space_type_id"];
            isOneToOne: false;
            referencedRelation: "space_types";
            referencedColumns: ["id"];
          },
        ];
      };
      v_client_events: {
        Row: {
          artwork_code: string | null;
          artwork_id: string | null;
          artwork_title: string | null;
          client_id: string | null;
          event_id: string | null;
          from_status: Database["public"]["Enums"]["artwork_status"] | null;
          kind: string | null;
          notes: string | null;
          occurred_at: string | null;
          space_name: string | null;
          to_status: Database["public"]["Enums"]["artwork_status"] | null;
          user_name: string | null;
        };
        Relationships: [];
      };
      v_users: {
        Row: {
          active: boolean | null;
          created_at: string | null;
          email: string | null;
          full_name: string | null;
          id: string | null;
          last_movement_at: string | null;
          movements: number | null;
          role: Database["public"]["Enums"]["user_role"] | null;
        };
        Insert: {
          active?: boolean | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string | null;
          last_movement_at?: never;
          movements?: never;
          role?: Database["public"]["Enums"]["user_role"] | null;
        };
        Update: {
          active?: boolean | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string | null;
          last_movement_at?: never;
          movements?: never;
          role?: Database["public"]["Enums"]["user_role"] | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      _assert_can_write: { Args: Record<PropertyKey, never>; Returns: undefined };
      _check_space_fit: {
        Args: { p_artwork: Database["public"]["Tables"]["artworks"]["Row"]; p_space_id: string };
        Returns: {
          active: boolean;
          client_id: string;
          created_at: string;
          description: string | null;
          height_cm: number;
          id: string;
          name: string;
          notes: string | null;
          photo_path: string | null;
          space_type_id: string | null;
          swap_days: number | null;
          updated_at: string;
          width_cm: number;
        };
        SetofOptions: {
          from: "*";
          to: "client_spaces";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      _lock_artwork: {
        Args: { p_id: string };
        Returns: {
          artist_id: string;
          category_id: string | null;
          code: string;
          created_at: string;
          depth_cm: number | null;
          description: string | null;
          height_cm: number;
          id: string;
          notes: string | null;
          reserved_space_id: string | null;
          status: Database["public"]["Enums"]["artwork_status"];
          status_changed_at: string;
          technique: string | null;
          title: string;
          updated_at: string;
          value: number | null;
          weight_kg: number | null;
          width_cm: number;
          year: number | null;
        };
        SetofOptions: {
          from: "*";
          to: "artworks";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      _transition: {
        Args: {
          p_artwork_id: string;
          p_installation_id: string;
          p_notes: string;
          p_reserved_space: string;
          p_space_id: string;
          p_to: Database["public"]["Enums"]["artwork_status"];
        };
        Returns: undefined;
      };
      can_write: { Args: Record<PropertyKey, never>; Returns: boolean };
      cancel_reservation: { Args: { p_artwork_id: string; p_notes?: string }; Returns: undefined };
      current_app_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      dearmor: { Args: { "": string }; Returns: string };
      dispatch_artwork: { Args: { p_artwork_id: string; p_notes?: string }; Returns: undefined };
      fits_space: {
        Args: { art_h: number; art_w: number; margin: number; space_h: number; space_w: number };
        Returns: boolean;
      };
      gen_random_uuid: { Args: Record<PropertyKey, never>; Returns: string };
      gen_salt: { Args: { "": string }; Returns: string };
      install_artwork: {
        Args: {
          p_artwork_id: string;
          p_installed_at?: string;
          p_notes?: string;
          p_replace_current?: boolean;
          p_responsible?: string;
          p_space_id: string;
          p_swap_days?: number;
        };
        Returns: string;
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      pgp_armor_headers: { Args: { "": string }; Returns: Record<string, unknown>[] };
      recommend_artworks: {
        Args: { p_limit?: number; p_space_id: string };
        Returns: {
          artist_name: string;
          artwork_id: string;
          blocked: boolean;
          category_name: string;
          code: string;
          height_cm: number;
          idle_days: number;
          last_at_client: string;
          photo_path: string;
          photo_thumb_path: string;
          score_category: number;
          score_history: number;
          score_idle: number;
          score_size: number;
          score_total: number;
          times_at_client: number;
          title: string;
          width_cm: number;
        }[];
      };
      recommend_artworks_for_client: {
        Args: { p_client_id: string; p_limit?: number };
        Returns: {
          artist_name: string;
          artwork_id: string;
          blocked: boolean;
          category_name: string;
          code: string;
          environment_id: string | null;
          environment_name: string | null;
          height_cm: number;
          idle_days: number;
          last_at_client: string;
          photo_path: string;
          photo_thumb_path: string;
          score_category: number;
          score_history: number;
          score_idle: number;
          score_size: number;
          score_total: number;
          space_height_cm: number;
          space_id: string;
          space_name: string;
          space_width_cm: number;
          times_at_client: number;
          title: string;
          width_cm: number;
        }[];
      };
      release_artwork_repeat: {
        Args: { p_artwork_id: string; p_client_id: string; p_reason?: string };
        Returns: string;
      };
      reorder_artwork_photos: {
        Args: { p_artwork_id: string; p_ids: string[] };
        Returns: undefined;
      };
      reserve_artwork: {
        Args: { p_artwork_id: string; p_notes?: string; p_planned_at?: string; p_space_id: string };
        Returns: undefined;
      };
      return_artwork: {
        Args: {
          p_installation_id: string;
          p_new_status?: Database["public"]["Enums"]["artwork_status"];
          p_notes?: string;
          p_returned_at?: string;
        };
        Returns: undefined;
      };
      set_artwork_status: {
        Args: {
          p_artwork_id: string;
          p_new_status: Database["public"]["Enums"]["artwork_status"];
          p_notes?: string;
        };
        Returns: undefined;
      };
      set_cover_photo: { Args: { p_photo_id: string }; Returns: undefined };
    };
    Enums: {
      artwork_status:
        | "disponivel"
        | "reservada"
        | "em_transporte"
        | "instalada"
        | "em_manutencao"
        | "em_restauracao"
        | "indisponivel";
      user_role: "admin" | "operador" | "leitura";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      artwork_status: [
        "disponivel",
        "reservada",
        "em_transporte",
        "instalada",
        "em_manutencao",
        "em_restauracao",
        "indisponivel",
      ],
      user_role: ["admin", "operador", "leitura"],
    },
  },
} as const;
