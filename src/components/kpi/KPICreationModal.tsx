import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { KPICreationForm, KPIWithRelations } from "@/types/kpi";
import { getTargetNumber } from "@/lib/utils";
import { Target, TrendingUp, Calendar, DollarSign, BarChart3 } from "lucide-react";

interface KPICreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedData?: {
    department_id: string;
    role_id: string;
    department_name?: string;
    role_name?: string;
  };
  existingKPI?: KPIWithRelations | null;
}

export default function KPICreationModal({ 
  open, 
  onOpenChange, 
  preselectedData,
  existingKPI 
}: KPICreationModalProps) {
  const qc = useQueryClient();
  
  const [formData, setFormData] = useState<KPICreationForm>({
    department_id: preselectedData?.department_id || "",
    role_id: preselectedData?.role_id || "",
    function_id: "",
    function_name: "", // For inline function creation
    kpi_summary: "",
    time_tenure: "day",
    target_count: undefined,
    target_revenue: 0,
    final_target: 100,
    measurement_type: "count",
    is_yes_no: false,
  });

  // Update form when preselected data changes
  useEffect(() => {
    if (preselectedData) {
      setFormData(prev => ({
        ...prev,
        department_id: preselectedData.department_id,
        role_id: preselectedData.role_id,
      }));
    }
  }, [preselectedData]);

  // Update form when editing existing KPI
  useEffect(() => {
    if (existingKPI) {
      setFormData({
        department_id: existingKPI.department_id,
        role_id: existingKPI.role_id,
        function_id: existingKPI.function_id,
        function_name: existingKPI.functions?.function_name || "",
        kpi_summary: existingKPI.kpi_summary,
        time_tenure: existingKPI.time_tenure,
        target_count: existingKPI.target_count,
        target_revenue: existingKPI.target_revenue,
        final_target: existingKPI.final_target,
        measurement_type: "count", // Default to count for existing KPIs
        is_yes_no: existingKPI.is_yes_no || false,
      });
    }
  }, [existingKPI]);

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*, companies(name)").order("name");
      if (error) throw error;
      return data as { id: string; name: string; companies?: { name: string } }[];
    },
    enabled: open,
  });

  const { data: roles } = useQuery({
    queryKey: ["roles", formData.department_id],
    queryFn: async () => {
      if (!formData.department_id) return [];
      const { data, error } = await supabase
        .from("roles")
        .select("*, departments(name, companies(name))")
        .eq("department_id", formData.department_id)
        .order("role_name");
      if (error) throw error;
      return data as { id: string; role_name: string; departments?: { name: string; companies?: { name: string } } }[];
    },
    enabled: open && !!formData.department_id,
  });

  const { data: functions } = useQuery({
    queryKey: ["functions", formData.role_id],
    queryFn: async () => {
      if (!formData.role_id) return [];
      const { data, error } = await supabase
        .from("functions")
        .select("*, roles(role_name, departments(name, companies(name)))")
        .eq("role_id", formData.role_id)
        .order("function_name");
      if (error) throw error;
      return data as { id: string; function_name: string; roles?: { role_name: string; departments?: { name: string; companies?: { name: string } } } }[];
    },
    enabled: open && !!formData.role_id,
  });

  const { data: existingKPIs } = useQuery({
    queryKey: ["kpis", formData.function_id],
    queryFn: async () => {
      if (!formData.function_id) return [];
      const { data, error } = await (supabase as any)
        .from("kpis")
        .select("id, time_tenure")
        .eq("function_id", formData.function_id);
      if (error) throw error;
      return data as { id: string; time_tenure: string }[];
    },
    enabled: open && !!formData.function_id,
  });

  const createFunction = useMutation({
    mutationFn: async (functionName: string) => {
      if (!formData.role_id) {
        throw new Error("Please select a role first");
      }
      
      const { data, error } = await supabase
        .from("functions")
        .insert({ 
          function_name: functionName, 
          role_id: formData.role_id,
          target_value: 10,
          target_period: "daily"
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (newFunction) => {
      qc.invalidateQueries({ queryKey: ["functions", formData.role_id] });
      setFormData(prev => ({ ...prev, function_id: newFunction.id, function_name: newFunction.function_name }));
      toast.success("Function created successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create function");
    },
  });

  const upsertKPI = useMutation({
    mutationFn: async () => {
      // Check for duplicate KPI
      if (existingKPIs?.some(kpi => kpi.time_tenure === formData.time_tenure) && !existingKPI) {
        throw new Error(`A KPI with ${formData.time_tenure} tenure already exists for this function`);
      }

      // Remove UI-only fields from the data sent to database
      const { function_name, ...dbData } = formData;
      const dbDataFiltered: Record<string, any> = Object.fromEntries(
        Object.entries(dbData).filter(([, v]) => v !== undefined)
      );

      // Handle the range strings: save max value to target_count, full string to target_count_display
      if (formData.target_count !== undefined && formData.target_count !== null && formData.target_count !== "") {
        dbDataFiltered.target_count_display = String(formData.target_count);
        const maxVal = getTargetNumber(formData.target_count);
        dbDataFiltered.target_count = maxVal > 0 ? maxVal : 1;
      } else {
        dbDataFiltered.target_count = 1;
      }
      
      // Only add kpi_summary if it has a value
      const kpiSummary = (formData as any).kpi_summary;
      if (kpiSummary && kpiSummary.trim()) {
        (dbData as any).kpi_summary = kpiSummary.trim();
      }

      if (existingKPI) {
        const { error } = await (supabase as any)
          .from("kpis")
          .update(dbDataFiltered)
          .eq("id", existingKPI.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("kpis").insert(dbDataFiltered);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpis"] });
      toast.success(existingKPI ? "KPI updated" : "KPI created");
      onOpenChange(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setFormData({
      department_id: preselectedData?.department_id || "",
      role_id: preselectedData?.role_id || "",
      function_id: "",
      function_name: "",
      kpi_summary: "",
      time_tenure: "day",
      target_count: undefined,
      target_revenue: 0,
      final_target: 100,
      measurement_type: "count",
      is_yes_no: false,
    });
  };

  const handleFunctionInputChange = (value: string) => {
    setFormData(prev => ({ ...prev, function_name: value, function_id: "" }));
  };

  const handleFunctionSelect = (functionId: string, functionName: string) => {
    setFormData(prev => ({ ...prev, function_id: functionId, function_name: functionName }));
  };

  const handleFunctionCreate = () => {
    if (formData.function_name.trim()) {
      createFunction.mutate(formData.function_name.trim());
    }
  };

  const filteredFunctions = functions?.filter(f => 
    f.function_name.toLowerCase().includes(formData.function_name.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertKPI.mutate();
  };

  const isDuplicate = existingKPIs?.some(kpi => kpi.time_tenure === formData.time_tenure) && !existingKPI;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-violet-600" />
            {existingKPI ? "Edit KPI" : "Create New KPI"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Department and Role Info */}
          {(preselectedData?.department_name || preselectedData?.role_name) && (
            <div className="bg-violet-50 rounded-lg p-4 border border-violet-200">
              <div className="text-sm text-violet-800">
                {preselectedData?.department_name && (
                  <div><strong>Department:</strong> {preselectedData.department_name}</div>
                )}
                {preselectedData?.role_name && (
                  <div><strong>Role:</strong> {preselectedData.role_name}</div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Department {preselectedData?.department_id && "(Read-only)"}
              </label>
              <Select 
                value={formData.department_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, department_id: value, role_id: "", function_id: "", function_name: "" }))}
                disabled={!!preselectedData?.department_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} — {d.companies?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Role {preselectedData?.role_id && "(Read-only)"}
              </label>
              <Select 
                value={formData.role_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, role_id: value, function_id: "", function_name: "" }))}
                disabled={!!preselectedData?.role_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.role_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Function <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Type to search or create new function..."
                value={formData.function_name}
                onChange={(e) => handleFunctionInputChange(e.target.value)}
                disabled={!formData.role_id}
                className="pr-16"
              />
              {formData.function_name && !formData.function_id && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleFunctionCreate}
                  disabled={createFunction.isPending || !formData.function_name.trim()}
                  className="absolute right-1 top-1 h-7 px-2 text-xs bg-violet-600 hover:bg-violet-700"
                >
                  {createFunction.isPending ? "..." : "Create"}
                </Button>
              )}
            </div>
            
            {/* Dropdown for existing functions */}
            {formData.function_name && !formData.function_id && filteredFunctions && filteredFunctions.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-sm max-h-40 overflow-y-auto">
                {filteredFunctions.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleFunctionSelect(f.id, f.function_name)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-b-0"
                  >
                    {f.function_name}
                  </button>
                ))}
              </div>
            )}
            
            {/* Show selected function */}
            {formData.function_id && (
              <div className="mt-2 p-2 bg-violet-50 border border-violet-200 rounded-lg text-sm text-violet-700">
                Selected: {formData.function_name}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              KPI Summary <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Describe the KPI objectives and expectations..."
              value={formData.kpi_summary}
              onChange={(e) => setFormData(prev => ({ ...prev, kpi_summary: e.target.value }))}
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Time Tenure <span className="text-red-500">*</span>
              </label>
              <Select 
                value={formData.time_tenure} 
                onValueChange={(value: 'day' | 'week' | 'month') => setFormData(prev => ({ ...prev, time_tenure: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
              {isDuplicate && (
                <p className="text-xs text-red-500 mt-1">KPI with this tenure already exists</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Measurement Type
              </label>
              <Select
                value={formData.measurement_type || "count"}
                onValueChange={(value: 'count' | 'quantity' | 'revenue') => setFormData(prev => ({ ...prev, measurement_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">By Count</SelectItem>
                  <SelectItem value="quantity">By Quantity</SelectItem>
                  <SelectItem value="revenue">By Revenue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Yes/No Type
              </label>
              <Select
                value={formData.is_yes_no ? "yes" : "no"}
                onValueChange={(value) => setFormData(prev => ({ ...prev, is_yes_no: value === "yes" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
                <Target className="h-3.5 w-3.5" />
                {formData.measurement_type === "revenue" ? "Revenue Target (optional)" : formData.measurement_type === "quantity" ? "Quantity Target (optional)" : "Count Target (optional)"}
              </label>
              <Input
                type={formData.measurement_type === "revenue" ? "number" : "text"}
                min={formData.measurement_type === "revenue" ? 0 : undefined}
                value={formData.measurement_type === "revenue" ? formData.target_revenue : (formData.target_count ?? "")}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  ...(formData.measurement_type === "revenue" 
                    ? { target_revenue: Number(e.target.value) } 
                    : { target_count: e.target.value === "" ? undefined : e.target.value })
                }))}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Final Value <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min={1}
              value={formData.final_target}
              onChange={(e) => setFormData(prev => ({ ...prev, final_target: Number(e.target.value) }))}
              required
            />
          </div>

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
              disabled={upsertKPI.isPending || isDuplicate}
              className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600"
            >
              {upsertKPI.isPending ? "Saving..." : existingKPI ? "Update KPI" : "Create KPI"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
