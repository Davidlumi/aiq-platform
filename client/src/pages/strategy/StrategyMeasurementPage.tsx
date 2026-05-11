/**
 * StrategyMeasurementPage — /strategy/measurement
 * Section 06: How we'll measure progress
 *
 * Blocks:
 *  1. Hero — Countdown + cadence pill (inline-editable, full-payload save)
 *  2. Review schedule timeline (horizontal, scrollable on mobile)
 *  3. What each review checks (4 rows with cross-links)
 *  4. When we review (scheduled paragraph + 3 trigger rows)
 *  5. Methodology (collapsible)
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  ArrowRight, CalendarDays, Sparkles, BarChart3,
  TrendingUp, ShieldAlert, Activity,
} from "lucide-react";
import { MEASUREMENT_CADENCE_OPTIONS } from "@/../../shared/strategyInputs";
import { toast } from "sonner";
import SectionPageLayout from "@/components/SectionPageLayout";

// ─── Types ────────────────────────────────────────────────────────────────────
type CadenceValue = "monthly_quarterly_annual" | "quarterly_annual" | "biannual" | "annual" | "other_custom";

interface ReviewMarker {
  index: number;
  date: Date;
  completed: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CADENCE_INTERVAL_MONTHS: Record<CadenceValue, number> = {
  monthly_quarterly_annual: 3,
  quarterly_annual: 3,
  biannual: 6,
  annual: 12,
  other_custom: 6,
};

const CADENCE_SHORT_LABEL: Record<CadenceValue, string> = {
  monthly_quarterly_annual: "Quarterly",
  quarterly_annual: "Quarterly",
  biannual: "Twice-yearly",
  annual: "Annual",
  other_custom: "Custom",
};

const CADENCE_RATIONALE: Record<CadenceValue, string> = {
  monthly_quarterly_annual:
    "Monthly KPI tracking with quarterly reviews — chosen to keep the strategy responsive to fast-moving capability shifts and to catch phase transitions before initiatives commit.",
  quarterly_annual:
    "Quarterly reviews with an annual full re-assessment — balancing operational cadence with strategic depth, and aligning to most organisations' planning cycles.",
  biannual:
    "Twice-yearly reviews — chosen to align with typical HR planning cycles and to catch each phase transition before initiatives commit.",
  annual:
    "Annual review only — appropriate for organisations with stable capability baselines and longer-horizon transformation programmes.",
  other_custom:
    "Custom cadence — defined during the strategy build to match your organisation's specific governance and reporting rhythm.",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function computeReviewMarkers(
  startDate: Date,
  endDate: Date,
  cadenceMonths: number,
  now: Date,
): ReviewMarker[] {
  const markers: ReviewMarker[] = [];
  let current = addMonths(startDate, cadenceMonths);
  let index = 1;
  while (current <= endDate) {
    markers.push({ index, date: new Date(current), completed: current < now });
    current = addMonths(current, cadenceMonths);
    index++;
  }
  return markers;
}

function computeCountdown(
  markers: ReviewMarker[],
  now: Date,
): { daysRemaining: number; reviewIndex: number } | null {
  const next = markers.find(m => !m.completed);
  if (!next) return null;
  const ms = next.date.getTime() - now.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  return { daysRemaining: days, reviewIndex: next.index };
}

type UrgencyState = "default" | "approaching" | "this-week" | "today" | "overdue";

function getUrgencyState(days: number): UrgencyState {
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "this-week";
  if (days <= 14) return "approaching";
  return "default";
}

// ─── Skeleton / Error helpers ─────────────────────────────────────────────────

function CountdownSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/2 p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-14 w-32 rounded-lg" />
          <Skeleton className="h-4 w-48 rounded" />
          <Skeleton className="h-3 w-36 rounded" />
        </div>
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/2 p-6">
      <Skeleton className="h-5 w-40 mb-6 rounded" />
      <div className="relative h-12 flex items-center">
        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-white/8 rounded" />
        {[0, 25, 50, 75, 100].map(pct => (
          <div key={pct} className="absolute -translate-x-1/2" style={{ left: `${pct}%` }}>
            <div className="w-3 h-3 rounded-full border border-white/20 bg-background" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewChecksSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/2 p-6">
      <Skeleton className="h-5 w-48 mb-4 rounded" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-48 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockError({ message }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-sm text-red-400">{message ?? "Failed to load this block. You can still navigate away."}</p>
    </div>
  );
}

// ─── Cadence dropdown ─────────────────────────────────────────────────────────

interface CadencePillProps {
  currentCadence: CadenceValue;
  onSave: (value: CadenceValue) => Promise<void>;
  saving: boolean;
  savedAt: Date | null;
  saveError: string | null;
}

function CadencePill({ currentCadence, onSave, saving, savedAt, saveError }: CadencePillProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(o => !o); }
  }

  async function handleSelect(value: CadenceValue) {
    setOpen(false);
    (window as any).umami?.track("strategy.measurement.cadence.changed", { from: currentCadence, to: value });
    await onSave(value);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Review cadence: ${CADENCE_SHORT_LABEL[currentCadence]}. Click to change.`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-xs font-semibold text-foreground hover:border-white/30 hover:bg-white/8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        onClick={() => { const next = !open; setOpen(next); if (next) (window as any).umami?.track("strategy.measurement.cadence.opened"); }}
        onKeyDown={handleKeyDown}
        disabled={saving}
      >
        <CalendarDays className="w-3 h-3" aria-hidden="true" />
        {CADENCE_SHORT_LABEL[currentCadence]}
        <ChevronDown className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Review cadence options"
          className="absolute right-0 top-full mt-1 z-50 w-72 rounded-xl border border-white/15 bg-popover shadow-xl overflow-hidden"
        >
          {MEASUREMENT_CADENCE_OPTIONS.map(opt => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === currentCadence}
              className={`px-4 py-3 text-xs cursor-pointer transition-colors hover:bg-white/8 ${
                opt.value === currentCadence ? "text-foreground font-semibold bg-white/5" : "text-muted-foreground"
              }`}
              onClick={() => handleSelect(opt.value as CadenceValue)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handleSelect(opt.value as CadenceValue); }}
              tabIndex={0}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-1.5 h-4 text-[10px]">
        {saving && <span className="text-muted-foreground">Saving…</span>}
        {!saving && savedAt && !saveError && (
          <span className="text-emerald-400">
            Saved {savedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        {!saving && saveError && <span className="text-red-400">{saveError}</span>}
      </div>
    </div>
  );
}

// ─── Block 1: Countdown hero ──────────────────────────────────────────────────

interface CountdownHeroProps {
  countdown: { daysRemaining: number; reviewIndex: number } | null;
  cadence: CadenceValue;
  noReviewScheduled: boolean;
  strategyConcluded: boolean;
  onOpenCadence: () => void;
  cadencePill: React.ReactNode;
}

function CountdownHero({ countdown, noReviewScheduled, strategyConcluded, onOpenCadence, cadencePill }: CountdownHeroProps) {
  const urgency = countdown ? getUrgencyState(countdown.daysRemaining) : "default";

  const urgencyColor: Record<UrgencyState, string> = {
    default: "text-foreground",
    approaching: "text-amber-400",
    "this-week": "text-amber-400",
    today: "text-amber-400",
    overdue: "text-red-400",
  };

  const urgencySuffix: Record<UrgencyState, string> = {
    default: "",
    approaching: " approaching",
    "this-week": " this week",
    today: "",
    overdue: "",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/2 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {strategyConcluded ? (
            <p className="text-2xl font-bold text-muted-foreground">Strategy concluded</p>
          ) : noReviewScheduled ? (
            <div>
              <p className="text-base font-semibold text-muted-foreground mb-2">Next review: not scheduled</p>
              <button
                type="button"
                className="text-xs text-blue-400 underline underline-offset-2 hover:text-blue-300"
                onClick={onOpenCadence}
              >
                Schedule first review
              </button>
            </div>
          ) : countdown ? (
            <div>
              {urgency === "overdue" ? (
                <div>
                  <p className={`text-5xl font-bold tabular-nums leading-none mb-1 ${urgencyColor.overdue}`}>
                    Overdue by {Math.abs(countdown.daysRemaining)} day{Math.abs(countdown.daysRemaining) !== 1 ? "s" : ""}
                  </p>
                  <p className={`text-sm font-medium ${urgencyColor.overdue}`}>
                    Review {countdown.reviewIndex}{" · "}
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:opacity-80"
                      onClick={onOpenCadence}
                    >
                      Reschedule
                    </button>
                  </p>
                </div>
              ) : urgency === "today" ? (
                <p className={`text-5xl font-bold leading-none mb-1 ${urgencyColor.today}`}>
                  Review {countdown.reviewIndex} today
                </p>
              ) : (
                <div>
                  <p
                    className={`text-6xl font-bold tabular-nums leading-none mb-1 ${urgencyColor[urgency]}`}
                    aria-label={`${countdown.daysRemaining} days until Review ${countdown.reviewIndex}`}
                  >
                    {countdown.daysRemaining}
                  </p>
                  <p className={`text-sm font-medium ${urgencyColor[urgency]}`}>
                    days · Review {countdown.reviewIndex}{urgencySuffix[urgency]}
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">Next review before the next phase begins</p>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1">{cadencePill}</div>
      </div>
    </div>
  );
}

// ─── Block 2: Review timeline ─────────────────────────────────────────────────

interface ReviewTimelineProps {
  startDate: Date;
  endDate: Date;
  markers: ReviewMarker[];
  now: Date;
}

function ReviewTimeline({ startDate, endDate, markers, now }: ReviewTimelineProps) {
  const totalMs = endDate.getTime() - startDate.getTime();
  const notStarted = now < startDate;
  const concluded = now > endDate;
  const todayPct = Math.max(0, Math.min(100, ((now.getTime() - startDate.getTime()) / totalMs) * 100));
  const todayLabel = notStarted ? "Not started" : concluded ? "Concluded" : "Today";
  const todayPosition = notStarted ? 0 : concluded ? 100 : todayPct;
  const todayAriaLabel = notStarted
    ? "Strategy has not started yet"
    : concluded
    ? "Strategy has concluded"
    : `Today, ${Math.round(todayPct)}% of the way through the strategy`;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/2 p-6">
      <h2 className="text-sm font-bold text-foreground mb-6">Review schedule</h2>
      <div className="overflow-x-auto pb-2">
        <div className="relative min-w-[480px]" style={{ height: "80px" }}>
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 rounded -translate-y-1/2" />

          {/* Start marker */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center">
            <div
              className="w-2.5 h-2.5 rounded-full border-2 border-white/30 bg-background"
              aria-label={`Strategy start, ${formatFullDate(startDate)}`}
            />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1">
              Start · {formatMonthYear(startDate)}
            </span>
          </div>

          {/* End marker */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex flex-col items-center">
            <div
              className="w-2.5 h-2.5 rounded-full border-2 border-white/30 bg-background"
              aria-label={`Strategy end, ${formatFullDate(endDate)}`}
            />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1">
              End · {formatMonthYear(endDate)}
            </span>
          </div>

          {/* Review markers */}
          {markers.map(marker => {
            const pct = ((marker.date.getTime() - startDate.getTime()) / totalMs) * 100;
            const clampedPct = Math.max(2, Math.min(98, pct));
            const ariaLabel = `Review ${marker.index}, ${marker.completed ? "completed" : "upcoming"}, ${formatFullDate(marker.date)}`;
            return (
              <div
                key={marker.index}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${clampedPct}%` }}
              >
                {marker.completed ? (
                  <div
                    className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"
                    aria-label={ariaLabel}
                    role="img"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5 text-white" aria-hidden="true" />
                  </div>
                ) : (
                  <div
                    className="w-3.5 h-3.5 rounded-full border-[1.5px] border-white/30 bg-background"
                    aria-label={ariaLabel}
                    role="img"
                  />
                )}
                <span
                  className={`text-[10px] whitespace-nowrap mt-0.5 ${
                    marker.completed ? "text-emerald-400 font-medium" : "text-muted-foreground"
                  }`}
                >
                  Review {marker.index} · {formatMonthYear(marker.date)}
                </span>
              </div>
            );
          })}

          {/* Today indicator */}
          <div
            className="absolute top-0 bottom-0 w-px bg-blue-400"
            style={{ left: `${todayPosition}%` }}
            aria-label={todayAriaLabel}
            role="img"
          >
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-blue-400 font-semibold whitespace-nowrap">
              {todayLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Block 3: What each review checks ────────────────────────────────────────

const REVIEW_CHECKS = [
  { label: "Capability re-assessment scores", target: "diagnostic" as const, targetLabel: "Diagnostic",       icon: BarChart3,   color: "#60A5FA" },
  { label: "Initiative phase progress",        target: "plan" as const,       targetLabel: "Plan",             icon: Activity,    color: "#A78BFA" },
  { label: "Cost forecast and risk status",    target: "investment-risk" as const, targetLabel: "Investment & Risk", icon: ShieldAlert, color: "#F59E0B" },
  { label: "Value realised vs. projection",    target: "value" as const,      targetLabel: "Value",            icon: TrendingUp,  color: "#4ADE80" },
];

function WhatEachReviewChecks() {
  const [, navigate] = useLocation();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/2 p-6">
      <h2 className="text-sm font-bold text-foreground mb-4">What each review checks</h2>
      <div className="divide-y divide-white/6">
        {REVIEW_CHECKS.map(check => {
          const Icon = check.icon;
          return (
            <div key={check.target} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${check.color}18`, color: check.color }}
                  aria-hidden="true"
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm text-foreground">{check.label}</span>
              </div>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                onClick={() => {
                  (window as any).umami?.track("strategy.measurement.review-checks.clicked", { target: check.target });
                  navigate(`/strategy/${check.target}`);
                }}
                aria-label={`View ${check.targetLabel} section`}
              >
                View {check.targetLabel}
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Block 4: When we review ──────────────────────────────────────────────────

const TRIGGER_CONDITIONS = [
  {
    id: "capability-drift",
    text: "Capability score moves ±0.3 or a tier between scheduled reviews",
    detail: "Surfaces on the Diagnostic card as the drift indicator.",
    target: "diagnostic" as const,
    targetLabel: "Diagnostic",
  },
  {
    id: "blocked-initiative",
    text: "An initiative becomes blocked for more than 30 days",
    detail: "Surfaces on the Plan card.",
    target: "plan" as const,
    targetLabel: "Plan",
  },
  {
    id: "high-risk-framework",
    text: "A new high-risk regulatory framework is identified",
    detail: "Surfaces on the Investment & Risk card.",
    target: "investment-risk" as const,
    targetLabel: "Investment & Risk",
  },
];

function WhenWeReview({ cadence }: { cadence: CadenceValue }) {
  const [, navigate] = useLocation();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/2 p-6 space-y-5">
      <h2 className="text-sm font-bold text-foreground">When we review</h2>

      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Scheduled</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{CADENCE_RATIONALE[cadence]}</p>
      </div>

      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Triggered (outside the schedule)
        </p>
        <div className="space-y-3">
          {TRIGGER_CONDITIONS.map(trigger => (
            <div key={trigger.id} className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug">{trigger.text}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {trigger.detail}{" "}
                  <button
                    type="button"
                    className="text-blue-400 hover:text-blue-300 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    onClick={() => navigate(`/strategy/${trigger.target}`)}
                    aria-label={`Go to ${trigger.targetLabel} section`}
                  >
                    View {trigger.targetLabel} →
                  </button>
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-4 italic">
          Trigger thresholds are platform defaults in v1 and are not user-configurable.
        </p>
      </div>
    </div>
  );
}

// ─── Block 5: Methodology ─────────────────────────────────────────────────────

const METHODOLOGY_SECTIONS = [
  {
    title: "Scoring model",
    body: "Capability scores are computed on a 0–100 scale across six domains: AI Interaction, AI Output Evaluation, AI Workflow Design, Workforce AI Readiness, AI Ethics & Trust, and AI Change Leadership. Each domain aggregates question-level responses using a weighted mean, with higher-order questions carrying a 1.5× multiplier. The overall score is the unweighted mean of all six domain scores.",
  },
  {
    title: "Benchmark sources",
    body: "Sector benchmarks are derived from the AiQ platform's aggregate anonymised dataset, updated quarterly. Ambition-tier thresholds (Cautious 38 · Exploratory 46 · Progressive 55 · Ambitious 63 · Transformative 73) are calibrated against top-quartile performers within each sector band. Benchmarks are indicative and should be interpreted alongside your organisation's specific context.",
  },
  {
    title: "Confidence intervals",
    body: "Scores based on fewer than 5 completed assessments are flagged as low-confidence and displayed with a hatched pattern on charts. Gap analysis and drift indicators are suppressed when confidence is low to avoid misleading conclusions. Confidence improves as more team members complete the assessment.",
  },
  {
    title: "Drift detection",
    body: "A drift alert is triggered when any domain score moves by ±0.3 points (on the 0–10 display scale) or crosses a tier boundary between scheduled reviews. Drift is computed by comparing the most recent completed assessment session against the session that was current when the strategy was saved.",
  },
];

function MethodologyBlock() {
  const [expanded, setExpanded] = useState(false);
  function toggle() {
    const next = !expanded;
    setExpanded(next);
    (window as any).umami?.track("strategy.measurement.methodology.toggled", { expanded: next });
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/2">
      <button
        type="button"
        className="w-full flex items-center justify-between p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls="methodology-content"
      >
        <h2 className="text-sm font-bold text-foreground">Methodology</h2>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
        }
      </button>
      {expanded && (
        <div id="methodology-content" className="px-6 pb-6 space-y-5 border-t border-white/8 pt-5">
          {METHODOLOGY_SECTIONS.map(section => (
            <div key={section.title}>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{section.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StrategyMeasurementPage() {
  const [, navigate] = useLocation();

  const assessmentQ = trpc.intelligence.getStrategyAssessment.useQuery();
  const strategyQ   = trpc.intelligence.getStrategy.useQuery();

  const [saving, setSaving]       = useState(false);
  const [savedAt, setSavedAt]     = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const assessment       = assessmentQ.data;
  const strategy         = strategyQ.data;
  const structuredInputs = assessment?.structuredInputs as Record<string, unknown> | null | undefined;

  const cadenceId: CadenceValue = (structuredInputs?.measurement_cadence as CadenceValue | undefined) ?? "biannual";
  const cadenceIntervalMonths   = CADENCE_INTERVAL_MONTHS[cadenceId];

  const strategySavedAt    = strategy?.strategySavedAt    ? new Date(strategy.strategySavedAt)    : null;
  const ambitionTargetDate = strategy?.ambitionTargetDate ? new Date(strategy.ambitionTargetDate) : null;

  const now = useMemo(() => new Date(), []);

  const reviewMarkers = useMemo(() => {
    if (!strategySavedAt || !ambitionTargetDate) return [];
    return computeReviewMarkers(strategySavedAt, ambitionTargetDate, cadenceIntervalMonths, now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategySavedAt?.getTime(), ambitionTargetDate?.getTime(), cadenceIntervalMonths, now]);

  const countdown = useMemo(() => computeCountdown(reviewMarkers, now), [reviewMarkers, now]);

  const strategyConcluded = ambitionTargetDate ? now > ambitionTargetDate : false;
  const noReviewScheduled = !strategySavedAt || !ambitionTargetDate;

  useEffect(() => {
    (window as any).umami?.track("strategy.section.viewed", { section: "measurement" });
  }, []);

  const saveAssessmentMut = trpc.intelligence.saveStrategyAssessment.useMutation();

  async function handleCadenceSave(newCadence: CadenceValue) {
    if (!assessment) return;
    setSaving(true);
    setSaveError(null);
    try {
      const currentSI = (assessment.structuredInputs as Record<string, unknown> | null) ?? {};
      const updatedSI = { ...currentSI, measurement_cadence: newCadence };
      await saveAssessmentMut.mutateAsync({
        aspirationAnswers:      (assessment.aspirationAnswers as Record<string, string>) ?? {},
        hrRoleAnswers:          (assessment.hrRoleAnswers as Record<string, string>) ?? {},
        visionStatement:        assessment.visionStatement ?? "",
        guidingPrinciples:      (assessment.guidingPrinciples as Array<{ title: string; description: string }>) ?? [],
        wontDo:                 (assessment.wontDo as string[]) ?? [],
        commitments:            (assessment.commitments as string[]) ?? [],
        businessAmbitionLevel:  assessment.businessAmbitionLevel ?? 3,
        peopleAmbitionLevel:    assessment.peopleAmbitionLevel ?? 3,
        selectedInitiativeIds:  assessment.selectedInitiativeIds ?? [],
        structuredInputsJson:   JSON.stringify(updatedSI),
        operationalBaselineJson: assessment.operationalBaseline
          ? JSON.stringify(assessment.operationalBaseline)
          : undefined,
      });
      setSavedAt(new Date());
      await assessmentQ.refetch();
    } catch {
      setSaveError("Save failed — please try again");
      toast.error("Failed to save cadence change");
    } finally {
      setSaving(false);
    }
  }

  const isLoading   = assessmentQ.isLoading || strategyQ.isLoading;
  const hasError    = assessmentQ.isError   || strategyQ.isError;
  const hasStrategy = strategy?.configured ?? false;

  const cadencePill = (
    <CadencePill
      currentCadence={cadenceId}
      onSave={handleCadenceSave}
      saving={saving}
      savedAt={savedAt}
      saveError={saveError}
    />
  );

  return (
    <SectionPageLayout
      sectionNumber="06"
      sectionLabel="Measurement"
      title="How we'll measure progress"
      accentColor="#2DD4BF"
      icon={<CalendarDays className="w-5 h-5" />}
      actions={
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7 border-white/15 hover:border-white/30 text-muted-foreground"
          onClick={() => navigate("/ai-strategy/assessment")}
        >
          <Sparkles className="w-3 h-3 mr-1.5" aria-hidden="true" />
          Re-run wizard
        </Button>
      }
    >
      {/* Empty state: no strategy */}
      {!isLoading && !hasError && !hasStrategy && (
        <div className="rounded-xl border border-dashed border-teal-500/20 bg-teal-500/4 p-8 flex items-start gap-4">
          <CalendarDays className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">No strategy configured yet</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Generate your strategy to set a measurement plan.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10 h-7 text-xs"
              onClick={() => navigate("/ai-strategy/assessment")}
            >
              <Sparkles className="w-3 h-3 mr-1.5" aria-hidden="true" />
              Generate your strategy
            </Button>
          </div>
        </div>
      )}

      {/* Block 1: Countdown hero */}
      {isLoading ? (
        <CountdownSkeleton />
      ) : hasError ? (
        <BlockError message="Could not load countdown data." />
      ) : hasStrategy ? (
        <CountdownHero
          countdown={countdown}
          cadence={cadenceId}
          noReviewScheduled={noReviewScheduled}
          strategyConcluded={strategyConcluded}
          onOpenCadence={() => {
            const btn = document.querySelector<HTMLButtonElement>("[aria-haspopup='listbox']");
            btn?.click();
          }}
          cadencePill={cadencePill}
        />
      ) : null}

      {/* Block 2: Review timeline */}
      {isLoading ? (
        <TimelineSkeleton />
      ) : hasError ? (
        <BlockError message="Could not load review timeline." />
      ) : hasStrategy && strategySavedAt && ambitionTargetDate ? (
        <ReviewTimeline
          startDate={strategySavedAt}
          endDate={ambitionTargetDate}
          markers={reviewMarkers}
          now={now}
        />
      ) : hasStrategy ? (
        <div className="rounded-2xl border border-white/10 bg-white/2 p-6">
          <h2 className="text-sm font-bold text-foreground mb-3">Review schedule</h2>
          <p className="text-sm text-muted-foreground">
            Timeline will appear once your strategy start and target dates are set.
          </p>
        </div>
      ) : null}

      {/* Block 3: What each review checks */}
      {isLoading ? (
        <ReviewChecksSkeleton />
      ) : hasError ? (
        <BlockError message="Could not load review checks." />
      ) : hasStrategy ? (
        <WhatEachReviewChecks />
      ) : null}

      {/* Block 4: When we review */}
      {isLoading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : hasError ? (
        <BlockError message="Could not load review schedule." />
      ) : hasStrategy ? (
        <WhenWeReview cadence={cadenceId} />
      ) : null}

      {/* Block 5: Methodology */}
      {hasStrategy && <MethodologyBlock />}
    </SectionPageLayout>
  );
}
