/**
 * Organisation Context Configuration — AiQ Enterprise Platform
 *
 * Admin page for configuring the organisation context that personalises
 * all simulations and assessments for this tenant.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Building2,
  Shield,
  Brain,
  Users,
  Settings,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Option Sets ──────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrgContextPage() {
  const { data: existing, isLoading } = trpc.intelligence.orgContext.useQuery();
  const utils = trpc.useUtils();

  const [sector, setSector] = useState<string>("");
  const [headcount, setHeadcount] = useState<string>("");
  const [structure, setStructure] = useState<string>("");
  const [riskAppetite, setRiskAppetite] = useState<string>("");
  const [aiMaturity, setAiMaturity] = useState<string>("");
  const [hrInfluence, setHrInfluence] = useState<string>("");
  const [aiGovernanceFramework, setAiGovernanceFramework] = useState<boolean>(false);
  const [aiEthicsCommittee, setAiEthicsCommittee] = useState<boolean>(false);
  const [hasAiUsagePolicy, setHasAiUsagePolicy] = useState<boolean>(false);
  const [hasDataProtectionPolicy, setHasDataProtectionPolicy] = useState<boolean>(false);
  const [hasEdiPolicy, setHasEdiPolicy] = useState<boolean>(false);
  const [hasWhistleblowingPolicy, setHasWhistleblowingPolicy] = useState<boolean>(false);
  const [initialised, setInitialised] = useState(false);

  // Pre-populate from existing config
  if (existing && !initialised) {
    if (existing.sector) setSector(existing.sector);
    if (existing.headcount) setHeadcount(String(existing.headcount));
    if (existing.structure) setStructure(existing.structure);
    if (existing.riskAppetiteOverall) setRiskAppetite(existing.riskAppetiteOverall);
    if (existing.aiMaturityLevel) setAiMaturity(existing.aiMaturityLevel);
    if (existing.hrInfluence) setHrInfluence(existing.hrInfluence);
    if (existing.aiGovernanceFramework != null) setAiGovernanceFramework(existing.aiGovernanceFramework);
    if (existing.aiEthicsCommittee != null) setAiEthicsCommittee(existing.aiEthicsCommittee);
    if (existing.hasAiUsagePolicy != null) setHasAiUsagePolicy(existing.hasAiUsagePolicy);
    if (existing.hasDataProtectionPolicy != null) setHasDataProtectionPolicy(existing.hasDataProtectionPolicy);
    if (existing.hasEdiPolicy != null) setHasEdiPolicy(existing.hasEdiPolicy);
    if (existing.hasWhistleblowingPolicy != null) setHasWhistleblowingPolicy(existing.hasWhistleblowingPolicy);
    setInitialised(true);
  }

  const upsert = trpc.intelligence.upsertOrgContext.useMutation({
    onSuccess: () => {
      toast.success("Organisation context saved. All future simulations will reflect this configuration.");
      utils.intelligence.orgContext.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

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
      hasAiUsagePolicy,
      hasDataProtectionPolicy,
      hasEdiPolicy,
      hasWhistleblowingPolicy,
    });
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-sora">Organisation Context</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your organisation profile to personalise all simulations and assessments for your sector, risk appetite, and regulatory environment.
        </p>
      </div>

      {existing && (
        <div className="flex items-center gap-2 text-xs text-[#228833] bg-[#228833]/8 rounded-lg px-3 py-2 border border-[#228833]/20">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          Organisation context is configured. Simulations are personalised for your environment.
        </div>
      )}

      {/* Section 1: Organisation Profile */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#10B981]" />
            Organisation Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sector */}
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">Sector</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SECTORS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setSector(s.value)}
                  className={cn(
                    "text-xs rounded-lg border px-3 py-2 text-left transition-all",
                    sector === s.value
                      ? "border-[#10B981] bg-[#10B981]/5 text-foreground font-medium"
                      : "border-border text-muted-foreground hover:border-[#10B981]/40"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Headcount + Structure */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Headcount</label>
              <input
                type="number"
                value={headcount}
                onChange={e => setHeadcount(e.target.value)}
                placeholder="e.g. 3800"
                className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Structure</label>
              <div className="grid grid-cols-2 gap-1.5">
                {STRUCTURES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setStructure(s.value)}
                    className={cn(
                      "text-xs rounded-lg border px-2 py-1.5 transition-all",
                      structure === s.value
                        ? "border-[#10B981] bg-[#10B981]/5 text-foreground font-medium"
                        : "border-border text-muted-foreground hover:border-[#10B981]/40"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* HR Influence */}
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">HR Influence Level</label>
            <div className="flex gap-2">
              {HR_INFLUENCE.map(h => (
                <button
                  key={h.value}
                  onClick={() => setHrInfluence(h.value)}
                  className={cn(
                    "text-xs rounded-lg border px-3 py-2 flex-1 transition-all",
                    hrInfluence === h.value
                      ? "border-[#10B981] bg-[#10B981]/5 text-foreground font-medium"
                      : "border-border text-muted-foreground hover:border-[#10B981]/40"
                  )}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Risk & AI Maturity */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#10B981]" />
            Risk Appetite & AI Maturity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Risk Appetite */}
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
                      ? "border-[#10B981] bg-[#10B981]/5"
                      : "border-border hover:border-[#10B981]/40"
                  )}
                >
                  <p className={cn("text-xs font-semibold", riskAppetite === r.value ? "text-[#10B981]" : "text-foreground")}>{r.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* AI Maturity */}
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
                      ? "border-[#10B981] bg-[#10B981]/5"
                      : "border-border hover:border-[#10B981]/40"
                  )}
                >
                  <p className={cn("text-xs font-semibold", aiMaturity === a.value ? "text-[#10B981]" : "text-foreground")}>{a.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Governance & Policies */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#10B981]" />
            Governance & Policies
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            These settings affect how ethical pressure is applied in simulations.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "aiGovernanceFramework", label: "AI Governance Framework", value: aiGovernanceFramework, set: setAiGovernanceFramework },
              { key: "aiEthicsCommittee", label: "AI Ethics Committee", value: aiEthicsCommittee, set: setAiEthicsCommittee },
              { key: "hasAiUsagePolicy", label: "AI Usage Policy", value: hasAiUsagePolicy, set: setHasAiUsagePolicy },
              { key: "hasDataProtectionPolicy", label: "Data Protection Policy", value: hasDataProtectionPolicy, set: setHasDataProtectionPolicy },
              { key: "hasEdiPolicy", label: "EDI Policy", value: hasEdiPolicy, set: setHasEdiPolicy },
              { key: "hasWhistleblowingPolicy", label: "Whistleblowing Policy", value: hasWhistleblowingPolicy, set: setHasWhistleblowingPolicy },
            ].map(({ key, label, value, set }) => (
              <button
                key={key}
                onClick={() => set(!value)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all",
                  value
                    ? "border-[#228833]/40 bg-[#228833]/5"
                    : "border-border hover:border-border/80"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded flex items-center justify-center shrink-0",
                  value ? "bg-[#228833]" : "bg-muted border border-border"
                )}>
                  {value && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <span className="text-xs text-foreground">{label}</span>
              </button>
            ))}
          </div>
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
          className="bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-2"
        >
          {upsert.isPending ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}
