import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { getWorkSessionsWithAbsent } from "@/lib/absentEmployeeUtils";
import { 
  Users, 
  Calendar, 
  Clock,
  Play,
  Pause,
  Coffee,
  StopCircle,
  Timer,
  AlertTriangle,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Sun,
  Moon,
  Utensils,
  Building2,
  UserCircle,
  LayoutGrid,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Filter, ImageIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EmployeeAvatarWithPreview from "@/components/EmployeeAvatarWithPreview";
import html2canvas from "html2canvas";

interface WorkSessionData {
  id: string;
  employee_id: string;
  user_id: string;
  date: string;
  start_time?: string;
  break_start_time?: string;
  break_end_time?: string;
  end_time?: string;
  total_hours?: number;
  break_duration?: number;
  status: string;
  late_login?: boolean;
  overtime_hours?: number;
  notes?: string;
  // Break tracking
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
  employees?: {
    id?: string;
    name: string;
    email: string;
    employee_code?: string;
    department_id?: string;
    roles?: {
      role_name: string;
    };
    departments?: {
      name: string;
    };
  };
}

export default function TimeManagementSheet() {
  const { user, userRole, isAdmin, isManager } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const calendarPickerRef = useRef<HTMLInputElement>(null);
  const componentRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"employee" | "day">("day");
  const todayIso = format(new Date(), 'yyyy-MM-dd');
  const [dateRange, setDateRange] = useState({
    startDate: todayIso,
    endDate: todayIso
  });
  const [useDateRange] = useState(false);
  const [datePreset, setDatePreset] = useState<string>("today");
  const effectiveUseDateRange = isAdmin() ? true : useDateRange;

  // Fetch manager's departments
  const { data: userDepartments } = useQuery({
    queryKey: ["timesheet_user_departments", user?.id],
    queryFn: async () => {
      if (!isManager() || !user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("department_id, departments(id, name)")
        .eq("user_id", user.id)
        .eq("role", "manager");
      if (error) throw error;
      return data?.map((d: any) => ({ id: d.department_id, name: d.departments?.name || 'Unknown' })) || [];
    },
    enabled: isManager(),
  });

  // Fetch all departments for admin
  const { data: allDepartments } = useQuery({
    queryKey: ["all_departments"],
    queryFn: async () => {
      if (!isAdmin()) return [];
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin(),
  });

  // Get available departments based on role
  const availableDepartments = isManager() ? userDepartments : allDepartments;

  // Fetch employees based on department filter
  const { data: employees } = useQuery({
    queryKey: ["employees_for_timesheet", selectedDepartment, userDepartments, allDepartments],
    queryFn: async () => {
      let query = supabase
        .from("employees")
        .select("id, name, email, employee_code, profile_photo_url, department_id, roles(role_name)")
        .order("name");
      
      if (isManager() && userDepartments && userDepartments.length > 0) {
        // For managers, get employees from their departments
        const deptIds = userDepartments.map((d: any) => d.id);
        query = query.in("department_id", deptIds);
      } else if (selectedDepartment && selectedDepartment !== "all") {
        query = query.eq("department_id", selectedDepartment);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !isManager() || userDepartments !== undefined,
  });

  // Auto-set department for managers
  useEffect(() => {
    if (isManager() && userDepartments && userDepartments.length > 0) {
      setSelectedDepartment(userDepartments[0].id);
    }
  }, [isManager, userDepartments]);

  const formatDate = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  };

  const { data: pendingLeaveCount = 0 } = useQuery({
    queryKey: ["leave-requests-pending-count"],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("leave_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("admin_seen", false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: isAdmin() || isManager(),
  });

  const { data: workSessionData, isLoading, refetch } = useQuery({
    queryKey: ["work-sessions-admin", formatDate(currentDate), dateRange, effectiveUseDateRange, isManager() ? userDepartments : null, selectedEmployee, employees?.map(e => e.id)],
    queryFn: async () => {
      // Get employee IDs for filtering
      const employeeIds = isManager() 
        ? employees?.map(e => e.id) 
        : selectedEmployee !== "all" 
          ? [selectedEmployee] 
          : null;
      
      // If manager has no employees, return empty
      if (isManager() && (!employeeIds || employeeIds.length === 0)) {
        return [];
      }

      let query = supabase
        .from("work_sessions")
        .select(`
          id, user_id, employee_id, date, start_time, break_start_time, break_end_time, end_time,
          total_hours, break_duration, status, late_login, overtime_hours, notes,
          break_count, morning_break, morning_break_start, morning_break_end, morning_break_duration,
          lunch_break, lunch_break_start, lunch_break_end, lunch_break_duration,
          short_break, short_break_start, short_break_end, short_break_duration,
          employees(name, email, employee_code, department_id, roles(role_name), departments(name))
        `);

      // Use date range or single date
      if (effectiveUseDateRange) {
        query = query.gte("date", dateRange.startDate).lte("date", dateRange.endDate);
      } else {
        query = query.eq("date", formatDate(currentDate));
      }
      
      query = query.order("created_at", { ascending: false });

      // Filter by employee IDs
      if (employeeIds && employeeIds.length > 0) {
        query = query.in("employee_id", employeeIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      let sessions = (data || []) as unknown as WorkSessionData[];

      // For single date view, add absent employees with incomplete sessions
      if (!effectiveUseDateRange) {
        const targetDate = formatDate(currentDate);
        const allEmployees = employees || [];
        const existingEmployeeIds = sessions.map(s => s.employee_id);
        const absentEmployees = allEmployees.filter(emp => !existingEmployeeIds.includes(emp.id));

        // Fetch approved attendance adjustments and leave requests for target date
        const { data: attendanceAdjustments } = await supabase
          .from("attendance_adjustments")
          .select("employee_id, attendance_type, is_approved")
          .eq("adjustment_date", targetDate)
          .eq("is_approved", true);

        const { data: approvedLeaveRequests } = await supabase
          .from("leave_requests")
          .select("employee_id, attendance_type, status")
          .eq("leave_date", targetDate)
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
            id: `absent-${emp.id}-${targetDate}`,
            employee_id: emp.id,
            user_id: '',
            date: targetDate,
            start_time: undefined,
            break_start_time: undefined,
            break_end_time: undefined,
            end_time: undefined,
            total_hours: 0,
            break_duration: 0,
            status: sessionStatus,
            late_login: false,
            overtime_hours: 0,
            notes: undefined,
            break_count: 0,
            morning_break: false,
            morning_break_start: undefined,
            morning_break_end: undefined,
            morning_break_duration: 0,
            lunch_break: false,
            lunch_break_start: undefined,
            lunch_break_end: undefined,
            lunch_break_duration: 0,
            short_break: false,
            short_break_start: undefined,
            short_break_end: undefined,
            short_break_duration: 0,
            attendance_type: attendanceType,
            employees: {
              name: emp.name,
              email: emp.email,
              employee_code: emp.employee_code,
              department_id: emp.department_id,
              roles: emp.roles,
              departments: emp.departments
            }
          };
        });

        sessions = [...sessions, ...absentSessions];
      }

      return sessions;
    },
    enabled: !isManager() || (userDepartments !== undefined && employees !== undefined),
  });

  // Filter sessions based on search, status, and employee
  const filteredSessions = workSessionData?.filter(session => {
    // Skip entries with missing employee data
    if (!session.employees?.name) return false;
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (
      session.employees?.name?.toLowerCase().includes(searchLower) ||
      session.employees?.email?.toLowerCase().includes(searchLower) ||
      session.employees?.employee_code?.toLowerCase().includes(searchLower) ||
      session.status?.toLowerCase().includes(searchLower)
    );
    const matchesStatus = statusFilter 
      ? statusFilter === "late" 
        ? (() => {
            if (!session.start_time) return false;
            const startDate = new Date(session.start_time);
            const hour = startDate.getHours();
            const minute = startDate.getMinutes();
            const lateHour = 10;
            const lateMinute = 15;
            return hour > lateHour || (hour === lateHour && minute > lateMinute);
          })()
        : session.status === statusFilter 
      : true;
    const matchesEmployee = selectedEmployee !== "all" ? session.employee_id === selectedEmployee : true;
    return matchesSearch && matchesStatus && matchesEmployee;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'working': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'on_break': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'incomplete': return 'bg-red-100 text-red-700 border-red-200';
      case 'pending': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <StopCircle className="h-3 w-3" />;
      case 'working': return <Play className="h-3 w-3" />;
      case 'on_break': return <Coffee className="h-3 w-3" />;
      case 'incomplete': return <AlertTriangle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '-';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return timeString;
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes || minutes === 0) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getTotalBreakDuration = (session: WorkSessionData) => {
    const tracked =
      Number(session.morning_break_duration || 0) +
      Number(session.lunch_break_duration || 0) +
      Number(session.short_break_duration || 0);
    return tracked > 0 ? tracked : Number(session.break_duration || 0);
  };

  const formatHours = (hours?: number) => {
    if (!hours || hours === 0) return '-';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes > 0) {
      return `${wholeHours}h ${minutes}m`;
    }
    return `${wholeHours}h`;
  };

  const handlePreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const applyDatePreset = (preset: string) => {
    if (preset === "custom") {
      setDatePreset("custom");
      return;
    }
    const now = new Date();
    const toISO = (d: Date) => format(d, 'yyyy-MM-dd');
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    let start = new Date(today);
    let end = new Date(today);

    switch (preset) {
      case "yesterday":
        start.setDate(start.getDate() - 1);
        end = new Date(start);
        break;
      case "last7":
        start.setDate(start.getDate() - 6);
        break;
      case "last15":
        start.setDate(start.getDate() - 14);
        break;
      case "last30":
        start.setDate(start.getDate() - 29);
        break;
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today);
        break;
      case "lastMonth":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "today":
      default:
        break;
    }

    setDatePreset(preset);
    setDateRange({
      startDate: toISO(start),
      endDate: toISO(end),
    });
  };

  const openCalendarPicker = () => {
    if (calendarPickerRef.current?.showPicker) {
      calendarPickerRef.current.showPicker();
      return;
    }
    calendarPickerRef.current?.click();
  };

  const handleCalendarDateChange = (selectedDate: string) => {
    if (!selectedDate) return;
    setCurrentDate(new Date(`${selectedDate}T00:00:00`));
    setDatePreset("custom");
    setDateRange({
      startDate: selectedDate,
      endDate: selectedDate,
    });
  };

  const handleExport = () => {
    if (!filteredSessions || filteredSessions.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csvContent = [
      ['Employee Name', 'Employee Code', 'Role', 'Date', 'Start Time', 'Break Start', 'Break End', 'End Time', 'Break Duration', 'Total Hours', 'Overtime', 'Status', 'Late Login'].join(','),
      ...filteredSessions.map(session => [
        session.employees?.name || 'Unknown',
        session.employees?.employee_code || '-',
        session.employees?.roles?.role_name || '-',
        session.date,
        formatTime(session.start_time),
        formatTime(session.break_start_time),
        formatTime(session.break_end_time),
        formatTime(session.end_time),
        formatDuration(getTotalBreakDuration(session)),
        formatHours(session.total_hours),
        formatHours(session.overtime_hours),
        session.status,
        session.late_login ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Use date range for filename if enabled
    const fileName = effectiveUseDateRange 
      ? `time-sheet-${dateRange.startDate}-to-${dateRange.endDate}.csv`
      : `time-sheet-${formatDate(currentDate)}.csv`;
    
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success("Time sheet exported successfully");
  };

  const handleExportImage = async () => {
    if (!componentRef.current) return;
    
    try {
      const toastId = toast.loading("Generating image...");
      const canvas = await html2canvas(componentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      
      const image = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = image;
      
      const fileName = effectiveUseDateRange 
        ? `time-sheet-${dateRange.startDate}-to-${dateRange.endDate}.png`
        : `time-sheet-${formatDate(currentDate)}.png`;
        
      a.download = fileName;
      a.click();
      toast.dismiss(toastId);
      toast.success("Time sheet exported as image successfully");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image");
    }
  };

  // Count cards by unique employees (latest session in selected period), not raw rows.
  const getSessionSortKey = (s: WorkSessionData) => {
    const datePart = s.date || "1970-01-01";
    const timePart = s.start_time ? new Date(s.start_time).toISOString() : `${datePart}T00:00:00.000Z`;
    return `${datePart}T${timePart}`;
  };

  const latestSessionByEmployee = new Map<string, WorkSessionData>();
  (filteredSessions || []).forEach((session) => {
    if (!session.employee_id) return;
    const existing = latestSessionByEmployee.get(session.employee_id);
    if (!existing || getSessionSortKey(session) > getSessionSortKey(existing)) {
      latestSessionByEmployee.set(session.employee_id, session);
    }
  });
  const uniqueEmployeeSessions = Array.from(latestSessionByEmployee.values());

  // Calculate summary statistics
  const totalEmployees = uniqueEmployeeSessions.length;
  const currentlyWorking = uniqueEmployeeSessions.filter(s => s.status === 'working').length;
  const onBreak = uniqueEmployeeSessions.filter(s => s.status === 'on_break').length;
  const completed = uniqueEmployeeSessions.filter(s => s.status === 'completed').length;
  const totalHours = uniqueEmployeeSessions.reduce((acc, curr) => acc + (curr.total_hours || 0), 0);
  const lateLogins = uniqueEmployeeSessions.filter(s => {
    if (!s.start_time) return false;
    const startDate = new Date(s.start_time);
    const hour = startDate.getHours();
    const minute = startDate.getMinutes();
    // late after 10:15 AM
    const lateHour = 10;
    const lateMinute = 15;
    
    return hour > lateHour || (hour === lateHour && minute > lateMinute);
  }).length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Loading time management data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 p-6 -m-6 rounded-lg" ref={componentRef}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Time Management Sheet</h2>
          <p className="text-gray-500">Track employee work hours, breaks, and attendance</p>
        </div>
        {(isAdmin() || isManager()) && (
          <Button variant="outline" size="sm" asChild className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 shrink-0">
            <Link to="/attendance-adjustments" className="inline-flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Leave requests
              {pendingLeaveCount > 0 ? (
                <span className="ml-1 rounded-full bg-indigo-600 text-white text-xs font-semibold px-2 py-0.5 min-w-[1.25rem] text-center">
                  {pendingLeaveCount}
                </span>
              ) : null}
            </Link>
          </Button>
        )}
      </div>

      {/* View Mode Toggle Buttons + Filters */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex gap-3">
          <Button
            variant={viewMode === "employee" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("employee")}
            className="flex items-center gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Employee Wise
          </Button>
          <Button
            variant={viewMode === "day" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("day")}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Day Wise
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select 
            value={selectedDepartment} 
            onValueChange={setSelectedDepartment}
            disabled={isManager() && (!userDepartments || userDepartments.length <= 1)}
          >
            <SelectTrigger className="h-9 text-sm w-[180px]">
              <Building2 className="h-3.5 w-3.5 mr-2 text-gray-500" />
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {availableDepartments?.map((dept: any) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={selectedEmployee} 
            onValueChange={setSelectedEmployee}
          >
            <SelectTrigger className="h-9 text-sm w-[180px]">
              <UserCircle className="h-3.5 w-3.5 mr-2 text-gray-500" />
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees?.map((emp: any) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name} {emp.employee_code ? `(${emp.employee_code})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-sm pl-9 w-[180px]"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards - Employee Wise View */}
      {viewMode === "employee" && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Overtime Card */}
          <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-700">
                    {formatHours(
                      uniqueEmployeeSessions.reduce((acc, s) => {
                        const diff = (s.total_hours || 0) - 8;
                        return acc + (diff > 0 ? diff : 0);
                      }, 0)
                    )}
                  </p>
                  <p className="text-xs text-gray-600">Overtime</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Under-time Card */}
          <Card className="bg-gradient-to-br from-red-50 to-white border-red-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-700">
                    {formatHours(
                      uniqueEmployeeSessions.reduce((acc, s) => {
                        const diff = (s.total_hours || 0) - 8;
                        return acc + (diff < 0 ? Math.abs(diff) : 0);
                      }, 0)
                    )}
                  </p>
                  <p className="text-xs text-gray-600">Under-time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* % Loss of Pay Card */}
          <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-700">
                    {(() => {
                      const shortSessions = uniqueEmployeeSessions.filter(s => (s.total_hours || 0) < 8).length;
                      const total = uniqueEmployeeSessions.length || 1;
                      return Math.round((shortSessions / total) * 100);
                    })()}%
                  </p>
                  <p className="text-xs text-gray-600">% Loss of Pay</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Late Logins Card */}
          <Card 
            className="bg-gradient-to-br from-orange-50 to-white border-orange-100 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setStatusFilter(statusFilter === "late" ? null : "late")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-700">{lateLogins}</p>
                  <p className="text-xs text-gray-600">Late Logins</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Working Hours Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-700">{formatHours(totalHours)}</p>
                  <p className="text-xs text-gray-600">Total Working Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Cards - Day Wise View */}
      {viewMode === "day" && (
        <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${statusFilter === null ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setStatusFilter(null)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalEmployees}</p>
                  <p className="text-xs text-gray-500">Total Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${statusFilter === 'working' ? 'ring-2 ring-emerald-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'working' ? null : 'working')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Play className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{currentlyWorking}</p>
                  <p className="text-xs text-gray-500">Working</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${statusFilter === 'on_break' ? 'ring-2 ring-amber-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'on_break' ? null : 'on_break')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Coffee className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{onBreak}</p>
                  <p className="text-xs text-gray-500">On Break</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${statusFilter === 'completed' ? 'ring-2 ring-purple-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'completed' ? null : 'completed')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <StopCircle className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completed}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-default">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <Timer className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatHours(totalHours)}</p>
                  <p className="text-xs text-gray-500">Total Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-default">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{lateLogins}</p>
                  <p className="text-xs text-gray-500">Late Logins</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      )}

      {/* Time Sheet Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-4">
            {/* Header row */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-lg text-slate-800">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Time Sheet
                </div>
                {effectiveUseDateRange && (
                  <span className="text-sm font-medium text-slate-500 sm:border-l sm:pl-3 sm:ml-1 border-slate-200">
                    {(() => {
                      const [startYear, startMonth, startDay] = dateRange.startDate.split("-").map(Number);
                      const [endYear, endMonth, endDay] = dateRange.endDate.split("-").map(Number);
                      const startD = new Date(startYear, startMonth - 1, startDay);
                      const endD = new Date(endYear, endMonth - 1, endDay);
                      if (startD.getTime() === endD.getTime()) {
                        return startD.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
                      }
                      return `${startD.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} to ${endD.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
                    })()}
                  </span>
                )}
              </CardTitle>

              <div className="flex items-center gap-2 flex-wrap">
                <Select value={datePreset} onValueChange={applyDatePreset}>
                  <SelectTrigger className="h-9 w-[170px] border-blue-200 bg-white text-slate-700">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last7">Last 7 Days</SelectItem>
                    <SelectItem value="last15">Last 15 Days</SelectItem>
                    <SelectItem value="last30">Last 1 Month</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="lastMonth">Last Month</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={openCalendarPicker}
                  className="border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Date
                </Button>

                <Button variant="outline" size="sm" onClick={handleExport} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>

                <Button variant="outline" size="sm" onClick={handleExportImage} className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Export Image
                </Button>

                <input
                  ref={calendarPickerRef}
                  type="date"
                  value={effectiveUseDateRange ? dateRange.startDate : formatDate(currentDate)}
                  onChange={(e) => handleCalendarDateChange(e.target.value)}
                  className="sr-only"
                  aria-label="Select date"
                />
              </div>
            </div>
            
            {/* Date Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {!effectiveUseDateRange ? (
                /* Single Day Navigation */
                <div className="flex items-center gap-1 bg-white border rounded-lg p-1">
                  <Button variant="ghost" size="sm" onClick={handlePreviousDay}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2 px-2">
                    <span className="text-sm font-medium min-w-[80px] text-center">
                      {currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleNextDay}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSessions?.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No work sessions found for this {effectiveUseDateRange ? "date range" : "date"}</p>
              <p className="text-sm">Try selecting a different period or date</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Employee</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Start Time</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Late Login</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Break Start</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700 bg-orange-50">Lunch Break</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700 bg-blue-50">Evening Break</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Break End</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Break Duration</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">End Time</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Total Hours</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions?.map((session) => (
                    <tr key={session.id} className="border-b hover:bg-gray-50/50 transition-colors">
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-sm">{session.employees?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            ID: <span className="text-gray-600">{session.employees?.employee_code || '-'}</span>
                          </p>
                          <p className="text-xs text-gray-500">
                            Role: <span className="text-gray-600">{session.employees?.roles?.role_name || '-'}</span>
                          </p>
                          <p className="text-xs text-gray-500">
                            Dept: <span className="text-gray-600">{session.employees?.departments?.name || '-'}</span>
                          </p>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          {session.date ? format(parseISO(session.date), 'dd/MM/yy') : '-'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={`${getStatusColor(session.status)} border flex items-center gap-1 w-fit mx-auto`}>
                          {getStatusIcon(session.status)}
                          <span className="capitalize">{session.status.replace('_', ' ')}</span>
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-sm font-medium text-emerald-700">
                          {formatTime(session.start_time)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {(() => {
                          // Calculate late login from start_time based on department
                          const startTime = session.start_time;
                          if (!startTime) return <span className="text-xs text-gray-400">-</span>;
                          
                          const startDate = new Date(startTime);
                          const hour = startDate.getHours();
                          const minute = startDate.getMinutes();
                          // late after 10:15 AM
                          const lateHour = 10;
                          const lateMinute = 15;
                          const isLate = hour > lateHour || (hour === lateHour && minute > lateMinute);
                          
                          if (isLate) {
                            return (
                              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                                Late
                              </span>
                            );
                          }
                          return <span className="text-xs text-gray-400">-</span>;
                        })()}
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-sm text-amber-700">
                          {formatTime(session.break_start_time)}
                        </span>
                      </td>

                      <td className="p-3 text-center bg-orange-50/50">
                        {session.lunch_break ? (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-500">
                              {formatTime(session.lunch_break_start)}
                            </div>
                            {session.lunch_break_end && (
                              <div className="text-xs text-gray-500">
                                {formatTime(session.lunch_break_end)}
                              </div>
                            )}
                            <div className="text-xs font-medium text-orange-700">
                              {formatDuration(session.lunch_break_duration)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center bg-blue-50/50">
                        {session.short_break ? (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-500">
                              {formatTime(session.short_break_start)}
                            </div>
                            {session.short_break_end && (
                              <div className="text-xs text-gray-500">
                                {formatTime(session.short_break_end)}
                              </div>
                            )}
                            <div className="text-xs font-medium text-blue-700">
                              {formatDuration(session.short_break_duration)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-sm text-blue-700">
                          {formatTime(session.break_end_time)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-sm text-gray-700">
                          {formatDuration(getTotalBreakDuration(session))}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-sm font-medium text-purple-700">
                          {formatTime(session.end_time)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-sm font-bold text-gray-900">
                          {formatHours(session.total_hours)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {(() => {
                          const standardHours = 8;
                          const worked = session.total_hours || 0;
                          const diff = worked - standardHours;
                          const isOvertime = diff > 0;
                          const isShort = diff < 0;
                          
                          if (isOvertime) {
                            return (
                              <div className="inline-flex flex-col items-center justify-center min-w-[70px] py-1.5 px-2 rounded-lg bg-emerald-50/50 border border-emerald-100/50 shadow-sm">
                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                                  <TrendingUp className="h-3 w-3" />
                                  +{formatHours(diff).replace('h', ' hrs')}
                                </span>
                                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mt-1">
                                  Overtime
                                </span>
                              </div>
                            );
                          }
                          
                          if (isShort) {
                            return (
                              <div className="inline-flex flex-col items-center justify-center min-w-[70px] py-1.5 px-2 rounded-lg bg-red-50/50 border border-red-100/50 shadow-sm">
                                <span className="text-xs font-bold text-red-600 flex items-center gap-0.5">
                                  <TrendingDown className="h-3 w-3" />
                                  -{formatHours(Math.abs(diff)).replace('h', ' hrs')}
                                </span>
                                <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider mt-1">
                                  Short
                                </span>
                              </div>
                            );
                          }
                          
                          // On target - show nothing or a dash
                          return <span className="text-gray-400">-</span>;
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Not Logged In Employees Section - Table Format */}
          {!useDateRange && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <UserCircle className="h-4 w-4 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Not Logged In</h3>
                <Badge className="bg-red-100 text-red-700 border-red-200">
                  {employees?.filter(emp => !workSessionData?.some(session => session.employee_id === emp.id)).length || 0} employees
                </Badge>
              </div>

              {(() => {
                const absentEmployees = employees?.filter(emp => !workSessionData?.some(session => session.employee_id === emp.id)) || [];

                if (absentEmployees.length === 0) {
                  return (
                    <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-xl">
                      <p className="text-sm">All employees have logged in for this date</p>
                    </div>
                  );
                }

                // Sort by department and role
                const sortedAbsent = [...absentEmployees].sort((a, b) => {
                  const deptA = availableDepartments?.find((d: any) => d.id === a.department_id)?.name || '';
                  const deptB = availableDepartments?.find((d: any) => d.id === b.department_id)?.name || '';
                  if (deptA !== deptB) return deptA.localeCompare(deptB);
                  return (a.roles?.role_name || '').localeCompare(b.roles?.role_name || '');
                });

                return (
                  <div className="overflow-x-auto rounded-xl border border-red-100">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-red-50/50 border-b border-red-100">
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Employee</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Employee Code</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Department</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-700">Role</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedAbsent.map((emp) => (
                          <tr key={emp.id} className="border-b border-red-50 hover:bg-red-50/30 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <EmployeeAvatarWithPreview
                                  name={emp.name}
                                  imageUrl={emp.profile_photo_url}
                                  letters={2}
                                  bgClassName="bg-gradient-to-br from-red-400 to-rose-400"
                                  className="h-8 w-8 rounded-full"
                                  textClassName="text-xs font-semibold"
                                />
                                <p className="font-medium text-sm text-gray-900">{emp.name}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="text-sm text-gray-600">{emp.employee_code || '-'}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                  {availableDepartments?.find((d: any) => d.id === emp.department_id)?.name || '-'}
                                </span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600">{emp.roles?.role_name || '-'}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                                Not Logged In
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
