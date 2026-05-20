/**
 * useMode — returns the current tenant's platform mode ("cpo" | "reward").
 *
 * Reads from GateContext (which fetches gate.getState from the server).
 * Falls back to "cpo" if context is not yet loaded.
 *
 * Usage:
 *   const mode = useMode();
 *   const isCPO = mode === "cpo";
 *   const isReward = mode === "reward";
 */
import { useGate } from "@/contexts/GateContext";

export type PlatformMode = "cpo" | "reward";

export function useMode(): PlatformMode {
  const { tenantMode } = useGate();
  return tenantMode ?? "cpo";
}

/** Human-readable label for the current mode */
export function useModeLabel(): string {
  const mode = useMode();
  return mode === "reward" ? "Reward" : "CPO";
}

/** Returns mode-specific strings */
export function useModeLabels() {
  const mode = useMode();
  return {
    mode,
    isReward: mode === "reward",
    isCPO: mode === "cpo",
    /** "CPO" | "Reward Leader" */
    roleLabel: mode === "reward" ? "Reward Leader" : "CPO",
    /** "AI Strategy" | "Total Reward Strategy" */
    productLabel: mode === "reward" ? "Total Reward Strategy" : "AI Strategy",
    /** "Stage 1: Data Input" label for the first stage */
    stage1Label: mode === "reward" ? "Reward Context" : "Data Input",
    /** "Strategy" label for stage 3 */
    stage3Label: mode === "reward" ? "Reward Philosophy" : "Strategy",
    /** "The Plan" label for stage 5 */
    stage5Label: mode === "reward" ? "Reward Initiatives" : "The Plan",
    /** "Business Case" label for stage 7 */
    stage7Label: mode === "reward" ? "Business Case" : "Business Case",
    /** "Capability" label for stage 8 */
    stage8Label: mode === "reward" ? "Reward Capability" : "Capability",
  };
}
