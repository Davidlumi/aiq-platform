/**
 * StrategyTopNav — persistent top navigation bar for the 10-stage AI strategy flow.
 *
 * Visual states per step:
 *   locked      — grey padlock, non-clickable
 *   accessible  — clickable, muted
 *   current     — primary accent ring, bold label
 *   cleared     — emerald check, still clickable
 *   edited      — amber warning dot (cleared but edited since)
 *
 * Mobile: horizontally scrollable pill strip.
 */
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CheckCircle2, Lock, ChevronRight, AlertTriangle } from "lucide-react";
import { useGate } from "@/contexts/GateContext";
import { getModeLabels } from "../../../shared/modeLabels";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Stage definitions ────────────────────────────────────────────────────────

interface StageDefinition {
  number: number;
  label: string;
  shortLabel: string;
  route: string;
  what: string; // tooltip: what this stage is about
  accessibleKey: string;
  clearedKey: string;
  editedKey: string;
}

const STAGES: StageDefinition[] = [
  {
    number: 1,
    label: "Data Input",
    shortLabel: "Data",
    route: "/strategy/diagnostic",
    what: "Complete the 9 background input sections about your organisation",
    accessibleKey: "isStage1Accessible",
    clearedKey: "stage1Cleared",
    editedKey: "stage1EditedAfterClearing",
  },
  {
    number: 2,
    label: "Vision",
    shortLabel: "Vision",
    route: "/strategy/vision",
    what: "Confirm your AI strategy vision statement",
    accessibleKey: "isStage2Accessible",
    clearedKey: "stage2Cleared",
    editedKey: "stage2EditedAfterClearing",
  },
  {
    number: 3,
    label: "Strategy",
    shortLabel: "Strategy",
    route: "/strategy/strategy",
    what: "Choose your strategy archetype and confirm your strategy statement",
    accessibleKey: "isStage3Accessible",
    clearedKey: "stage3Cleared",
    editedKey: "stage3EditedAfterClearing",
  },
  {
    number: 4,
    label: "Principles",
    shortLabel: "Principles",
    route: "/strategy/ambition",
    what: "Define guiding principles, won't-dos, and outcomes",
    accessibleKey: "isStage4Accessible",
    clearedKey: "stage4Cleared",
    editedKey: "stage4EditedAfterClearing",
  },
  {
    number: 5,
    label: "The Plan",
    shortLabel: "Plan",
    route: "/strategy/plan",
    what: "Review and confirm your AI initiative portfolio",
    accessibleKey: "isStage5Accessible",
    clearedKey: "stage5Cleared",
    editedKey: "stage5EditedAfterClearing",
  },
  {
    number: 6,
    label: "Outcomes",
    shortLabel: "Outcomes",
    route: "/strategy/measurement",
    what: "Define success measures and outcomes for each initiative",
    accessibleKey: "isStage6Accessible",
    clearedKey: "stage6Cleared",
    editedKey: "stage6EditedAfterClearing",
  },
  {
    number: 7,
    label: "Business Case",
    shortLabel: "Biz Case",
    route: "/strategy/business-case",
    what: "Build the financial narrative and investment case",
    accessibleKey: "isStage7Accessible",
    clearedKey: "stage7Cleared",
    editedKey: "stage7EditedAfterClearing",
  },
  {
    number: 8,
    label: "Capability",
    shortLabel: "Capability",
    route: "/strategy/capability",
    what: "Assess capability gaps and define your development plan",
    accessibleKey: "isStage8Accessible",
    clearedKey: "stage8Cleared",
    editedKey: "stage8EditedAfterClearing",
  },
  {
    number: 9,
    label: "Review",
    shortLabel: "Review",
    route: "/strategy/review",
    what: "Hold your leadership review session and record tensions",
    accessibleKey: "isStage9Accessible",
    clearedKey: "stage9Cleared",
    editedKey: "stage9EditedAfterClearing",
  },
  {
    number: 10,
    label: "Board Report",
    shortLabel: "Report",
    route: "/strategy/board-report",
    what: "Generate and finalise your board-ready strategy report",
    accessibleKey: "isStage10Accessible",
    clearedKey: "stage10Cleared",
    editedKey: "stage10EditedAfterClearing",
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type GateState = Record<string, boolean | undefined | null | object | string>;
type StepState = "locked" | "accessible" | "current" | "cleared" | "edited";

function getStepState(stage: StageDefinition, gate: GateState, currentPath: string): StepState {
  const isAccessible = !!(gate[stage.accessibleKey] as boolean);
  const isCleared = !!(gate[stage.clearedKey] as boolean);
  const isEdited = !!(gate[stage.editedKey] as boolean);
  const isCurrent = currentPath === stage.route || currentPath.startsWith(stage.route + "?");

  if (isCurrent) return "current";
  if (isEdited) return "edited";   // cleared but modified — needs re-confirmation
  if (isCleared) return "cleared";
  if (isAccessible) return "accessible";
  return "locked";
}

// ─── Step component ───────────────────────────────────────────────────────────

function StageStep({
  stage,
  state,
  isLast,
  onClick,
}: {
  stage: StageDefinition;
  state: StepState;
  isLast: boolean;
  onClick: () => void;
}) {
  const isClickable = state !== "locked";

  const button = (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      aria-current={state === "current" ? "step" : undefined}
      aria-label={`Stage ${stage.number}: ${stage.label}${state === "locked" ? " (locked)" : state === "cleared" ? " (completed)" : state === "edited" ? " (needs re-confirmation)" : ""}`}
      className={cn(
        "relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        state === "locked"     && "cursor-not-allowed text-muted-foreground/30 opacity-50",
        state === "accessible" && "cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent/50",
        state === "current"    && "cursor-pointer text-primary font-semibold bg-primary/12 ring-1 ring-primary/40 shadow-sm",
        state === "cleared"    && "cursor-pointer text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10",
        state === "edited"     && "cursor-pointer text-amber-400 hover:text-amber-300 hover:bg-amber-500/10",
      )}
    >
      {/* Number / icon badge */}
      <span
        className={cn(
          "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 transition-colors",
          state === "locked"     && "bg-muted-foreground/12 text-muted-foreground/30",
          state === "accessible" && "bg-muted-foreground/18 text-muted-foreground",
          state === "current"    && "bg-primary text-primary-foreground shadow-sm",
          state === "cleared"    && "bg-emerald-500/20 text-emerald-400",
          state === "edited"     && "bg-amber-500/20 text-amber-400",
        )}
      >
        {state === "cleared" ? (
          <CheckCircle2 className="w-3.5 h-3.5" />
        ) : state === "locked" ? (
          <Lock className="w-2.5 h-2.5" />
        ) : state === "edited" ? (
          <AlertTriangle className="w-3 h-3" />
        ) : (
          stage.number
        )}
      </span>

      {/* Label */}
      <span className="hidden sm:inline md:hidden">{stage.shortLabel}</span>
      <span className="hidden md:inline">{stage.label}</span>
    </button>
  );

  return (
    <div className="flex items-center shrink-0">
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-center text-xs">
          <p className="font-semibold mb-0.5">Stage {stage.number}: {stage.label}</p>
          <p className="text-muted-foreground">{stage.what}</p>
          {state === "locked" && <p className="text-amber-400 mt-1">Complete previous stages first</p>}
          {state === "edited" && <p className="text-amber-400 mt-1">Re-confirm needed — you edited this stage</p>}
        </TooltipContent>
      </Tooltip>

      {!isLast && (
        <ChevronRight className="w-3 h-3 shrink-0 mx-0.5 text-muted-foreground/20" aria-hidden="true" />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StrategyTopNav() {
  const [location, setLocation] = useLocation();
  const navigate = setLocation;
  const { tenantMode } = useGate();
  const modeLabels = getModeLabels(tenantMode as "cpo" | "reward" | null | undefined);
  // Apply mode-aware labels to stages 9 and 10
  const activeStages = STAGES.map(s => {
    if (s.number === 9) return { ...s, label: modeLabels.stage9Label, what: modeLabels.stage9What };
    if (s.number === 10) return { ...s, label: modeLabels.stage10Label, shortLabel: modeLabels.stage10ShortLabel, what: modeLabels.stage10What };
    return s;
  });

  const { data: gateState, isLoading } = trpc.gate.getState.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const isOverview = location === "/strategy" || location === "/strategy/";

  const effectiveGate: GateState = (gateState as GateState) ?? {
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
    stage1Cleared: false, stage2Cleared: false, stage3Cleared: false,
    stage4Cleared: false, stage5Cleared: false, stage6Cleared: false,
    stage7Cleared: false, stage8Cleared: false, stage9Cleared: false,
    stage10Cleared: false,
    stage1EditedAfterClearing: false, stage2EditedAfterClearing: false,
    stage3EditedAfterClearing: false, stage4EditedAfterClearing: false,
    stage5EditedAfterClearing: false, stage6EditedAfterClearing: false,
    stage7EditedAfterClearing: false, stage8EditedAfterClearing: false,
    stage9EditedAfterClearing: false, stage10EditedAfterClearing: false,
  };

  const clearedCount = STAGES.filter(s => !!(effectiveGate[s.clearedKey] as boolean)).length;
  const editedCount  = STAGES.filter(s => !!(effectiveGate[s.editedKey]  as boolean)).length;

  return (
    <TooltipProvider delayDuration={400}>
      <nav
        aria-label="Strategy stages"
        className={cn(
          "sticky top-0 z-30",
          "border-b border-border/60",
          "bg-background/85 backdrop-blur-md",
          "shadow-sm shadow-black/10",
        )}
      >
        <div className="flex items-center gap-1 px-4 md:px-6 h-12">
          {/* Overview home pill */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => navigate("/strategy")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 shrink-0",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  isOverview
                    ? "text-primary font-semibold bg-primary/12 ring-1 ring-primary/40 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-pointer",
                )}
                aria-current={isOverview ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0",
                    isOverview ? "bg-primary text-primary-foreground" : "bg-muted-foreground/18 text-muted-foreground",
                  )}
                >
                  ⌂
                </span>
                <span className="hidden sm:inline">Overview</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Strategy overview &amp; progress dashboard</TooltipContent>
          </Tooltip>

          <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground/20 mx-0.5" aria-hidden="true" />

          {/* Scrollable stage steps */}
          <div
            className="flex items-center overflow-x-auto flex-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div className="flex items-center">
              {activeStages.map((stage, idx) => {
                const state = getStepState(stage, effectiveGate, location);
                return (
                  <StageStep
                    key={stage.number}
                    stage={stage}
                    state={state}
                    isLast={idx === activeStages.length - 1}
                    onClick={() => navigate(stage.route)}
                  />
                );
              })}
            </div>
          </div>

          {/* Right: mode badge + progress pill */}
          {!isLoading && (
            <div className="hidden sm:flex items-center gap-2 shrink-0 ml-2 pl-2 border-l border-border/40">
              {/* Mode badge */}
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border",
                  tenantMode === "reward"
                    ? "bg-violet-500/10 text-violet-400 border-violet-500/25"
                    : "bg-primary/10 text-primary border-primary/25"
                )}
              >
                {tenantMode === "reward" ? "Reward" : "CPO"}
              </span>
              {/* Mini progress bars */}
              <div className="flex gap-0.5">
                {activeStages.map(s => {
                  const cleared = !!(effectiveGate[s.clearedKey] as boolean);
                  const edited  = !!(effectiveGate[s.editedKey]  as boolean);
                  return (
                    <div
                      key={s.number}
                      className={cn(
                        "w-1 h-3 rounded-full transition-colors",
                        edited   ? "bg-amber-400"   :
                        cleared  ? "bg-emerald-500"  :
                        "bg-muted-foreground/15"
                      )}
                      aria-hidden="true"
                    />
                  );
                })}
              </div>
              <span className="text-[10px] text-muted-foreground/50 font-medium tabular-nums whitespace-nowrap">
                {clearedCount}/10
                {editedCount > 0 && (
                  <span className="text-amber-400 ml-1">· {editedCount} need re-confirm</span>
                )}
              </span>
            </div>
          )}
        </div>
      </nav>
    </TooltipProvider>
  );
}
