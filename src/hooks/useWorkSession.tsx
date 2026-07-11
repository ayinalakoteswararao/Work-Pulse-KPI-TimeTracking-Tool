import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WorkSession {
  id: string;
  user_id: string;
  employee_id?: string;
  date: string;
  start_time?: string;
  break_start_time?: string;
  break_end_time?: string;
  end_time?: string;
  total_hours?: number;
  break_duration?: number;
  status: "pending" | "working" | "on_break" | "completed" | "incomplete";
  late_login?: boolean;
  overtime_hours?: number;
  notes?: string;
  work_summary_id?: string;
  work_summaries?: {
    id: string;
    summary: string;
    work_date: string;
  } | null;
  // New break tracking fields
  break_count?: number;
  morning_break?: boolean;
  morning_break_start?: string;
  morning_break_end?: string;
  morning_break_duration?: number;
  lunch_break?: boolean;
  lunch_break_start?: string;
  lunch_break_end?: string;
  lunch_break_duration?: number;
  short_break?: boolean;
  short_break_start?: string;
  short_break_end?: string;
  short_break_duration?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkSessionState {
  session: WorkSession | null;
  canStartWork: boolean;
  canTakeBreak: boolean;
  canResumeWork: boolean;
  canEndWork: boolean;
  currentStatus: "idle" | "working" | "on_break" | "completed";
  currentTime: Date;
}

export function useWorkSession() {
  const qc = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employeeDept, setEmployeeDept] = useState<string>("");
  const [workStartHour, setWorkStartHour] = useState<number | null>(null);
  const [hourlyRate, setHourlyRate] = useState<number | null>(null);
  const [monthlyLateLogins, setMonthlyLateLogins] = useState<number>(0);
  const [monthlyUnderHours, setMonthlyUnderHours] = useState<number>(0);

  const toMinutes = (value?: number | null) => Number(value || 0);

  const getStoredTotalBreakMinutes = (workSession: WorkSession | null) => {
    if (!workSession) return 0;
    const tracked =
      toMinutes(workSession.morning_break_duration) +
      toMinutes(workSession.lunch_break_duration) +
      toMinutes(workSession.short_break_duration);
    return tracked > 0 ? tracked : toMinutes(workSession.break_duration);
  };

  const getLiveTotalBreakMinutes = (workSession: WorkSession | null, now: Date) => {
    if (!workSession) return 0;
    let total = getStoredTotalBreakMinutes(workSession);

    if (workSession.status === "on_break") {
      let activeBreakStart: string | undefined;
      if (workSession.morning_break_start && !workSession.morning_break_end) {
        activeBreakStart = workSession.morning_break_start;
      } else if (workSession.lunch_break_start && !workSession.lunch_break_end) {
        activeBreakStart = workSession.lunch_break_start;
      } else if (workSession.short_break_start && !workSession.short_break_end) {
        activeBreakStart = workSession.short_break_start;
      } else if (workSession.break_start_time && !workSession.break_end_time) {
        activeBreakStart = workSession.break_start_time;
      }

      if (activeBreakStart) {
        const elapsedMinutes = Math.max(
          0,
          Math.round((now.getTime() - new Date(activeBreakStart).getTime()) / (1000 * 60))
        );
        total += elapsedMinutes;
      }
    }

    return total;
  };

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch employee department to determine work hours
  useEffect(() => {
    const fetchEmployeeDept = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data, error } = await supabase
          .from("employees")
          .select("department_id")
          .eq("email", user.email)
          .limit(1);

        const employee = Array.isArray(data) ? data[0] : null;
        
        if (!error && employee) {
          let deptName = "";

          if (employee.department_id) {
            const { data: deptRow } = await supabase
              .from("departments")
              .select("name")
              .eq("id", employee.department_id)
              .limit(1);

            deptName = Array.isArray(deptRow) ? (deptRow[0]?.name as string) || "" : "";
          }

          setEmployeeDept(deptName);
          // Set work hours based on department
          setWorkStartHour(10);
          setHourlyRate(null);
        } else {
          // Ensure we always set a work start hour fallback after fetch completes
          setWorkStartHour(9);
        }
      }
    };
    
    fetchEmployeeDept();
  }, []);

  // Fetch monthly aggregates (late logins, under-time) for the current user
  useEffect(() => {
    const fetchMonthlyMetrics = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const { data: sessions, error: sessionsError } = await supabase
          .from('work_sessions')
          .select('total_hours, late_login, date')
          .eq('user_id', user.id)
          .gte('date', startOfMonth)
          .lte('date', endOfMonth);

        if (!sessionsError && Array.isArray(sessions)) {
          const lateCount = sessions.filter((s: any) => s.late_login).length;
          setMonthlyLateLogins(lateCount);

          const underHours = sessions.reduce((acc: number, s: any) => {
            const th = Number(s.total_hours || 0);
            return acc + (th < 8 ? 8 - th : 0);
          }, 0);
          setMonthlyUnderHours(underHours);
        }
      } catch (e) {
        // ignore
      }
    };

    fetchMonthlyMetrics();
  }, []);

  // Fetch current work session
  const { data: session, isLoading, refetch } = useQuery({
    queryKey: ["work_session", "current"],
    queryFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user) {
        return null;
      }

      const today = new Date().toISOString().split('T')[0];

      try {
        const { data, error } = await supabase
          .from("work_sessions")
          .select(`
            *,
            work_summaries(id, summary, work_date)
          `)
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle(); // Use maybeSingle() instead of single() to avoid PGRST116 error
        
        if (error) {
          console.error("Work session query error:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            userId: user.id,
            date: today
          });
          
          // If it's a 406 error or similar, try a more basic query
          if (error.code === '406' || error.message.includes('406')) {
            const { data: fallbackData, error: fallbackError } = await supabase
              .from("work_sessions")
              .select(`
                *,
                work_summaries(id, summary, work_date)
              `)
              .eq("user_id", user.id)
              .order("date", { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (fallbackError) {
              console.error("Fallback query also failed:", fallbackError);
              throw fallbackError;
            }
            
            return fallbackData as unknown as WorkSession;
          }
          
          throw error;
        }
        
        return data as unknown as WorkSession;
      } catch (err: any) {
        console.error("Unexpected error in work session query:", err);
        throw err;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Start work mutation
  const startWork = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const now = new Date();
      const workDate = now.toISOString().split('T')[0];
      
      // Get employee record for this user - try metadata first, then email
      let employeeId = user.user_metadata?.employee_id;
      let employee = null;
      
      if (employeeId) {
        // Try to fetch by employee_id from metadata
        const { data: empById, error: idError } = await supabase
          .from("employees")
          .select("id")
          .eq("id", employeeId)
          .maybeSingle();
        
        if (!idError && empById) {
          employee = empById;
        }
      }
      
      // Fallback: try to find by email
      if (!employee && user.email) {
        const { data: empByEmail, error: emailError } = await supabase
          .from("employees")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();
        
        if (!emailError && empByEmail) {
          employee = empByEmail;
        }
      }
      
      if (!employee) {
        console.error("Employee not found for user:", user.email, "metadata employee_id:", employeeId);
        throw new Error("Employee record not found. Please contact your admin.");
      }
      
      // Check if user already has a session for today
      const { data: existingSession, error: checkError } = await supabase
        .from("work_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", workDate)
        .maybeSingle(); // Use maybeSingle instead of single
      
      if (checkError) {
        console.error("Error checking existing session:", checkError);
        throw new Error("Failed to check for existing session");
      }
      
      if (existingSession) {
        throw new Error("You already have a work session for today");
      }
      
      // Determine work hours based on employee department
      const empWorkStartHour = 10;
      const lateLoginMinute = 15;
      const lateLoginHour = empWorkStartHour;
      
      // Check if current time is after work start hour
      const hour = now.getHours();
      if (hour < empWorkStartHour) {
        throw new Error(`Work can only be started at or after ${empWorkStartHour}:00 AM`);
      }

      // Check if login is late (after 10 minutes past start time)
      const isLate = hour > lateLoginHour || (hour === lateLoginHour && now.getMinutes() > lateLoginMinute);

      const { error } = await supabase
        .from("work_sessions")
        .insert({
          user_id: user.id,
          employee_id: employee.id, // Ensure employee_id is set
          date: workDate,
          start_time: now.toISOString(),
          status: "working",
          late_login: isLate,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work_session"] });
      toast.success("Work session started successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to start work session");
    },
  });

  // Determine which break type to use based on count
  const getNextBreakType = (): { type: string; count: number } => {
    const count = session?.break_count || 0;
    switch (count) {
      case 0: return { type: "lunch", count: 0 };
      case 1: return { type: "short", count: 1 };
      default: return { type: "max", count: 2 };
    }
  };

  // Take break mutation with proper categorization
  const takeBreak = useMutation({
    // Accept optional selected break type: 'morning' | 'lunch' | 'short'
    mutationFn: async (selectedType?: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (!session || session.status !== "working") {
        throw new Error("You can only take a break when working");
      }

      // Determine requested break type (explicit selection or next available)
      const { type: autoType, count: autoCount } = getNextBreakType();
      const breakType = selectedType || autoType;
      const currentCount = session?.break_count || 0;

      if (breakType === "max") {
        throw new Error("Maximum 2 breaks allowed per day");
      }

      // Prevent taking the same named break twice
      if ((breakType === 'morning' && session.morning_break) || (breakType === 'lunch' && session.lunch_break) || (breakType === 'short' && session.short_break)) {
        throw new Error(`You have already taken the ${breakType} break`);
      }

      const now = new Date().toISOString();
      const newCount = currentCount + 1;

      // Build update data based on break type
      let updateData: any = {
        status: "on_break",
        break_count: newCount,
      };

      switch (breakType) {
        case "morning":
          updateData = {
            ...updateData,
            morning_break: true,
            morning_break_start: now,
            morning_break_end: null,
            // Also set legacy fields for backwards compatibility
            break_start_time: now,
            break_end_time: null,
          };
          break;
        case "lunch":
          updateData = {
            ...updateData,
            lunch_break: true,
            lunch_break_start: now,
            lunch_break_end: null,
            break_start_time: now,
            break_end_time: null,
          };
          break;
        case "short":
          updateData = {
            ...updateData,
            short_break: true,
            short_break_start: now,
            short_break_end: null,
            break_start_time: now,
            break_end_time: null,
          };
          break;
      }

      const { error } = await supabase
        .from("work_sessions")
        .update(updateData)
        .eq("id", session.id)
        .eq("user_id", user.id);

      if (error) throw error;
      
      return { breakType };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["work_session"] });
      const breakTypeLabels: Record<string, string> = {
        lunch: "Lunch Break",
        short: "Evening Break",
      };
      toast.success(`${breakTypeLabels[data?.breakType || "Break"]} started! Don't forget to resume.`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to start break");
    },
  });

  // Resume work mutation with proper break type handling
  const resumeWork = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (!session || session.status !== "on_break") {
        throw new Error("You can only resume work when on break");
      }

      const resumeTime = new Date();
      const resumeTimeIso = resumeTime.toISOString();

      // Determine which break is active and calculate its duration
      let updateData: any = {
        status: "working",
        break_end_time: resumeTimeIso,
      };

      let breakStartTime: Date | null = null;
      let breakType = "";
      let breakDuration = 0;

      // Check morning break
      if (session.morning_break_start && !session.morning_break_end) {
        breakStartTime = new Date(session.morning_break_start);
        breakDuration = (resumeTime.getTime() - breakStartTime.getTime()) / (1000 * 60);
        updateData.morning_break_end = resumeTimeIso;
        updateData.morning_break_duration = Math.round(breakDuration);
        breakType = "morning";
      }
      // Check lunch break
      else if (session.lunch_break_start && !session.lunch_break_end) {
        breakStartTime = new Date(session.lunch_break_start);
        breakDuration = (resumeTime.getTime() - breakStartTime.getTime()) / (1000 * 60);
        updateData.lunch_break_end = resumeTimeIso;
        updateData.lunch_break_duration = Math.round(breakDuration);
        breakType = "lunch";
      }
      // Check short break
      else if (session.short_break_start && !session.short_break_end) {
        breakStartTime = new Date(session.short_break_start);
        breakDuration = (resumeTime.getTime() - breakStartTime.getTime()) / (1000 * 60);
        updateData.short_break_end = resumeTimeIso;
        updateData.short_break_duration = Math.round(breakDuration);
        breakType = "short";
      }
      // Fallback to legacy break tracking
      else if (session.break_start_time && !session.break_end_time) {
        breakStartTime = new Date(session.break_start_time);
        breakDuration = (resumeTime.getTime() - breakStartTime.getTime()) / (1000 * 60);
      }

      // Check if break exceeds 30 minutes
      if (breakDuration > 30) {
        toast.warning(`${breakType ? breakType.charAt(0).toUpperCase() + breakType.slice(1) : "Break"} duration: ${Math.round(breakDuration)} minutes (exceeds 30-minute limit)`);
      }

      const finalizedBreakDuration = Math.round(breakDuration);
      const totalBreakMinutes =
        (breakType === "morning" ? finalizedBreakDuration : toMinutes(session.morning_break_duration)) +
        (breakType === "lunch" ? finalizedBreakDuration : toMinutes(session.lunch_break_duration)) +
        (breakType === "short" ? finalizedBreakDuration : toMinutes(session.short_break_duration));

      if (breakType) {
        updateData.break_duration = totalBreakMinutes;
      } else {
        updateData.break_duration = toMinutes(session.break_duration) + finalizedBreakDuration;
      }

      const { error } = await supabase
        .from("work_sessions")
        .update(updateData)
        .eq("id", session.id)
        .eq("user_id", user.id);

      if (error) throw error;
      
      return { breakType, duration: breakDuration };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["work_session"] });
      const breakTypeLabels: Record<string, string> = {
        lunch: "Lunch Break",
        short: "Evening Break",
      };
      const label = data?.breakType ? breakTypeLabels[data.breakType] : "Break";
      toast.success(`${label} ended. Work resumed successfully!`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to resume work");
    },
  });

  // End work mutation
  const endWork = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (!session || (!["working", "on_break"].includes(session.status))) {
        throw new Error("No active work session to end");
      }

      const endTime = new Date();
      let finalStatus: "completed" | "incomplete" = "completed";

      // Check if work day is incomplete (less than 8 hours after breaks)
      if (session.start_time) {
        const startTime = new Date(session.start_time);
        const totalWorkTime = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // in hours
        const breakTime = getLiveTotalBreakMinutes(session, endTime);
        const actualWorkHours = totalWorkTime - (breakTime / 60);

        if (actualWorkHours < 8) {
          finalStatus = "incomplete";
        }
      }

      const updateData: any = {
        end_time: endTime.toISOString(),
        status: finalStatus,
      };

      // If currently on break, end the break first
      if (session.status === "on_break") {
        updateData.break_end_time = endTime.toISOString();
      }

      updateData.break_duration = getLiveTotalBreakMinutes(session, endTime);

      const { error } = await supabase
        .from("work_sessions")
        .update(updateData)
        .eq("id", session.id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work_session"] });
      toast.success("Work session ended!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to end work session");
    },
  });

  // Calculate button states and current status
  const getWorkSessionState = useCallback((): WorkSessionState => {
    const now = currentTime;
    const currentHour = now.getHours();
    
    let canStartWork = false;
    let canTakeBreak = false;
    let canResumeWork = false;
    let canEndWork = false;
    let currentStatus: "idle" | "working" | "on_break" | "completed" = "idle";

    if (session) {
      switch (session.status) {
        case "working":
          currentStatus = "working";
          canTakeBreak = true;
          canEndWork = true;
          break;
        case "on_break":
          currentStatus = "on_break";
          canResumeWork = true;
          canEndWork = true;
          break;
        case "completed":
        case "incomplete":
          currentStatus = "completed";
          break;
      }
    } else {
      // No session today - use department-based work hours
      if (workStartHour !== null) {
        const startOfWork = new Date(now);
        startOfWork.setHours(workStartHour, 0, 0, 0);
        const endOfWork = new Date(now);
        endOfWork.setHours(19, 0, 0, 0);

        canStartWork = now >= startOfWork && now < endOfWork;
      } else {
        // If workStartHour isn't loaded yet, disallow starting work to avoid incorrect enablement
        canStartWork = false;
      }
    }

    return {
      session,
      canStartWork,
      canTakeBreak,
      canResumeWork,
      canEndWork,
      currentStatus,
      currentTime,
    };
  }, [session, currentTime]);

  // Compute worked hours and lost hours for today
  const workedHoursToday = (() => {
    if (!session || !session.start_time) return 0;
    const startTime = new Date(session.start_time);
    const endTime = session.end_time ? new Date(session.end_time) : currentTime;
    const totalWorkTime = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // hours
    const breakTime = getLiveTotalBreakMinutes(session, endTime); // minutes
    const actualWorkHours = totalWorkTime - (breakTime / 60);
    return Math.max(0, Number(actualWorkHours.toFixed(2)));
  })();

  const lostHoursToday = Math.max(0, Number((8 - workedHoursToday).toFixed(2)));

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('work_sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_sessions',
        },
        (payload) => {
          // Refetch when changes occur
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return {
    session,
    isLoading,
    workSessionState: getWorkSessionState(),
    startWork: startWork.mutate,
    takeBreak: takeBreak.mutate,
    resumeWork: resumeWork.mutate,
    endWork: endWork.mutate,
    isStarting: startWork.isPending,
    isTakingBreak: takeBreak.isPending,
    isResuming: resumeWork.isPending,
    isEnding: endWork.isPending,
    refetch,
    // Additional metrics for UI
    hourlyRate,
    monthlyLateLogins,
    monthlyUnderHours,
    workedHoursToday,
    lostHoursToday,
  };
}
