import { supabase } from "@/integrations/supabase/client";

export interface Employee {
  id: string;
  name: string;
  email: string;
  employee_code?: string;
  department_id?: string;
  roles?: {
    role_name: string;
  };
}

export interface WorkSessionData {
  id: string;
  employee_id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  total_hours?: number;
  status: string;
  employees?: {
    name: string;
    email: string;
    roles?: {
      role_name: string;
    };
  };
}

/**
 * Creates incomplete work session records for employees who haven't logged in on a given date
 * This ensures that absent employees show up with proper deductions in the salary calculations
 */
export async function createAbsentWorkSessions(
  employees: Employee[],
  existingSessions: WorkSessionData[],
  targetDate: string
): Promise<WorkSessionData[]> {
  try {
    // Find employees who don't have work sessions for the target date
    const absentEmployees = employees.filter(emp => 
      !existingSessions.some(session => session.employee_id === emp.id)
    );

    if (absentEmployees.length === 0) {
      return existingSessions;
    }

    // Fetch approved attendance adjustments for the target date
    const { data: attendanceAdjustments } = await supabase
      .from("attendance_adjustments")
      .select("employee_id, attendance_type, is_approved")
      .eq("adjustment_date", targetDate)
      .eq("is_approved", true);

    // Fetch approved leave requests for the target date
    const { data: approvedLeaveRequests } = await supabase
      .from("leave_requests")
      .select("employee_id, attendance_type, status")
      .eq("leave_date", targetDate)
      .eq("status", "approved");

    // Create virtual sessions for absent employees with proper attendance types
    const absentSessions = absentEmployees.map(emp => {
      // Check if employee has approved attendance adjustment
      const attendanceAdj = attendanceAdjustments?.find(adj => adj.employee_id === emp.id);
      // Check if employee has approved leave request
      const leaveRequest = approvedLeaveRequests?.find(lr => lr.employee_id === emp.id);
      
      // Determine the appropriate status and attendance type
      let sessionStatus = "incomplete";
      let attendanceType: string | undefined;
      
      if (attendanceAdj) {
        // Use approved attendance adjustment
        attendanceType = attendanceAdj.attendance_type;
        sessionStatus = attendanceAdj.attendance_type.includes("paid") ? "completed" : "incomplete";
      } else if (leaveRequest) {
        // Use approved leave request
        attendanceType = leaveRequest.attendance_type;
        sessionStatus = leaveRequest.attendance_type.includes("paid") ? "completed" : "incomplete";
      }

      return {
        employee_id: emp.id,
        date: targetDate,
        status: sessionStatus,
        total_hours: 0,
        start_time: null,
        end_time: null,
        // Don't insert to database - just create virtual records for display
        // This avoids cluttering the database with auto-generated absent records
        id: `absent-${emp.id}-${targetDate}`, // Virtual ID for React key
        employees: {
          name: emp.name,
          email: emp.email,
          roles: emp.roles
        },
        // Add attendance type for salary calculations
        attendance_type: attendanceType
      };
    });

    // Combine existing sessions with virtual absent sessions
    return [...existingSessions, ...absentSessions];
  } catch (error) {
    console.error("Error creating absent work sessions:", error);
    return existingSessions;
  }
}

/**
 * Enhanced work session query that includes absent employees
 */
export async function getWorkSessionsWithAbsent(
  targetDate: string
): Promise<WorkSessionData[]> {
  try {
    // Fetch all employees
    const { data: employees, error: employeeError } = await supabase
      .from("employees")
      .select(`
        id,
        name,
        email,
        employee_code,
        department_id,
        roles(role_name)
      `);

    if (employeeError) throw employeeError;

    // Fetch existing work sessions for the date
    const { data: existingSessions, error: sessionError } = await supabase
      .from("work_sessions")
      .select(`
        *,
        employees(name, email, roles(role_name))
      `)
      .eq("date", targetDate)
      .in("status", ["completed", "incomplete", "working", "on_break"]);

    if (sessionError) throw sessionError;

    // Create combined data with absent employees
    return await createAbsentWorkSessions(
      employees || [],
      existingSessions || [],
      targetDate
    );
  } catch (error) {
    console.error("Error fetching work sessions with absent:", error);
    return [];
  }
}
