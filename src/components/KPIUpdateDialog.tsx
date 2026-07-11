import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { KPIWithRelations } from "@/types/kpi";
import { cn, getTargetNumber } from "@/lib/utils";
import { 
  Target, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Sparkles,
  CheckCircle2,
  BarChart3,
  Award,
  
  Building2,
  Layers
} from "lucide-react";

interface KPIUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKPIUpdated: () => void;
}

export default function KPIUpdateDialog({
  open,
  onOpenChange,
  onKPIUpdated,
}: KPIUpdateDialogProps) {
  const { user, userRole, signOut } = useAuth();
  const qc = useQueryClient();
  
  const [selectedKPI, setSelectedKPI] = useState("");
  const [actualCount, setActualCount] = useState("");
  const [actualRevenue, setActualRevenue] = useState("");
  const [actualYesNo, setActualYesNo] = useState<boolean | null>(null);
  const [summary, setSummary] = useState("");
  const [projectClient, setProjectClient] = useState("");
  const [moduleHandle, setModuleHandle] = useState("");
  // measurement type is derived from the selected KPI; do not allow manual selection here
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [logoutCountdown, setLogoutCountdown] = useState(5);
  const logoutTimerRef = useRef<number | null>(null);

  function getMeasurementTypeFromKPI(kpi: KPIWithRelations | undefined) {
    if (!kpi) return "count";
    if (kpi.is_yes_no) return "yesno";
    const targetCountNum = getTargetNumber(kpi.target_count);
    if (targetCountNum > 0 && (kpi.target_revenue || 0) > 0) return "both";
    if (targetCountNum > 0) return "count";
    if ((kpi.target_revenue || 0) > 0) return "revenue";
    return "count";
  }

  // Get current employee's KPIs
  const { data: employeeKPIs, isLoading: kpisLoading } = useQuery({
    queryKey: ["employee-kpis-today", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get employee record (prefer user_roles.employee_id; fallback to email)
      const employeeId = userRole.employee_id;
      const email = user.email?.trim();
      const employeeLookup = employeeId
        ? supabase.from("employees").select("id, role_id, department_id").eq("id", employeeId).maybeSingle()
        : email
          ? supabase.from("employees").select("id, role_id, department_id").ilike("email", email).maybeSingle()
          : null;

      if (!employeeLookup) return [];
      const { data: employee, error: empError } = await employeeLookup;
        
      if (empError) {
        console.error("Employee lookup error:", empError);
        throw empError;
      }

      if (!employee?.role_id) return [];
      
      // Get KPIs for this employee's role and department
      const { data, error } = await supabase
        .from("kpis")
        .select(`
          *,
          functions(id, function_name, target_value),
          roles(id, role_name),
          departments(id, name)
        `)
        .eq("role_id", employee.role_id)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      return data as KPIWithRelations[];
    },
    enabled: open && !!user?.id,
  });

  // Check if KPI log already exists for today
  const { data: existingLogs } = useQuery({
    queryKey: ["kpi-logs-today", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get employee record first (prefer user_roles.employee_id; fallback to email)
      const employeeId = userRole.employee_id;
      const email = user.email?.trim();
      const employeeLookup = employeeId
        ? supabase.from("employees").select("id").eq("id", employeeId).maybeSingle()
        : email
          ? supabase.from("employees").select("id").ilike("email", email).maybeSingle()
          : null;

      if (!employeeLookup) return [];
      const { data: employeeData, error: empError } = await employeeLookup;
        
      if (empError || !employeeData?.id) return [];
      
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("kpi_performance_logs")
        .select("kpi_id, actual_count, actual_revenue, notes")
        .eq("employee_id", employeeData.id)
        .eq("log_date", today);
        
      if (error) throw error;
      return data;
    },
    enabled: open && !!user?.id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedKPI) {
      toast.error("Please select a KPI");
      return;
    }

    // Validate based on KPI's configured measurement type
    const submitType = getMeasurementTypeFromKPI(selectedKPIData);
    if (submitType === "count" && !actualCount) {
      toast.error("Please enter actual count");
      return;
    }
    if (submitType === "revenue" && !actualRevenue) {
      toast.error("Please enter actual revenue");
      return;
    }
    if (submitType === "yesno" && actualYesNo === null) {
      toast.error("Please choose Yes or No");
      return;
    }
    if (submitType === "both" && !actualCount && !actualRevenue) {
      toast.error("Please enter actual count or revenue");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get employee record (prefer user_roles.employee_id; fallback to email)
      const employeeId = userRole.employee_id;
      const email = user?.email?.trim();
      const employeeLookup = employeeId
        ? supabase.from("employees").select("id").eq("id", employeeId).maybeSingle()
        : email
          ? supabase.from("employees").select("id").ilike("email", email).maybeSingle()
          : null;

      if (!employeeLookup) {
        throw new Error("Employee record not found. Please contact your admin.");
      }

      const { data: employee, error: empError } = await employeeLookup;
        
      if (empError || !employee?.id) {
        console.error("Employee lookup error:", empError);
        throw new Error("Employee record not found. Please contact your admin.");
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Prepare data based on KPI's configured measurement type
      const logData = {
        kpi_id: selectedKPI,
        employee_id: employee.id,
        log_date: today,
        actual_count: submitType === "yesno" ? (actualYesNo ? 1 : 0) : ((submitType === "count" || submitType === "both") ? Number(actualCount || 0) : 0),
        actual_revenue: (submitType === "revenue" || submitType === "both") ? Number(actualRevenue || 0) : 0,
      };
      
      // Check if log already exists for this KPI today
      const existingLog = existingLogs?.find(log => log.kpi_id === selectedKPI);
      
      if (existingLog) {
        // Always update existing log instead of trying to insert
        const { error: updateError } = await supabase
          .from("kpi_performance_logs")
          .update({
            ...logData,
            notes: summary.trim() || null
          })
          .eq("kpi_id", selectedKPI)
          .eq("employee_id", employee.id)
          .eq("log_date", today);
          
        if (updateError) {
          console.error("Update error:", updateError);
          throw new Error(`Failed to update KPI: ${updateError.message}`);
        }
        
        // Update KPI summary in the kpis table
        if (summary.trim()) {
          const { error: kpiUpdateError } = await supabase
            .from("kpis")
            .update({
              kpi_summary: summary.trim(),
            })
            .eq("id", selectedKPI);
            
          if (kpiUpdateError) throw kpiUpdateError;
        }
        
        toast.success("KPI updated successfully!");
        // Show success popup and auto-logout after countdown
        setShowSuccessPopup(true);
        setLogoutCountdown(5);
        onKPIUpdated();
        logoutTimerRef.current = window.setInterval(() => {
          setLogoutCountdown((c) => {
            if (c <= 1) {
              if (logoutTimerRef.current) window.clearInterval(logoutTimerRef.current);
              signOut();
              setShowSuccessPopup(false);
              onOpenChange(false);
              return 0;
            }
            return c - 1;
          });
        }, 1000);
      } else {
        // Create new log only if it doesn't exist
        const { error: insertError } = await supabase
          .from("kpi_performance_logs")
          .insert({
            ...logData,
            notes: summary.trim() || null
          });
          
        if (insertError) {
          console.error("Insert error:", insertError);
          // If it's a duplicate error, try to update instead
          if (insertError.code === '23505') { // Unique violation
            console.log("Duplicate detected, attempting to update existing record");
            const { error: updateError } = await supabase
              .from("kpi_performance_logs")
              .update({
                ...logData,
                notes: summary.trim() || null
              })
              .eq("kpi_id", selectedKPI)
              .eq("employee_id", employee.id)
              .eq("log_date", today);
              
            if (updateError) {
              console.error("Fallback update error:", updateError);
              throw new Error(`Failed to update existing KPI: ${updateError.message}`);
            }
          } else {
            throw new Error(`Failed to submit KPI: ${insertError.message}`);
          }
        }
        
        // Update KPI summary in the kpis table
        if (summary.trim()) {
          const { error: kpiUpdateError } = await supabase
            .from("kpis")
            .update({
              kpi_summary: summary.trim(),
            })
            .eq("id", selectedKPI);
            
          if (kpiUpdateError) throw kpiUpdateError;
        }
        
        toast.success("KPI logged successfully!");
        // Show success popup and auto-logout after countdown
        setShowSuccessPopup(true);
        setLogoutCountdown(5);
        onKPIUpdated();
        logoutTimerRef.current = window.setInterval(() => {
          setLogoutCountdown((c) => {
            if (c <= 1) {
              if (logoutTimerRef.current) window.clearInterval(logoutTimerRef.current);
              signOut();
              setShowSuccessPopup(false);
              onOpenChange(false);
              return 0;
            }
            return c - 1;
          });
        }, 1000);
      }

      // Reset form
      setSelectedKPI("");
      setActualCount("");
      setActualRevenue("");
      setActualYesNo(null);
      setSummary("");
      setProjectClient("");
      setModuleHandle("");
      // measurement type is derived from KPI, no local state to reset
      
      onOpenChange(false);
      onKPIUpdated();
      
    } catch (error: any) {
      console.error("Error submitting KPI:", error);
      toast.error(error.message || "Failed to submit KPI");
    } finally {
      setIsSubmitting(false);
    }
  };

    useEffect(() => {
      return () => {
        if (logoutTimerRef.current) {
          window.clearInterval(logoutTimerRef.current);
        }
      };
    }, []);

  // no explicit skip behavior — closing the dialog will just call parent onOpenChange

  const selectedKPIData = employeeKPIs?.find(kpi => kpi.id === selectedKPI);
  const existingLogForSelectedKPI = existingLogs?.find(log => log.kpi_id === selectedKPI);
  const renderType = getMeasurementTypeFromKPI(selectedKPIData);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden">
        {/* Gradient Header */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 px-8 py-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-400/10 rounded-full -ml-12 -mb-12 blur-xl" />
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/30 transform hover:scale-105 transition-transform">
              <TrendingUp className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-extrabold text-white mb-1 tracking-tight">
                Update Performance KPI
              </DialogTitle>
              <DialogDescription className="text-emerald-50/90 text-sm font-medium">
                Track your achievements and maintain your performance streaks 🎯
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {showSuccessPopup ? (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in-95 duration-500">
              <div className="h-24 w-24 rounded-full bg-emerald-50 flex items-center justify-center mb-6 shadow-inner border border-emerald-100">
                <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-in fade-in zoom-in duration-500 delay-150">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Great Work Today! 🎉</h3>
              <p className="text-gray-600 font-medium mb-8 text-center max-w-[85%] mx-auto leading-relaxed">
                Thank you for submitting your performance KPI. Your hard work is truly appreciated. Have a wonderful rest of your day!
              </p>
              
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-50 rounded-full border border-emerald-100">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </div>
                <span className="text-sm font-bold text-emerald-700 tracking-wide uppercase">
                  Auto-logging out in <span className="text-lg mx-1">{logoutCountdown}</span> sec
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* KPI Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <Label htmlFor="kpi" className="text-sm font-semibold text-gray-900">
                    Select KPI Function
                  </Label>
                </div>
                <Select value={selectedKPI} onValueChange={setSelectedKPI} disabled={kpisLoading}>
                  <SelectTrigger className="h-12 border-emerald-200 focus:border-emerald-400 focus:ring-emerald-100 shadow-sm text-sm">
                    <SelectValue placeholder="Choose KPI..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {employeeKPIs?.map((kpi) => (
                      <SelectItem key={kpi.id} value={kpi.id} className="py-2.5">
                        <span className="font-medium text-gray-900">{kpi.functions?.function_name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedKPIData && (
                  <div className="flex flex-wrap items-center gap-2 mt-2 pt-1 animate-in fade-in duration-300">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {selectedKPIData.time_tenure}
                    </span>
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-100 uppercase tracking-wider flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {selectedKPIData.is_yes_no ? "Type: Yes/No" : `Target: ${ (selectedKPIData.target_count === 1 && selectedKPIData.target_revenue === 0 && selectedKPIData.final_target === 100) ? '—' : (selectedKPIData.target_count_display || (selectedKPIData.target_count ?? '—')) }`}
                    </span>
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-100 uppercase tracking-wider flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Rev: ${selectedKPIData.target_revenue}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {existingLogForSelectedKPI && (
              <div className="flex items-center gap-3 p-4 bg-amber-50/80 rounded-xl border border-amber-200/60 shadow-sm animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900 uppercase tracking-tight">Existing Entry Found</p>
                  <p className="text-[11px] text-amber-800/80">
                    Current values: {selectedKPIData?.is_yes_no ? (
                      <span className="font-bold">{existingLogForSelectedKPI.actual_count === 1 ? "Yes" : "No"}</span>
                    ) : (
                      <>
                        <span className="font-bold">Count={existingLogForSelectedKPI.actual_count}</span>, 
                        <span className="font-bold ml-1">Revenue=${existingLogForSelectedKPI.actual_revenue}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Measurement is derived from the selected KPI; show direct input(s) only */}

            {/* Input Fields Card */}
            <div className="space-y-3">
              {(() => {
                const type = getMeasurementTypeFromKPI(selectedKPIData);
                if (type === 'both') {
                  return (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-emerald-600" />
                          <Label htmlFor="count" className="text-sm font-semibold text-gray-900">
                            Actual Count
                          </Label>
                        </div>
                        <Input
                          id="count"
                          type="number"
                          placeholder="0"
                          value={actualCount}
                          onChange={(e) => setActualCount(e.target.value)}
                          min="0"
                          disabled={isSubmitting}
                          className="h-11 border-emerald-200 focus:border-emerald-400 focus:ring-emerald-100"
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-emerald-600" />
                          <Label htmlFor="revenue" className="text-sm font-semibold text-gray-900">
                            Actual Revenue
                          </Label>
                        </div>
                        <Input
                          id="revenue"
                          type="number"
                          placeholder="0.00"
                          value={actualRevenue}
                          onChange={(e) => setActualRevenue(e.target.value)}
                          min="0"
                          step="0.01"
                          disabled={isSubmitting}
                          className="h-11 border-emerald-200 focus:border-emerald-400 focus:ring-emerald-100"
                        />
                      </div>
                    </div>
                  );
                }

                if (type === 'yesno') {
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-emerald-600" />
                        <Label className="text-sm font-semibold text-gray-900">Completed?</Label>
                      </div>
                      <Select
                        value={actualYesNo === null ? "" : actualYesNo ? "yes" : "no"}
                        onValueChange={(value: string) => setActualYesNo(value === "yes")}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="h-11 border-emerald-200 focus:border-emerald-400 focus:ring-emerald-100">
                          <SelectValue placeholder="Yes or No" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }

                if (type === 'revenue') {
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <Label htmlFor="revenue" className="text-sm font-semibold text-gray-900">
                          Actual Revenue *
                        </Label>
                      </div>
                      <Input
                        id="revenue"
                        type="number"
                        placeholder="0.00"
                        value={actualRevenue}
                        onChange={(e) => setActualRevenue(e.target.value)}
                        min="0"
                        step="0.01"
                        required
                        disabled={isSubmitting}
                        className="h-11 border-emerald-200 focus:border-emerald-400 focus:ring-emerald-100"
                      />
                    </div>
                  );
                }

                // default to count
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-emerald-600" />
                      <Label htmlFor="count" className="text-sm font-semibold text-gray-900">
                        Actual Count *
                      </Label>
                    </div>
                    <Input
                      id="count"
                      type="number"
                      placeholder="0"
                      value={actualCount}
                      onChange={(e) => setActualCount(e.target.value)}
                      min="0"
                      required
                      disabled={isSubmitting}
                      className="h-11 border-emerald-200 focus:border-emerald-400 focus:ring-emerald-100"
                    />
                  </div>
                );
              })()}
            </div>

            {/* Performance Preview Card */}
            {selectedKPIData && ((renderType === 'count' && actualCount) || (renderType === 'revenue' && actualRevenue) || (renderType === 'both' && (actualCount || actualRevenue)) || (renderType === 'yesno' && actualYesNo !== null)) && (
              <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50 rounded-2xl p-5 border border-emerald-100 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <Award className="h-20 w-20 text-emerald-600" />
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-emerald-100 rounded-lg">
                    <Award className="h-4 w-4 text-emerald-600" />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-900 tracking-tight">Performance Preview</h4>
                </div>
                
                <div className="grid grid-cols-1 gap-4 text-xs relative z-10">
                  {(() => {
                    let performanceScore = 0;
                    let performanceLabel = "";
                    let performanceIcon = null;

                    if (renderType === "count" || (renderType === 'both' && actualCount)) {
                      const tc = getTargetNumber(selectedKPIData.target_count);
                      const hasValidTargetCount = tc > 0;
                      if (hasValidTargetCount) {
                        performanceScore = Math.min(
                          100,
                          (Number(actualCount) / tc) * 100
                        );
                      } else {
                        performanceScore = Number(actualCount) > 0 ? 100 : 0;
                      }
                      performanceLabel = "Count Performance";
                      performanceIcon = <Target className="h-4 w-4" />;
                    } else if (renderType === 'yesno') {
                      performanceScore = actualYesNo ? 100 : 0;
                      performanceLabel = actualYesNo ? 'Yes' : 'No';
                      performanceIcon = <CheckCircle2 className="h-4 w-4" />;
                    } else {
                      const tr = selectedKPIData.target_revenue ?? 0;
                      if (tr > 0) {
                        performanceScore = Math.min(
                          100,
                          (Number(actualRevenue) / tr) * 100
                        );
                      } else {
                        performanceScore = Number(actualRevenue) > 0 ? 100 : 0;
                      }
                      performanceLabel = "Revenue Performance";
                      performanceIcon = <DollarSign className="h-4 w-4" />;
                    }
                    
                    const isPerfect = performanceScore >= 100;
                    
                    return (
                      <div className="flex flex-col items-center justify-center p-2">
                        <div className="text-emerald-700 font-bold flex items-center justify-center gap-2 mb-2 uppercase tracking-widest text-[10px]">
                          {performanceIcon}
                          {performanceLabel}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className={cn(
                            "text-4xl font-black tracking-tighter",
                            isPerfect ? "text-emerald-600" : "text-emerald-800"
                          )}>
                            {isPerfect ? "100.0" : performanceScore.toFixed(1)}
                          </span>
                          <span className="text-xl font-bold text-emerald-600/70">%</span>
                        </div>
                        
                        {isPerfect && (
                          <div className="mt-2 px-3 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full animate-pulse shadow-sm shadow-emerald-200">
                            TARGET ACHIEVED!
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Actions */}
            <DialogFooter className="gap-3 mt-8">
              <Button
                type="submit"
                disabled={isSubmitting || !selectedKPI || (renderType === 'count' && !actualCount) || (renderType === 'revenue' && !actualRevenue) || (renderType === 'both' && !actualCount && !actualRevenue) || (renderType === 'yesno' && actualYesNo === null)}
                className="flex-1 h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 transition-all duration-200"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {existingLogForSelectedKPI ? "Update KPI" : "Submit KPI"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
