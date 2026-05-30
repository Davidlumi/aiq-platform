/**
 * Reward Stage 1 Pre-work — 5-screen wizard
 *
 * Screen A: Reward Function Context (size integer, maturity 1-4, AI maturity 1-4, AI ambition 1-4)
 * Screen B: Reward Capability (pay equity, pay structure, gender pay gap, pension)
 * Screen C: Reward Landscape (comp data sources, AI tools, comp management platform, union coverage)
 * Screen D: Triggers & Direction (primary trigger, top 3 priorities with conditional options, strategic timeline)
 * Screen E: Existing Programmes (programmes to coexist with, conditional add-ons)
 *
 * QA fixes applied:
 * - All sliders 1–4 (not 1–5) with correct spec labels
 * - rewardFunctionSize is integer input (not slider)
 * - All dropdown options use schema v2 enum values
 * - Conditional logic based on Company Profile (not keyword matching):
 *   - ai_talent_retention_concern: criticalAiDigitalTalentPopulation ≠ none_or_minimal
 *   - recent_remuneration_vote_concerns: ownershipStructure is listed type
 *   - national_living_wage_exposure: workforceFrontlinePct ≥ 30
 * - Conditional priority options in top_reward_priorities based on Company Profile:
 *   - sales_comp_redesign: material_sales ≠ none_minimal
 *   - ai_talent_pay_strategy: critical_ai ≠ none_or_minimal
 *   - frontline_workforce_pay: frontline ≥ 20%
 *   - executive_comp_refresh: listed ownership
 * - AI maturity inconsistency warning (D5)
 * - Help text on every field
 */
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  ChevronRight, ChevronLeft, CheckCircle2, Loader2, Info,
  Building2, DollarSign, Globe, Target, Layers, AlertCircle, AlertTriangle,
} from "lucide-react";
import ReassessmentBanner from "@/components/ReassessmentBanner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ── Types ─────────────────────────────────────────────────────────────────────

type PreworkDraft = {
  // Block A
  rewardFunctionSize?: number;
  rewardFunctionMaturityRating?: number;
  aiMaturityInRewardToday?: number;
  rewardAiAmbition?: number;
  // Block B
  payEquityCapability?: string;
  payStructureMaturity?: string;
  ukGenderPayGapStatus?: string;
  pensionSchemeArchitecture?: string;
  // Block C
  externalCompDataSources?: string[];
  aiToolsCurrentlyInRewardUse?: string[];
  compManagementPlatform?: string;
  unionWorksCouncilCoverage?: string;
  // Block D
  primaryTriggerForRewardAiStrategy?: string;
  topRewardPrioritiesNext12Months?: string[];
  strategicTimeline?: string;
  // Block E
  existingProgrammesToCoexistWith?: string[];
  // Block F (conditional)
  aiTalentRetentionConcern?: string;
  recentRemunerationVoteConcerns?: string;
  nationalLivingWageExposure?: string;
};

// ── Option lists (schema v2 enum values) ──────────────────────────────────────

const PAY_EQUITY_OPTIONS: { value: string; label: string }[] = [
  { value: "none_no_capability", label: "No pay equity analysis in place" },
  { value: "ad_hoc_when_required", label: "Ad hoc analysis when required" },
  { value: "annual_structured_audit", label: "Annual structured audit" },
  { value: "continuous_monitoring", label: "Continuous monitoring with tooling" },
];

const PAY_STRUCTURE_OPTIONS: { value: string; label: string }[] = [
  { value: "informal_ranges_in_use", label: "Informal ranges in use" },
  { value: "formal_bands_not_refreshed_regularly", label: "Formal bands — not refreshed regularly" },
  { value: "formal_bands_actively_maintained", label: "Formal bands — actively maintained" },
  { value: "market_aligned_job_architecture", label: "Market-aligned job architecture" },
];

const GENDER_PAY_GAP_OPTIONS: { value: string; label: string }[] = [
  { value: "not_mandatory_below_threshold", label: "Not mandatory (below 250 UK employees)" },
  { value: "mandatory_basic_compliance", label: "Mandatory — basic compliance only" },
  { value: "mandatory_and_finding_it_hard", label: "Mandatory — finding it hard to close the gap" },
  { value: "mandatory_strong_progress", label: "Mandatory — strong progress with action plan" },
];

const PENSION_OPTIONS: { value: string; label: string }[] = [
  { value: "auto_enrolment_minimum", label: "Auto-enrolment minimum only" },
  { value: "enhanced_employer_contribution", label: "Enhanced employer contribution" },
  { value: "dc_only", label: "DC only (enhanced)" },
  { value: "dc_plus_db_closed_to_new_joiners", label: "DC + DB closed to new joiners" },
  { value: "db_open", label: "DB open to new joiners" },
  { value: "flexible_choice_architecture", label: "Flexible / choice architecture" },
  { value: "dont_know", label: "Don't know" },
];

const COMP_DATA_SOURCES: { value: string; label: string }[] = [
  { value: "mercer", label: "Mercer" },
  { value: "wtw_willis_towers_watson", label: "WTW / Willis Towers Watson" },
  { value: "korn_ferry", label: "Korn Ferry" },
  { value: "aon_radford_mclagan", label: "Aon / Radford / McLagan" },
  { value: "hay_group", label: "Hay Group" },
  { value: "xpert_hr", label: "XpertHR" },
  { value: "ravio", label: "Ravio" },
  { value: "pave", label: "Pave" },
  { value: "levels_fyi", label: "Levels.fyi" },
  { value: "glassdoor", label: "Glassdoor" },
  { value: "sector_specific_survey", label: "Sector-specific survey" },
  { value: "internal_benchmarking_only", label: "Internal benchmarking only" },
  { value: "peer_network_informal", label: "Peer network / informal" },
  { value: "none_no_external_data", label: "None — no external data" },
];

const AI_TOOLS_IN_REWARD: { value: string; label: string }[] = [
  { value: "beqom", label: "Beqom" },
  { value: "workday_compensation_ai", label: "Workday Compensation AI" },
  { value: "microsoft_copilot", label: "Microsoft Copilot" },
  { value: "claude_anthropic", label: "Claude (Anthropic)" },
  { value: "chatgpt_openai", label: "ChatGPT / OpenAI" },
  { value: "pave", label: "Pave" },
  { value: "figures", label: "Figures" },
  { value: "custom_bespoke_ai", label: "Custom / bespoke AI" },
  { value: "none_no_ai_yet", label: "None — no AI tools yet" },
];

const COMP_PLATFORMS: { value: string; label: string }[] = [
  { value: "hris_native_module", label: "HRIS native compensation module" },
  { value: "beqom", label: "Beqom" },
  { value: "lattice_compensation", label: "Lattice Compensation" },
  { value: "pave", label: "Pave" },
  { value: "figures", label: "Figures" },
  { value: "spreadsheets_excel", label: "Spreadsheets / Excel" },
  { value: "none_no_platform", label: "None / no dedicated platform" },
];

const UNION_OPTIONS: { value: string; label: string }[] = [
  { value: "none_non_unionised", label: "None — non-unionised" },
  { value: "union_recognition_limited", label: "Union recognition — limited scope" },
  { value: "significant_coverage_most_groups", label: "Significant coverage — most groups" },
  { value: "dont_know", label: "Don't know" },
];

const TRIGGER_OPTIONS: { value: string; label: string }[] = [
  { value: "pay_equity_audit_findings", label: "Pay equity audit findings" },
  { value: "gender_pay_gap_pressure", label: "Gender pay gap reporting pressure" },
  { value: "eu_pay_transparency_directive", label: "EU Pay Transparency Directive compliance" },
  { value: "fca_sysc19_review", label: "FCA SYSC 19 remuneration review" },
  { value: "remuneration_committee_board_ask", label: "Remuneration committee / board ask" },
  { value: "talent_retention_attraction", label: "Talent retention / attraction challenge" },
  { value: "cost_pressure_or_efficiency_drive", label: "Cost pressure or efficiency drive" },
  { value: "digital_transformation_programme", label: "Digital transformation programme" },
  { value: "leadership_or_board_ask", label: "New CHRO / CPO agenda or leadership ask" },
  { value: "proactive_strategic_transformation", label: "Proactive strategic transformation" },
];

const TIMELINE_OPTIONS: { value: string; label: string }[] = [
  { value: "next_12_months", label: "Next 12 months" },
  { value: "next_24_months", label: "Next 24 months" },
  { value: "next_36_months", label: "Next 36 months" },
  { value: "transformational_3_plus", label: "Transformational (3+ years)" },
];

const EXISTING_PROGRAMMES: { value: string; label: string }[] = [
  { value: "active_pay_equity_remediation", label: "Active pay equity remediation programme" },
  { value: "gender_pay_gap_action_plan", label: "Gender pay gap action plan in flight" },
  { value: "job_architecture_grading_project", label: "Job architecture / grading project" },
  { value: "total_reward_review", label: "Total reward review underway" },
  { value: "benefits_platform_migration", label: "Benefits platform migration" },
  { value: "hris_implementation_upgrade", label: "HRIS implementation / upgrade" },
  { value: "comp_benchmarking_refresh", label: "Compensation benchmarking refresh" },
  { value: "remuneration_policy_review", label: "Remuneration policy review" },
  { value: "none_clean_slate", label: "None — clean slate" },
];

const AI_TALENT_CONCERN_OPTIONS: { value: string; label: string }[] = [
  { value: "low_concern", label: "Low concern — talent is stable" },
  { value: "moderate_concern", label: "Moderate concern — some attrition risk" },
  { value: "high_concern_active_risk", label: "High concern — active retention risk" },
  { value: "critical_losing_talent_now", label: "Critical — losing key AI talent now" },
];

const REMUNERATION_VOTE_OPTIONS: { value: string; label: string }[] = [
  { value: "no_concerns_strong_support", label: "No concerns — strong vote support" },
  { value: "some_concerns_advisory_below_80", label: "Some concerns — advisory vote below 80%" },
  { value: "significant_concerns_below_70", label: "Significant concerns — vote below 70%" },
  { value: "under_review_uncertain", label: "Under review / uncertain" },
];

const NLW_EXPOSURE_OPTIONS: { value: string; label: string }[] = [
  { value: "below_5_pct", label: "Below 5% of workforce at or near NLW" },
  { value: "5_to_15_pct", label: "5–15% of workforce at or near NLW" },
  { value: "15_to_30_pct", label: "15–30% of workforce at or near NLW" },
  { value: "above_30_pct", label: "Above 30% of workforce at or near NLW" },
];

// Base priority options (always shown)
const BASE_PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: "modernise_comp_decisions", label: "Modernise compensation decision-making" },
  { value: "fix_pay_equity_gaps", label: "Fix pay equity gaps" },
  { value: "modernise_pay_bands_and_architecture", label: "Modernise pay bands and job architecture" },
  { value: "automate_gender_pay_reporting", label: "Automate gender pay gap reporting" },
  { value: "eu_pay_transparency_compliance", label: "EU Pay Transparency Directive compliance" },
  { value: "build_total_reward_portal", label: "Build total reward portal" },
  { value: "reward_team_productivity", label: "Improve reward team productivity with AI" },
  { value: "build_reward_analytics_dashboard", label: "Build reward analytics dashboard" },
  { value: "pay_for_performance_modelling", label: "Pay-for-performance modelling" },
];

// Conditional priority options (shown based on Company Profile)
const CONDITIONAL_PRIORITY_OPTIONS: {
  value: string;
  label: string;
  condition: string; // description of when it appears
}[] = [
  { value: "sales_comp_redesign", label: "Sales compensation redesign", condition: "material_sales" },
  { value: "ai_talent_pay_strategy", label: "AI talent pay strategy", condition: "critical_ai" },
  { value: "frontline_workforce_pay", label: "Frontline workforce pay strategy", condition: "frontline_20" },
  { value: "executive_comp_refresh", label: "Executive compensation refresh", condition: "listed" },
];

const LISTED_OWNERSHIP_VALUES = new Set([
  "ftse_100_listed", "ftse_250_listed", "aim_listed", "other_listed", "subsidiary_listed_group",
]);

// ── Slider with label (1–4 scale) ─────────────────────────────────────────────

function RatingSlider({
  label,
  value,
  onChange,
  hint,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  lowLabel?: string;
  highLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{hint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <Badge variant="outline" className="ml-auto text-xs font-mono">{value}/4</Badge>
      </div>
      <Slider
        min={1}
        max={4}
        step={1}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
      />
      {(lowLabel || highLabel) && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}

// ── Multi-select checkbox group ───────────────────────────────────────────────

function MultiCheckGroup({
  options,
  selected,
  onChange,
  maxSelect,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  maxSelect?: number;
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      if (maxSelect && selected.length >= maxSelect) return;
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map(({ value: opt, label }) => {
        const checked = selected.includes(opt);
        const disabled = !checked && !!maxSelect && selected.length >= maxSelect;
        return (
          <label
            key={opt}
            className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
              checked
                ? "bg-primary/8 border-primary/40 text-foreground"
                : disabled
                ? "opacity-40 cursor-not-allowed border-border"
                : "border-border hover:bg-muted/50"
            }`}
          >
            <Checkbox
              checked={checked}
              disabled={disabled}
              onCheckedChange={() => toggle(opt)}
              className="mt-0.5 shrink-0"
            />
            <span>{label}</span>
          </label>
        );
      })}
    </div>
  );
}

// ── Company Profile banner ────────────────────────────────────────────────────

function CompanyProfileBanner() {
  const { data: profile } = trpc.companyProfile.get.useQuery();

  if (!profile) return null;

  const isCompleted = profile.isCompleted === 1;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
      isCompleted
        ? "bg-emerald-500/8 border-emerald-500/20"
        : "bg-amber-500/8 border-amber-500/20"
    }`}>
      <Building2 className={`h-4 w-4 mt-0.5 shrink-0 ${isCompleted ? "text-emerald-500" : "text-amber-500"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{profile.companyName ?? "Company"}</span>
          {profile.sector && <Badge variant="outline" className="text-xs">{profile.sector}</Badge>}
          {profile.headcount && (
            <Badge variant="outline" className="text-xs">{profile.headcount.toLocaleString()} employees</Badge>
          )}
          {!isCompleted && (
            <Badge className="text-xs bg-amber-500/15 text-amber-600 border-amber-500/30">
              Profile incomplete
            </Badge>
          )}
        </div>
        {profile.geographicFootprint && (
          <p className="text-xs text-muted-foreground mt-0.5">{profile.geographicFootprint}</p>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RewardPreworkPage() {
  const [, navigate] = useLocation();
  const [screen, setScreen] = useState<"A" | "B" | "C" | "D" | "E">("A");

  const { data: prework, refetch } = trpc.rewardPrework.get.useQuery();
  const { data: companyProfile } = trpc.companyProfile.get.useQuery();
  // F1a fix: use getStatus to know if company profile gate is met before attempting complete
  const { data: preworkStatus } = trpc.rewardPrework.getStatus.useQuery();
  const canComplete = preworkStatus?.canStart ?? false;
  const [draft, setDraft] = useState<PreworkDraft>({});
  const [draftInit, setDraftInit] = useState(false);

  if (prework && !draftInit) {
    setDraft({
      rewardFunctionSize: prework.rewardFunctionSize ?? undefined,
      rewardFunctionMaturityRating: prework.rewardFunctionMaturityRating ?? 2,
      aiMaturityInRewardToday: prework.aiMaturityInRewardToday ?? 1,
      rewardAiAmbition: prework.rewardAiAmbition ?? 2,
      payEquityCapability: prework.payEquityCapability ?? undefined,
      payStructureMaturity: prework.payStructureMaturity ?? undefined,
      ukGenderPayGapStatus: prework.ukGenderPayGapStatus ?? undefined,
      pensionSchemeArchitecture: prework.pensionSchemeArchitecture ?? undefined,
      externalCompDataSources: prework.externalCompDataSources ?? [],
      aiToolsCurrentlyInRewardUse: prework.aiToolsCurrentlyInRewardUse ?? [],
      compManagementPlatform: prework.compManagementPlatform ?? undefined,
      unionWorksCouncilCoverage: prework.unionWorksCouncilCoverage ?? undefined,
      primaryTriggerForRewardAiStrategy: prework.primaryTriggerForRewardAiStrategy ?? undefined,
      topRewardPrioritiesNext12Months: prework.topRewardPrioritiesNext12Months ?? [],
      strategicTimeline: prework.strategicTimeline ?? undefined,
      existingProgrammesToCoexistWith: prework.existingProgrammesToCoexistWith ?? [],
      aiTalentRetentionConcern: prework.aiTalentRetentionConcern ?? undefined,
      recentRemunerationVoteConcerns: prework.recentRemunerationVoteConcerns ?? undefined,
      nationalLivingWageExposure: prework.nationalLivingWageExposure ?? undefined,
    });
    setDraftInit(true);
  }

  const saveMutation = trpc.rewardPrework.save.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error("Save failed: " + String(e.message)),
  });

  const completeMutation = trpc.rewardPrework.complete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Stage 1 Pre-work complete. Proceeding to Stage 2 — Vision.");
      // F1c fix: navigate to Stage 2 after successful completion
      setTimeout(() => navigate("/strategy/reward-vision"), 800);
    },
    onError: (e) => {
      // F1b fix: if company profile gate blocks completion, redirect to admin profile page
      if (String(e.message).includes("Company Profile must be completed")) {
        toast.error("Company Profile must be completed first.", { duration: 5000 });
        setTimeout(() => navigate("/company-profile"), 1200);
      } else {
        toast.error("Cannot complete: " + String(e.message));
      }
    },
  });

  const autosave = useCallback(
    (patch: Partial<PreworkDraft>) => {
      saveMutation.mutate(patch);
    },
    [saveMutation]
  );

  const updateField = <K extends keyof PreworkDraft>(key: K, value: PreworkDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    autosave({ [key]: value });
  };

  const isCompleted = prework?.isCompleted === 1;

  // ── Conditional field visibility based on Company Profile ──────────────────

  const criticalAiTalent = companyProfile?.criticalAiDigitalTalentPopulation;
  const ownershipStructure = companyProfile?.ownershipStructure;
  const frontlinePct = companyProfile?.workforceFrontlinePct ?? 0;
  const materialSales = companyProfile?.materialSalesWorkforce;

  // Block F conditional fields
  const showAiTalentConcern =
    !!criticalAiTalent && criticalAiTalent !== "none_or_minimal";

  const showRemunerationVote =
    !!ownershipStructure && LISTED_OWNERSHIP_VALUES.has(ownershipStructure);

  const showNlwExposure = frontlinePct >= 30;

  // Conditional priority options
  const showSalesCompPriority =
    !!materialSales && materialSales !== "none_minimal";

  const showAiTalentPriority =
    !!criticalAiTalent && criticalAiTalent !== "none_or_minimal";

  const showFrontlinePayPriority = frontlinePct >= 20;

  const showExecCompPriority =
    !!ownershipStructure && LISTED_OWNERSHIP_VALUES.has(ownershipStructure);

  // Build the full priority options list
  const activePriorityOptions = [
    ...BASE_PRIORITY_OPTIONS,
    ...(showSalesCompPriority
      ? [CONDITIONAL_PRIORITY_OPTIONS.find((o) => o.value === "sales_comp_redesign")!]
      : []),
    ...(showAiTalentPriority
      ? [CONDITIONAL_PRIORITY_OPTIONS.find((o) => o.value === "ai_talent_pay_strategy")!]
      : []),
    ...(showFrontlinePayPriority
      ? [CONDITIONAL_PRIORITY_OPTIONS.find((o) => o.value === "frontline_workforce_pay")!]
      : []),
    ...(showExecCompPriority
      ? [CONDITIONAL_PRIORITY_OPTIONS.find((o) => o.value === "executive_comp_refresh")!]
      : []),
  ].filter(Boolean) as { value: string; label: string }[];

  // D5: AI maturity inconsistency warning
  const aiMaturityHigh = (draft.aiMaturityInRewardToday ?? 1) >= 3;
  const aiToolsNone =
    (draft.aiToolsCurrentlyInRewardUse ?? []).includes("none_no_ai_yet") &&
    (draft.aiToolsCurrentlyInRewardUse ?? []).length === 1;
  const showAiMaturityWarning = aiMaturityHigh && aiToolsNone;

  const SCREENS = [
    { id: "A" as const, label: "Function Context", icon: Building2 },
    { id: "B" as const, label: "Capability", icon: DollarSign },
    { id: "C" as const, label: "Landscape", icon: Globe },
    { id: "D" as const, label: "Triggers & Direction", icon: Target },
    { id: "E" as const, label: "Programmes", icon: Layers },
  ];

  const screenIndex = SCREENS.findIndex((s) => s.id === screen);

  const goNext = () => {
    const next = SCREENS[screenIndex + 1];
    if (next) setScreen(next.id);
  };

  const goPrev = () => {
    const prev = SCREENS[screenIndex - 1];
    if (prev) setScreen(prev.id);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Back navigation */}
      <button
        onClick={() => navigate("/strategy")}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Strategy Overview
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Reward Strategy Pre-work</h1>
            {isCompleted && (
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Stage 1 of 10 — Reward function context for your AI strategy builder
          </p>
        </div>
        {screen === "E" && !isCompleted && (
          <Button
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            size="sm"
            className="shrink-0"
          >
            {completeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Complete Stage 1
          </Button>
        )}
      </div>

      {/* Company Profile banner */}
      <CompanyProfileBanner />

      {/* F1a fix: gate alert when company profile is not yet completed */}
      {!canComplete && !isCompleted && (
        <div className="flex items-start gap-3 p-3 rounded-lg border bg-amber-500/8 border-amber-500/20 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-amber-700 dark:text-amber-400">Company Profile required before completing Stage 1</p>
            <p className="text-xs text-muted-foreground mt-0.5">An admin must complete the Company Profile before Reward Pre-work can be finalised.</p>
            <button
              onClick={() => navigate("/company-profile")}
              className="text-xs text-amber-600 hover:text-amber-700 underline mt-1"
            >
              Go to Company Profile &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Reassessment banner */}
      {prework && (prework.reassessmentCount ?? 0) > 0 && !isCompleted && (
        <ReassessmentBanner
          reassessmentCount={prework.reassessmentCount ?? 0}
          isInReassessment={!isCompleted}
          onReassessmentStarted={() => refetch()}
        />
      )}

      {/* Screen progress */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {SCREENS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setScreen(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                screen === s.id
                  ? "bg-primary text-primary-foreground"
                  : i < screenIndex
                  ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {i < screenIndex ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <s.icon className="h-3.5 w-3.5" />
              )}
              <span className={screen === s.id ? "" : "hidden sm:inline"}>{s.label}</span>
            </button>
            {i < SCREENS.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Screen A: Reward Function Context */}
      {screen === "A" && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Reward Function Context
            </CardTitle>
            <CardDescription>Size, maturity, and AI ambition of your Reward function</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Team size — integer input */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Reward Function Size (FTE)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Total full-time equivalent headcount in the Reward function, including any shared-service or centre-of-excellence roles. Enter 1 if you are a solo Reward leader.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                type="number"
                value={draft.rewardFunctionSize ?? ""}
                onChange={(e) => updateField("rewardFunctionSize", e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g. 8"
                min={0}
                max={500}
                className="max-w-[160px]"
              />
            </div>

            <RatingSlider
              label="Reward Function Maturity"
              value={draft.rewardFunctionMaturityRating ?? 2}
              onChange={(v) => updateField("rewardFunctionMaturityRating", v)}
              hint="Overall maturity of Reward processes, governance, and tooling. 1 = ad hoc and reactive; 4 = leading, data-driven, and predictive."
              lowLabel="Ad hoc / reactive"
              highLabel="Leading / predictive"
            />
            <RatingSlider
              label="AI Maturity in Reward Today"
              value={draft.aiMaturityInRewardToday ?? 1}
              onChange={(v) => updateField("aiMaturityInRewardToday", v)}
              hint="Current level of AI and automation use within Reward processes. 1 = no AI in use; 4 = AI is embedded across most Reward workflows."
              lowLabel="No AI in use"
              highLabel="AI embedded in workflows"
            />
            <RatingSlider
              label="Reward AI Ambition"
              value={draft.rewardAiAmbition ?? 2}
              onChange={(v) => updateField("rewardAiAmbition", v)}
              hint="How ambitious do you want to be with AI in Reward over the next 2–3 years? 1 = cautious, compliance-focused; 4 = transformative, AI-native Reward function."
              lowLabel="Cautious / compliance focus"
              highLabel="Transformative / AI-native"
            />
            <div className="flex justify-end pt-2">
              <Button onClick={goNext} size="sm">
                Next: Capability <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Screen B: Reward Capability */}
      {screen === "B" && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Reward Capability
            </CardTitle>
            <CardDescription>Current state of key Reward capabilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Pay Equity Capability</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        How frequently and rigorously does the organisation analyse pay equity across gender, ethnicity, and other protected characteristics?
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select
                  value={draft.payEquityCapability ?? ""}
                  onValueChange={(v) => updateField("payEquityCapability", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select current state" /></SelectTrigger>
                  <SelectContent>
                    {PAY_EQUITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Pay Structure Maturity</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        How well-defined and maintained are your pay bands, grades, and job architecture? This affects which pay structure modernisation initiatives are most relevant.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select
                  value={draft.payStructureMaturity ?? ""}
                  onValueChange={(v) => updateField("payStructureMaturity", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select current state" /></SelectTrigger>
                  <SelectContent>
                    {PAY_STRUCTURE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">UK Gender Pay Gap Status</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        UK employers with 250+ UK employees must report their gender pay gap annually. Select the option that best describes your current position.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select
                  value={draft.ukGenderPayGapStatus ?? ""}
                  onValueChange={(v) => updateField("ukGenderPayGapStatus", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select current state" /></SelectTrigger>
                  <SelectContent>
                    {GENDER_PAY_GAP_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Pension Scheme Architecture</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        The type of pension provision offered. Relevant for total reward modelling and benefits platform initiatives.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select
                  value={draft.pensionSchemeArchitecture ?? ""}
                  onValueChange={(v) => updateField("pensionSchemeArchitecture", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select current state" /></SelectTrigger>
                  <SelectContent>
                    {PENSION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={goPrev} size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={goNext} size="sm">
                Next: Landscape <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Screen C: Reward Landscape */}
      {screen === "C" && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Reward Landscape
            </CardTitle>
            <CardDescription>External data sources, AI tools, and platform landscape</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">External Compensation Data Sources</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Which external salary surveys and benchmarking data sources does the Reward function currently use? Select all that apply.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground">Select all that apply</p>
              <MultiCheckGroup
                options={COMP_DATA_SOURCES}
                selected={draft.externalCompDataSources ?? []}
                onChange={(v) => updateField("externalCompDataSources", v)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">AI Tools Currently in Reward Use</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Which AI or automation tools does the Reward team currently use in their day-to-day work? Select all that apply.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground">Select all that apply</p>
              <MultiCheckGroup
                options={AI_TOOLS_IN_REWARD}
                selected={draft.aiToolsCurrentlyInRewardUse ?? []}
                onChange={(v) => updateField("aiToolsCurrentlyInRewardUse", v)}
              />
            </div>

            {/* D5: AI maturity inconsistency warning */}
            {showAiMaturityWarning && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-amber-700 dark:text-amber-400 text-xs">
                  You have rated AI maturity as Building or Scaling (level {draft.aiMaturityInRewardToday}/4) but selected "No AI tools yet". Please review — either update your AI maturity rating on Screen A or add the tools you are using.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Compensation Management Platform</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        The primary platform used to manage compensation cycles, merit reviews, and bonus calculations. This affects which automation and integration initiatives are feasible.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select
                  value={draft.compManagementPlatform ?? ""}
                  onValueChange={(v) => updateField("compManagementPlatform", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>
                    {COMP_PLATFORMS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Union / Works Council Coverage</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        The extent of trade union recognition or works council involvement in pay-setting. This affects the pace and approach of pay structure changes.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select
                  value={draft.unionWorksCouncilCoverage ?? ""}
                  onValueChange={(v) => updateField("unionWorksCouncilCoverage", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select coverage" /></SelectTrigger>
                  <SelectContent>
                    {UNION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={goPrev} size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={goNext} size="sm">
                Next: Triggers & Direction <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Screen D: Triggers & Direction */}
      {screen === "D" && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Triggers & Direction
            </CardTitle>
            <CardDescription>What is driving your Reward AI strategy and where are you heading?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Primary Trigger for Reward AI Strategy</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      The single most important reason the Reward function is investing in AI strategy now. This shapes the framing and urgency of your recommended initiatives.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={draft.primaryTriggerForRewardAiStrategy ?? ""}
                onValueChange={(v) => updateField("primaryTriggerForRewardAiStrategy", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select primary trigger" /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Top Reward Priorities (next 12 months)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Select up to 3 priorities. These directly shape which initiatives appear in your recommended shortlist. Some options appear based on your Company Profile (sales workforce, AI talent population, frontline %, ownership structure).
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Badge variant="outline" className="text-xs ml-auto">
                  {(draft.topRewardPrioritiesNext12Months ?? []).length}/3 selected
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-primary/5 border border-primary/15 text-xs text-primary">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Select up to 3 priorities — these will shape your initiative shortlist
              </div>
              {(showSalesCompPriority || showAiTalentPriority || showFrontlinePayPriority || showExecCompPriority) && (
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/8 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Additional options have been added based on your Company Profile
                </div>
              )}
              <MultiCheckGroup
                options={activePriorityOptions}
                selected={draft.topRewardPrioritiesNext12Months ?? []}
                onChange={(v) => updateField("topRewardPrioritiesNext12Months", v)}
                maxSelect={3}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Strategic Timeline</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      The planning horizon for your Reward AI strategy. This determines the phasing and sequencing of recommended initiatives.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={draft.strategicTimeline ?? ""}
                onValueChange={(v) => updateField("strategicTimeline", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                <SelectContent>
                  {TIMELINE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={goPrev} size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={goNext} size="sm">
                Next: Programmes <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Screen E: Existing Programmes + Conditional Add-ons */}
      {screen === "E" && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Existing Programmes
            </CardTitle>
            <CardDescription>Programmes already in flight that your AI strategy must work alongside</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Programmes to Coexist With</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Select any active programmes that your AI strategy must work alongside or avoid duplicating. This is optional — leave blank if starting from scratch.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground">Select all that apply (optional)</p>
              <MultiCheckGroup
                options={EXISTING_PROGRAMMES}
                selected={draft.existingProgrammesToCoexistWith ?? []}
                onChange={(v) => updateField("existingProgrammesToCoexistWith", v)}
              />
            </div>

            {/* Conditional add-ons (Block F) — based on Company Profile */}
            {(showAiTalentConcern || showRemunerationVote || showNlwExposure) && (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  Additional questions based on your Company Profile
                </div>

                {showAiTalentConcern && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">AI / Digital Talent Retention Concern</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            Shown because your Company Profile indicates a material AI/digital talent population. How concerned is the organisation about retaining this talent?
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select
                      value={draft.aiTalentRetentionConcern ?? ""}
                      onValueChange={(v) => updateField("aiTalentRetentionConcern", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select level of concern" /></SelectTrigger>
                      <SelectContent>
                        {AI_TALENT_CONCERN_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {showRemunerationVote && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Recent Remuneration Vote Concerns</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            Shown because your Company Profile indicates a listed company. Have there been any concerns with shareholder votes on the remuneration report in the past two years?
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select
                      value={draft.recentRemunerationVoteConcerns ?? ""}
                      onValueChange={(v) => updateField("recentRemunerationVoteConcerns", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {REMUNERATION_VOTE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {showNlwExposure && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">National Living Wage Exposure</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            Shown because your Company Profile indicates 30%+ frontline workforce. What proportion of your workforce is paid at or near the National Living Wage?
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select
                      value={draft.nationalLivingWageExposure ?? ""}
                      onValueChange={(v) => updateField("nationalLivingWageExposure", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select exposure level" /></SelectTrigger>
                      <SelectContent>
                        {NLW_EXPOSURE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={goPrev} size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending || isCompleted}
                size="sm"
              >
                {completeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                {isCompleted ? "Completed" : "Complete Stage 1"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
