/**
 * useDeepDive — detects whether a stage page is in "deep dive" mode.
 *
 * Deep dive mode is active when:
 *   1. Stage 8 has been cleared (stage8Cleared is true), AND
 *   2. The page was navigated to from the summary dashboard
 *      (URL contains `?from=dashboard` or `&from=dashboard`).
 *
 * Returns:
 *   isDeepDive  — boolean flag
 *   clearParam  — call this to strip the param from the URL without a reload
 */
import { useMemo } from "react";
import { useSearch } from "wouter";
import { useGate } from "@/contexts/GateContext";

export function useDeepDive(): { isDeepDive: boolean } {
  const search = useSearch();
  const gate = useGate();

  const isDeepDive = useMemo(() => {
    if (!gate.stage8Cleared) return false;
    const params = new URLSearchParams(search);
    return params.get("from") === "dashboard";
  }, [search, gate.stage8Cleared]);

  return { isDeepDive };
}
