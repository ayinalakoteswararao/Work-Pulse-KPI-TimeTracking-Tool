import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import WorkSessionControl from "@/components/WorkSessionControl";
import { useWorkSession } from "@/hooks/useWorkSession";
import DailyMetrics from "@/components/DailyMetrics";
import TimeManagementSheet from "@/components/TimeManagementSheet";
import KPIUpdateDialog from "@/components/KPIUpdateDialog";
import SalarySummaryCard from "@/components/SalarySummaryCard";
import LeaveRequestDialog from "@/components/LeaveRequestDialog";
import { 
  Plus, 
  Trash2, 
  Send, 
  Clock, 
  Calendar,
  Target,
  TrendingUp,
  Users,
  CheckCircle2,
  Timer,
  FileText,
  Eye,
  Activity,
  BarChart3,
  Zap,
  Sparkles,
  Award,
  Flame,
  Briefcase,
  User,
  History,
  ChevronRight,
  Star,
  ChevronLeft,
  Play,
  Coffee,
  RotateCcw,
  Square,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  Utensils,
  X,
  Download,
  Building2,
  Layers,
  Hash,
  Palmtree,
  IndianRupee,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import EmployeeAvatarWithPreview from "@/components/EmployeeAvatarWithPreview";
import { format, startOfWeek, endOfWeek, isWithinInterval, subDays } from "date-fns";

interface TaskLog {
  id: string;
  employee_id: string;
  function_id: string;
  count: number;
  scale: number;
  log_date: string;
  employees?: { 
    name: string; 
    department_id?: string;
    profile_photo_url?: string | null;
    roles?: {
      departments?: {
        name?: string;
        companies?: {
          name?: string;
        };
      };
    };
    monthly_salary?: number | null;
    working_days?: number | null;
    standard_hours_per_day?: number | null;
  };
  functions?: { function_name: string; target_value: number };
  project_client?: string;
  module_handle?: string;
}

interface WorkSummary {
  id: string;
  employee_id: string;
  user_id: string;
  summary?: string;
  date: string;
  created_at: string;
  start_time?: string;
  end_time?: string;
  total_hours?: number;
  status: string;
  employees?: { name: string; email: string; profile_photo_url?: string | null };
}

export default function TimesheetManagementPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { user, userRole, isAdmin, isManager, loading, signOut } = useAuth();
  const previewEmployeeId = searchParams.get("employee");
  const isManagingAsEmployee = (isAdmin() || isManager()) && !!previewEmployeeId;
  const isReadOnlyEmployeeView = isManagingAsEmployee;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employeeId, setEmployeeId] = useState("");
  const [functionId, setFunctionId] = useState("");
  const [count, setCount] = useState("");
  const [scale, setScale] = useState("100");
  const [isManualScale, setIsManualScale] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");
  const [projectClient, setProjectClient] = useState("");
  const [moduleHandle, setModuleHandle] = useState("");
  const [activeTab, setActiveTab] = useState<"session" | "tasks">(searchParams.get("tab") === "tasks" ? "tasks" : "session");
  const [showKPIDialog, setShowKPIDialog] = useState(false);
  const [showLeaveRequestDialog, setShowLeaveRequestDialog] = useState(false);
  const [showLogoutCountdown, setShowLogoutCountdown] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [summaryFilterDate, setSummaryFilterDate] = useState<string>("");
  const [summaryViewMode, setSummaryViewMode] = useState<"employee" | "date">("employee");
  const [workSessionsDeptFilter, setWorkSessionsDeptFilter] = useState<string>("all");
  const [workSessionsEmpFilter, setWorkSessionsEmpFilter] = useState<string>("all");
  const [workSessionsViewMode, setWorkSessionsViewMode] = useState<"employee" | "date">("employee");
  const [workSummariesDeptFilter, setWorkSummariesDeptFilter] = useState<string>("all");
  const [workSummariesEmpFilter, setWorkSummariesEmpFilter] = useState<string>("all");
  const [workSummariesCompanyFilter, setWorkSummariesCompanyFilter] = useState<string>("all");
  const [workSummariesProjectFilter, setWorkSummariesProjectFilter] = useState<string>("all");
  const [workSummariesModuleFilter, setWorkSummariesModuleFilter] = useState<string>("all");
  const [taskEntryMode, setTaskEntryMode] = useState<"single" | "multiple">("single");
  const [multipleTasks, setMultipleTasks] = useState<any[]>([{ 
    functionId: "", 
    count: "", 
    scale: "100", 
    remarks: "", 
    projectClient: "", 
    moduleHandle: "" 
  }]);

  const isEmployee = (!loading && !isAdmin() && !isManager()) || isManagingAsEmployee;
  const { workSessionState } = useWorkSession();
  const sessionStatus = workSessionState?.currentStatus;
  const isSessionCompleted = sessionStatus === "completed";

  // Sync activeTab with URL searchParams
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "tasks") {
      setActiveTab("tasks");
    } else if (tab === "session") {
      setActiveTab("session");
    }
  }, [searchParams]);

  // Handle logout countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showLogoutCountdown && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (showLogoutCountdown && countdown === 0) {
      signOut();
    }
    return () => clearTimeout(timer);
  }, [showLogoutCountdown, countdown]);

  const getWorkSummaryText = (session: any) => {
    const linkedSummary = Array.isArray(session.work_summaries)
      ? session.work_summaries[0]
      : session.work_summaries;

    return (
      session.notes?.trim() ||
      session.summary?.trim() ||
      linkedSummary?.summary?.trim() ||
      session.resolved_summary?.trim() ||
      "No summary provided"
    );
  };

  // Fetch manager's departments
  const { data: managerDepartments } = useQuery({
    queryKey: ["manager_departments", user?.id],
    queryFn: async () => {
      if (!isManager() || !user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("department_id, departments(id, name)")
        .eq("user_id", user.id)
        .eq("role", "manager");
      if (error) throw error;
      return data?.map((d: any) => ({ id: d.department_id, name: d.departments?.name || 'Department' })) || [];
    },
    enabled: isManager(),
  });

  // Fetch all departments for admin filter dropdown
  const { data: allDepartments } = useQuery({
    queryKey: ["all_departments_admin"],
    queryFn: async () => {
      if (!isAdmin()) return [];
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin(),
  });

  // Get available departments based on role for filters
  const availableDepartments = isManager() ? managerDepartments : allDepartments;

  // Fetch companies for filter dropdown
  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const workStartHour = 10; // Default for admin view
  const workEndHour = 19; // Default for admin view
  const lateLoginTime = "10:10 AM"; // Default for admin view
  const overseasWorkStartHour = 10;
  const overseasWorkEndHour = 19;
  const overseasLateLoginTime = "10:10 AM";
  const defaultBreaksLabel = "15m • 30m • 15m";

  const { data: employees } = useQuery({
    queryKey: ["employees", managerDepartments, previewEmployeeId],
    queryFn: async () => {
      let query = supabase
        .from("employees")
        .select("*, roles(role_name), departments(name, company_id, companies(id))")
        .order("name");
      if (isManagingAsEmployee && previewEmployeeId) {
        query = query.eq("id", previewEmployeeId);
      }
      
      // If manager, filter by their departments
      else if (isManager() && managerDepartments && managerDepartments.length > 0) {
        const deptIds = managerDepartments.map((d: any) => d.id);
        query = query.in("department_id", deptIds);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as { 
        id: string; 
        name: string;
        email: string;
        role_id: string;
        department_id: string;
        roles: { role_name: string };
        departments?: { name: string; company_id?: string; companies?: { id: string } };
      }[];
    },
    enabled: !isManager() || (managerDepartments !== undefined),
  });

  const currentEmployee = employees?.find(e => e.id === employeeId);
  const todayIso = new Date().toISOString().split("T")[0];

  const { data: todayHoliday } = useQuery({
    queryKey: ["today-holiday", todayIso, currentEmployee?.department_id],
    queryFn: async () => {
      const deptId = currentEmployee?.department_id;
      if (!deptId) return null;
      const { data, error } = await (supabase as any)
        .from("holidays")
        .select("id, holiday_date, name, is_paid, department_id")
        .eq("holiday_date", todayIso)
        .or(`department_id.is.null,department_id.eq.${deptId}`)
        .order("department_id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; is_paid: boolean; name: string } | null;
    },
    enabled: !!currentEmployee?.department_id,
  });

  const { data: todayAttendanceAdjustment } = useQuery({
    queryKey: ["attendance-adjustment-today", employeeId, todayIso],
    queryFn: async () => {
      if (!employeeId) return null;
      
      // First check for approved attendance adjustments
      const { data: attendanceAdj, error: adjError } = await (supabase as any)
        .from("attendance_adjustments")
        .select("attendance_type, is_approved")
        .eq("employee_id", employeeId)
        .eq("adjustment_date", todayIso)
        .eq("is_approved", true)
        .maybeSingle();
      
      if (adjError) throw adjError;
      
      // If no attendance adjustment, check for approved leave requests
      if (!attendanceAdj) {
        const { data: leaveReq, error: leaveError } = await (supabase as any)
          .from("leave_requests")
          .select("attendance_type, status")
          .eq("employee_id", employeeId)
          .eq("leave_date", todayIso)
          .eq("status", "approved")
          .maybeSingle();
        
        if (leaveError) throw leaveError;
        
        if (leaveReq) {
          return { 
            attendance_type: leaveReq.attendance_type, 
            is_approved: true 
          } as { attendance_type: string; is_approved: boolean };
        }
      }
      
      return attendanceAdj as { attendance_type: string; is_approved: boolean } | null;
    },
    enabled: !!employeeId,
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-select current employee for non-admin users
  useEffect(() => {
    if (isManagingAsEmployee && previewEmployeeId) {
      setEmployeeId(previewEmployeeId);
      return;
    }
    if (employees && user && isEmployee) {
      // Emails coming from auth can differ in casing/whitespace; normalize before matching.
      const userEmail = user.email?.trim().toLowerCase();
      const userEmployee = employees.find(
        (e) => e.email?.trim().toLowerCase() === userEmail
      );
      if (userEmployee && userEmployee.id !== employeeId) {
        setEmployeeId(userEmployee.id);
      }
    }
  }, [employees, user, isEmployee, employeeId, isManagingAsEmployee, previewEmployeeId]);

  const selectedEmployee = employees?.find((e) => e.id === employeeId);
  const appliedPreviewFiltersFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isManagingAsEmployee || !previewEmployeeId || !selectedEmployee) return;
    if (appliedPreviewFiltersFor.current === previewEmployeeId) return;
    appliedPreviewFiltersFor.current = previewEmployeeId;
    const companyId =
      (selectedEmployee.departments as { company_id?: string; companies?: { id: string } } | undefined)
        ?.company_id ??
      selectedEmployee.departments?.companies?.id;
    setWorkSessionsDeptFilter(selectedEmployee.department_id);
    setWorkSessionsEmpFilter(previewEmployeeId);
    setWorkSummariesDeptFilter(selectedEmployee.department_id);
    setWorkSummariesEmpFilter(previewEmployeeId);
    if (companyId) setWorkSummariesCompanyFilter(companyId);
  }, [isManagingAsEmployee, previewEmployeeId, selectedEmployee?.id, selectedEmployee?.department_id]);

  useEffect(() => {
    appliedPreviewFiltersFor.current = null;
  }, [previewEmployeeId]);

  useEffect(() => {
    if (!isManagingAsEmployee) appliedPreviewFiltersFor.current = null;
  }, [isManagingAsEmployee]);
  const selectedRoleId = selectedEmployee?.role_id;

  const { data: functions } = useQuery({
    queryKey: ["functions", selectedRoleId, employeeId],
    queryFn: async () => {
      if (employeeId === "admin") {
        const { data, error } = await supabase.from("functions").select("*").order("function_name");
        if (error) throw error;
        return data as { id: string; function_name: string; target_value: number }[];
      }
      
      if (!selectedRoleId) return [];
      const { data, error } = await supabase.from("functions").select("*").eq("role_id", selectedRoleId).order("function_name");
      if (error) throw error;
      return data as { id: string; function_name: string; target_value: number }[];
    },
    enabled: !!selectedRoleId || employeeId === "admin",
  });

  const selectedFunction = functions?.find((f) => f.id === functionId);

  // Auto-calculate scale based on count and target (only if not manually set)
  useEffect(() => {
    if (!isManualScale && count) {
      setScale(Number(count) > 0 ? "100" : "0");
    } else if (!isManualScale && !count) {
      setScale("0");
    }
  }, [count, isManualScale]);

  // Filter logs based on role - employees see only their own logs
  const { data: allLogs, isLoading } = useQuery({
    queryKey: ["task_logs", isManager() ? employees?.map(e => e.id) : null],
    queryFn: async () => {
      // Get employee IDs for the manager's departments
      const employeeIds = isManager() 
        ? employees?.map(e => e.id) 
        : null;
      
      // If manager has no employees in their departments, return empty
      if (isManager() && (!employeeIds || employeeIds.length === 0)) {
        return [];
      }
      
      let query = supabase
        .from("task_logs")
        .select("*, employees(name, department_id, profile_photo_url), functions(function_name, target_value)")
        .order("log_date", { ascending: false });
      
      // For employees, filter to only show their own logs
      if (isEmployee && employeeId) {
        query = query.eq("employee_id", employeeId);
      }
      
      // For managers, filter by employee IDs in their departments
      if (isManager() && employeeIds && employeeIds.length > 0) {
        query = query.in("employee_id", employeeIds);
      }
      
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as TaskLog[];
    },
    enabled: (!isEmployee || !!employeeId) && (!isManager() || (managerDepartments !== undefined && employees !== undefined)),
  });

  const logs = allLogs?.filter(log => {
    // Department filter
    if (workSessionsDeptFilter !== "all" && log.employees?.department_id !== workSessionsDeptFilter) {
      return false;
    }
    
    // Employee filter
    if (workSessionsEmpFilter !== "all" && log.employee_id !== workSessionsEmpFilter) {
      return false;
    }
    
    // Date filter
    if (summaryFilterDate && log.log_date !== summaryFilterDate) {
      return false;
    }
    
    return true;
  });

  const { data: workSummaries, isLoading: summariesLoading } = useQuery({
    queryKey: ["work_sessions_summary", summaryFilterDate, managerDepartments, employees?.map(e => e.id)],
    queryFn: async () => {
      // Only admin and manager can see work sessions
      if (!isAdmin() && !isManager()) return [];
      
      // Get employee IDs for the manager's departments
      const employeeIds = isManager() 
        ? employees?.map(e => e.id) 
        : null;
      
      // If manager has no employees in their departments, return empty
      if (isManager() && (!employeeIds || employeeIds.length === 0)) {
        return [];
      }
      
      let query = supabase
        .from("work_sessions")
        .select(`
          *,
          employees(name, email, profile_photo_url, department_id),
          work_summaries(id, summary, work_date)
        `)
        .in("status", ["completed", "incomplete"])
        .order("created_at", { ascending: false })
        .limit(50);
      
      // Apply date filter if selected, otherwise show today's data
      if (summaryFilterDate) {
        query = query.eq("date", summaryFilterDate);
      } else {
        query = query.eq("date", new Date().toISOString().split('T')[0]);
      }
      
      // For managers, filter by employee IDs in their departments
      if (isManager() && employeeIds && employeeIds.length > 0) {
        query = query.in("employee_id", employeeIds);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      const sessions = (data || []) as any[];
      if (sessions.length === 0) return sessions;

      // Fallback for older rows where work_summary_id was not linked:
      // fetch summaries by date and match in memory.
      const workDatesInSessions = [...new Set(sessions.map((s) => s.date).filter(Boolean))];

      if (workDatesInSessions.length === 0) {
        return sessions;
      }

      const { data: standaloneSummaries, error: summariesError } = await supabase
        .from("work_summaries")
        .select("id, employee_id, user_id, work_date, summary, created_at")
        .in("work_date", workDatesInSessions)
        .limit(500)
        .order("created_at", { ascending: false });

      if (summariesError) {
        console.warn("Fallback work summaries query failed:", summariesError);
        return sessions;
      }

      const summaryMapById = new Map<string, string>();
      const summaryMapByEmployee = new Map<string, string>();
      const summaryMapByUser = new Map<string, string>();
      (standaloneSummaries || []).forEach((row: any) => {
        if (row.id && row.summary && !summaryMapById.has(row.id)) {
          summaryMapById.set(row.id, row.summary);
        }

        if (row.employee_id) {
          const keyByEmployee = `${row.employee_id}_${row.work_date}`;
          if (!summaryMapByEmployee.has(keyByEmployee) && row.summary) {
            summaryMapByEmployee.set(keyByEmployee, row.summary);
          }
        }

        if (row.user_id) {
          const keyByUser = `${row.user_id}_${row.work_date}`;
          if (!summaryMapByUser.has(keyByUser) && row.summary) {
            summaryMapByUser.set(keyByUser, row.summary);
          }
        }
      });

      return sessions.map((session: any) => {
        const keyByEmployee = `${session.employee_id}_${session.date}`;
        const keyByUser = `${session.user_id}_${session.date}`;
        return {
          ...session,
          resolved_summary:
            summaryMapById.get(session.work_summary_id) ||
            summaryMapByEmployee.get(keyByEmployee) ||
            summaryMapByUser.get(keyByUser) ||
            null,
        };
      });
    },
    enabled: (isAdmin() || isManager()) && (!isManager() || (managerDepartments !== undefined && employees !== undefined)),
  });

  const { data: accumulatedMonthDeductions } = useQuery({
    queryKey: ["monthly-deductions", employeeId, (currentEmployee as any)?.monthly_salary],
    queryFn: async () => {
      if (!employeeId || !(currentEmployee as any)?.monthly_salary) return 0;
      
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      
      if (yesterday < firstDay) return 0; // It's the 1st of the month
      
      const firstDayIso = firstDay.toISOString().split('T')[0];
      const yesterdayIso = yesterday.toISOString().split('T')[0];
      
      // Fetch data for the period up to yesterday
      const [
        { data: workSessions },
        { data: taskLogs },
        { data: attendanceAdjs },
        { data: leaveReqs },
        { data: holidays }
      ] = await Promise.all([
        supabase.from("work_sessions")
          .select("*")
          .eq("employee_id", employeeId)
          .gte("date", firstDayIso)
          .lte("date", yesterdayIso),
        supabase.from("task_logs")
          .select("log_date")
          .eq("employee_id", employeeId)
          .gte("log_date", firstDayIso)
          .lte("log_date", yesterdayIso),
        supabase.from("attendance_adjustments")
          .select("adjustment_date, attendance_type")
          .eq("employee_id", employeeId)
          .eq("is_approved", true)
          .gte("adjustment_date", firstDayIso)
          .lte("adjustment_date", yesterdayIso),
        supabase.from("leave_requests")
          .select("leave_date, attendance_type")
          .eq("employee_id", employeeId)
          .eq("status", "approved")
          .gte("leave_date", firstDayIso)
          .lte("leave_date", yesterdayIso),
        supabase.from("holidays")
          .select("holiday_date, is_paid")
          .gte("holiday_date", firstDayIso)
          .lte("holiday_date", yesterdayIso)
      ]);
      
      let totalDeduction = 0;
      const wd = (currentEmployee as any).working_days || 30;
      const stdHours = (currentEmployee as any).standard_hours_per_day || 8;
      const perDaySalary = (currentEmployee as any).monthly_salary / wd;
      
      const GO_LIVE_DATE = "2026-06-08";

      for (let d = new Date(firstDay); d <= yesterday; d.setDate(d.getDate() + 1)) {
        const dateIso = d.toISOString().split('T')[0];
        
        // Skip deduction calculations for days before the feature went live
        if (dateIso < GO_LIVE_DATE) {
          continue;
        }

        const holiday = holidays?.find(h => h.holiday_date === dateIso);
        const attAdj = attendanceAdjs?.find(a => a.adjustment_date === dateIso) || 
                       leaveReqs?.find(l => l.leave_date === dateIso);
        const session = workSessions?.find(s => s.date === dateIso);
        const hasLogs = taskLogs?.some(t => t.log_date === dateIso) || false;
        
        let workedHours = 0;
        if (session?.start_time) {
          const start = new Date(session.start_time);
          const end = session.end_time ? new Date(session.end_time) : new Date(session.start_time);
          if (!session.end_time) end.setHours(19, 0, 0, 0);
          const rawHours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
          const trackedBreakMinutes =
            Number(session.morning_break_duration || 0) +
            Number(session.lunch_break_duration || 0) +
            Number(session.short_break_duration || 0);
          const breakMinutes = trackedBreakMinutes > 0 ? trackedBreakMinutes : Number(session.break_duration || 0);
          workedHours = Math.max(0, rawHours - breakMinutes / 60);
        }
        
        const safeWorkedHours = Math.max(0, Math.min(stdHours, workedHours));
        
        let multiplier = safeWorkedHours / stdHours;
        const attendanceType = attAdj?.attendance_type;
        
        if (holiday) {
          multiplier = holiday.is_paid ? 1 : 0;
        } else if (attendanceType) {
          switch (attendanceType) {
            case "full_day":
            case "leave_paid":
            case "half_day_paid":
            case "holiday_paid":
              multiplier = 1; break;
            case "half_day_unpaid":
            case "leave_unpaid":
            case "holiday_unpaid":
              multiplier = 0; break;
            default:
              break;
          }
        }
        
        // If it was a regular working day and no KPIs were logged, force multiplier to 0
        if (!holiday && !attendanceType && !hasLogs) {
          multiplier = 0;
        }
        
        const finalEarned = Math.max(0, perDaySalary * multiplier);
        totalDeduction += Math.max(0, perDaySalary - finalEarned);
      }
      
      return totalDeduction;
    },
    enabled: !!employeeId && !!(currentEmployee as any)?.monthly_salary,
  });

  const addLog = useMutation({
    mutationFn: async () => {
      let actualEmployeeId = employeeId;
      
      if (employeeId === "admin") {
        if (userRole.employee_id) {
          actualEmployeeId = userRole.employee_id;
        } else {
          let { data: companies } = await supabase.from("companies").select("id").limit(1);
          let { data: departments } = await supabase.from("departments").select("id").limit(1);
          let { data: roles } = await supabase.from("roles").select("id").limit(1);
          
          let companyId = companies?.[0]?.id;
          let departmentId = departments?.[0]?.id;
          let roleId = roles?.[0]?.id;
          
          if (!companyId) {
            const { data: newCompany } = await supabase
              .from("companies")
              .insert({ name: "Default Company" })
              .select("id")
              .single();
            companyId = newCompany?.id;
          }
          
          if (!departmentId && companyId) {
            const { data: newDept } = await supabase
              .from("departments")
              .insert({ name: "General", company_id: companyId })
              .select("id")
              .single();
            departmentId = newDept?.id;
          }
          
          if (!roleId && departmentId) {
            const { data: newRole } = await supabase
              .from("roles")
              .insert({ role_name: "General", department_id: departmentId })
              .select("id")
              .single();
            roleId = newRole?.id;
          }
          
          const { data: newEmployee, error: empError } = await supabase
            .from("employees")
            .insert({
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'Admin',
              email: user.email,
              role_id: roleId || employees?.[0]?.role_id,
              department_id: departmentId || employees?.[0]?.department_id,
            })
            .select()
            .single();
          
          if (empError) throw empError;
          actualEmployeeId = newEmployee.id;
          
          await supabase
            .from("user_roles")
            .update({ employee_id: newEmployee.id })
            .eq("user_id", user.id);
        }
      }
      
      const { error } = await supabase.from("task_logs").insert({
        employee_id: actualEmployeeId,
        function_id: functionId,
        count: Number(count),
        scale: Number(scale),
        log_date: logDate,
        remarks: remarks || null,
        project_client: projectClient || null,
        module_handle: moduleHandle || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["today-tasks-count"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["functions"] });
      toast.success("Task logged successfully");
      setCount(""); setScale("0"); setFunctionId(""); setRemarks(""); setProjectClient(""); setModuleHandle("");
      setActiveTab("session");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addMultipleLogs = useMutation({
    mutationFn: async (tasks: any[]) => {
      let actualEmployeeId = employeeId;
      
      // Admin case handling (same as single)
      if (employeeId === "admin" && !userRole.employee_id) {
        // ... (This logic is complex, maybe I should extract it or just handle it)
        // Actually, let's assume the user is usually an employee here
      } else if (employeeId === "admin") {
        actualEmployeeId = userRole.employee_id;
      }

      const logsToInsert = tasks.map(task => ({
        employee_id: actualEmployeeId,
        function_id: task.functionId,
        count: Number(task.count),
        scale: Number(task.scale),
        log_date: logDate,
        remarks: task.remarks || null,
        project_client: task.projectClient || null,
        module_handle: task.moduleHandle || null,
      }));

      const { error } = await supabase.from("task_logs").insert(logsToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task_logs"] });
      qc.invalidateQueries({ queryKey: ["today-tasks-count"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["functions"] });
      toast.success("All tasks logged successfully");
      setMultipleTasks([{ functionId: "", count: "", scale: "100", remarks: "", projectClient: "", moduleHandle: "" }]);
      setActiveTab("session");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("task_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["task_logs"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

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

  // Calculate personal stats for employees
  const personalStats = useMemo(() => {
    if (!logs || !isEmployee) return null;
    
    const today = new Date().toISOString().split("T")[0];
    const todayLogs = logs.filter(l => l.log_date === today);
    
    // Calculate streak (consecutive days with entries)
    let streak = 0;
    const sortedDates = [...new Set(logs.map(l => l.log_date))].sort().reverse();
    for (const date of sortedDates) {
      if (logs.some(l => l.log_date === date)) {
        streak++;
      } else {
        break;
      }
    }
    
    // Calculate weekly performance
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekLogs = logs.filter(l => isWithinInterval(new Date(l.log_date), { start: weekStart, end: weekEnd }));
    
    const weekPerformance = weekLogs.length > 0
      ? Math.round(weekLogs.reduce((acc, log) => {
          return acc + (log.count > 0 ? 100 : 0);
        }, 0) / weekLogs.length)
      : 0;
    
    return {
      todayEntries: todayLogs.length,
      totalEntries: logs.length,
      streak,
      weekPerformance,
      todayPerformance: todayLogs.length > 0
        ? Math.round(todayLogs.reduce((acc, log) => {
            return acc + (log.count > 0 ? 100 : 0);
          }, 0) / todayLogs.length)
        : 0
    };
  }, [logs]);

  const totalEntries = logs?.length || 0;
  const todayEntries = logs?.filter(l => l.log_date === new Date().toISOString().split("T")[0]).length || 0;
  const avgPerformance = logs?.length > 0 
    ? Math.round(logs.reduce((acc, log) => {
        return acc + (log.count > 0 ? 100 : 0);
      }, 0) / logs.length)
    : 0;

  // Calculate worked hours for both employee and admin/manager views
  const workedHoursToday = (() => {
    if (isEmployee) {
      // Employee view: use their own work session
      const s = workSessionState?.session;
      if (!s?.start_time) return 0;
      const start = new Date(s.start_time);
      const end = s.end_time ? new Date(s.end_time) : new Date();
      const rawHours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
      const trackedBreakMinutes =
        Number(s.morning_break_duration || 0) +
        Number(s.lunch_break_duration || 0) +
        Number(s.short_break_duration || 0);
      const breakMinutes = trackedBreakMinutes > 0 ? trackedBreakMinutes : Number(s.break_duration || 0);
      return Math.max(0, rawHours - breakMinutes / 60);
    } else {
      // Admin/Manager view: get selected employee's work session for today
      if (!employeeId) return 0;
      
      // Find today's work session for selected employee from work sessions data
      const todaySession = workSummaries?.find(session => 
        session.employee_id === employeeId && 
        session.date === new Date().toISOString().split('T')[0]
      );
      
      if (!todaySession?.start_time) return 0;
      
      const start = new Date(todaySession.start_time);
      const end = todaySession.end_time ? new Date(todaySession.end_time) : new Date();
      const rawHours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
      const trackedBreakMinutes =
        Number(todaySession.morning_break_duration || 0) +
        Number(todaySession.lunch_break_duration || 0) +
        Number(todaySession.short_break_duration || 0);
      const breakMinutes = trackedBreakMinutes > 0 ? trackedBreakMinutes : Number(todaySession.break_duration || 0);
      return Math.max(0, rawHours - breakMinutes / 60);
    }
  })();

    return (
      <div className="min-h-screen bg-white">
        {/* Employee header — flat, centered, single row (wraps on narrow screens) */}
        <div className="border-b border-gray-100 bg-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-base sm:text-lg font-semibold text-gray-900">
              {isManagingAsEmployee 
                ? `Managing: ${currentEmployee?.name}` 
                : !isEmployee 
                  ? "Organization Time Management" 
                  : `Welcome back, ${currentEmployee?.name?.split(' ')[0] || 'Employee'}! 👋`}
            </h1>
            <span className="hidden sm:inline text-gray-300">·</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
              <Briefcase className="h-3 w-3 shrink-0" />
              {isManagingAsEmployee 
                ? (currentEmployee?.roles?.role_name || 'Employee')
                : (userRole.role ? userRole.role.charAt(0).toUpperCase() + userRole.role.slice(1) : 'User')}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-600">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            <span className="text-gray-300">·</span>
            <time
              dateTime={currentTime.toISOString()}
              className="font-mono text-base font-semibold tabular-nums text-gray-900"
            >
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </time>
          </div>
        </div>

        {/* Main Content */}
        <div className={cn(
          "mx-auto p-4 space-y-6",
          !isEmployee && !isManagingAsEmployee ? "max-w-full lg:px-8" : "max-w-7xl"
        )}>
          {/* Stats Cards */}
          {personalStats && isEmployee && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardContent className="p-4 relative">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-100" />
                    <span className="text-xs text-emerald-100">Today</span>
                  </div>
                  <div className="text-2xl font-bold">{personalStats.todayEntries}</div>
                  <div className="text-xs text-emerald-100">entries logged</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-500 to-purple-600 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardContent className="p-4 relative">
                  <div className="flex items-center justify-between mb-2">
                    <BarChart3 className="h-5 w-5 text-violet-100" />
                    <span className="text-xs text-violet-100">Performance</span>
                  </div>
                  <div className="text-2xl font-bold">{personalStats.todayPerformance}%</div>
                  <div className="text-xs text-violet-100">today's avg</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-orange-600 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardContent className="p-4 relative">
                  <div className="flex items-center justify-between mb-2">
                    <Flame className="h-5 w-5 text-amber-100" />
                    <span className="text-xs text-amber-100">Streak</span>
                  </div>
                  <div className="text-2xl font-bold">{personalStats.streak}</div>
                  <div className="text-xs text-amber-100">days active</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-cyan-600 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardContent className="p-4 relative">
                  <div className="flex items-center justify-between mb-2">
                    <Award className="h-5 w-5 text-blue-100" />
                    <span className="text-xs text-blue-100">Weekly</span>
                  </div>
                  <div className="text-2xl font-bold">{personalStats.weekPerformance}%</div>
                  <div className="text-xs text-blue-100">this week</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Management View for Admins/Managers */}
          {!isEmployee && !isManagingAsEmployee ? (
            <div className="space-y-8">
              <TimeManagementSheet />
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <section className="mb-4" aria-label="Today’s work stats">
                <DailyMetrics />
              </section>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-gray-200/60 w-fit">
                <button
                  onClick={() => setActiveTab("session")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    activeTab === "session"
                      ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Timer className="h-4 w-4" />
                  Work Session
                </button>
                <button
                  onClick={() => setActiveTab("tasks")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    activeTab === "tasks"
                      ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Target className="h-4 w-4" />
                  Task Log
                </button>
                </div>
                {!isManagingAsEmployee && employeeId ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl"
                    onClick={() => setShowLeaveRequestDialog(true)}
                  >
                    <Palmtree className="h-4 w-4 mr-2" />
                    Request leave
                  </Button>
                ) : null}
              </div>

              {/* Content based on active tab */}
              <div className="mt-8">
                {activeTab === "session" ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    {/* Work Session - Takes 2 columns */}
                    <div className="lg:col-span-2 h-full">
                      <WorkSessionControl 
                        onWorkEnded={() => {
                          if (isEmployee && !isManagingAsEmployee) {
                            setShowKPIDialog(true);
                          }
                        }}
                        readOnly={isReadOnlyEmployeeView}
                        previewDepartmentName={currentEmployee?.departments?.name ?? null}
                      />
                    </div>

                    {/* Quick Activity */}
                    <div className="space-y-4 h-full">
                      <Card className="border-0 shadow-sm h-full flex flex-col">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <History className="h-4 w-4 text-violet-500" />
                            Recent Activity
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 flex flex-col">
                          {isLoading ? (
                            <div className="text-center py-8 text-gray-400 text-sm flex-1">Loading...</div>
                          ) : logs?.length === 0 ? (
                            <div className="text-center py-8 px-4 flex-1">
                              <Clock className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                              <p className="text-gray-500 text-sm">No entries yet</p>
                            </div>
                          ) : (
                            <div className="space-y-1 flex-1 overflow-y-auto scrollbar-hide max-h-[600px]">
                              {logs?.slice(0, 10).map((log) => {
                                const target = log.functions?.target_value || 0;
                                const pct = log.count > 0 ? 100 : 0;
                                const isRecent = new Date(log.log_date).toDateString() === new Date().toDateString();
                                return (
                                  <div key={log.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                                    <div className={cn(
                                      "h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0",
                                      pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500"
                                    )}>
                                      {pct}%
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-gray-900 truncate">
                                        {log.functions?.function_name}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>{log.log_date}</span>
                                        {isRecent && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px]">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Today
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-mono font-medium text-gray-700">
                                        {log.count}/{target}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Log Your Work (Task Entry Form) */}
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                            <Target className="h-4 w-4 text-white" />
                          </div>
                          Task Log
                        </CardTitle>
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant={taskEntryMode === "single" ? "default" : "outline"}
                            onClick={() => setTaskEntryMode("single")}
                            className="flex-1"
                          >
                            Single Task
                          </Button>
                          <Button
                            variant={taskEntryMode === "multiple" ? "default" : "outline"}
                            onClick={() => setTaskEntryMode("multiple")}
                            className="flex-1"
                          >
                            Multiple Tasks
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {taskEntryMode === "single" ? (
                          <>
                            <div>
                              <label className="text-xs font-semibold text-gray-600">Select Function</label>
                              <Select value={functionId} onValueChange={setFunctionId}>
                                <SelectTrigger className="mt-2 h-10" disabled={isReadOnlyEmployeeView}>
                                  <SelectValue placeholder="Choose a function..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {functions?.map((f: any) => (
                                    <SelectItem key={f.id} value={f.id}>
                                      {f.function_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-semibold text-gray-600">Project/Client</label>
                                <Input
                                  className="mt-2 h-10"
                                  placeholder="Enter project..."
                                  value={projectClient}
                                  disabled={isReadOnlyEmployeeView}
                                  onChange={(e) => setProjectClient(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-600">Module/Handle</label>
                                <Input
                                  className="mt-2 h-10"
                                  placeholder="Enter module..."
                                  value={moduleHandle}
                                  disabled={isReadOnlyEmployeeView}
                                  onChange={(e) => setModuleHandle(e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Date</label>
                                  <Input className="mt-2 h-11 bg-white border-gray-200 rounded-xl" type="date" value={logDate} disabled={isReadOnlyEmployeeView} onChange={(e) => setLogDate(e.target.value)} />
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Units Completed</label>
                                  <Input
                                    className="mt-2 h-11 bg-white border-gray-200 rounded-xl"
                                    type="number"
                                    placeholder="0"
                                    value={count}
                                    disabled={isReadOnlyEmployeeView}
                                    onChange={(e) => setCount(e.target.value)}
                                    min={0}
                                  />
                                </div>
                              </div>

                              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Effort Scale (%)</label>
                                  <button
                                    type="button"
                                    disabled={isReadOnlyEmployeeView}
                                    onClick={() => setIsManualScale((v) => !v)}
                                    className={cn(
                                      "text-[10px] font-bold px-3 py-1 rounded-full border transition-all uppercase tracking-wider",
                                      isManualScale
                                        ? "bg-amber-100 text-amber-700 border-amber-200 shadow-sm"
                                        : "bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm"
                                    )}
                                  >
                                    {isManualScale ? "Manual" : "Auto"}
                                  </button>
                                </div>
                                <div className="pt-2">
                                  <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={Number(scale)}
                                    disabled={!isManualScale || isReadOnlyEmployeeView}
                                    onChange={(e) => setScale(e.target.value)}
                                    className={cn(
                                      "w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-100",
                                      isManualScale ? "accent-violet-600" : "accent-gray-400 opacity-40"
                                    )}
                                    style={{
                                      background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${scale}%, #f3f4f6 ${scale}%, #f3f4f6 100%)`
                                    }}
                                  />
                                  <div className="flex justify-between text-[11px] font-bold text-gray-400 mt-2">
                                    <span>0%</span>
                                    <span className="text-violet-600 text-sm">{scale}%</span>
                                    <span>100%</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Remarks</label>
                                <Input
                                  className="mt-2 h-11 bg-white border-gray-200 rounded-xl"
                                  placeholder="Add any additional notes..."
                                  value={remarks}
                                  disabled={isReadOnlyEmployeeView}
                                  onChange={(e) => setRemarks(e.target.value)}
                                />
                              </div>

                              <Button
                                onClick={() => addLog.mutate()}
                                disabled={isReadOnlyEmployeeView || addLog.isPending || !functionId || !count}
                                className="w-full h-12 text-base font-bold bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 shadow-lg shadow-violet-500/25 mt-2 transition-all active:scale-[0.98] rounded-2xl"
                              >
                                {isReadOnlyEmployeeView ? "Read-only preview" : addLog.isPending ? "Submitting..." : "Submit Task Entry"}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Logging Date</label>
                              <Input className="w-40 h-10 bg-white" type="date" value={logDate} disabled={isReadOnlyEmployeeView} onChange={(e) => setLogDate(e.target.value)} />
                            </div>
                            
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                              {multipleTasks.map((task, index) => (
                                <div key={index} className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow space-y-4 relative group/task">
                                  <button 
                                    onClick={() => {
                                      const newTasks = [...multipleTasks];
                                      newTasks.splice(index, 1);
                                      setMultipleTasks(newTasks);
                                    }}
                                    className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 transition-all opacity-0 group-hover/task:opacity-100"
                                    disabled={multipleTasks.length === 1}
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Function</label>
                                      <Select 
                                        value={task.functionId} 
                                        onValueChange={(v) => {
                                          const newTasks = [...multipleTasks];
                                          newTasks[index].functionId = v;
                                          // Auto-scale check
                                          if (task.count) {
                                            newTasks[index].scale = Number(task.count) > 0 ? "100" : "0";
                                          }
                                          setMultipleTasks(newTasks);
                                        }}
                                      >
                                        <SelectTrigger className="h-10 bg-gray-50/30 border-gray-100" disabled={isReadOnlyEmployeeView}>
                                          <SelectValue placeholder="Choose function" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {functions?.map((f: any) => (
                                            <SelectItem key={f.id} value={f.id}>{f.function_name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Units</label>
                                      <Input
                                        className="h-10 bg-gray-50/30 border-gray-100"
                                        type="number"
                                        placeholder="0"
                                        value={task.count}
                                        disabled={isReadOnlyEmployeeView}
                                        onChange={(e) => {
                                          const newTasks = [...multipleTasks];
                                          newTasks[index].count = e.target.value;
                                          // Auto-scale check
                                          if (e.target.value) {
                                            newTasks[index].scale = Number(e.target.value) > 0 ? "100" : "0";
                                          }
                                          setMultipleTasks(newTasks);
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Project</label>
                                      <Input
                                        className="h-10 bg-gray-50/30 border-gray-100"
                                        placeholder="Enter project"
                                        value={task.projectClient}
                                        disabled={isReadOnlyEmployeeView}
                                        onChange={(e) => {
                                          const newTasks = [...multipleTasks];
                                          newTasks[index].projectClient = e.target.value;
                                          setMultipleTasks(newTasks);
                                        }}
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Module</label>
                                      <Input
                                        className="h-10 bg-gray-50/30 border-gray-100"
                                        placeholder="Enter module"
                                        value={task.moduleHandle}
                                        disabled={isReadOnlyEmployeeView}
                                        onChange={(e) => {
                                          const newTasks = [...multipleTasks];
                                          newTasks[index].moduleHandle = e.target.value;
                                          setMultipleTasks(newTasks);
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Effort Scale</label>
                                        <span className="text-xs font-bold text-violet-600">{task.scale}%</span>
                                      </div>
                                      <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={Number(task.scale)}
                                        disabled={isReadOnlyEmployeeView}
                                        onChange={(e) => {
                                          const newTasks = [...multipleTasks];
                                          newTasks[index].scale = e.target.value;
                                          setMultipleTasks(newTasks);
                                        }}
                                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-violet-600"
                                        style={{
                                          background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${task.scale}%, #f3f4f6 ${task.scale}%, #f3f4f6 100%)`
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-4 pt-2">
                              <Button
                                variant="outline"
                                onClick={() => setMultipleTasks([...multipleTasks, { 
                                  functionId: "", 
                                  count: "", 
                                  scale: "100", 
                                  remarks: "", 
                                  projectClient: "", 
                                  moduleHandle: "" 
                                }])}
                                className="flex-1 h-12 border-2 border-dashed border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all rounded-2xl font-bold"
                              >
                                <Plus className="h-5 w-5 mr-2" />
                                Add Row
                              </Button>
                              <Button
                                onClick={() => addMultipleLogs.mutate(multipleTasks)}
                                disabled={isReadOnlyEmployeeView || addMultipleLogs.isPending || multipleTasks.some(t => !t.functionId || !t.count)}
                                className="flex-1 h-12 bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 shadow-lg shadow-violet-500/25 rounded-2xl font-bold transition-all active:scale-[0.98]"
                              >
                                {addMultipleLogs.isPending ? "Logging..." : `Submit ${multipleTasks.length} ${multipleTasks.length === 1 ? 'Task' : 'Tasks'}`}
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Entry History */}
                    <Card className="border-0 shadow-sm h-full flex flex-col">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                            <History className="h-4 w-4 text-white" />
                          </div>
                          Your Entries
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 flex-1 flex flex-col">
                        {isLoading ? (
                          <div className="text-center py-12 text-gray-400 flex-1">Loading...</div>
                        ) : logs?.length === 0 ? (
                          <div className="text-center py-12 px-4 flex-1">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
                              <Target className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-gray-600 font-medium">No entries yet</p>
                            <p className="text-sm text-gray-400 mt-1">Log your first task to see it here</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100 flex-1 overflow-y-auto scrollbar-hide max-h-[600px]">
                            {logs?.map((log) => {
                              const target = log.functions?.target_value || 0;
                              const pct = log.count > 0 ? 100 : 0;
                              return (
                                <div key={log.id} className="group flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                                  <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0",
                                    perfBg(log.count, target)
                                  )}>
                                    {pct}%
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold text-gray-900 truncate">{log.functions?.function_name}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {log.log_date}
                                      </span>
                                      <span>•</span>
                                      <span>Scale: {log.scale}%</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <div className="text-sm font-mono font-medium text-gray-700">{log.count}/{target}</div>
                                      <div className={cn("text-xs font-medium", perfColor(log.count, target))}>
                                        {pct >= 100 ? 'Excellent!' : pct >= 70 ? 'Good' : 'Keep going'}
                                      </div>
                                    </div>
                                    {!isReadOnlyEmployeeView && (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500" 
                                        onClick={() => remove.mutate(log.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              <section
                aria-label="Pay snapshot for today"
                className="space-y-3 border-t border-gray-100 pt-8 mt-8"
              >
                <div className="w-full rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 px-4 py-3 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-indigo-900">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-indigo-600 shadow-sm">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <span className="font-semibold">Today&apos;s pay snapshot</span>
                    <span className="text-indigo-300">•</span>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-violet-600">
                      <IndianRupee className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-indigo-700/90">
                      Calculated from monthly salary, worked hours, and approved attendance.
                    </span>
                  </div>
                </div>
                <SalarySummaryCard
                  dateLabel={new Date().toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                  monthlySalary={(currentEmployee as any)?.monthly_salary ?? null}
                  workingDays={(currentEmployee as any)?.working_days ?? null}
                  standardHoursPerDay={(currentEmployee as any)?.standard_hours_per_day ?? 8}
                  workedHours={workedHoursToday}
                  attendanceType={todayAttendanceAdjustment?.attendance_type ?? null}
                  attendanceApproved={!!todayAttendanceAdjustment?.is_approved}
                  isHoliday={!!todayHoliday}
                  isHolidayPaid={!!todayHoliday?.is_paid}
                  readOnly={!isEmployee}
                  hasLoggedKPIToday={todayEntries > 0}
                  accumulatedMonthDeductions={accumulatedMonthDeductions || 0}
                />
                {!isManagingAsEmployee && employeeId ? (
                  <LeaveRequestDialog
                    open={showLeaveRequestDialog}
                    onOpenChange={setShowLeaveRequestDialog}
                    employeeId={employeeId}
                  />
                ) : null}
              </section>
            </>
          )}
        </div>

        {/* Logout Countdown Dialog */}
        <Dialog open={showLogoutCountdown} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl p-0 overflow-hidden">
            <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-8 text-center text-white relative">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_50%_50%,#fff,transparent)]" />
              <div className="relative z-10">
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full border-4 border-white/30 flex items-center justify-center">
                      <span className="text-5xl font-bold tabular-nums">{countdown}</span>
                    </div>
                    <svg className="absolute top-0 left-0 h-24 w-24 -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="44"
                        fill="none"
                        stroke="white"
                        strokeWidth="4"
                        strokeDasharray={276.46}
                        strokeDashoffset={276.46 - (276.46 * countdown) / 5}
                        className="transition-all duration-1000 ease-linear"
                      />
                    </svg>
                  </div>
                </div>
                <DialogTitle className="text-2xl font-bold mb-2 text-white">Summary Submitted! 🎉</DialogTitle>
                <DialogDescription className="text-violet-100 text-lg">
                  Excellent work today. You will be logged out automatically in {countdown} seconds.
                </DialogDescription>
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex justify-center">
              <Button 
                onClick={() => signOut()} 
                className="bg-white text-violet-600 hover:bg-violet-50 border border-violet-200 font-semibold px-8"
              >
                Logout Now
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* KPI Update Dialog */}
        <KPIUpdateDialog 
          open={showKPIDialog} 
          onOpenChange={setShowKPIDialog}
          onKPIUpdated={() => {
            qc.invalidateQueries({ queryKey: ["kpi-performance-logs"] });
            // Note: Auto-logout is handled inside the KPIUpdateDialog itself
          }} 
        />
      </div>
    );
  }

  