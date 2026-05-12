import { useAuth } from "@/_core/hooks/useAuth";
// @refresh reset
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
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

type NavItem = { icon: React.ElementType; label: string; path: string };
type NavSection = { section: string; items: NavItem[] };

// --- Role helpers ------------------------------------------------------------
const CPO_ROLES = ["platform_super_admin", "tenant_admin", "hr_leader"];
const MANAGER_ROLES = ["manager"];

function isCpo(roles: string[]) {
  return roles.some(r => CPO_ROLES.includes(r));
}
function isManager(roles: string[]) {
  return !isCpo(roles) && roles.some(r => MANAGER_ROLES.includes(r));
}

// --- Nav definitions ---------------------------------------------------------
const MY_DEVELOPMENT: NavSection = {
  section: "My Development",
  items: [
    // AiQ Coach hidden — in development: { icon: MessageSquare, label: "AiQ Coach", path: "/coach" }
    { icon: ClipboardList,  label: "Assessment",     path: "/assessment" },
    { icon: BookOpen,       label: "Learning Plan",  path: "/learning" },
    { icon: Map,            label: "Domain Pathways", path: "/development/ai_interaction" },
    { icon: Library,        label: "Content Library",path: "/library" },
    { icon: BookMarked,     label: "Knowledge Base", path: "/knowledge-base" },
  ],
};

const MY_TEAM_CPO: NavSection = {
  section: "My Team",
  items: [
    { icon: LayoutDashboard, label: "Overview",     path: "/dashboard" },
    { icon: UserSearch,      label: "People",       path: "/people" },
  ],
};

const AI_STRATEGY: NavSection = {
  section: "AI Strategy",
  items: [
    { icon: Target,            label: "HR AI Strategy",        path: "/strategy" },
    { icon: Sparkles,          label: "Build Strategy",         path: "/strategy/ambition" },
    { icon: Building2,         label: "Company Assessment",     path: "/company-assessment" },
    { icon: BarChart3,         label: "Implementation Tracker", path: "/implementation-tracker" },
    { icon: TrendingUp,        label: "Maturity Progression",   path: "/maturity-progression" },
    { icon: UserCog,           label: "Manager Hub",            path: "/manager-hub" },
    { icon: MessageSquarePlus, label: "Content Feedback",       path: "/content-requests" },
  ],
};

const MY_TEAM_MANAGER: NavSection = {
  section: "My Team",
  items: [
    { icon: LayoutDashboard, label: "Overview",     path: "/dashboard" },
    { icon: UserSearch,      label: "People",       path: "/people" },
  ],
};

const ADMIN: NavSection = {
  section: "Admin",
  items: [
    { icon: Users, label: "Users", path: "/admin/users" },
    { icon: BookOpen, label: "Content Library", path: "/admin/content-library" },
    { icon: CalendarCheck2, label: "Content Review", path: "/admin/content-review" },
  ],
};

function getNavSections(roles: string[]): NavSection[] {
  if (isCpo(roles)) {
    return [MY_DEVELOPMENT, MY_TEAM_CPO, AI_STRATEGY, ADMIN];
  }
  if (isManager(roles)) {
    return [MY_DEVELOPMENT, MY_TEAM_MANAGER];
  }
  // Individual / learner
  return [MY_DEVELOPMENT];
}

// --- Width persistence --------------------------------------------------------
const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 240; // v2.2 spec: 240px default
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
          <Button onClick={() => { window.location.href = getLoginUrl(); }} size="lg" className="w-full shadow-lg hover:shadow-xl transition-all">
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  // v2.2 spec: 240px expanded, 56px collapsed
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
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const roles: string[] = (user as any)?.roles ?? [];
  const navSections = getNavSections(roles);
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
        {/* v2.2: sunken sidebar background */}
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
                    const isActive =
                      location === item.path ||
                      (item.path !== "/" && location.startsWith(item.path));
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-8 transition-all font-normal relative ${
                            isActive
                              ? "before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-primary"  /* v2.2: 3px left active border */
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
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-3">
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
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
