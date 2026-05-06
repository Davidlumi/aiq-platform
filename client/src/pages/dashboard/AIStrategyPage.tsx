/**
 * AIStrategyPage — HR AI Strategy Executive Paper
 *
 * Layout:
 *   1. Control panel: Industry / Business AI Ambition / People AI Ambition dropdowns + Save
 *   2. Executive Summary: Vision statement — how AI will change ways of work
 *   3. Initiative Roadmap: visual timeline of selected initiatives by phase
 *   4. Capability Gap: per-domain gap analysis — what the HR team needs to deliver the vision
 *   5. Manage Initiatives modal (full-screen library)
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
  Download,
  ListPlus,
  Check,
  ChevronRight,
  Sparkles,
  Map,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { DOMAIN_KEYS, DOMAIN_LABELS, DOMAIN_COLOURS, DOMAIN_DESCRIPTIONS } from "@/lib/domains";
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
const BUSINESS_LEVELS: Record<number, { label: string; description: string; waysOfWork: string }> = {
  1: {
    label: "Cautious",
    description: "AI used selectively in low-risk, back-office processes. Compliance and stability are the priority.",
    waysOfWork: "HR processes remain largely human-led. AI assists with administrative tasks and reporting. The focus is on risk management and regulatory compliance rather than transformation.",
  },
  2: {
    label: "Exploratory",
    description: "Piloting AI in specific workflows. Building internal confidence before wider rollout.",
    waysOfWork: "HR is beginning to pilot AI in targeted areas — screening, scheduling, and analytics. Ways of working are evolving as teams build confidence and establish governance frameworks for responsible AI use.",
  },
  3: {
    label: "Progressive",
    description: "AI embedded in core HR processes. The organisation expects HR to use AI tools confidently.",
    waysOfWork: "AI is embedded across core HR processes. HR professionals are expected to use AI tools as a standard part of their workflow — from talent decisions to workforce planning — and to critically evaluate AI outputs before acting.",
  },
  4: {
    label: "Ambitious",
    description: "AI is a strategic differentiator. HR is expected to lead AI adoption across the business.",
    waysOfWork: "AI is a strategic differentiator. HR leads AI adoption across the business — designing AI-enabled processes, coaching leaders, and shaping governance. Ways of working are fundamentally redesigned around human-AI collaboration.",
  },
  5: {
    label: "Transformative",
    description: "AI is central to the business model. HR people are expected to be AI-native practitioners.",
    waysOfWork: "AI is central to the business model. HR professionals are AI-native — they design, govern, and continuously improve AI-enabled people systems. The function operates as an AI centre of excellence for the wider organisation.",
  },
};

const PEOPLE_LEVELS: Record<number, { label: string; description: string; expectation: string }> = {
  1: {
    label: "Followers",
    description: "HR people use AI tools as directed. Compliance with policy is the primary expectation.",
    expectation: "HR professionals are expected to follow AI-assisted processes and comply with policy. They use AI tools as directed and escalate concerns through defined channels.",
  },
  2: {
    label: "Adopters",
    description: "HR people are expected to learn and use AI tools in their day-to-day work.",
    expectation: "HR professionals are expected to actively learn and adopt AI tools in their daily work. They understand the basics of AI output quality and can identify when to seek human review.",
  },
  3: {
    label: "Practitioners",
    description: "HR people apply AI confidently, evaluate outputs critically, and adapt workflows.",
    expectation: "HR professionals apply AI confidently across their role. They critically evaluate AI outputs, adapt workflows to incorporate AI effectively, and contribute to team capability building.",
  },
  4: {
    label: "Champions",
    description: "HR people advocate for AI, coach others, and contribute to AI governance.",
    expectation: "HR professionals champion AI adoption across the function. They coach colleagues, contribute to AI governance, and help design AI-enabled processes that improve outcomes for employees and the business.",
  },
  5: {
    label: "Innovators",
    description: "HR people design AI-enabled processes, lead change, and shape the organisation's AI strategy.",
    expectation: "HR professionals lead AI innovation. They design AI-enabled processes, shape the organisation's AI strategy, and build the capability of the wider business to work effectively with AI.",
  },
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

// Category colours for the roadmap timeline
const CATEGORY_COLOURS: Record<string, string> = {
  "Talent Acquisition":        "#60A5FA",
  "Performance & Development": "#A78BFA",
  "Pay & Reward":              "#FBBF24",
  "Learning & Development":    "#4ADE80",
  "Workforce Planning":        "#F472B6",
  "GenAI Workforce Rollout":   "#FB923C",
  "HR Operations":             "#22D3EE",
  "Ethics & Governance":       "#F87171",
  "Custom":                    "#9CA3AF",
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

// Phase labels for the roadmap
const PHASE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  "Q1": { label: "Phase 1 — Foundation",    color: "#60A5FA", bg: "rgba(96,165,250,0.08)" },
  "Q2": { label: "Phase 2 — Build",         color: "#A78BFA", bg: "rgba(167,139,250,0.08)" },
  "Q3": { label: "Phase 3 — Scale",         color: "#4ADE80", bg: "rgba(74,222,128,0.08)" },
  "Q4": { label: "Phase 4 — Optimise",      color: "#FBBF24", bg: "rgba(251,191,36,0.08)" },
  "unknown": { label: "Ongoing",            color: "#9CA3AF", bg: "rgba(156,163,175,0.08)" },
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

// ─── Executive narrative generators ──────────────────────────────────────────
function buildVisionStatement(sector: string, businessLevel: number, peopleLevel: number): string {
  const sectorLabel = SECTORS.find(s => s.value === sector)?.label ?? "our sector";
  const bLevel = BUSINESS_LEVELS[businessLevel];
  const pLevel = PEOPLE_LEVELS[peopleLevel];
  if (!bLevel || !pLevel) return "";

  return `In ${sectorLabel}, the integration of artificial intelligence into HR is no longer a future consideration — it is a present-day imperative. Our organisation has set a ${bLevel.label} AI ambition: ${bLevel.waysOfWork}

To deliver this vision, every HR professional must operate at the ${pLevel.label} level. ${pLevel.expectation}

This strategy defines the initiatives, development priorities, and capability investments required to close the gap between where our HR function is today and where it needs to be to deliver on this ambition.`;
}

function buildGapNarrative(
  ambitionGap: any,
  businessLevel: number,
  peopleLevel: number,
  domainTargets: Record<DomainKey, number>,
  currentDomainScores: Record<string, number> | null | undefined
): string {
  const bLabel = BUSINESS_LEVELS[businessLevel]?.label ?? "";
  const pLabel = PEOPLE_LEVELS[peopleLevel]?.label ?? "";

  if (!ambitionGap?.configured) {
    return `To deliver a ${bLabel} business AI ambition with ${pLabel} HR people, the function must develop capability across all six AI domains. Save your strategy to generate a live gap analysis against your current team baseline.`;
  }

  const current = ambitionGap.functionAvgRaw != null ? (ambitionGap.functionAvgRaw / 10).toFixed(1) : null;
  const target  = ambitionGap.ambitionTargetScore != null ? (ambitionGap.ambitionTargetScore / 10).toFixed(1) : null;
  const gap     = ambitionGap.gapRaw != null ? (ambitionGap.gapRaw / 10).toFixed(1) : null;

  if (!current || !target) {
    return `The ${bLabel} / ${pLabel} ambition combination sets a clear capability bar for the HR function. Complete team assessments to generate a live gap analysis showing the distance between current capability and what is required.`;
  }

  if (ambitionGap.verdict === "exceeds") {
    return `The HR function is currently performing at Level ${current} — exceeding the Level ${target} target set by the ${bLabel} / ${pLabel} ambition combination. The function is well-positioned to deliver the AI vision. Consider raising the ambition bar to maintain strategic stretch and drive continued development.`;
  }

  const highGapDomains = (Object.entries(domainTargets) as [DomainKey, number][])
    .map(([key, target]) => ({
      key,
      label: DOMAIN_LABELS[key as CapabilityKey],
      target,
      current: currentDomainScores?.[key] ?? null,
      gap: currentDomainScores?.[key] != null ? target - (currentDomainScores[key] ?? 0) : null,
    }))
    .filter(d => d.gap !== null && d.gap > 0)
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))
    .slice(0, 3);

  const priorityDomains = highGapDomains.map(d => d.label).join(", ");

  return `The HR function is currently at Level ${current} against a Level ${target} target — a gap of ${gap} levels. ${
    ambitionGap.monthsToTarget
      ? `At the current pace of development, this gap closes in approximately ${ambitionGap.monthsToTarget} months.`
      : "Closing this gap will require a structured, accelerated development programme."
  } The highest-priority capability areas to address are ${priorityDomains || "across all domains"} — these represent the greatest distance from the level required to deliver the ${bLabel} AI ambition. Development investment should be concentrated here in the first two phases of the roadmap.`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Initiative detail modal
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

// Initiative selector modal (full-screen library)
function InitiativeSelectorModal({
  open, onClose, allInitiatives, selectedIds, onToggle, onDone,
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
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-foreground">Initiative Library</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedIds.size} selected · click to select or deselect · arrow to view details</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-green-500 hover:bg-green-400 text-black font-semibold" onClick={onDone}>
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Done ({selectedIds.size})
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
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
                        isSelected ? "border-green-500/50 bg-green-500/8" : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
                      }`}
                    >
                      <div className={`absolute top-3 right-10 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        isSelected ? "border-green-500 bg-green-500" : "border-white/20 bg-transparent"
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-black" />}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailInitiative(init); }}
                        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <p className="text-sm font-medium text-foreground pr-12 mb-2">{init.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {init.aiType && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${typeColor}22`, color: typeColor }}>{init.aiType}</span>
                        )}
                        {init.decisionAuthority && (
                          <span className="text-xs px-1.5 py-0.5 rounded border border-white/10 text-muted-foreground">{DA_LABELS[init.decisionAuthority] ?? init.decisionAuthority}</span>
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
      <InitiativeDetailModal initiative={detailInitiative} open={!!detailInitiative} onClose={() => setDetailInitiative(null)} />
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
  const strategyQ    = trpc.intelligence.getStrategy.useQuery();
  const orgContextQ  = trpc.intelligence.orgContext.useQuery();
  const initiativesQ = trpc.strategy.listInitiatives.useQuery(
    { tenantId: user?.tenantId ?? "" },
    { enabled: !!user?.tenantId }
  );
  const ambitionGapQ       = trpc.dashboardV2.leader.ambitionGap.useQuery();
  const companyAssessmentQ  = trpc.companyAssessment.getMyAssessmentResults.useQuery();

  const strategyData     = strategyQ.data;
  const orgContext       = orgContextQ.data;
  const ambitionGap      = ambitionGapQ.data;
  const allInitiatives   = initiativesQ.data ?? [];
  const companyResults   = companyAssessmentQ.data;

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

  // Group selected initiatives by phase/quarter
  const initiativesByPhase = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const init of selectedInits) {
      const phase = (init as any).targetQuarter ?? "unknown";
      if (!groups[phase]) groups[phase] = [];
      groups[phase].push(init);
    }
    // Sort phases: Q1, Q2, Q3, Q4, unknown
    const order = ["Q1", "Q2", "Q3", "Q4", "unknown"];
    return order.filter(p => groups[p]?.length > 0).map(p => ({ phase: p, items: groups[p] }));
  }, [selectedInits]);

  // Vision statement
  const visionStatement = useMemo(() => buildVisionStatement(sector, businessLevel, peopleLevel), [sector, businessLevel, peopleLevel]);

  // Gap narrative
  const gapNarrative = useMemo(
    () => buildGapNarrative(ambitionGap, businessLevel, peopleLevel, domainTargets, strategyData?.currentDomainScores as Record<string, number> | null | undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ambitionGap, businessLevel, peopleLevel, domainTargets, strategyData]
  );

  // Domain gap rows
  const domainGapRows = useMemo(() => {
    const clamp = (v: number) => Math.min(100, Math.max(0, v));
    const scores = strategyData?.currentDomainScores as Record<string, number> | null | undefined;
    return DOMAIN_KEYS.map(key => {
      const target  = domainTargets[key];
      const current = scores?.[key] ?? null;
      const gap     = current !== null ? target - current : null;
      return { key, label: DOMAIN_LABELS[key as CapabilityKey], description: DOMAIN_DESCRIPTIONS?.[key as CapabilityKey] ?? "", target, current, gap, color: DOMAIN_COLOURS[key as CapabilityKey] ?? "#60A5FA", targetPct: clamp(target), currentPct: current !== null ? clamp(current) : null };
    }).sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0));
  }, [domainTargets, strategyData]);

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
  const isLoading = strategyQ.isLoading || orgContextQ.isLoading || companyAssessmentQ.isLoading;
  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const sectorLabel = SECTORS.find(s => s.value === sector)?.label;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 pt-2">
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">AI Strategy</p>
          <h1 className="text-2xl font-bold text-foreground">HR AI Strategy</h1>
          {sectorLabel && (
            <p className="text-sm text-muted-foreground mt-1">
              {sectorLabel} · {BUSINESS_LEVELS[businessLevel]?.label} business ambition · {PEOPLE_LEVELS[peopleLevel]?.label} people ambition
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isDirty && (
            <Button size="sm" className="bg-green-500 hover:bg-green-400 text-black font-semibold" onClick={handleSave} disabled={saveStrategyMut.isPending}>
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

      {/* ── Control panel ── */}
      <div className="rounded-xl border border-white/8 bg-white/3 divide-y divide-white/6">
        {/* Industry */}
        <div className="flex items-center gap-4 px-5 py-3.5">
          <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-44 flex-shrink-0">Industry</p>
          <Select value={sector} onValueChange={setSector}>
            <SelectTrigger className="h-7 text-sm border border-white/10 bg-background text-foreground font-medium px-2.5 focus:ring-0 w-auto min-w-[180px] rounded-md">
              <SelectValue placeholder="Select your sector…" />
            </SelectTrigger>
            <SelectContent>
              {SECTORS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Business AI Ambition */}
        <div className="flex items-center gap-4 px-5 py-3.5 flex-wrap">
          <BarChart3 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-44 flex-shrink-0">Business AI Ambition</p>
          <Select value={String(businessLevel)} onValueChange={v => setBusinessLevel(Number(v))}>
            <SelectTrigger className="h-7 text-sm border border-white/10 bg-background text-foreground font-medium px-2.5 focus:ring-0 w-auto min-w-[180px] rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map(level => (
                <SelectItem key={level} value={String(level)}>{BUSINESS_LEVELS[level].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground hidden sm:block flex-1">{BUSINESS_LEVELS[businessLevel]?.description}</p>
        </div>

        {/* People AI Ambition */}
        <div className="flex items-center gap-4 px-5 py-3.5 flex-wrap">
          <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-44 flex-shrink-0">People AI Ambition</p>
          <Select value={String(peopleLevel)} onValueChange={v => setPeopleLevel(Number(v))}>
            <SelectTrigger className="h-7 text-sm border border-white/10 bg-background text-foreground font-medium px-2.5 focus:ring-0 w-auto min-w-[180px] rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map(level => (
                <SelectItem key={level} value={String(level)}>{PEOPLE_LEVELS[level].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground hidden sm:block flex-1">{PEOPLE_LEVELS[peopleLevel]?.description}</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 0 — COMPANY CONTEXT (from Company Assessment)
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/15 flex-shrink-0">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-amber-400 uppercase">Company Context</p>
            <h2 className="text-base font-semibold text-foreground leading-tight">Where the Organisation Is Today</h2>
          </div>
        </div>

        {!companyResults ? (
          <div className="rounded-xl border border-dashed border-amber-500/20 bg-amber-500/4 p-8 text-center">
            <Building2 className="w-7 h-7 text-amber-400/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No company assessment completed</p>
            <p className="text-xs text-muted-foreground mb-4">Complete the Company Assessment to ground this strategy in your organisation's actual AI maturity. The assessment evaluates 7 dimensions and produces a maturity score, sector benchmark, and executive summary that feeds directly into this strategy.</p>
            <a href="/company-assessment">
              <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                <Building2 className="w-3.5 h-3.5 mr-1.5" />
                Go to Company Assessment
              </Button>
            </a>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/15 bg-amber-500/4 divide-y divide-white/6">
            {/* Company maturity header */}
            <div className="p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {companyResults.companyName ?? "Your Organisation"}
                    {companyResults.companySector ? ` · ${companyResults.companySector}` : ""}
                  </p>
                  <h3 className="text-base font-semibold text-foreground">
                    AI Maturity: <span className="text-amber-400">{companyResults.maturityLabel}</span>
                  </h3>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-amber-400">{companyResults.overallScore.toFixed(1)}<span className="text-sm font-normal text-muted-foreground">/5</span></p>
                  <p className="text-xs text-muted-foreground">Sector avg: {companyResults.sectorAverage.toFixed(1)}/5</p>
                </div>
              </div>
              {/* Maturity bar */}
              <div className="h-2 rounded-full bg-white/8 mb-1.5">
                <div className="h-full rounded-full bg-amber-400/70 transition-all" style={{ width: `${(companyResults.overallScore / 5) * 100}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Foundational</span><span>Developing</span><span>Scaling</span><span>Leading</span><span>Pioneering</span>
              </div>
            </div>

            {/* Dimension scores */}
            <div className="p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">7 Dimension Breakdown</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
                {companyResults.dimensions.map(dim => {
                  const pct = (dim.score / 5) * 100;
                  const vsAvg = dim.score - companyResults.sectorAverage;
                  return (
                    <div key={dim.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-foreground font-medium truncate pr-2">{dim.label}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs font-mono text-foreground">{dim.score.toFixed(1)}</span>
                          <span className={`text-xs font-mono ${vsAvg >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {vsAvg >= 0 ? "+" : ""}{vsAvg.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/8">
                        <div className="h-full rounded-full bg-amber-400/60" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2.5">Score vs sector average shown in green/red.</p>
            </div>

            {/* Executive summary from assessment */}
            {companyResults.executiveSummary && (
              <div className="p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assessment Executive Summary</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{companyResults.executiveSummary}</p>
              </div>
            )}

            {/* What this means for the HR AI Strategy */}
            <div className="p-5">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">What This Means for the HR AI Strategy</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {(() => {
                  const score = companyResults.overallScore;
                  const bLabel = BUSINESS_LEVELS[businessLevel]?.label ?? "";
                  const pLabel = PEOPLE_LEVELS[peopleLevel]?.label ?? "";
                  const weakDims = [...companyResults.dimensions].sort((a, b) => a.score - b.score).slice(0, 2);
                  const weakNames = weakDims.map(d => d.label).join(" and ");
                  if (score < 2) {
                    return `The organisation is at an early stage of AI maturity. The HR AI strategy must prioritise building foundational awareness, governance, and data infrastructure before scaling AI tools. With a ${bLabel} business ambition and ${pLabel} people expectation, the HR function must lead by example — demonstrating responsible AI adoption and building confidence across the organisation. Priority areas to address are ${weakNames}.`;
                  } else if (score < 3) {
                    return `The organisation is developing its AI capability but adoption remains uneven. The HR AI strategy must focus on scaling successful pilots, strengthening governance, and closing capability gaps in ${weakNames}. With a ${bLabel} business ambition, the HR function is expected to move beyond early experiments and embed AI into core people processes. The ${pLabel} people expectation requires a structured development programme to bring the HR team up to the required level.`;
                  } else if (score < 4) {
                    return `The organisation has a solid AI foundation and is scaling adoption. The HR AI strategy should focus on embedding AI deeply into people processes, strengthening the ${weakNames} dimensions, and positioning HR as a strategic AI leader. With a ${bLabel} business ambition and ${pLabel} people expectation, the HR function must operate at the frontier of AI-enabled HR practice.`;
                  } else {
                    return `The organisation is an AI leader in its sector. The HR AI strategy should focus on maintaining the competitive advantage, innovating in ${weakNames}, and contributing to industry standards. With a ${bLabel} business ambition and ${pLabel} people expectation, the HR function is expected to shape the organisation's AI future.`;
                  }
                })()}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — EXECUTIVE SUMMARY
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        {/* Section header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/15 flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-blue-400 uppercase">Section 1</p>
            <h2 className="text-base font-semibold text-foreground leading-tight">Executive Summary</h2>
          </div>
        </div>

        <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-6">
          {/* Vision headline */}
          <div className="mb-5 pb-5 border-b border-white/8">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Our AI Vision</p>
            <h3 className="text-lg font-semibold text-foreground leading-snug">
              How AI will change our ways of work in {sectorLabel ?? "our sector"}
            </h3>
          </div>

          {/* Vision body */}
          {visionStatement ? (
            <div className="space-y-4">
              {visionStatement.split("\n\n").map((para, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">{para}</p>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Info className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">Select your industry and ambition levels above to generate the vision statement.</p>
            </div>
          )}

          {/* Ambition summary pills */}
          {sector && (
            <div className="mt-5 pt-4 border-t border-white/8 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/4 px-3 py-2">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Industry:</span>
                <span className="text-xs font-semibold text-foreground">{sectorLabel}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/4 px-3 py-2">
                <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Business:</span>
                <span className="text-xs font-semibold text-foreground">{BUSINESS_LEVELS[businessLevel]?.label}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/4 px-3 py-2">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">People:</span>
                <span className="text-xs font-semibold text-foreground">{PEOPLE_LEVELS[peopleLevel]?.label}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/4 px-3 py-2">
                <Target className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Capability target:</span>
                <span className="text-xs font-semibold text-foreground">{(overallTarget / 10).toFixed(1)} / 10</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — INITIATIVE ROADMAP
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-500/15 flex-shrink-0">
              <Map className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-purple-400 uppercase">Section 2</p>
              <h2 className="text-base font-semibold text-foreground leading-tight">Initiative Roadmap</h2>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowSelectorModal(true)} className="flex-shrink-0">
            <ListPlus className="w-3.5 h-3.5 mr-1.5" />
            {selectedInits.length > 0 ? `Manage (${selectedInits.length})` : "Add Initiatives"}
          </Button>
        </div>

        {selectedInits.length === 0 ? (
          <div
            className="rounded-xl border border-dashed border-purple-500/20 bg-purple-500/4 p-10 text-center cursor-pointer hover:border-purple-500/35 transition-colors"
            onClick={() => setShowSelectorModal(true)}
          >
            <Map className="w-8 h-8 text-purple-400/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No initiatives selected</p>
            <p className="text-xs text-muted-foreground">Open the initiative library to select the AI initiatives that will deliver your vision.</p>
            <Button size="sm" variant="outline" className="mt-4 border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
              <ListPlus className="w-3.5 h-3.5 mr-1.5" />
              Open Initiative Library
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Intro line */}
            <p className="text-sm text-muted-foreground">
              {selectedInits.length} initiative{selectedInits.length !== 1 ? "s" : ""} selected to deliver the <strong className="text-foreground">{BUSINESS_LEVELS[businessLevel]?.label}</strong> AI vision — sequenced across four phases to build capability progressively and manage organisational change.
            </p>

            {/* ── Horizontal timeline ── */}
            <div className="rounded-xl border border-white/8 bg-white/2 overflow-hidden">

              {/* Vision thread bar */}
              <div className="relative px-6 pt-5 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span className="text-xs font-bold tracking-widest text-purple-400 uppercase">AI Vision Thread</span>
                </div>
                {/* Continuous vision bar */}
                <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "linear-gradient(90deg, #60A5FA 0%, #A78BFA 33%, #4ADE80 66%, #FBBF24 100%)" }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
                {/* Phase labels above the bar */}
                <div className="grid mt-1" style={{ gridTemplateColumns: `repeat(${Math.max(1, initiativesByPhase.filter(p => p.phase !== "unknown").length || 4)}, 1fr)` }}>
                  {["Q1", "Q2", "Q3", "Q4"].map((q) => {
                    const cfg = PHASE_LABELS[q];
                    return (
                      <div key={q} className="text-center">
                        <span className="text-xs font-semibold" style={{ color: cfg.color }}>
                          {cfg.label.split(" — ")[1]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Phase columns — horizontal scroll */}
              <div className="overflow-x-auto pb-5 px-4">
                <div className="flex gap-3" style={{ minWidth: `${Math.max(4, initiativesByPhase.length) * 220}px` }}>
                  {["Q1", "Q2", "Q3", "Q4"].map((q, colIdx) => {
                    const cfg = PHASE_LABELS[q];
                    const phaseGroup = initiativesByPhase.find(p => p.phase === q);
                    const items: any[] = phaseGroup?.items ?? [];
                    const isEmpty = items.length === 0;
                    return (
                      <div key={q} className="flex-1 min-w-[200px] flex flex-col gap-2">
                        {/* Phase column header */}
                        <div
                          className="rounded-lg px-3 py-2 flex items-center gap-2"
                          style={{ background: `${cfg.color}12`, borderLeft: `3px solid ${cfg.color}` }}
                        >
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: cfg.color, color: "#0E1726" }}
                          >
                            {colIdx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold leading-tight" style={{ color: cfg.color }}>
                              {cfg.label.split(" — ")[1]}
                            </p>
                            <p className="text-xs text-muted-foreground leading-tight">{items.length} initiative{items.length !== 1 ? "s" : ""}</p>
                          </div>
                        </div>

                        {/* Connector line from vision bar */}
                        <div className="flex justify-center">
                          <div className="w-px h-3" style={{ background: `${cfg.color}50` }} />
                        </div>

                        {/* Initiative cards */}
                        {isEmpty ? (
                          <div
                            className="flex-1 rounded-lg border border-dashed border-white/8 flex items-center justify-center p-4 cursor-pointer hover:border-white/15 transition-colors"
                            onClick={() => setShowSelectorModal(true)}
                          >
                            <p className="text-xs text-muted-foreground text-center">No initiatives<br/>in this phase</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {items.map((init: any) => {
                              const typeColor = AI_TYPE_COLORS[init.aiType] ?? "#9CA3AF";
                              const catColor = CATEGORY_COLOURS[CATEGORY_MAP[init.category] ?? init.category] ?? "#9CA3AF";
                              return (
                                <div
                                  key={init.id}
                                  className="relative rounded-lg border border-white/10 bg-black/25 p-3 cursor-pointer hover:border-white/20 hover:bg-black/35 transition-all group"
                                  style={{ borderLeftColor: catColor, borderLeftWidth: "3px" }}
                                  onClick={() => setDetailInitiative(init)}
                                >
                                  {/* Remove button */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleInitiative(init.id); }}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>

                                  {/* Initiative name */}
                                  <p className="text-xs font-semibold text-foreground pr-5 mb-2 leading-snug">{init.name}</p>

                                  {/* Category */}
                                  {init.category && (
                                    <p className="text-xs mb-1.5" style={{ color: catColor }}>
                                      {CATEGORY_MAP[init.category] ?? init.category}
                                    </p>
                                  )}

                                  {/* Badges */}
                                  <div className="flex flex-wrap gap-1">
                                    {init.aiType && (
                                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: `${typeColor}20`, color: typeColor }}>
                                        {init.aiType}
                                      </span>
                                    )}
                                    {init.regulatoryFlag && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">EU AI Act</span>
                                    )}
                                  </div>

                                  {/* Vision link */}
                                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                    <ArrowRight className="w-2.5 h-2.5 flex-shrink-0" style={{ color: cfg.color }} />
                                    <span className="truncate">{BUSINESS_LEVELS[businessLevel]?.label} vision</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Ongoing / unphased column */}
                  {initiativesByPhase.some(p => p.phase === "unknown") && (() => {
                    const cfg = PHASE_LABELS["unknown"];
                    const items = initiativesByPhase.find(p => p.phase === "unknown")?.items ?? [];
                    return (
                      <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                        <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: `${cfg.color}12`, borderLeft: `3px solid ${cfg.color}` }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: cfg.color, color: "#0E1726" }}>∞</div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold leading-tight" style={{ color: cfg.color }}>Ongoing</p>
                            <p className="text-xs text-muted-foreground leading-tight">{items.length} initiative{items.length !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        <div className="flex justify-center"><div className="w-px h-3" style={{ background: `${cfg.color}50` }} /></div>
                        <div className="flex flex-col gap-2">
                          {items.map((init: any) => {
                            const typeColor = AI_TYPE_COLORS[init.aiType] ?? "#9CA3AF";
                            const catColor = CATEGORY_COLOURS[CATEGORY_MAP[init.category] ?? init.category] ?? "#9CA3AF";
                            return (
                              <div key={init.id} className="relative rounded-lg border border-white/10 bg-black/25 p-3 cursor-pointer hover:border-white/20 transition-all group" style={{ borderLeftColor: catColor, borderLeftWidth: "3px" }} onClick={() => setDetailInitiative(init)}>
                                <button onClick={(e) => { e.stopPropagation(); toggleInitiative(init.id); }} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all"><X className="w-3 h-3" /></button>
                                <p className="text-xs font-semibold text-foreground pr-5 mb-2 leading-snug">{init.name}</p>
                                {init.category && <p className="text-xs mb-1.5" style={{ color: catColor }}>{CATEGORY_MAP[init.category] ?? init.category}</p>}
                                <div className="flex flex-wrap gap-1">
                                  {init.aiType && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: `${typeColor}20`, color: typeColor }}>{init.aiType}</span>}
                                  {init.regulatoryFlag && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">EU AI Act</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Category colour legend */}
              <div className="px-6 pb-4 pt-1 border-t border-white/6">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Category</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {Object.entries(CATEGORY_COLOURS).map(([cat, color]) => {
                    const hasAny = selectedInits.some((i: any) => (CATEGORY_MAP[i.category] ?? i.category) === cat);
                    if (!hasAny) return null;
                    return (
                      <div key={cat} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
                        <span className="text-xs text-muted-foreground">{cat}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — CAPABILITY GAP
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/15 flex-shrink-0">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-amber-400 uppercase">Section 3</p>
            <h2 className="text-base font-semibold text-foreground leading-tight">Capability Gap to Deliver the Vision</h2>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/15 bg-amber-500/4 p-6 space-y-6">
          {/* Gap narrative */}
          <p className="text-sm text-muted-foreground leading-relaxed">{gapNarrative}</p>

          {/* KPI tiles — only when configured */}
          {ambitionGap?.configured && ambitionGap.functionAvgRaw != null && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Current Level",  value: (ambitionGap.functionAvgRaw / 10).toFixed(1),                                                                   color: "#60A5FA" },
                { label: "Target Level",   value: ambitionGap.ambitionTargetScore != null ? (ambitionGap.ambitionTargetScore / 10).toFixed(1) : "—",               color: "#4ADE80" },
                { label: "Gap",            value: ambitionGap.gapRaw != null && ambitionGap.gapRaw > 0 ? `${(ambitionGap.gapRaw / 10).toFixed(1)}` : "None",      color: ambitionGap.gapRaw != null && ambitionGap.gapRaw > 0 ? "#FCD34D" : "#4ADE80" },
              ].map(tile => (
                <div key={tile.label} className="rounded-lg border border-white/8 bg-black/20 p-4 text-center">
                  <p className="text-2xl font-bold" style={{ color: tile.color }}>{tile.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{tile.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Per-domain gap bars */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Domain-level Gap Analysis</p>
            <div className="space-y-4">
              {domainGapRows.map(row => {
                const isHighGap = row.gap !== null && row.gap > 20;
                return (
                  <div key={row.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{row.label}</span>
                        {isHighGap && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-muted-foreground">{row.current !== null ? (row.current / 10).toFixed(1) : "—"}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span style={{ color: row.color }}>{(row.target / 10).toFixed(1)}</span>
                      </div>
                    </div>
                    {/* Track */}
                    <div className="relative h-2 rounded-full bg-white/8 overflow-visible">
                      {row.currentPct !== null && (
                        <div
                          className="absolute top-0 left-0 h-full rounded transition-all duration-700"
                          style={{ width: `${row.currentPct}%`, background: "rgba(96,165,250,0.45)" }}
                        />
                      )}
                      {/* Target marker */}
                      <div
                        className="absolute top-[-3px] w-0.5 h-[calc(100%+6px)] rounded-full"
                        style={{ left: `${row.targetPct}%`, background: row.color }}
                      />
                    </div>
                    {row.gap !== null && row.gap > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Gap of <span className="font-semibold" style={{ color: isHighGap ? "#FBBF24" : "#9CA3AF" }}>{(row.gap / 10).toFixed(1)}</span> — {isHighGap ? "priority investment required" : "manageable through standard development"}
                      </p>
                    )}
                    {row.gap !== null && row.gap <= 0 && row.current !== null && (
                      <p className="text-xs text-green-400 mt-1">On target or above</p>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-5 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-blue-400/45 inline-block" />Current</span>
              <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-green-400 inline-block" />Target</span>
              <span className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-amber-400" />Priority gap</span>
            </div>
          </div>

          {/* Prompt to save if not yet configured */}
          {!ambitionGap?.configured && !isDirty && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-white/8 bg-white/3">
              <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground">Save your strategy to generate a live gap analysis against your current team baseline.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Sticky save CTA ── */}
      {isDirty && (
        <div className="sticky bottom-4 flex justify-center">
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-6 py-3 flex items-center gap-4 shadow-lg">
            <p className="text-sm text-green-400">You have unsaved changes to your strategy.</p>
            <Button size="sm" className="bg-green-500 hover:bg-green-400 text-black font-semibold" onClick={handleSave} disabled={saveStrategyMut.isPending}>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saveStrategyMut.isPending ? "Saving…" : "Save strategy"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <InitiativeSelectorModal
        open={showSelectorModal}
        onClose={() => setShowSelectorModal(false)}
        allInitiatives={allInitiatives}
        selectedIds={selectedInitiativeIds}
        onToggle={toggleInitiative}
        onDone={() => setShowSelectorModal(false)}
      />
      <InitiativeDetailModal
        initiative={detailInitiative}
        open={!!detailInitiative}
        onClose={() => setDetailInitiative(null)}
      />
    </div>
  );
}
