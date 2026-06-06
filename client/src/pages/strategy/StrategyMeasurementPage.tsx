/**
 * StrategyMeasurementPage — /strategy/measures
 * Stage 7: Success measures
 *
 * Blocks:
 *  1. Strategy-level outcomes (3–5) with AI suggest + edit modal
 *  2. Primary measure per initiative
 *  3. Review cadence (existing)
 *  4. Review schedule / timeline / checks / triggers (existing)
 *  5. Confirm measures gate button
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGate } from "@/contexts/GateContext";
import { useDeepDive } from "@/hooks/useDeepDive";
import { DeepDiveConfirmedStatus } from "@/components/DeepDiveConfirmedStatus";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  ArrowRight, CalendarDays, Sparkles, BarChart3,
  TrendingUp, ShieldAlert, Activity, Plus, Trash2,
  Target, BarChart2, Loader2, AlertCircle,
} from "lucide-react";
import { MEASUREMENT_CADENCE_OPTIONS } from "@/../../shared/strategyInputs";
import { INITIATIVE_LIBRARY } from "@/../../shared/initiativeLibrary";
import { toast } from "sonner";
import SectionPageLayout from "@/components/SectionPageLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

type CadenceValue = "monthly_quarterly_annual" | "quarterly_annual" | "biannual" | "annual" | "other_custom";

interface ReviewMarker {
  index: number;
  date: Date;
  completed: boolean;
}

interface Outcome {
  number: number;
  title: string;
  unit: string;
  baseline_value: number | null;
  baseline_status: "measured" | "not_measured";
  baseline_study_date: string | null;
  target_value: number;
  target_date: string;
  derived_summary: string;
  tests_principle: number | null;
  ai_drafted: boolean;
  primary_measure?: string | null;
  initiative_id?: string | null;
}

interface Principle {
  number: number;
  title: string;
  description: string;
  capability_tags: string[];
  ai_drafted: boolean;
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
    <div className="rounded-2xl border border-border bg-white/2 p-6 space-y-4">
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
    <div className="rounded-2xl border border-border bg-white/2 p-6">
      <Skeleton className="h-5 w-40 mb-6 rounded" />
      <div className="relative h-12 flex items-center">
        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-foreground/8 rounded" />
        {[0, 25, 50, 75, 100].map(pct => (
          <div key={pct} className="absolute -translate-x-1/2" style={{ left: `${pct}%` }}>
            <div className="w-3 h-3 rounded-full border border-border/60 bg-background" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewChecksSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-white/2 p-6">
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
      <AlertTriangle className="w-4 h-4 dark:text-red-400 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-sm dark:text-red-400 text-red-600">{message ?? "Failed to load this block. You can still navigate away."}</p>
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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-foreground/5 text-xs font-semibold text-foreground hover:border-border/80 hover:bg-foreground/8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
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
          className="absolute right-0 top-full mt-1 z-50 w-72 rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
        >
          {MEASUREMENT_CADENCE_OPTIONS.map(opt => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === currentCadence}
              className={`px-4 py-3 text-xs cursor-pointer transition-colors hover:bg-foreground/8 ${
                opt.value === currentCadence ? "text-foreground font-semibold bg-foreground/5" : "text-muted-foreground"
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
          <span className="dark:text-emerald-400 text-emerald-600">
            Saved {savedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        {!saving && saveError && <span className="dark:text-red-400 text-red-600">{saveError}</span>}
      </div>
    </div>
  );
}

// ─── Block A: Countdown hero ──────────────────────────────────────────────────

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
    approaching: "dark:text-amber-400 text-amber-600",
    "this-week": "dark:text-amber-400 text-amber-600",
    today: "dark:text-amber-400 text-amber-600",
    overdue: "dark:text-red-400 text-red-600",
  };

  const urgencySuffix: Record<UrgencyState, string> = {
    default: "",
    approaching: " approaching",
    "this-week": " this week",
    today: "",
    overdue: "",
  };

  return (
    <div className="rounded-2xl border border-border bg-white/2 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {strategyConcluded ? (
            <p className="text-2xl font-bold text-muted-foreground">Strategy concluded</p>
          ) : noReviewScheduled ? (
            <div>
              <p className="text-base font-semibold text-muted-foreground mb-2">Next review: not scheduled</p>
              <button
                type="button"
                className="text-xs dark:text-blue-400 text-blue-600 underline underline-offset-2 hover:dark:text-blue-300 text-blue-700"
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

// ─── Block B: Review timeline ─────────────────────────────────────────────────

interface ReviewTimelineProps {
  startDate: Date;
  endDate: Date;
  markers: ReviewMarker[];
  now: Date;
}

function ReviewTimeline({ startDate, endDate, markers, now }: ReviewTimelineProps) {
  const totalMs = endDate.getTime() - startDate.getTime();
  const todayPosition = totalMs > 0
    ? Math.min(100, Math.max(0, ((now.getTime() - startDate.getTime()) / totalMs) * 100))
    : 0;
  const todayLabel = `Today · ${formatMonthYear(now)}`;
  const todayAriaLabel = `Today is ${formatFullDate(now)}`;

  return (
    <div className="rounded-2xl border border-border bg-white/2 p-6">
      <h2 className="text-sm font-bold text-foreground mb-6">Review schedule</h2>
      <div className="relative overflow-x-auto pb-2">
        <div className="relative h-12 flex items-center" style={{ minWidth: 400 }}>
          {/* Spine */}
          <div className="absolute inset-x-0 top-1/2 h-0.5 bg-foreground/8 rounded" />
          {/* Start */}
          <div className="absolute left-0 -translate-x-1/2 flex flex-col items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-foreground/20" />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
              Start · {formatMonthYear(startDate)}
            </span>
          </div>
          {/* End */}
          <div className="absolute right-0 translate-x-1/2 flex flex-col items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-foreground/20" />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
              End · {formatMonthYear(endDate)}
            </span>
          </div>
          {/* Markers */}
          {markers.map(marker => {
            const pct = totalMs > 0
              ? Math.min(100, Math.max(0, ((marker.date.getTime() - startDate.getTime()) / totalMs) * 100))
              : 0;
            const ariaLabel = `Review ${marker.index}: ${formatFullDate(marker.date)}${marker.completed ? " (completed)" : ""}`;
            return (
              <div
                key={marker.index}
                className="absolute -translate-x-1/2 flex flex-col items-center gap-1"
                style={{ left: `${pct}%` }}
              >
                {marker.completed ? (
                  <CheckCircle2
                    className="w-4 h-4 dark:text-emerald-400 text-emerald-600"
                    aria-label={ariaLabel}
                    role="img"
                  />
                ) : (
                  <div
                    className="w-3 h-3 rounded-full border-2 border-border/60 bg-background"
                    aria-label={ariaLabel}
                    role="img"
                  />
                )}
                <span
                  className={`text-[10px] whitespace-nowrap mt-0.5 ${
                    marker.completed ? "dark:text-emerald-400 text-emerald-600 font-medium" : "text-muted-foreground"
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
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] dark:text-blue-400 text-blue-600 font-semibold whitespace-nowrap">
              {todayLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Block C: What each review checks ────────────────────────────────────────

const REVIEW_CHECKS = [
  { label: "Capability re-assessment scores", target: "diagnostic" as const, targetLabel: "Diagnostic",       icon: BarChart3,   color: "#60A5FA" },
  { label: "Initiative phase progress",        target: "plan" as const,       targetLabel: "Plan",             icon: Activity,    color: "#A78BFA" },
  { label: "Cost forecast and risk status",    target: "business-case" as const, targetLabel: "Business Case", icon: ShieldAlert, color: "#F59E0B" },
  { label: "Value realised vs. projection",    target: "business-case" as const, targetLabel: "Business Case", icon: TrendingUp,  color: "#4ADE80" },
];

function WhatEachReviewChecks() {
  const [, navigate] = useLocation();
  return (
    <div className="rounded-2xl border border-border bg-white/2 p-6">
      <h2 className="text-sm font-bold text-foreground mb-4">What each review checks</h2>
      <div className="divide-y divide-border">
        {REVIEW_CHECKS.map((check, idx) => {
          const Icon = check.icon;
          return (
            <div key={`${check.target}-${idx}`} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
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
                onClick={() => navigate(`/strategy/${check.target}`)}
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

// ─── Block D: When we review ──────────────────────────────────────────────────

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
    detail: "Surfaces on the Business Case card.",
    target: "business-case" as const,
    targetLabel: "Business Case",
  },
];

function WhenWeReview({ cadence }: { cadence: CadenceValue }) {
  const [, navigate] = useLocation();
  return (
    <div className="rounded-2xl border border-border bg-white/2 p-6 space-y-5">
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
              <AlertTriangle className="w-4 h-4 dark:text-amber-400 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug">{trigger.text}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {trigger.detail}{" "}
                  <button
                    type="button"
                    className="dark:text-blue-400 text-blue-600 hover:dark:text-blue-300 text-blue-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
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

// ─── Outcome row editor ───────────────────────────────────────────────────────

function OutcomeRow({
  outcome, index, principles, onChange, onRemove,
}: {
  outcome: Outcome; index: number; principles: Principle[] | null;
  onChange: (field: keyof Outcome, val: unknown) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-border/50 rounded-lg p-4 space-y-3 bg-card/50">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
          {index + 1}
        </div>
        <Input
          value={outcome.title}
          onChange={e => onChange("title", e.target.value)}
          placeholder="Outcome title (3–6 words)"
          className="flex-1 h-8 text-sm"
        />
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
          onClick={onRemove}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] text-muted-foreground">Unit</Label>
          <Input
            value={outcome.unit}
            onChange={e => onChange("unit", e.target.value)}
            placeholder="e.g. % reduction"
            className="h-8 text-sm mt-1"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Target date</Label>
          <Input
            value={outcome.target_date}
            onChange={e => onChange("target_date", e.target.value)}
            placeholder="Q4 2026"
            className="h-8 text-sm mt-1"
          />
        </div>
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1.5 block">Baseline</Label>
        <RadioGroup
          value={outcome.baseline_status}
          onValueChange={v => onChange("baseline_status", v)}
          className="flex gap-4"
        >
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="measured" id={`m-${index}`} />
            <Label htmlFor={`m-${index}`} className="text-xs cursor-pointer">Measured</Label>
          </div>
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="not_measured" id={`nm-${index}`} />
            <Label htmlFor={`nm-${index}`} className="text-xs cursor-pointer">TBD / not yet measured</Label>
          </div>
        </RadioGroup>
        {outcome.baseline_status === "measured" && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Baseline value</Label>
              <Input
                type="number"
                value={outcome.baseline_value ?? ""}
                onChange={e => onChange("baseline_value", e.target.value ? Number(e.target.value) : null)}
                className="h-8 text-sm mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Study date</Label>
              <Input
                value={outcome.baseline_study_date ?? ""}
                onChange={e => onChange("baseline_study_date", e.target.value || null)}
                placeholder="Q1 2025"
                className="h-8 text-sm mt-1"
              />
            </div>
          </div>
        )}
        {outcome.baseline_status === "not_measured" && (
          <div className="mt-2">
            <Label className="text-[11px] text-muted-foreground">
              Baseline study date <span className="text-red-400 ml-0.5">*</span>
            </Label>
            <Input
              value={outcome.baseline_study_date ?? ""}
              onChange={e => onChange("baseline_study_date", e.target.value || null)}
              placeholder="e.g. Q1 2026 — when you will establish the baseline"
              className="h-8 text-sm mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Enter when you plan to establish this baseline to unlock confirmation.</p>
          </div>
        )}
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground">Target value</Label>
        <Input
          type="number"
          value={outcome.target_value}
          onChange={e => onChange("target_value", Number(e.target.value))}
          className="h-8 text-sm mt-1"
        />
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground">Summary sentence</Label>
        <Textarea
          value={outcome.derived_summary}
          onChange={e => onChange("derived_summary", e.target.value)}
          placeholder="Reduce X from TBD to Y by Z"
          className="text-sm min-h-[56px] resize-none mt-1"
        />
      </div>
      {principles && principles.length > 0 && (
        <div>
          <Label className="text-[11px] text-muted-foreground">Tests principle (optional)</Label>
          <select
            value={outcome.tests_principle ?? ""}
            onChange={e => onChange("tests_principle", e.target.value ? Number(e.target.value) : null)}
            className="mt-1 w-full h-8 text-sm rounded-md border border-input bg-background px-2 text-foreground"
          >
            <option value="">— none —</option>
            {principles.map(p => (
              <option key={p.number} value={p.number}>{p.number}. {p.title}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// ─── Outcomes modal ───────────────────────────────────────────────────────────

function OutcomesModal({
  open, onClose, initial, principles, onSave, isDrafting, onDraft,
}: {
  open: boolean; onClose: () => void;
  initial: Outcome[] | null;
  principles: Principle[] | null;
  onSave: (v: Outcome[]) => Promise<void>;
  isDrafting: boolean;
  onDraft: () => void;
}) {
  const [items, setItems] = useState<Outcome[]>(() => initial ?? []);
  const [saving, setSaving] = useState(false);

  const prevInitial = useRef(initial);
  if (initial !== prevInitial.current) {
    prevInitial.current = initial;
    setItems(initial ?? []);
  }

  const add = () =>
    setItems(prev => [
      ...prev,
      {
        number: prev.length + 1, title: "", unit: "",
        baseline_value: null, baseline_status: "not_measured",
        baseline_study_date: null, target_value: 0, target_date: "",
        derived_summary: "", tests_principle: null, ai_drafted: false,
        primary_measure: null,
      },
    ]);
  const remove = (i: number) =>
    setItems(prev =>
      prev.filter((_, idx) => idx !== i).map((o, idx) => ({ ...o, number: idx + 1 })),
    );
  const update = (i: number, field: keyof Outcome, val: unknown) =>
    setItems(prev => prev.map((o, idx) => (idx === i ? { ...o, [field]: val } : o)));

  const save = async () => {
    setSaving(true);
    try {
      await onSave(items);
      onClose();
    } catch {
      toast.error("Failed to save outcomes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Strategy-level outcomes</DialogTitle>
          <DialogDescription>3–5 measurable results that prove the strategy is working.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {items.map((o, i) => (
            <OutcomeRow
              key={i}
              outcome={o}
              index={i}
              principles={principles}
              onChange={(field, val) => update(i, field, val)}
              onRemove={() => remove(i)}
            />
          ))}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" onClick={add} disabled={items.length >= 5}>
              <Plus className="w-3 h-3" /> Add outcome
            </Button>
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 text-xs h-8 text-muted-foreground"
              onClick={onDraft}
              disabled={isDrafting}
            >
              {isDrafting
                ? <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                : <Sparkles className="w-3 h-3" />}
              {isDrafting ? "Drafting…" : "Re-draft with AI"}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── From-to bar (outcome visualisation) ─────────────────────────────────────

function FromToBar({ outcome }: { outcome: Outcome }) {
  const isTbd = outcome.baseline_status === "not_measured" || outcome.baseline_value === null;
  const todayVal = outcome.baseline_value;
  const targetVal = outcome.target_value;
  const unit = outcome.unit;
  const maxVal = Math.max(todayVal ?? 0, targetVal, 1);
  const todayPct = isTbd ? 0 : Math.round(((todayVal ?? 0) / maxVal) * 100);
  const targetPct = Math.round((targetVal / maxVal) * 100);

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="w-10 text-[10px] text-muted-foreground flex-shrink-0">Today</span>
        <div className="flex-1 relative" style={{ height: 5, borderRadius: 3, background: "var(--muted)" }}>
          {isTbd ? (
            <div style={{ position: "absolute", inset: 0, borderRadius: 3, border: "0.5px dashed rgba(255,255,255,0.15)" }} />
          ) : (
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${todayPct}%`, borderRadius: 3, background: "var(--muted)" }} />
          )}
        </div>
        <span className="w-14 text-right text-[11px] flex-shrink-0" style={isTbd ? { color: "var(--muted-foreground)", fontStyle: "italic" } : { color: "var(--muted-foreground)" }}>
          {isTbd ? "Not measured" : `${todayVal} ${unit}`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-10 text-[10px] text-muted-foreground flex-shrink-0">Target</span>
        <div className="flex-1 relative" style={{ height: 5, borderRadius: 3, background: "var(--muted)" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${targetPct}%`, borderRadius: 3, background: "#5DCAA5" }} />
        </div>
        <span className="w-14 text-right text-[11px] flex-shrink-0" style={{ color: "#5DCAA5" }}>
          {targetVal}{unit === "%" ? "" : " "}{unit}
        </span>
      </div>
    </div>
  );
}

// ─── Methodology ──────────────────────────────────────────────────────────────

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
  return (
    <div className="rounded-2xl border border-border bg-white/2">
      <button
        type="button"
        className="w-full flex items-center justify-between p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
        onClick={() => setExpanded(e => !e)}
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
        <div id="methodology-content" className="px-6 pb-6 space-y-5 border-t border-border pt-5">
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
  const gate = useGate();
  const { isDeepDive } = useDeepDive();
  const [, navigate] = useLocation();
  // Gate redirect: Stage 6 (Measurement) requires Stage 5 to be cleared
  useEffect(() => {
    if (!gate.isLoading && !gate.isStage7Accessible) {
      navigate("/strategy");
    }
  }, [gate.isLoading, gate.isStage7Accessible, navigate]);

  const assessmentQ  = trpc.intelligence.getStrategyAssessment.useQuery();
  const strategyQ    = trpc.intelligence.getStrategy.useQuery();
  const ambitionQ    = trpc.intelligence.getAmbitionSections.useQuery();

  const [cadenceSaving, setCadenceSaving]       = useState(false);
  const [cadenceSavedAt, setCadenceSavedAt]     = useState<Date | null>(null);
  const [cadenceSaveError, setCadenceSaveError] = useState<string | null>(null);

  const [outcomesOpen, setOutcomesOpen]         = useState(false);
  const [outcomeDrafting, setOutcomeDrafting]   = useState(false);
  const [confirmOpen, setConfirmOpen]           = useState(false);
  const [justConfirmed, setJustConfirmed]        = useState(false);

  // Per-initiative primary measures (local state, saved on confirm)
  const [primaryMeasures, setPrimaryMeasures]   = useState<Record<string, string>>({});

  const assessment       = assessmentQ.data;
  const strategy         = strategyQ.data;
  const ambition         = ambitionQ.data;
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

  // Selected initiative names
  const selectedIds: string[] = assessment?.selectedInitiativeIds ?? [];
  const selectedInitiatives = useMemo(
    () => selectedIds.map(id => {
      const lib = INITIATIVE_LIBRARY.find(i => i.id === id);
      return { id, name: lib?.label ?? id };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds.join(",")],
  );

  // Outcomes from ambition sections
  const outcomes = ambition?.outcomes as Outcome[] | null | undefined;
  const principles = ambition?.principles as unknown as Principle[] | null | undefined;

  // Gate state
  const stage6Cleared = gate.stage7Cleared;
  const outcomesCount = outcomes?.length ?? 0;
  const primaryMeasureCount = Object.values(primaryMeasures).filter(v => v.trim().length > 0).length;

  useEffect(() => {
    (window as any).umami?.track("strategy.section.viewed", { section: "measurement" });
  }, []);

  // Seed primaryMeasures from saved outcomes + assessment data on first load
  const seededRef = React.useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (!outcomes && !assessment) return;
    seededRef.current = true;
    const seed: Record<string, string> = {};
    // Seed per-outcome primary measures (keyed outcome-N)
    if (outcomes) {
      for (const o of outcomes) {
        if (o.primary_measure) seed[`outcome-${o.number}`] = o.primary_measure;
      }
    }
    // Seed per-initiative primary measures from structuredInputs if stored there
    const si = (assessment?.structuredInputs as Record<string, unknown> | null) ?? {};
    const initiativeMeasures = si.initiative_primary_measures as Record<string, string> | undefined;
    if (initiativeMeasures) {
      for (const [id, val] of Object.entries(initiativeMeasures)) {
        if (val) seed[id] = val;
      }
    }
    if (Object.keys(seed).length > 0) setPrimaryMeasures(seed);
  }, [outcomes, assessment]);

  const saveAssessmentMut   = trpc.intelligence.saveStrategyAssessment.useMutation();
  const saveAmbitionMut     = trpc.intelligence.saveAmbitionSection.useMutation();
  const draftAmbitionMut    = trpc.intelligence.draftAmbitionSection.useMutation();
  const completeStage6Mut   = trpc.gate.completeStage7.useMutation({
    onSuccess: () => {
      gate.refetch();
      setConfirmOpen(false);
      setJustConfirmed(true);
      toast.success("Outcomes confirmed — Capability unlocked");
      setTimeout(() => {
        setJustConfirmed(false);
        navigate("/strategy/capability");
      }, 2200);
    },
    onError: (err) => toast.error(err.message ?? "Failed to confirm Stage 7"),
  });

  async function handleCadenceSave(newCadence: CadenceValue) {
    if (!assessment) return;
    setCadenceSaving(true);
    setCadenceSaveError(null);
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
      setCadenceSavedAt(new Date());
      await assessmentQ.refetch();
      if (gate.stage7Cleared) gate.markEdited("stage7");
    } catch {
      setCadenceSaveError("Save failed — please try again");
      toast.error("Failed to save cadence change");
    } finally {
      setCadenceSaving(false);
    }
  }
  async function handleOutcomesSave(newOutcomes: Outcome[]) {
    await saveAmbitionMut.mutateAsync({ section: "outcomes", value: newOutcomes });
    await ambitionQ.refetch();
    // T11: Stage 7 edits must stale Stage 9 Business Case (was incorrectly marking stage6)
    gate.markEdited("stage7");
  }

  async function handleOutcomesDraft() {
    setOutcomeDrafting(true);
    try {
      const result = await draftAmbitionMut.mutateAsync({
        section: "outcomes",
        orgDescriptor: ambition?.vision ?? undefined,
        businessAmbitionTier: ambition?.businessAmbitionLevel ?? undefined,
        hrDeliveryTier: ambition?.peopleAmbitionLevel ?? undefined,
        visionStatement: ambition?.vision ?? undefined,
      });
      if (result && Array.isArray((result as any).outcomes)) {
        await handleOutcomesSave((result as any).outcomes as Outcome[]);
      }
    } catch {
      toast.error("Failed to draft outcomes");
    } finally {
      setOutcomeDrafting(false);
    }
  }

  async function handleConfirmMeasures() {
    // Merge primary measures into outcomes JSON
    const enrichedOutcomes = (outcomes ?? []).map(o => ({
      ...o,
      primary_measure: primaryMeasures[`outcome-${o.number}`] ?? o.primary_measure ?? null,
    }));
    // Also add per-initiative primary measures as standalone outcome entries if needed
    const initiativeMeasureOutcomes = selectedInitiatives
      .filter(i => primaryMeasures[i.id]?.trim())
      .map((i, idx) => ({
        number: (enrichedOutcomes.length + idx + 1),
        title: i.name,
        unit: "",
        baseline_value: null,
        baseline_status: "not_measured" as const,
        baseline_study_date: null,
        target_value: 0,
        target_date: "",
        derived_summary: "",
        tests_principle: null,
        ai_drafted: false,
        primary_measure: primaryMeasures[i.id],
      }));
    const allOutcomes = [...enrichedOutcomes, ...initiativeMeasureOutcomes];
    await completeStage6Mut.mutateAsync({ outcomesJson: JSON.stringify(allOutcomes) });
  }

  const isLoading   = assessmentQ.isLoading || strategyQ.isLoading || ambitionQ.isLoading;
  const hasError    = assessmentQ.isError   || strategyQ.isError;
  const hasStrategy = strategy?.configured ?? false;

  const cadencePill = (
    <CadencePill
      currentCadence={cadenceId}
      onSave={handleCadenceSave}
      saving={cadenceSaving}
      savedAt={cadenceSavedAt}
      saveError={cadenceSaveError}
    />
  );

  // Gate validation — allow confirm if:
  //   1. At least 1 outcome exists, AND
  //   2. Either no initiatives are selected, OR at least one primary measure is set
  //      (checking both local state AND saved primary_measure fields on outcomes)
  const savedPrimaryMeasureCount = (outcomes ?? []).filter(o => o.primary_measure?.trim()).length;

  // T9 — Baseline provenance guard
  // Hard block: strategy-level outcome has a target_value but no baseline evidence.
  // Passes if: baseline_status="measured" (with a value), OR baseline_status="not_measured" with a study date set.
  const strategyOutcomesWithTargetButNoBaseline = (outcomes ?? []).filter(
    o => !o.initiative_id && o.target_value && (
      (o.baseline_status === "measured" && o.baseline_value === null) ||
      (o.baseline_status === "not_measured" && !o.baseline_study_date)
    )
  );
  const baselineHardBlockCount = strategyOutcomesWithTargetButNoBaseline.length;

  // Soft warning: initiative primary measure has a target but no baseline (does NOT block confirm)
  const initiativeMeasuresWithTargetButNoBaseline = (outcomes ?? []).filter(
    o => !!o.initiative_id && o.target_value && (o.baseline_status === "not_measured" || o.baseline_value === null)
  );
  const baselineSoftWarnCount = initiativeMeasuresWithTargetButNoBaseline.length;

  const canConfirm = outcomesCount >= 1 &&
    baselineHardBlockCount === 0 &&
    (
      selectedInitiatives.length === 0 ||
      primaryMeasureCount > 0 ||
      savedPrimaryMeasureCount > 0
    );

  return (
    <SectionPageLayout
      sectionNumber="07"
      sectionLabel="Success measures"
      title="Define what success looks like"
      accentColor="#2DD4BF"
      icon={<Target className="w-5 h-5" />}
      isLocked={!gate.isStage7Accessible}
      editedAfterClearing={gate.stage7EditedAfterClearing}
      upstreamStageLabel="Initiatives"
      isDeepDive={isDeepDive}
      confirmedAt={gate.gateState?.stage7.completedAt}
      stageProgress={!isDeepDive && gate.isStage7Accessible ? {
        stageNumber: 7,
        title: "Success Measures",
        description: "Define success measures for each outcome, set review cadence, and confirm when all outcomes have at least one primary measure.",
        isCleared: !!stage6Cleared,
        isEdited: !!gate.stage7EditedAfterClearing,
        canConfirm,
        isPending: completeStage6Mut.isPending,
        onConfirm: () => stage6Cleared && !gate.stage7EditedAfterClearing ? navigate("/strategy/capability") : handleConfirmMeasures(),
        backRoute: "/strategy/roadmap",
        nextRoute: "/strategy/capability",
        nextLabel: "Capability",
      } : undefined}
      actions={
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7 border-border hover:border-border/80 text-muted-foreground"
          onClick={() => navigate("/strategy/diagnostic")}
        >
          <Sparkles className="w-3 h-3 mr-1.5" aria-hidden="true" />
          Re-run wizard
        </Button>
      }
    >
      {/* Empty state: no strategy */}
      {!isLoading && !hasError && !hasStrategy && (
        <div className="rounded-xl border border-dashed border-teal-500/20 bg-teal-500/4 p-8 flex items-start gap-4">
          <Target className="w-5 h-5 dark:text-teal-400 text-teal-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">No strategy configured yet</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Complete the strategy wizard to define your success measures.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="dark:border-teal-500/30 border-teal-300 dark:text-teal-400 text-teal-600 hover:bg-teal-500/10 h-7 text-xs"
              onClick={() => navigate("/strategy/diagnostic")}
            >
              <Sparkles className="w-3 h-3 mr-1.5" aria-hidden="true" />
              Generate your strategy
            </Button>
          </div>
        </div>
      )}

      {/* ── Block 1: Strategy-level outcomes ── */}
      {hasStrategy && (
        <div className="rounded-2xl border border-border bg-white/2 overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between gap-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 dark:text-teal-400 text-teal-600" />
              <h2 className="text-sm font-bold text-foreground">Strategy-level outcomes</h2>
              <span className="text-xs text-muted-foreground ml-1">
                {outcomesCount} of 3–5 recommended
              </span>
            </div>
            <div className="flex items-center gap-2">
              {outcomeDrafting ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Drafting…
                </span>
              ) : (
                <Button
                  variant="ghost" size="sm"
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  onClick={handleOutcomesDraft}
                >
                  <Sparkles className="w-3 h-3" /> Suggest from your framing
                </Button>
              )}
              <Button
                variant="ghost" size="sm"
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => setOutcomesOpen(true)}
              >
                Edit
              </Button>
            </div>
          </div>

          <div className="px-6 pb-6 pt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : !outcomes || outcomes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">No outcomes defined yet.</p>
                <div className="flex items-center justify-center gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={handleOutcomesDraft} disabled={outcomeDrafting}>
                    <Sparkles className="w-3 h-3" /> Draft with AI
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-8 text-muted-foreground" onClick={() => setOutcomesOpen(true)}>
                    <Plus className="w-3 h-3" /> Add manually
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {outcomes.map(o => {
                  const linkedPrinciple = o.tests_principle != null
                    ? principles?.find(p => p.number === o.tests_principle)
                    : null;
                  return (
                    <div key={o.number} className="border border-border/40 rounded-lg p-4 bg-background/40">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                          {o.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">{o.title}</p>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">
                              {o.target_date}
                            </Badge>
                            {o.ai_drafted && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/30 text-primary/70">
                                AI
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{o.derived_summary}</p>
                          <FromToBar outcome={o} />
                          <div className="mt-2 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                            By {o.target_date}
                            {o.baseline_status === "not_measured" && o.baseline_study_date && (
                              <span> · Baseline study scheduled {o.baseline_study_date}</span>
                            )}
                          </div>
                          {linkedPrinciple && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px]">
                              <span style={{ color: "#5DCAA5" }}>↪</span>
                              <span style={{ color: "var(--muted-foreground)" }}>Tests principle {linkedPrinciple.number}:</span>
                              <span style={{ color: "var(--primary)" }}>{linkedPrinciple.title}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Block 2: Primary measure per initiative ── */}
      {hasStrategy && selectedInitiatives.length > 0 && (
        <div className="rounded-2xl border border-border bg-white/2 overflow-hidden">
          <div className="px-6 py-4 flex items-center gap-2 border-b border-border/50">
            <Activity className="w-4 h-4 dark:text-violet-400 text-violet-600" />
            <h2 className="text-sm font-bold text-foreground">Primary measure per initiative</h2>
            <span className="text-xs text-muted-foreground ml-1">
              {primaryMeasureCount} of {selectedInitiatives.length} set
            </span>
          </div>
          <div className="px-6 pb-6 pt-4 space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              One measure per initiative — how you’ll know each is working. Click any saved measure to edit, or delete it to start over.
            </p>
            {selectedInitiatives.map(init => {
              const saved = primaryMeasures[init.id]?.trim();
              return (
                <div
                  key={init.id}
                  className="group flex items-center gap-3 p-3 rounded-lg border transition-colors"
                  style={{
                    borderColor: saved ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.12)",
                    background: saved ? "rgba(139,92,246,0.04)" : "transparent",
                  }}
                >
                  {/* Initiative label */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{init.name}</p>
                  </div>

                  {/* Saved pill or input */}
                  {saved ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-foreground bg-foreground/8 border border-border/50 rounded-md px-2.5 py-1 max-w-[220px] truncate">
                        {saved}
                      </span>
                      {/* Edit button */}
                      <button
                        type="button"
                        aria-label={`Edit measure for ${init.name}`}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/8 transition-colors"
                        onClick={() => {
                          // Move value into an editable input by temporarily clearing the saved value
                          // We store a separate editing flag via a temp key
                          setPrimaryMeasures(prev => ({ ...prev, [`${init.id}__editing`]: prev[init.id], [init.id]: "" }));
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {/* Delete button */}
                      <button
                        type="button"
                        aria-label={`Delete measure for ${init.name}`}
                        className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        onClick={() => setPrimaryMeasures(prev => {
                          const next = { ...prev };
                          delete next[init.id];
                          delete next[`${init.id}__editing`];
                          return next;
                        })}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Input
                        autoFocus={!!primaryMeasures[`${init.id}__editing`]}
                        defaultValue={primaryMeasures[`${init.id}__editing`] ?? ""}
                        placeholder="e.g. Manager hours saved per week"
                        className="w-56 h-7 text-xs"
                        onBlur={e => {
                          const val = e.target.value.trim();
                          if (val) {
                            setPrimaryMeasures(prev => {
                              const next = { ...prev, [init.id]: val };
                              delete next[`${init.id}__editing`];
                              return next;
                            });
                          } else if (primaryMeasures[`${init.id}__editing`]) {
                            // Restore previous value if user blurs with empty field
                            setPrimaryMeasures(prev => {
                              const next = { ...prev, [init.id]: prev[`${init.id}__editing`]! };
                              delete next[`${init.id}__editing`];
                              return next;
                            });
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val) {
                              setPrimaryMeasures(prev => {
                                const next = { ...prev, [init.id]: val };
                                delete next[`${init.id}__editing`];
                                return next;
                              });
                            }
                          }
                          if (e.key === "Escape") {
                            if (primaryMeasures[`${init.id}__editing`]) {
                              setPrimaryMeasures(prev => {
                                const next = { ...prev, [init.id]: prev[`${init.id}__editing`]! };
                                delete next[`${init.id}__editing`];
                                return next;
                              });
                            }
                          }
                        }}
                      />
                      {primaryMeasures[`${init.id}__editing`] && (
                        <button
                          type="button"
                          aria-label="Cancel edit"
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/8 transition-colors text-xs"
                          onClick={() => setPrimaryMeasures(prev => {
                            const next = { ...prev, [init.id]: prev[`${init.id}__editing`]! };
                            delete next[`${init.id}__editing`];
                            return next;
                          })}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Block 7: Methodology ── */}
      {hasStrategy && <MethodologyBlock />}

      {/* ── T9: Baseline provenance warnings ── */}
      {hasStrategy && gate.isStage7Accessible && !stage6Cleared && baselineHardBlockCount > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-400">Baseline required before confirming</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {baselineHardBlockCount} strategy-level outcome{baselineHardBlockCount !== 1 ? "s have" : " has"} a target value but no baseline. Either record the current baseline value, or mark it as “not yet measured” with a baseline study date.
            </p>
          </div>
        </div>
      )}
      {hasStrategy && gate.isStage7Accessible && !stage6Cleared && baselineSoftWarnCount > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-400">Initiative measure baseline missing (advisory)</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {baselineSoftWarnCount} initiative primary measure{baselineSoftWarnCount !== 1 ? "s are" : " is"} missing a baseline. This won’t block confirmation, but consider adding baselines before the Business Case stage.
            </p>
          </div>
        </div>
      )}

      {/* ── Gate confirm button ── */}
      {hasStrategy && gate.isStage7Accessible && !stage6Cleared && (
        <div
          className="rounded-2xl border p-5 flex items-center justify-between gap-4 transition-all duration-300"
          style={{
            borderColor: canConfirm ? "rgba(45,212,191,0.3)" : "rgba(45,212,191,0.12)",
            background: canConfirm ? "rgba(45,212,191,0.06)" : "rgba(45,212,191,0.02)",
          }}
        >
          <div>
            <p className="text-sm font-semibold text-foreground mb-0.5">Confirm success measures</p>
            <p className="text-xs text-muted-foreground">
              {outcomesCount < 1
                ? "Define at least 1 strategy-level outcome to continue."
                : baselineHardBlockCount > 0
                ? `Add baselines to ${baselineHardBlockCount} outcome${baselineHardBlockCount !== 1 ? "s" : ""} before confirming.`
                : selectedInitiatives.length > 0 && primaryMeasureCount === 0
                ? "Set at least one initiative primary measure to continue."
                : "Ready to confirm — this will lock Stage 7."}
            </p>
          </div>
          <Button
            size="sm"
            className="bg-teal-500 hover:bg-teal-400 text-black font-semibold text-xs h-8 shrink-0 min-w-[140px] transition-all duration-200"
            disabled={!canConfirm || completeStage6Mut.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            {completeStage6Mut.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Confirming…</>
            ) : (
              "Confirm measures →"
            )}
          </Button>
        </div>
      )}

      {/* ── Just-confirmed success flash ── */}
      {justConfirmed && (
        <div
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/15 shrink-0">
            <CheckCircle2 className="w-4 h-4 dark:text-emerald-400 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold dark:text-emerald-400 text-emerald-600">Stage 7 confirmed</p>
            <p className="text-xs text-muted-foreground mt-0.5">Success measures locked. Moving to Business Case…</p>
          </div>
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
        </div>
      )}

      {stage6Cleared && !isDeepDive && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 dark:text-emerald-400 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold dark:text-emerald-400 text-emerald-600">Stage 7 confirmed</p>
            <p className="text-xs text-muted-foreground">Success measures locked. Continue to Business Case.</p>
          </div>
          <Button
            size="sm" variant="outline"
            className="ml-auto text-xs h-7"
            onClick={() => navigate("/strategy/business-case")}
          >
            Business Case →
          </Button>
        </div>
      )}
      {stage6Cleared && isDeepDive && (
        <DeepDiveConfirmedStatus
          confirmedAt={gate.gateState?.stage7.completedAt}
          label="Stage 7 confirmed"
        />
      )}

      {/* ── Outcomes modal ── */}
      <OutcomesModal
        open={outcomesOpen}
        onClose={() => setOutcomesOpen(false)}
        initial={outcomes ?? null}
        principles={principles ?? null}
        onSave={handleOutcomesSave}
        isDrafting={outcomeDrafting}
        onDraft={handleOutcomesDraft}
      />

      {/* ── Confirm dialog ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm success measures</DialogTitle>
            <DialogDescription>
              This will lock Stage 7. You can still edit measures later, but the gate will need to be re-confirmed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="rounded-xl border border-border bg-foreground/3 p-4 text-sm space-y-1">
              <p className="text-xs text-muted-foreground">{outcomesCount} strategy-level outcome{outcomesCount !== 1 ? "s" : ""}</p>
              <p className="text-xs text-muted-foreground">{primaryMeasureCount} initiative primary measure{primaryMeasureCount !== 1 ? "s" : ""}</p>
              <p className="text-xs text-muted-foreground">{CADENCE_SHORT_LABEL[cadenceId]} review cadence</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-teal-500 hover:bg-teal-400 text-black font-semibold transition-all duration-200"
                disabled={completeStage6Mut.isPending}
                onClick={handleConfirmMeasures}
              >
                {completeStage6Mut.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Confirming…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" />Confirm measures</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SectionPageLayout>
  );
}
