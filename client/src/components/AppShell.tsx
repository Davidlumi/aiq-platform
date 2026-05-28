/**
 * AppShell - AiQ Platform Navigation Shell
 * Uses semantic CSS variables from index.css for all colours.
 * Sidebar: 240px expanded, 56px collapsed.
 */
import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useViewAs, VIEW_AS_LABELS, type ViewAsRole } from "@/contexts/ViewAsContext";
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
  Target,
  UserSearch,
  Eye,
  ChevronDown,
  FlaskConical,
  Sparkles,
  MessageSquare,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { useGate } from "@/contexts/GateContext";

type NavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  roles?: string[];
  section?: string;
};

// --- Role constants -----------------------------------------------------------
const CPO_ROLES = ["platform_super_admin", "tenant_admin", "hr_leader"];
const MANAGER_ROLES = ["manager"];

const NAV_ITEMS: NavItem[] = [
  // -- My Development (all roles) ----------------------------------------------
  { label: "AiQ Coach",       path: "/coach",          icon: MessageSquare, section: "mydev" },
  { label: "AI Skills Check",  path: "/assessment",     icon: ClipboardList, section: "mydev" },
  { label: "Learning Plan",   path: "/learning",       icon: BookOpen,      section: "mydev" },
  { label: "Content Library", path: "/library",        icon: Library,       section: "mydev" },
  { label: "Knowledge Base",  path: "/knowledge-base", icon: BookMarked,    section: "mydev" },

  // -- My Team (CPO + Manager) --------------------------------------------------
  {
    label: "Overview",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: [...CPO_ROLES, ...MANAGER_ROLES],
    section: "myteam",
  },
  {
    label: "People",
    path: "/people",
    icon: UserSearch,
    roles: [...CPO_ROLES, ...MANAGER_ROLES],
    section: "myteam",
  },

  // -- AI Strategy (CPO only) ---------------------------------------------------
  {
    label: "HR AI Strategy",
    path: "/strategy",
    icon: Target,
    roles: CPO_ROLES,
    section: "aistrategy",
  },
  {
    label: "Build Strategy",
    path: "/strategy/diagnostic",
    icon: Sparkles,
    roles: CPO_ROLES,
    section: "aistrategy",
  },
  {
    label: "Board Report",
    path: "/strategy/board-report",
    icon: FileText,
    roles: CPO_ROLES,
    section: "aistrategy",
  },
  {
    label: "Company Assessment",
    path: "/company-assessment",
    icon: Building2,
    roles: CPO_ROLES,
    section: "aistrategy",
  },
  {
    label: "Company Profile",
    path: "/company-profile",
    icon: Building2,
    roles: CPO_ROLES,
    section: "aistrategy",
  },
  {
    label: "Team Progress",
    path: "/manager/team-progress",
    icon: BarChart3,
    roles: MANAGER_ROLES,
    section: "myteam",
  },
  {
    label: "Conversation Prompts",
    path: "/manager/conversation-prompts",
    icon: Bell,
    roles: MANAGER_ROLES,
    section: "myteam",
  },

  // -- Admin (CPO only) ---------------------------------------------------------
  {
    label: "People & Org",
    path: "/admin/people",
    icon: Building2,
    roles: CPO_ROLES,
    section: "admin",
  },
  {
    label: "Users",
    path: "/admin/users",
    icon: Users,
    roles: CPO_ROLES,
    section: "admin",
  },
  {
    label: "Beta Applications",
    path: "/beta-applications",
    icon: FlaskConical,
    roles: CPO_ROLES,
    section: "admin",
  },
];

const SECTION_LABELS: Record<string, string> = {
  mydev:       "My Development",
  myteam:      "My Team",
  aistrategy:  "AI Strategy",
  admin:       "Admin",
};

/** AiQ logo mark - dark slate circle, white A+Q, primary i dot */
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
      <circle cx="100" cy="100" r="90" className="fill-sidebar" />
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
        A<tspan className="fill-primary">i</tspan>Q
      </text>
      <path
        d="M 58 140 Q 100 158 142 140"
        className="stroke-primary"
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
      <span className="text-xs font-medium tracking-[0.12em] uppercase text-sidebar-foreground/50" style={{ lineHeight: 1, marginBottom: "2px" }}>
        HR
      </span>
      <span className="text-[17px] font-semibold tracking-tight text-sidebar-foreground" style={{ lineHeight: 1 }}>
        Ai<span className="text-primary">Q</span>
      </span>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  // SSE real-time notifications (replaces WebSocket requirement)
  useNotifications();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { viewAs, setViewAs, effectiveRoles } = useViewAs();
  const userRoles = ((user as any)?.roles as string[]) ?? [];
  const [viewAsOpen, setViewAsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const gate = useGate();
  const isRewardMode = gate.tenantMode === "reward";

  // Use effectiveRoles for nav filtering (demo role override)
  // For reward-mode tenants, swap the CPO AI Strategy items for reward journey items
  const visibleItems = NAV_ITEMS
    .filter((item) => !item.roles || item.roles.some((r) => effectiveRoles.includes(r)))
    .map((item) => {
      if (!isRewardMode) return item;
      // Replace CPO strategy items with reward equivalents
      if (item.path === "/strategy") return { ...item, label: "Reward Strategy", path: "/strategy/reward-prework" };
      if (item.path === "/strategy/diagnostic") return { ...item, label: "Build Strategy", path: "/strategy/reward-prework" };
      if (item.path === "/strategy/board-report") return { ...item, label: "Outputs & Report", path: "/strategy/reward-outputs" };
      if (item.path === "/company-assessment") return { ...item, label: "Capability Review", path: "/strategy/reward-capability" };
      return item;
    });

  const initials = user
    ? `${(user as any).firstName?.[0] ?? ""}${(user as any).lastName?.[0] ?? ""}`.toUpperCase() ||
      ((user as any).email?.[0] ?? "U").toUpperCase()
    : "U";

  const displayName =
    (user as any)?.firstName && (user as any)?.lastName
      ? `${(user as any).firstName} ${(user as any).lastName}`
      : (user as any)?.email ?? "User";

  const primaryRole = userRoles[0] ?? "learner";
  const roleLabel = VIEW_AS_LABELS[viewAs];

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
    <div className="flex flex-col h-full aiq-sidebar-bg border-r border-sidebar-border">
      {/* Logo header */}
      <div
        className={cn(
          "flex items-center h-14 px-4 shrink-0 border-b border-sidebar-border",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <div className="flex items-center gap-2.5">
          <AiQLogoMark size={collapsed ? 28 : 32} />
          <AiQWordmark collapsed={collapsed} />
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded transition-colors hidden lg:flex text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center py-2 border-b border-sidebar-border">
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded transition-colors text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
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
              // Change 7d: Reduced section divider weight — smaller, lighter, less prominent
              <div
                className="px-4 pt-3 pb-1 text-[10px] font-medium tracking-[0.07em] uppercase text-sidebar-foreground/25"
                aria-hidden="true"
              >
                {section.label}
              </div>
            )}
            <ul className="space-y-0.5 px-2" role="list">
              {section.items.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <Link href={item.path}>
                      <span
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer select-none",
                          collapsed ? "justify-center px-2" : "px-3 border-l-[3px]",
                          // Change 7d: Non-active items slightly more muted
                          active
                            ? "bg-primary/14 text-primary font-semibold border-l-primary"
                            : "text-sidebar-foreground/45 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground/75 border-l-transparent",
                        )}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
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

      {/* Change 7d: View As role switcher — admin/CPO users only */}
      {!collapsed && (userRoles.some(r => CPO_ROLES.includes(r)) || userRoles.includes('platform_super_admin')) && (
        <div className="shrink-0 px-3 pb-2">
          <div className="relative">
            <button
              onClick={() => setViewAsOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-sidebar-border/60 bg-sidebar-foreground/5 hover:bg-sidebar-foreground/10 transition-colors text-sidebar-foreground/70"
            >
              <Eye className="w-3.5 h-3.5 shrink-0 text-primary" />
              <span className="flex-1 text-left">View as: <span className="text-primary font-semibold">{VIEW_AS_LABELS[viewAs]}</span></span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${viewAsOpen ? 'rotate-180' : ''}`} />
            </button>
            {viewAsOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-sidebar-border bg-sidebar shadow-xl overflow-hidden z-50">
                {(['cpo', 'manager', 'individual'] as ViewAsRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => { setViewAs(role); setViewAsOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${
                      viewAs === role
                        ? 'bg-primary/15 text-primary font-semibold'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-foreground/10'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      viewAs === role ? 'bg-primary' : 'bg-sidebar-foreground/20'
                    }`} />
                    {VIEW_AS_LABELS[role]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* User profile footer — Change 7d: lower contrast */}
      <div className="shrink-0 p-2 border-t border-sidebar-border/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded transition-colors text-sidebar-foreground/40 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground/60",
                collapsed && "justify-center"
              )}
              aria-label="Account menu"
            >
              {/* Change 7d: Avatar lower contrast */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 bg-sidebar-foreground/10 text-sidebar-foreground/50">
                {initials}
              </div>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate text-sidebar-foreground/60">
                    {displayName}
                  </p>
                  <p className="text-xs truncate text-sidebar-foreground/30">
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
                <p className="text-xs font-medium text-primary">{roleLabel}</p>
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
            <DropdownMenuItem onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              <span>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive focus:bg-destructive/5"
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
    <div className="flex h-screen overflow-hidden aiq-main-bg">
      {/* Skip to content link for keyboard/screen reader users */}
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      {/* Desktop sidebar - 240px expanded, 56px collapsed */}
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
          className="fixed inset-0 z-40 lg:hidden bg-foreground/60"
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden aiq-dot-grid">
        {/* Top bar */}
        <header className="flex items-center h-14 px-4 lg:px-6 gap-3 shrink-0 aiq-header-glass sticky top-0 z-20">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <AiQLogoMark size={26} />
            <span className="font-semibold text-[15px] text-foreground">
              Ai<span className="text-primary">Q</span>
            </span>
          </div>

          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              className="p-2 rounded transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 px-2 py-1.5 rounded transition-colors hover:bg-accent"
                  aria-label="Account menu"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 bg-primary/15 text-primary">
                    {initials}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium leading-none text-foreground">
                      {displayName}
                    </p>
                    <p className="text-xs leading-none mt-0.5 text-muted-foreground">
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
                    <p className="text-xs font-medium text-primary">{roleLabel}</p>
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
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  <span>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:text-destructive focus:bg-destructive/5"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 min-h-0 overflow-y-auto relative" tabIndex={-1}>
          {/* Ambient glow blobs for depth */}
          <div
            className="aiq-glow-blob"
            style={{
              width: '700px',
              height: '500px',
              top: '-120px',
              right: '-150px',
              background: 'oklch(22% 0.045 142 / 0.10)',
            }}
          />
          <div
            className="aiq-glow-blob"
            style={{
              width: '600px',
              height: '500px',
              bottom: '-100px',
              left: '-100px',
              background: 'oklch(13% 0.035 220 / 0.16)',
            }}
          />
          <div key={location} className="aiq-fade-in relative z-10 px-6 md:px-10 py-6" style={{ animationDuration: '0.2s' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
