export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      assignments: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          judge_id: string;
          judge_slot: number;
          template_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          judge_id: string;
          judge_slot?: number;
          template_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          judge_id?: string;
          judge_slot?: number;
          template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_judge_id_fkey";
            columns: ["judge_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_template_del_evento_fkey";
            columns: ["template_id", "event_id"];
            isOneToOne: false;
            referencedRelation: "sheet_templates";
            referencedColumns: ["id", "event_id"];
          },
        ];
      };
      bands: {
        Row: {
          category_id: string;
          created_at: string;
          event_id: string;
          id: string;
          name: string;
          turno: number;
        };
        ComputedFields: never;
        Insert: {
          category_id: string;
          created_at?: string;
          event_id: string;
          id?: string;
          name: string;
          turno: number;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          name?: string;
          turno?: number;
        };
        Relationships: [
          {
            foreignKeyName: "bands_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bands_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          event_id: string;
          id: string;
          name: string;
          position: number;
        };
        ComputedFields: never;
        Insert: {
          event_id: string;
          id?: string;
          name: string;
          position?: number;
        };
        Update: {
          event_id?: string;
          id?: string;
          name?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "categories_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          created_at: string;
          event_date: string;
          id: string;
          marchas_count: number;
          name: string;
          owner_id: string;
          status: Database["public"]["Enums"]["event_status"];
          toques_count: number;
          venue: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_date: string;
          id?: string;
          marchas_count?: number;
          name: string;
          owner_id: string;
          status?: Database["public"]["Enums"]["event_status"];
          toques_count?: number;
          venue?: string;
        };
        Update: {
          created_at?: string;
          event_date?: string;
          id?: string;
          marchas_count?: number;
          name?: string;
          owner_id?: string;
          status?: Database["public"]["Enums"]["event_status"];
          toques_count?: number;
          venue?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          full_name?: string;
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [];
      };
      schema_migrations: {
        Row: {
          applied_at: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          applied_at?: string;
          name: string;
        };
        Update: {
          applied_at?: string;
          name?: string;
        };
        Relationships: [];
      };
      score_sheets: {
        Row: {
          assignment_id: string;
          band_id: string;
          created_at: string;
          event_id: string;
          id: string;
          locked_at: string | null;
          observador: string;
          status: Database["public"]["Enums"]["sheet_status"];
          submitted_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          assignment_id: string;
          band_id: string;
          created_at?: string;
          event_id: string;
          id?: string;
          locked_at?: string | null;
          observador?: string;
          status?: Database["public"]["Enums"]["sheet_status"];
          submitted_at?: string | null;
        };
        Update: {
          assignment_id?: string;
          band_id?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          locked_at?: string | null;
          observador?: string;
          status?: Database["public"]["Enums"]["sheet_status"];
          submitted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "score_sheets_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "score_sheets_band_id_fkey";
            columns: ["band_id"];
            isOneToOne: false;
            referencedRelation: "bands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "score_sheets_band_id_fkey";
            columns: ["band_id"];
            isOneToOne: false;
            referencedRelation: "v_band_totals";
            referencedColumns: ["band_id"];
          },
          {
            foreignKeyName: "score_sheets_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      scores: {
        Row: {
          client_updated_at: string;
          criterion_id: string;
          id: string;
          observacion: string;
          sheet_id: string;
          updated_at: string;
          value: number;
        };
        ComputedFields: never;
        Insert: {
          client_updated_at?: string;
          criterion_id: string;
          id?: string;
          observacion?: string;
          sheet_id: string;
          updated_at?: string;
          value: number;
        };
        Update: {
          client_updated_at?: string;
          criterion_id?: string;
          id?: string;
          observacion?: string;
          sheet_id?: string;
          updated_at?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "scores_criterion_id_fkey";
            columns: ["criterion_id"];
            isOneToOne: false;
            referencedRelation: "sheet_criteria";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scores_sheet_id_fkey";
            columns: ["sheet_id"];
            isOneToOne: false;
            referencedRelation: "score_sheets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scores_sheet_id_fkey";
            columns: ["sheet_id"];
            isOneToOne: false;
            referencedRelation: "v_sheet_totals";
            referencedColumns: ["sheet_id"];
          },
        ];
      };
      sheet_criteria: {
        Row: {
          deduction_hint: string | null;
          id: string;
          label: string;
          max_points: number;
          position: number;
          section: string | null;
          template_id: string;
        };
        ComputedFields: never;
        Insert: {
          deduction_hint?: string | null;
          id?: string;
          label: string;
          max_points?: number;
          position: number;
          section?: string | null;
          template_id: string;
        };
        Update: {
          deduction_hint?: string | null;
          id?: string;
          label?: string;
          max_points?: number;
          position?: number;
          section?: string | null;
          template_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sheet_criteria_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "sheet_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sheet_criteria_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "v_sheet_totals";
            referencedColumns: ["template_id"];
          },
        ];
      };
      sheet_templates: {
        Row: {
          code: string;
          counts_toward_total: boolean;
          event_id: string | null;
          id: string;
          judge_slots: number;
          max_points: number;
          name: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          counts_toward_total?: boolean;
          event_id?: string | null;
          id?: string;
          judge_slots?: number;
          max_points: number;
          name: string;
          version?: number;
        };
        Update: {
          code?: string;
          counts_toward_total?: boolean;
          event_id?: string | null;
          id?: string;
          judge_slots?: number;
          max_points?: number;
          name?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sheet_templates_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_band_totals: {
        Row: {
          band_id: string | null;
          band_name: string | null;
          category_id: string | null;
          event_id: string | null;
          sheets_started: number | null;
          sheets_submitted: number | null;
          total_comandante: number | null;
          total_compilatorio: number | null;
          turno: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "bands_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bands_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      v_sheet_totals: {
        Row: {
          assignment_id: string | null;
          band_id: string | null;
          counts_toward_total: boolean | null;
          criteria_count: number | null;
          event_id: string | null;
          judge_id: string | null;
          judge_slot: number | null;
          max_points: number | null;
          scored_count: number | null;
          sheet_id: string | null;
          status: Database["public"]["Enums"]["sheet_status"] | null;
          template_code: string | null;
          template_id: string | null;
          template_name: string | null;
          total: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "assignments_judge_id_fkey";
            columns: ["judge_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "score_sheets_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "score_sheets_band_id_fkey";
            columns: ["band_id"];
            isOneToOne: false;
            referencedRelation: "bands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "score_sheets_band_id_fkey";
            columns: ["band_id"];
            isOneToOne: false;
            referencedRelation: "v_band_totals";
            referencedColumns: ["band_id"];
          },
          {
            foreignKeyName: "score_sheets_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      owns_open_sheet: { Args: { p_sheet_id: string }; Returns: boolean };
      owns_sheet: { Args: { p_sheet_id: string }; Returns: boolean };
    };
    Enums: {
      event_status: "draft" | "live" | "closed";
      sheet_status: "draft" | "submitted";
      user_role: "admin" | "judge";
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
      event_status: ["draft", "live", "closed"],
      sheet_status: ["draft", "submitted"],
      user_role: ["admin", "judge"],
    },
  },
} as const;
