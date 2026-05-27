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


// ─── Print HTML builder (board-grade) ────────────────────────────────────────
//
// Brand tokens (from shared/brand.ts):
//   Navy  #0A1628   Teal  #2D6A5E   Gold  #C8A96E
//   Slate #334155   Mist  #94a3b8   White #ffffff
//
// Six required sections (brief §):
//   1. Executive summary + recommendation  (cover page)
//   2. Three-scenario financial case
//   3. Initiative portfolio + sequencing
//   4. Capability gap + development pathway
//   5. Strategic narrative
//   6. Methodology / assumptions footnote

function buildPrintHtml(
  report: AssembledReport,
  audience: Audience,
  summaryText: string,
  central: AssembledReport["model"]["rollup"]["central"],
  chartDataUrl?: string | null
): string {
  const audienceLabel: Record<Audience, string> = { board: "Board", remco: "RemCo", leadership: "Leadership" };
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function fmtGBP(n: number): string {
    const abs = Math.abs(n);
    const sign = n < 0 ? "−" : "";
    if (abs >= 1_000_000) return `${sign}£${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000)     return `${sign}£${Math.round(abs / 1_000).toLocaleString()}k`;
    return `${sign}£${Math.round(abs).toLocaleString()}`;
  }
  function fmtROI(r: number | null): string {
    if (r === null) return "N/A";
    return `${r >= 0 ? "" : "−"}${Math.abs(Math.round(r * 100))}%`;
  }
  function fmtPayback(m: number | null): string {
    if (m === null) return "No payback within 3 years";
    return `${m} months`;
  }
  function badge(text: string, bg: string, fg: string): string {
    return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;background:${bg};color:${fg};">${text}</span>`;
  }
  function kpiCard(label: string, value: string, sub: string, accent: string, negative = false): string {
    return `<div style="flex:1;min-width:0;background:#ffffff;border:1px solid #e2e8f0;border-top:3px solid ${accent};border-radius:6px;padding:14px 16px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:6px;">${label}</div>
      <div style="font-size:20px;font-weight:800;color:${negative ? "#dc2626" : "#0A1628"};line-height:1.1;">${value}</div>
      <div style="font-size:9px;color:#94a3b8;margin-top:4px;">${sub}</div>
    </div>`;
  }
  function sectionHeader(num: string, title: string): string {
    return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #0A1628;">
      <div style="background:#0A1628;color:#C8A96E;font-size:10px;font-weight:800;padding:4px 10px;border-radius:4px;letter-spacing:0.1em;">${num}</div>
      <h2 style="font-size:14px;font-weight:800;color:#0A1628;margin:0;letter-spacing:0.01em;">${title}</h2>
    </div>`;
  }
  function pageFooter(page: number): string {
    return `<div style="position:fixed;bottom:0;left:0;right:0;height:24px;background:#0A1628;display:flex;align-items:center;justify-content:space-between;padding:0 40px;">
      <span style="font-size:8px;color:#C8A96E;font-weight:600;">CONFIDENTIAL · ${report.companyName} · ${audienceLabel[audience]} · ${date}</span>
      <span style="font-size:8px;color:#94a3b8;">${page}</span>
    </div>`;
  }

  const conservative = report.model.rollup.conservative;
  const optimistic   = report.model.rollup.optimistic;

  // ── COVER PAGE ───────────────────────────────────────────────────────────────
  const coverPage = `
<div class="page cover-page">
  <div style="height:6px;background:#2D6A5E;"></div>
  <div style="padding:48px 48px 0;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:56px;">
      <div style="background:#2D6A5E;color:#ffffff;font-size:13px;font-weight:800;padding:7px 13px;border-radius:6px;letter-spacing:0.06em;">AiQ</div>
      <div style="color:#94a3b8;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;">HR Capability Intelligence</div>
    </div>
    <div style="color:#C8A96E;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;margin-bottom:10px;">${audienceLabel[audience]} Strategy Pack</div>
    <div style="font-size:36px;font-weight:800;color:#ffffff;line-height:1.05;margin-bottom:8px;">Reward AI<br>People Strategy</div>
    <div style="height:3px;width:56px;background:#C8A96E;margin:22px 0;"></div>
    <div style="font-size:15px;font-weight:700;color:#e2e8f0;margin-bottom:4px;">${report.companyName}</div>
    <div style="font-size:10px;color:#94a3b8;">${report.initiatives.length} initiatives · ${date}</div>

    ${summaryText ? `
    <div style="background:#0d2137;border-left:3px solid #C8A96E;border-radius:0 6px 6px 0;padding:18px 22px;margin-top:32px;">
      <div style="font-size:8px;color:#C8A96E;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px;">Executive Summary</div>
      <div style="font-size:10px;color:#e2e8f0;line-height:1.7;">${summaryText.replace(/\n/g, "<br>")}</div>
    </div>` : ""}

    <div style="display:flex;gap:12px;margin-top:28px;">
      ${kpiCard("3yr Investment", fmtGBP(central.tco3yr), "Total cost of ownership", "#C8A96E")}
      ${kpiCard("Net Value (central)", fmtGBP(central.netValue3yr), "Post overlap-discount", "#2D6A5E")}
      ${kpiCard("Net Benefit", fmtGBP(central.netBenefit3yr), "Value minus investment", central.netBenefit3yr >= 0 ? "#2D6A5E" : "#dc2626", central.netBenefit3yr < 0)}
      ${kpiCard("ROI (central)", fmtROI(central.roi3yr), `Payback: ${fmtPayback(central.paybackMonths)}`, "#0A1628")}
    </div>
  </div>
  ${pageFooter(1)}
</div>`;

  // ── SECTION 2: THREE-SCENARIO FINANCIAL CASE ─────────────────────────────────
  const conservativeNegative = conservative.netBenefit3yr < 0;
  const financialPage = `
<div class="page">
  ${sectionHeader("02", "Three-Scenario Financial Case")}
  <p style="font-size:10px;color:#475569;margin-bottom:16px;">All figures are 3-year totals. The central scenario is the recommended planning baseline. The conservative case is presented honestly — including the downside — to give the board a complete picture.</p>

  <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:20px;">
    <thead>
      <tr style="background:#0A1628;">
        <th style="padding:10px 12px;text-align:left;color:#C8A96E;font-size:8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Metric</th>
        <th style="padding:10px 12px;text-align:right;color:#94a3b8;font-size:8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Conservative</th>
        <th style="padding:10px 12px;text-align:right;color:#ffffff;font-size:8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;border-left:2px solid #2D6A5E;border-right:2px solid #2D6A5E;">Central ★</th>
        <th style="padding:10px 12px;text-align:right;color:#94a3b8;font-size:8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Optimistic</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background:#f8fafc;">
        <td style="padding:9px 12px;color:#334155;font-weight:600;">Gross Value (3yr)</td>
        <td style="padding:9px 12px;text-align:right;color:#334155;">${fmtGBP(conservative.grossValue3yr)}</td>
        <td style="padding:9px 12px;text-align:right;color:#0A1628;font-weight:700;border-left:2px solid #2D6A5E;border-right:2px solid #2D6A5E;">${fmtGBP(central.grossValue3yr)}</td>
        <td style="padding:9px 12px;text-align:right;color:#334155;">${fmtGBP(optimistic.grossValue3yr)}</td>
      </tr>
      <tr>
        <td style="padding:9px 12px;color:#334155;font-weight:600;">Overlap Discount</td>
        <td style="padding:9px 12px;text-align:right;color:#64748b;">(${fmtGBP(conservative.overlapDiscountTotal)})</td>
        <td style="padding:9px 12px;text-align:right;color:#64748b;border-left:2px solid #2D6A5E;border-right:2px solid #2D6A5E;">(${fmtGBP(central.overlapDiscountTotal)})</td>
        <td style="padding:9px 12px;text-align:right;color:#64748b;">(${fmtGBP(optimistic.overlapDiscountTotal)})</td>
      </tr>
      <tr style="background:#f8fafc;">
        <td style="padding:9px 12px;color:#334155;font-weight:600;">Adjusted Net Value</td>
        <td style="padding:9px 12px;text-align:right;color:#334155;">${fmtGBP(conservative.netValue3yr)}</td>
        <td style="padding:9px 12px;text-align:right;color:#0A1628;font-weight:700;border-left:2px solid #2D6A5E;border-right:2px solid #2D6A5E;">${fmtGBP(central.netValue3yr)}</td>
        <td style="padding:9px 12px;text-align:right;color:#334155;">${fmtGBP(optimistic.netValue3yr)}</td>
      </tr>
      <tr>
        <td style="padding:9px 12px;color:#334155;font-weight:600;">Total Investment (TCO)</td>
        <td style="padding:9px 12px;text-align:right;color:#334155;">${fmtGBP(conservative.tco3yr)}</td>
        <td style="padding:9px 12px;text-align:right;color:#0A1628;font-weight:700;border-left:2px solid #2D6A5E;border-right:2px solid #2D6A5E;">${fmtGBP(central.tco3yr)}</td>
        <td style="padding:9px 12px;text-align:right;color:#334155;">${fmtGBP(optimistic.tco3yr)}</td>
      </tr>
      <tr style="background:${conservativeNegative ? "#fef2f2" : "#f0fdf4"};">
        <td style="padding:10px 12px;color:#0A1628;font-weight:800;">Net Benefit</td>
        <td style="padding:10px 12px;text-align:right;font-weight:700;color:${conservative.netBenefit3yr < 0 ? "#dc2626" : "#16a34a"};">${fmtGBP(conservative.netBenefit3yr)}</td>
        <td style="padding:10px 12px;text-align:right;font-weight:800;color:#16a34a;border-left:2px solid #2D6A5E;border-right:2px solid #2D6A5E;">${fmtGBP(central.netBenefit3yr)}</td>
        <td style="padding:10px 12px;text-align:right;font-weight:700;color:#16a34a;">${fmtGBP(optimistic.netBenefit3yr)}</td>
      </tr>
      <tr>
        <td style="padding:9px 12px;color:#334155;font-weight:600;">ROI</td>
        <td style="padding:9px 12px;text-align:right;color:${conservative.roi3yr !== null && conservative.roi3yr < 0 ? "#dc2626" : "#334155"};font-weight:700;">${fmtROI(conservative.roi3yr)}</td>
        <td style="padding:9px 12px;text-align:right;color:#0A1628;font-weight:800;border-left:2px solid #2D6A5E;border-right:2px solid #2D6A5E;">${fmtROI(central.roi3yr)}</td>
        <td style="padding:9px 12px;text-align:right;color:#334155;font-weight:700;">${fmtROI(optimistic.roi3yr)}</td>
      </tr>
      <tr style="background:#f8fafc;">
        <td style="padding:9px 12px;color:#334155;font-weight:600;">Payback Period</td>
        <td style="padding:9px 12px;text-align:right;color:#334155;">${fmtPayback(conservative.paybackMonths)}</td>
        <td style="padding:9px 12px;text-align:right;color:#0A1628;font-weight:700;border-left:2px solid #2D6A5E;border-right:2px solid #2D6A5E;">${fmtPayback(central.paybackMonths)}</td>
        <td style="padding:9px 12px;text-align:right;color:#334155;">${fmtPayback(optimistic.paybackMonths)}</td>
      </tr>
    </tbody>
  </table>

  ${conservativeNegative ? `
  <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:0 6px 6px 0;padding:12px 16px;margin-bottom:16px;">
    <div style="font-size:9px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Conservative Downside — Board Note</div>
    <div style="font-size:10px;color:#7f1d1d;line-height:1.6;">The conservative scenario produces a negative net benefit of ${fmtGBP(conservative.netBenefit3yr)} (${fmtROI(conservative.roi3yr)} ROI). This reflects low-end value realisation combined with high-end costs. The board should note this is the pessimistic bound; the central case (${fmtROI(central.roi3yr)} ROI, ${fmtPayback(central.paybackMonths)} payback) is the recommended planning baseline. Mitigation: phased delivery with stage-gate reviews reduces exposure.</div>
  </div>` : ""}

  ${chartDataUrl ? `
  <div style="margin-top:16px;page-break-inside:avoid;">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:8px;">Portfolio Charts</div>
    <img src="${chartDataUrl}" style="width:100%;border-radius:6px;border:1px solid #e2e8f0;" alt="Portfolio charts" />
  </div>` : ""}

  ${pageFooter(2)}
</div>`;

  // ── SECTION 3: INITIATIVE PORTFOLIO ──────────────────────────────────────────
  const phaseOrder = ["Foundation", "Build", "Optimise"];
  const byPhase: Record<string, typeof report.initiatives> = {};
  for (const init of report.initiatives) {
    const ph = init.phase || "Foundation";
    if (!byPhase[ph]) byPhase[ph] = [];
    byPhase[ph].push(init);
  }
  const phaseColours: Record<string, string> = {
    Foundation: "#2D6A5E",
    Build: "#C8A96E",
    Optimise: "#0A1628",
  };

  const portfolioPage = `
<div class="page">
  ${sectionHeader("03", "Initiative Portfolio & Sequencing")}
  <p style="font-size:10px;color:#475569;margin-bottom:16px;">${report.initiatives.length} initiatives selected, sequenced across delivery phases. Financial figures are central-scenario 3-year totals.</p>

  <table style="width:100%;border-collapse:collapse;font-size:9px;margin-bottom:16px;">
    <thead>
      <tr style="background:#0A1628;">
        <th style="padding:8px 10px;text-align:left;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Initiative</th>
        <th style="padding:8px 10px;text-align:left;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Phase</th>
        <th style="padding:8px 10px;text-align:left;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Value Type</th>
        <th style="padding:8px 10px;text-align:right;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">3yr Investment</th>
        <th style="padding:8px 10px;text-align:right;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">3yr Value</th>
        <th style="padding:8px 10px;text-align:right;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Net Benefit</th>
      </tr>
    </thead>
    <tbody>
      ${phaseOrder.flatMap((ph, pi) => {
        const inits = byPhase[ph] || [];
        if (inits.length === 0) return [];
        return [
          `<tr><td colspan="6" style="padding:8px 10px;background:#f1f5f9;font-size:8px;font-weight:700;color:${phaseColours[ph] || "#0A1628"};text-transform:uppercase;letter-spacing:0.08em;border-left:3px solid ${phaseColours[ph] || "#0A1628"};">${ph} Phase</td></tr>`,
          ...inits.map((init, i) => `
          <tr style="background:${(pi * inits.length + i) % 2 === 0 ? "#ffffff" : "#f8fafc"};">
            <td style="padding:8px 10px;color:#0A1628;font-weight:600;">${init.title}</td>
            <td style="padding:8px 10px;">${badge(init.phase || "—", phaseColours[init.phase || "Foundation"] || "#64748b", "#ffffff")}</td>
            <td style="padding:8px 10px;color:#475569;">${(init.primaryValueType || "").replace(/_/g, " ")}</td>
            <td style="padding:8px 10px;text-align:right;color:#334155;">${fmtGBP(init.tco3yrCentral)}</td>
            <td style="padding:8px 10px;text-align:right;color:#334155;">${fmtGBP(init.value3yrCentral)}</td>
            <td style="padding:8px 10px;text-align:right;font-weight:700;color:${init.netBenefit3yrCentral >= 0 ? "#16a34a" : "#dc2626"};">${fmtGBP(init.netBenefit3yrCentral)}</td>
          </tr>`),
        ];
      }).join("")}
      <tr style="background:#0A1628;">
        <td colspan="3" style="padding:9px 10px;color:#C8A96E;font-weight:800;font-size:9px;">Portfolio Total (central)</td>
        <td style="padding:9px 10px;text-align:right;color:#ffffff;font-weight:700;">${fmtGBP(central.tco3yr)}</td>
        <td style="padding:9px 10px;text-align:right;color:#ffffff;font-weight:700;">${fmtGBP(central.netValue3yr)}</td>
        <td style="padding:9px 10px;text-align:right;color:${central.netBenefit3yr >= 0 ? "#86efac" : "#fca5a5"};font-weight:800;">${fmtGBP(central.netBenefit3yr)}</td>
      </tr>
    </tbody>
  </table>

  ${report.model.overlapDiscounts.length > 0 ? `
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 14px;margin-top:8px;">
    <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Overlap Discounts Applied</div>
    ${report.model.overlapDiscounts.map(d => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #f1f5f9;font-size:9px;">
      <span style="color:#334155;font-weight:600;">${d.subDomain.replace(/_/g, " ")} (${Math.round(d.discountPct * 100)}% co-delivery discount)</span>
      <span style="color:#64748b;">${d.initiativeTitles.slice(0, 3).join(", ")}${d.initiativeTitles.length > 3 ? ` +${d.initiativeTitles.length - 3} more` : ""} → <strong style="color:#0A1628;">(${fmtGBP(d.discountAmountCentral)})</strong></span>
    </div>`).join("")}
  </div>` : ""}

  ${pageFooter(3)}
</div>`;

  // ── SECTION 4: CAPABILITY GAP + DEVELOPMENT PATHWAY ──────────────────────────
  const hasDevPlans = report.developmentPlans && report.developmentPlans.length > 0;
  const capabilityPage = `
<div class="page">
  ${sectionHeader("04", "Capability Gap & Development Pathway")}
  <p style="font-size:10px;color:#475569;margin-bottom:16px;">Derived from Stage 8 assessment data. Development plans are generated for people-dimensions with a confirmed gap between current and required capability levels.</p>

  ${!report.stageCompleteness.stage8 ? `
  <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:14px 16px;margin-bottom:16px;">
    <div style="font-size:9px;font-weight:700;color:#92400e;margin-bottom:4px;">Stage 8 not yet confirmed</div>
    <div style="font-size:10px;color:#78350f;">Capability assessment data is not yet available. Complete Stage 8 to populate this section.</div>
  </div>` : hasDevPlans ? `
  <table style="width:100%;border-collapse:collapse;font-size:9px;margin-bottom:16px;">
    <thead>
      <tr style="background:#0A1628;">
        <th style="padding:8px 10px;text-align:left;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Dimension</th>
        <th style="padding:8px 10px;text-align:left;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Current Level</th>
        <th style="padding:8px 10px;text-align:left;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Required Level</th>
        <th style="padding:8px 10px;text-align:left;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Gap</th>
        <th style="padding:8px 10px;text-align:right;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Est. Months</th>
        <th style="padding:8px 10px;text-align:right;color:#C8A96E;font-size:7.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">People</th>
      </tr>
    </thead>
    <tbody>
      ${report.developmentPlans.map((plan, i) => `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"};">
        <td style="padding:8px 10px;color:#0A1628;font-weight:600;">${plan.dimensionLabel}</td>
        <td style="padding:8px 10px;">${badge(plan.currentLevel.replace(/_/g, " "), "#e2e8f0", "#334155")}</td>
        <td style="padding:8px 10px;">${badge(plan.requiredLevel.replace(/_/g, " "), "#dbeafe", "#1e40af")}</td>
        <td style="padding:8px 10px;">${badge(plan.gapStatus === "significant_gap" ? "Significant" : "Minor", plan.gapStatus === "significant_gap" ? "#fee2e2" : "#fef3c7", plan.gapStatus === "significant_gap" ? "#991b1b" : "#92400e")}</td>
        <td style="padding:8px 10px;text-align:right;color:#334155;">${plan.estimatedMonths}</td>
        <td style="padding:8px 10px;text-align:right;color:#334155;">${plan.peopleCount}</td>
      </tr>
      <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#ffffff"};">
        <td colspan="6" style="padding:4px 10px 10px 10px;color:#475569;font-size:9px;font-style:italic;">${plan.pathwaySummary}</td>
      </tr>`).join("")}
    </tbody>
  </table>` : `
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:14px 16px;margin-bottom:16px;">
    <div style="font-size:10px;color:#166534;">No capability gaps identified. The team's current levels meet or exceed all required levels for this portfolio.</div>
  </div>`}

  ${pageFooter(4)}
</div>`;

  // ── SECTION 5: STRATEGIC NARRATIVE ───────────────────────────────────────────
  const narrativeSections = report.sections.filter(s => !s.isPlaceholder && s.content);
  const narrativePage = `
<div class="page">
  ${sectionHeader("05", "Strategic Narrative")}
  <p style="font-size:10px;color:#475569;margin-bottom:16px;">The reward leader's voice — the strategic intent, principles, and boundaries that define this programme.</p>

  ${report.visionText ? `
  <div style="background:#f0fdf4;border-left:4px solid #2D6A5E;border-radius:0 6px 6px 0;padding:14px 18px;margin-bottom:16px;">
    <div style="font-size:8px;font-weight:700;color:#2D6A5E;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Vision Statement</div>
    <div style="font-size:11px;font-style:italic;color:#0A1628;line-height:1.7;">"${report.visionText}"</div>
  </div>` : ""}

  ${report.strategicShifts && report.strategicShifts.length > 0 ? `
  <div style="margin-bottom:16px;">
    <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Strategic Shifts</div>
    ${report.strategicShifts.map(s => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;border-bottom:1px solid #f1f5f9;">
      <div style="width:6px;height:6px;border-radius:50%;background:#2D6A5E;flex-shrink:0;margin-top:4px;"></div>
      <div style="font-size:10px;color:#334155;">${s.text}</div>
    </div>`).join("")}
  </div>` : ""}

  ${report.principles && report.principles.length > 0 ? `
  <div style="margin-bottom:16px;">
    <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Guiding Principles</div>
    ${report.principles.map(p => `
    <div style="background:#f8fafc;border-left:3px solid #C8A96E;border-radius:0 4px 4px 0;padding:8px 12px;margin-bottom:6px;font-size:10px;color:#334155;">${p.text}</div>`).join("")}
  </div>` : ""}

  ${report.wontDos && report.wontDos.length > 0 ? `
  <div style="margin-bottom:16px;">
    <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Strategic Exclusions (Won't Do)</div>
    ${report.wontDos.map(w => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:5px 0;">
      <div style="background:#ef4444;color:#ffffff;width:14px;height:14px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;flex-shrink:0;margin-top:1px;">✕</div>
      <div style="font-size:10px;color:#475569;">${w.text}</div>
    </div>`).join("")}
  </div>` : ""}

  ${narrativeSections.length > 0 ? narrativeSections.map(s => `
  <div style="margin-bottom:14px;page-break-inside:avoid;">
    <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">${s.title}</div>
    <div style="font-size:10px;color:#334155;line-height:1.7;white-space:pre-wrap;">${s.content}</div>
  </div>`).join("") : ""}

  ${pageFooter(5)}
</div>`;

  // ── SECTION 6: METHODOLOGY & ASSUMPTIONS ─────────────────────────────────────
  const methodologyPage = `
<div class="page">
  ${sectionHeader("06", "Methodology & Assumptions")}
  <p style="font-size:10px;color:#475569;margin-bottom:16px;">This section explains how the financial figures in this report are derived. Boards trust numbers that show their working.</p>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px 16px;">
      <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Value Methodology</div>
      <ul style="font-size:9.5px;color:#334155;line-height:1.8;padding-left:16px;margin:0;">
        <li>Initiative values are calibrated from UK 2025–26 market benchmarks by sub-domain.</li>
        <li>Each initiative carries a low / central / high value range; the central is the midpoint.</li>
        <li>Overlap discounts (15–25%) are applied where initiatives share delivery infrastructure or target the same population.</li>
        <li>All values are gross 3-year totals before investment deduction.</li>
      </ul>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px 16px;">
      <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Cost Methodology</div>
      <ul style="font-size:9.5px;color:#334155;line-height:1.8;padding-left:16px;margin:0;">
        <li>TCO = Year 1 implementation cost + 2 × annual ongoing cost.</li>
        <li>Costs are scaled to organisation size (headcount and payroll) and sector.</li>
        <li>Internal resource (programme management, procurement) is included in TCO.</li>
        <li>Programme funding (off-band pay adjustments) is shown separately where applicable.</li>
      </ul>
    </div>
  </div>

  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px 16px;margin-bottom:16px;">
    <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Scenario Definitions</div>
    <table style="width:100%;border-collapse:collapse;font-size:9px;">
      <thead><tr style="background:#e2e8f0;"><th style="padding:6px 8px;text-align:left;font-weight:700;color:#334155;">Scenario</th><th style="padding:6px 8px;text-align:left;font-weight:700;color:#334155;">Cost Assumption</th><th style="padding:6px 8px;text-align:left;font-weight:700;color:#334155;">Value Assumption</th></tr></thead>
      <tbody>
        <tr><td style="padding:6px 8px;color:#334155;font-weight:600;">Conservative</td><td style="padding:6px 8px;color:#475569;">High-end cost estimates</td><td style="padding:6px 8px;color:#475569;">Low-end value realisation</td></tr>
        <tr style="background:#f1f5f9;"><td style="padding:6px 8px;color:#334155;font-weight:600;">Central ★</td><td style="padding:6px 8px;color:#475569;">Midpoint cost estimates</td><td style="padding:6px 8px;color:#475569;">Midpoint value realisation</td></tr>
        <tr><td style="padding:6px 8px;color:#334155;font-weight:600;">Optimistic</td><td style="padding:6px 8px;color:#475569;">Low-end cost estimates</td><td style="padding:6px 8px;color:#475569;">High-end value realisation</td></tr>
      </tbody>
    </table>
  </div>

  <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;margin-bottom:16px;">
    <div style="font-size:8px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Important Caveats</div>
    <div style="font-size:9.5px;color:#78350f;line-height:1.7;">These figures are indicative estimates based on calibrated benchmarks and the organisation's profile (${report.companyName}${report.headcount ? `, ${report.headcount.toLocaleString()} employees` : ""}). Actual outcomes will depend on vendor selection, implementation quality, change management effectiveness, and adoption rates. All figures exclude VAT. This report does not constitute financial advice.</div>
  </div>

  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;">
    <div style="font-size:8px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Report Metadata</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:9px;color:#475569;">
      <div><strong style="color:#334155;">Generated:</strong> ${date}</div>
      <div><strong style="color:#334155;">Audience:</strong> ${audienceLabel[audience]}</div>
      <div><strong style="color:#334155;">Initiatives:</strong> ${report.initiatives.length}</div>
      <div><strong style="color:#334155;">Overlap groups:</strong> ${report.model.overlapDiscounts.length}</div>
      <div><strong style="color:#334155;">Overlap discount:</strong> ${fmtGBP(central.overlapDiscountTotal)}</div>
      <div><strong style="color:#334155;">Stage 7 confirmed:</strong> ${report.stageCompleteness.stage7 ? "Yes" : "No"}</div>
    </div>
  </div>

  ${pageFooter(6)}
</div>`;

  // ── ASSEMBLE ─────────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${report.companyName} — Reward AI Strategy · ${audienceLabel[audience]}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #ffffff; color: #1e293b; font-size: 10px; line-height: 1.5; }
  .page { width: 210mm; min-height: 297mm; padding: 32px 40px 48px; position: relative; page-break-after: always; overflow: hidden; }
  .page:last-child { page-break-after: auto; }
  .cover-page { background: #0A1628; color: #ffffff; padding: 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
  }
</style>
</head>
<body>
${coverPage}
${financialPage}
${portfolioPage}
${capabilityPage}
${narrativePage}
${methodologyPage}
</body>
</html>`;
}
