/**
 * AiQ Loading Components - Enterprise-grade skeleton screens and loading states
 *
 * Provides branded shimmer animations, page-level loaders, and composable
 * skeleton primitives for cards, tables, charts, stats, and forms.
 */
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

// --- Shimmer Block ----------------------------------------------------------
// Base building block: a rounded rectangle with the AiQ shimmer gradient

export function ShimmerBlock({
  className,
  brand = false,
  ...props
}: React.ComponentProps<"div"> & { brand?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg",
        brand ? "aiq-shimmer-brand" : "aiq-shimmer",
        className
      )}
      {...props}
    />
  );
}

// --- Page Loader ------------------------------------------------------------
// Full-page centered spinner with AiQ brand ring animation

export function PageLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative w-12 h-12">
        <div
          className="absolute inset-0 rounded-full border-[3px] border-border"
        />
        <div
          className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary"
          style={{ animation: "aiq-spin 0.8s linear infinite" }}
        />
      </div>
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );
}

// --- Stat Skeleton ----------------------------------------------------------
// Mimics a KPI stat card with label + large number + subtitle

export function StatSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 space-y-3", className)}>
      <ShimmerBlock className="h-3 w-20" />
      <ShimmerBlock className="h-8 w-24" brand />
      <ShimmerBlock className="h-2.5 w-32" />
    </div>
  );
}

// --- Card Skeleton ----------------------------------------------------------
// Generic card with configurable number of content rows

export function CardSkeleton({
  rows = 3,
  hasHeader = true,
  className,
}: {
  rows?: number;
  hasHeader?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 space-y-4", className)}>
      {hasHeader && (
        <div className="flex items-center justify-between">
          <ShimmerBlock className="h-4 w-36" />
          <ShimmerBlock className="h-3 w-16" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <ShimmerBlock
            key={i}
            className="h-3"
            style={{ width: `${85 - i * 10}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// --- Chart Skeleton ---------------------------------------------------------
// Mimics a chart area with animated SVG shapes for bar, area, radar, donut, sparkline, ring

export function ChartSkeleton({
  type = "bar",
  height = 160,
  title = true,
  legend = true,
  className,
}: {
  type?: "bar" | "area" | "radar" | "donut" | "sparkline" | "ring" | "heatmap-mini";
  height?: number;
  title?: boolean;
  legend?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      {title && (
        <div className="flex items-center justify-between mb-4">
          <ShimmerBlock className="h-4 w-32" />
          <ShimmerBlock className="h-3 w-20" />
        </div>
      )}

      {type === "bar" && (
        <div className="flex items-end gap-2 pt-2" style={{ height }}>
          {[65, 85, 45, 70, 55, 90, 60].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end h-full">
              <div
                className="w-full rounded-t-md aiq-shimmer-brand"
                style={{
                  height: `${h}%`,
                  animation: `aiq-shimmer 1.8s ease-in-out infinite, aiq-bar-grow 0.6s ease-out forwards`,
                  animationDelay: `${i * 80}ms`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {type === "area" && (
        <div className="relative overflow-hidden rounded-lg" style={{ height }}>
          <ShimmerBlock brand className="absolute inset-0 rounded-lg opacity-20" />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="aiq-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(72.3% 0.220 142)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="oklch(72.3% 0.220 142)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path
              d="M0 50 C20 45 30 35 50 32 S80 28 100 22 S140 30 160 20 S185 15 200 18 V60 H0 Z"
              fill="url(#aiq-area-grad)"
              className="aiq-line-draw"
            />
            <path
              d="M0 50 C20 45 30 35 50 32 S80 28 100 22 S140 30 160 20 S185 15 200 18"
              fill="none"
              stroke="oklch(72.3% 0.220 142 / 0.5)"
              strokeWidth="1.5"
              className="aiq-line-draw"
            />
            {/* Axis lines */}
            <line x1="0" y1="59" x2="200" y2="59" stroke="oklch(40% 0.020 240 / 0.4)" strokeWidth="0.5" />
            {[0, 50, 100, 150, 200].map(x => (
              <line key={x} x1={x} y1="55" x2={x} y2="60" stroke="oklch(40% 0.020 240 / 0.4)" strokeWidth="0.5" />
            ))}
          </svg>
        </div>
      )}

      {type === "radar" && (
        <div className="flex items-center justify-center" style={{ height }}>
          <svg viewBox="0 0 120 120" className="w-full" style={{ maxHeight: height }}>
            {/* Concentric hexagons */}
            {[50, 37, 24, 11].map((r, idx) => (
              <polygon
                key={idx}
                points={Array.from({ length: 6 }, (_, i) => {
                  const angle = (Math.PI / 3) * i - Math.PI / 2;
                  return `${60 + r * Math.cos(angle)},${60 + r * Math.sin(angle)}`;
                }).join(" ")}
                fill="none"
                stroke="oklch(30% 0.020 240)"
                strokeWidth="0.8"
              />
            ))}
            {/* Spokes */}
            {Array.from({ length: 6 }, (_, i) => {
              const angle = (Math.PI / 3) * i - Math.PI / 2;
              return (
                <line
                  key={i}
                  x1="60" y1="60"
                  x2={60 + 50 * Math.cos(angle)}
                  y2={60 + 50 * Math.sin(angle)}
                  stroke="oklch(30% 0.020 240)"
                  strokeWidth="0.8"
                />
              );
            })}
            {/* Data polygon shimmer */}
            <polygon
              points={Array.from({ length: 6 }, (_, i) => {
                const angle = (Math.PI / 3) * i - Math.PI / 2;
                const r = [38, 28, 42, 32, 45, 35][i];
                return `${60 + r * Math.cos(angle)},${60 + r * Math.sin(angle)}`;
              }).join(" ")}
              fill="oklch(72.3% 0.220 142 / 0.15)"
              stroke="oklch(72.3% 0.220 142 / 0.5)"
              strokeWidth="1.5"
              className="aiq-line-draw"
            />
            {/* Axis labels */}
            {["AI Int.", "Output", "Workflow", "Readiness", "Ethics", "Leadership"].map((label, i) => {
              const angle = (Math.PI / 3) * i - Math.PI / 2;
              const x = 60 + 56 * Math.cos(angle);
              const y = 60 + 56 * Math.sin(angle);
              return (
                <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                  fontSize="5" fill="oklch(60% 0.020 240)">{label}</text>
              );
            })}
          </svg>
        </div>
      )}

      {type === "donut" && (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="relative" style={{ width: height * 0.7, height: height * 0.7 }}>
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {/* Track */}
              <circle cx="50" cy="50" r="38" fill="none" stroke="oklch(20% 0.020 240)" strokeWidth="12" />
              {/* Animated segments */}
              {[
                { pct: 35, color: "oklch(72.3% 0.220 142 / 0.7)", delay: 0 },
                { pct: 25, color: "oklch(65% 0.180 200 / 0.7)", delay: 100 },
                { pct: 20, color: "oklch(70% 0.150 50 / 0.7)", delay: 200 },
                { pct: 20, color: "oklch(55% 0.100 240 / 0.5)", delay: 300 },
              ].reduce<{ els: React.ReactNode[]; offset: number }>(
                ({ els, offset }, seg, idx) => {
                  const circ = 2 * Math.PI * 38;
                  const dash = (seg.pct / 100) * circ;
                  els.push(
                    <circle
                      key={idx}
                      cx="50" cy="50" r="38"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="12"
                      strokeDasharray={`${dash} ${circ - dash}`}
                      strokeDashoffset={-offset * circ / 100}
                      style={{ animationDelay: `${seg.delay}ms` }}
                      className="aiq-line-draw"
                    />
                  );
                  return { els, offset: offset + seg.pct };
                },
                { els: [], offset: 0 }
              ).els}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <ShimmerBlock brand className="w-8 h-4 rounded" />
            </div>
          </div>
        </div>
      )}

      {type === "sparkline" && (
        <div className="relative overflow-hidden" style={{ height: Math.min(height, 60) }}>
          <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
            <path
              d="M0 30 L25 22 L50 28 L75 15 L100 20 L125 12 L150 18 L175 8 L200 14"
              fill="none"
              stroke="oklch(72.3% 0.220 142 / 0.6)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="aiq-line-draw"
            />
            {[0, 50, 100, 150, 200].map((x, i) => (
              <circle key={i} cx={x} cy={[30, 28, 20, 18, 14][i]} r="2.5"
                fill="oklch(72.3% 0.220 142 / 0.5)"
                style={{ animationDelay: `${i * 100}ms` }}
                className="aiq-line-draw"
              />
            ))}
          </svg>
        </div>
      )}

      {type === "ring" && (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="relative" style={{ width: height * 0.75, height: height * 0.75 }}>
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="oklch(20% 0.020 240)" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke="oklch(72.3% 0.220 142 / 0.6)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="160 251"
                className="aiq-line-draw"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <ShimmerBlock brand className="w-10 h-5 rounded" />
              <ShimmerBlock className="w-7 h-2.5 rounded" />
            </div>
          </div>
        </div>
      )}

      {type === "heatmap-mini" && (
        <div className="space-y-1.5" style={{ height }}>
          {Array.from({ length: 4 }).map((_, row) => (
            <div key={row} className="flex gap-1.5">
              <ShimmerBlock className="h-7 w-20 shrink-0" />
              {Array.from({ length: 6 }).map((_, col) => (
                <ShimmerBlock
                  key={col}
                  brand
                  className="h-7 flex-1 rounded"
                  style={{ animationDelay: `${(row * 6 + col) * 25}ms` }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {legend && (
        <div className="flex gap-4 mt-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-1.5">
              <ShimmerBlock brand className="h-2.5 w-2.5 rounded-full" />
              <ShimmerBlock className="h-2.5 w-12" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Table Skeleton ---------------------------------------------------------
// Mimics a data table with header row and body rows

export function TableSkeleton({
  columns = 5,
  rows = 6,
  hasActions = true,
  className,
}: {
  columns?: number;
  rows?: number;
  hasActions?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/30">
        {Array.from({ length: columns }).map((_, i) => (
          <ShimmerBlock
            key={i}
            className="h-3 flex-1"
            style={{ maxWidth: i === 0 ? "30%" : i === columns - 1 && hasActions ? "8%" : "18%" }}
          />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center gap-3 px-5 py-3.5 border-b border-border last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <ShimmerBlock
              key={colIdx}
              className="h-3 flex-1"
              style={{
                maxWidth: colIdx === 0 ? "30%" : colIdx === columns - 1 && hasActions ? "8%" : "18%",
                animationDelay: `${rowIdx * 60}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// --- Heatmap Skeleton -------------------------------------------------------
// Mimics the dashboard heatmap grid

export function HeatmapSkeleton({
  rows = 6,
  cols = 7,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <ShimmerBlock className="h-4 w-40 mb-4" />
      <div className="space-y-1.5">
        {/* Column headers */}
        <div className="flex gap-1.5 mb-2">
          <div className="w-24 shrink-0" />
          {Array.from({ length: cols }).map((_, i) => (
            <ShimmerBlock key={i} className="h-3 flex-1" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-1.5 items-center">
            <ShimmerBlock className="h-3 w-24 shrink-0" />
            {Array.from({ length: cols }).map((_, colIdx) => (
              <ShimmerBlock
                key={colIdx}
                brand
                className="h-8 flex-1 rounded-md"
                style={{ animationDelay: `${(rowIdx * cols + colIdx) * 30}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Profile Header Skeleton ------------------------------------------------
// Mimics a user profile / dashboard header with avatar + name + subtitle

export function ProfileHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <ShimmerBlock brand className="h-12 w-12 rounded-full shrink-0" />
      <div className="space-y-2 flex-1">
        <ShimmerBlock className="h-5 w-48" />
        <ShimmerBlock className="h-3 w-32" />
      </div>
    </div>
  );
}

// --- Form Skeleton ----------------------------------------------------------
// Mimics a form with label + input pairs

export function FormSkeleton({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-6 space-y-5", className)}>
      <ShimmerBlock className="h-5 w-48 mb-2" />
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <ShimmerBlock className="h-3 w-24" />
          <ShimmerBlock className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <ShimmerBlock brand className="h-9 w-28 rounded-lg" />
      </div>
    </div>
  );
}

// --- List Skeleton ----------------------------------------------------------
// Mimics a list of items (e.g., module cards, assessment history)

export function ListSkeleton({
  items = 4,
  hasIcon = true,
  className,
}: {
  items?: number;
  hasIcon?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-4 flex items-center gap-3"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {hasIcon && <ShimmerBlock brand className="h-10 w-10 rounded-lg shrink-0" />}
          <div className="flex-1 space-y-2">
            <ShimmerBlock className="h-3.5 w-3/4" />
            <ShimmerBlock className="h-2.5 w-1/2" />
          </div>
          <ShimmerBlock className="h-7 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

// --- Dashboard Page Skeletons -----------------------------------------------
// Layout-accurate skeletons for each V2 dashboard

export function IndividualDashboardSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header with greeting + rating */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <ShimmerBlock className="h-7 w-64" />
          <ShimmerBlock className="h-3.5 w-40" />
        </div>
        <ShimmerBlock brand className="h-8 w-28 rounded-full" />
      </div>

      {/* Score + confidence + history row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>

      {/* Domain breakdown */}
      <CardSkeleton rows={6} className="aiq-stagger-3" />

      {/* Gaps + Plan summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardSkeleton rows={4} className="aiq-stagger-4" />
        <CardSkeleton rows={3} className="aiq-stagger-5" />
      </div>
    </div>
  );
}

export function ManagerDashboardSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <ShimmerBlock className="h-7 w-56" />
          <ShimmerBlock className="h-3.5 w-72" />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <StatSkeleton key={i} />)}
      </div>

      {/* Heatmap */}
      <HeatmapSkeleton rows={4} cols={6} />

      {/* Conversation prompts + Development overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardSkeleton rows={4} />
        <CardSkeleton rows={5} />
      </div>
    </div>
  );
}

export function LeaderDashboardSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Hero finding */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <ShimmerBlock className="h-3 w-20" />
        <ShimmerBlock brand className="h-6 w-3/4" />
        <ShimmerBlock className="h-3 w-full" />
        <ShimmerBlock className="h-3 w-2/3" />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <ShimmerBlock className="h-9 w-48 rounded-lg" />
        <ShimmerBlock className="h-3 w-24" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <StatSkeleton key={i} />)}
      </div>

      {/* Heatmap + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HeatmapSkeleton rows={6} cols={7} />
        <ChartSkeleton type="bar" />
      </div>

      {/* Trajectory + Strategic findings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton type="area" />
        <CardSkeleton rows={5} />
      </div>
    </div>
  );
}

// --- Assessment Skeletons ---------------------------------------------------

export function AssessmentResultsSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <ShimmerBlock className="h-7 w-56" />
        <ShimmerBlock className="h-3.5 w-80" />
      </div>

      {/* Score hero */}
      <div className="rounded-xl border border-border bg-card p-8 flex items-center gap-8">
        <ShimmerBlock brand className="h-24 w-24 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <ShimmerBlock className="h-5 w-40" />
          <ShimmerBlock brand className="h-8 w-28 rounded-full" />
          <ShimmerBlock className="h-3 w-64" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(i => (
          <ShimmerBlock key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>

      {/* Domain cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <CardSkeleton key={i} rows={3} />
        ))}
      </div>
    </div>
  );
}

export function AssessmentSessionSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      {/* Progress bar */}
      <ShimmerBlock brand className="h-2.5 w-full rounded-full" />

      {/* Question header */}
      <div className="space-y-2">
        <ShimmerBlock className="h-3 w-24" />
        <ShimmerBlock className="h-5 w-3/4" />
      </div>

      {/* Scenario card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <ShimmerBlock className="h-4 w-32" />
        <ShimmerBlock className="h-3 w-full" />
        <ShimmerBlock className="h-3 w-5/6" />
        <ShimmerBlock className="h-3 w-4/6" />
      </div>

      {/* Answer options */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <ShimmerBlock key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <ShimmerBlock className="h-10 w-24 rounded-lg" />
        <ShimmerBlock brand className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}

// --- Learning Skeletons -----------------------------------------------------

export function LearningPlanSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <ShimmerBlock className="h-7 w-48" />
        <ShimmerBlock className="h-3.5 w-72" />
      </div>

      {/* Journey map */}
      <div className="rounded-xl border border-border bg-card p-5">
        <ShimmerBlock className="h-4 w-36 mb-4" />
        <div className="flex gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-1 rounded-lg border border-border p-4 space-y-2">
              <ShimmerBlock brand className="h-8 w-8 rounded-lg" />
              <ShimmerBlock className="h-3.5 w-20" />
              <ShimmerBlock className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[1, 2, 3].map(i => (
          <ShimmerBlock key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>

      {/* Module list */}
      <ListSkeleton items={5} />
    </div>
  );
}

export function ModulePlayerSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Back link */}
      <ShimmerBlock className="h-3.5 w-32" />

      {/* Module header */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <ShimmerBlock brand className="h-6 w-16 rounded-full" />
          <ShimmerBlock className="h-6 w-20 rounded-full" />
        </div>
        <ShimmerBlock className="h-7 w-3/4" />
        <ShimmerBlock className="h-3.5 w-full" />
      </div>

      {/* Content area */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <ShimmerBlock brand className="h-48 w-full rounded-lg" />
        <ShimmerBlock className="h-4 w-2/3" />
        <ShimmerBlock className="h-3 w-full" />
        <ShimmerBlock className="h-3 w-5/6" />
        <ShimmerBlock className="h-3 w-3/4" />
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <ShimmerBlock className="h-10 w-24 rounded-lg" />
        <ShimmerBlock brand className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}

// --- Admin Skeletons --------------------------------------------------------

export function AdminPageSkeleton({
  title = true,
  filters = true,
  columns = 5,
  rows = 8,
}: {
  title?: boolean;
  filters?: boolean;
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-5 p-6">
      {title && (
        <div className="flex items-center justify-between">
          <ShimmerBlock className="h-7 w-48" />
          <ShimmerBlock brand className="h-9 w-28 rounded-lg" />
        </div>
      )}
      {filters && (
        <div className="flex gap-3">
          <ShimmerBlock className="h-9 w-64 rounded-lg" />
          <ShimmerBlock className="h-9 w-32 rounded-lg" />
          <ShimmerBlock className="h-9 w-32 rounded-lg" />
        </div>
      )}
      <TableSkeleton columns={columns} rows={rows} />
    </div>
  );
}

// --- Animated Container -----------------------------------------------------
// Wraps children with staggered fade-in animation on mount

export function AnimatedContainer({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn("aiq-fade-in", className)}
      style={{
        opacity: 0,
        animationDelay: `${delay}ms`,
        animationFillMode: "forwards",
      }}
    >
      {children}
    </div>
  );
}
