/**
 * AIStrategyPage — Single-plan AI People Strategy Dashboard
 *
 * Layout:
 *   1. Control panel: Industry / Business AI Ambition / People AI Ambition dropdowns
 *   2. Four narrative sections: Company Maturity · Company Ambition · People Strategy · The Gap
 *   3. Selected Initiatives section (inline, only shows chosen initiatives)
 *   4. "Manage Initiatives" button opens a full-screen modal with the full library
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
} from "@/components/ui/dialog";
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
  X,
  Save,
  Info,
  BarChart3,
  GitBranch,
  Download,
  ListPlus,
  Check,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { DOMAIN_KEYS, DOMAIN_LABELS } from "@/lib/domains";
import type { CapabilityKey } from "@/lib/domains";

// ─── Sector options ───────────────────────────────────────────────────────────
const SECTORS = [
  { value: "financial_services",    label: "Financial Services" },
  { value: "healthcare",            label: "Healthcare" },
  { value: "technology",            label: "Technology" },
  { value: "retail",                label: "Retail" },
  { value: "public_sector",         label: "Public Sector" },
  { value: "professional_services", label: "Professional Services" },
  { value: "manufacturing",         label: "Manufacturing" },
  { value: "other",                 label: "Other" },
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
  const maturity = businessLevel <= 2 ? "early-stage AI adoption" : businessLevel === 3 ? "active AI integration" : "advanced AI-led transformation";
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
  const target  = ambitionGap.ambitionTargetScore != null ? (ambitionGap.ambitionTargetScore / 10).toFixed(1) : null;
  const gap     = ambitionGap.gapRaw != null ? (ambitionGap.gapRaw / 10).toFixed(1) : null;
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

// ─── Sub-components ───────────────────────────────────────────────────────────
function NarrativeCard({
  icon, title, subtitle, accent, children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-5">
      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md ${accent} mb-3`}>
        {icon}
        <span className="text-xs font-semibold text-foreground">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>
      {children}
    </div>
  );
}

function GapBar({ label, current, target }: { label: string; current: number | null; target: number }) {
  const targetPct = Math.min(100, Math.max(0, target));
  const currentPct = current !== null ? Math.min(100, Math.max(0, current)) : null;
  const sc = targetPct >= 70 ? { bg: "#4ADE80" } : targetPct >= 40 ? { bg: "#FCD34D" } : { bg: "#F87171" };
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="relative h-2 rounded-full bg-white/8 overflow-visible">
        {currentPct !== null && (
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

// ─── Initiative detail modal (read-only) ─────────────────────────────────────
function InitiativeDetailModal({ initiative, open, onClose }: { initiative: any | null; open: boolean; onClose: () => void }) {
  if (!initiative) return null;
  const typeColor = AI_TYPE_COLORS[initiative.aiType] ?? "#9CA3AF";
  const segments: string[] = initiative.owningSegmentsJson ?? [];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold pr-6">{initiative.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="flex flex-wrap gap-2">
            {initiative.aiType && (
              <Badge style={{ background: `${typeColor}22`, color: typeColor, border: `1px solid ${typeColor}44` }} className="text-xs">
                {initiative.aiType}
              </Badge>
            )}
            {initiative.decisionAuthority && (
              <Badge variant="outline" className="text-xs">{DA_LABELS[initiative.decisionAuthority] ?? initiative.decisionAuthority}</Badge>
            )}
            {initiative.regulatoryFlag && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">EU AI Act</Badge>
            )}
          </div>
          {initiative.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{initiative.description}</p>
          )}
          {segments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Owning HR Segments</p>
              <div className="flex flex-wrap gap-1.5">
                {segments.map((s: string) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}
          {initiative.capabilityImpactJson && Object.keys(initiative.capabilityImpactJson).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Capability Impact</p>
              <div className="space-y-2">
                {(Object.entries(initiative.capabilityImpactJson) as [string, number][]).map(([domain, impact]) => (
                  <div key={domain} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-40 truncate">{DOMAIN_LABELS[domain as CapabilityKey] ?? domain}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/8">
                      <div className="h-full rounded-full bg-green-400/70" style={{ width: `${Math.min(100, impact * 20)}%` }} />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-4 text-right">+{impact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Initiative selector modal (full-screen) ──────────────────────────────────
function InitiativeSelectorModal({
  open,
  onClose,
  allInitiatives,
  selectedIds,
  onToggle,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  allInitiatives: any[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onDone: () => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [detailInitiative, setDetailInitiative] = useState<any | null>(null);

  const filtered = useMemo(() => {
    if (categoryFilter === "All") return allInitiatives;
    if (categoryFilter === "Custom") return allInitiatives.filter((i: any) => i.isUserDefined);
    return allInitiatives.filter((i: any) => {
      const mapped = CATEGORY_MAP[i.category] ?? i.category;
      return mapped === categoryFilter;
    });
  }, [allInitiatives, categoryFilter]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-foreground">Initiative Library</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedIds.size} selected · click to select or deselect · click the arrow to view details</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-400 text-black font-semibold"
                onClick={onDone}
              >
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Done ({selectedIds.size})
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Category filter */}
          <div className="px-6 py-3 border-b border-white/8 flex-shrink-0">
            <div className="flex gap-1.5 flex-wrap">
              {FILTER_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                    categoryFilter === cat
                      ? "border-green-500/60 bg-green-500/10 text-green-400"
                      : "border-white/10 bg-white/3 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  {CATEGORY_ICONS[cat] && <span>{CATEGORY_ICONS[cat]}</span>}
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Initiative list */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No initiatives in this category.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filtered.map((init: any) => {
                  const isSelected = selectedIds.has(init.id);
                  const typeColor = AI_TYPE_COLORS[init.aiType] ?? "#9CA3AF";
                  return (
                    <div
                      key={init.id}
                      onClick={() => onToggle(init.id)}
                      className={`relative rounded-xl border p-3.5 cursor-pointer transition-all ${
                        isSelected
                          ? "border-green-500/50 bg-green-500/8"
                          : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
                      }`}
                    >
                      {/* Selection indicator */}
                      <div className={`absolute top-3 right-10 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        isSelected ? "border-green-500 bg-green-500" : "border-white/20 bg-transparent"
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-black" />}
                      </div>

                      {/* Detail arrow */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailInitiative(init); }}
                        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <p className="text-sm font-medium text-foreground pr-12 mb-2">{init.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {init.aiType && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${typeColor}22`, color: typeColor }}>
                            {init.aiType}
                          </span>
                        )}
                        {init.decisionAuthority && (
                          <span className="text-xs px-1.5 py-0.5 rounded border border-white/10 text-muted-foreground">
                            {DA_LABELS[init.decisionAuthority] ?? init.decisionAuthority}
                          </span>
                        )}
                        {init.regulatoryFlag && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">EU AI Act</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail modal (nested) */}
      <InitiativeDetailModal
        initiative={detailInitiative}
        open={!!detailInitiative}
        onClose={() => setDetailInitiative(null)}
      />
    </>
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
  const [selectedInitiativeIds, setSelectedInitiativeIds] = useState<Set<string>>(new Set());
  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [detailInitiative, setDetailInitiative] = useState<any | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const strategyQ   = trpc.intelligence.getStrategy.useQuery();
  const orgContextQ = trpc.intelligence.orgContext.useQuery();
  const initiativesQ = trpc.strategy.listInitiatives.useQuery(
    { tenantId: user?.tenantId ?? "" },
    { enabled: !!user?.tenantId }
  );
  const ambitionGapQ = trpc.dashboardV2.leader.ambitionGap.useQuery();

  const strategyData = strategyQ.data;
  const orgContext   = orgContextQ.data;
  const ambitionGap  = ambitionGapQ.data;
  const allInitiatives = initiativesQ.data ?? [];

  // ── Sync saved strategy into local state ─────────────────────────────────────
  useEffect(() => {
    if (strategyData?.configured) {
      setBusinessLevelRaw(strategyData.businessAmbitionLevel ?? 3);
      setPeopleLevelRaw(strategyData.peopleAmbitionLevel ?? 3);
      setSelectedInitiativeIds(new Set(strategyData.selectedInitiativeIds ?? []));
      setIsDirty(false);
    }
  }, [strategyData]);

  useEffect(() => {
    if (orgContext?.sector) setSectorRaw(orgContext.sector);
  }, [orgContext]);

  const setBusinessLevel = useCallback((v: number) => { setBusinessLevelRaw(v); setIsDirty(true); }, []);
  const setPeopleLevel   = useCallback((v: number) => { setPeopleLevelRaw(v); setIsDirty(true); }, []);
  const setSector        = useCallback((v: string) => { setSectorRaw(v); setIsDirty(true); }, []);

  const toggleInitiative = useCallback((id: string) => {
    setSelectedInitiativeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setIsDirty(true);
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const domainTargets  = useMemo(() => computeDomainTargets(businessLevel, peopleLevel), [businessLevel, peopleLevel]);
  const overallTarget  = useMemo(() => overallFromDomains(domainTargets), [domainTargets]);
  const selectedInits  = useMemo(() => allInitiatives.filter((i: any) => selectedInitiativeIds.has(i.id)), [allInitiatives, selectedInitiativeIds]);

  // Narrative text
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
    if (sector && sector !== orgContext?.sector) {
      upsertOrgContextMut.mutate({ sector: sector as any });
    }
    saveStrategyMut.mutate({
      businessAmbitionLevel: businessLevel,
      peopleAmbitionLevel:   peopleLevel,
      domainTargets,
      ambitionTargetScore:   overallTarget,
      ambitionTargetDate:    strategyData?.ambitionTargetDate ?? null,
      ambitionTargetLabel:   strategyData?.ambitionTargetLabel ?? null,
      selectedInitiativeIds: Array.from(selectedInitiativeIds),
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20 flex-shrink-0">Industry</p>
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger className="h-7 text-sm border-0 bg-background text-foreground font-medium p-1.5 focus:ring-0 w-auto min-w-[160px] rounded-md">
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
          <div className="flex items-center gap-3 flex-wrap">
            <BarChart3 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48 flex-shrink-0">
              Business AI Ambition
            </p>
            <Select value={String(businessLevel)} onValueChange={v => setBusinessLevel(Number(v))}>
              <SelectTrigger className="h-7 text-sm border-0 bg-background text-foreground font-medium p-1.5 focus:ring-0 w-auto min-w-[160px] rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map(level => (
                  <SelectItem key={level} value={String(level)}>{BUSINESS_LEVELS[level].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground hidden sm:block ml-2 flex-1">
              {BUSINESS_LEVELS[businessLevel]?.description}
            </p>
          </div>
        </div>

        {/* People AI Ambition */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48 flex-shrink-0">
              People AI Ambition
            </p>
            <Select value={String(peopleLevel)} onValueChange={v => setPeopleLevel(Number(v))}>
              <SelectTrigger className="h-7 text-sm border-0 bg-background text-foreground font-medium p-1.5 focus:ring-0 w-auto min-w-[160px] rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map(level => (
                  <SelectItem key={level} value={String(level)}>{PEOPLE_LEVELS[level].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground hidden sm:block ml-2 flex-1">
              {PEOPLE_LEVELS[peopleLevel]?.description}
            </p>
          </div>
        </div>
      </div>

      {/* ── Four narrative sections ── */}
      <div className="space-y-4">
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
          <div className="mt-4 space-y-3">
            {DOMAIN_KEYS.map(key => {
              const target  = domainTargets[key];
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
          {ambitionGap?.configured && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: "Current Level", value: ambitionGap.functionAvgRaw != null ? (ambitionGap.functionAvgRaw / 10).toFixed(1) : "—", color: "#60A5FA" },
                { label: "Target Level",  value: ambitionGap.ambitionTargetScore != null ? (ambitionGap.ambitionTargetScore / 10).toFixed(1) : "—", color: "#4ADE80" },
                { label: "Gap",           value: ambitionGap.gapRaw != null && ambitionGap.gapRaw > 0 ? `${(ambitionGap.gapRaw / 10).toFixed(1)}` : "None", color: ambitionGap.gapRaw != null && ambitionGap.gapRaw > 0 ? "#FCD34D" : "#4ADE80" },
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

      {/* ── Selected Initiatives ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Selected Initiatives</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedInits.length > 0
                ? `${selectedInits.length} initiative${selectedInits.length !== 1 ? "s" : ""} added to this strategy`
                : "No initiatives selected yet"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSelectorModal(true)}
            className="flex-shrink-0"
          >
            <ListPlus className="w-3.5 h-3.5 mr-1.5" />
            Manage Initiatives
          </Button>
        </div>

        {selectedInits.length === 0 ? (
          <div
            className="rounded-xl border border-dashed border-white/15 bg-white/2 p-8 text-center cursor-pointer hover:border-white/25 transition-colors"
            onClick={() => setShowSelectorModal(true)}
          >
            <ListPlus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Click to open the initiative library and select initiatives for this strategy.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {selectedInits.map((init: any) => {
              const typeColor = AI_TYPE_COLORS[init.aiType] ?? "#9CA3AF";
              return (
                <div
                  key={init.id}
                  className="relative rounded-xl border border-green-500/25 bg-green-500/5 p-3.5 cursor-pointer hover:border-green-500/40 transition-colors"
                  onClick={() => setDetailInitiative(init)}
                >
                  {/* Remove button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleInitiative(init.id); }}
                    className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <p className="text-sm font-medium text-foreground pr-6 mb-2">{init.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {init.aiType && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${typeColor}22`, color: typeColor }}>
                        {init.aiType}
                      </span>
                    )}
                    {init.decisionAuthority && (
                      <span className="text-xs px-1.5 py-0.5 rounded border border-white/10 text-muted-foreground">
                        {DA_LABELS[init.decisionAuthority] ?? init.decisionAuthority}
                      </span>
                    )}
                    {init.regulatoryFlag && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">EU AI Act</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Save CTA (sticky bottom) ── */}
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

      {/* ── Initiative selector modal ── */}
      <InitiativeSelectorModal
        open={showSelectorModal}
        onClose={() => setShowSelectorModal(false)}
        allInitiatives={allInitiatives}
        selectedIds={selectedInitiativeIds}
        onToggle={toggleInitiative}
        onDone={() => setShowSelectorModal(false)}
      />

      {/* ── Initiative detail modal ── */}
      <InitiativeDetailModal
        initiative={detailInitiative}
        open={!!detailInitiative}
        onClose={() => setDetailInitiative(null)}
      />
    </div>
  );
}
