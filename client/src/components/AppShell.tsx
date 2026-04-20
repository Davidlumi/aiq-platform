import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
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
  X,
  Zap,
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

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRoles = (user as any)?.roles as string[] ?? [];

  const visibleItems = NAV_ITEMS.filter(
    item => !item.roles || item.roles.some(r => userRoles.includes(r))
  );

  const initials =
    user
      ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || user.email[0].toUpperCase()
      : "?";

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email ?? "User";

  const primaryRole = userRoles[0] ?? "learner";
  const roleLabel = primaryRole.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative z-50 flex flex-col h-full transition-all duration-300 ease-in-out",
          "bg-[var(--sidebar)] text-[var(--sidebar-foreground)]",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo — AiQ Brand Mark */}
        <div className={cn("flex items-center h-16 px-4 border-b border-[var(--sidebar-border)]", collapsed && "justify-center")}>
          {collapsed ? (
            /* Collapsed: monogram only */
            <div className="w-8 h-8 rounded-lg bg-[#10B981] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-['Sora'] font-bold text-sm">AQ</span>
            </div>
          ) : (
            /* Expanded: full HR AiQ brand mark */
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 flex-shrink-0">
                <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
                  <rect width="36" height="36" rx="8" fill="#10B981"/>
                  <text x="18" y="22" textAnchor="middle" fill="white" fontFamily="Sora,sans-serif" fontWeight="700" fontSize="13">AiQ</text>
                  <path d="M10 27 Q18 24 26 27" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-['Sora'] font-semibold text-white/60 tracking-wider uppercase">HR</span>
                  <span className="text-base font-['Sora'] font-bold text-white">AiQ</span>
                </div>
                <span className="text-[10px] text-white/50 font-['Sora'] tracking-wide block -mt-0.5">
                  Capability Intelligence
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = location === item.path || location.startsWith(item.path + "/");
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer",
                    isActive
                      ? "bg-accent/20 text-accent"
                      : "text-[var(--sidebar-foreground)]/70 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className={cn("p-3 border-t border-[var(--sidebar-border)]", collapsed && "flex justify-center")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-3 w-full rounded-lg p-2 hover:bg-[var(--sidebar-accent)] transition-colors",
                  collapsed && "w-auto"
                )}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-accent text-white text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-[var(--sidebar-foreground)] truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-[var(--sidebar-foreground)]/60 truncate">
                      {roleLabel}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-accent mt-0.5">{roleLabel}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile & Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Collapse toggle (desktop) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-accent text-white items-center justify-center shadow-md hover:bg-accent/90 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center h-14 px-4 bg-card border-b border-border">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2 ml-3">
            <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-foreground">AiQ</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
