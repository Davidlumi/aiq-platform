/**
 * Company Profile — 3-screen setup wizard
 *
 * Screen 1: Company Basics (name, sector, headcount, revenue, payroll, geography, ownership)
 * Screen 2: Workforce & Technology (HRIS, workforce mix triple-slider, AI ambition, talent flags)
 * Screen 3: Regulatory (conditional — FCA, UK/EU headcount, listing exchange)
 *
 * Features:
 * - Autosave on blur for each field
 * - Triple-slider for workforce mix (knowledge/frontline/blended, sums to 100)
 * - Audit trail tab showing field-level change history
 * - Flag-for-correction button on each field (Reward leaders)
 * - Complete button marks profile as done
 */
import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import CompanyProfileFlagsPanel from "@/components/CompanyProfileFlagsPanel";
import { Building2, ChevronRight, ChevronLeft, CheckCircle2, Flag,
  History, AlertCircle, Info, Loader2, Shield, Users, Cpu,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ProfileDraft = {
  companyName?: string;
  sector?: string;
  headcount?: number;
  annualRevenueGbp?: number;
  annualPayrollCostGbp?: number;
  geographicFootprint?: string;
  ownershipStructure?: string;
  hris?: string;
  workforceKnowledgePct?: number;
  workforceFrontlinePct?: number;
  workforceBlendedPct?: number;
  materialSalesWorkforce?: string;
  criticalAiDigitalTalentPopulation?: string;
  businessAiAmbition?: number;
  fcaSysc19InScope?: string;
  ukEmployeeHeadcount?: number;
  euEmployeeHeadcount?: number;
  listingExchange?: string;
};

// ── Option lists ──────────────────────────────────────────────────────────────

const SECTORS = [
  "Financial Services", "Insurance", "Retail Banking", "Asset Management",
  "Technology", "Healthcare", "Retail & Consumer", "Professional Services",
  "Energy & Utilities", "Manufacturing", "Public Sector", "Media & Entertainment",
  "Logistics & Transport", "Education", "Other",
];

const GEOGRAPHIES = [
  "UK only", "UK + Europe", "UK + North America", "UK + APAC",
  "EMEA", "Global (< 10 countries)", "Global (10+ countries)",
];

const OWNERSHIP_STRUCTURES = [
  "Public (listed)", "Private equity backed", "Family owned", "Mutual / cooperative",
  "Public sector / government", "Subsidiary of listed group", "Other",
];

const HRIS_OPTIONS = [
  "Workday", "SAP SuccessFactors", "Oracle HCM", "ADP", "Ceridian Dayforce",
  "Sage HR", "BambooHR", "Personio", "Rippling", "Zellis", "MHR iTrent",
  "Cezanne HR", "Cascade HR", "Custom / bespoke", "None / spreadsheets", "Other",
];

const TALENT_POPULATION_OPTIONS = [
  "< 50 FTE", "50–200 FTE", "200–500 FTE", "500–1,000 FTE", "> 1,000 FTE",
  "Not applicable",
];

const AI_AMBITION_LABELS: Record<number, string> = {
  1: "Cautious — compliance and risk management focus",
  2: "Pragmatic — efficiency gains, proven use cases only",
  3: "Balanced — efficiency + selective differentiation",
  4: "Ambitious — AI as a strategic differentiator",
  5: "Transformative — AI at the core of business model",
};

const FCA_OPTIONS = [
  "Yes — SMCR in scope", "Yes — FCA regulated but not SMCR",
  "No — not FCA regulated", "Under review / uncertain",
];

const LISTING_EXCHANGES = [
  "London Stock Exchange (Main Market)", "AIM", "NYSE", "NASDAQ",
  "Euronext", "Multiple exchanges", "Not listed", "Other",
];

const SALES_WORKFORCE_OPTIONS = [
  "< 5% of headcount", "5–15% of headcount", "15–30% of headcount",
  "> 30% of headcount", "Not applicable",
];

// ── Workforce triple-slider ───────────────────────────────────────────────────

function WorkforceMixSlider({
  knowledge,
  frontline,
  blended,
  onChange,
}: {
  knowledge: number;
  frontline: number;
  blended: number;
  onChange: (k: number, f: number, b: number) => void;
}) {
  const total = knowledge + frontline + blended;
  const isValid = total === 100;

  const handleKnowledge = (val: number[]) => {
    const k = val[0];
    const remaining = 100 - k;
    const ratio = frontline + blended > 0 ? frontline / (frontline + blended) : 0.5;
    const f = Math.round(remaining * ratio);
    const b = remaining - f;
    onChange(k, f, b);
  };

  const handleFrontline = (val: number[]) => {
    const f = val[0];
    const remaining = 100 - knowledge - f;
    if (remaining < 0) return;
    onChange(knowledge, f, remaining);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-foreground">Workforce Mix</span>
        <Badge variant={isValid ? "default" : "destructive"} className="text-xs">
          {total}% {isValid ? "✓" : "— must sum to 100%"}
        </Badge>
      </div>

      <div className="space-y-3">
        {[
          { label: "Knowledge workers", value: knowledge, color: "bg-blue-500", handler: handleKnowledge },
          { label: "Frontline / deskless", value: frontline, color: "bg-emerald-500", handler: handleFrontline },
        ].map(({ label, value, color, handler }) => (
          <div key={label}>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{label}</span>
              <span className="font-mono font-semibold">{value}%</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[value]}
              onValueChange={handler}
              className="w-full"
            />
          </div>
        ))}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Blended / hybrid</span>
            <span className="font-mono font-semibold">{blended}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all"
              style={{ width: `${blended}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Auto-calculated (100 − knowledge − frontline)</p>
        </div>
      </div>
    </div>
  );
}

// ── Field with flag button ────────────────────────────────────────────────────

function FieldWithFlag({
  label,
  fieldName,
  children,
  hint,
  showFlag = false,
  onFlag,
}: {
  label: string;
  fieldName: string;
  children: React.ReactNode;
  hint?: string;
  showFlag?: boolean;
  onFlag?: (fieldName: string) => void;
}) {
  return (
    <div className="space-y-1.5">
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
        {showFlag && onFlag && (
          <button
            onClick={() => onFlag(fieldName)}
            className="ml-auto text-muted-foreground hover:text-amber-500 transition-colors"
            title="Flag this field for correction"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Audit trail tab ───────────────────────────────────────────────────────────

function AuditTrailTab() {
  const { data: trail, isLoading } = trpc.companyProfile.getAuditTrail.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trail || trail.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No changes recorded yet.</p>
      </div>
    );
  }

  const FIELD_LABELS: Record<string, string> = {
    companyName: "Company Name", sector: "Sector", headcount: "Headcount",
    annualRevenueGbp: "Annual Revenue (£)", annualPayrollCostGbp: "Annual Payroll Cost (£)",
    geographicFootprint: "Geographic Footprint", ownershipStructure: "Ownership Structure",
    hris: "HRIS", workforceKnowledgePct: "Knowledge Workers %",
    workforceFrontlinePct: "Frontline Workers %", workforceBlendedPct: "Blended Workers %",
    materialSalesWorkforce: "Sales Workforce", criticalAiDigitalTalentPopulation: "AI/Digital Talent",
    businessAiAmbition: "Business AI Ambition", fcaSysc19InScope: "FCA SYSC 19",
    ukEmployeeHeadcount: "UK Headcount", euEmployeeHeadcount: "EU Headcount",
    listingExchange: "Listing Exchange",
  };

  return (
    <div className="space-y-2">
      {[...trail].reverse().map((entry) => (
        <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 text-sm">
          <div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{FIELD_LABELS[entry.fieldName] ?? entry.fieldName}</span>
              <span className="text-muted-foreground text-xs">
                {new Date(entry.changedAt).toLocaleString()}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="line-through opacity-60">{entry.oldValue ?? "—"}</span>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="text-foreground font-medium">{entry.newValue ?? "—"}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CompanyProfilePage() {
  const [screen, setScreen] = useState<1 | 2 | 3>(1);
  const [activeTab, setActiveTab] = useState<"setup" | "audit" | "flags">("setup");
  const [materialChangedBanner, setMaterialChangedBanner] = useState(false);
  const [flagField, setFlagField] = useState<string | null>(null);
  const [flagNote, setFlagNote] = useState("");
  const [flagSuggestion, setFlagSuggestion] = useState("");
  const savingRef = useRef(false);

  // Fetch existing profile
  const { data: profile, refetch } = trpc.companyProfile.get.useQuery();

  // Draft state — initialised from DB when profile loads
  const [draft, setDraft] = useState<ProfileDraft>({});
  const [draftInit, setDraftInit] = useState(false);

  if (profile && !draftInit) {
    setDraft({
      companyName: profile.companyName ?? undefined,
      sector: profile.sector ?? undefined,
      headcount: profile.headcount ?? undefined,
      annualRevenueGbp: profile.annualRevenueGbp ?? undefined,
      annualPayrollCostGbp: profile.annualPayrollCostGbp ?? undefined,
      geographicFootprint: profile.geographicFootprint ?? undefined,
      ownershipStructure: profile.ownershipStructure ?? undefined,
      hris: profile.hris ?? undefined,
      workforceKnowledgePct: profile.workforceKnowledgePct ?? 40,
      workforceFrontlinePct: profile.workforceFrontlinePct ?? 40,
      workforceBlendedPct: profile.workforceBlendedPct ?? 20,
      materialSalesWorkforce: profile.materialSalesWorkforce ?? undefined,
      criticalAiDigitalTalentPopulation: profile.criticalAiDigitalTalentPopulation ?? undefined,
      businessAiAmbition: profile.businessAiAmbition ?? 3,
      fcaSysc19InScope: profile.fcaSysc19InScope ?? undefined,
      ukEmployeeHeadcount: profile.ukEmployeeHeadcount ?? undefined,
      euEmployeeHeadcount: profile.euEmployeeHeadcount ?? undefined,
      listingExchange: profile.listingExchange ?? undefined,
    });
    setDraftInit(true);
  }

  const saveMutation = trpc.companyProfile.save.useMutation({
    onSuccess: (data) => {
      refetch();
      if (data.materialChangeDetected) {
        setMaterialChangedBanner(true);
      }
    },
    onError: (e) => toast.error("Save failed: " + String(e.message)),
  });

  const completeMutation = trpc.companyProfile.complete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Company Profile completed: Reward leaders can now start their pre-work.");
    },
    onError: (e) => toast.error("Cannot complete: " + String(e.message)),
  });

  const flagMutation = trpc.companyProfile.flagField.useMutation({
    onSuccess: () => {
      setFlagField(null);
      setFlagNote("");
      setFlagSuggestion("");
      toast.success("Flag submitted: The admin has been notified.");
    },
    onError: (e) => toast.error("Flag failed: " + String(e.message)),
  });

  const autosave = useCallback(
    (patch: Partial<ProfileDraft>) => {
      if (savingRef.current) return;
      savingRef.current = true;
      saveMutation.mutate(patch, { onSettled: () => { savingRef.current = false; } });
    },
    [saveMutation]
  );

  const updateField = (key: keyof ProfileDraft, value: ProfileDraft[keyof ProfileDraft]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const handleBlur = (key: keyof ProfileDraft) => {
    autosave({ [key]: draft[key] });
  };

  const isCompleted = profile?.isCompleted === 1;

  // Determine if regulatory screen is needed
  const needsRegulatory =
    draft.ownershipStructure === "Public (listed)" ||
    draft.fcaSysc19InScope?.startsWith("Yes") ||
    (draft.geographicFootprint ?? "").includes("Europe") ||
    (draft.geographicFootprint ?? "").includes("EMEA") ||
    (draft.geographicFootprint ?? "").includes("Global");

  const SCREENS = [
    { id: 1 as const, label: "Company Basics", icon: Building2 },
    { id: 2 as const, label: "Workforce & Tech", icon: Users },
    ...(needsRegulatory ? [{ id: 3 as const, label: "Regulatory", icon: Shield }] : []),
  ];

  const maxScreen = needsRegulatory ? 3 : 2;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Company Profile</h1>
            {isCompleted && (
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Shared organisational facts used across all function strategy builders.
          </p>
        </div>
        {!isCompleted && (
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
            Mark Complete
          </Button>
        )}
      </div>

      {/* Material-change banner — shown when a material field was updated */}
      {materialChangedBanner && (
        <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-600">Material change detected</p>
            <p className="text-xs text-amber-600/80 mt-0.5">
              A key field was updated. Reward leaders with completed pre-work have been prompted to re-assess.
            </p>
          </div>
          <button
            onClick={() => setMaterialChangedBanner(false)}
            className="text-amber-500/60 hover:text-amber-500 transition-colors shrink-0"
          >
            <AlertCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "setup" | "audit" | "flags")}>
        <TabsList>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="audit">
            <History className="h-3.5 w-3.5 mr-1.5" />
            Audit Trail
          </TabsTrigger>
          <TabsTrigger value="flags">
            <Flag className="h-3.5 w-3.5 mr-1.5" />
            Flags
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="mt-4 space-y-4">
          {/* Screen progress */}
          <div className="flex items-center gap-2">
            {SCREENS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  onClick={() => setScreen(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    screen === s.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
                {i < SCREENS.length - 1 && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>

          {/* Screen 1: Company Basics */}
          {screen === 1 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Company Basics
                </CardTitle>
                <CardDescription>Core organisational facts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FieldWithFlag label="Company Name" fieldName="companyName">
                    <Input
                      value={draft.companyName ?? ""}
                      onChange={(e) => updateField("companyName", e.target.value)}
                      onBlur={() => handleBlur("companyName")}
                      placeholder="e.g. Northbridge Financial Services"
                    />
                  </FieldWithFlag>

                  <FieldWithFlag label="Sector" fieldName="sector">
                    <Select
                      value={draft.sector ?? ""}
                      onValueChange={(v) => { updateField("sector", v); autosave({ sector: v }); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                      <SelectContent>
                        {SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldWithFlag>

                  <FieldWithFlag
                    label="Total Headcount"
                    fieldName="headcount"
                    hint="Total employees including part-time and contractors"
                  >
                    <Input
                      type="number"
                      value={draft.headcount ?? ""}
                      onChange={(e) => updateField("headcount", e.target.value ? parseInt(e.target.value) : undefined)}
                      onBlur={() => handleBlur("headcount")}
                      placeholder="e.g. 4500"
                    />
                  </FieldWithFlag>

                  <FieldWithFlag
                    label="Annual Revenue (£)"
                    fieldName="annualRevenueGbp"
                    hint="Approximate annual revenue in GBP. Used for investment benchmarking."
                  >
                    <Input
                      type="number"
                      value={draft.annualRevenueGbp ?? ""}
                      onChange={(e) => updateField("annualRevenueGbp", e.target.value ? parseInt(e.target.value) : undefined)}
                      onBlur={() => handleBlur("annualRevenueGbp")}
                      placeholder="e.g. 850000000"
                    />
                  </FieldWithFlag>

                  <FieldWithFlag
                    label="Annual Payroll Cost (£)"
                    fieldName="annualPayrollCostGbp"
                    hint="Total payroll cost including NI and pension contributions"
                  >
                    <Input
                      type="number"
                      value={draft.annualPayrollCostGbp ?? ""}
                      onChange={(e) => updateField("annualPayrollCostGbp", e.target.value ? parseInt(e.target.value) : undefined)}
                      onBlur={() => handleBlur("annualPayrollCostGbp")}
                      placeholder="e.g. 210000000"
                    />
                  </FieldWithFlag>

                  <FieldWithFlag label="Geographic Footprint" fieldName="geographicFootprint">
                    <Select
                      value={draft.geographicFootprint ?? ""}
                      onValueChange={(v) => { updateField("geographicFootprint", v); autosave({ geographicFootprint: v }); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select footprint" /></SelectTrigger>
                      <SelectContent>
                        {GEOGRAPHIES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldWithFlag>

                  <FieldWithFlag label="Ownership Structure" fieldName="ownershipStructure">
                    <Select
                      value={draft.ownershipStructure ?? ""}
                      onValueChange={(v) => { updateField("ownershipStructure", v); autosave({ ownershipStructure: v }); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select structure" /></SelectTrigger>
                      <SelectContent>
                        {OWNERSHIP_STRUCTURES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldWithFlag>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={() => setScreen(2)} size="sm">
                    Next: Workforce & Tech <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Screen 2: Workforce & Technology */}
          {screen === 2 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Workforce & Technology
                </CardTitle>
                <CardDescription>Workforce composition and HR technology landscape</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FieldWithFlag label="HRIS Platform" fieldName="hris">
                  <Select
                    value={draft.hris ?? ""}
                    onValueChange={(v) => { updateField("hris", v); autosave({ hris: v }); }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select HRIS" /></SelectTrigger>
                    <SelectContent>
                      {HRIS_OPTIONS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldWithFlag>

                <WorkforceMixSlider
                  knowledge={draft.workforceKnowledgePct ?? 40}
                  frontline={draft.workforceFrontlinePct ?? 40}
                  blended={draft.workforceBlendedPct ?? 20}
                  onChange={(k, f, b) => {
                    setDraft((d) => ({
                      ...d,
                      workforceKnowledgePct: k,
                      workforceFrontlinePct: f,
                      workforceBlendedPct: b,
                    }));
                    autosave({ workforceKnowledgePct: k, workforceFrontlinePct: f, workforceBlendedPct: b });
                  }}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FieldWithFlag
                    label="Material Sales Workforce"
                    fieldName="materialSalesWorkforce"
                    hint="Does the company have a material sales workforce with variable pay? Relevant for Reward AI use cases."
                  >
                    <Select
                      value={draft.materialSalesWorkforce ?? ""}
                      onValueChange={(v) => { updateField("materialSalesWorkforce", v); autosave({ materialSalesWorkforce: v }); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {SALES_WORKFORCE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldWithFlag>

                  <FieldWithFlag
                    label="Critical AI / Digital Talent Population"
                    fieldName="criticalAiDigitalTalentPopulation"
                    hint="Approximate size of the AI, data science, and digital engineering talent pool"
                  >
                    <Select
                      value={draft.criticalAiDigitalTalentPopulation ?? ""}
                      onValueChange={(v) => { updateField("criticalAiDigitalTalentPopulation", v); autosave({ criticalAiDigitalTalentPopulation: v }); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {TALENT_POPULATION_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldWithFlag>
                </div>

                {/* Business AI Ambition slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Business AI Ambition</Label>
                    <Badge variant="outline" className="text-xs font-mono">
                      Level {draft.businessAiAmbition ?? 3}
                    </Badge>
                  </div>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[draft.businessAiAmbition ?? 3]}
                    onValueChange={(v) => {
                      updateField("businessAiAmbition", v[0]);
                      autosave({ businessAiAmbition: v[0] });
                    }}
                  />
                  <p className="text-xs text-muted-foreground italic">
                    {AI_AMBITION_LABELS[draft.businessAiAmbition ?? 3]}
                  </p>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setScreen(1)} size="sm">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  {needsRegulatory ? (
                    <Button onClick={() => setScreen(3)} size="sm">
                      Next: Regulatory <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
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
                      {isCompleted ? "Completed" : "Complete Profile"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Screen 3: Regulatory (conditional) */}
          {screen === 3 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Regulatory Context
                </CardTitle>
                <CardDescription>
                  Regulatory details relevant to your geographic footprint and ownership structure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-amber-700 dark:text-amber-400">
                    These fields are shown because your company has a multi-country footprint or is publicly listed.
                    They influence regulatory compliance initiatives in the strategy builder.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FieldWithFlag
                    label="FCA SYSC 19 in scope?"
                    fieldName="fcaSysc19InScope"
                    hint="Whether the company is subject to FCA SYSC 19 remuneration rules (relevant for financial services)"
                  >
                    <Select
                      value={draft.fcaSysc19InScope ?? ""}
                      onValueChange={(v) => { updateField("fcaSysc19InScope", v); autosave({ fcaSysc19InScope: v }); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {FCA_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldWithFlag>

                  <FieldWithFlag
                    label="Listing Exchange"
                    fieldName="listingExchange"
                    hint="Primary stock exchange if publicly listed"
                  >
                    <Select
                      value={draft.listingExchange ?? ""}
                      onValueChange={(v) => { updateField("listingExchange", v); autosave({ listingExchange: v }); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {LISTING_EXCHANGES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldWithFlag>

                  <FieldWithFlag
                    label="UK Employee Headcount"
                    fieldName="ukEmployeeHeadcount"
                    hint="Number of employees based in the UK (for gender pay gap reporting threshold)"
                  >
                    <Input
                      type="number"
                      value={draft.ukEmployeeHeadcount ?? ""}
                      onChange={(e) => updateField("ukEmployeeHeadcount", e.target.value ? parseInt(e.target.value) : undefined)}
                      onBlur={() => handleBlur("ukEmployeeHeadcount")}
                      placeholder="e.g. 3200"
                    />
                  </FieldWithFlag>

                  <FieldWithFlag
                    label="EU Employee Headcount"
                    fieldName="euEmployeeHeadcount"
                    hint="Number of employees based in EU member states (for EU Pay Transparency Directive)"
                  >
                    <Input
                      type="number"
                      value={draft.euEmployeeHeadcount ?? ""}
                      onChange={(e) => updateField("euEmployeeHeadcount", e.target.value ? parseInt(e.target.value) : undefined)}
                      onBlur={() => handleBlur("euEmployeeHeadcount")}
                      placeholder="e.g. 800"
                    />
                  </FieldWithFlag>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setScreen(2)} size="sm">
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
                    {isCompleted ? "Completed" : "Complete Profile"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Audit Trail
              </CardTitle>
              <CardDescription>Field-level change history for this company profile</CardDescription>
            </CardHeader>
            <CardContent>
              <AuditTrailTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flags" className="mt-4">
          <CompanyProfileFlagsPanel />
        </TabsContent>
      </Tabs>

      {/* Flag-for-correction dialog */}
      <Dialog open={flagField !== null} onOpenChange={(o) => !o && setFlagField(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-amber-500" />
              Flag Field for Correction
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Field</Label>
              <Input value={flagField ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Suggested Correction</Label>
              <Input
                value={flagSuggestion}
                onChange={(e) => setFlagSuggestion(e.target.value)}
                placeholder="What should the correct value be?"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                placeholder="Any additional context..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagField(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (flagField) {
                  flagMutation.mutate({
                    fieldName: flagField,
                    suggestedCorrection: flagSuggestion || undefined,
                    notes: flagNote || undefined,
                  });
                }
              }}
              disabled={flagMutation.isPending}
            >
              {flagMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
