import { ReactNode, ChangeEvent, useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import workPulseLogo from "@/assets/WorkPulse.png";
import { toast } from "sonner";
import {
  Activity,
  Building2,
  Users,
  Briefcase,
  ListChecks,
  ClipboardList,
  BarChart3,
  LogOut,
  Bell,
  Search,
  ChevronDown,
  X,
  Clock,
  FileBarChart,
  Target,
  Calendar,
  Settings,
  Zap,
  Star,
  Rocket,
  Award,
  Sparkles,
  Globe,
  Upload,
  Trash2,
  Loader2,
  ArrowLeft,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const mainNav = [
  { to: "/dashboard", icon: BarChart3, label: "Dashboard", color: "from-violet-500 to-purple-500" },
  { to: "/kpi-dashboard", icon: Activity, label: "Performance", color: "from-indigo-500 to-blue-500" },
  { to: "/timesheet-management", icon: Clock, label: "Time Sheet", color: "from-cyan-500 to-blue-500" },
  { to: "/workload-report", icon: FileBarChart, label: "Work Load", color: "from-amber-500 to-orange-500" },
];

// Config dropdown items in logical order
const configNav = [
  { to: "/companies", icon: Building2, label: "Companies", color: "from-emerald-500 to-teal-500" },
  { to: "/departments", icon: Briefcase, label: "Departments", color: "from-pink-500 to-rose-500" },
  { to: "/roles", icon: ListChecks, label: "Roles", color: "from-blue-500 to-indigo-500" },
  { to: "/employees", icon: Users, label: "Employees", color: "from-violet-500 to-purple-500" },
  { to: "/holidays", icon: Calendar, label: "Holidays", color: "from-emerald-500 to-lime-500" },
  { to: "/attendance-adjustments", icon: ClipboardList, label: "Attendance", color: "from-indigo-500 to-violet-500" },
  { to: "/kpi-management", icon: Target, label: "KPI", color: "from-orange-500 to-red-500" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut, user, userRole, isAdmin, isManager, isEmployee } = useAuth();
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showSearch, setShowSearch] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState<any>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [showPhotoAdjust, setShowPhotoAdjust] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoBucket = "employee-profile-photos";

  const cropBoxSize = 280; // square crop UI size (px)
  const cropImgRef = useRef<HTMLImageElement | null>(null);
  const [photoAdjustSrc, setPhotoAdjustSrc] = useState<string | null>(null);
  const [photoAdjustFile, setPhotoAdjustFile] = useState<File | null>(null);
  const [photoNaturalSize, setPhotoNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dragStart = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);

  const getCropBaseScale = () => {
    if (!photoNaturalSize.width || !photoNaturalSize.height) return 1;
    // Ensure the image covers the crop box at zoom=1 (center-crop behavior).
    return Math.max(cropBoxSize / photoNaturalSize.width, cropBoxSize / photoNaturalSize.height);
  };

  const isActive = (path: string) => location.pathname === path;
  const previewParams = new URLSearchParams(location.search);
  const previewEmployeeId = previewParams.get("employee");
  const isManagingAsEmployee = (isAdmin() || isManager()) && !!previewEmployeeId;
  const previewQuery = (() => {
    if (!isManagingAsEmployee || !previewEmployeeId) return "";
    const p = new URLSearchParams();
    p.set("employee", previewEmployeeId);
    if (previewParams.get("readonly") === "1") p.set("readonly", "1");
    const passthrough = ["from", "previewDept", "previewRole", "previewCompany"] as const;
    for (const key of passthrough) {
      const v = previewParams.get(key);
      if (v) p.set(key, v);
    }
    return `?${p.toString()}`;
  })();

  const showEmployeePreviewBar = isManagingAsEmployee;
  const isPrivilegedUser = (isAdmin() || isManager()) && !isManagingAsEmployee;

  const { data: adminLeaveNotifications = [] } = useQuery({
    queryKey: ["leave-notifications-admin"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leave_requests")
        .select("id, leave_date, status, created_at, employees(name)")
        .eq("status", "pending")
        .eq("admin_seen", false)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        leave_date: string;
        status: string;
        created_at: string;
        employees?: { name?: string };
      }>;
    },
    enabled: isPrivilegedUser,
    refetchInterval: 30000,
  });

  const { data: employeeLeaveNotifications = [] } = useQuery({
    queryKey: ["leave-notifications-employee", userRole.employee_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leave_requests")
        .select("id, leave_date, status, reviewed_at")
        .eq("employee_id", userRole.employee_id)
        .in("status", ["approved", "rejected"])
        .eq("employee_seen", false)
        .order("reviewed_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        leave_date: string;
        status: "approved" | "rejected";
        reviewed_at?: string | null;
      }>;
    },
    enabled: !isManagingAsEmployee && isEmployee() && !!userRole.employee_id,
    refetchInterval: 30000,
  });

  const unreadNotifications = isPrivilegedUser
    ? adminLeaveNotifications
    : !isManagingAsEmployee && isEmployee()
      ? employeeLeaveNotifications
      : [];
  const unreadCount = unreadNotifications.length;

  const markNotificationsRead = useMutation({
    mutationFn: async () => {
      if (isPrivilegedUser) {
        const { error } = await (supabase as any)
          .from("leave_requests")
          .update({ admin_seen: true })
          .eq("status", "pending")
          .eq("admin_seen", false);
        if (error) throw error;
        return;
      }

      if (!isManagingAsEmployee && isEmployee() && userRole.employee_id) {
        const { error } = await (supabase as any)
          .from("leave_requests")
          .update({ employee_seen: true })
          .eq("employee_id", userRole.employee_id)
          .in("status", ["approved", "rejected"])
          .eq("employee_seen", false);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.setQueryData(["leave-notifications-admin"], []);
      qc.setQueryData(["leave-notifications-employee", userRole.employee_id], []);
      qc.invalidateQueries({ queryKey: ["leave-notifications-admin"] });
      qc.invalidateQueries({ queryKey: ["leave-notifications-employee"] });
      qc.invalidateQueries({ queryKey: ["leave-requests-pending-count"] });
      qc.invalidateQueries({ queryKey: ["leave-requests-pending"] });
      toast.success("Notifications cleared");
    },
  });

  const openNotification = async (notificationId: string, destinationPath: string) => {
    try {
      if (isPrivilegedUser) {
        const { error } = await (supabase as any)
          .from("leave_requests")
          .update({ admin_seen: true })
          .eq("id", notificationId);
        if (error) throw error;
      } else if (!isManagingAsEmployee && isEmployee() && userRole.employee_id) {
        const { error } = await (supabase as any)
          .from("leave_requests")
          .update({ employee_seen: true })
          .eq("id", notificationId)
          .eq("employee_id", userRole.employee_id)
          .in("status", ["approved", "rejected"]);
        if (error) throw error;
      }
    } catch (error) {
      console.error("Failed to open notification:", error);
    } finally {
      qc.invalidateQueries({ queryKey: ["leave-notifications-admin"] });
      qc.invalidateQueries({ queryKey: ["leave-notifications-employee"] });
      qc.invalidateQueries({ queryKey: ["leave-requests-pending-count"] });
      setNotificationsOpen(false);

      // Always navigate with a unique query so repeated clicks still trigger navigation.
      const jumpTo = `${destinationPath}?notif=${notificationId}&t=${Date.now()}`;
      navigate(jumpTo, { replace: false });
    }
  };

  // Filter navigation based on role - employees see limited nav
  const visibleNav = userRole.role === "employee" || isManagingAsEmployee
    ? [
      { to: "/dashboard", icon: BarChart3, label: "Dashboard", color: "from-violet-500 to-purple-500" },
      { to: "/kpi-dashboard", icon: Activity, label: "Performance", color: "from-indigo-500 to-blue-500" },
      { to: "/timesheet-management", icon: Clock, label: "Time Sheet", color: "from-cyan-500 to-blue-500" },
      { to: "/workload-report", icon: FileBarChart, label: "Work Load", color: "from-amber-500 to-orange-500" }
    ]
    : mainNav;

  // Filter navigation items based on search
  const filteredNav = searchQuery
    ? visibleNav.filter(
      (item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredNav.length > 0) {
      navigate(`${filteredNav[0].to}${previewQuery}`);
      setSearchQuery("");
      setShowSearch(false);
    }
    if (e.key === "Escape") {
      setShowSearch(false);
      setSearchQuery("");
    }
  };

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme: "light" | "dark" = saved === "dark" || saved === "light" ? (saved as "light" | "dark") : (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  useEffect(() => {
    const loadEmployeeProfile = async () => {
      if (!userRole.employee_id) {
        setEmployeeProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("employees")
        .select("id, name, email, phone, employee_code, profile_photo_url, departments(name, companies(name)), roles(role_name)")
        .eq("id", userRole.employee_id)
        .single();

      if (error) {
        console.error("Failed to load employee profile:", error);
        return;
      }

      setEmployeeProfile(data);
    };

    loadEmployeeProfile();
  }, [userRole.employee_id]);

  const getStoragePathFromPublicUrl = (publicUrl: string) => {
    const marker = `/storage/v1/object/public/${profilePhotoBucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(publicUrl.substring(idx + marker.length));
  };

  const updateEmployeePhotoUrl = async (photoUrl: string | null) => {
    if (!userRole.employee_id) {
      throw new Error("No employee profile linked to this account");
    }

    const { error } = await supabase
      .from("employees")
      .update({ profile_photo_url: photoUrl } as any)
      .eq("id", userRole.employee_id);

    if (error) throw error;
    setEmployeeProfile((prev: any) => ({ ...(prev || {}), profile_photo_url: photoUrl }));
  };

  const handlePhotoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const cropImageToSquareBlobFromRegion = async (
    imgEl: HTMLImageElement,
    regionX: number,
    regionY: number,
    regionSize: number,
    outputSize = 512
  ): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to create canvas context.");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      imgEl,
      regionX,
      regionY,
      regionSize,
      regionSize,
      0,
      0,
      outputSize,
      outputSize
    );

    const blob: Blob | null = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) return reject(new Error("Failed to create cropped image blob."));
          resolve(b);
        },
        "image/jpeg",
        0.9
      );
    });

    return blob;
  };

  const handlePhotoFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!userRole.employee_id) {
      toast.error("Your account is not linked to an employee profile.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be 5MB or less.");
      return;
    }

    // Open manual adjust/crop dialog before uploading.
    const objectUrl = URL.createObjectURL(file);
    setPhotoAdjustFile(file);
    setPhotoAdjustSrc(objectUrl);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setShowPhotoAdjust(true);

    try {
      const img = new Image();
      img.src = objectUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image for cropping."));
      });

      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height) throw new Error("Invalid image dimensions.");

      setPhotoNaturalSize({ width, height });

      const baseScale = Math.max(cropBoxSize / width, cropBoxSize / height);
      const scaledW = width * baseScale * 1;
      const scaledH = height * baseScale * 1;
      setCropOffset({
        x: (cropBoxSize - scaledW) / 2,
        y: (cropBoxSize - scaledH) / 2,
      });
    } catch (error: any) {
      console.error("Crop pre-load error:", error);
      toast.error(error.message || "Failed to prepare image crop.");
      URL.revokeObjectURL(objectUrl);
      setPhotoAdjustFile(null);
      setPhotoAdjustSrc(null);
      setShowPhotoAdjust(false);
    }
  };

  const closeCropDialog = () => {
    if (photoAdjustSrc) URL.revokeObjectURL(photoAdjustSrc);
    setShowPhotoAdjust(false);
    setPhotoAdjustFile(null);
    setPhotoAdjustSrc(null);
    setPhotoNaturalSize({ width: 0, height: 0 });
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setIsDraggingCrop(false);
    dragStart.current = null;
  };

  const confirmCropAndUpload = async () => {
    if (!photoAdjustFile) {
      toast.error("No image selected.");
      return;
    }
    if (!cropImgRef.current) {
      toast.error("Crop image not ready yet.");
      return;
    }
    if (!photoNaturalSize.width || !photoNaturalSize.height) {
      toast.error("Image size not ready yet.");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const { width: naturalW, height: naturalH } = photoNaturalSize;
      const baseScale = Math.max(cropBoxSize / naturalW, cropBoxSize / naturalH);
      const totalScale = baseScale * cropZoom;

      const regionSize = cropBoxSize / totalScale;
      let regionX = -cropOffset.x / totalScale;
      let regionY = -cropOffset.y / totalScale;

      // Clamp region within the original image.
      regionX = Math.max(0, Math.min(regionX, naturalW - regionSize));
      regionY = Math.max(0, Math.min(regionY, naturalH - regionSize));

      const croppedBlob = await cropImageToSquareBlobFromRegion(
        cropImgRef.current,
        regionX,
        regionY,
        regionSize,
        512
      );

      const fileExt = "jpg";
      const random = Math.random().toString(36).slice(2, 8);
      const filePath = `${userRole.employee_id}/${Date.now()}-${random}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(profilePhotoBucket)
        .upload(filePath, croppedBlob, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(profilePhotoBucket)
        .getPublicUrl(filePath);

      await updateEmployeePhotoUrl(publicUrlData.publicUrl);

      const previousPhotoPath = employeeProfile?.profile_photo_url
        ? getStoragePathFromPublicUrl(employeeProfile.profile_photo_url)
        : null;
      if (previousPhotoPath) {
        await supabase.storage.from(profilePhotoBucket).remove([previousPhotoPath]);
      }

      toast.success("Profile photo updated successfully.");
      closeCropDialog();
    } catch (error: any) {
      console.error("Error uploading cropped profile photo:", error);
      toast.error(error.message || "Failed to upload profile photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!userRole.employee_id) {
      toast.error("Your account is not linked to an employee profile.");
      return;
    }

    const existingPhotoUrl = employeeProfile?.profile_photo_url;
    if (!existingPhotoUrl) return;

    setIsUploadingPhoto(true);
    try {
      const storagePath = getStoragePathFromPublicUrl(existingPhotoUrl);
      await updateEmployeePhotoUrl(null);

      if (storagePath) {
        await supabase.storage.from(profilePhotoBucket).remove([storagePath]);
      }

      toast.success("Profile photo removed.");
    } catch (error: any) {
      console.error("Error removing profile photo:", error);
      toast.error(error.message || "Failed to remove profile photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const displayName = employeeProfile?.name || user?.email?.split("@")[0] || "User";
  const displayEmail = employeeProfile?.email || user?.email || "user@example.com";
  const displayAvatarText = displayName.charAt(0).toUpperCase();
  const profilePhotoUrl = employeeProfile?.profile_photo_url || null;
  const employeeCode = employeeProfile?.employee_code || "N/A";
  const employeePhone = employeeProfile?.phone || "N/A";
  const employeeDepartment = employeeProfile?.departments?.name || "N/A";
  const employeeCompany = employeeProfile?.departments?.companies?.name || "N/A";
  const employeeRole = employeeProfile?.roles?.role_name || (userRole.role === "admin" ? "Administrator" : userRole.role === "manager" ? "Manager" : "Employee");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* SolidRoad-inspired Navigation */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200/60 backdrop-blur-sm">
        {showEmployeePreviewBar && (
          <div className="border-b border-amber-200/80 bg-amber-50/90">
            <div className="max-w-8xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                  onClick={() => navigate("/employees?from=config")}
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back to Employees
                </Button>
                <p className="text-xs text-amber-900/80 truncate">
                  Viewing an employee profile — read-only. Use the button above to return to the Employees list.
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="h-16 max-w-8xl mx-auto px-6 flex items-center justify-between">
          {/* Left: Logo + Navigation */}
          <div className={`flex items-center gap-8 ${isEmployee() ? 'flex-1' : ''}`}>
            {/* Brand Logo */}
            <div className="flex items-center gap-3 shrink-0">
              <img
                src={workPulseLogo}
                alt="WorkPulse"
                className="h-14 w-40 rounded-lg object-cover dark:brightness-0 dark:invert"
              />
            </div>

            <nav className={`hidden lg:flex items-center gap-2 ${isEmployee() ? 'flex-1' : ''}`}>
              {visibleNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={`${item.to}${previewQuery}`}
                  end
                  className={cn(
                    "flex items-center gap-2.5 text-sm font-medium transition-all py-2.5 rounded-xl",
                    isActive(item.to)
                      ? "text-gray-900 bg-gray-100 px-4 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-4"
                  )}
                >
                  <div className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
                    isActive(item.to)
                      ? `bg-gradient-to-br ${item.color}`
                      : "bg-gray-100"
                  )}>
                    <item.icon className={cn(
                      "h-3.5 w-3.5",
                      isActive(item.to) ? "text-white" : "text-gray-500"
                    )} />
                  </div>
                  {item.label}
                </NavLink>
              ))}

              {/* Config Dropdown for Admin/Manager */}
              {!isManagingAsEmployee && (isAdmin() || isManager()) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-2.5 text-sm font-medium transition-all py-2.5 rounded-xl px-4",
                        configNav.some(item => isActive(item.to))
                          ? "text-gray-900 bg-gray-100 shadow-sm"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      )}
                    >
                      <div className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
                        configNav.some(item => isActive(item.to))
                          ? "bg-gradient-to-br from-gray-500 to-gray-600"
                          : "bg-gray-100"
                      )}>
                        <Settings className={cn(
                          "h-3.5 w-3.5",
                          configNav.some(item => isActive(item.to)) ? "text-white" : "text-gray-500"
                        )} />
                      </div>
                      <span>Config</span>
                      <ChevronDown className="h-3 w-3 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 border-gray-200 shadow-lg rounded-lg">
                    <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                      Configuration
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {configNav
                      .filter(item => isAdmin() || (isManager() && ['employees', 'holidays', 'attendance-adjustments', 'kpi-management'].includes(item.to.replace('/', ''))))
                      .map((item) => (
                        <DropdownMenuItem
                          key={item.to}
                          onClick={() => navigate(item.to === '/roles' ? '/roles?from=config' : item.to === '/departments' ? '/departments?from=config' : item.to === '/employees' ? '/employees?from=config' : item.to)}
                          className={cn(
                            "cursor-pointer flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
                            isActive(item.to) && "bg-gray-100 text-gray-900"
                          )}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center",
                            `bg-gradient-to-br ${item.color}`
                          )}>
                            <item.icon className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-medium">{item.label}</span>
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>

            {/* Employee Welcome Message */}
            {isEmployee() && (
              <div className="hidden lg:flex items-center gap-3 ml-6">
                {[
                  { icon: Zap, text: "Stay Productive!", gradient: "from-amber-400 to-orange-400", bg: "bg-amber-50", border: "border-amber-200", textColor: "text-amber-700" },
                  { icon: Star, text: "Your Work Matters!", gradient: "from-violet-400 to-purple-400", bg: "bg-violet-50", border: "border-violet-200", textColor: "text-violet-700" },
                  { icon: Rocket, text: "Make Today Count!", gradient: "from-blue-400 to-cyan-400", bg: "bg-blue-50", border: "border-blue-200", textColor: "text-blue-700" },
                  { icon: Award, text: "Great Job!", gradient: "from-emerald-400 to-teal-400", bg: "bg-emerald-50", border: "border-emerald-200", textColor: "text-emerald-700" },
                ].map((item, index) => (
                  new Date().getDay() % 4 === index && (
                    <div
                      key={item.text}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full border ${item.bg} ${item.border} shadow-sm`}
                    >
                      <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-sm`}>
                        <item.icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className={`text-sm font-semibold ${item.textColor}`}>
                        {item.text}
                      </span>
                    </div>
                  )
                ))}
              </div>
            )}

          </div>

          {/* Right: User Menu */}
          <div className={`flex items-center gap-4 ${isEmployee() ? 'ml-auto pl-8' : ''}`}>
            {!isManagingAsEmployee && (isPrivilegedUser || isEmployee()) && (
              <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 ? (
                      <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    ) : null}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 rounded-xl border-gray-200 p-0 shadow-xl">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">Notifications</p>
                    {unreadCount > 0 ? (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-60"
                          disabled={markNotificationsRead.isPending}
                          onClick={() => markNotificationsRead.mutate()}
                        >
                          {markNotificationsRead.isPending ? "Updating..." : "Mark all read"}
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-60"
                          disabled={markNotificationsRead.isPending}
                          onClick={() => markNotificationsRead.mutate()}
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {unreadCount === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        No new leave notifications.
                      </div>
                    ) : isPrivilegedUser ? (
                      adminLeaveNotifications.map((n) => (
                        <DropdownMenuItem
                          key={n.id}
                          className="cursor-pointer border-b border-gray-50 px-4 py-3 focus:bg-indigo-50"
                          onClick={() => {
                            void openNotification(n.id, "/attendance-adjustments");
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-amber-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                New leave request from {n.employees?.name ?? "employee"}
                              </p>
                              <p className="text-xs text-gray-500">Date: {n.leave_date}</p>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      employeeLeaveNotifications.map((n) => (
                        <DropdownMenuItem
                          key={n.id}
                          className="cursor-pointer border-b border-gray-50 px-4 py-3 focus:bg-indigo-50"
                          onClick={() => {
                            void openNotification(n.id, "/timesheet-management");
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <div className={cn("mt-0.5 h-2.5 w-2.5 rounded-full", n.status === "approved" ? "bg-emerald-500" : "bg-rose-500")} />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Leave request {n.status}
                              </p>
                              <p className="text-xs text-gray-500">For date: {n.leave_date}</p>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {/* Mobile Menu */}
            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg p-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-gray-200 shadow-lg rounded-lg max-h-[80vh] overflow-y-auto">
                  {/* Main Nav Items */}
                  {visibleNav.map((item) => (
                    <DropdownMenuItem
                      key={item.to}
                      onClick={() => navigate(`${item.to}${previewQuery}`)}
                      className={cn(
                        "cursor-pointer flex items-center gap-2 px-3 py-2 rounded-md",
                        isActive(item.to) && "bg-gray-100 text-black"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </DropdownMenuItem>
                  ))}

                  {/* Config Section for Admin/Manager */}
                  {!isManagingAsEmployee && (isAdmin() || isManager()) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                        Config
                      </DropdownMenuLabel>
                      {configNav
                        .filter(item => isAdmin() || (isManager() && ['employees', 'holidays', 'attendance-adjustments', 'kpi-management'].includes(item.to.replace('/', ''))))
                        .map((item) => (
                          <DropdownMenuItem
                            key={item.to}
                            onClick={() => navigate(item.to === '/roles' ? '/roles?from=config' : item.to === '/departments' ? '/departments?from=config' : item.to === '/employees' ? '/employees?from=config' : item.to)}
                            className={cn(
                              "cursor-pointer flex items-center gap-2 px-3 py-2 rounded-md",
                              isActive(item.to) && "bg-gray-100 text-black"
                            )}
                          >
                            <div className={cn(
                              "h-6 w-6 rounded-md flex items-center justify-center",
                              `bg-gradient-to-br ${item.color}`
                            )}>
                              <item.icon className="h-3 w-3 text-white" />
                            </div>
                            {item.label}
                          </DropdownMenuItem>
                        ))}
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-2 px-3 py-2 rounded-md"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Desktop User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 h-10 px-2 rounded-full hover:bg-gray-50 transition-colors"
                >
                  {profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt={displayName}
                      onClick={() => setShowPhotoPreview(true)}
                      className="h-8 w-8 rounded-full object-cover border border-gray-200 cursor-pointer"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {displayAvatarText || "A"}
                      </span>
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isManagingAsEmployee ? (isAdmin() ? "Admin · employee preview (read-only)" : "Manager · employee preview (read-only)") : userRole.role === "admin" ? "Admin" : userRole.role === "manager" ? "Manager" : "Employee"}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[320px] border-gray-200 shadow-lg rounded-xl p-0">
                {/* User Profile Header */}
                <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex flex-col items-center text-center gap-2">
                    {profilePhotoUrl ? (
                      <img
                        src={profilePhotoUrl}
                        alt={displayName}
                        onClick={() => setShowPhotoPreview(true)}
                        className="h-16 w-16 rounded-full object-cover shadow-md border border-gray-200"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-md shadow-violet-500/20">
                        <span className="text-xl font-bold text-white">
                          {displayAvatarText || "U"}
                        </span>
                      </div>
                    )}
                    <p className="text-lg leading-6 font-semibold text-gray-900 uppercase tracking-tight">{displayName}</p>
                    <p className="text-xs text-gray-500 break-all">{displayEmail}</p>
                    <p className="text-sm text-gray-600">Employee ID: {employeeCode}</p>
                    <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium max-w-full">
                      <div className="w-1.5 h-1.5 shrink-0 rounded-full bg-violet-500" />
                      <span className="truncate">
                        {isManagingAsEmployee ? (isAdmin() ? "Admin · employee preview (read-only)" : "Manager · employee preview (read-only)") : employeeRole}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-3 border-b border-gray-100 pb-4">
                    <div>
                      <p className="text-xs tracking-wide text-slate-500 uppercase">Mobile</p>
                      <p className="text-sm leading-5 font-semibold text-blue-700 mt-1 whitespace-nowrap">{employeePhone}</p>
                    </div>
                    <div>
                      <p className="text-xs tracking-wide text-slate-500 uppercase">Company</p>
                      <p className="text-sm leading-5 font-semibold text-violet-700 mt-1 whitespace-nowrap">{employeeCompany}</p>
                    </div>
                    <div>
                      <p className="text-xs tracking-wide text-slate-500 uppercase">Department</p>
                      <p className="text-sm leading-5 font-semibold text-emerald-700 mt-1 whitespace-nowrap">{employeeDepartment}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs tracking-wide text-slate-500 uppercase">Role</p>
                      <p className="text-sm leading-5 font-semibold text-amber-700 mt-1 truncate" title={employeeRole}>{employeeRole}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handlePhotoUploadClick}
                      disabled={isUploadingPhoto || !userRole.employee_id}
                      className="h-10 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-800 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Upload Photo
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={isUploadingPhoto || !profilePhotoUrl || !userRole.employee_id}
                      className="h-10 rounded-xl border border-gray-200 bg-gray-50 hover:bg-red-50 text-red-500 hover:text-red-600 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">Upload tips: square image (1:1) recommended, max 5MB.</p>

                  <DropdownMenuItem
                    onClick={signOut}
                    className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-3 px-4 py-3 transition-colors rounded-xl border border-red-100 bg-red-50/40"
                  >
                    <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Sign out</p>
                      <p className="text-xs text-red-600 opacity-75">Sign out of your account</p>
                    </div>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoFileChange}
            />
          </div>
        </div>
      </header>
      <Dialog open={showPhotoPreview} onOpenChange={setShowPhotoPreview}>
        <DialogContent className="[&>button]:hidden max-w-md border-0 bg-transparent shadow-none p-0">
          <DialogTitle className="sr-only">Profile photo preview</DialogTitle>
          <div className="flex items-center justify-center p-4">
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt={displayName}
                className="h-72 w-72 rounded-full object-cover border-4 border-white shadow-2xl"
              />
            ) : (
              <div className="h-72 w-72 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center border-4 border-white shadow-2xl">
                <span className="text-7xl font-bold text-white">{displayAvatarText || "U"}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile photo adjust (Instagram-like crop) */}
      <Dialog open={showPhotoAdjust} onOpenChange={(open) => (!open ? closeCropDialog() : null)}>
        <DialogContent className="sm:max-w-[520px] p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold">Adjust Profile Photo</DialogTitle>
              <p className="text-sm text-gray-500">
                Drag to position and use zoom to crop. Then click <span className="font-semibold">Crop & Upload</span>.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center gap-4">
            <div
              className="relative overflow-hidden bg-gray-100 rounded-xl touch-none select-none"
              style={{ width: cropBoxSize, height: cropBoxSize }}
              onPointerDown={(e) => {
                if (!photoAdjustSrc) return;
                if (!photoNaturalSize.width || !photoNaturalSize.height) return;
                const baseScale = getCropBaseScale();
                const scaledW = photoNaturalSize.width * baseScale * cropZoom;
                const scaledH = photoNaturalSize.height * baseScale * cropZoom;
                const minX = cropBoxSize - scaledW;
                const minY = cropBoxSize - scaledH;
                e.currentTarget.setPointerCapture(e.pointerId);
                setIsDraggingCrop(true);
                dragStart.current = {
                  startX: e.clientX,
                  startY: e.clientY,
                  startOffsetX: cropOffset.x,
                  startOffsetY: cropOffset.y,
                };

                // Ensure current offset is clamped at current zoom.
                setCropOffset((prev) => ({
                  x: Math.max(minX, Math.min(prev.x, 0)),
                  y: Math.max(minY, Math.min(prev.y, 0)),
                }));
              }}
              onPointerMove={(e) => {
                if (!isDraggingCrop || !dragStart.current) return;
                if (!photoNaturalSize.width || !photoNaturalSize.height) return;
                const baseScale = getCropBaseScale();
                const scaledW = photoNaturalSize.width * baseScale * cropZoom;
                const scaledH = photoNaturalSize.height * baseScale * cropZoom;
                const minX = cropBoxSize - scaledW;
                const minY = cropBoxSize - scaledH;

                const dx = e.clientX - dragStart.current.startX;
                const dy = e.clientY - dragStart.current.startY;
                const nextX = dragStart.current.startOffsetX + dx;
                const nextY = dragStart.current.startOffsetY + dy;

                setCropOffset({
                  x: Math.max(minX, Math.min(nextX, 0)),
                  y: Math.max(minY, Math.min(nextY, 0)),
                });
              }}
              onPointerUp={() => {
                setIsDraggingCrop(false);
                dragStart.current = null;
              }}
              onPointerCancel={() => {
                setIsDraggingCrop(false);
                dragStart.current = null;
              }}
            >
              {photoAdjustSrc ? (
                <img
                  ref={cropImgRef}
                  src={photoAdjustSrc}
                  alt="Crop source"
                  draggable={false}
                  style={{
                    position: "absolute",
                    left: cropOffset.x,
                    top: cropOffset.y,
                    width: photoNaturalSize.width * getCropBaseScale() * cropZoom,
                    height: photoNaturalSize.height * getCropBaseScale() * cropZoom,
                    cursor: isDraggingCrop ? "grabbing" : "grab",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                />
              ) : null}
            </div>

            <div className="w-full space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 font-medium">Zoom</span>
                <span className="text-gray-500">{cropZoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={cropZoom}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setCropZoom(next);
                  if (!photoNaturalSize.width || !photoNaturalSize.height) return;
                  const baseScale = getCropBaseScale();
                  const scaledW = photoNaturalSize.width * baseScale * next;
                  const scaledH = photoNaturalSize.height * baseScale * next;
                  setCropOffset({
                    x: (cropBoxSize - scaledW) / 2,
                    y: (cropBoxSize - scaledH) / 2,
                  });
                }}
                className="w-full"
              />

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!photoNaturalSize.width || !photoNaturalSize.height) return;
                    const baseScale = getCropBaseScale();
                    const scaledW = photoNaturalSize.width * baseScale * cropZoom;
                    const scaledH = photoNaturalSize.height * baseScale * cropZoom;
                    setCropOffset({
                      x: (cropBoxSize - scaledW) / 2,
                      y: (cropBoxSize - scaledH) / 2,
                    });
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
                >
                  Reset
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeCropDialog}
                    disabled={isUploadingPhoto}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmCropAndUpload}
                    disabled={isUploadingPhoto || !photoAdjustSrc}
                    className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {isUploadingPhoto ? "Uploading..." : "Crop & Upload"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto ios-safe-area-top ios-safe-area-bottom ios-scroll">
        {children}
      </main>
    </div>
  );
}
