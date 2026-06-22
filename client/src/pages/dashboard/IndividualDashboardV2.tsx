/**
 * IndividualDashboardV2 — Lumi-inspired layout (polished)
 *
 * Layout:
 *   [CTA banner — only when no assessment data]
 *   [Where you stand gauge] [Signals — top 3]
 *   [6 domain cards row]
 *   [Development plan summary]
 *
 * Design: white cards on light grey background, clean section headers,
 * proper card shadows, solid colours (no opacity hacks).
 */
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsPro } from "@/hooks/useIsPro";
import { UpgradeModal } from "@/components/UpgradeModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { IndividualDashboardSkeleton } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
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
  RotateCcw,
  Lightbulb,
  GraduationCap,
  Wrench,
  FlaskConical,
  ExternalLink,
  Star,
  X,
} from "lucide-react";
import {
  DOMAIN_KEYS,
  DOMAIN_LABELS,
  DOMAIN_SHORT_LABELS,
  DOMAIN_COLOURS,
  DOMAIN_DESCRIPTIONS,
  DOMAIN_ICON_NAMES,
  scoreToLevel,
  LEVEL_LABELS,
  bandOf,
  gapToNext,
} from "@/lib/domains";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PeakonScoreCell, RatingBadge, DashboardCard } from "@/components/dashboard/DashboardUI";
import { JourneyLadderWidget } from "@/components/dashboard/JourneyLadderWidget";
/** Format a 0–10 score for display: "9.1" */
function formatScore(score: number): string {
  return score.toFixed(1);
}

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

// ─── Level helpers (0–10 scale, matching brand.ts thresholds) ────────────────
// Scores from the server are on a 0–10 scale (e.g. 9.10 = Expert)
function getLevelFromScore(score: number): number {
  // score is 0–10
  if (score >= 7.5) return 5;
  if (score >= 6.0) return 4;
  if (score >= 5.0) return 3;
  if (score >= 3.5) return 2;
  return 1;
}

function getLevelLabel(level: number): string {
  // Canonical labels from shared/brand.ts LEVEL_LABELS
  return LEVEL_LABELS[level as keyof typeof LEVEL_LABELS] ?? "Developing";
}

function getLevelColour(level: number): { bg: string; text: string; accent: string } {
  // 1=Emerging 2=Developing 3=Proficient 4=Advanced 5=Expert
  const map: Record<number, { bg: string; text: string; accent: string }> = {
    1: { bg: "#FEE2E2", text: "#991B1B", accent: "#EF4444" },   // red
    2: { bg: "#FEF3C7", text: "#92400E", accent: "#F59E0B" },   // amber
    3: { bg: "#DBEAFE", text: "#1E40AF", accent: "#3B82F6" },   // blue (Proficient)
    4: { bg: "#EDE9FE", text: "#4C1D95", accent: "#7C3AED" },   // violet (Advanced)
    5: { bg: "#D1FAE5", text: "#065F46", accent: "#10B981" },   // emerald (Expert)
  };
  return map[level] ?? map[2];
}

// ─── SVG arc helper ───────────────────────────────────────────────────────────
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

// ─── Gauge ────────────────────────────────────────────────────────────────────
// score is 0–10
function CapabilityGauge({ score, empty = false }: { score: number; empty?: boolean }) {
  const level = getLevelFromScore(score);
  const levelLabel = getLevelLabel(level);
  const colours = getLevelColour(level);

  const cx = 150, cy = 140, r = 108, sw = 18;
  const gradId = "gauge-fill-grad";

  // Needle: -180° (left) to 0° (right), mapped to score 0–10
  const needleAngle = empty ? -90 : -180 + (score / 10) * 180;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLen = r - 12;
  const nx = cx + needleLen * Math.cos(needleRad);
  const ny = cy + needleLen * Math.sin(needleRad);

  const fillAngle = empty ? -180 : -180 + (score / 10) * 180;
  const fillD = describeArc(cx, cy, r, -180, fillAngle);
  const trackD = describeArc(cx, cy, r, -180, 0);

  // Scale tick marks at 0, 2.5, 5, 7.5, 10
  const ticks = [0, 2.5, 5, 7.5, 10];

  return (
    <div className="flex flex-col items-center w-full">
      <svg width={300} height={172} viewBox="0 0 300 172" className="overflow-visible w-full max-w-[300px]">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#EF4444" />
            <stop offset="30%"  stopColor="#F59E0B" />
            <stop offset="65%"  stopColor="#22C55E" />
            <stop offset="100%" stopColor="#16A34A" />
          </linearGradient>
        </defs>

        {/* Track (background arc) */}
        <path d={trackD} fill="none" stroke="#F3F4F6" strokeWidth={sw} strokeLinecap="round" />

        {/* Coloured fill arc */}
        {!empty && (
          <path d={fillD} fill="none" stroke={`url(#${gradId})`} strokeWidth={sw} strokeLinecap="round" />
        )}

        {/* Tick marks */}
        {ticks.map(t => {
          const angle = -180 + (t / 10) * 180;
          const rad = (angle * Math.PI) / 180;
          const inner = r - sw / 2 - 2;
          const outer = r - sw / 2 - 10;
          const x1 = cx + inner * Math.cos(rad);
          const y1 = cy + inner * Math.sin(rad);
          const x2 = cx + outer * Math.cos(rad);
          const y2 = cy + outer * Math.sin(rad);
          const lx = cx + (outer - 12) * Math.cos(rad);
          const ly = cy + (outer - 12) * Math.sin(rad);
          return (
            <g key={t}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D1D5DB" strokeWidth={1.5} strokeLinecap="round" />
              <text x={lx} y={ly + 4} textAnchor="middle" fontSize={9} fill="#9CA3AF" fontFamily="sans-serif">{t}</text>
            </g>
          );
        })}

        {/* Needle */}
        <line
          x1={cx} y1={cy} x2={nx} y2={ny}
          stroke={empty ? "#D1D5DB" : colours.accent}
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Needle hub */}
        <circle cx={cx} cy={cy} r={9} fill="white" stroke={empty ? "#D1D5DB" : colours.accent} strokeWidth={2.5} />
        <circle cx={cx} cy={cy} r={4} fill={empty ? "#D1D5DB" : colours.accent} />
      </svg>

      {/* Score label — sits just below the gauge */}
      <div className="text-center -mt-3">
        {empty ? (
          <>
            <p className="text-base font-semibold text-gray-400">No data yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Complete your assessment to see your score</p>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-1 justify-center">
              <span className="text-4xl font-extrabold tracking-tight" style={{ color: colours.accent }}>
                {formatScore(score)}
              </span>
              <span className="text-lg font-semibold text-gray-400">/10</span>
            </div>
            <div
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-sm font-semibold"
              style={{ backgroundColor: colours.bg, color: colours.text }}
            >
              {levelLabel}
            </div>
          </>
        )}
      </div>
    </div>
  );
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
    above:     { label: "Above target", bg: "#F0FDF4", text: "#166534", border: "#BBF7D0" },
    below:     { label: "Below target", bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
    on_target: { label: "On target",    bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" },
  };
  const c = config[signal.direction];
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg border"
      style={{ backgroundColor: c.bg, borderColor: c.border }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{signal.label}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{signal.description}</p>
      </div>
      <span
        className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 border"
        style={{ color: c.text, backgroundColor: c.bg, borderColor: c.border }}
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
  rating,
  hasData,
  onClick,
}: {
  domainKey: string;
  name: string;
  score: number | null;
  rating?: string;
  hasData: boolean;
  onClick: () => void;
}) {
  const Icon = getDomainIcon(domainKey);
  const colour = DOMAIN_COLOURS[domainKey as keyof typeof DOMAIN_COLOURS] ?? "#3B82F6";
  // score is 0–10; convert to 0–100% for the progress bar
  const fillPct = score !== null && score > 0 ? Math.round((score / 10) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 p-4 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all text-left group min-w-0"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}
    >
      {/* Icon + name */}
      <div className="flex items-start gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${colour}18` }}
        >
          <Icon className="w-4 h-4" style={{ color: colour }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 leading-tight truncate">{name}</p>
          {hasData && rating ? (
            <div className="mt-0.5">
              <RatingBadge rating={rating} size="sm" />
            </div>
          ) : (
            <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 bg-gray-100 text-gray-400">
              No data
            </span>
          )}
        </div>
      </div>

      {/* Peakon score cell — multiply by 10 to convert 0-10 → 0-100 scale */}
      <div className="flex items-center justify-center py-1">
        <PeakonScoreCell score={hasData && score !== null && score > 0 ? score * 10 : null} size="md" />
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
        {hasData && score !== null && score > 0 ? (
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${fillPct}%`, backgroundColor: colour }}
          />
        ) : null}
      </div>

      {/* Score label */}
      <div className="flex items-center justify-between">
        {hasData && score !== null && score > 0 ? (
          <span className="text-xs text-gray-400 font-medium">{score.toFixed(1)}<span className="text-gray-300">/10</span></span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-gray-300">
            <Lock className="w-3 h-3" />
            No data yet
          </span>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
      </div>
    </button>
  );
}

// ─── Countdown widget ────────────────────────────────────────────────────────
function ReassessmentCountdown({ dueDate, lastAssessmentDate }: { dueDate: string | null; lastAssessmentDate: string | null }) {
  const now = Date.now();

  // If no due date yet, show a prompt to take the first reassessment in 30 days
  const due = dueDate ? new Date(dueDate).getTime() : (lastAssessmentDate ? new Date(lastAssessmentDate).getTime() + 30 * 86400000 : null);
  const daysLeft = due ? Math.max(0, Math.ceil((due - now) / 86400000)) : null;
  const isOverdue = due ? due < now : false;
  const totalDays = 30; // display relative to 30-day cycle
  const pct = due ? Math.max(0, Math.min(100, ((totalDays - daysLeft!) / totalDays) * 100)) : 0;

  const colour = isOverdue ? "#EF4444" : daysLeft !== null && daysLeft <= 7 ? "#F59E0B" : "#10B981";
  const bgColour = isOverdue ? "#FEF2F2" : daysLeft !== null && daysLeft <= 7 ? "#FFFBEB" : "#F0FDF4";
  const borderColour = isOverdue ? "#FECACA" : daysLeft !== null && daysLeft <= 7 ? "#FDE68A" : "#BBF7D0";

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: bgColour, borderColor: borderColour, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <RotateCcw className="w-4 h-4 flex-shrink-0" style={{ color: colour }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colour }}>
              {isOverdue ? "Reassessment overdue" : "Next reassessment"}
            </span>
          </div>
          {daysLeft !== null ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-gray-900">{isOverdue ? "0" : daysLeft}</span>
              <span className="text-sm text-gray-500">{isOverdue ? "days overdue" : `day${daysLeft === 1 ? "" : "s"} to go`}</span>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Complete your first assessment to start tracking</p>
          )}
          {due && (
            <p className="text-xs text-gray-400 mt-0.5">
              {isOverdue ? "Was due" : "Due"} {new Date(due).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
        {/* Circular progress ring */}
        {daysLeft !== null && (
          <div className="relative flex-shrink-0" style={{ width: 56, height: 56 }}>
            <svg width={56} height={56} viewBox="0 0 56 56">
              <circle cx={28} cy={28} r={22} fill="none" stroke="#E5E7EB" strokeWidth={5} />
              <circle
                cx={28} cy={28} r={22}
                fill="none"
                stroke={colour}
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
                transform="rotate(-90 28 28)"
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold" style={{ color: colour }}>
                {isOverdue ? "!" : `${Math.round(pct)}%`}
              </span>
            </div>
          </div>
        )}
      </div>
      {/* Progress bar */}
      {daysLeft !== null && (
        <div className="mt-3">
          <div className="w-full h-1.5 rounded-full bg-white/60 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: colour }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            Regular reassessment every 30 days keeps your profile accurate and your development on track
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Improvement tracker ──────────────────────────────────────────────────────
function ImprovementTracker({ history }: { history: Array<{ date: string; overallScore: number; rating: string; domainScores?: Record<string, number> | null }> }) {
  if (history.length < 1) return null;
  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const delta = latest.overallScore - first.overallScore;
  const isImproving = delta > 0;
  const isFlat = delta === 0;

  // Domain-level deltas (only when ≥ 2 assessments with domain scores)
  const domainDeltas: Array<{ key: string; label: string; fullLabel: string; description: string; delta: number; latestScore: number; previousScore: number }> = [];
  if (sorted.length >= 2 && first.domainScores && latest.domainScores) {
    for (const key of DOMAIN_KEYS) {
      const firstScore = first.domainScores[key];
      const latestScore = latest.domainScores[key];
      if (firstScore != null && latestScore != null) {
        domainDeltas.push({
          key,
          label: DOMAIN_SHORT_LABELS[key as keyof typeof DOMAIN_SHORT_LABELS] ?? DOMAIN_LABELS[key as keyof typeof DOMAIN_LABELS],
          fullLabel: DOMAIN_LABELS[key as keyof typeof DOMAIN_LABELS],
          description: DOMAIN_DESCRIPTIONS[key as keyof typeof DOMAIN_DESCRIPTIONS] ?? "",
          delta: Math.round(latestScore - firstScore),
          latestScore: Math.round(latestScore),
          previousScore: Math.round(firstScore),
        });
      }
    }
    domainDeltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }

  const w = 320, h = 80;
  const scores = sorted.map(h => h.overallScore);
  const minS = Math.max(0, Math.min(...scores) - 10);
  const maxS = Math.min(100, Math.max(...scores) + 10);
  const pts = sorted.map((item, i) => {
    const x = sorted.length === 1 ? w / 2 : (i / (sorted.length - 1)) * (w - 20) + 10;
    const y = h - 10 - ((item.overallScore - minS) / (maxS - minS)) * (h - 20);
    return { x, y, ...item };
  });
  const lineColour = isImproving ? "#10B981" : isFlat ? "#9CA3AF" : "#EF4444";
  const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  // Area fill
  const areaPath = `M ${pts[0].x.toFixed(1)},${h} ` +
    pts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
    ` L ${pts[pts.length - 1].x.toFixed(1)},${h} Z`;

  const RATING_LABELS: Record<string, string> = {
    ai_ready: "AI Ready",
    developing: "Developing",
    not_yet_ready: "Not Yet Ready",
    foundation_gap: "Foundation Gap",
    insufficient_evidence: "Insufficient Evidence",
  };

  return (
    <div
      className="rounded-xl bg-white border border-gray-100 p-5"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <SectionHeader
            icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
            title="Score improvement"
            subtitle={`${sorted.length} assessment${sorted.length !== 1 ? "s" : ""} completed`}
          />
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-baseline gap-1 justify-end">
            <span className="text-2xl font-bold text-gray-900">{latest.overallScore.toFixed(1)}</span>
            <span className="text-sm text-gray-400">/10</span>
          </div>
          {sorted.length > 1 && (
            <div className="flex items-center gap-1 justify-end mt-0.5">
              {isImproving ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              ) : isFlat ? (
                <Minus className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <span
                className="text-sm font-semibold"
                style={{ color: isImproving ? "#10B981" : isFlat ? "#9CA3AF" : "#EF4444" }}
              >
                {delta > 0 ? "+" : ""}{delta.toFixed(1)} pts
              </span>
              <span className="text-xs text-gray-400">since first</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="w-full overflow-hidden">
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height: 80 }}>
          <defs>
            <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColour} stopOpacity={0.15} />
              <stop offset="100%" stopColor={lineColour} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          {/* Area */}
          <path d={areaPath} fill="url(#area-grad)" />
          {/* Line */}
          <polyline
            points={polyline}
            fill="none"
            stroke={lineColour}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Dots */}
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="white" stroke={lineColour} strokeWidth={2} />
          ))}
        </svg>
      </div>

      {/* Domain breakdown — only when ≥ 2 assessments with domain data */}
      {domainDeltas.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Domain breakdown</p>
          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {domainDeltas.map(({ key, label, fullLabel, description, delta: d, latestScore, previousScore }) => {
                const isPos = d > 0;
                const isNeg = d < 0;
                const barColour = isPos ? "#10B981" : isNeg ? "#EF4444" : "#9CA3AF";
                const bgColour = isPos ? "#F0FDF4" : isNeg ? "#FEF2F2" : "#F9FAFB";
                const textColour = isPos ? "#059669" : isNeg ? "#DC2626" : "#6B7280";
                return (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <div
                        className="flex items-center justify-between px-3 py-2 rounded-lg cursor-default"
                        style={{ backgroundColor: bgColour }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: barColour }} />
                          <span className="text-xs text-gray-700 font-medium truncate">{label}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-xs text-gray-500">{latestScore.toFixed(1)}/10</span>
                          <span className="text-xs font-bold" style={{ color: textColour }}>
                            {d > 0 ? "+" : ""}{d === 0 ? "\u2014" : `${d} pts`}
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px] p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-gray-900">{fullLabel}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
                      <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                        <div className="text-center">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Previous</p>
                          <p className="text-sm font-bold text-gray-700">{previousScore.toFixed(1)}<span className="text-[10px] font-normal text-gray-400">/10</span></p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Current</p>
                          <p className="text-sm font-bold text-gray-700">{latestScore.toFixed(1)}<span className="text-[10px] font-normal text-gray-400">/10</span></p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Change</p>
                          <p className="text-sm font-bold" style={{ color: textColour }}>{d > 0 ? "+" : ""}{d === 0 ? "—" : `${d}`}</p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>
      )}

      {/* Assessment history list */}
      <div className="mt-3 space-y-1.5">
        {sorted.slice().reverse().map((item, i) => {
          const isLatest = i === 0;
          return (
            <div key={item.date} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: isLatest ? lineColour : "#D1D5DB" }}
                />
                <span className="text-gray-500">
                  {new Date(item.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                {isLatest && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Latest</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">{item.overallScore.toFixed(1)}/10</span>
                <span className="text-gray-400 hidden sm:inline">{RATING_LABELS[item.rating] ?? item.rating}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Score sparkline ──────────────────────────────────────────────────────────
function ScoreSparkline({ history }: { history: Array<{ date: string; overallScore: number }> }) {
  if (history.length < 2) return null;
  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const scores = sorted.map(h => h.overallScore);
  const min = Math.min(...scores) - 5;
  const max = Math.max(...scores) + 5;
  const w = 80, h = 28;
  const points = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * w;
    const y = h - ((s - min) / (max - min)) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const delta = scores[scores.length - 1] - scores[0];
  const colour = delta > 0 ? "#10B981" : delta < 0 ? "#EF4444" : "#9CA3AF";
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <div className="flex items-center gap-2">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={colour}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.7}
        />
        {scores.map((s, i) => {
          const x = (i / (scores.length - 1)) * w;
          const y = h - ((s - min) / (max - min)) * h;
          return <circle key={i} cx={x} cy={y} r={2.5} fill={colour} />;
        })}
      </svg>
      <div className="flex items-center gap-0.5">
        <DeltaIcon className="w-3.5 h-3.5" style={{ color: colour }} />
        <span className="text-xs font-semibold" style={{ color: colour }}>
          {delta > 0 ? "+" : ""}{Math.round(delta)} pts
        </span>
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
// ─── Domain Detail Modal ─────────────────────────────────────────────────────
const RESOURCE_TYPE_ICONS: Record<string, React.ElementType> = {
  course: GraduationCap,
  book: BookOpen,
  tool: Wrench,
  practice: FlaskConical,
};

function DomainDetailModal({
  domainKey,
  domainScore,
  onClose,
}: {
  domainKey: string | null;
  domainScore: number;
  onClose: () => void;
}) {
  const { data, isLoading } = trpc.dashboardV2.individual.domainInsights.useQuery(
    { domainKey: domainKey ?? "" },
    { enabled: !!domainKey, staleTime: 5 * 60 * 1000 },
  );
  const domainName = domainKey ? DOMAIN_LABELS[domainKey as keyof typeof DOMAIN_LABELS] ?? domainKey : "";
  const domainDesc = domainKey ? DOMAIN_DESCRIPTIONS[domainKey as keyof typeof DOMAIN_DESCRIPTIONS] ?? "" : "";
  const DomainIcon = domainKey ? DOMAIN_ICONS[DOMAIN_ICON_NAMES[domainKey as keyof typeof DOMAIN_ICON_NAMES] ?? ""] ?? Sparkles : Sparkles;
  const colour = domainKey ? DOMAIN_COLOURS[domainKey as keyof typeof DOMAIN_COLOURS] ?? "#6366f1" : "#6366f1";
  // domainScore is 0–10 scale
  const levelLabel = domainScore >= 7.5 ? "Strong" : domainScore >= 5.5 ? "Capable" : domainScore >= 4.0 ? "Developing" : "Foundation";
  const levelColour = domainScore >= 7.5 ? "#22c55e" : domainScore >= 5.5 ? "#3b82f6" : domainScore >= 4.0 ? "#f59e0b" : "#ef4444";

  return (
    <Dialog open={!!domainKey} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Header band */}
        <div className="px-6 pt-6 pb-4" style={{ background: `${colour}12`, borderBottom: `3px solid ${colour}` }}>
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${colour}20` }}>
                  <DomainIcon className="w-5 h-5" style={{ color: colour }} />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold text-gray-900 leading-tight">{domainName}</DialogTitle>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{domainDesc}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </DialogHeader>
          {/* Score row */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold" style={{ color: levelColour }}>{domainScore.toFixed(1)}</span>
              <span className="text-sm text-gray-400">/10</span>
            </div>
            <Badge variant="outline" className="text-xs font-medium" style={{ color: levelColour, borderColor: `${levelColour}40`, background: `${levelColour}10` }}>
              {levelLabel}
            </Badge>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(domainScore / 10) * 100}%`, background: levelColour }} />
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="px-6 py-5 space-y-5">
            {isLoading ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-gray-700">Improvement tips</span>
                </div>
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : data && data.tips.length > 0 ? (
              <>
                {/* Tips */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-gray-700">How to improve</span>
                  </div>
                  <ol className="space-y-2.5">
                    {data.tips.map((tip, i) => (
                      <li key={i} className="flex gap-3 text-sm text-gray-700 leading-relaxed">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5" style={{ background: `${colour}20`, color: colour }}>
                          {i + 1}
                        </span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {data.resources.length > 0 && (
                  <>
                    <Separator />
                    {/* Resources */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm font-semibold text-gray-700">Recommended resources</span>
                      </div>
                      <div className="space-y-2.5">
                        {data.resources.map((r, i) => {
                          const RIcon = RESOURCE_TYPE_ICONS[r.type] ?? BookOpen;
                          return (
                            <div key={i} className="flex gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${colour}15` }}>
                                <RIcon className="w-3.5 h-3.5" style={{ color: colour }} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 leading-tight">{r.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{r.description}</p>
                                <Badge variant="outline" className="text-[10px] mt-1.5 capitalize" style={{ color: colour, borderColor: `${colour}40` }}>{r.type}</Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Complete an assessment to unlock personalised tips for this domain.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide text-[11px]">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function IndividualDashboardV2({ userId }: { userId?: string }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedDomain, setSelectedDomain] = useState<{ key: string; score: number } | null>(null);
  const isPro = useIsPro();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const { data, isLoading } = trpc.dashboardV2.individual.main.useQuery(
    userId ? { userId } : undefined,
  );

  // Derive signals from domain data
  const signals: Signal[] = useMemo(() => {
    if (!data || data.overallScore === null) return [];
    const withScores = data.domains
      .filter(d => d.score !== null && d.score > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const result: Signal[] = [];

    if (withScores.length > 0) {
      const top = withScores[0];
      const topScore = top.score ?? 0;
      result.push({
        label: top.name,
        description: `Your strongest capability area — score ${topScore.toFixed(1)}/10`,
        direction: topScore >= 6.5 ? "above" : topScore >= 5.0 ? "on_target" : "below",
      });
    }

    if (withScores.length > 1) {
      const bottom = withScores[withScores.length - 1];
      const botScore = bottom.score ?? 0;
      result.push({
        label: bottom.name,
        description: `Biggest development opportunity — score ${botScore.toFixed(1)}/10`,
        direction: botScore < 5.0 ? "below" : botScore < 6.5 ? "on_target" : "above",
      });
    }

    if (data.assessmentHistory.length >= 2) {
      const hist = [...data.assessmentHistory].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
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

  // ── C1: Band-up moment detection ─────────────────────────────────────────
  // Detect if the latest assessment moved the user to a higher band vs the previous one
  const bandUpEvent = useMemo(() => {
    if (!data || data.assessmentHistory.length < 2) return null;
    const hist = [...data.assessmentHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const prev = hist[hist.length - 2];
    const latest = hist[hist.length - 1];
    const prevLevel = scoreToLevel(prev.overallScore);
    const latestLevel = scoreToLevel(latest.overallScore);
    if (latestLevel > prevLevel) {
      return {
        fromBand: LEVEL_LABELS[prevLevel as keyof typeof LEVEL_LABELS],
        toBand: LEVEL_LABELS[latestLevel as keyof typeof LEVEL_LABELS],
        toLevel: latestLevel,
        date: latest.date,
      };
    }
    return null;
  }, [data]);

  const [bandUpDismissed, setBandUpDismissed] = useState(false);

  // ── C1: Learning streak ───────────────────────────────────────────────────
  const { data: streakData } = trpc.adaptiveLearning.getLearningStreak.useQuery(
    undefined,
    { enabled: hasData, staleTime: 5 * 60 * 1000 },
  );

  // Domain tile sort order
  type DomainSort = "default" | "score_desc" | "score_asc" | "rating";
  const [domainSort, setDomainSort] = useState<DomainSort>("default");

  const sortedDomainKeys = useMemo(() => {
    if (domainSort === "default") return DOMAIN_KEYS;
    return [...DOMAIN_KEYS].sort((a, b) => {
      const da = data?.domains.find(d => d.key === a);
      const db = data?.domains.find(d => d.key === b);
      if (domainSort === "score_desc") return (db?.score ?? -1) - (da?.score ?? -1);
      if (domainSort === "score_asc") return (da?.score ?? 11) - (db?.score ?? 11);
      if (domainSort === "rating") {
        // Sort by canonical 5-level band (best → worst)
        const la = scoreToLevel(da?.score ?? 0);
        const lb = scoreToLevel(db?.score ?? 0);
        return lb - la;
      }
      return 0;
    });
  }, [domainSort, data?.domains]);

  const { data: aiSummaryData, isLoading: aiSummaryLoading } = trpc.dashboardV2.individual.aiSummary.useQuery(
    undefined,
    { enabled: hasData, staleTime: 10 * 60 * 1000, retry: false },
  );
  const firstName = (user as any)?.firstName ?? "there";

  if (isLoading) return <IndividualDashboardSkeleton />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font-head)", fontSize: "var(--fs-h2, 22px)", fontWeight: 700, color: "var(--ink, #211B26)", lineHeight: 1.25 }}>
            {hasData ? `${firstName}'s capability profile` : `Welcome, ${firstName}`}
          </h1>
          {data?.lastAssessmentDate ? (
            <p style={{ fontSize: "var(--fs-caption, 12px)", color: "var(--ink-faint, #8E8893)", marginTop: 4 }}>
              Last assessed {new Date(data.lastAssessmentDate).toLocaleDateString("en-GB", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          ) : (
            <p style={{ fontSize: "var(--fs-caption, 12px)", color: "var(--ink-faint, #8E8893)", marginTop: 4 }}>No assessment completed yet</p>
          )}
        </div>
        {hasData && (
          <Link href="/assessment">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs shrink-0">
              <RotateCcw className="w-3.5 h-3.5" />
              Reassess
            </Button>
          </Link>
        )}
      </div>

      {/* ReassessmentCountdown removed — hero card now has inline reassess button */}

      {/* ── C1: Band-up moment banner ── */}
      {bandUpEvent && !bandUpDismissed && (() => {
        const lc = getLevelColour(bandUpEvent.toLevel);
        return (
          <div
            className="flex items-center gap-4 px-5 py-4 rounded-xl"
            style={{
              background: lc.bg,
              border: `1px solid ${lc.accent}40`,
            }}
          >
            <div
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: lc.accent + "20", border: `1.5px solid ${lc.accent}` }}
            >
              <Star className="w-5 h-5" style={{ color: lc.accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 14, fontWeight: 700, color: lc.text, fontFamily: "var(--font-head)" }}>
                You reached {bandUpEvent.toBand}
              </p>
              <p style={{ fontSize: 12, color: lc.text, opacity: 0.75 }}>
                Moved up from {bandUpEvent.fromBand} · {new Date(bandUpEvent.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <button
              onClick={() => setBandUpDismissed(true)}
              className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" style={{ color: lc.text, opacity: 0.6 }} />
            </button>
          </div>
        );
      })()}

      {/* ── HERO LEVEL CARD — deep-indigo, full-width ── */}
      {(() => {
        const score = data?.overallScore ?? 0;
        const level = getLevelFromScore(score);
        const lc = getLevelColour(level);
        const gap = hasData ? gapToNext(score) : null;
        // Focus-next: domain with SMALLEST gap to its next band (D7b spec)
        // Tiebreak: higher current score (closer to a more advanced band)
        // Exclude domains already at Expert (no next band)
        const focusDomain = hasData
          ? [...(data?.domains ?? [])]
              .filter(d => {
                if (d.score === null || d.score <= 0) return false;
                const g = gapToNext(d.score);
                return !('isTop' in g && g.isTop); // exclude Expert domains
              })
              .sort((a, b) => {
                const ga = gapToNext(a.score ?? 0);
                const gb = gapToNext(b.score ?? 0);
                const gapA = ('gap' in ga) ? ga.gap : Infinity;
                const gapB = ('gap' in gb) ? gb.gap : Infinity;
                if (Math.abs(gapA - gapB) > 0.001) return gapA - gapB; // smallest gap first
                return (b.score ?? 0) - (a.score ?? 0); // tiebreak: higher score first
              })[0]
          : null;
        const focusLabel = focusDomain
          ? (DOMAIN_SHORT_LABELS[focusDomain.key as keyof typeof DOMAIN_SHORT_LABELS] ?? DOMAIN_LABELS[focusDomain.key as keyof typeof DOMAIN_LABELS])
          : null;

        return (
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: "var(--lumi-radius, 16px)",
              background: hasData
                ? "linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #2563EB 100%)"
                : "linear-gradient(135deg, #374151 0%, #4B5563 100%)",
              boxShadow: "0 4px 24px rgba(30,58,138,0.25)",
              padding: "28px 32px",
              color: "white",
            }}
          >
            {/* Subtle dot-grid overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />

            <div className="relative z-10">
              {/* Top row: level badge + score + reassess */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  {/* Level badge */}
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold"
                    style={{ backgroundColor: lc.bg, color: lc.text }}
                  >
                    {hasData ? getLevelLabel(level) : "No data"}
                  </span>
                  {hasData && (
                    <span className="text-blue-200 text-sm">
                      {data!.assessmentHistory.length} assessment{data!.assessmentHistory.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {hasData && (
                  <Link href="/assessment">
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/20"
                      style={{ border: "1px solid rgba(255,255,255,0.3)", color: "white" }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reassess
                    </button>
                  </Link>
                )}
              </div>

              {/* Composite score headline */}
              <div className="mb-6">
                {hasData ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span
                        className="tabular-nums"
                        style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, fontFamily: "var(--font-mono, JetBrains Mono, monospace)", color: "white" }}
                      >
                        {score.toFixed(1)}
                      </span>
                      <span style={{ fontSize: 24, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>/10</span>
                    </div>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4, fontFamily: "var(--font-head)" }}>
                      Composite AI capability score
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 20, fontWeight: 700, color: "white", fontFamily: "var(--font-head)" }}>No assessment yet</p>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>Complete your assessment to see your score</p>
                  </>
                )}
              </div>

              {/* Gap-to-next band progress bar */}
              {hasData && gap && !('isTop' in gap && gap.isTop) && 'gap' in gap && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1.5">
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                      Progress to <strong style={{ color: "white" }}>{gap.nextBand}</strong>
                    </span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                      {gap.gap.toFixed(1)} pts to go
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.15)" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 4,
                        background: "white",
                        width: `${Math.round(gap.pctThroughBand)}%`,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                </div>
              )}
              {hasData && gap && 'isTop' in gap && gap.isTop && (
                <div className="mb-6">
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
                  >
                    <Star className="w-4 h-4 text-yellow-300" />
                    <span style={{ fontSize: 13, color: "white", fontWeight: 600 }}>Top band — Expert level achieved</span>
                  </div>
                </div>
              )}

              {/* Six domain rows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mb-6">
                {DOMAIN_KEYS.map(key => {
                  const domain = data?.domains.find(d => d.key === key);
                  const colour = DOMAIN_COLOURS[key as keyof typeof DOMAIN_COLOURS] ?? "#60A5FA";
                  const domScore = domain?.score ?? null;
                  const fillPct = domScore !== null && domScore > 0 ? Math.round((domScore / 10) * 100) : 0;
                  const shortLabel = DOMAIN_SHORT_LABELS[key as keyof typeof DOMAIN_SHORT_LABELS] ?? DOMAIN_LABELS[key as keyof typeof DOMAIN_LABELS];
                  return (
                    <button
                      key={key}
                      className="flex items-center gap-2 text-left group hover:opacity-90 transition-opacity py-1"
                      onClick={() => {
                        if (hasData && domain) setSelectedDomain({ key, score: domain.score ?? 0 });
                        else navigate("/assessment");
                      }}
                    >
                      <span style={{ width: 120, fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 500, flexShrink: 0 }}>
                        {shortLabel}
                      </span>
                      <div className="flex-1" style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.15)" }}>
                        {hasData && domScore !== null && domScore > 0 ? (
                          <div
                            style={{ height: "100%", width: `${fillPct}%`, borderRadius: 3, backgroundColor: colour, transition: "width 0.5s ease" }}
                          />
                        ) : null}
                      </div>
                      <span
                        className="tabular-nums"
                        style={{ width: 32, textAlign: "right", fontSize: 12, fontWeight: 700, color: hasData && domScore ? colour : "rgba(255,255,255,0.3)", flexShrink: 0 }}
                      >
                        {hasData && domScore !== null && domScore > 0 ? domScore.toFixed(1) : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Focus-next nudge */}
              {hasData && focusDomain && focusLabel && (
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
                >
                  <Lightbulb className="w-4 h-4 text-yellow-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 600, color: "white" }}>Focus next: {focusLabel}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                      {(() => {
                        const fg = gapToNext(focusDomain.score ?? 0);
                        if ('gap' in fg) {
                          return `${fg.gap.toFixed(1)} pts to ${fg.nextBand} · closest band-up available`;
                        }
                        return `Score ${focusDomain.score?.toFixed(1)}`;
                      })()}
                    </p>
                  </div>
                  <Link href="/learning">
                    <button
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/20"
                      style={{ border: "1px solid rgba(255,255,255,0.3)", color: "white", flexShrink: 0 }}
                    >
                      View plan <ArrowRight className="w-3 h-3" />
                    </button>
                  </Link>
                </div>
              )}

              {/* CTA for no-data state */}
              {!hasData && (
                <Link href="/assessment">
                  <Button size="sm" className="gap-1.5 bg-white text-blue-700 hover:bg-blue-50">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Take your assessment
                  </Button>
                </Link>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── C1: Learning streak + stats row ── */}
      {hasData && streakData && (streakData.currentStreak > 0 || streakData.totalModulesCompleted > 0) && (
        <div
          className="flex items-center gap-4 px-5 py-3 rounded-xl"
          style={{
            background: "white",
            border: "1px solid var(--lumi-border, #EAE5DE)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {streakData.currentStreak > 0 && (
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#FEF3C7" }}
              >
                <span style={{ fontSize: 16 }}>&#128293;</span>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #211B26)" }}>{streakData.currentStreak}-week streak</p>
                <p style={{ fontSize: 11, color: "var(--ink-faint, #8E8893)" }}>Keep learning to maintain it</p>
              </div>
            </div>
          )}
          {streakData.currentStreak > 0 && streakData.totalModulesCompleted > 0 && (
            <div style={{ width: 1, height: 32, background: "var(--lumi-border, #EAE5DE)", flexShrink: 0 }} />
          )}
          {streakData.totalModulesCompleted > 0 && (
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#DBEAFE" }}
              >
                <GraduationCap className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #211B26)" }}>{streakData.totalModulesCompleted} module{streakData.totalModulesCompleted !== 1 ? "s" : ""} completed</p>
                <p style={{ fontSize: 11, color: "var(--ink-faint, #8E8893)" }}>
                  {streakData.totalMinsLearned > 0 ? `${Math.round(streakData.totalMinsLearned / 60)}h ${streakData.totalMinsLearned % 60}m learned` : "Keep going"}
                </p>
              </div>
            </div>
          )}
          <div className="flex-1" />
          {streakData.nextMilestone && streakData.totalModulesCompleted < streakData.nextMilestone.target && (
            <div className="flex items-center gap-2">
              <div style={{ fontSize: 11, color: "var(--ink-faint, #8E8893)", textAlign: "right" }}>
                <span style={{ fontWeight: 600, color: "var(--ink-soft, #5B5560)" }}>{streakData.nextMilestone.label}</span>
                {" "}— {streakData.nextMilestone.target - streakData.totalModulesCompleted} more to go
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Journey Ladder widget ── */}
      {hasData && <JourneyLadderWidget />}

      {/* ── 6 Domain tiles (Lumi style) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ fontFamily: "var(--font-head)", fontSize: "var(--fs-label, 13px)", fontWeight: 600, color: "var(--ink-soft, #5B5560)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Capability domains
          </h2>
          <div className="flex items-center gap-3">
            {/* Sort dropdown */}
            <Select value={domainSort} onValueChange={v => setDomainSort(v as DomainSort)}>
              <SelectTrigger
                className="h-7 gap-1.5 border-0 bg-transparent shadow-none focus:ring-0"
                style={{ fontSize: "var(--fs-caption, 12px)", color: "var(--ink-soft, #5B5560)", padding: "0 8px", minWidth: 0, width: "auto" }}
              >
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="default">Default order</SelectItem>
                <SelectItem value="score_desc">Score ↓ high to low</SelectItem>
                <SelectItem value="score_asc">Score ↑ low to high</SelectItem>
                <SelectItem value="rating">Rating (best first)</SelectItem>
              </SelectContent>
            </Select>
            {hasData && (
              <Link href="/assessment">
                <button style={{ fontSize: "var(--fs-caption, 12px)", color: "var(--blue, #2048B0)", fontWeight: 500 }} className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                  Full results →
                </button>
              </Link>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {sortedDomainKeys.map(key => {
            const domain = data?.domains.find(d => d.key === key);
            const colour = DOMAIN_COLOURS[key as keyof typeof DOMAIN_COLOURS] ?? "#3B82F6";
            const score = domain?.score ?? null;
            const fillPct = score !== null && score > 0 ? Math.round((score / 10) * 100) : 0;
            const tileHasData = hasData && (score ?? 0) > 0;
            const label = DOMAIN_SHORT_LABELS[key as keyof typeof DOMAIN_SHORT_LABELS] ?? DOMAIN_LABELS[key as keyof typeof DOMAIN_LABELS];
            // G1: Per-domain last-assessed date — find the most recent assessment that had this domain
            const lastDomainDate = data?.assessmentHistory
              .filter(h => h.domainScores && (h.domainScores as any)[key] != null && (h.domainScores as any)[key] > 0)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date ?? null;
            return (
              <button
                key={key}
                onClick={() => {
                  if (tileHasData && domain) setSelectedDomain({ key, score: domain.score ?? 0 });
                  else navigate("/assessment");
                }}
                className="group text-left bg-white flex flex-col transition-all hover:shadow-md"
                style={{
                  borderRadius: "var(--lumi-radius, 16px)",
                  border: "1px solid var(--lumi-border, #EAE5DE)",
                  boxShadow: "var(--shadow-card)",
                  borderTop: `3px solid ${colour}`,
                  padding: "14px 16px 16px",
                }}
              >
                {/* Domain name */}
                <span
                  className="block mb-2 leading-tight"
                  style={{ fontSize: "var(--fs-caption, 12px)", fontWeight: 600, color: "var(--ink-soft, #5B5560)" }}
                >
                  {label}
                </span>

                {/* Score number */}
                <span
                  className="block tabular-nums"
                  style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: tileHasData ? colour : "var(--ink-faint, #8E8893)", fontFamily: "var(--font-mono, JetBrains Mono, monospace)" }}
                >
                  {tileHasData && score !== null ? score.toFixed(1) : "—"}
                </span>

                {/* Level chip — canonical 5-band from brand.ts */}
                <div className="mt-2 mb-3">
                  {tileHasData && score !== null ? (() => {
                    const lv = scoreToLevel(score);
                    const lc = getLevelColour(lv);
                    return (
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ backgroundColor: lc.bg, color: lc.text }}
                      >
                        {LEVEL_LABELS[lv]}
                      </span>
                    );
                  })() : (
                    <span style={{ fontSize: 10, color: "var(--ink-faint, #8E8893)", fontWeight: 500 }}>No data</span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full" style={{ height: 6, borderRadius: 3, background: "var(--surface-sunk, #F4F1EC)" }}>
                  {tileHasData && score !== null && score > 0 ? (
                    <div
                      style={{ height: "100%", width: `${fillPct}%`, borderRadius: 3, backgroundColor: colour, transition: "width 0.5s ease" }}
                    />
                  ) : null}
                </div>

                {/* G1: Per-domain as-of date */}
                {tileHasData && lastDomainDate && (
                  <span
                    className="block mt-2"
                    style={{ fontSize: 10, color: "var(--ink-faint, #8E8893)" }}
                  >
                    {new Date(lastDomainDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Improvement tracker — only when ≥ 2 assessments ── */}
      {hasData && data && data.assessmentHistory.length >= 2 && (
        <ImprovementTracker history={data.assessmentHistory} />
      )}

      {/* ── Bottom row: locked panels for new users ── */}
      {!hasData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { title: "You lead", icon: <TrendingUp className="w-4 h-4 text-blue-500" /> },
            { title: "Biggest gaps", icon: <BookOpen className="w-4 h-4 text-blue-500" /> },
          ].map(({ title, icon }) => (
            <div
              key={title}
              className="rounded-xl bg-white border border-gray-100 p-5"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {icon}
                  <span className="text-sm font-semibold text-gray-700">{title}</span>
                </div>
                <Lock className="w-3.5 h-3.5 text-gray-300" />
              </div>
              <div className="space-y-2">
                {[75, 55, 65].map((w, i) => (
                  <div key={i} className="h-3 rounded-md bg-gray-100" style={{ width: `${w}%`, filter: "blur(2px)" }} />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">Unlock by completing your assessment</p>
            </div>
          ))}
        </div>
      )}

      {/* ── AI capability summary ── */}
      {hasData && (
        <div
          className="rounded-xl bg-white border border-gray-100 p-5"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}
        >
          <SectionHeader
            icon={<Sparkles className="w-4 h-4 text-violet-500" />}
            title="Your AI capability profile"
          />
          {aiSummaryLoading ? (
            <div className="space-y-2">
              <div className="h-3.5 rounded bg-gray-100 animate-pulse" style={{ width: "92%" }} />
              <div className="h-3.5 rounded bg-gray-100 animate-pulse" style={{ width: "78%" }} />
              <div className="h-3.5 rounded bg-gray-100 animate-pulse" style={{ width: "85%" }} />
            </div>
          ) : aiSummaryData?.summary ? (
            <div>
              <p className="text-sm text-gray-600 leading-relaxed">{aiSummaryData.summary}</p>
              <p className="mt-2 text-[10px] text-gray-400 italic">AI-generated summary · review before sharing</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Profile summary will appear here after your assessment is processed.</p>
          )}
        </div>
      )}

      {/* ── Development plan — users with data ── */}
      {hasData && data?.planSummary && (
        <div
          className="rounded-xl bg-white border border-gray-100 p-5"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}
        >
          <SectionHeader
            icon={<BookOpen className="w-4 h-4 text-blue-500" />}
            title="Your development plan"
            action={
              <Link href="/learning">
                <button className="text-xs text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 font-medium">
                  View plan <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            }
          />
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: data.planSummary.moduleCount, label: "Modules recommended" },
              { value: `${Math.round(data.planSummary.totalEstimatedMinutes / 60)}h`, label: "Estimated learning time" },
              {
                value: `${Math.round(data.planSummary.completionPercentage)}%`,
                label: "Plan completed",
                highlight: data.planSummary.completionPercentage > 0,
              },
            ].map(({ value, label, highlight }) => (
              <div key={label} className="text-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                <p className={`text-2xl font-bold ${highlight ? "text-blue-600" : "text-gray-800"}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {data.planSummary.completionPercentage === 0 ? (
            !isPro ? (
              <button
                onClick={() => setUpgradeOpen(true)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-[#10B981] hover:text-[#0d9e6e] transition-colors"
              >
                <Lock className="w-3 h-3" />
                Upgrade to PRO to start your first module
              </button>
            ) : (
              <p className="text-xs text-gray-400 mt-3 text-center">
                Start your first module to begin tracking progress
              </p>
            )
          ) : data.planSummary.completionPercentage >= 100 ? (
            <p className="text-xs text-emerald-600 mt-3 text-center font-semibold">🎉 All modules completed!</p>
          ) : null}
        </div>
      )}

      {/* ── Domain detail modal ── */}
      <DomainDetailModal
        domainKey={selectedDomain?.key ?? null}
        domainScore={selectedDomain?.score ?? 0}
        onClose={() => setSelectedDomain(null)}
      />
      {/* PRO upgrade modal */}
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        featureName="Learning Modules"
      />
    </div>
  );
}
