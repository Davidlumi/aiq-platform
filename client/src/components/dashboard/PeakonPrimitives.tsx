/**
 * Peakon Design System Primitives v4.0
 *
 * Faithful recreation of Peakon/Workday Peakon visual patterns:
 * - HeroScore: large bold number with colour-coded text (not background)
 * - Sparkline: minimalist trend line, no axes, single current-value dot
 * - DistributionBar: segmented horizontal bar (AI Ready / Developing / Not Ready)
 * - PillFilter: pill-shaped segment dropdown controls
 * - AIInsightCard: AI-generated summary with sparkle icon
 * - BenchmarkComparison: score vs benchmark with delta
 * - TrendArrow: directional trend indicator
 * - SegmentRow: expandable heatmap row with chevron
 */

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { scoreToColor, scoreToTint, formatPeakonScore, scoreToReadinessLabel } from "@/lib/peakon-colors";
import { ChevronDown, ChevronRight, Sparkles, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Hero Score ───────────────────────────────────────────────────────────────
// Large bold number with colour-coded text (Peakon style: colour IS the number)

export function HeroScore({
  score,
  label,
  benchmark,
  delta,
  size = "xl",
  className,
}: {
  score: number | null;
  label?: string;
  benchmark?: number | null;
  delta?: number | null;
  size?: "lg" | "xl" | "2xl";
  className?: string;
}) {
  if (score === null) {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <span className="text-4xl font-bold text-neutral-300">—</span>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    );
  }

  const { bg: colour } = scoreToColor(score);
  const sizeMap = { lg: "text-5xl", xl: "text-6xl", "2xl": "text-7xl" };
  const displayScore = formatPeakonScore(score);
  const benchmarkDelta = benchmark != null ? parseFloat(formatPeakonScore(score)) - parseFloat(formatPeakonScore(benchmark)) : null;

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <div className="flex items-baseline gap-3">
        <span
          className={cn("font-bold tabular-nums tracking-tight leading-none", sizeMap[size])}
          style={{ color: colour }}
        >
          {displayScore}
        </span>
        {delta != null && delta !== 0 && (
          <span className={cn("text-sm font-semibold flex items-center gap-0.5", delta > 0 ? "text-emerald-600" : "text-red-500")}>
            {delta > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {delta > 0 ? "+" : ""}{(delta / 10).toFixed(1)}
          </span>
        )}
      </div>
      {label && <span className="text-xs text-muted-foreground font-medium">{label}</span>}
      {benchmarkDelta != null && (
        <span className={cn("text-xs font-medium", benchmarkDelta >= 0 ? "text-emerald-600" : "text-amber-600")}>
          {benchmarkDelta >= 0 ? "+" : ""}{benchmarkDelta.toFixed(1)} vs benchmark ({formatPeakonScore(benchmark!)})
        </span>
      )}
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
// Minimalist SVG line chart — no axes, just trend + current dot

export function Sparkline({
  data,
  colour,
  width = 120,
  height = 40,
  showDot = true,
  className,
}: {
  data: number[];
  colour?: string;
  width?: number;
  height?: number;
  showDot?: boolean;
  className?: string;
}) {
  if (!data || data.length < 2) {
    return <div className={cn("flex items-center justify-center text-xs text-muted-foreground", className)} style={{ width, height }}>—</div>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const last = points[points.length - 1];
  const lineColour = colour || scoreToColor(data[data.length - 1]).bg;

  return (
    <svg width={width} height={height} className={cn("overflow-visible", className)}>
      <path
        d={pathD}
        fill="none"
        stroke={lineColour}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDot && (
        <circle cx={last.x} cy={last.y} r={3.5} fill={lineColour} stroke="white" strokeWidth={1.5} />
      )}
    </svg>
  );
}

// ─── Distribution Bar ─────────────────────────────────────────────────────────
// Horizontal segmented bar — AI Ready / Developing / Not Yet Ready

interface DistributionSegment {
  label: string;
  value: number;
  colour: string;
  textColour?: string;
}

export function DistributionBar({
  segments,
  total,
  height = 28,
  showLabels = true,
  className,
}: {
  segments: DistributionSegment[];
  total: number;
  height?: number;
  showLabels?: boolean;
  className?: string;
}) {
  if (!total) return null;

  return (
    <div className={cn("w-full", className)}>
      {/* Bar */}
      <div className="flex w-full rounded-full overflow-hidden" style={{ height }}>
        {segments.map((seg, i) => {
          const pct = (seg.value / total) * 100;
          if (pct < 0.5) return null;
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center justify-center transition-all cursor-default"
                  style={{ width: `${pct}%`, backgroundColor: seg.colour }}
                >
                  {pct > 8 && (
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: seg.textColour || "#fff" }}>
                      {Math.round(pct)}%
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-semibold">{seg.label}</p>
                <p>{seg.value} ({Math.round(pct)}%)</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      {/* Labels */}
      {showLabels && (
        <div className="flex mt-2 gap-4 flex-wrap">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.colour }} />
              <span className="text-[11px] text-muted-foreground">{seg.label}</span>
              <span className="text-[11px] font-semibold tabular-nums text-foreground">{seg.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AI Readiness Distribution Bar (pre-configured) ──────────────────────────

export function ReadinessDistributionBar({
  aiReady,
  developing,
  notYetReady,
  foundationGap,
  total,
  className,
}: {
  aiReady: number;
  developing: number;
  notYetReady: number;
  foundationGap: number;
  total: number;
  className?: string;
}) {
  const segments: DistributionSegment[] = [
    { label: "AI Ready", value: aiReady, colour: "#7A9E8E" },
    { label: "Developing", value: developing, colour: "#C8B07A" },
    { label: "Not Yet Ready", value: notYetReady, colour: "#C08878" },
    { label: "Foundation Gap", value: foundationGap, colour: "#A87868" },
  ].filter(s => s.value > 0);

  return <DistributionBar segments={segments} total={total} className={className} />;
}

// ─── Pill Filter ─────────────────────────────────────────────────────────────
// Peakon-style pill-shaped dropdown filter

export function PillFilter({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const selected = options.find(o => o.value === value);
  return (
    <div className={cn("relative inline-block", className)}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium rounded-full border border-neutral-200 bg-white text-foreground cursor-pointer hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-colors"
        style={{ minWidth: 120 }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
    </div>
  );
}

// ─── AI Insight Card ──────────────────────────────────────────────────────────
// Peakon-style AI-generated summary with sparkle icon

export function AIInsightCard({
  title,
  insights,
  isLoading,
  className,
}: {
  title?: string;
  insights: string[];
  isLoading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-violet-600" />
        </div>
        <span className="text-xs font-semibold text-violet-800">{title || "AI-generated insight"}</span>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-3 bg-violet-100 rounded animate-pulse" style={{ width: `${70 + i * 10}%` }} />
          ))}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-violet-900">
              <span className="w-1 h-1 rounded-full bg-violet-400 mt-1.5 shrink-0" />
              {insight}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Trend Arrow ─────────────────────────────────────────────────────────────

export function TrendArrow({ delta, suffix = "pts", className }: { delta: number | null; suffix?: string; className?: string }) {
  if (delta === null || delta === 0) {
    return (
      <span className={cn("inline-flex items-center gap-0.5 text-xs text-neutral-400", className)}>
        <Minus className="w-3 h-3" /> No change
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", positive ? "text-emerald-600" : "text-red-500", className)}>
      {positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {positive ? "+" : ""}{(delta / 10).toFixed(1)} {suffix}
    </span>
  );
}

// ─── Benchmark Chip ───────────────────────────────────────────────────────────

export function BenchmarkChip({ score, benchmark, label = "vs benchmark" }: { score: number; benchmark: number; label?: string }) {
  const delta = parseFloat(formatPeakonScore(score)) - parseFloat(formatPeakonScore(benchmark));
  const positive = delta >= 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
      positive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
    )}>
      {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {positive ? "+" : ""}{delta.toFixed(1)} {label}
    </span>
  );
}

// ─── Expandable Segment Row (for heatmaps) ────────────────────────────────────

export function SegmentRow({
  label,
  sublabel,
  scores,
  headcount,
  isExpanded,
  onToggle,
  hasChildren,
  depth = 0,
  isChild = false,
}: {
  label: string;
  sublabel?: string;
  scores: (number | null)[];
  headcount?: number;
  isExpanded?: boolean;
  onToggle?: () => void;
  hasChildren?: boolean;
  depth?: number;
  isChild?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors",
        isChild && "bg-neutral-50/30",
      )}
      style={{ paddingLeft: depth * 16 + 16, paddingRight: 16, paddingTop: 10, paddingBottom: 10 }}
    >
      {/* Label */}
      <div className="flex items-center gap-2 min-w-0" style={{ width: 200, flexShrink: 0 }}>
        {hasChildren ? (
          <button
            onClick={onToggle}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-neutral-200 transition-colors shrink-0"
          >
            {isExpanded
              ? <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
              : <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
            }
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{label}</p>
          {sublabel && <p className="text-[10px] text-muted-foreground truncate">{sublabel}</p>}
        </div>
        {headcount != null && (
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 ml-auto">{headcount}</span>
        )}
      </div>
      {/* Score cells */}
      <div className="flex gap-1 ml-4">
        {scores.map((score, i) => (
          <ScoreCell key={i} score={score} />
        ))}
      </div>
    </div>
  );
}

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div
        className="w-14 h-9 rounded flex items-center justify-center text-[10px] text-neutral-300 border border-dashed border-neutral-200"
        style={{ backgroundColor: "#FAFAFA" }}
      >
        —
      </div>
    );
  }
  const { bg } = scoreToColor(score);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="w-14 h-9 rounded flex items-center justify-center font-mono font-bold text-xs tabular-nums text-white cursor-default"
          style={{ backgroundColor: bg }}
        >
          {formatPeakonScore(score)}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p className="font-semibold">{formatPeakonScore(score)} / 10.0</p>
        <p className="text-muted-foreground">{scoreToReadinessLabel(score)}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Score Trend Card ─────────────────────────────────────────────────────────
// Domain trajectory card with sparkline (like Peakon driver cards)

export function ScoreTrendCard({
  label,
  colour,
  currentScore,
  delta,
  history,
  onClick,
  className,
}: {
  label: string;
  colour: string;
  currentScore: number;
  delta: number | null;
  history: number[];
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-neutral-200 p-4 flex flex-col gap-2",
        onClick && "cursor-pointer hover:border-neutral-300 hover:shadow-sm transition-all",
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colour }} />
          <span className="text-xs font-semibold text-foreground truncate">{label}</span>
        </div>
        <TrendArrow delta={delta} />
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="text-2xl font-bold tabular-nums" style={{ color: colour }}>
          {formatPeakonScore(currentScore)}
        </span>
        <Sparkline data={history} colour={colour} width={100} height={36} />
      </div>
    </div>
  );
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────
// Clean stat display for overview metrics

export function StatTile({
  label,
  value,
  sub,
  colour,
  icon,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  colour?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-white rounded-xl border border-neutral-200 p-5 flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <span
        className="text-3xl font-bold tabular-nums tracking-tight"
        style={{ color: colour || "inherit" }}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}
