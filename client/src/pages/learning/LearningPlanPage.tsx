/**
 * LearningPlanPage — v3 Rebuild
 * Implements manus_brief_individual_learning_plan_dashboard.md
 *
 * Sections:
 *   A. Hero strip: greeting + progress sentence (3 lifecycle states)
 *   B. Hero card: state-dependent direct-action card (START HERE / CONTINUE / COMPLETE)
 *   C. Domain cards grid: 6 cards sorted worst-to-best, whole card clickable, no buttons
 *   D. Domain drill-in modal: module list, statuses, highlighted next, empty/on-target states
 *   E. Activity strip: hidden in first-time state, compact counts in-progress/complete
 */
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  MessageSquare, Eye, Workflow, Users, Scale, Compass,
  BookOpen, Video, FileText, HelpCircle, Brain, Target, Layers,
  CheckCircle2, Check, Lock, Play, ArrowRight, X, MessageCircle,
  Sparkles, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DOMAIN_KEYS, DOMAIN_LABELS, DOMAIN_COLOURS, DOMAIN_BG_COLOURS } from "../../../../shared/brand";

// ─── Domain icon map (Tabler-semantic equivalents in Lucide) ─────────────────
const DOMAIN_ICONS: Record<string, React.ElementType> = {
  ai_interaction:         MessageSquare,  // ti-messages
  ai_output_evaluation:   Eye,            // ti-eye (Fix 5)
  ai_workflow_design:     Workflow,       // ti-route
  workforce_ai_readiness: Users,          // ti-users
  ai_ethics_trust:        Scale,          // ti-scale (Fix 5)
  ai_change_leadership:   Compass,        // ti-compass (Fix 5)
};

// ─── Score → level descriptor (bypasses DB enum like AI_READY) ─────────────────
function scoreToLevel(score: number | null): string | null {
  if (score === null || score <= 0) return null;
  const s = score / 10; // convert 0-100 to 0-10
  if (s >= 8.0) return "EXPERT";
  if (s >= 7.0) return "PROFICIENT";
  return "DEVELOPING";
}

// ─── Score bar fill: assessment score as percentage ──────────────────────────
function scoreToPct(score: number | null): number {
  if (!score || score <= 0) return 0;
  return Math.round(score); // score is 0-100, bar shows 0-100%
}

// ─── Module type labels ───────────────────────────────────────────────────────
const MODULE_TYPE_LABELS: Record<string, string> = {
  tutorial:   "Explainer",
  practical:  "Practical Activity",
  case_study: "Case Study",
  quiz:       "Knowledge Check",
  scenario:   "Scenario Practice",
  video:      "Video Lesson",
  reflection: "Guided Reflection",
  coaching:   "AI Coaching",
};
const MODULE_TYPE_ICONS: Record<string, React.ElementType> = {
  tutorial:   BookOpen,
  video:      Video,
  scenario:   FileText,
  coaching:   MessageSquare,
  practical:  HelpCircle,
  case_study: Brain,
  quiz:       Target,
  reflection: Layers,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function relativeAge(ts: number | null): string {
  if (!ts) return "";
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "last week";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

// Derive lifecycle state from plan data
type PlanState = "first-time" | "in-progress" | "complete";
function getPlanState(totalModules: number, completedModules: number): PlanState {
  if (totalModules === 0 || completedModules === 0) return "first-time";
  if (completedModules >= totalModules) return "complete";
  return "in-progress";
}

// ─── Module status icon ───────────────────────────────────────────────────────
function ModuleStatusIcon({ status, domainColour, isNext }: {
  status: string; domainColour: string; isNext: boolean;
}) {
  if (status === "completed")
    return <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: "#047857" }} aria-hidden="true" />;
  if (status === "locked")
    return <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" aria-hidden="true" />;
  if (isNext)
    return (
      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${domainColour}22` }}>
        <Play className="h-2.5 w-2.5" style={{ color: domainColour }} aria-hidden="true" />
      </div>
    );
  // available but not next
  return (
    <div className="w-4 h-4 rounded-full border border-border/50 flex-shrink-0" aria-hidden="true" />
  );
}

// ─── Hex to RGB helper for rgba tints ────────────────────────────────────────
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

// ─── Modal module row ─────────────────────────────────────────────────────────
function ModalModuleRow({
  item, isNext, domainColour, onStart, onReview,
}: {
  item: any; isNext: boolean; domainColour: string;
  onStart: () => void; onReview: () => void;
}) {
  const mod = item.module ?? {};
  const isCompleted = item.status === "completed";
  const isLocked = item.status === "locked";
  const TypeIcon = MODULE_TYPE_ICONS[mod.modality] ?? BookOpen;
  const typeLabel = MODULE_TYPE_LABELS[mod.modality] ?? mod.modality ?? "Module";
  const durationLabel = mod.durationMins ? `${mod.durationMins} min` : null;
  const statusText = isCompleted ? "Completed" : isLocked ? "Locked" : isNext ? "Up next" : "Available";

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-5 py-3.5 transition-colors",
        isLocked && "opacity-40",
      )}
      style={isNext ? { backgroundColor: `rgba(${hexToRgb(domainColour)}, 0.04)` } : undefined}
    >
      {/* Status icon */}
      <div className="flex-shrink-0 mt-0.5">
        {isCompleted ? (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${domainColour}22`, border: `1.5px solid ${domainColour}` }}
          >
            <Check className="h-2.5 w-2.5" style={{ color: domainColour }} />
          </div>
        ) : isLocked ? (
          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-muted/30">
            <Lock className="h-2.5 w-2.5 text-muted-foreground" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border border-border/50 bg-transparent" />
        )}
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-[13px] leading-snug",
          isNext ? "font-semibold text-foreground" : isCompleted ? "font-medium text-muted-foreground" : "font-medium text-foreground/80",
        )}>
          {mod.title ?? "Module"}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
          <TypeIcon className="h-2.5 w-2.5 flex-shrink-0" aria-hidden="true" />
          <span>{typeLabel}</span>
          {durationLabel && <><span>·</span><span>{durationLabel}</span></>}
          <span>·</span>
          <span>{statusText}</span>
        </p>
      </div>
      {/* CTA */}
      {isCompleted ? (
        <button
          onClick={onReview}
          className="text-[12px] font-medium text-foreground/70 hover:text-foreground underline underline-offset-2 flex-shrink-0 mt-0.5"
        >
          Review
        </button>
      ) : isLocked ? null : isNext ? (
        <button
          onClick={onStart}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-md flex-shrink-0 mt-0.5 transition-colors"
          style={{ backgroundColor: `rgba(${hexToRgb(domainColour)}, 0.12)`, color: domainColour }}
        >
          Start
        </button>
      ) : (
        <button
          onClick={onStart}
          className="text-[12px] font-medium text-foreground hover:text-foreground/70 underline underline-offset-2 flex-shrink-0 mt-0.5"
        >
          Start
        </button>
      )}
    </div>
  );
}

// ─── Domain drill-in modal ────────────────────────────────────────────────────
function DomainModal({
  domainKey, items, nextItemId, domainScore, targetScore, levelLabel, growthArea,
  onClose, onStart,
}: {
  domainKey: string; items: any[]; nextItemId: string | null;
  domainScore: number | null; targetScore: number | null; levelLabel: string | null; growthArea: string | null;
  onClose: () => void; onStart: (item: any) => void;
}) {
  const [, setLocation] = useLocation();
  const label = DOMAIN_LABELS[domainKey as keyof typeof DOMAIN_LABELS] ?? domainKey;
  const colour = DOMAIN_COLOURS[domainKey as keyof typeof DOMAIN_COLOURS] ?? "#4477AA";
  const DomainIcon = DOMAIN_ICONS[domainKey] ?? BookOpen;
  const completedCount = items.filter(i => i.status === "completed").length;
  const totalCount = items.length;
  const scoreDisplay = domainScore !== null && domainScore > 0
    ? (domainScore / 10).toFixed(1)
    : null;

  // Determine modal state — use targetScore from gap analysis; fall back to 80 if unavailable
  const hasModules = totalCount > 0;
  const isOnTarget = !hasModules && domainScore !== null
    ? (targetScore !== null ? domainScore >= targetScore : domainScore >= 80)
    : false;
  const isEmpty = !hasModules && !isOnTarget;

  // Focus trap
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${label} learning modules`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        ref={modalRef}
        className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        {/* Header — mirrors card: icon + title left, score + level stacked right, X rightmost */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 flex-shrink-0">
          {/* Domain icon */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${colour}22` }}
            aria-hidden="true"
          >
            <DomainIcon className="h-4.5 w-4.5" style={{ color: colour }} />
          </div>
          {/* Title — left, fills remaining space */}
          <h2 className="flex-1 min-w-0 text-[15px] font-semibold text-foreground leading-tight">{label}</h2>
          {/* Score + level — stacked right, mirrors card */}
          {scoreDisplay && (
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="text-[16px] font-medium tabular-nums text-foreground leading-none">{scoreDisplay}</span>
              {levelLabel && (
                <span className="text-[9px] font-semibold uppercase text-muted-foreground mt-1" style={{ letterSpacing: "0.06em" }}>
                  {levelLabel}
                </span>
              )}
            </div>
          )}
          {/* Close button — neutral outline (P2) */}
          <button
            ref={closeRef}
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 border border-border/60"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {hasModules ? (
            <>
              {/* Progress bar — full width, prominent */}
              <div className="px-5 pb-4">
                <div className="flex items-center gap-3 mb-1.5">
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: `${colour}22` }}
                    role="progressbar"
                    aria-valuenow={completedCount}
                    aria-valuemin={0}
                    aria-valuemax={totalCount}
                    aria-valuetext={`${completedCount} of ${totalCount} modules done`}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: totalCount > 0 ? `${Math.round((completedCount / totalCount) * 100)}%` : "0%",
                        backgroundColor: colour,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums flex-shrink-0 whitespace-nowrap">
                    {completedCount} of {totalCount} modules done
                  </span>
                </div>
              </div>
              {/* Module list */}
              <div className="pb-2">
                {items.map((item: any) => (
                  <ModalModuleRow
                    key={item.id}
                    item={item}
                    isNext={item.id === nextItemId}
                    domainColour={colour}
                    onStart={() => { onClose(); onStart(item); }}
                    onReview={() => { onClose(); onStart(item); }}
                  />
                ))}
              </div>
            </>
          ) : isOnTarget ? (
            <div className="px-5 py-8 text-center space-y-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto"
                style={{ backgroundColor: `${colour}18` }}
              >
                <CheckCircle2 className="h-5 w-5" style={{ color: colour }} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">You're on target</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No modules in your plan — your current capability meets the requirement for this domain.
                </p>
                {growthArea && (
                  <p className="text-xs text-muted-foreground mt-2 italic">"{growthArea}"</p>
                )}
              </div>
              <button
                onClick={() => { onClose(); setLocation("/learning/library"); }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Browse {label} modules to extend →
              </button>
            </div>
          ) : (
            /* Empty priority state */
            <div className="px-5 py-8 text-center space-y-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto"
                style={{ backgroundColor: `${colour}18` }}
              >
                <DomainIcon className="h-5 w-5" style={{ color: colour }} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No modules in your plan yet</p>
                {growthArea && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Assessment growth area: <span className="text-foreground">{growthArea}</span>
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Your L&D team can add modules for this domain to your plan.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => { onClose(); }}
                >
                  Talk to your L&D team →
                </button>
                <button
                  onClick={() => { onClose(); setLocation("/learning/library"); }}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                >
                  Browse {label} in the library →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {hasModules && (
          <div className="px-5 py-3 border-t border-border/30 flex-shrink-0">
            <button
              onClick={() => { onClose(); setLocation("/learning/library"); }}
              className="text-[12px] font-medium text-foreground underline underline-offset-2 hover:text-foreground/70"
            >
              Browse more modules in {label} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Domain card ──────────────────────────────────────────────────────────────
function DomainCard({
  domainKey, items, nextItemId, domainScore, targetScore, onClick,
}: {
  domainKey: string; items: any[]; nextItemId: string | null;
  domainScore: number | null; targetScore: number | null;
  onClick: () => void;
}) {
  const label = DOMAIN_LABELS[domainKey as keyof typeof DOMAIN_LABELS] ?? domainKey;
  const colour = DOMAIN_COLOURS[domainKey as keyof typeof DOMAIN_COLOURS] ?? "#4477AA";
  const DomainIcon = DOMAIN_ICONS[domainKey] ?? BookOpen;
  const completedCount = items.filter(i => i.status === "completed").length;
  const totalCount = items.length;
  // Bar shows assessment score (Fix 8: score × 10 % = score/10 × 100%)
  const barPct = scoreToPct(domainScore);
  // Score display without /10 suffix (Fix 6)
  const scoreDisplay = domainScore !== null && domainScore > 0
    ? (domainScore / 10).toFixed(1)
    : null;
  // Level descriptor from score (Fix 2 + 7: quiet, stacked right)
  const levelUpper = scoreToLevel(domainScore);

  // Card state text (Fix 4: On-target vs No-modules based on score vs target)
  const isOnTarget = totalCount === 0 && domainScore !== null
    ? (targetScore !== null ? domainScore >= targetScore : domainScore >= 80)
    : false;
  let statusText: string;
  let statusItalic = false;
  if (totalCount === 0 && isOnTarget) {
    statusText = "On target";
  } else if (totalCount === 0) {
    statusText = "No modules yet";
    statusItalic = true;
  } else {
    statusText = `${completedCount} of ${totalCount} modules done`;
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-border/60 overflow-hidden transition-all cursor-pointer hover:border-border hover:bg-muted/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`${label} — ${statusText}. Click to view modules.`}
    >
      {/* Card header */}
      <div className="px-5 pt-4 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Icon in tinted box — 26×26, rgba(colour, 0.15) = colour + '26' */}
            <div
              className="w-[26px] h-[26px] rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: `${colour}26` }}
              aria-hidden="true"
            >
              <DomainIcon className="h-3.5 w-3.5" style={{ color: colour }} />
            </div>
            <h3 className="text-[13px] font-semibold text-foreground leading-snug pt-0.5">{label}</h3>
          </div>
          {/* Score + level — right-aligned, stacked (Fix 6 + 7) */}
          {scoreDisplay && (
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="text-[16px] font-medium tabular-nums text-foreground leading-none">
                {scoreDisplay}
              </span>
              {levelUpper && (
                <span
                  className="text-[9px] font-semibold uppercase text-muted-foreground mt-1"
                  style={{ letterSpacing: "0.06em" }}
                >
                  {levelUpper}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar — always rendered, shows assessment score % (Fix 3 + 8) */}
      <div className="px-5 pt-2.5 pb-0">
        <div
          className="h-1 rounded-sm overflow-hidden"
          style={{ backgroundColor: `${colour}20` }}
          role="progressbar"
          aria-valuenow={barPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${scoreDisplay ?? "?"}/10 — ${statusText}`}
        >
          <div
            className="h-full rounded-sm transition-all duration-500"
            style={{ width: `${barPct}%`, backgroundColor: colour }}
          />
        </div>
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-between px-5 pt-2.5 pb-4">
        <span className={`text-[11px] text-muted-foreground${statusItalic ? " italic" : ""}`}>{statusText}</span>
        <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-0.5">
          View <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </span>
      </div>
    </button>
  );
}

// ─── Hero card ────────────────────────────────────────────────────────────────
function HeroCard({
  planState, nextItem, totalModules, completedModules, lastAssessedAt,
  onAction,
}: {
  planState: PlanState; nextItem: any | null; totalModules: number;
  completedModules: number; lastAssessedAt: number | null;
  onAction: () => void;
}) {
  const mod = nextItem?.module ?? {};
  const domainKey = mod.capability ?? "";
  const colour = DOMAIN_COLOURS[domainKey as keyof typeof DOMAIN_COLOURS] ?? "var(--primary)";
  const DomainIcon = DOMAIN_ICONS[domainKey] ?? BookOpen;

  if (planState === "first-time") {
    return (
      <button
        onClick={onAction}
        className="w-full text-left p-5 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Start your first module"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">
              START HERE
            </p>
            <p className="text-sm font-semibold text-foreground truncate">
              {mod.title ?? "Begin your learning plan"}
            </p>
            {mod.durationMins && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Module 1 of {totalModules} · {mod.durationMins} min
              </p>
            )}
          </div>
          <ArrowRight className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
        </div>
      </button>
    );
  }

  if (planState === "complete") {
    const ageText = lastAssessedAt ? `Last assessed ${relativeAge(lastAssessedAt)}` : null;
    return (
      <button
        onClick={onAction}
        className="w-full text-left p-5 rounded-2xl border border-[#047857]/30 bg-[#047857]/5 hover:bg-[#047857]/8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857]"
        aria-label="Plan complete — start reassessment"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#047857]/15 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-5 w-5 text-[#047857]" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-[#047857] uppercase tracking-widest mb-0.5">
              PLAN COMPLETE — TIME TO REASSESS
            </p>
            <p className="text-sm font-semibold text-foreground">
              {completedModules} modules completed
            </p>
            {ageText && (
              <p className="text-xs text-muted-foreground mt-0.5">{ageText}</p>
            )}
          </div>
          <ArrowRight className="h-5 w-5 text-[#047857] flex-shrink-0" aria-hidden="true" />
        </div>
      </button>
    );
  }

  // in-progress
  const isResume = nextItem?.status === "in_progress";
  return (
    <button
      onClick={onAction}
      className="w-full text-left p-5 rounded-2xl border border-border/60 bg-card hover:border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`${isResume ? "Resume" : "Continue"}: ${mod.title ?? "next module"}`}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${colour}1a` }}
        >
          <DomainIcon className="h-5 w-5" style={{ color: colour }} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
            style={{ color: colour }}
          >
            CONTINUE LEARNING
          </p>
          <p className="text-sm font-semibold text-foreground truncate">
            {isResume ? "Resume: " : ""}{mod.title ?? "Next module"}
          </p>
          {mod.durationMins && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {DOMAIN_LABELS[domainKey as keyof typeof DOMAIN_LABELS] ?? domainKey}
              {" · "}{mod.durationMins} min
            </p>
          )}
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
      </div>
    </button>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-5" aria-busy="true" aria-label="Loading learning plan">
      {/* Hero strip skeleton */}
      <div className="space-y-1.5">
        <div className="h-6 w-48 rounded-md bg-muted/40 animate-pulse" />
        <div className="h-4 w-80 rounded-md bg-muted/30 animate-pulse" />
      </div>
      {/* Hero card skeleton */}
      <div className="h-20 rounded-2xl bg-muted/30 animate-pulse" />
      {/* Section heading skeleton */}
      <div className="h-4 w-40 rounded-md bg-muted/30 animate-pulse" />
      {/* Domain cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-28 rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LearningPlanPage() {
  const [, setLocation] = useLocation();
  const [modalDomain, setModalDomain] = useState<string | null>(null);

  const { data: plan, isLoading: planLoading, error: planError, refetch: refetchPlan } =
    trpc.adaptiveLearning.getAdaptivePlan.useQuery({}, { staleTime: 1000 * 60 * 2 });

  const { data: dashData, isLoading: dashLoading } =
    trpc.dashboardV2.individual.main.useQuery(undefined, { staleTime: 1000 * 60 * 5, retry: false });

  const { data: dashboardCtx, isLoading: ctxLoading } =
    trpc.adaptiveLearning.getLearningDashboard.useQuery(undefined, { staleTime: 1000 * 60 * 3 });

  const { data: completionsData } =
    trpc.adaptiveLearning.getRecentCompletions.useQuery(undefined, { staleTime: 1000 * 60 * 3 });

  const { data: coachingConvs } =
    trpc.adaptiveLearning.getActiveCoachingConversations.useQuery(undefined, { staleTime: 1000 * 60 * 3 });

  const isLoading = planLoading || dashLoading || ctxLoading;

  // ── Derived data ────────────────────────────────────────────────────────────
  const items: any[] = plan?.items ?? [];
  const totalModules = items.length;
  const completedModules = items.filter(i => i.status === "completed").length;
  const planState = getPlanState(totalModules, completedModules);

  const nextItem = useMemo(
    () => items.find(i => i.status === "in_progress" || i.status === "available") ?? null,
    [items]
  );

  // Group items by domain
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    DOMAIN_KEYS.forEach(k => map.set(k, []));
    for (const item of items) {
      const cap = item.module?.capability ?? "unknown";
      if (!map.has(cap)) map.set(cap, []);
      map.get(cap)!.push(item);
    }
    return map;
  }, [items]);

  // Domain scores from dashboardV2 (0–100 integers)
  const domainMap = useMemo(() => {
    const map: Record<string, { score: number; rating: string }> = {};
    for (const d of (dashData?.domains ?? [])) map[d.key] = { score: d.score, rating: d.rating };
    return map;
  }, [dashData]);

  // Target score map from gapHeatmap (0-100 scale); null when no benchmark exists
  const targetScoreMap = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const g of (dashData?.gapHeatmap ?? [])) {
      if (g.domain) map[g.domain] = g.targetScore ?? null;
    }
    return map;
  }, [dashData]);

  // Focus domain name for in-progress progress sentence
  const focusDomainName = useMemo(() => {
    if (!nextItem?.module?.capability) return null;
    return DOMAIN_LABELS[nextItem.module.capability as keyof typeof DOMAIN_LABELS] ?? null;
  }, [nextItem]);

  // Sort domains worst-to-best by score (ascending)
  const sortedDomainKeys = useMemo(() => {
    return [...DOMAIN_KEYS].sort((a, b) => {
      const sa = domainMap[a]?.score ?? 0;
      const sb = domainMap[b]?.score ?? 0;
      return sa - sb; // ascending = worst first
    });
  }, [domainMap]);

  const firstName = dashboardCtx?.firstName ?? "";
  const greeting = planState === "first-time" ? "Welcome" : getGreeting();

  // Progress sentence (Fix 1: state-aware with focus domain)
  const progressSentence = useMemo(() => {
    if (planState === "first-time") {
      return `Your learning plan is ready — ${totalModules} module${totalModules !== 1 ? "s" : ""} curated from your recent assessment.`;
    }
    if (planState === "complete") {
      return `You've completed all ${totalModules} modules in your plan.`;
    }
    const focusPart = focusDomainName ? ` Current focus: ${focusDomainName}.` : "";
    return `You're ${completedModules} of ${totalModules} modules into your plan.${focusPart}`;
  }, [planState, totalModules, completedModules, focusDomainName]);

  // Activity strip visibility
  const modulesLast30 = completionsData?.totalLast30Days ?? 0;
  const coachingCount = coachingConvs?.length ?? 0;
  const showActivityStrip = planState !== "first-time" && (modulesLast30 > 0 || coachingCount > 0);

  // Telemetry: dashboard viewed
  useEffect(() => {
    if (!isLoading) {
      // telemetry: learning.dashboard.viewed
      console.debug("[telemetry] learning.dashboard.viewed", { state: planState, modulesCompleted: completedModules, totalModules });
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDomainCardClick = useCallback((domainKey: string) => {
    console.debug("[telemetry] learning.domain.card.clicked", { domain: domainKey, cardState: planState });
    setModalDomain(domainKey);
  }, [planState]);

  const handleModalClose = useCallback(() => {
    setModalDomain(null);
  }, []);

  const handleHeroAction = useCallback(() => {
    console.debug("[telemetry] learning.hero.clicked", { state: planState, moduleId: nextItem?.moduleId });
    if (planState === "complete") {
      setLocation("/assessment");
    } else if (nextItem) {
      setLocation(`/learning/module/${nextItem.moduleId}?planItemId=${nextItem.id}`);
    }
  }, [planState, nextItem, setLocation]);

  const handleModuleStart = useCallback((item: any) => {
    setLocation(`/learning/module/${item.moduleId}?planItemId=${item.id}`);
  }, [setLocation]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) return <PageSkeleton />;

  // ── Error ───────────────────────────────────────────────────────────────────
  if (planError) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
        <p className="text-sm text-muted-foreground">Could not load your learning plan.</p>
        <button
          onClick={() => refetchPlan()}
          className="text-sm font-medium text-primary hover:underline"
        >
          Try again →
        </button>
      </div>
    );
  }

  // ── No plan ─────────────────────────────────────────────────────────────────
  if (!plan || totalModules === 0) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <BookOpen className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-1">No learning plan yet</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Complete an assessment to get a personalised plan tailored to your capability gaps.
          </p>
        </div>
        <button
          onClick={() => setLocation("/assessment")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Start assessment →
        </button>
      </div>
    );
  }

  // ── Modal data ──────────────────────────────────────────────────────────────
  const modalItems = modalDomain ? (grouped.get(modalDomain) ?? []) : [];
  const modalNextItemId = modalDomain
    ? (modalItems.find(i => nextItem && i.id === nextItem.id)?.id ?? null)
    : null;
  const modalDomainScore = modalDomain ? (domainMap[modalDomain]?.score ?? null) : null;
  const modalTargetScore = modalDomain ? (targetScoreMap[modalDomain] ?? null) : null;
  // Use score-based level for modal (bypasses DB enum like AI_READY)
  const modalLevelLabel = scoreToLevel(modalDomainScore);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* A. Hero strip — 0.5px tertiary bottom border, pt-3 above, mb-5 below */}
        <div
          className="pb-3 mb-5"
          style={{ borderBottom: "0.5px solid hsl(var(--border))" }}
        >
          <h1 className="text-xl font-semibold text-foreground">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{progressSentence}</p>
        </div>

        {/* B. Hero card */}
        <HeroCard
          planState={planState}
          nextItem={nextItem}
          totalModules={totalModules}
          completedModules={completedModules}
          lastAssessedAt={(dashboardCtx as any)?.lastAssessedAt ?? null}
          onAction={handleHeroAction}
        />

        {/* C. Domain cards grid */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
            Your domains · What needs attention first
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sortedDomainKeys.map(domainKey => (
              <DomainCard
                key={domainKey}
                domainKey={domainKey}
                items={grouped.get(domainKey) ?? []}
                nextItemId={nextItem?.id ?? null}
                domainScore={domainMap[domainKey]?.score ?? null}
                targetScore={targetScoreMap[domainKey] ?? null}
                onClick={() => handleDomainCardClick(domainKey)}
              />
            ))}
          </div>
        </div>

        {/* E. Activity strip */}
        {showActivityStrip && (
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl border border-border/50">
            <div className="flex items-center gap-6">
              <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#047857]" aria-hidden="true" />
                <strong className="text-foreground">{modulesLast30}</strong>
                {" "}module{modulesLast30 !== 1 ? "s" : ""} completed in the last 30 days
              </span>
              {coachingCount > 0 && (
                <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <strong className="text-foreground">{coachingCount}</strong>
                  {" "}AI coaching conversation{coachingCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                console.debug("[telemetry] learning.activity-see-all.clicked");
                setLocation("/learning/activity");
              }}
              className="text-[12px] font-medium text-foreground underline underline-offset-[3px] hover:text-foreground/80 flex-shrink-0"
            >
              See full activity →
            </button>
          </div>
        )}

      </div>

      {/* D. Domain drill-in modal */}
      {modalDomain && (
        <DomainModal
          domainKey={modalDomain}
          items={modalItems}
          nextItemId={modalNextItemId}
          domainScore={modalDomainScore}
          targetScore={modalTargetScore}
          levelLabel={modalLevelLabel}
          growthArea={null}
          onClose={handleModalClose}
          onStart={handleModuleStart}
        />
      )}
    </>
  );
}
