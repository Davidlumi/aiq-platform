/**
 * StrategyTopNav — persistent top navigation bar for the 10-stage AI strategy flow.
 *
 * Renders a horizontal strip of numbered stage steps.  Each step has one of four
 * visual states derived from the gate.getState query:
 *
 *   locked      — grey, cursor-not-allowed, no click
 *   accessible  — clickable, default accent colour
 *   current     — highlighted with primary ring, bold label
 *   cleared     — green check mark, still clickable
 *
 * On mobile (< 768 px) the strip is horizontally scrollable.
 * The overview route (/strategy) is shown as a "home" step before Stage 1.
 */
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CheckCircle2, Lock, ChevronRight } from "lucide-react";

// ─── Stage definitions ────────────────────────────────────────────────────────

interface StageDefinition {
  number: number;
  label: string;
  shortLabel: string;
  route: string;
  /** Key used to look up isStageNAccessible from gate state */
  accessibleKey: `isStage${number}Accessible`;
  /** Key used to look up stageNCleared from gate state */
  clearedKey: `stage${number}Cleared`;
}

const STAGES: StageDefinition[] = [
  {
    number: 1,
    label: "Data Input",
    shortLabel: "Data",
    route: "/strategy/diagnostic",
    accessibleKey: "isStage1Accessible",
    clearedKey: "stage1Cleared",
  },
  {
    number: 2,
    label: "Vision",
    shortLabel: "Vision",
    route: "/strategy/vision",
    accessibleKey: "isStage2Accessible",
    clearedKey: "stage2Cleared",
  },
  {
    number: 3,
    label: "Strategy",
    shortLabel: "Strategy",
    route: "/strategy/strategy",
    accessibleKey: "isStage3Accessible",
    clearedKey: "stage3Cleared",
  },
  {
    number: 4,
    label: "Principles",
    shortLabel: "Principles",
    route: "/strategy/ambition",
    accessibleKey: "isStage4Accessible",
    clearedKey: "stage4Cleared",
  },
  {
    number: 5,
    label: "The Plan",
    shortLabel: "Plan",
    route: "/strategy/plan",
    accessibleKey: "isStage5Accessible",
    clearedKey: "stage5Cleared",
  },
  {
    number: 6,
    label: "Outcomes",
    shortLabel: "Outcomes",
    route: "/strategy/roadmap",
    accessibleKey: "isStage6Accessible",
    clearedKey: "stage6Cleared",
  },
  {
    number: 7,
    label: "Business Case",
    shortLabel: "Biz Case",
    route: "/strategy/business-case",
    accessibleKey: "isStage7Accessible",
    clearedKey: "stage7Cleared",
  },
  {
    number: 8,
    label: "Capability",
    shortLabel: "Capability",
    route: "/strategy/capability",
    accessibleKey: "isStage8Accessible",
    clearedKey: "stage8Cleared",
  },
  {
    number: 9,
    label: "Review",
    shortLabel: "Review",
    route: "/strategy/review",
    accessibleKey: "isStage9Accessible",
    clearedKey: "stage9Cleared",
  },
  {
    number: 10,
    label: "Board Report",
    shortLabel: "Report",
    route: "/strategy/board-report",
    accessibleKey: "isStage10Accessible",
    clearedKey: "stage10Cleared",
  },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

type GateState = {
  isStage1Accessible: boolean;
  isStage2Accessible: boolean;
  isStage3Accessible: boolean;
  isStage4Accessible: boolean;
  isStage5Accessible: boolean;
  isStage6Accessible: boolean;
  isStage7Accessible: boolean;
  isStage8Accessible: boolean;
  isStage9Accessible?: boolean;
  isStage10Accessible?: boolean;
  stage1Cleared: boolean;
  stage2Cleared: boolean;
  stage3Cleared: boolean;
  stage4Cleared: boolean;
  stage5Cleared: boolean;
  stage6Cleared: boolean;
  stage7Cleared: boolean;
  stage8Cleared: boolean;
  stage9Cleared?: boolean;
  stage10Cleared?: boolean;
  [key: string]: boolean | undefined | null | object | string;
};

type StepState = "locked" | "accessible" | "current" | "cleared";

function getStepState(
  stage: StageDefinition,
  gateState: GateState,
  currentPath: string
): StepState {
  const isAccessible = gateState[stage.accessibleKey as keyof GateState] as boolean;
  const isCleared = gateState[stage.clearedKey as keyof GateState] as boolean;
  const isCurrent = currentPath === stage.route || currentPath.startsWith(stage.route + "?");

  if (isCurrent) return "current";
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

  return (
    <div className="flex items-center shrink-0">
      <button
        type="button"
        onClick={isClickable ? onClick : undefined}
        disabled={!isClickable}
        aria-current={state === "current" ? "step" : undefined}
        aria-label={`Stage ${stage.number}: ${stage.label}${state === "locked" ? " (locked)" : state === "cleared" ? " (completed)" : ""}`}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          // locked
          state === "locked" && "cursor-not-allowed text-muted-foreground/35 opacity-60",
          // accessible (not current, not cleared)
          state === "accessible" && "cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent/50",
          // current
          state === "current" && "cursor-pointer text-primary font-semibold bg-primary/10 ring-1 ring-primary/30",
          // cleared
          state === "cleared" && "cursor-pointer text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10",
        )}
        title={state === "locked" ? `Stage ${stage.number} is locked` : undefined}
      >
        {/* Badge */}
        <span
          className={cn(
            "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 transition-colors",
            state === "locked" && "bg-muted-foreground/15 text-muted-foreground/40",
            state === "accessible" && "bg-muted-foreground/20 text-muted-foreground",
            state === "current" && "bg-primary text-primary-foreground",
            state === "cleared" && "bg-emerald-500/20 text-emerald-400",
          )}
        >
          {state === "cleared" ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : state === "locked" ? (
            <Lock className="w-2.5 h-2.5" />
          ) : (
            stage.number
          )}
        </span>

        {/* Label — hidden on very small screens, short on sm, full on md+ */}
        <span className="hidden sm:inline md:hidden">{stage.shortLabel}</span>
        <span className="hidden md:inline">{stage.label}</span>
      </button>

      {/* Connector chevron */}
      {!isLast && (
        <ChevronRight
          className={cn(
            "w-3 h-3 shrink-0 mx-0.5",
            "text-muted-foreground/20"
          )}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StrategyTopNav() {
  const [location, setLocation] = useLocation();
  const navigate = setLocation;
  const { data: gateState, isLoading } = trpc.gate.getState.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Determine if we're on the strategy overview page
  const isOverview = location === "/strategy" || location === "/strategy/";

  // Fallback gate state while loading — everything locked except stage 1
  const effectiveGate: GateState = gateState ?? {
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
  };

  // Count cleared stages for the progress indicator
  const clearedCount = STAGES.filter(
    (s) => effectiveGate[s.clearedKey as keyof GateState] as boolean
  ).length;

  return (
    <nav
      aria-label="Strategy stages"
      className={cn(
        "sticky top-0 z-30",
        "border-b border-border/50",
        "bg-background/80 backdrop-blur-md",
        "shadow-sm shadow-black/10",
      )}
    >
      <div className="flex items-center gap-2 px-4 md:px-6 h-11">
        {/* Overview home link */}
        <button
          type="button"
          onClick={() => navigate("/strategy")}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 shrink-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            isOverview
              ? "text-primary font-semibold bg-primary/10 ring-1 ring-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-pointer",
          )}
          aria-current={isOverview ? "page" : undefined}
          aria-label="Strategy overview"
        >
          <span
            className={cn(
              "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0",
              isOverview
                ? "bg-primary text-primary-foreground"
                : "bg-muted-foreground/20 text-muted-foreground",
            )}
          >
            ⌂
          </span>
          <span className="hidden sm:inline">Overview</span>
        </button>

        <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground/20 mx-0.5" aria-hidden="true" />

        {/* Scrollable stage steps */}
        <div
          className="flex items-center overflow-x-auto scrollbar-none flex-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div className="flex items-center">
            {STAGES.map((stage, idx) => {
              const state = getStepState(stage, effectiveGate, location);
              return (
                <StageStep
                  key={stage.number}
                  stage={stage}
                  state={state}
                  isLast={idx === STAGES.length - 1}
                  onClick={() => navigate(stage.route)}
                />
              );
            })}
          </div>
        </div>

        {/* Progress pill — right side */}
        {!isLoading && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0 ml-2">
            <div className="flex gap-0.5">
              {STAGES.map((s) => {
                const cleared = effectiveGate[s.clearedKey as keyof GateState] as boolean;
                return (
                  <div
                    key={s.number}
                    className={cn(
                      "w-1 h-3 rounded-full transition-colors",
                      cleared ? "bg-emerald-500" : "bg-muted-foreground/15"
                    )}
                    aria-hidden="true"
                  />
                );
              })}
            </div>
            <span className="text-[10px] text-muted-foreground/50 font-medium tabular-nums">
              {clearedCount}/10
            </span>
          </div>
        )}
      </div>
    </nav>
  );
}
