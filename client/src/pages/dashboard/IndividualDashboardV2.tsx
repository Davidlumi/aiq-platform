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
import { useMemo } from "react";
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
} from "lucide-react";
import {
  DOMAIN_KEYS,
  DOMAIN_LABELS,
  DOMAIN_SHORT_LABELS,
  DOMAIN_COLOURS,
  DOMAIN_ICON_NAMES,
  DOMAIN_DESCRIPTIONS,
} from "@/lib/domains";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatScore } from "@/lib/peakon-colors";

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
    1: { bg: "#FEE2E2", text: "#991B1B", accent: "#EF4444" },
    2: { bg: "#FEF3C7", text: "#92400E", accent: "#F59E0B" },
    3: { bg: "#DCFCE7", text: "#166534", accent: "#22C55E" },
    4: { bg: "#D1FAE5", text: "#065F46", accent: "#10B981" },
    5: { bg: "#BBFBDA", text: "#14532D", accent: "#16A34A" },
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
function CapabilityGauge({ score, empty = false }: { score: number; empty?: boolean }) {
  const level = getLevelFromScore(score);
  const levelLabel = getLevelLabel(level);
  const colours = getLevelColour(level);

  const cx = 130, cy = 120, r = 90, sw = 16;
  const gradId = "gauge-fill-grad";

  // Needle: -180° (left) to 0° (right), mapped to score 0–100
  const needleAngle = empty ? -90 : -180 + (score / 100) * 180;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLen = r - 8;
  const nx = cx + needleLen * Math.cos(needleRad);
  const ny = cy + needleLen * Math.sin(needleRad);

  const fillAngle = empty ? -180 : -180 + (score / 100) * 180;
  const fillD = describeArc(cx, cy, r, -180, fillAngle);
  const trackD = describeArc(cx, cy, r, -180, 0);

  return (
    <div className="flex flex-col items-center w-full">
      <svg width={260} height={148} viewBox="0 0 260 148" className="overflow-visible w-full max-w-[260px]">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#EF4444" />
            <stop offset="35%"  stopColor="#F59E0B" />
            <stop offset="70%"  stopColor="#22C55E" />
            <stop offset="100%" stopColor="#16A34A" />
          </linearGradient>
        </defs>

        {/* Track */}
        <path d={trackD} fill="none" stroke="#E5E7EB" strokeWidth={sw} strokeLinecap="round" />

        {/* Fill */}
        {!empty && (
          <path d={fillD} fill="none" stroke={`url(#${gradId})`} strokeWidth={sw} strokeLinecap="round" />
        )}

        {/* Needle */}
        <line
          x1={cx} y1={cy} x2={nx} y2={ny}
          stroke={empty ? "#D1D5DB" : "#374151"}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5}
          fill={empty ? "#D1D5DB" : "#374151"}
        />
      </svg>

      {/* Label */}
      <div className="text-center -mt-2">
        {empty ? (
          <>
            <p className="text-base font-semibold text-gray-400">Not enough data yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Complete your assessment to see your position</p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold" style={{ color: colours.accent }}>{levelLabel}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Score {Math.round(score)}/100
            </p>
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
  const level = score !== null && score > 0 ? getLevelFromScore(score) : null;
  const levelLabel = level !== null ? getLevelLabel(level) : null;
  const levelColour = level !== null ? getLevelColour(level) : null;
  const fillPct = score !== null && score > 0 ? Math.round(score) : 0;

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
          {levelLabel && levelColour ? (
            <span
              className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5"
              style={{ backgroundColor: levelColour.bg, color: levelColour.text }}
            >
              {levelLabel}
            </span>
          ) : (
            <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 bg-gray-100 text-gray-400">
              No data
            </span>
          )}
        </div>
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

      {/* Score or locked */}
      <div className="flex items-center justify-between">
        {hasData && score !== null && score > 0 ? (
          <span className="text-xs text-gray-400 font-medium">{Math.round(score)}/100</span>
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
            <span className="text-2xl font-bold text-gray-900">{latest.overallScore}</span>
            <span className="text-sm text-gray-400">/100</span>
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
                {delta > 0 ? "+" : ""}{Math.round(delta)} pts
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
                          <span className="text-xs text-gray-500">{latestScore}/100</span>
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
                          <p className="text-sm font-bold text-gray-700">{previousScore}<span className="text-[10px] font-normal text-gray-400">/100</span></p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Current</p>
                          <p className="text-sm font-bold text-gray-700">{latestScore}<span className="text-[10px] font-normal text-gray-400">/100</span></p>
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
                <span className="font-semibold text-gray-700">{item.overallScore}/100</span>
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
        description: `Your strongest capability area — score ${Math.round(topScore)}/100`,
        direction: topScore >= 65 ? "above" : topScore >= 50 ? "on_target" : "below",
      });
    }

    if (withScores.length > 1) {
      const bottom = withScores[withScores.length - 1];
      const botScore = bottom.score ?? 0;
      result.push({
        label: bottom.name,
        description: `Biggest development opportunity — score ${Math.round(botScore)}/100`,
        direction: botScore < 50 ? "below" : botScore < 65 ? "on_target" : "above",
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
          <h1 className="text-xl font-bold text-gray-900">
            {hasData ? `${firstName}'s capability profile` : `Welcome, ${firstName}`}
          </h1>
          {data?.lastAssessmentDate ? (
            <p className="text-xs text-gray-400 mt-0.5">
              Last assessed {new Date(data.lastAssessmentDate).toLocaleDateString("en-GB", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">No assessment completed yet</p>
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

      {/* ── Reassessment countdown — users with data ── */}
      {hasData && (
        <ReassessmentCountdown
          dueDate={data?.nextReassessmentDate ?? null}
          lastAssessmentDate={data?.lastAssessmentDate ?? null}
        />
      )}

      {/* ── CTA banner — new users only ── */}
      {!hasData && (
        <div className="flex items-center gap-5 p-5 rounded-xl border border-blue-100 bg-blue-50">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">Take your AI capability assessment</p>
            <p className="text-xs text-gray-500 mt-0.5">
              15 minutes · 6 capability domains · A precise score that tells you exactly where you stand
            </p>
          </div>
          <Link href="/assessment">
            <Button size="sm" className="gap-1.5 whitespace-nowrap shrink-0">
              Start assessment
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* ── Main two-column row: Gauge + Signals ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Where you stand */}
        <div
          className="lg:col-span-2 rounded-xl bg-white border border-gray-100 p-5 flex flex-col"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}
        >
          <SectionHeader
            icon={
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              </div>
            }
            title="Where you stand"
          />

          <div className="flex-1 flex flex-col items-center justify-center py-2">
            <CapabilityGauge score={data?.overallScore ?? 0} empty={!hasData} />
          </div>

          {hasData && data && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{data.assessmentHistory.length} assessment{data.assessmentHistory.length !== 1 ? "s" : ""} completed</span>
                {data.assessmentHistory.length >= 2 && (
                  <ScoreSparkline history={data.assessmentHistory} />
                )}
              </div>
              {data.nextReassessmentDate && (
                <p className="text-xs text-gray-400 mt-1">
                  Next reassessment: {new Date(data.nextReassessmentDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
              )}
            </div>
          )}

          {!hasData && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                Your position appears once you complete the assessment
              </p>
            </div>
          )}
        </div>

        {/* Signals */}
        <div
          className="lg:col-span-3 rounded-xl bg-white border border-gray-100 p-5 flex flex-col"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}
        >
          <SectionHeader
            icon={<span className="text-base leading-none">🚩</span>}
            title={`Signals · ${hasData ? signals.length : 0}`}
            subtitle="flags worth a look — we flag, you decide"
            action={
              hasData && signals.length > 0 ? (
                <Link href="/assessment">
                  <button className="text-xs text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 font-medium">
                    Full results <ArrowRight className="w-3 h-3" />
                  </button>
                </Link>
              ) : undefined
            }
          />

          {hasData && signals.length > 0 ? (
            <div className="flex-1 space-y-2.5">
              {signals.map((s, i) => (
                <SignalRow key={i} signal={s} />
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-2.5">
              {/* Blurred placeholder rows */}
              {[{ w: "78%", w2: "55%" }, { w: "62%", w2: "45%" }, { w: "70%", w2: "50%" }].map((row, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 bg-gray-50"
                >
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 rounded bg-gray-200" style={{ width: row.w, filter: "blur(3px)" }} />
                    <div className="h-2.5 rounded bg-gray-100" style={{ width: row.w2, filter: "blur(3px)" }} />
                  </div>
                  <div className="h-5 w-20 rounded-full bg-gray-200" style={{ filter: "blur(3px)" }} />
                </div>
              ))}
              <div className="flex flex-col items-center gap-2 pt-2">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Signals unlock with your assessment</span>
                </div>
                <Link href="/assessment">
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 mt-1">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Take assessment
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 6 Domain cards ── */}
      <div>
        <SectionHeader
          title="Capability domains"
          action={
            hasData ? (
              <Link href="/assessment">
                <button className="text-xs text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 font-medium">
                  Full breakdown <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            ) : undefined
          }
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {DOMAIN_KEYS.map(key => {
            const domain = data?.domains.find(d => d.key === key);
            return (
              <DomainCard
                key={key}
                domainKey={key}
                name={
                  DOMAIN_SHORT_LABELS[key as keyof typeof DOMAIN_SHORT_LABELS] ??
                  DOMAIN_LABELS[key as keyof typeof DOMAIN_LABELS]
                }
                score={domain?.score ?? null}
                hasData={hasData && (domain?.score ?? 0) > 0}
                onClick={() => {
                  if (hasData) navigate("/assessment");
                  else navigate("/assessment");
                }}
              />
            );
          })}
        </div>
      </div>

      {/* ── Improvement tracker — users with data ── */}
      {hasData && data && data.assessmentHistory.length >= 1 && (
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
            <p className="text-sm text-gray-600 leading-relaxed">{aiSummaryData.summary}</p>
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
          {data.planSummary.completionPercentage === 0 && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              Start your first module to begin tracking progress
            </p>
          )}
        </div>
      )}
    </div>
  );
}
