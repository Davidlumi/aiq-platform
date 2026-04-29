/**
 * AiQ Loading Components - Enterprise-grade skeleton screens and loading states
 *
 * Provides branded shimmer animations, page-level loaders, and composable
 * skeleton primitives for cards, tables, charts, stats, and forms.
 */
import { cn } from "@/lib/utils";

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
// Mimics a chart area with axis lines and bar/area placeholders

export function ChartSkeleton({
  type = "bar",
  className,
}: {
  type?: "bar" | "area" | "radar" | "donut";
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <ShimmerBlock className="h-4 w-32" />
        <ShimmerBlock className="h-3 w-20" />
      </div>
      {type === "bar" && (
        <div className="flex items-end gap-2 h-40 pt-2">
          {[65, 85, 45, 70, 55, 90, 60].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end h-full">
              <ShimmerBlock
                brand
                className="w-full rounded-t-md rounded-b-none"
                style={{ height: `${h}%` }}
              />
            </div>
          ))}
        </div>
      )}
      {type === "area" && (
        <div className="h-40 relative overflow-hidden rounded-lg">
          <ShimmerBlock brand className="absolute inset-0 rounded-lg opacity-30" />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
            <path
              d="M0 35 Q10 30 20 28 T40 20 T60 25 T80 15 T100 18 V40 H0 Z"
              fill="oklch(97.2% 0.025 162 / 0.4)"
            />
            <path
              d="M0 35 Q10 30 20 28 T40 20 T60 25 T80 15 T100 18"
              fill="none"
              stroke="oklch(70.4% 0.165 162 / 0.3)"
              strokeWidth="0.5"
            />
          </svg>
        </div>
      )}
      {type === "radar" && (
        <div className="h-40 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full border-2 border-dashed border-border flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center">
              <ShimmerBlock brand className="w-10 h-10 rounded-full" />
            </div>
          </div>
        </div>
      )}
      {type === "donut" && (
        <div className="h-40 flex items-center justify-center">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 rounded-full aiq-shimmer-brand" />
            <div className="absolute inset-5 rounded-full bg-card" />
          </div>
        </div>
      )}
      <div className="flex gap-4 mt-3">
        {[1, 2, 3].map(i => (
          <ShimmerBlock key={i} className="h-2.5 w-12" />
        ))}
      </div>
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
