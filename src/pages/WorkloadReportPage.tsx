import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  FileBarChart,
  Calendar,
  TrendingUp,
  Users,
  Target,
  ArrowLeft,
  BarChart3,
  Clock,
  CheckCircle2,
  Download,
  FileText,
  Briefcase,
  Building2,
  ClipboardList,
  ListChecks,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import EmployeeAvatarWithPreview from "@/components/EmployeeAvatarWithPreview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Rotating accent styles for admin employee-summary rows (Workload report). */
const EMPLOYEE_SUMMARY_CARD_THEMES = [
  "border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-50/90 to-white border border-violet-100/80 hover:from-violet-100/90",
  "border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-50/90 to-white border border-indigo-100/80 hover:from-indigo-100/90",
  "border-l-4 border-l-cyan-500 bg-gradient-to-r from-cyan-50/90 to-white border border-cyan-100/80 hover:from-cyan-100/90",
  "border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50/90 to-white border border-emerald-100/80 hover:from-emerald-100/90",
  "border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/90 to-white border border-amber-100/80 hover:from-amber-100/90",
  "border-l-4 border-l-fuchsia-500 bg-gradient-to-r from-fuchsia-50/90 to-white border border-fuchsia-100/80 hover:from-fuchsia-100/90",
] as const;

function csvEscapeCell(value: unknown): string {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Local calendar date as YYYY-MM-DD (avoids UTC drift from toISOString). */
function formatLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Display a stored log_date (YYYY-MM-DD) in a readable local format. */
function formatLogDateLabel(isoDate: string | undefined): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate ?? "—";
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Preview-first report: opens in new tab, then user chooses download/print.
const openReportPreview = (content: string, filename: string) => {
  const previewWindow = window.open("", "_blank");
  if (!previewWindow) {
    toast.error("Failed to open report preview");
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${filename}</title>
      <style>
        body {
          margin: 0;
          background: #f3f4f6;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .toolbar {
          position: sticky;
          top: 0;
          z-index: 1000;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #111827;
          color: #fff;
          border-bottom: 1px solid rgba(255,255,255,0.12);
        }
        .toolbar-title {
          font-size: 13px;
          opacity: 0.9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .toolbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn {
          border: 0;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-download {
          background: linear-gradient(135deg, #2563eb, #4f46e5);
          color: #fff;
        }
        .btn-close {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }
        .sheet {
          max-width: 980px;
          margin: 20px auto;
          padding: 0 12px 24px;
        }
        @media print {
          .toolbar { display: none; }
          body { background: #fff; }
          .sheet { max-width: none; margin: 0; padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="toolbar">
        <div class="toolbar-title">${filename}</div>
        <div class="toolbar-actions">
          <button class="btn btn-download" onclick="window.print()">Download / Print</button>
          <button class="btn btn-close" onclick="window.close()">Close</button>
        </div>
      </div>
      <div class="sheet">
        ${content}
      </div>
    </body>
    </html>
  `;

  previewWindow.document.write(htmlContent);
  previewWindow.document.close();
};

interface TaskLog {
  id: string;
  employee_id: string;
  function_id: string;
  count: number;
  scale: number;
  log_date: string;
  project_client?: string;
  module_handle?: string;
  employees?: { name: string; profile_photo_url?: string | null };
  functions?: { function_name: string; target_value: number };
}

export default function WorkloadReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userRole, isAdmin, isManager, isEmployee } = useAuth();
  const previewEmployeeId = searchParams.get("employee");
  const isManagingAsEmployee = (isAdmin() || isManager()) && !!previewEmployeeId;
  const employeePreviewReadOnly = isManagingAsEmployee;
  const previewFilterKey = `${previewEmployeeId ?? ""}|${searchParams.get("previewDept") ?? ""}|${searchParams.get("previewRole") ?? ""}|${searchParams.get("previewCompany") ?? ""}`;
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<string>(isAdmin() ? "daily" : "7");

  const dateRangeText = selectedDateRange === "daily" ? "Specific Day" :
                        selectedDateRange === "today" ? "Today" :
                        selectedDateRange === "yesterday" ? "Yesterday" :
                        selectedDateRange === "7" ? "Last 7 Days" :
                        selectedDateRange === "15" ? "Last 15 Days" :
                        selectedDateRange === "30" ? "Last 30 Days" :
                        selectedDateRange === "this_month" ? "This Month" :
                        selectedDateRange === "last_month" ? "Last Month" : "All Time";


  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDerivedDateRangeString = () => {
    if (selectedDateRange === "daily") {
      return currentDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }
    const now = new Date();
    let startD = new Date(now);
    let endD = new Date(now);
    if (selectedDateRange === "today") {}
    else if (selectedDateRange === "yesterday") { startD.setDate(startD.getDate() - 1); endD = new Date(startD); }
    else if (selectedDateRange === "7") { startD.setDate(startD.getDate() - 7); }
    else if (selectedDateRange === "15") { startD.setDate(startD.getDate() - 15); }
    else if (selectedDateRange === "30") { startD.setDate(startD.getDate() - 30); }
    else if (selectedDateRange === "this_month") { startD = new Date(now.getFullYear(), now.getMonth(), 1); }
    else if (selectedDateRange === "last_month") { 
      startD = new Date(now.getFullYear(), now.getMonth() - 1, 1); 
      endD = new Date(now.getFullYear(), now.getMonth(), 0); 
    }
    
    if (startD.toLocaleDateString() === endD.toLocaleDateString()) {
      return startD.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }
    return `${startD.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} to ${endD.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  };
  const derivedDateRangeString = getDerivedDateRangeString();
  // Employee Summary specific filters
  const [summaryDeptFilter, setSummaryDeptFilter] = useState<string>("all");
  const [summaryRoleFilter, setSummaryRoleFilter] = useState<string>("all");
  const [summaryEmpFilter, setSummaryEmpFilter] = useState<string>("all");
  /** Admin-only: main report area */
  const [adminReportSection, setAdminReportSection] = useState<"task_logs" | "work_summary">("task_logs");
  /**
   * Admin task logs UX: start with employee summary only; click an employee → task logs for that person only
   * (summary cards hidden). Back returns to summary only — not the all-employees task list. Optional control
   * in the summary header opens the combined list for all employees.
   */
  const [adminWorkloadTaskLogsMode, setAdminWorkloadTaskLogsMode] = useState<
    "summary_only" | "all_employees" | "single_employee"
  >("summary_only");
  const workSummaryDate = formatLocalYMD(currentDate);
  const taskLogsFiltersAnchorRef = useRef<HTMLDivElement>(null);

  const drillDownEmployeeToTaskLogs = (empId: string) => {
    if (!isAdmin()) return;
    setAdminWorkloadTaskLogsMode("single_employee");
    setSelectedEmployee(empId);
    setTimeout(() => {
      taskLogsFiltersAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const backToEmployeeSummaryFromTaskLogs = () => {
    if (!isAdmin()) return;
    setAdminWorkloadTaskLogsMode("summary_only");
    setSelectedEmployee("all");
  };

  const showAllEmployeesTaskLogs = () => {
    if (!isAdmin()) return;
    setSelectedEmployee("all");
    setAdminWorkloadTaskLogsMode("all_employees");
    setTimeout(() => {
      taskLogsFiltersAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  // Fetch manager's departments
  const { data: managerDepartments } = useQuery({
    queryKey: ["manager_departments", user?.id],
    queryFn: async () => {
      if (!isManager() || !user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("department_id")
        .eq("user_id", user.id)
        .eq("role", "manager");
      if (error) throw error;
      return data?.map((d: any) => d.department_id) || [];
    },
    enabled: isManager(),
  });

  // Fetch employee's company and department
  const { data: employeeCompanyDept } = useQuery({
    queryKey: ["employee_company_dept", userRole.employee_id],
    queryFn: async () => {
      if (!isEmployee() || !userRole.employee_id) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("department_id, departments!inner(id, name, company_id, companies!inner(id, name))")
        .eq("id", userRole.employee_id)
        .single();
      if (error) throw error;
      return data as { 
        department_id: string; 
        departments: { 
          id: string; 
          name: string; 
          company_id: string; 
          companies: { id: string; name: string } 
        } 
      };
    },
    enabled: isEmployee() && !!userRole.employee_id,
  });

  const { data: companies } = useQuery({
    queryKey: ["companies", employeeCompanyDept],
    queryFn: async () => {
      let query = supabase
        .from("companies")
        .select("id, name")
        .order("name");
      
      // For employees, only show their company
      if (isEmployee() && employeeCompanyDept) {
        query = query.eq("id", employeeCompanyDept.departments.companies.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !isEmployee() || (employeeCompanyDept !== undefined),
  });

  const { data: departments } = useQuery({
    queryKey: ["departments", selectedCompany, managerDepartments, employeeCompanyDept],
    queryFn: async () => {
      let query = supabase
        .from("departments")
        .select("id, name, company_id, companies(name)")
        .order("name");
      
      // For managers, filter by their departments
      if (isManager() && managerDepartments && managerDepartments.length > 0) {
        query = query.in("id", managerDepartments);
      }
      // For employees, only show their department
      else if (isEmployee() && employeeCompanyDept) {
        query = query.eq("id", employeeCompanyDept.department_id);
      }
      else if (selectedCompany && selectedCompany !== "all") {
        query = query.eq("company_id", selectedCompany);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as { id: string; name: string; company_id: string; companies?: { name: string } }[];
    },
    enabled: (!isManager() || managerDepartments !== undefined) && (!isEmployee() || employeeCompanyDept !== undefined),
  });

  const { data: roles } = useQuery({
    queryKey: ["roles", selectedCompany, selectedDepartment, managerDepartments],
    queryFn: async () => {
      let query = supabase
        .from("roles")
        .select("id, role_name, department_id, departments(name, companies(name))")
        .order("role_name");
      
      // For managers, filter by their department's roles
      if (isManager() && managerDepartments && managerDepartments.length > 0) {
        query = query.in("department_id", managerDepartments);
      } else if (selectedDepartment && selectedDepartment !== "all") {
        query = query.eq("department_id", selectedDepartment);
      } else if (selectedCompany && selectedCompany !== "all") {
        // Filter roles by company through department relationship
        const deptIds = departments?.filter(d => d.company_id === selectedCompany).map(d => d.id);
        if (deptIds && deptIds.length > 0) {
          query = query.in("department_id", deptIds);
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as { id: string; role_name: string; department_id: string; departments?: { name: string; companies?: { name: string } } }[];
    },
    enabled: !isManager() || managerDepartments !== undefined,
  });

  const { data: employees } = useQuery({
    queryKey: ["employees", selectedCompany, selectedDepartment, selectedRole, managerDepartments],
    queryFn: async () => {
      let query = supabase
        .from("employees")
        .select("*, roles(role_name), departments(name, companies(name))")
        .order("name");
      
      // For managers, filter by their departments
      if (isManager() && managerDepartments && managerDepartments.length > 0) {
        query = query.in("department_id", managerDepartments);
      } else if (selectedRole && selectedRole !== "all") {
        query = query.eq("role_id", selectedRole);
      } else if (selectedDepartment && selectedDepartment !== "all") {
        query = query.eq("department_id", selectedDepartment);
      } else if (selectedCompany && selectedCompany !== "all") {
        const deptIds = departments?.filter(d => d.company_id === selectedCompany).map(d => d.id);
        if (deptIds && deptIds.length > 0) {
          query = query.in("department_id", deptIds);
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as { 
        id: string; 
        name: string; 
        email: string;
        role_id: string; 
        department_id: string;
        roles?: { role_name: string };
        departments?: { name: string; companies?: { name: string } };
      }[];
    },
    enabled: !isManager() || managerDepartments !== undefined,
  });

  // Auto-select current user if employee
  useEffect(() => {
    if (isManagingAsEmployee && previewEmployeeId) {
      setSelectedEmployee(previewEmployeeId);
      return;
    }
    if (employees && user && !isAdmin()) {
      // Emails coming from auth can differ in casing/whitespace; normalize before matching.
      const userEmail = user.email?.trim().toLowerCase();
      const userEmployee = employees.find(
        (e) => e.email?.trim().toLowerCase() === userEmail
      );
      if (userEmployee && userEmployee.id !== selectedEmployee) {
        setSelectedEmployee(userEmployee.id);
      }
    }
  }, [employees, user, isAdmin, isManagingAsEmployee, previewEmployeeId]);

  // Auto-set department filter for managers
  useEffect(() => {
    if (isManager() && managerDepartments && managerDepartments.length > 0) {
      // Set first department as default for manager
      setSelectedDepartment(managerDepartments[0]);
    }
  }, [isManager, managerDepartments]);

  // Auto-set company and department for employees
  useEffect(() => {
    if (isEmployee() && employeeCompanyDept) {
      setSelectedCompany(employeeCompanyDept.departments.companies.id);
      setSelectedDepartment(employeeCompanyDept.department_id);
    }
  }, [isEmployee, employeeCompanyDept]);

  // Reset dependent filters when upstream filters change
  useEffect(() => {
    if (isEmployee() || isManagingAsEmployee) return;
    setSelectedDepartment("all");
    setSelectedRole("all");
    setSelectedEmployee(isManagingAsEmployee && previewEmployeeId ? previewEmployeeId : "all");
  }, [selectedCompany]);

  useEffect(() => {
    if (isEmployee() || isManagingAsEmployee) return;
    setSelectedRole("all");
    setSelectedEmployee(isManagingAsEmployee && previewEmployeeId ? previewEmployeeId : "all");
  }, [selectedDepartment]);

  useEffect(() => {
    if (isEmployee() || isManagingAsEmployee) return;
    setSelectedEmployee(isManagingAsEmployee && previewEmployeeId ? previewEmployeeId : "all");
  }, [selectedRole]);

  useEffect(() => {
    if (!isManagingAsEmployee || !previewEmployeeId) return;
    const pc = searchParams.get("previewCompany");
    const pd = searchParams.get("previewDept");
    const pr = searchParams.get("previewRole");
    if (pc) setSelectedCompany(pc);
    if (pd) {
      setSelectedDepartment(pd);
      setSummaryDeptFilter(pd);
    }
    if (pr) {
      setSelectedRole(pr);
      setSummaryRoleFilter(pr);
    }
    setSelectedEmployee(previewEmployeeId);
    setSummaryEmpFilter(previewEmployeeId);
  }, [isManagingAsEmployee, previewEmployeeId, previewFilterKey]);

  useEffect(() => {
    if (isManagingAsEmployee && isAdmin()) {
      setAdminWorkloadTaskLogsMode("all_employees");
    }
  }, [isManagingAsEmployee, isAdmin]);

  const { data: logs, isLoading } = useQuery({
    queryKey: [
      "task_logs",
      selectedEmployee,
      workSummaryDate,
      selectedDateRange,
      adminWorkloadTaskLogsMode,
      summaryDeptFilter,
      summaryRoleFilter,
      summaryEmpFilter,
      selectedCompany,
      selectedDepartment,
      selectedRole,
      selectedProject,
      selectedModule,
      employees?.map((e) => e.id),
    ],
    queryFn: async () => {
      // Get employee IDs for the manager's departments
      const employeeIds = isManager() 
        ? employees?.map(e => e.id) 
        : null;
      
      // If manager has no employees in their departments, return empty
      if (isManager() && (!employeeIds || employeeIds.length === 0)) {
        return [];
      }

      let filterCompany = selectedCompany;
      let filterDepartment = selectedDepartment;
      let filterRole = selectedRole;
      let filterEmployee = selectedEmployee;

      if (isAdmin()) {
        if (adminWorkloadTaskLogsMode === "single_employee" && selectedEmployee !== "all") {
          filterEmployee = selectedEmployee;
          filterRole = "all";
          filterDepartment = "all";
          filterCompany = "all";
        } else {
          filterDepartment = summaryDeptFilter;
          filterRole = summaryRoleFilter;
          filterEmployee = summaryEmpFilter;
        }
      }
      
      let query = supabase
        .from("task_logs")
        .select(
          "*, employees(name, profile_photo_url, department_id, role_id, roles(role_name), departments(name, companies(name))), functions(function_name, target_value)"
        )
        .order("log_date", { ascending: false });

      // Apply filters
      if (filterEmployee !== "all") {
        query = query.eq("employee_id", filterEmployee);
      } else if (filterRole !== "all") {
        query = query.eq("employees.role_id", filterRole);
      } else if (filterDepartment !== "all") {
        query = query.eq("employees.department_id", filterDepartment);
      } else if (filterCompany !== "all") {
        const deptIds = departments?.filter(d => d.company_id === filterCompany).map(d => d.id);
        if (deptIds && deptIds.length > 0) {
          query = query.in("employees.department_id", deptIds);
        }
      }
      
      // For managers, filter by employee IDs in their departments
      if (isManager() && employeeIds && employeeIds.length > 0) {
        query = query.in("employee_id", employeeIds);
      }

      // Admin workload: default to selected calendar day ("daily"), but allow range filter overriding.
      const now = new Date();
      if (selectedDateRange === "daily" || (isAdmin() && adminReportSection === "work_summary")) {
        query = query.eq("log_date", workSummaryDate);
      } else if (selectedDateRange === "today") {
        query = query.eq("log_date", formatLocalYMD(now));
      } else if (selectedDateRange === "yesterday") {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        query = query.eq("log_date", formatLocalYMD(y));
      } else if (selectedDateRange === "7") {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        query = query.gte("log_date", formatLocalYMD(d));
      } else if (selectedDateRange === "15") {
        const d = new Date(now);
        d.setDate(d.getDate() - 15);
        query = query.gte("log_date", formatLocalYMD(d));
      } else if (selectedDateRange === "30") {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        query = query.gte("log_date", formatLocalYMD(d));
      } else if (selectedDateRange === "this_month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        query = query.gte("log_date", formatLocalYMD(start));
      } else if (selectedDateRange === "last_month") {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        query = query.gte("log_date", formatLocalYMD(start)).lte("log_date", formatLocalYMD(end));
      }

      const { data, error } = await query;
      if (error) throw error;
      // Filter out logs with null employees when department/role/company filters are active
      if (filterDepartment !== "all" || filterRole !== "all" || filterCompany !== "all" || isManager()) {
        return (data as TaskLog[]).filter(log => log.employees !== null);
      }
      return data as TaskLog[];
    },
    enabled: !isManager() || (managerDepartments !== undefined && employees !== undefined),
  });

  const { data: workSummaries, isLoading: workSummariesLoading } = useQuery({
    queryKey: [
      "work_summaries",
      workSummaryDate,
      selectedDateRange,
      summaryDeptFilter,
      summaryRoleFilter,
      summaryEmpFilter,
      isManager() ? employees?.map((e) => e.id) : null,
    ],
    queryFn: async () => {
      if (!isAdmin() && !isManager() && !isEmployee()) return [];

      const employeeIds = isManager() ? employees?.map((e) => e.id) : null;
      if (isManager() && (!employeeIds || employeeIds.length === 0)) return [];

      let query = (supabase as any)
        .from("work_summaries")
        .select(
          `
          id,
          employee_id,
          user_id,
          work_date,
          summary,
          created_at,
          employees(
            id,
            name,
            profile_photo_url,
            department_id,
            role_id,
            roles(role_name),
            departments(name, company_id, companies(name))
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(500);

      const now = new Date();
      if (selectedDateRange === "daily") {
        query = query.eq("work_date", workSummaryDate);
      } else if (selectedDateRange === "today") {
        query = query.eq("work_date", formatLocalYMD(now));
      } else if (selectedDateRange === "yesterday") {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        query = query.eq("work_date", formatLocalYMD(y));
      } else if (selectedDateRange === "7") {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        query = query.gte("work_date", formatLocalYMD(d));
      } else if (selectedDateRange === "15") {
        const d = new Date(now);
        d.setDate(d.getDate() - 15);
        query = query.gte("work_date", formatLocalYMD(d));
      } else if (selectedDateRange === "30") {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        query = query.gte("work_date", formatLocalYMD(d));
      } else if (selectedDateRange === "this_month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        query = query.gte("work_date", formatLocalYMD(start));
      } else if (selectedDateRange === "last_month") {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        query = query.gte("work_date", formatLocalYMD(start)).lte("work_date", formatLocalYMD(end));
      }

      if (isEmployee() && userRole.employee_id) {
        query = query.eq("employee_id", userRole.employee_id);
      } else if (isManager() && employeeIds && employeeIds.length > 0) {
        query = query.in("employee_id", employeeIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []) as any[];
      return rows.filter((row) => {
        const emp = row.employees;
        if (!emp) return false;
        const matchesDept = summaryDeptFilter === "all" || emp.department_id === summaryDeptFilter;
        const matchesRole = summaryRoleFilter === "all" || emp.role_id === summaryRoleFilter;
        const matchesEmp = summaryEmpFilter === "all" || row.employee_id === summaryEmpFilter;
        return matchesDept && matchesRole && matchesEmp;
      });
    },
    enabled:
      ((isAdmin() || isManager() || isEmployee()) &&
      adminReportSection === "work_summary" &&
      (!isManager() || (managerDepartments !== undefined && employees !== undefined))),
  });

  const filteredLogs = logs?.filter(log => {
    const matchesSearch = log.employees?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.functions?.function_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = selectedProject === "all" || log.project_client === selectedProject;
    const matchesModule = selectedModule === "all" || log.module_handle === selectedModule;
    return matchesSearch && matchesProject && matchesModule;
  });

  // Calculate statistics
  const totalEntries = logs?.length || 0;
  const todayEntries = logs?.filter(l => l.log_date === new Date().toISOString().split("T")[0]).length || 0;
  const totalUnits = logs?.reduce((sum, log) => sum + log.count, 0) || 0;
  const avgScale = logs?.length ? Math.round(logs.reduce((sum, log) => sum + log.scale, 0) / logs.length) : 0;

  // Performance calculation
  const perfColor = (count: number, target: number) => {
    const pct = target > 0 ? (count / target) * 100 : 0;
    if (pct >= 100) return "text-emerald-600";
    if (pct >= 70) return "text-amber-600";
    return "text-red-500";
  };

  const perfBg = (count: number, target: number) => {
    const pct = target > 0 ? (count / target) * 100 : 0;
    if (pct >= 100) return "bg-emerald-500";
    if (pct >= 70) return "bg-amber-500";
    return "bg-red-500";
  };

  // Excel Export Function (CSV Format)
  const exportToExcel = () => {
    if (!logs || logs.length === 0) {
      toast.error("No data available to export");
      return;
    }

    try {
      const headers = [
        "Date",
        "Employee Name",
        "Department",
        "Role",
        "Project/Client",
        "Module Handle",
        "Function",
        "Completed Count",
        "Target Value",
        "Performance %",
        "Scale"
      ];

      const csvRows = [headers.map(csvEscapeCell).join(",")];

      logs.forEach((log) => {
        const emp = log.employees as any;
        const empName = emp?.name || "Unknown";
        const dept = emp?.departments?.name || "—";
        const role = emp?.roles?.role_name || "—";
        const target = log.functions?.target_value || 0;
        const pct = target > 0 ? Math.round((log.count / target) * 100) : 0;

        csvRows.push(
          [
            log.log_date,
            empName,
            dept,
            role,
            log.project_client || "",
            log.module_handle || "",
            log.functions?.function_name || "",
            log.count,
            target,
            `${pct}%`,
            log.scale,
          ]
            .map(csvEscapeCell)
            .join(",")
        );
      });

      const csvString = csvRows.join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const currentDate = new Date().toISOString().split("T")[0];
      link.setAttribute("download", `Workload_Report_${currentDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Excel report downloaded successfully (${logs.length} records)`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to generate Excel report");
    }
  };

  // Performance Slip Function (PDF Format)
  const generatePerformanceSlip = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      toast.error("No data available for performance slip with current filters");
      return;
    }

    try {
      // Calculate overall performance metrics based on FILTERED data
      const totalTasks = filteredLogs.reduce((sum, log) => sum + log.count, 0);
      const totalTargets = filteredLogs.reduce((sum, log) => sum + (log.functions?.target_value || 0), 0);
      const overallPerformance = totalTargets > 0 ? Math.round((totalTasks / totalTargets) * 100) : 0;
      
      // Get date range from FILTERED data
      const dates = filteredLogs.map(log => log.log_date).filter(Boolean);
      const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => new Date(d).getTime()))) : new Date();
      const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => new Date(d).getTime()))) : new Date();
      
      // Create filtered employee summary
      const filteredEmployeeSummary = filteredLogs?.reduce((acc, log) => {
        const empId = log.employee_id;
        if (!acc[empId]) {
          acc[empId] = {
            name: log.employees?.name || "Unknown",
            totalEntries: 0,
            totalUnits: 0,
            avgScale: 0,
            scales: [],
          };
        }
        acc[empId].totalEntries++;
        acc[empId].totalUnits += log.count;
        acc[empId].scales.push(log.scale);
        acc[empId].avgScale = Math.round(acc[empId].scales.reduce((a, b) => a + b, 0) / acc[empId].scales.length);
        return acc;
      }, {} as Record<string, { name: string; totalEntries: number; totalUnits: number; avgScale: number; scales: number[] }>);

      // Get filter context for the report
      const selectedEmployeeName = selectedEmployee !== "all" 
        ? employees?.find(e => e.id === selectedEmployee)?.name || "Unknown Employee"
        : "All Employees";
      


      const avgScale = filteredLogs.length
        ? Math.round(filteredLogs.reduce((sum, log) => sum + (log.scale || 0), 0) / filteredLogs.length)
        : 0;

      const statusLabel =
        overallPerformance >= 90
          ? "Excellent"
          : overallPerformance >= 70
            ? "Good"
            : overallPerformance >= 50
              ? "Average"
              : "Needs improvement";

      // Use a consistent vibrant accent to keep the report visually rich.
      const statusAccent = "#f97316";

      const funcAgg = new Map<string, { units: number; entries: number }>();
      filteredLogs.forEach((l: any) => {
        const fn = l.functions?.function_name || "Unknown";
        const prev = funcAgg.get(fn) || { units: 0, entries: 0 };
        funcAgg.set(fn, { units: prev.units + Number(l.count || 0), entries: prev.entries + 1 });
      });
      const topFunctions = [...funcAgg.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.units - a.units)
        .slice(0, 5);
      const topMax = Math.max(1, ...topFunctions.map((x) => x.units));

      const dailyAgg = new Map<string, number>();
      filteredLogs.forEach((l: any) => {
        const d = l.log_date || "—";
        dailyAgg.set(d, (dailyAgg.get(d) || 0) + Number(l.count || 0));
      });
      const lastDays = [...dailyAgg.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-4)
        .map(([date, units]) => ({ date, units }));
      const dayMax = Math.max(1, ...lastDays.map((x) => x.units));

      const scaleBuckets = {
        low: filteredLogs.filter((l: any) => Number(l.scale || 0) < 50).length,
        mid: filteredLogs.filter((l: any) => Number(l.scale || 0) >= 50 && Number(l.scale || 0) < 70).length,
        good: filteredLogs.filter((l: any) => Number(l.scale || 0) >= 70 && Number(l.scale || 0) < 90).length,
        top: filteredLogs.filter((l: any) => Number(l.scale || 0) >= 90).length,
      };
      const bucketTotal = Math.max(1, filteredLogs.length);

      const strategicText =
        overallPerformance >= 90
          ? "Performance is consistently exceeding targets. Maintain focus on high-impact functions and replicate today’s working patterns across similar tasks."
          : overallPerformance >= 70
            ? "Performance is on track. Improve consistency by prioritizing top functions and reducing variance in daily output."
            : overallPerformance >= 50
              ? "Performance is mixed. Focus on closing gaps vs targets, especially on the highest-volume functions, and review blockers."
              : "Performance needs attention. Review target alignment, task selection, and execution issues; prioritize quick wins to lift baseline output.";

      // Create single-page performance slip content (dark report style)
      const slipContent = `
        <style>
          @page { size: A4; margin: 12mm; }
          body { margin: 0; background: #0b0f14; color: #e5e7eb; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
          .page { background: #0b0f14; border-radius: 14px; padding: 22px; border: 1px solid rgba(255,255,255,.08); }
          .hdr { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; margin-bottom: 14px; }
          .title { font-size: 44px; line-height: 1; font-weight: 800; letter-spacing: -0.02em; color: #ffffff; }
          .title .accent { color: ${statusAccent}; display:block; margin-top: 4px; }
          .meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
          .chip { border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.08); padding: 6px 10px; border-radius: 999px; font-size: 11px; color: rgba(229,231,235,.95); }
          .sub { margin-top: 6px; font-size: 12px; color: rgba(229,231,235,.7); }
          .grid { display:grid; grid-template-columns: 1.05fr .95fr; gap: 14px; }
          .card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.10); border-radius: 14px; padding: 14px; }
          .card h3 { margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: rgba(229,231,235,.92); }
          .kpis { display:grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 10px 0 14px; }
          .kpi { background: rgba(0,0,0,.25); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 10px; }
          .kpi .lbl { font-size: 10px; color: rgba(229,231,235,.72); }
          .kpi .val { margin-top: 6px; font-size: 18px; font-weight: 800; color: #ffffff; }
          .kpi .hint { margin-top: 3px; font-size: 10px; color: rgba(229,231,235,.55); }
          .barRow { display:flex; align-items:center; gap: 10px; margin: 8px 0; }
          .barName { width: 170px; font-size: 11px; color: rgba(229,231,235,.90); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .bar { flex: 1; height: 12px; background: rgba(255,255,255,.07); border-radius: 999px; overflow:hidden; border: 1px solid rgba(255,255,255,.08); }
          .bar > div { height:100%; background: ${statusAccent}; border-radius: 999px; width: 0; }
          .barVal { width: 58px; text-align:right; font-size: 11px; color: rgba(229,231,235,.85); font-variant-numeric: tabular-nums; }
          .miniGrid { display:grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .donut { width: 90px; height: 90px; border-radius: 999px; display:flex; align-items:center; justify-content:center; margin: 0 auto; background: conic-gradient(${statusAccent} var(--p), rgba(255,255,255,.08) 0); border: 1px solid rgba(255,255,255,.10); }
          .donut > div { width: 64px; height: 64px; border-radius: 999px; background: #0b0f14; border: 1px solid rgba(255,255,255,.10); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size: 14px; }
          .miniLbl { margin-top: 8px; text-align:center; font-size: 11px; color: rgba(229,231,235,.75); }
          .chart { display:flex; align-items:flex-end; gap: 10px; height: 130px; padding: 6px 4px 0; }
          .col { flex: 1; display:flex; flex-direction:column; align-items:center; gap: 6px; }
          .colBar { width: 100%; background: ${statusAccent}; border-radius: 8px 8px 6px 6px; box-shadow: 0 10px 28px rgba(0,0,0,.35); border: 1px solid rgba(255,255,255,.10); }
          .colLbl { font-size: 10px; color: rgba(229,231,235,.85); }
          .colVal { font-size: 11px; font-weight: 800; color:#fff; }
          .summaryBox { background: rgba(0,0,0,.25); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 12px; }
          .summaryTitle { font-size: 20px; font-weight: 900; color:#ffffff; letter-spacing:-0.02em; }
          .summaryTitle .accent { color: ${statusAccent}; }
          .summaryText { margin-top: 8px; font-size: 12px; line-height: 1.45; color: rgba(229,231,235,.90); }
          .foot { margin-top: 12px; font-size: 10px; color: rgba(229,231,235,.50); }
          @media print {
            body {
              background: #0b0f14 !important;
              color: #e5e7eb !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page {
              background: #0b0f14 !important;
              border-color: rgba(255,255,255,.12) !important;
            }
            .kpi, .card, .summaryBox, .chip, .bar, .donut > div {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>

        <div class="page">
          <div class="hdr">
            <div>
              <div class="title">Performance<span class="accent">Slip</span></div>
              <div class="sub">
                ${selectedEmployeeName} • ${minDate.toLocaleDateString()} → ${maxDate.toLocaleDateString()} • ${dateRangeText}${searchTerm ? ` • Search: "${searchTerm}"` : ""}
              </div>
            </div>
            <div class="meta">
              <span class="chip">Status: <b style="color:${statusAccent}">${statusLabel}</b></span>
              <span class="chip">Performance: <b>${overallPerformance}%</b></span>
              <span class="chip">Generated: ${new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div class="kpis">
            <div class="kpi"><div class="lbl">Records</div><div class="val">${filteredLogs.length}</div><div class="hint">filtered entries</div></div>
            <div class="kpi"><div class="lbl">Units</div><div class="val">${totalTasks}</div><div class="hint">completed</div></div>
            <div class="kpi"><div class="lbl">Targets</div><div class="val">${totalTargets}</div><div class="hint">in data</div></div>
            <div class="kpi"><div class="lbl">Avg scale</div><div class="val">${avgScale}%</div><div class="hint">effort rating</div></div>
          </div>

          <div class="grid">
            <div class="card">
              <h3>Performance by functions</h3>
              ${topFunctions
                .map(
                  (f) => `
                    <div class="barRow">
                      <div class="barName">${f.name}</div>
                      <div class="bar"><div style="width:${Math.round((f.units / topMax) * 100)}%"></div></div>
                      <div class="barVal">${f.units}</div>
                    </div>
                  `
                )
                .join("")}
              <div class="foot">Top functions by units (single page view)</div>
            </div>

            <div class="card">
              <h3>Daily output (last days)</h3>
              <div class="chart">
                ${lastDays
                  .map(
                    (d) => `
                      <div class="col">
                        <div class="colVal">${d.units}</div>
                        <div class="colBar" style="height:${Math.max(10, Math.round((d.units / dayMax) * 110))}px"></div>
                        <div class="colLbl">${d.date.slice(5)}</div>
                      </div>
                    `
                  )
                  .join("")}
              </div>

              <div class="summaryBox" style="margin-top:12px;">
                <div class="summaryTitle">Strategic <span class="accent">Summary</span></div>
                <div class="summaryText">${strategicText}</div>
              </div>
            </div>

            <div class="card">
              <h3>Scale distribution</h3>
              <div class="miniGrid">
                ${[
                  { k: "low", label: "0–49", v: scaleBuckets.low, c: "#ef4444" },
                  { k: "mid", label: "50–69", v: scaleBuckets.mid, c: "#60a5fa" },
                  { k: "good", label: "70–89", v: scaleBuckets.good, c: "#f59e0b" },
                  { k: "top", label: "90–100", v: scaleBuckets.top, c: "#22c55e" },
                ]
                  .map((b) => {
                    const pct = Math.round((b.v / bucketTotal) * 100);
                    return `
                      <div class="card" style="padding:10px; border-radius:12px; background: rgba(0,0,0,.22);">
                        <div class="donut" style="--p:${pct}%; background: conic-gradient(${b.c} var(--p), rgba(255,255,255,.08) 0);">
                          <div>${pct}%</div>
                        </div>
                        <div class="miniLbl">${b.label} • ${b.v}</div>
                      </div>
                    `;
                  })
                  .join("")}
              </div>
              <div class="foot">Based on scale values in filtered logs</div>
            </div>

            <div class="card">
              <h3>Selected scope</h3>
              <div style="display:grid; grid-template-columns: 1fr; gap: 8px;">
                <div class="summaryBox">
                  <div style="font-size:12px; font-weight:800; color:#fff;">Employee</div>
                  <div class="summaryText" style="margin-top:4px;">${selectedEmployeeName}</div>
                </div>
                <div class="summaryBox">
                  <div style="font-size:12px; font-weight:800; color:#fff;">Period</div>
                  <div class="summaryText" style="margin-top:4px;">${dateRangeText}</div>
                </div>
                <div class="summaryBox">
                  <div style="font-size:12px; font-weight:800; color:#fff;">Search</div>
                  <div class="summaryText" style="margin-top:4px;">${searchTerm ? `"${searchTerm}"` : "None"}</div>
                </div>
              </div>
              <div class="foot">Generated by KPI Time Tracking Tool</div>
            </div>
          </div>
        </div>
      `;

      // Generate filename with current date and filter context
      const currentDate = new Date().toISOString().split('T')[0];
      const employeeSuffix = selectedEmployee !== "all" ? `_${employees?.find(e => e.id === selectedEmployee)?.name || 'Employee'}` : '';
      const fileName = `Performance_Slip_${dateRangeText.replace(/\s+/g, '_')}${employeeSuffix}_${currentDate}`;
      
      // Open preview first; user can download/print from toolbar.
      openReportPreview(slipContent, fileName);
      
      toast.success(`Performance slip PDF generated for ${selectedEmployeeName} with ${filteredLogs.length} filtered records`);
    } catch (error) {
      console.error('Performance slip error:', error);
      toast.error('Failed to generate performance slip PDF');
    }
  };

  // Group by employee for summary
  const employeeSummary = logs?.reduce((acc, log) => {
    const empId = log.employee_id;
    if (!acc[empId]) {
      acc[empId] = {
        name: log.employees?.name || "Unknown",
        profilePhotoUrl: (log.employees as any)?.profile_photo_url || null,
        departmentId: (log.employees as any)?.department_id,
        roleId: (log.employees as any)?.role_id,
        totalEntries: 0,
        totalUnits: 0,
        avgScale: 0,
        scales: [],
      };
    }
    acc[empId].totalEntries++;
    acc[empId].totalUnits += log.count;
    acc[empId].scales.push(log.scale);
    acc[empId].avgScale = Math.round(acc[empId].scales.reduce((a, b) => a + b, 0) / acc[empId].scales.length);
    return acc;
  }, {} as Record<string, { name: string; profilePhotoUrl?: string | null; departmentId: string; roleId: string; totalEntries: number; totalUnits: number; avgScale: number; scales: number[] }>);

  const showAdminWorkSummary = adminReportSection === "work_summary";
  /** Hide summary rows while drilling into one employee so only that person's task list shows. */
  const showAdminEmployeeSummary =
    isAdmin() && adminReportSection === "task_logs" && adminWorkloadTaskLogsMode !== "single_employee";
  const showFiltersAndTaskLogsTable =
    adminReportSection === "task_logs" &&
    (!isAdmin() ||
      isManagingAsEmployee ||
      adminWorkloadTaskLogsMode !== "summary_only");

  const showAdminTaskLogsDateToolbar =
    isAdmin() && adminReportSection === "task_logs" && adminWorkloadTaskLogsMode !== "summary_only";

  return (
    <div className="space-y-6 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        {/* Left - Back Button */}
        <div className="flex-1 flex justify-start">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 transition-all shadow-md shadow-purple-200 font-medium text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        {/* Center - Title */}
        <div className="flex-none text-center px-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center shadow-lg shadow-orange-200">
              <FileBarChart className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Work Load Report</h1>
          </div>
          <p className="text-gray-500 text-sm">View and analyze task logs and work load data</p>
        </div>

        {/* Right - Action Buttons */}
        <div className="flex flex-1 justify-end items-center gap-3">
          <Button
            onClick={exportToExcel}
            disabled={!logs || logs.length === 0 || isEmployee() || employeePreviewReadOnly}
            className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-md"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button
            onClick={generatePerformanceSlip}
            disabled={!logs || logs.length === 0 || isEmployee() || employeePreviewReadOnly}
            className="bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 text-white shadow-md"
          >
            <FileText className="h-4 w-4 mr-2" />
            Performance Slip
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-2xl p-5 border border-violet-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-lg bg-violet-500 flex items-center justify-center">
              <FileBarChart className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium text-violet-700">Total Entries</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalEntries}</p>
          <p className="text-xs text-violet-600 mt-1">In selected period</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-5 border border-emerald-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium text-emerald-700">Today's Entries</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{todayEntries}</p>
          <p className="text-xs text-emerald-600 mt-1">Logged today</p>
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-2xl p-5 border border-cyan-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-lg bg-cyan-500 flex items-center justify-center">
              <Target className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium text-cyan-700">Total Units</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalUnits.toLocaleString()}</p>
          <p className="text-xs text-cyan-600 mt-1">Work units completed</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-5 border border-amber-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium text-amber-700">Avg Scale</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{avgScale}%</p>
          <p className="text-xs text-amber-600 mt-1">Average effort scale</p>
        </div>
      </div>

      {/* Admin/Employee: switch between Task logs area and Work summary */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white rounded-xl border border-gray-200 shadow-sm w-fit">
          <button
              type="button"
              disabled={employeePreviewReadOnly}
              onClick={() => {
                const fromWorkSummary = adminReportSection === "work_summary";
                setAdminReportSection("task_logs");
                if (fromWorkSummary && isAdmin() && !isManagingAsEmployee) {
                  setSelectedEmployee("all");
                  setAdminWorkloadTaskLogsMode("summary_only");
                }
              }}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                adminReportSection === "task_logs"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <ListChecks className="h-4 w-4 shrink-0" />
              Task logs
            </button>
            <button
              type="button"
              disabled={employeePreviewReadOnly}
              onClick={() => setAdminReportSection("work_summary")}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                adminReportSection === "work_summary"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              End of Work Summary
            </button>
          </div>
        </div>

      {/* Work summary — admin placeholder (extend here later) */}
      {showAdminWorkSummary && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-amber-500" />
                  Work Summaries
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Showing end-of-day summaries for{" "}
                  <span className="font-medium text-gray-700">
                    {derivedDateRangeString}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!isEmployee() && (
                  <>
                    <Select value={summaryDeptFilter} onValueChange={setSummaryDeptFilter} disabled={employeePreviewReadOnly}>
                      <SelectTrigger className="h-9 w-36 text-xs bg-white border-gray-200">
                        <Building2 className="h-3.5 w-3.5 text-gray-400 mr-1" />
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Depts</SelectItem>
                        {departments?.map((dept: any) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={summaryRoleFilter} onValueChange={setSummaryRoleFilter} disabled={employeePreviewReadOnly}>
                      <SelectTrigger className="h-9 w-36 text-xs bg-white border-gray-200">
                        <Briefcase className="h-3.5 w-3.5 text-gray-400 mr-1" />
                        <SelectValue placeholder={summaryDeptFilter !== "all" ? "Select Role" : "All Roles"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{summaryDeptFilter !== "all" ? "All Roles in Dept" : "All Roles"}</SelectItem>
                        {roles
                          ?.filter((role: any) => summaryDeptFilter === "all" || role.department_id === summaryDeptFilter)
                          ?.map((role: any) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.role_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    <Select value={summaryEmpFilter} onValueChange={setSummaryEmpFilter} disabled={employeePreviewReadOnly}>
                      <SelectTrigger className="h-9 w-36 text-xs bg-white border-gray-200">
                        <Users className="h-3.5 w-3.5 text-gray-400 mr-1" />
                        <SelectValue placeholder={summaryDeptFilter !== "all" || summaryRoleFilter !== "all" ? "Select Emp" : "All Employees"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{summaryDeptFilter !== "all" || summaryRoleFilter !== "all" ? "All in Filter" : "All Employees"}</SelectItem>
                        {employees
                          ?.filter((emp: any) => summaryDeptFilter === "all" || emp.department_id === summaryDeptFilter)
                          ?.filter((emp: any) => summaryRoleFilter === "all" || emp.role_id === summaryRoleFilter)
                          ?.map((emp: any) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    <div className="w-px h-6 bg-gray-200 mx-1 hidden lg:block"></div>
                  </>
                )}
                
                {isAdmin() && (
                  <Select value={selectedDateRange} onValueChange={setSelectedDateRange} disabled={employeePreviewReadOnly}>
                    <SelectTrigger className="h-9 w-[9.5rem] text-xs bg-white border-gray-200">
                      <Calendar className="h-3.5 w-3.5 text-gray-400 mr-1 shrink-0" />
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Specific Day</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="7">Last 7 Days</SelectItem>
                      <SelectItem value="15">Last 15 Days</SelectItem>
                      <SelectItem value="30">Last 30 Days</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <div className="w-px h-6 bg-gray-200 mx-1"></div>
                <button
                  type="button"
                  disabled={employeePreviewReadOnly}
                  onClick={() => {
                    setSelectedDateRange("daily");
                    setCurrentDate((prev) => {
                      const d = new Date(prev);
                      d.setDate(d.getDate() - 1);
                      return d;
                    });
                  }}
                  className="h-9 w-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <ArrowLeft className="h-4 w-4 text-gray-600" />
                </button>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {currentDate.toLocaleDateString("en-GB").replace(/\//g, "-")}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={employeePreviewReadOnly}
                  onClick={() => {
                    setSelectedDateRange("daily");
                    setCurrentDate((prev) => {
                      const d = new Date(prev);
                      d.setDate(d.getDate() + 1);
                      return d;
                    });
                  }}
                  className="h-9 w-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <ArrowLeft className="h-4 w-4 text-gray-600 rotate-180" />
                </button>
                <button
                  type="button"
                  disabled={employeePreviewReadOnly}
                  onClick={() => {
                    setSelectedDateRange("daily");
                    setCurrentDate(new Date());
                  }}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  Today
                </button>
              </div>
            </div>
          </div>

          {workSummariesLoading ? (
            <div className="px-6 py-12 text-center text-gray-400">Loading work summaries...</div>
          ) : !workSummaries || workSummaries.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 text-sm">
              No work summaries found for this date range and filters.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto scrollbar-hide">
              {workSummaries.map((row: any) => (
                <div key={row.id} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <EmployeeAvatarWithPreview
                      name={row.employees?.name || "—"}
                      imageUrl={row.employees?.profile_photo_url}
                      className="h-12 w-12 rounded-xl shrink-0"
                      textClassName="text-sm font-bold"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="font-semibold text-gray-900 truncate">{row.employees?.name || "—"}</p>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-600">
                          {row.employees?.roles?.role_name || "Role"}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-600">
                          {row.employees?.departments?.name || "Department"}
                        </span>
                      </div>
                      <div className="mt-2 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700 whitespace-pre-line">
                        {row.summary?.trim() || "No summary provided"}
                      </div>
                      <div className="mt-2 text-xs text-gray-400">
                        {selectedDateRange !== "daily" && (
                          <span className="font-semibold text-gray-600 mr-2">
                            For {row.work_date}
                          </span>
                        )}
                        Saved at{" "}
                        {row.created_at
                          ? new Date(row.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Employee Summary — header always visible so date/filters work even when the day has no logs */}
      {showAdminEmployeeSummary && (
        <div className="bg-gradient-to-br from-slate-50/80 to-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Line 1: title + filters · Line 2: helper copy + date + actions */}
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-white/80 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <Users className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-bold text-gray-900">Employee Summary</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Select value={summaryDeptFilter} onValueChange={setSummaryDeptFilter} disabled={employeePreviewReadOnly}>
                  <SelectTrigger className="h-9 w-[9.5rem] text-xs bg-white border-gray-200">
                    <Building2 className="h-3.5 w-3.5 text-gray-400 mr-1 shrink-0" />
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Depts</SelectItem>
                    {departments?.map((dept: any) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={summaryRoleFilter} onValueChange={setSummaryRoleFilter} disabled={employeePreviewReadOnly}>
                  <SelectTrigger className="h-9 w-[9.5rem] text-xs bg-white border-gray-200">
                    <Briefcase className="h-3.5 w-3.5 text-gray-400 mr-1 shrink-0" />
                    <SelectValue placeholder={summaryDeptFilter !== "all" ? "Select Role" : "All Roles"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{summaryDeptFilter !== "all" ? "All Roles in Dept" : "All Roles"}</SelectItem>
                    {roles
                      ?.filter((role: any) => summaryDeptFilter === "all" || role.department_id === summaryDeptFilter)
                      ?.map((role: any) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.role_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={summaryEmpFilter} onValueChange={setSummaryEmpFilter} disabled={employeePreviewReadOnly}>
                  <SelectTrigger className="h-9 w-[9.5rem] text-xs bg-white border-gray-200">
                    <Users className="h-3.5 w-3.5 text-gray-400 mr-1 shrink-0" />
                    <SelectValue
                      placeholder={
                        summaryDeptFilter !== "all" || summaryRoleFilter !== "all" ? "Select Emp" : "All Employees"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {summaryDeptFilter !== "all" || summaryRoleFilter !== "all" ? "All in Filter" : "All Employees"}
                    </SelectItem>
                    {employees
                      ?.filter((emp: any) => summaryDeptFilter === "all" || emp.department_id === summaryDeptFilter)
                      ?.filter((emp: any) => summaryRoleFilter === "all" || emp.role_id === summaryRoleFilter)
                      ?.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <div className="w-px h-6 bg-gray-200 mx-1 hidden lg:block"></div>

                <Select value={selectedDateRange} onValueChange={setSelectedDateRange} disabled={employeePreviewReadOnly}>
                  <SelectTrigger className="h-9 w-[9.5rem] text-xs bg-white border-gray-200">
                    <Calendar className="h-3.5 w-3.5 text-gray-400 mr-1 shrink-0" />
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    {isAdmin() && <SelectItem value="daily">Specific Day</SelectItem>}
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="7">Last 7 Days</SelectItem>
                    <SelectItem value="15">Last 15 Days</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
              <div className="min-w-0 space-y-1.5 lg:max-w-3xl">
                <p className="text-sm text-gray-500">
                  Showing data for:{" "}
                  <span className="font-medium text-gray-800">
                    {derivedDateRangeString}
                  </span>
                  {(summaryDeptFilter !== "all" || summaryRoleFilter !== "all" || summaryEmpFilter !== "all") && (
                    <span className="text-violet-600">
                      {summaryDeptFilter !== "all" &&
                        ` • ${departments?.find((d: any) => d.id === summaryDeptFilter)?.name || "Dept"}`}
                      {summaryRoleFilter !== "all" &&
                        ` • ${roles?.find((r: any) => r.id === summaryRoleFilter)?.role_name || "Role"}`}
                      {summaryEmpFilter !== "all" &&
                        ` • ${employees?.find((e: any) => e.id === summaryEmpFilter)?.name || "Employee"}`}
                    </span>
                  )}
                </p>
                {!isManagingAsEmployee && adminWorkloadTaskLogsMode === "summary_only" && (
                  <p className="text-sm font-medium text-violet-800">
                    Click a colored card below to open{" "}
                    <span className="font-semibold">that employee&apos;s task logs</span> for the selected day.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:shrink-0">
                <button
                  type="button"
                  disabled={employeePreviewReadOnly}
                  onClick={() => {
                    setSelectedDateRange("daily");
                    setCurrentDate((prev) => {
                      const d = new Date(prev);
                      d.setDate(d.getDate() - 1);
                      return d;
                    });
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 transition-colors hover:bg-gray-200 disabled:pointer-events-none disabled:opacity-50"
                  aria-label="Previous day"
                >
                  <ArrowLeft className="h-4 w-4 text-gray-600" />
                </button>
                <div className="flex h-9 min-w-[10.5rem] items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 sm:min-w-[11.5rem]">
                  <Calendar className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                  <input
                    type="date"
                    value={workSummaryDate}
                    disabled={employeePreviewReadOnly}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return;
                      const [y, m, d] = v.split("-").map(Number);
                      setSelectedDateRange("daily");
                      setCurrentDate(new Date(y, m - 1, d));
                    }}
                    className="h-8 min-w-0 flex-1 cursor-pointer bg-transparent text-sm font-medium text-gray-800 tabular-nums outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Select date"
                  />
                </div>
                <button
                  type="button"
                  disabled={employeePreviewReadOnly}
                  onClick={() => {
                    setSelectedDateRange("daily");
                    setCurrentDate((prev) => {
                      const d = new Date(prev);
                      d.setDate(d.getDate() + 1);
                      return d;
                    });
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 transition-colors hover:bg-gray-200 disabled:pointer-events-none disabled:opacity-50"
                  aria-label="Next day"
                >
                  <ArrowLeft className="h-4 w-4 rotate-180 text-gray-600" />
                </button>
                <Button
                  type="button"
                  size="sm"
                  disabled={employeePreviewReadOnly}
                  onClick={() => {
                    setSelectedDateRange("daily");
                    setCurrentDate(new Date());
                  }}
                  className="h-9 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm hover:from-violet-700 hover:to-indigo-700"
                >
                  Today
                </Button>
                {!isManagingAsEmployee && adminWorkloadTaskLogsMode === "summary_only" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={employeePreviewReadOnly}
                    onClick={showAllEmployeesTaskLogs}
                    className="h-9 border-violet-300 bg-violet-50/80 text-violet-900 shadow-sm hover:bg-violet-100 hover:text-violet-950"
                  >
                    <ListChecks className="h-4 w-4 text-violet-700" />
                    All employees&apos; logs
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-gray-400">Loading employee summary…</div>
            ) : !employeeSummary || Object.keys(employeeSummary).length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-12 text-center">
                <p className="font-medium text-gray-800">No task logs for this calendar day</p>
                <p className="mt-2 text-sm text-gray-500">
                  The summary only includes work logged on the date shown above. Try another day, set filters to All, or
                  confirm employees have submitted task logs for that day.
                </p>
              </div>
            ) : (() => {
                const rows = Object.entries(employeeSummary).filter(([empId, summary]: [string, any]) => {
                  const matchesDept = summaryDeptFilter === "all" || summary.departmentId === summaryDeptFilter;
                  const matchesRole = summaryRoleFilter === "all" || summary.roleId === summaryRoleFilter;
                  const matchesEmp = summaryEmpFilter === "all" || empId === summaryEmpFilter;
                  return matchesDept && matchesRole && matchesEmp;
                });
                if (rows.length === 0) {
                  return (
                    <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-10 text-center">
                      <p className="font-medium text-amber-950">No employees match these filters</p>
                      <p className="mt-2 text-sm text-amber-900/80">
                        There are task logs on this day, but none for the department, role, or person selected. Try setting
                        filters to All or choose a different combination.
                      </p>
                    </div>
                  );
                }
                return rows.map(([empId, summary], index) => (
                  <button
                    key={empId}
                    type="button"
                    title="View task logs for this employee"
                    onClick={() => drillDownEmployeeToTaskLogs(empId)}
                    disabled={employeePreviewReadOnly}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-xl p-4 text-left shadow-sm transition-all duration-150",
                      EMPLOYEE_SUMMARY_CARD_THEMES[index % EMPLOYEE_SUMMARY_CARD_THEMES.length],
                      employeePreviewReadOnly
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:shadow-md active:scale-[0.99]"
                    )}
                  >
                    <EmployeeAvatarWithPreview
                      name={summary.name}
                      imageUrl={summary.profilePhotoUrl}
                      className="h-12 w-12 rounded-xl shrink-0 ring-2 ring-white/80 shadow-sm"
                      textClassName="text-sm font-bold"
                      previewOnClick={false}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{summary.name}</p>
                      <p className="text-sm text-gray-600">{summary.totalEntries} entries</p>
                      {!employeePreviewReadOnly && (
                        <p className="text-xs text-gray-700 mt-1 font-medium">Open task logs for this person</p>
                      )}
                    </div>
                    <div className="flex items-center gap-6 sm:gap-8 text-right shrink-0">
                      <div>
                        <p className="text-lg font-bold text-gray-900 tabular-nums">
                          {summary.totalUnits.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600">units</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900 tabular-nums">{summary.avgScale}%</p>
                        <p className="text-xs text-gray-600">avg scale</p>
                      </div>
                    </div>
                  </button>
                ));
              })()
            }
          </div>
        </div>
      )}

      {/* Task log entry list (hidden for admin until an employee is chosen or Task logs tab shows all) */}
      {showFiltersAndTaskLogsTable && (
      <>
      <div ref={taskLogsFiltersAnchorRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-24">
        <div className="border-b border-gray-100 px-6 py-4">
          {showAdminTaskLogsDateToolbar ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {adminWorkloadTaskLogsMode === "single_employee" && (
                    <button
                      type="button"
                      onClick={backToEmployeeSummaryFromTaskLogs}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-800 transition-colors hover:bg-violet-100"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to employee summary
                    </button>
                  )}
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 shrink-0 text-violet-500" />
                    Task Logs
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <button
                    type="button"
                    disabled={employeePreviewReadOnly}
                    onClick={() => {
                      setSelectedDateRange("daily");
                      setCurrentDate((prev) => {
                        const d = new Date(prev);
                        d.setDate(d.getDate() - 1);
                        return d;
                      });
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 transition-colors hover:bg-gray-200 disabled:pointer-events-none disabled:opacity-50"
                    aria-label="Previous day"
                  >
                    <ArrowLeft className="h-4 w-4 text-gray-600" />
                  </button>
                  <div className="flex h-9 min-w-[10.5rem] items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 sm:min-w-[11.5rem]">
                    <Calendar className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                    <input
                      type="date"
                      value={workSummaryDate}
                      disabled={employeePreviewReadOnly}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        const [y, m, d] = v.split("-").map(Number);
                        setSelectedDateRange("daily");
                        setCurrentDate(new Date(y, m - 1, d));
                      }}
                      className="h-8 min-w-0 flex-1 cursor-pointer bg-transparent text-sm font-medium text-gray-800 tabular-nums outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Select date for task logs"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={employeePreviewReadOnly}
                    onClick={() => {
                      setSelectedDateRange("daily");
                      setCurrentDate((prev) => {
                        const d = new Date(prev);
                        d.setDate(d.getDate() + 1);
                        return d;
                      });
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 transition-colors hover:bg-gray-200 disabled:pointer-events-none disabled:opacity-50"
                    aria-label="Next day"
                  >
                    <ArrowLeft className="h-4 w-4 rotate-180 text-gray-600" />
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={employeePreviewReadOnly}
                    onClick={() => {
                      setSelectedDateRange("daily");
                      setCurrentDate(new Date());
                    }}
                    className="h-9 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm hover:from-violet-700 hover:to-indigo-700"
                  >
                    Today
                  </Button>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 tabular-nums">
                    {filteredLogs?.length ?? 0} entries
                  </span>
                </div>
              </div>
              <div className="border-t border-gray-50 pt-3">
                {adminWorkloadTaskLogsMode === "single_employee" && selectedEmployee !== "all" && (
                  <div className="space-y-1.5">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">
                        {employees?.find((e) => e.id === selectedEmployee)?.name ?? "This employee"}
                      </span>
                      <span className="font-normal text-gray-500">
                        {" "}
                        · Task logs for{" "}
                        <time dateTime={workSummaryDate}>
                          {currentDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </time>
                      </span>
                    </p>
                    <p className="text-xs font-medium leading-relaxed text-violet-800">
                      Use the date controls above to switch days. Return to the employee summary to choose another person
                      or open the full list.
                    </p>
                  </div>
                )}
                {adminWorkloadTaskLogsMode === "all_employees" && (
                  <div className="space-y-1.5">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">All employees</span>
                      <span className="font-normal text-gray-500">
                        {" "}
                        ·{" "}
                        <time dateTime={workSummaryDate}>
                          {currentDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </time>
                      </span>
                    </p>
                    <p className="text-xs font-medium leading-relaxed text-violet-800">
                      Showing every task log for the selected day. Adjust the date above or go back to the summary to
                      focus on one employee.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {isAdmin() && adminWorkloadTaskLogsMode === "single_employee" && (
                    <button
                      type="button"
                      onClick={backToEmployeeSummaryFromTaskLogs}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800 transition-colors hover:bg-violet-100"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to employee summary
                    </button>
                  )}
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 shrink-0 text-violet-500" />
                    Task Logs
                  </h2>
                </div>
                {isAdmin() && adminWorkloadTaskLogsMode === "single_employee" && selectedEmployee !== "all" && (
                  <p className="mt-1 text-xs font-medium text-violet-700">
                    Tasks for{" "}
                    {employees?.find((e) => e.id === selectedEmployee)?.name ?? "this employee"} (current date range)
                  </p>
                )}
                {isAdmin() && adminWorkloadTaskLogsMode === "all_employees" && (
                  <p className="mt-1 text-xs font-medium text-slate-600">All employees · current date range</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {(!isAdmin() || isManagingAsEmployee) && (
                  <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                    <SelectTrigger className="h-8 w-[140px] text-xs bg-white border-gray-200">
                      <Calendar className="h-3.5 w-3.5 text-gray-400 mr-1 shrink-0" />
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="7">Last 7 Days</SelectItem>
                      <SelectItem value="15">Last 15 Days</SelectItem>
                      <SelectItem value="30">Last 30 Days</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <span className="shrink-0 text-xs text-gray-400">{filteredLogs?.length || 0} entries</span>
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : filteredLogs?.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No task logs found</p>
            <p className="text-sm text-gray-400 mt-1">
              {showAdminTaskLogsDateToolbar
                ? "Try another day using the date controls in the header, or go back to the employee summary."
                : "Try a different date range or pick another employee from the summary above."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide max-h-[500px] overflow-y-auto">
            <div className="divide-y divide-gray-100 min-w-[800px]">
              {filteredLogs?.map((log) => {
                const target = log.functions?.target_value || 0;
                const pct = target > 0 ? Math.round((log.count / target) * 100) : 0;
                return (
                  <div 
                    key={log.id} 
                    className="group relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 transition-all duration-300 hover:bg-slate-50/80 border-b border-gray-100 last:border-0"
                  >
                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    <div className="flex items-center gap-4 flex-1 min-w-0 relative">
                      <div className="relative">
                        <EmployeeAvatarWithPreview
                          name={log.employees?.name}
                          imageUrl={log.employees?.profile_photo_url}
                          className="h-12 w-12 rounded-2xl shrink-0 shadow-sm ring-2 ring-white transition-transform group-hover:scale-105"
                          textClassName="text-sm font-bold"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
                          <span className="font-bold text-gray-900 group-hover:text-violet-700 transition-colors">{log.employees?.name}</span>
                          <span className="text-xs text-gray-300">•</span>
                          <span className="text-[13px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100/50">
                            {log.functions?.function_name}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                            <div className="w-5 h-5 rounded-md bg-gray-50 flex items-center justify-center">
                              <Calendar className="h-3 w-3 text-gray-400" />
                            </div>
                            <time dateTime={log.log_date}>{formatLogDateLabel(log.log_date)}</time>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                            <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center">
                              <TrendingUp className="h-3 w-3 text-amber-500" />
                            </div>
                            Scale: <span className="text-amber-600 font-bold">{log.scale}%</span>
                          </div>

                          {log.project_client && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                              <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center">
                                <Briefcase className="h-3 w-3 text-blue-500" />
                              </div>
                              <span className="max-w-[120px] truncate">{log.project_client}</span>
                            </div>
                          )}

                          {log.module_handle && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                              <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center">
                                <Target className="h-3 w-3 text-emerald-500" />
                              </div>
                              <span className="max-w-[150px] truncate">{log.module_handle}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 sm:gap-10 shrink-0 relative">
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2 mb-2">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Performance</span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-black text-gray-900 leading-none">{pct}%</span>
                              <span className="text-[10px] font-bold text-gray-400">of goal</span>
                            </div>
                          </div>
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border",
                            pct >= 90 ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                            pct >= 70 ? "bg-amber-50 border-amber-100 text-amber-600" :
                            "bg-red-50 border-red-100 text-red-600"
                          )}>
                            <TrendingUp className={cn("h-5 w-5", pct < 70 && "rotate-90")} />
                          </div>
                        </div>
                        
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3 px-0.5">
                            <span className="text-[11px] font-black font-mono text-gray-500">{log.count || 0} / {target}</span>
                            <span className={cn("text-[11px] font-black", perfColor(log.count || 0, target))}>
                              {pct >= 100 ? "COMPLETED" : "IN PROGRESS"}
                            </span>
                          </div>
                          <div className="w-32 h-2 rounded-full bg-gray-100 overflow-hidden border border-gray-100/50">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-700 ease-out", perfBg(log.count || 0, target))} 
                              style={{ width: `${Math.min(pct, 100)}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
              );
            })}
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
