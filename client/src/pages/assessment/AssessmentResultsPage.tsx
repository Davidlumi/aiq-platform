/**
 * AssessmentResultsPage — Individual AI Capability Assessment Dashboard (brief v2)
 *
 * v2 changes:
 *   - Hero simplified: cohort anchor removed, CIPD/calibration badges removed
 *   - Hero: two-strip layout (header strip + content strip)
 *   - Doughnut: level-appropriate colour (green ≥80, blue 65–79, muted-blue 50–64, tertiary <50)
 *   - Hero headline: N themes derived from actual priority count
 *   - Domain colour palette: updated to v2 spec hex values
 *   - Domain cards: score + level stacked vertically (right-aligned column)
 *   - Domain cards: bar fill = domain colour
 *   - Domain cards: domain colour only on icon/icon-bg/bar — NOT on text
 *   - Cross-cutting bullets: domain reference dots after domain name
 *   - Development plan: N priorities matches headline theme count
 *   - Development plan: marginal-target fix (within 0.2 of next threshold → half-step)
 *   - Development plan: coloured dot prefix on each priority row
 *   - Development plan: empty-state row for domains with no modules
 *
 * Full path: per-scenario response patterns from backend.
 * Fallback: if generateCapabilityProfile fails, scores + bars render without narrative.
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { formatScore } from "@/lib/peakon-colors";
import { useParams, useLocation, Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronDown, TrendingUp, Target,
  RotateCcw, BookOpen, ChevronRight, AlertCircle,
  RefreshCw, Play, Loader2,
} from "lucide-react";
import { ShimmerBlock } from "@/components/ui/loading";
import { DOMAIN_LABELS, DOMAIN_COLOURS, DOMAIN_BG_COLOURS, DOMAIN_KEYS, type DomainKey } from "@shared/brand";
import { getDomainIcon } from "@/lib/brand-icons";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Level thresholds (v2: bar colour = domain colour, passed in) ─────────────

const LEVEL_THRESHOLDS = [
  { label: "EXPERT",     min: 80 },
  { label: "PROFICIENT", min: 65 },
  { label: "DEVELOPING", min: 50 },
  { label: "BEGINNER",   min: 35 },
  { label: "NOVICE",     min:  0 },
] as const;

function getLevelInfo(score: number): { label: string; nextThreshold: number } {
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (score >= LEVEL_THRESHOLDS[i].min) {
      let nextThreshold: number;
      if (i === 0) {
        // Already Expert — target half-step above current
        nextThreshold = Math.min(score + 5, 100);
      } else {
        const rawNext = LEVEL_THRESHOLDS[i - 1].min;
        // Marginal-target fix (brief v2 + fix brief): if within 2 raw pts (0.2/10) of next
        // level threshold, target half-step BEYOND the threshold (not just the threshold).
        // e.g. 7.9 → gap 0.1 ≤ 0.2 → target = 8.0 + 0.5 = 8.5
        const gap = rawNext - score;
        nextThreshold = gap <= 2 ? rawNext + 5 : rawNext;
      }
      return { label: LEVEL_THRESHOLDS[i].label, nextThreshold };
    }
  }
  return { label: "NOVICE", nextThreshold: 35 };
}

// ─── Doughnut colour by score band (v2 spec, fix brief: 7.8 = Proficient → info-blue) ──
function getDoughnutColour(score: number): { colour: string; opacity: number } {
  if (score >= 80) return { colour: "var(--color-text-success, #4ADE80)", opacity: 1 };   // Expert → green
  if (score >= 65) return { colour: "var(--color-text-info, #60A5FA)",    opacity: 1 };   // Proficient → info-blue
  if (score >= 50) return { colour: "var(--color-text-info, #60A5FA)",    opacity: 0.6 }; // Developing → muted info-blue
  return { colour: "rgba(148,163,184,0.55)", opacity: 1 };                                // Beginner/Novice → tertiary
}

// ─── Hero headline (v2: N derived from actual priority count) ─────────────────
function getHeroHeadline(score: number, priorityCount: number, growthThemes: string[]): {
  headline: string; sub: string;
} {
  const themeNames = growthThemes.slice(0, 2).join(" and ");
  const themeStr = priorityCount > 0
    ? `${priorityCount} ${priorityCount === 1 ? "theme" : "themes"} to develop${themeNames ? `, led by ${themeNames}` : ""}.`
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
    headline: `You're at the start of building AI capability. ${themeStr}`,
    sub: "The sections below show your current profile across all six domains and a suggested development path.",
  };
}

// ─── O-1: StrengthsFallback — real computed copy when LLM profile unavailable ─────
function StrengthsFallback({
  sortedDomains,
  overallScore,
}: {
  sortedDomains: { key: string; name: string; score: number }[];
  overallScore: number;
}) {
  // Top 2 domains by score
  const top2 = sortedDomains.slice(0, 2);
  // Bottom 2 domains by score
  const bottom2 = [...sortedDomains].reverse().slice(0, 2);

  // Determine profile shape
  const allAbove60 = sortedDomains.every(d => d.score >= 60);
  const topScore = top2[0]?.score ?? 0;
  const bottomScore = bottom2[0]?.score ?? 0;
  const spread = topScore - bottomScore;
  const isBalanced = spread < 15;

  if (sortedDomains.length === 0 || overallScore === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Complete the assessment to see your strength profile.
      </p>
    );
  }

  const bullets: { claim: string; evidence: string }[] = [];

  if (isBalanced && allAbove60) {
    // Balanced strong profile
    bullets.push({
      claim: "Consistent capability across all domains.",
      evidence: `Your scores are closely grouped (${bottomScore}–${topScore}), indicating broad AI fluency rather than isolated pockets of strength.`,
    });
    bullets.push({
      claim: `${top2[0]?.name ?? "AI Interaction"} leads your profile.`,
      evidence: `Your highest score (${topScore}) is in ${top2[0]?.name ?? "AI Interaction"}, showing particularly strong practice in this area.`,
    });
  } else if (isBalanced) {
    // Balanced developing profile
    bullets.push({
      claim: `${top2[0]?.name ?? "AI Interaction"} is your strongest area.`,
      evidence: `With a score of ${topScore}, this is where your AI capability is most developed. ${top2[1] ? `${top2[1].name} (${top2[1].score}) is close behind.` : ""}`,
    });
    bullets.push({
      claim: "Your scores are developing evenly.",
      evidence: "The spread across domains is narrow, suggesting consistent progress rather than uneven development.",
    });
  } else {
    // Differentiated profile — clear leaders
    bullets.push({
      claim: `${top2[0]?.name ?? "AI Interaction"} is your standout strength.`,
      evidence: `Your score of ${topScore} in ${top2[0]?.name ?? "AI Interaction"} is your highest, indicating confident, effective practice in this domain.`,
    });
    if (top2[1]) {
      bullets.push({
        claim: `${top2[1].name} is a secondary strength.`,
        evidence: `A score of ${top2[1].score} shows solid capability here, providing a strong foundation for the domains still developing.`,
      });
    }
  }

  return (
    <ul className="space-y-4">
      {bullets.map((b, i) => (
        <li key={i} className="text-sm leading-relaxed">
          <strong className="text-foreground font-semibold">{b.claim}</strong>{" "}
          <span className="text-foreground/55">{b.evidence}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Domain Mini Bars (v2.2: accessible horizontal bars replacing radar chart) ────
function DomainMiniBars({ domains }: { domains: { key: string; name?: string; score: number; colour: string }[] }) {
  if (domains.length === 0) return null;
  const DOMAIN_SHORT: Record<string, string> = {
    ai_interaction:         "Interact",
    ai_output_evaluation:   "Evaluate",
    // O-2: full words — no mid-word truncation
    ai_workflow_design:     "Workflow",
    workforce_ai_readiness: "Readiness",
    ai_ethics_trust:        "Ethics",
    ai_change_leadership:   "Change",
  };
  return (
    // O-2: widened to w-[155px] so the 52px label column has room for "Readiness" (9 chars at 9px)
    <div className="flex flex-col gap-1.5 w-[155px] shrink-0" aria-label="Domain scores">
      {domains.map(d => (
        <div key={d.key} className="flex items-center gap-1.5">
          {/* O-2: w-[52px] no-truncate — all six labels fit cleanly */}
          <span className="text-[9px] text-muted-foreground w-[52px] text-right leading-tight">{DOMAIN_SHORT[d.key] ?? d.key.replace(/_/g, " ").slice(0, 10)}</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${d.score}%`, background: d.colour }}
            />
          </div>
          <span className="text-[9px] font-mono text-muted-foreground w-[22px] text-right">{formatScore(d.score)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Confidence Indicator (v2.2: response pattern mini-bar with tooltip) ───────────
function ConfidenceIndicator({ strong, acceptable, weak, total }: { strong: number; acceptable: number; weak: number; total: number }) {
  if (!total) return null;
  const strongPct = (strong / total) * 100;
  const acceptablePct = (acceptable / total) * 100;
  const weakPct = (weak / total) * 100;
  return (
    <div className="group relative flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full overflow-hidden flex" aria-label={`Response confidence: ${strong} strong, ${acceptable} acceptable, ${weak} needs work out of ${total}`}>
        <div className="h-full bg-emerald-500/70" style={{ width: `${strongPct}%` }} />
        <div className="h-full bg-blue-500/50" style={{ width: `${acceptablePct}%` }} />
        <div className="h-full bg-amber-500/50" style={{ width: `${weakPct}%` }} />
      </div>
      <span className="text-[9px] text-foreground/30 tabular-nums shrink-0">{strong}/{total}</span>
      {/* Tooltip */}
      <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-50 w-52 p-2 rounded-md bg-popover text-popover-foreground border border-border shadow-md">
        <p className="text-[10px] font-medium mb-1">Response Confidence Profile</p>
        <p className="text-[9px] text-muted-foreground leading-relaxed">Shows the consistency of your responses across items in this domain. Green = decisive answers, Blue = moderate certainty, Amber = uncertain or contradictory responses.</p>
      </div>
    </div>
  );
}

// ─── Score Doughnut (v2: r=50 scaled, sw=11 scaled, level-appropriate colour) ──
function ScoreDoughnut({ score, size = 120 }: { score: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = 50 * (size / 120);
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const sw = 11 * (size / 120);
  const displayScore = formatScore(score);
  const level = getLevelInfo(score);
  const { colour, opacity } = getDoughnutColour(score);
  return (
    <svg
      width={size} height={size}
      aria-label={`Overall AI capability score: ${displayScore} out of 10. Level: ${level.label}`}
      role="img" className="shrink-0"
    >
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={sw} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={colour} strokeOpacity={opacity} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${fill} ${circ}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#F7F8FA" fontSize={size * 0.22} fontWeight="700" fontFamily="Sora, sans-serif">
        {displayScore}
      </text>
      <text x={cx} y={cy + size * 0.14} textAnchor="middle" fill="rgba(247,248,250,0.45)" fontSize={size * 0.1} fontFamily="Sora, sans-serif">
        /10
      </text>
    </svg>
  );
}

// ─── Domain Progress Bar (v2: bar fill = domain colour) ──────────────────────
function DomainBar({ score, domainColour }: { score: number; domainColour: string }) {
  const level = getLevelInfo(score);
  return (
    <div
      role="progressbar"
      aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}
      aria-valuetext={`${formatScore(score)} out of 10 — ${level.label}`}
      className="w-full h-1.5 rounded-full overflow-hidden"
      style={{ backgroundColor: "var(--border)" }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${score}%`, backgroundColor: domainColour }}
      />
    </div>
  );
}

// ─── Domain Dot (v2: 6×6 inline-block, aria-hidden) ──────────────────────────
function DomainDot({ colour }: { colour: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block rounded-full shrink-0"
      style={{ width: 6, height: 6, backgroundColor: colour, marginBottom: 1 }}
    />
  );
}

// ─── Section Heading ──────────────────────────────────────────────────────────

function SectionHeading({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">{label}</h2>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Skeleton blocks (branded aiq-shimmer) ────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="h-10 border-b border-border/60">
        <ShimmerBlock className="h-full w-full rounded-none" />
      </div>
      <div className="flex gap-6 p-6">
        <ShimmerBlock className="w-28 h-28 rounded-full shrink-0" />
        <div className="flex-1 space-y-3 pt-1">
          <ShimmerBlock className="h-4 w-2/3" />
          <ShimmerBlock className="h-3 w-full" />
          <ShimmerBlock className="h-3 w-5/6" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for a cross-cutting bullet card (2 bullets = 2 shimmer rows each) */
function CrossCuttingCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      {/* Icon + title row */}
      <div className="flex items-center gap-2 mb-4">
        <ShimmerBlock className="w-6 h-6 rounded-full" />
        <ShimmerBlock className="h-3 w-28" />
      </div>
      {/* Two bullet placeholders */}
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="space-y-1.5">
            <ShimmerBlock className="h-3 w-full" brand />
            <ShimmerBlock className="h-3 w-5/6" />
            <ShimmerBlock className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for a domain detail card narrative area */
function DomainNarrativeSkeleton() {
  return (
    <div className="space-y-1.5">
      <ShimmerBlock className="h-2.5 w-full" />
      <ShimmerBlock className="h-2.5 w-4/5" />
    </div>
  );
}

/** Skeleton for the full domain grid (6 cards) */
function DomainGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
          {/* Icon + title | score */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShimmerBlock className="w-6 h-6 rounded" />
              <ShimmerBlock className="h-3 w-28" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <ShimmerBlock className="h-4 w-8" brand />
              <ShimmerBlock className="h-2 w-14" />
            </div>
          </div>
          {/* Bar */}
          <ShimmerBlock className="h-1.5 w-full rounded-full" />
          {/* Narrative */}
          <DomainNarrativeSkeleton />

        </div>
      ))}
    </div>
  );
}

/** Skeleton for the dev plan rows */
function DevPlanSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <ShimmerBlock className="w-2 h-2 rounded-full shrink-0" />
          <ShimmerBlock className="h-3 w-32" brand />
          <ShimmerBlock className="h-3 w-12" />
          <div className="flex-1" />
          <ShimmerBlock className="h-3 w-40" />
          <ShimmerBlock className="h-7 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-foreground/4 border border-border rounded-xl p-4 text-sm text-muted-foreground">
      <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground/80 transition-colors" type="button">
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

  // Capability profile (cross-cutting + per-domain narratives) — uses mutation to avoid URL-too-long on GET
  const profileMutation = trpc.assessment.generateCapabilityProfile.useMutation();
  const profileFiredRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${activeSessionId}-${domainScoresForProfile.length}`;
    // Allow retry if the previous attempt for this key failed
    const alreadySucceeded = profileFiredRef.current === key && profileMutation.isSuccess;
    if (
      activeSessionId &&
      domainScoresForProfile.length > 0 &&
      resultsQuery.data &&
      !alreadySucceeded &&
      !profileMutation.isPending
    ) {
      profileFiredRef.current = key;
      profileMutation.mutate(
        {
          sessionId: activeSessionId,
          domainScores: domainScoresForProfile,
          overallScore: resultsQuery.data?.score?.overallScore ?? 0,
          roleLabel: (user as any)?.role ?? undefined,
        },
        {
          onError: () => {
            // Reset ref so a subsequent render can retry
            profileFiredRef.current = null;
          },
        }
      );
    }
  }, [activeSessionId, domainScoresForProfile, resultsQuery.data, profileMutation.isSuccess, profileMutation.isPending]);
  // Alias to keep template references unchanged
  const profileQuery = {
    isLoading: profileMutation.isPending,
    data: profileMutation.data,
    error: profileMutation.error,
  };

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

  // Sorted domains (desc by score)
  const sortedDomains = useMemo(() =>
    DOMAIN_KEYS
      .map(key => ({
        key, name: DOMAIN_LABELS[key],
        score: capabilityScores[key]?.score ?? 0,
        colour: DOMAIN_COLOURS[key],
        bgColour: DOMAIN_BG_COLOURS[key],
        Icon: getDomainIcon(key),
      }))
      .sort((a, b) => b.score - a.score),
    [capabilityScores]
  );

  // Dev plan: lowest-scoring domains below their next threshold (max 3)
  const devPriorities = useMemo(() => {
    const belowTarget = sortedDomains.filter(d => {
      const { nextThreshold } = getLevelInfo(d.score);
      return d.score < nextThreshold;
    });
    return belowTarget.slice(-3).reverse();
  }, [sortedDomains]);

  // Hero headline: N = devPriorities.length, themes = names of lowest-scoring priorities
  const growthThemes = useMemo(() => devPriorities.slice(0, 2).map(d => d.name), [devPriorities]);
  const { headline, sub } = getHeroHeadline(overallScore, devPriorities.length, growthThemes);

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
        <div className="w-16 h-16 rounded-full bg-foreground/6 flex items-center justify-center">
          <BookOpen className="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground mb-2">No completed assessment yet</h1>
          <p className="text-sm text-muted-foreground max-w-sm">Complete an AI capability assessment to see your profile, domain scores, and development plan here.</p>
        </div>
        <Button onClick={() => navigate("/assessment")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
            className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 rounded"
            onClick={() => setHistoryOpen(v => !v)}
            aria-haspopup="listbox"
            aria-expanded={historyOpen}
            type="button"
          >
            <span className="text-[10px] font-semibold tracking-widest uppercase text-foreground/30 mr-1">Assessment</span>
            {activeSessionId && (() => {
              const s = completedSessions.find((s: any) => s.id === activeSessionId);
              const completedAt = s?.completedAt ? new Date(s.completedAt) : null;
              const d = completedAt
                ? completedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                : "—";
              // Recency context: compute days ago at render time (P3 fix)
              const daysAgo = completedAt
                ? Math.floor((Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24))
                : null;
              const recency = daysAgo === null ? null
                : daysAgo === 0 ? "today"
                : daysAgo === 1 ? "1 day ago"
                : `${daysAgo} days ago`;
              return (
                <>
                  <span className="font-medium text-foreground/80">{d}</span>
                  {recency && (
                    <span className="text-[10px] text-foreground/30 ml-1">· {recency}</span>
                  )}
                </>
              );
            })()}
            {completedSessions.length > 1 && <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          {historyOpen && completedSessions.length > 1 && (
            <div
              role="listbox"
              className="absolute top-full left-0 mt-1 z-50 min-w-[200px] bg-[#1a2332] border border-border rounded-xl shadow-xl overflow-hidden"
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
                      "w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-foreground/6 transition-colors",
                      s.id === activeSessionId ? "text-foreground bg-foreground/8" : "text-muted-foreground"
                    )}
                    onClick={() => { navigate(`/assessment/results/${s.id}`); setHistoryOpen(false); }}
                  >
                    <span>{d}</span>
                    {sc !== undefined && <span className="text-xs text-muted-foreground tabular-nums">{formatScore(sc)}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* In-progress indicator — visible resume banner (#17 save/resume) */}
        {inProgressSession && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-blue-500/20 bg-blue-500/5">
            <div className="w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
              <Play className="w-3 h-3 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-foreground/80">
                Assessment in progress
              </span>
              {(inProgressSession as any).answeredCount !== undefined && (
                <span className="text-[10px] text-muted-foreground ml-1.5">
                  · {(inProgressSession as any).answeredCount} questions answered
                </span>
              )}
            </div>
            <Button
              size="sm" variant="outline"
              className="h-7 px-3 text-xs border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-500/50 bg-transparent"
              onClick={() => navigate(`/assessment/${(inProgressSession as any).id}`)}
            >
              <Play className="w-3 h-3 mr-1" /> Resume
            </Button>
          </div>
        )}
      </div>

      {/* ── 2. HERO ─────────────────────────────────────────────────────── */}
      {isLoading ? <HeroSkeleton /> : resultsQuery.error ? (
        <ErrorBlock message="Could not load your assessment results." onRetry={() => resultsQuery.refetch()} />
      ) : (
        <section aria-labelledby="hero-heading" className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header strip */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-foreground/30" id="hero-heading">
                Your AI Capability Profile
              </p>
              {profileQuery.isLoading && (
                <span className="flex items-center gap-1.5 text-[10px] text-foreground/35">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generating insights…
                </span>
              )}
              {profileQuery.error && !profileQuery.isLoading && (
                <button
                  onClick={() => { profileFiredRef.current = null; profileMutation.reset(); }}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground/80 transition-colors"
                  type="button"
                >
                  <RefreshCw className="w-3 h-3" /> Retry insights
                </button>
              )}
            </div>
            <Button
              size="sm" variant="outline"
              className="h-7 px-3 text-xs border-border text-muted-foreground hover:text-foreground hover:border-border/80 bg-transparent"
              onClick={() => navigate("/assessment?new=1")}
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reassess
            </Button>
          </div>
          {/* Content strip — doughnut + radar + narrative */}
          <div className="flex flex-col sm:flex-row gap-6 items-start px-6 py-5">
            <div className="flex items-center gap-4 shrink-0">
              <ScoreDoughnut score={overallScore} size={120} />
              {sortedDomains.length >= 6 && (
                <div className="hidden md:block">
                  <DomainMiniBars
                    domains={DOMAIN_KEYS.map(k => ({
                      key: k,
                      score: capabilityScores[k]?.score ?? 0,
                      colour: DOMAIN_COLOURS[k],
                    }))}
                  />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-foreground leading-snug mb-2">{headline}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">{sub}</p>
            </div>
          </div>
        </section>
      )}

      {/* ── 3. CROSS-CUTTING PATTERNS ────────────────────────────────────── */}
      <section ref={crossCuttingRef} aria-labelledby="cross-cutting-heading">
        <SectionHeading
          label="The patterns we see across your responses"
          sub="Cross-cutting themes that show up in multiple domains. For domain-specific detail, see below."
        />
        {/* Domain colour legend for inline dots (fix brief item 8: inline pattern requires legend) */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
          {DOMAIN_KEYS.map(dk => (
            <span key={dk} className="flex items-center gap-1.5 text-[10px] text-foreground/35">
              <DomainDot colour={DOMAIN_COLOURS[dk]} />
              {DOMAIN_LABELS[dk]}
            </span>
          ))}
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CrossCuttingCardSkeleton />
            <CrossCuttingCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* What you do well */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 dark:text-emerald-400 text-emerald-600" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">What you do well</h3>
              </div>
              {profileQuery.isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="space-y-1.5">
                      <ShimmerBlock className="h-3 w-full" brand />
                      <ShimmerBlock className="h-3 w-5/6" />
                      <ShimmerBlock className="h-3 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (profileQuery.data as any)?.profile?.crossCuttingStrengths?.length ? (
                <ul className="space-y-4">
                  {((profileQuery.data as any).profile.crossCuttingStrengths as Array<{ claim: string; evidence: string; domains?: string[] }>).map((bullet, i) => (
                    <li key={i} className="text-sm leading-relaxed">
                      {/* Inline dots: rendered immediately after each domain name mention (fix brief item 8) */}
                      <strong className="text-foreground font-semibold">{bullet.claim}</strong>{" "}
                      <span className="text-foreground/55">
                        {bullet.evidence}
                        {bullet.domains && bullet.domains.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 ml-1.5 align-middle">
                            {bullet.domains.map((dk) => {
                              const c = DOMAIN_COLOURS[dk as DomainKey];
                              return c ? <DomainDot key={dk} colour={c} /> : null;
                            })}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                // O-1: Real computed strengths copy — never ship placeholder text
                <StrengthsFallback sortedDomains={sortedDomains} overallScore={overallScore} />
              )}
            </div>

            {/* Where to grow */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center">
                  <Target className="w-3.5 h-3.5 dark:text-blue-400 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Where to grow</h3>
              </div>
              {profileQuery.isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="space-y-1.5">
                      <ShimmerBlock className="h-3 w-full" brand />
                      <ShimmerBlock className="h-3 w-5/6" />
                      <ShimmerBlock className="h-3 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (profileQuery.data as any)?.profile?.crossCuttingGrowth?.length ? (
                <ul className="space-y-4">
                  {((profileQuery.data as any).profile.crossCuttingGrowth as Array<{ claim: string; evidence: string; domains?: string[] }>).map((bullet, i) => (
                    <li key={i} className="text-sm leading-relaxed">
                      {/* Inline dots: rendered at end of evidence sentence (fix brief item 8) */}
                      <strong className="text-foreground font-semibold">{bullet.claim}</strong>{" "}
                      <span className="text-foreground/55">
                        {bullet.evidence}
                        {bullet.domains && bullet.domains.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 ml-1.5 align-middle">
                            {bullet.domains.map((dk) => {
                              const c = DOMAIN_COLOURS[dk as DomainKey];
                              return c ? <DomainDot key={dk} colour={c} /> : null;
                            })}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">Your development areas are concentrated in specific domains — see below.</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── 4. DOMAIN DETAIL ─────────────────────────────────────────────── */}
      <section aria-labelledby="domain-detail-heading">
        <SectionHeading label="Domain detail · best to worst" />
        {isLoading ? <DomainGridSkeleton /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sortedDomains.map(domain => {
              const level = getLevelInfo(domain.score);
              const narrative = (profileQuery.data as any)?.profile?.domainNarratives?.[domain.key];
              const Icon = domain.Icon;
              return (
                <article
                  key={domain.key}
                  className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3"
                  aria-label={`${domain.name}: ${formatScore(domain.score)} out of 10, ${level.label}`}
                >
                  {/* Top row: icon+title | score+level vertical stack (v2) */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Domain colour on icon/icon-bg only — NOT on text */}
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: domain.bgColour }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: domain.colour }} />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground truncate">{domain.name}</h3>
                    </div>
                    {/* Score + level: vertical stack, right-aligned (v2 spec) */}
                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                      <span className="text-sm font-bold text-foreground tabular-nums leading-none">
                        {formatScore(domain.score)}
                      </span>
                      <span className="text-[9px] font-semibold tracking-widest uppercase text-foreground/35 leading-none">
                        {level.label}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar — domain colour fill (v2 spec) */}
                  <DomainBar score={domain.score} domainColour={domain.colour} />

                  {/* Confidence indicator — response pattern mini-bar (v2.1 #20) */}
                  {(() => {
                    const patterns = (resultsQuery.data as any)?.domainResponsePatterns ?? {};
                    const p = patterns[domain.key];
                    if (!p || !p.total) return null;
                    return <ConfidenceIndicator strong={p.strong ?? 0} acceptable={p.acceptable ?? 0} weak={p.weak ?? 0} total={p.total} />;
                  })()}

                  {/* Inline narrative — surfaced by default, no click required */}
                  {profileQuery.isLoading ? (
                    <DomainNarrativeSkeleton />
                  ) : narrative ? (
                    <p className="text-xs text-muted-foreground leading-relaxed">{narrative}</p>
                  ) : null}


                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 5. DEVELOPMENT PLAN ──────────────────────────────────────────── */}
      <section aria-labelledby="dev-plan-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">
            Your development plan · {devPriorities.length} {devPriorities.length === 1 ? "priority" : "priorities"}
          </h2>
          <Link
            href="/learning"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-md border border-primary/20 hover:border-primary/40 bg-primary/5"
          >
            View full learning plan <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {isLoading || planQuery.isLoading ? <DevPlanSkeleton rows={3} /> : (
          devPriorities.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-5 text-sm text-muted-foreground">
              All your domain scores are at or above target. Consider revisiting in 6 months.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
              {devPriorities.map(domain => {
                const level = getLevelInfo(domain.score);
                const target = level.nextThreshold;
                const items = planItems[domain.key] ?? [];
                const totalMins = items.reduce((sum: number, item: any) => sum + (item.module?.durationMins ?? 0), 0);
                const timeStr = totalMins >= 60
                  ? `~${(totalMins / 60).toFixed(1)} hours`
                  : totalMins > 0 ? `~${totalMins} mins` : null;
                const firstModule = items[0]?.module;
                const secondModule = items[1]?.module;
                const extraCount = Math.max(0, items.length - 2);
                return (
                  <div key={domain.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                    {/* Coloured dot prefix + domain name + score → target (v2) */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <DomainDot colour={domain.colour} />
                      <span className="text-sm font-medium text-foreground truncate">{domain.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {formatScore(domain.score)} → {formatScore(target)}
                      </span>
                    </div>
                    {/* Module info */}
                    <div className="text-xs text-muted-foreground flex-1 min-w-0">
                      {timeStr && <span className="mr-2">{timeStr}</span>}
                      {firstModule ? (
                        <>
                          <span className="text-muted-foreground">{firstModule.title}</span>
                          {secondModule && <span className="text-muted-foreground">, {secondModule.title}</span>}
                          {extraCount > 0 && <span className="text-foreground/30"> +{extraCount} more</span>}
                        </>
                      ) : (
                        <span className="text-foreground/30 italic">No modules assigned yet</span>
                      )}
                    </div>
                    {/* Empty-state CTA (fix brief item 9): shown when no modules available */}
                    {!firstModule && (
                      <button
                        type="button"
                        className="text-xs text-[#60A5FA] underline underline-offset-2 hover:text-[#93C5FD] transition-colors shrink-0"
                        onClick={() => toast.info("Talk to your L\u0026D team about adding modules for this domain.")}
                      >
                        Talk to your L&D team →
                      </button>
                    )}
                    {/* Start button — only when module available */}
                    {firstModule && (
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
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
