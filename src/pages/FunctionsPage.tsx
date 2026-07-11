import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Settings2, Search, Target, Zap, Layers, Building2, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface FunctionData {
  id: string;
  function_name: string;
  target_value: number;
  target_period: string;
  role_id: string;
  created_at: string;
}

export default function FunctionsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fnName, setFnName] = useState("");
  const [target, setTarget] = useState<number | "">("");
  const [period, setPeriod] = useState("daily");
  const [roleId, setRoleId] = useState("");
  const [search, setSearch] = useState("");

  const { data: functions, isLoading } = useQuery({
    queryKey: ["functions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("functions").select("*, roles(role_name, departments(name, companies(name)))").order("created_at", { ascending: false });
      if (error) throw error;
      return data as (FunctionData & { roles?: { role_name: string; departments?: { name: string; companies?: { name: string } } } })[];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*, departments(name, companies(name))").order("role_name");
      if (error) throw error;
      return data as { id: string; role_name: string; departments?: { name: string; companies?: { name: string } } }[];
    },
  });

  const filteredFunctions = functions?.filter(f => 
    f.function_name.toLowerCase().includes(search.toLowerCase()) ||
    f.roles?.role_name?.toLowerCase().includes(search.toLowerCase())
  );

  const upsert = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("functions").update({ function_name: fnName, target_value: target, target_period: period, role_id: roleId }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("functions").insert({ function_name: fnName, target_value: target === "" ? 0 : target, target_period: period, role_id: roleId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["functions"] });
      toast.success(editId ? "Function updated" : "Function created");
      setOpen(false); setEditId(null); setFnName(""); setTarget(""); setPeriod("daily"); setRoleId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("functions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["functions"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (f: FunctionData) => { setEditId(f.id); setFnName(f.function_name); setTarget(f.target_value); setPeriod(f.target_period); setRoleId(f.role_id); setOpen(true); };
  const openNew = () => { setEditId(null); setFnName(""); setTarget(""); setPeriod("daily"); setRoleId(""); setOpen(true); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center">
              <Settings2 className="h-5 w-5 text-white" />
            </div>
            Functions
          </h1>
          <p className="text-gray-500 mt-1">Define tasks and targets for roles</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 shadow-lg shadow-violet-500/25">
              <Plus className="h-4 w-4 mr-2" /> Add Function
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editId ? "Edit Function" : "New Function"}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }} className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Function Name</label>
                <Input placeholder="e.g. Code Reviews" value={fnName} onChange={(e) => setFnName(e.target.value)} required autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Target (Optional)</label>
                  <Input type="number" value={target} onChange={(e) => setTarget(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Period</label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Role</label>
                <Select value={roleId} onValueChange={setRoleId}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>{roles?.map(r => <SelectItem key={r.id} value={r.id}>{r.role_name} — {r.departments?.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={upsert.isPending} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500">
                {upsert.isPending ? "Saving…" : "Save"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input 
          placeholder="Search functions..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Functions Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filteredFunctions?.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <Settings2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No functions yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first function</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFunctions?.map((f, i) => (
            <div key={f.id} className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:shadow-gray-200/50 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg",
                  ["from-blue-500 to-cyan-400", "from-violet-500 to-fuchsia-400", "from-emerald-500 to-teal-400", "from-amber-500 to-orange-400"][i % 4]
                )}>
                  <Zap className="h-6 w-6" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(f)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => remove.mutate(f.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">{f.function_name}</h3>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium mb-3">
                <Target className="h-3 w-3" />
                {f.target_value} per {f.target_period}
              </div>
              <div className="space-y-2 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Layers className="h-3.5 w-3.5" />
                  <span className="font-medium">{f.roles?.role_name || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{f.roles?.departments?.companies?.name || "—"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
