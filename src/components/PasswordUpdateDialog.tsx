import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Lock, Key, CheckCircle, AlertCircle } from "lucide-react";

export default function PasswordUpdateDialog() {
  const { updateEmployeePassword, checkFirstLogin, user, isEmployee } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  // Check for first login status
  useEffect(() => {
    const checkLoginStatus = async () => {
      if (user && isEmployee()) {
        // Add a small delay to ensure user role is properly set after login
        setTimeout(async () => {
          const firstLogin = await checkFirstLogin();
          setIsFirstLogin(firstLogin);
          setIsOpen(firstLogin);
        }, 500);
      }
    };
    checkLoginStatus();
  }, [user, isEmployee, checkFirstLogin]);

  // Prevent closing dialog with Escape key for first login
  useEffect(() => {
    if (!isOpen || !isFirstLogin) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isFirstLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validation
      if (newPassword.length < 6) {
        toast.error("Password must be at least 6 characters long");
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error("New password and confirmation do not match");
        return;
      }

      if (isFirstLogin && currentPassword !== "12345678") {
        toast.error("Current password is incorrect");
        return;
      }

      await updateEmployeePassword(newPassword);
      toast.success("Password updated successfully!");
      setIsOpen(false);
      setIsFirstLogin(false);
      
      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Prevent closing dialog on backdrop click for first login
    if (isFirstLogin) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={handleBackdropClick}>
      <Card className="w-full max-w-[380px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="text-center pb-3 pt-5 px-5">
          <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-3 ${isFirstLogin ? "bg-orange-100" : "bg-blue-100"}`}>
            {isFirstLogin ? (
              <AlertCircle className="h-5 w-5 text-orange-600" />
            ) : (
              <Key className="h-5 w-5 text-blue-600" />
            )}
          </div>
          <CardTitle className="text-lg font-bold text-gray-900">
            {isFirstLogin ? "First Login - Set Password" : "Update Password"}
          </CardTitle>
          <CardDescription className="text-xs">
            {isFirstLogin 
              ? "For security, please set a new password to continue"
              : "Update your account password"
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-0 pb-5 px-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            {isFirstLogin && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-9 h-9 text-sm"
                    required
                  />
                </div>
                <p className="text-[10px] text-gray-500">
                  Default: 12345678
                </p>
              </div>
            )}
            
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-9 h-9 text-sm"
                  required
                  minLength={6}
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="relative">
                <CheckCircle className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9 h-9 text-sm"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-md p-2">
              <p className="text-[10px] text-orange-700 leading-tight">
                <span className="font-medium">🔔 Login Notification:</span> A login notification has been sent to your email.
              </p>
            </div>

            {isFirstLogin && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                <h4 className="text-xs font-medium text-blue-900 mb-1">Requirements:</h4>
                <ul className="text-[10px] text-blue-700 space-y-0.5">
                  <li>• At least 6 characters</li>
                  <li>• Different from default password</li>
                  <li>• Secure and memorable</li>
                </ul>
              </div>
            )}
            
            <Button 
              type="submit" 
              className={`w-full text-white h-9 text-sm ${isFirstLogin ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-600 hover:bg-blue-700"}`}
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : (isFirstLogin ? "Set Password & Continue" : "Update Password")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
