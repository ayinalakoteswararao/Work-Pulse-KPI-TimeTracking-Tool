import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, Plus, Trash2, Building2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

type HolidayRow = {
  id: string;
  holiday_date: string;
  name: string;
  is_paid: boolean;
  department_id: string | null;
  departments?: { name: string } | null;
};

export default function HolidaysPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [holidayDate, setHolidayDate] = useState(new Date().toISOString().split("T")[0]);
  const [holidayName, setHolidayName] = useState("");
  const [isPaid, setIsPaid] = useState("paid");
  const [departmentId, setDepartmentId] = useState("all");

  const { data: departments } = useQuery({
    queryKey: ["departments-for-holidays"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: holidays, isLoading } = useQuery({
    queryKey: ["holidays-management"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("holidays")
        .select("id, holiday_date, name, is_paid, department_id, departments(name)")
        .order("holiday_date", { ascending: false });
      if (error) throw error;
      return (data || []) as HolidayRow[];
    },
  });

  const addHoliday = useMutation({
    mutationFn: async () => {
      if (!holidayName.trim()) throw new Error("Holiday name is required");
      const payload = {
        holiday_date: holidayDate,
        name: holidayName.trim(),
        is_paid: isPaid === "paid",
        department_id: departmentId === "all" ? null : departmentId,
      };
      const { error } = await (supabase as any).from("holidays").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays-management"] });
      toast.success("Holiday added");
      setHolidayName("");
      setDepartmentId("all");
      setIsPaid("paid");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteHoliday = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("holidays").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holidays-management"] });
      toast.success("Holiday removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-4 relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="absolute left-0 hidden sm:flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-0 hover:from-blue-700 hover:to-cyan-600 shadow-md shadow-blue-500/20"
        >
          <Calendar className="h-4 w-4" />
          Back Dashboard
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="sm:hidden self-start flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-0 hover:from-blue-700 hover:to-cyan-600 shadow-md shadow-blue-500/20"
        >
          <Calendar className="h-4 w-4" />
          Back Dashboard
        </Button>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-200">
              <Calendar className="h-5 w-5 text-white" />
            </span>
            Holiday Management
          </h1>
          <p className="text-gray-500 mt-1">Configure paid or unpaid holidays for payroll day-pay approvals.</p>
        </div>

        <div className="absolute right-0 hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">{holidays?.length || 0} holidays configured</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Plus className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Add Holiday</h2>
            <p className="text-xs text-gray-500">Define date, pay-type, and department scope</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</label>
            <Input className="mt-1" type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Holiday Name</label>
            <Input className="mt-1" placeholder="Holiday name" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pay Type</label>
            <Select value={isPaid} onValueChange={setIsPaid}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Paid or unpaid" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Paid Holiday</SelectItem>
                <SelectItem value="unpaid">Unpaid Holiday</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Department Scope</label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Department scope" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => addHoliday.mutate()}
            disabled={addHoliday.isPending}
            className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            {addHoliday.isPending ? "Adding..." : "Add Holiday"}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-2">
          <div className="font-semibold text-gray-900">Configured Holidays</div>
          <div className="text-xs text-gray-400">Latest first</div>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-gray-500">Loading holidays...</div>
        ) : !holidays || holidays.length === 0 ? (
          <div className="p-10 text-center">
            <AlertTriangle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No holidays configured yet</p>
            <p className="text-sm text-gray-400 mt-1">Add your first holiday from the form above</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {holidays.map((h) => (
              <div key={h.id} className="px-6 py-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{h.name}</div>
                  <div className="text-sm text-gray-500 flex flex-wrap items-center gap-2 mt-1">
                    <span>{formatDate(h.holiday_date)}</span>
                    <span className="text-gray-300">•</span>
                    <span className={h.is_paid ? "text-emerald-700" : "text-amber-700"}>
                      {h.is_paid ? "Paid Holiday" : "Unpaid Holiday"}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {h.departments?.name || "All Departments"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => deleteHoliday.mutate(h.id)}
                  disabled={deleteHoliday.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

