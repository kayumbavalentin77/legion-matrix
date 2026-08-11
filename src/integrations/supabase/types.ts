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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ammunition_inventory: {
        Row: {
          batch_number: string | null
          condition: string | null
          created_at: string
          id: string
          inspection_date: string | null
          item_code: string
          quantity: number
          status: string
          storage_location: string | null
          type: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          inspection_date?: string | null
          item_code: string
          quantity?: number
          status?: string
          storage_location?: string | null
          type: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          inspection_date?: string | null
          item_code?: string
          quantity?: number
          status?: string
          storage_location?: string | null
          type?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ammunition_inventory_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      ammunition_transactions: {
        Row: {
          ammunition_id: string | null
          created_at: string
          id: string
          notes: string | null
          performed_by: string | null
          quantity: number
          transaction_type: string
        }
        Insert: {
          ammunition_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          quantity: number
          transaction_type: string
        }
        Update: {
          ammunition_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          quantity?: number
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ammunition_transactions_ammunition_id_fkey"
            columns: ["ammunition_id"]
            isOneToOne: false
            referencedRelation: "ammunition_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          ip_address: string | null
          module: string | null
          record_ref: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          record_ref?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          record_ref?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          author: string | null
          category: string | null
          classification: string
          created_at: string
          document_code: string
          document_date: string | null
          file_name: string | null
          file_path: string | null
          id: string
          operation_id: string | null
          status: string
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          classification?: string
          created_at?: string
          document_code: string
          document_date?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          operation_id?: string | null
          status?: string
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string | null
          classification?: string
          created_at?: string
          document_code?: string
          document_date?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          operation_id?: string | null
          status?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          assigned_to: string | null
          category: string
          condition: string | null
          created_at: string
          date_acquired: string | null
          equipment_code: string
          id: string
          name: string
          quantity: number
          serial_number: string | null
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          condition?: string | null
          created_at?: string
          date_acquired?: string | null
          equipment_code: string
          id?: string
          name: string
          quantity?: number
          serial_number?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          condition?: string | null
          created_at?: string
          date_acquired?: string | null
          equipment_code?: string
          id?: string
          name?: string
          quantity?: number
          serial_number?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_records: {
        Row: {
          category: string | null
          created_at: string
          id: string
          push_ups: number | null
          running_time: string | null
          score: number | null
          sit_ups: number | null
          soldier_id: string | null
          test_date: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          push_ups?: number | null
          running_time?: string | null
          score?: number | null
          sit_ups?: number | null
          soldier_id?: string | null
          test_date?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          push_ups?: number | null
          running_time?: string | null
          score?: number | null
          sit_ups?: number | null
          soldier_id?: string | null
          test_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitness_records_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          category: string | null
          created_at: string
          id: string
          item_code: string
          minimum_level: number
          name: string
          quantity: number
          storage_location: string | null
          unit_of_measure: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          item_code: string
          minimum_level?: number
          name: string
          quantity?: number
          storage_location?: string | null
          unit_of_measure?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          item_code?: string
          minimum_level?: number
          name?: string
          quantity?: number
          storage_location?: string | null
          unit_of_measure?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string
          id: string
          inventory_id: string | null
          notes: string | null
          performed_by: string | null
          quantity: number
          transaction_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id?: string | null
          notes?: string | null
          performed_by?: string | null
          quantity: number
          transaction_type: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string | null
          notes?: string | null
          performed_by?: string | null
          quantity?: number
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          category: string | null
          classification: string | null
          created_at: string
          description: string | null
          id: string
          latitude: number
          longitude: number
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          classification?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude: number
          longitude: number
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          classification?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_records: {
        Row: {
          created_at: string
          fitness_restriction: string | null
          id: string
          notes: string | null
          return_to_duty: string | null
          soldier_id: string | null
          status: string | null
          updated_at: string
          visit_date: string
          visit_type: string | null
        }
        Insert: {
          created_at?: string
          fitness_restriction?: string | null
          id?: string
          notes?: string | null
          return_to_duty?: string | null
          soldier_id?: string | null
          status?: string | null
          updated_at?: string
          visit_date?: string
          visit_type?: string | null
        }
        Update: {
          created_at?: string
          fitness_restriction?: string | null
          id?: string
          notes?: string | null
          return_to_duty?: string | null
          soldier_id?: string | null
          status?: string | null
          updated_at?: string
          visit_date?: string
          visit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          module: string | null
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          module?: string | null
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          module?: string | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      operations: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          reference_number: string
          responsible_officer: string | null
          start_date: string | null
          status: string
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          reference_number: string
          responsible_officer?: string | null
          start_date?: string | null
          status?: string
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          reference_number?: string
          responsible_officer?: string | null
          start_date?: string | null
          status?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          last_login: string | null
          status: string
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id: string
          last_login?: string | null
          status?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          last_login?: string | null
          status?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      security_reports: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          reliability: string | null
          report_code: string
          report_date: string
          risk_level: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          reliability?: string | null
          report_code: string
          report_date?: string
          risk_level?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          reliability?: string | null
          report_code?: string
          report_date?: string
          risk_level?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      soldiers: {
        Row: {
          address: string | null
          created_at: string
          date_joined: string | null
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          is_sample: boolean
          nationality: string | null
          phone: string | null
          position: string | null
          rank: string
          service_number: string
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_joined?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_sample?: boolean
          nationality?: string | null
          phone?: string | null
          position?: string | null
          rank: string
          service_number: string
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_joined?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_sample?: boolean
          nationality?: string | null
          phone?: string | null
          position?: string | null
          rank?: string
          service_number?: string
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "soldiers_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      training_records: {
        Row: {
          course: string
          created_at: string
          id: string
          instructor: string | null
          result: string | null
          soldier_id: string | null
          training_date: string | null
          updated_at: string
        }
        Insert: {
          course: string
          created_at?: string
          id?: string
          instructor?: string | null
          result?: string | null
          soldier_id?: string | null
          training_date?: string | null
          updated_at?: string
        }
        Update: {
          course?: string
          created_at?: string
          id?: string
          instructor?: string | null
          result?: string | null
          soldier_id?: string | null
          training_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_records_soldier_id_fkey"
            columns: ["soldier_id"]
            isOneToOne: false
            referencedRelation: "soldiers"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          code: string | null
          created_at: string
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      vehicle_faults: {
        Row: {
          created_at: string
          description: string | null
          fault_type: string | null
          id: string
          priority: string | null
          report_date: string | null
          reported_by: string | null
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          fault_type?: string | null
          id?: string
          priority?: string | null
          report_date?: string | null
          reported_by?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          fault_type?: string | null
          id?: string
          priority?: string | null
          report_date?: string | null
          reported_by?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_faults_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_locations: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          recorded_at: string
          status: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          recorded_at?: string
          status?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          recorded_at?: string
          status?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_locations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_maintenance: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          id: string
          maintenance_date: string | null
          maintenance_type: string | null
          next_maintenance_date: string | null
          status: string
          technician: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          maintenance_date?: string | null
          maintenance_type?: string | null
          next_maintenance_date?: string | null
          status?: string
          technician?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          maintenance_date?: string | null
          maintenance_type?: string | null
          next_maintenance_date?: string | null
          status?: string
          technician?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          driver: string | null
          id: string
          manufacturer: string | null
          model: string | null
          registration_number: string
          status: string
          type: string | null
          unit_id: string | null
          updated_at: string
          vehicle_code: string
          year: number | null
        }
        Insert: {
          created_at?: string
          driver?: string | null
          id?: string
          manufacturer?: string | null
          model?: string | null
          registration_number: string
          status?: string
          type?: string | null
          unit_id?: string | null
          updated_at?: string
          vehicle_code: string
          year?: number | null
        }
        Update: {
          created_at?: string
          driver?: string | null
          id?: string
          manufacturer?: string | null
          model?: string | null
          registration_number?: string
          status?: string
          type?: string | null
          unit_id?: string | null
          updated_at?: string
          vehicle_code?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_medical: { Args: never; Returns: boolean }
      can_write: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "administrator"
        | "personnel_officer"
        | "logistics_officer"
        | "medical_officer"
        | "vehicle_officer"
        | "equipment_officer"
        | "viewer"
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
      app_role: [
        "super_admin",
        "administrator",
        "personnel_officer",
        "logistics_officer",
        "medical_officer",
        "vehicle_officer",
        "equipment_officer",
        "viewer",
      ],
    },
  },
} as const
