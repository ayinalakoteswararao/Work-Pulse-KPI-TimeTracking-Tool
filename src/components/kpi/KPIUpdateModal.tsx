import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { KPIPerformanceForm, KPIWithRelations } from "@/types/kpi";
import { Target, DollarSign, Calendar, Edit3, Plus } from "lucide-react";
import { getTargetNumber } from "@/lib/utils";

interface KPIUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName?: string;
  existingLog?: any;
}

export default function KPIUpdateModal({ 
  open, 
  onOpenChange, 
  employeeId,
  employeeName,
  existingLog 
}: KPIUpdateModalProps) {
  const qc = useQueryClient();
  
  const [formData, setFormData] = useState<KPIPerformanceForm>({
    kpi_id: "",
    employee_id: employeeId,
    log_date: new Date().toISOString().split('T')[0],
    actual_count: 0,
    actual_revenue: 0,
    notes: "",
    kpi_summary: "",
  });

  // Update form when editing existing log
  useEffect(() => {
    if (existingLog) {
      setFormData({
        kpi_id: existingLog.kpi_id,
        employee_id: employeeId,
        log_date: existingLog.log_date,
        actual_count: existingLog.actual_count,
        actual_revenue: existingLog.actual_revenue,
        notes: existingLog.notes || "",
        kpi_summary: existingLog.kpi_summary || "",
      });
    }
  }, [existingLog, employeeId]);

  const { data: employeeKPIs } = useQuery({
    queryKey: ["employee-kpis", employeeId],
    queryFn: async () => {
      // First get employee's role and department
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("role_id, department_id")
        .eq("id", employeeId)
        .single();
        
      if (empError) throw empError;
      
      // Then get KPIs for this employee's role and department
      const { data, error } = await (supabase as any)
        .from("kpis")
        .select(`
          *,
          functions(function_name, roles(role_name, departments(name, companies(name)))),
          departments(name, companies(name)),
          roles(role_name)
        `)
        .eq("role_id", employee.role_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as KPIWithRelations[];
    },
    enabled: open && !!employeeId,
  });

  const { data: existingLogs } = useQuery({
    queryKey: ["kpi-logs", employeeId, formData.log_date],
    queryFn: async () => {
      if (!formData.log_date) return [];
      const { data, error } = await (supabase as any)
        .from("kpi_performance_logs")
        .select("kpi_id")
        .eq("employee_id", employeeId)
        .eq("log_date", formData.log_date);
      if (error) throw error;
      return data as { kpi_id: string }[];
    },
    enabled: open && !!employeeId && !!formData.log_date,
  });

  const upsertLog = useMutation({
    mutationFn: async () => {
      // Check if a log already exists for this KPI + Employee + Date combination
      const { data: existingLogRecord, error: checkError } = await (supabase as any)
        .from("kpi_performance_logs")
        .select("id")
        .eq("kpi_id", formData.kpi_id)
        .eq("employee_id", formData.employee_id)
        .eq("log_date", formData.log_date)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existingLogRecord) {
        // Update existing record
        const { error } = await (supabase as any)
          .from("kpi_performance_logs")
          .update({
            actual_count: formData.actual_count,
            actual_revenue: formData.actual_revenue,
            notes: formData.notes,
          })
          .eq("id", existingLogRecord.id);
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await (supabase as any).from("kpi_performance_logs").insert({
          kpi_id: formData.kpi_id,
          employee_id: formData.employee_id,
          log_date: formData.log_date,
          actual_count: formData.actual_count,
          actual_revenue: formData.actual_revenue,
          notes: formData.notes,
        });
        if (error) throw error;
      }
      
      // Then update the KPI summary in the KPIs table
      if (formData.kpi_summary && formData.kpi_summary.trim()) {
        const { error: kpiError } = await (supabase as any)
          .from("kpis")
          .update({ kpi_summary: formData.kpi_summary.trim() })
          .eq("id", formData.kpi_id);
        if (kpiError) throw kpiError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi-logs"] });
      qc.invalidateQueries({ queryKey: ["kpi-performance-summary"] });
      toast.success(existingLog ? "KPI log updated" : "KPI log created");
      onOpenChange(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setFormData({
      kpi_id: "",
      employee_id: employeeId,
      log_date: new Date().toISOString().split('T')[0],
      actual_count: 0,
      actual_revenue: 0,
      notes: "",
      kpi_summary: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertLog.mutate();
  };

  const isDuplicate = existingLogs?.some(log => log.kpi_id === formData.kpi_id) && !existingLog;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-violet-600" />
            {existingLog ? "Update KPI Log" : "Add KPI Log"}
          </DialogTitle>
          {employeeName && (
            <p className="text-sm text-gray-500 mt-1">Employee: {employeeName}</p>
          )}
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={formData.log_date}
              onChange={(e) => setFormData(prev => ({ ...prev, log_date: e.target.value, kpi_id: "" }))}
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              KPI Function <span className="text-red-500">*</span>
            </label>
            <Select 
              value={formData.kpi_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, kpi_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select KPI function" />
              </SelectTrigger>
              <SelectContent>
                {employeeKPIs?.map(kpi => (
                  <SelectItem key={kpi.id} value={kpi.id}>
                    <div className="flex flex-col">
                      <span>{kpi.functions?.function_name}</span>
                      <span className="text-xs text-gray-500">
                        {kpi.time_tenure} • Target: { (kpi.target_count === 1 && kpi.target_revenue === 0 && kpi.final_target === 100) ? '—' : (kpi.target_count_display || (kpi.target_count ?? '—')) } • Revenue: ${kpi.target_revenue}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isDuplicate && (
              <p className="text-xs text-red-500 mt-1">A log for this KPI already exists for this date</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
                <Target className="h-3.5 w-3.5" />
                Actual Count <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={0}
                value={formData.actual_count}
                onChange={(e) => setFormData(prev => ({ ...prev, actual_count: Number(e.target.value) }))}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                Actual Revenue
              </label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={formData.actual_revenue}
                onChange={(e) => setFormData(prev => ({ ...prev, actual_revenue: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              KPI Summary <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Describe your performance and work completed..."
              value={formData.kpi_summary}
              onChange={(e) => setFormData(prev => ({ ...prev, kpi_summary: e.target.value }))}
              rows={3}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Provide a brief description of your work performance</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Notes (Optional)
            </label>
            <Textarea
              placeholder="Add any notes about your work today..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Performance Preview */}
          {formData.kpi_id && (formData.actual_count > 0 || formData.actual_revenue > 0) && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Performance Preview</h4>
              <div className="space-y-1 text-xs text-gray-600">
                {(() => {
                  const selectedKPI = employeeKPIs?.find(k => k.id === formData.kpi_id);
                  if (!selectedKPI) return null;
                  
                  const targetCountNum = getTargetNumber(selectedKPI.target_count);
                  const hasCountTarget = targetCountNum > 0;
                  const hasRevenueTarget =
                    selectedKPI.target_revenue != null && selectedKPI.target_revenue > 0;

                  const countPerf = hasCountTarget
                    ? Math.min(100, (formData.actual_count / targetCountNum) * 100)
                    : formData.actual_count > 0
                      ? 100
                      : 0;
                  const revenuePerf = hasRevenueTarget
                    ? Math.min(100, (formData.actual_revenue / selectedKPI.target_revenue) * 100)
                    : formData.actual_revenue > 0
                      ? 100
                      : 0;

                  let finalScore = 0;
                  if (hasCountTarget && hasRevenueTarget) {
                    finalScore = Math.min(100, countPerf * 0.5 + revenuePerf * 0.5);
                  } else if (hasCountTarget) {
                    finalScore = countPerf;
                  } else if (hasRevenueTarget) {
                    finalScore = revenuePerf;
                  } else {
                    finalScore =
                      formData.actual_count > 0 || formData.actual_revenue > 0 ? 100 : 0;
                  }

                  return (
                    <>
                      <div>Count Performance: {countPerf.toFixed(1)}%</div>
                      {hasRevenueTarget && (
                        <div>Revenue Performance: {revenuePerf.toFixed(1)}%</div>
                      )}
                      <div className="font-medium">Final Score: {finalScore.toFixed(1)}%</div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={upsertLog.isPending || isDuplicate}
              className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600"
            >
              {upsertLog.isPending ? "Saving..." : existingLog ? "Update Log" : "Add Log"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
