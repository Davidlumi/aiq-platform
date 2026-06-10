/**
 * AppShell - AiQ Platform Navigation Shell
 * Uses semantic CSS variables from index.css for all colours.
 * Sidebar: 240px expanded, 56px collapsed.
 *
 * Nav structure:
 * - MY DEVELOPMENT: Skills Check, AiQ Coach (gated), Learning Plan, Modules
 * - MY TEAM: Overview, People (CPO + Manager)
 * - AI STRATEGY: HR AI Strategy (expandable, 7 domain children), Build Strategy, Board Report, Company Assessment, Company Profile
 * - ADMIN: People & Org, Users, Beta Applications
 */
import { useState, useEffect, useRef, Fragment } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useViewAs, VIEW_AS_LABELS, type ViewAsRole } from "@/contexts/ViewAsContext";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
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
  FileText,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Menu,
  Bell,
  BookMarked,
  Target,
  UserSearch,
  Eye,
  ChevronDown,
  FlaskConical,
  Sparkles,
  MessageSquare,
  Sun,
  Moon,
  Lock,
  Clock,
  Briefcase,
  GraduationCap,
  Scale,
  Heart,
  Users2,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { useGate } from "@/contexts/GateContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type NavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  roles?: string[];
  section?: string;
};

type DomainChild = {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  /** active = this org's current product; locked = built but not active; soon = not yet built; prework = locked until Background Inputs complete */
  status: "active" | "locked" | "soon" | "prework";
};

// ─── Role constants ───────────────────────────────────────────────────────────

const CPO_ROLES = ["platform_super_admin", "tenant_admin", "hr_leader"];
const MANAGER_ROLES = ["manager"];

// ─── HR AI Strategy domain children ──────────────────────────────────────────
// Status is resolved dynamically based on tenantMode in the component.
// Base status here is for CPO mode; reward mode inverts Company-wide ↔ Reward.
const HR_AI_STRATEGY_DOMAINS: DomainChild[] = [
  { label: "Company-wide",        path: "/strategy",                   icon: Building2,    status: "active" },
  { label: "Reward",              path: "/strategy/reward-prework",    icon: Briefcase,    status: "locked" },
  { label: "Talent",              path: "/strategy/talent",            icon: UserSearch,   status: "soon"   },
  { label: "L&D",                 path: "/strategy/ld",                icon: GraduationCap, status: "soon"  },
  { label: "Employee Relations",  path: "/strategy/er",                icon: Scale,        status: "soon"   },
  { label: "Employee Experience", path: "/strategy/ex",                icon: Heart,        status: "soon"   },
  { label: "D&I",                 path: "/strategy/di",                icon: Users2,       status: "soon"   },
];

const NAV_ITEMS: NavItem[] = [
  // -- My Development (all roles) ----------------------------------------------
  { label: "Skills Check",     path: "/assessment",     icon: ClipboardList, section: "mydev" },
  { label: "Learning Plan",    path: "/learning",       icon: BookOpen,      section: "mydev" },
  { label: "Modules",          path: "/modules",        icon: Library,       section: "mydev" },
  { label: "AiQ Coach",        path: "/coach",          icon: MessageSquare, section: "mydev" },

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

  // -- AI Strategy (CPO only) — HR AI Strategy is rendered as expandable below -
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
    label: "Signal Watch",
    path: "/strategy/signal-watch",
    icon: Radio,
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
    label: "Signal Approval",
    path: "/admin/signals",
    // GATING: platform superuser only — founderApproved is the editorial control of the
    // living-strategy product. CPO_ROLES includes tenant_admin/hr_leader which can be held
    // by tenant-side users; a client CPO could otherwise approve signals into the feed.
    // isPlatformSuperuser is set only via direct SQL, never via any API path.
    icon: Radio,
    roles: ["platform_super_admin"],
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

// ─── Logo components ──────────────────────────────────────────────────────────

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

// ─── Domain child row ─────────────────────────────────────────────────────────

function DomainChildRow({
  domain,
  isActive,
  collapsed,
  onNavigate,
}: {
  domain: DomainChild;
  isActive: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const Icon = domain.icon;
  const status = domain.status;
  const [, navigate] = useLocation();

  if (status === "soon") {
    return (
      <li>
        <button
          onClick={() => toast.info(`${domain.label} strategy module is coming soon.`)}
          className={cn(
            "w-full flex items-center gap-2.5 py-2 rounded-lg text-xs transition-all duration-150 cursor-pointer select-none",
            collapsed ? "justify-center px-2" : "px-3 pl-7"
          )}
          title={collapsed ? `${domain.label} — Coming Soon` : undefined}
        >
          <span className="shrink-0 w-[15px] h-[15px] flex items-center justify-center text-sidebar-foreground/25">
            <Icon className="w-[15px] h-[15px]" />
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-sidebar-foreground/30">{domain.label}</span>
              <span className="text-[9px] font-semibold tracking-wide uppercase text-sidebar-foreground/25 bg-sidebar-foreground/8 border border-sidebar-foreground/10 rounded px-1.5 py-0.5">
                Soon
              </span>
            </>
          )}
        </button>
      </li>
    );
  }

  if (status === "prework") {
    return (
      <li>
        <button
          onClick={() => {
            toast.info("Complete Background Inputs first to unlock this domain.");
            navigate("/strategy/diagnostic");
          }}
          className={cn(
            "w-full flex items-center gap-2.5 py-2 rounded-lg text-xs transition-all duration-150 cursor-pointer select-none",
            collapsed ? "justify-center px-2" : "px-3 pl-7"
          )}
          title={collapsed ? `${domain.label} — Complete Background Inputs first` : undefined}
        >
          <span className="shrink-0 w-[15px] h-[15px] flex items-center justify-center text-sidebar-foreground/35">
            <Icon className="w-[15px] h-[15px]" />
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-sidebar-foreground/40">{domain.label}</span>
              <Lock className="w-3 h-3 text-amber-400/70 shrink-0" />
            </>
          )}
        </button>
      </li>
    );
  }

  if (status === "locked") {
    return (
      <li>
        <button
          onClick={() => toast.info(`${domain.label} is built but not active for your organisation. Contact your account manager to enable it.`)}
          className={cn(
            "w-full flex items-center gap-2.5 py-2 rounded-lg text-xs transition-all duration-150 cursor-pointer select-none",
            collapsed ? "justify-center px-2" : "px-3 pl-7"
          )}
          title={collapsed ? `${domain.label} — Locked` : undefined}
        >
          <span className="shrink-0 w-[15px] h-[15px] flex items-center justify-center text-sidebar-foreground/35">
            <Icon className="w-[15px] h-[15px]" />
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-sidebar-foreground/40">{domain.label}</span>
              <Lock className="w-3 h-3 text-sidebar-foreground/25 shrink-0" />
            </>
          )}
        </button>
      </li>
    );
  }

  // active
  return (
    <li>
      <Link href={domain.path}>
        <span
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 py-2 rounded-lg text-xs transition-all duration-150 cursor-pointer select-none",
            collapsed ? "justify-center px-2" : "px-3 pl-7",
            isActive
              ? "bg-primary/14 text-primary font-semibold"
              : "text-sidebar-foreground/55 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground/80"
          )}
          title={collapsed ? domain.label : undefined}
          aria-current={isActive ? "page" : undefined}
        >
          <span className="shrink-0 w-[15px] h-[15px] flex items-center justify-center">
            <Icon className="w-[15px] h-[15px]" />
          </span>
          {!collapsed && <span className="flex-1">{domain.label}</span>}
        </span>
      </Link>
    </li>
  );
}

// ─── Page transition skeleton ─────────────────────────────────────────────────

function PageTransitionSkeleton() {
  return (
    <div className="animate-pulse space-y-6 px-1 pt-2">
      {/* Header bar */}
      <div className="h-8 w-2/5 rounded-lg bg-foreground/8" />
      {/* Sub-header */}
      <div className="h-4 w-1/3 rounded bg-foreground/5" />
      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-foreground/4 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-foreground/8 shrink-0" />
              <div className="h-4 w-2/3 rounded bg-foreground/8" />
            </div>
            <div className="h-3 w-full rounded bg-foreground/5" />
            <div className="h-3 w-4/5 rounded bg-foreground/5" />
            <div className="h-2 w-full rounded-full bg-foreground/5 mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  useNotifications();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hrAiStrategyOpen, setHrAiStrategyOpen] = useState(true);

  const { viewAs, setViewAs, effectiveRoles } = useViewAs();
  const userRoles = ((user as any)?.roles as string[]) ?? [];
  const [viewAsOpen, setViewAsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const gate = useGate();
  // Derive tenantMode: prefer the loaded gate value; fall back to user.tenantMode while gate is loading.
  // user.tenantMode comes from auth.me which queries the tenant row directly — it is always correct.
  const userTenantMode = (user as any)?.tenantMode as string | undefined;
  const userAiqRole = (user as any)?.aiqRole as string | undefined;
  // Resolved tenantMode: use gate value once loaded, otherwise use user.tenantMode as fallback
  const resolvedTenantMode: "cpo" | "reward" =
    !gate.isLoading
      ? gate.tenantMode
      : (userTenantMode === "reward" ? "reward" : "cpo");
  const isRewardMode = resolvedTenantMode === "reward";
  const isCpoMode = resolvedTenantMode === "cpo";

  // Coach gating: only show if user has at least one completed assessment session
  const { data: coachGate } = trpc.assessment.hasCompleted.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const coachUnlocked = coachGate?.hasCompleted ?? false;

  // Page transition state: show skeleton briefly when navigating to a domain page
  const DOMAIN_PATHS = new Set(HR_AI_STRATEGY_DOMAINS.filter(d => d.status === "active").map(d => d.path));
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLocation = useRef(location);

  useEffect(() => {
    const isDomainNav =
      DOMAIN_PATHS.has(location) ||
      location.startsWith("/strategy/reward") ||
      location.startsWith("/company-assessment");

    if (location !== prevLocation.current && isDomainNav) {
      setIsTransitioning(true);
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
      transitionTimer.current = setTimeout(() => setIsTransitioning(false), 420);
    }
    prevLocation.current = location;
    return () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    };
  }, [location]);

  // Resolve domain children status based on tenantMode and pre-work gate.
  // Pre-work gate (stage1Cleared) takes precedence:
  //   - If Background Inputs not yet confirmed, BOTH Company-wide and Reward are "prework" (amber lock, redirects to /strategy/diagnostic)
  //   - Once stage1Cleared:
  //     CPO mode:    Company-wide = active, Reward = locked
  //     Reward mode: Reward = active, Company-wide = locked
  const preworkDone = gate.stage1Cleared;
  const resolvedDomains: DomainChild[] = HR_AI_STRATEGY_DOMAINS.map((d) => {
    if (d.label === "Company-wide" || d.label === "Reward") {
      if (!preworkDone) return { ...d, status: "prework" as const };
      // Pre-work done — apply mode-based active/locked
      if (isRewardMode) {
        if (d.label === "Reward") return { ...d, status: "active" as const };
        if (d.label === "Company-wide") return { ...d, status: "locked" as const };
      } else {
        // CPO mode (default): Company-wide active, Reward locked
        if (d.label === "Company-wide") return { ...d, status: "active" as const };
        if (d.label === "Reward") return { ...d, status: "locked" as const };
      }
    }
    return d;
  });

  // Reward mode: remap strategy items to reward equivalents
  const REWARD_REMAP_PATHS = new Set(["/strategy/diagnostic", "/strategy/board-report", "/dashboard", "/people"]);
  const rawVisibleItems = NAV_ITEMS
    .filter((item) => {
      if (isRewardMode && REWARD_REMAP_PATHS.has(item.path)) return true;
      return !item.roles || item.roles.some((r) => effectiveRoles.includes(r));
    })
    .map((item) => {
      if (!isRewardMode) return item;
      if (item.path === "/strategy/diagnostic") return { ...item, label: "Build Strategy", path: "/strategy/reward-principles" };
      if (item.path === "/strategy/board-report") return { ...item, label: "Outputs & Report", path: "/strategy/reward-outputs" };
      return item;
    });

  const seenPaths = new Set<string>();
  const visibleItems = rawVisibleItems.filter((item) => {
    if (seenPaths.has(item.path)) return false;
    seenPaths.add(item.path);
    return true;
  });

  const initials = user
    ? `${(user as any).firstName?.[0] ?? ""}${(user as any).lastName?.[0] ?? ""}`.toUpperCase() ||
      ((user as any).email?.[0] ?? "U").toUpperCase()
    : "U";

  const displayName =
    (user as any)?.firstName && (user as any)?.lastName
      ? `${(user as any).firstName} ${(user as any).lastName}`
      : (user as any)?.email ?? "User";

  const roleLabel = VIEW_AS_LABELS[viewAs];

  function isActive(path: string) {
    if (path === "/dashboard") return location === "/dashboard" || location === "/";
    return location === path || location.startsWith(path + "/");
  }

  const isDomainActive = resolvedDomains.some((d) => d.status === "active" && isActive(d.path));

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

  const isCpoUser = userRoles.some(r => CPO_ROLES.includes(r));
  // Show HR AI Strategy expandable for:
  //   - CPO users (by role)
  //   - Reward mode users (reward_leader)
  //   - Any user whose tenant is in CPO mode (tenantMode === 'cpo')
  //   - Any user whose aiqRole is 'cpo' or 'reward_leader'
  const showHrAiStrategy =
    isCpoUser ||
    isRewardMode ||
    isCpoMode ||
    userAiqRole === "cpo" ||
    userAiqRole === "reward_leader";

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
                const isCoach = item.path === "/coach";

                // HR AI Strategy expandable parent — inject before aistrategy items
                const isFirstAiStrategyItem = section.key === "aistrategy" && item === section.items[0];

                return (
                  <Fragment key={item.path}>
                    {isFirstAiStrategyItem && showHrAiStrategy && (
                      <li key="hr-ai-strategy-parent">
                        {/* HR AI Strategy expandable parent */}
                        <button
                          onClick={() => {
                            if (!collapsed) setHrAiStrategyOpen((v) => !v);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer select-none",
                            collapsed ? "justify-center px-2" : "px-3 border-l-[3px]",
                            isDomainActive
                              ? "bg-primary/14 text-primary font-semibold border-l-primary"
                              : "text-sidebar-foreground/45 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground/75 border-l-transparent"
                          )}
                          title={collapsed ? "HR AI Strategy" : undefined}
                          aria-expanded={hrAiStrategyOpen}
                        >
                          <span className="shrink-0 w-[18px] h-[18px] flex items-center justify-center">
                            <Target className="w-[18px] h-[18px]" />
                          </span>
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left">HR AI Strategy</span>
                              <ChevronDown
                                className={cn(
                                  "w-3.5 h-3.5 transition-transform duration-200",
                                  hrAiStrategyOpen ? "rotate-180" : ""
                                )}
                              />
                            </>
                          )}
                        </button>

                        {/* Domain children — animated expand/collapse */}
                        <div
                          className={cn(
                            "overflow-hidden transition-all duration-250 ease-in-out",
                            hrAiStrategyOpen && !collapsed ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                          )}
                          style={{ transitionProperty: "max-height, opacity" }}
                        >
                          <ul className="space-y-0.5 mt-0.5" role="list">
                            {resolvedDomains.map((domain) => (
                              <DomainChildRow
                                key={domain.label}
                                domain={domain}
                                isActive={isActive(domain.path)}
                                collapsed={collapsed}
                                onNavigate={() => setMobileOpen(false)}
                              />
                            ))}
                          </ul>
                        </div>
                      </li>
                    )}

                    {/* Hide flat aistrategy items when HR AI Strategy expandable parent is shown */}
                    {!(section.key === "aistrategy" && showHrAiStrategy) && (
                    <li key={item.path}>
                      {isCoach && !coachUnlocked ? (
                        // Locked Coach item
                        <button
                          onClick={() => toast.info("Complete your Skills Check first to unlock AiQ Coach.")}
                          className={cn(
                            "w-full flex items-center gap-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer select-none",
                            collapsed ? "justify-center px-2" : "px-3 border-l-[3px] border-l-transparent",
                            "text-sidebar-foreground/25 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground/40"
                          )}
                          title={collapsed ? "AiQ Coach (complete Skills Check to unlock)" : undefined}
                          aria-label="AiQ Coach — complete Skills Check to unlock"
                        >
                          <span className="shrink-0 w-[18px] h-[18px] flex items-center justify-center">
                            <Icon className="w-[18px] h-[18px]" />
                          </span>
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left">{item.label}</span>
                              <Lock className="w-3 h-3 text-sidebar-foreground/20 shrink-0" />
                            </>
                          )}
                        </button>
                      ) : (
                        <Link href={item.path}>
                          <span
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer select-none",
                              collapsed ? "justify-center px-2" : "px-3 border-l-[3px]",
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
                      )}
                    </li>
                    )}
                  </Fragment>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* View As role switcher — admin/CPO users only */}
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

      {/* User profile footer */}
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
      <a href="#main-content" className="skip-to-content">Skip to main content</a>

      {/* Desktop sidebar */}
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
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="lg:hidden flex items-center gap-2">
            <AiQLogoMark size={26} />
            <span className="font-semibold text-[15px] text-foreground">
              Ai<span className="text-primary">Q</span>
            </span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
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
          {/* Ambient glow blobs */}
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
          <div className="relative z-10 px-6 md:px-10 py-6">
            {isTransitioning ? (
              <PageTransitionSkeleton />
            ) : (
              <div key={location} className="aiq-fade-in" style={{ animationDuration: '0.22s' }}>
                {children}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
