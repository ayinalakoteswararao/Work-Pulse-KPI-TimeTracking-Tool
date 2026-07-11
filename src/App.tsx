import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useIOSFixes } from "@/hooks/useIOSFixes";
import AppLayout from "@/components/layout/AppLayout";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import Dashboard from "@/pages/Dashboard";
import CompaniesPage from "@/pages/CompaniesPage";
import DepartmentsPage from "@/pages/DepartmentsPage";
import RolesPage from "@/pages/RolesPage";
import FunctionsPage from "@/pages/FunctionsPage";
import EmployeesPage from "@/pages/EmployeesPage";
import HolidaysPage from "@/pages/HolidaysPage";
import AttendanceAdjustmentsPage from "@/pages/AttendanceAdjustmentsPage";
import KPIDashboardPage from "@/pages/KPIDashboardPage";
import KPIManagementPage from "@/pages/KPIManagementPage";
import TimesheetPage from "@/pages/TimesheetPage";
import TimesheetManagementPage from "@/pages/TimesheetManagementPage";
import WorkloadReportPage from "@/pages/WorkloadReportPage";
import NotFound from "@/pages/NotFound";
import CreateKPIPage from "@/pages/CreateKPIPage";
import PasswordUpdateDialog from "@/components/PasswordUpdateDialog";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <AppLayout>{children}</AppLayout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  
  // Employees cannot access admin routes
  if (userRole.role === "employee") {
    return <Navigate to="/timesheet-management" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function EmployeeRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, userRole } = useAuth();

  // Redirect authenticated users based on role
  const getDefaultRedirect = () => {
    if (!user) return "/";
    return userRole.role === "employee" ? "/timesheet-management" : "/dashboard";
  };

  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/" element={user ? <Navigate to={getDefaultRedirect()} replace /> : <LandingPage />} />
        <Route path="/login" element={user ? <Navigate to={getDefaultRedirect()} replace /> : <AuthPage />} />
        <Route path="/auth" element={user ? <Navigate to={getDefaultRedirect()} replace /> : <AuthPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Employee Routes (also accessible by admins) */}
        <Route path="/dashboard" element={<EmployeeRoute><Dashboard /></EmployeeRoute>} />
        <Route path="/kpi-dashboard" element={<EmployeeRoute><KPIDashboardPage /></EmployeeRoute>} />
            <Route path="/timesheet" element={<EmployeeRoute><TimesheetPage /></EmployeeRoute>} />
        <Route path="/timesheet-management" element={<EmployeeRoute><TimesheetManagementPage /></EmployeeRoute>} />
        <Route path="/workload-report" element={<EmployeeRoute><WorkloadReportPage /></EmployeeRoute>} />
        
        {/* Admin Routes - only accessible by admins */}
        <Route path="/companies" element={<AdminRoute><CompaniesPage /></AdminRoute>} />
        <Route path="/departments" element={<AdminRoute><DepartmentsPage /></AdminRoute>} />
        <Route path="/roles" element={<AdminRoute><RolesPage /></AdminRoute>} />
        <Route path="/functions" element={<AdminRoute><FunctionsPage /></AdminRoute>} />
        <Route path="/create-kpi" element={<AdminRoute><CreateKPIPage /></AdminRoute>} />
        <Route path="/kpi-management" element={<AdminRoute><KPIManagementPage /></AdminRoute>} />
        <Route path="/employees" element={<AdminRoute><EmployeesPage /></AdminRoute>} />
        <Route path="/holidays" element={<AdminRoute><HolidaysPage /></AdminRoute>} />
        <Route path="/attendance-adjustments" element={<AdminRoute><AttendanceAdjustmentsPage /></AdminRoute>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
      <PasswordUpdateDialog />
    </>
  );
}

const IOSWrapper = ({ children }: { children: React.ReactNode }) => {
  useIOSFixes();
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <IOSWrapper>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </IOSWrapper>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
