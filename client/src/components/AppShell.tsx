import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
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
  FolderOpen,
  Layers,
  BookMarked,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  roles?: string[];
  section?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",       path: "/dashboard",   icon: LayoutDashboard, section: "core" },
  { label: "Assessment",      path: "/assessment",  icon: ClipboardList,   section: "learn" },
  { label: "Learning Plan",   path: "/learning",    icon: BookOpen,        section: "learn" },
  { label: "Content Library", path: "/library",     icon: Library,         section: "learn" },
  { label: "Simulations",     path: "/simulations", icon: Play,            section: "learn" },
  {
    label: "Reports",
    path: "/reports",
    icon: BarChart3,
    roles: ["platform_super_admin", "tenant_admin", "hr_leader", "auditor"],
    section: "govern",
  },
  {
    label: "Audit Log",
    path: "/audit",
    icon: FileText,
    roles: ["platform_super_admin", "tenant_admin", "hr_leader", "auditor"],
    section: "govern",
  },
  {
    label: "Policy",
    path: "/policy",
    icon: Shield,
    roles: ["platform_super_admin", "tenant_admin", "hr_leader", "auditor"],
    section: "govern",
  },
  {
    label: "Content CMS",
    path: "/admin/content",
    icon: FolderOpen,
    roles: ["platform_super_admin", "tenant_admin", "hr_leader"],
    section: "admin",
  },
  {
    label: "Blueprints",
    path: "/admin/assessments",
    icon: Layers,
    roles: ["platform_super_admin", "tenant_admin", "hr_leader"],
    section: "admin",
  },
  {
    label: "Scenario Library",
    path: "/admin/scenarios",
    icon: BookMarked,
    roles: ["platform_super_admin", "tenant_admin", "hr_leader"],
    section: "admin",
  },
  {
    label: "Users",
    path: "/admin/users",
    icon: Users,
    roles: ["platform_super_admin", "tenant_admin", "hr_leader"],
    section: "admin",
  },
  {
    label: "Tenants",
    path: "/admin/tenants",
    icon: Building2,
    roles: ["platform_super_admin"],
    section: "admin",
  },
];

const SECTION_LABELS: Record<string, string> = {
  core: "",
  learn: "Learning",
  govern: "Governance",
  admin: "Administration",
};

/**
 * AiQ Logo Mark — canonical per brand repo (github.com/Davidlumi/Brandlogoanddesignsystem)
 * Circle: brand-slate (#1E293B) | AiQ: A+Q white, 'i' in brand-green-light (#34D399)
 * Arc: brand-green-light smile under wordmark
 */
function AiQLogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="HR AiQ logo"
    >
      <circle cx="100" cy="100" r="90" fill="#1E293B" />
      <text
        x="100"
        y="122"
        fontFamily="system-ui, sans-serif"
        fontSize="72"
        fontWeight="800"
        fill="white"
        textAnchor="middle"
        letterSpacing="-3"
      >
        A<tspan fill="#34D399">i</tspan>Q
      </text>
      <path
        d="M 58 140 Q 100 158 142 140"
        stroke="#34D399"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function AiQWordmark({ collapsed }: { collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <div className="flex flex-col leading-none select-none">
      <span style={{ fontFamily: "'Sora', sans-serif", fontSize: "10px", fontWeight: 400, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9CA3AF", lineHeight: 1, marginBottom: "2px" }}>HR</span>
      <span style={{ fontFamily: "'Sora', sans-serif", fontSize: "18px", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1, color: "#0E1726" }}>
        Ai<span style={{ color: "#34D399" }}>Q</span>
      </span>
    </div>
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

  // Group nav items by section
  const sections: { key: string; label: string; items: NavItem[] }[] = [];
  const seenSections = new Set<string>();
  for (const item of visibleItems) {
    const sec = item.section ?? "core";
    if (!seenSections.has(sec)) {
      seenSections.add(sec);
      sections.push({ key: sec, label: SECTION_LABELS[sec] ?? sec, items: [] });
    }
    sections[sections.length - 1].items.push(item);
  }

  const SidebarInner = () => (
    <div className="flex flex-col h-full" style={{ background: "#ffffff", borderRight: "1px solid #EAECF0" }}>
      {/* Logo header */}
      <div
        className={cn("flex items-center h-16 px-4 shrink-0", collapsed ? "justify-center" : "justify-between")}
        style={{ borderBottom: "1px solid #EAECF0" }}
      >
        <div className="flex items-center gap-2.5">
          <AiQLogoMark size={collapsed ? 30 : 34} />
          <AiQWordmark collapsed={collapsed} />
        </div>
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="p-1.5 rounded-md transition-colors hidden lg:flex" style={{ color: "#9CA3AF" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#6B7280")}
            onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}
            aria-label="Collapse sidebar">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center py-2" style={{ borderBottom: "1px solid #EAECF0" }}>
          <button onClick={() => setCollapsed(false)} className="p-1.5 rounded-md transition-colors" style={{ color: "#9CA3AF" }} aria-label="Expand sidebar">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {sections.map((section) => (
          <div key={section.key} className="mb-1">
            {section.label && !collapsed && (
              <div className="px-3 pt-3 pb-1" style={{ fontFamily: "'Sora', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9CA3AF" }}>
                {section.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <Link href={item.path}>
                      <span
                        onClick={() => setMobileOpen(false)}
                        className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer select-none", collapsed && "justify-center px-2")}
                        style={{ fontFamily: "'Sora', sans-serif", fontSize: "13.5px", fontWeight: active ? 600 : 400, color: active ? "#3B4EFF" : "#6B7280", background: active ? "#F5F6FF" : "transparent" }}
                        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "#F9FAFB"; (e.currentTarget as HTMLElement).style.color = "#374151"; } }}
                        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#6B7280"; } }}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon className={cn("shrink-0 w-[18px] h-[18px]", active ? "text-[#3B4EFF]" : "text-[#9CA3AF]")} />
                        {!collapsed && <span>{item.label}</span>}
                        {active && !collapsed && (<span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "#3B4EFF" }} />)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User profile footer */}
      <div className="shrink-0 p-3" style={{ borderTop: "1px solid #EAECF0" }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn("w-full flex items-center gap-3 p-2 rounded-lg transition-colors", collapsed && "justify-center")}
              style={{ color: "#6B7280" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F5F6FF")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "#EEF0FF", color: "#3B4EFF" }}>{initials}</div>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "#0E1726", fontFamily: "'Sora', sans-serif" }}>{displayName}</p>
                  <p className="text-xs truncate" style={{ color: "#9CA3AF", fontFamily: "'Sora', sans-serif" }}>{roleLabel}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none" style={{ fontFamily: "'Sora', sans-serif" }}>{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">{(user as any)?.email}</p>
                <p className="text-xs font-medium" style={{ color: "#3B4EFF", fontFamily: "'Sora', sans-serif" }}>{roleLabel}</p>
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
    <div className="flex h-screen overflow-hidden" style={{ background: "#F7F8FA" }}>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col transition-all duration-200 shrink-0",
          collapsed ? "w-[64px]" : "w-[240px]"
        )}
        style={{ background: "#0d1821" }}
      >
        <SidebarInner />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-[240px] z-50 transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "#0d1821" }}
      >
        <SidebarInner />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="h-14 flex items-center px-4 lg:px-6 gap-3 shrink-0"
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #EAECF0",
          }}
        >
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-md transition-colors"
            style={{ color: "#6B7280" }}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <AiQLogoMark size={28} />
            <span
              style={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: 700,
                fontSize: "16px",
                color: "#0d1821",
              }}
            >
              Ai<span style={{ color: "#0F6E56" }}>Q</span>
            </span>
          </div>

          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <button
              className="p-2 rounded-lg transition-colors"
              style={{ color: "#6B7280" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F5F6FF")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <Bell className="w-5 h-5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = "#F5F6FF")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#EEF0FF", color: "#3B4EFF" }}>{initials}</div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold leading-none" style={{ color: "#0E1726", fontFamily: "'Sora', sans-serif" }}>{displayName}</p>
                    <p className="text-xs leading-none mt-0.5" style={{ color: "#9CA3AF", fontFamily: "'Sora', sans-serif" }}>{roleLabel}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none" style={{ fontFamily: "'Sora', sans-serif" }}>
                      {displayName}
                    </p>
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
