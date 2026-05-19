/**
 * Reward Stage 1 Pre-work — 5-screen wizard
 *
 * Screen A: Reward Function Context (size, maturity, AI maturity, AI ambition sliders)
 * Screen B: Reward Capability (pay equity, pay structure, gender pay gap, pension)
 * Screen C: Reward Landscape (comp data sources, AI tools, comp management platform, union coverage)
 * Screen D: Triggers & Direction (primary trigger, top 3 priorities, strategic timeline)
 * Screen E: Existing Programmes (programmes to coexist with, conditional add-ons)
 *
 * Features:
 * - Max-3 priority selector for Block D
 * - Conditional add-on fields (Block F) based on Block D selections
 * - Autosave on change for all fields
 * - Company Profile read-only summary banner (shows shared org facts)
 * - Re-assessment mode with diff highlighting
 */
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  ChevronRight, ChevronLeft, CheckCircle2, Loader2, Info,
  Building2, DollarSign, Globe, Target, Layers, AlertCircle,
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
  // Block F
  aiTalentRetentionConcern?: string;
  recentRemunerationVoteConcerns?: string;
  nationalLivingWageExposure?: string;
};

// ── Option lists ──────────────────────────────────────────────────────────────

const PAY_EQUITY_OPTIONS = [
  "No formal pay equity analysis", "Annual analysis, manual process",
  "Annual analysis, automated", "Continuous monitoring", "Real-time AI-driven monitoring",
];

const PAY_STRUCTURE_OPTIONS = [
  "No formal pay structure", "Informal bands / ranges",
  "Formal job families with ranges", "Market-aligned job architecture",
  "AI-assisted dynamic pay ranges",
];

const GENDER_PAY_GAP_OPTIONS = [
  "Not applicable (< 250 UK employees)", "Compliant — basic reporting only",
  "Compliant + narrative action plan", "Advanced — pay gap analytics in use",
  "Market-leading — real-time gap monitoring",
];

const PENSION_OPTIONS = [
  "Statutory minimum (auto-enrolment only)", "Enhanced employer contribution",
  "Defined benefit (legacy)", "Hybrid DB/DC", "Flexible / choice architecture",
];

const COMP_DATA_SOURCES = [
  "Willis Towers Watson", "Mercer", "Korn Ferry", "Radford / Aon",
  "Hay Group", "XpertHR", "Glassdoor / Levels.fyi", "Internal benchmarking only",
  "Peer network / informal", "Other",
];

const AI_TOOLS_IN_REWARD = [
  "Beqom", "Workday Compensation AI", "SAP SuccessFactors Compensation",
  "Lattice Compensation", "Pave", "Figures", "CompTool", "Custom / bespoke AI",
  "None currently", "Exploring options",
];

const COMP_PLATFORMS = [
  "Beqom", "Workday Compensation", "SAP SuccessFactors Compensation",
  "Oracle HCM Compensation", "Lattice", "Pave", "Figures",
  "Spreadsheets / manual", "Custom / bespoke", "None", "Other",
];

const UNION_OPTIONS = [
  "No union / works council", "Union recognition, limited scope",
  "Union recognition, pay negotiated", "Works council (EU)",
  "Multiple unions / complex landscape",
];

const TRIGGER_OPTIONS = [
  "Pay equity audit findings", "Gender pay gap reporting pressure",
  "EU Pay Transparency Directive compliance", "FCA SYSC 19 remuneration review",
  "Remuneration committee / board pressure", "Talent retention / attraction challenge",
  "Cost reduction / efficiency mandate", "Digital transformation programme",
  "New CHRO / CPO agenda", "M&A integration", "Other",
];

const PRIORITY_OPTIONS = [
  "Automate pay equity analysis", "Implement AI-assisted job architecture",
  "Build real-time compensation benchmarking", "Automate gender pay gap reporting",
  "Implement EU Pay Transparency Directive compliance tooling",
  "Build total reward statements / portal", "Implement flexible benefits platform",
  "Automate bonus / incentive calculations", "Build pay range transparency",
  "Implement AI-driven retention risk alerts", "Automate remuneration committee reporting",
  "Build reward analytics dashboard", "Implement pay-for-performance modelling",
  "Automate NLW / NMW compliance monitoring",
];

const TIMELINE_OPTIONS = [
  "Quick wins only (< 6 months)", "Short-term (6–12 months)",
  "Medium-term (1–2 years)", "Long-term (2–3 years)", "Transformational (3+ years)",
];

const EXISTING_PROGRAMMES = [
  "Active pay equity remediation programme", "Gender pay gap action plan in flight",
  "Job architecture / grading project", "Total reward review underway",
  "Benefits platform migration", "HRIS implementation / upgrade",
  "Compensation benchmarking refresh", "Remuneration policy review",
  "None — clean slate",
];

const AI_TALENT_CONCERN_OPTIONS = [
  "Not a concern", "Low concern", "Moderate concern",
  "High concern — active retention risk", "Critical — losing key AI talent now",
];

const REMUNERATION_VOTE_OPTIONS = [
  "Not applicable (not listed)", "No concerns — strong vote support",
  "Some concerns — advisory vote < 80%", "Significant concerns — vote < 70%",
  "Under review / uncertain",
];

const NLW_EXPOSURE_OPTIONS = [
  "Not applicable", "< 5% of workforce at or near NLW",
  "5–15% of workforce at or near NLW", "15–30% of workforce at or near NLW",
  "> 30% of workforce at or near NLW",
];

// ── Slider with label ─────────────────────────────────────────────────────────

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
        <Badge variant="outline" className="ml-auto text-xs font-mono">{value}/5</Badge>
      </div>
      <Slider
        min={1}
        max={5}
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
  options: string[];
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
      {options.map((opt) => {
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
            <span>{opt}</span>
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
  const [screen, setScreen] = useState<"A" | "B" | "C" | "D" | "E">("A");

  const { data: prework, refetch } = trpc.rewardPrework.get.useQuery();
  const [draft, setDraft] = useState<PreworkDraft>({});
  const [draftInit, setDraftInit] = useState(false);

  if (prework && !draftInit) {
    setDraft({
      rewardFunctionSize: prework.rewardFunctionSize ?? 3,
      rewardFunctionMaturityRating: prework.rewardFunctionMaturityRating ?? 2,
      aiMaturityInRewardToday: prework.aiMaturityInRewardToday ?? 1,
      rewardAiAmbition: prework.rewardAiAmbition ?? 3,
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
      toast.success("Stage 1 Pre-work complete: Proceeding to Stage 2 — Peer Vision.");
    },
    onError: (e) => toast.error("Cannot complete: " + String(e.message)),
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

  // Conditional add-ons in Block F
  const showAiTalentConcern =
    (draft.topRewardPrioritiesNext12Months ?? []).some((p) =>
      p.toLowerCase().includes("retention")
    ) ||
    (draft.primaryTriggerForRewardAiStrategy ?? "").toLowerCase().includes("talent");

  const showRemunerationVote =
    (draft.primaryTriggerForRewardAiStrategy ?? "").toLowerCase().includes("remuneration");

  const showNlwExposure =
    (draft.topRewardPrioritiesNext12Months ?? []).some((p) =>
      p.toLowerCase().includes("nlw") || p.toLowerCase().includes("national living")
    );

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

      {/* Reassessment banner — shown when Company Profile changed after pre-work was completed */}
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
              {s.label}
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
            <RatingSlider
              label="Reward Function Size"
              value={draft.rewardFunctionSize ?? 3}
              onChange={(v) => updateField("rewardFunctionSize", v)}
              hint="Relative size of the Reward function within your HR team"
              lowLabel="Very small (1–2 FTE)"
              highLabel="Large (15+ FTE)"
            />
            <RatingSlider
              label="Reward Function Maturity"
              value={draft.rewardFunctionMaturityRating ?? 2}
              onChange={(v) => updateField("rewardFunctionMaturityRating", v)}
              hint="Overall maturity of Reward processes, governance, and tooling"
              lowLabel="Ad hoc / reactive"
              highLabel="Leading / predictive"
            />
            <RatingSlider
              label="AI Maturity in Reward Today"
              value={draft.aiMaturityInRewardToday ?? 1}
              onChange={(v) => updateField("aiMaturityInRewardToday", v)}
              hint="Current level of AI/automation use within Reward processes"
              lowLabel="No AI in use"
              highLabel="AI-native Reward function"
            />
            <RatingSlider
              label="Reward AI Ambition"
              value={draft.rewardAiAmbition ?? 3}
              onChange={(v) => updateField("rewardAiAmbition", v)}
              hint="How ambitious do you want to be with AI in Reward over the next 2–3 years?"
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
                <Label className="text-sm font-medium">Pay Equity Capability</Label>
                <Select
                  value={draft.payEquityCapability ?? ""}
                  onValueChange={(v) => updateField("payEquityCapability", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select current state" /></SelectTrigger>
                  <SelectContent>
                    {PAY_EQUITY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Pay Structure Maturity</Label>
                <Select
                  value={draft.payStructureMaturity ?? ""}
                  onValueChange={(v) => updateField("payStructureMaturity", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select current state" /></SelectTrigger>
                  <SelectContent>
                    {PAY_STRUCTURE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">UK Gender Pay Gap Status</Label>
                <Select
                  value={draft.ukGenderPayGapStatus ?? ""}
                  onValueChange={(v) => updateField("ukGenderPayGapStatus", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select current state" /></SelectTrigger>
                  <SelectContent>
                    {GENDER_PAY_GAP_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Pension Scheme Architecture</Label>
                <Select
                  value={draft.pensionSchemeArchitecture ?? ""}
                  onValueChange={(v) => updateField("pensionSchemeArchitecture", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select current state" /></SelectTrigger>
                  <SelectContent>
                    {PENSION_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
              <Label className="text-sm font-medium">External Compensation Data Sources</Label>
              <p className="text-xs text-muted-foreground">Select all that apply</p>
              <MultiCheckGroup
                options={COMP_DATA_SOURCES}
                selected={draft.externalCompDataSources ?? []}
                onChange={(v) => updateField("externalCompDataSources", v)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">AI Tools Currently in Reward Use</Label>
              <p className="text-xs text-muted-foreground">Select all that apply</p>
              <MultiCheckGroup
                options={AI_TOOLS_IN_REWARD}
                selected={draft.aiToolsCurrentlyInRewardUse ?? []}
                onChange={(v) => updateField("aiToolsCurrentlyInRewardUse", v)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Compensation Management Platform</Label>
                <Select
                  value={draft.compManagementPlatform ?? ""}
                  onValueChange={(v) => updateField("compManagementPlatform", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>
                    {COMP_PLATFORMS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Union / Works Council Coverage</Label>
                <Select
                  value={draft.unionWorksCouncilCoverage ?? ""}
                  onValueChange={(v) => updateField("unionWorksCouncilCoverage", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select coverage" /></SelectTrigger>
                  <SelectContent>
                    {UNION_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
              <Label className="text-sm font-medium">Primary Trigger for Reward AI Strategy</Label>
              <Select
                value={draft.primaryTriggerForRewardAiStrategy ?? ""}
                onValueChange={(v) => updateField("primaryTriggerForRewardAiStrategy", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select primary trigger" /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Top Reward Priorities (next 12 months)</Label>
                <Badge variant="outline" className="text-xs ml-auto">
                  {(draft.topRewardPrioritiesNext12Months ?? []).length}/3 selected
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-primary/5 border border-primary/15 text-xs text-primary">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Select up to 3 priorities — these will shape your initiative shortlist
              </div>
              <MultiCheckGroup
                options={PRIORITY_OPTIONS}
                selected={draft.topRewardPrioritiesNext12Months ?? []}
                onChange={(v) => updateField("topRewardPrioritiesNext12Months", v)}
                maxSelect={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Strategic Timeline</Label>
              <Select
                value={draft.strategicTimeline ?? ""}
                onValueChange={(v) => updateField("strategicTimeline", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                <SelectContent>
                  {TIMELINE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
            <CardDescription>Programmes already in flight that your AI strategy must coexist with</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Programmes to Coexist With</Label>
              <p className="text-xs text-muted-foreground">Select all that apply</p>
              <MultiCheckGroup
                options={EXISTING_PROGRAMMES}
                selected={draft.existingProgrammesToCoexistWith ?? []}
                onChange={(v) => updateField("existingProgrammesToCoexistWith", v)}
              />
            </div>

            {/* Conditional add-ons (Block F) */}
            {(showAiTalentConcern || showRemunerationVote || showNlwExposure) && (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  Additional questions based on your priorities
                </div>

                {showAiTalentConcern && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">AI / Digital Talent Retention Concern</Label>
                    <Select
                      value={draft.aiTalentRetentionConcern ?? ""}
                      onValueChange={(v) => updateField("aiTalentRetentionConcern", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select level of concern" /></SelectTrigger>
                      <SelectContent>
                        {AI_TALENT_CONCERN_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {showRemunerationVote && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Recent Remuneration Vote Concerns</Label>
                    <Select
                      value={draft.recentRemunerationVoteConcerns ?? ""}
                      onValueChange={(v) => updateField("recentRemunerationVoteConcerns", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {REMUNERATION_VOTE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {showNlwExposure && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">National Living Wage Exposure</Label>
                    <Select
                      value={draft.nationalLivingWageExposure ?? ""}
                      onValueChange={(v) => updateField("nationalLivingWageExposure", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select exposure level" /></SelectTrigger>
                      <SelectContent>
                        {NLW_EXPOSURE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
