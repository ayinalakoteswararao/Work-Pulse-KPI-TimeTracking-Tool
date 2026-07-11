import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  MinusCircle,
  Palmtree,
  Send,
  ShieldCheck,
  Sunrise,
  Sunset,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

const LEAVE_TYPES = [
  {
    value: "leave_unpaid",
    label: "Full day unpaid leave",
    impact: "Salary deducted",
    isPaid: false,
    icon: Sunset,
  },
  {
    value: "leave_paid",
    label: "Full day paid leave",
    impact: "No salary deduction",
    isPaid: true,
    icon: Palmtree,
  },
  {
    value: "half_day_unpaid",
    label: "Half day unpaid",
    impact: "Partial salary deduction",
    isPaid: false,
    icon: Sunset,
  },
  {
    value: "half_day_paid",
    label: "Half day paid",
    impact: "No salary deduction",
    isPaid: true,
    icon: Sunrise,
  },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  impact: string;
  isPaid: boolean;
  icon: LucideIcon;
}>;

type LeaveRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
};

export default function LeaveRequestDialog({
  open,
  onOpenChange,
  employeeId,
}: LeaveRequestDialogProps) {
  const qc = useQueryClient();
  const [leaveDate, setLeaveDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [attendanceType, setAttendanceType] = useState<string>("leave_unpaid");
  const [reason, setReason] = useState("");
  const selectedTypeMeta = LEAVE_TYPES.find((t) => t.value === attendanceType) ?? LEAVE_TYPES[0];
  const isSelectedPaidType = selectedTypeMeta.isPaid;
  const selectedImpactText = isSelectedPaidType ? "No salary deduction" : "Salary will be deducted";
  const selectedImpactTone = isSelectedPaidType
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-rose-200 bg-rose-50 text-rose-800";

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("leave_requests").insert({
        employee_id: employeeId,
        leave_date: leaveDate,
        attendance_type: attendanceType,
        reason: reason.trim() || null,
        status: "pending",
        admin_seen: false,
        employee_seen: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Leave request sent. Your admin will review it.");
      qc.invalidateQueries({ queryKey: ["leave-requests-pending"] });
      qc.invalidateQueries({ queryKey: ["leave-requests-pending-count"] });
      qc.invalidateQueries({ queryKey: ["leave-requests-mine", employeeId] });
      setReason("");
      onOpenChange(false);
    },
    onError: (e: any) => {
      const msg = e?.message || "Could not submit leave request";
      if (msg.includes("leave_requests_one_pending")) {
        toast.error("You already have a pending request for that date.");
      } else {
        toast.error(msg);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border border-violet-100 bg-white p-0 overflow-hidden">
        <DialogHeader className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-indigo-50 to-fuchsia-50 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-xl text-slate-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-violet-600 shadow-sm">
              <Palmtree className="h-4 w-4" />
            </span>
            Request leave
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Submit a leave request for your admin or manager to approve. Pay and deductions are applied only after approval.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5">
          <div>
            <Label htmlFor="leave-date" className="flex items-center gap-2 text-slate-800">
              <CalendarDays className="h-4 w-4 text-indigo-600" />
              Date
            </Label>
            <Input
              id="leave-date"
              className="mt-1.5 h-11 border-indigo-200 bg-indigo-50/30 focus-visible:ring-indigo-300"
              type="date"
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
            />
          </div>
          <div>
            <Label className="flex items-center gap-2 text-slate-800">
              <Tags className="h-4 w-4 text-violet-600" />
              Type
            </Label>
            <Select value={attendanceType} onValueChange={setAttendanceType}>
              <SelectTrigger className="mt-1.5 h-11 border-violet-200 bg-violet-50/30 focus:ring-violet-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <t.icon className={`h-4 w-4 ${t.isPaid ? "text-emerald-600" : "text-rose-600"}`} />
                      <span>{t.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={`w-full rounded-xl border px-3 py-2.5 text-sm font-medium ${selectedImpactTone}`}>
            <div className="flex items-center gap-2">
              {isSelectedPaidType ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <MinusCircle className="h-3.5 w-3.5" />
              )}
              <span>{selectedTypeMeta.label}: {selectedImpactText}</span>
            </div>
          </div>
          <div>
            <Label htmlFor="leave-reason" className="flex items-center gap-2 text-slate-800">
              <FileText className="h-4 w-4 text-fuchsia-600" />
              Reason (optional)
            </Label>
            <Textarea
              id="leave-reason"
              className="mt-1.5 min-h-[90px] border-fuchsia-200 bg-fuchsia-50/20 focus-visible:ring-fuchsia-300"
              placeholder="Short note for your manager…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Your request will stay pending until approved by admin/manager.</span>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submit.isPending || !employeeId}
              onClick={() => submit.mutate()}
              className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-500 hover:from-indigo-700 hover:to-violet-600"
            >
              <Send className="h-4 w-4" />
              {submit.isPending ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
