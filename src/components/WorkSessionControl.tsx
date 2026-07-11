import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkSession } from "@/hooks/useWorkSession";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import DaySummaryDialog from "@/components/DaySummaryDialog";
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  Clock,
  Coffee,
  Utensils,
  Moon,
  CheckCircle,
  AlertTriangle,
  Timer,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BREAK_ENDING_SOON_MESSAGE,
  getActiveBreakReminderInfo,
  getBreakReminderAtMs,
  playBreakEndingSoonSound,
  stopBreakEndingSoonSound,
} from "@/lib/breakReminder";
import { format } from "date-fns";

type WorkSessionControlProps = {
  readOnly?: boolean;
  previewDepartmentName?: string | null;
  onWorkEnded?: () => void;
};

export default function WorkSessionControl({
  readOnly = false,
  previewDepartmentName = null,
  onWorkEnded,
}: WorkSessionControlProps) {
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const breakReminderFiredRef = useRef<string | null>(null);
  const { isAdmin, isEmployee, user, userRole } = useAuth();
  const [employeeDept, setEmployeeDept] = useState<string>("");
  
  const ws = useWorkSession() as any;
  const { 
    workSessionState, 
    startWork, 
    takeBreak, 
    resumeWork, 
    endWork,
    isStarting,
    isTakingBreak,
    isResuming,
    isEnding,
    isLoading,
    hourlyRate,
    monthlyLateLogins,
    monthlyUnderHours,
    workedHoursToday,
    lostHoursToday,
  } = ws;

  // Fetch employee department to determine work hours (or use preview context)
  useEffect(() => {
    if (previewDepartmentName) {
      setEmployeeDept(previewDepartmentName);
      return;
    }
    const fetchEmployeeDept = async () => {
      if (user?.email) {
        const { data, error } = await supabase
          .from("employees")
          .select("department_id")
          .eq("email", user.email)
          .limit(1);
        
        const employee = Array.isArray(data) ? data[0] : null;

        if (!error && employee?.department_id) {
          const { data: deptRow } = await supabase
            .from("departments")
            .select("name")
            .eq("id", employee.department_id)
            .limit(1);

          setEmployeeDept(Array.isArray(deptRow) ? deptRow[0]?.name || "" : "");
        } else {
          setEmployeeDept("");
        }
      }
    };
    
    fetchEmployeeDept();
  }, [user?.email, previewDepartmentName]);

  // Fetch today's task logs count to enable/disable End Work button
  const todayDate = new Date().toISOString().split('T')[0];
  const { data: todayTasksCount = 0 } = useQuery({
    queryKey: ["today-tasks-count", user?.id, todayDate],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      // First get employee_id if not in userRole
      let employeeId = userRole?.employee_id;
      if (!employeeId) {
        const { data: emp } = await supabase
          .from("employees")
          .select("id")
          .eq("email", user.email)
          .single();
        employeeId = emp?.id;
      }

      if (!employeeId) return 0;

      const { count, error } = await supabase
        .from("task_logs")
        .select("*", { count: 'exact', head: true })
        .eq("employee_id", employeeId)
        .eq("log_date", todayDate);
      
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const isEndWorkDisabled = isEmployee() && todayTasksCount === 0;

  const {
    session,
    canStartWork,
    canTakeBreak,
    canResumeWork,
    canEndWork,
    currentStatus,
    currentTime
  } = workSessionState;

  // 2-minute "break ending soon" sound + toast (once per active break)
  useEffect(() => {
    if (readOnly) {
      breakReminderFiredRef.current = null;
      return;
    }
    if (currentStatus !== "on_break" || !session) {
      breakReminderFiredRef.current = null;
      return;
    }

    const info = getActiveBreakReminderInfo(session);
    if (!info) return;

    const instanceKey = `${session.id}-${info.kind}-${info.startIso}`;
    const reminderAtMs = getBreakReminderAtMs(info.start, info.allocatedMinutes);

    if (currentTime.getTime() < reminderAtMs) return;
    if (breakReminderFiredRef.current === instanceKey) return;

    breakReminderFiredRef.current = instanceKey;
    playBreakEndingSoonSound();
    toast.info(BREAK_ENDING_SOON_MESSAGE, { duration: 20_000 });
  }, [session, currentStatus, currentTime, readOnly]);

  // Additional metrics are available from `ws` above

  // Determine department label
  const deptLabel = previewDepartmentName ?? employeeDept;
  
  // Work hours
  const workStartHour = 10;
  const workEndHour = 19; // 7 PM
  const lateLoginTime = "10:15 AM";

  const calculateWorkDuration = () => {
    if (!session?.start_time) return "00:00:00";
    
    const startTime = new Date(session.start_time);
    let endTime: Date;
    
    if (session.end_time) {
      // Work session has ended
      endTime = new Date(session.end_time);
    } else if (session.status === "on_break" && session.break_start_time) {
      // On break - work duration stops at break start time
      endTime = new Date(session.break_start_time);
    } else {
      // Working - count up to current time
      endTime = currentTime;
    }
    
    const duration = endTime.getTime() - startTime.getTime();
    
    // Subtract break durations if completed breaks exist
    let breakDurationMs = 0;
    if (session.morning_break_start && session.morning_break_end) {
      breakDurationMs += new Date(session.morning_break_end).getTime() - new Date(session.morning_break_start).getTime();
    }
    if (session.lunch_break_start && session.lunch_break_end) {
      breakDurationMs += new Date(session.lunch_break_end).getTime() - new Date(session.lunch_break_start).getTime();
    }
    if (session.short_break_start && session.short_break_end) {
      breakDurationMs += new Date(session.short_break_end).getTime() - new Date(session.short_break_start).getTime();
    }
    // Legacy break tracking
    if (session.break_start_time && session.break_end_time && !session.morning_break_start && !session.lunch_break_start && !session.short_break_start) {
      breakDurationMs += new Date(session.break_end_time).getTime() - new Date(session.break_start_time).getTime();
    }
    
    const positiveDuration = Math.max(0, duration - breakDurationMs);
    
    const hours = Math.floor(positiveDuration / (1000 * 60 * 60));
    const minutes = Math.floor((positiveDuration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((positiveDuration % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const calculateBreakDuration = () => {
    // Calculate total of all breaks (new + legacy)
    let totalMinutes = 0;
    let totalSeconds = 0;

    // Morning break
    if (session?.morning_break_start) {
      const start = new Date(session.morning_break_start);
      const end = session.morning_break_end ? new Date(session.morning_break_end) : currentTime;
      const duration = Math.max(0, end.getTime() - start.getTime());
      totalMinutes += Math.floor(duration / (1000 * 60));
      totalSeconds += Math.floor((duration % (1000 * 60)) / 1000);
    }

    // Lunch break
    if (session?.lunch_break_start) {
      const start = new Date(session.lunch_break_start);
      const end = session.lunch_break_end ? new Date(session.lunch_break_end) : currentTime;
      const duration = Math.max(0, end.getTime() - start.getTime());
      totalMinutes += Math.floor(duration / (1000 * 60));
      totalSeconds += Math.floor((duration % (1000 * 60)) / 1000);
    }

    // Short break
    if (session?.short_break_start) {
      const start = new Date(session.short_break_start);
      const end = session.short_break_end ? new Date(session.short_break_end) : currentTime;
      const duration = Math.max(0, end.getTime() - start.getTime());
      totalMinutes += Math.floor(duration / (1000 * 60));
      totalSeconds += Math.floor((duration % (1000 * 60)) / 1000);
    }

    // Legacy break tracking (fallback)
    if (session?.break_start_time && !session?.morning_break_start && !session?.lunch_break_start && !session?.short_break_start) {
      const start = new Date(session.break_start_time);
      const end = session.break_end_time ? new Date(session.break_end_time) : currentTime;
      const duration = Math.max(0, end.getTime() - start.getTime());
      totalMinutes += Math.floor(duration / (1000 * 60));
      totalSeconds += Math.floor((duration % (1000 * 60)) / 1000);
    }

    // Normalize seconds to minutes
    totalMinutes += Math.floor(totalSeconds / 60);
    totalSeconds = totalSeconds % 60;

    return formatDuration(totalMinutes, totalSeconds);
  };

  const calculateIndividualBreakDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return "00:00";
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : currentTime;
    const duration = Math.max(0, end.getTime() - start.getTime());
    
    const minutes = Math.floor(duration / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    
    return formatDuration(minutes, seconds);
  };

  const handleEndWork = () => {
    stopBreakEndingSoonSound();
    setShowSummaryDialog(true);
  };

  const handleSummarySubmitted = (summaryId: string) => {
    endWork();
    if (onWorkEnded) {
      onWorkEnded();
    }
  };

  const getStatusBadge = () => {
    switch (currentStatus) {
      case "working":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <Clock className="w-3 h-3 mr-1" />
            Working
          </Badge>
        );
      case "on_break":
        return (
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
            <Coffee className="w-3 h-3 mr-1" />
            On Break
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
            <Timer className="w-3 h-3 mr-1" />
            Not Started
          </Badge>
        );
    }
  };

  const getProgressPercentage = () => {
    if (!session?.start_time) return 0;
    
    const startTime = new Date(session.start_time);
    const endTime = session.end_time ? new Date(session.end_time) : currentTime;
    
    // Create work start and end times for the same day based on department
    const workStart = new Date(startTime);
    workStart.setHours(workStartHour, 0, 0, 0);
    const workEnd = new Date(startTime);
    workEnd.setHours(workEndHour, 0, 0, 0);
    
    // If current time is before work start, return 0
    if (endTime < workStart) return 0;
    
    // If current time is after work end, return 100
    if (endTime > workEnd) return 100;
    
    const totalWorkTime = workEnd.getTime() - workStart.getTime();
    const elapsed = endTime.getTime() - workStart.getTime();
    
    return Math.min(Math.max((elapsed / totalWorkTime) * 100, 0), 100);
  };

  const formatTime = (date: Date) => {
    return format(date, "hh:mm:ss a");
  };

  const isLateLogin = session?.late_login;
  const totalBreakMinutes = session
    ? Number(session.morning_break_duration || 0) +
      Number(session.lunch_break_duration || 0) +
      Number(session.short_break_duration || 0) ||
      Number(session.break_duration || 0)
    : 0;
  const breakExceeded = totalBreakMinutes > 30;

  const getSectionTitle = () => {
    if (isAdmin()) {
      return "Admin Work Session Tracker";
    } else if (isEmployee()) {
      return "Employee Work Session";
    }
    return "Today's Work Session";
  };

  const getSectionDescription = () => {
    if (isAdmin()) {
      return "Monitor and manage your administrative work hours and tasks";
    } else if (isEmployee()) {
      return "Track your daily work hours and manage your tasks efficiently";
    }
    return "Track work hours and manage daily tasks";
  };

  const getWorkHoursText = () => {
    if (isAdmin()) {
      return `Admin work hours: ${workStartHour}:00 AM – ${workEndHour === 19 ? '7:00 PM' : '6:00 PM'}`;
    } else if (isEmployee()) {
      return `Employee work hours: ${workStartHour}:00 AM – ${workEndHour === 19 ? '7:00 PM' : '6:00 PM'}`;
    }
    return `Work hours: ${workStartHour}:00 AM – ${workEndHour === 19 ? '7:00 PM' : '6:00 PM'}`;
  };

  return (
    <div className="space-y-6 h-full">
      {/* Status Card */}
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Timer className="w-5 h-5" />
              {getSectionTitle()}
            </CardTitle>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
              ) : (
                getStatusBadge()
              )}
              {isLateLogin && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Late Login
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex flex-col">
          {/* Current Time */}
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-gray-900">
              {formatTime(currentTime)}
            </div>
            <div className="text-sm text-gray-500">
              {format(currentTime, "EEEE, MMMM d, yyyy")}
            </div>
          </div>

          {/* Work Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Work Progress</span>
              <span className="font-medium">{Math.round(getProgressPercentage())}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{workStartHour}:00 AM</span>
              <span>{workEndHour === 19 ? '7:00 PM' : '6:00 PM'}</span>
            </div>
          </div>

          {/* Time Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Work Duration</div>
              <div className="text-xl font-mono font-semibold text-gray-900">
                {calculateWorkDuration()}
              </div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-xs text-orange-600 mb-1">Break Duration</div>
              <div className="text-xl font-mono font-semibold text-orange-900">
                {calculateBreakDuration()}
              </div>
              {breakExceeded && currentStatus === "on_break" && (
                <div className="text-xs text-red-600 mt-1">Exceeds 30 min</div>
              )}
            </div>
          </div>

          {/* Session Details */}
          {session && (
            <div className="text-sm space-y-1 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between">
                <span className="text-gray-600">Started:</span>
                <span className="font-medium">
                  {session.start_time ? format(new Date(session.start_time), "hh:mm a") : "-"}
                </span>
              </div>
              {session.break_start_time && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Break Started:</span>
                  <span className="font-medium">
                    {format(new Date(session.break_start_time), "hh:mm a")}
                  </span>
                </div>
              )}
              {session.break_end_time && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Break Ended:</span>
                  <span className="font-medium">
                    {format(new Date(session.break_end_time), "hh:mm a")}
                  </span>
                </div>
              )}
              {session.end_time && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Ended:</span>
                  <span className="font-medium">
                    {format(new Date(session.end_time), "hh:mm a")}
                  </span>
                </div>
              )}
              {session.total_hours && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Hours:</span>
                  <span className="font-medium">{session.total_hours.toFixed(2)}h</span>
                </div>
              )}
            </div>
          )}

          {/* Work Summary Display */}
          {session?.work_summaries?.summary && (
            <div className="p-4 bg-violet-50 rounded-lg border border-violet-100">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-semibold text-violet-900">Day Summary</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {session.work_summaries.summary}
              </p>
            </div>
          )}

          {/* Control Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={() => startWork()}
              disabled={readOnly || !canStartWork || isStarting}
              className={cn(
                "h-12 text-base font-medium text-white",
                canStartWork && "bg-green-700 hover:bg-green-800"
              )}
            >
              <Play className="w-4 h-4 mr-2" />
              {isStarting ? "Starting..." : "Start Work"}
            </Button>

            {/** Styled break buttons group - normalized sizes */}
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button
                onClick={() => takeBreak('lunch')}
                disabled={readOnly || !canTakeBreak || isTakingBreak || !!session?.lunch_break}
                variant="default"
                className={cn(
                  "h-10 w-full px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-transparent text-white shadow-sm",
                  session?.lunch_break
                    ? "bg-amber-900 hover:bg-amber-950"
                    : "bg-amber-700 hover:bg-amber-800"
                )}
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-6 h-6 rounded-md",
                    session?.lunch_break ? "bg-amber-950/80" : "bg-amber-800"
                  )}
                >
                  <Utensils className="w-3.5 h-3.5 text-amber-50" />
                </span>
                <span className="text-xs font-semibold text-amber-50">L Break</span>
              </Button>

              <Button
                onClick={() => takeBreak('short')}
                disabled={readOnly || !canTakeBreak || isTakingBreak || !!session?.short_break}
                variant="default"
                className={cn(
                  "h-10 w-full px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-transparent text-white shadow-sm",
                  session?.short_break
                    ? "bg-violet-900 hover:bg-violet-950"
                    : "bg-violet-700 hover:bg-violet-800"
                )}
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-6 h-6 rounded-md",
                    session?.short_break ? "bg-violet-950/80" : "bg-violet-800"
                  )}
                >
                  <Moon className="w-3.5 h-3.5 text-violet-50" />
                </span>
                <span className="text-xs font-semibold text-violet-50">E Break</span>
              </Button>
            </div>

            <Button
              onClick={() => {
                stopBreakEndingSoonSound();
                resumeWork();
              }}
              disabled={readOnly || !canResumeWork || isResuming}
              variant="default"
              className="h-12 text-base font-medium border-transparent bg-blue-700 text-white hover:bg-blue-800"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {isResuming ? "Resuming..." : "Resume Work"}
            </Button>

            <div className="relative group">
              <Button
                onClick={handleEndWork}
                disabled={readOnly || !canEndWork || isEnding || isEndWorkDisabled}
                variant="default"
                className={cn(
                  "h-12 w-full px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border-transparent text-white transition-all",
                  isEndWorkDisabled 
                    ? "bg-gray-400 cursor-not-allowed" 
                    : "bg-red-700 hover:bg-red-800"
                )}
              >
                <Square className="w-4 h-4" />
                <span>{isEnding ? "Ending..." : "End Work"}</span>
              </Button>
              {!readOnly && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 bg-gradient-to-br from-violet-600 to-indigo-700 text-white text-xs py-3 px-4 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-2xl shadow-violet-500/30 text-center leading-relaxed border border-violet-400/30 scale-95 group-hover:scale-100">
                  <div className="flex items-center justify-center gap-1.5 mb-1.5 text-violet-100">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Workflow Reminder</span>
                  </div>
                  First complete the Task Log (Single or Multiple) based on your work. After that, you can click End Work. Once ended, you will submit a work summary, update KPIs, and it will auto logout.
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-700 rotate-45 border-r border-b border-violet-400/30" />
                </div>
              )}
            </div>
          </div>

          {/* Help Text */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Work Schedule Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
              <div className="font-semibold text-blue-800 mb-2 flex items-center gap-1">
                ⏰ Work Schedule
              </div>
              <div className="space-y-1 text-blue-700">
                <div className="flex items-center gap-2">
                  <span className="text-blue-500">🕘</span>
                  <span>{workStartHour}:00 AM – {workEndHour === 19 ? '7:00 PM' : '6:00 PM'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-500">⚠️</span>
                  <span>Late: After {lateLoginTime}</span>
                </div>
              </div>
            </div>

            {/* Break Timings Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
              <div className="font-semibold text-green-800 mb-2 flex items-center gap-1">
                ☕ Break Timings
              </div>
              <div className="space-y-1 text-green-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>🍽️</span>
                    <span className={session?.lunch_break ? "font-medium" : ""}>Lunch (1:00-1:45 PM):</span>
                  </div>
                  <span className={`font-mono ${session?.lunch_break && !session?.lunch_break_end ? "text-orange-600 animate-pulse" : ""}`}>
                    {calculateIndividualBreakDuration(session?.lunch_break_start, session?.lunch_break_end)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>🌆</span>
                    <span className={session?.short_break ? "font-medium" : ""}>Evening (4:30-4:45 PM):</span>
                  </div>
                  <span className={`font-mono ${session?.short_break && !session?.short_break_end ? "text-orange-600 animate-pulse" : ""}`}>
                    {calculateIndividualBreakDuration(session?.short_break_start, session?.short_break_end)}
                  </span>
                </div>
                <div className="border-t border-green-200 pt-1 mt-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total:</span>
                    <span className="font-mono">{calculateBreakDuration()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Employee metrics removed from this card (moved to Dashboard/Timesheet pages) */}

            {/* Note Card */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-3 border border-purple-100 col-span-2">
              <div className="font-semibold text-purple-800 mb-1 flex items-center gap-1">
                📌 Note
              </div>
              <div className="flex items-center gap-2 text-purple-700">
                <span className="text-purple-500">⏳</span>
                <span>Shift End Time: {workEndHour === 19 ? '7:00 PM' : '6:00 PM'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Summary Dialog */}
      <DaySummaryDialog
        open={showSummaryDialog}
        onOpenChange={setShowSummaryDialog}
        onSummarySubmitted={handleSummarySubmitted}
      />
    </div>
  );
}
