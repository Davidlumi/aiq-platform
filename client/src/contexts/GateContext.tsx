/**
 * GateContext — React context for the v3 strategy flow stage gate state machine.
 *
 * Provides:
 *   - gateState: current stage gate state from the server
 *   - accessibility flags: isStage{1-10}Accessible
 *   - cleared flags: stage{1-10}Cleared
 *   - editedAfterClearing flags: stage{1-10}EditedAfterClearing
 *   - refetch(): force re-fetch gate state
 *   - markEdited(stage): mark a stage as edited (invalidates gate)
 *
 * Usage:
 *   const { isStage9Accessible, stage9Cleared } = useGate();
 */
import React, { createContext, useContext } from "react";
import { trpc } from "@/lib/trpc";

type StageGateEntry = {
  completedAt: number | null;
  lastEditedAt: number | null;
};

type StageGateState = {
  stage1: StageGateEntry;
  stage2: StageGateEntry;
  stage3: StageGateEntry;
  stage4: StageGateEntry;
  stage5: StageGateEntry;
  stage6: StageGateEntry;
  stage7: StageGateEntry;
  stage8: StageGateEntry;
  stage9: StageGateEntry;
  stage10: StageGateEntry;
};

type StageKey = "stage1" | "stage2" | "stage3" | "stage4" | "stage5" | "stage6" | "stage7" | "stage8" | "stage9" | "stage10";

type GateContextValue = {
  gateState: StageGateState | null;
  isLoading: boolean;
  isStage1Accessible: boolean;
  isStage2Accessible: boolean;
  isStage3Accessible: boolean;
  isStage4Accessible: boolean;
  isStage5Accessible: boolean;
  isStage6Accessible: boolean;
  isStage7Accessible: boolean;
  isStage8Accessible: boolean;
  isStage9Accessible: boolean;
  isStage10Accessible: boolean;
  stage1Cleared: boolean;
  stage2Cleared: boolean;
  stage3Cleared: boolean;
  stage4Cleared: boolean;
  stage5Cleared: boolean;
  stage6Cleared: boolean;
  stage7Cleared: boolean;
  stage8Cleared: boolean;
  stage9Cleared: boolean;
  stage10Cleared: boolean;
  stage1EditedAfterClearing: boolean;
  stage2EditedAfterClearing: boolean;
  stage3EditedAfterClearing: boolean;
  stage4EditedAfterClearing: boolean;
  stage5EditedAfterClearing: boolean;
  stage6EditedAfterClearing: boolean;
  stage7EditedAfterClearing: boolean;
  stage8EditedAfterClearing: boolean;
  stage9EditedAfterClearing: boolean;
  stage10EditedAfterClearing: boolean;
  visionStatement: string | null;
  visionInspirationSource: string | null;
  strategyArchetype: string | null;
  strategyStatement: string | null;
  refetch: () => void;
  markEdited: (stage: StageKey) => void;
};

const DEFAULT_CONTEXT: GateContextValue = {
  gateState: null,
  isLoading: true,
  isStage1Accessible: true,
  isStage2Accessible: false,
  isStage3Accessible: false,
  isStage4Accessible: false,
  isStage5Accessible: false,
  isStage6Accessible: false,
  isStage7Accessible: false,
  isStage8Accessible: false,
  isStage9Accessible: false,
  isStage10Accessible: false,
  stage1Cleared: false,
  stage2Cleared: false,
  stage3Cleared: false,
  stage4Cleared: false,
  stage5Cleared: false,
  stage6Cleared: false,
  stage7Cleared: false,
  stage8Cleared: false,
  stage9Cleared: false,
  stage10Cleared: false,
  stage1EditedAfterClearing: false,
  stage2EditedAfterClearing: false,
  stage3EditedAfterClearing: false,
  stage4EditedAfterClearing: false,
  stage5EditedAfterClearing: false,
  stage6EditedAfterClearing: false,
  stage7EditedAfterClearing: false,
  stage8EditedAfterClearing: false,
  stage9EditedAfterClearing: false,
  stage10EditedAfterClearing: false,
  visionStatement: null,
  visionInspirationSource: null,
  strategyArchetype: null,
  strategyStatement: null,
  refetch: () => {},
  markEdited: () => {},
};

const GateContext = createContext<GateContextValue>(DEFAULT_CONTEXT);

export function GateProvider({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.gate.getState.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const markEditedMutation = trpc.gate.markEdited.useMutation({
    onSuccess: () => {
      void utils.gate.getState.invalidate();
    },
  });

  const markEdited = (stage: StageKey) => {
    markEditedMutation.mutate({ stage });
  };

  const value: GateContextValue = {
    gateState: data?.gateState ?? null,
    isLoading,
    isStage1Accessible: data?.isStage1Accessible ?? true,
    isStage2Accessible: data?.isStage2Accessible ?? false,
    isStage3Accessible: data?.isStage3Accessible ?? false,
    isStage4Accessible: data?.isStage4Accessible ?? false,
    isStage5Accessible: data?.isStage5Accessible ?? false,
    isStage6Accessible: data?.isStage6Accessible ?? false,
    isStage7Accessible: data?.isStage7Accessible ?? false,
    isStage8Accessible: data?.isStage8Accessible ?? false,
    isStage9Accessible: data?.isStage9Accessible ?? false,
    isStage10Accessible: data?.isStage10Accessible ?? false,
    stage1Cleared: data?.stage1Cleared ?? false,
    stage2Cleared: data?.stage2Cleared ?? false,
    stage3Cleared: data?.stage3Cleared ?? false,
    stage4Cleared: data?.stage4Cleared ?? false,
    stage5Cleared: data?.stage5Cleared ?? false,
    stage6Cleared: data?.stage6Cleared ?? false,
    stage7Cleared: data?.stage7Cleared ?? false,
    stage8Cleared: data?.stage8Cleared ?? false,
    stage9Cleared: data?.stage9Cleared ?? false,
    stage10Cleared: data?.stage10Cleared ?? false,
    stage1EditedAfterClearing: data?.stage1EditedAfterClearing ?? false,
    stage2EditedAfterClearing: data?.stage2EditedAfterClearing ?? false,
    stage3EditedAfterClearing: data?.stage3EditedAfterClearing ?? false,
    stage4EditedAfterClearing: data?.stage4EditedAfterClearing ?? false,
    stage5EditedAfterClearing: data?.stage5EditedAfterClearing ?? false,
    stage6EditedAfterClearing: data?.stage6EditedAfterClearing ?? false,
    stage7EditedAfterClearing: data?.stage7EditedAfterClearing ?? false,
    stage8EditedAfterClearing: data?.stage8EditedAfterClearing ?? false,
    stage9EditedAfterClearing: data?.stage9EditedAfterClearing ?? false,
    stage10EditedAfterClearing: data?.stage10EditedAfterClearing ?? false,
    visionStatement: data?.visionStatement ?? null,
    visionInspirationSource: data?.visionInspirationSource ?? null,
    strategyArchetype: data?.strategyArchetype ?? null,
    strategyStatement: data?.strategyStatement ?? null,
    refetch: () => { void refetch(); },
    markEdited,
  };

  return <GateContext.Provider value={value}>{children}</GateContext.Provider>;
}

export function useGate(): GateContextValue {
  return useContext(GateContext);
}
