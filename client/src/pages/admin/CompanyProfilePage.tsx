/**
 * Company Profile — 3-screen setup wizard
 *
 * Screen 1: Company Basics (name, sector, headcount, revenue, payroll, geography, ownership)
 * Screen 2: Workforce & Technology (HRIS, workforce mix triple-slider, AI ambition, talent flags)
 * Screen 3: Regulatory (conditional — FCA [FS only], UK/EU headcount [multi-geo], listing exchange [listed only])
 *
 * QA fixes applied:
 * - All dropdown options use schema v2 enum values
 * - Conditional fields: fca only for FS, listing_exchange only for listed, uk/eu headcount only for multi-geo
 * - business_ai_ambition slider 1–4 (not 1–5)
 * - maxLength=120 on company name
 * - reward_leader can edit and complete the Company Profile (it is their primary setup task)
 * - Help text on every field
 * - Cross-field validation: uk + eu headcount ≤ total headcount
 */
import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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
  History, AlertCircle, Info, Loader2, Shield, Users, BadgeCheck,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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
  // Provenance
  sectorSource?: string;
  sectorAsOf?: number;
  sectorVerified?: boolean;
  headcountSource?: string;
  headcountAsOf?: number;
  headcountVerified?: boolean;
  annualRevenueGbpSource?: string;
  annualRevenueGbpAsOf?: number;
  annualRevenueGbpVerified?: boolean;
  annualPayrollCostGbpSource?: string;
  annualPayrollCostGbpAsOf?: number;
  annualPayrollCostGbpVerified?: boolean;
};

// ── Option lists (schema v2 enum values) ──────────────────────────────────────

const SECTORS: { value: string; label: string }[] = [
  { value: "financial_services", label: "Financial Services" },
  { value: "insurance", label: "Insurance" },
  { value: "retail_banking", label: "Retail Banking" },
  { value: "asset_management", label: "Asset Management" },
  { value: "technology", label: "Technology" },
  { value: "healthcare", label: "Healthcare & Life Sciences" },
  { value: "retail_consumer", label: "Retail & Consumer" },
  { value: "professional_services", label: "Professional Services" },
  { value: "energy_utilities", label: "Energy & Utilities" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "public_sector", label: "Public Sector" },
  { value: "media_entertainment", label: "Media & Entertainment" },
  { value: "logistics_transport", label: "Logistics & Transport" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
];

const GEOGRAPHIES: { value: string; label: string }[] = [
  { value: "uk_only", label: "UK only" },
  { value: "uk_plus_eu", label: "UK + Europe (EU)" },
  { value: "uk_plus_non_eu_global", label: "UK + Non-EU global" },
  { value: "uk_plus_eu_plus_global", label: "UK + EU + Global" },
];

const OWNERSHIP_STRUCTURES: { value: string; label: string }[] = [
  { value: "ftse_100_listed", label: "FTSE 100 listed" },
  { value: "ftse_250_listed", label: "FTSE 250 listed" },
  { value: "aim_listed", label: "AIM listed" },
  { value: "other_listed", label: "Other listed" },
  { value: "private_pe_backed", label: "Private — PE backed" },
  { value: "private_vc_backed", label: "Private — VC backed" },
  { value: "private_family_owned", label: "Private — family owned" },
  { value: "mutual_cooperative", label: "Mutual / cooperative" },
  { value: "public_sector", label: "Public sector / government" },
  { value: "subsidiary_listed_group", label: "Subsidiary of listed group" },
];

const LISTED_OWNERSHIP_VALUES = new Set([
  "ftse_100_listed", "ftse_250_listed", "aim_listed", "other_listed", "subsidiary_listed_group",
]);

const HRIS_OPTIONS: { value: string; label: string }[] = [
  { value: "workday", label: "Workday" },
  { value: "sap_successfactors", label: "SAP SuccessFactors" },
  { value: "oracle_hcm", label: "Oracle HCM" },
  { value: "adp", label: "ADP" },
  { value: "ceridian_dayforce", label: "Ceridian Dayforce" },
  { value: "hibob", label: "HiBob" },
  { value: "rippling", label: "Rippling" },
  { value: "zellis", label: "Zellis" },
  { value: "mhr_itrent", label: "MHR iTrent" },
  { value: "cezanne_hr", label: "Cezanne HR" },
  { value: "cascade_hr", label: "Cascade HR" },
  { value: "bamboohr", label: "BambooHR" },
  { value: "personio", label: "Personio" },
  { value: "sage_hr", label: "Sage HR" },
  { value: "custom_bespoke", label: "Custom / bespoke" },
  { value: "none_spreadsheets", label: "None / spreadsheets" },
  { value: "dont_know", label: "Don't know" },
];

const SALES_WORKFORCE_OPTIONS: { value: string; label: string }[] = [
  { value: "none_minimal", label: "None or minimal (< 5% of headcount)" },
  { value: "present_but_small", label: "Present but small (5–15%)" },
  { value: "significant_named_seller_workforce", label: "Significant named-seller workforce (15–30%)" },
  { value: "predominantly_sales", label: "Predominantly sales-led (> 30%)" },
];

const TALENT_POPULATION_OPTIONS: { value: string; label: string }[] = [
  { value: "none_or_minimal", label: "None or minimal" },
  { value: "emerging_small_population", label: "Emerging — small population (< 50 FTE)" },
  { value: "established_growing", label: "Established and growing (50–200 FTE)" },
  { value: "actively_fighting_in_market_for_ai_talent", label: "Actively competing for AI talent (200+ FTE)" },
];

const AI_AMBITION_LABELS: Record<number, string> = {
  1: "Cautious — compliance and risk management focus",
  2: "Pragmatic — efficiency gains, proven use cases only",
  3: "Balanced — efficiency plus selective differentiation",
  4: "Ambitious — AI as a strategic differentiator",
};

const FCA_OPTIONS: { value: string; label: string }[] = [
  { value: "yes_in_scope", label: "Yes — SYSC 19 in scope (SMCR)" },
  { value: "yes_not_smcr", label: "Yes — FCA regulated but not SMCR" },
  { value: "no_not_fca_regulated", label: "No — not FCA regulated" },
  { value: "under_review", label: "Under review / uncertain" },
];

const LISTING_EXCHANGES: { value: string; label: string }[] = [
  { value: "lse_main_market", label: "London Stock Exchange (Main Market)" },
  { value: "ftse_aim", label: "AIM" },
  { value: "nyse", label: "NYSE" },
  { value: "nasdaq", label: "NASDAQ" },
  { value: "euronext", label: "Euronext" },
  { value: "multiple_exchanges", label: "Multiple exchanges" },
  { value: "other_listed", label: "Other" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isListed(ownership?: string) {
  return !!ownership && LISTED_OWNERSHIP_VALUES.has(ownership);
}

function isFinancialServices(sector?: string) {
  return sector === "financial_services" || sector === "insurance" || sector === "retail_banking" || sector === "asset_management";
}

function hasEuPresence(geo?: string) {
  return geo === "uk_plus_eu" || geo === "uk_plus_eu_plus_global";
}

function isMultiGeo(geo?: string) {
  return !!geo && geo !== "uk_only";
}

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
      <p className="text-xs text-muted-foreground -mt-2">
        Approximate split of your workforce by working pattern. Knowledge workers are primarily desk-based; frontline/deskless are field, retail, or operational; blended move between both.
      </p>

      <div className="space-y-3">
        {[
          { label: "Knowledge workers", value: knowledge, handler: handleKnowledge },
          { label: "Frontline / deskless", value: frontline, handler: handleFrontline },
        ].map(({ label, value, handler }) => (
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
}: {
  label: string;
  fieldName: string;
  children: React.ReactNode;
  hint?: string;
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
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-medium">{FIELD_LABELS[entry.fieldName] ?? entry.fieldName}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(entry.changedAt * 1000).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span className="line-through">{String(entry.oldValue ?? "—")}</span>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="text-foreground font-medium">{String(entry.newValue ?? "—")}</span>
            </div>
            {(entry as any).changedByName && (
              <p className="text-xs text-muted-foreground mt-0.5">by {(entry as any).changedByName}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── ProvenanceRow — source, as-of date, and verified flag ───────────────────

function ProvenanceRow({
  sourceField,
  asOfField,
  verifiedField,
  draft,
  updateField,
  autosave,
}: {
  sourceField: keyof ProfileDraft;
  asOfField: keyof ProfileDraft;
  verifiedField: keyof ProfileDraft;
  draft: ProfileDraft;
  updateField: (f: keyof ProfileDraft, v: any) => void;
  autosave: (patch: Partial<ProfileDraft>) => void;
}) {
  const verifiedVal = !!(draft[verifiedField] as boolean | undefined);
  const sourceVal = (draft[sourceField] as string | undefined) ?? "";
  const asOfVal = (draft[asOfField] as number | undefined);
  const asOfStr = asOfVal ? new Date(asOfVal).toISOString().split("T")[0] : "";

  return (
    <div className="mt-2 p-3 rounded-md bg-muted/40 border border-border/50 space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <BadgeCheck className="w-3.5 h-3.5" /> Data provenance
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Source</Label>
          <Input
            className="h-7 text-xs"
            placeholder="e.g. Annual Report 2024"
            value={sourceVal}
            onChange={(e) => updateField(sourceField, e.target.value)}
            onBlur={() => autosave({ [sourceField]: draft[sourceField] } as Partial<ProfileDraft>)}
            maxLength={100}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">As of date</Label>
          <Input
            className="h-7 text-xs"
            type="date"
            value={asOfStr}
            onChange={(e) => {
              const ts = e.target.value ? new Date(e.target.value).getTime() : undefined;
              updateField(asOfField, ts);
            }}
            onBlur={() => autosave({ [asOfField]: draft[asOfField] } as Partial<ProfileDraft>)}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`verified-${String(verifiedField)}`}
          checked={verifiedVal}
          onCheckedChange={(checked) => {
            updateField(verifiedField, !!checked);
            autosave({ [verifiedField]: !!checked } as Partial<ProfileDraft>);
          }}
        />
        <Label htmlFor={`verified-${String(verifiedField)}`} className="text-xs cursor-pointer">
          Mark as verified
        </Label>
        {verifiedVal && (
          <span className="ml-auto text-xs text-emerald-600 flex items-center gap-1">
            <BadgeCheck className="w-3 h-3" /> Verified
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CompanyProfilePage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const savingRef = useRef(false);

  // All authenticated users (reward_leader and admin) have full edit access
  const canEdit = true;

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
      workforceKnowledgePct: profile.workforceKnowledgePct ?? 60,
      workforceFrontlinePct: profile.workforceFrontlinePct ?? 20,
      workforceBlendedPct: profile.workforceBlendedPct ?? 20,
      materialSalesWorkforce: profile.materialSalesWorkforce ?? undefined,
      criticalAiDigitalTalentPopulation: profile.criticalAiDigitalTalentPopulation ?? undefined,
      businessAiAmbition: profile.businessAiAmbition ?? 2,
      fcaSysc19InScope: profile.fcaSysc19InScope ?? undefined,
      ukEmployeeHeadcount: profile.ukEmployeeHeadcount ?? undefined,
      euEmployeeHeadcount: profile.euEmployeeHeadcount ?? undefined,
      listingExchange: profile.listingExchange ?? undefined,
      // Provenance
      sectorSource: profile.sectorSource ?? undefined,
      sectorAsOf: profile.sectorAsOf ?? undefined,
      sectorVerified: !!(profile.sectorVerified),
      headcountSource: profile.headcountSource ?? undefined,
      headcountAsOf: profile.headcountAsOf ?? undefined,
      headcountVerified: !!(profile.headcountVerified),
      annualRevenueGbpSource: profile.annualRevenueGbpSource ?? undefined,
      annualRevenueGbpAsOf: profile.annualRevenueGbpAsOf ?? undefined,
      annualRevenueGbpVerified: !!(profile.annualRevenueGbpVerified),
      annualPayrollCostGbpSource: profile.annualPayrollCostGbpSource ?? undefined,
      annualPayrollCostGbpAsOf: profile.annualPayrollCostGbpAsOf ?? undefined,
      annualPayrollCostGbpVerified: !!(profile.annualPayrollCostGbpVerified),
    });
    setDraftInit(true);
  }

  const [screen, setScreen] = useState<1 | 2 | 3>(1);
  const [activeTab, setActiveTab] = useState<"setup" | "audit" | "flags">("setup");
  const [headcountError, setHeadcountError] = useState<string | null>(null);
  const [materialChangedBanner, setMaterialChangedBanner] = useState(false);
  const [flagField, setFlagField] = useState<string | null>(null);
  const [flagSuggestion, setFlagSuggestion] = useState("");
  const [flagNote, setFlagNote] = useState("");

  const isCompleted = profile?.isCompleted ?? false;

  // Conditional field visibility
  const showFca = isFinancialServices(draft.sector);
  const showListingExchange = isListed(draft.ownershipStructure);
  const showUkHeadcount = isMultiGeo(draft.geographicFootprint);
  const showEuHeadcount = hasEuPresence(draft.geographicFootprint);
  const needsRegulatory = showFca || showListingExchange || showUkHeadcount || showEuHeadcount;

  // Save mutation
  const saveMutation = trpc.companyProfile.save.useMutation({
    onSuccess: () => {
      refetch();
      utils.companyProfile.get.invalidate();
    },
    onError: (e) => toast.error(`Save failed: ${e.message}`),
  });

  // Complete mutation
  const completeMutation = trpc.companyProfile.complete.useMutation({
    onSuccess: () => {
      toast.success("Company Profile marked as complete");
      refetch();
      utils.companyProfile.get.invalidate();
    },
    onError: (e) => toast.error(`Could not complete: ${e.message}`),
  });

  // Flag mutation
  const flagMutation = trpc.companyProfile.flagField.useMutation({
    onSuccess: () => {
      toast.success("Flag submitted");
      setFlagField(null);
      setFlagSuggestion("");
      setFlagNote("");
    },
    onError: (e) => toast.error(e.message),
  });

  // Autosave helper
  const autosave = useCallback(
    (patch: Partial<ProfileDraft>) => {
      if (savingRef.current) return;
      savingRef.current = true;
      saveMutation.mutate(patch as any, {
        onSettled: () => { savingRef.current = false; },
      });
    },
    [saveMutation]
  );

  const updateField = useCallback((field: keyof ProfileDraft, value: any) => {
    setDraft((d) => ({ ...d, [field]: value }));
  }, []);

  const handleBlur = useCallback(
    (field: keyof ProfileDraft) => {
      autosave({ [field]: draft[field] });
    },
    [autosave, draft]
  );

  // Headcount cross-validation
  const validateHeadcounts = useCallback(() => {
    const total = draft.headcount ?? 0;
    const uk = draft.ukEmployeeHeadcount ?? 0;
    const eu = draft.euEmployeeHeadcount ?? 0;
    if (uk + eu > total) {
      setHeadcountError(`UK (${uk}) + EU (${eu}) headcount cannot exceed total headcount (${total}).`);
      return false;
    }
    setHeadcountError(null);
    return true;
  }, [draft]);

  const handleHeadcountBlur = useCallback(
    (field: keyof ProfileDraft) => {
      autosave({ [field]: draft[field] });
      validateHeadcounts();
    },
    [autosave, draft, validateHeadcounts]
  );

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

      {/* Material-change banner */}
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

      {/* Cross-field headcount error */}
      {headcountError && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-destructive">{headcountError}</p>
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
                <CardDescription>Core organisational facts shared across all strategy builders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FieldWithFlag
                    label="Company Name"
                    fieldName="companyName"
                    hint="The legal or trading name of the organisation. Used in reports and strategy documents."
                  >
                    <Input
                      value={draft.companyName ?? ""}
                      onChange={(e) => updateField("companyName", e.target.value)}
                      onBlur={() => handleBlur("companyName")}
                      placeholder="e.g. Northbridge Financial Services"
                      maxLength={120}
                    />
                    {(draft.companyName?.length ?? 0) > 100 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {draft.companyName?.length ?? 0}/120 characters
                      </p>
                    )}
                  </FieldWithFlag>

                  <FieldWithFlag
                    label="Sector"
                    fieldName="sector"
                    hint="Primary industry sector. Drives regulatory context, initiative relevance, and peer benchmarking."
                  >
                    <Select
                      value={draft.sector ?? ""}
                      onValueChange={(v) => { updateField("sector", v); autosave({ sector: v }); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                      <SelectContent>
                        {SECTORS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <ProvenanceRow
                      sourceField="sectorSource"
                      asOfField="sectorAsOf"
                      verifiedField="sectorVerified"
                      draft={draft}
                      updateField={updateField}
                      autosave={autosave}
                    />
                  </FieldWithFlag>

                  <FieldWithFlag
                    label="Total Headcount"
                    fieldName="headcount"
                    hint="Total employees including part-time and contractors. Used to size investment cases and benchmark against peers."
                  >
                    <Input
                      type="number"
                      value={draft.headcount ?? ""}
                      onChange={(e) => updateField("headcount", e.target.value ? parseInt(e.target.value) : undefined)}
                      onBlur={() => handleHeadcountBlur("headcount")}
                      placeholder="e.g. 4500"
                      min={1}
                    />
                    <ProvenanceRow
                      sourceField="headcountSource"
                      asOfField="headcountAsOf"
                      verifiedField="headcountVerified"
                      draft={draft}
                      updateField={updateField}
                      autosave={autosave}
                    />
                  </FieldWithFlag>

                  <FieldWithFlag
                    label="Annual Revenue (£)"
                    fieldName="annualRevenueGbp"
                    hint="Approximate annual revenue in GBP. Used for investment benchmarking and ROI calculations."
                  >
                    <Input
                      type="number"
                      value={draft.annualRevenueGbp ?? ""}
                      onChange={(e) => updateField("annualRevenueGbp", e.target.value ? parseInt(e.target.value) : undefined)}
                      onBlur={() => handleBlur("annualRevenueGbp")}
                      placeholder="e.g. 850000000"
                      min={0}
                    />
                    <ProvenanceRow
                      sourceField="annualRevenueGbpSource"
                      asOfField="annualRevenueGbpAsOf"
                      verifiedField="annualRevenueGbpVerified"
                      draft={draft}
                      updateField={updateField}
                      autosave={autosave}
                    />
                  </FieldWithFlag>

                  <FieldWithFlag
                    label="Annual Payroll Cost (£)"
                    fieldName="annualPayrollCostGbp"
                    hint="Total payroll cost including employer NI and pension contributions. Used to size pay equity and efficiency initiatives."
                  >
                    <Input
                      type="number"
                      value={draft.annualPayrollCostGbp ?? ""}
                      onChange={(e) => updateField("annualPayrollCostGbp", e.target.value ? parseInt(e.target.value) : undefined)}
                      onBlur={() => handleBlur("annualPayrollCostGbp")}
                      placeholder="e.g. 210000000"
                      min={0}
                    />
                    <ProvenanceRow
                      sourceField="annualPayrollCostGbpSource"
                      asOfField="annualPayrollCostGbpAsOf"
                      verifiedField="annualPayrollCostGbpVerified"
                      draft={draft}
                      updateField={updateField}
                      autosave={autosave}
                    />
                  </FieldWithFlag>

                  <FieldWithFlag
                    label="Geographic Footprint"
                    fieldName="geographicFootprint"
                    hint="Where the organisation employs people. Determines which regulatory fields appear (EU Pay Transparency Directive, gender pay gap reporting)."
                  >
                    <Select
                      value={draft.geographicFootprint ?? ""}
                      onValueChange={(v) => { updateField("geographicFootprint", v); autosave({ geographicFootprint: v }); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select footprint" /></SelectTrigger>
                      <SelectContent>
                        {GEOGRAPHIES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldWithFlag>

                  <FieldWithFlag
                    label="Ownership Structure"
                    fieldName="ownershipStructure"
                    hint="Legal ownership type. Listed companies have additional remuneration committee and pay ratio reporting obligations."
                  >
                    <Select
                      value={draft.ownershipStructure ?? ""}
                      onValueChange={(v) => { updateField("ownershipStructure", v); autosave({ ownershipStructure: v }); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select structure" /></SelectTrigger>
                      <SelectContent>
                        {OWNERSHIP_STRUCTURES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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
                <FieldWithFlag
                  label="HRIS Platform"
                  fieldName="hris"
                  hint="Primary HR information system. Determines which integration and automation initiatives are feasible."
                >
                  <Select
                    value={draft.hris ?? ""}
                    onValueChange={(v) => { updateField("hris", v); autosave({ hris: v }); }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select HRIS" /></SelectTrigger>
                    <SelectContent>
                      {HRIS_OPTIONS.map((h) => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldWithFlag>

                <WorkforceMixSlider
                  knowledge={draft.workforceKnowledgePct ?? 60}
                  frontline={draft.workforceFrontlinePct ?? 20}
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
                    hint="Whether the company has a material sales workforce with variable / commission-based pay. Relevant for Sales Comp Redesign initiatives."
                  >
                    <Select
                      value={draft.materialSalesWorkforce ?? ""}
                      onValueChange={(v) => { updateField("materialSalesWorkforce", v); autosave({ materialSalesWorkforce: v }); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {SALES_WORKFORCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldWithFlag>

                  <FieldWithFlag
                    label="Critical AI / Digital Talent Population"
                    fieldName="criticalAiDigitalTalentPopulation"
                    hint="Approximate size of the AI, data science, and digital engineering talent pool. Drives AI Talent Pay Strategy initiative relevance."
                  >
                    <Select
                      value={draft.criticalAiDigitalTalentPopulation ?? ""}
                      onValueChange={(v) => { updateField("criticalAiDigitalTalentPopulation", v); autosave({ criticalAiDigitalTalentPopulation: v }); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {TALENT_POPULATION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldWithFlag>
                </div>

                {/* Business AI Ambition slider (1–4) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Business AI Ambition</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            How ambitious is the wider business about AI adoption? This shapes the ambition level of recommended initiatives across all functions.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      Level {draft.businessAiAmbition ?? 2}
                    </Badge>
                  </div>
                  <Slider
                    min={1}
                    max={4}
                    step={1}
                    value={[draft.businessAiAmbition ?? 2]}
                    onValueChange={(v) => {
                      updateField("businessAiAmbition", v[0]);
                      autosave({ businessAiAmbition: v[0] });
                    }}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Cautious</span>
                    <span>Ambitious</span>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    {AI_AMBITION_LABELS[draft.businessAiAmbition ?? 2]}
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
                      disabled={completeMutation.isPending || !!isCompleted}
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
                  Regulatory details relevant to your sector, geographic footprint, and ownership structure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-amber-700 dark:text-amber-400">
                    These fields appear based on your sector, geographic footprint, and ownership structure.
                    They influence regulatory compliance initiatives in the strategy builder.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* FCA SYSC 19 — only for financial services sector */}
                  {showFca && (
                    <FieldWithFlag
                      label="FCA SYSC 19 in scope?"
                      fieldName="fcaSysc19InScope"
                      hint="Whether the company is subject to FCA SYSC 19 remuneration rules. Applies to banks, investment firms, and certain insurers regulated by the FCA."
                    >
                      <Select
                        value={draft.fcaSysc19InScope ?? ""}
                        onValueChange={(v) => { updateField("fcaSysc19InScope", v); autosave({ fcaSysc19InScope: v }); }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {FCA_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FieldWithFlag>
                  )}

                  {/* Listing Exchange — only for listed ownership structures */}
                  {showListingExchange && (
                    <FieldWithFlag
                      label="Listing Exchange"
                      fieldName="listingExchange"
                      hint="Primary stock exchange. Determines which remuneration committee reporting and pay ratio disclosure requirements apply."
                    >
                      <Select
                        value={draft.listingExchange ?? ""}
                        onValueChange={(v) => { updateField("listingExchange", v); autosave({ listingExchange: v }); }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {LISTING_EXCHANGES.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FieldWithFlag>
                  )}

                  {/* UK Headcount — only for multi-geo */}
                  {showUkHeadcount && (
                    <FieldWithFlag
                      label="UK Employee Headcount"
                      fieldName="ukEmployeeHeadcount"
                      hint="Number of employees based in the UK. Used to determine gender pay gap reporting threshold (250+ UK employees) and UK-specific compliance obligations."
                    >
                      <Input
                        type="number"
                        value={draft.ukEmployeeHeadcount ?? ""}
                        onChange={(e) => updateField("ukEmployeeHeadcount", e.target.value ? parseInt(e.target.value) : undefined)}
                        onBlur={() => handleHeadcountBlur("ukEmployeeHeadcount")}
                        placeholder="e.g. 3200"
                        min={0}
                      />
                    </FieldWithFlag>
                  )}

                  {/* EU Headcount — only for EU-presence geo */}
                  {showEuHeadcount && (
                    <FieldWithFlag
                      label="EU Employee Headcount"
                      fieldName="euEmployeeHeadcount"
                      hint="Number of employees based in EU member states. Used to determine EU Pay Transparency Directive obligations (100+ EU employees from 2026)."
                    >
                      <Input
                        type="number"
                        value={draft.euEmployeeHeadcount ?? ""}
                        onChange={(e) => updateField("euEmployeeHeadcount", e.target.value ? parseInt(e.target.value) : undefined)}
                        onBlur={() => handleHeadcountBlur("euEmployeeHeadcount")}
                        placeholder="e.g. 800"
                        min={0}
                      />
                    </FieldWithFlag>
                  )}
                </div>

                {headcountError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-destructive text-xs">{headcountError}</p>
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setScreen(2)} size="sm">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={() => {
                      if (!validateHeadcounts()) return;
                      completeMutation.mutate();
                    }}
                    disabled={completeMutation.isPending || !!isCompleted || !!headcountError}
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
