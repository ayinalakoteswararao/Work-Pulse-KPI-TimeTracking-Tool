import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Users, Search, Layers, Building2, Mail, Phone, Hash, Sparkles, BarChart3, Eye, X, CalendarIcon, User, DollarSign, CalendarDays, Briefcase, HelpCircle, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import EmployeeDetailsModal from "@/components/EmployeeDetailsModal";
import { Employee } from "@/types/employee";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { isAdmin, isManager, user, userRole } = useAuth();
  
  const roleFilter = searchParams.get('role');
  const viewMode = searchParams.get('view');
  const fromConfig = searchParams.get('from') === 'config';
  
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
  const [employeeCode, setEmployeeCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [workingDays, setWorkingDays] = useState("30");
  const [joinDate, setJoinDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [gender, setGender] = useState("unspecified");
  const [search, setSearch] = useState("");
  
  // Filter states for config dropdown access
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    department_id: string;
    role_id: string;
    join_date?: string | null;
    created_at: string;
    departments?: { name: string; companies?: { name: string } };
    roles?: { role_name: string };
  } | null>(null);

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees", managerDepartments],
    queryFn: async () => {
      let query = supabase
        .from("employees")
        .select("id, employee_code, name, email, phone, department_id, role_id, monthly_salary, working_days, join_date, gender, created_at, updated_at, departments(*, companies(*)), roles(role_name)")
        .order("created_at", { ascending: false });
      
      // If manager, filter by their departments
      if (isManager() && managerDepartments && managerDepartments.length > 0) {
        query = query.in("department_id", managerDepartments);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as (Employee & { departments?: { name: string; companies?: { id: string; name: string } }; roles?: { role_name: string } })[];
    },
    enabled: !isManager() || (managerDepartments !== undefined),
  });

  const { data: departments } = useQuery({
    queryKey: ["departments", managerDepartments],
    queryFn: async () => {
      let query = supabase.from("departments").select("*, companies(*)").order("name");
      
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

  const { data: roles } = useQuery({
    queryKey: ["roles", managerDepartments],
    queryFn: async () => {
      let query = supabase.from("roles").select("*").order("role_name");
      
      // If manager, only show roles from their departments
      if (isManager() && managerDepartments && managerDepartments.length > 0) {
        query = query.in("department_id", managerDepartments);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as { id: string; role_name: string }[];
    },
    enabled: !isManager() || (managerDepartments !== undefined),
  });

  const selectedRoleName = useMemo(() => 
    roles?.find(r => r.id === roleFilter)?.role_name, 
    [roles, roleFilter]
  );

  const filteredEmployees = employees?.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      e.roles?.role_name?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter ? e.role_id === roleFilter : true;
    
    // For config dropdown, apply filters
    let matchesDepartment = true;
    let matchesCompany = true;
    let matchesConfigRole = true;
    
    if (fromConfig) {
      // If company is selected, filter by company
      if (filterCompany && filterCompany !== 'all') {
        matchesCompany = e.departments?.companies?.id === filterCompany;
      }
      
      // If department is selected, filter by department
      if (filterDepartment && filterDepartment !== 'all') {
        matchesDepartment = e.department_id === filterDepartment;
      }
      
      // If role is selected, filter by role
      if (filterRole && filterRole !== 'all') {
        matchesConfigRole = e.role_id === filterRole;
      }
    }
    
    return matchesSearch && matchesRole && matchesDepartment && matchesCompany && matchesConfigRole;
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        employee_code: employeeCode,
        name,
        email,
        phone,
        department_id: departmentId,
        role_id: roleId,
        monthly_salary: monthlySalary ? Number(monthlySalary) : null,
        working_days: workingDays ? Number(workingDays) : 30,
        join_date: joinDate || null,
        gender: gender,
      };
      if (editId) {
        const { error } = await supabase.from("employees").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success(editId ? "Employee updated" : "Employee created");
      setOpen(false);
      setEditId(null);
      setEmployeeCode("");
      setName("");
      setEmail("");
      setPhone("");
      setDepartmentId("");
      setRoleId("");
      setMonthlySalary("");
      setWorkingDays("30");
      setJoinDate(format(new Date(), 'yyyy-MM-dd'));
      setGender("unspecified");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (e: any) => {
    setEditId(e.id);
    setEmployeeCode(e.employee_code);
    setName(e.name);
    setEmail(e.email);
    setPhone(e.phone);
    setDepartmentId(e.department_id);
    setRoleId(e.role_id);
    setMonthlySalary(e.monthly_salary ? String(e.monthly_salary) : "");
    setWorkingDays(e.working_days ? String(e.working_days) : "30");
    setJoinDate(e.join_date ? e.join_date : e.created_at ? format(new Date(e.created_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setGender(e.gender || "unspecified");
    setOpen(true);
  };
  const openNew = () => {
    setEditId(null);
    setEmployeeCode("");
    setName("");
    setEmail("");
    setPhone("");
    setDepartmentId(filterDepartment !== "all" ? filterDepartment : "");
    setRoleId(filterRole !== "all" ? filterRole : roleFilter || "");
    setMonthlySalary("");
    setWorkingDays("30");
    setJoinDate(format(new Date(), 'yyyy-MM-dd'));
    setGender("unspecified");
    setOpen(true);
  };
  
  const goToCreateKPI = (employee: Employee & { departments?: { name: string }; roles?: { role_name: string } }) => {
    const params = new URLSearchParams();
    params.set("employee", employee.id);
    params.set("role", employee.role_id);
    params.set("department", employee.department_id);
    navigate(`/create-kpi?${params.toString()}`);
  };

  const goToEmployeeDashboard = (
    employee: Employee & {
      departments?: { company_id?: string; companies?: { id: string } };
    }
  ) => {
    const params = new URLSearchParams();
    params.set("employee", employee.id);
    params.set("from", "employees");
    if (employee.department_id) params.set("previewDept", employee.department_id);
    if (employee.role_id) params.set("previewRole", employee.role_id);
    const companyId =
      employee.departments?.company_id ?? employee.departments?.companies?.id;
    if (companyId) params.set("previewCompany", companyId);
    navigate(`/dashboard?${params.toString()}`);
  };

  const openDetailsModal = (employee: Employee & { departments?: { name: string }; roles?: { role_name: string } }) => {
    setSelectedEmployeeForDetails(employee);
    setDetailsModalOpen(true);
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
        {/* Back Button - positioned absolute on left */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="absolute left-0 hidden sm:flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 hover:from-blue-600 hover:to-cyan-600 shadow-md shadow-blue-500/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Mobile Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="sm:hidden self-start flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 hover:from-blue-600 hover:to-cyan-600 shadow-md shadow-blue-500/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Centered Title Section */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-400 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            Employees
          </h1>
          <p className="text-gray-500 mt-1">Manage team members and their assignments</p>
        </div>

        {/* Add Employee Button - positioned absolute on right */}
        <div className="absolute right-0 hidden sm:block">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 shadow-lg shadow-violet-500/25">
                <Plus className="h-4 w-4 mr-2" /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>{editId ? "Edit Employee" : "New Employee"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Employee Code</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input className="pl-10" placeholder="e.g. HRD-AP-001" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} required autoFocus />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input className="pl-10" placeholder="e.g. Alice Smith" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input className="pl-10" type="email" placeholder="alice@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input className="pl-10" placeholder="+1 555 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Department</label>
                    <div className="relative">
                      <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                      <Select value={departmentId} onValueChange={setDepartmentId}>
                        <SelectTrigger className="pl-10"><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                        {departments?.filter(d => filterCompany === "all" || d.companies?.id === filterCompany).map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Role</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                      <Select value={roleId} onValueChange={setRoleId}>
                        <SelectTrigger className="pl-10"><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                        {roles?.filter(r => (!departmentId || r.department_id === departmentId)).map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.role_name}</SelectItem>
                        ))}
                      </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Monthly Salary</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        className="pl-10"
                        type="number"
                        placeholder="e.g. 15000"
                        value={monthlySalary}
                        onChange={(e) => setMonthlySalary(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Working Days</label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        className="pl-10"
                        type="number"
                        placeholder="30"
                        value={workingDays}
                        onChange={(e) => setWorkingDays(e.target.value)}
                        min="1"
                        max="31"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Join Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !joinDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {joinDate ? format(new Date(joinDate), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          fromYear={1990}
                          toYear={2050}
                          selected={joinDate ? new Date(joinDate) : undefined}
                          onSelect={(date) => setJoinDate(date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"))}
                          initialFocus
                          classNames={{
                            caption_label: "hidden",
                            caption_dropdowns: "flex justify-center gap-2 items-center w-full",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Gender</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger className="pl-10"><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unspecified"><div className="flex items-center gap-2"><HelpCircle className="h-4 w-4 text-gray-500" /> Unspecified</div></SelectItem>
                          <SelectItem value="male"><div className="flex items-center gap-2"><User className="h-4 w-4 text-blue-500" /> Male</div></SelectItem>
                          <SelectItem value="female"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-pink-500" /> Female</div></SelectItem>
                          <SelectItem value="other"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-purple-500" /> Other</div></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Button type="submit" disabled={upsert.isPending} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500">
                  {upsert.isPending ? "Saving…" : "Save"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Mobile Add Employee Button */}
        <div className="sm:hidden self-end">
          <Dialog>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 shadow-lg shadow-violet-500/25">
                <Plus className="h-4 w-4 mr-2" /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>{editId ? "Edit Employee" : "New Employee"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Employee Code</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input className="pl-10" placeholder="e.g. HRD-AP-001" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} required autoFocus />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input className="pl-10" placeholder="e.g. Alice Smith" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input className="pl-10" type="email" placeholder="alice@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input className="pl-10" placeholder="+1 555 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Department</label>
                    <div className="relative">
                      <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                      <Select value={departmentId} onValueChange={setDepartmentId}>
                        <SelectTrigger className="pl-10"><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                        {departments?.filter(d => filterCompany === "all" || d.companies?.id === filterCompany).map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Role</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                      <Select value={roleId} onValueChange={setRoleId}>
                        <SelectTrigger className="pl-10"><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                        {roles?.filter(r => (!departmentId || r.department_id === departmentId)).map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.role_name}</SelectItem>
                        ))}
                      </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Monthly Salary</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        className="pl-10"
                        type="number"
                        placeholder="e.g. 15000"
                        value={monthlySalary}
                        onChange={(e) => setMonthlySalary(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Working Days</label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        className="pl-10"
                        type="number"
                        placeholder="30"
                        value={workingDays}
                        onChange={(e) => setWorkingDays(e.target.value)}
                        min="1"
                        max="31"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Join Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !joinDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {joinDate ? format(new Date(joinDate), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          fromYear={1990}
                          toYear={2050}
                          selected={joinDate ? new Date(joinDate) : undefined}
                          onSelect={(date) => setJoinDate(date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"))}
                          initialFocus
                          classNames={{
                            caption_label: "hidden",
                            caption_dropdowns: "flex justify-center gap-2 items-center w-full",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Gender</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger className="pl-10"><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unspecified">Unspecified</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Button type="submit" disabled={upsert.isPending} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500">
                  {upsert.isPending ? "Saving…" : "Save"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Role Filter Banner */}
      {roleFilter && viewMode === 'members' && (
        <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5" />
            <div>
              <p className="text-sm opacity-90">Viewing members of</p>
              <p className="font-semibold">{selectedRoleName || "Selected Role"}</p>
            </div>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => navigate('/employees')}
            className="bg-white/20 hover:bg-white/30 text-white border-0"
          >
            Clear Filter
          </Button>
        </div>
      )}
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
            
            <div className="flex flex-col md:flex-row gap-4">
              {/* Company Filter */}
              <div className="flex-1 min-w-[150px]">
                <Select value={filterCompany} onValueChange={handleCompanyChange}>
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

              {/* Department Filter */}
              <div className="flex-1 min-w-[150px]">
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-full">
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

              {/* Role Filter */}
              <div className="flex-1 min-w-[150px]">
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-full">
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
              placeholder="Search employees..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>
      </div>

      {/* Active Filters Display - Below the row */}
      {fromConfig && (filterDepartment && filterDepartment !== 'all' || filterCompany && filterCompany !== 'all' || filterRole && filterRole !== 'all') && (
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
          {filterRole && filterRole !== 'all' && (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded-full">
              <Users className="h-3 w-3" />
              {roles?.find(r => r.id === filterRole)?.role_name || 'Role'}
              <button 
                onClick={() => setFilterRole("all")}
                className="ml-1 hover:text-violet-900"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <button 
            onClick={() => {
              setFilterDepartment("all");
              setFilterCompany("all");
              setFilterRole("all");
            }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Employees Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filteredEmployees?.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border border-gray-200/50">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No employees yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first team member</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEmployees?.map((e, i) => {
            const gradients = [
              "from-blue-500 to-cyan-400",
              "from-violet-500 to-fuchsia-400", 
              "from-emerald-500 to-teal-400",
              "from-amber-500 to-orange-400"
            ];
            const currentGradient = gradients[i % gradients.length];
            
            return (
              <div key={e.id} className={cn(
                "group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300"
              )}>
                {/* Background decoration */}
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${currentGradient} opacity-10 rounded-bl-full`} />
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-5">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${currentGradient} flex items-center justify-center shadow-lg shadow-gray-200`}>
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg text-cyan-600 hover:text-cyan-700" 
                        onClick={() => goToEmployeeDashboard(e)}
                        title="Open Employee Dashboard"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {(isAdmin || isManager() || userRole.employee_id === e.id) && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg" 
                          onClick={() => goToCreateKPI(e)}
                          title="Create KPI"
                        >
                          <BarChart3 className="h-3.5 w-3.5 text-gray-600" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg" 
                        onClick={() => openEdit(e)}
                      >
                        <Pencil className="h-3.5 w-3.5 text-gray-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-600 hover:text-red-700" 
                        onClick={() => remove.mutate(e.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{e.name}</h3>
                      <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        <span>{e.roles?.role_name || "Employee"}</span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100 space-y-3">
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{e.departments?.companies?.name || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <Layers className="h-3 w-3" />
                        <span className="truncate">{e.departments?.name || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{e.email || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <Hash className="h-3 w-3" />
                        <span>ID: {e.employee_code}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <Sparkles className="h-3 w-3" />
                        <span>Joined {e.join_date ? new Date(e.join_date).toLocaleDateString() : new Date(e.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="bg-gray-50 border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 rounded-lg"
                          onClick={() => openDetailsModal(e)}
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Contact
                        </Button>
                        {(isAdmin || isManager() || userRole.employee_id === e.id) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-gray-50 border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 rounded-lg"
                            onClick={() => goToCreateKPI(e)}
                          >
                            <BarChart3 className="h-3 w-3 mr-1" />
                            KPI
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Employee Details Modal */}
      {selectedEmployeeForDetails && (
        <EmployeeDetailsModal
          employee={selectedEmployeeForDetails}
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
        />
      )}
    </div>
  );
}
