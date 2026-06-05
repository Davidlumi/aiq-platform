/**
 * StageProgressHeader — prominent top-of-page banner for every strategy stage.
 *
 * Shows:
 *   - Stage number badge + title
 *   - What the user needs to do (task description)
 *   - Status pill: In Progress / Complete / Needs Re-confirmation
 *   - Back button (navigates to previous stage)
 *   - Primary CTA: "Confirm & Continue →" (disabled until canConfirm)
 *     or "Re-confirm →" when stage was edited after clearing
 *     or "Continue →" when already cleared and not edited
 *
 * Usage:
 *   <StageProgressHeader
 *     stageNumber={2}
 *     title="Vision Statement"
 *     description="Review your AI-drafted vision statement, refine it, then confirm to unlock Stage 3."
 *     isCleared={gate.stage2Cleared}
 *     isEdited={gate.stage2EditedAfterClearing}
 *     canConfirm={wordCount >= 20 && !isPending}
 *     isPending={completeStage2.isPending}
 *     onConfirm={handleConfirm}
 *     backRoute="/strategy/diagnostic"
 *     nextRoute="/strategy/strategy"
 *     nextLabel="Strategy"
 *   />
 */
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export interface StageProgressHeaderProps {
  stageNumber: number;
  title: string;
  /** One sentence describing what the user must do on this stage */
  description: string;
  /** True when the stage gate has been cleared (confirmed) */
  isCleared: boolean;
  /** True when the stage was cleared but later edited — needs re-confirmation */
  isEdited?: boolean;
  /** True when the confirm action is allowed (all required fields filled) */
  canConfirm: boolean;
  /** True while the confirm mutation is in flight */
  isPending?: boolean;
  /** Called when the user clicks the confirm / re-confirm CTA */
  onConfirm: () => void;
  /** Route to navigate to when the user clicks Back */
  backRoute?: string;
  /** Route to navigate to after the stage is cleared (shown as "Continue →" when already cleared) */
  nextRoute?: string;
  /** Label of the next stage (e.g. "Strategy") */
  nextLabel?: string;
  /** Optional extra class on the outer wrapper */
  className?: string;
}

type StatusVariant = "in-progress" | "cleared" | "edited";

function StatusPill({ variant }: { variant: StatusVariant }) {
  if (variant === "cleared") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Complete
      </span>
    );
  }
  if (variant === "edited") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
        <AlertTriangle className="w-3.5 h-3.5" />
        Needs re-confirmation
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/12 text-primary border border-primary/25">
      <Clock className="w-3.5 h-3.5" />
      In progress
    </span>
  );
}

export default function StageProgressHeader({
  stageNumber,
  title,
  description,
  isCleared,
  isEdited = false,
  canConfirm,
  isPending = false,
  onConfirm,
  backRoute,
  nextRoute,
  nextLabel,
  className,
}: StageProgressHeaderProps) {
  const [, navigate] = useLocation();

  const statusVariant: StatusVariant =
    isEdited ? "edited" : isCleared ? "cleared" : "in-progress";

  // Determine CTA label and intent
  const ctaLabel = isEdited
    ? "Re-confirm"
    : isCleared
    ? `Continue to ${nextLabel ?? "next step"}`
    : "Confirm & continue";

  const ctaIcon = isEdited ? (
    <RefreshCw className="w-4 h-4" />
  ) : (
    <ArrowRight className="w-4 h-4" />
  );

  // When already cleared and not edited, the primary action is "Continue →" (navigate)
  // When in-progress or edited, the primary action is "Confirm" (mutation)
  const handleCTA = () => {
    if (isCleared && !isEdited && nextRoute) {
      navigate(nextRoute);
    } else {
      onConfirm();
    }
  };

  // Background accent based on status
  const bannerBg =
    statusVariant === "cleared"
      ? "bg-emerald-950/30 border-emerald-500/20"
      : statusVariant === "edited"
      ? "bg-amber-950/30 border-amber-500/20"
      : "bg-primary/5 border-primary/15";

  return (
    <div
      className={cn(
        "rounded-xl border px-5 py-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4",
        bannerBg,
        className
      )}
    >
      {/* Left: stage badge + text */}
      <div className="flex items-start gap-4 flex-1 min-w-0">
        {/* Stage number badge */}
        <div
          className={cn(
            "flex items-center justify-center w-11 h-11 rounded-xl text-lg font-bold shrink-0 shadow-sm",
            statusVariant === "cleared" && "bg-emerald-500/20 text-emerald-400",
            statusVariant === "edited"  && "bg-amber-500/20 text-amber-400",
            statusVariant === "in-progress" && "bg-primary/20 text-primary",
          )}
        >
          {statusVariant === "cleared" ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : statusVariant === "edited" ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            stageNumber
          )}
        </div>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground/50">
              Stage {stageNumber} of 11
            </span>
            <StatusPill variant={statusVariant} />
          </div>
          <h2 className="text-base font-semibold text-foreground leading-snug">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          {isEdited && (
            <p className="text-xs text-amber-400 mt-1 font-medium">
              You edited this stage after confirming it. Re-confirm to keep downstream stages in sync.
            </p>
          )}
        </div>
      </div>

      {/* Right: back + CTA */}
      <div className="flex items-center gap-2 shrink-0 sm:flex-col sm:items-end">
        {/* Primary CTA */}
        <Button
          onClick={handleCTA}
          disabled={(!isCleared && !canConfirm) || isPending}
          size="sm"
          className={cn(
            "gap-2 font-semibold text-sm px-4 h-9 shadow-sm",
            statusVariant === "cleared" && !isEdited
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : statusVariant === "edited"
              ? "bg-amber-600 hover:bg-amber-500 text-white"
              : "bg-primary hover:bg-primary/90 text-primary-foreground",
          )}
        >
          {isPending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            ctaIcon
          )}
          {isPending ? "Saving…" : ctaLabel}
        </Button>

        {/* Back link */}
        {backRoute && (
          <button
            type="button"
            onClick={() => navigate(backRoute)}
            className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back
          </button>
        )}
      </div>
    </div>
  );
}
