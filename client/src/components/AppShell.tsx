import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  Library,
  Play,
  BarChart3,
  Shield,
  FileText,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Menu,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Assessment", path: "/assessment", icon: ClipboardList },
  { label: "Learning Plan", path: "/learning", icon: BookOpen },
  { label: "Content Library", path: "/library", icon: Library },
  { label: "Simulations", path: "/simulations", icon: Play },
  {
    label: "Reports",
    path: "/reports",
    icon: BarChart3,
    roles: ["platform_super_admin", "tenant_admin", "hr_leader", "auditor"],
  },
  {
    label: "Audit Log",
    path: "/audit",
    icon: FileText,
    roles: ["platform_super_admin", "tenant_admin", "hr_leader", "auditor"],
  },
  {
    label: "Policy",
    path: "/policy",
    icon: Shield,
    roles: ["platform_super_admin", "tenant_admin", "hr_leader", "auditor"],
  },
  {
    label: "Users",
    path: "/admin/users",
    icon: Users,
    roles: ["platform_super_admin", "tenant_admin", "hr_leader"],
  },
  {
    label: "Tenants",
    path: "/admin/tenants",
    icon: Building2,
    roles: ["platform_super_admin"],
  },
];

/**
 * Official AiQ logo mark.
 * Dark navy circle (#1E293B) with white A, mint-green i (#34D399), white Q,
 * and a mint smile arc below — as specified in the design system.
 */
function AiQLogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="AiQ logo"
    >
      <circle cx="100" cy="100" r="100" fill="#1E293B" />
      <text
        x="100"
        y="128"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="80"
        fontWeight="800"
        fill="#FFFFFF"
        letterSpacing="-4"
      >
        AiQ
      </text>
      {/* Override the 'i' to mint green */}
      <text
        x="100"
        y="128"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="80"
        fontWeight="800"
        fill="#1E293B"
        letterSpacing="-4"
      >
        A Q
      </text>
      <text
        x="104"
        y="128"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="80"
        fontWeight="800"
        fill="#34D399"
        letterSpacing="-4"
      >
        i
      </text>
      {/* Smile arc */}
      <path
        d="M 58 155 Q 100 175 142 155"
        stroke="#34D399"
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRoles = ((user as any)?.roles as string[]) ?? [];

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.some((r) => userRoles.includes(r))
  );

  const initials = user
    ? `${(user as any).firstName?.[0] ?? ""}${(user as any).lastName?.[0] ?? ""}`.toUpperCase() ||
      ((user as any).email?.[0] ?? "U").toUpperCase()
    : "U";

  const displayName =
    (user as any)?.firstName && (user as any)?.lastName
      ? `${(user as any).firstName} ${(user as any).lastName}`
      : (user as any)?.email ?? "User";

  const primaryRole = userRoles[0] ?? "learner";
  const roleLabel = primaryRole
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  function isActive(path: string) {
    if (path === "/dashboard") return location === "/dashboard" || location === "/";
    return location === path || location.startsWith(path + "/");
  }

  const SidebarInner = () => (
    <div className="flex flex-col h-full">
      {/* Logo header */}
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b border-[#EAECF0] shrink-0",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <div className="flex items-center gap-2.5">
          <AiQLogoMark size={collapsed ? 30 : 34} />
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#9CA3AF]">
                HR
              </span>
              <span className="text-[18px] font-extrabold tracking-tight text-[#0E1726] leading-none">
                AiQ
              </span>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-md text-[#9CA3AF] hover:text-[#0E1726] hover:bg-[#F5F6FF] transition-colors hidden lg:flex"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center py-2 border-b border-[#EAECF0]">
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded-md text-[#9CA3AF] hover:text-[#0E1726] hover:bg-[#F5F6FF] transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <Link href={item.path}>
                  <span
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer select-none",
                      active
                        ? "bg-[#EEF0FF] text-[#3B4EFF]"
                        : "text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#0E1726]",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      className={cn(
                        "shrink-0 w-[18px] h-[18px]",
                        active ? "text-[#3B4EFF]" : "text-[#9CA3AF]"
                      )}
                    />
                    {!collapsed && <span>{item.label}</span>}
                    {active && !collapsed && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3B4EFF]" />
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User profile footer */}
      <div className="shrink-0 border-t border-[#EAECF0] p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#F5F6FF] transition-colors",
                collapsed && "justify-center"
              )}
            >
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="bg-[#3B4EFF] text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-[#0E1726] truncate">{displayName}</p>
                  <p className="text-xs text-[#9CA3AF] truncate">{roleLabel}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {(user as any)?.email}
                </p>
                <p className="text-xs text-[#3B4EFF] font-medium">{roleLabel}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile & Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F7F8FA] overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-white border-r border-[#EAECF0] transition-all duration-200 shrink-0",
          collapsed ? "w-[64px]" : "w-[240px]"
        )}
      >
        <SidebarInner />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-[240px] bg-white border-r border-[#EAECF0] z-50 transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarInner />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-[#EAECF0] flex items-center px-4 lg:px-6 gap-3 shrink-0">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-md text-[#6B7280] hover:bg-[#F5F6FF] transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <AiQLogoMark size={28} />
            <span className="font-extrabold text-[#0E1726] text-base">AiQ</span>
          </div>

          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <button className="p-2 rounded-lg text-[#6B7280] hover:bg-[#F5F6FF] hover:text-[#0E1726] transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F5F6FF] transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-[#3B4EFF] text-white text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-[#0E1726] leading-none">{displayName}</p>
                    <p className="text-xs text-[#9CA3AF] leading-none mt-0.5">{roleLabel}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {(user as any)?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile & Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
