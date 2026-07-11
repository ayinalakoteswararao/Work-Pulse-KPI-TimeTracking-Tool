import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Activity, ArrowLeft, Lock, Eye, EyeOff, CheckCircle2, AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function ResetPasswordPage() {
  const { updateEmployeePassword } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Supabase password reset tokens are handled automatically
    // We just need to check if the user is in the password reset flow
    const initializePasswordReset = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        
        // Check if we have a valid session from the reset link
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          setError("Invalid or expired reset link. Please request a new password reset.");
          setIsLoading(false);
          return;
        }
        
        setIsValidToken(true);
        setIsLoading(false);
      } catch (err) {
        setError("Invalid or expired reset link. Please request a new password reset.");
        setIsLoading(false);
      }
    };

    initializePasswordReset();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Update the user's password in Supabase
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        throw error;
      }
      
      // If user is logged in as employee, also update employee password
      try {
        await updateEmployeePassword(password);
      } catch (err) {
        console.log("Employee password update failed (user might not be an employee):", err);
      }
      
      toast.success("Password reset successfully! You can now sign in with your new password.");
      
      // Redirect to login page after successful reset
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
      
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <div className="flex-1 flex flex-col justify-center items-center px-4">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Link to="/auth">
                <Button className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Glowing Orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-20 w-40 h-40 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-60 right-20 w-32 h-32 bg-purple-500/30 rounded-full blur-2xl animate-pulse delay-1000" />
          <div className="absolute bottom-40 left-40 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-2000" />
        </div>

        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          {/* Logo */}
          <div className="mb-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-all duration-300 shadow-lg shadow-blue-500/30">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight">WorkPulse</span>
            </Link>
          </div>

          {/* Main Content */}
          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-4 leading-tight">
              Reset Your
              <br />
              <span className="text-blue-400">Password</span>
            </h1>
            <p className="text-gray-300 text-lg mb-6 leading-relaxed">
              Create a strong new password to secure your account. Choose something memorable but unique.
            </p>

            {/* Password Tips */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <span className="text-sm text-gray-300">At least 6 characters long</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <span className="text-sm text-gray-300">Mix of letters and numbers</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <span className="text-sm text-gray-300">Avoid common patterns</span>
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

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100/80 p-8 relative overflow-hidden">
            {/* Decorative gradient line at top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Set New Password
              </h2>
              <p className="text-gray-600">
                Enter your new password below
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    minLength={6}
                    className="h-11 pr-12 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Input 
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                    minLength={6}
                    className="h-11 pr-12 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Password strength:</div>
                  <div className="flex gap-1">
                    <div className={cn(
                      "h-2 flex-1 rounded-full transition-colors",
                      password.length >= 6 ? "bg-green-500" : "bg-gray-200"
                    )} />
                    <div className={cn(
                      "h-2 flex-1 rounded-full transition-colors",
                      password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? "bg-green-500" : "bg-gray-200"
                    )} />
                    <div className={cn(
                      "h-2 flex-1 rounded-full transition-colors",
                      password.length >= 12 && /[^A-Za-z0-9]/.test(password) ? "bg-green-500" : "bg-gray-200"
                    )} />
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25"
                disabled={isSubmitting || !password || !confirmPassword || password !== confirmPassword}
              >
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </Button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <Link to="/auth" className="text-sm text-gray-600 hover:text-gray-900 transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
