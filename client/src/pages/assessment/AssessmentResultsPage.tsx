/**
 * AssessmentResultsPage — Individual AI Capability Assessment Dashboard (brief v1)
 *
 * Layout (top to bottom):
 *   1. Top bar — assessment date selector + in-progress indicator (no full-width banner)
 *   2. Hero — score circle, cohort anchor, narrative headline, badges row
 *   3. Cross-cutting patterns — What you do well / Where to grow
 *   4. Domain detail — 6 cards sorted by score desc, inline narrative
 *   5. Development plan — 3 priority rows, target score auto-derived, module names
 *
 * Full path: per-scenario response patterns from backend.
 * Fallback: if generateCapabilityProfile fails, scores + bars render without narrative.
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ChevronDown, TrendingUp, Target, HelpCircle,
  RotateCcw, BookOpen, ChevronRight, AlertCircle,
  RefreshCw, Play,
} from "lucide-react";
import { DOMAIN_LABELS, DOMAIN_COLOURS, DOMAIN_KEYS, type DomainKey } from "@shared/brand";
import { getDomainIcon } from "@/lib/brand-icons";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Level thresholds (brief spec: no amber/red for low scores) ───────────────

const LEVEL_THRESHOLDS = [
  { label: "EXPERT",     min: 80, barColour: "#4477AA" },
  { label: "PROFICIENT", min: 65, barColour: "#718096" },
  { label: "DEVELOPING", min: 50, barColour: "rgba(68,119,170,0.55)" },
  { label: "BEGINNER",   min: 35, barColour: "rgba(113,128,150,0.45)" },
  { label: "NOVICE",     min:  0, barColour: "rgba(113,128,150,0.35)" },
] as const;

function getLevelInfo(score: number): { label: string; barColour: string; nextThreshold: number } {
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (score >= LEVEL_THRESHOLDS[i].min) {
      const nextThreshold = i === 0 ? Math.min(score + 5, 100) : LEVEL_THRESHOLDS[i - 1].min;
      return { ...LEVEL_THRESHOLDS[i], nextThreshold };
    }
  }
  return { label: "NOVICE", barColour: "rgba(113,128,150,0.35)", nextThreshold: 35 };
}

function getCipdLevel(score: number) {
  if (score >= 75) return {
    label: "Chartered Fellow", colour: "#68D391",
    tooltip: "Your performance aligns with Chartered Fellow level of the CIPD Profession Map (score ≥7.5/10). Levels: Foundation → Associate → Chartered Member → Chartered Fellow.",
  };
  if (score >= 55) return {
    label: "Chartered Member", colour: "#90CDF4",
    tooltip: "Your performance aligns with Chartered Member level of the CIPD Profession Map (score ≥5.5/10).",
  };
  return {
    label: "Associate", colour: "#F6AD55",
    tooltip: "Your performance aligns with Associate level of the CIPD Profession Map (score <5.5/10).",
  };
}

function getCalibLabel(diff: number) {
  const abs = Math.abs(diff);
  if (abs < 0.15) return {
    label: "Well calibrated", colour: "#68D391",
    tooltip: "Your self-assessed confidence broadly matched your demonstrated capability. Well-calibrated self-awareness is a strong predictor of effective AI use.",
  };
  if (diff > 0.15) return {
    label: "Optimistic", colour: "#F6AD55",
    tooltip: "You rated your confidence higher than your scores suggest. This is common — the assessment is designed to surface gaps that feel familiar but aren't yet fluent.",
  };
  return {
    label: "Cautious", colour: "#90CDF4",
    tooltip: "You underestimated your own capability. Your scores were stronger than your confidence suggested.",
  };
}

function getHeroHeadline(score: number, growthThemes: string[]) {
  const themeStr = growthThemes.length > 0
    ? `Two themes to develop: ${growthThemes.slice(0, 2).join(", ")}.`
    : "Continue building depth across all domains.";
  if (score >= 81) return {
    headline: `Mature AI fluency. ${themeStr}`,
    sub: "Your capability profile shows consistent, high-quality AI practice across most domains. The sections below show where to deepen further.",
  };
  if (score >= 61) return {
    headline: `Strong AI fluency overall. ${themeStr}`,
    sub: "You apply AI effectively in most contexts. The cross-cutting patterns and domain detail below show where to build from here.",
  };
  if (score >= 41) return {
    headline: `Emerging AI capability. ${themeStr}`,
    sub: "You're building a solid foundation. The domain detail below shows where your practice is strongest and where to focus next.",
  };
  return {
    headline: "You're at the start of building AI capability. Several themes to develop.",
    sub: "The sections below show your current profile across all six domains and a suggested development path.",
  };
}

// ─── Score Circle ─────────────────────────────────────────────────────────────

function ScoreCircle({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const displayScore = (score / 10).toFixed(1);
  const level = getLevelInfo(score);
  return (
    <svg
      width={size} height={size}
      aria-label={`Overall AI capability score: ${displayScore} out of 10. Level: ${level.label}`}
      role="img" className="shrink-0"
    >
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="#68D391" strokeWidth={8} strokeLinecap="round"
        strokeDasharray={`${fill} ${circ}`}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x={size/2} y={size/2-4} textAnchor="middle" fill="#F7F8FA" fontSize={size*0.22} fontWeight="700" fontFamily="Sora, sans-serif">
        {displayScore}
      </text>
      <text x={size/2} y={size/2+size*0.14} textAnchor="middle" fill="rgba(247,248,250,0.5)" fontSize={size*0.1} fontFamily="Sora, sans-serif">
        /10
      </text>
    </svg>
  );
}

// ─── Domain Progress Bar ──────────────────────────────────────────────────────

function DomainBar({ score }: { score: number }) {
  const level = getLevelInfo(score);
  return (
    <div
      role="progressbar"
      aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}
      aria-valuetext={`${(score/10).toFixed(1)} out of 10 — ${level.label}`}
      className="w-full h-1.5 rounded-full overflow-hidden"
      style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${score}%`, backgroundColor: level.barColour }}
      />
    </div>
  );
}

// ─── Tooltip Badge ────────────────────────────────────────────────────────────

function TooltipBadge({ label, colour, tooltip, prefix }: {
  label: string; colour: string; tooltip: string; prefix?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <button
        className="flex items-center gap-1.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
        onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        type="button"
      >
        {prefix && <span className="text-[10px] text-white/30 uppercase tracking-widest">{prefix}</span>}
        <span style={{ color: colour }} className="font-semibold">{label}</span>
        <HelpCircle className="w-3 h-3 text-white/30 shrink-0" />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute bottom-full left-0 mb-2 z-50 w-64 bg-[#1a2332] border border-white/10 rounded-lg p-3 text-xs text-white/70 shadow-xl"
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}

// ─── Section Heading ──────────────────────────────────────────────────────────

function SectionHeading({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40">{label}</h2>
      {sub && <p className="text-xs text-white/50 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Skeleton blocks ──────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="bg-[#111827] border border-white/8 rounded-xl p-6 flex gap-6 animate-pulse">
      <div className="w-28 h-28 rounded-full bg-white/8 shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="h-4 w-2/3 bg-white/8 rounded" />
        <div className="h-3 w-full bg-white/8 rounded" />
        <div className="h-3 w-5/6 bg-white/8 rounded" />
        <div className="h-px bg-white/8 my-2" />
        <div className="flex gap-4">
          <div className="h-3 w-24 bg-white/8 rounded" />
          <div className="h-3 w-24 bg-white/8 rounded" />
        </div>
      </div>
    </div>
  );
}

function SectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-20 bg-white/4 rounded-xl" />
      ))}
    </div>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl p-4 text-sm text-white/60">
      <AlertCircle className="w-4 h-4 text-white/40 shrink-0" />
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="ml-auto flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors" type="button">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssessmentResultsPage() {
  const { sessionId: paramSessionId } = useParams<{ sessionId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // History for top bar dropdown
  const historyQuery = trpc.assessment.history.useQuery({});
  const completedSessions = useMemo(
    () => (historyQuery.data ?? []).filter((s: any) => s.state === "completed"),
    [historyQuery.data]
  );
  const inProgressSession = useMemo(
    () => (historyQuery.data ?? []).find((s: any) => s.state === "in_progress"),
    [historyQuery.data]
  );

  const activeSessionId = useMemo(() => {
    if (paramSessionId) return paramSessionId;
    return completedSessions[0]?.id ?? null;
  }, [paramSessionId, completedSessions]);

  const [historyOpen, setHistoryOpen] = useState(false);

  // Results data
  const resultsQuery = trpc.assessment.results.useQuery(
    { sessionId: activeSessionId! },
    { enabled: !!activeSessionId, retry: 1 }
  );

  // Development plan
  const planQuery = trpc.adaptiveLearning.getAdaptivePlan.useQuery(
    { sessionId: activeSessionId ?? undefined },
    { enabled: !!activeSessionId }
  );

  // Domain scores for capability profile
  const domainScoresForProfile = useMemo(() => {
    const breakdown = resultsQuery.data?.score?.breakdown as Record<string, any> | undefined;
    if (!breakdown?.capabilityScores) return [];
    const patterns = (resultsQuery.data as any)?.domainResponsePatterns ?? {};
    return Object.entries(breakdown.capabilityScores as Record<string, { score: number }>).map(([key, val]) => {
      const p = patterns[key];
      return {
        key, name: DOMAIN_LABELS[key as DomainKey] ?? key,
        score: val.score,
        total: p?.total, strong: p?.strong, acceptable: p?.acceptable,
        weak: p?.weak, poor: p?.poor, strongRate: p?.strongRate,
      };
    });
  }, [resultsQuery.data]);

  // Capability profile (cross-cutting + per-domain narratives) — loads independently
  const profileQuery = trpc.assessment.generateCapabilityProfile.useQuery(
    {
      sessionId: activeSessionId!,
      domainScores: domainScoresForProfile,
      overallScore: resultsQuery.data?.score?.overallScore ?? 0,
      roleLabel: (user as any)?.role ?? undefined,
    },
    {
      enabled: !!activeSessionId && domainScoresForProfile.length > 0 && !!resultsQuery.data,
      retry: 0,
      staleTime: 1000 * 60 * 10,
    }
  );

  // Telemetry: dashboard viewed
  const telemetryFired = useRef(false);
  useEffect(() => {
    if (resultsQuery.data && !telemetryFired.current) {
      telemetryFired.current = true;
      // event: assessment.dashboard.viewed { overallScore, completedAt }
    }
  }, [resultsQuery.data]);

  // Telemetry: cross-cutting section visible
  const crossCuttingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!crossCuttingRef.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        // event: assessment.cross-cutting.viewed
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(crossCuttingRef.current);
    return () => obs.disconnect();
  }, []);

  // Derived values
  const overallScore = resultsQuery.data?.score?.overallScore ?? 0;
  const breakdown = resultsQuery.data?.score?.breakdown as Record<string, any> | undefined;
  const capabilityScores = (breakdown?.capabilityScores ?? {}) as Record<string, { score: number }>;

  // Sorted domains (desc by score) — domain score appears only here and in dev plan
  const sortedDomains = useMemo(() =>
    DOMAIN_KEYS
      .map(key => ({
        key, name: DOMAIN_LABELS[key],
        score: capabilityScores[key]?.score ?? 0,
        colour: DOMAIN_COLOURS[key],
        Icon: getDomainIcon(key),
      }))
      .sort((a, b) => b.score - a.score),
    [capabilityScores]
  );

  const cipd = getCipdLevel(overallScore);
  const confCalib = resultsQuery.data?.confidenceCalibration as any;
  const confDiff = confCalib
    ? ((confCalib.overconfidentCount ?? 0) - (confCalib.underconfidentCount ?? 0)) / Math.max(confCalib.totalAnswers ?? 1, 1)
    : 0;
  const calib = getCalibLabel(confDiff);

  // Cohort anchor — average percentile across all domains
  const percentileData = (resultsQuery.data as any)?.percentileData ?? {};
  const percentileValues = Object.values(percentileData) as Array<{ percentile: number; normGroupLabel: string; isSynthetic: boolean }>;
  const overallPercentile = percentileValues.length > 0
    ? Math.round(percentileValues.reduce((sum, p) => sum + p.percentile, 0) / percentileValues.length)
    : null;
  const firstPercentile = percentileValues[0] ?? null;

  // Hero headline
  const growthThemes = useMemo(() => sortedDomains.slice(-2).map(d => d.name), [sortedDomains]);
  const { headline, sub } = getHeroHeadline(overallScore, growthThemes);

  // Dev plan: 3 lowest-scoring domains
  const devPriorities = useMemo(() => sortedDomains.slice(-3).reverse(), [sortedDomains]);

  // Plan items grouped by capability
  const planItems = useMemo(() => {
    const items = (planQuery.data as any)?.items ?? [];
    const grouped: Record<string, any[]> = {};
    for (const item of items) {
      const cap = item.module?.capability ?? "unknown";
      if (!grouped[cap]) grouped[cap] = [];
      grouped[cap].push(item);
    }
    return grouped;
  }, [planQuery.data]);

  const isLoading = resultsQuery.isLoading || historyQuery.isLoading;

  // ── No completed assessment ───────────────────────────────────────────────
  if (!historyQuery.isLoading && completedSessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-white/6 flex items-center justify-center">
          <BookOpen className="w-7 h-7 text-white/40" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white mb-2">No completed assessment yet</h1>
          <p className="text-sm text-white/50 max-w-sm">Complete an AI capability assessment to see your profile, domain scores, and development plan here.</p>
        </div>
        <Button onClick={() => navigate("/assessment")} className="bg-[#3B4EFF] hover:bg-[#2d3fd4] text-white">
          Take the assessment
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">

      {/* ── 1. TOP BAR ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Assessment date selector */}
        <div className="relative">
          <button
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
            onClick={() => setHistoryOpen(v => !v)}
            aria-haspopup="listbox"
            aria-expanded={historyOpen}
            type="button"
          >
            <span className="text-[10px] font-semibold tracking-widest uppercase text-white/30 mr-1">Assessment</span>
            {activeSessionId && (() => {
              const s = completedSessions.find((s: any) => s.id === activeSessionId);
              const d = s?.completedAt
                ? new Date(s.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                : "—";
              return <span className="font-medium text-white/80">{d}</span>;
            })()}
            {completedSessions.length > 1 && <ChevronDown className="w-3.5 h-3.5 text-white/40" />}
          </button>
          {historyOpen && completedSessions.length > 1 && (
            <div
              role="listbox"
              className="absolute top-full left-0 mt-1 z-50 min-w-[200px] bg-[#1a2332] border border-white/10 rounded-xl shadow-xl overflow-hidden"
            >
              {completedSessions.map((s: any) => {
                const d = s.completedAt
                  ? new Date(s.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                  : "—";
                const sc = s.score?.overallScore;
                return (
                  <button
                    key={s.id}
                    role="option"
                    aria-selected={s.id === activeSessionId}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-white/6 transition-colors",
                      s.id === activeSessionId ? "text-white bg-white/4" : "text-white/60"
                    )}
                    onClick={() => { navigate(`/assessment/results/${s.id}`); setHistoryOpen(false); }}
                  >
                    <span>{d}</span>
                    {sc !== undefined && <span className="text-xs text-white/40 tabular-nums">{(sc/10).toFixed(1)}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* In-progress indicator — compact, no full-width banner */}
        {inProgressSession && (
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span>
              New assessment
              {(inProgressSession as any).answeredCount !== undefined
                ? ` · ${(inProgressSession as any).answeredCount} questions answered`
                : ""} in progress
            </span>
            <Button
              size="sm" variant="outline"
              className="h-6 px-2.5 text-xs border-white/15 text-white/70 hover:text-white hover:border-white/30 bg-transparent"
              onClick={() => navigate(`/assessment/session/${(inProgressSession as any).id}`)}
            >
              Resume
            </Button>
          </div>
        )}
      </div>

      {/* ── 2. HERO ─────────────────────────────────────────────────────── */}
      {isLoading ? <HeroSkeleton /> : resultsQuery.error ? (
        <ErrorBlock message="Could not load your assessment results." onRetry={() => resultsQuery.refetch()} />
      ) : (
        <section aria-labelledby="hero-heading" className="bg-[#111827] border border-white/8 rounded-xl p-6">
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30 mb-4" id="hero-heading">
            Your AI Capability Profile
          </p>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Score circle + cohort anchor */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <ScoreCircle score={overallScore} size={120} />
              {/* Cohort anchor — only when data available */}
              {overallPercentile !== null && firstPercentile && (
                <div className="text-center">
                  <p className="text-xs font-semibold text-white/80">
                    Top {100 - overallPercentile}%
                    <span className="text-white/40 font-normal"> · {firstPercentile.normGroupLabel}</span>
                  </p>
                  <p className="text-[10px] text-white/30 mt-0.5">*See footnote below</p>
                </div>
              )}
            </div>
            {/* Narrative — no AI-Ready badge, headline adapts to score */}
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-white leading-snug mb-2">{headline}</h1>
              <p className="text-sm text-white/60 leading-relaxed">{sub}</p>
            </div>
          </div>

          {/* Badges row */}
          <div className="mt-5 pt-4 border-t border-white/8 flex flex-wrap items-center gap-x-5 gap-y-2">
            <TooltipBadge label={cipd.label} colour={cipd.colour} tooltip={cipd.tooltip} prefix="CIPD alignment:" />
            <TooltipBadge label={calib.label} colour={calib.colour} tooltip={calib.tooltip} prefix="Confidence:" />
            {/* Cohort footnote — inline text in DOM for screen readers */}
            {overallPercentile !== null && firstPercentile && (
              <p className="text-[10px] text-white/30">
                *Synthetic benchmark · {firstPercentile.normGroupLabel}
              </p>
            )}
            <Button
              size="sm" variant="outline"
              className="ml-auto h-7 px-3 text-xs border-white/15 text-white/60 hover:text-white hover:border-white/30 bg-transparent"
              onClick={() => navigate("/assessment")}
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reassess
            </Button>
          </div>
        </section>
      )}

      {/* ── 3. CROSS-CUTTING PATTERNS ────────────────────────────────────── */}
      <section ref={crossCuttingRef} aria-labelledby="cross-cutting-heading">
        <SectionHeading
          label="The patterns we see across your responses"
          sub="Cross-cutting themes that show up in multiple domains. For domain-specific detail, see below."
        />
        {isLoading ? <SectionSkeleton rows={2} /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* What you do well */}
            <div className="bg-[#111827] border border-white/8 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">What you do well</h3>
              </div>
              {profileQuery.isLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2].map(i => <div key={i} className="h-12 bg-white/4 rounded" />)}
                </div>
              ) : (profileQuery.data as any)?.profile?.crossCuttingStrengths?.length ? (
                <ul className="space-y-4">
                  {((profileQuery.data as any).profile.crossCuttingStrengths as Array<{ claim: string; evidence: string }>).map((bullet, i) => (
                    <li key={i} className="text-sm leading-relaxed">
                      <strong className="text-white font-semibold">{bullet.claim}</strong>{" "}
                      <span className="text-white/55">{bullet.evidence}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-white/40 italic">No cross-cutting strengths identified. See domain detail below.</p>
              )}
            </div>

            {/* Where to grow */}
            <div className="bg-[#111827] border border-white/8 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center">
                  <Target className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">Where to grow</h3>
              </div>
              {profileQuery.isLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2].map(i => <div key={i} className="h-12 bg-white/4 rounded" />)}
                </div>
              ) : (profileQuery.data as any)?.profile?.crossCuttingGrowth?.length ? (
                <ul className="space-y-4">
                  {((profileQuery.data as any).profile.crossCuttingGrowth as Array<{ claim: string; evidence: string }>).map((bullet, i) => (
                    <li key={i} className="text-sm leading-relaxed">
                      <strong className="text-white font-semibold">{bullet.claim}</strong>{" "}
                      <span className="text-white/55">{bullet.evidence}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-white/40 italic">Your development areas are concentrated in specific domains — see below.</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── 4. DOMAIN DETAIL ─────────────────────────────────────────────── */}
      <section aria-labelledby="domain-detail-heading">
        <SectionHeading label="Domain detail · best to worst" />
        {isLoading ? <SectionSkeleton rows={6} /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sortedDomains.map(domain => {
              const level = getLevelInfo(domain.score);
              const narrative = (profileQuery.data as any)?.profile?.domainNarratives?.[domain.key];
              const Icon = domain.Icon;
              return (
                <article
                  key={domain.key}
                  className="bg-[#111827] border border-white/8 rounded-xl p-5 flex flex-col gap-3"
                  aria-label={`${domain.name}: ${(domain.score/10).toFixed(1)} out of 10, ${level.label}`}
                >
                  {/* Top row: domain title + score + level */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${domain.colour}20` }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: domain.colour }} />
                      </div>
                      <h3 className="text-sm font-semibold text-white truncate">{domain.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-white tabular-nums">{(domain.score/10).toFixed(1)}</span>
                      <span className="text-[10px] font-semibold tracking-widest uppercase text-white/40">{level.label}</span>
                    </div>
                  </div>

                  {/* Progress bar — level-semantic colours, no amber/red */}
                  <DomainBar score={domain.score} />

                  {/* Inline narrative — surfaced by default, no click required */}
                  {profileQuery.isLoading ? (
                    <div className="h-8 bg-white/4 rounded animate-pulse" />
                  ) : narrative ? (
                    <p className="text-xs text-white/60 leading-relaxed">{narrative}</p>
                  ) : null}

                  {/* Full breakdown link */}
                  <button
                    className="self-start flex items-center gap-1 text-xs text-white/35 hover:text-white/70 transition-colors mt-auto"
                    onClick={() => {
                      // event: assessment.domain.card.full-breakdown-clicked { domain }
                      toast.info(`Full breakdown for ${domain.name} — coming in the next release.`);
                    }}
                    type="button"
                  >
                    Full breakdown <ChevronRight className="w-3 h-3" />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 5. DEVELOPMENT PLAN ──────────────────────────────────────────── */}
      <section aria-labelledby="dev-plan-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/40">
            Your development plan · 3 priorities
          </h2>
          <Link
            href="/learning"
            className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
          >
            View full learning plan <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {isLoading || planQuery.isLoading ? <SectionSkeleton rows={3} /> : (
          devPriorities.every(d => d.score >= 80) ? (
            <div className="bg-[#111827] border border-white/8 rounded-xl p-5 text-sm text-white/50">
              All your domain scores are above target. Consider revisiting in 6 months.
            </div>
          ) : (
            <div className="bg-[#111827] border border-white/8 rounded-xl overflow-hidden divide-y divide-white/6">
              {devPriorities.filter(d => d.score < 80).map(domain => {
                const level = getLevelInfo(domain.score);
                // Target score = next level threshold above current
                const target = level.nextThreshold;
                const items = planItems[domain.key] ?? [];
                const totalMins = items.reduce((sum: number, item: any) => sum + (item.module?.durationMins ?? 0), 0);
                // Time formatting: hours for ≥60 mins, mins otherwise
                const timeStr = totalMins >= 60
                  ? `~${(totalMins / 60).toFixed(1)} hours`
                  : totalMins > 0 ? `~${totalMins} mins` : null;
                const firstModule = items[0]?.module;
                const secondModule = items[1]?.module;
                const extraCount = Math.max(0, items.length - 2);
                return (
                  <div key={domain.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                    {/* Domain + score → target */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${domain.colour}20` }}
                      >
                        <domain.Icon className="w-3 h-3" style={{ color: domain.colour }} />
                      </div>
                      <span className="text-sm font-medium text-white truncate">{domain.name}</span>
                      <span className="text-xs text-white/40 tabular-nums shrink-0">
                        {(domain.score/10).toFixed(1)} → {(target/10).toFixed(1)}
                      </span>
                    </div>
                    {/* Module info */}
                    <div className="text-xs text-white/50 flex-1 min-w-0">
                      {timeStr && <span className="mr-2">{timeStr}</span>}
                      {firstModule && <span className="text-white/60">{firstModule.title}</span>}
                      {secondModule && <span className="text-white/40">, {secondModule.title}</span>}
                      {extraCount > 0 && <span className="text-white/30"> +{extraCount} more</span>}
                    </div>
                    {/* Start button */}
                    {firstModule && (
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs bg-[#3B4EFF] hover:bg-[#2d3fd4] text-white shrink-0"
                        onClick={() => {
                          // event: assessment.development-plan.start-clicked { domain }
                          navigate(`/learning/module/${firstModule.id}`);
                        }}
                      >
                        <Play className="w-3 h-3 mr-1" /> Start
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </section>

    </div>
  );
}
