import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Phone, 
  Building2, 
  Layers, 
  Hash, 
  Calendar,
  Users,
  Briefcase,
  X,
  MapPin,
  Clock,
  Activity,
  CalendarRange,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department_id: string;
  role_id: string;
  join_date?: string | null;
  gender?: string | null;
  created_at: string;
  departments?: {
    name: string;
    companies?: {
      name: string;
    };
  };
  roles?: {
    role_name: string;
  };
}

interface EmployeeDetailsModalProps {
  employee: Employee & { departments?: { name: string; companies?: { name: string } }; roles?: { role_name: string } };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EmployeeDetailsModal({ employee, open, onOpenChange }: EmployeeDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');

  const getJoinedDate = () => {
    const dateToUse = employee.join_date ? new Date(employee.join_date) : new Date(employee.created_at);
    return dateToUse.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysSinceJoined = () => {
    const joinedDate = employee.join_date ? new Date(employee.join_date) : new Date(employee.created_at);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - joinedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const { data: activityData, isLoading: isActivityLoading } = useQuery({
    queryKey: ['employee_activity', employee.id],
    queryFn: async () => {
      const { data: sessions, error } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('employee_id', employee.id);

      if (error) throw error;

      if (!sessions || sessions.length === 0) {
        return { totalHours: 0, lateLogins: 0, daysWorked: 0, avgHours: 0 };
      }

      const daysWorked = sessions.length;
      const totalHours = sessions.reduce((sum, s) => sum + (Number(s.total_hours) || 0), 0);
      const lateLogins = sessions.filter(s => s.late_login).length;
      const avgHours = totalHours / daysWorked;

      return { totalHours, lateLogins, daysWorked, avgHours };
    },
    enabled: activeTab === 'activity' && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 rounded-2xl gap-0 overflow-hidden border-0 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center pt-8 pb-5 px-6 border-b border-slate-100 bg-white relative">
          {/* Cover Photo Banner */}
          <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-r from-violet-200 via-fuchsia-200 to-blue-200 opacity-60"></div>
          
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20 mb-3 relative z-10 border-4 border-white">
            <Users className="h-7 w-7 text-white" />
          </div>
          
          <DialogTitle className="text-xl font-bold text-slate-900 mb-2 text-center">
            {employee.name}
          </DialogTitle>
          
          <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
            <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs">
              {employee.roles?.role_name || "Employee"}
            </Badge>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
              Active
            </Badge>
          </div>

          <div className="flex items-center text-xs text-slate-500 mb-4 gap-2">
            <Calendar className="h-3.5 w-3.5" />
            <span>Joined {getJoinedDate()}</span>
            <span className="text-slate-300">•</span>
            <span>{getDaysSinceJoined()} days in company</span>
          </div>

          <div className="flex items-center justify-center gap-3 w-full max-w-xs mx-auto">
            <Button 
              size="sm" 
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 shadow-sm"
              onClick={() => window.location.href = `mailto:${employee.email}`}
            >
              <Mail className="h-3.5 w-3.5 mr-2" />
              Email
            </Button>
            {employee.phone && (
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm"
                onClick={() => window.location.href = `tel:${employee.phone}`}
              >
                <Phone className="h-3.5 w-3.5 mr-2" />
                Call
              </Button>
            )}
          </div>
        </div>


        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              "flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-b-2",
              activeTab === 'details'
                ? "text-violet-600 border-violet-500 bg-violet-50"
                : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="h-4 w-4" />
              Employee Details
            </div>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={cn(
              "flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-b-2",
              activeTab === 'activity'
                ? "text-violet-600 border-violet-500 bg-violet-50"
                : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              Activity
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 bg-slate-50/50">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Personal Information Card */}
                <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2 border-b border-blue-100/50 pb-2">
                    <div className="h-6 w-6 rounded-md bg-blue-100 flex items-center justify-center">
                      <Users className="h-3 w-3 text-blue-700" />
                    </div>
                    Personal Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-8 w-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-medium text-blue-500/70 uppercase tracking-wider mb-0.5">Email Address</p>
                        <p className="font-medium text-slate-800 truncate" title={employee.email}>{employee.email}</p>
                      </div>
                    </div>
                    {employee.phone && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-8 w-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                          <Phone className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-medium text-blue-500/70 uppercase tracking-wider mb-0.5">Phone Number</p>
                          <p className="font-medium text-slate-800 truncate">{employee.phone}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-8 w-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                        <Hash className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-medium text-blue-500/70 uppercase tracking-wider mb-0.5">Employee ID</p>
                        <p className="font-medium text-slate-800 font-mono text-sm">{employee.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    {employee.gender && employee.gender !== 'unspecified' && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-8 w-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-medium text-blue-500/70 uppercase tracking-wider mb-0.5">Gender</p>
                          <p className="font-medium text-slate-800 capitalize">{employee.gender}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Organizational Information Card */}
                <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2 border-b border-purple-100/50 pb-2">
                    <div className="h-6 w-6 rounded-md bg-purple-100 flex items-center justify-center">
                      <Building2 className="h-3 w-3 text-purple-700" />
                    </div>
                    Organization
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-8 w-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-medium text-purple-500/70 uppercase tracking-wider mb-0.5">Company</p>
                        <p className="font-medium text-slate-800 truncate">{employee.departments?.companies?.name || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-8 w-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center shrink-0">
                        <Layers className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-medium text-purple-500/70 uppercase tracking-wider mb-0.5">Department</p>
                        <p className="font-medium text-slate-800 truncate">{employee.departments?.name || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-8 w-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center shrink-0">
                        <Briefcase className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-medium text-purple-500/70 uppercase tracking-wider mb-0.5">Role</p>
                        <p className="font-medium text-slate-800 truncate">{employee.roles?.role_name || "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="p-2 md:p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-indigo-50 flex items-center justify-center">
                  <Activity className="h-3 w-3 text-indigo-600" />
                </div>
                Performance & Activity Overview
              </h3>
              
              {isActivityLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-6 w-6 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p className="text-xs text-slate-500">Loading activity data...</p>
                </div>
              ) : activityData?.daysWorked === 0 ? (
                <div className="text-center py-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                    <Activity className="h-6 w-6 text-slate-300" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">No Activity Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">There are no work sessions recorded for this employee yet. Data will appear once they start working.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  {/* Total Hours */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Total Hours</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{activityData?.totalHours.toFixed(1)}<span className="text-sm font-medium text-slate-400 ml-1">h</span></p>
                  </div>
                  
                  {/* Days Worked */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
                        <CalendarRange className="h-4 w-4 text-emerald-600" />
                      </div>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Days Worked</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{activityData?.daysWorked}<span className="text-sm font-medium text-slate-400 ml-1">days</span></p>
                  </div>
                  
                  {/* Late Logins */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      </div>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Late Logins</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{activityData?.lateLogins}<span className="text-sm font-medium text-slate-400 ml-1">times</span></p>
                  </div>
                  
                  {/* Avg Hours/Day */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-full bg-violet-50 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-violet-600" />
                      </div>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Avg Hours</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{activityData?.avgHours.toFixed(1)}<span className="text-sm font-medium text-slate-400 ml-1">h/d</span></p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
