import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Activity, ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle, User, Mail, Lock
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type Step = "verify" | "reset" | "success";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("verify");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifiedEmployeeId, setVerifiedEmployeeId] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Look up employee by ID and email
      const { data: employee, error } = await supabase
        .from("employees")
        .select("id, email, employee_code, first_login")
        .eq("employee_code", employeeId.trim().toUpperCase())
        .eq("email", email.trim().toLowerCase())
        .single();

      if (error || !employee) {
        toast.error("Employee ID and email do not match our records");
        setIsSubmitting(false);
        return;
      }

      setVerifiedEmployeeId(employee.id);
      setStep("reset");
      toast.success("Identity verified! Please set your new password");
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
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
      const { supabase } = await import("@/integrations/supabase/client");

      // Update the user's password in Supabase Auth
      // Note: This requires admin privileges or the user to be logged in
      // For this flow, we'll use a stored procedure or admin override
      
      // Update employee password using stored procedure
      const { data: updateResult, error: empError } = await supabase
        .rpc('update_employee_password' as any, {
          employee_id_input: verifiedEmployeeId,
          new_password: password
        });

      if (empError || !updateResult) {
        throw empError || new Error("Failed to update password");
      }

      setStep("success");
      toast.success("Password reset successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderVerifyStep = () => (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Forgot Password?
        </h2>
        <p className="text-gray-600">
          Enter your Employee ID and email to verify your identity
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee ID
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input 
              type="text"
              placeholder="e.g. KTL-KR-002"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              className="h-11 pl-10 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input 
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 pl-10 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full h-11 text-base font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Verifying..." : "Verify Identity"}
        </Button>
      </form>
    </>
  );

  const renderResetStep = () => (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Set New Password
        </h2>
        <p className="text-gray-600">
          Create a strong password for your account
        </p>
      </div>

      <form onSubmit={handleReset} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input 
              type={showPassword ? "text" : "password"}
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 pl-10 pr-12 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input 
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 pl-10 pr-12 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
    </>
  );

  const renderSuccessStep = () => (
    <div className="text-center py-8">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Password Reset Successful!
      </h2>
      <p className="text-gray-600 mb-6">
        Your password has been updated. You can now sign in with your new password.
      </p>
      <Link to="/auth">
        <Button className="w-full">
          Back to Sign In
        </Button>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 via-purple-900 to-slate-900" />
        
        <div className="absolute inset-0 opacity-50">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.3)_0%,transparent_50%)]" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.3)_0%,transparent_50%)]" />
        </div>

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-20 w-40 h-40 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-60 right-20 w-32 h-32 bg-purple-500/30 rounded-full blur-2xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="mb-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-all duration-300 shadow-lg shadow-blue-500/30">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight">WorkPulse</span>
            </Link>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-4 leading-tight">
              Reset Your
              <br />
              <span className="text-blue-400">Password</span>
            </h1>
            <p className="text-gray-300 text-lg mb-6 leading-relaxed">
              Securely reset your password by verifying your identity with your Employee ID and email.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <span className="text-sm text-gray-300">Verify with Employee ID</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <span className="text-sm text-gray-300">Confirm email address</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <span className="text-sm text-gray-300">Set new password instantly</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center bg-gradient-to-br from-gray-50 to-white relative">
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
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            
            {step === "verify" && renderVerifyStep()}
            {step === "reset" && renderResetStep()}
            {step === "success" && renderSuccessStep()}

            {/* Back to Login */}
            {step !== "success" && (
              <div className="mt-6 text-center">
                <Link to="/auth" className="text-sm text-gray-600 hover:text-gray-900 transition-colors inline-flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
