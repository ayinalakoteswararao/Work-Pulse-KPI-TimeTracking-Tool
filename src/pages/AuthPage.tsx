import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Activity, ArrowLeft, Shield, User, CheckCircle2, BarChart3, Users, Clock,
  Zap, Target, TrendingUp, Radio, Layers, Sparkles, Mail, Lock, ArrowRight, Eye, EyeOff
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type LoginType = "admin" | "employee";

const floatingIcons = [
  { Icon: Zap, color: "text-yellow-400", delay: "0s", top: "15%", left: "10%" },
  { Icon: Target, color: "text-red-400", delay: "1s", top: "25%", right: "15%" },
  { Icon: TrendingUp, color: "text-green-400", delay: "2s", top: "45%", left: "8%" },
  { Icon: Radio, color: "text-purple-400", delay: "0.5s", top: "60%", right: "10%" },
  { Icon: Layers, color: "text-blue-400", delay: "1.5s", top: "75%", left: "15%" },
  { Icon: Sparkles, color: "text-pink-400", delay: "2.5s", top: "35%", right: "8%" },
  { Icon: BarChart3, color: "text-cyan-400", delay: "0.8s", top: "55%", left: "5%" },
  { Icon: Users, color: "text-orange-400", delay: "1.8s", top: "80%", right: "12%" },
];

export default function AuthPage() {
  const { signIn, signInAsEmployee, signInWithEmployeeId, signUp, user, userRole, loading, upgradeToAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(!searchParams.get("signup"));
  const [loginType, setLoginType] = useState<LoginType>("admin");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Debug login type changes
  useEffect(() => {
    // Login type tracking removed
  }, [loginType]);

  // Set cookies and redirect after login
  useEffect(() => {
    if (user && !loading && userRole.role !== null) {
      // Set session cookies
      document.cookie = `session_id=${user.id}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `user_id=${user.id}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `user_role=${userRole.role}; path=/; max-age=86400; SameSite=Lax`;

      // Only redirect after auth is loaded and role is determined
      if (userRole.role === "employee") {
        navigate("/timesheet");
      } else if (userRole.role === "admin") {
        navigate("/create-kpi");
      } else if (userRole.role === "manager") {
        navigate("/dashboard");
      }
    }
  }, [user, loading, userRole.role, navigate, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (isLogin) {
        // Login based on selected type
        if (loginType === "employee") {
          await signInWithEmployeeId(employeeId, password);
          toast.success("Signed in as Employee");
        } else {
          await signIn(email, password);
          toast.success("Signed in as Admin");
        }
        // Don't navigate here - let useEffect handle it after role is loaded
      } else {
        // Sign up - default to employee, can be changed to admin manually
        await signUp(email, password, loginType);
        toast.success(`Account created as ${loginType}! You can now sign in.`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpgradeToAdmin = async () => {
    try {
      await upgradeToAdmin();
      toast.success("Upgraded to Admin! You will be redirected to the dashboard.");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 via-purple-900 to-slate-900" />
        
        {/* Animated Mesh Gradient */}
        <div className="absolute inset-0 opacity-50">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.3)_0%,transparent_50%)]" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.3)_0%,transparent_50%)]" />
          <div className="absolute top-1/2 left-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(236,72,153,0.2)_0%,transparent_50%)]" />
        </div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        {/* Floating Icons with Glass Effect - REMOVED */}
        {/* Content sections added below instead */}

        {/* Glowing Orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-20 w-40 h-40 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-60 right-20 w-32 h-32 bg-purple-500/30 rounded-full blur-2xl animate-pulse delay-1000" />
          <div className="absolute bottom-40 left-40 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-2000" />
          <div className="absolute bottom-20 right-40 w-36 h-36 bg-indigo-500/30 rounded-full blur-2xl animate-pulse delay-3000" />
        </div>

        {/* Cursor Animation at Edge */}
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
          <div className="relative">
            <div className="w-1 h-20 bg-gradient-to-b from-blue-400 via-purple-400 to-pink-400 rounded-full animate-pulse" />
            <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 bg-white rounded-full animate-ping opacity-75" />
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          {/* Logo with glow */}
          <div className="mb-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-all duration-300 shadow-lg shadow-blue-500/30">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight">WorkPulse</span>
            </Link>
          </div>

          {/* Main Headline */}
          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-4 leading-tight">
              Welcome Back to
              <br />
              <span className="text-blue-400">WorkPulse</span>
            </h1>
            <p className="text-gray-300 text-lg mb-6 leading-relaxed">
              Your all-in-one workforce management platform. Track performance, manage teams, and boost productivity.
            </p>

            {/* Stats Section */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">500+</p>
                <p className="text-xs text-gray-400">Companies</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">50K+</p>
                <p className="text-xs text-gray-400">Users</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">99.9%</p>
                <p className="text-xs text-gray-400">Uptime</p>
              </div>
            </div>
            
            {/* Feature List with Icons */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 group cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-all">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-all">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <span className="text-white font-medium block">Real-time Analytics</span>
                  <span className="text-gray-400 text-sm">Live dashboards & insights</span>
                </div>
              </div>
              <div className="flex items-center gap-3 group cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-all">
                <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-all">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <span className="text-white font-medium block">Team Management</span>
                  <span className="text-gray-400 text-sm">Track performance & KPIs</span>
                </div>
              </div>
              <div className="flex items-center gap-3 group cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-all">
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-all">
                  <Clock className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <span className="text-white font-medium block">Timesheet Tracking</span>
                  <span className="text-gray-400 text-sm">Automated work hours</span>
                </div>
              </div>
              <div className="flex items-center gap-3 group cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-all">
                <div className="h-10 w-10 rounded-lg bg-pink-500/20 flex items-center justify-center group-hover:bg-pink-500/30 transition-all">
                  <CheckCircle2 className="h-5 w-5 text-pink-400" />
                </div>
                <div>
                  <span className="text-white font-medium block">Task Monitoring</span>
                  <span className="text-gray-400 text-sm">Complete visibility</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center bg-gradient-to-br from-gray-50 to-white relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#000000_1px,transparent_0)] bg-[size:20px_20px]" />
        </div>
        <div className="w-full max-w-md mx-auto px-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">WorkPulse</span>
          </div>

          {/* Form Card with enhanced shadow */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100/80 p-8 relative overflow-hidden">
            {/* Decorative gradient line at top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {isLogin ? "Sign in" : "Create account"}
              </h2>
              <p className="text-gray-600">
                {isLogin
                  ? "Enter your credentials to access your account"
                  : "Fill in your information to get started"
                }
              </p>
            </div>

            {/* Login Type Selector */}
            <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => setLoginType("admin")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200",
                  loginType === "admin"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Shield className="h-4 w-4" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => setLoginType("employee")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200",
                  loginType === "employee"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <User className="h-4 w-4" />
                Employee
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {loginType === "employee" ? "Employee ID" : "Email address"}
                </label>
                <Input 
                  key={`${loginType === "employee" ? "employee-id" : "email"}-${loginType}`}
                  type={loginType === "employee" ? "text" : "email"}
                  placeholder={
                    loginType === "employee" 
                      ? "e.g. KTL-KR-002" 
                      : "admin@company.com"
                  } 
                  value={loginType === "employee" ? employeeId : email} 
                  onChange={(e) => {
                    if (loginType === "employee") {
                      setEmployeeId(e.target.value);
                    } else {
                      setEmail(e.target.value);
                    }
                  }}
                  required 
                  className="h-11 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                />
                {loginType === "employee" && (
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your employee ID (e.g., KTL-KR-002)
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    minLength={6}
                    className="h-11 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500/20" />
                  Remember me
                </label>
                {isLogin && (
                  <Link
                    to="/forgot-password"
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>

              <Button 
                type="submit" 
                className={cn(
                  "w-full h-11 text-base font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02]",
                  loginType === "admin" 
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25"
                    : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/25"
                )} 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Social Login */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm font-medium text-gray-700">Google</span>
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="text-sm font-medium text-gray-700">GitHub</span>
              </button>
            </div>

            {/* Toggle */}
            <div className="mt-6 text-center space-y-4">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors block w-full"
              >
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <span className={cn(
                  "font-medium hover:underline",
                  loginType === "admin" ? "text-blue-600" : "text-emerald-600"
                )}>
                  {isLogin ? "Sign up" : "Sign in"}
                </span>
              </button>
              
              {/* Sales Demo Access Link */}
              <div className="pt-2 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={async () => {
                    const accessCode = window.prompt("Enter Sales Demo Access Code:");
                    if (accessCode !== "salesdemo") {
                      if (accessCode !== null) {
                        toast.error("Invalid access code");
                      }
                      return;
                    }

                    setIsSubmitting(true);
                    const demoEmail = loginType === "employee" ? "demo_employee@workpulse.com" : "demo_admin@workpulse.com";
                    const demoRole = loginType === "employee" ? "employee" : "admin";
                    const demoLabel = loginType === "employee" ? "Employee" : "Admin";

                    try {
                      // Try to login first
                      await signIn(demoEmail, "SalesDemo123!");
                      toast.success(`Signed in to ${demoLabel} Demo`);
                    } catch (err: any) {
                      // If login fails, try to create the account automatically
                      try {
                        await signUp(demoEmail, "SalesDemo123!", demoRole);
                        // Wait a moment for auth to settle
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await signIn(demoEmail, "SalesDemo123!");
                        toast.success(`${demoLabel} Demo Account created and signed in!`);
                      } catch (signupErr: any) {
                        toast.error(`Failed to set up ${demoLabel.toLowerCase()} demo account.`);
                        console.error("Demo setup error:", signupErr);
                      }
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="text-sm text-gray-500 hover:text-indigo-600 font-medium transition-colors flex items-center justify-center gap-1.5 w-full"
                  disabled={isSubmitting}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Sign in as {loginType === "employee" ? "Employee" : "Admin"} Demo
                </button>
              </div>
            </div>
          </div>

          {/* Upgrade to Admin Button */}
          {user && userRole.role === "employee" && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="text-center">
                <p className="text-sm text-amber-800 mb-3">
                  You are logged in as an employee but trying to access admin features.
                </p>
                <Button
                  onClick={handleUpgradeToAdmin}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/25"
                  size="sm"
                >
                  Upgrade to Admin
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
