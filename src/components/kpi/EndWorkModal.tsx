import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ClipboardCheck, LogOut, Loader2 } from "lucide-react";

interface EndWorkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EndWorkModal({ open, onOpenChange }: EndWorkModalProps) {
  const { user, userRole, signOut } = useAuth();
  const [summary, setSummary] = useState("");

  const submitWorkSummary = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");
      if (!userRole.employee_id) throw new Error("No employee profile found");
      if (!summary.trim()) throw new Error("Please enter a work summary");

      const summaryText = summary.trim();
      const workDate = new Date().toISOString().split('T')[0];

      const { error, data } = await (supabase as any).from("work_summaries").insert({
        employee_id: userRole.employee_id,
        user_id: user.id,
        summary: summaryText,
        work_date: workDate,
      }).select('id').maybeSingle();

      if (error) {
        console.error("Work summary insert error:", error);
        throw error;
      }

      // Link the summary to today's work session so manager/admin views can resolve it.
      const { data: existingSession, error: sessionFetchError } = await (supabase as any)
        .from("work_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", workDate)
        .maybeSingle();

      if (sessionFetchError) {
        console.error("Work session fetch error:", sessionFetchError);
        throw sessionFetchError;
      }

      if (existingSession?.id) {
        const { error: linkError } = await (supabase as any)
          .from("work_sessions")
          .update({
            work_summary_id: data?.id ?? null,
            notes: summaryText,
          })
          .eq("id", existingSession.id);

        if (linkError) {
          console.error("Work session link error:", linkError);
          throw linkError;
        }
      }
    },
    onSuccess: async () => {
      toast.success("Work summary submitted successfully!");
      onOpenChange(false);
      setSummary("");
      
      // Wait a moment for the toast to show, then logout
      setTimeout(async () => {
        try {
          await signOut();
          toast.info("Logged out successfully");
        } catch (error) {
          toast.error("Failed to logout");
        }
      }, 1500);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit work summary");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitWorkSummary.mutate();
  };

  const handleCancel = () => {
    setSummary("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-400 flex items-center justify-center">
              <ClipboardCheck className="h-4 w-4 text-white" />
            </div>
            End Work & Submit Summary
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Enter your work summary for today. This will be saved and you will be logged out.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Work Summary <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Describe what you accomplished today, any challenges faced, and plans for tomorrow..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              {summary.length}/500 characters
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <LogOut className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">You will be logged out after submission</p>
                <p className="mt-1">Make sure you have saved all your work before continuing.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
              disabled={submitWorkSummary.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitWorkSummary.isPending || !summary.trim()}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-700 hover:to-purple-600"
            >
              {submitWorkSummary.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Submit & Logout
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
