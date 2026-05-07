/**
 * AIStrategyPage — HR AI Strategy Executive Paper
 *
 * Three-section executive paper:
 *   Section 1 — EXECUTIVE SUMMARY: Vision statement, ways of work narrative, guiding principles
 *   Section 2 — INITIATIVE ROADMAP: Visual phased timeline of selected initiatives
 *   Section 3 — CAPABILITY GAP: Company context + HR domain gap narrative
 *
 * Control panel (top): Industry / Business AI Ambition / People AI Ambition selectors
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
  Compass,
  GitMerge,
  BookOpen,
  FileText,
  Quote,
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
const BUSINESS_LEVELS: Record<number, { label: string; description: string; waysOfWork: string; requiredMaturity: number }> = {
  1: {
    label: "Cautious",
    description: "AI used selectively in low-risk, back-office processes. Compliance and stability are the priority.",
    waysOfWork: "HR processes remain largely human-led. AI assists with administrative tasks and reporting. The focus is on risk management and regulatory compliance rather than transformation.",
    requiredMaturity: 1.0,
  },
  2: {
    label: "Exploratory",
    description: "Piloting AI in specific workflows. Building internal confidence before wider rollout.",
    waysOfWork: "HR is beginning to pilot AI in targeted areas — screening, scheduling, and analytics. Ways of working are evolving as teams build confidence and establish governance frameworks for responsible AI use.",
    requiredMaturity: 1.875,
  },
  3: {
    label: "Progressive",
    description: "AI embedded in core HR processes. The organisation expects HR to use AI tools confidently.",
    waysOfWork: "AI is embedded across core HR processes. HR professionals are expected to use AI tools as a standard part of their workflow — from talent decisions to workforce planning — and to critically evaluate AI outputs before acting.",
    requiredMaturity: 2.75,
  },
  4: {
    label: "Ambitious",
    description: "AI is a strategic differentiator. HR is expected to lead AI adoption across the business.",
    waysOfWork: "AI is a strategic differentiator. HR leads AI adoption across the business — designing AI-enabled processes, coaching leaders, and shaping governance. Ways of working are fundamentally redesigned around human-AI collaboration.",
    requiredMaturity: 3.625,
  },
  5: {
    label: "Transformative",
    description: "AI is central to the business model. HR people are expected to be AI-native practitioners.",
    waysOfWork: "AI is central to the business model. HR professionals are AI-native — they design, govern, and continuously improve AI-enabled people systems. The function operates as an AI centre of excellence for the wider organisation.",
    requiredMaturity: 4.5,
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

const PHASE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  "Q1":      { label: "Phase 1 — Foundation", color: "#60A5FA", bg: "rgba(96,165,250,0.08)" },
  "Q2":      { label: "Phase 2 — Build",      color: "#A78BFA", bg: "rgba(167,139,250,0.08)" },
  "Q3":      { label: "Phase 3 — Scale",      color: "#4ADE80", bg: "rgba(74,222,128,0.08)" },
  "Q4":      { label: "Phase 4 — Optimise",   color: "#FBBF24", bg: "rgba(251,191,36,0.08)" },
  "unknown": { label: "Ongoing",              color: "#9CA3AF", bg: "rgba(156,163,175,0.08)" },
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

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  sectionNum, color, icon, eyebrow, title,
}: {
  sectionNum: string;
  color: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div
        className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
        style={{ background: `${color}18`, color }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold tracking-widest uppercase mb-0.5" style={{ color }}>{eyebrow}</p>
        <h2 className="text-xl font-bold text-foreground leading-tight">{title}</h2>
      </div>
      <div
        className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold flex-shrink-0"
        style={{ background: `${color}15`, color }}
      >
        {sectionNum}
      </div>
    </div>
  );
}

// ─── Initiative detail modal ──────────────────────────────────────────────────
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

// ─── Initiative selector modal ────────────────────────────────────────────────
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
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-white/8 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold">Initiative Library</DialogTitle>
              <Button size="sm" className="bg-green-500 hover:bg-green-400 text-black font-semibold" onClick={onDone}>
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Done ({selectedIds.size})
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {FILTER_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    categoryFilter === cat
                      ? "bg-green-500/20 border-green-500/40 text-green-400"
                      : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
                  }`}
                >
                  {CATEGORY_ICONS[cat]}
                  {cat}
                </button>
              ))}
            </div>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((init: any) => {
                const isSelected = selectedIds.has(init.id);
                const typeColor = AI_TYPE_COLORS[init.aiType] ?? "#9CA3AF";
                const catColor = CATEGORY_COLOURS[CATEGORY_MAP[init.category] ?? init.category] ?? "#9CA3AF";
                return (
                  <div
                    key={init.id}
                    className={`relative rounded-xl border p-4 transition-all cursor-pointer ${
                      isSelected
                        ? "border-green-500/40 bg-green-500/8"
                        : "border-white/8 bg-white/2 hover:border-white/15 hover:bg-white/4"
                    }`}
                    onClick={() => onToggle(init.id)}
                    style={{ borderLeftColor: catColor, borderLeftWidth: "3px" }}
                  >
                    <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? "bg-green-500 border-green-500" : "border-white/20"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <p className="text-sm font-semibold text-foreground pr-7 mb-2 leading-snug">{init.name}</p>
                    {init.category && (
                      <p className="text-xs mb-2 font-medium" style={{ color: catColor }}>
                        {CATEGORY_MAP[init.category] ?? init.category}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {init.aiType && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${typeColor}18`, color: typeColor }}>
                          {init.aiType}
                        </span>
                      )}
                      {init.decisionAuthority && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-muted-foreground">
                          {DA_LABELS[init.decisionAuthority] ?? init.decisionAuthority}
                        </span>
                      )}
                      {init.regulatoryFlag && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">EU AI Act</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDetailInitiative(init); }}
                      className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="w-3 h-3" />
                      View details
                    </button>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-2 text-center py-12 text-muted-foreground">
                  <p className="text-sm">No initiatives in this category.</p>
                </div>
              )}
            </div>
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

  const [businessLevel, setBusinessLevelRaw] = useState(3);
  const [peopleLevel, setPeopleLevelRaw]     = useState(3);
  const [sector, setSectorRaw]               = useState("");
  const [isDirty, setIsDirty]                = useState(false);
  const [selectedInitiativeIds, setSelectedInitiativeIds] = useState<Set<string>>(new Set());
  const [showSelectorModal, setShowSelectorModal]         = useState(false);
  const [detailInitiative, setDetailInitiative]           = useState<any | null>(null);

  const strategyQ           = trpc.intelligence.getStrategy.useQuery();
  const strategyAssessmentQ = trpc.intelligence.getStrategyAssessment.useQuery();
  const orgContextQ         = trpc.intelligence.orgContext.useQuery();
  const initiativesQ        = trpc.strategy.listInitiatives.useQuery(
    { tenantId: user?.tenantId ?? "" },
    { enabled: !!user?.tenantId }
  );
  const ambitionGapQ       = trpc.dashboardV2.leader.ambitionGap.useQuery();
  const companyAssessmentQ = trpc.companyAssessment.getMyAssessmentResults.useQuery();

  const strategyData       = strategyQ.data;
  const strategyAssessment = strategyAssessmentQ.data;
  const orgContext         = orgContextQ.data;
  const ambitionGap        = ambitionGapQ.data;
  const allInitiatives     = initiativesQ.data ?? [];
  const companyResults     = companyAssessmentQ.data;

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

  const domainTargets  = useMemo(() => computeDomainTargets(businessLevel, peopleLevel), [businessLevel, peopleLevel]);
  const overallTarget  = useMemo(() => overallFromDomains(domainTargets), [domainTargets]);
  const selectedInits  = useMemo(() => allInitiatives.filter((i: any) => selectedInitiativeIds.has(i.id)), [allInitiatives, selectedInitiativeIds]);

  const initiativesByPhase = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const init of selectedInits) {
      const phase = (init as any).targetQuarter ?? "unknown";
      if (!groups[phase]) groups[phase] = [];
      groups[phase].push(init);
    }
    const order = ["Q1", "Q2", "Q3", "Q4", "unknown"];
    return order.filter(p => groups[p]?.length > 0).map(p => ({ phase: p, items: groups[p] }));
  }, [selectedInits]);

  const domainGapRows = useMemo(() => {
    const clamp = (v: number) => Math.min(100, Math.max(0, v));
    const scores = strategyData?.currentDomainScores as Record<string, number> | null | undefined;
    return DOMAIN_KEYS.map(key => {
      const target  = domainTargets[key];
      const current = scores?.[key] ?? null;
      const gap     = current !== null ? target - current : null;
      return {
        key,
        label: DOMAIN_LABELS[key as CapabilityKey],
        description: DOMAIN_DESCRIPTIONS?.[key as CapabilityKey] ?? "",
        target,
        current,
        gap,
        color: DOMAIN_COLOURS[key as CapabilityKey] ?? "#60A5FA",
        targetPct: clamp(target),
        currentPct: current !== null ? clamp(current) : null,
      };
    }).sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0));
  }, [domainTargets, strategyData]);

  const upsertOrgContextMut = trpc.intelligence.upsertOrgContext.useMutation({
    onSuccess: () => utils.intelligence.orgContext.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const saveStrategyMut = trpc.intelligence.saveStrategy.useMutation({
    onSuccess: () => {
      toast.success("HR AI Strategy saved.");
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

  const isLoading = strategyQ.isLoading || orgContextQ.isLoading || companyAssessmentQ.isLoading || strategyAssessmentQ.isLoading;
  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const sectorLabel      = SECTORS.find(s => s.value === sector)?.label;
  const bLevel           = BUSINESS_LEVELS[businessLevel];
  const pLevel           = PEOPLE_LEVELS[peopleLevel];
  const requiredMaturity = bLevel?.requiredMaturity ?? 2.75;

  const companyGap = companyResults ? requiredMaturity - companyResults.overallScore : null;
  const weakDims   = companyResults ? [...companyResults.dimensions].sort((a, b) => a.score - b.score).slice(0, 3) : [];
  const strongDims = companyResults ? [...companyResults.dimensions].sort((a, b) => b.score - a.score).slice(0, 2) : [];

  const guidingPrinciples = strategyAssessment?.guidingPrinciples as Array<{ title: string; description: string }> | null | undefined;

  return (
    <div className="space-y-10 max-w-4xl mx-auto pb-20">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 pt-2">
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">AI Strategy</p>
          <h1 className="text-2xl font-bold text-foreground">HR AI Strategy</h1>
          {sectorLabel && (
            <p className="text-sm text-muted-foreground mt-1">
              {sectorLabel} · {bLevel?.label} business ambition · {pLevel?.label} people ambition
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
          <p className="text-xs text-muted-foreground hidden sm:block flex-1">{bLevel?.description}</p>
        </div>
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
          <p className="text-xs text-muted-foreground hidden sm:block flex-1">{pLevel?.description}</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — EXECUTIVE SUMMARY
          Vision statement, ways of work narrative, guiding principles
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          sectionNum="1"
          color="#4ADE80"
          icon={<FileText className="w-5 h-5" />}
          eyebrow="Section 1 — Executive Summary"
          title="Our HR AI Vision"
        />

        {strategyAssessment?.completed && strategyAssessment.visionStatement ? (
          <div className="space-y-6">
            {/* Vision statement hero */}
            <div className="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/8 to-emerald-500/4 p-8">
              <div className="flex items-start gap-3 mb-4">
                <Quote className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-green-400 uppercase tracking-widest">Vision Statement</p>
              </div>
              <blockquote className="text-xl font-semibold text-foreground leading-relaxed italic mb-6">
                &ldquo;{strategyAssessment.visionStatement}&rdquo;
              </blockquote>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-white/8">
                {[
                  { icon: <Building2 className="w-3.5 h-3.5" />, label: "Industry", value: sectorLabel ?? "—" },
                  { icon: <BarChart3 className="w-3.5 h-3.5" />, label: "Business Ambition", value: bLevel?.label ?? "—" },
                  { icon: <Users className="w-3.5 h-3.5" />, label: "People Ambition", value: pLevel?.label ?? "—" },
                  { icon: <Target className="w-3.5 h-3.5" />, label: "Capability Target", value: `${(overallTarget / 10).toFixed(1)} / 10` },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-2 rounded-lg border border-white/8 bg-white/3 px-3 py-2.5">
                    <span className="text-green-400 mt-0.5 flex-shrink-0">{item.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-xs font-semibold text-foreground truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ways of work narrative */}
            {sector && (
              <div className="rounded-xl border border-white/8 bg-white/3 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Compass className="w-4 h-4 text-blue-400" />
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">How AI Will Change Our Ways of Work</p>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    In {sectorLabel}, the integration of artificial intelligence into HR is no longer a future consideration — it is a present-day imperative. Our organisation has set a <strong className="text-foreground">{bLevel?.label}</strong> AI ambition: {bLevel?.waysOfWork}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    To deliver this vision, every HR professional must operate at the <strong className="text-foreground">{pLevel?.label}</strong> level. {pLevel?.expectation}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This strategy defines the initiatives, development priorities, and capability investments required to close the gap between where our HR function is today and where it needs to be to deliver on this ambition.
                  </p>
                </div>
              </div>
            )}

            {/* Guiding principles */}
            {guidingPrinciples && guidingPrinciples.length > 0 && (
              <div className="rounded-xl border border-white/8 bg-white/3 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Guiding Principles</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {guidingPrinciples.map((p, i) => (
                    <div key={i} className="flex gap-3 p-4 rounded-lg border border-white/6 bg-white/2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ background: "rgba(167,139,250,0.15)", color: "#A78BFA" }}
                      >
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground mb-1 leading-snug">{p.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <a href="/ai-strategy/assessment">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                      <Sparkles className="w-3 h-3 mr-1.5" />
                      Retake assessment to regenerate
                    </Button>
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-green-500/20 bg-green-500/4 p-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground mb-1">Build your HR AI Vision</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Complete the 4-step HR AI Strategy Assessment to generate your AI-drafted vision statement and guiding principles. The assessment captures your business AI aspirations and HR&apos;s role in delivering them.
                </p>
                {sector && (
                  <div className="mb-4 p-4 rounded-lg border border-white/8 bg-white/3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Based on your ambition settings</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      A <strong className="text-foreground">{bLevel?.label}</strong> business ambition in {sectorLabel ?? "your sector"} means: {bLevel?.waysOfWork}
                    </p>
                  </div>
                )}
                <a href="/ai-strategy/assessment">
                  <Button size="sm" className="bg-green-500 hover:bg-green-400 text-black font-semibold">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Begin Assessment
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — INITIATIVE ROADMAP
          Visual phased timeline of selected initiatives
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-start justify-between gap-4 mb-6">
          <SectionHeader
            sectionNum="2"
            color="#A78BFA"
            icon={<Map className="w-5 h-5" />}
            eyebrow="Section 2 — Initiative Roadmap"
            title="How We Get There"
          />
          <Button variant="outline" size="sm" onClick={() => setShowSelectorModal(true)} className="flex-shrink-0 mt-1">
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
            <p className="text-xs text-muted-foreground mb-4">Open the initiative library to select the AI initiatives that will deliver your vision.</p>
            <Button size="sm" variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
              <ListPlus className="w-3.5 h-3.5 mr-1.5" />
              Open Initiative Library
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedInits.length} initiative{selectedInits.length !== 1 ? "s" : ""} selected to deliver the <strong className="text-foreground">{bLevel?.label}</strong> AI vision — sequenced across four phases to build capability progressively and manage organisational change.
            </p>
            <div className="rounded-xl border border-white/8 bg-white/2 overflow-hidden">
              {/* Vision thread */}
              <div className="relative px-6 pt-5 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span className="text-xs font-bold tracking-widest text-purple-400 uppercase">AI Vision Thread</span>
                </div>
                <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "linear-gradient(90deg, #60A5FA 0%, #A78BFA 33%, #4ADE80 66%, #FBBF24 100%)" }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
                <div className="grid mt-1" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                  {["Q1", "Q2", "Q3", "Q4"].map(q => (
                    <div key={q} className="text-center">
                      <span className="text-xs font-semibold" style={{ color: PHASE_LABELS[q].color }}>
                        {PHASE_LABELS[q].label.split(" — ")[1]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Phase columns */}
              <div className="overflow-x-auto pb-5 px-4">
                <div className="flex gap-3" style={{ minWidth: "800px" }}>
                  {["Q1", "Q2", "Q3", "Q4"].map((q, colIdx) => {
                    const cfg = PHASE_LABELS[q];
                    const items: any[] = initiativesByPhase.find(p => p.phase === q)?.items ?? [];
                    return (
                      <div key={q} className="flex-1 min-w-[190px] flex flex-col gap-2">
                        <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: `${cfg.color}12`, borderLeft: `3px solid ${cfg.color}` }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: cfg.color, color: "#0E1726" }}>{colIdx + 1}</div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold leading-tight" style={{ color: cfg.color }}>{cfg.label.split(" — ")[1]}</p>
                            <p className="text-xs text-muted-foreground leading-tight">{items.length} initiative{items.length !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        <div className="flex justify-center"><div className="w-px h-3" style={{ background: `${cfg.color}50` }} /></div>
                        {items.length > 0 ? (
                          <div className="space-y-2">
                            {items.map((init: any) => {
                              const typeColor = AI_TYPE_COLORS[init.aiType] ?? "#9CA3AF";
                              const catColor = CATEGORY_COLOURS[CATEGORY_MAP[init.category] ?? init.category] ?? "#9CA3AF";
                              return (
                                <div
                                  key={init.id}
                                  className="rounded-lg border border-white/8 bg-white/3 p-3 cursor-pointer hover:border-white/15 hover:bg-white/5 transition-colors"
                                  style={{ borderLeftColor: catColor, borderLeftWidth: "3px" }}
                                  onClick={() => setDetailInitiative(init)}
                                >
                                  {init.category && <p className="text-xs mb-1.5" style={{ color: catColor }}>{CATEGORY_MAP[init.category] ?? init.category}</p>}
                                  <p className="text-xs font-semibold text-foreground leading-snug mb-2">{init.name}</p>
                                  <div className="flex flex-wrap gap-1">
                                    {init.aiType && (
                                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${typeColor}18`, color: typeColor }}>
                                        {init.aiType}
                                      </span>
                                    )}
                                    {init.regulatoryFlag && (
                                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">EU AI Act</span>
                                    )}
                                  </div>
                                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                    <ArrowRight className="w-3 h-3" />
                                    <span>Vision link</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-white/8 p-3 text-center">
                            <p className="text-xs text-muted-foreground/50">No initiatives</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Ongoing / unphased */}
              {initiativesByPhase.find(p => p.phase === "unknown") && (
                <div className="px-4 pb-5">
                  <div className="rounded-lg border border-white/8 bg-white/2 p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ongoing / Unphased</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(initiativesByPhase.find(p => p.phase === "unknown")?.items ?? []).map((init: any) => {
                        const typeColor = AI_TYPE_COLORS[init.aiType] ?? "#9CA3AF";
                        const catColor = CATEGORY_COLOURS[CATEGORY_MAP[init.category] ?? init.category] ?? "#9CA3AF";
                        return (
                          <div
                            key={init.id}
                            className="rounded-lg border border-white/8 bg-white/3 p-3 cursor-pointer hover:border-white/15 transition-colors"
                            style={{ borderLeftColor: catColor, borderLeftWidth: "3px" }}
                            onClick={() => setDetailInitiative(init)}
                          >
                            <p className="text-xs font-semibold text-foreground leading-snug mb-1">{init.name}</p>
                            {init.aiType && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${typeColor}18`, color: typeColor }}>
                                {init.aiType}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {/* Category legend */}
              <div className="px-6 pb-4 pt-2 border-t border-white/6">
                <div className="flex flex-wrap gap-3">
                  {Object.entries(CATEGORY_COLOURS)
                    .filter(([cat]) => selectedInits.some((i: any) => (CATEGORY_MAP[i.category] ?? i.category) === cat))
                    .map(([cat, color]) => (
                      <span key={cat} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                        {cat}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — CAPABILITY GAP
          Company context + HR domain gap narrative
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          sectionNum="3"
          color="#F472B6"
          icon={<GitMerge className="w-5 h-5" />}
          eyebrow="Section 3 — Capability Gap"
          title="What the HR Team Needs to Develop"
        />

        <div className="space-y-6">
          {/* Company context */}
          {companyResults ? (
            <div className="rounded-xl border border-pink-500/15 bg-pink-500/4 overflow-hidden">
              <div className="p-6 border-b border-white/6">
                <p className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-3">Company AI Maturity Context</p>
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      {companyResults.companyName ?? "Your Organisation"}
                      {companyResults.companySector ? ` · ${companyResults.companySector}` : ""}
                    </p>
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      AI Maturity: <span className="text-pink-400">{companyResults.maturityLabel}</span>
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">{companyResults.maturityDescription}</p>
                  </div>
                  <div className="flex-shrink-0 text-center">
                    <div className="rounded-full border-4 border-pink-400/40 flex items-center justify-center bg-pink-500/8" style={{ width: "72px", height: "72px" }}>
                      <div>
                        <p className="text-xl font-bold text-pink-400">{companyResults.overallScore.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">/ 5.0</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">Overall</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="relative h-2 rounded-full bg-white/8">
                    <div className="absolute top-0 left-0 h-full rounded-full bg-pink-400/60 transition-all duration-700" style={{ width: `${(companyResults.overallScore / 5) * 100}%` }} />
                    <div className="absolute top-[-4px] w-0.5 h-[calc(100%+8px)] rounded-full bg-amber-400" style={{ left: `${(requiredMaturity / 5) * 100}%` }} />
                    <div className="absolute top-[-4px] w-0.5 h-[calc(100%+8px)] rounded-full bg-white/30" style={{ left: `${(companyResults.sectorAverage / 5) * 100}%` }} />
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-pink-400/60 inline-block" />Current ({companyResults.overallScore.toFixed(1)})</span>
                    <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-amber-400 inline-block" />Required ({requiredMaturity.toFixed(1)})</span>
                    <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-white/30 inline-block" />Sector avg ({companyResults.sectorAverage.toFixed(1)})</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {companyGap !== null && companyGap > 1.5
                    ? `The company has a significant AI maturity gap of ${companyGap.toFixed(1)} points to close before it can fully realise a ${bLevel?.label} business ambition. The HR AI strategy must prioritise building the foundations — particularly in ${weakDims.slice(0, 2).map(d => d.label).join(" and ")} — before scaling more advanced AI initiatives.`
                    : companyGap !== null && companyGap > 0.5
                    ? `The company is on a credible AI journey but needs to close a gap of ${companyGap.toFixed(1)} points to reach the maturity required for a ${bLevel?.label} business ambition. The HR AI strategy must focus on scaling what is working and closing the gaps in ${weakDims.slice(0, 2).map(d => d.label).join(" and ")}.`
                    : companyGap !== null && companyGap > -0.3
                    ? `The company's current AI maturity (${companyResults.overallScore.toFixed(1)}/5) is well-aligned with the ${bLevel?.label} business ambition. The HR AI strategy should focus on maintaining momentum and deepening capability in ${weakDims.slice(0, 2).map(d => d.label).join(" and ")}.`
                    : `The company is ahead of the maturity level required for a ${bLevel?.label} business ambition. The HR AI strategy should focus on innovation and maintaining the competitive advantage in ${weakDims.slice(0, 2).map(d => d.label).join(" and ")}.`
                  }
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {weakDims.map(d => (
                    <span key={d.key} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-300">
                      <AlertTriangle className="w-3 h-3" />{d.label} — gap
                    </span>
                  ))}
                  {strongDims.map(d => (
                    <span key={d.key} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-300">
                      <CheckCircle2 className="w-3 h-3" />{d.label} — strength
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-pink-500/20 bg-pink-500/4 p-6 flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-pink-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground mb-1">No Company Assessment completed</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Complete the Company Assessment to ground this strategy in your organisation&apos;s actual AI maturity and generate a live gap analysis.
                </p>
                <a href="/company-assessment">
                  <Button size="sm" variant="outline" className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10">
                    <Building2 className="w-3.5 h-3.5 mr-1.5" />
                    Complete Company Assessment
                  </Button>
                </a>
              </div>
            </div>
          )}

          {/* HR Capability Gap */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-blue-400" />
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">HR Team Capability Gap</p>
            </div>

            {ambitionGap?.configured && ambitionGap.functionAvgRaw != null ? (
              <>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: "HR Team Now",   value: (ambitionGap.functionAvgRaw / 10).toFixed(1),                                                                    color: "#60A5FA" },
                    { label: "Target",        value: ambitionGap.ambitionTargetScore != null ? (ambitionGap.ambitionTargetScore / 10).toFixed(1) : "—",                color: "#4ADE80" },
                    { label: "HR Gap",        value: ambitionGap.gapRaw != null && ambitionGap.gapRaw > 0 ? `${(ambitionGap.gapRaw / 10).toFixed(1)}` : "None",       color: ambitionGap.gapRaw != null && ambitionGap.gapRaw > 0 ? "#FCD34D" : "#4ADE80" },
                  ].map(tile => (
                    <div key={tile.label} className="rounded-lg border border-white/8 bg-black/20 p-4 text-center">
                      <p className="text-2xl font-bold" style={{ color: tile.color }}>{tile.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{tile.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {ambitionGap.verdict === "exceeds"
                    ? `The HR function is currently performing at Level ${(ambitionGap.functionAvgRaw / 10).toFixed(1)} — exceeding the Level ${(ambitionGap.ambitionTargetScore! / 10).toFixed(1)} target set by the ${bLevel?.label} / ${pLevel?.label} ambition combination. Consider raising the ambition bar to maintain strategic stretch.`
                    : `The HR function is currently at Level ${(ambitionGap.functionAvgRaw / 10).toFixed(1)} against a Level ${(ambitionGap.ambitionTargetScore! / 10).toFixed(1)} target — a gap of ${((ambitionGap.gapRaw ?? 0) / 10).toFixed(1)} levels. Closing this gap will require a structured, accelerated development programme across the six AI capability domains below.`
                  }
                </p>
              </>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-white/8 bg-white/3 mb-5">
                <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {isDirty
                    ? "Save your strategy to generate a live HR capability gap analysis against your current team baseline."
                    : "Complete team AI assessments to generate a live HR capability gap analysis."
                  }
                </p>
              </div>
            )}

            {/* Domain gap breakdown */}
            <div className="border-t border-white/6 pt-5">
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                {ambitionGap?.configured && ambitionGap.functionAvgRaw != null
                  ? `The six AI capability domains below are sorted by priority — those with the largest gap from current capability to the required target for the ${bLevel?.label} / ${pLevel?.label} ambition combination.`
                  : `Delivering the ${bLevel?.label} AI vision requires the HR function to develop capability across all six AI domains. The targets below are calculated from your selected ambition levels. Complete team assessments to generate a live gap analysis.`
                }
              </p>
              <div className="space-y-5">
                {domainGapRows.map(row => {
                  const isHighGap = row.gap !== null && row.gap > 20;
                  return (
                    <div key={row.key}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: row.color }} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold text-foreground">{row.label}</span>
                              {isHighGap && <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-xs h-4 px-1.5">Priority</Badge>}
                            </div>
                            {row.description && <p className="text-xs text-muted-foreground leading-relaxed">{row.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono flex-shrink-0 ml-4">
                          <span className="text-muted-foreground">{row.current !== null ? (row.current / 10).toFixed(1) : "—"}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="font-semibold" style={{ color: row.color }}>{(row.target / 10).toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="relative h-2 rounded-full bg-white/8 overflow-visible ml-3.5">
                        {row.currentPct !== null && (
                          <div className="absolute top-0 left-0 h-full rounded transition-all duration-700" style={{ width: `${row.currentPct}%`, background: "rgba(96,165,250,0.45)" }} />
                        )}
                        <div className="absolute top-[-3px] w-0.5 h-[calc(100%+6px)] rounded-full" style={{ left: `${row.targetPct}%`, background: row.color }} />
                      </div>
                      {row.gap !== null && row.gap > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 ml-3.5">
                          Gap of <span className="font-semibold" style={{ color: isHighGap ? "#FBBF24" : "#9CA3AF" }}>{(row.gap / 10).toFixed(1)}</span> — {isHighGap ? "priority investment required" : "manageable through standard development"}
                        </p>
                      )}
                      {row.gap !== null && row.gap <= 0 && row.current !== null && (
                        <p className="text-xs text-green-400 mt-1 ml-3.5">On target or above</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-5 text-xs text-muted-foreground pt-4 mt-4 border-t border-white/6">
                <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-blue-400/45 inline-block" />Current</span>
                <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-green-400 inline-block" />Target</span>
                <span className="flex items-center gap-1.5"><Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-xs h-4 px-1.5">Priority</Badge>High-gap domain</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sticky save CTA ── */}
      {isDirty && (
        <div className="sticky bottom-4 flex justify-center z-10">
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 backdrop-blur px-6 py-3 flex items-center gap-4 shadow-lg">
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
