import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock,
  Target,
  AlertTriangle
} from "lucide-react";

interface WorkSessionData {
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

export default function AttendanceDashboard() {
  const { data: workSessionData, isLoading } = useQuery({
    queryKey: ["work-sessions-dashboard"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("work_sessions")
        .select(`
          *,
          employees(name, email, roles(role_name))
        `)
        .eq("date", today)
        .in("status", ["completed", "incomplete", "working", "on_break"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      let sessions = data as WorkSessionData[];

      // Fetch all employees to identify absent ones
      const { data: employees } = await supabase
        .from("employees")
        .select("id, name, email, roles(role_name)");

      if (employees) {
        const existingEmployeeIds = sessions.map(s => s.employee_id);
        const absentEmployees = employees.filter(emp => !existingEmployeeIds.includes(emp.id));

        // Fetch approved attendance adjustments and leave requests for today
        const { data: attendanceAdjustments } = await supabase
          .from("attendance_adjustments")
          .select("employee_id, attendance_type, is_approved")
          .eq("adjustment_date", today)
          .eq("is_approved", true);

        const { data: approvedLeaveRequests } = await supabase
          .from("leave_requests")
          .select("employee_id, attendance_type, status")
          .eq("leave_date", today)
          .eq("status", "approved");

        // Add virtual sessions for absent employees with proper attendance types
        const absentSessions = absentEmployees.map(emp => {
          const attendanceAdj = attendanceAdjustments?.find(adj => adj.employee_id === emp.id);
          const leaveRequest = approvedLeaveRequests?.find(lr => lr.employee_id === emp.id);
          
          let sessionStatus = "incomplete";
          let attendanceType: string | undefined;
          
          if (attendanceAdj) {
            attendanceType = attendanceAdj.attendance_type;
            sessionStatus = attendanceAdj.attendance_type.includes("paid") ? "completed" : "incomplete";
          } else if (leaveRequest) {
            attendanceType = leaveRequest.attendance_type;
            sessionStatus = leaveRequest.attendance_type.includes("paid") ? "completed" : "incomplete";
          }

          return {
            id: `absent-${emp.id}-${today}`,
            employee_id: emp.id,
            date: today,
            start_time: undefined,
            end_time: undefined,
            total_hours: 0,
            status: sessionStatus,
            attendance_type: attendanceType,
            employees: {
              name: emp.name,
              email: emp.email,
              roles: emp.roles
            }
          };
        });

        sessions = [...sessions, ...absentSessions];
      }

      return sessions;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-600 bg-emerald-50';
      case 'working': return 'text-blue-600 bg-blue-50';
      case 'on_break': return 'text-amber-600 bg-amber-50';
      case 'incomplete': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const totalHours = workSessionData?.reduce((acc, curr) => acc + (curr.total_hours || 0), 0) || 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Loading work sessions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-gray-600">Total Sessions</p>
                <p className="text-lg font-bold">{workSessionData?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xs text-gray-600">Total Hours</p>
                <p className="text-lg font-bold">{totalHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-gray-600">Completed</p>
                <p className="text-lg font-bold">
                  {workSessionData?.filter(d => d.status === 'completed').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-gray-600">In Progress</p>
                <p className="text-lg font-bold">
                  {workSessionData?.filter(d => d.status === 'working' || d.status === 'on_break').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Work Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workSessionData?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No work sessions for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workSessionData?.map((session) => (
                <div key={session.id} className="border rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-sm">{session.employees?.name}</h3>
                      <p className="text-xs text-gray-500">{session.employees?.email}</p>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {session.employees?.roles?.role_name}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                        <Clock className="h-3 w-3" />
                        Start Time
                      </div>
                      <p className="text-xs font-medium">
                        {session.start_time ? new Date(`1970-01-01T${session.start_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not started'}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                        <Clock className="h-3 w-3" />
                        End Time
                      </div>
                      <p className="text-xs font-medium">
                        {session.end_time ? new Date(`1970-01-01T${session.end_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In progress'}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                        <Target className="h-3 w-3" />
                        Total Hours
                      </div>
                      <p className="text-xs font-medium">
                        {session.total_hours?.toFixed(1) || 0} hours
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
