/**
 * GateContext — React context for the v3 strategy flow stage gate state machine.
 *
 * Provides:
 *   - gateState: current stage gate state from the server
 *   - accessibility flags: isStage{1-4}Accessible
 *   - cleared flags: stage{1-4}Cleared
 *   - editedAfterClearing flags: stage{1-4}EditedAfterClearing
 *   - refetch(): force re-fetch gate state
 *   - markEdited(stage): mark a stage as edited (invalidates gate)
 *
 * Usage:
 *   const { isStage2Accessible, stage2Cleared } = useGate();
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
};

type GateContextValue = {
  gateState: StageGateState | null;
  isLoading: boolean;
  isStage1Accessible: boolean;
  isStage2Accessible: boolean;
  isStage3Accessible: boolean;
  isStage4Accessible: boolean;
  stage1Cleared: boolean;
  stage2Cleared: boolean;
  stage3Cleared: boolean;
  stage4Cleared: boolean;
  stage1EditedAfterClearing: boolean;
  stage2EditedAfterClearing: boolean;
  stage3EditedAfterClearing: boolean;
  stage4EditedAfterClearing: boolean;
  visionStatement: string | null;
  visionInspirationSource: string | null;
  strategyArchetype: string | null;
  strategyStatement: string | null;
  refetch: () => void;
  markEdited: (stage: "stage1" | "stage2" | "stage3" | "stage4") => void;
};

const DEFAULT_CONTEXT: GateContextValue = {
  gateState: null,
  isLoading: true,
  isStage1Accessible: true,
  isStage2Accessible: false,
  isStage3Accessible: false,
  isStage4Accessible: false,
  stage1Cleared: false,
  stage2Cleared: false,
  stage3Cleared: false,
  stage4Cleared: false,
  stage1EditedAfterClearing: false,
  stage2EditedAfterClearing: false,
  stage3EditedAfterClearing: false,
  stage4EditedAfterClearing: false,
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

  const markEdited = (stage: "stage1" | "stage2" | "stage3" | "stage4") => {
    markEditedMutation.mutate({ stage });
  };

  const value: GateContextValue = {
    gateState: data?.gateState ?? null,
    isLoading,
    isStage1Accessible: data?.isStage1Accessible ?? true,
    isStage2Accessible: data?.isStage2Accessible ?? false,
    isStage3Accessible: data?.isStage3Accessible ?? false,
    isStage4Accessible: data?.isStage4Accessible ?? false,
    stage1Cleared: data?.stage1Cleared ?? false,
    stage2Cleared: data?.stage2Cleared ?? false,
    stage3Cleared: data?.stage3Cleared ?? false,
    stage4Cleared: data?.stage4Cleared ?? false,
    stage1EditedAfterClearing: data?.stage1EditedAfterClearing ?? false,
    stage2EditedAfterClearing: data?.stage2EditedAfterClearing ?? false,
    stage3EditedAfterClearing: data?.stage3EditedAfterClearing ?? false,
    stage4EditedAfterClearing: data?.stage4EditedAfterClearing ?? false,
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
