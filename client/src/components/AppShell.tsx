/**
 * AppShell — AiQ Platform Navigation Shell
 * Original brand: #10B981 green accent, #1E293B dark slate sidebar,
 * #F7F8FA canvas background, system font stack.
 * Sidebar: 240px expanded, 56px collapsed.
 * Simulations removed per proposition realignment brief.
 */
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
  ShieldCheck,
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
  { label: "Learning plan",   path: "/learning",    icon: BookOpen,        section: "learn" },
  { label: "Content library", path: "/library",     icon: Library,         section: "learn" },
  {
    label: "Reports",
    path: "/reports",
    icon: BarChart3,
    roles: ["platform_super_admin", "tenant_admin", "hr_leader", "auditor"],
    section: "govern",
  },
  {
    label: "Audit log",
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
    label: "Scenario library",
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
  {
    label: "Back office",
    path: "/backoffice",
    icon: ShieldCheck,
    roles: ["super_admin"],
    section: "admin",
  },
];

const SECTION_LABELS: Record<string, string> = {
  core:   "",
  learn:  "Develop",
  govern: "Governance",
  admin:  "Administration",
};

/** AiQ logo mark — dark slate circle, white A+Q, green i dot */
function AiQLogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="AiQ logo"
      role="img"
    >
      <circle cx="100" cy="100" r="90" fill="#1E293B" />
      <text
        x="100"
        y="122"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="72"
        fontWeight="700"
        fill="white"
        textAnchor="middle"
        letterSpacing="-3"
      >
        A<tspan fill="#10B981">i</tspan>Q
      </text>
      <path
        d="M 58 140 Q 100 158 142 140"
        stroke="#10B981"
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
      <span style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94A3B8", lineHeight: 1, marginBottom: "2px" }}>
        HR
      </span>
      <span style={{ fontSize: "17px", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1, color: "#F8FAFC" }}>
        Ai<span style={{ color: "#10B981" }}>Q</span>
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
    <div
      className="flex flex-col h-full"
      style={{
        background: "#1E293B",
        borderRight: "1px solid #334155",
      }}
    >
      {/* Logo header */}
      <div
        className={cn(
          "flex items-center h-16 px-4 shrink-0",
          collapsed ? "justify-center" : "justify-between"
        )}
        style={{ borderBottom: "1px solid #334155" }}
      >
        <div className="flex items-center gap-2.5">
          <AiQLogoMark size={collapsed ? 28 : 32} />
          <AiQWordmark collapsed={collapsed} />
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded transition-colors hidden lg:flex"
            style={{ color: "#64748B" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#94A3B8")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#64748B")}
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center py-2" style={{ borderBottom: "1px solid #334155" }}>
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded transition-colors"
            style={{ color: "#64748B" }}
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Main navigation">
        {sections.map((section) => (
          <div key={section.key} className="mb-1">
            {section.label && !collapsed && (
              <div
                className="px-4 py-1.5 text-[10px] font-semibold tracking-widest uppercase"
                style={{ color: "#475569" }}
                aria-hidden="true"
              >
                {section.label}
              </div>
            )}
            <ul className="space-y-px px-2" role="list">
              {section.items.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <Link href={item.path}>
                      <span
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 py-2.5 rounded text-sm transition-all cursor-pointer select-none",
                          collapsed ? "justify-center px-2" : "px-3",
                        )}
                        style={{
                          background: active ? "rgba(16,185,129,0.12)" : "transparent",
                          color: active ? "#10B981" : "#94A3B8",
                          fontWeight: active ? 500 : 400,
                          borderLeft: active && !collapsed ? "3px solid #10B981" : "3px solid transparent",
                          borderRadius: "6px",
                        }}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        onMouseEnter={e => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                            (e.currentTarget as HTMLElement).style.color = "#CBD5E1";
                          }
                        }}
                        onMouseLeave={e => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                            (e.currentTarget as HTMLElement).style.color = "#94A3B8";
                          }
                        }}
                      >
                        <span className="shrink-0 w-[18px] h-[18px] flex items-center justify-center">
                          <Icon className="w-[18px] h-[18px]" />
                        </span>
                        {!collapsed && <span>{item.label}</span>}
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
      <div className="shrink-0 p-2" style={{ borderTop: "1px solid #334155" }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded transition-colors",
                collapsed && "justify-center"
              )}
              style={{ color: "#94A3B8" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              aria-label="Account menu"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={{ background: "rgba(16,185,129,0.2)", color: "#10B981" }}
              >
                {initials}
              </div>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#F1F5F9", fontSize: "13px" }}>
                    {displayName}
                  </p>
                  <p className="text-xs truncate" style={{ color: "#64748B", fontSize: "12px" }}>
                    {roleLabel}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">{(user as any)?.email}</p>
                <p className="text-xs font-medium" style={{ color: "#10B981" }}>{roleLabel}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile and settings</span>
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
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#F7F8FA" }}
    >
      {/* Desktop sidebar — 240px expanded, 56px collapsed */}
      <aside
        className={cn(
          "hidden lg:flex flex-col transition-all shrink-0",
          collapsed ? "w-14" : "w-60"
        )}
        style={{ transitionDuration: "200ms", transitionTimingFunction: "ease-out" }}
        aria-label="Sidebar"
      >
        <SidebarInner />
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(15,23,42,0.6)" }}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-60 z-50 transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ transitionDuration: "200ms", transitionTimingFunction: "ease-out" }}
        aria-label="Sidebar"
      >
        <SidebarInner />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center px-4 lg:px-6 gap-3 shrink-0"
          style={{
            height: "56px",
            background: "#FFFFFF",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded transition-colors"
            style={{ color: "#64748B" }}
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <AiQLogoMark size={26} />
            <span style={{ fontWeight: 600, fontSize: "15px", color: "#1E293B" }}>
              Ai<span style={{ color: "#10B981" }}>Q</span>
            </span>
          </div>

          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-1">
            <button
              className="p-2 rounded transition-colors"
              style={{ color: "#64748B" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#F1F5F9")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 px-2 py-1.5 rounded transition-colors"
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#F1F5F9")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                  aria-label="Account menu"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}
                  >
                    {initials}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium leading-none" style={{ color: "#1E293B", fontSize: "13px" }}>
                      {displayName}
                    </p>
                    <p className="text-xs leading-none mt-0.5" style={{ color: "#64748B", fontSize: "12px" }}>
                      {roleLabel}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{(user as any)?.email}</p>
                    <p className="text-xs font-medium" style={{ color: "#10B981" }}>{roleLabel}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile and settings</span>
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
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
