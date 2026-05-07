/**
 * AIStrategyPage v3 — HR AI Strategy Executive Paper
 *
 * Structure:
 *   Sticky header  — breadcrumb pills (Sector · Business · People · N initiatives) + Save + Export
 *   Hero           — one sentence + 3 KPI numbers above the fold
 *   Section 1      — Diagnostic (anchor section, heavyweight)
 *   Section 2      — Ambition (vision + principles + what we won't do)
 *   Section 3      — Plan (pre-sequenced roadmap, Executive / Operational toggle)
 *   Section 4      — Investment & Risk (cost envelope, top risks, dependencies)
 *   Appendix       — Methodology (collapsed)
 */
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Building2, Target, Users, TrendingUp, Shield, Zap, Layers, Lightbulb,
  CheckCircle2, Save, Info, BarChart3, Download, Check, ChevronRight,
  Sparkles, ArrowRight, AlertTriangle, Compass, GitMerge, BookOpen,
  FileText, Quote, ChevronDown, ChevronUp, Pencil, X, DollarSign,
  AlertCircle, Link2, LayoutGrid, List, Eye, Settings2, Ban,
  Lock, Unlock, Calendar, Share2, UserCheck, Clock, ExternalLink,
  TrendingDown, Activity,
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

// ─── Ambition levels ──────────────────────────────────────────────────────────
const BUSINESS_LEVELS: Record<number, { label: string; description: string; waysOfWork: string; requiredMaturity: number }> = {
  1: { label: "Cautious",      description: "AI used selectively in low-risk, back-office processes.",                                    waysOfWork: "HR processes remain largely human-led. AI assists with administrative tasks and reporting.",                                                                                                                                                                              requiredMaturity: 1.0   },
  2: { label: "Exploratory",   description: "Piloting AI in specific workflows. Building internal confidence before wider rollout.",       waysOfWork: "HR is beginning to pilot AI in targeted areas — screening, scheduling, and analytics.",                                                                                                                                                                   requiredMaturity: 1.875 },
  3: { label: "Progressive",   description: "AI embedded in core HR processes. HR professionals use AI tools confidently.",               waysOfWork: "AI is embedded across core HR processes. HR professionals use AI tools as a standard part of their workflow and critically evaluate AI outputs before acting.",                                                                                              requiredMaturity: 2.75  },
  4: { label: "Ambitious",     description: "AI is a strategic differentiator. HR leads AI adoption across the business.",                waysOfWork: "AI is a strategic differentiator. HR leads AI adoption — designing AI-enabled processes, coaching leaders, and shaping governance.",                                                                                                                    requiredMaturity: 3.625 },
  5: { label: "Transformative", description: "AI is central to the business model. HR professionals are AI-native practitioners.",        waysOfWork: "AI is central to the business model. HR professionals are AI-native — they design, govern, and continuously improve AI-enabled people systems.",                                                                                                      requiredMaturity: 4.5   },
};

const PEOPLE_LEVELS: Record<number, { label: string; description: string; expectation: string }> = {
  1: { label: "Followers",    description: "HR people use AI tools as directed.",                                                         expectation: "HR professionals follow AI-assisted processes and comply with policy." },
  2: { label: "Adopters",     description: "HR people learn and use AI tools in their day-to-day work.",                                  expectation: "HR professionals actively learn and adopt AI tools in their daily work." },
  3: { label: "Practitioners", description: "HR people apply AI confidently, evaluate outputs critically, and adapt workflows.",          expectation: "HR professionals apply AI confidently, critically evaluate outputs, and adapt workflows." },
  4: { label: "Champions",    description: "HR people advocate for AI, coach others, and contribute to AI governance.",                   expectation: "HR professionals champion AI adoption, coach colleagues, and contribute to governance." },
  5: { label: "Innovators",   description: "HR people design AI-enabled processes, lead change, and shape the AI strategy.",             expectation: "HR professionals lead AI innovation, design AI-enabled processes, and shape strategy." },
};

// ─── Out-of-scope items by ambition level ─────────────────────────────────────
const OUT_OF_SCOPE: Record<number, string[]> = {
  1: [
    "Autonomous AI decision-making in any employment process",
    "Generative AI tools for employee-facing communications",
    "Predictive analytics for individual performance assessment",
    "AI-driven compensation modelling without human sign-off",
    "Unmonitored AI in any high-risk HR workflow",
  ],
  2: [
    "Full automation of recruitment shortlisting",
    "AI-generated performance ratings without manager review",
    "Autonomous workforce planning recommendations",
    "Real-time employee sentiment monitoring at individual level",
    "AI tools that have not passed a bias audit",
  ],
  3: [
    "Replacing human judgement in promotion or redundancy decisions",
    "Deploying AI in collective bargaining or ER processes without legal review",
    "AI-generated individual development plans without manager validation",
    "Sharing employee AI capability data with third parties",
  ],
  4: [
    "Fully autonomous hiring decisions without human review",
    "AI systems that cannot explain their recommendations to employees",
    "Deploying AI tools that have not been assessed against the EU AI Act",
    "Individual-level AI monitoring without employee consent",
  ],
  5: [
    "AI systems that remove human accountability from employment decisions",
    "Deploying frontier AI models in HR without a dedicated ethics review",
    "AI-generated contracts or legal documents without solicitor review",
  ],
};

// ─── Phase sequencing — deterministic, dependency-aware ─────────────────────
const FOUNDATION_CATEGORIES = new Set(["Change & Capability", "Governance & Ethics", "HR Operations"]);
const SCALE_CATEGORIES      = new Set(["People Analytics", "HR Business Partnering"]);

function assignPhase(initiative: { category: string; complexity: number | string; name: string }): string {
  const complexity = Number(initiative.complexity);
  const cat = initiative.category ?? "";
  if (initiative.name.toLowerCase().includes("literacy")) return "Q1";
  if (initiative.name.toLowerCase().includes("ethics & governance")) return "Q1";
  if (complexity <= 2 && FOUNDATION_CATEGORIES.has(cat)) return "Q1";
  if (complexity <= 2) return "Q2";
  if (complexity === 3 && FOUNDATION_CATEGORIES.has(cat)) return "Q2";
  if (complexity === 3 && SCALE_CATEGORIES.has(cat)) return "Q3";
  if (complexity === 3) return "Q2";
  if (complexity >= 4 && SCALE_CATEGORIES.has(cat)) return "Q3";
  if (complexity >= 4) return "Q3";
  return "Q2";
}

// ─── Category / initiative metadata ──────────────────────────────────────────
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Talent Acquisition":        <Users className="w-3.5 h-3.5" />,
  "Learning & Development":    <Lightbulb className="w-3.5 h-3.5" />,
  "Performance & Development": <TrendingUp className="w-3.5 h-3.5" />,
  "Workforce Planning":        <Layers className="w-3.5 h-3.5" />,
  "Pay & Reward":              <Target className="w-3.5 h-3.5" />,
  "HR Operations":             <Zap className="w-3.5 h-3.5" />,
  "Ethics & Governance":       <Shield className="w-3.5 h-3.5" />,
  "GenAI Workforce Rollout":   <Sparkles className="w-3.5 h-3.5" />,
};

const AI_TYPE_COLORS: Record<string, string> = {
  generative:  "#A78BFA",
  predictive:  "#60A5FA",
  automation:  "#4ADE80",
  analytical:  "#FBBF24",
  agentic:     "#F472B6",
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

// HR function outcome tags — real business outcomes, not category echoes
// Rule: max 3 words, must be a measurable result not a function name
const OUTCOME_TAGS: Record<string, string> = {
  "Talent Acquisition":        "Quality of Hire",
  "Performance & Development": "Manager Effectiveness",
  "Pay & Reward":              "Pay Equity",
  "Learning & Development":    "Faster Uplift",
  "Workforce Planning":        "Workforce Agility",
  "GenAI Workforce Rollout":   "AI Adoption Rate",
  "HR Operations":             "Cost Efficiency",
  "Ethics & Governance":       "Compliance Risk",
};

const PHASE_LABELS: Record<string, { label: string; color: string; months: string }> = {
  "Q1":      { label: "Phase 1 — Foundation", color: "#60A5FA", months: "Months 1–3"   },
  "Q2":      { label: "Phase 2 — Build",      color: "#A78BFA", months: "Months 4–6"   },
  "Q3":      { label: "Phase 3 — Scale",      color: "#4ADE80", months: "Months 7–12"  },
  "Q4":      { label: "Phase 4 — Optimise",   color: "#FBBF24", months: "Months 13–18" },
  "unknown": { label: "Ongoing",              color: "#9CA3AF", months: "Continuous"   },
};

// Cost envelope by phase (£k per initiative, rough order-of-magnitude)
const PHASE_COST_PER_INIT: Record<string, { low: number; high: number; unit: string }> = {
  "Q1":      { low: 20,  high: 60,  unit: "k" },
  "Q2":      { low: 40,  high: 120, unit: "k" },
  "Q3":      { low: 60,  high: 200, unit: "k" },
  "Q4":      { low: 30,  high: 100, unit: "k" },
  "unknown": { low: 15,  high: 50,  unit: "k" },
};

const FILTER_CATEGORIES = [
  "All", "Talent Acquisition", "Performance & Development", "Pay & Reward",
  "Learning & Development", "Workforce Planning", "GenAI Workforce Rollout",
  "HR Operations", "Ethics & Governance", "Custom",
];

const DA_LABELS: Record<string, string> = {
  recommends_to_human: "Recommends",
  human_in_loop:       "Human-in-loop",
  full_automation:     "Full automation",
};

type DomainKey = typeof DOMAIN_KEYS[number];

// ─── Domain target computation ────────────────────────────────────────────────
// Ambition-tier realistic targets (0-100 scale, NOT the absolute ceiling).
// Transformative → ~73, Ambitious → ~63, Progressive → ~55, Exploratory → ~46, Cautious → ~38
const AMBITION_TIER_BASE: Record<number, number> = {
  1: 38, 2: 46, 3: 55, 4: 63, 5: 73,
};

function computeDomainTargets(businessLevel: number, peopleLevel: number): Record<DomainKey, number> {
  const base = AMBITION_TIER_BASE[businessLevel] ?? 55;
  const adj: Record<DomainKey, number> = {
    ai_interaction:         Math.round(base + (peopleLevel - 3) * 2),
    ai_output_evaluation:   Math.round(base + (peopleLevel - 3) * 3),
    ai_workflow_design:     Math.round(base + (businessLevel - 3) * 4),
    workforce_ai_readiness: Math.round(base + (businessLevel - 3) * 2),
    ai_ethics_trust:        Math.round(base + (peopleLevel - 3) * 1 + (businessLevel - 3) * 1),
    ai_change_leadership:   Math.round(base + (businessLevel - 3) * 3 + (peopleLevel - 3) * 1),
  };
  const result = {} as Record<DomainKey, number>;
  // Cap at 85 — 100 is the absolute ceiling, not a realistic target
  for (const key of DOMAIN_KEYS) result[key] = Math.max(20, Math.min(85, adj[key]));
  return result;
}

function overallFromDomains(targets: Record<DomainKey, number>): number {
  const vals = DOMAIN_KEYS.map(k => targets[k]);
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

// ─── Pill edit popover ────────────────────────────────────────────────────────
function PillEdit({
  label, icon, value, options, onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/12 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-xs font-medium text-foreground group"
      >
        <span className="text-muted-foreground">{icon}</span>
        <span>{value || label}</span>
        <Pencil className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-[#0E1726] border border-white/12 rounded-xl shadow-2xl min-w-[180px] py-1 overflow-hidden">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 border-b border-white/8">{label}</p>
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                opt.value === value ? "text-green-400 bg-green-500/10" : "text-foreground hover:bg-white/5"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────
function SectionDivider({ num, color, eyebrow, title, icon }: {
  num: string; color: string; eyebrow: string; title: string; icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold tracking-widest uppercase mb-0" style={{ color }}>{eyebrow}</p>
        <h2 className="text-lg font-bold text-foreground leading-tight">{title}</h2>
      </div>
      <div className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0" style={{ background: `${color}15`, color }}>
        {num}
      </div>
    </div>
  );
}

// ─── Horizontal domain bar chart ─────────────────────────────────────────────
function DomainBarChart({
  rows,
  onDomainClick,
}: {
  rows: Array<{ key: string; label: string; current: number | null; target: number; gap: number | null; color: string }>;
  onDomainClick?: (key: string) => void;
}) {
  return (
    <div className="space-y-3">
      {rows.map(row => {
        const hasCurrent = row.current !== null;
        const currentPct = hasCurrent ? row.current! : 0;
        const targetPct  = row.target;
        const gapPts     = row.gap !== null ? row.gap : null;
        const isGap      = gapPts !== null && gapPts > 5;
        return (
          <div key={row.key} className={`group ${onDomainClick ? "cursor-pointer" : ""}`} onClick={() => onDomainClick?.(row.key)}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">{row.label}</span>
              <div className="flex items-center gap-2">
                {hasCurrent && (
                  <span className="text-xs font-mono" style={{ color: row.color }}>{row.current}</span>
                )}
                <span className="text-xs text-muted-foreground">→</span>
                <span className="text-xs font-mono text-muted-foreground">{row.target}</span>
                {gapPts !== null && (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isGap ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"}`}>
                    {gapPts > 0 ? `−${gapPts}` : gapPts === 0 ? "✓" : `+${Math.abs(gapPts)}`}
                  </span>
                )}
              </div>
            </div>
            <div className="relative h-2 rounded-full bg-white/8 overflow-visible">
              {/* Current score bar */}
              {hasCurrent && (
                <div
                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
                  style={{ width: `${currentPct}%`, background: row.color, opacity: 0.7 }}
                />
              )}
              {/* Target marker */}
              <div
                className="absolute top-[-3px] w-0.5 h-[calc(100%+6px)] rounded-full bg-white/50"
                style={{ left: `${targetPct}%` }}
              />
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 pt-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-blue-400/70 inline-block" />Current</span>
        <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-white/50 inline-block" />Target</span>
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
                {segments.map((s: string) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
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
  open: boolean; onClose: () => void; allInitiatives: any[];
  selectedIds: Set<string>; onToggle: (id: string) => void; onDone: () => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [detailInitiative, setDetailInitiative] = useState<any | null>(null);
  const filtered = useMemo(() => {
    if (categoryFilter === "All") return allInitiatives;
    if (categoryFilter === "Custom") return allInitiatives.filter((i: any) => i.isUserDefined);
    return allInitiatives.filter((i: any) => (CATEGORY_MAP[i.category] ?? i.category) === categoryFilter);
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
                const typeColor  = AI_TYPE_COLORS[init.aiType] ?? "#9CA3AF";
                const catColor   = CATEGORY_COLOURS[CATEGORY_MAP[init.category] ?? init.category] ?? "#9CA3AF";
                return (
                  <div
                    key={init.id}
                    className={`relative rounded-xl border p-4 transition-all cursor-pointer ${
                      isSelected ? "border-green-500/40 bg-green-500/8" : "border-white/8 bg-white/2 hover:border-white/15 hover:bg-white/4"
                    }`}
                    onClick={() => onToggle(init.id)}
                    style={{ borderLeftColor: catColor, borderLeftWidth: "3px" }}
                  >
                    <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? "bg-green-500 border-green-500" : "border-white/20"}`}>
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
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${typeColor}18`, color: typeColor }}>{init.aiType}</span>
                      )}
                      {init.decisionAuthority && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-muted-foreground">{DA_LABELS[init.decisionAuthority] ?? init.decisionAuthority}</span>
                      )}
                      {init.regulatoryFlag && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">EU AI Act</span>
                      )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setDetailInitiative(init); }} className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronRight className="w-3 h-3" />View details
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
  const [roadmapView, setRoadmapView]                     = useState<"executive" | "operational">("executive");
  const [methodologyOpen, setMethodologyOpen]             = useState(false);
  const [strategyLocked, setStrategyLocked]               = useState(false);
  const [drillDownDomain, setDrillDownDomain]             = useState<string | null>(null);

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
      // Lock strategy if it has been saved at least once
      if (strategyData.strategySavedAt) setStrategyLocked(true);
    }
  }, [strategyData]);

  useEffect(() => {
    if (orgContext?.sector) setSectorRaw(orgContext.sector);
  }, [orgContext]);

  // Locked strategy: pills are read-only until user explicitly unlocks
  const setBusinessLevel = useCallback((v: number) => { if (!strategyLocked) { setBusinessLevelRaw(v); setIsDirty(true); } }, [strategyLocked]);
  const setPeopleLevel   = useCallback((v: number) => { if (!strategyLocked) { setPeopleLevelRaw(v); setIsDirty(true); } }, [strategyLocked]);
  const setSector        = useCallback((v: string) => { if (!strategyLocked) { setSectorRaw(v); setIsDirty(true); } }, [strategyLocked]);
  const toggleInitiative = useCallback((id: string) => {
    setSelectedInitiativeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setIsDirty(true);
  }, []);

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

  // Drill-down query — lazy, only fires when a domain is clicked
  const drillDownQ = trpc.dashboardV2.individual.domainDetail.useQuery(
    { domainKey: drillDownDomain ?? "ai_interaction" },
    { enabled: !!drillDownDomain }
  );

  const domainTargets  = useMemo(() => computeDomainTargets(businessLevel, peopleLevel), [businessLevel, peopleLevel]);
  const overallTarget  = useMemo(() => overallFromDomains(domainTargets), [domainTargets]);
  const selectedInits  = useMemo(() => allInitiatives.filter((i: any) => selectedInitiativeIds.has(i.id)), [allInitiatives, selectedInitiativeIds]);

  const initiativesByPhase = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const init of selectedInits) {
      const phase = assignPhase(init as { category: string; complexity: number | string; name: string });
      if (!groups[phase]) groups[phase] = [];
      groups[phase].push(init);
    }
    const order = ["Q1", "Q2", "Q3", "Q4"];
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
        label:      DOMAIN_LABELS[key as CapabilityKey],
        description: DOMAIN_DESCRIPTIONS?.[key as CapabilityKey] ?? "",
        target,
        current,
        gap,
        color:      DOMAIN_COLOURS[key as CapabilityKey] ?? "#60A5FA",
        targetPct:  clamp(target),
        currentPct: current !== null ? clamp(current) : null,
      };
    }).sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0));
  }, [domainTargets, strategyData]);

  const isLoading = strategyQ.isLoading || orgContextQ.isLoading || companyAssessmentQ.isLoading || strategyAssessmentQ.isLoading;
  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto pt-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const sectorLabel      = SECTORS.find(s => s.value === sector)?.label;
  const bLevel           = BUSINESS_LEVELS[businessLevel];
  const pLevel           = PEOPLE_LEVELS[peopleLevel];
  const requiredMaturity = bLevel?.requiredMaturity ?? 2.75;
  const companyGap       = companyResults ? requiredMaturity - companyResults.overallScore : null;
  const weakDims         = companyResults ? [...companyResults.dimensions].sort((a, b) => a.score - b.score).slice(0, 3) : [];
  const strongDims       = companyResults ? [...companyResults.dimensions].sort((a, b) => b.score - a.score).slice(0, 2) : [];
  const guidingPrinciples = strategyAssessment?.guidingPrinciples as Array<{ title: string; description: string }> | null | undefined;

  // Hero numbers
  const hrNow    = ambitionGap?.functionAvgRaw != null ? (ambitionGap.functionAvgRaw / 10).toFixed(1) : null;
  const hrTarget = (overallTarget / 10).toFixed(1);
  const hrGap    = hrNow != null ? ((overallTarget - ambitionGap!.functionAvgRaw!) / 10).toFixed(1) : null;

  // Diagnostic takeaway: cap priority domains at 3 even if all 6 have gaps
  const allDomainsWithGap  = domainGapRows.filter(r => r.gap !== null && r.gap > 5);
  const priorityDomainCount = Math.min(3, allDomainsWithGap.length);
  const domainsWithGap     = allDomainsWithGap.slice(0, priorityDomainCount);
  const domainsWithoutGap  = domainGapRows.filter(r => r.gap === null || r.gap <= 5);

  // Cost envelope
  const totalCostLow  = initiativesByPhase.reduce((s, g) => s + g.items.length * (PHASE_COST_PER_INIT[g.phase]?.low ?? 20), 0);
  const totalCostHigh = initiativesByPhase.reduce((s, g) => s + g.items.length * (PHASE_COST_PER_INIT[g.phase]?.high ?? 60), 0);

  // Delivery risks
  const hasRegFlag = selectedInits.some((i: any) => i.regulatoryFlag);
  const deliveryRisks = [
    {
      risk: "HR capability gap slows adoption",
      likelihood: "High" as const,
      mitigation: `Prioritise Phase 1 learning investment; target ${domainsWithGap.length > 0 ? domainsWithGap[0].label : "AI Interaction"} as the first capability sprint.`,
      dependency: "L&D",
    },
    {
      risk: "Data infrastructure not ready for AI tools",
      likelihood: (companyResults && companyResults.overallScore < 2.5 ? "High" : "Medium") as "High" | "Medium" | "Low",
      mitigation: "Conduct a data readiness audit in Month 1; gate Phase 2 initiatives on audit sign-off.",
      dependency: "IT / Data",
    },
    {
      risk: "Regulatory non-compliance (EU AI Act)",
      likelihood: (hasRegFlag ? "Medium" : "Low") as "High" | "Medium" | "Low",
      mitigation: "Engage Legal in Phase 1; map all flagged initiatives to EU AI Act risk categories before deployment.",
      dependency: "Legal / Compliance",
    },
  ];
  type RiskLevel = "High" | "Medium" | "Low";
  const RISK_STYLE: Record<RiskLevel, { pill: string; border: string }> = {
    High:   { pill: "bg-red-500/20 text-red-400",    border: "border-red-500/30" },
    Medium: { pill: "bg-amber-500/20 text-amber-400", border: "border-amber-500/30" },
    Low:    { pill: "bg-slate-500/20 text-slate-400", border: "border-slate-500/30" },
  };

  // TOC sections for sticky left nav
  const TOC_ITEMS = [
    { id: "hero",        label: "Hero",        color: "#94A3B8" },
    { id: "diagnostic", label: "Diagnostic",   color: "#60A5FA" },
    { id: "ambition",   label: "Ambition",     color: "#4ADE80" },
    { id: "plan",       label: "Plan",         color: "#A78BFA" },
    { id: "investment", label: "Investment",   color: "#FBBF24" },
    { id: "methodology",label: "Methodology",  color: "#9CA3AF" },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-24 relative">

      {/* ── Sticky left TOC ─────────────────────────────────────────────── */}
      <nav className="hidden xl:flex flex-col gap-1 fixed left-4 top-1/2 -translate-y-1/2 z-20">
        {TOC_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="flex items-center gap-2 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors group"
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" style={{ background: item.color }} />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          STICKY HEADER — breadcrumb pills + actions
      ══════════════════════════════════════════════════════════════════════ */}
      <div id="hero" className="sticky top-0 z-30 bg-[#0E1726]/95 backdrop-blur-sm border-b border-white/8 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 mb-6">
        <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
          {/* Breadcrumb pills */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <PillEdit
              label="Sector"
              icon={<Building2 className="w-3 h-3" />}
              value={sectorLabel ?? "Sector"}
              options={SECTORS}
              onChange={setSector}
            />
            <span className="text-muted-foreground text-xs">·</span>
            <PillEdit
              label="Business Ambition"
              icon={<BarChart3 className="w-3 h-3" />}
              value={bLevel?.label ?? "Business Ambition"}
              options={[1,2,3,4,5].map(l => ({ value: String(l), label: BUSINESS_LEVELS[l].label }))}
              onChange={v => setBusinessLevel(Number(v))}
            />
            <span className="text-muted-foreground text-xs">·</span>
            <PillEdit
              label="People Ambition"
              icon={<Users className="w-3 h-3" />}
              value={pLevel?.label ?? "People Ambition"}
              options={[1,2,3,4,5].map(l => ({ value: String(l), label: PEOPLE_LEVELS[l].label }))}
              onChange={v => setPeopleLevel(Number(v))}
            />
            <span className="text-muted-foreground text-xs">·</span>
            <button
              onClick={() => setShowSelectorModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/12 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-xs font-medium text-foreground"
            >
              <Layers className="w-3 h-3 text-muted-foreground" />
              {selectedInitiativeIds.size > 0 ? `${selectedInitiativeIds.size} initiatives` : "Add initiatives"}
              <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
            </button>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Persistence model: lock/unlock */}
            {strategyLocked ? (
              <>
                {strategyData?.strategySavedAt && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Saved {new Date(strategyData.strategySavedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-3 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  onClick={() => { setStrategyLocked(false); setIsDirty(false); }}
                >
                  <Unlock className="w-3 h-3 mr-1" />Edit strategy
                </Button>
              </>
            ) : (
              <>
                {isDirty && (
                  <Button size="sm" className="bg-green-500 hover:bg-green-400 text-black font-semibold h-7 text-xs px-3" onClick={handleSave} disabled={saveStrategyMut.isPending}>
                    <Save className="w-3 h-3 mr-1" />
                    {saveStrategyMut.isPending ? "Saving…" : "Save & lock"}
                  </Button>
                )}
                {!isDirty && !strategyData?.configured && (
                  <span className="text-[10px] text-muted-foreground">Configure inputs to generate</span>
                )}
              </>
            )}
            {/* Export PDF — Executive view only */}
            <a href="/api/pdf/ai_strategy" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="h-7 text-xs px-3 border-white/15 text-foreground hover:bg-white/8">
                <Download className="w-3 h-3 mr-1" />
                Export (Executive PDF)
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO — one sentence + 3 KPI numbers
      ══════════════════════════════════════════════════════════════════════ */}
      <div id="hero-content" className="rounded-2xl border border-white/8 bg-gradient-to-br from-[#0E1726] to-[#111c30] p-8 mb-8">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">HR AI Strategy</p>
        <p className="text-xl font-semibold text-foreground leading-relaxed mb-6 max-w-3xl">
          {companyResults && hrNow && hrGap && Number(hrGap) > 0
            ? `${companyResults.companyName ?? "The HR function"} is at ${hrNow}/10 against the ${hrTarget} needed for a ${bLevel?.label} ambition — this strategy closes the ${hrGap}-point gap through ${selectedInitiativeIds.size || "—"} initiatives over 18 months.`
            : hrNow && hrGap && Number(hrGap) > 0
            ? `The HR function is at ${hrNow}/10 against the ${hrTarget} needed for a ${bLevel?.label} ambition — this strategy closes the ${hrGap}-point gap through ${selectedInitiativeIds.size || "—"} initiatives over 18 months.`
            : `This strategy defines how the HR function will build AI capability to ${bLevel?.label?.toLowerCase() ?? "progressive"} standards across ${selectedInitiativeIds.size || "—"} initiatives over 18 months.`
          }
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "HR Capability Now",   value: hrNow ?? "—",    sub: "out of 10",          color: "#94A3B8" },
            { label: "Capability Target",   value: hrTarget,         sub: `${bLevel?.label} ambition`, color: "#94A3B8" },
            { label: "Gap to Close",        value: hrGap != null && Number(hrGap) > 0 ? hrGap : "—", sub: "points to close",  color: "#FBBF24" },
            { label: "Initiatives",         value: String(selectedInitiativeIds.size || "—"), sub: "over 18 months", color: "#94A3B8" },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-xl border border-white/8 bg-white/3 p-4 text-center">
              <p className="text-3xl font-bold mb-0.5" style={{ color: kpi.color }}>{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
              <p className="text-xs font-medium text-foreground mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — DIAGNOSTIC (anchor section, heavyweight)
          Where we are — company maturity + HR capability
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="diagnostic" className="mb-10">
        <SectionDivider
          num="1"
          color="#60A5FA"
          eyebrow="Section 1 — Diagnostic"
          title="Where We Are"
          icon={<BarChart3 className="w-4 h-4" />}
        />

        {/* One-line takeaway — the sentence that travels */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/6 px-5 py-4 mb-6 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-foreground leading-relaxed">
            {priorityDomainCount > 0 ? (
              <>
                <strong className="text-blue-400">
                  {priorityDomainCount === 1 ? "One capability needs" : priorityDomainCount === 2 ? "Two capabilities need" : "Three capabilities need"} priority investment
                </strong>: {domainsWithGap.map(d => d.label).join(", ")}.
                {" "}The other {6 - priorityDomainCount} will move with the system as the initiative programme builds momentum.
              </>
            ) : (
              <>The HR function's capability profile is well-aligned with the {bLevel?.label} ambition. The strategy should focus on maintaining momentum and deepening capability.</>
            )}
          </p>
        </div>

        {/* Company maturity panel */}
        {companyResults ? (
          <div className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/8">
              {/* Score */}
              <div className="p-6 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Organisation AI Maturity</p>
                <div className="relative flex items-center justify-center mb-2">
                  <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
                    <circle cx="48" cy="48" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                    <circle
                      cx="48" cy="48" r="38" fill="none"
                      stroke="#60A5FA" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 38}`}
                      strokeDashoffset={`${2 * Math.PI * 38 * (1 - companyResults.overallScore / 5)}`}
                      className="transition-all duration-700"
                    />
                    {/* Required marker */}
                    <circle
                      cx="48" cy="48" r="38" fill="none"
                      stroke="#FBBF24" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`4 ${2 * Math.PI * 38 - 4}`}
                      strokeDashoffset={`${2 * Math.PI * 38 * (1 - requiredMaturity / 5)}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold text-blue-400">{(companyResults.overallScore * 2).toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">/ 10</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground">{companyResults.maturityLabel}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Current</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Required</span>
                </div>
              </div>
              {/* Gap narrative */}
              <div className="p-6 sm:col-span-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Maturity Gap Analysis</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {companyGap !== null && companyGap > 1.5
                    ? `The organisation carries a ${(companyGap * 2).toFixed(1)}-point maturity gap against the ${(requiredMaturity * 2).toFixed(1)}/10 required for a ${bLevel?.label} ambition. The HR AI strategy must sequence foundation-building initiatives first — particularly in ${weakDims.slice(0, 2).map(d => d.label).join(" and ")} — before scaling more advanced AI programmes.`
                    : companyGap !== null && companyGap > 0.5
                    ? `The organisation is on a credible AI journey but needs to close a ${(companyGap * 2).toFixed(1)}-point gap to reach the ${(requiredMaturity * 2).toFixed(1)}/10 maturity required for a ${bLevel?.label} ambition. The strategy should focus on scaling what is working and closing the gaps in ${weakDims.slice(0, 2).map(d => d.label).join(" and ")}.`
                    : companyGap !== null && companyGap > -0.3
                    ? `The organisation's current AI maturity (${(companyResults.overallScore * 2).toFixed(1)}/10) is well-aligned with the ${bLevel?.label} ambition. The strategy should focus on maintaining momentum and deepening capability.`
                    : `The organisation is ahead of the maturity level required for a ${bLevel?.label} ambition. The strategy should focus on innovation and maintaining competitive advantage.`
                  }
                </p>
                {/* Dimension breakdown — top 3 gaps only flagged as priority, unified 2-colour system */}
                <div className="space-y-2">
                  {[...companyResults.dimensions].sort((a, b) => a.score - b.score).map((dim, idx) => {
                    const isPriority = idx < 3;
                    const pct = (dim.score / 5) * 100;
                    const barColor = isPriority ? "#F87171" : "#4ADE80";
                    return (
                      <div key={dim.key} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-36 truncate flex-shrink-0">{dim.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-white/8 relative">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor, opacity: 0.75 }} />
                          {dim.sectorBenchmark != null && (
                            <div className="absolute top-[-2px] w-0.5 h-[calc(100%+4px)] bg-white/30 rounded-full" style={{ left: `${(dim.sectorBenchmark / 5) * 100}%` }} />
                          )}
                        </div>
                        <span className="text-xs font-mono w-10 text-right" style={{ color: isPriority ? "#F87171" : "#4ADE80" }}>{(dim.score * 2).toFixed(1)}/10</span>
                        {isPriority && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 flex-shrink-0">Priority</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-1 rounded-full bg-red-400/70 inline-block" />Priority gap (bottom 3)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-1 rounded-full bg-green-400/70 inline-block" />On track</span>
                  <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-white/30 inline-block" />Sector avg</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-blue-500/20 bg-blue-500/4 p-5 mb-6 flex items-start gap-4">
            <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-1">No Company Assessment completed</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">Complete the Company Assessment to ground this strategy in your organisation's actual AI maturity.</p>
              <a href="/company-assessment">
                <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 h-7 text-xs">
                  <Building2 className="w-3 h-3 mr-1.5" />Complete Company Assessment
                </Button>
              </a>
            </div>
          </div>
        )}

        {/* HR capability gap — the single chart, clickable for drill-down */}
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">HR Team Capability</p>
              <p className="text-sm font-semibold text-foreground">Six-Domain Gap Profile</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Click any domain bar to see the evidence behind the score</p>
            </div>
            {ambitionGap?.configured && ambitionGap.functionAvgRaw != null && (
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-blue-400">{(ambitionGap.functionAvgRaw / 10).toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">Now</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-xl font-bold text-green-400">{hrTarget}</p>
                  <p className="text-[10px] text-muted-foreground">Target</p>
                </div>
              </div>
            )}
          </div>
          <DomainBarChart rows={domainGapRows} onDomainClick={(key) => setDrillDownDomain(key)} />
          {!ambitionGap?.configured && (
            <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              {isDirty ? "Save your strategy to generate a live gap analysis." : "Configure and save a strategy to see the live gap analysis."}
            </p>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — AMBITION (lighter weight)
          Where we're going — vision + principles + what we won't do
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="ambition" className="mb-10">
        <SectionDivider
          num="2"
          color="#4ADE80"
          eyebrow="Section 2 — Ambition"
          title="Where We're Going"
          icon={<Compass className="w-4 h-4" />}
        />

        {strategyAssessment?.completed && strategyAssessment.visionStatement ? (
          <div className="space-y-5">
            {/* Vision statement + 3 specific commitments */}
            <div className="rounded-xl border border-green-500/15 bg-green-500/5 p-6">
              <div className="flex items-start gap-2 mb-3">
                <Quote className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Vision Statement</p>
              </div>
              <blockquote className="text-base font-semibold text-foreground leading-relaxed italic mb-5">
                &ldquo;{strategyAssessment.visionStatement}&rdquo;
              </blockquote>
              {/* 3 specific commitments — the grammar of strategy */}
              <div className="border-t border-green-500/15 pt-4">
                <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-3">By the end of this strategy period, HR will:</p>
                <div className="space-y-2">
                  {[
                    `Design and deploy AI in any people process without external dependency — measured by zero externally-led AI implementations in Year 2.`,
                    `Reduce administrative work in Talent Acquisition and HR Operations by 30%+ through AI tooling — measured by time-to-hire and HR cost-per-head.`,
                    `Ensure every people leader can decide when AI is and isn't appropriate — measured by annual AI decision-making assessment completion rate above 90%.`,
                  ].map((commitment, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-green-400">{i + 1}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{commitment}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ways of work — condensed, fixed sentence template */}
            {sector && (
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">How AI Will Change Ways of Work</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  In {sectorLabel}, {companyResults?.companyName ?? "the organisation"}'s business is set on a{" "}
                  <strong className="text-foreground">{bLevel?.label}</strong> AI ambition, and HR is expected to operate at the{" "}
                  <strong className="text-foreground">{pLevel?.label}</strong> tier to deliver it.{" "}
                  {bLevel?.waysOfWork} {pLevel?.expectation}
                </p>
              </div>
            )}

            {/* Guiding principles */}
            {guidingPrinciples && guidingPrinciples.length > 0 && (
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Guiding Principles</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {guidingPrinciples.map((p, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg border border-white/6 bg-white/2">
                      <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-green-400">{i + 1}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-0.5">{p.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What we won't do — the cuts that make this a strategy */}
            <div className="rounded-xl border border-red-500/15 bg-red-500/4 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Ban className="w-4 h-4 text-red-400" />
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">What We Won't Do</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                A strategy that makes no cuts is a wishlist. The following are explicitly out of scope for this strategy period.
              </p>
              <ul className="space-y-2">
                {(OUT_OF_SCOPE[businessLevel] ?? OUT_OF_SCOPE[3]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-green-500/20 bg-green-500/4 p-6 flex items-start gap-4">
            <Compass className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-1">Strategy assessment not completed</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Complete the Build Strategy wizard to generate a vision statement and guiding principles.
              </p>
              <a href="/ai-strategy/assessment">
                <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10 h-7 text-xs">
                  <Sparkles className="w-3 h-3 mr-1.5" />Build Strategy
                </Button>
              </a>
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — PLAN (lighter weight)
          How we get there — pre-sequenced roadmap with view toggle
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="plan" className="mb-10">
        <SectionDivider
          num="3"
          color="#A78BFA"
          eyebrow="Section 3 — Plan"
          title="How We Get There"
          icon={<GitMerge className="w-4 h-4" />}
        />

        {selectedInits.length > 0 ? (
          <div className="rounded-xl border border-white/8 bg-white/2 overflow-hidden">
            {/* View toggle */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
              <p className="text-xs text-muted-foreground">{selectedInits.length} {selectedInits.length === 1 ? "initiative" : "initiatives"} across {initiativesByPhase.length} {initiativesByPhase.length === 1 ? "phase" : "phases"}</p>
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                <button
                  onClick={() => setRoadmapView("executive")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${roadmapView === "executive" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Eye className="w-3 h-3" />Executive
                </button>
                <button
                  onClick={() => setRoadmapView("operational")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${roadmapView === "operational" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <List className="w-3 h-3" />Operational
                </button>
              </div>
            </div>

            {roadmapView === "executive" ? (
              /* Executive view — phased timeline + headline counts */
              <div className="p-5">
                {/* Horizontal phase bar */}
                <div className="flex gap-2 mb-5">
                  {initiativesByPhase.map(({ phase, items }) => {
                    const meta = PHASE_LABELS[phase];
                    return (
                      <div key={phase} className="flex-1 rounded-lg border border-white/8 p-3 text-center" style={{ borderTopColor: meta.color, borderTopWidth: "2px" }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: meta.color }}>{meta.label.split("—")[1]?.trim() ?? meta.label}</p>
                        <p className="text-[10px] text-muted-foreground mb-2">{meta.months}</p>
                        <p className="text-2xl font-bold text-foreground">{items.length}</p>
                        <p className="text-[10px] text-muted-foreground">initiatives</p>
                      </div>
                    );
                  })}
                </div>
                {/* Category distribution */}
                <div className="space-y-2">
                  {Object.entries(
                    selectedInits.reduce((acc: Record<string, number>, i: any) => {
                      const cat = CATEGORY_MAP[i.category] ?? i.category ?? "Other";
                      acc[cat] = (acc[cat] ?? 0) + 1;
                      return acc;
                    }, {})
                  ).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
                    const color = CATEGORY_COLOURS[cat] ?? "#9CA3AF";
                    const outcome = OUTCOME_TAGS[cat] ?? cat;
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-xs text-foreground w-40 truncate">{cat}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-white/8">
                          <div className="h-full rounded-full" style={{ width: `${(count / selectedInits.length) * 100}%`, background: color, opacity: 0.7 }} />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground w-4 text-right">{count}</span>
                        <span className="text-[10px] text-muted-foreground w-28 text-right truncate">→ {outcome}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Operational view — full cards with phase, category, AI type, decision authority */
              <div className="divide-y divide-white/6">
                {initiativesByPhase.map(({ phase, items }) => {
                  const meta = PHASE_LABELS[phase];
                  return (
                    <div key={phase} className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: meta.color }}>{meta.label}</p>
                        <span className="text-xs text-muted-foreground">— {meta.months}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{items.length} initiatives</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {items.map((init: any) => {
                          const typeColor = AI_TYPE_COLORS[init.aiType] ?? "#9CA3AF";
                          const catColor  = CATEGORY_COLOURS[CATEGORY_MAP[init.category] ?? init.category] ?? "#9CA3AF";
                          const outcome   = OUTCOME_TAGS[CATEGORY_MAP[init.category] ?? init.category] ?? "";
                          return (
                            <div
                              key={init.id}
                              className="rounded-lg border border-white/8 bg-white/2 p-3 cursor-pointer hover:border-white/15 transition-colors"
                              style={{ borderLeftColor: catColor, borderLeftWidth: "3px" }}
                              onClick={() => setDetailInitiative(init)}
                            >
                              <p className="text-xs font-semibold text-foreground leading-snug mb-1.5">{init.name}</p>
                              <div className="flex flex-wrap gap-1.5 mb-1.5">
                                {init.aiType && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${typeColor}18`, color: typeColor }}>{init.aiType}</span>
                                )}
                                {init.decisionAuthority && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-white/10 text-muted-foreground">{DA_LABELS[init.decisionAuthority] ?? init.decisionAuthority}</span>
                                )}
                                {init.regulatoryFlag && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">EU AI Act</span>
                                )}
                              </div>
                              {outcome && <p className="text-[10px] text-muted-foreground">Outcome: {outcome}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add / edit initiatives */}
            <div className="px-5 py-3 border-t border-white/8">
              <button
                onClick={() => setShowSelectorModal(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings2 className="w-3.5 h-3.5" />Edit initiative selection
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-violet-500/20 bg-violet-500/4 p-6 flex items-start gap-4">
            <GitMerge className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-1">No initiatives selected</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">Select initiatives from the library to build your phased roadmap.</p>
              <Button size="sm" variant="outline" className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 h-7 text-xs" onClick={() => setShowSelectorModal(true)}>
                <Layers className="w-3 h-3 mr-1.5" />Browse Initiative Library
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — INVESTMENT & RISK (new)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="investment" className="mb-10">
        <SectionDivider
          num="4"
          color="#FBBF24"
          eyebrow="Section 4 — Investment & Risk"
          title="What It Will Cost and What Could Go Wrong"
          icon={<DollarSign className="w-4 h-4" />}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Cost envelope */}
          <div className="rounded-xl border border-amber-500/15 bg-amber-500/4 p-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Cost Envelope by Phase</p>
            </div>
            {initiativesByPhase.length > 0 ? (
              <div className="space-y-3">
                {initiativesByPhase.map(({ phase, items }) => {
                  const meta = PHASE_LABELS[phase];
                  const cost = PHASE_COST_PER_INIT[phase] ?? { low: 20, high: 60 };
                  const low  = items.length * cost.low;
                  const high = items.length * cost.high;
                  return (
                    <div key={phase} className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-foreground">{meta.label.split("—")[1]?.trim() ?? meta.label}</p>
                        <p className="text-[10px] text-muted-foreground">{items.length} initiatives · {meta.months}</p>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: meta.color }}>£{low}k–{high}k</p>
                    </div>
                  );
                })}
                <div className="border-t border-white/8 pt-3 flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">Total (18-month envelope)</p>
                  <p className="text-base font-bold text-amber-400">£{totalCostLow}k–{totalCostHigh}k</p>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Indicative order-of-magnitude estimates. Excludes internal headcount, change management, and vendor licensing. Requires Finance sign-off before Phase 2 commitment.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select initiatives to generate a cost envelope.</p>
            )}
          </div>

          {/* Delivery risks */}
          <div className="rounded-xl border border-red-500/15 bg-red-500/4 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Top 3 Delivery Risks</p>
            </div>
            <div className="space-y-4">
              {deliveryRisks.map((r, i) => {
                const style = RISK_STYLE[r.likelihood as RiskLevel] ?? RISK_STYLE.Low;
                return (
                  <div key={i} className={`border-l-2 pl-3 ${style.border}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold text-foreground flex-1">{r.risk}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${style.pill}`}>
                        {r.likelihood}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-1">{r.mitigation}</p>
                    <p className="text-[10px] text-muted-foreground">Dependency: <strong className="text-foreground">{r.dependency}</strong></p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dependencies */}
        <div className="rounded-xl border border-white/8 bg-white/2 p-5 mt-5">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cross-Functional Dependencies</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                function: "IT / Data",
                color: "#60A5FA",
                items: ["Data infrastructure readiness audit (Month 1)", "AI tool procurement and integration support", "Data governance framework alignment"],
              },
              {
                function: "Legal / Compliance",
                color: "#F87171",
                items: ["EU AI Act risk classification for flagged initiatives", "Employment law review for AI-assisted decisions", "Data protection impact assessments (DPIA)"],
              },
              {
                function: "Finance",
                color: "#FBBF24",
                items: ["Phase budget sign-off before each phase launch", "ROI measurement framework agreement", "Vendor contract review and approval"],
              },
            ].map(dep => (
              <div key={dep.function} className="rounded-lg border border-white/8 bg-white/2 p-4">
                <p className="text-xs font-bold mb-2" style={{ color: dep.color }}>{dep.function}</p>
                <ul className="space-y-1.5">
                  {dep.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5 text-muted-foreground" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          PAGE-END CTA — What's next?
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="mb-10">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0E1726] to-[#111c30] p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">What's Next</p>
              <h2 className="text-lg font-bold text-foreground">Turn this strategy into action</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: <Share2 className="w-4 h-4" />,
                color: "#60A5FA",
                title: "Share with stakeholders",
                description: "Export the Executive PDF and share with your CHRO, CPO, or board sponsor before the next leadership cycle.",
                action: "Export PDF",
                href: "/api/pdf/ai_strategy",
                external: true,
              },
              {
                icon: <UserCheck className="w-4 h-4" />,
                color: "#A78BFA",
                title: "Assign initiative owners",
                description: "Each initiative needs a named owner and a target date. Use the Operational view to assign and track.",
                action: "View initiatives",
                href: "#plan",
                external: false,
              },
              {
                icon: <Calendar className="w-4 h-4" />,
                color: "#4ADE80",
                title: "Schedule a kickoff",
                description: "Block time with your HR leadership team to review Phase 1 initiatives and confirm the first 90-day sprint.",
                action: "View Phase 1",
                href: "#plan",
                external: false,
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-white/8 bg-white/3 p-5 flex flex-col gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}18`, color: item.color }}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground mb-1">{item.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
                {item.external ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="w-full h-7 text-xs border-white/15 hover:bg-white/8" style={{ color: item.color }}>
                      {item.action} <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </a>
                ) : (
                  <Button
                    size="sm" variant="outline"
                    className="w-full h-7 text-xs border-white/15 hover:bg-white/8"
                    style={{ color: item.color }}
                    onClick={() => document.querySelector(item.href)?.scrollIntoView({ behavior: "smooth" })}
                  >
                    {item.action}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          APPENDIX — Methodology (collapsed)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="methodology">
        <Collapsible open={methodologyOpen} onOpenChange={setMethodologyOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-white/8 bg-white/2 hover:bg-white/4 transition-colors">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Appendix — Methodology</span>
                <span className="text-xs text-muted-foreground">Scoring model, benchmark sources, confidence intervals</span>
              </div>
              {methodologyOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-b-xl border border-t-0 border-white/8 bg-white/2 px-5 py-5 space-y-5">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Individual Capability Scoring</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Individual HR capability scores are computed by the AiQ Assessment Engine v10.7 using a sum-and-clip formula across 28 signals mapped to six domains. The formula is: <code className="text-xs bg-white/8 px-1.5 py-0.5 rounded">score = intercept + (Σ signal_deltas × multiplier)</code>, clamped to [0, 100]. Scores are deterministic — no LLM is involved in the scoring calculation. Confidence bands (High / Medium / Low) reflect evidence depth and breadth. Scores with fewer than three signals per domain are marked Provisional.
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Organisation Maturity Scoring</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Organisation AI maturity is assessed across seven dimensions using a 52-question adaptive instrument. Each response maps to a 1–5 scale (A=1.0, B=2.0, C=3.5, D=5.0). Dimension scores are weighted (Strategy 18%, Governance 16%, Data 15%, Technology 13%, Workforce 18%, HR Function 12%, Culture 8%) to produce an overall maturity score.
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Benchmark Sources</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { source: "McKinsey Global Survey on AI", year: "2024", use: "Sector maturity benchmarks" },
                    { source: "Deloitte AI Maturity Index", year: "2023", use: "Maturity level definitions" },
                    { source: "CIPD People Profession Survey", year: "2024", use: "HR capability benchmarks" },
                    { source: "BCG AI at Work", year: "2023", use: "Workforce readiness benchmarks" },
                    { source: "MIT Sloan Management Review", year: "2023", use: "AI culture indicators" },
                    { source: "EU AI Act (Regulation 2024/1689)", year: "2024", use: "Regulatory risk classification" },
                  ].map(ref => (
                    <div key={ref.source} className="flex items-start gap-2 p-2.5 rounded-lg border border-white/6 bg-white/2">
                      <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-foreground">{ref.source} ({ref.year})</p>
                        <p className="text-[10px] text-muted-foreground">{ref.use}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Confidence Intervals</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Individual scores carry a ±5-point confidence interval at the 95% level when the confidence band is High (≥0.75), ±10 points for Medium (0.50–0.74), and ±15 points for Low (&lt;0.50). Organisation maturity scores carry a ±0.3-point interval. These intervals should be considered when using scores in employment decisions.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>

      {/* Score drill-down modal */}
      <Dialog open={!!drillDownDomain} onOpenChange={() => setDrillDownDomain(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold pr-6">
              {drillDownDomain ? DOMAIN_LABELS[drillDownDomain as typeof DOMAIN_KEYS[number]] ?? drillDownDomain : ""} — Evidence
            </DialogTitle>
          </DialogHeader>
          {drillDownQ.isLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : drillDownQ.data ? (
            <div className="space-y-5 pt-1">
              {/* Score + confidence */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: drillDownQ.data.domainColour }}>
                    {drillDownQ.data.score != null ? (drillDownQ.data.score / 10).toFixed(1) : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">/ 10</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground leading-relaxed">{drillDownQ.data.narrativeExplanation}</p>
                  {drillDownQ.data.gapStatement && (
                    <p className="text-xs text-amber-400 mt-2 leading-relaxed">{drillDownQ.data.gapStatement}</p>
                  )}
                </div>
              </div>
              {/* Signal breakdown */}
              {drillDownQ.data.signals.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Signal Breakdown</p>
                  <div className="space-y-2">
                    {drillDownQ.data.signals.slice(0, 8).map((s: any) => (
                      <div key={s.signalKey} className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                          s.level === "Strong" ? "bg-green-500/20 text-green-400" :
                          s.level === "Critical" ? "bg-red-500/20 text-red-400" :
                          "bg-amber-500/20 text-amber-400"
                        }`}>{s.level}</span>
                        <span className="text-xs text-foreground flex-1 truncate">{s.name}</span>
                        <span className="text-xs font-mono text-muted-foreground">{(s.score / 10).toFixed(1)}/10</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Weighting note */}
              <div className="rounded-lg border border-white/8 bg-white/2 p-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">How this score is calculated</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Domain scores are computed by the AiQ Assessment Engine v10.7 using a sum-and-clip formula across signals mapped to this domain. Scores are deterministic — no LLM is involved. Confidence band: <strong className="text-foreground capitalize">{drillDownQ.data.confidenceBand}</strong>.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No assessment data available for this domain yet. Complete an assessment to see the evidence.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Modals */}
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
      <LibraryVersionFooter />
    </div>
  );
}

// ── Library Version Footer ────────────────────────────────────────────────────
function LibraryVersionFooter() {
  const { data: meta } = trpc.contentLibrary.meta.useQuery();
  if (!meta) return null;
  return (
    <div className="fixed bottom-4 right-4 z-30">
      <a
        href="/admin/content-library"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/60 backdrop-blur text-xs text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all shadow-lg"
        title={`Content Library v${meta.version} — built ${new Date(meta.built_at).toLocaleDateString()} · ${meta.git_sha}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Content Library v{meta.version}
      </a>
    </div>
  );
}
