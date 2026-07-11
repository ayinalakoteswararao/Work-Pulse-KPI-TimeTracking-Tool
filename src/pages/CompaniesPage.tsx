import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Building2, 
  Search,
  MoreVertical,
  Briefcase,
  ArrowUpRight,
  Layers,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Company {
  id: string;
  name: string;
  created_at: string;
}

export default function CompaniesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");

  const { data: companies, isLoading, refetch } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Company[];
    },
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Refetch data when component mounts
  useEffect(() => {
    refetch();
  }, [refetch]);

  const filteredCompanies = companies?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const upsert = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("companies").update({ name }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("companies").insert({ name });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      toast.success(editId ? "Company updated" : "Company created");
      setOpen(false); setEditId(null); setName("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (c: Company) => { setEditId(c.id); setName(c.name); setOpen(true); };
  const openNew = () => { setEditId(null); setName(""); setOpen(true); };
  const goToDepartments = (companyId: string) => { navigate(`/departments?company=${companyId}`); };

  return (
    <div className="space-y-6 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-4 relative">
        {/* Back to Dashboard Button - positioned absolute on left */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/dashboard')}
          className="absolute left-0 hidden sm:flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 hover:from-blue-600 hover:to-cyan-600 shadow-md shadow-blue-500/20"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
        </Button>
        
        {/* Mobile Dashboard Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/dashboard')}
          className="sm:hidden self-start flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 hover:from-blue-600 hover:to-cyan-600 shadow-md shadow-blue-500/20"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
        </Button>

        {/* Centered Title Section */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            Companies
          </h1>
          <p className="text-gray-500 mt-1">Manage your organizations</p>
        </div>

        {/* Add Company Button - positioned absolute on right */}
        <div className="absolute right-0 hidden sm:block">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 shadow-lg shadow-violet-500/25">
                <Plus className="h-4 w-4 mr-2" /> Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Edit Company" : "New Company"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Company Name</label>
                  <Input placeholder="e.g. Acme Corp" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                </div>
                <Button type="submit" disabled={upsert.isPending} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500">
                  {upsert.isPending ? "Saving…" : "Save"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Mobile Add Company Button */}
        <div className="sm:hidden self-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 shadow-lg shadow-violet-500/25">
                <Plus className="h-4 w-4 mr-2" /> Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Edit Company" : "New Company"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Company Name</label>
                  <Input placeholder="e.g. Acme Corp" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                </div>
                <Button type="submit" disabled={upsert.isPending} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500">
                  {upsert.isPending ? "Saving…" : "Save"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input 
          placeholder="Search companies..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Companies Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filteredCompanies?.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No companies yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first company to get started</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCompanies?.map((c, i) => {
            const gradients = [
              "from-blue-500 to-cyan-400",
              "from-violet-500 to-fuchsia-400", 
              "from-emerald-500 to-teal-400",
              "from-amber-500 to-orange-400"
            ];
            const currentGradient = gradients[i % gradients.length];
            
            return (
            <div key={c.id} className={cn(
              "group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300"
            )}>
              {/* Background decoration */}
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${currentGradient} opacity-10 rounded-bl-full`} />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-5">
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${currentGradient} flex items-center justify-center shadow-lg shadow-gray-200`}>
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg" 
                      onClick={() => goToDepartments(c.id)} 
                      title="Manage Departments"
                    >
                      <Layers className="h-3.5 w-3.5 text-gray-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg" 
                      onClick={() => openEdit(c)}
                    >
                      <Pencil className="h-3.5 w-3.5 text-gray-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-600 hover:text-red-700" 
                      onClick={() => remove.mutate(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{c.name}</h3>
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                      <span>Company</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-3">
                      <Briefcase className="h-3 w-3" />
                      <span>Created {new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full bg-gray-50 border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 rounded-lg"
                      onClick={() => goToDepartments(c.id)}
                    >
                      <Layers className="h-3.5 w-3.5 mr-1.5" />
                      Manage Departments
                      <ArrowUpRight className="h-3 w-3 ml-auto" />
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
