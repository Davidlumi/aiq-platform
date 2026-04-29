/**
 * Organisation Context Configuration - AiQ Enterprise Platform
 *
 * Captures all 6 configuration blocks from the AiQ Methodology v10.7 spec:
 * 1. Organisation Profile
 * 2. AI Tools & Company AI Context
 * 3. Risk Appetite & AI Maturity
 * 4. Governance & Policies
 * 5. UK Regulatory Context
 * 6. Assessment Configuration (quarterly review, revalidation, Small HR Function Mode)
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2,
  Shield,
  Brain,
  Settings,
  CheckCircle2,
  AlertCircle,
  Bot,
  Scale,
  RefreshCw,
  Users,
  Info,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Option Sets --------------------------------------------------------------

const SECTORS = [
  { value: "financial_services", label: "Financial Services" },
  { value: "healthcare", label: "Healthcare" },
  { value: "technology", label: "Technology" },
  { value: "retail", label: "Retail" },
  { value: "public_sector", label: "Public Sector" },
  { value: "professional_services", label: "Professional Services" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "other", label: "Other" },
];

const RISK_APPETITES = [
  { value: "risk_averse", label: "Risk Averse", desc: "Prioritises compliance and caution" },
  { value: "moderate", label: "Moderate", desc: "Balanced risk/reward approach" },
  { value: "risk_tolerant", label: "Risk Tolerant", desc: "Accepts higher risk for competitive advantage" },
];

const AI_MATURITY = [
  { value: "early_adopter", label: "Early Adopter", desc: "Actively piloting AI tools across HR" },
  { value: "scaling", label: "Scaling", desc: "Deploying AI tools organisation-wide" },
  { value: "mature", label: "Mature", desc: "AI is embedded in core HR processes" },
  { value: "cautious", label: "Cautious", desc: "Limited AI adoption, evaluating options" },
];

const HR_INFLUENCE = [
  { value: "strategic_partner", label: "Strategic Partner" },
  { value: "operational", label: "Operational" },
  { value: "administrative", label: "Administrative" },
];

const STRUCTURES = [
  { value: "centralised", label: "Centralised" },
  { value: "decentralised", label: "Decentralised" },
  { value: "matrix", label: "Matrix" },
  { value: "holding_company", label: "Holding Company" },
];

const AI_POLICY_STATUSES = [
  { value: "none", label: "None", desc: "No AI policy in place" },
  { value: "draft", label: "Draft", desc: "Policy under development" },
  { value: "approved", label: "Approved", desc: "Policy approved, not yet embedded" },
  { value: "embedded", label: "Embedded", desc: "Policy active and communicated" },
];

const UK_REGULATORY_FRAMEWORKS = [
  { value: "ICO", label: "ICO (Data Protection)" },
  { value: "FCA", label: "FCA (Financial Services)" },
  { value: "CQC", label: "CQC (Healthcare)" },
  { value: "NHS", label: "NHS England" },
  { value: "EHRC", label: "EHRC (Equality)" },
  { value: "HSE", label: "HSE (Health & Safety)" },
  { value: "SRA", label: "SRA (Legal)" },
  { value: "ICAEW", label: "ICAEW (Accounting)" },
  { value: "Ofsted", label: "Ofsted (Education)" },
  { value: "CMA", label: "CMA (Competition)" },
];

const COMMON_AI_TOOLS = [
  "Microsoft Copilot", "ChatGPT / OpenAI", "Google Gemini",
  "Workday AI", "SAP SuccessFactors AI", "Beamery",
  "Eightfold AI", "HireVue", "Pymetrics",
  "Textio", "Visier", "Lattice AI",
];

const REVALIDATION_CYCLES = [
  { value: 3, label: "Quarterly (3 months)" },
  { value: 6, label: "Half-yearly (6 months)" },
  { value: 12, label: "Annual (12 months)" },
  { value: 24, label: "Biennial (24 months)" },
];

// --- Toggle Button -------------------------------------------------------------

function ToggleChip({
  value,
  label,
  selected,
  onClick,
}: {
  value: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-xs rounded-lg border px-3 py-2 text-left transition-all",
        selected
          ? "border-primary bg-primary/5 text-foreground font-medium"
          : "border-border text-muted-foreground hover:border-primary/40"
      )}
    >
      {label}
    </button>
  );
}

// --- Component ----------------------------------------------------------------

export default function OrgContextPage() {
  const { data: existing, isLoading } = trpc.intelligence.orgContext.useQuery();
  const utils = trpc.useUtils();

  // Block 1: Organisation Profile
  const [sector, setSector] = useState<string>("");
  const [headcount, setHeadcount] = useState<string>("");
  const [structure, setStructure] = useState<string>("");
  const [hrInfluence, setHrInfluence] = useState<string>("");

  // Block 1b: Strategic Context
  const [strategicPriorities, setStrategicPriorities] = useState<string[]>([]);
  const [newPriority, setNewPriority] = useState<string>("");
  const [currentChallenges, setCurrentChallenges] = useState<string[]>([]);
  const [newChallenge, setNewChallenge] = useState<string>("");

  // Block 2: AI Tools & Company AI Context
  const [aiToolsInUse, setAiToolsInUse] = useState<string[]>([]);
  const [customAiTool, setCustomAiTool] = useState<string>("");
  const [companyAiContextNarrative, setCompanyAiContextNarrative] = useState<string>("");
  // Phase 3: Business Ambition Linkage
  const [ambitionTargetScore, setAmbitionTargetScore] = useState<string>("");
  const [ambitionTargetDate, setAmbitionTargetDate] = useState<string>("");
  const [ambitionTargetLabel, setAmbitionTargetLabel] = useState<string>("");

  // Block 3: Risk Appetite & AI Maturity
  const [riskAppetite, setRiskAppetite] = useState<string>("");
  const [aiMaturity, setAiMaturity] = useState<string>("");

  // Block 4: Governance & Policies
  const [aiGovernanceFramework, setAiGovernanceFramework] = useState<boolean>(false);
  const [aiEthicsCommittee, setAiEthicsCommittee] = useState<boolean>(false);
  const [aiPolicyStatus, setAiPolicyStatus] = useState<string>("none");
  const [hasDataProtectionPolicy, setHasDataProtectionPolicy] = useState<boolean>(false);
  const [hasEdiPolicy, setHasEdiPolicy] = useState<boolean>(false);
  const [hasWhistleblowingPolicy, setHasWhistleblowingPolicy] = useState<boolean>(false);
  const [hasRedundancyPolicy, setHasRedundancyPolicy] = useState<boolean>(false);

  // Block 5: UK Regulatory Context
  const [ukRegulatoryFrameworks, setUkRegulatoryFrameworks] = useState<string[]>([]);

  // Block 6: Assessment Configuration
  const [quarterlyReviewEnabled, setQuarterlyReviewEnabled] = useState<boolean>(false);
  const [revalidationCycleMonths, setRevalidationCycleMonths] = useState<number>(12);
  const [smallHRFunctionMode, setSmallHRFunctionMode] = useState<boolean>(false);

  const [initialised, setInitialised] = useState(false);

  // Pre-populate from existing config
  if (existing && !initialised) {
    if (existing.sector) setSector(existing.sector);
    if (existing.headcount) setHeadcount(String(existing.headcount));
    if (existing.structure) setStructure(existing.structure);
    if (existing.hrInfluence) setHrInfluence(existing.hrInfluence);
    if (existing.riskAppetiteOverall) setRiskAppetite(existing.riskAppetiteOverall);
    if (existing.aiMaturityLevel) setAiMaturity(existing.aiMaturityLevel);
    if (existing.aiGovernanceFramework != null) setAiGovernanceFramework(existing.aiGovernanceFramework);
    if (existing.aiEthicsCommittee != null) setAiEthicsCommittee(existing.aiEthicsCommittee);
    if ((existing as any).aiPolicyStatus) setAiPolicyStatus((existing as any).aiPolicyStatus);
    if (existing.hasDataProtectionPolicy != null) setHasDataProtectionPolicy(existing.hasDataProtectionPolicy);
    if (existing.hasEdiPolicy != null) setHasEdiPolicy(existing.hasEdiPolicy);
    if (existing.hasWhistleblowingPolicy != null) setHasWhistleblowingPolicy(existing.hasWhistleblowingPolicy);
    if (existing.hasRedundancyPolicy != null) setHasRedundancyPolicy(existing.hasRedundancyPolicy);
    try {
      if ((existing as any).aiToolsInUseJson) setAiToolsInUse(JSON.parse((existing as any).aiToolsInUseJson));
      if ((existing as any).ukRegulatoryFrameworksJson) setUkRegulatoryFrameworks(JSON.parse((existing as any).ukRegulatoryFrameworksJson));
    } catch {}
    if ((existing as any).companyAiContextNarrative) setCompanyAiContextNarrative((existing as any).companyAiContextNarrative);
    if ((existing as any).ambitionTargetScore != null) setAmbitionTargetScore(String((existing as any).ambitionTargetScore));
    if ((existing as any).ambitionTargetDate) setAmbitionTargetDate((existing as any).ambitionTargetDate);
    if ((existing as any).ambitionTargetLabel) setAmbitionTargetLabel((existing as any).ambitionTargetLabel);
    try {
      if ((existing as any).strategicPrioritiesJson) setStrategicPriorities(JSON.parse((existing as any).strategicPrioritiesJson));
      if ((existing as any).currentChallengesJson) setCurrentChallenges(JSON.parse((existing as any).currentChallengesJson));
    } catch {}
    if ((existing as any).quarterlyReviewEnabled != null) setQuarterlyReviewEnabled((existing as any).quarterlyReviewEnabled);
    if ((existing as any).revalidationCycleMonths) setRevalidationCycleMonths((existing as any).revalidationCycleMonths);
    if ((existing as any).smallHRFunctionMode != null) setSmallHRFunctionMode((existing as any).smallHRFunctionMode);
    setInitialised(true);
  }

  const upsert = trpc.intelligence.upsertOrgContext.useMutation({
    onSuccess: () => {
      toast.success("Organisation context saved. All future simulations will reflect this configuration.");
      utils.intelligence.orgContext.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function toggleAiTool(tool: string) {
    setAiToolsInUse(prev =>
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
    );
  }

  function addCustomTool() {
    const t = customAiTool.trim();
    if (t && !aiToolsInUse.includes(t)) {
      setAiToolsInUse(prev => [...prev, t]);
      setCustomAiTool("");
    }
  }

  function toggleFramework(fw: string) {
    setUkRegulatoryFrameworks(prev =>
      prev.includes(fw) ? prev.filter(f => f !== fw) : [...prev, fw]
    );
  }

  function handleSave() {
    upsert.mutate({
      sector: sector as any || undefined,
      headcount: headcount ? parseInt(headcount) : undefined,
      structure: structure as any || undefined,
      riskAppetiteOverall: riskAppetite as any || undefined,
      aiMaturityLevel: aiMaturity as any || undefined,
      hrInfluence: hrInfluence as any || undefined,
      aiGovernanceFramework,
      aiEthicsCommittee,
      aiPolicyStatus: aiPolicyStatus as any,
      hasDataProtectionPolicy,
      hasEdiPolicy,
      hasWhistleblowingPolicy,
      hasRedundancyPolicy,
      aiToolsInUse,
      ukRegulatoryFrameworks,
      companyAiContextNarrative: companyAiContextNarrative || undefined,
      strategicPriorities,
      currentChallenges,
      quarterlyReviewEnabled,
      revalidationCycleMonths,
      smallHRFunctionMode,
      // Phase 3: Business Ambition Linkage
      ambitionTargetScore: ambitionTargetScore ? parseInt(ambitionTargetScore) : null,
      ambitionTargetDate: ambitionTargetDate || null,
      ambitionTargetLabel: ambitionTargetLabel || null,
    });
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-md aiq-shimmer" />
          <div className="h-3.5 w-72 rounded-md aiq-shimmer" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="h-5 w-48 rounded-md aiq-shimmer" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 rounded-md aiq-shimmer" />
              <div className="h-10 w-full rounded-lg aiq-shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Organisation Context</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your organisation profile to personalise all simulations and assessments for your sector, risk appetite, and regulatory environment.
        </p>
      </div>

      {existing && (
        <div className="flex items-center gap-2 text-xs text-[#047857] bg-[#047857]/8 rounded-lg px-3 py-2 border border-[#047857]/20">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          Organisation context is configured. Simulations are personalised for your environment.
        </div>
      )}

      {/* Block 1: Organisation Profile */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Block 1 - Organisation Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">Sector</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SECTORS.map(s => (
                <ToggleChip key={s.value} value={s.value} label={s.label} selected={sector === s.value} onClick={() => setSector(s.value)} />
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Headcount</label>
              <input
                type="number"
                value={headcount}
                onChange={e => setHeadcount(e.target.value)}
                placeholder="e.g. 3800"
                className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Structure</label>
              <div className="grid grid-cols-2 gap-1.5">
                {STRUCTURES.map(s => (
                  <ToggleChip key={s.value} value={s.value} label={s.label} selected={structure === s.value} onClick={() => setStructure(s.value)} />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">HR Influence Level</label>
            <div className="flex gap-2">
              {HR_INFLUENCE.map(h => (
                <ToggleChip key={h.value} value={h.value} label={h.label} selected={hrInfluence === h.value} onClick={() => setHrInfluence(h.value)} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Block 1b: Strategic Context */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Target className="w-4 h-4 text-[#4477AA]" />
            Strategic Context
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Define your organisation's AI strategic priorities and current challenges. These drive the alignment analysis on the Leadership Dashboard.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Strategic Priorities */}
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">AI Strategic Priorities</label>
            <p className="text-xs text-muted-foreground mb-2">What are the key AI-related business objectives your HR function needs to support?</p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newPriority.trim()) {
                    setStrategicPriorities(prev => [...prev, newPriority.trim()]);
                    setNewPriority("");
                  }
                }}
                placeholder="e.g. Automate recruitment screening with AI"
                className="flex-1 text-xs rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#4477AA]"
              />
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  if (newPriority.trim()) {
                    setStrategicPriorities(prev => [...prev, newPriority.trim()]);
                    setNewPriority("");
                  }
                }}
              >
                Add
              </Button>
            </div>
            {strategicPriorities.length > 0 ? (
              <div className="space-y-1.5">
                {strategicPriorities.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-[#4477AA]/5 border border-[#4477AA]/10 rounded-lg px-3 py-2">
                    <span className="w-5 h-5 rounded-full bg-[#4477AA]/10 text-[#4477AA] flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                    <span className="flex-1 text-foreground">{p}</span>
                    <button
                      type="button"
                      onClick={() => setStrategicPriorities(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-[#CC3344] text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No strategic priorities added yet. These are essential for alignment analysis.</p>
            )}
          </div>

          <Separator />

          {/* Current Challenges */}
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">Current Business Challenges</label>
            <p className="text-xs text-muted-foreground mb-2">What challenges is the organisation currently facing that affect HR capability requirements?</p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newChallenge}
                onChange={(e) => setNewChallenge(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newChallenge.trim()) {
                    setCurrentChallenges(prev => [...prev, newChallenge.trim()]);
                    setNewChallenge("");
                  }
                }}
                placeholder="e.g. Regulatory pressure on AI transparency in hiring"
                className="flex-1 text-xs rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#4477AA]"
              />
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  if (newChallenge.trim()) {
                    setCurrentChallenges(prev => [...prev, newChallenge.trim()]);
                    setNewChallenge("");
                  }
                }}
              >
                Add
              </Button>
            </div>
            {currentChallenges.length > 0 ? (
              <div className="space-y-1.5">
                {currentChallenges.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-[#D97706]/8 border border-[#D97706]/20 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 text-[#99882A] shrink-0" />
                    <span className="flex-1 text-foreground">{c}</span>
                    <button
                      type="button"
                      onClick={() => setCurrentChallenges(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-[#CC3344] text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No challenges added yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Block 1c: Ambition Target */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Target className="w-4 h-4 text-[#047857]" />
            AI Readiness Ambition Target
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Set a target readiness score and date for your HR function. This drives the gap analysis on the Leadership Dashboard and individual "role in the AI strategy" panels.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Target Readiness Score (0-10)</label>
              <p className="text-xs text-muted-foreground mb-2">The Peakon-scale score your function is aiming for. 7.5 = "AI Ready", 9.0 = "Advanced".</p>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={ambitionTargetScore ? (parseFloat(ambitionTargetScore) / 10).toFixed(1) : ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v >= 0 && v <= 10) setAmbitionTargetScore(String(Math.round(v * 10)));
                  else if (e.target.value === "") setAmbitionTargetScore("");
                }}
                placeholder="e.g. 7.5"
                className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#047857]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Target Date</label>
              <p className="text-xs text-muted-foreground mb-2">When does the organisation need to reach this capability level?</p>
              <input
                type="date"
                value={ambitionTargetDate}
                onChange={(e) => setAmbitionTargetDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#047857]"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Ambition Statement (optional)</label>
            <p className="text-xs text-muted-foreground mb-2">A plain-English description of what this target means for the business.</p>
            <input
              type="text"
              value={ambitionTargetLabel}
              onChange={(e) => setAmbitionTargetLabel(e.target.value)}
              placeholder="e.g. HR function fully capable of deploying and governing AI tools across all people processes"
              className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#047857]"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1">{ambitionTargetLabel.length}/200 characters</p>
          </div>
          {ambitionTargetScore && (
            <div className="p-3 rounded-xl bg-[#047857]/5 border border-[#047857]/15">
              <p className="text-xs font-semibold text-[#047857] mb-0.5">Ambition preview</p>
              <p className="text-xs text-muted-foreground">
                Target: <strong className="text-foreground">{(parseFloat(ambitionTargetScore) / 10).toFixed(1)}</strong> / 10
                {ambitionTargetDate && <> by <strong className="text-foreground">{new Date(ambitionTargetDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</strong></>}
                {ambitionTargetLabel && <> - {ambitionTargetLabel}</>}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block 2: AI Tools & Company AI Context */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            Block 2 - AI Tools & Company AI Context
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Select the AI tools deployed in your organisation. This personalises scenario framing to reflect real tools your people encounter.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">AI Tools in Use</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_AI_TOOLS.map(tool => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => toggleAiTool(tool)}
                  className={cn(
                    "text-xs rounded-full border px-3 py-1.5 transition-all",
                    aiToolsInUse.includes(tool)
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {aiToolsInUse.includes(tool) ? "✓ " : ""}{tool}
                </button>
              ))}
            </div>
            {aiToolsInUse.filter(t => !COMMON_AI_TOOLS.includes(t)).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {aiToolsInUse.filter(t => !COMMON_AI_TOOLS.includes(t)).map(tool => (
                  <Badge
                    key={tool}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => toggleAiTool(tool)}
                  >
                    {tool} ×
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={customAiTool}
                onChange={e => setCustomAiTool(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustomTool()}
                placeholder="Add a custom tool..."
                className="flex-1 text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button variant="outline" size="sm" onClick={addCustomTool} className="shrink-0">Add</Button>
            </div>
          </div>

          <Separator />

          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">
              Company AI Context Narrative
              <span className="ml-1 text-muted-foreground font-normal">(optional - improves scenario personalisation)</span>
            </label>
            <textarea
              value={companyAiContextNarrative}
              onChange={e => setCompanyAiContextNarrative(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Describe how AI is used in your organisation. For example: 'We use Microsoft Copilot for drafting HR communications and Workday AI for workforce planning. Our AI governance is managed by the CISO with quarterly reviews. We are in the early stages of deploying AI-assisted recruitment screening.'"
              className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">{companyAiContextNarrative.length}/2000 characters</p>
          </div>
        </CardContent>
      </Card>

      {/* Block 3: Risk Appetite & AI Maturity */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Block 3 - Risk Appetite & AI Maturity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">Overall Risk Appetite</label>
            <div className="space-y-2">
              {RISK_APPETITES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRiskAppetite(r.value)}
                  className={cn(
                    "w-full text-left rounded-lg border px-4 py-3 transition-all",
                    riskAppetite === r.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <p className={cn("text-xs font-semibold", riskAppetite === r.value ? "text-primary" : "text-foreground")}>{r.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">AI Maturity Level</label>
            <div className="space-y-2">
              {AI_MATURITY.map(a => (
                <button
                  key={a.value}
                  onClick={() => setAiMaturity(a.value)}
                  className={cn(
                    "w-full text-left rounded-lg border px-4 py-3 transition-all",
                    aiMaturity === a.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <p className={cn("text-xs font-semibold", aiMaturity === a.value ? "text-primary" : "text-foreground")}>{a.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Block 4: Governance & Policies */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            Block 4 - Governance & Policies
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            These settings affect how ethical pressure and governance scenarios are applied in simulations.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI Policy Status */}
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">AI Policy Status</label>
            <div className="grid grid-cols-2 gap-2">
              {AI_POLICY_STATUSES.map(p => (
                <button
                  key={p.value}
                  onClick={() => setAiPolicyStatus(p.value)}
                  className={cn(
                    "text-left rounded-lg border px-3 py-2.5 transition-all",
                    aiPolicyStatus === p.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <p className={cn("text-xs font-semibold", aiPolicyStatus === p.value ? "text-primary" : "text-foreground")}>{p.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Policy & Governance Checkboxes */}
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">Active Governance Structures & Policies</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "aiGovernanceFramework", label: "AI Governance Framework", value: aiGovernanceFramework, set: setAiGovernanceFramework },
                { key: "aiEthicsCommittee", label: "AI Ethics Committee", value: aiEthicsCommittee, set: setAiEthicsCommittee },
                { key: "hasDataProtectionPolicy", label: "Data Protection Policy", value: hasDataProtectionPolicy, set: setHasDataProtectionPolicy },
                { key: "hasEdiPolicy", label: "EDI Policy", value: hasEdiPolicy, set: setHasEdiPolicy },
                { key: "hasWhistleblowingPolicy", label: "Whistleblowing Policy", value: hasWhistleblowingPolicy, set: setHasWhistleblowingPolicy },
                { key: "hasRedundancyPolicy", label: "Redundancy Policy", value: hasRedundancyPolicy, set: setHasRedundancyPolicy },
              ].map(({ key, label, value, set }) => (
                <button
                  key={key}
                  onClick={() => set(!value)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all",
                    value
                      ? "border-[#047857]/40 bg-[#047857]/5"
                      : "border-border hover:border-border/80"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded flex items-center justify-center shrink-0",
                    value ? "bg-[#047857]" : "bg-muted border border-border"
                  )}>
                    {value && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-xs text-foreground">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Block 5: UK Regulatory Context */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            Block 5 - UK Regulatory Context
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Select all regulatory frameworks that apply to your organisation. This ensures simulations reflect the correct compliance obligations and risk exposure.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {UK_REGULATORY_FRAMEWORKS.map(fw => (
              <button
                key={fw.value}
                type="button"
                onClick={() => toggleFramework(fw.value)}
                className={cn(
                  "text-xs rounded-lg border px-3 py-2 transition-all",
                  ukRegulatoryFrameworks.includes(fw.value)
                    ? "border-primary bg-primary/5 text-foreground font-medium"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {ukRegulatoryFrameworks.includes(fw.value) ? "✓ " : ""}{fw.label}
              </button>
            ))}
          </div>
          {ukRegulatoryFrameworks.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              {ukRegulatoryFrameworks.length} framework{ukRegulatoryFrameworks.length !== 1 ? "s" : ""} selected: {ukRegulatoryFrameworks.join(", ")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Block 6: Assessment Configuration */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            Block 6 - Assessment Configuration
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Configure how often capability assessments are refreshed and whether simplified scoring applies.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Revalidation Cycle */}
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">Revalidation Cycle</label>
            <div className="grid grid-cols-2 gap-2">
              {REVALIDATION_CYCLES.map(c => (
                <ToggleChip
                  key={c.value}
                  value={String(c.value)}
                  label={c.label}
                  selected={revalidationCycleMonths === c.value}
                  onClick={() => setRevalidationCycleMonths(c.value)}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Quarterly Review */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setQuarterlyReviewEnabled(!quarterlyReviewEnabled)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-3 text-left transition-all flex-1",
                quarterlyReviewEnabled
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded flex items-center justify-center shrink-0",
                quarterlyReviewEnabled ? "bg-primary" : "bg-muted border border-border"
              )}>
                {quarterlyReviewEnabled && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Enable Quarterly Re-verification</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Prompt all users to re-verify their capability scores every 3 months, regardless of the revalidation cycle above.
                </p>
              </div>
            </button>
          </div>

          {/* Small HR Function Mode */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setSmallHRFunctionMode(!smallHRFunctionMode)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-3 text-left transition-all flex-1",
                smallHRFunctionMode
                  ? "border-[#D97706] bg-[#D97706]/5"
                  : "border-border hover:border-[#D97706]/40"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded flex items-center justify-center shrink-0",
                smallHRFunctionMode ? "bg-[#D97706]" : "bg-muted border border-border"
              )}>
                {smallHRFunctionMode && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Small HR Function Mode</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recommended for HR functions with fewer than 50 employees. Reduces the number of required assessment items and applies simplified capability thresholds. Evidence requirements are proportionally adjusted.
                </p>
              </div>
            </button>
          </div>

          {smallHRFunctionMode && (
            <div className="flex items-start gap-2 text-xs text-[#D97706] bg-[#D97706]/8 rounded-lg px-3 py-2 border border-[#D97706]/20">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Small HR Function Mode reduces assessment length by ~40% and lowers the minimum evidence threshold. Results are clearly marked as small-function assessments in all reports.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          Changes apply to all future simulations and assessments for this organisation.
        </p>
        <Button
          onClick={handleSave}
          disabled={upsert.isPending}
          className="bg-primary hover:bg-primary/90 text-white gap-2"
        >
          {upsert.isPending ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}
