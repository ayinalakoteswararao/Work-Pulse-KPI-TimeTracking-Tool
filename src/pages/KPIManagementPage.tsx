import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { KPIWithRelations } from "@/types/kpi";
import { cn, getTargetNumber } from "@/lib/utils";
import { 
  Target, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Building2,
  Users,
  Briefcase,
  ChevronLeft,
  BarChart3,
  Clock,
  Layers,
  Sun,
  Moon,
  Grid3X3,
  List,
} from "lucide-react";

export default function KPIManagementPage() {
  const navigate = useNavigate();
  const { isAdmin, isManager, isEmployee, userRole, signOut, user } = useAuth();
  const qc = useQueryClient();
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedTenure, setSelectedTenure] = useState<string | null>(null);
  const [selectedKPI, setSelectedKPI] = useState<KPIWithRelations | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  
  // Fetch all manager's departments (for managers with multiple departments)
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

  const { data: kpis, isLoading } = useQuery({
    queryKey: ["kpis-management", selectedDepartment, selectedRole, managerDepartments],
    queryFn: async (): Promise<KPIWithRelations[]> => {
      let query = (supabase as any)
        .from("kpis")
        .select(`
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
        `)
        .order("created_at", { ascending: false });

      // Apply department filter - for managers, filter by their departments
      if (isManager() && managerDepartments && managerDepartments.length > 0) {
        if (selectedDepartment) {
          // If specific department selected, check if it's in manager's list
          if (managerDepartments.includes(selectedDepartment)) {
            query = query.eq("functions.roles.departments.id", selectedDepartment);
          }
        } else {
          // Filter by all manager's departments
          query = query.in("functions.roles.departments.id", managerDepartments);
        }
      } else if (selectedDepartment) {
        query = query.eq("functions.roles.departments.id", selectedDepartment);
      }
      
      if (selectedRole) {
        query = query.eq("functions.roles.id", selectedRole);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as KPIWithRelations[];
    },
    enabled: !isManager() || (managerDepartments !== undefined),
  });

  const { data: departments } = useQuery({
    queryKey: ["departments", managerDepartments],
    queryFn: async () => {
      let query = (supabase as any).from("departments").select("*, companies(name)").order("name");
      
      // If manager, only show their departments
      if (isManager() && managerDepartments && managerDepartments.length > 0) {
        query = query.in("id", managerDepartments);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as { id: string; name: string; companies?: { name: string } }[];
    },
    enabled: !isManager() || (managerDepartments !== undefined),
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

  // Pre-select manager's department (auto-select if only one department)
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
  }, [isManager, userRole.department_id, departments, selectedDepartment]);

  const deleteKPI = useMutation({
    mutationFn: async (kpiId: string) => {
      const { error } = await (supabase as any).from("kpis").delete().eq("id", kpiId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpis-management"] });
      toast.success("KPI deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete KPI");
    },
  });

  const getMeasurementType = (kpi: KPIWithRelations | null | undefined) => {
    if (!kpi) return "Unknown";
    const targetCountNum = getTargetNumber(kpi.target_count);
    if (targetCountNum > 0 && kpi.target_revenue > 0) {
      return "Both";
    } else if (targetCountNum > 0) {
      return "Count";
    } else if (kpi.target_revenue > 0) {
      return "Revenue";
    }
    return "Unknown";
  };

  const getMeasurementColor = (type: string) => {
    switch (type) {
      case "Count": return "bg-blue-100 text-blue-800 border-blue-300";
      case "Revenue": return "bg-green-100 text-green-800 border-green-300";
      case "Both": return "bg-purple-100 text-purple-800 border-purple-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getTenureColor = (tenure: string) => {
    switch (tenure) {
      case "day": return "bg-orange-100 text-orange-800 border-orange-300";
      case "week": return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case "month": return "bg-emerald-100 text-emerald-800 border-emerald-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const renderTargetCount = (kpi: KPIWithRelations) => {
    // Heuristic: temporary default stored as 1 when target was omitted during creation.
    // If target_revenue is 0 and final_target is default 100 and target_count === 1,
    // treat as "not set" for display.
    if ((kpi.target_count === 1 || kpi.target_count === undefined) && (kpi.target_revenue === 0 || kpi.target_revenue === undefined) && (kpi.final_target === 100 || kpi.final_target === undefined)) {
      return '—';
    }
    return kpi.target_count_display || kpi.target_count?.toLocaleString() || '—';
  };

  // Ensure switching to table view refetches the KPI list to show updated data
  const handleSetViewMode = (mode: "cards" | "table") => {
    setViewMode(mode);
    if (mode === "table") {
      qc.invalidateQueries({ queryKey: ["kpis-management"] });
    }
  };

  // Filter KPIs by selected tenure
  const filteredKpis = selectedTenure
    ? kpis?.filter(kpi => kpi.time_tenure === selectedTenure)
    : kpis;

  // Calculate stats
  const totalKpis = kpis?.length || 0;
  const dailyKpis = kpis?.filter(k => k.time_tenure === "day").length || 0;
  const weeklyKpis = kpis?.filter(k => k.time_tenure === "week").length || 0;
  const monthlyKpis = kpis?.filter(k => k.time_tenure === "month").length || 0;

  const statsCards = [
    {
      label: "Total KPIs",
      value: totalKpis,
      icon: Layers,
      color: "from-violet-500 to-purple-500",
      bgColor: "bg-violet-50",
      tenure: null,
    },
    {
      label: "Daily",
      value: dailyKpis,
      icon: Sun,
      color: "from-orange-500 to-amber-500",
      bgColor: "bg-orange-50",
      tenure: "day",
    },
    {
      label: "Weekly",
      value: weeklyKpis,
      icon: Clock,
      color: "from-indigo-500 to-blue-500",
      bgColor: "bg-indigo-50",
      tenure: "week",
    },
    {
      label: "Monthly",
      value: monthlyKpis,
      icon: Moon,
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-50",
      tenure: "month",
    },
  ];

  if (!isAdmin() && !isManager()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Access denied. Admin or Manager privileges required.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Target className="h-12 w-12 text-gray-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Loading KPIs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      {/* Header */}
      <div className="grid grid-cols-3 items-center gap-4">
        {/* Left - Back Button */}
        <div className="flex justify-start">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 transition-all shadow-md shadow-indigo-200 font-medium text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        {/* Center - Title */}
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-400 flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            KPI Management
          </h1>
          <p className="text-gray-500 mt-1">Manage Key Performance Indicators</p>
        </div>

        {/* Right - Actions */}
        <div className="flex justify-end items-end flex-col gap-2">
          <Button
            onClick={() => navigate('/create-kpi')}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create KPI
          </Button>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => handleSetViewMode("cards")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                viewMode === "cards"
                  ? "bg-white text-violet-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Grid3X3 className="h-4 w-4" />
              Cards
            </button>
            <button
              onClick={() => handleSetViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                viewMode === "table"
                  ? "bg-white text-violet-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <List className="h-4 w-4" />
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <Select value={selectedDepartment || "all"} onValueChange={(value) => {
            setSelectedDepartment(value === "all" ? null : value);
            setSelectedRole(null);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments?.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name} — {d.companies?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <Select value={selectedRole || "all"} onValueChange={(value) => setSelectedRole(value === "all" ? null : value)} disabled={!selectedDepartment}>
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          const isActive = selectedTenure === stat.tenure;
          return (
            <button
              key={stat.label}
              onClick={() => setSelectedTenure(isActive ? null : stat.tenure)}
              className={cn(
                "relative overflow-hidden rounded-xl p-4 text-left transition-all duration-200",
                "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                isActive
                  ? "ring-2 ring-offset-2 ring-violet-500 shadow-lg"
                  : "shadow-md",
                stat.bgColor
              )}
            >
              <div className={cn(
                "absolute top-0 right-0 w-20 h-20 rounded-full opacity-20 -translate-y-1/2 translate-x-1/2",
                "bg-gradient-to-br",
                stat.color
              )} />
              <div className="relative z-10">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                  "bg-gradient-to-br shadow-md",
                  stat.color
                )}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* KPIs Display */}
      {viewMode === "cards" ? (
        /* Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredKpis?.map((kpi) => {
            const tenureLabel = kpi.time_tenure === "day" ? "Daily" : 
                              kpi.time_tenure === "week" ? "Weekly" : 
                              kpi.time_tenure === "month" ? "Monthly" : kpi.time_tenure;
            
            return (
              <div
                key={kpi.id}
                onClick={() => setSelectedKPI(kpi)}
                className="group relative bg-white rounded-2xl border border-gray-100 hover:border-violet-300 hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-[280px]"
              >
                {/* Visual Accent Top Bar */}
                <div className={cn(
                  "h-1.5 w-full",
                  kpi.time_tenure === "day" ? "bg-orange-400" :
                  kpi.time_tenure === "week" ? "bg-indigo-400" :
                  "bg-emerald-400"
                )} />

                <div className="p-5 flex-1 flex flex-col min-w-0">
                  {/* Top Header: Icon + Actions */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm",
                      kpi.time_tenure === "day" ? "bg-orange-50 text-orange-600" :
                      kpi.time_tenure === "week" ? "bg-indigo-50 text-indigo-600" :
                      "bg-emerald-50 text-emerald-600"
                    )}>
                      <Target className="h-5 w-5" />
                    </div>
                    
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/create-kpi?edit=${kpi.id}`);
                        }}
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-gray-100"
                        title="Edit KPI"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Delete this KPI?")) {
                            deleteKPI.mutate(kpi.id);
                          }
                        }}
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-50 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-sm border border-gray-100"
                        disabled={deleteKPI.isPending}
                        title="Delete KPI"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Body: Function Name & Role */}
                  <div className="mb-4">
                    <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-2 min-h-[48px] group-hover:text-violet-700 transition-colors">
                      {kpi.functions?.function_name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-2">
                       <div className="w-4 h-4 rounded bg-gray-50 flex items-center justify-center">
                        <Users className="h-2.5 w-2.5 text-gray-400" />
                      </div>
                      <span className="text-xs font-semibold text-gray-500 truncate">
                        {kpi.functions?.roles?.role_name}
                      </span>
                    </div>
                  </div>
                  
                  {/* Metadata Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border-0 shadow-sm",
                        kpi.time_tenure === "day" && "bg-orange-50 text-orange-600 ring-1 ring-orange-200/50",
                        kpi.time_tenure === "week" && "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/50",
                        kpi.time_tenure === "month" && "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/50",
                      )}
                    >
                      {tenureLabel}
                    </Badge>
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border-0 shadow-sm",
                        getMeasurementType(kpi) === "Count" && "bg-cyan-50 text-cyan-600 ring-1 ring-cyan-200/50",
                        getMeasurementType(kpi) === "Revenue" && "bg-violet-50 text-violet-600 ring-1 ring-violet-200/50",
                        getMeasurementType(kpi) === "Both" && "bg-fuchsia-50 text-fuchsia-600 ring-1 ring-fuchsia-200/50",
                      )}
                    >
                      {getMeasurementType(kpi)}
                    </Badge>
                  </div>

                  {/* Footer: Values & Progress */}
                  <div className="mt-auto pt-4 border-t border-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400">TARGETS</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-cyan-700 font-mono">{renderTargetCount(kpi)}</span>
                          {kpi.target_revenue > 0 && (
                            <span className="text-sm font-black text-violet-600 font-mono">${kpi.target_revenue.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-600">100%</span>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Goal</p>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100/50 p-[0.5px]">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-2xl border border-gray-100 shadow-xl overflow-hidden bg-white/80 backdrop-blur-sm">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="max-h-[680px] overflow-y-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-gray-100 italic">
                  <th className="font-bold text-gray-400 py-4 px-6 text-left text-[11px] uppercase tracking-widest">KPI Function</th>
                  <th className="font-bold text-gray-400 py-4 px-6 text-left text-[11px] uppercase tracking-widest">Assignment</th>
                  <th className="font-bold text-gray-400 py-4 px-6 text-center text-[11px] uppercase tracking-widest">Interval</th>
                  <th className="font-bold text-gray-400 py-4 px-6 text-center text-[11px] uppercase tracking-widest">Type</th>
                  <th className="font-bold text-gray-400 py-4 px-6 text-right text-[11px] uppercase tracking-widest">Targets</th>
                  <th className="font-bold text-gray-400 py-4 px-6 text-center text-[11px] uppercase tracking-widest">Completion</th>
                  <th className="font-bold text-gray-400 py-4 px-6 text-center text-[11px] uppercase tracking-widest">Created</th>
                  <th className="font-bold text-gray-400 py-4 px-6 text-right text-[11px] uppercase tracking-widest">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredKpis?.map((kpi) => {
                  const tenureLabel = kpi.time_tenure === "day" ? "Daily" : 
                                    kpi.time_tenure === "week" ? "Weekly" : 
                                    kpi.time_tenure === "month" ? "Monthly" : kpi.time_tenure;
                  
                  return (
                    <tr 
                      key={kpi.id} 
                      className="group hover:bg-slate-50/80 transition-all duration-200"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm",
                            kpi.time_tenure === "day" ? "bg-orange-50 text-orange-600" :
                            kpi.time_tenure === "week" ? "bg-indigo-50 text-indigo-600" :
                            "bg-emerald-50 text-emerald-600"
                          )}>
                            <Target className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 text-sm group-hover:text-violet-700 transition-colors block leading-tight mb-1">
                              {kpi.functions?.function_name}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">System Reference KPI</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded bg-blue-50 flex items-center justify-center">
                              <Building2 className="h-2.5 w-2.5 text-blue-500" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700">{kpi.functions?.roles?.departments?.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 ml-1">
                            <div className="w-1 h-3 bg-gray-100 rounded-full" />
                            <Users className="h-3 w-3 text-emerald-500" />
                            <span className="text-[11px] font-medium text-gray-500">{kpi.functions?.roles?.role_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Badge 
                          variant="secondary"
                          className={cn(
                            "rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-wider border-0 shadow-sm transition-all group-hover:scale-105",
                            kpi.time_tenure === "day" && "bg-orange-50 text-orange-600 ring-1 ring-orange-200/50",
                            kpi.time_tenure === "week" && "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/50",
                            kpi.time_tenure === "month" && "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/50",
                          )}
                        >
                          {tenureLabel}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Badge 
                          variant="secondary"
                          className={cn(
                            "rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-wider border-0 shadow-sm",
                            getMeasurementType(kpi) === "Count" && "bg-cyan-50 text-cyan-600 ring-1 ring-cyan-200/50",
                            getMeasurementType(kpi) === "Revenue" && "bg-violet-50 text-violet-600 ring-1 violet-cyan-200/50",
                            getMeasurementType(kpi) === "Both" && "bg-fuchsia-50 text-fuchsia-600 ring-1 ring-fuchsia-200/50",
                          )}
                        >
                          {getMeasurementType(kpi)}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-gray-400">UNIT</span>
                            <span className="font-black text-cyan-700 text-sm font-mono">{kpi.target_count_display || kpi.target_count?.toLocaleString() || '—'}</span>
                          </div>
                          {kpi.target_revenue > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-gray-400">REV</span>
                              <span className="font-black text-violet-600 text-sm font-mono">${kpi.target_revenue.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center gap-1.5 w-24 mx-auto">
                          <div className="flex items-center justify-between w-full px-0.5">
                            <span className="text-[10px] font-bold text-emerald-600 transition-opacity">GOAL</span>
                            <span className="text-[10px] font-black text-gray-900 italic">100%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100/50 p-[1px]">
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                              style={{ width: '100%' }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-gray-900 mb-0.5">
                            {new Date(kpi.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </span>
                          <span className="text-[10px] font-semibold text-gray-400">
                            {new Date(kpi.created_at).getFullYear()}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/create-kpi?edit=${kpi.id}`)}
                            className="h-8 w-8 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all duration-300 shadow-sm border border-blue-100"
                            title="Edit KPI"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this KPI?")) {
                                deleteKPI.mutate(kpi.id);
                              }
                            }}
                            className="h-8 w-8 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-600 hover:text-white transition-all duration-300 shadow-sm border border-red-100"
                            disabled={deleteKPI.isPending}
                            title="Delete KPI"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!filteredKpis?.length && (
        <div className="text-center py-12">
          <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No KPIs found</h3>
          <p className="text-gray-500 mb-6">
            {selectedDepartment || selectedRole 
              ? "Try adjusting your filters or create new KPIs for this department/role."
              : "Get started by creating your first KPI."}
          </p>
          <Button
            onClick={() => navigate('/create-kpi')}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create KPI
          </Button>
        </div>
      )}
      {/* KPI Detail Dialog */}
      <Dialog open={!!selectedKPI} onOpenChange={() => setSelectedKPI(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl">{selectedKPI?.functions?.function_name}</span>
            </DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-2 text-gray-500">
                <Users className="h-4 w-4" />
                <span>{selectedKPI?.functions?.roles?.role_name}</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Badges */}
            <div className="flex items-center gap-3">
              <Badge 
                variant="secondary"
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium border-0",
                  selectedKPI?.time_tenure === "day" && "bg-orange-100 text-orange-700",
                  selectedKPI?.time_tenure === "week" && "bg-indigo-100 text-indigo-700",
                  selectedKPI?.time_tenure === "month" && "bg-emerald-100 text-emerald-700",
                )}
              >
                {selectedKPI?.time_tenure === "day" && <Sun className="h-4 w-4 mr-1.5 inline" />}
                {selectedKPI?.time_tenure === "week" && <Clock className="h-4 w-4 mr-1.5 inline" />}
                {selectedKPI?.time_tenure === "month" && <Moon className="h-4 w-4 mr-1.5 inline" />}
                {selectedKPI?.time_tenure}
              </Badge>
              <Badge 
                variant="secondary"
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium border-0",
                  getMeasurementType(selectedKPI!) === "Count" && "bg-cyan-100 text-cyan-700",
                  getMeasurementType(selectedKPI!) === "Revenue" && "bg-violet-100 text-violet-700",
                  getMeasurementType(selectedKPI!) === "Both" && "bg-fuchsia-100 text-fuchsia-700",
                )}
              >
                {getMeasurementType(selectedKPI!)}
              </Badge>
            </div>

            {/* Target Values */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-cyan-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Count Target</p>
                    <p className="text-2xl font-bold text-cyan-600">
                      {selectedKPI?.target_count_display || selectedKPI?.target_count?.toLocaleString() || '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-violet-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Revenue Target</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      (selectedKPI?.target_revenue || 0) > 0 ? "text-violet-600" : "text-gray-400"
                    )}>
                      ${selectedKPI?.target_revenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSelectedKPI(null);
                  navigate(`/create-kpi?edit=${selectedKPI?.id}`);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit KPI
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this KPI?")) {
                    deleteKPI.mutate(selectedKPI!.id);
                    setSelectedKPI(null);
                  }
                }}
                disabled={deleteKPI.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
