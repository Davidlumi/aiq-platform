import { useAuth } from "@/_core/hooks/useAuth";
// @refresh reset
// NOTE: CPO engine code is preserved but hidden from reward_leader role
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Users,
  UserSearch,
  BookOpen,
  Library,
  ClipboardList,
  Target,
  BookMarked,
  Building2,
  Sparkles,
  MessageSquare,
  BarChart3,
  TrendingUp,
  UserCog,
  MessageSquarePlus,
  CalendarCheck2,
  Map,
  Sun,
  Moon,
  DollarSign,
  FileText,
  Lightbulb,
  GraduationCap,
  ClipboardCheck,
  Award,
  Download,
  Briefcase,
  Users2,
  Heart,
  ChevronDown,
  Lock,
  Layers,
  Shield,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type NavItem = { icon: React.ElementType; label: string; path: string };
type NavSection = { section: string; items: NavItem[] };

// --- Domain child types -------------------------------------------------------
type DomainStatus = "active" | "locked" | "soon";
type DomainChild = {
  label: string;
  path: string;
  icon: React.ElementType;
  status: DomainStatus;
};

// --- HR AI Strategy domain children (base — status resolved per tenant mode) --
const HR_AI_DOMAINS_BASE: Omit<DomainChild, "status">[] = [
  { label: "Company-wide",        path: "/company-assessment",       icon: Building2   },
  { label: "Reward",              path: "/strategy/reward-prework",  icon: Briefcase   },
  { label: "Talent",              path: "/talent",                   icon: Users2      },
  { label: "L&D",                 path: "/ld",                       icon: GraduationCap },
  { label: "Employee Relations",  path: "/er",                       icon: Shield      },
  { label: "Employee Experience", path: "/ex",                       icon: Heart       },
  { label: "D&I",                 path: "/di",                       icon: Layers      },
];

// --- Role helpers ------------------------------------------------------------
const CPO_ROLES = ["platform_super_admin", "tenant_admin", "hr_leader"];
const MANAGER_ROLES = ["manager"];

function isCpo(roles: string[]) {
  return roles.some(r => CPO_ROLES.includes(r));
}
function isManager(roles: string[]) {
  return !isCpo(roles) && roles.some(r => MANAGER_ROLES.includes(r));
}
function isRewardLeader(aiqRole?: string) {
  return aiqRole === "reward_leader";
}

// --- Nav definitions ---------------------------------------------------------
const MY_DEVELOPMENT: NavSection = {
  section: "My Development",
  items: [
    { icon: MessageSquare,  label: "AiQ Coach",      path: "/coach"         },
    { icon: ClipboardList,  label: "Skills Check",   path: "/assessment"    },
    { icon: BookOpen,       label: "Learning Plan",  path: "/learning"      },
    { icon: Map,            label: "Domain Pathways",path: "/development/ai_interaction" },
    { icon: Library,        label: "Content Library",path: "/library"       },
    { icon: BookMarked,     label: "Knowledge Base", path: "/knowledge-base"},
  ],
};

const MY_TEAM_CPO: NavSection = {
  section: "My Team",
  items: [
    { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
    { icon: UserSearch,      label: "People",   path: "/people"    },
  ],
};

const AI_STRATEGY: NavSection = {
  section: "AI Strategy",
  items: [
    { icon: Target,            label: "HR AI Strategy",        path: "/strategy"               },
    { icon: Sparkles,          label: "Build Strategy",         path: "/strategy/ambition"      },
    { icon: Building2,         label: "Company Assessment",     path: "/company-assessment"     },
    { icon: BarChart3,         label: "Implementation Tracker", path: "/implementation-tracker" },
    { icon: TrendingUp,        label: "Maturity Progression",   path: "/maturity-progression"   },
    { icon: UserCog,           label: "Manager Hub",            path: "/manager-hub"            },
    { icon: MessageSquarePlus, label: "Content Feedback",       path: "/content-requests"       },
  ],
};

const MY_TEAM_MANAGER: NavSection = {
  section: "My Team",
  items: [
    { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
    { icon: UserSearch,      label: "People",   path: "/people"    },
  ],
};

const ADMIN: NavSection = {
  section: "Admin",
  items: [
    { icon: Users,          label: "Users",           path: "/admin/users"          },
    { icon: BookOpen,       label: "Content Library", path: "/admin/content-library"},
    { icon: CalendarCheck2, label: "Content Review",  path: "/admin/content-review" },
  ],
};

const REWARD_ADMIN: NavSection = {
  section: "Admin",
  items: [
    { icon: Building2, label: "Company Profile", path: "/company-profile"   },
    { icon: Users,     label: "People & Org",    path: "/admin/people-org"  },
    { icon: Users,     label: "Users",           path: "/admin/users"       },
  ],
};

// --- Reward Leader nav sections (MY DEVELOPMENT + MY TEAM + AI STRATEGY with HR AI Strategy expandable) --
// The HR AI Strategy expandable is rendered separately in the component.
const REWARD_LEADER_MY_DEVELOPMENT: NavSection = {
  section: "My Development",
  items: MY_DEVELOPMENT.items,
};

function getNavSections(roles: string[], aiqRole?: string): NavSection[] {
  if (isRewardLeader(aiqRole)) {
    return [REWARD_LEADER_MY_DEVELOPMENT, MY_TEAM_CPO, REWARD_ADMIN];
  }
  if (isCpo(roles)) {
    return [MY_DEVELOPMENT, MY_TEAM_CPO, AI_STRATEGY, ADMIN];
  }
  if (isManager(roles)) {
    return [MY_DEVELOPMENT, MY_TEAM_MANAGER];
  }
  return [MY_DEVELOPMENT];
}

// --- Page transition skeleton ------------------------------------------------
function PageTransitionSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-foreground/8" />
        <div className="h-7 w-64 rounded bg-foreground/10" />
        <div className="h-4 w-96 rounded bg-foreground/6" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/30 bg-foreground/4 p-4 space-y-3 h-24">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-foreground/8" />
              <div className="h-4 w-24 rounded bg-foreground/8" />
            </div>
            <div className="h-1.5 rounded-full bg-foreground/8" />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Width persistence --------------------------------------------------------
const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

// --- Root component -----------------------------------------------------------
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">Sign in to continue</h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication.
            </p>
          </div>
          <Button onClick={() => { window.location.href = "/login"; }} size="lg" className="w-full shadow-lg hover:shadow-xl transition-all">
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px`, "--sidebar-width-icon": "56px" } as React.CSSProperties & Record<string, string>}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

// --- Inner layout -------------------------------------------------------------
function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [hrAiStrategyOpen, setHrAiStrategyOpen] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevLocation = useRef(location);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();

  const roles: string[] = (user as any)?.roles ?? [];
  const aiqRole: string | undefined = (user as any)?.aiqRole;
  const isRewardLeaderUser = isRewardLeader(aiqRole);

  // Coach gating — check if user has at least one completed assessment
  const { data: coachGate } = trpc.assessment.hasCompleted.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60_000,
  });
  const coachUnlocked = !!coachGate?.hasCompleted;

  // Resolve domain children status for reward_leader
  const resolvedDomains: DomainChild[] = HR_AI_DOMAINS_BASE.map((d) => {
    if (d.label === "Reward") return { ...d, status: "active" as DomainStatus };
    if (d.label === "Company-wide") return { ...d, status: "locked" as DomainStatus };
    return { ...d, status: "soon" as DomainStatus };
  });

  const isDomainActive = resolvedDomains.some(
    (d) => d.status === "active" && (location === d.path || location.startsWith(d.path))
  );

  // Page transition skeleton on domain navigation
  useEffect(() => {
    const DOMAIN_PATHS = ["/company-assessment", "/strategy/reward"];
    const isDomainNav = DOMAIN_PATHS.some(
      (p) => location.startsWith(p) && !prevLocation.current.startsWith(p)
    );
    if (location !== prevLocation.current && isDomainNav) {
      setIsTransitioning(true);
      const t = setTimeout(() => setIsTransitioning(false), 420);
      prevLocation.current = location;
      return () => clearTimeout(t);
    }
    prevLocation.current = location;
  }, [location]);

  const navSections = getNavSections(roles, aiqRole);
  const allItems = navSections.flatMap(s => s.items);
  const activeMenuItem = allItems.find(item =>
    item.path === location || (item.path !== "/" && location.startsWith(item.path))
  );

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0 bg-[var(--sidebar-bg,hsl(var(--muted)/0.4))]" disableTransition={isResizing}>
          {/* Header */}
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate text-sm text-foreground/80">
                    HR AiQ
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Nav */}
          <SidebarContent className="gap-0 overflow-y-auto">
            {navSections.map(section => (
              <div key={section.section}>
                {!isCollapsed && (
                  <p className="px-4 pt-2.5 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    {section.section}
                  </p>
                )}
                <SidebarMenu className="px-2 py-0">
                  {section.items.map(item => {
                    const isCoach = item.path === "/coach";
                    const isActive =
                      location === item.path ||
                      (item.path !== "/" && location.startsWith(item.path));

                    if (isCoach && !coachUnlocked) {
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            onClick={() => toast.info("Complete your Skills Check first to unlock AiQ Coach.")}
                            tooltip="AiQ Coach — complete Skills Check to unlock"
                            className="h-8 font-normal text-muted-foreground/40 cursor-pointer"
                          >
                            <item.icon className="h-4 w-4" />
                            <span className="flex-1">{item.label}</span>
                            {!isCollapsed && <Lock className="h-3 w-3 shrink-0 opacity-40" />}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    }

                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-8 transition-all font-normal relative ${
                            isActive
                              ? "before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-primary"
                              : ""
                          }`}
                        >
                          <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}

            {/* HR AI Strategy expandable parent — shown for reward_leader */}
            {isRewardLeaderUser && (
              <div>
                {!isCollapsed && (
                  <p className="px-4 pt-2.5 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    AI Strategy
                  </p>
                )}
                <div className="px-2 py-0">
                  {/* Expandable parent button */}
                  <button
                    onClick={() => { if (!isCollapsed) setHrAiStrategyOpen(v => !v); }}
                    className={cn(
                      "w-full flex items-center gap-2 h-8 rounded-md text-sm transition-all duration-150 cursor-pointer select-none px-2",
                      isDomainActive
                        ? "bg-accent text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    title={isCollapsed ? "HR AI Strategy" : undefined}
                    aria-expanded={hrAiStrategyOpen}
                  >
                    <Target className={cn("h-4 w-4 shrink-0", isDomainActive ? "text-primary" : "")} />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">HR AI Strategy</span>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-200",
                            hrAiStrategyOpen ? "rotate-180" : ""
                          )}
                        />
                      </>
                    )}
                  </button>

                  {/* Domain children */}
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-250 ease-in-out",
                      hrAiStrategyOpen && !isCollapsed ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    )}
                    style={{ transitionProperty: "max-height, opacity" }}
                  >
                    <div className="pl-3 mt-0.5 space-y-0.5">
                      {resolvedDomains.map((domain) => {
                        const Icon = domain.icon;
                        const isActive =
                          location === domain.path ||
                          (domain.path !== "/" && location.startsWith(domain.path));

                        if (domain.status === "soon") {
                          return (
                            <button
                              key={domain.label}
                              onClick={() => toast.info(`${domain.label} strategy module is coming soon.`)}
                              className="w-full flex items-center gap-2 h-7 rounded-md text-xs px-2 text-muted-foreground/30 hover:bg-accent/30 cursor-pointer"
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="flex-1 text-left">{domain.label}</span>
                              <span className="text-[9px] font-semibold tracking-wider text-muted-foreground/25 uppercase">Soon</span>
                            </button>
                          );
                        }

                        if (domain.status === "locked") {
                          return (
                            <button
                              key={domain.label}
                              onClick={() => toast.info(`${domain.label} is built but not active for your organisation. Contact your account manager to enable it.`)}
                              className="w-full flex items-center gap-2 h-7 rounded-md text-xs px-2 text-muted-foreground/40 hover:bg-accent/30 cursor-pointer"
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="flex-1 text-left">{domain.label}</span>
                              <Lock className="h-3 w-3 shrink-0 opacity-40" />
                            </button>
                          );
                        }

                        // Active domain
                        return (
                          <button
                            key={domain.label}
                            onClick={() => setLocation(domain.path)}
                            className={cn(
                              "w-full flex items-center gap-2 h-7 rounded-md text-xs px-2 transition-all cursor-pointer relative",
                              isActive
                                ? "bg-accent text-primary font-medium before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:rounded-full before:bg-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                          >
                            <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "")} />
                            <span className="flex-1 text-left">{domain.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-3">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 w-full px-1 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors group-data-[collapsible=icon]:justify-center"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
              <span className="group-data-[collapsible=icon]:hidden text-xs">
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {(user?.firstName ?? user?.email ?? "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user ? `${user.firstName} ${user.lastName}`.trim() || user.email : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <span className="tracking-tight text-foreground">{activeMenuItem?.label ?? "Menu"}</span>
            </div>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4">
          {isTransitioning ? <PageTransitionSkeleton /> : children}
        </main>
      </SidebarInset>
    </>
  );
}
