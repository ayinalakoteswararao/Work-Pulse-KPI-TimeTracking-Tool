import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Calendar,
  Award,
  AlertTriangle,
  ArrowLeft,
  LogOut,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  User,
  Briefcase,
  Layers,
  Hash,
  DollarSign,
  Star,
  ChevronLeft,
  Download,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { KPIPerformanceSummaryWithRelations, KPIDashboardData } from "@/types/kpi";
import { cn, getTargetNumber } from "@/lib/utils";
import EmployeeAvatarWithPreview from "@/components/EmployeeAvatarWithPreview";

const clampPercentage = (value: number | null | undefined) => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

export default function KPIDashboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin, isManager, isEmployee, userRole, user } = useAuth();
  const previewEmployeeId = searchParams.get("employee");
  const isManagingAsEmployee = (isAdmin() || isManager()) && !!previewEmployeeId;
  const employeePreviewReadOnly = isManagingAsEmployee;
  const previewKpiFilterKey = `${previewEmployeeId ?? ""}|${searchParams.get("previewDept") ?? ""}|${searchParams.get("previewRole") ?? ""}`;
  const [selectedPeriod, setSelectedPeriod] = useState("yesterday");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [performanceType, setPerformanceType] = useState<"count" | "revenue">("count");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [performanceScoreFilter, setPerformanceScoreFilter] = useState<"all" | "excellent" | "good" | "average" | "poor">("all");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isManagingAsEmployee) return;
    const pd = searchParams.get("previewDept");
    const pr = searchParams.get("previewRole");
    if (pd) setSelectedDepartment(pd);
    if (pr) setSelectedRole(pr);
  }, [isManagingAsEmployee, previewKpiFilterKey]);

  // First fetch manager's departments (needed for other queries)
  const { data: userDepartments } = useQuery({
    queryKey: ["user_departments", user?.id],
    queryFn: async () => {
      if (!isManager() || !user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("employee_id, employees!inner(department_id)")
        .eq("user_id", user.id)
        .eq("role", "manager");
      if (error) throw error;
      return data?.map((d: any) => d.employees?.department_id).filter(Boolean) || [];
    },
    enabled: isManager(),
  });

  // Fetch employee's department
  const { data: employeeDepartment } = useQuery({
    queryKey: ["employee_department", userRole.employee_id],
    queryFn: async () => {
      if (!isEmployee() || !userRole.employee_id) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("department_id, departments!inner(id, name, companies(name))")
        .eq("id", userRole.employee_id)
        .single();
      if (error) throw error;
      return data as { department_id: string; departments: { id: string; name: string; companies?: { name: string } } };
    },
    enabled: isEmployee() && !!userRole.employee_id,
  });

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["kpi-dashboard", selectedPeriod, selectedDepartment, selectedRole, userDepartments],
    queryFn: async (): Promise<KPIDashboardData> => {
      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      switch (selectedPeriod) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "yesterday":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
          break;
        case "current_week":
          startDate = new Date(now.setDate(now.getDate() - now.getDay()));
          startDate.setHours(0, 0, 0, 0);
          break;
        case "current_month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "last_month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Build query filters
      let query = (supabase as any)
        .from("kpi_performance_summary")
        .select(`
          *,
          kpis!inner(
            *,
            functions!inner(
              function_name,
              roles!inner(
                role_name,
                departments!inner(
                  name,
                  companies(name)
                )
              )
            )
          ),
          employees!inner(
            name,
            email,
            profile_photo_url,
            roles!inner(
              role_name,
              departments!inner(
                name,
                companies(name)
              )
            )
          )
        `)
        .gte("period_start", formatDate(startDate))
        .lte("period_end", formatDate(endDate))
        .order("final_score", { ascending: false });

      // Apply department filter - for managers, filter by their departments
      if (isManager() && userDepartments && userDepartments.length > 0) {
        if (selectedDepartment) {
          // If specific department selected, check if it's in manager's list
          if (userDepartments.includes(selectedDepartment)) {
            query = query.eq("kpis.functions.roles.departments.id", selectedDepartment);
          }
        } else {
          // Filter by all manager's departments
          query = query.in("kpis.functions.roles.departments.id", userDepartments);
        }
      } else if (selectedDepartment) {
        query = query.eq("kpis.functions.roles.departments.id", selectedDepartment);
      }
      
      if (selectedRole) {
        query = query.eq("kpis.functions.roles.id", selectedRole);
      }

      const { data: summaries, error: summaryError } = await query;
      if (summaryError) throw summaryError;

      // Get all KPIs for stats
      const { data: allKPIs, error: kpiError } = await (supabase as any).from("kpis").select("id");
      if (kpiError) throw kpiError;

      // Get unique employees
      const { data: employees, error: employeeError } = await supabase
        .from("employees")
        .select("id, name");
      if (employeeError) throw employeeError;

      // Normalize summary percentages so UI never shows values above 100%.
      const summariesWithRelations = ((summaries || []) as KPIPerformanceSummaryWithRelations[]).map((s) => ({
        ...s,
        count_performance: clampPercentage(s.count_performance),
        revenue_performance: clampPercentage(s.revenue_performance),
        final_score: clampPercentage(s.final_score),
      }));
      
      const topPerformers = summariesWithRelations
        .slice(0, 5)
        .map(s => ({
          employee_name: s.employees?.name || "Unknown",
          final_score: s.final_score,
          kpi_summary: s.kpis?.kpi_summary || "KPI",
        }));

      const underperformers = summariesWithRelations
        .filter(s => s.final_score < 70)
        .slice(0, 5)
        .map(s => ({
          employee_name: s.employees?.name || "Unknown",
          final_score: s.final_score,
          kpi_summary: s.kpis?.kpi_summary || "KPI",
        }));

      const averageScore = summariesWithRelations.length > 0
        ? summariesWithRelations.reduce((sum, s) => sum + s.final_score, 0) / summariesWithRelations.length
        : 0;

      return {
        kpis: [], // We'll fetch this separately if needed
        performanceSummaries: summariesWithRelations,
        topPerformers,
        underperformers,
        overallPerformance: {
          averageScore,
          totalEmployees: employees?.length || 0,
          totalKPIs: allKPIs?.length || 0,
        },
      };
    },
    enabled: !isManager() || (userDepartments !== undefined),
  });

  const { data: departments } = useQuery({
    queryKey: ["departments", userDepartments, employeeDepartment],
    queryFn: async () => {
      let query = (supabase as any).from("departments").select("*, companies(name)").order("name");
      
      // If manager, show all their departments
      if (isManager() && userDepartments && userDepartments.length > 0) {
        query = query.in("id", userDepartments);
      }
      // If employee, show only their department
      else if (isEmployee() && employeeDepartment) {
        query = query.eq("id", employeeDepartment.department_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as { id: string; name: string; companies?: { name: string } }[];
    },
    enabled: (!isManager() || (userDepartments !== undefined)) && (!isEmployee() || (employeeDepartment !== undefined)),
  });

  const { data: roles } = useQuery({
    queryKey: ["roles", selectedDepartment],
    queryFn: async () => {
      if (!selectedDepartment) return [];
      const { data, error } = await (supabase as any)
        .from("roles")
        .select("*, departments(name, companies(name))")
        .eq("department_id", selectedDepartment)
        .order("role_name");
      if (error) throw error;
      return data as { id: string; role_name: string; departments?: { name: string; companies?: { name: string } } }[];
    },
    enabled: !!selectedDepartment,
  });

  // Pre-select manager's or employee's department (auto-select if only one department)
  useEffect(() => {
    if (isManager() && departments && departments.length > 0 && !selectedDepartment) {
      // If manager has only one department, auto-select it
      if (departments.length === 1) {
        setSelectedDepartment(departments[0].id);
      } else if (userRole.department_id) {
        // Otherwise use the primary department from userRole
        setSelectedDepartment(userRole.department_id);
      }
    }
    // Auto-select employee's department
    if (isEmployee() && employeeDepartment && !selectedDepartment) {
      setSelectedDepartment(employeeDepartment.department_id);
    }
  }, [isManager, isEmployee, userRole.department_id, departments, employeeDepartment, selectedDepartment]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 70) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <TrendingUp className="h-4 w-4" />;
    if (score >= 70) return <Target className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  // Filter and sort performance summaries
  const sortedAndFilteredSummaries = useMemo(() => {
    let data = dashboardData?.performanceSummaries.filter(summary => {
      // Apply performance type filter - only show KPIs that have a target for the selected type
      if (performanceType === "revenue" && (summary.kpis?.target_revenue ?? 0) === 0) return false;
      if (performanceType === "count" && getTargetNumber(summary.kpis?.target_count) === 0) return false;

      // Apply search filter
      const searchTerms = searchQuery.toLowerCase();
      const matchesSearch = 
        summary.employees?.name?.toLowerCase().includes(searchTerms) ||
        summary.kpis?.kpi_summary?.toLowerCase().includes(searchTerms) ||
        summary.kpis?.functions?.function_name?.toLowerCase().includes(searchTerms);
      
      if (!matchesSearch) return false;

      if (performanceScoreFilter === "all") return true;
      
      // Determine which score to use for the performance category filter
      const relevantScore = performanceType === "count" ? summary.count_performance : summary.revenue_performance;
      
      if (performanceScoreFilter === "excellent") return relevantScore >= 90;
      if (performanceScoreFilter === "good") return relevantScore >= 70 && relevantScore < 90;
      if (performanceScoreFilter === "average") return relevantScore >= 50 && relevantScore < 70;
      if (performanceScoreFilter === "poor") return relevantScore < 50;
      return true;
    }) || [];

    if (sortConfig) {
      data = [...data].sort((a, b) => {
        let aValue, bValue;
        switch (sortConfig.key) {
          case 'employee':
            aValue = a.employees?.name || '';
            bValue = b.employees?.name || '';
            break;
          case 'kpi':
            aValue = a.kpis?.kpi_summary || '';
            bValue = b.kpis?.kpi_summary || '';
            break;
          case 'function':
            aValue = a.kpis?.functions?.function_name || '';
            bValue = b.kpis?.functions?.function_name || '';
            break;
          case 'score':
            aValue = performanceType === "count" ? a.count_performance : a.revenue_performance;
            bValue = performanceType === "count" ? b.count_performance : b.revenue_performance;
            break;
          case 'date':
            aValue = a.period_start;
            bValue = b.period_start;
            break;
          default:
            return 0;
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [dashboardData?.performanceSummaries, searchQuery, performanceScoreFilter, performanceType, sortConfig]);

  // Calculate performance category counts
  const performanceCounts = {
    all: sortedAndFilteredSummaries.length,
    excellent: sortedAndFilteredSummaries.filter(s => (performanceType === "count" ? s.count_performance : s.revenue_performance) >= 90).length,
    good: sortedAndFilteredSummaries.filter(s => (performanceType === "count" ? s.count_performance : s.revenue_performance) >= 70 && (performanceType === "count" ? s.count_performance : s.revenue_performance) < 90).length,
    average: sortedAndFilteredSummaries.filter(s => (performanceType === "count" ? s.count_performance : s.revenue_performance) >= 50 && (performanceType === "count" ? s.count_performance : s.revenue_performance) < 70).length,
    poor: sortedAndFilteredSummaries.filter(s => (performanceType === "count" ? s.count_performance : s.revenue_performance) < 50).length,
  };

  // Derived metrics based on selected performance type (aggregated per employee so one person
  // is not listed twice with different % — each row is still one KPI×employee summary in the DB)
  const activeMetrics = useMemo(() => {
    if (!dashboardData?.performanceSummaries) return null;

    // Filter summaries that have the selected performance type target
    const relevantSummaries = dashboardData.performanceSummaries.filter(s =>
      performanceType === "count" ? getTargetNumber(s.kpis?.target_count) > 0 : (s.kpis?.target_revenue ?? 0) > 0
    );

    const averageScore = relevantSummaries.length > 0
      ? relevantSummaries.reduce((sum, s) => sum + (performanceType === "count" ? s.count_performance : s.revenue_performance), 0) / relevantSummaries.length
      : 0;

    type Agg = {
      employee_id: string;
      employee_name: string;
      scores: number[];
      summaries: KPIPerformanceSummaryWithRelations[];
    };
    const byEmployee = new Map<string, Agg>();
    for (const s of relevantSummaries) {
      const id = s.employee_id;
      const score = performanceType === "count" ? s.count_performance : s.revenue_performance;
      if (!byEmployee.has(id)) {
        byEmployee.set(id, {
          employee_id: id,
          employee_name: s.employees?.name || "Unknown",
          scores: [],
          summaries: [],
        });
      }
      const g = byEmployee.get(id)!;
      g.scores.push(score);
      g.summaries.push(s);
    }

    const aggregated = [...byEmployee.values()].map((g) => {
      const avgScore = g.scores.reduce((a, b) => a + b, 0) / g.scores.length;
      const minScore = Math.min(...g.scores);
      let minIdx = 0;
      for (let i = 1; i < g.scores.length; i++) {
        if (g.scores[i] < g.scores[minIdx]) minIdx = i;
      }
      const weakest = g.summaries[minIdx];
      const weakestLabel =
        weakest?.kpis?.functions?.function_name ||
        weakest?.kpis?.kpi_summary ||
        "KPI";
      return {
        employee_id: g.employee_id,
        employee_name: g.employee_name,
        avgScore,
        minScore,
        kpiCount: g.scores.length,
        weakestLabel,
      };
    });

    const topFiveByAvg = [...aggregated].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);
    const topPerformerIds = new Set(topFiveByAvg.map((a) => a.employee_id));

    const topPerformers = topFiveByAvg.map((a) => ({
      employee_id: a.employee_id,
      employee_name: a.employee_name,
      score: a.avgScore,
      detail:
        a.kpiCount > 1
          ? `Avg across ${a.kpiCount} KPIs`
          : a.weakestLabel,
    }));

    const underperformers = aggregated
      .filter((a) => a.minScore < 70 && !topPerformerIds.has(a.employee_id))
      .sort((a, b) => a.minScore - b.minScore)
      .slice(0, 5)
      .map((a) => ({
        employee_id: a.employee_id,
        employee_name: a.employee_name,
        score: a.minScore,
        detail:
          a.kpiCount > 1
            ? `Weakest KPI (${a.weakestLabel})`
            : a.weakestLabel,
      }));

    return {
      averageScore,
      topPerformers,
      underperformers,
      totalKPIs: relevantSummaries.length
    };
  }, [dashboardData?.performanceSummaries, performanceType]);

  const getDateRangeDisplay = () => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (selectedPeriod) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "yesterday":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        break;
      case "current_week":
        const currentNow = new Date();
        start = new Date(currentNow.setDate(currentNow.getDate() - currentNow.getDay()));
        start.setHours(0, 0, 0, 0);
        break;
      case "current_month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last_month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const format = (d: Date) => d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${format(start)} — ${format(end)}`;
  };

  const handleSort = (key: string) => {
    if (employeePreviewReadOnly) return;
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    const isActive = sortConfig?.key === columnKey;
    const isAsc = sortConfig?.direction === 'asc';
    return (
      <div className="flex flex-col items-center justify-center ml-1 -space-y-0.5">
        <ChevronUp className={cn(
          "h-3.5 w-3.5 transition-all duration-200",
          isActive && isAsc ? "text-indigo-600" : "text-gray-300"
        )} />
        <ChevronDown className={cn(
          "h-3.5 w-3.5 transition-all duration-200",
          isActive && !isAsc ? "text-indigo-600" : "text-gray-300"
        )} />
      </div>
    );
  };
  const exportToExcel = () => {
    if (!dashboardData?.performanceSummaries || dashboardData.performanceSummaries.length === 0) {
      toast.error("No data available to export");
      return;
    }

    try {
      // Create CSV content
      const headers = [
        'S.No',
        'Date',
        'Employee Name',
        'Role',
        'KPI Summary',
        'Function',
        'Time Tenure',
        'Count Performance (%)',
        'Revenue Performance (%)',
        'Performance Status'
      ];

      const rows = sortedAndFilteredSummaries.map((summary, index) => {
        const score = performanceType === "count" ? summary.count_performance : summary.revenue_performance;
        const status = score >= 90 ? 'Excellent' : 
                     score >= 70 ? 'Good' : 
                     score >= 50 ? 'Average' : 'Poor';
        
        return [
          index + 1,
          summary.period_start || 'Unknown',
          summary.employees?.name || 'Unknown',
          summary.employees?.roles?.role_name || 'Unknown',
          summary.kpis?.kpi_summary || 'Unknown',
          summary.kpis?.functions?.function_name || 'Unknown',
          summary.kpis?.time_tenure === 'day' ? 'Daily' : summary.kpis?.time_tenure === 'week' ? 'Weekly' : summary.kpis?.time_tenure === 'month' ? 'Monthly' : (summary.kpis?.time_tenure || 'Unknown'),
          summary.count_performance || 0,
          summary.revenue_performance || 0,
          status
        ];
      });

      // Convert to CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const fileName = `KPI_${performanceType === 'count' ? 'Count' : 'Revenue'}_Performance_Report_${currentDate}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${sortedAndFilteredSummaries.length} records to Excel`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Loading KPI Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="pt-8 pb-6">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Back button */}
          <div className="w-32">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 transition-all shadow-md shadow-indigo-200 font-medium text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          </div>
          
          {/* Center - Main heading */}
          <div className="flex flex-col items-center text-center flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-400 flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                KPI Dashboard
              </h1>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium border border-green-200 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live
              </div>
            </div>
            <p className="text-gray-500 mb-2 text-sm">Real-time workforce performance monitoring</p>
            <div className="flex items-center gap-2 text-gray-600 text-xs">
              <Calendar className="h-3 w-3" />
              <span className="font-medium">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <span className="text-gray-400">•</span>
              <span className="font-medium">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
          
          {/* Right side - Action buttons */}
          <div className="w-32 flex justify-end">
            <div className="flex items-center gap-3">
              <Button
                onClick={exportToExcel}
                disabled={!dashboardData?.performanceSummaries || dashboardData.performanceSummaries.length === 0 || isEmployee() || employeePreviewReadOnly}
                className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-md"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              {isAdmin() && (
                <Button
                  onClick={() => navigate('/create-kpi')}
                  disabled={employeePreviewReadOnly}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create KPI
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Average Score Card - Blue */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-4 shadow-sm border border-blue-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-bl-full" />
          <div className="absolute top-3 right-3">
            <div className="w-8 h-8 rounded-full bg-blue-100/50 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <div className="flex items-start gap-3 relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div className="pt-1">
              <div className="text-3xl font-bold text-gray-900">
                {activeMetrics?.averageScore.toFixed(1)}%
              </div>
              <div className="text-sm font-medium text-gray-700 mt-0.5">{performanceType === "count" ? "Avg. Count Perf." : "Avg. Revenue Perf."}</div>
              <div className="text-xs text-gray-400 mt-0.5">Based on selection</div>
            </div>
          </div>
        </div>

        {/* Total Employees Card - Purple */}
        <div className="bg-gradient-to-br from-violet-50 to-white rounded-2xl p-4 shadow-sm border border-violet-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-violet-100/50 to-transparent rounded-bl-full" />
          <div className="absolute top-3 right-3">
            <div className="w-8 h-8 rounded-full bg-violet-100/50 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4 text-violet-500" />
            </div>
          </div>
          <div className="flex items-start gap-3 relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-200">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="pt-1">
              <div className="text-3xl font-bold text-gray-900">
                {dashboardData?.overallPerformance.totalEmployees}
              </div>
              <div className="text-sm font-medium text-gray-700 mt-0.5">Employees</div>
              <div className="text-xs text-gray-400 mt-0.5">Active members</div>
            </div>
          </div>
        </div>

        {/* Total KPIs Card - Emerald */}
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-4 shadow-sm border border-emerald-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-emerald-100/50 to-transparent rounded-bl-full" />
          <div className="absolute top-3 right-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100/50 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <div className="flex items-start gap-3 relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-200">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div className="pt-1">
              <div className="text-3xl font-bold text-gray-900">
                {activeMetrics?.totalKPIs}
              </div>
              <div className="text-sm font-medium text-gray-700 mt-0.5">{performanceType === "count" ? "Count KPIs" : "Revenue KPIs"}</div>
              <div className="text-xs text-gray-400 mt-0.5">Active targets</div>
            </div>
          </div>
        </div>

        {/* Performance Records Card - Orange */}
        <div className="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-4 shadow-sm border border-orange-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-orange-100/50 to-transparent rounded-bl-full" />
          <div className="absolute top-3 right-3">
            <div className="w-8 h-8 rounded-full bg-orange-100/50 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4 text-orange-500" />
            </div>
          </div>
          <div className="flex items-start gap-3 relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-200">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div className="pt-1">
              <div className="text-3xl font-bold text-gray-900">
                {dashboardData?.performanceSummaries.length}
              </div>
              <div className="text-sm font-medium text-gray-700 mt-0.5">Records</div>
              <div className="text-xs text-gray-400 mt-0.5">This period</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-600" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeMetrics?.topPerformers.length ? (
                activeMetrics.topPerformers.map((performer, index) => (
                  <div key={performer.employee_id} className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-green-900">{performer.employee_name}</p>
                        <p className="text-sm text-green-700">{performer.detail}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      {performer.score.toFixed(1)}%
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No performance data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Underperformers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeMetrics?.underperformers.length ? (
                activeMetrics.underperformers.map((performer, index) => (
                  <div key={`attention-${performer.employee_id}`} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-bold">
                        !
                      </div>
                      <div>
                        <p className="font-medium text-red-900">{performer.employee_name}</p>
                        <p className="text-sm text-red-700">{performer.detail}</p>
                      </div>
                    </div>
                    <Badge className="bg-red-100 text-red-800 border-red-300">
                      {performer.score.toFixed(1)}%
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">All employees performing well!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Above Performance Details Table */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod} disabled={employeePreviewReadOnly}>
            <SelectTrigger>
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="current_week">This Week</SelectItem>
              <SelectItem value="current_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <Select 
            value={selectedDepartment || "all"} 
            onValueChange={(value) => {
              setSelectedDepartment(value === "all" ? null : value);
              setSelectedRole(null);
            }}
            disabled={isEmployee() || employeePreviewReadOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              {!isEmployee() && <SelectItem value="all">All departments</SelectItem>}
              {departments?.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name} — {d.companies?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <Select value={selectedRole || "all"} onValueChange={(value) => setSelectedRole(value === "all" ? null : value)} disabled={!selectedDepartment || employeePreviewReadOnly}>
            <SelectTrigger>
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roles?.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  {r.role_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <Select value={performanceType} onValueChange={(value: "count" | "revenue") => setPerformanceType(value)} disabled={employeePreviewReadOnly}>
            <SelectTrigger>
              <SelectValue placeholder="Performance type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-cyan-600" />
                  <span>Count Performance</span>
                </div>
              </SelectItem>
              <SelectItem value="revenue">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-violet-600" />
                  <span>Revenue Performance</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[280px]">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search employee or KPI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all shadow-sm hover:border-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Performance Filter Cards - Above Performance Details Table */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* All Records */}
        <button
          type="button"
          disabled={employeePreviewReadOnly}
          onClick={() => setPerformanceScoreFilter("all")}
          className={cn(
            "flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all duration-200",
            performanceScoreFilter === "all"
              ? "bg-slate-800 border-slate-800 text-white shadow-lg"
              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-md"
          )}
        >
          <span className="text-sm font-semibold">All Records</span>
          <span className={cn(
            "text-xs font-bold px-2 py-1 rounded-full",
            performanceScoreFilter === "all" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600"
          )}>
            {performanceCounts.all}
          </span>
        </button>

        {/* Excellent */}
        <button
          type="button"
          disabled={employeePreviewReadOnly}
          onClick={() => setPerformanceScoreFilter(performanceScoreFilter === "excellent" ? "all" : "excellent")}
          className={cn(
            "flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all duration-200",
            performanceScoreFilter === "excellent"
              ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-lg shadow-emerald-100"
              : "bg-emerald-50/50 border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:shadow-md"
          )}
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-semibold">Excellent (90%+)</span>
          </div>
          <span className={cn(
            "text-xs font-bold px-2 py-1 rounded-full",
            performanceScoreFilter === "excellent" ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-700"
          )}>
            {performanceCounts.excellent}
          </span>
        </button>

        {/* Good */}
        <button
          type="button"
          disabled={employeePreviewReadOnly}
          onClick={() => setPerformanceScoreFilter(performanceScoreFilter === "good" ? "all" : "good")}
          className={cn(
            "flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all duration-200",
            performanceScoreFilter === "good"
              ? "bg-blue-50 border-blue-500 text-blue-700 shadow-lg shadow-blue-100"
              : "bg-blue-50/50 border-blue-200 text-blue-700 hover:border-blue-300 hover:shadow-md"
          )}
        >
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="text-sm font-semibold">Good (70-90%)</span>
          </div>
          <span className={cn(
            "text-xs font-bold px-2 py-1 rounded-full",
            performanceScoreFilter === "good" ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-700"
          )}>
            {performanceCounts.good}
          </span>
        </button>

        {/* Average */}
        <button
          type="button"
          disabled={employeePreviewReadOnly}
          onClick={() => setPerformanceScoreFilter(performanceScoreFilter === "average" ? "all" : "average")}
          className={cn(
            "flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all duration-200",
            performanceScoreFilter === "average"
              ? "bg-amber-50 border-amber-500 text-amber-700 shadow-lg shadow-amber-100"
              : "bg-amber-50/50 border-amber-200 text-amber-700 hover:border-amber-300 hover:shadow-md"
          )}
        >
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            <span className="text-sm font-semibold">Average (50-70%)</span>
          </div>
          <span className={cn(
            "text-xs font-bold px-2 py-1 rounded-full",
            performanceScoreFilter === "average" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700"
          )}>
            {performanceCounts.average}
          </span>
        </button>

        {/* Poor */}
        <button
          type="button"
          disabled={employeePreviewReadOnly}
          onClick={() => setPerformanceScoreFilter(performanceScoreFilter === "poor" ? "all" : "poor")}
          className={cn(
            "flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all duration-200",
            performanceScoreFilter === "poor"
              ? "bg-red-50 border-red-500 text-red-700 shadow-lg shadow-red-100"
              : "bg-red-50/50 border-red-200 text-red-700 hover:border-red-300 hover:shadow-md"
          )}
        >
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            <span className="text-sm font-semibold">Poor (&lt;50%)</span>
          </div>
          <span className={cn(
            "text-xs font-bold px-2 py-1 rounded-full",
            performanceScoreFilter === "poor" ? "bg-red-500 text-white" : "bg-red-100 text-red-700"
          )}>
            {performanceCounts.poor}
          </span>
        </button>
      </div>

      {/* Detailed Performance Table */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-50/50 via-purple-50/50 to-white/50 border-b border-gray-100 py-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg font-bold text-gray-900">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span>Performance Details</span>
                <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-tighter mt-0.5">
                  Showing records from {getDateRangeDisplay()}
                </span>
              </div>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white border-indigo-100 text-indigo-700 px-3 py-1 text-xs font-semibold rounded-lg shadow-sm">
                {sortedAndFilteredSummaries.length} Records
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            <table className="w-full sticky top-0 z-20">
              <thead className="sticky top-0 z-20 bg-gradient-to-r from-gray-50 to-white border-b-2 border-gray-200 shadow-sm">
                <tr>
                  <th className="text-left py-3 px-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center">
                        <Hash className="h-3.5 w-3.5 text-gray-600" />
                      </div>
                      S.No
                    </div>
                  </th>
                  <th className={cn("text-left py-4 px-4 transition-all duration-200", employeePreviewReadOnly ? "cursor-default" : "cursor-pointer hover:bg-gray-100/50")} onClick={() => { if (!employeePreviewReadOnly) handleSort('date'); }}>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">
                      Date
                      <SortIcon columnKey="date" />
                    </div>
                  </th>
                  <th className={cn("text-left py-4 px-4 transition-all duration-200", employeePreviewReadOnly ? "cursor-default" : "cursor-pointer hover:bg-gray-100/50")} onClick={() => { if (!employeePreviewReadOnly) handleSort('employee'); }}>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">
                      Employee
                      <SortIcon columnKey="employee" />
                    </div>
                  </th>
                  <th className={cn("text-left py-4 px-4 transition-all duration-200", employeePreviewReadOnly ? "cursor-default" : "cursor-pointer hover:bg-gray-100/50")} onClick={() => { if (!employeePreviewReadOnly) handleSort('kpi'); }}>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">
                      KPI Details
                      <SortIcon columnKey="kpi" />
                    </div>
                  </th>
                  <th className={cn("text-left py-4 px-4 transition-all duration-200", employeePreviewReadOnly ? "cursor-default" : "cursor-pointer hover:bg-gray-100/50")} onClick={() => { if (!employeePreviewReadOnly) handleSort('function'); }}>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">
                      Function
                      <SortIcon columnKey="function" />
                    </div>
                  </th>
                  <th className={cn("text-left py-4 px-4 transition-all duration-200", employeePreviewReadOnly ? "cursor-default" : "cursor-pointer hover:bg-gray-100/50")} onClick={() => { if (!employeePreviewReadOnly) handleSort('score'); }}>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">
                      {performanceType === "count" ? "Count Perf." : "Revenue Perf."}
                      <SortIcon columnKey="score" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedAndFilteredSummaries?.map((summary, index) => (
                  <tr key={summary.id} className={cn(
                    "group transition-all duration-300 ease-in-out hover:bg-indigo-50/50 hover:shadow-sm",
                    index % 2 === 0 ? "bg-white" : "bg-gray-50/10"
                  )}>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center">
                        <div className="w-7 h-7 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center text-[11px] font-bold border border-gray-100 transition-colors group-hover:bg-white group-hover:border-indigo-200 group-hover:text-indigo-500">
                          {index + 1}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex flex-col items-start">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 text-[11px] font-bold border border-slate-100 transition-all group-hover:bg-white group-hover:border-indigo-200 group-hover:text-indigo-600">
                          <Calendar className="h-3 w-3" />
                          {new Date(summary.period_start).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <EmployeeAvatarWithPreview
                            name={summary.employees?.name}
                            imageUrl={summary.employees?.profile_photo_url}
                            letters={1}
                            bgClassName="bg-gradient-to-br from-indigo-400 to-blue-500"
                            className="w-11 h-11 rounded-2xl shadow-sm transition-transform group-hover:scale-105"
                            textClassName="text-sm font-bold"
                          />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm" title="Active" />
                        </div>
                        <div className="flex flex-col">
                          <p className="font-bold text-gray-900 text-[14px] leading-tight mb-0.5">{summary.employees?.name}</p>
                          <p className="text-[11px] text-indigo-500 font-bold uppercase tracking-wider">{summary.employees?.roles?.role_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 min-w-[200px]">
                      <div className="space-y-1.5">
                        <p className="text-[13px] font-bold text-gray-800 leading-tight group-hover:text-indigo-700 transition-colors italic">{summary.kpis?.kpi_summary}</p>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
                            summary.kpis?.time_tenure === 'day' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                            summary.kpis?.time_tenure === 'week' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                            "bg-purple-50 text-purple-600 border border-purple-100"
                          )}>
                            {summary.kpis?.time_tenure === 'day' ? 'Daily' : 
                             summary.kpis?.time_tenure === 'week' ? 'Weekly' : 
                             summary.kpis?.time_tenure === 'month' ? 'Monthly' : 
                             summary.kpis?.time_tenure}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-50 text-slate-500 border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 group-hover:text-indigo-600 transition-all">
                        <Briefcase className="h-3 w-3" />
                        {summary.kpis?.functions?.function_name}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-3 min-w-[160px]">
                        {/* Count Performance - Only show if target_count exists and is > 0 */}
                        {getTargetNumber(summary.kpis?.target_count) > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2 px-1">
                              <span className="text-[9px] font-black uppercase tracking-wider text-cyan-600">Count</span>
                              <span className="text-[10px] font-black text-cyan-600">{summary.count_performance.toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-100/50">
                              <div 
                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-1000 ease-out"
                                style={{ width: `${Math.min(summary.count_performance, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Revenue Performance - Only show if target_revenue is > 0 */}
                        {(summary.kpis?.target_revenue ?? 0) > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2 px-1">
                              <span className="text-[9px] font-black uppercase tracking-wider text-violet-600">Revenue</span>
                              <span className="text-[10px] font-black text-violet-600">{summary.revenue_performance.toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-100/50">
                              <div 
                                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-600 transition-all duration-1000 ease-out"
                                style={{ width: `${Math.min(summary.revenue_performance, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Final Score Badge */}
                        <div className="pt-1">
                          <div className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border",
                            summary.final_score >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            summary.final_score >= 70 ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-red-50 text-red-700 border-red-200"
                          )}>
                            {getScoreIcon(summary.final_score)}
                            <span>Final: {summary.final_score.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {!sortedAndFilteredSummaries?.length && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4 shadow-inner">
                  <BarChart3 className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-sm font-medium">No performance data available</p>
                <p className="text-xs text-gray-400 mt-1">for the selected period</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
