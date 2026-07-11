import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Layers, Building2, Search, Users2, Hash, ArrowLeft, UserPlus, Briefcase, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";

interface Department {
  id: string;
  name: string;
  company_id: string;
  created_at: string;
}

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedCompanyId = searchParams.get('company');
  const fromConfig = searchParams.get('from') === 'config';
  const { isAdmin, isManager, user } = useAuth();
  
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
  
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState(selectedCompanyId || "");
  const [search, setSearch] = useState("");
  
  // Filter state for config dropdown access
  const [filterCompany, setFilterCompany] = useState("all");

  const { data: departments, isLoading, refetch } = useQuery({
    queryKey: ["departments", managerDepartments],
    queryFn: async () => {
      let query = supabase.from("departments").select("*, companies(name)").order("created_at", { ascending: false });
      
      // If manager, filter by their departments
      if (isManager() && managerDepartments && managerDepartments.length > 0) {
        query = query.in("id", managerDepartments);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as (Department & { companies?: { name: string } })[];
    },
    enabled: !isManager() || (managerDepartments !== undefined),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Refetch data when component mounts or when selected company changes
  useEffect(() => {
    refetch();
  }, [refetch, selectedCompanyId]);

  const { data: companies } = useQuery({
    queryKey: ["companies", managerDepartments],
    queryFn: async () => {
      let query = supabase.from("companies").select("*").order("name");
      
      // If manager, only show companies for their departments
      if (isManager() && departments && departments.length > 0) {
        const companyIds = departments.map(d => d.company_id).filter(Boolean);
        if (companyIds.length > 0) {
          query = query.in("id", companyIds);
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !isManager() || (departments !== undefined),
  });

  const filteredDepartments = departments?.filter(d => {
    // First filter by selected company if one is specified
    if (selectedCompanyId && d.company_id !== selectedCompanyId) {
      return false;
    }
    
    // For config dropdown, apply company filter
    let matchesCompany = true;
    if (fromConfig && filterCompany && filterCompany !== 'all') {
      matchesCompany = d.company_id === filterCompany;
    }
    
    // Then apply search filters
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
           d.companies?.name?.toLowerCase().includes(search.toLowerCase());
    
    return matchesSearch && matchesCompany;
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("departments").update({ name, company_id: companyId }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("departments").insert({ name, company_id: companyId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      toast.success(editId ? "Department updated" : "Department created");
      setOpen(false); setEditId(null); setName(""); setCompanyId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (d: Department) => { setEditId(d.id); setName(d.name); setCompanyId(d.company_id); setOpen(true); };
  const openNew = () => { setEditId(null); setName(""); setCompanyId(selectedCompanyId || (filterCompany !== "all" ? filterCompany : "")); setOpen(true); };
  const goToRoles = (departmentId: string) => { navigate(`/roles?department=${departmentId}`); };

  return (
    <div className="space-y-6 pt-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Invalidate companies cache to ensure fresh data
            qc.invalidateQueries({ queryKey: ["companies"] });
            navigate("/companies");
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 hover:from-blue-600 hover:to-cyan-600 shadow-md shadow-blue-500/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Companies
        </Button>
        
        <div className="text-center">
          {selectedCompanyId && companies?.find(c => c.id === selectedCompanyId) && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {companies.find(c => c.id === selectedCompanyId)?.name}
              </span>
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-400 flex items-center justify-center">
              <Layers className="h-5 w-5 text-white" />
            </div>
            Departments
          </h1>
          <p className="text-gray-500 mt-1">
            {selectedCompanyId ? "Manage company departments" : "Organize your team structure"}
          </p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 shadow-lg shadow-violet-500/25">
              <Plus className="h-4 w-4 mr-2" /> Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit Department" : "New Department"}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Department Name</label>
                <Input placeholder="e.g. Engineering" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Company {selectedCompanyId && "(Read-only)"}
                </label>
                <Select 
                  value={companyId} 
                  onValueChange={setCompanyId}
                  disabled={!!selectedCompanyId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedCompanyId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Company is pre-selected when accessed from company page
                  </p>
                )}
              </div>
              <Button type="submit" disabled={upsert.isPending} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500">
                {upsert.isPending ? "Saving…" : "Save"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search Row */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Filter Cards - Only show when accessed via config dropdown */}
        {fromConfig && (
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium mb-2">
              <div className="h-4 w-4 rounded bg-gradient-to-br from-violet-500 to-fuchsia-400 flex items-center justify-center">
                <span className="text-white text-xs font-bold">F</span>
              </div>
              Filters
            </div>
            
            <div className="flex-1">
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All companies</SelectItem>
                  {companies?.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Search - Right side */}
        <div className="w-full md:w-[300px]">
          <div className="flex items-center gap-2 text-sm text-gray-600 font-medium mb-2 md:invisible">
            <div className="h-4 w-4 rounded bg-gradient-to-br from-violet-500 to-fuchsia-400 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            Search
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search departments..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>
      </div>

      {/* Active Filters Display - Below the row */}
      {fromConfig && filterCompany && filterCompany !== 'all' && (
        <div className="flex items-center gap-2 flex-wrap -mt-2">
          <span className="text-sm text-gray-500">Active filters:</span>
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
            <Building2 className="h-3 w-3" />
            {companies?.find(c => c.id === filterCompany)?.name || 'Company'}
            <button 
              onClick={() => setFilterCompany("all")}
              className="ml-1 hover:text-emerald-900"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <button 
            onClick={() => setFilterCompany("all")}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Departments Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filteredDepartments?.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No departments yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first department</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDepartments?.map((d, i) => {
            const gradients = [
              "from-blue-500 to-cyan-400",
              "from-violet-500 to-fuchsia-400", 
              "from-emerald-500 to-teal-400",
              "from-amber-500 to-orange-400"
            ];
            const currentGradient = gradients[i % gradients.length];
            
            return (
            <div key={d.id} className={cn(
              "group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300"
            )}>
              {/* Background decoration */}
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${currentGradient} opacity-10 rounded-bl-full`} />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-5">
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${currentGradient} flex items-center justify-center shadow-lg shadow-gray-200`}>
                    <Layers className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg" 
                      onClick={() => goToRoles(d.id)}
                      title="Create Roles"
                    >
                      <Briefcase className="h-3.5 w-3.5 text-gray-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg" 
                      onClick={() => openEdit(d)}
                    >
                      <Pencil className="h-3.5 w-3.5 text-gray-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-600 hover:text-red-700" 
                      onClick={() => remove.mutate(d.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{d.name}</h3>
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                      <span>Department</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <Building2 className="h-3 w-3" />
                      <span className="truncate">{d.companies?.name || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <Hash className="h-3 w-3" />
                      <span>ID: {d.id.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <Users2 className="h-3 w-3" />
                      <span>Created {new Date(d.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full bg-gray-50 border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 rounded-lg"
                      onClick={() => goToRoles(d.id)}
                    >
                      <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                      Create Roles
                      <ArrowLeft className="h-3 w-3 ml-auto rotate-180" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}
