/**
 * Stage 10 — Outputs
 *
 * Three-tab layout:
 *   Dashboard   — live KPI cards + charts (recomputed from Stage 7 model)
 *   Report      — in-app board/RemCo/leadership report with AI executive summary
 *   Deep Dives  — per-initiative detail cards
 *
 * Critical rules (spec §12):
 * 1. All financial figures come from the computed model — never invented.
 * 2. Charts show adjusted value (post-overlap-discount).
 * 3. Missing stages render as placeholders, not errors.
 * 4. Stage 7 narrative sections are reused as-written.
 * 5. Only the strategy-level executive summary is AI-generated here.
 */

import { useState, useCallback, useRef } from "react";
import html2canvas from "html2canvas";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  FileText,
  Info,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  Cell,
} from "recharts";
import type { AssembledReport, Audience } from "../../../../server/services/rewardOutputs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtM(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `£${Math.round(n / 1000)}k`;
  return `£${Math.round(n)}`;
}
function fmtPct(n: number | null): string {
  if (n === null) return "N/A";
  return `${(n * 100).toFixed(0)}%`;
}

const AUDIENCE_LABELS: Record<Audience, string> = {
  board: "Board",
  remco: "RemCo",
  leadership: "Leadership",
};

const VALUE_TYPE_COLORS: Record<string, string> = {
  efficiency: "#6366f1",
  decision_quality: "#0ea5e9",
  risk_mitigation: "#f59e0b",
  retention: "#10b981",
  strategic: "#8b5cf6",
};

const PHASE_COLORS: Record<string, string> = {
  Foundation: "#6366f1",
  Build: "#0ea5e9",
  Optimise: "#10b981",
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  trend,
  tooltip,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  tooltip?: string;
}) {
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="flex items-center gap-1">
            {trend === "up" && <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />}
            {trend === "down" && <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />}
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[220px] text-xs">{tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Placeholder card ─────────────────────────────────────────────────────────

function PlaceholderSection({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/50 bg-muted/20 p-6 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

// ─── Scenario type ────────────────────────────────────────────────────────────

type DashScenario = "conservative" | "central" | "optimistic";

const DASH_SCENARIOS: Array<{ key: DashScenario; label: string; description: string }> = [
  { key: "conservative", label: "Conservative", description: "Low-end cost and value estimates" },
  { key: "central",      label: "Central",      description: "Midpoint estimates — recommended baseline" },
  { key: "optimistic",   label: "Optimistic",   description: "High-end value, low-end cost" },
];

/** Build a simple payback timeline from a rollup (linear accrual approximation). */
function buildPaybackTimeline(
  tco3yr: number,
  netValue3yr: number
): Array<{ month: number; cumulativeCost: number; cumulativeValue: number }> {
  const monthlyTco = tco3yr / 36;
  const monthlyValue = netValue3yr / 36;
  return Array.from({ length: 37 }, (_, m) => ({
    month: m,
    cumulativeCost: monthlyTco * m,
    cumulativeValue: monthlyValue * m,
  }));
}

// ─── Dashboard tab ────────────────────────────────────────────────────────────

function DashboardTab({ report, chartContainerRef }: { report: AssembledReport; chartContainerRef?: React.RefObject<HTMLDivElement | null> }) {
  const [activeScenario, setActiveScenario] = useState<DashScenario>("central");
  const rollup = report.model.rollup[activeScenario];
  const charts = report.charts;

  const isNegative = rollup.netBenefit3yr < 0;
  const isConservative = activeScenario === "conservative";

  // Compute scenario-specific payback timeline (linear accrual approximation)
  const paybackTimeline = buildPaybackTimeline(rollup.tco3yr, rollup.netValue3yr);

  return (
    <div className="space-y-6">
      {/* ── Scenario toggle ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">Scenario:</span>
        {DASH_SCENARIOS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveScenario(s.key)}
            title={s.description}
            className={[
              "px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors",
              activeScenario === s.key
                ? s.key === "conservative"
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                  : s.key === "optimistic"
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                  : "bg-primary/15 border-primary/50 text-primary"
                : "bg-transparent border-border/40 text-muted-foreground hover:border-border hover:text-foreground",
            ].join(" ")}
          >
            {s.label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-1">
          {DASH_SCENARIOS.find(s => s.key === activeScenario)?.description}
        </span>
      </div>

      {/* Conservative net-negative warning */}
      {isNegative && isConservative && (
        <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/90">
            <span className="font-semibold">Conservative scenario is net-negative ({fmtM(rollup.netBenefit3yr)})</span>
            {" "}— the downside case does not recover investment within 3 years. Lead with the risk-mitigation and compliance rationale, or consider rebalancing the portfolio toward Foundation-phase initiatives with lower implementation cost.
          </p>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="3yr Net Benefit"
          value={fmtM(rollup.netBenefit3yr)}
          sub={`ROI ${fmtPct(rollup.roi3yr)}`}
          trend={rollup.netBenefit3yr >= 0 ? "up" : "down"}
          tooltip={`Post-overlap-discount net benefit over 3 years — ${activeScenario} scenario.`}
        />
        <KpiCard
          label="3yr Investment"
          value={fmtM(rollup.tco3yr)}
          sub={`${report.initiatives.length} initiatives`}
          tooltip="Total cost of ownership over 3 years, excluding programme funding (shown separately in Stage 7)."
        />
        <KpiCard
          label="Payback"
          value={rollup.paybackMonths !== null ? `${rollup.paybackMonths} months` : "Beyond 3yr"}
          sub={`${activeScenario.charAt(0).toUpperCase() + activeScenario.slice(1)} scenario`}
          tooltip="Months from programme start to cumulative value exceeding cumulative cost."
        />
        <KpiCard
          label="Adjusted Value"
          value={fmtM(rollup.netValue3yr)}
          sub={`Gross: ${fmtM(rollup.grossValue3yr)}`}
          trend={rollup.netValue3yr >= 0 ? "up" : "down"}
          tooltip="Post-overlap-discount adjusted value over 3 years."
        />
      </div>

      {/* Overlap discount callout */}
      {rollup.overlapDiscountTotal > 0 && (
        <div className="flex items-start gap-3 rounded-lg bg-amber-500/8 border border-amber-500/20 p-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/90">
            <span className="font-semibold">Overlap discount applied: {fmtM(rollup.overlapDiscountTotal)}</span>
            {" "}— initiatives in the same sub-domain share data and workflows, so a conservative discount is applied to avoid double-counting value. All portfolio figures above are post-discount.
          </p>
        </div>
      )}

      {/* Charts row */}
      <div ref={chartContainerRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cost vs Value by scenario */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Investment vs Adjusted Value — by Scenario</CardTitle>
            <p className="text-xs text-muted-foreground">All values post-overlap-discount. Conservative may be net-negative — this is the honest outcome.</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div role="img" aria-label="Grouped bar chart: Investment vs adjusted value by scenario">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.costVsValue} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="scenario" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tickFormatter={v => fmtM(v)} tick={{ fontSize: 10, fill: "#94a3b8" }} width={60} />
                <RechartsTooltip
                  formatter={(v: number, name: string) => [fmtM(v), name === "tco3yr" ? "Investment" : name === "netValue3yr" ? "Adjusted Value" : "Net Benefit"]}
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", fontSize: "11px" }}
                />
                <Bar dataKey="tco3yr" name="Investment" fill="#6366f1" radius={[3,3,0,0]} />
                <Bar dataKey="netValue3yr" name="Adjusted Value" fill="#10b981" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Value by category */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Value by Type — {activeScenario.charAt(0).toUpperCase() + activeScenario.slice(1)} Scenario</CardTitle>
            <p className="text-xs text-muted-foreground">Proportional distribution of adjusted value across the five value types.</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div role="img" aria-label="Horizontal bar chart: Adjusted value by type for the selected scenario">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.valueByCategory} layout="vertical" barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tickFormatter={v => fmtM(v)} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} width={110} />
                <RechartsTooltip
                  formatter={(v: number, _name: string, entry: { payload?: { pct?: number } }) => [
                    `${fmtM(v)} (${entry.payload?.pct ?? 0}%)`,
                    "Adjusted Value"
                  ]}
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", fontSize: "11px" }}
                />
                <Bar dataKey="value3yr" radius={[0,3,3,0]}>
                  {charts.valueByCategory.map((entry) => (
                    <Cell key={entry.category} fill={VALUE_TYPE_COLORS[entry.category] ?? "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payback timeline — scenario-aware */}
      <Card className={`border-border/50 ${isNegative && isConservative ? "bg-amber-500/5 border-amber-500/20" : "bg-card"}` }>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Cumulative Cost vs Value — {activeScenario.charAt(0).toUpperCase() + activeScenario.slice(1)} Scenario (36 months)
          </CardTitle>
          <p className="text-xs text-muted-foreground">Illustrative monthly accrual. Actual timing depends on initiative sequencing and adoption pace.</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div role="img" aria-label="Line chart: Cumulative cost vs cumulative value over 36 months">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={paybackTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} label={{ value: "Month", position: "insideBottom", offset: -2, fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tickFormatter={v => fmtM(v)} tick={{ fontSize: 10, fill: "#94a3b8" }} width={60} />
              <RechartsTooltip
                formatter={(v: number, name: string) => [fmtM(v), name === "cumulativeCost" ? "Cumulative Cost" : "Cumulative Value"]}
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", fontSize: "11px" }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
              <Line type="monotone" dataKey="cumulativeCost" name="Cumulative Cost" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cumulativeValue" name="Cumulative Value" stroke={isNegative && isConservative ? "#f59e0b" : "#10b981"} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio by phase */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Portfolio by Phase</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-3">
            {charts.portfolioByPhase.map(p => (
              <div key={p.phase} className="rounded-lg bg-muted/30 border border-border/40 p-3 text-center">
                <div
                  className="w-2 h-2 rounded-full mx-auto mb-1.5"
                  style={{ background: PHASE_COLORS[p.phase] ?? "#6366f1" }}
                />
                <p className="text-xs font-semibold text-foreground">{p.phase}</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: PHASE_COLORS[p.phase] ?? "#6366f1" }}>{p.count}</p>
                <p className="text-xs text-muted-foreground">{fmtM(p.tco3yr)} investment</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stage completeness */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Report Completeness</CardTitle>
          <p className="text-xs text-muted-foreground">Stages not yet completed will appear as placeholders in the report.</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {Object.entries(report.stageCompleteness).map(([key, done]) => {
              const num = parseInt(key.replace("stage", ""), 10);
              const labels: Record<number, string> = {
                1: "Pre-work", 2: "Vision", 3: "Strategy", 4: "Principles",
                5: "Portfolio", 6: "Measures", 7: "Biz Case", 8: "Capability", 9: "Review",
              };
              return (
                <div
                  key={key}
                  className={`rounded-md p-2 text-center text-xs font-medium border ${
                    done
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-muted/20 border-border/30 text-muted-foreground/50"
                  }`}
                >
                  <p className="font-bold">{num}</p>
                  <p className="truncate">{labels[num] ?? key}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Report section ───────────────────────────────────────────────────────────

function ReportSectionBlock({
  title,
  content,
  isPlaceholder,
  placeholderText,
}: {
  title: string;
  content: string | null;
  isPlaceholder: boolean;
  placeholderText?: string;
}) {
  if (isPlaceholder || !content) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground/70">{title}</h3>
        <PlaceholderSection text={placeholderText ?? "Section not yet available."} />
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{content}</div>
    </div>
  );
}

// ─── Report tab ───────────────────────────────────────────────────────────────

function ReportTab({
  report,
  audience,
  execSummaryText,
  isSummaryStale,
  isExportStale,
  lastExportAt,
  onGenerateSummary,
  onAffordance,
  onSaveSummary,
  onSetAudience,
  onKeepAsIs,
  onExport,
  isGenerating,
  isExporting,
}: {
  report: AssembledReport;
  audience: Audience;
  execSummaryText: string | null;
  isSummaryStale: boolean;
  isExportStale: boolean;
  lastExportAt: number | null;
  onGenerateSummary: () => void;
  onAffordance: (action: "expand" | "refine" | "challenge" | "suggest", text: string) => void;
  onSaveSummary: (text: string) => void;
  onSetAudience: (a: Audience) => void;
  onKeepAsIs: () => void;
  onExport: () => void;
  isGenerating: boolean;
  isExporting: boolean;
}) {
  const [editedSummary, setEditedSummary] = useState<string | null>(null);
  const [isAffordanceLoading, setIsAffordanceLoading] = useState(false);
  const summaryText = editedSummary ?? execSummaryText;
  const central = report.model.rollup.central;
  const conservative = report.model.rollup.conservative;

  return (
    <div className="space-y-6">
      {/* Audience selector + export */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium">Audience:</span>
          <Select value={audience} onValueChange={v => onSetAudience(v as Audience)}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="board">Board</SelectItem>
              <SelectItem value="remco">RemCo</SelectItem>
              <SelectItem value="leadership">Leadership</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">{AUDIENCE_LABELS[audience]}</Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onExport}
          disabled={isExporting}
          className="gap-2 text-xs"
        >
          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Export PDF
        </Button>
      </div>

      {/* Export-outdated banner */}
      {isExportStale && lastExportAt && (
        <div className="flex items-start gap-3 rounded-lg bg-orange-500/8 border border-orange-500/20 p-3">
          <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-orange-300/90 font-medium">
              Strategy has changed since last export ({new Date(lastExportAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}).
            </p>
            <p className="text-xs text-orange-300/70 mt-0.5">Re-export to share the current version with your audience.</p>
          </div>
        </div>
      )}

      {/* Stale banner */}
      {isSummaryStale && (
        <div className="flex items-start gap-3 rounded-lg bg-amber-500/8 border border-amber-500/20 p-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-300/90 font-medium">Upstream stages have changed since this summary was generated.</p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5" onClick={onGenerateSummary} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Regenerate
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={onKeepAsIs}>Keep as-is</Button>
            </div>
          </div>
        </div>
      )}

      {/* Financial headline */}
      <div className="rounded-lg bg-muted/20 border border-border/40 p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Financial Headline</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-foreground">{fmtM(central.tco3yr)}</p>
            <p className="text-xs text-muted-foreground">3yr Investment</p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-400">{fmtM(central.netValue3yr)}</p>
            <p className="text-xs text-muted-foreground">Adjusted Value</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${central.netBenefit3yr >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmtM(central.netBenefit3yr)}
            </p>
            <p className="text-xs text-muted-foreground">Net Benefit</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{fmtPct(central.roi3yr)}</p>
            <p className="text-xs text-muted-foreground">ROI (central)</p>
          </div>
        </div>
        {conservative.netBenefit3yr < 0 && (
          <p className="text-xs text-amber-300/80 mt-2 border-t border-border/30 pt-2">
            <span className="font-semibold">Conservative scenario: {fmtM(conservative.netBenefit3yr)}</span>
            {" "}— the downside case is net-negative. Lead with the risk-mitigation and compliance rationale, or consider rebalancing the portfolio toward Foundation-phase initiatives with lower implementation cost.
          </p>
        )}
      </div>

      {/* Executive summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Executive Summary</h3>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-7"
            onClick={onGenerateSummary}
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {summaryText ? "Regenerate" : "Generate"}
          </Button>
        </div>

        {summaryText ? (
          <div className="space-y-3">
            <Textarea
              value={summaryText}
              onChange={e => {
                setEditedSummary(e.target.value);
                onSaveSummary(e.target.value);
              }}
              className="min-h-[180px] text-sm leading-relaxed resize-y bg-muted/20 border-border/50"
              placeholder="Executive summary will appear here..."
            />
            {/* Affordances */}
            <div className="flex flex-wrap gap-2">
              {(["expand", "refine", "challenge", "suggest"] as const).map(action => (
                <Button
                  key={action}
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 capitalize"
                  disabled={isAffordanceLoading}
                  onClick={async () => {
                    setIsAffordanceLoading(true);
                    onAffordance(action, summaryText);
                    setIsAffordanceLoading(false);
                  }}
                >
                  {isAffordanceLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  {action}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <PlaceholderSection text="Generate the AI executive summary above, or write your own in the text area that will appear." />
        )}
      </div>

      <Separator className="border-border/40" />

      {/* Report sections */}
      <div className="space-y-6">
        {report.sections.map(section => (
          <ReportSectionBlock
            key={section.key}
            title={section.title}
            content={section.content}
            isPlaceholder={section.isPlaceholder}
            placeholderText={section.placeholderText}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Deep dive card ───────────────────────────────────────────────────────────

function DeepDiveCard({ initiative }: { initiative: AssembledReport["initiatives"][0] }) {
  const [open, setOpen] = useState(false);

  const phaseColor = PHASE_COLORS[initiative.phase] ?? "#6366f1";
  const valueColor = VALUE_TYPE_COLORS[initiative.primaryValueType] ?? "#6366f1";

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <button
          type="button"
          className="w-full text-left cursor-pointer"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label={`${initiative.title} — ${open ? "collapse" : "expand"} details`}
        >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge
                variant="outline"
                className="text-xs font-medium"
                style={{ borderColor: phaseColor + "40", color: phaseColor }}
              >
                {initiative.phase}
              </Badge>
              <Badge
                variant="outline"
                className="text-xs"
                style={{ borderColor: valueColor + "40", color: valueColor }}
              >
                {initiative.primaryValueType.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {initiative.subDomain}
              </Badge>
            </div>
            <h3 className="text-sm font-semibold text-foreground leading-tight">{initiative.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{initiative.shortDescription}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-foreground">{fmtM(initiative.netBenefit3yrCentral)}</p>
            <p className="text-xs text-muted-foreground">net 3yr</p>
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground mt-1 ml-auto" /> : <ChevronDown className="w-4 h-4 text-muted-foreground mt-1 ml-auto" />}
          </div>
        </div>
        </button>
      </CardHeader>

      {open && (
        <CardContent className="pt-0 border-t border-border/30">
          <div className="space-y-4 pt-3">
            {/* Financials */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md bg-muted/20 p-2">
                <p className="text-sm font-bold text-foreground">{fmtM(initiative.tco3yrCentral)}</p>
                <p className="text-xs text-muted-foreground">3yr TCO</p>
              </div>
              <div className="rounded-md bg-muted/20 p-2">
                <p className="text-sm font-bold text-emerald-400">{fmtM(initiative.value3yrCentral)}</p>
                <p className="text-xs text-muted-foreground">3yr Value</p>
              </div>
              <div className="rounded-md bg-muted/20 p-2">
                <p className={`text-sm font-bold ${initiative.netBenefit3yrCentral >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtM(initiative.netBenefit3yrCentral)}
                </p>
                <p className="text-xs text-muted-foreground">Net Benefit</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">About</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{initiative.fullDescription}</p>
            </div>

            {/* Complexity */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Complexity: <span className="text-foreground font-medium">{initiative.complexity}</span></span>
              <span>Phase: <span className="font-medium" style={{ color: phaseColor }}>{initiative.phase}</span></span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Deep dives tab ───────────────────────────────────────────────────────────

function DeepDivesTab({ report }: { report: AssembledReport }) {
  const [filter, setFilter] = useState<string>("all");

  const phases = ["all", "Foundation", "Build", "Optimise"];
  const filtered = filter === "all"
    ? report.initiatives
    : report.initiatives.filter(i => i.phase === filter);

  return (
    <div className="space-y-4">
      {/* Phase filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {phases.map(p => (
          <Button
            key={p}
            size="sm"
            variant={filter === p ? "default" : "outline"}
            className="text-xs h-7"
            onClick={() => setFilter(p)}
          >
            {p === "all" ? `All (${report.initiatives.length})` : `${p} (${report.initiatives.filter(i => i.phase === p).length})`}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <PlaceholderSection text="No initiatives in this phase." />
      ) : (
        <div className="space-y-3">
          {filtered.map(i => <DeepDiveCard key={i.id} initiative={i} />)}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RewardOutputsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.rewardOutputs.get.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const generateSummaryMutation = trpc.rewardOutputs.generateSummary.useMutation({
    onSuccess: () => utils.rewardOutputs.get.invalidate(),
  });

  const affordanceMutation = trpc.rewardOutputs.affordance.useMutation({
    onSuccess: (result) => {
      setSummaryOverride(result.text);
      saveSummaryMutation.mutate({ text: result.text });
    },
  });

  const saveSummaryMutation = trpc.rewardOutputs.saveSummary.useMutation();

  const setAudienceMutation = trpc.rewardOutputs.setAudience.useMutation({
    onSuccess: () => utils.rewardOutputs.get.invalidate(),
  });

  const keepAsIsMutation = trpc.rewardOutputs.keepSummaryAsIs.useMutation({
    onSuccess: () => utils.rewardOutputs.get.invalidate(),
  });

  const recordExportMutation = trpc.rewardOutputs.recordExport.useMutation();

  const [summaryOverride, setSummaryOverride] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  // Debounced save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSaveSummary = useCallback((text: string) => {
    setSummaryOverride(text);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveSummaryMutation.mutate({ text });
    }, 1200);
  }, [saveSummaryMutation]);

  const handleAffordance = useCallback((action: "expand" | "refine" | "challenge" | "suggest", text: string) => {
    affordanceMutation.mutate({ action, currentText: text });
  }, [affordanceMutation]);

  const handleExport = useCallback(async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      const audience = data.audience;
      const report = data.report;
      const central = report.model.rollup.central;
      const summaryText = summaryOverride ?? data.execSummaryText ?? "";

      // Capture chart container as a base64 PNG via html2canvas
      let chartDataUrl: string | null = null;
      if (chartContainerRef.current) {
        try {
          const canvas = await html2canvas(chartContainerRef.current, {
            backgroundColor: "#0f172a",
            scale: 1.5,
            logging: false,
          });
          chartDataUrl = canvas.toDataURL("image/png");
        } catch {
          // Non-fatal: export without charts if capture fails
        }
      }

      const html = buildPrintHtml(report, audience, summaryText, central, chartDataUrl);
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 800);
      }
      // Record the export with the real state hash (not Date.now)
      recordExportMutation.mutate({
        audience,
        stateHash: data.currentHash ?? String(Date.now()),
      });
    } finally {
      setIsExporting(false);
    }
  }, [data, summaryOverride, recordExportMutation, chartContainerRef]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-sm text-muted-foreground">Unable to load outputs. Complete Stage 5 to unlock this stage.</p>
        </div>
      </div>
    );
  }

  const { report, audience, execSummaryText, isSummaryStale, isExportStale, lastExportAt, currentHash: _currentHash, strategyLocked } = data;
  const effectiveSummary = summaryOverride ?? execSummaryText;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Reward AI Strategy — Outputs</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {report.companyName} · {report.initiatives.length} initiative{report.initiatives.length !== 1 ? "s" : ""} · Assembled {new Date(report.assembledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>

      {/* Strategy unlocked banner */}
      {!strategyLocked && (
        <div className="flex items-start gap-3 rounded-lg bg-amber-500/8 border border-amber-500/20 p-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-300/90 font-medium">Strategy not yet locked</p>
            <p className="text-xs text-amber-300/70 mt-0.5">
              Complete Stage 9 (Review &amp; Lock) to lock the strategy before generating your final output. You can still generate outputs, but they may change if you return to earlier stages.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-sm">
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-1.5 text-xs">
            <BookOpen className="w-3.5 h-3.5" />
            Report
          </TabsTrigger>
          <TabsTrigger value="deepdives" className="gap-1.5 text-xs">
            <Layers className="w-3.5 h-3.5" />
            Deep Dives
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <DashboardTab report={report} chartContainerRef={chartContainerRef} />
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          <ReportTab
            report={report}
            audience={audience}
            execSummaryText={effectiveSummary}
            isSummaryStale={isSummaryStale}
            isExportStale={isExportStale}
            lastExportAt={lastExportAt ?? null}
            onGenerateSummary={() => generateSummaryMutation.mutate()}
            onAffordance={handleAffordance}
            onSaveSummary={handleSaveSummary}
            onSetAudience={a => setAudienceMutation.mutate({ audience: a })}
            onKeepAsIs={() => keepAsIsMutation.mutate()}
            onExport={handleExport}
            isGenerating={generateSummaryMutation.isPending}
            isExporting={isExporting}
          />
        </TabsContent>

        <TabsContent value="deepdives" className="mt-6">
          {report.initiatives.length === 0 ? (
            <PlaceholderSection text="Complete Stage 5 (portfolio) to see per-initiative deep dives." />
          ) : (
            <DeepDivesTab report={report} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Print HTML builder ───────────────────────────────────────────────────────

function buildPrintHtml(
  report: AssembledReport,
  audience: Audience,
  summaryText: string,
  central: AssembledReport["model"]["rollup"]["central"],
  chartDataUrl?: string | null
): string {
  const audienceLabel = { board: "Board", remco: "RemCo", leadership: "Leadership" }[audience];
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const sections = report.sections
    .filter(s => !s.isPlaceholder && s.content)
    .map(s => `<section style="margin-bottom:2rem;page-break-inside:avoid;">
      <h2 style="font-size:14px;font-weight:700;margin-bottom:0.5rem;border-bottom:1px solid #e2e8f0;padding-bottom:0.25rem;">${s.title}</h2>
      <p style="font-size:12px;line-height:1.7;color:#374151;white-space:pre-wrap;">${s.content}</p>
    </section>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${report.companyName} — Reward AI Strategy</title>
<style>
  @page { size: A4; margin: 2cm 2.5cm; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; margin: 0; padding: 0; font-size: 12px; line-height: 1.6; }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 0.25rem; page-break-after: avoid; }
  h2 { page-break-after: avoid; }
  .meta { font-size: 11px; color: #6b7280; margin-bottom: 2rem; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; page-break-inside: avoid; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.75rem; text-align: center; }
  .kpi-value { font-size: 18px; font-weight: 700; }
  .kpi-label { font-size: 10px; color: #6b7280; margin-top: 0.25rem; }
  .exec-summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 1rem; margin-bottom: 2rem; page-break-inside: avoid; }
  .exec-summary h2 { font-size: 13px; font-weight: 700; margin-bottom: 0.5rem; }
  section { page-break-inside: avoid; margin-bottom: 1.5rem; }
  img { max-width: 100%; height: auto; }
  .footer { font-size: 10px; color: #9ca3af; margin-top: 3rem; border-top: 1px solid #e2e8f0; padding-top: 0.5rem; page-break-inside: avoid; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .kpi-grid { break-inside: avoid; }
    section { break-inside: avoid; }
  }
</style>
</head>
<body>
<h1>${report.companyName} — Reward AI Strategy</h1>
<p class="meta">Prepared for: ${audienceLabel} · ${date} · ${report.initiatives.length} initiatives · Confidential</p>

<div class="kpi-grid">
  <div class="kpi"><div class="kpi-value">£${(central.tco3yr / 1e6).toFixed(1)}M</div><div class="kpi-label">3yr Investment</div></div>
  <div class="kpi"><div class="kpi-value">£${(central.netValue3yr / 1e6).toFixed(1)}M</div><div class="kpi-label">Adjusted Value</div></div>
  <div class="kpi"><div class="kpi-value">£${(central.netBenefit3yr / 1e6).toFixed(1)}M</div><div class="kpi-label">Net Benefit</div></div>
  <div class="kpi"><div class="kpi-value">${central.roi3yr !== null ? Math.round(central.roi3yr * 100) + "%" : "N/A"}</div><div class="kpi-label">ROI (central)</div></div>
</div>

${summaryText ? `<div class="exec-summary"><h2>Executive Summary</h2><p style="font-size:12px;line-height:1.7;white-space:pre-wrap;">${summaryText}</p></div>` : ""}

${chartDataUrl ? `<div style="margin-bottom:2rem;page-break-inside:avoid;"><h2 style="font-size:14px;font-weight:700;margin-bottom:0.5rem;border-bottom:1px solid #e2e8f0;padding-bottom:0.25rem;">Portfolio Charts</h2><img src="${chartDataUrl}" style="width:100%;border-radius:6px;border:1px solid #e2e8f0;" alt="Portfolio charts" /></div>` : ""}

${sections}

<p class="footer">
  Financial figures computed from the Stage 7 model. Overlap discount of £${(central.overlapDiscountTotal / 1e6).toFixed(1)}M applied. All values are estimates based on calibrated benchmarks.
</p>
</body>
</html>`;
}
