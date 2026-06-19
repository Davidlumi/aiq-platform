/**
 * IndividualDashboardV2 — Lumi-inspired layout
 *
 * Layout:
 *   [CTA banner — only when no assessment data]
 *   [Where you stand gauge] [Signals — top 3]
 *   [6 domain cards row]
 *   [Score history sparkline] [Next steps / recommendations]
 *
 * New users (no assessment) see locked/greyed states throughout.
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { IndividualDashboardSkeleton } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  ScanSearch,
  Workflow,
  Users,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  ClipboardList,
  BookOpen,
} from "lucide-react";
import { DOMAIN_KEYS, DOMAIN_LABELS, DOMAIN_SHORT_LABELS, DOMAIN_COLOURS, DOMAIN_DESCRIPTIONS, DOMAIN_ICON_NAMES } from "@/lib/domains";
import { formatScore, scoreToColor } from "@/lib/peakon-colors";
import { cn } from "@/lib/utils";

// ─── Domain icon map ──────────────────────────────────────────────────────────
const DOMAIN_ICONS: Record<string, React.ElementType> = {
  MessageSquare,
  ScanSearch,
  Workflow,
  Users,
  ShieldCheck,
  TrendingUp,
};

function getDomainIcon(key: string): React.ElementType {
  const name = DOMAIN_ICON_NAMES[key as keyof typeof DOMAIN_ICON_NAMES];
  return DOMAIN_ICONS[name] ?? Sparkles;
}

// ─── Level helpers ────────────────────────────────────────────────────────────
function getLevelFromScore(score: number): number {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

function getLevelLabel(level: number): string {
  return ["", "Emerging", "Developing", "Capable", "Strong", "Expert"][level] ?? "Developing";
}

function getLevelColour(level: number): { bg: string; text: string; accent: string } {
  const map: Record<number, { bg: string; text: string; accent: string }> = {
    1: { bg: "rgba(239,68,68,0.12)", text: "#FCA5A5", accent: "#EF4444" },
    2: { bg: "rgba(245,158,11,0.12)", text: "#FCD34D", accent: "#F59E0B" },
    3: { bg: "rgba(34,197,94,0.12)", text: "#86EFAC", accent: "#22C55E" },
    4: { bg: "rgba(16,185,129,0.12)", text: "#6EE7B7", accent: "#10B981" },
    5: { bg: "rgba(22,163,74,0.12)", text: "#4ADE80", accent: "#16A34A" },
  };
  return map[level] ?? map[2];
}

// ─── Gauge SVG ────────────────────────────────────────────────────────────────
function CapabilityGauge({
  score,
  empty = false,
}: {
  score: number;
  empty?: boolean;
}) {
  const level = getLevelFromScore(score);
  const levelLabel = getLevelLabel(level);
  const colours = getLevelColour(level);

  // Semi-circle: 180° arc from left to right
  const cx = 120;
  const cy = 115;
  const r = 85;
  const strokeWidth = 18;

  // Track arc (grey)
  const trackD = describeArc(cx, cy, r, -180, 0);
  // Fill arc based on score (0–100 → -180° to 0°)
  const fillAngle = empty ? -180 : -180 + (score / 100) * 180;
  const fillD = describeArc(cx, cy, r, -180, fillAngle);

  // Needle
  const needleAngle = empty ? -90 : -180 + (score / 100) * 180;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLen = r - 4;
  const nx = cx + needleLen * Math.cos(needleRad);
  const ny = cy + needleLen * Math.sin(needleRad);

  // Colour stops: red → amber → green
  const gradientId = `gauge-grad-${Math.round(score)}`;

  return (
    <div className="flex flex-col items-center">
      <svg width={240} height={140} viewBox="0 0 240 140" className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="75%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#16A34A" />
          </linearGradient>
        </defs>
        {/* Track */}
        <path
          d={trackD}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Fill */}
        {!empty && (
          <path
            d={fillD}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke={empty ? "rgba(255,255,255,0.2)" : "white"}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill={empty ? "rgba(255,255,255,0.2)" : "white"} />
      </svg>

      {/* Label below gauge */}
      {empty ? (
        <div className="text-center -mt-4">
          <p className="text-sm font-medium text-muted-foreground">Not enough data yet</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Complete your assessment to see your position</p>
        </div>
      ) : (
        <div className="text-center -mt-4">
          <p className="text-2xl font-bold" style={{ color: colours.accent }}>
            {getLevelLabel(level)}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Level {formatScore(score)} · {Math.round(score)}/100
          </p>
        </div>
      )}
    </div>
  );
}

// SVG arc helper
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ─── Signal row ───────────────────────────────────────────────────────────────
type SignalDirection = "above" | "below" | "on_target";

interface Signal {
  label: string;
  description: string;
  direction: SignalDirection;
}

function SignalRow({ signal }: { signal: Signal }) {
  const config: Record<SignalDirection, { label: string; bg: string; text: string; border: string }> = {
    above:     { label: "Above target", bg: "rgba(16,185,129,0.08)", text: "#6EE7B7", border: "rgba(16,185,129,0.2)" },
    below:     { label: "Below target", bg: "rgba(239,68,68,0.08)", text: "#FCA5A5", border: "rgba(239,68,68,0.2)" },
    on_target: { label: "On target",    bg: "rgba(34,197,94,0.08)",  text: "#86EFAC", border: "rgba(34,197,94,0.2)" },
  };
  const c = config[signal.direction];
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg border"
      style={{ backgroundColor: c.bg, borderColor: c.border }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{signal.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{signal.description}</p>
      </div>
      <span
        className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
        style={{ color: c.text, backgroundColor: c.bg, border: `1px solid ${c.border}` }}
      >
        {c.label}
      </span>
    </div>
  );
}

// ─── Domain card ──────────────────────────────────────────────────────────────
function DomainCard({
  domainKey,
  name,
  score,
  hasData,
  onClick,
}: {
  domainKey: string;
  name: string;
  score: number | null;
  hasData: boolean;
  onClick: () => void;
}) {
  const Icon = getDomainIcon(domainKey);
  const colour = DOMAIN_COLOURS[domainKey as keyof typeof DOMAIN_COLOURS] ?? "#3B82F6";
  const level = score !== null ? getLevelFromScore(score) : null;
  const levelLabel = level !== null ? getLevelLabel(level) : null;
  const levelColour = level !== null ? getLevelColour(level) : null;

  // Progress bar fill: score 0–100
  const fillPct = score !== null ? Math.round(score) : 0;

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 p-4 rounded-xl border border-border/40 bg-card/50 hover:bg-card/80 hover:border-border/70 transition-all text-left group min-w-0"
    >
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${colour}22` }}
        >
          <Icon className="w-4 h-4" style={{ color: colour }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground/90 leading-tight truncate">{name}</p>
          {levelLabel && levelColour ? (
            <span
              className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5"
              style={{ backgroundColor: levelColour.bg, color: levelColour.text }}
            >
              {levelLabel}
            </span>
          ) : (
            <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 bg-muted/40 text-muted-foreground">
              No data
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-muted/40 overflow-hidden">
        {hasData && score !== null ? (
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${fillPct}%`, backgroundColor: colour }}
          />
        ) : (
          <div className="h-full w-full rounded-full bg-muted/20" />
        )}
      </div>

      {/* Score or locked */}
      <div className="flex items-center justify-between">
        {hasData && score !== null ? (
          <span className="text-xs text-muted-foreground">{Math.round(score)}/100</span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-muted-foreground/50">
            <Lock className="w-3 h-3" />
            Complete assessment
          </span>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
      </div>
    </button>
  );
}

// ─── Score sparkline ──────────────────────────────────────────────────────────
function ScoreSparkline({ history }: { history: Array<{ date: string; overallScore: number }> }) {
  if (history.length < 2) return null;
  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const scores = sorted.map(h => h.overallScore);
  const min = Math.min(...scores) - 5;
  const max = Math.max(...scores) + 5;
  const w = 200;
  const h = 48;
  const points = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * w;
    const y = h - ((s - min) / (max - min)) * h;
    return `${x},${y}`;
  });
  const delta = scores[scores.length - 1] - scores[0];
  const colour = delta > 0 ? "#10B981" : delta < 0 ? "#EF4444" : "#6B7280";
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <div className="flex items-center gap-4">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={colour}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {scores.map((s, i) => {
          const x = (i / (scores.length - 1)) * w;
          const y = h - ((s - min) / (max - min)) * h;
          return <circle key={i} cx={x} cy={y} r={3} fill={colour} />;
        })}
      </svg>
      <div className="flex items-center gap-1">
        <DeltaIcon className="w-4 h-4" style={{ color: colour }} />
        <span className="text-sm font-medium" style={{ color: colour }}>
          {delta > 0 ? "+" : ""}{Math.round(delta)} pts
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function IndividualDashboardV2({ userId }: { userId?: string }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [drillDomain, setDrillDomain] = useState<string | null>(null);

  const { data, isLoading } = trpc.dashboardV2.individual.main.useQuery(
    userId ? { userId } : undefined,
  );

  // Derive signals from domain data when available
  const signals: Signal[] = useMemo(() => {
    if (!data || data.overallScore === null) return [];
    const sorted = [...data.domains]
      .filter(d => d.score !== null && d.score > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const result: Signal[] = [];
    if (sorted.length > 0) {
      const top = sorted[0];
      result.push({
        label: top.name,
        description: `Your strongest capability area — score ${Math.round(top.score ?? 0)}/100`,
        direction: (top.score ?? 0) >= 60 ? "above" : "on_target",
      });
    }
    if (sorted.length > 1) {
      const bottom = sorted[sorted.length - 1];
      result.push({
        label: bottom.name,
        description: `Biggest development opportunity — score ${Math.round(bottom.score ?? 0)}/100`,
        direction: (bottom.score ?? 0) < 40 ? "below" : "on_target",
      });
    }
    if (data.assessmentHistory.length >= 2) {
      const hist = [...data.assessmentHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const delta = hist[hist.length - 1].overallScore - hist[0].overallScore;
      if (Math.abs(delta) >= 3) {
        result.push({
          label: "Score trajectory",
          description: `${delta > 0 ? "Improving" : "Declining"} — ${Math.abs(Math.round(delta))} pts since first assessment`,
          direction: delta > 0 ? "above" : "below",
        });
      }
    }
    return result.slice(0, 3);
  }, [data]);

  const hasData = data !== undefined && data.overallScore !== null;
  const firstName = (user as any)?.firstName ?? "there";

  if (isLoading) return <IndividualDashboardSkeleton />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {hasData ? `${firstName}'s capability profile` : `Welcome, ${firstName}`}
          </h1>
          {data?.lastAssessmentDate && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last assessed {new Date(data.lastAssessmentDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
        {hasData && (
          <Link href="/assessment">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ClipboardList className="w-3.5 h-3.5" />
              Reassess
            </Button>
          </Link>
        )}
      </div>

      {/* ── CTA banner — new users only ── */}
      {!hasData && (
        <div className="flex items-center gap-5 p-5 rounded-xl border border-primary/30 bg-primary/5">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Take your AI capability assessment</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              15 minutes · 6 capability domains · Precise score that tells you exactly where you stand
            </p>
          </div>
          <Link href="/assessment">
            <Button size="sm" className="gap-1.5 whitespace-nowrap">
              Start assessment
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* ── Main two-column row: Gauge + Signals ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Where you stand — gauge */}
        <div className="lg:col-span-2 rounded-xl border border-border/40 bg-card/50 p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Where you stand</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <CapabilityGauge score={data?.overallScore ?? 0} empty={!hasData} />
          </div>

          {hasData && data && (
            <div className="mt-4 pt-4 border-t border-border/30 space-y-2">
              {/* Score history sparkline */}
              {data.assessmentHistory.length >= 2 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Progress</span>
                  <ScoreSparkline history={data.assessmentHistory} />
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{data.assessmentHistory.length} assessment{data.assessmentHistory.length !== 1 ? "s" : ""} completed</span>
                {data.nextReassessmentDate && (
                  <span>Next: {new Date(data.nextReassessmentDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                )}
              </div>
            </div>
          )}

          {!hasData && (
            <div className="mt-4 pt-4 border-t border-border/30">
              <p className="text-xs text-muted-foreground text-center">
                Your position appears once you complete the assessment
              </p>
            </div>
          )}
        </div>

        {/* Signals panel */}
        <div className="lg:col-span-3 rounded-xl border border-border/40 bg-card/50 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">🚩</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Signals · {hasData ? signals.length : 0}
              </span>
            </div>
            <span className="text-xs text-muted-foreground/60 italic">flags worth a look — we flag, you decide</span>
          </div>

          {hasData && signals.length > 0 ? (
            <div className="flex-1 space-y-2.5">
              {signals.map((s, i) => (
                <SignalRow key={i} signal={s} />
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-6">
              {/* Blurred placeholder rows */}
              <div className="w-full space-y-2.5 pointer-events-none select-none">
                {[80, 65, 50].map((w, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border/20 bg-muted/10">
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 rounded bg-muted/30 blur-[2px]" style={{ width: `${w}%` }} />
                      <div className="h-2.5 rounded bg-muted/20 blur-[2px]" style={{ width: `${w - 15}%` }} />
                    </div>
                    <div className="h-5 w-20 rounded-full bg-muted/20 blur-[2px]" />
                  </div>
                ))}
              </div>
              <div className="text-center mt-2">
                <div className="flex items-center gap-1.5 justify-center text-muted-foreground/60 mb-2">
                  <Lock className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Signals unlock with your assessment</span>
                </div>
                <Link href="/assessment">
                  <Button variant="outline" size="sm" className="text-xs gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Take assessment
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {hasData && signals.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/30 flex justify-end">
              <Link href="/assessment">
                <button className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                  View full results <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── 6 Domain cards row ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Capability domains</h2>
          {hasData && (
            <Link href="/assessment">
              <button className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                Full breakdown <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {DOMAIN_KEYS.map(key => {
            const domain = data?.domains.find(d => d.key === key);
            return (
              <DomainCard
                key={key}
                domainKey={key}
                name={DOMAIN_SHORT_LABELS[key as keyof typeof DOMAIN_SHORT_LABELS] ?? DOMAIN_LABELS[key as keyof typeof DOMAIN_LABELS]}
                score={domain?.score ?? null}
                hasData={hasData && (domain?.score ?? 0) > 0}
                onClick={() => {
                  if (hasData) setDrillDomain(key);
                  else navigate("/assessment");
                }}
              />
            );
          })}
        </div>
      </div>

      {/* ── Bottom row: next steps + learning ── */}
      {!hasData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/40 bg-card/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">You lead</span>
              <Lock className="w-3.5 h-3.5 text-muted-foreground/50 ml-auto" />
            </div>
            <div className="space-y-2 pointer-events-none select-none">
              {[75, 55].map((w, i) => (
                <div key={i} className="h-3 rounded bg-muted/25 blur-[2px]" style={{ width: `${w}%` }} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground/60 mt-3">Unlock by completing your assessment</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Biggest gaps</span>
              <Lock className="w-3.5 h-3.5 text-muted-foreground/50 ml-auto" />
            </div>
            <div className="space-y-2 pointer-events-none select-none">
              {[80, 60].map((w, i) => (
                <div key={i} className="h-3 rounded bg-muted/25 blur-[2px]" style={{ width: `${w}%` }} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground/60 mt-3">Unlock by completing your assessment</p>
          </div>
        </div>
      )}

      {/* ── When data exists: show plan summary ── */}
      {hasData && data?.planSummary && (
        <div className="rounded-xl border border-border/40 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Your development plan</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-muted/20 border border-border/30 text-center">
              <p className="text-2xl font-bold text-foreground">{data.planSummary.moduleCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Modules recommended</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/20 border border-border/30 text-center">
              <p className="text-2xl font-bold text-foreground">{Math.round(data.planSummary.totalEstimatedMinutes / 60)}h</p>
              <p className="text-xs text-muted-foreground mt-0.5">Estimated learning time</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/20 border border-border/30 text-center">
              <p className="text-2xl font-bold text-primary">{Math.round(data.planSummary.completionPercentage)}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Plan completed</p>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Link href="/learning">
              <button className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                View full learning plan <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
