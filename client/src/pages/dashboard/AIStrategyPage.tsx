/**
 * AIStrategyPage — Single-plan AI People Strategy Dashboard
 *
 * Layout mirrors the StrategyBuilderPage pattern:
 *   1. Industry dropdown  (from orgContext.sector)
 *   2. Business AI Ambition dropdown (1-5 levels)
 *   3. People AI Ambition dropdown   (1-5 levels)
 *   4. Four narrative sections:
 *        Company Maturity · Company Ambition · People Strategy · The Gap
 *   5. Initiative library with pop-out detail modal
 *   6. Save strategy button
 */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Building2,
  Target,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Layers,
  Lightbulb,
  CheckCircle2,
  Plus,
  X,
  Save,
  Info,
  ChevronRight,
  BarChart3,
  GitBranch,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { DOMAIN_KEYS, DOMAIN_LABELS } from "@/lib/domains";
import type { CapabilityKey } from "@/lib/domains";

// ─── Sector options ───────────────────────────────────────────────────────────
const SECTORS = [
  { value: "financial_services", label: "Financial Services" },
  { value: "healthcare",          label: "Healthcare" },
  { value: "technology",          label: "Technology" },
  { value: "retail",              label: "Retail" },
  { value: "public_sector",       label: "Public Sector" },
  { value: "professional_services", label: "Professional Services" },
  { value: "manufacturing",       label: "Manufacturing" },
  { value: "other",               label: "Other" },
];

// ─── Ambition level descriptors ───────────────────────────────────────────────
const BUSINESS_LEVELS: Record<number, { label: string; description: string }> = {
  1: { label: "Cautious",       description: "AI used selectively in low-risk, back-office processes. Compliance and stability are the priority." },
  2: { label: "Exploratory",    description: "Piloting AI in specific workflows. Building internal confidence before wider rollout." },
  3: { label: "Progressive",    description: "AI embedded in core HR processes. The organisation expects HR to use AI tools confidently." },
  4: { label: "Ambitious",      description: "AI is a strategic differentiator. HR is expected to lead AI adoption across the business." },
  5: { label: "Transformative", description: "AI is central to the business model. HR people are expected to be AI-native practitioners." },
};

const PEOPLE_LEVELS: Record<number, { label: string; description: string }> = {
  1: { label: "Followers",     description: "HR people use AI tools as directed. Compliance with policy is the primary expectation." },
  2: { label: "Adopters",      description: "HR people are expected to learn and use AI tools in their day-to-day work." },
  3: { label: "Practitioners", description: "HR people apply AI confidently, evaluate outputs critically, and adapt workflows." },
  4: { label: "Champions",     description: "HR people advocate for AI, coach others, and contribute to AI governance." },
  5: { label: "Innovators",    description: "HR people design AI-enabled processes, lead change, and shape the organisation's AI strategy." },
};

// ─── Filter categories ────────────────────────────────────────────────────────
const FILTER_CATEGORIES = [
  "All",
  "Talent Acquisition",
  "Performance & Development",
  "Pay & Reward",
  "Learning & Development",
  "Workforce Planning",
  "GenAI Workforce Rollout",
  "HR Operations",
  "Ethics & Governance",
  "Custom",
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Talent Acquisition":        <Users className="w-3.5 h-3.5" />,
  "Learning & Development":    <Lightbulb className="w-3.5 h-3.5" />,
  "Performance & Development": <TrendingUp className="w-3.5 h-3.5" />,
  "Workforce Planning":        <Layers className="w-3.5 h-3.5" />,
  "Pay & Reward":              <Target className="w-3.5 h-3.5" />,
  "HR Operations":             <Zap className="w-3.5 h-3.5" />,
  "Ethics & Governance":       <Shield className="w-3.5 h-3.5" />,
  "GenAI Workforce Rollout":   <Zap className="w-3.5 h-3.5" />,
};

const AI_TYPE_COLORS: Record<string, string> = {
  generative:  "#A78BFA",
  predictive:  "#60A5FA",
  automation:  "#4ADE80",
  analytical:  "#FBBF24",
  agentic:     "#F472B6",
};

const DA_LABELS: Record<string, string> = {
  recommends_to_human: "Recommends",
  human_in_loop:       "Human-in-loop",
  full_automation:     "Full automation",
};

type DomainKey = typeof DOMAIN_KEYS[number];

// ─── Domain target computation ────────────────────────────────────────────────
function computeDomainTargets(businessLevel: number, peopleLevel: number): Record<DomainKey, number> {
  const base = Math.round((businessLevel * 0.55 + peopleLevel * 0.45) * 20);
  const adj: Record<DomainKey, number> = {
    ai_interaction:         Math.round(base + (peopleLevel - 3) * 3),
    ai_output_evaluation:   Math.round(base + (peopleLevel - 3) * 4),
    ai_workflow_design:     Math.round(base + (businessLevel - 3) * 5),
    workforce_ai_readiness: Math.round(base + (businessLevel - 3) * 3),
    ai_ethics_trust:        Math.round(base + (peopleLevel - 3) * 2 + (businessLevel - 3) * 2),
    ai_change_leadership:   Math.round(base + (businessLevel - 3) * 4 + (peopleLevel - 3) * 2),
  };
  const result = {} as Record<DomainKey, number>;
  for (const key of DOMAIN_KEYS) result[key] = Math.max(20, Math.min(100, adj[key]));
  return result;
}

function overallFromDomains(targets: Record<DomainKey, number>): number {
  const vals = DOMAIN_KEYS.map(k => targets[k]);
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

// ─── Narrative generators ─────────────────────────────────────────────────────
function getCompanyMaturityNarrative(sector: string, businessLevel: number): string {
  const sectorLabel = SECTORS.find(s => s.value === sector)?.label ?? "your sector";
  const maturity = businessLevel <= 2
    ? "early-stage AI adoption"
    : businessLevel === 3
    ? "active AI integration"
    : "advanced AI-led transformation";
  return `Your organisation is in ${maturity} within ${sectorLabel}. The current business ambition positions HR as ${
    businessLevel <= 2
      ? "a cautious adopter — focused on compliance, risk management, and selective piloting of AI tools"
      : businessLevel === 3
      ? "a confident adopter — embedding AI across core HR processes and building team capability at scale"
      : "a strategic leader — expected to drive AI adoption across the business and shape the organisation's AI direction"
  }.`;
}

function getCompanyAmbitionNarrative(businessLevel: number, peopleLevel: number): string {
  const bLabel = BUSINESS_LEVELS[businessLevel]?.label ?? "";
  const pLabel = PEOPLE_LEVELS[peopleLevel]?.label ?? "";
  return `The organisation has set a **${bLabel}** business AI ambition, meaning ${BUSINESS_LEVELS[businessLevel]?.description.toLowerCase() ?? ""}. To support this, HR people are expected to operate as **${pLabel}** — ${PEOPLE_LEVELS[peopleLevel]?.description.toLowerCase() ?? ""}. This combination defines the capability bar that every HR professional in the function needs to reach.`;
}

function getPeopleStrategyNarrative(peopleLevel: number, domainTargets: Record<DomainKey, number>): string {
  const topDomains = (Object.entries(domainTargets) as [DomainKey, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => DOMAIN_LABELS[k as CapabilityKey]);
  const pLabel = PEOPLE_LEVELS[peopleLevel]?.label ?? "";
  return `At the **${pLabel}** level, the people strategy prioritises building deep capability in ${topDomains.join(", ")}. Development programmes should be designed to close gaps in these areas first, with targeted interventions for role families that interact most directly with AI-enabled processes. Learning pathways should combine applied practice with structured assessment to ensure capability is real, not just self-reported.`;
}

function getGapNarrative(ambitionGap: any, businessLevel: number, peopleLevel: number): string {
  if (!ambitionGap?.configured) {
    return "Save your strategy configuration to generate a gap analysis. Once saved, this section will show the distance between your current HR capability baseline and the level required to deliver your AI ambition.";
  }
  const current = ambitionGap.functionAvgRaw != null ? (ambitionGap.functionAvgRaw / 10).toFixed(1) : null;
  const target = ambitionGap.ambitionTargetScore != null ? (ambitionGap.ambitionTargetScore / 10).toFixed(1) : null;
  const gap = ambitionGap.gapRaw != null ? (ambitionGap.gapRaw / 10).toFixed(1) : null;

  if (!current || !target) {
    return "No capability baseline data is available yet. Complete team assessments to generate a gap analysis against your AI ambition targets.";
  }

  if (ambitionGap.verdict === "exceeds") {
    return `HR is currently performing at Level ${current} — exceeding the Level ${target} target set by the ${BUSINESS_LEVELS[businessLevel]?.label} / ${PEOPLE_LEVELS[peopleLevel]?.label} ambition combination. Consider raising the ambition bar to maintain strategic stretch and drive continued development.`;
  }

  return `HR is currently at Level ${current} against a Level ${target} target — a gap of ${gap} levels. At the current pace of development, ${
    ambitionGap.monthsToTarget
      ? `the gap closes in approximately ${ambitionGap.monthsToTarget} months`
      : "the timeline to close the gap requires acceleration"
  }. The highest-priority domains to address are those with the largest distance from target, which should form the focus of the next development cycle.`;
}

// ─── Initiative detail modal ──────────────────────────────────────────────────
function InitiativeModal({
  initiative,
  open,
  onClose,
}: {
  initiative: any | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!initiative) return null;
  const typeColor = AI_TYPE_COLORS[initiative.aiType] ?? "#9CA3AF";
  const segments: string[] = initiative.owningSegmentsJson ?? [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">{initiative.name}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {initiative.category}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          {/* Type + authority badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: `${typeColor}20`, color: typeColor }}>
              {initiative.aiType}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-muted-foreground border border-white/8">
              {DA_LABELS[initiative.decisionAuthority] ?? initiative.decisionAuthority}
            </span>
            {initiative.regulatoryFlag && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
                EU AI Act high-risk
              </span>
            )}
          </div>

          {/* Description */}
          {initiative.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{initiative.description}</p>
          )}

          {/* Regulatory note */}
          {initiative.regulatoryFlag && (
            <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <p className="text-xs font-medium text-amber-400 mb-1">Regulatory consideration</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{initiative.regulatoryFlag}</p>
            </div>
          )}

          {/* Owning segments */}
          {segments.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Owning HR segments</p>
              <div className="flex gap-1.5 flex-wrap">
                {segments.map((seg: string) => (
                  <span key={seg} className="text-xs px-2 py-0.5 rounded bg-white/5 text-muted-foreground border border-white/8">
                    {seg}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Domain impact */}
          {initiative.weightsJson && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Domain capability impact</p>
              <div className="space-y-1.5">
                {DOMAIN_KEYS.map((key, i) => {
                  const w = (initiative.weightsJson as number[])[i] ?? 0;
                  if (w === 0) return null;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-36 truncate">{DOMAIN_LABELS[key as CapabilityKey]}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                        <div className="h-full rounded-full bg-green-400" style={{ width: `${Math.min(100, w * 100)}%` }} />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground w-8 text-right">{(w * 100).toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Initiative card ──────────────────────────────────────────────────────────
function InitiativeCard({
  initiative,
  onOpenModal,
}: {
  initiative: any;
  onOpenModal: (init: any) => void;
}) {
  const typeColor = AI_TYPE_COLORS[initiative.aiType] ?? "#9CA3AF";
  const segments: string[] = initiative.owningSegmentsJson ?? [];

  return (
    <button
      onClick={() => onOpenModal(initiative)}
      className="w-full text-left rounded-xl border border-white/8 bg-white/2 hover:border-white/20 hover:bg-white/4 transition-all duration-150 p-3.5 group"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-medium text-foreground leading-snug group-hover:text-green-400 transition-colors">
          {initiative.name}
        </p>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5 group-hover:text-green-400 transition-colors" />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: `${typeColor}20`, color: typeColor }}>
          {initiative.aiType}
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground border border-white/8">
          {DA_LABELS[initiative.decisionAuthority] ?? initiative.decisionAuthority}
        </span>
        {initiative.regulatoryFlag && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
            EU AI Act
          </span>
        )}
        {segments.slice(0, 1).map((seg: string) => (
          <span key={seg} className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground border border-white/8">
            {seg}
          </span>
        ))}
        {segments.length > 1 && (
          <span className="text-xs text-muted-foreground">+{segments.length - 1}</span>
        )}
      </div>
    </button>
  );
}

// ─── Narrative section card ───────────────────────────────────────────────────
function NarrativeCard({
  icon,
  title,
  subtitle,
  children,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accent ?? "bg-white/5"}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Gap bar ──────────────────────────────────────────────────────────────────
function GapBar({ label, current, target }: { label: string; current: number | null; target: number }) {
  const currentPct = current !== null ? Math.min(100, (current / 100) * 100) : 0;
  const targetPct = Math.min(100, (target / 100) * 100);
  const gap = current !== null ? target - current : null;
  const status = gap === null ? "unknown" : gap <= 0 ? "aligned" : gap <= 15 ? "partial" : "gap";
  const statusColors = {
    aligned: { bg: "#4ADE80", text: "#4ADE80", label: "On track" },
    partial:  { bg: "#60A5FA", text: "#60A5FA", label: "Developing" },
    gap:      { bg: "#FCD34D", text: "#FCD34D", label: "Behind" },
    unknown:  { bg: "#9CA3AF", text: "#9CA3AF", label: "No data" },
  };
  const sc = statusColors[status];
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground truncate">{label}</span>
        <span className="text-xs font-medium ml-2 flex-shrink-0" style={{ color: sc.text }}>{sc.label}</span>
      </div>
      <div className="relative h-3 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        {current !== null && (
          <div className="absolute top-0 left-0 h-full rounded transition-all duration-700" style={{ width: `${currentPct}%`, background: "rgba(96,165,250,0.5)" }} />
        )}
        <div className="absolute top-0 h-full w-0.5" style={{ left: `${targetPct}%`, background: sc.bg }} />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-xs font-mono text-muted-foreground">{current !== null ? (current / 10).toFixed(1) : "—"}</span>
        <span className="text-xs font-mono" style={{ color: sc.bg }}>▸ {(target / 10).toFixed(1)}</span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AIStrategyPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // ── Local state ──────────────────────────────────────────────────────────────
  const [businessLevel, setBusinessLevelRaw] = useState(3);
  const [peopleLevel, setPeopleLevelRaw] = useState(3);
  const [sector, setSectorRaw] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [modalInitiative, setModalInitiative] = useState<any | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const strategyQ = trpc.intelligence.getStrategy.useQuery();
  const orgContextQ = trpc.intelligence.orgContext.useQuery();
  const initiativesQ = trpc.strategy.listInitiatives.useQuery(
    { tenantId: user?.tenantId ?? "" },
    { enabled: !!user?.tenantId }
  );
  const ambitionGapQ = trpc.dashboardV2.leader.ambitionGap.useQuery();

  const strategyData = strategyQ.data;
  const orgContext = orgContextQ.data;
  const ambitionGap = ambitionGapQ.data;

  // ── Sync saved strategy into local state ─────────────────────────────────────
  useEffect(() => {
    if (strategyData?.configured) {
      setBusinessLevelRaw(strategyData.businessAmbitionLevel ?? 3);
      setPeopleLevelRaw(strategyData.peopleAmbitionLevel ?? 3);
      setIsDirty(false);
    }
  }, [strategyData]);

  useEffect(() => {
    if (orgContext?.sector) {
      setSectorRaw(orgContext.sector);
    }
  }, [orgContext]);

  const setBusinessLevel = useCallback((v: number) => { setBusinessLevelRaw(v); setIsDirty(true); }, []);
  const setPeopleLevel = useCallback((v: number) => { setPeopleLevelRaw(v); setIsDirty(true); }, []);
  const setSector = useCallback((v: string) => { setSectorRaw(v); setIsDirty(true); }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const domainTargets = useMemo(() => computeDomainTargets(businessLevel, peopleLevel), [businessLevel, peopleLevel]);
  const overallTarget = useMemo(() => overallFromDomains(domainTargets), [domainTargets]);

  const CATEGORY_MAP: Record<string, string> = {
    "Talent Acquisition":        "Talent Acquisition",
    "Learning & Development":    "Learning & Development",
    "Performance & Engagement":  "Performance & Development",
    "Performance & Development": "Performance & Development",
    "Workforce Planning":        "Workforce Planning",
    "Reward & Compensation":     "Pay & Reward",
    "Pay & Reward":              "Pay & Reward",
    "HR Operations":             "HR Operations",
    "Ethics & Governance":       "Ethics & Governance",
  };

  const allInitiatives = initiativesQ.data ?? [];
  const filteredInitiatives = useMemo(() => {
    if (categoryFilter === "All") return allInitiatives;
    if (categoryFilter === "Custom") return allInitiatives.filter((i: any) => i.isUserDefined);
    return allInitiatives.filter((i: any) => {
      const mapped = CATEGORY_MAP[i.category] ?? i.category;
      return mapped === categoryFilter;
    });
  }, [allInitiatives, categoryFilter]);

  // Narrative text (computed live from current selections)
  const companyMaturityText = useMemo(() => getCompanyMaturityNarrative(sector, businessLevel), [sector, businessLevel]);
  const companyAmbitionText = useMemo(() => getCompanyAmbitionNarrative(businessLevel, peopleLevel), [businessLevel, peopleLevel]);
  const peopleStrategyText  = useMemo(() => getPeopleStrategyNarrative(peopleLevel, domainTargets), [peopleLevel, domainTargets]);
  const gapText             = useMemo(() => getGapNarrative(ambitionGap, businessLevel, peopleLevel), [ambitionGap, businessLevel, peopleLevel]);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const upsertOrgContextMut = trpc.intelligence.upsertOrgContext.useMutation({
    onSuccess: () => utils.intelligence.orgContext.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const saveStrategyMut = trpc.intelligence.saveStrategy.useMutation({
    onSuccess: () => {
      toast.success("AI People Strategy saved.");
      setIsDirty(false);
      utils.intelligence.getStrategy.invalidate();
      utils.dashboardV2.leader.ambitionGap.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSave() {
    // Save sector to org context if changed
    if (sector && sector !== orgContext?.sector) {
      upsertOrgContextMut.mutate({ sector: sector as any });
    }
    saveStrategyMut.mutate({
      businessAmbitionLevel: businessLevel,
      peopleAmbitionLevel: peopleLevel,
      domainTargets,
      ambitionTargetScore: overallTarget,
      ambitionTargetDate: strategyData?.ambitionTargetDate ?? null,
      ambitionTargetLabel: strategyData?.ambitionTargetLabel ?? null,
    });
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  const isLoading = strategyQ.isLoading || orgContextQ.isLoading;
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">AI Strategy</p>
          <h1 className="text-2xl font-bold text-foreground">AI People Strategy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {SECTORS.find(s => s.value === sector)?.label ?? "Configure your sector below"} ·{" "}
            {BUSINESS_LEVELS[businessLevel]?.label} business ambition ·{" "}
            {PEOPLE_LEVELS[peopleLevel]?.label} people ambition
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isDirty && (
            <Button
              size="sm"
              className="bg-green-500 hover:bg-green-400 text-black font-semibold"
              onClick={handleSave}
              disabled={saveStrategyMut.isPending}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saveStrategyMut.isPending ? "Saving…" : "Save strategy"}
            </Button>
          )}
          {!isDirty && strategyData?.configured && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Saved
            </Badge>
          )}
          <a href="/api/pdf/ai_strategy" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export PDF
            </Button>
          </a>
        </div>
      </div>

      {/* ── Context selectors ── */}
      <div className="space-y-3">
        {/* Industry / Sector */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">Industry</p>
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger className="h-7 text-sm border-0 bg-transparent p-0 focus:ring-0 w-auto min-w-[160px]">
                <SelectValue placeholder="Select your sector…" />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Business AI Ambition */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48 flex-shrink-0">
              Business AI Ambition
            </p>
            <Select value={String(businessLevel)} onValueChange={v => setBusinessLevel(Number(v))}>
              <SelectTrigger className="h-7 text-sm border-0 bg-transparent p-0 focus:ring-0 w-auto min-w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map(level => (
                  <SelectItem key={level} value={String(level)}>
                    {BUSINESS_LEVELS[level].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground hidden sm:block ml-2">
              {BUSINESS_LEVELS[businessLevel]?.description}
            </p>
          </div>
        </div>

        {/* People AI Ambition */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48 flex-shrink-0">
              People AI Ambition
            </p>
            <Select value={String(peopleLevel)} onValueChange={v => setPeopleLevel(Number(v))}>
              <SelectTrigger className="h-7 text-sm border-0 bg-transparent p-0 focus:ring-0 w-auto min-w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map(level => (
                  <SelectItem key={level} value={String(level)}>
                    {PEOPLE_LEVELS[level].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground hidden sm:block ml-2">
              {PEOPLE_LEVELS[peopleLevel]?.description}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main layout: left narrative + right initiative library ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Left: Four narrative sections ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* 1. Company Maturity */}
          <NarrativeCard
            icon={<Building2 className="w-4 h-4 text-blue-400" />}
            title="Company Maturity"
            subtitle="Where you are now in your AI journey"
            accent="bg-blue-500/10"
          >
            <p className="text-sm text-muted-foreground leading-relaxed">{companyMaturityText}</p>
          </NarrativeCard>

          {/* 2. Company Ambition */}
          <NarrativeCard
            icon={<Target className="w-4 h-4 text-green-400" />}
            title="Company Ambition"
            subtitle="What the organisation expects from HR and its people"
            accent="bg-green-500/10"
          >
            <p className="text-sm text-muted-foreground leading-relaxed">
              {companyAmbitionText.split("**").map((part, i) =>
                i % 2 === 1 ? <strong key={i} className="text-foreground">{part}</strong> : part
              )}
            </p>
          </NarrativeCard>

          {/* 3. People Strategy */}
          <NarrativeCard
            icon={<GitBranch className="w-4 h-4 text-purple-400" />}
            title="People Strategy"
            subtitle="How to develop the HR function to meet the ambition"
            accent="bg-purple-500/10"
          >
            <p className="text-sm text-muted-foreground leading-relaxed">
              {peopleStrategyText.split("**").map((part, i) =>
                i % 2 === 1 ? <strong key={i} className="text-foreground">{part}</strong> : part
              )}
            </p>
            {/* Domain target bars */}
            <div className="mt-4 space-y-3">
              {DOMAIN_KEYS.map(key => {
                const target = domainTargets[key];
                const current = strategyData?.currentDomainScores?.[key] ?? null;
                return (
                  <GapBar
                    key={key}
                    label={DOMAIN_LABELS[key as CapabilityKey]}
                    current={current}
                    target={target}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-blue-400/50 inline-block" />Current</span>
              <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-green-400 inline-block" />Target</span>
            </div>
          </NarrativeCard>

          {/* 4. The Gap */}
          <NarrativeCard
            icon={<TrendingUp className="w-4 h-4 text-amber-400" />}
            title="The Gap"
            subtitle="Distance between current capability and AI ambition"
            accent="bg-amber-500/10"
          >
            <p className="text-sm text-muted-foreground leading-relaxed">{gapText}</p>
            {/* KPI tiles */}
            {ambitionGap?.configured && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  {
                    label: "Current Level",
                    value: ambitionGap.functionAvgRaw != null ? (ambitionGap.functionAvgRaw / 10).toFixed(1) : "—",
                    color: "#60A5FA",
                  },
                  {
                    label: "Target Level",
                    value: ambitionGap.ambitionTargetScore != null ? (ambitionGap.ambitionTargetScore / 10).toFixed(1) : "—",
                    color: "#4ADE80",
                  },
                  {
                    label: "Gap",
                    value: ambitionGap.gapRaw != null && ambitionGap.gapRaw > 0 ? `${(ambitionGap.gapRaw / 10).toFixed(1)}` : "None",
                    color: ambitionGap.gapRaw != null && ambitionGap.gapRaw > 0 ? "#FCD34D" : "#4ADE80",
                  },
                ].map(tile => (
                  <div key={tile.label} className="rounded-lg border border-white/8 bg-white/3 p-3 text-center">
                    <p className="text-2xl font-bold" style={{ color: tile.color }}>{tile.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tile.label}</p>
                  </div>
                ))}
              </div>
            )}
            {!ambitionGap?.configured && !isDirty && (
              <div className="mt-3 p-3 rounded-lg border border-white/8 bg-white/3 flex items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <p className="text-xs text-muted-foreground">Save your strategy to generate the gap analysis.</p>
              </div>
            )}
          </NarrativeCard>
        </div>

        {/* ── Right: Initiative library ── */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-1">Initiative Library</h2>
            <p className="text-xs text-muted-foreground mb-3">Click any initiative to view details</p>
            {/* Category filter chips */}
            <div className="flex gap-1.5 flex-wrap">
              {FILTER_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                    categoryFilter === cat
                      ? "border-green-500/60 bg-green-500/10 text-green-400"
                      : "border-white/10 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  {CATEGORY_ICONS[cat] && <span>{CATEGORY_ICONS[cat]}</span>}
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Initiative cards */}
          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {initiativesQ.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
            ) : filteredInitiatives.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No initiatives in this category.</div>
            ) : (
              filteredInitiatives.map((init: any) => (
                <InitiativeCard
                  key={init.id}
                  initiative={init}
                  onOpenModal={setModalInitiative}
                />
              ))
            )}
          </div>

          {/* Initiative count */}
          {!initiativesQ.isLoading && filteredInitiatives.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {filteredInitiatives.length} initiative{filteredInitiatives.length !== 1 ? "s" : ""} in this category
            </p>
          )}
        </div>
      </div>

      {/* ── Save CTA (bottom) ── */}
      {isDirty && (
        <div className="sticky bottom-4 flex justify-center">
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-6 py-3 flex items-center gap-4 shadow-lg">
            <p className="text-sm text-green-400">You have unsaved changes to your strategy.</p>
            <Button
              size="sm"
              className="bg-green-500 hover:bg-green-400 text-black font-semibold"
              onClick={handleSave}
              disabled={saveStrategyMut.isPending}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saveStrategyMut.isPending ? "Saving…" : "Save strategy"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Initiative detail modal ── */}
      <InitiativeModal
        initiative={modalInitiative}
        open={!!modalInitiative}
        onClose={() => setModalInitiative(null)}
      />
    </div>
  );
}
