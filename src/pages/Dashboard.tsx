import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Layers, 
  Clock, 
  Target, 
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  Award,
  Sparkles,
  User,
  CheckCircle,
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart
} from "recharts";
import { cn } from "@/lib/utils";
import EmployeeAvatarWithPreview from "@/components/EmployeeAvatarWithPreview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"];

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  trendValue?: string;
  gradient: string;
  to?: string;
}

function StatCard({ title, value, icon, trend, trendUp, trendValue, gradient, to }: StatCardProps) {
  const content = (
    <div className={`group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-gray-100 dark:border-slate-800 transition-all duration-300 ${to ? 'hover:shadow-lg hover:shadow-gray-200/50 cursor-pointer' : 'hover:shadow-lg hover:shadow-gray-200/50'}`}>
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-10 rounded-bl-full`} />
      <div className="flex items-start justify-between mb-4">
        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shadow-gray-200 dark:shadow-none`}>
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            trendUp ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
          )}>
            {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
      {trend && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{trend}</p>}
    </div>
  );

  if (to) {
    return <Link to={to} className="block">{content}</Link>;
  }

  return content;
}

export default function Dashboard() {
  const { user, userRole, isAdmin, isManager, isEmployee } = useAuth();
  const [searchParams] = useSearchParams();
  const previewEmployeeId = searchParams.get("employee");
  const isManagingAsEmployee = (isAdmin() || isManager()) && !!previewEmployeeId;
  const employeePreviewReadOnly = isManagingAsEmployee;
  const isEmployeeView = isEmployee() || isManagingAsEmployee;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [liveDeptFilter, setLiveDeptFilter] = useState<string>("all");
  const [livePeriodFilter, setLivePeriodFilter] = useState<string>("last7");
  
  const [selectedMonthWeek, setSelectedMonthWeek] = useState(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstSunday = new Date(firstDayOfMonth);
    firstSunday.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());
    firstSunday.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - firstSunday.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(diffDays / 7) + 1;
    // ensure it defaults between 1 and 5
    return Math.max(1, Math.min(5, currentWeek));
  });

  const previewBootstrapKey = `${searchParams.get("previewDept") ?? ""}|${previewEmployeeId ?? ""}`;
  useEffect(() => {
    if (!isManagingAsEmployee) return;
    const pd = searchParams.get("previewDept");
    if (pd) setLiveDeptFilter(pd);
  }, [isManagingAsEmployee, previewBootstrapKey]);

  const livePeriodRange = useMemo(() => {
    const toLocalISODate = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    if (livePeriodFilter === "today") {
      const start = toLocalISODate(today);
      return { start, end: start };
    }

    if (livePeriodFilter === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const start = toLocalISODate(y);
      return { start, end: start };
    }

    if (livePeriodFilter === "last7") {
      const startD = new Date(today);
      startD.setDate(startD.getDate() - 6);
      return { start: toLocalISODate(startD), end: toLocalISODate(today) };
    }

    if (livePeriodFilter === "thisMonth") {
      const startD = new Date(today.getFullYear(), today.getMonth(), 1);
      const endD = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: toLocalISODate(startD), end: toLocalISODate(endD) };
    }

    if (livePeriodFilter === "lastMonth") {
      const startD = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endD = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: toLocalISODate(startD), end: toLocalISODate(endD) };
    }

    const start = toLocalISODate(today);
    return { start, end: start };
  }, [livePeriodFilter]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);
  
  // First fetch manager's departments (needed for other queries)
  const { data: userDepartments } = useQuery({
    queryKey: ["dashboard_user_departments", user?.id],
    queryFn: async () => {
      if (!isManager() || !user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("department_id")
        .eq("user_id", user.id)
        .eq("role", "manager");
      if (error) throw error;
      return data?.map((d: any) => d.department_id).filter(Boolean) || [];
    },
    enabled: isManager(),
  });
  
  // Fetch companies for admin (all) or manager (only their department's company)
  const { data: companies } = useQuery({
    queryKey: ["companies", isManager() ? userDepartments : null],
    queryFn: async () => {
      let query = supabase.from("companies").select("*");
      
      // If manager, only show their department's company
      if (isManager() && userDepartments && userDepartments.length > 0) {
        // First get the company_id from the manager's departments
        const { data: deptData, error: deptError } = await supabase
          .from("departments")
          .select("company_id")
          .in("id", userDepartments);
        
        if (deptError) throw deptError;
        
        const companyIds = deptData?.map((d: any) => d.company_id).filter(Boolean);
        if (companyIds && companyIds.length > 0) {
          query = query.in("id", companyIds);
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isAdmin() || (isManager() && userDepartments !== undefined),
  });

  // Fetch employee's department (must be before employees query)
  const { data: employeeDepartment } = useQuery({
    queryKey: ["employee_department", userRole.employee_id],
    queryFn: async () => {
      if (!isEmployee() || !userRole.employee_id) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("department_id, departments!inner(id, name)")
        .eq("id", userRole.employee_id)
        .single();
      if (error) throw error;
      return data as { department_id: string; departments: { id: string; name: string } };
    },
    enabled: isEmployee() && !!userRole.employee_id,
  });

  const { data: employees } = useQuery({
    queryKey: ["employees", userDepartments, employeeDepartment, previewEmployeeId],
    queryFn: async () => {
      let query = supabase.from("employees").select("*, roles(role_name), departments(name, companies(name))");
      if (isManagingAsEmployee && previewEmployeeId) {
        query = query.eq("id", previewEmployeeId);
      }
      
      // If manager, filter by their departments
      else if (isManager() && userDepartments && userDepartments.length > 0) {
        query = query.in("department_id", userDepartments);
      }
      // If employee, filter by their department only
      else if (isEmployee() && employeeDepartment) {
        query = query.eq("department_id", employeeDepartment.department_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled:
      isManagingAsEmployee ||
      (!isManager() && !isEmployee()) ||
      (isManager() && userDepartments !== undefined) ||
      (isEmployee() && employeeDepartment !== undefined),
  });

  const { data: taskLogs } = useQuery({
    queryKey: ["task_logs", isEmployee() ? user?.id : null, isManager() ? userDepartments : null, previewEmployeeId],
    queryFn: async () => {
      if (isManagingAsEmployee && previewEmployeeId) {
        const { data, error } = await supabase
          .from("task_logs")
          .select("*, functions(id, function_name, target_value, target_period), employees(name, department_id, profile_photo_url)")
          .eq("employee_id", previewEmployeeId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data;
      } else if (isEmployee() && user) {
        // For employees, try to find their employee record first
        if (userRole.employee_id) {
          // Employee has a linked employee record
          const { data, error } = await supabase
            .from("task_logs")
            .select("*, functions(id, function_name, target_value, target_period), employees(name, department_id, profile_photo_url)")
            .eq("employee_id", userRole.employee_id)
            .order("created_at", { ascending: false });
          if (error) throw error;
          return data;
        } else {
          // Employee doesn't have a linked employee record yet, return empty array
          return [];
        }
      } else if (isManager() && userDepartments && userDepartments.length > 0) {
        // For managers, first get employee IDs in their departments
        const { data: deptEmployees, error: empError } = await supabase
          .from("employees")
          .select("id")
          .in("department_id", userDepartments);
        if (empError) throw empError;
        const employeeIds = deptEmployees?.map((e: any) => e.id).filter(Boolean) || [];
        
        if (employeeIds.length === 0) return [];
        
        // Then get task logs for those employees only
        const { data, error } = await supabase
          .from("task_logs")
          .select("*, functions(id, function_name, target_value, target_period), employees(name, department_id, profile_photo_url)")
          .in("employee_id", employeeIds)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data;
      } else {
        // Admins see all logs
        const { data, error } = await supabase
          .from("task_logs")
          .select("*, functions(id, function_name, target_value, target_period), employees(name, department_id, profile_photo_url)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data;
      }
    },
    enabled: !isManager() || (userDepartments !== undefined),
  });

  const { data: departments } = useQuery({
    queryKey: ["departments", userDepartments, employeeDepartment, previewEmployeeId],
    queryFn: async () => {
      let query = supabase.from("departments").select("*");
      if (isManagingAsEmployee && previewEmployeeId) {
        const { data: emp, error: empError } = await supabase
          .from("employees")
          .select("department_id")
          .eq("id", previewEmployeeId)
          .single();
        if (empError) throw empError;
        if (emp?.department_id) {
          query = query.eq("id", emp.department_id);
        }
      }
      
      // If manager, show all their departments
      else if (isManager() && userDepartments && userDepartments.length > 0) {
        query = query.in("id", userDepartments);
      }
      // If employee, show only their department
      else if (isEmployee() && employeeDepartment) {
        query = query.eq("id", employeeDepartment.department_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isManagingAsEmployee || isAdmin() || (isManager() && userDepartments !== undefined) || (isEmployee() && employeeDepartment !== undefined),
  });

  const filteredStatsLogs = taskLogs || [];

  const { totalTarget, totalCompleted, overallPerf } = useMemo(() => {
    let target = 0;
    let done = 0;
    const dailyTargets = new Set();
    
    filteredStatsLogs.forEach((l: any) => {
      done += (l.count || 0);
      const key = `${l.employee_id}-${l.functions?.id || 'unknown'}-${l.log_date || l.created_at?.split('T')[0]}`;
      if (!dailyTargets.has(key)) {
        dailyTargets.add(key);
        target += (l.functions?.target_value || 0);
      }
    });
    
    return {
      totalTarget: target,
      totalCompleted: done,
      overallPerf: target > 0 ? Math.round((done / target) * 100) : 0
    };
  }, [filteredStatsLogs]);

  const deptPerf = departments?.map((dept) => {
    const deptName = dept.name || "Unknown";
    const deptLogs = filteredStatsLogs.filter((log: any) => log.employees?.department_id === dept.id);
    let target = 0;
    let done = 0;
    const dailyTargets = new Set();
    
    deptLogs.forEach((l: any) => {
      done += (l.count || 0);
      const key = `${l.employee_id}-${l.functions?.id || 'unknown'}-${l.log_date || l.created_at?.split('T')[0]}`;
      if (!dailyTargets.has(key)) {
        dailyTargets.add(key);
        target += (l.functions?.target_value || 0);
      }
    });

    return {
      name: deptName.length > 14 ? deptName.slice(0, 14) + "…" : deptName,
      performance: target > 0 ? Math.round((done / target) * 100) : 0,
      completed: done,
      target: target,
    };
  }) || [];

  const hasDeptData = deptPerf.some(d => d.target > 0 || d.completed > 0);

  const empPerf = employees?.map((emp: any) => {
    const empLogs = filteredStatsLogs.filter((l) => l.employee_id === emp.id);
    let target = 0;
    let done = 0;
    const dailyTargets = new Set();
    
    empLogs.forEach((l: any) => {
      done += (l.count || 0);
      const key = `${l.functions?.id || 'unknown'}-${l.log_date || l.created_at?.split('T')[0]}`;
      if (!dailyTargets.has(key)) {
        dailyTargets.add(key);
        target += (l.functions?.target_value || 0);
      }
    });

    return { 
      name: emp.name, 
      role: emp.roles?.role_name, 
      perf: target > 0 ? Math.round((done / target) * 100) : 0, 
      logs: empLogs.length,
      completed: done,
      target: target,
      imageUrl: emp.profile_photo_url,
    };
  }).filter(e => e.logs > 0 || e.target > 0).sort((a, b) => b.perf - a.perf) || [];

  const selectedWeekRange = useMemo(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstSunday = new Date(firstDayOfMonth);
    firstSunday.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());
    firstSunday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(firstSunday);
    startOfWeek.setDate(firstSunday.getDate() + (selectedMonthWeek - 1) * 7);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return { startOfWeek, endOfWeek };
  }, [selectedMonthWeek]);

  // Calculate weekly data from real task logs with department breakdown
  const weeklyData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    
    // Initialize data for each day with department tracking
    const data = days.map((day) => ({
      day,
      completed: 0,
      target: 0,
      departments: {} as Record<string, number>,
    }));

    if (!taskLogs || taskLogs.length === 0) return data;

    const { startOfWeek, endOfWeek } = selectedWeekRange;

    const dailyTargets = new Set();

    // Aggregate task logs by day and department
    taskLogs.forEach((log: any) => {
      const logDate = new Date(log.created_at);
      if (logDate >= startOfWeek && logDate <= endOfWeek) {
        const dayIndex = logDate.getDay();
        const deptName = log.employees?.department_id 
          ? departments?.find((d: any) => d.id === log.employees.department_id)?.name || "Unknown"
          : "No Department";
        
        data[dayIndex].completed += (log.count || 0);
        
        const key = `${log.employee_id}-${log.functions?.id || 'unknown'}-${log.log_date || log.created_at.split('T')[0]}`;
        if (!dailyTargets.has(key)) {
          dailyTargets.add(key);
          data[dayIndex].target += (log.functions?.target_value || 0);
        }

        data[dayIndex].departments[deptName] = (data[dayIndex].departments[deptName] || 0) + (log.count || 0);
      }
    });

    // Reorder to start from Monday for display
    const orderedData = [...data.slice(1), data[0]];
    return orderedData;
  }, [taskLogs, departments, selectedWeekRange]);

  const liveActivityLogs = useMemo(() => {
    return (taskLogs || []).filter((log: any) => {
      const matchesDept = liveDeptFilter === "all" || log.employees?.department_id === liveDeptFilter;
      const logDate = log.log_date as string | undefined;
      const matchesPeriod =
        !logDate ||
        (logDate >= livePeriodRange.start && logDate <= livePeriodRange.end);
      return matchesDept && matchesPeriod;
    });
  }, [taskLogs, liveDeptFilter, livePeriodRange]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 flex flex-col items-center text-center relative py-8">
          {/* Corner Icons with enhanced visibility */}
          <div className="absolute -top-4 -left-4 opacity-25 transform -rotate-12">
            <Activity className="h-14 w-14 text-violet-600" />
          </div>
          <div className="absolute -top-4 -right-4 opacity-25 transform rotate-12">
            <Target className="h-14 w-14 text-emerald-600" />
          </div>
          <div className="absolute -bottom-4 -left-4 opacity-25 transform rotate-45">
            <TrendingUp className="h-14 w-14 text-blue-600" />
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-25 transform -rotate-45">
            <Award className="h-14 w-14 text-amber-600" />
          </div>
          
          <div className="flex items-center gap-4 mb-3 justify-center relative z-10">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-300">
              <Activity className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              {isEmployeeView ? "My Dashboard" : isManager() ? "Department Dashboard" : "Dashboard"}
            </h1>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold border border-green-200 dark:border-green-800 shadow-md transform hover:scale-105 transition-transform duration-300">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse ring-2 ring-green-100" />
              Live
            </div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-3 relative z-10 text-lg">
            {isEmployeeView ? "Track your personal performance and activity" : isManager() ? "Monitor your department's performance and activity" : "Real-time workforce performance monitoring"}
          </p>
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 relative z-10 bg-gray-50 dark:bg-slate-800/50 px-4 py-2 rounded-full border border-gray-200 dark:border-slate-700">
            <Calendar className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            <span className="text-sm font-semibold">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="text-gray-400 dark:text-gray-500">•</span>
            <span className="text-sm font-semibold">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Employee Setup Notice */}
      {isEmployee() && !userRole.employee_id && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 mb-2">Employee Profile Setup Required</h3>
              <p className="text-amber-700 mb-4">
                Your account needs to be linked to an employee profile to track your performance. Please contact your administrator to create your employee record.
              </p>
              <div className="bg-amber-100 rounded-lg p-4">
                <p className="text-sm text-amber-800 font-medium mb-1">What you need:</p>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• An employee record created in the system</li>
                  <li>• Assignment to a department and role</li>
                  <li>• Link to your user account</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid - Different for employees vs admins/managers */}
      {isEmployeeView ? (
        // Employee-specific stats
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="My Tasks" 
            value={taskLogs?.length || 0} 
            icon={<CheckCircle className="h-6 w-6 text-white" />}
            trend="Total completed"
            gradient="from-blue-500 to-cyan-400"
          />
          <StatCard 
            title="My Performance" 
            value={`${overallPerf}%`}
            icon={<Target className="h-6 w-6 text-white" />}
            trend={overallPerf >= 80 ? "Excellent" : overallPerf > 50 ? "Good" : "Needs improvement"}
            trendUp={overallPerf >= 80}
            gradient="from-emerald-500 to-teal-400"
          />
          <StatCard 
            title="Target Completed" 
            value={totalCompleted}
            icon={<Zap className="h-6 w-6 text-white" />}
            trend={`of ${totalTarget} target`}
            gradient="from-violet-500 to-fuchsia-400"
          />
          <StatCard 
            title="Avg Scale" 
            value={taskLogs?.length > 0 ? Math.round(taskLogs.reduce((sum, log) => sum + (log.scale || 0), 0) / taskLogs.length) + "%" : "0%"}
            icon={<Award className="h-6 w-6 text-white" />}
            trend="Quality rating"
            gradient="from-amber-500 to-orange-400"
          />
        </div>
      ) : (
        // Admin/Manager stats
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Companies" 
            value={companies?.length || 0} 
            icon={<Building2 className="h-6 w-6 text-white" />}
            trend="Total organizations"
            gradient="from-blue-500 to-cyan-400"
            to="/companies"
          />
          <StatCard 
            title="Departments" 
            value={departments?.length || 0} 
            icon={<Layers className="h-6 w-6 text-white" />}
            trend="Active departments"
            gradient="from-violet-500 to-fuchsia-400"
            to="/departments"
          />
          <StatCard 
            title="Employees" 
            value={employees?.length || 0} 
            icon={<Users className="h-6 w-6 text-white" />}
            trend="Team members"
            trendUp={true}
            trendValue="+12%"
            gradient="from-emerald-500 to-teal-400"
            to="/employees"
          />
          <StatCard 
            title="Performance" 
            value={`${overallPerf}%`}
            icon={<Target className="h-6 w-6 text-white" />}
            trend={overallPerf >= 80 ? "On track" : overallPerf > 0 ? "Needs attention" : "No data"}
            trendUp={overallPerf >= 80}
            trendValue={overallPerf >= 80 ? "Good" : overallPerf > 50 ? "Fair" : "Low"}
            gradient="from-amber-500 to-orange-400"
          />
        </div>
      )}

      {/* Charts Row - Different for employees vs admins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isEmployeeView ? (
          // Employee-specific charts
          <>
            {/* Personal Performance Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-violet-500" />
                    My Performance Trend
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your task completion over time</p>
                </div>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="h-2 w-2 rounded-full bg-violet-500" />
                    Completed
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Target
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="completed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="target" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 12, fill: "#6b7280" }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: "#6b7280" }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip
                    contentStyle={{ 
                      background: "white", 
                      border: "1px solid #e5e7eb", 
                      borderRadius: "12px", 
                      fontSize: 12, 
                      boxShadow: "0 10px 40px rgba(0,0,0,0.1)"
                    }}
                  />
                  <Area type="monotone" dataKey="completed" stroke="#8b5cf6" fillOpacity={1} fill="url(#completed)" strokeWidth={2} />
                  <Area type="monotone" dataKey="target" stroke="#f59e0b" fillOpacity={1} fill="url(#target)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Personal Activity Summary */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-500" />
                    My Activity
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Personal task summary</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="text-center py-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-100/50 dark:border-blue-800/30">
                  <p className="text-5xl font-bold text-gray-900 dark:text-white tabular-nums">{taskLogs?.length || 0}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">Total Tasks</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center border border-emerald-100 dark:border-emerald-800/30">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{totalCompleted}</p>
                    <p className="text-xs uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70 font-semibold mt-1">Done</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4 text-center border border-amber-100 dark:border-amber-800/30">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{overallPerf}%</p>
                    <p className="text-xs uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70 font-semibold mt-1">Rate</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Admin charts (original)
          <>
            {/* Department Performance */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-violet-500" />
                    Department Performance
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Completion rate by department</p>
                </div>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="h-2 w-2 rounded-full bg-violet-500" />
                    Current
                  </span>
                </div>
              </div>
              {hasDeptData ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={deptPerf} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12, fill: "#6b7280" }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: "#6b7280" }} 
                      domain={[0, 100]} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Tooltip
                      contentStyle={{ 
                        background: "white", 
                        border: "1px solid #e5e7eb", 
                        borderRadius: "12px", 
                        fontSize: 12, 
                        boxShadow: "0 10px 40px rgba(0,0,0,0.1)"
                      }}
                      formatter={(value: number) => [`${value}%`, "Performance"]}
                      cursor={{ fill: "#f3f4f6", radius: 6 }}
                    />
                    <Bar dataKey="performance" radius={[8, 8, 0, 0]} maxBarSize={50}>
                      {deptPerf.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="Log tasks to see department performance" />
              )}
            </div>

            {/* Activity Summary */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Activity Summary
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Task completion overview</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="text-center py-6 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 rounded-xl border border-violet-100/50 dark:border-violet-800/30">
                  <p className="text-5xl font-bold text-gray-900 dark:text-white tabular-nums">{taskLogs?.length || 0}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">Total Entries</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center border border-emerald-100 dark:border-emerald-800/30">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{totalCompleted}</p>
                    <p className="text-xs uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70 font-semibold mt-1">Completed</p>
                  </div>
                  <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 p-4 text-center border border-violet-100 dark:border-violet-800/30">
                    <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 tabular-nums">{totalTarget}</p>
                    <p className="text-xs uppercase tracking-wider text-violet-600/70 dark:text-violet-400/70 font-semibold mt-1">Target</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Weekly Trend */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Weekly Performance Trend
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Task completion over the week ({selectedWeekRange.startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {selectedWeekRange.endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4, 5].map((week) => (
              <button
                key={week}
                onClick={() => setSelectedMonthWeek(week)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  selectedMonthWeek === week 
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border border-violet-200 dark:border-violet-800" 
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400 dark:hover:bg-slate-700"
                )}
              >
                Week {week}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={weeklyData}>
            <defs>
              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ 
                background: "white", 
                border: "1px solid #e5e7eb", 
                borderRadius: "12px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.1)"
              }}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0]?.payload;
                return (
                  <div className="p-3">
                    <p className="font-semibold text-gray-900 mb-2">{label}</p>
                    <p className="text-sm text-violet-600 mb-1">
                      Completed: <span className="font-medium">{data?.completed || 0}</span>
                    </p>
                    <p className="text-sm text-cyan-600 mb-2">
                      Target: <span className="font-medium">{data?.target || 0}</span>
                    </p>
                    {data?.departments && Object.keys(data.departments).length > 0 && (
                      <>
                        <div className="border-t border-gray-100 my-2" />
                        <p className="text-xs text-gray-500 font-medium mb-1">Departments:</p>
                        <div className="space-y-1">
                          {Object.entries(data.departments)
                            .sort(([,a], [,b]) => (b as number) - (a as number))
                            .slice(0, 4)
                            .map(([dept, count]) => (
                              <div key={dept} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 truncate max-w-[100px]">{dept}</span>
                                <span className="font-medium text-gray-900 ml-2">{count as number}</span>
                              </div>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="completed" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" />
            <Line type="monotone" dataKey="target" stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Live Activity */}
      {/* (Live Activity merged into Recent Activity below) */}

      {/* Admin-only: Time Management Sheet */}
      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Top Performers
            </h2>
            <span className="text-xs text-gray-400">Based on completion rate</span>
          </div>
          {empPerf.length > 0 ? (
            <div className="space-y-3">
              {empPerf.slice(0, 5).map((emp, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                    i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-400 text-white" :
                    i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white" :
                    i === 2 ? "bg-gradient-to-br from-orange-300 to-orange-400 text-white" :
                    "bg-gray-100 text-gray-600"
                  )}>
                    {i + 1}
                  </div>
                  <EmployeeAvatarWithPreview
                    name={emp.name}
                    imageUrl={emp.imageUrl}
                    className="h-10 w-10"
                    textClassName="text-sm font-semibold"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{emp.name}</p>
                    <p className="text-xs text-gray-500">{emp.role} · {emp.logs} entries</p>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "text-sm font-bold tabular-nums",
                      emp.perf >= 100 ? "text-emerald-600" : emp.perf >= 70 ? "text-amber-600" : "text-red-500"
                    )}>
                      {emp.perf}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No employee data yet" />
          )}
        </div>

        {/* Recent Logs */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-base font-semibold text-gray-900 truncate">Recent Activity</h2>
                <span className="text-xs text-gray-500 whitespace-nowrap">Live task logs</span>
              </div>
            </div>

            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
              <Select
                value={liveDeptFilter}
                onValueChange={(value) => setLiveDeptFilter(value)}
                disabled={employeePreviewReadOnly}
              >
                <SelectTrigger className="h-8 w-36 text-[11px] shrink-0 bg-slate-50/80 border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-0 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:border-cyan-300">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments?.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={livePeriodFilter}
                onValueChange={setLivePeriodFilter}
                disabled={employeePreviewReadOnly}
              >
                <SelectTrigger className="h-8 w-40 text-[11px] shrink-0 bg-cyan-50/70 border-cyan-200/80 hover:bg-cyan-50 hover:border-cyan-300 focus:ring-0 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:border-cyan-300">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last7">Last 7 days</SelectItem>
                  <SelectItem value="thisMonth">This month</SelectItem>
                  <SelectItem value="lastMonth">Last month</SelectItem>
                </SelectContent>
              </Select>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/70 text-emerald-700 text-[11px] font-semibold shrink-0 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
          </div>

          {liveActivityLogs.length > 0 ? (
            <div className="space-y-0 max-h-[360px] overflow-y-auto scrollbar-hide">
              {liveActivityLogs.slice(0, 20).map((log: any) => {
                const target = log.functions?.target_value || 0;
                const pct = target > 0 ? Math.round((log.count / target) * 100) : 0;
                return (
                  <div key={log.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <EmployeeAvatarWithPreview
                        name={log.employees?.name}
                        imageUrl={log.employees?.profile_photo_url}
                        className="h-9 w-9 rounded-lg"
                        textClassName="text-xs font-bold uppercase"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{log.employees?.name || "—"}</p>
                        <p className="text-xs text-gray-500">
                          {log.functions?.function_name || "—"} • {log.log_date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-medium text-gray-700">
                        {log.count}/{target}
                      </p>
                      <div className="flex items-center gap-2 justify-end mt-1">
                        <div className="w-16 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 tabular-nums w-8">{pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState message="No live activity for selected filters" />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[260px] text-gray-400 bg-gray-50 rounded-xl">
      <Target className="h-10 w-10 mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <Sparkles className="h-10 w-10 mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
