/**
 * StrategyOverviewPage — /strategy
 *
 * Card-grid overview of the six strategy sections.
 * Replaces the long-scroll AIStrategyPage as the default entry point.
 *
 * Layout:
 *   Context bar   — org pills + last-updated + action buttons
 *   Hero block    — narrative sentence + 4 KPI tiles
 *   Six-card grid — one card per section, keyboard-accessible buttons
 *   Next steps    — footer CTAs
 */
import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BarChart3, Target, Users, TrendingUp, Shield, Zap, Layers,
  Lightbulb, Sparkles, AlertTriangle, Info, ArrowRight, Download,
  Pencil, Calendar, CheckCircle2, Building2, ChevronRight,
  Activity, PoundSterling, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { DOMAIN_KEYS, DOMAIN_LABELS } from "@/lib/domains";

// ─── Constants ────────────────────────────────────────────────────────────────

const BUSINESS_LEVELS: Record<number, { label: string; description: string; requiredMaturity: number }> = {
  1: { label: "Cautious",       description: "AI used selectively in low-risk, back-office processes.",                              requiredMaturity: 1.0   },
  2: { label: "Exploratory",    description: "Piloting AI in specific workflows. Building internal confidence before wider rollout.", requiredMaturity: 1.875 },
  3: { label: "Progressive",    description: "AI embedded in core HR processes. HR professionals use AI tools confidently.",         requiredMaturity: 2.75  },
  4: { label: "Ambitious",      description: "AI is a strategic differentiator. HR leads AI adoption across the business.",          requiredMaturity: 3.625 },
  5: { label: "Transformative", description: "AI is central to the business model. HR professionals are AI-native practitioners.",   requiredMaturity: 4.5   },
};

const PEOPLE_LEVELS: Record<number, { label: string; description: string }> = {
  1: { label: "Followers",    description: "HR people use AI tools as directed." },
  2: { label: "Adopters",     description: "HR people learn and use AI tools in their day-to-day work." },
  3: { label: "Practitioners", description: "HR people apply AI confidently, evaluate outputs critically, and adapt workflows." },
  4: { label: "Champions",    description: "HR people advocate for AI, coach others, and contribute to AI governance." },
  5: { label: "Innovators",   description: "HR people design AI-enabled processes, lead change, and shape the AI strategy." },
};

const AMBITION_TIER_BASE: Record<number, number> = { 1: 38, 2: 46, 3: 55, 4: 63, 5: 73 };

const FOUNDATION_CATEGORIES = new Set(["Change & Capability", "Governance & Ethics", "HR Operations"]);
const SCALE_CATEGORIES      = new Set(["People Analytics", "HR Business Partnering"]);
const OPTIMISE_CATEGORIES   = new Set(["Ethics & Governance", "Governance & Ethics", "People Analytics", "HR Business Partnering"]);

function assignPhase(initiative: { category: string; complexity: number | string; name: string }): string {
  const complexity = Number(initiative.complexity);
  const cat = initiative.category ?? "";
  if (initiative.name.toLowerCase().includes("literacy")) return "Q1";
  if (initiative.name.toLowerCase().includes("ethics & governance")) return "Q1";
  if (complexity <= 2 && FOUNDATION_CATEGORIES.has(cat)) return "Q1";
  if (complexity <= 2) return "Q2";
  if (complexity === 3 && FOUNDATION_CATEGORIES.has(cat)) return "Q2";
  if (complexity === 3 && SCALE_CATEGORIES.has(cat)) return "Q3";
  if (complexity === 3) return "Q2";
  if (complexity >= 4 && OPTIMISE_CATEGORIES.has(cat)) return "Q4";
  if (complexity >= 4 && SCALE_CATEGORIES.has(cat)) return "Q3";
  if (complexity >= 4) return "Q3";
  return "Q2";
}

const PHASE_COST_PER_INIT: Record<string, { low: number; high: number }> = {
  "Q1": { low: 20,  high: 60  },
  "Q2": { low: 40,  high: 120 },
  "Q3": { low: 60,  high: 200 },
  "Q4": { low: 30,  high: 100 },
  "unknown": { low: 15, high: 50 },
};

const SECTORS = [
  { value: "financial_services",    label: "Financial Services" },
  { value: "healthcare",            label: "Healthcare" },
  { value: "technology",            label: "Technology" },
  { value: "retail",                label: "Retail" },
  { value: "public_sector",         label: "Public Sector" },
  { value: "professional_services", label: "Professional Services" },
  { value: "manufacturing",         label: "Manufacturing" },
  { value: "energy_utilities",      label: "Energy & Utilities" },
  { value: "media_entertainment",   label: "Media & Entertainment" },
  { value: "logistics_transport",   label: "Logistics & Transport" },
  { value: "education",             label: "Education" },
  { value: "hospitality_leisure",   label: "Hospitality & Leisure" },
  { value: "other",                 label: "Other" },
];

// ─── Section card definitions ─────────────────────────────────────────────────

interface SectionCard {
  id: string;
  slug: string;
  num: string;
  title: string;
  icon: React.ReactNode;
  accent: string;
  accentBg: string;
  accentBorder: string;
}

const SECTION_CARDS: SectionCard[] = [
  {
    id: "diagnostic",
    slug: "/strategy/diagnostic",
    num: "01",
    title: "Where we are",
    icon: <BarChart3 className="w-4 h-4" />,
    accent: "#60A5FA",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/25",
  },
  {
    id: "ambition",
    slug: "/strategy/ambition",
    num: "02",
    title: "Where we're going",
    icon: <Target className="w-4 h-4" />,
    accent: "#2DD4BF",
    accentBg: "bg-teal-500/10",
    accentBorder: "border-teal-500/25",
  },
  {
    id: "plan",
    slug: "/strategy/plan",
    num: "03",
    title: "How we get there",
    icon: <Layers className="w-4 h-4" />,
    accent: "#A78BFA",
    accentBg: "bg-purple-500/10",
    accentBorder: "border-purple-500/25",
  },
  {
    id: "investment-risk",
    slug: "/strategy/investment-risk",
    num: "04",
    title: "What it costs",
    icon: <PoundSterling className="w-4 h-4" />,
    accent: "#FBBF24",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-500/25",
  },
  {
    id: "value",
    slug: "/strategy/value",
    num: "05",
    title: "What this is worth",
    icon: <TrendingUp className="w-4 h-4" />,
    accent: "#34D399",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/25",
  },
  {
    id: "measurement",
    slug: "/strategy/measurement",
    num: "06",
    title: "How we'll measure",
    icon: <Activity className="w-4 h-4" />,
    accent: "#94A3B8",
    accentBg: "bg-slate-500/10",
    accentBorder: "border-slate-500/25",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toFixed(decimals)}`;
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ─── Card skeleton ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/2 p-5 flex flex-col gap-3 min-h-[220px]">
      <Skeleton className="h-3 w-16 rounded" />
      <Skeleton className="h-5 w-28 rounded" />
      <Skeleton className="h-8 w-36 rounded" />
      <Skeleton className="h-3 w-full rounded" />
      <Skeleton className="h-3 w-3/4 rounded" />
    </div>
  );
}

// ─── Card error placeholder ───────────────────────────────────────────────────

function CardError({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 flex flex-col gap-2 min-h-[220px] items-center justify-center text-center">
      <AlertTriangle className="w-5 h-5 text-red-400" />
      <p className="text-xs text-red-400 font-medium">{title}</p>
      <p className="text-[11px] text-muted-foreground">Failed to load — try refreshing</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StrategyOverviewPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // ── Queries ───────────────────────────────────────────────────────────────
  const strategyQ           = trpc.intelligence.getStrategy.useQuery();
  const strategyAssessmentQ = trpc.intelligence.getStrategyAssessment.useQuery();
  const orgContextQ         = trpc.intelligence.orgContext.useQuery();
  const initiativesQ        = trpc.strategy.listInitiatives.useQuery(
    { tenantId: user?.tenantId ?? "" },
    { enabled: !!user?.tenantId }
  );
  const ambitionGapQ       = trpc.dashboardV2.leader.ambitionGap.useQuery();
  const companyAssessmentQ = trpc.companyAssessment.getMyAssessmentResults.useQuery();

  // ── Risk evaluation (eager, fires once initiatives are known) ─────────────
  const evaluateRiskMut = trpc.intelligence.evaluateRiskRules.useMutation();
  const [liveRisks, setLiveRisks] = useState<Array<{ severity: string }> | null>(null);

  // ── Derived values ────────────────────────────────────────────────────────
  const strategyData       = strategyQ.data;
  const strategyAssessment = strategyAssessmentQ.data;
  const orgContext         = orgContextQ.data;
  const ambitionGap        = ambitionGapQ.data;
  const allInitiatives     = initiativesQ.data ?? [];
  const companyResults     = companyAssessmentQ.data;
  const structuredInputs   = (strategyAssessment as any)?.structuredInputs as Record<string, unknown> | undefined;

  const businessLevel = strategyData?.businessAmbitionLevel ?? 3;
  const peopleLevel   = strategyData?.peopleAmbitionLevel ?? 3;
  const bLevel        = BUSINESS_LEVELS[businessLevel];
  const pLevel        = PEOPLE_LEVELS[peopleLevel];

  const sector    = orgContext?.sector ?? companyResults?.companySector ?? "";
  const sectorLabel = SECTORS.find(s => s.value === sector)?.label ?? sector;

  const selectedInitiativeIds = useMemo(() => {
    const ids = strategyData?.selectedInitiativeIds ?? [];
    return new Set(ids);
  }, [strategyData?.selectedInitiativeIds]);

  const selectedInits = useMemo(
    () => allInitiatives.filter((i: any) => selectedInitiativeIds.has(i.id)),
    [allInitiatives, selectedInitiativeIds]
  );

  // Phase assignment for cost estimate
  const initiativesByPhase = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const init of selectedInits) {
      const phase = assignPhase(init as { category: string; complexity: number | string; name: string });
      if (!groups[phase]) groups[phase] = [];
      groups[phase].push(init);
    }
    return groups;
  }, [selectedInits]);

  // Cost envelope (rough estimate from phase × count)
  const totalCostLow  = useMemo(() =>
    Object.entries(initiativesByPhase).reduce((s, [ph, items]) => s + items.length * (PHASE_COST_PER_INIT[ph]?.low ?? 20), 0) * 1000,
    [initiativesByPhase]
  );
  const totalCostHigh = useMemo(() =>
    Object.entries(initiativesByPhase).reduce((s, [ph, items]) => s + items.length * (PHASE_COST_PER_INIT[ph]?.high ?? 60), 0) * 1000,
    [initiativesByPhase]
  );

  // Foundation phase count
  const foundationCount = (initiativesByPhase["Q1"] ?? []).length;
  const foundationCostLow  = foundationCount * (PHASE_COST_PER_INIT["Q1"]?.low ?? 20) * 1000;
  const foundationCostHigh = foundationCount * (PHASE_COST_PER_INIT["Q1"]?.high ?? 60) * 1000;

  // HR capability numbers
  const overallTarget = useMemo(() => {
    const base = AMBITION_TIER_BASE[businessLevel] ?? 55;
    return base;
  }, [businessLevel]);

  const hrNow    = ambitionGap?.functionAvgRaw != null ? (ambitionGap.functionAvgRaw / 10).toFixed(1) : null;
  const hrTarget = (overallTarget / 10).toFixed(1);
  const hrGap    = hrNow != null ? ((overallTarget - ambitionGap!.functionAvgRaw!) / 10).toFixed(1) : null;

  // Regulatory flags
  const hasRegFlag = selectedInits.some((i: any) => i.regulatoryFlag);

  // Drift indicator: compare current assessment score to strategy snapshot
  const hasDrift = useMemo(() => {
    if (!companyResults || !strategyData?.ambitionTargetScore) return false;
    const currentScore = companyResults.overallScore * 20; // 0-5 → 0-100
    const strategySnapshot = strategyData.ambitionTargetScore;
    return Math.abs(currentScore - strategySnapshot) >= 6; // ≥0.3 on 0-5 scale
  }, [companyResults, strategyData]);

  // Weak domains (below threshold)
  const weakDomainCount = useMemo(() => {
    const scores = strategyData?.currentDomainScores as Record<string, number> | null | undefined;
    if (!scores) return 0;
    return DOMAIN_KEYS.filter(k => {
      const score = scores[k];
      return score !== null && score !== undefined && score < overallTarget;
    }).length;
  }, [strategyData, overallTarget]);

  // Measurement cadence
  const cadenceId  = structuredInputs?.measurement_cadence as string | undefined;
  const cadenceLabel = cadenceId === "twice_yearly" ? "Twice-yearly review"
    : cadenceId === "quarterly" ? "Quarterly review"
    : cadenceId === "annual" ? "Annual review"
    : cadenceId === "monthly" ? "Monthly review"
    : "Review cadence";

  // Next review countdown
  const reviewDate = strategyData?.ambitionTargetDate;
  const daysToReview = daysUntil(reviewDate);

  // Vision excerpt
  const visionStatement = strategyAssessment?.visionStatement ?? null;
  const visionExcerpt = visionStatement ? visionStatement.slice(0, 120) + (visionStatement.length > 120 ? "…" : "") : null;

  // Eager risk evaluation once initiatives are loaded
  useEffect(() => {
    if (selectedInits.length === 0 || liveRisks !== null) return;
    const ambitionTier: "cautious" | "progressive" | "transformative" =
      businessLevel >= 4 ? "transformative" : businessLevel >= 3 ? "progressive" : "cautious";
    const ids = selectedInits.map((i: any) => i.id);
    evaluateRiskMut.mutate(
      { ambitionTier, orgSize: "medium", selectedInitiativeIds: ids },
      { onSuccess: (data) => setLiveRisks(data) }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInits.length]);

  const highRiskCount = liveRisks?.filter(r => r.severity === "high" || r.severity === "very_high").length ?? 0;

  // Last saved info
  const savedAt = strategyData?.strategySavedAt;
  const savedLabel = savedAt
    ? `Updated ${new Date(savedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`
    : "Not yet saved";

  function handleExportBoardPack() {
    (window as any).umami?.track("strategy_export_board_pack_click");
    window.open("/api/pdf/board_pack", "_blank", "noopener,noreferrer");
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  const isLoading = strategyQ.isLoading || strategyAssessmentQ.isLoading;
  const hasStrategy = strategyData?.configured ?? false;

  // ── Telemetry ─────────────────────────────────────────────────────────────
  function trackCardClick(sectionId: string) {
    (window as any).umami?.track("strategy_card_click", { section: sectionId });
  }

  // ── Card data (computed from queries) ────────────────────────────────────
  const cardData: Record<string, {
    headline: string;
    sub: string;
    flag?: { type: "warning" | "info"; text: string };
  }> = {
    diagnostic: {
      headline: hrNow && hrGap
        ? `${hrNow} / 10 · ${Number(hrGap) > 0 ? hrGap : "0"} gap${ambitionGap?.functionAvgRaw != null ? "" : ""}`
        : companyResults ? `${companyResults.overallScore.toFixed(1)} / 5 org maturity` : "—",
      sub: companyResults
        ? `Organisation maturity ${companyResults.overallScore.toFixed(1)}/5. ${hrNow && Number(hrGap) > 0 ? `HR trails ${bLevel?.label} ambition.` : "HR aligned with ambition."}`
        : "Run the company assessment to see maturity data.",
      flag: weakDomainCount >= 3
        ? { type: "warning", text: `${weakDomainCount} capabilities below threshold` }
        : hasDrift
        ? { type: "info", text: "Capability re-assessed — revisit priorities?" }
        : undefined,
    },
    ambition: {
      headline: bLevel && pLevel ? `${bLevel.label} · ${pLevel.label}` : "—",
      sub: visionExcerpt ? `"${visionExcerpt}"` : "Vision statement not yet set.",
      flag: undefined,
    },
    plan: {
      headline: selectedInitiativeIds.size > 0
        ? `${selectedInitiativeIds.size} initiative${selectedInitiativeIds.size !== 1 ? "s" : ""} · 18 months`
        : "No initiatives selected",
      sub: foundationCount > 0
        ? `Foundation phase active · ${foundationCount} of ${selectedInitiativeIds.size} in flight.`
        : "Select initiatives to build your plan.",
      flag: hasRegFlag
        ? { type: "warning", text: "1 blocked · DPIA pending" }
        : undefined,
    },
    "investment-risk": {
      headline: totalCostLow > 0
        ? `${fmt(totalCostLow)}–${fmt(totalCostHigh)}`
        : "—",
      sub: totalCostLow > 0
        ? `3-year TCO. Foundation phase ${fmt(foundationCostLow)}–${fmt(foundationCostHigh)}.`
        : "Cost estimate will appear once initiatives are selected.",
      flag: highRiskCount > 0
        ? { type: "warning", text: `${highRiskCount} high-risk framework${highRiskCount !== 1 ? "s" : ""}` }
        : undefined,
    },
    value: {
      headline: "Indicative value",
      sub: "Value model runs when initiatives and baseline are confirmed.",
      flag: { type: "info", text: "Indicative · confirm with Finance" },
    },
    measurement: {
      headline: cadenceId ? cadenceLabel : "Cadence not set",
      sub: daysToReview != null && daysToReview > 0
        ? `Next review in ${daysToReview} days${reviewDate ? `, before Foundation ends.` : "."}`
        : daysToReview != null && daysToReview <= 0
        ? "Review is overdue — schedule now."
        : "Set a review date to track progress.",
      flag: undefined,
    },
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!isLoading && !hasStrategy) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Build your HR AI Strategy</h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          You haven't set up a strategy yet. Run the strategy wizard to define your ambition, select initiatives, and generate your board-ready strategy.
        </p>
        <Button
          onClick={() => navigate("/ai-strategy/assessment")}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Build strategy
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-5xl mx-auto pb-16 px-0">

        {/* ══ CONTEXT BAR ══════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pt-2">
          {/* Left: pills */}
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-1">Strategy context</span>
            {sectorLabel && (
              <Badge variant="secondary" className="text-[11px] font-medium px-2 py-0.5 bg-white/6 border border-white/10 text-foreground">
                <Building2 className="w-3 h-3 mr-1 opacity-60" />
                {sectorLabel}
              </Badge>
            )}
            {bLevel && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="text-[11px] font-medium px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 cursor-help"
                  >
                    {bLevel.label} · business
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  <p className="font-semibold mb-1">{bLevel.label} business ambition</p>
                  <p>{bLevel.description}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {pLevel && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="text-[11px] font-medium px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 cursor-help"
                  >
                    {pLevel.label} · HR
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  <p className="font-semibold mb-1">{pLevel.label} HR people ambition</p>
                  <p>{pLevel.description}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {/* Right: meta + actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] text-muted-foreground hidden sm:block">
              {savedLabel}
              {daysToReview != null && daysToReview > 0 && ` · Next review in ${daysToReview} days`}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 px-3 border-white/15 hover:border-white/30"
              onClick={() => navigate("/ai-strategy")}
            >
              <Pencil className="w-3 h-3 mr-1.5" />
              Edit strategy
            </Button>
            <Button
              size="sm"
              className="text-xs h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleExportBoardPack}
            >
              <Download className="w-3 h-3 mr-1.5" />
              Export board pack
            </Button>
          </div>
        </div>

        {/* ══ HERO BLOCK ═══════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-[#0E1726] to-[#111c30] p-6 sm:p-8 mb-6">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">HR AI Strategy</p>
          {isLoading ? (
            <Skeleton className="h-6 w-3/4 mb-6 rounded" />
          ) : (
            <p className="text-lg sm:text-xl font-semibold text-foreground leading-relaxed mb-6 max-w-3xl">
              {companyResults && hrNow && hrGap && Number(hrGap) > 0
                ? `${companyResults.companyName ?? "The HR function"} is at ${hrNow}/10 against the ${hrTarget} needed for a ${bLevel?.label} ambition — this strategy closes the ${hrGap}-point gap through ${selectedInitiativeIds.size || "—"} initiatives over 18 months.`
                : hrNow
                ? `The HR function is at ${hrNow}/10 against the ${hrTarget} needed for a ${bLevel?.label} ambition — this strategy closes the gap through ${selectedInitiativeIds.size || "—"} initiatives over 18 months.`
                : `This strategy defines how the HR function will build AI capability to ${bLevel?.label?.toLowerCase() ?? "progressive"} standards across ${selectedInitiativeIds.size || "—"} initiatives over 18 months.`
              }
            </p>
          )}

          {/* KPI tiles */}
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}
          >
            {[
              {
                label: "HR Capability Now",
                value: isLoading ? null : (hrNow ?? "—"),
                sub: "out of 10",
                color: "#94A3B8",
                delta: null,
              },
              {
                label: "Capability Target",
                value: isLoading ? null : hrTarget,
                sub: `${bLevel?.label ?? "—"} ambition`,
                color: "#94A3B8",
                delta: null,
              },
              {
                label: "Gap to Close",
                value: isLoading ? null : (hrGap != null && Number(hrGap) > 0 ? hrGap : "—"),
                sub: "points to close",
                color: "#FBBF24",
                delta: null,
              },
              {
                label: "Initiatives",
                value: isLoading ? null : String(selectedInitiativeIds.size || "—"),
                sub: "over 18 months",
                color: "#94A3B8",
                delta: null,
              },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-xl border border-white/8 bg-white/3 p-4 text-center">
                {kpi.value === null ? (
                  <Skeleton className="h-8 w-12 mx-auto mb-1 rounded" />
                ) : (
                  <p className="text-2xl sm:text-3xl font-bold mb-0.5" style={{ color: kpi.color }}>{kpi.value}</p>
                )}
                <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
                <p className="text-xs font-medium text-foreground mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══ SIX-CARD GRID ════════════════════════════════════════════════════ */}
        <div
          className="grid gap-[10px] mb-8"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
          role="list"
          aria-label="Strategy sections"
        >
          {SECTION_CARDS.map(card => {
            const data = cardData[card.id];
            const isCardLoading = isLoading || (card.id === "diagnostic" && ambitionGapQ.isLoading) || (card.id === "plan" && initiativesQ.isLoading);
            const isCardError = card.id === "diagnostic" && strategyQ.isError;

            if (isCardError) return <CardError key={card.id} title={card.title} />;
            if (isCardLoading) return <CardSkeleton key={card.id} />;

            return (
              <button
                key={card.id}
                role="listitem"
                onClick={() => {
                  trackCardClick(card.id);
                  navigate(card.slug);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    trackCardClick(card.id);
                    navigate(card.slug);
                  }
                }}
                aria-label={`View ${card.title} section`}
                className={`
                  rounded-2xl border ${card.accentBorder} ${card.accentBg}
                  p-5 flex flex-col gap-2 min-h-[220px] text-left
                  transition-all duration-150
                  hover:border-opacity-60 hover:bg-opacity-20 hover:shadow-lg hover:shadow-black/20
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1726]
                  cursor-pointer group
                `}
              >
                {/* Card header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${card.accent}20`, color: card.accent }}
                    >
                      {card.icon}
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {card.num}
                    </span>
                  </div>
                  <ChevronRight
                    className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-hidden="true"
                  />
                </div>

                {/* Title */}
                <p className="text-sm font-semibold text-foreground leading-snug">{card.title}</p>

                {/* Headline value */}
                <p className="text-base font-bold leading-tight" style={{ color: card.accent }}>
                  {data?.headline ?? "—"}
                </p>

                {/* Sub-text */}
                <p className="text-[11px] text-muted-foreground leading-relaxed flex-1">
                  {data?.sub ?? ""}
                </p>

                {/* Flag */}
                {data?.flag && (
                  <div className={`flex items-center gap-1.5 mt-1 ${
                    data.flag.type === "warning" ? "text-amber-400" : "text-blue-400"
                  }`}>
                    {data.flag.type === "warning"
                      ? <AlertTriangle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                      : <Info className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                    }
                    <span className="text-[10px] font-medium leading-tight">{data.flag.text}</span>
                  </div>
                )}

                {/* View link */}
                <div className="flex items-center gap-1 mt-auto pt-2 border-t border-white/6">
                  <span className="text-[11px] font-medium" style={{ color: card.accent }}>
                    View {card.title.toLowerCase()}
                  </span>
                  <ArrowRight className="w-3 h-3" style={{ color: card.accent }} aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>

        {/* ══ NEXT STEPS FOOTER ════════════════════════════════════════════════ */}
        <div className="rounded-2xl border border-white/8 bg-white/2 p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Next steps</p>
            <p className="text-sm text-foreground">Assign initiative owners and schedule your kickoff session.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 border-white/15 hover:border-white/30"
              onClick={() => {
                toast.info("Feature coming soon");
                (window as any).umami?.track("strategy_assign_owners_click");
              }}
            >
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Assign owners
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 border-white/15 hover:border-white/30"
              onClick={() => {
                toast.info("Feature coming soon");
                (window as any).umami?.track("strategy_schedule_kickoff_click");
              }}
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Schedule kickoff
            </Button>
          </div>
        </div>

      </div>
    </TooltipProvider>
  );
}
