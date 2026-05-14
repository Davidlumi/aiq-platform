/**
 * StrategyDiagnosticPage — /strategy/diagnostic
 * Section 01: Where We Are
 *
 * Blocks per brief:
 * 1. Drift Banner (conditional — ≥5pt divergence from snapshot)
 * 2. Hero Insight Callout (overall score, maturity label, sector delta, weakest/strongest domain)
 * 3. Organisation Maturity Ring (SVG ring — overall score vs sector average)
 * 4. Maturity Gap Analysis (per-dimension gap table vs sector p50)
 * 5. HR Team Six-Domain Gap Profile (bar chart with trajectory markers, chevron → evidence modal)
 * 6. Domain Evidence Modal (score, target, benchmark, drift, recommendation, cross-link to Plan)
 */

import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, AlertTriangle, TrendingUp, TrendingDown, Minus,
  ChevronRight, Info, BarChart2, Target, Building2, Users,
  RefreshCw, ExternalLink, CheckCircle2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  DOMAIN_KEYS, DOMAIN_LABELS, DOMAIN_SHORT_LABELS, DOMAIN_COLOURS,
  DOMAIN_BG_COLOURS, DOMAIN_DESCRIPTIONS, DOMAIN_RECOMMENDATIONS,
  type CapabilityKey,
} from "@/lib/domains";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DomainRow {
  key: CapabilityKey;
  label: string;
  shortLabel: string;
  colour: string;
  bgColour: string;
  description: string;
  recommendation: string;
  currentScore: number | null;
  snapshotScore: number | null;
  targetScore: number | null;
  sectorBenchmark: number | null;
  gap: number | null;
  drift: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maturityColour(label: string | null): string {
  if (!label) return "text-muted-foreground";
  const l = label.toLowerCase();
  if (l.includes("advanced") || l.includes("leading")) return "text-emerald-600";
  if (l.includes("developing") || l.includes("progressing")) return "text-blue-600";
  if (l.includes("emerging") || l.includes("early")) return "text-amber-600";
  return "text-muted-foreground";
}

function maturityBg(label: string | null): string {
  if (!label) return "bg-muted/40 border-border";
  const l = label.toLowerCase();
  if (l.includes("advanced") || l.includes("leading")) return "bg-emerald-50 border-emerald-200";
  if (l.includes("developing") || l.includes("progressing")) return "bg-blue-50 border-blue-200";
  if (l.includes("emerging") || l.includes("early")) return "bg-amber-50 border-amber-200";
  return "bg-muted/40 border-border";
}

function TrendIcon({ drift }: { drift: number | null }) {
  if (drift === null) return <Minus className="w-4 h-4 text-muted-foreground" />;
  if (drift >= 3) return <TrendingUp className="w-4 h-4 text-emerald-600" />;
  if (drift <= -3) return <TrendingDown className="w-4 h-4 text-rose-600" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function DriftLabel({ drift }: { drift: number | null }) {
  if (drift === null) return <span className="text-xs text-muted-foreground">No baseline</span>;
  if (drift >= 3) return <span className="text-xs text-emerald-600 font-medium">+{drift}pts</span>;
  if (drift <= -3) return <span className="text-xs text-rose-600 font-medium">{drift}pts</span>;
  return <span className="text-xs text-muted-foreground">Stable</span>;
}

// ─── Ring Chart ───────────────────────────────────────────────────────────────

function RingChart({
  value, max = 100, size = 140, strokeWidth = 14, colour = "#4477AA",
  label, sublabel,
}: {
  value: number; max?: number; size?: number; strokeWidth?: number;
  colour?: string; label: string; sublabel?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  const dash = pct * circ;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} role="img" aria-label={`${label}: ${value} out of ${max}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor"
          strokeWidth={strokeWidth} className="text-muted/30" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={colour}
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ / 4}
          style={{ transition: "stroke-dasharray 0.6s ease" }} />
        <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle"
          className="fill-foreground font-bold" style={{ fontSize: size * 0.2 }}>
          {value}
        </text>
        <text x={cx} y={cy + size * 0.14} textAnchor="middle" dominantBaseline="middle"
          className="fill-muted-foreground" style={{ fontSize: size * 0.09 }}>
          / {max}
        </text>
      </svg>
      <span className="text-sm font-semibold text-center">{label}</span>
      {sublabel && <span className="text-xs text-muted-foreground text-center">{sublabel}</span>}
    </div>
  );
}

// ─── Domain Bar Row ───────────────────────────────────────────────────────────

function DomainBarRow({ row, onDrillDown }: { row: DomainRow; onDrillDown: (row: DomainRow) => void }) {
  const currentPct = row.currentScore !== null ? Math.min(100, Math.max(0, row.currentScore)) : 0;
  const targetPct  = row.targetScore  !== null ? Math.min(100, Math.max(0, row.targetScore))  : 0;
  const benchPct   = row.sectorBenchmark !== null ? Math.min(100, Math.max(0, row.sectorBenchmark)) : 0;

  return (
    <TooltipProvider>
      <button
        onClick={() => onDrillDown(row)}
        className="w-full text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
        aria-label={`${row.label}: score ${row.currentScore ?? "N/A"}, click to view evidence`}
      >
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/40 transition-colors">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: row.colour }} />
          <span className="w-36 text-sm font-medium text-foreground truncate flex-shrink-0">{row.shortLabel}</span>
          <div className="flex-1 relative h-5 bg-muted/30 rounded-full overflow-visible">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{ width: `${currentPct}%`, background: row.colour, opacity: 0.85 }}
            />
            {row.sectorBenchmark !== null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-500 opacity-60 cursor-help"
                    style={{ left: `${benchPct}%` }}
                    aria-label={`Sector benchmark: ${row.sectorBenchmark}`}
                  />
                </TooltipTrigger>
                <TooltipContent side="top"><p className="text-xs">Sector median: {row.sectorBenchmark}</p></TooltipContent>
              </Tooltip>
            )}
            {row.targetScore !== null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="absolute top-0 bottom-0 w-0.5 border-l-2 border-dashed border-slate-400 opacity-80 cursor-help"
                    style={{ left: `${targetPct}%` }}
                    aria-label={`Target: ${row.targetScore}`}
                  />
                </TooltipTrigger>
                <TooltipContent side="top"><p className="text-xs">Strategy target: {row.targetScore}</p></TooltipContent>
              </Tooltip>
            )}
          </div>
          <span className="w-10 text-right text-sm font-semibold tabular-nums flex-shrink-0" style={{ color: row.colour }}>
            {row.currentScore ?? "—"}
          </span>
          <div className="flex items-center gap-1 w-16 flex-shrink-0">
            <TrendIcon drift={row.drift} />
            <DriftLabel drift={row.drift} />
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
        </div>
      </button>
    </TooltipProvider>
  );
}

// ─── Domain Evidence Modal ────────────────────────────────────────────────────

function DomainEvidenceModal({ row, open, onClose }: { row: DomainRow | null; open: boolean; onClose: () => void }) {
  if (!row) return null;
  const gap = row.gap;
  const gapColour = gap === null ? "text-muted-foreground"
    : gap > 15 ? "text-rose-600"
    : gap > 5  ? "text-amber-600"
    : "text-emerald-600";

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg" aria-describedby="domain-modal-desc">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rounded-full" style={{ background: row.colour }} />
            <DialogTitle className="text-lg">{row.label}</DialogTitle>
          </div>
          <DialogDescription id="domain-modal-desc" className="text-sm text-muted-foreground">
            {row.description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg p-3 text-center" style={{ background: row.bgColour }}>
              <p className="text-xs text-muted-foreground mb-1">Current</p>
              <p className="text-2xl font-bold" style={{ color: row.colour }}>{row.currentScore ?? "—"}</p>
            </div>
            <div className="rounded-lg p-3 text-center bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Target</p>
              <p className="text-2xl font-bold text-foreground">{row.targetScore ?? "—"}</p>
            </div>
            <div className="rounded-lg p-3 text-center bg-slate-50 border border-slate-200">
              <p className="text-xs text-muted-foreground mb-1">Sector p50</p>
              <p className="text-2xl font-bold text-slate-600">{row.sectorBenchmark ?? "—"}</p>
            </div>
          </div>
          {gap !== null && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/20">
              <Target className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">Gap to target:</span>
              <span className={`text-sm font-semibold ${gapColour}`}>
                {gap > 0 ? `+${gap} pts needed` : gap === 0 ? "At target" : `${Math.abs(gap)} pts above target`}
              </span>
            </div>
          )}
          {row.drift !== null && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/20">
              <TrendIcon drift={row.drift} />
              <span className="text-sm text-muted-foreground">Since strategy was set:</span>
              <span className={`text-sm font-semibold ${row.drift >= 3 ? "text-emerald-600" : row.drift <= -3 ? "text-rose-600" : "text-muted-foreground"}`}>
                {row.drift >= 3 ? `+${row.drift} pts (improving)` : row.drift <= -3 ? `${row.drift} pts (declining)` : "Stable"}
              </span>
            </div>
          )}
          <Separator />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Development recommendation</p>
            <p className="text-sm text-foreground leading-relaxed">{row.recommendation}</p>
          </div>
          <div className="flex justify-between items-center pt-1">
            <Link href="/strategy/roadmap">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={onClose}>
                <ExternalLink className="w-3.5 h-3.5" />
                View initiatives for this domain
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StrategyDiagnosticPage() {
  const [, navigate] = useLocation();
  const [selectedDomain, setSelectedDomain] = useState<DomainRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const assessmentQ  = trpc.companyAssessment.getMyAssessmentResults.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const strategyQ    = trpc.intelligence.getStrategy.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const orgContextQ  = trpc.intelligence.orgContext.useQuery(undefined, { staleTime: 5 * 60 * 1000 });

  const sectorId = orgContextQ.data?.sector ?? null;
  const benchmarkQ = trpc.contentLibrary.getSectorBenchmark.useQuery(
    { sector_id: sectorId! },
    { enabled: !!sectorId, staleTime: 60 * 60 * 1000 }
  );

  // ── Domain rows ────────────────────────────────────────────────────────────
  const domainRows = useMemo<DomainRow[]>(() => {
    const assessment = assessmentQ.data;
    const strategy   = strategyQ.data;
    const benchmark  = benchmarkQ.data;

    return DOMAIN_KEYS.map(key => {
      const dim          = assessment?.dimensions?.find((d: any) => d.key === key);
      const currentScore = dim?.score ?? (strategy?.currentDomainScores as any)?.[key] ?? null;
      const snapshotScore = (strategy?.snapshotDomainScores as any)?.[key] ?? null;
      const targetScore  = (strategy?.domainTargets as any)?.[key] ?? null;

      // Sector benchmark: try org-maturity benchmark first, then assessment dimension
      const orgBench = (benchmark?.organisational_maturity_benchmark as any)?.[key];
      const sectorBenchmark = orgBench && typeof orgBench === "object" && "p50" in orgBench
        ? Math.round((orgBench as { p50: number }).p50 * 20)
        : dim?.sectorBenchmark ?? null;

      const gap   = targetScore !== null && currentScore !== null ? targetScore - currentScore : null;
      const drift = currentScore !== null && snapshotScore !== null ? currentScore - snapshotScore : null;

      return {
        key,
        label:          DOMAIN_LABELS[key],
        shortLabel:     DOMAIN_SHORT_LABELS[key],
        colour:         DOMAIN_COLOURS[key],
        bgColour:       DOMAIN_BG_COLOURS[key],
        description:    DOMAIN_DESCRIPTIONS[key],
        recommendation: DOMAIN_RECOMMENDATIONS[key],
        currentScore,
        snapshotScore,
        targetScore,
        sectorBenchmark,
        gap,
        drift,
      };
    });
  }, [assessmentQ.data, strategyQ.data, benchmarkQ.data]);

  // ── Drift detection ────────────────────────────────────────────────────────
  const driftDomains = useMemo(() => domainRows.filter(r => r.drift !== null && Math.abs(r.drift) >= 5), [domainRows]);
  const hasDrift     = driftDomains.length > 0;
  const hasDecline   = driftDomains.some(r => (r.drift ?? 0) < -5);

  // ── Hero data ──────────────────────────────────────────────────────────────
  const overallScore  = assessmentQ.data?.overallScore ?? null;
  const maturityLabel = (assessmentQ.data as any)?.maturityLabel ?? null;
  const sectorAverage = (assessmentQ.data as any)?.sectorAverage ?? null;

  const weakest   = useMemo(() => domainRows.filter(r => r.currentScore !== null).sort((a, b) => (a.currentScore ?? 0) - (b.currentScore ?? 0))[0] ?? null, [domainRows]);
  const strongest = useMemo(() => domainRows.filter(r => r.currentScore !== null).sort((a, b) => (b.currentScore ?? 0) - (a.currentScore ?? 0))[0] ?? null, [domainRows]);

  // ── Maturity gap table ─────────────────────────────────────────────────────
  const maturityGapRows = useMemo(() => {
    const dims = (assessmentQ.data as any)?.dimensions ?? [];
    return dims.map((d: any) => ({
      key:       d.key,
      label:     d.label,
      score:     d.score,
      benchmark: d.sectorBenchmark,
      gap:       d.sectorBenchmark - d.score,
    }));
  }, [assessmentQ.data]);

  // ── Loading / error ────────────────────────────────────────────────────────
  const isLoading    = assessmentQ.isLoading || strategyQ.isLoading;
  const isError      = assessmentQ.isError   || strategyQ.isError;
  const hasNoAssess  = !isLoading && !assessmentQ.data;

  function handleDrillDown(row: DomainRow) {
    setSelectedDomain(row);
    setModalOpen(true);
    (window as any).umami?.track("diagnostic_domain_drilldown", { domain: row.key });
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">

      {/* ── Page Header ── */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={() => navigate("/strategy")}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Strategy
            </button>
            <span>/</span>
            <span className="text-foreground font-medium">Diagnostic</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs font-mono">01</Badge>
                <h1 className="text-2xl font-bold text-foreground">Where We Are</h1>
              </div>
              <p className="text-sm text-muted-foreground max-w-xl">
                Your organisation's current AI capability baseline — overall maturity, domain profile,
                and how you compare to sector peers.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0"
              onClick={() => navigate("/strategy")}>
              <RefreshCw className="w-3.5 h-3.5" />
              Re-run assessment
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Block 1: Drift Banner ── */}
        {!isLoading && hasDrift && (
          <div
            className={`rounded-xl border px-5 py-4 flex items-start gap-3 ${hasDecline ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"}`}
            role="alert" aria-live="polite"
          >
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${hasDecline ? "text-rose-600" : "text-amber-600"}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${hasDecline ? "text-rose-800" : "text-amber-800"}`}>
                {hasDecline
                  ? "Capability scores have declined since your strategy was set"
                  : "Capability scores have shifted since your strategy was set"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {driftDomains.map(r => r.shortLabel).join(", ")} moved by ≥5 points.{" "}
                {hasDecline
                  ? "Review your plan to ensure initiatives address these declines."
                  : "Your plan may need updating to reflect this progress."}
              </p>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm"
                  className={`gap-1 text-xs ${hasDecline ? "border-rose-300 hover:bg-rose-100" : "border-amber-300 hover:bg-amber-100"}`}
                  onClick={() => navigate("/strategy/roadmap")}>
                  Review plan
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Block 2: Hero Insight Callout ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : isError ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-center text-sm text-destructive">
              Failed to load assessment data. Please refresh the page.
            </CardContent>
          </Card>
        ) : hasNoAssess ? (
          <Card className="border-dashed">
            <CardContent className="pt-8 pb-8 text-center">
              <BarChart2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No assessment data yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Complete the HR AI Capability Assessment to see your diagnostic baseline.
              </p>
              <Button size="sm" onClick={() => navigate("/strategy")}>Start assessment</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Overall score */}
            <Card className={`border ${maturityBg(maturityLabel)}`}>
              <CardContent className="pt-5 pb-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Overall Score</p>
                <p className={`text-4xl font-bold ${maturityColour(maturityLabel)}`}>{overallScore ?? "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">out of 100</p>
                {maturityLabel && (
                  <Badge variant="outline" className={`mt-2 text-xs ${maturityColour(maturityLabel)}`}>{maturityLabel}</Badge>
                )}
              </CardContent>
            </Card>

            {/* Sector comparison */}
            <Card>
              <CardContent className="pt-5 pb-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">vs Sector</p>
                {sectorAverage !== null && overallScore !== null ? (
                  <>
                    <p className="text-4xl font-bold text-foreground">
                      {overallScore > sectorAverage ? `+${Math.round(overallScore - sectorAverage)}` : Math.round(overallScore - sectorAverage)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Sector average: {Math.round(sectorAverage)}</p>
                    <Badge variant="outline" className={`mt-2 text-xs ${overallScore >= sectorAverage ? "text-emerald-600 border-emerald-300" : "text-rose-600 border-rose-300"}`}>
                      {overallScore >= sectorAverage ? "Above sector" : "Below sector"}
                    </Badge>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">No sector data available</p>
                )}
              </CardContent>
            </Card>

            {/* Key insight */}
            <Card>
              <CardContent className="pt-5 pb-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Key Insight</p>
                {weakest ? (
                  <>
                    <p className="text-sm font-medium text-foreground leading-snug">{weakest.shortLabel} is your biggest gap</p>
                    <p className="text-xs text-muted-foreground mt-1">Strongest: {strongest?.shortLabel ?? "—"}</p>
                    <button
                      onClick={() => { setSelectedDomain(weakest); setModalOpen(true); }}
                      className="mt-2 text-xs text-primary underline-offset-2 hover:underline"
                    >
                      View recommendations →
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Insufficient data</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Block 3: Organisation Maturity Ring ── */}
        {!isLoading && !isError && assessmentQ.data && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Organisation Maturity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex gap-6 flex-shrink-0">
                  <RingChart
                    value={overallScore ?? 0}
                    max={100}
                    size={140}
                    strokeWidth={14}
                    colour="#4477AA"
                    label="Your score"
                    sublabel={maturityLabel ?? undefined}
                  />
                  {sectorAverage !== null && (
                    <RingChart
                      value={Math.round(sectorAverage)}
                      max={100}
                      size={140}
                      strokeWidth={14}
                      colour="#94a3b8"
                      label="Sector avg"
                      sublabel="p50 benchmark"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {(assessmentQ.data as any).maturityDescription && (
                    <p className="text-sm text-foreground leading-relaxed mb-3">
                      {(assessmentQ.data as any).maturityDescription}
                    </p>
                  )}
                  {(assessmentQ.data as any).benchmarkContext && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
                      <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {(assessmentQ.data as any).benchmarkContext}
                      </p>
                    </div>
                  )}
                  {!(assessmentQ.data as any).maturityDescription && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {maturityLabel
                        ? `Your organisation is at the ${maturityLabel} stage of AI capability. Focus on the domain gaps below to accelerate progress.`
                        : "Complete more of the assessment to unlock your maturity narrative."}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Block 4: Maturity Gap Analysis ── */}
        {!isLoading && !isError && maturityGapRows.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                Maturity Gap Analysis
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Compares your score against the sector median (p50) for each maturity dimension.
                        Positive gap means you are below the sector benchmark.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" role="table" aria-label="Maturity gap analysis">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Dimension</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wide w-20">Score</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wide w-24">Sector p50</th>
                      <th className="text-right py-2 pl-3 font-medium text-muted-foreground text-xs uppercase tracking-wide w-20">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maturityGapRows.map((row: any) => (
                      <tr key={row.key} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2.5 pr-4 font-medium text-foreground">{row.label}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-semibold">{row.score}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">{row.benchmark}</td>
                        <td className="py-2.5 pl-3 text-right tabular-nums">
                          <span className={row.gap > 10 ? "text-rose-600 font-semibold" : row.gap > 3 ? "text-amber-600 font-medium" : row.gap < -3 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                            {row.gap > 0 ? `+${row.gap}` : row.gap}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Block 5: HR Team Six-Domain Gap Profile ── */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                HR Team Domain Profile
              </CardTitle>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 bg-slate-500 opacity-60" />
                  Sector median
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 border-t-2 border-dashed border-slate-400 opacity-80" />
                  Target
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : domainRows.every(r => r.currentScore === null) ? (
              <div className="py-8 text-center">
                <BarChart2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No domain scores yet. Complete the capability assessment to populate this profile.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {domainRows.map(row => (
                  <DomainBarRow key={row.key} row={row} onDrillDown={handleDrillDown} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Cross-links ── */}
        {!isLoading && !isError && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { href: "/strategy/ambition", label: "02 Ambition", desc: "Set targets based on this baseline", icon: Target },
              { href: "/strategy/roadmap",     label: "03 Plan",     desc: "Initiatives to close the gaps",    icon: CheckCircle2 },
              { href: "/strategy/measurement", label: "06 Measurement", desc: "Track progress against these scores", icon: BarChart2 },
            ].map(({ href, label, desc, icon: Icon }) => (
              <button
                key={href}
                onClick={() => navigate(href)}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/40 transition-colors text-left group"
              >
                <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground truncate">{desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Block 6: Domain Evidence Modal ── */}
      <DomainEvidenceModal
        row={selectedDomain}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedDomain(null); }}
      />
    </div>
  );
}
