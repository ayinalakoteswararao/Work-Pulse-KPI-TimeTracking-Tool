import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import workPulseLogo from "@/assets/WorkPulse.png";

export default function PublicNavbar() {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <img
            src={workPulseLogo}
            alt="WorkPulse"
            className="h-12 w-12 rounded-lg object-cover dark:brightness-0 dark:invert"
          />
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">How it Works</a>
          <a href="#metrics" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Metrics</a>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          {user ? (
            <Link to="/dashboard">
              <Button size="sm" className="bg-black text-white hover:bg-gray-800">Go to Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  Sign in
                </Button>
              </Link>
              <Link to="/login?signup=true">
                <Button size="sm" className="bg-black text-white hover:bg-gray-800">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
