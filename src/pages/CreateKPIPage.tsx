import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { KPICreationForm, KPIWithRelations } from "@/types/kpi";
import { getTargetNumber } from "@/lib/utils";
import { Calendar, TrendingUp, BarChart3, ArrowLeft, Save, Users, Building2, Briefcase, Target, Award, Activity, Clock, User, Layers, CheckCircle2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function CreateKPIPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { userRole, isManager, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editingKPIId, setEditingKPIId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<KPICreationForm>({
    department_id: "",
    role_id: "",
    function_id: "",
    function_name: "", // For inline function creation
    kpi_summary: "", // Keep in state but remove from UI
    time_tenure: "day",
    target_count: undefined,
    target_revenue: 0,
    final_target: 100,
    measurement_type: "count",
    employee_id: "", // New field for user selection
    project_client: "", // Project or client name
    module_handle: "", // Module or handle name
    is_yes_no: false, // Yes/No type KPI
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  // Auto-select department for managers with only one department
  useEffect(() => {
    if (isManager() && departments && departments.length === 1 && !formData.department_id) {
      setFormData(prev => ({ ...prev, department_id: departments[0].id }));
    }
  }, [isManager, departments, formData.department_id]);

  // If `edit` query param is present, load KPI and populate form for editing
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId) return;
    setIsEditing(true);
    setEditingKPIId(editId);

    (async () => {
      const { data: kpi, error } = await (supabase as any)
        .from('kpis')
        .select('*')
        .eq('id', editId)
        .maybeSingle();
      if (error) {
        console.error('Failed to load KPI for edit:', error);
        toast.error('Failed to load KPI for editing');
        return;
      }
      if (!kpi) return;

      setFormData(prev => ({
        ...prev,
        department_id: kpi.department_id,
        role_id: kpi.role_id,
        function_id: kpi.function_id,
        function_name: kpi.functions?.function_name || '',
        kpi_summary: kpi.kpi_summary || '',
        time_tenure: kpi.time_tenure,
        target_count: kpi.target_count ?? undefined,
        target_revenue: kpi.target_revenue ?? 0,
        final_target: kpi.final_target ?? 100,
        measurement_type: kpi.is_yes_no ? 'yes_no' : (kpi.target_revenue && kpi.target_revenue > 0 ? 'revenue' : 'count'),
        project_client: kpi.project_client || '',
        module_handle: kpi.module_handle || '',
        is_yes_no: kpi.is_yes_no || false,
      }));
    })();
  }, [searchParams]);

  const { data: roles } = useQuery({
    queryKey: ["roles", formData.department_id],
    queryFn: async () => {
      if (!formData.department_id) return [];
      const { data, error } = await (supabase as any)
        .from("roles")
        .select("*, departments(name, companies(name))")
        .eq("department_id", formData.department_id)
        .order("role_name");
      if (error) throw error;
      return data as { id: string; role_name: string; departments?: { name: string; companies?: { name: string } } }[];
    },
    enabled: !!formData.department_id,
  });

  const { data: employees } = useQuery({
    queryKey: ["employees", formData.department_id, formData.role_id],
    queryFn: async () => {
      if (!formData.department_id || !formData.role_id) return [];
      const { data, error } = await (supabase as any)
        .from("employees")
        .select("*, roles(role_name), departments(name)")
        .eq("department_id", formData.department_id)
        .eq("role_id", formData.role_id)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; email: string; roles?: { role_name: string }; departments?: { name: string } }[];
    },
    enabled: !!formData.department_id && !!formData.role_id,
  });

  const { data: functions } = useQuery({
    queryKey: ["functions", formData.role_id, formData.employee_id],
    queryFn: async () => {
      if (!formData.role_id) return [];
      
      let query = (supabase as any)
        .from("functions")
        .select("*, roles(role_name, departments(name, companies(name)))")
        .eq("role_id", formData.role_id)
        .order("function_name");
      
      // If a specific user is selected, filter functions that are relevant to that user
      if (formData.employee_id) {
        // Get employee details to verify they belong to the selected role
        const { data: employeeData } = await (supabase as any)
          .from("employees")
          .select("role_id, department_id")
          .eq("id", formData.employee_id)
          .single();
        
        // Only show functions if the employee belongs to the selected role and department
        if (employeeData && employeeData.role_id === formData.role_id) {
          // Functions are already filtered by role_id above
          // Additional filtering can be added here if needed based on specific user-function relationships
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as { id: string; function_name: string; roles?: { role_name: string; departments?: { name: string; companies?: { name: string } } } }[];
    },
    enabled: !!formData.role_id,
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
    enabled: !!formData.function_id,
  });

  const createFunction = useMutation({
    mutationFn: async (functionName: string) => {
      if (!formData.role_id) {
        throw new Error("Please select a role first");
      }
      
      const functionData = {
        function_name: functionName, 
        role_id: formData.role_id,
        target_value: 0,
        target_period: "daily"
      };
      
      console.log("Creating function with data:", functionData);
      
      const { data, error } = await (supabase as any)
        .from("functions")
        .insert(functionData)
        .select()
        .single();
      
      if (error) {
        console.error("Function creation error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log("Function created successfully:", data);
      return data;
    },
    onSuccess: (newFunction) => {
      qc.invalidateQueries({ queryKey: ["functions", formData.role_id, formData.employee_id] });
      setFormData(prev => ({ ...prev, function_id: newFunction.id, function_name: newFunction.function_name }));
      toast.success("Function created successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create function");
    },
  });

  const createKPI = useMutation({
    mutationFn: async () => {
      // Check user authentication and role
      const { data: { user } } = await (supabase as any).auth.getUser();
      console.log("Current user:", user);
      
      const { data: roleData } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id)
        .single();
      console.log("User role:", roleData);
      
      // Validate required fields (removed kpi_summary validation)
      if (!formData.department_id || !formData.role_id || !formData.function_id) {
        throw new Error("Please select department, role, and function");
      }
      
      // Validate target based on measurement type: revenue must have target; count is optional
      if (formData.measurement_type === "revenue") {
        if (!formData.target_revenue || formData.target_revenue <= 0) {
          throw new Error("Revenue target must be greater than 0");
        }
      }
      
      if (!formData.final_target || formData.final_target <= 0) {
        throw new Error("Final target must be greater than 0");
      }

      // Check for duplicate KPI (ignore when editing the same KPI)
      if (!isEditing && existingKPIs?.some((kpi: any) => kpi.time_tenure === formData.time_tenure)) {
        throw new Error(`A KPI with ${formData.time_tenure} tenure already exists for this function`);
      }

      // Remove UI-only fields from the data sent to database
      const { measurement_type, function_name, employee_id, ...dbData } = formData;
      // Filter out undefined values so we don't insert explicit NULLs that violate DB NOT NULL constraints
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
      if (formData.kpi_summary && formData.kpi_summary.trim()) {
        (dbDataFiltered as any).kpi_summary = formData.kpi_summary.trim();
      }
      
      console.log("Submitting KPI data:", dbDataFiltered);
      console.log("Form data before filtering:", formData);

      let error: any = null;
      let data: any = null;
      if (isEditing && editingKPIId) {
        const res = await (supabase as any).from("kpis").update(dbDataFiltered).eq("id", editingKPIId).select();
        error = res.error;
        data = res.data;
      } else {
        const res = await (supabase as any).from("kpis").insert(dbDataFiltered).select();
        error = res.error;
        data = res.data;
      }
      if (error) {
        console.error("KPI creation error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        
        // Check if it's an RLS issue
        if (error.code === '42501' || error.message.includes('policy')) {
          throw new Error("Permission denied. You need admin privileges to create KPIs.");
        }
        
        throw error;
      }
      console.log(isEditing ? "KPI updated successfully:" : "KPI created successfully:", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpis"] });
      toast.success("KPI created successfully!");
      navigate("/kpi-dashboard");
    },
    onError: (e: any) => {
      console.error("KPI creation failed:", e);
      toast.error(e.message || "Failed to create KPI");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createKPI.mutate();
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

  const isDuplicate = existingKPIs?.some((kpi: any) => kpi.time_tenure === formData.time_tenure);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col items-center text-center relative py-6">
        {/* Corner Icons */}
        <div className="absolute -top-3 -left-3 opacity-20 transform -rotate-12">
          <BarChart3 className="h-10 w-10 text-violet-600" />
        </div>
        <div className="absolute -top-3 -right-3 opacity-20 transform rotate-12">
          <Target className="h-10 w-10 text-emerald-600" />
        </div>
        <div className="absolute -bottom-3 -left-3 opacity-20 transform rotate-45">
          <TrendingUp className="h-10 w-10 text-blue-600" />
        </div>
        <div className="absolute -bottom-3 -right-3 opacity-20 transform -rotate-45">
          <Award className="h-10 w-10 text-amber-600" />
        </div>
        
        <div className="flex items-center gap-3 mb-2 justify-center relative z-10">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-xl shadow-violet-300">
            <BarChart3 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create KPI</h1>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold border border-blue-200 shadow-sm">
            <Clock className="h-3 w-3" />
            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <p className="text-gray-500 mb-2 relative z-10">Define new performance indicators for your team</p>
        <div className="flex items-center gap-2 text-gray-600 relative z-10">
          <Calendar className="h-3 w-3" />
          <span className="text-xs font-medium">
            {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center mb-4">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                step === 1 ? "bg-violet-600 text-white" :
                step === 2 && formData.department_id ? "bg-violet-600 text-white" :
                step === 3 && formData.role_id ? "bg-violet-600 text-white" :
                step === 4 && formData.function_id ? "bg-violet-600 text-white" :
                "bg-gray-200 text-gray-500"
              )}>
                {step}
              </div>
              {step < 4 && (
                <div className={cn(
                  "w-8 h-1 mx-1 transition-colors",
                  step < 2 || (step === 2 && formData.department_id) || 
                  (step === 3 && formData.role_id) || (step === 4 && formData.function_id)
                    ? "bg-violet-600" : "bg-gray-200"
                )} />
              )}
            </div>
          ))}
        </div>
        <div className="ml-3 text-xs text-gray-600">
          {formData.function_id ? "Ready to create" : 
           formData.role_id ? "Select function" :
           formData.department_id ? "Select role" : "Select department"}
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Form */}
        <div className="lg:col-span-3">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b py-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <Target className="h-4 w-4 text-white" />
                </div>
                KPI Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Department & Role */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-violet-600" />
                      Department
                    </label>
                    <Select 
                      value={formData.department_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, department_id: value, role_id: "", function_id: "", function_name: "", employee_id: "" }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments?.map(d => (
                          <SelectItem key={d.id} value={d.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="font-medium">{d.name}</div>
                                <div className="text-xs text-gray-500">{d.companies?.name}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-violet-600" />
                      Role
                    </label>
                    <Select 
                      value={formData.role_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, role_id: value, function_id: "", function_name: "", employee_id: "" }))}
                      disabled={!formData.department_id}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles?.map(r => (
                          <SelectItem key={r.id} value={r.id}>
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-gray-400" />
                              <span>{r.role_name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Function */}
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-violet-600" />
                    Function
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder={formData.role_id && functions && functions.length > 0 
                        ? "Select from existing functions below or type to create new..." 
                        : "Select a role first to see existing functions..."}
                      value={formData.function_id ? functions?.find(f => f.id === formData.function_id)?.function_name || "" : formData.function_name}
                      onChange={(e) => handleFunctionInputChange(e.target.value)}
                      disabled={!formData.role_id}
                      className="h-10 pr-16 text-sm"
                    />
                    {formData.function_name && !formData.function_id && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleFunctionCreate}
                        disabled={createFunction.isPending || !formData.function_name.trim()}
                        className="absolute right-1 top-1 h-6 px-2 text-xs bg-violet-600 hover:bg-violet-700"
                      >
                        {createFunction.isPending ? "..." : "Create"}
                      </Button>
                    )}
                  </div>
                  
                  {/* Dropdown for existing functions - Always show when role is selected */}
                  {formData.role_id && functions && functions.length > 0 && (
                    <div className="mt-2 border border-violet-200 rounded-xl bg-violet-50/50 shadow-sm max-h-48 overflow-y-auto">
                      <div className="px-4 py-3 text-sm font-semibold text-violet-700 border-b border-violet-200 bg-violet-100/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Existing Functions
                        </div>
                        <span className="text-xs font-normal text-violet-600">{functions.length} available</span>
                      </div>
                      {functions.map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => handleFunctionSelect(f.id, f.function_name)}
                          className={cn(
                            "w-full text-left px-4 py-3 text-sm border-b border-violet-100 last:border-b-0 transition-colors flex items-center justify-between",
                            formData.function_id === f.id 
                              ? "bg-violet-100 text-violet-800 font-medium" 
                              : "hover:bg-violet-100/50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Activity className={cn("h-4 w-4", formData.function_id === f.id ? "text-violet-700" : "text-violet-500")} />
                            <span>{f.function_name}</span>
                          </div>
                          {formData.function_id === f.id && (
                            <div className="flex items-center gap-1 text-xs">
                              <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                              <span className="text-violet-600">Selected</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Project/Client & Module/Handle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-emerald-600" />
                      Project/Client
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter project or client name..."
                      value={formData.project_client || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, project_client: e.target.value }))}
                      className="h-10 text-sm border-emerald-200 focus:border-emerald-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-emerald-600" />
                      Module/Handle
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter module or handle name..."
                      value={formData.module_handle || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, module_handle: e.target.value }))}
                      className="h-10 text-sm border-emerald-200 focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* User Selection removed per UI request */}

                {/* Time Tenure & Measurement Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-violet-600" />
                      Time Tenure
                    </label>
                    <Select 
                      value={formData.time_tenure} 
                      onValueChange={(value: 'day' | 'week' | 'month') => setFormData(prev => ({ ...prev, time_tenure: value }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select measurement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Daily</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="week">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Weekly</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="month">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Monthly</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {isDuplicate && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        KPI with this measurement already exists
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-violet-600" />
                      Measurement Type
                    </label>
                    <Select
                      value={formData.measurement_type || "count"}
                      onValueChange={(value: 'count' | 'revenue' | 'yes_no') => setFormData(prev => ({ 
                        ...prev, 
                        measurement_type: value,
                        is_yes_no: value === "yes_no"
                      }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded bg-cyan-500" />
                            <span>By Count</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="revenue">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded bg-green-500" />
                            <span>By Revenue</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="yes_no">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded bg-purple-500" />
                            <span>Yes/No</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Target Values */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Target className="h-4 w-4 text-violet-600" />
                      {formData.measurement_type === "revenue" ? "Revenue Target" : "Count Target"}
                    </label>
                    <Input
                      type={formData.measurement_type === "revenue" ? "number" : "text"}
                      min={formData.measurement_type === "revenue" ? 0 : undefined}
                      step={formData.measurement_type === "revenue" ? 0.01 : undefined}
                      placeholder={formData.measurement_type === "revenue" ? "Enter revenue amount" : "Enter target value or range (e.g., 150-200)"}
                      value={formData.measurement_type === "revenue" ? (formData.target_revenue || "") : (formData.target_count ?? "")}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (formData.measurement_type === "revenue") {
                          const value = raw === "" ? undefined : Number(raw);
                          const scaledFinal = (value && value > 0) ? Math.min(100, value * 10) : 100;
                          setFormData(prev => ({ ...prev, target_revenue: value || 0, final_target: scaledFinal }));
                        } else {
                          // For count/quantity/yes_no types, allow empty (undefined) target
                          if (raw === "") {
                            setFormData(prev => ({ ...prev, target_count: undefined, final_target: 100 }));
                          } else {
                            let scaledFinal = 100;
                            const parts = raw.split('-');
                            const maxVal = Number(parts[parts.length - 1].trim());
                            if (!isNaN(maxVal) && maxVal > 0) {
                              scaledFinal = Math.min(100, maxVal * 10);
                            }
                            setFormData(prev => ({ ...prev, target_count: raw, final_target: scaledFinal }));
                          }
                        }
                      }}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Award className="h-4 w-4 text-violet-600" />
                      Final Target Score
                    </label>
                    <Input
                      type="number"
                      value={100}
                      disabled
                      className="h-10 text-sm bg-gray-100 text-gray-600"
                    />
                    <p className="text-xs text-gray-500">Fixed at 100 for all KPIs</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="flex-1 h-10 text-sm font-medium"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createKPI.isPending || isDuplicate || !formData.department_id || !formData.role_id || !formData.function_id}
                    className="flex-1 h-10 text-sm font-medium bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600"
                  >
                    {createKPI.isPending ? (
                      <>Creating KPI...</>
                    ) : (
                      <>
                        <Save className="h-3 w-3 mr-2" />
                        {isEditing ? 'Update KPI' : 'Create KPI'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selection Summary at Bottom */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b py-3">
          <CardTitle className="flex items-center gap-3 text-base">
            <div className="h-6 w-6 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Users className="h-3 w-3 text-white" />
            </div>
            Selection Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg border border-violet-100">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Building2 className="h-3 w-3 text-violet-600" />
                <span className="text-xs font-medium text-gray-600">Department</span>
              </div>
              {formData.department_id ? (
                <div className="font-semibold text-violet-700 text-sm">
                  {departments?.find(d => d.id === formData.department_id)?.name}
                </div>
              ) : (
                <div className="text-gray-400 text-xs">Not selected</div>
              )}
            </div>
            
            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-100">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Briefcase className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-medium text-gray-600">Role</span>
              </div>
              {formData.role_id ? (
                <div className="font-semibold text-blue-700 text-sm">
                  {roles?.find(r => r.id === formData.role_id)?.role_name}
                </div>
              ) : (
                <div className="text-gray-400 text-xs">Not selected</div>
              )}
            </div>
            
            <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-100">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Activity className="h-3 w-3 text-emerald-600" />
                <span className="text-xs font-medium text-gray-600">Function</span>
              </div>
              {formData.function_id ? (
                <div className="font-semibold text-emerald-700 text-sm">
                  {formData.function_name}
                </div>
              ) : (
                <div className="text-gray-400 text-xs">Not selected</div>
              )}
            </div>
            
            <div className="text-center p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-100">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="h-3 w-3 text-amber-600" />
                <span className="text-xs font-medium text-gray-600">User</span>
              </div>
              {formData.employee_id ? (
                <div className="font-semibold text-amber-700 text-sm">
                  {employees?.find(e => e.id === formData.employee_id)?.name}
                </div>
              ) : (
                <div className="text-gray-400 text-xs">All users</div>
              )}
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-3 w-3 text-gray-600" />
                <span className="text-xs font-medium text-gray-600">KPI Status:</span>
              </div>
              <div className="flex items-center gap-2">
                {formData.function_id ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs font-medium text-green-700">Ready to create</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <span className="text-xs font-medium text-amber-700">
                      {formData.role_id ? "Select function" : 
                       formData.department_id ? "Select role" : "Select department"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
