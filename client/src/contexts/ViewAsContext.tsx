/**
 * ViewAsContext - Demo role switcher
 * Lets the logged-in user override their effective role for demo purposes.
 * The override is stored in localStorage so it persists across page refreshes.
 *
 * IMPORTANT: When no override has been explicitly set by the user, viewAs is
 * null so that RoleDashboard falls through to real entitlement-based routing.
 * Defaulting to "cpo" caused reward-only users to render LeaderDashboardV2,
 * which threw FORBIDDEN errors on every strategyCompany-gated procedure.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type ViewAsRole = "cpo" | "manager" | "individual";

interface ViewAsContextValue {
  viewAs: ViewAsRole | null;
  setViewAs: (role: ViewAsRole | null) => void;
  /** Effective roles array to use instead of real user roles (empty when no override) */
  effectiveRoles: string[];
}

const STORAGE_KEY = "aiq_view_as";

function getInitialRole(): ViewAsRole | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "cpo" || stored === "manager" || stored === "individual") return stored;
  } catch {}
  // No explicit override stored — let RoleDashboard use real entitlements.
  return null;
}

const ROLE_MAP: Record<ViewAsRole, string[]> = {
  cpo:        ["hr_leader"],
  manager:    ["manager"],
  individual: ["learner"],
};

const ViewAsContext = createContext<ViewAsContextValue>({
  viewAs: null,
  setViewAs: () => {},
  effectiveRoles: [],
});

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const [viewAs, setViewAsState] = useState<ViewAsRole | null>(getInitialRole);

  const setViewAs = useCallback((role: ViewAsRole | null) => {
    setViewAsState(role);
    try {
      if (role) {
        localStorage.setItem(STORAGE_KEY, role);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, []);

  return (
    <ViewAsContext.Provider value={{ viewAs, setViewAs, effectiveRoles: viewAs ? ROLE_MAP[viewAs] : [] }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  return useContext(ViewAsContext);
}

export const VIEW_AS_LABELS: Record<ViewAsRole, string> = {
  cpo:        "CPO / HR Leader",
  manager:    "Manager",
  individual: "Individual",
};
