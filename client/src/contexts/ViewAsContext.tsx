/**
 * ViewAsContext - Demo role switcher
 * Lets the logged-in user override their effective role for demo purposes.
 * The override is stored in localStorage so it persists across page refreshes.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type ViewAsRole = "cpo" | "manager" | "individual";

interface ViewAsContextValue {
  viewAs: ViewAsRole;
  setViewAs: (role: ViewAsRole) => void;
  /** Effective roles array to use instead of real user roles */
  effectiveRoles: string[];
}

const STORAGE_KEY = "aiq_view_as";

function getInitialRole(): ViewAsRole {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "cpo" || stored === "manager" || stored === "individual") return stored;
  } catch {}
  return "cpo";
}

const ROLE_MAP: Record<ViewAsRole, string[]> = {
  cpo:        ["hr_leader"],
  manager:    ["manager"],
  individual: ["learner"],
};

const ViewAsContext = createContext<ViewAsContextValue>({
  viewAs: "cpo",
  setViewAs: () => {},
  effectiveRoles: ["hr_leader"],
});

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const [viewAs, setViewAsState] = useState<ViewAsRole>(getInitialRole);

  const setViewAs = useCallback((role: ViewAsRole) => {
    setViewAsState(role);
    try { localStorage.setItem(STORAGE_KEY, role); } catch {}
  }, []);

  return (
    <ViewAsContext.Provider value={{ viewAs, setViewAs, effectiveRoles: ROLE_MAP[viewAs] }}>
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
