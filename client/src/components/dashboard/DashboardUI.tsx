/**
 * AiQ Dashboard UI Components — Design System v2.2
 *
 * Shared primitives used across Individual, Manager, and Leader dashboards.
 * Inter for body, JetBrains Mono for numbers, 8-point grid, skeleton loaders.
 */
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, ChevronRight, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

// ─── Rating Badge ────────────────────────────────────────────────────────────

const RATING_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  ai_ready:              { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0", dot: "#10B981" },
  developing:            { bg: "#FFF7ED", text: "#9A3412", border: "#FED7AA", dot: "#F59E0B" },
  not_yet_ready:         { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA", dot: "#EF4444" },
  foundation_gap:        { bg: "#FFF7ED", text: "#9A3412", border: "#FDBA74", dot: "#F97316" },
  insufficient_evidence: { bg: "#F8FAFC", text: "#475569", border: "#CBD5E1", dot: "#94A3B8" },
};

const RATING_DISPLAY: Record<string, string> = {
  ai_ready: "AI Ready",
  developing: "Developing",
  not_yet_ready: "Not Yet Ready",
  foundation_gap: "Foundation Gap",
  insufficient_evidence: "Insufficient Evidence",
};

export function RatingBadge({ rating, size = "md" }: { rating: string; size?: "sm" | "md" | "lg" }) {
  const style = RATING_STYLES[rating] ?? RATING_STYLES.insufficient_evidence;
  const label = RATING_DISPLAY[rating] ?? rating;
  const sizeClasses = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };
  return (
    <span
      className={cn("inline-flex items-center rounded-full font-semibold whitespace-nowrap", sizeClasses[size])}
      style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}
    >
      <span className="rounded-full shrink-0" style={{ width: size === "sm" ? 6 : 8, height: size === "sm" ? 6 : 8, backgroundColor: style.dot }} />
      {label}
    </span>
  );
}

// ─── Score Display ───────────────────────────────────────────────────────────

export function ScoreDisplay({ score, size = "lg", className }: { score: number | null; size?: "sm" | "md" | "lg"; className?: string }) {
  if (score === null) return <span className={cn("text-muted-foreground", className)}>—</span>;
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };
  return (
    <span className={cn("font-mono font-semibold tracking-tight tabular-nums", sizeClasses[size], className)}>
      {score}
    </span>
  );
}

// ─── Confidence Indicator ────────────────────────────────────────────────────

const CONFIDENCE_STYLES: Record<string, { colour: string; label: string }> = {
  high: { colour: "#10B981", label: "High confidence" },
  moderate: { colour: "#F59E0B", label: "Moderate confidence" },
  low: { colour: "#94A3B8", label: "Low confidence" },
};

export function ConfidenceIndicator({ band }: { band: "high" | "moderate" | "low" }) {
  const style = CONFIDENCE_STYLES[band];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1.5 text-xs cursor-help">
          <span className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1.5 h-3 rounded-sm"
                style={{
                  backgroundColor: i <= (band === "high" ? 2 : band === "moderate" ? 1 : 0)
                    ? style.colour
                    : "#E2E8F0",
                }}
              />
            ))}
          </span>
          <span style={{ color: style.colour }} className="font-medium">{style.label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs max-w-[200px]">
          {band === "high" && "Strong evidence base. This rating is well-supported by consistent assessment data."}
          {band === "moderate" && "Adequate evidence. Some additional assessment data would strengthen this rating."}
          {band === "low" && "Limited evidence. More assessment data is needed for a reliable rating."}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Delta Indicator ─────────────────────────────────────────────────────────

export function DeltaIndicator({ value, suffix = "pts" }: { value: number | null; suffix?: string }) {
  if (value === null || value === 0) return <span className="text-xs text-muted-foreground inline-flex items-center gap-0.5"><Minus className="w-3 h-3" /> No change</span>;
  const positive = value > 0;
  return (
    <span className={cn("text-xs font-medium inline-flex items-center gap-0.5", positive ? "text-emerald-600" : "text-red-600")}>
      {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {positive ? "+" : ""}{value} {suffix}
    </span>
  );
}

// ─── Section Card ────────────────────────────────────────────────────────────

export function DashboardCard({
  title,
  subtitle,
  action,
  children,
  className,
  noPadding,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div className={cn("bg-white rounded-xl border border-neutral-200 shadow-sm", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? "" : "px-6 py-5"}>{children}</div>
    </div>
  );
}

// ─── Info Tooltip ────────────────────────────────────────────────────────────

export function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help inline-block ml-1" />
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs max-w-[240px]">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Heatmap Cell ────────────────────────────────────────────────────────────

/** Semantic readiness colour scale — communicates capability level at a glance */
function scoreToReadinessBg(score: number): { bg: string; text: string; ring: string } {
  if (score >= 75) return { bg: "#ECFDF5", text: "#065F46", ring: "#10B981" }; // AI Ready
  if (score >= 60) return { bg: "#F0FDF4", text: "#166534", ring: "#4ADE80" }; // Strong Developing
  if (score >= 50) return { bg: "#FFFBEB", text: "#92400E", ring: "#F59E0B" }; // Developing
  if (score >= 40) return { bg: "#FFF7ED", text: "#9A3412", ring: "#F97316" }; // Weak Developing
  if (score >= 30) return { bg: "#FEF2F2", text: "#991B1B", ring: "#EF4444" }; // Not Yet Ready
  return { bg: "#FEF2F2", text: "#7F1D1D", ring: "#DC2626" }; // Foundation Gap
}

export function HeatmapCell({
  score,
  headcount,
  target,
  onClick,
  size = "md",
}: {
  score: number | null;
  headcount?: number;
  target?: number | null;
  onClick?: () => void;
  size?: "sm" | "md";
}) {
  if (score === null) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("rounded-lg flex flex-col items-center justify-center text-muted-foreground border border-dashed border-neutral-200", size === "sm" ? "w-14 h-10" : "w-16 h-12")}
            style={{ backgroundColor: "#F8FAFC" }}>
            <span className="text-[10px]">—</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          No assessments completed
        </TooltipContent>
      </Tooltip>
    );
  }
  const { bg, text, ring } = scoreToReadinessBg(score);
  const gap = target != null ? target - score : null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "rounded-lg flex flex-col items-center justify-center font-mono tabular-nums transition-all relative",
            size === "sm" ? "w-14 h-10" : "w-16 h-12",
            onClick && "cursor-pointer hover:scale-105 hover:shadow-md",
          )}
          style={{ backgroundColor: bg, color: text, borderLeft: `3px solid ${ring}` }}
          onClick={onClick}
        >
          <span className="text-xs font-bold">{score}</span>
          {headcount != null && headcount > 0 && (
            <span className="text-[8px] opacity-60 font-normal">n={headcount}</span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs space-y-1">
        <p className="font-semibold">Score: {score}/100</p>
        {headcount != null && <p>{headcount} assessed</p>}
        {gap != null && gap > 0 && <p className="text-red-600">{gap} pts below target</p>}
        {gap != null && gap <= 0 && <p className="text-green-600">At or above target</p>}
        <p className="text-muted-foreground">
          {score >= 75 ? "AI Ready" : score >= 60 ? "Strong Developing" : score >= 50 ? "Developing" : score >= 40 ? "Weak Developing" : score >= 30 ? "Not Yet Ready" : "Foundation Gap"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Domain Colour Dot ──────────────────────────────────────────────────────

const DOMAIN_COLOUR_MAP: Record<string, string> = {
  ai_interaction: "#3B82F6",
  ai_output_evaluation: "#8B5CF6",
  ai_workflow_design: "#10B981",
  workforce_ai_readiness: "#F59E0B",
  ai_ethics_trust: "#EF4444",
  ai_change_leadership: "#06B6D4",
};

export function DomainDot({ domain, size = 8 }: { domain: string; size?: number }) {
  return (
    <span
      className="rounded-full shrink-0 inline-block"
      style={{ width: size, height: size, backgroundColor: DOMAIN_COLOUR_MAP[domain] ?? "#94A3B8" }}
    />
  );
}

// ─── Capability Bar ──────────────────────────────────────────────────────────

export function CapabilityBar({
  score,
  target,
  colour,
  height = 8,
}: {
  score: number;
  target?: number | null;
  colour: string;
  height?: number;
}) {
  return (
    <div className="relative w-full" style={{ height }}>
      <div className="absolute inset-0 rounded-full" style={{ backgroundColor: "#E2E8F0" }} />
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(score, 100)}%`, backgroundColor: colour }}
      />
      {target != null && (
        <div
          className="absolute top-0 bottom-0 w-0.5"
          style={{ left: `${Math.min(target, 100)}%`, backgroundColor: "#1E293B" }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#1E293B" }} />
        </div>
      )}
    </div>
  );
}

// ─── Priority Badge ──────────────────────────────────────────────────────────

export function PriorityBadge({ priority }: { priority: "critical" | "high" | "medium" | "low" }) {
  const styles = {
    critical: { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
    high: { bg: "#FFF7ED", text: "#9A3412", border: "#FED7AA" },
    medium: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
    low: { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0" },
  };
  const s = styles[priority];
  return (
    <span
      className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
      style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {priority}
    </span>
  );
}

// ─── Skeleton Loaders ────────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
        <Info className="w-7 h-7 text-neutral-400" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Drill-down Chevron ──────────────────────────────────────────────────────

export function DrillChevron() {
  return <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />;
}
