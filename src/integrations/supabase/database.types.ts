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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attendance_adjustments: {
        Row: {
          adjustment_date: string
          approved_by: string | null
          attendance_type: string
          created_at: string
          employee_id: string
          id: string
          is_approved: boolean
          notes: string | null
          updated_at: string
        }
        Insert: {
          adjustment_date: string
          approved_by?: string | null
          attendance_type: string
          created_at?: string
          employee_id: string
          id?: string
          is_approved?: boolean
          notes?: string | null
          updated_at?: string
        }
        Update: {
          adjustment_date?: string
          approved_by?: string | null
          attendance_type?: string
          created_at?: string
          employee_id?: string
          id?: string
          is_approved?: boolean
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          department_id: string
          email: string
          employee_code: string
          first_login: boolean | null
          gender: string | null
          id: string
          join_date: string | null
          monthly_salary: number | null
          name: string
          password_hash: string | null
          password_updated_at: string | null
          phone: string | null
          profile_photo_url: string | null
          role_id: string
          standard_hours_per_day: number | null
          updated_at: string
          user_id: string | null
          working_days: number | null
        }
        Insert: {
          created_at?: string
          department_id: string
          email: string
          employee_code: string
          first_login?: boolean | null
          gender?: string | null
          id?: string
          join_date?: string | null
          monthly_salary?: number | null
          name: string
          password_hash?: string | null
          password_updated_at?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          role_id: string
          standard_hours_per_day?: number | null
          updated_at?: string
          user_id?: string | null
          working_days?: number | null
        }
        Update: {
          created_at?: string
          department_id?: string
          email?: string
          employee_code?: string
          first_login?: boolean | null
          gender?: string | null
          id?: string
          join_date?: string | null
          monthly_salary?: number | null
          name?: string
          password_hash?: string | null
          password_updated_at?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          role_id?: string
          standard_hours_per_day?: number | null
          updated_at?: string
          user_id?: string | null
          working_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      functions: {
        Row: {
          created_at: string
          function_name: string
          id: string
          role_id: string
          target_period: string
          target_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          role_id: string
          target_period?: string
          target_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          role_id?: string
          target_period?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "functions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string | null
          holiday_date: string
          id: string
          is_paid: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          holiday_date: string
          id?: string
          is_paid?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          holiday_date?: string
          id?: string
          is_paid?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_performance_logs: {
        Row: {
          actual_count: number
          actual_revenue: number
          created_at: string
          employee_id: string
          id: string
          kpi_id: string
          log_date: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          actual_count?: number
          actual_revenue?: number
          created_at?: string
          employee_id: string
          id?: string
          kpi_id: string
          log_date?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          actual_count?: number
          actual_revenue?: number
          created_at?: string
          employee_id?: string
          id?: string
          kpi_id?: string
          log_date?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_performance_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_performance_logs_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_performance_summary: {
        Row: {
          count_performance: number
          created_at: string
          employee_id: string
          final_score: number
          id: string
          kpi_id: string
          period_end: string
          period_start: string
          revenue_performance: number
          total_count: number
          total_revenue: number
          updated_at: string
        }
        Insert: {
          count_performance?: number
          created_at?: string
          employee_id: string
          final_score?: number
          id?: string
          kpi_id: string
          period_end: string
          period_start: string
          revenue_performance?: number
          total_count?: number
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          count_performance?: number
          created_at?: string
          employee_id?: string
          final_score?: number
          id?: string
          kpi_id?: string
          period_end?: string
          period_start?: string
          revenue_performance?: number
          total_count?: number
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_performance_summary_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_performance_summary_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
        ]
      }
      kpis: {
        Row: {
          created_at: string
          department_id: string
          final_target: number
          function_id: string
          id: string
          is_yes_no: boolean | null
          kpi_summary: string | null
          module_handle: string | null
          project_client: string | null
          role_id: string
          target_count: number | null
          target_count_display: string | null
          target_revenue: number
          time_tenure: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id: string
          final_target: number
          function_id: string
          id?: string
          is_yes_no?: boolean | null
          kpi_summary?: string | null
          module_handle?: string | null
          project_client?: string | null
          role_id: string
          target_count: number | null
          target_count_display: string | null
          target_revenue?: number
          time_tenure: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          final_target?: number
          function_id?: string
          id?: string
          is_yes_no?: boolean | null
          kpi_summary?: string | null
          module_handle?: string | null
          project_client?: string | null
          role_id?: string
          target_count?: number | null
          target_count_display?: string | null
          target_revenue?: number
          time_tenure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpis_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpis_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpis_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          admin_notes: string | null
          admin_seen: boolean
          attendance_type: string
          created_at: string
          employee_id: string
          employee_seen: boolean
          id: string
          leave_date: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          admin_seen?: boolean
          attendance_type: string
          created_at?: string
          employee_id: string
          employee_seen?: boolean
          id?: string
          leave_date: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          admin_seen?: boolean
          attendance_type?: string
          created_at?: string
          employee_id?: string
          employee_seen?: boolean
          id?: string
          leave_date?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          department_id: string
          id: string
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          role_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          role_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      task_logs: {
        Row: {
          count: number
          created_at: string
          employee_id: string
          function_id: string
          id: string
          log_date: string
          module_handle: string | null
          project_client: string | null
          remarks: string | null
          scale: number | null
          updated_at: string
        }
        Insert: {
          count?: number
          created_at?: string
          employee_id: string
          function_id: string
          id?: string
          log_date?: string
          module_handle?: string | null
          project_client?: string | null
          remarks?: string | null
          scale?: number | null
          updated_at?: string
        }
        Update: {
          count?: number
          created_at?: string
          employee_id?: string
          function_id?: string
          id?: string
          log_date?: string
          module_handle?: string | null
          project_client?: string | null
          remarks?: string | null
          scale?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "functions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          department_id: string | null
          employee_id: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          employee_id?: string | null
          id?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          employee_id?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      work_sessions: {
        Row: {
          break_count: number | null
          break_duration: number | null
          break_end_time: string | null
          break_start_time: string | null
          created_at: string
          date: string
          employee_id: string | null
          end_time: string | null
          id: string
          late_login: boolean | null
          lunch_break: boolean | null
          lunch_break_duration: number | null
          lunch_break_end: string | null
          lunch_break_start: string | null
          morning_break: boolean | null
          morning_break_duration: number | null
          morning_break_end: string | null
          morning_break_start: string | null
          notes: string | null
          overtime_hours: number | null
          short_break: boolean | null
          short_break_duration: number | null
          short_break_end: string | null
          short_break_start: string | null
          start_time: string | null
          status: string
          total_hours: number | null
          updated_at: string
          user_id: string
          work_summary_id: string | null
        }
        Insert: {
          break_count?: number | null
          break_duration?: number | null
          break_end_time?: string | null
          break_start_time?: string | null
          created_at?: string
          date?: string
          employee_id?: string | null
          end_time?: string | null
          id?: string
          late_login?: boolean | null
          lunch_break?: boolean | null
          lunch_break_duration?: number | null
          lunch_break_end?: string | null
          lunch_break_start?: string | null
          morning_break?: boolean | null
          morning_break_duration?: number | null
          morning_break_end?: string | null
          morning_break_start?: string | null
          notes?: string | null
          overtime_hours?: number | null
          short_break?: boolean | null
          short_break_duration?: number | null
          short_break_end?: string | null
          short_break_start?: string | null
          start_time?: string | null
          status?: string
          total_hours?: number | null
          updated_at?: string
          user_id: string
          work_summary_id?: string | null
        }
        Update: {
          break_count?: number | null
          break_duration?: number | null
          break_end_time?: string | null
          break_start_time?: string | null
          created_at?: string
          date?: string
          employee_id?: string | null
          end_time?: string | null
          id?: string
          late_login?: boolean | null
          lunch_break?: boolean | null
          lunch_break_duration?: number | null
          lunch_break_end?: string | null
          lunch_break_start?: string | null
          morning_break?: boolean | null
          morning_break_duration?: number | null
          morning_break_end?: string | null
          morning_break_start?: string | null
          notes?: string | null
          overtime_hours?: number | null
          short_break?: boolean | null
          short_break_duration?: number | null
          short_break_end?: string | null
          short_break_start?: string | null
          start_time?: string | null
          status?: string
          total_hours?: number | null
          updated_at?: string
          user_id?: string
          work_summary_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_sessions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_sessions_work_summary_id_fkey"
            columns: ["work_summary_id"]
            isOneToOne: false
            referencedRelation: "work_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      work_summaries: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          summary: string
          updated_at: string | null
          user_id: string
          work_date: string
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          summary: string
          updated_at?: string | null
          user_id: string
          work_date?: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          summary?: string
          updated_at?: string | null
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_summaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_kpi_performance: {
        Args: {
          p_employee_id: string
          p_kpi_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: {
          count_performance: number
          final_score: number
          revenue_performance: number
          total_count: number
          total_revenue: number
        }[]
      }
      can_start_work: {
        Args: { p_date: string; p_user_id: string }
        Returns: boolean
      }
      end_break: {
        Args: { p_date: string; p_user_id: string }
        Returns: {
          break_type: string
          duration_mins: number
          message: string
          success: boolean
        }[]
      }
      get_current_work_session: {
        Args: { p_user_id: string }
        Returns: {
          break_duration: number
          break_end_time: string
          break_start_time: string
          date: string
          end_time: string
          id: string
          late_login: boolean
          overtime_hours: number
          start_time: string
          status: string
          total_hours: number
        }[]
      }
      get_next_break_type: {
        Args: { p_date: string; p_user_id: string }
        Returns: string
      }
      get_work_session_with_summary: {
        Args: { p_date: string; p_user_id: string }
        Returns: {
          break_duration: number
          break_end_time: string
          break_start_time: string
          date: string
          employee_id: string
          end_time: string
          id: string
          late_login: boolean
          notes: string
          overtime_hours: number
          start_time: string
          status: string
          summary: string
          total_hours: number
          user_id: string
          work_summary_id: string
        }[]
      }
      handle_employee_auth: {
        Args: { employee_code_input: string }
        Returns: {
          auth_user_id: string
          email: string
          employee_id: string
          is_first_login: boolean
          name: string
        }[]
      }
      handle_employee_login: {
        Args: { employee_code_input: string; password_input: string }
        Returns: {
          email: string
          employee_id: string
          error_message: string
          is_first_login: boolean
          name: string
          success: boolean
        }[]
      }
      start_break: {
        Args: { p_date: string; p_user_id: string }
        Returns: {
          break_type: string
          message: string
          success: boolean
        }[]
      }
      test_work_sessions_access: {
        Args: { p_user_id: string }
        Returns: {
          date: string
          id: string
          status: string
          user_id: string
        }[]
      }
      update_employee_password: {
        Args: { employee_id_input: string; new_password: string }
        Returns: boolean
      }
      verify_employee_password: {
        Args: { employee_code_input: string; password_input: string }
        Returns: {
          email: string
          employee_id: string
          is_first_login: boolean
          name: string
          user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
