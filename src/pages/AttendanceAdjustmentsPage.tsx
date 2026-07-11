import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  ClipboardList,
  Plus,
  Trash2,
  Inbox,
  XCircle,
  ArrowLeft,
  LayoutDashboard,
  Users,
  CalendarDays,
  Tags,
  FileText,
  ListChecks,
  Palmtree,
  Loader2,
  Clock,
  Sun,
  Sunrise,
  Sunset,
  PartyPopper,
  Moon,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

function AttendanceTypeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const c = cn("h-4 w-4 shrink-0", className);
  switch (type) {
    case "full_day":
      return <Sun className={cn(c, "text-amber-500")} />;
    case "half_day_paid":
      return <Sunrise className={cn(c, "text-teal-600")} />;
    case "half_day_unpaid":
      return <Sunset className={cn(c, "text-orange-500")} />;
    case "leave_paid":
      return <Palmtree className={cn(c, "text-emerald-600")} />;
    case "leave_unpaid":
      return <Palmtree className={cn(c, "text-rose-600")} />;
    case "holiday_paid":
      return <PartyPopper className={cn(c, "text-violet-600")} />;
    case "holiday_unpaid":
      return <Moon className={cn(c, "text-slate-500")} />;
    default:
      return <Tags className={cn(c, "text-indigo-500")} />;
  }
}

type AdjustmentRow = {
  id: string;
  employee_id: string;
  adjustment_date: string;
  attendance_type: string;
  is_approved: boolean;
  notes: string | null;
  employees?: { name: string; employee_code?: string } | null;
};

type PendingLeaveRow = {
  id: string;
  employee_id: string;
  leave_date: string;
  attendance_type: string;
  reason: string | null;
  status: string;
  admin_seen?: boolean;
  employees?: { name: string; employee_code?: string } | null;
};

const ATTENDANCE_TYPES = [
  "full_day",
  "half_day_paid",
  "half_day_unpaid",
  "leave_paid",
  "leave_unpaid",
  "holiday_paid",
  "holiday_unpaid",
] as const;

const ATTENDANCE_LABELS: Record<(typeof ATTENDANCE_TYPES)[number], string> = {
  full_day: "Full day",
  half_day_paid: "Half day — paid",
  half_day_unpaid: "Half day — unpaid",
  leave_paid: "Leave — paid",
  leave_unpaid: "Leave — unpaid",
  holiday_paid: "Holiday — paid",
  holiday_unpaid: "Holiday — unpaid",
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  leave_unpaid: "Leave — unpaid",
  leave_paid: "Leave — paid",
  half_day_unpaid: "Half day — unpaid",
  half_day_paid: "Half day — paid",
};

function formatAttendanceLabel(raw: string) {
  return ATTENDANCE_LABELS[raw as keyof typeof ATTENDANCE_LABELS] ?? raw.replace(/_/g, " ");
}

export default function AttendanceAdjustmentsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [employeeId, setEmployeeId] = useState("");
  const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceType, setAttendanceType] = useState<string>("full_day");
  const [approval, setApproval] = useState("approved");
  const [notes, setNotes] = useState("");
  const [rejectNoteById, setRejectNoteById] = useState<Record<string, string>>({});

  const { data: employees } = useQuery({
    queryKey: ["employees-for-attendance-adjustments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, employee_code")
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; employee_code?: string }[];
    },
  });

  const { data: adjustments, isLoading } = useQuery({
    queryKey: ["attendance-adjustments-management"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("attendance_adjustments")
        .select("id, employee_id, adjustment_date, attendance_type, is_approved, notes, employees(name, employee_code)")
        .order("adjustment_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as AdjustmentRow[];
    },
  });

  const { data: pendingLeave, isLoading: pendingLeaveLoading } = useQuery({
    queryKey: ["leave-requests-pending"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leave_requests")
        .select("id, employee_id, leave_date, attendance_type, reason, status, admin_seen, employees(name, employee_code)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PendingLeaveRow[];
    },
  });

  const approveLeaveRequest = useMutation({
    mutationFn: async (row: PendingLeaveRow) => {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const uid = authData.user?.id;
      if (!uid) throw new Error("You must be signed in to approve.");

      const adjPayload = {
        employee_id: row.employee_id,
        adjustment_date: row.leave_date,
        attendance_type: row.attendance_type,
        is_approved: true,
        notes: row.reason?.trim() ? `Leave request: ${row.reason.trim()}` : "Approved leave request",
        approved_by: uid,
      };

      const { error: adjError } = await (supabase as any)
        .from("attendance_adjustments")
        .upsert(adjPayload, { onConflict: "employee_id,adjustment_date" });
      if (adjError) throw adjError;

      const { error: lrError } = await (supabase as any)
        .from("leave_requests")
        .update({
          status: "approved",
          reviewed_by: uid,
          reviewed_at: new Date().toISOString(),
          employee_seen: false,
          admin_seen: true,
        })
        .eq("id", row.id)
        .eq("status", "pending");
      if (lrError) throw lrError;
    },
    onSuccess: (_data, row) => {
      qc.invalidateQueries({ queryKey: ["leave-requests-pending"] });
      qc.invalidateQueries({ queryKey: ["leave-requests-pending-count"] });
      qc.invalidateQueries({ queryKey: ["attendance-adjustments-management"] });
      qc.invalidateQueries({ queryKey: ["attendance-adjustment-today", row.employee_id] });
      toast.success("Leave approved and applied to payroll for that date.");
    },
    onError: (e: any) => toast.error(e.message || "Could not approve leave"),
  });

  const rejectLeaveRequest = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: string; adminNotes: string | null }) => {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const uid = authData.user?.id;
      if (!uid) throw new Error("You must be signed in.");

      const { error } = await (supabase as any)
        .from("leave_requests")
        .update({
          status: "rejected",
          reviewed_by: uid,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes,
          employee_seen: false,
          admin_seen: true,
        })
        .eq("id", id)
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests-pending"] });
      qc.invalidateQueries({ queryKey: ["leave-requests-pending-count"] });
      toast.success("Leave request rejected.");
    },
    onError: (e: any) => toast.error(e.message || "Could not reject leave"),
  });

  const upsertAdjustment = useMutation({
    mutationFn: async () => {
      if (!employeeId) throw new Error("Please select an employee");
      const payload = {
        employee_id: employeeId,
        adjustment_date: adjustmentDate,
        attendance_type: attendanceType,
        is_approved: approval === "approved",
        notes: notes.trim() || null,
      };

      const { error } = await (supabase as any)
        .from("attendance_adjustments")
        .upsert(payload, { onConflict: "employee_id,adjustment_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance-adjustments-management"] });
      toast.success("Attendance adjustment saved");
      setNotes("");
      setAttendanceType("full_day");
      setApproval("approved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAdjustment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("attendance_adjustments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance-adjustments-management"] });
      toast.success("Adjustment removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectTriggerClass =
    "h-11 w-full bg-white border-indigo-100/90 shadow-sm rounded-xl text-left font-medium text-gray-900 hover:bg-indigo-50/40 focus:ring-2 focus:ring-indigo-200";

  useEffect(() => {
    if (!pendingLeave || pendingLeave.length === 0) return;
    const unseenIds = pendingLeave
      .filter((req: any) => req.admin_seen === false)
      .map((req) => req.id);
    if (unseenIds.length === 0) return;

    (async () => {
      const { error } = await (supabase as any)
        .from("leave_requests")
        .update({ admin_seen: true })
        .in("id", unseenIds)
        .eq("status", "pending");
      if (!error) {
        qc.invalidateQueries({ queryKey: ["leave-requests-pending-count"] });
        qc.invalidateQueries({ queryKey: ["leave-notifications-admin"] });
      }
    })();
  }, [pendingLeave, qc]);

  return (
    <div className="w-full min-w-0 space-y-8 pt-2 pb-10">
      {/* Header — centered title, back + stats like Companies / Holidays */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-4 relative min-h-[5.5rem]">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="absolute left-0 top-0 hidden sm:inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-0 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/25"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          <span>Back to Dashboard</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="sm:hidden self-start inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-0 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/25"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          <span>Dashboard</span>
        </Button>

        <div className="text-center px-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 flex flex-wrap items-center justify-center gap-3">
            <span className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-300/40">
              <ClipboardList className="h-6 w-6 text-white" />
            </span>
            <span>Attendance Adjustments</span>
          </h1>
          <p className="text-gray-500 mt-2 max-w-3xl mx-auto text-sm sm:text-base px-2">
            Review leave requests, set day types, and keep payroll in sync with approved attendance.
          </p>
        </div>

        <div className="absolute right-0 top-0 hidden sm:flex flex-col items-end gap-1">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 text-emerald-800 shadow-sm">
            <ListChecks className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold tabular-nums">{adjustments?.length ?? 0}</span>
            <span className="text-sm text-emerald-700/90">saved records</span>
          </span>
          {pendingLeave && pendingLeave.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg">
              <Inbox className="h-3.5 w-3.5" />
              {pendingLeave.length} pending leave
            </span>
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="leave" className="w-full">
        <TabsList
          className={cn(
            "w-full h-auto flex flex-wrap justify-start sm:justify-center gap-1.5 p-2",
            "rounded-2xl bg-gradient-to-r from-indigo-50 via-violet-50/80 to-indigo-50",
            "border border-indigo-100/90 shadow-sm"
          )}
        >
          <TabsTrigger
            value="leave"
            className={cn(
              "rounded-xl px-4 py-2.5 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md",
              "data-[state=active]:text-indigo-900 text-gray-700 font-semibold"
            )}
          >
            <Inbox className="h-4 w-4 text-indigo-600 shrink-0" />
            <span className="hidden sm:inline">Pending leave</span>
            <span className="sm:hidden">Leave</span>
            {pendingLeave && pendingLeave.length > 0 ? (
              <Badge className="ml-0.5 h-5 min-w-[1.25rem] px-1.5 rounded-md bg-amber-500 hover:bg-amber-500 text-white border-0 text-[10px] tabular-nums">
                {pendingLeave.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className={cn(
              "rounded-xl px-4 py-2.5 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md",
              "data-[state=active]:text-indigo-900 text-gray-700 font-semibold"
            )}
          >
            <ClipboardList className="h-4 w-4 text-violet-600 shrink-0" />
            <span className="hidden sm:inline">Manual adjustment</span>
            <span className="sm:hidden">Manual</span>
          </TabsTrigger>
          <TabsTrigger
            value="recent"
            className={cn(
              "rounded-xl px-4 py-2.5 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md",
              "data-[state=active]:text-indigo-900 text-gray-700 font-semibold"
            )}
          >
            <ListChecks className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">Recent adjustments</span>
            <span className="sm:hidden">Recent</span>
            <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 rounded-md text-[10px] tabular-nums bg-emerald-100 text-emerald-800 border-emerald-200">
              {adjustments?.length ?? 0}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leave" className="mt-6 outline-none focus-visible:ring-0">
      {/* Pending leave */}
      <div className="rounded-2xl border border-indigo-100/80 bg-gradient-to-b from-white via-indigo-50/20 to-white p-6 sm:p-8 shadow-md shadow-indigo-100/50">
        <div className="flex items-center gap-3 mb-6">
          <span className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
            <Palmtree className="h-5 w-5 text-white" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pending leave requests</h2>
            <p className="text-sm text-gray-500 mt-0.5">Approve or reject employee submissions — payroll updates on approval.</p>
          </div>
        </div>

        {pendingLeaveLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-indigo-600">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="font-medium">Loading requests…</span>
          </div>
        ) : !pendingLeave?.length ? (
          <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 px-6 py-10 text-center">
            <Inbox className="h-10 w-10 text-indigo-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No pending leave requests</p>
            <p className="text-sm text-gray-500 mt-1">New requests from employees will show up here.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {pendingLeave.map((req) => (
              <li
                key={req.id}
                className="flex flex-col lg:flex-row lg:items-stretch gap-4 rounded-2xl border border-indigo-100 bg-white/90 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex gap-3 min-w-0 flex-1">
                  <span className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-indigo-600" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900">
                      {req.employees?.name ?? "Employee"}
                      {req.employees?.employee_code ? (
                        <span className="text-gray-500 font-normal"> · {req.employees.employee_code}</span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5">
                        <CalendarDays className="h-3.5 w-3.5 text-gray-500" />
                        {req.leave_date}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 text-violet-800 px-2 py-0.5 text-xs font-medium">
                        <Tags className="h-3 w-3" />
                        {LEAVE_TYPE_LABELS[req.attendance_type] ?? formatAttendanceLabel(req.attendance_type)}
                      </span>
                    </div>
                    {req.reason ? (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2 border-l-2 border-indigo-200 pl-2" title={req.reason}>
                        {req.reason}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0 lg:w-[280px] border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-4">
                  <Input
                    placeholder="Optional note if rejecting…"
                    value={rejectNoteById[req.id] ?? ""}
                    onChange={(e) =>
                      setRejectNoteById((m) => ({ ...m, [req.id]: e.target.value }))
                    }
                    className="h-10 text-sm bg-gray-50/80 border-gray-200 rounded-xl"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
                      disabled={rejectLeaveRequest.isPending || approveLeaveRequest.isPending}
                      onClick={() =>
                        rejectLeaveRequest.mutate({
                          id: req.id,
                          adminNotes: (rejectNoteById[req.id] || "").trim() || null,
                        })
                      }
                    >
                      <XCircle className="h-4 w-4 mr-1.5" />
                      Reject
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/20"
                      disabled={approveLeaveRequest.isPending || rejectLeaveRequest.isPending}
                      onClick={() => approveLeaveRequest.mutate(req)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Approve
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
        </TabsContent>

        <TabsContent value="manual" className="mt-6 outline-none focus-visible:ring-0">
      {/* Manual form */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-md">
        <div className="flex items-center gap-3 mb-6">
          <span className="h-11 w-11 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-md">
            <ClipboardList className="h-5 w-5 text-white" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manual adjustment</h2>
            <p className="text-sm text-gray-500 mt-0.5">Override attendance for a specific employee and date.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-indigo-100/70 bg-gradient-to-b from-indigo-50/40 to-white p-4 shadow-sm">
            <label className="block text-sm font-semibold text-gray-800 mb-2">Employee</label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Choose employee…" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-indigo-100 max-h-[280px]">
                {employees?.map((e) => (
                  <SelectItem key={e.id} value={e.id} className="rounded-lg pl-2">
                    <span className="flex items-center gap-2.5">
                      <UserCircle className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span className="truncate">
                        {e.name}
                        {e.employee_code ? ` (${e.employee_code})` : ""}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-indigo-100/70 bg-gradient-to-b from-indigo-50/40 to-white p-4 shadow-sm">
            <label className="block text-sm font-semibold text-gray-800 mb-2">Date</label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
              <Input
                className="h-11 rounded-xl border-indigo-100 bg-white pl-10 shadow-sm font-medium"
                type="date"
                value={adjustmentDate}
                onChange={(e) => setAdjustmentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100/70 bg-gradient-to-b from-indigo-50/40 to-white p-4 shadow-sm">
            <label className="block text-sm font-semibold text-gray-800 mb-2">Attendance type</label>
            <Select value={attendanceType} onValueChange={setAttendanceType}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-indigo-100 max-h-[300px]">
                {ATTENDANCE_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="rounded-lg pl-2">
                    <span className="flex items-center gap-2.5">
                      <AttendanceTypeIcon type={t} />
                      <span>{ATTENDANCE_LABELS[t]}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="rounded-xl border border-indigo-100/70 bg-gradient-to-b from-indigo-50/40 to-white p-4 shadow-sm">
            <label className="block text-sm font-semibold text-gray-800 mb-2">Approval status</label>
            <Select value={approval} onValueChange={setApproval}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-indigo-100">
                <SelectItem value="approved" className="rounded-lg pl-2">
                  <span className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Approved (applies to payroll)</span>
                  </span>
                </SelectItem>
                <SelectItem value="pending" className="rounded-lg pl-2">
                  <span className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Pending (awaiting confirmation)</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 rounded-xl border border-indigo-100/70 bg-gradient-to-b from-indigo-50/40 to-white p-4 shadow-sm">
            <label className="block text-sm font-semibold text-gray-800 mb-2">Notes</label>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
              <Input
                className="h-11 rounded-xl border-indigo-100 bg-white pl-10 shadow-sm"
                placeholder="Optional notes for this adjustment…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            onClick={() => upsertAdjustment.mutate()}
            disabled={upsertAdjustment.isPending}
            className="rounded-xl h-11 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-500/25"
          >
            {upsertAdjustment.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {upsertAdjustment.isPending ? "Saving…" : "Save adjustment"}
          </Button>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="recent" className="mt-6 outline-none focus-visible:ring-0">
      {/* Recent list */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center gap-3">
          <ListChecks className="h-5 w-5 text-indigo-600" />
          <div>
            <div className="font-bold text-gray-900">Recent adjustments</div>
            <div className="text-xs text-gray-500">Latest 100 records</div>
          </div>
        </div>
        {isLoading ? (
          <div className="p-12 flex flex-col items-center gap-2 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            Loading…
          </div>
        ) : !adjustments || adjustments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            No attendance adjustments yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {adjustments.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "px-6 py-4 flex items-center justify-between gap-3 transition-colors",
                  "hover:bg-indigo-50/40"
                )}
              >
                <div className="flex gap-3 min-w-0">
                  <span
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                      a.is_approved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {a.is_approved ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900">
                      {a.employees?.name || "Employee"}{" "}
                      <span className="text-gray-400 font-normal">·</span>{" "}
                      <span className="font-medium text-gray-600">{a.adjustment_date}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5 flex flex-wrap items-center gap-1.5">
                      <AttendanceTypeIcon type={a.attendance_type} className="h-3.5 w-3.5" />
                      <span className="font-medium text-violet-700">{formatAttendanceLabel(a.attendance_type)}</span>
                      <span className="text-gray-400 mx-1.5">·</span>
                      {a.is_approved ? (
                        <span className="text-emerald-700">Approved</span>
                      ) : (
                        <span className="text-amber-700">Pending</span>
                      )}
                      {a.notes ? (
                        <>
                          <span className="text-gray-400 mx-1.5">·</span>
                          <span className="text-gray-500 truncate">{a.notes}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-xl text-red-600 hover:bg-red-50 shrink-0"
                  onClick={() => deleteAdjustment.mutate(a.id)}
                  aria-label="Delete adjustment"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
        </TabsContent>
      </Tabs>

      {/* Mobile stats strip */}
      <div className="sm:hidden flex flex-wrap gap-2 justify-center">
        <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-medium">
          <ListChecks className="h-4 w-4" />
          {adjustments?.length ?? 0} records
        </span>
        {pendingLeave && pendingLeave.length > 0 ? (
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-sm font-medium">
            <Inbox className="h-4 w-4" />
            {pendingLeave.length} pending
          </span>
        ) : null}
      </div>
    </div>
  );
}

