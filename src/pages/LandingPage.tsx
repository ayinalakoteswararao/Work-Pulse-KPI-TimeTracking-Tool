import { Link } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Users,
  ClipboardList,
  Layers,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  Clock,
  Sparkles,
  Target,
  Award,
  ArrowUpRight,
  Play,
  Star,
  Heart,
  RefreshCw,
  Radio,
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  Search,
  Menu,
  X,
  PieChart,
  Calendar,
  Briefcase,
  UserCircle,
  Timer,
  TrendingUp as Trending,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import workPulseLogo from "@/assets/WorkPulse.png";
import { PrivacyPolicyDialog, TermsOfServiceDialog, CookiePolicyDialog, GDPRDialog } from "@/components/PolicyDialogs";

const features = [
  {
    icon: Radio,
    title: "Real-Time Monitoring",
    description: "Live activity tracking with instant updates as employees log work sessions and tasks.",
    gradient: "from-red-500 to-orange-500",
    live: true,
  },
  {
    icon: Layers,
    title: "Organization Structure",
    description: "Define companies, departments, and roles with a clear hierarchy that maps to your real org chart.",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    icon: ClipboardList,
    title: "Task & Function Tracking",
    description: "Assign specific functions to roles with measurable targets. Employees only see tasks relevant to their position.",
    gradient: "from-violet-500 to-fuchsia-400",
  },
  {
    icon: BarChart3,
    title: "Live Analytics",
    description: "Real-time dashboards that update as employees log tasks. Monitor department and individual performance instantly.",
    gradient: "from-emerald-500 to-teal-400",
    live: true,
  },
  {
    icon: Timer,
    title: "Timesheet Management",
    description: "Track work hours, breaks, and attendance with automated calculations and reporting.",
    gradient: "from-amber-500 to-orange-400",
  },
  {
    icon: Target,
    title: "KPI Dashboard",
    description: "Automatic calculation of weekly performance using completion vs target ratios. Identify top performers.",
    gradient: "from-pink-500 to-rose-400",
  },
];

const steps = [
  {
    num: "01",
    title: "Set Up Your Org",
    description: "Create your company structure — departments, roles, and assigned functions with daily or weekly targets.",
    color: "bg-blue-500",
  },
  {
    num: "02",
    title: "Add Your Team",
    description: "Onboard employees and assign them to roles. They'll automatically inherit the right task functions.",
    color: "bg-violet-500",
  },
  {
    num: "03",
    title: "Track in Real-Time",
    description: "Employees log daily tasks. Performance is calculated and visualized in real-time with live updates.",
    color: "bg-emerald-500",
  },
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "HR Director",
    company: "TechCorp Inc.",
    content: "WorkPulse transformed how we track team performance. The real-time dashboards make it so easy to identify bottlenecks.",
    avatar: "SC",
  },
  {
    name: "Michael Ross",
    role: "Operations Manager",
    company: "Global Solutions",
    content: "Finally, a tool that understands our multi-level org structure. The live tracking is a game changer.",
    avatar: "MR",
  },
  {
    name: "Emily Watson",
    role: "Team Lead",
    company: "Innovate Labs",
    content: "Our team loves the real-time feedback. Productivity increased 40% in just two months with live KPI tracking!",
    avatar: "EW",
  },
];

// Real-time activity data for demo
const liveActivities = [
  { user: "John D.", action: "completed task", target: "Sales Report", time: "2 min ago" },
  { user: "Sarah M.", action: "started session", target: "Development", time: "5 min ago" },
  { user: "Mike R.", action: "updated KPI", target: "Marketing", time: "8 min ago" },
  { user: "Lisa K.", action: "submitted timesheet", target: "Support", time: "12 min ago" },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveStats, setLiveStats] = useState({
    activeUsers: 142,
    tasksCompleted: 12847,
    performance: 94.2,
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      // Simulate live stats updates
      setLiveStats(prev => ({
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 3) - 1,
        tasksCompleted: prev.tasksCompleted + Math.floor(Math.random() * 5),
        performance: Math.min(100, Math.max(85, prev.performance + (Math.random() * 2 - 1))),
      }));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={workPulseLogo}
              alt="WorkPulse"
              className="h-10 w-28 rounded-lg object-cover dark:brightness-0 dark:invert"
            />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <a href="#features" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
              <Sparkles className="h-4 w-4" />
              Features
            </a>
            <a href="#how-it-works" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
              <Layers className="h-4 w-4" />
              How it Works
            </a>
            <button 
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              <Radio className="h-4 w-4" />
              <span className="flex items-center gap-1.5">
                Live Demo
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/dashboard">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" className="border-2 border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 font-medium">
                    <UserCircle className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
                <Link to="/login?signup=true">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 font-medium">
                    <Zap className="h-4 w-4 mr-2" />
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section with Live Demo */}
      <section className="relative pt-24 pb-12 px-6 bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 border border-blue-200 mb-6">
                <Radio className="h-4 w-4 text-blue-600 animate-pulse" />
                <span className="text-sm font-medium text-blue-700">
                  Real-time workforce monitoring
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Track Performance{" "}
                <span className="text-blue-600">Live</span>
              </h1>

              <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-lg">
                Monitor your team's productivity in real-time. Get instant insights on tasks, timesheets, and KPIs with live dashboards.
              </p>

              <div className="flex items-center gap-4 flex-wrap">
                <Link to="/login?signup=true">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6 border border-blue-500 shadow-lg shadow-blue-500/30">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="h-12 px-6 border-2 border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 bg-white"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Play className="mr-2 h-5 w-5 text-blue-600" />
                  See Live Demo
                </Button>
              </div>

              <div className="flex items-center gap-6 mt-8 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>No credit card</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>Free 14-day trial</span>
                </div>
              </div>
            </div>

            {/* Right - Product Dashboard Preview */}
            <div id="demo" className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-violet-500 rounded-3xl opacity-20 blur-2xl" />

              <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                {/* App Header */}
                <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={workPulseLogo} alt="WorkPulse" className="h-6 w-16 rounded object-cover dark:brightness-0 dark:invert" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded-full">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] text-green-400 font-medium">LIVE</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Preview */}
                <div className="p-4 bg-slate-50">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-3 w-3 text-blue-500" />
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Active</p>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{liveStats.activeUsers}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <ClipboardList className="h-3 w-3 text-violet-500" />
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Tasks</p>
                      </div>
                      <p className="text-xl font-bold text-blue-600">{liveStats.tasksCompleted.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Performance</p>
                      </div>
                      <p className="text-xl font-bold text-emerald-600">{liveStats.performance.toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* Chart Preview */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                        Performance Overview
                      </h4>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded">This Week</span>
                    </div>
                    {/* Bar Chart with visible bars */}
                    <div className="flex items-end gap-3 h-28 px-2">
                      {[45, 65, 85, 55, 75, 90, 70].map((height, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <div
                            className={`w-full rounded-t-lg transition-all duration-700 hover:opacity-80 ${i === 5 ? 'bg-gradient-to-t from-blue-600 to-blue-400' : 'bg-gradient-to-t from-blue-400 to-blue-200'
                              }`}
                            style={{ height: `${height}%`, minHeight: '20px' }}
                          />
                          <span className="text-[10px] font-medium text-gray-500">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feature Tags */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {['Real-time', 'KPI Tracking', 'Timesheets', 'Analytics'].map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-4">
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Real-time workforce management
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to monitor, track, and improve team performance with live updates.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
              >
                {f.live && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-full">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-medium text-red-600 uppercase tracking-wider">Live</span>
                  </div>
                )}
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-4">
              How it Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Get started in minutes
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Simple setup process that gets you tracking performance in real-time quickly.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={step.num} className="relative group">
                <div className="bg-white rounded-2xl p-8 hover:shadow-xl transition-all duration-300 border border-gray-100">
                  <div className={`h-12 w-12 rounded-xl ${step.color} flex items-center justify-center mb-6 shadow-lg`}>
                    <span className="text-xl font-bold text-white">{step.num}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="h-6 w-6 text-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Stats Section */}
      <section className="py-16 px-6 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold mb-2 text-blue-400">500+</p>
              <p className="font-semibold">Companies</p>
              <p className="text-sm text-gray-400">Using WorkPulse daily</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2 text-emerald-400">50K+</p>
              <p className="font-semibold">Employees</p>
              <p className="text-sm text-gray-400">Tracked in real-time</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2 text-violet-400">1M+</p>
              <p className="font-semibold">Tasks</p>
              <p className="text-sm text-gray-400">Completed monthly</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2 text-amber-400">99.9%</p>
              <p className="font-semibold">Uptime</p>
              <p className="text-sm text-gray-400">Reliable tracking</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold mb-4">
              Testimonials
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Loved by teams worldwide
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">"{t.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}, {t.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-600 to-violet-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to track performance live?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            Join thousands of organizations using WorkPulse for real-time workforce monitoring.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/login?signup=true">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 h-14 px-8 text-lg font-semibold">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" className="bg-white/20 backdrop-blur-sm border-2 border-white text-white hover:bg-white hover:text-blue-600 h-14 px-8 text-lg font-semibold transition-all shadow-lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white">
        {/* Main Footer */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src={workPulseLogo} alt="WorkPulse" className="h-8 w-20 rounded object-cover dark:brightness-0 dark:invert" />
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Real-time workforce management platform. Track performance, manage timesheets, and boost productivity.
              </p>
              {/* Social Icons */}
              <div className="flex items-center gap-3 mt-4">
                <a href="#" className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-400" />
                Product
              </h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#demo" className="hover:text-white transition-colors">Live Demo</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-400" />
                Resources
              </h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" />
                Legal
              </h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <PrivacyPolicyDialog
                    trigger={<button className="hover:text-white transition-colors text-left">Privacy Policy</button>}
                  />
                </li>
                <li>
                  <TermsOfServiceDialog
                    trigger={<button className="hover:text-white transition-colors text-left">Terms of Service</button>}
                  />
                </li>
                <li>
                  <CookiePolicyDialog
                    trigger={<button className="hover:text-white transition-colors text-left">Cookie Policy</button>}
                  />
                </li>
                <li>
                  <GDPRDialog
                    trigger={<button className="hover:text-white transition-colors text-left">GDPR Compliance</button>}
                  />
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} WorkPulse. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                All systems operational
              </span>
              <span className="hidden md:inline">|</span>
              <a href="#" className="hover:text-white transition-colors">Cookie Settings</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
