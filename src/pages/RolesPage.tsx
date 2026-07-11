import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, UserCircle, Search, Layers, Building2, ArrowLeft, UserPlus, BarChart3, Hash, Users2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface Role {
  id: string;
  role_name: string;
  department_id: string;
  created_at: string;
}

export default function RolesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedDepartmentId = searchParams.get('department');
  const fromConfig = searchParams.get('from') === 'config';
  const { isAdmin, isManager, user, userRole } = useAuth();

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

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [departmentId, setDepartmentId] = useState(selectedDepartmentId || "");
  const [search, setSearch] = useState("");

  // Filter states for config dropdown access
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterCompany, setFilterCompany] = useState("all");

  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles", managerDepartments],
    queryFn: async () => {
      let query = supabase.from("roles").select("*, departments(*, companies(*))").order("created_at", { ascending: false });

      // If manager, filter by their departments
      if (isManager() && managerDepartments && managerDepartments.length > 0) {
        query = query.in("department_id", managerDepartments);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Role & { departments?: { name: string; companies?: { id: string; name: string } } })[];
    },
    enabled: !isManager() || (managerDepartments !== undefined),
  });

  const { data: departments } = useQuery({
    queryKey: ["departments", managerDepartments],
    queryFn: async () => {
      let query = supabase.from("departments").select("*, companies(id, name)").order("name");

      // If manager, only show their departments
      if (isManager() && managerDepartments && managerDepartments.length > 0) {
        query = query.in("id", managerDepartments);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as { id: string; name: string; companies?: { id: string; name: string } }[];
    },
    enabled: !isManager() || (managerDepartments !== undefined),
  });

  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredRoles = roles?.filter(r => {
    let matchesSearch = (r.role_name.toLowerCase().includes(search.toLowerCase()) ||
      r.departments?.name?.toLowerCase().includes(search.toLowerCase()));

    // For config dropdown, apply filters
    let matchesDepartment = true;
    let matchesCompany = true;

    if (fromConfig) {
      // If company is selected, filter by company
      if (filterCompany && filterCompany !== 'all') {
        matchesCompany = r.departments?.companies?.id === filterCompany;
      }

      // If department is selected, filter by department
      if (filterDepartment && filterDepartment !== 'all') {
        matchesDepartment = r.department_id === filterDepartment;
      }
    }

    return (selectedDepartmentId ? r.department_id === selectedDepartmentId : true) &&
      matchesSearch &&
      matchesDepartment &&
      matchesCompany;
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("roles").update({ role_name: roleName, department_id: departmentId }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("roles").insert({ role_name: roleName, department_id: departmentId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      toast.success(editId ? "Role updated" : "Role created");
      setOpen(false); setEditId(null); setRoleName(""); setDepartmentId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (r: Role) => { setEditId(r.id); setRoleName(r.role_name); setDepartmentId(r.department_id); setOpen(true); };
  const openNew = () => {
    setEditId(null);
    setRoleName("");
    // For managers, pre-select their department
    if (isManager() && userRole.department_id) {
      setDepartmentId(userRole.department_id);
    } else {
      setDepartmentId(selectedDepartmentId || (filterDepartment !== "all" ? filterDepartment : ""));
    }
    setOpen(true);
  };
  const goToEmployees = (roleId: string) => { navigate(`/employees?role=${roleId}`); };

  const openKpiPage = (role: Role & { departments?: { name: string } }) => {
    navigate(`/create-kpi?department=${role.department_id}&role=${role.id}`);
  };

  const handleCompanyChange = (companyId: string) => {
    setFilterCompany(companyId);
    // Reset department filter when company changes
    setFilterDepartment("all");
  };

  return (
    <div className="space-y-6 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-4 relative">
        {/* Back to Departments Button - positioned absolute on left */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const department = departments?.find(d => d.id === selectedDepartmentId);
            if (department && department.companies?.id) {
              navigate(`/departments?company=${department.companies.id}`);
            } else {
              navigate("/departments");
            }
          }}
          className="absolute left-0 hidden sm:flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 hover:from-blue-600 hover:to-cyan-600 shadow-md shadow-blue-500/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Departments
        </Button>

        {/* Mobile Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const department = departments?.find(d => d.id === selectedDepartmentId);
            if (department && department.companies?.id) {
              navigate(`/departments?company=${department.companies.id}`);
            } else {
              navigate("/departments");
            }
          }}
          className="sm:hidden self-start flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 hover:from-blue-600 hover:to-cyan-600 shadow-md shadow-blue-500/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Departments
        </Button>

        {/* Centered Title Section */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center">
              <UserCircle className="h-5 w-5 text-white" />
            </div>
            Roles
          </h1>
          <p className="text-gray-500 mt-1">Define job roles within departments</p>
        </div>

        {/* Add Role Button - positioned absolute on right */}
        <div className="absolute right-0 hidden sm:block">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 shadow-lg shadow-violet-500/25">
                <Plus className="h-4 w-4 mr-2" /> Add Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Edit Role" : "New Role"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Role Name</label>
                  <Input placeholder="e.g. Software Engineer" value={roleName} onChange={(e) => setRoleName(e.target.value)} required autoFocus />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Department</label>
                  <Select
                    value={isManager() && userRole.department_id ? userRole.department_id : departmentId}
                    onValueChange={setDepartmentId}
                    disabled={isManager()}
                  >
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments?.filter(d => filterCompany === "all" || d.companies?.id === filterCompany).map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name} — {d.companies?.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isManager() && (
                    <p className="text-xs text-gray-500 mt-1">Managers can only create roles in their assigned department</p>
                  )}
                </div>
                <Button type="submit" disabled={upsert.isPending} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500">
                  {upsert.isPending ? "Saving…" : "Save"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Mobile Add Role Button */}
        <div className="sm:hidden self-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 shadow-lg shadow-violet-500/25">
                <Plus className="h-4 w-4 mr-2" /> Add Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Edit Role" : "New Role"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Role Name</label>
                  <Input placeholder="e.g. Software Engineer" value={roleName} onChange={(e) => setRoleName(e.target.value)} required autoFocus />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Department</label>
                  <Select
                    value={isManager() && userRole.department_id ? userRole.department_id : departmentId}
                    onValueChange={setDepartmentId}
                    disabled={isManager()}
                  >
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments?.filter(d => filterCompany === "all" || d.companies?.id === filterCompany).map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name} — {d.companies?.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isManager() && (
                    <p className="text-xs text-gray-500 mt-1">Managers can only create roles in their assigned department</p>
                  )}
                </div>
                <Button type="submit" disabled={upsert.isPending} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500">
                  {upsert.isPending ? "Saving…" : "Save"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Search Row */}
      <div className="flex flex-col md:flex-row gap-4 md:items-end">
        {/* Filter Cards - Only show when accessed via config dropdown */}
        {fromConfig && (
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium mb-2">
              <div className="h-4 w-4 rounded bg-gradient-to-br from-violet-500 to-fuchsia-400 flex items-center justify-center">
                <span className="text-white text-xs font-bold">F</span>
              </div>
              Filters
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              {/* Company Filter */}
              <div className="flex-1 min-w-[150px]">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-emerald-500" />
                  <label className="text-sm font-medium text-gray-700">Company</label>
                </div>
                <Select value={filterCompany} onValueChange={handleCompanyChange}>
                  <SelectTrigger className="w-full h-10">
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

              {/* Department Filter */}
              <div className="flex-1 min-w-[150px]">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-4 w-4 text-blue-500" />
                  <label className="text-sm font-medium text-gray-700">Department</label>
                </div>
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departments?.filter(d =>
                      filterCompany === 'all' || d.companies?.id === filterCompany
                    ).map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Search - Right side */}
        <div className="w-full md:w-[300px]">
          <div className="flex items-center gap-2 mb-2 md:hidden">
            <Search className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Search</label>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>
      </div>

      {/* Active Filters Display - Below the row */}
      {fromConfig && (filterDepartment && filterDepartment !== 'all' || filterCompany && filterCompany !== 'all') && (
        <div className="flex items-center gap-2 flex-wrap -mt-2">
          <span className="text-sm text-gray-500">Active filters:</span>
          {filterCompany && filterCompany !== 'all' && (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
              <Building2 className="h-3 w-3" />
              {companies?.find(c => c.id === filterCompany)?.name || 'Company'}
              <button
                onClick={() => {
                  setFilterCompany("all");
                  setFilterDepartment("all");
                }}
                className="ml-1 hover:text-emerald-900"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {filterDepartment && filterDepartment !== 'all' && (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              <Layers className="h-3 w-3" />
              {departments?.find(d => d.id === filterDepartment)?.name || 'Department'}
              <button
                onClick={() => setFilterDepartment("all")}
                className="ml-1 hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <button
            onClick={() => {
              setFilterDepartment("all");
              setFilterCompany("all");
            }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Roles Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filteredRoles?.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <UserCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No roles yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first role</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
          {filteredRoles?.map((r, i) => {
            const gradients = [
              "from-blue-500 to-cyan-400",
              "from-violet-500 to-fuchsia-400",
              "from-emerald-500 to-teal-400",
              "from-amber-500 to-orange-400"
            ];
            const currentGradient = gradients[i % gradients.length];

            return (
              <div key={r.id} className={cn(
                "group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 h-full flex flex-col"
              )}>
                {/* Background decoration */}
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${currentGradient} opacity-10 rounded-bl-full`} />

                <div className="relative z-10 flex flex-col flex-grow">
                  <div className="flex items-start justify-between mb-5">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${currentGradient} flex items-center justify-center shadow-lg shadow-gray-200`}>
                      <UserCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      {isAdmin() && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg"
                          onClick={() => openKpiPage(r)}
                          title="Manage KPI"
                        >
                          <BarChart3 className="h-3.5 w-3.5 text-gray-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg"
                        onClick={() => goToEmployees(r.id)}
                        title="Create Employees"
                      >
                        <UserPlus className="h-3.5 w-3.5 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg"
                        onClick={() => openEdit(r)}
                      >
                        <Pencil className="h-3.5 w-3.5 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-600 hover:text-red-700"
                        onClick={() => remove.mutate(r.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{r.role_name}</h3>
                      <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        <span>Role</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 space-y-3">
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <Layers className="h-3 w-3" />
                        <span className="truncate">{r.departments?.name || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{r.departments?.companies?.name || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <Hash className="h-3 w-3" />
                        <span>ID: {r.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <Users2 className="h-3 w-3" />
                        <span>Created {new Date(r.created_at).toLocaleDateString()}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-gray-50 border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 rounded-lg"
                          onClick={() => navigate(`/employees?role=${r.id}&view=members`)}
                        >
                          <UserCircle className="h-3 w-3 mr-1" />
                          Members
                        </Button>
                        {isAdmin() && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-gray-50 border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 rounded-lg"
                            onClick={() => openKpiPage(r)}
                          >
                            <BarChart3 className="h-3 w-3 mr-1" />
                            KPI
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-gray-50 border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 rounded-lg"
                          onClick={() => goToEmployees(r.id)}
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
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
