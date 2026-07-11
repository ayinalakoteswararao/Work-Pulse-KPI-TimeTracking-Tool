export interface KPI {
  id: string;
  department_id: string;
  role_id: string;
  function_id: string;
  kpi_summary?: string; // Made optional - will be filled by employees
  time_tenure: 'day' | 'week' | 'month';
  target_count?: number | null;
  target_count_display?: string | null;
  target_revenue: number;
  final_target: number;
  project_client?: string; // Project or client name
  module_handle?: string; // Module or handle name
  is_yes_no?: boolean; // Yes/No type KPI
  created_at: string;
  updated_at: string;
}

export interface KPIWithRelations extends KPI {
  departments?: {
    id: string;
    name: string;
    companies?: {
      id: string;
      name: string;
    };
  };
  roles?: {
    id: string;
    role_name: string;
  };
  functions?: {
    id: string;
    function_name: string;
    roles?: {
      id: string;
      role_name: string;
      departments?: {
        id: string;
        name: string;
        companies?: {
          id: string;
          name: string;
        };
      };
    };
  };
}

export interface KPIPerformanceLog {
  id: string;
  kpi_id: string;
  employee_id: string;
  log_date: string;
  actual_count: number;
  actual_revenue: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface KPIPerformanceLogWithRelations extends KPIPerformanceLog {
  kpis?: KPIWithRelations;
  employees?: {
    id: string;
    name: string;
    email: string;
    profile_photo_url?: string | null;
    roles?: {
      id: string;
      role_name: string;
      departments?: {
        id: string;
        name: string;
      };
    };
  };
}

export interface KPIPerformanceSummary {
  id: string;
  kpi_id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  total_count: number;
  total_revenue: number;
  count_performance: number; // percentage
  revenue_performance: number; // percentage
  final_score: number; // weighted average
  created_at: string;
  updated_at: string;
}

export interface KPIPerformanceSummaryWithRelations extends KPIPerformanceSummary {
  kpis?: KPIWithRelations;
  employees?: {
    id: string;
    name: string;
    email: string;
    profile_photo_url?: string | null;
    roles?: {
      id: string;
      role_name: string;
      departments?: {
        id: string;
        name: string;
      };
    };
  };
}

export interface KPICreationForm {
  department_id: string;
  role_id: string;
  function_id: string;
  function_name: string; // For inline function creation
  kpi_summary?: string; // Made optional - will be filled by employees
  time_tenure: 'day' | 'week' | 'month';
  target_count?: string | number | null; // Allow string from input, convert before db
  target_count_display?: string | null;
  target_revenue: number;
  final_target: number;
  measurement_type: 'count' | 'quantity' | 'revenue' | 'yes_no'; // UI only, not sent to database
  employee_id?: string; // UI only - for filtering, not sent to database
  project_client?: string; // Project or client name
  module_handle?: string; // Module or handle name
  is_yes_no?: boolean; // Yes/No type KPI
}

// Database interface (without measurement_type)
export interface KPICreationDB {
  department_id: string;
  role_id: string;
  function_id: string;
  kpi_summary?: string;
  time_tenure: 'day' | 'week' | 'month';
  target_count?: number | null;
  target_count_display?: string | null;
  target_revenue: number;
  final_target: number;
  project_client?: string; // Project or client name
  module_handle?: string; // Module or handle name
  is_yes_no?: boolean; // Yes/No type KPI
}

export interface KPIPerformanceForm {
  kpi_id: string;
  employee_id: string;
  log_date: string;
  actual_count: number;
  actual_revenue: number;
  notes?: string;
  kpi_summary?: string; // Added for employee to describe their performance
}

export interface KPICalculatedPerformance {
  total_count: number;
  total_revenue: number;
  count_performance: number;
  revenue_performance: number;
  final_score: number;
}

export interface KPIDashboardData {
  kpis: KPIWithRelations[];
  performanceSummaries: KPIPerformanceSummaryWithRelations[];
  topPerformers: {
    employee_name: string;
    final_score: number;
    kpi_summary: string;
  }[];
  underperformers: {
    employee_name: string;
    final_score: number;
    kpi_summary: string;
  }[];
  overallPerformance: {
    averageScore: number;
    totalEmployees: number;
    totalKPIs: number;
  };
}
