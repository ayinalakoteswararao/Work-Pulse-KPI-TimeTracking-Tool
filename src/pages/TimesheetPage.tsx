import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Trash2, 
  Send, 
  Clock, 
  Calendar,
  Target,
  TrendingUp,
  Users,
  Zap,
  CheckCircle2,
  Timer
} from "lucide-react";
import { cn } from "@/lib/utils";
import EmployeeAvatarWithPreview from "@/components/EmployeeAvatarWithPreview";
import DailyMetrics from "@/components/DailyMetrics";
import KPIUpdateDialog from "@/components/KPIUpdateDialog";

interface TaskLog {
  id: string;
  employee_id: string;
  function_id: string;
  count: number;
  scale: number;
  log_date: string;
  employees?: { name: string; profile_photo_url?: string | null };
  functions?: { function_name: string; target_value: number };
}

export default function TimesheetPage() {
  const qc = useQueryClient();
  const { user, userRole, isAdmin, isManager, isEmployee, signOut } = useAuth();
  const [employeeId, setEmployeeId] = useState("");
  const [functionId, setFunctionId] = useState("");
  const [count, setCount] = useState("");
  const [scale, setScale] = useState("100");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");
  const [showKPIDialog, setShowKPIDialog] = useState(false);
  const [showLogoutCountdown, setShowLogoutCountdown] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const { data: employees } = useQuery({
    queryKey: ["employees", userRole.department_id],
    queryFn: async () => {
      let query = supabase
        .from("employees")
        .select("*, roles(role_name), departments(name)")
        .order("name");
      
      // If manager, filter by their department
      if (isManager() && userRole.department_id) {
        query = query.eq("department_id", userRole.department_id);
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
        departments?: { name: string };
      }[];
    },
  });

  // Auto-select current user if they're an employee, or add admin option
  useEffect(() => {
    if (employees && user) {
      if (isAdmin()) {
        // For admin users, check if they have an employee_id linked
        if (userRole.employee_id) {
          const adminEmployee = employees.find(e => e.id === userRole.employee_id);
          if (adminEmployee) {
            setEmployeeId(userRole.employee_id);
          }
        }
      } else {
        // For employee users, find their employee record by email
        const userEmail = user.email?.trim().toLowerCase();
        const userEmployee = employees.find(
          (e) => e.email?.trim().toLowerCase() === userEmail
        );
        if (userEmployee && userEmployee.id !== employeeId) {
          setEmployeeId(userEmployee.id);
        }
      }
    }
  }, [employees, user, isAdmin, userRole.employee_id]);

  const selectedEmployee = employees?.find((e) => e.id === employeeId);
  const selectedRoleId = selectedEmployee?.role_id;

  const { data: functions } = useQuery({
    queryKey: ["functions", selectedRoleId, employeeId],
    queryFn: async () => {
      // For admin selection, show all functions
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

  // Auto-calculate scale based on count and target
  useEffect(() => {
    if (count) {
      if (selectedFunction?.target_value && selectedFunction.target_value > 0) {
        const calculatedScale = Math.min(Math.round((Number(count) / selectedFunction.target_value) * 100), 100);
        setScale(String(calculatedScale));
      } else {
        // If no target value or target is 0, then any entry is 100% scale
        setScale("100");
      }
    } else {
      setScale("0");
    }
  }, [count, selectedFunction]);

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

  const { data: logs, isLoading } = useQuery({
    queryKey: ["task_logs", userRole.department_id],
    queryFn: async () => {
      let query = supabase
        .from("task_logs")
        .select("*, employees(name, profile_photo_url), functions(function_name, target_value)")
        .order("log_date", { ascending: false })
        .limit(50);
      
      // If manager, filter by their department
      if (isManager() && userRole.department_id) {
        query = query.eq("employees.department_id", userRole.department_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TaskLog[];
    },
  });

  const addLog = useMutation({
    mutationFn: async () => {
      let actualEmployeeId = employeeId;
      
      // Handle the special "admin" case
      if (employeeId === "admin") {
        // For admin entries, we need to either use a linked employee_id or create one
        if (userRole.employee_id) {
          actualEmployeeId = userRole.employee_id;
        } else {
          // Get or create default company, department and role
          let { data: companies } = await supabase.from("companies").select("id").limit(1);
          let { data: departments } = await supabase.from("departments").select("id").limit(1);
          let { data: roles } = await supabase.from("roles").select("id").limit(1);
          
          let companyId = companies?.[0]?.id;
          let departmentId = departments?.[0]?.id;
          let roleId = roles?.[0]?.id;
          
          // Create default company if none exists
          if (!companyId) {
            const { data: newCompany } = await supabase
              .from("companies")
              .insert({ name: "Default Company" })
              .select("id")
              .single();
            companyId = newCompany?.id;
          }
          
          // Create default department if none exists
          if (!departmentId && companyId) {
            const { data: newDept } = await supabase
              .from("departments")
              .insert({ name: "General", company_id: companyId })
              .select("id")
              .single();
            departmentId = newDept?.id;
          }
          
          // Create default role if none exists
          if (!roleId && departmentId) {
            const { data: newRole } = await supabase
              .from("roles")
              .insert({ role_name: "General", department_id: departmentId })
              .select("id")
              .single();
            roleId = newRole?.id;
          }
          
          // Create an employee record for the admin user
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
          
          // Update user_roles with the new employee_id
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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task_logs"] });
      qc.invalidateQueries({ queryKey: ["today-tasks-count"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["functions"] });
      toast.success("Task logged successfully");
      setCount(""); setScale("0"); setFunctionId(""); setRemarks("");
      
      // Trigger KPI update dialog for employees after logging a task
      if (isEmployee()) {
        setShowKPIDialog(true);
      }
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

  const totalEntries = logs?.length || 0;
  const todayEntries = logs?.filter(l => l.log_date === new Date().toISOString().split("T")[0]).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-400 flex items-center justify-center">
              <Timer className="h-5 w-5 text-white" />
            </div>
            Timesheet Management
          </h1>
          <p className="text-gray-500 mt-1">
            {isAdmin() ? "Monitor and manage your administrative work hours and tasks" : 
             isManager() ? "Monitor your department's work hours and tasks" :
             isEmployee() ? "Track your daily work hours and manage your tasks efficiently" : 
             "Track work hours and manage daily tasks"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            {totalEntries} total entries
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            {todayEntries} today
          </span>
        </div>
      </div>

      {/* Daily metrics — boxed strip (employees only) */}
      {isEmployee() && (
        <section aria-label="Today’s work stats">
          <DailyMetrics />
        </section>
      )}

      {/* Main Content */}
      <Tabs defaultValue="work-session" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="work-session" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Work Session
          </TabsTrigger>
          <TabsTrigger value="task-logs" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Task Logs
          </TabsTrigger>
        </TabsList>

        {/* Work Session Tab */}
        <TabsContent value="work-session" className="space-y-6">
          <WorkSessionControl />
        </TabsContent>

        {/* Task Logs Tab */}
        <TabsContent value="task-logs" className="space-y-6">
          {/* Entry Form */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-400 flex items-center justify-center">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">New Task Entry</h2>
                <p className="text-sm text-gray-500">Select employee, their assigned function, and log work load</p>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addLog.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Employee</label>
                  <Select value={employeeId} onValueChange={(v) => { setEmployeeId(v); setFunctionId(""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show Admin option for admin users without linked employee */}
                      {isAdmin() && !userRole.employee_id && (
                        <SelectItem value="admin">Admin (Current User)</SelectItem>
                      )}
                      {employees?.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} · {e.roles?.role_name}
                          {user.email === e.email && " (You)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Function</label>
                  <Select value={functionId} onValueChange={setFunctionId}>
                    <SelectTrigger><SelectValue placeholder="Select function" /></SelectTrigger>
                    <SelectContent>
                      {employeeId === "admin" ? (
                        functions?.length === 0 ? 
                          <SelectItem value="none" disabled>No functions available</SelectItem>
                          : functions?.map((f) => <SelectItem key={f.id} value={f.id}>{f.function_name} (target: {f.target_value})</SelectItem>)
                      ) : (
                        <>
                          {!selectedRoleId ? <SelectItem value="none" disabled>Select employee first</SelectItem>
                            : functions?.length === 0 ? <SelectItem value="none" disabled>No functions for this role</SelectItem>
                            : functions?.map((f) => <SelectItem key={f.id} value={f.id}>{f.function_name} (target: {f.target_value})</SelectItem>)}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Date</label>
                  <Input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Units</label>
                    <Input type="number" placeholder="0" value={count} onChange={(e) => setCount(e.target.value)} required min="0" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Scale %</label>
                    <Input type="number" value={scale} readOnly className="bg-gray-50 cursor-default" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Remarks</label>
                  <Input 
                    type="text" 
                    placeholder="Add any notes or comments..." 
                    value={remarks} 
                    onChange={(e) => setRemarks(e.target.value)} 
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  type="submit" 
                  disabled={addLog.isPending || !employeeId || !functionId || !count} 
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 shadow-lg shadow-violet-500/25"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {addLog.isPending ? "Logging…" : "Submit Entry"}
                </Button>
              </div>
            </form>
          </div>

          {/* Recent Logs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-violet-500" />
                Recent Work Load Entries
              </h2>
              <span className="text-xs text-gray-400">Latest 50 entries</span>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : logs?.length === 0 ? (
              <div className="text-center py-16">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No work load entries yet</p>
                <p className="text-sm text-gray-400 mt-1">Submit your first work load entry above</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {logs?.map((log) => {
                  const target = log.functions?.target_value || 0;
                  const pct = target > 0 ? Math.round((log.count / target) * 100) : 0;
                  return (
                    <div key={log.id} className="group flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                      <EmployeeAvatarWithPreview
                        name={log.employees?.name}
                        imageUrl={log.employees?.profile_photo_url}
                        className="h-10 w-10 rounded-xl shrink-0"
                        textClassName="text-sm font-bold"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{log.employees?.name}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-sm text-gray-500">{log.functions?.function_name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {log.log_date}
                          </span>
                          <span className="text-gray-500">Scale: {log.scale}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-mono font-medium text-gray-700">{log.count}/{target}</span>
                            <span className={cn("text-sm font-bold", perfColor(log.count, target))}>{pct}%</span>
                          </div>
                          <div className="w-24 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all", perfBg(log.count, target))} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500" 
                          onClick={() => remove.mutate(log.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
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
