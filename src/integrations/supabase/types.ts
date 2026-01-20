export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_tasks: {
        Row: {
          assigned_to: string | null
          audit_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          audit_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          audit_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_tasks_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
        ]
      }
      auditors: {
        Row: {
          certification_body_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          certification_body_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          certification_body_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditors_certification_body_id_fkey"
            columns: ["certification_body_id"]
            isOneToOne: false
            referencedRelation: "certification_bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          auditor_id: string | null
          certification_body_id: string | null
          certifications:
            | Database["public"]["Enums"]["certification_standard"][]
            | null
          client_certification_id: string | null
          client_id: string
          created_at: string
          id: string
          notes: string | null
          scheduled_date: string
          status: Database["public"]["Enums"]["audit_status"]
          type: Database["public"]["Enums"]["audit_type"]
          updated_at: string
        }
        Insert: {
          auditor_id?: string | null
          certification_body_id?: string | null
          certifications?:
            | Database["public"]["Enums"]["certification_standard"][]
            | null
          client_certification_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date: string
          status?: Database["public"]["Enums"]["audit_status"]
          type: Database["public"]["Enums"]["audit_type"]
          updated_at?: string
        }
        Update: {
          auditor_id?: string | null
          certification_body_id?: string | null
          certifications?:
            | Database["public"]["Enums"]["certification_standard"][]
            | null
          client_certification_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["audit_status"]
          type?: Database["public"]["Enums"]["audit_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audits_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "auditors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_certification_body_id_fkey"
            columns: ["certification_body_id"]
            isOneToOne: false
            referencedRelation: "certification_bodies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_client_certification_id_fkey"
            columns: ["client_certification_id"]
            isOneToOne: false
            referencedRelation: "client_certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_bodies: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          short_name: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          short_name?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          short_name?: string | null
          website?: string | null
        }
        Relationships: []
      }
      certification_documents: {
        Row: {
          client_certification_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          uploaded_by: string | null
        }
        Insert: {
          client_certification_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Update: {
          client_certification_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certification_documents_client_certification_id_fkey"
            columns: ["client_certification_id"]
            isOneToOne: false
            referencedRelation: "client_certifications"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      client_certification_bodies: {
        Row: {
          certification_body_id: string
          client_id: string
          created_at: string
          id: string
        }
        Insert: {
          certification_body_id: string
          client_id: string
          created_at?: string
          id?: string
        }
        Update: {
          certification_body_id?: string
          client_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_certification_bodies_certification_body_id_fkey"
            columns: ["certification_body_id"]
            isOneToOne: false
            referencedRelation: "certification_bodies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_certification_bodies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_certifications: {
        Row: {
          auditor_id: string | null
          certificate_number: string | null
          certification_id: string
          client_id: string
          created_at: string
          id: string
          notes: string | null
          scope: string | null
          status: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          auditor_id?: string | null
          certificate_number?: string | null
          certification_id: string
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          scope?: string | null
          status?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          auditor_id?: string | null
          certificate_number?: string | null
          certification_id?: string
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          scope?: string | null
          status?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_certifications_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "auditors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_certifications_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_certifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          certifications:
            | Database["public"]["Enums"]["certification_standard"][]
            | null
          client_number: string | null
          consultant: string | null
          contact_person: string
          country: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          parent_client_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          certifications?:
            | Database["public"]["Enums"]["certification_standard"][]
            | null
          client_number?: string | null
          consultant?: string | null
          contact_person: string
          country?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          parent_client_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          certifications?:
            | Database["public"]["Enums"]["certification_standard"][]
            | null
          client_number?: string | null
          consultant?: string | null
          contact_person?: string
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_client_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_parent_client_id_fkey"
            columns: ["parent_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      outlook_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "berater" | "user"
      audit_status: "scheduled" | "in-progress" | "completed" | "cancelled"
      audit_type: "initial" | "surveillance" | "recertification" | "six-month"
      certification_standard:
        | "SURE"
        | "FSC"
        | "PEFC"
        | "ISCC"
        | "ISO 9001"
        | "ISO 14001"
      task_status: "pending" | "in-progress" | "completed" | "overdue"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "berater", "user"],
      audit_status: ["scheduled", "in-progress", "completed", "cancelled"],
      audit_type: ["initial", "surveillance", "recertification", "six-month"],
      certification_standard: [
        "SURE",
        "FSC",
        "PEFC",
        "ISCC",
        "ISO 9001",
        "ISO 14001",
      ],
      task_status: ["pending", "in-progress", "completed", "overdue"],
    },
  },
} as const
