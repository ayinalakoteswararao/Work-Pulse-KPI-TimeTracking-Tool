import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileText, 
  Calendar, 
  User, 
  Send, 
  X,
  Sparkles,
  CheckCircle2
} from "lucide-react";

interface DaySummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSummarySubmitted: (summaryId: string) => void;
}

export default function DaySummaryDialog({
  open,
  onOpenChange,
  onSummarySubmitted,
}: DaySummaryDialogProps) {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!summary.trim()) {
      toast.error("Please enter a day summary");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user's employee record (optional)
      let employeeData = null;
      try {
        const { data: empData, error: employeeError } = await supabase
          .from("employees")
          .select("id")
          .eq("email", user?.email)
          .limit(1);

        if (!employeeError && empData && empData.length > 0) {
          employeeData = empData[0];
        } else if (employeeError) {
          console.warn("Employee fetch warning:", employeeError);
        }
      } catch (err) {
        console.warn("Could not fetch employee record:", err);
      }

      const resolvedEmployeeId = userRole?.employee_id || employeeData?.id || null;
      if (!resolvedEmployeeId) {
        toast.error("Your employee profile is not linked. Please contact your admin.");
        return;
      }

      // Check if a work session exists for today
      const today = new Date().toISOString().split('T')[0];
      const { data: existingSession, error: fetchError } = await supabase
        .from("work_sessions")
        .select("id")
        .eq("user_id", user?.id)
        .eq("date", today)
        .limit(1);

      let sessionData;
      
      if (fetchError) {
        console.error("Supabase fetch error:", fetchError);
        throw fetchError;
      }
      
      // First, create or get the work session
      let workSessionId: string;
      
      if (!existingSession || existingSession.length === 0) {
        // No session exists, create one
        const insertData: any = {
          user_id: user?.id,
          date: today,
          status: 'completed'
        };
        
        insertData.employee_id = resolvedEmployeeId;
        
        const { data: newSession, error: insertError } = await supabase
          .from("work_sessions")
          .insert(insertData)
          .select('id');
          
        if (insertError) {
          console.error("Supabase insert error:", insertError);
          throw insertError;
        }
        
        if (newSession && newSession.length > 0) {
          workSessionId = newSession[0].id;
        } else {
          throw new Error("Failed to create work session");
        }
      } else {
        workSessionId = existingSession[0].id;
        // Update existing session status to completed
        const { error: sessionUpdateError } = await supabase
          .from("work_sessions")
          .update({ status: 'completed' })
          .eq("id", workSessionId);

        if (sessionUpdateError) {
          console.error("Supabase update error:", sessionUpdateError);
          throw sessionUpdateError;
        }
      }
      
      // Now create the work summary
      const { data: summaryData, error: summaryError } = await supabase
        .from("work_summaries")
        .insert({
          employee_id: resolvedEmployeeId,
          user_id: user?.id,
          summary: summary.trim(),
          work_date: today,
        })
        .select('id')
        .single();
        
      if (summaryError) {
        console.error("Work summary insert error:", summaryError);
        throw summaryError;
      }
      
      // Link the summary to the work session
      const { error: linkError } = await supabase
        .from("work_sessions")
        .update({
          work_summary_id: summaryData.id,
          notes: summary.trim(),
        })
        .eq("id", workSessionId);
        
      if (linkError) {
        console.error("Work session link error:", linkError);
        throw linkError;
      }
      
      sessionData = { id: workSessionId, summary_id: summaryData.id };

      toast.success("Day summary submitted successfully!");
      setSummary("");
      onOpenChange(false);
      onSummarySubmitted?.("summary-submitted");  // Pass placeholder ID since we're storing in notes
      
      // The parent component will handle showing the KPI dialog or navigating
    } catch (error: any) {
      console.error("Error submitting summary:", error);
      toast.error(error.message || "Failed to submit day summary");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      setSummary("");
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-6 text-white">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-white mb-1">
                Enter Day Summary
              </DialogTitle>
              <DialogDescription className="text-violet-100 text-sm">
                Share what you accomplished today - your insights help us grow better!
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Date Info */}
              <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl border border-violet-100">
                <Calendar className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-medium text-violet-900">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>

              {/* Summary Input */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  <Label htmlFor="summary" className="text-sm font-semibold text-gray-900">
                    Your Daily Summary
                  </Label>
                </div>
                <Textarea
                  id="summary"
                  placeholder="Describe what you accomplished today, any challenges faced, and important notes... 🎯"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="min-h-[140px] resize-none border-violet-200 focus:border-violet-400 focus:ring-violet-100 text-sm leading-relaxed"
                  disabled={isSubmitting}
                  required
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Share your achievements and learnings</span>
                  <span className={`font-medium ${summary.length > 200 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {summary.length}/500
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <DialogFooter className="mt-8 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 h-11 border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !summary.trim()}
                className="flex-1 h-11 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/25 transition-all duration-200"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Summary
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}
