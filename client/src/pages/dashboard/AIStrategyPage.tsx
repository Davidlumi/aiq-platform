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
 *   Section 5      — Value (ROI envelope, per-initiative breakdown, qualitative summary)
 *   Appendix       — Methodology (collapsed)
 */
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
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
  FileText, Quote, ChevronDown, ChevronUp, Pencil, X, PoundSterling,
  AlertCircle, Link2, LayoutGrid, List, Eye, Settings2, Ban,
  Lock, Unlock, Calendar, Share2, UserCheck, Clock, ExternalLink,
  TrendingDown, Activity,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { DOMAIN_KEYS, DOMAIN_LABELS, DOMAIN_COLOURS, DOMAIN_DESCRIPTIONS } from "@/lib/domains";
import type { CapabilityKey } from "@/lib/domains";
import {
  EXISTING_AI_TOOLS,
  AI_PHILOSOPHY_OPTIONS,
  EXECUTIVE_SPONSORS,
  GATEKEEPERS,
  AFFECTED_GROUPS,
  POTENTIAL_RESISTORS,
  MEASUREMENT_CADENCE_OPTIONS,
  SOLUTION_DELIVERY_OPTIONS,
  UK_REGULATORY_FRAMEWORKS,
  PILOT_SCOPE_OPTIONS,
  PILOT_DURATION_OPTIONS,
  PILOT_SUCCESS_METRICS,
} from "@/../../shared/strategyInputs";
import { getSubSectors, getSubSectorLabel } from "@/../../shared/sectorTaxonomy";

// ─── Sector options ─────────────────────────────────────────────────────
const SECTORS = [
  { value: "financial_services",    label: "Financial Services" },
  { value: "healthcare",            label: "Healthcare" },
  { value: "technology",            label: "Technology" },
  { value: "retail",                label: "Retail" },
  { value: "public_sector",         label: "Public Sector" },
  { value: "professional_services", label: "Professional Services" },
  { value: "manufacturing",         label: "Manufacturing" },
  { value: "energy_utilities",      label: "Energy & Utilities" },
  { value: "media_entertainment",   label: "Media & Entertainment" },
  { value: "logistics_transport",   label: "Logistics & Transport" },
  { value: "education",             label: "Education" },
  { value: "hospitality_leisure",   label: "Hospitality & Leisure" },
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
// Optimise-phase categories: CoE, operating model redesign, continuous governance maturation
const OPTIMISE_CATEGORIES   = new Set(["Ethics & Governance", "Governance & Ethics", "People Analytics", "HR Business Partnering"]);

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
  // Q4 — Optimise: high-complexity governance, analytics maturation, and operating model redesign
  if (complexity >= 4 && OPTIMISE_CATEGORIES.has(cat)) return "Q4";
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
      <div className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 border" style={{ background: `${color}22`, color, borderColor: `${color}40` }}>
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
        // B1: display all capability scores as /10 with one decimal place
        const currentDisp = hasCurrent ? (row.current! / 10).toFixed(1) : null;
        const targetDisp  = (row.target / 10).toFixed(1);
        const gapDisp     = gapPts !== null ? (gapPts / 10).toFixed(1) : null;
        return (
          <div key={row.key} className={`group ${onDomainClick ? "cursor-pointer" : ""}`} onClick={() => onDomainClick?.(row.key)}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">{row.label}</span>
              <div className="flex items-center gap-2">
                {hasCurrent && (
                  <span className="text-xs font-mono" style={{ color: row.color }}>{currentDisp}</span>
                )}
                <span className="text-xs text-muted-foreground">→</span>
                <span className="text-xs font-mono text-muted-foreground">{targetDisp}</span>
                {gapDisp !== null && (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isGap ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"}`}>
                    {gapPts! > 0 ? `-${gapDisp}` : gapPts === 0 ? "✓" : `+${Math.abs(Number(gapDisp))}`}
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
  const [, setLocation] = useLocation();

  const [businessLevel, setBusinessLevelRaw] = useState(3);
  const [peopleLevel, setPeopleLevelRaw]     = useState(3);
  const [sector, setSectorRaw]               = useState("");
  const [subSector, setSubSectorRaw]         = useState<string | null>(null);
  const [isDirty, setIsDirty]                = useState(false);
  const [selectedInitiativeIds, setSelectedInitiativeIds] = useState<Set<string>>(new Set());
  const [showSelectorModal, setShowSelectorModal]         = useState(false);
  const [detailInitiative, setDetailInitiative]           = useState<any | null>(null);
  const [roadmapView, setRoadmapView]                     = useState<"executive" | "operational">("executive");
  const [methodologyOpen, setMethodologyOpen]             = useState(false);
  const [strategyLocked, setStrategyLocked]               = useState(false);
  const [drillDownDomain, setDrillDownDomain]             = useState<string | null>(null);
  const [provenanceOpen, setProvenanceOpen]               = useState(false);
  const [provenanceTarget, setProvenanceTarget]           = useState<"vision" | "wontDo" | "costs" | "risks">("vision");

  const strategyQ           = trpc.intelligence.getStrategy.useQuery();
  const strategyAssessmentQ = trpc.intelligence.getStrategyAssessment.useQuery();
  const orgContextQ         = trpc.intelligence.orgContext.useQuery();
  const initiativesQ        = trpc.strategy.listInitiatives.useQuery(
    { tenantId: user?.tenantId ?? "" },
    { enabled: !!user?.tenantId }
  );
  const ambitionGapQ       = trpc.dashboardV2.leader.ambitionGap.useQuery();
  const companyAssessmentQ = trpc.companyAssessment.getMyAssessmentResults.useQuery();
  const libMetaQ           = trpc.contentLibrary.meta.useQuery();

  const strategyData       = strategyQ.data;
  const strategyAssessment = strategyAssessmentQ.data;
  const orgContext         = orgContextQ.data;
  // A1/A3: structured inputs from assessment
  const structuredInputs   = (strategyAssessment as any)?.structuredInputs as Record<string, unknown> | undefined;
  const ambitionGap        = ambitionGapQ.data;
  const allInitiatives     = initiativesQ.data ?? [];
  const companyResults     = companyAssessmentQ.data;
  const libMeta            = libMetaQ.data;

  // ── Derived ambition tier ─────────────────────────────────────────────────
  const ambitionTier = useMemo((): "cautious" | "progressive" | "transformative" => {
    if (businessLevel >= 4) return "transformative";
    if (businessLevel >= 3) return "progressive";
    return "cautious";
  }, [businessLevel]);

  // ── Live cost envelope (query, fires when initiatives are selected) ────────
  const [costInitIds, setCostInitIds] = useState<string[]>([]);
  const costEnvelopeQ = trpc.intelligence.calculateCostEnvelope.useQuery(
    { selectedInitiativeIds: costInitIds, orgSize: "medium", ambitionTier },
    { enabled: costInitIds.length > 0 }
  );

  // ── Live risk rules (mutation, fires on demand) ───────────────────────────
  const evaluateRiskMut = trpc.intelligence.evaluateRiskRules.useMutation();
  const [liveRisks, setLiveRisks] = useState<Array<{
    ruleId: string; displayName: string; riskStatement: string;
    severity: "very_high" | "high" | "medium" | "low";
    recommendedAction: string; regulatoryBasis: string[]; sources: string[];
  }> | null>(null);

  // ── Sector benchmark ──────────────────────────────────────────────────────
  const sectorBenchmarkQ = trpc.contentLibrary.getSectorBenchmark.useQuery(
    { sector_id: sector },
    { enabled: !!sector }
  );
  // ── C4 Value envelope ─────────────────────────────────────────────────────
  const [valueInitIds, setValueInitIds] = useState<string[]>([]);
  const [valueBaseline, setValueBaseline] = useState<Record<string, number | undefined>>({});
  const valueEnvelopeQ = trpc.intelligence.calculateValueEnvelope.useQuery(
    {
      selectedInitiativeIds: valueInitIds,
      operationalBaseline: valueBaseline as any,
      planHorizonMonths: 36,
    },
    { enabled: valueInitIds.length > 0 }
  );
  const [valueProvenanceOpen, setValueProvenanceOpen] = useState(false);
  const [valueProvenanceInitId, setValueProvenanceInitId] = useState<string | null>(null);

  // ── Fade-in transition: content starts hidden, reveals once loading resolves ──
  const [contentVisible, setContentVisible] = useState(false);
  // C1: Collapsible subsection states (collapsed by default)
  const [onTrackCollapsed, setOnTrackCollapsed]           = useState(true);
  const [guidingPrinciplesCollapsed, setGuidingPrinciplesCollapsed] = useState(false);
  const [crossFuncCollapsed, setCrossFuncCollapsed]       = useState(true);
  const [riskDescCollapsed, setRiskDescCollapsed]         = useState<Record<number, boolean>>({});
  const [regDescCollapsed, setRegDescCollapsed]           = useState<Record<string, boolean>>({});
  const [perInitCollapsed, setPerInitCollapsed]           = useState(true);
  const [qualBulletsCollapsed, setQualBulletsCollapsed]   = useState(true);
  // C2: Active ToC section scroll-spy
  const [activeSection, setActiveSection] = useState("hero");
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  // C2: Scroll-spy for ToC active section
  useEffect(() => {
    const sectionIds = ["hero", "diagnostic", "ambition", "plan", "investment", "value", "measurement", "methodology"];
    const observers: IntersectionObserver[] = [];
    const visibleSections = new Set<string>();
    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) visibleSections.add(id);
          else visibleSections.delete(id);
          // Pick the first visible section in document order
          const first = sectionIds.find(s => visibleSections.has(s));
          if (first) setActiveSection(first);
        },
        { rootMargin: "-10% 0px -60% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [contentVisible]);

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

  // Sync cost envelope query input when selected initiatives change
  useEffect(() => {
    const ids = Array.from(selectedInitiativeIds);
    if (ids.length > 0) setCostInitIds(ids);
  }, [selectedInitiativeIds]);
  // Sync value envelope query input when selected initiatives change
  useEffect(() => {
    const ids = Array.from(selectedInitiativeIds);
    if (ids.length > 0) {
      setValueInitIds(ids);
      // Use operational baseline from strategy assessment if available
      const ob = (strategyAssessmentQ.data as any)?.operationalBaseline;
      if (ob && typeof ob === "object") setValueBaseline(ob);
    }
  }, [selectedInitiativeIds, strategyAssessmentQ.data]);

  // Evaluate risk rules when initiatives or ambition tier changes
  useEffect(() => {
    const ids = Array.from(selectedInitiativeIds);
    if (ids.length === 0) { setLiveRisks(null); return; }
    evaluateRiskMut.mutate(
      { selectedInitiativeIds: ids, ambitionTier, orgSize: "medium" },
      { onSuccess: (data) => setLiveRisks(data) }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInitiativeIds, ambitionTier]);

  useEffect(() => {
    if (orgContext?.sector) setSectorRaw(orgContext.sector);
    if (orgContext?.subSector !== undefined) setSubSectorRaw(orgContext.subSector ?? null);
  }, [orgContext]);

  // Locked strategy: pills are read-only until user explicitly unlocks
  const setBusinessLevel = useCallback((v: number) => { if (!strategyLocked) { setBusinessLevelRaw(v); setIsDirty(true); } }, [strategyLocked]);
  const setPeopleLevel   = useCallback((v: number) => { if (!strategyLocked) { setPeopleLevelRaw(v); setIsDirty(true); } }, [strategyLocked]);
  const setSector        = useCallback((v: string) => { if (!strategyLocked) { setSectorRaw(v); setSubSectorRaw(null); setIsDirty(true); } }, [strategyLocked]);
  const setSubSector     = useCallback((v: string | null) => { if (!strategyLocked) { setSubSectorRaw(v); setIsDirty(true); } }, [strategyLocked]);
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
    const sectorChanged    = sector && sector !== orgContext?.sector;
    const subSectorChanged = subSector !== (orgContext?.subSector ?? null);
    if (sectorChanged || subSectorChanged) {
      upsertOrgContextMut.mutate({ sector: sector as any, subSector });
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

  // ── Regeneration banner ───────────────────────────────────────────────────
  const showRegenerationBanner = useMemo(() => {
    if (!strategyData?.libraryVersion || !libMeta?.version) return false;
    return strategyData.libraryVersion !== libMeta.version;
  }, [strategyData?.libraryVersion, libMeta?.version]);

  // wontDo: prefer persisted DB value, fallback to static OUT_OF_SCOPE
  // MUST be before any early returns (React hooks rules)
  const wontDoItems: string[] = useMemo(() => {
    const persisted = strategyData?.wontDo;
    if (Array.isArray(persisted) && persisted.length > 0) return persisted as string[];
    return OUT_OF_SCOPE[businessLevel] ?? OUT_OF_SCOPE[3];
  }, [strategyData?.wontDo, businessLevel]);

  const isLoading = strategyQ.isLoading || orgContextQ.isLoading || companyAssessmentQ.isLoading || strategyAssessmentQ.isLoading;
  // Must be declared before any early return (Rules of Hooks)
  const subSectorOptions = useMemo(() => getSubSectors(sector), [sector]);

  // Trigger fade-in once all queries resolve
  useEffect(() => {
    if (!isLoading) {
      // Tiny rAF delay so the browser paints the opacity-0 frame first
      const id = requestAnimationFrame(() => setContentVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setContentVisible(false);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto pb-24 animate-pulse">

        {/* ── Sticky header skeleton ─────────────────────────────────────── */}
        <div className="sticky top-0 z-30 bg-[#0E1726]/95 backdrop-blur-sm border-b border-white/8 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 mb-6">
          <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-3 w-1 rounded" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-3 w-1 rounded" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-3 w-1 rounded" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-7 w-32 rounded-md" />
            </div>
          </div>
        </div>

        {/* ── Hero skeleton ──────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6 mb-6">
          <Skeleton className="h-3 w-24 rounded mb-3" />
          <Skeleton className="h-7 w-4/5 rounded mb-1" />
          <Skeleton className="h-7 w-3/5 rounded mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {["w-16", "w-14", "w-12", "w-8"].map((w, i) => (
              <div key={i} className="rounded-xl border border-white/8 bg-white/3 p-4 flex flex-col items-center gap-2">
                <Skeleton className={`h-8 ${w} rounded`} />
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 1 — Diagnostic skeleton ───────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6 mb-6">
          <Skeleton className="h-3 w-32 rounded mb-2" />
          <Skeleton className="h-6 w-40 rounded mb-5" />
          {/* Takeaway banner */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 mb-5 flex items-start gap-3">
            <Skeleton className="h-4 w-4 rounded-full flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-4/5 rounded" />
            </div>
          </div>
          {/* Maturity grid */}
          <div className="grid sm:grid-cols-3 gap-0 rounded-xl border border-white/8 overflow-hidden mb-5">
            <div className="p-6 flex flex-col items-center gap-3">
              <Skeleton className="h-28 w-28 rounded-full" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            <div className="sm:col-span-2 p-6 space-y-3">
              <Skeleton className="h-3 w-28 rounded mb-3" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-5/6 rounded" />
              <Skeleton className="h-3 w-4/5 rounded mb-4" />
              {["w-32", "w-28", "w-24", "w-36", "w-20", "w-28"].map((lw, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className={`h-3 ${lw} rounded flex-shrink-0`} />
                  <Skeleton className="flex-1 h-1.5 rounded-full" />
                  <Skeleton className="h-3 w-10 rounded" />
                </div>
              ))}
            </div>
          </div>
          {/* HR capability bars */}
          <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-3 w-52 rounded" />
              </div>
              <div className="flex gap-4">
                <div className="text-center space-y-1">
                  <Skeleton className="h-6 w-10 rounded mx-auto" />
                  <Skeleton className="h-3 w-8 rounded" />
                </div>
                <div className="text-center space-y-1">
                  <Skeleton className="h-6 w-10 rounded mx-auto" />
                  <Skeleton className="h-3 w-8 rounded" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {["w-40", "w-36", "w-32", "w-44", "w-36", "w-28"].map((lw, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className={`h-3 ${lw} rounded flex-shrink-0`} />
                  <Skeleton className="flex-1 h-2 rounded-full" />
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-3 w-10 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 2 — Ambition skeleton ─────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6 mb-6">
          <Skeleton className="h-3 w-32 rounded mb-2" />
          <Skeleton className="h-6 w-44 rounded mb-5" />
          {/* Vision */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-5 mb-4">
            <Skeleton className="h-3 w-28 rounded mb-3" />
            <Skeleton className="h-3 w-full rounded mb-1.5" />
            <Skeleton className="h-3 w-5/6 rounded mb-1.5" />
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
          {/* Commitments */}
          <div className="space-y-2 mb-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-white/8">
                <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-3/4 rounded" />
                </div>
              </div>
            ))}
          </div>
          {/* Principles */}
          <Skeleton className="h-3 w-28 rounded mb-3" />
          <div className="grid sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="p-4 rounded-xl border border-white/8 space-y-1.5">
                <Skeleton className="h-4 w-36 rounded" />
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-4/5 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 3 — Plan skeleton ──────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6 mb-6">
          <Skeleton className="h-3 w-32 rounded mb-2" />
          <Skeleton className="h-6 w-40 rounded mb-5" />
          {/* Toggle */}
          <div className="flex items-center gap-2 mb-5">
            <Skeleton className="h-7 w-24 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
          {/* Phase columns */}
          <div className="grid sm:grid-cols-3 gap-4">
            {["Foundation", "Build", "Scale"].map((phase) => (
              <div key={phase} className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                <Skeleton className="h-3 w-24 rounded" />
                {[0, 1, 2].map(i => (
                  <div key={i} className="p-3 rounded-lg border border-white/8 space-y-1.5">
                    <Skeleton className="h-3 w-full rounded" />
                    <Skeleton className="h-3 w-2/3 rounded" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 4 — Investment & Risk skeleton ─────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6 mb-6">
          <Skeleton className="h-3 w-40 rounded mb-2" />
          <Skeleton className="h-6 w-64 rounded mb-5" />
          {/* Cost envelope */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
            <div className="grid sm:grid-cols-3 gap-3 mb-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="p-4 rounded-xl border border-white/8 space-y-2">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-5 w-28 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl border border-white/8 flex items-center justify-between">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-6 w-28 rounded" />
            </div>
          </div>
          {/* Risks */}
          <div className="space-y-3 mb-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="p-4 rounded-xl border border-white/8 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-4 w-56 rounded" />
                </div>
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-4/5 rounded" />
              </div>
            ))}
          </div>
          {/* Dependencies */}
          <div className="grid sm:grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="p-4 rounded-xl border border-white/8 space-y-2">
                <Skeleton className="h-4 w-24 rounded" />
                {[0, 1, 2].map(j => (
                  <div key={j} className="flex items-start gap-2">
                    <Skeleton className="h-1.5 w-1.5 rounded-full flex-shrink-0 mt-1.5" />
                    <Skeleton className="h-3 w-full rounded" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 5 — Value skeleton ─────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6 mb-6">
          <Skeleton className="h-3 w-32 rounded mb-2" />
          <Skeleton className="h-6 w-52 rounded mb-5" />
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[0, 1, 2].map(i => (
              <div key={i} className="rounded-xl border border-white/8 bg-white/3 p-4 text-center space-y-2">
                <Skeleton className="h-7 w-20 rounded mx-auto" />
                <Skeleton className="h-3 w-24 rounded mx-auto" />
              </div>
            ))}
          </div>
          {/* Per-initiative rows */}
          <div className="space-y-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/8">
                <Skeleton className="h-4 w-48 rounded flex-shrink-0" />
                <Skeleton className="flex-1 h-1.5 rounded-full" />
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-6 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  const sectorLabel      = SECTORS.find(s => s.value === sector)?.label;
  const subSectorLabel   = subSector ? getSubSectorLabel(sector, subSector) : null;
  const contextLabel     = subSectorLabel ? `${subSectorLabel} (${sectorLabel})` : (sectorLabel ?? sector);
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

  // Cost envelope — use live data if available, fall back to static estimates
  const liveCostEnvelope = costEnvelopeQ.data;
  const totalCostLow  = liveCostEnvelope?.totalMin ?? initiativesByPhase.reduce((s, g) => s + g.items.length * (PHASE_COST_PER_INIT[g.phase]?.low ?? 20), 0);
  const totalCostHigh = liveCostEnvelope?.totalMax ?? initiativesByPhase.reduce((s, g) => s + g.items.length * (PHASE_COST_PER_INIT[g.phase]?.high ?? 60), 0);

  // Delivery risks — use live risk rule evaluation if available
  const SEVERITY_TO_LIKELIHOOD: Record<string, "High" | "Medium" | "Low"> = {
    very_high: "High", high: "High", medium: "Medium", low: "Low",
  };
  const hasRegFlag = selectedInits.some((i: any) => i.regulatoryFlag);
  const deliveryRisks: Array<{ risk: string; likelihood: "High" | "Medium" | "Low"; mitigation: string; dependency: string; sources?: string[] }> = liveRisks && liveRisks.length > 0
    ? liveRisks.slice(0, 4).map(r => ({
        risk: r.displayName,
        likelihood: SEVERITY_TO_LIKELIHOOD[r.severity] ?? "Medium",
        mitigation: r.recommendedAction,
        dependency: r.regulatoryBasis.length > 0 ? r.regulatoryBasis[0] : "Legal / Compliance",
        sources: r.sources,
      }))
    : [
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

  // TOC sections for sticky left nav (C2)
  const TOC_ITEMS = [
    { id: "diagnostic",  label: "Where we are",                      color: "#60A5FA" },
    { id: "ambition",    label: "Where we're going",                  color: "#4ADE80" },
    { id: "plan",        label: "How we get there",                   color: "#A78BFA" },
    { id: "investment",  label: "What it costs & what could go wrong", color: "#FBBF24" },
    { id: "value",       label: "What this strategy is worth",        color: "#34D399" },
    { id: "measurement", label: "How we will measure progress",       color: "#94A3B8" },
    { id: "methodology", label: "Methodology",                        color: "#6B7280" },
  ];

  return (
    <div
      className="max-w-5xl mx-auto pb-24 relative transition-[opacity,transform] duration-500 ease-out"
      style={{
        opacity: contentVisible ? 1 : 0,
        transform: contentVisible ? "translateY(0)" : "translateY(10px)",
      }}
    >

      {/* ── C2: Sticky left TOC with scroll-spy ────────────────────────── */}
      <nav
        aria-label="Page sections"
        className="hidden xl:flex flex-col gap-0.5 fixed left-4 top-1/2 -translate-y-1/2 z-20 bg-[#0E1726]/80 backdrop-blur-sm rounded-xl border border-white/8 px-2 py-3 min-w-[180px]"
      >
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-1">On this page</p>
        {TOC_ITEMS.map(item => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              aria-label={`Jump to ${item.label}`}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all text-left ${
                isActive
                  ? "text-foreground border-l-2 pl-[6px]"
                  : "text-muted-foreground hover:text-foreground border-l-2 border-transparent pl-[6px]"
              }`}
              style={isActive ? { borderColor: item.color } : {}}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-opacity" style={{ background: item.color, opacity: isActive ? 1 : 0.4 }} />
              <span className="leading-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
      {/* ── C2: Mobile ToC dropdown (<768px) ──────────────────────────────── */}
      <div className="xl:hidden sticky top-[52px] z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-[#0E1726]/95 backdrop-blur-sm border-b border-white/8 mb-4">
        <button
          onClick={() => setMobileTocOpen(o => !o)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={mobileTocOpen}
          aria-label="Jump to section"
        >
          <List className="w-3.5 h-3.5" />
          <span>Jump to section</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileTocOpen ? "rotate-180" : ""}`} />
        </button>
        {mobileTocOpen && (
          <div className="mt-2 flex flex-col gap-0.5 pb-2">
            {TOC_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => { document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); setMobileTocOpen(false); }}
                className="text-left text-xs text-muted-foreground hover:text-foreground py-1 px-2 rounded transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

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
            {subSectorOptions.length > 0 && (
              <>
                <span className="text-muted-foreground text-xs">/</span>
                <PillEdit
                  label="Sub-sector"
                  icon={<Building2 className="w-3 h-3" />}
                  value={subSectorLabel ?? "All sub-sectors"}
                  options={[{ value: "", label: "All sub-sectors" }, ...subSectorOptions]}
                  onChange={v => setSubSector(v || null)}
                />
              </>
            )}
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
                {!isDirty && strategyData?.configured && (
                  <Button size="sm" className="bg-green-500 hover:bg-green-400 text-black font-semibold h-7 text-xs px-3" onClick={handleSave} disabled={saveStrategyMut.isPending}>
                    <Lock className="w-3 h-3 mr-1" />
                    Lock strategy
                  </Button>
                )}
                {!isDirty && !strategyData?.configured && (
                  <span className="text-[10px] text-muted-foreground">Configure inputs to generate</span>
                )}
              </>
            )}
            {/* Export PDF — Executive view only */}
            <a href="/api/pdf/board_pack" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="h-7 text-xs px-3 border-white/15 text-foreground hover:bg-white/8">
                <Download className="w-3 h-3 mr-1" />
                Export Board Pack
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* ── Regeneration banner — shown when library version has changed ── */}
      {showRegenerationBanner && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-5 py-3 mb-4 flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-amber-300">Content library updated to v{libMeta?.version}</p>
            <p className="text-xs text-muted-foreground">Your strategy was generated with library v{strategyData?.libraryVersion}. Regenerate the vision and principles to incorporate the latest guidance.</p>
          </div>
          <a href="/ai-strategy/assessment">
            <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-7 text-xs flex-shrink-0">
              <Sparkles className="w-3 h-3 mr-1.5" />Regenerate
            </Button>
          </a>
        </div>
      )}

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
                {/* Dimension breakdown — top 3 gaps VISIBLE, on-track COLLAPSED (C1) */}
                {(() => {
                  const sorted = [...companyResults.dimensions].sort((a, b) => a.score - b.score);
                  const priority = sorted.slice(0, 3);
                  const onTrack  = sorted.slice(3);
                  const renderDim = (dim: typeof sorted[0], isPriority: boolean) => {
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
                  };
                  return (
                    <div className="space-y-2">
                      {priority.map(d => renderDim(d, true))}
                      {onTrack.length > 0 && (
                        <div>
                          <button
                            onClick={() => setOnTrackCollapsed(c => !c)}
                            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors mt-1 mb-1"
                            aria-expanded={!onTrackCollapsed}
                          >
                            <ChevronDown className={`w-3 h-3 transition-transform ${onTrackCollapsed ? "" : "rotate-180"}`} />
                            {onTrackCollapsed ? `See ${onTrack.length} on-track dimension${onTrack.length !== 1 ? "s" : ""}` : "Hide on-track dimensions"}
                          </button>
                          {!onTrackCollapsed && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                              {onTrack.map(d => renderDim(d, false))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                {strategyData?.provenanceJson && (
                  <button onClick={() => { setProvenanceTarget("vision"); setProvenanceOpen(true); }} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <Info className="w-3 h-3" />Provenance
                  </button>
                )}
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
                  In {contextLabel}, {companyResults?.companyName ?? "the organisation"}'s business is set on a{" "}
                  <strong className="text-foreground">{bLevel?.label}</strong> AI ambition, and HR is expected to operate at the{" "}
                  <strong className="text-foreground">{pLevel?.label}</strong> tier to deliver it.{" "}
                  {bLevel?.waysOfWork} {pLevel?.expectation}
                </p>
              </div>
            )}

            {/* Guiding principles — C1: collapsed by default */}
            {guidingPrinciples && guidingPrinciples.length > 0 && (
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <button
                  onClick={() => setGuidingPrinciplesCollapsed(c => !c)}
                  className="w-full flex items-center justify-between"
                  aria-expanded={!guidingPrinciplesCollapsed}
                >
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Guiding Principles</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{guidingPrinciplesCollapsed ? `See ${guidingPrinciples.length} principles` : "Hide"}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${guidingPrinciplesCollapsed ? "" : "rotate-180"}`} />
                  </div>
                </button>
                {!guidingPrinciplesCollapsed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 animate-in slide-in-from-top-2 duration-200">
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
                )}
              </div>
            )}

            {/* A3 — AI Philosophy */}
            {(() => {
              const philValue = structuredInputs?.ai_philosophy as string | undefined;
              const phil = philValue ? AI_PHILOSOPHY_OPTIONS.find(o => o.value === philValue) : undefined;
              if (!phil) return null;
              return (
                <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 px-5 py-4 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">AI Philosophy</p>
                    <p className="text-sm font-semibold text-foreground mb-1">{phil.label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{phil.description}</p>
                  </div>
                </div>
              );
            })()}

            {/* A1 — Current AI Landscape */}
            {Array.isArray(structuredInputs?.existing_ai_tools) && (structuredInputs!.existing_ai_tools as string[]).length > 0 && !(structuredInputs!.existing_ai_tools as string[]).includes("none") && (
              <div className="rounded-xl border border-white/8 bg-white/2 px-5 py-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Current AI Landscape</p>
                <p className="text-xs text-muted-foreground mb-3">Tools already deployed in HR — initiatives will complement rather than duplicate these.</p>
                <div className="flex flex-wrap gap-2">
                  {(structuredInputs!.existing_ai_tools as string[]).map((toolId: string) => {
                    const tool = EXISTING_AI_TOOLS.find(t => t.id === toolId);
                    return tool ? (
                      <span key={toolId} className="text-xs px-2.5 py-1 rounded-full border border-white/12 bg-white/4 text-muted-foreground">
                        {tool.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* What we won't do — the cuts that make this a strategy */}
            <div className="rounded-xl border border-red-500/15 bg-red-500/4 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Ban className="w-4 h-4 text-red-400" />
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">What We Won't Do</p>
                {Array.isArray(strategyData?.wontDo) && (strategyData?.wontDo as string[]).length > 0 && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">AI-generated</span>
                )}
                {strategyData?.provenanceJson && (
                  <button onClick={() => { setProvenanceTarget("wontDo"); setProvenanceOpen(true); }} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 ml-1">
                    <Info className="w-3 h-3" />Why these exclusions?
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                A strategy that makes no cuts is a wishlist. The following are explicitly out of scope for this strategy period.
              </p>
              <ul className="space-y-2">
                {wontDoItems.map((item, i) => (
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

      {/* B1 — Stakeholder Map */}
      {(() => {
        const sm = structuredInputs?.stakeholder_map as {
          executive_sponsors?: string[];
          gatekeepers?: string[];
          affected_groups?: string[];
          potential_resistors?: string[];
          notes?: string;
        } | undefined;
        if (!sm || (
          !sm.executive_sponsors?.length &&
          !sm.gatekeepers?.length &&
          !sm.affected_groups?.length &&
          !sm.potential_resistors?.length
        )) return null;
        const quadrants = [
          { key: "executive_sponsors",  label: "Executive Sponsors",  ids: sm.executive_sponsors ?? [],  options: EXECUTIVE_SPONSORS,  color: "#60A5FA",  icon: <UserCheck className="w-3.5 h-3.5" /> },
          { key: "gatekeepers",         label: "Gatekeepers",         ids: sm.gatekeepers ?? [],         options: GATEKEEPERS,         color: "#FBBF24",  icon: <Lock className="w-3.5 h-3.5" /> },
          { key: "affected_groups",     label: "Affected Groups",     ids: sm.affected_groups ?? [],     options: AFFECTED_GROUPS,     color: "#4ADE80",  icon: <Users className="w-3.5 h-3.5" /> },
          { key: "potential_resistors", label: "Potential Resistors", ids: sm.potential_resistors ?? [], options: POTENTIAL_RESISTORS, color: "#F87171",  icon: <AlertCircle className="w-3.5 h-3.5" /> },
        ] as const;
        return (
          <div className="rounded-xl border border-white/8 bg-white/2 p-5 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-blue-400" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Stakeholder Map</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {quadrants.map(q => (
                <div key={q.key} className="rounded-lg border border-white/8 bg-white/2 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span style={{ color: q.color }}>{q.icon}</span>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: q.color }}>{q.label}</p>
                  </div>
                  {q.ids.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50 italic">None identified</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {q.ids.map(id => {
                        const opt = (q.options as readonly { id: string; label: string }[]).find(o => o.id === id);
                        return opt ? (
                          <span key={id} className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: `${q.color}40`, background: `${q.color}15`, color: q.color }}>
                            {opt.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {sm.notes && (
              <div className="mt-3 rounded-lg bg-white/3 border border-white/6 px-3 py-2">
                <p className="text-xs text-muted-foreground leading-relaxed">{sm.notes}</p>
              </div>
            )}
          </div>
        );
      })()}
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
                <div className="flex gap-2 mb-5 overflow-x-auto pb-1 snap-x snap-mandatory sm:overflow-x-visible sm:pb-0">
                  {initiativesByPhase.map(({ phase, items }) => {
                    const meta = PHASE_LABELS[phase];
                    // Map Q1/Q2/Q3/Q4 to library phase IDs
                    const phaseIdMap: Record<string, string> = { Q1: "foundation", Q2: "build", Q3: "scale", Q4: "optimise" };
                    return (
                      <div key={phase} className="flex-1 min-w-[100px] snap-start rounded-lg border border-white/8 p-3 text-center" style={{ borderTopColor: meta.color, borderTopWidth: "2px" }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: meta.color }}>{meta.label.split("—")[1]?.trim() ?? meta.label}</p>
                        <p className="text-[10px] text-muted-foreground mb-2">{meta.months}</p>
                        <p className="text-2xl font-bold text-foreground">{items.length}</p>
                        <p className="text-[10px] text-muted-foreground">initiatives</p>
                        {/* Live cost from engine */}
                        {liveCostEnvelope?.byPhase.find(p => p.phase === phaseIdMap[phase]) && (() => {
                          const cp = liveCostEnvelope.byPhase.find(p => p.phase === phaseIdMap[phase])!;
                          return <p className="text-[10px] font-semibold mt-1" style={{ color: meta.color }}>£{cp.minGbk}k–£{cp.maxGbk}k</p>;
                        })()}
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
                              {/* B2: per-initiative link to filtered learning view */}
                              <button
                                onClick={(e) => { e.stopPropagation(); setLocation(`/learning/initiative/${init.id}`); }}
                                className="mt-2 text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5">
                                See modules building this capability →
                              </button>
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
          icon={<PoundSterling className="w-4 h-4" />}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Cost envelope */}
          <div className="rounded-xl border border-amber-500/15 bg-amber-500/4 p-5">
            <div className="flex items-center gap-2 mb-4">
              <PoundSterling className="w-4 h-4 text-amber-400" />
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Cost Envelope by Phase</p>
              {liveCostEnvelope && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">Library v{liveCostEnvelope.libraryVersion}</span>}
              {strategyData?.provenanceJson && (
                <button onClick={() => { setProvenanceTarget("costs"); setProvenanceOpen(true); }} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" />Sources
                </button>
              )}
            </div>
            {initiativesByPhase.length > 0 ? (
              <div className="space-y-3">
                {(() => {
                  const phaseIdMap: Record<string, string> = { Q1: "foundation", Q2: "build", Q3: "scale", Q4: "optimise" };
                  return initiativesByPhase.map(({ phase, items }) => {
                    const meta = PHASE_LABELS[phase];
                    const livePhase = liveCostEnvelope?.byPhase.find(p => p.phase === phaseIdMap[phase]);
                    const cost = PHASE_COST_PER_INIT[phase] ?? { low: 20, high: 60 };
                    const low  = livePhase?.minGbk ?? items.length * cost.low;
                    const high = livePhase?.maxGbk ?? items.length * cost.high;
                    const isFoundationHigher = phase === "Q1" && (() => {
                      const buildPhase = initiativesByPhase.find(p => p.phase === "Q2");
                      if (!buildPhase) return false;
                      const buildLive = liveCostEnvelope?.byPhase.find(p => p.phase === "build");
                      const buildCost = PHASE_COST_PER_INIT["Q2"] ?? { low: 20, high: 60 };
                      const buildHigh = buildLive?.maxGbk ?? buildPhase.items.length * buildCost.high;
                      return high > buildHigh;
                    })();
                    return (
                      <div key={phase}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-foreground">{meta.label.split("—")[1]?.trim() ?? meta.label}</p>
                            <p className="text-[10px] text-muted-foreground">{items.length} initiatives · {meta.months}</p>
                          </div>
                          <p className="text-sm font-semibold" style={{ color: meta.color }}>£{low}k–£{high}k</p>
                        </div>
                        {isFoundationHigher && (
                          <p className="text-[10px] text-blue-400/70 mt-0.5 leading-relaxed">
                            Foundation includes one-off setup costs (data governance, infrastructure readiness, tool procurement) that do not recur in later phases.
                          </p>
                        )}
                      </div>
                    );
                  });
                })()}
                <div className="border-t border-white/8 pt-3 flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">Total (18-month envelope)</p>
                  <p className="text-base font-bold text-amber-400">£{totalCostLow}k–£{totalCostHigh}k</p>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {liveCostEnvelope?.caveat ?? "Indicative order-of-magnitude estimates. Excludes internal headcount, change management, and vendor licensing. Requires Finance sign-off before Phase 2 commitment."}
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
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                {liveRisks && liveRisks.length > 0 ? `${liveRisks.length} Regulatory Risk${liveRisks.length > 1 ? "s" : ""} Identified` : "Top 3 Delivery Risks"}
              </p>
              {liveRisks && liveRisks.length > 0 && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">Rule-based</span>}
              {strategyData?.provenanceJson && (
                <button onClick={() => { setProvenanceTarget("risks"); setProvenanceOpen(true); }} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" />Sources
                </button>
              )}
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
                    <p className="text-[10px] text-muted-foreground">Basis: <strong className="text-foreground">{r.dependency}</strong></p>
                    {r.sources && r.sources.length > 0 && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">Sources: {r.sources.slice(0, 2).join(" · ")}</p>
                    )}
                  </div>
                );
              })}
            </div>
            {hasRegFlag && (
              <p className="text-[10px] text-amber-400/70 mt-4 leading-relaxed border-t border-red-500/10 pt-3">
                <strong className="text-amber-400">Employment Rights Act 2025 (ERA 2025):</strong> One or more selected initiatives involve automated decision-making in employment processes. Under ERA 2025, workers have the right to request a human review of any AI-assisted employment decision. Ensure all flagged initiatives include a human-review override mechanism and are documented in your AI Register before deployment.
              </p>
            )}
          </div>
        </div>

        {/* C1 — TCO Expansion */}
        {valueEnvelopeQ.data?.tco && (() => {
          const tco = valueEnvelopeQ.data!.tco;
          const fmt = (n: number) => `£${Math.round(n / 1000)}k`;
          const rows = [
            { label: "Implementation",    low: tco.implementation_gbp.low,    high: tco.implementation_gbp.high,    color: "#FBBF24" },
            { label: "Change Management", low: tco.change_management_gbp.low,  high: tco.change_management_gbp.high, color: "#FB923C" },
            { label: "Training",          low: tco.training_gbp.low,           high: tco.training_gbp.high,          color: "#60A5FA" },
            { label: "Ongoing (annual)",  low: tco.ongoing_annual_gbp.low,     high: tco.ongoing_annual_gbp.high,    color: "#A78BFA" },
          ];
          return (
            <div className="rounded-xl border border-amber-500/15 bg-amber-500/4 p-5 mt-5">
              <div className="flex items-center gap-2 mb-4">
                <PoundSterling className="w-4 h-4 text-amber-400" />
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Total Cost of Ownership (TCO)</p>
                <span className="ml-auto text-[10px] text-muted-foreground">3-year horizon</span>
              </div>
              <div className="space-y-2">
                {rows.map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{row.label}</p>
                    <p className="text-xs font-semibold" style={{ color: row.color }}>{fmt(row.low)}–{fmt(row.high)}</p>
                  </div>
                ))}
                <div className="border-t border-white/8 pt-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">Total 3-Year TCO</p>
                  <p className="text-sm font-bold text-amber-400">{fmt(tco.total_3yr_gbp.low)}–{fmt(tco.total_3yr_gbp.high)}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
                Includes implementation, change management (12–15%), training (£200–400 per HR FTE), and ongoing maintenance (18–20% per year). Excludes internal headcount costs.
              </p>
            </div>
          );
        })()}

        {/* Dependencies — C1: collapsed by default */}
        <div className="rounded-xl border border-white/8 bg-white/2 p-5 mt-5">
          <button
            onClick={() => setCrossFuncCollapsed(c => !c)}
            className="w-full flex items-center gap-2"
            aria-expanded={!crossFuncCollapsed}
          >
            <Link2 className="w-4 h-4 text-muted-foreground" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1 text-left">Cross-Functional Dependencies</p>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>{crossFuncCollapsed ? "See dependencies" : "Hide"}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${crossFuncCollapsed ? "" : "rotate-180"}`} />
            </div>
          </button>
          {!crossFuncCollapsed && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 animate-in slide-in-from-top-2 duration-200">
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
          )}
        </div>
        {/* D3 — Delivery Confidence Panel */}
        {(() => {
          const conf = structuredInputs?.solution_delivery_confidence as number | undefined;
          const opt = conf !== undefined ? SOLUTION_DELIVERY_OPTIONS.find(o => o.value === conf) : undefined;
          if (!opt || conf === undefined) return null;
          const confNum = conf;
          const pct = ((confNum - 1) / 4) * 100;
          const color = confNum >= 4 ? "#22C55E" : confNum === 3 ? "#F59E0B" : "#EF4444";
          return (
            <div className="mt-6 rounded-xl border border-white/8 bg-white/2 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-md bg-blue-500/15 flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Solution Delivery Confidence</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                    <span className="text-xs font-mono text-muted-foreground">{confNum}/5</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{opt.description}</p>
                </div>
              </div>
              {confNum <= 2 && (
                <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                  <p className="text-xs text-amber-300">
                    <strong>Engine impact:</strong> Phase durations have been extended by 20% and change management costs increased by 5% to reflect your delivery confidence rating.
                  </p>
                </div>
              )}
            </div>
          );
        })()}
        {/* E1/E2 — UK Regulatory Readiness */}
        {(() => {
          const fwIds = structuredInputs?.uk_regulatory_frameworks as string[] | undefined;
          if (!fwIds || fwIds.length === 0 || fwIds.includes("none")) return null;
          const fws = UK_REGULATORY_FRAMEWORKS.filter(fw => fwIds.includes(fw.id));
          if (fws.length === 0) return null;
          const highRisk = fws.filter(fw => fw.risk === "high");
          return (
            <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-md bg-amber-500/15 flex items-center justify-center">
                  <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">UK Regulatory Readiness</p>
                  <p className="text-[10px] text-muted-foreground">{fws.length} framework{fws.length !== 1 ? "s" : ""} identified · {highRisk.length} high-risk</p>
                </div>
              </div>
              <div className="space-y-2">
                {fws.map(fw => (
                  <div key={fw.id} className="rounded-lg border border-white/8 bg-white/2 p-3">
                    <button
                      onClick={() => setRegDescCollapsed(s => ({ ...s, [fw.id]: !s[fw.id] }))}
                      className="w-full flex items-start gap-2"
                      aria-expanded={!regDescCollapsed[fw.id]}
                    >
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide flex-shrink-0 mt-0.5 ${
                        fw.risk === "high"   ? "bg-red-500/20 text-red-400" :
                        fw.risk === "medium" ? "bg-amber-500/20 text-amber-400" :
                        "bg-white/10 text-muted-foreground"
                      }`}>{fw.risk}</span>
                      <div className="flex-1 text-left">
                        <p className="text-xs font-semibold text-foreground">{fw.label}</p>
                      </div>
                      <ChevronDown className={`w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5 transition-transform ${regDescCollapsed[fw.id] !== false ? "" : "rotate-180"}`} />
                    </button>
                    {regDescCollapsed[fw.id] === false && (
                      <p className="text-[10px] text-muted-foreground mt-1.5 ml-8 leading-relaxed animate-in slide-in-from-top-1 duration-200">{fw.description}</p>
                    )}
                  </div>
                ))}
              </div>
              {highRisk.length > 0 && (
                <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                  <p className="text-xs text-red-300">
                    <strong>Action required:</strong> {highRisk.length} high-risk framework{highRisk.length !== 1 ? "s" : ""} identified. Engage Legal / Compliance and conduct a Data Protection Impact Assessment (DPIA) before deploying AI tools in affected HR processes.
                  </p>
                </div>
              )}
            </div>
          );
        })()}
      </section>
      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5 — VALUE (ROI envelope + per-initiative breakdown)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="value" className="mt-10">
        <SectionDivider
          num="5"
          color="#34D399"
          eyebrow="Section 5 — Value"
          title="What This Strategy Is Worth"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        {valueEnvelopeQ.isLoading && valueInitIds.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-1 py-4">
            <Activity className="w-4 h-4 animate-pulse" />
            Calculating value envelope…
          </div>
        )}
        {!valueEnvelopeQ.data && !valueEnvelopeQ.isLoading && selectedInitiativeIds.size === 0 && (
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/4 px-6 py-10 text-center">
            <TrendingUp className="w-8 h-8 text-emerald-400/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No initiatives selected yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">Select initiatives in Section 3 (Plan) to calculate your value envelope, ROI scenarios, and reinvestment plan.</p>
            <button
              onClick={() => document.getElementById("plan")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="mt-4 text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
            >
              Go to Section 3 →
            </button>
          </div>
        )}
        {valueEnvelopeQ.data && (() => {
          const ve = valueEnvelopeQ.data;
          const fmt = (n: number) => n < 0 ? `-£${Math.abs(n).toLocaleString()}` : `£${n.toLocaleString()}`;
          const hasQuantified = ve.total_quantified_value_gbp.high > 0;
          return (
            <div className="space-y-5">
              {/* KPI row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Gross Value (High)</div>
                  <div className="text-xl font-bold text-emerald-400">{hasQuantified ? fmt(ve.total_quantified_value_gbp.high) : "—"}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Low: {hasQuantified ? fmt(ve.total_quantified_value_gbp.low) : "—"}</div>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Net Value (High)</div>
                  <div className={`text-xl font-bold ${ve.net_value_gbp.high >= 0 ? "text-emerald-400" : "text-red-400"}`}>{hasQuantified ? fmt(ve.net_value_gbp.high) : "—"}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Low: {hasQuantified ? fmt(ve.net_value_gbp.low) : "—"}</div>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Payback Period</div>
                  <div className="text-xl font-bold text-amber-400">
                    {ve.payback_period_months ? (
                      ve.payback_period_months.low > 120
                        ? `>${Math.round(ve.payback_period_months.low / 12)}yr`
                        : `${ve.payback_period_months.low}–${ve.payback_period_months.high}mo`
                    ) : "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {ve.payback_period_months && ve.payback_period_months.low > 120
                      ? "Beyond 3-yr horizon — see note below"
                      : "Months to breakeven"}
                  </div>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Qualitative Value</div>
                  <div className="text-xl font-bold text-violet-400">{ve.qualitative_summary.capability_uplift_count + ve.qualitative_summary.risk_avoidance_count + ve.qualitative_summary.strategic_count}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Initiatives (non-monetised)</div>
                </div>
              </div>

              {/* ── ROI Bar Chart ──────────────────────────────────────── */}
              {hasQuantified && (() => {
                // Build bar chart data: gross value (high), net value (high), and cost
                const grossHigh = ve.total_quantified_value_gbp.high;
                const grossLow  = ve.total_quantified_value_gbp.low;
                const netHigh   = ve.net_value_gbp.high;
                const netLow    = ve.net_value_gbp.low;
                const costHigh  = ve.tco?.total_3yr_gbp?.high ?? (grossHigh - netHigh);
                const costLow   = ve.tco?.total_3yr_gbp?.low  ?? (grossLow  - netLow);
                const fmtK = (n: number) => {
                  const abs = Math.abs(n);
                  if (abs >= 1_000_000) return `${n < 0 ? "-" : ""}£${(abs / 1_000_000).toFixed(1)}M`;
                  if (abs >= 1_000)    return `${n < 0 ? "-" : ""}£${Math.round(abs / 1_000)}k`;
                  return `${n < 0 ? "-" : ""}£${abs}`;
                };
                // Per-initiative bar data (quantified only, sorted desc by high)
                const initiativeData = ve.by_initiative
                  .filter(i => i.quantified_value_gbp && i.quantified_value_gbp.high > 0)
                  .sort((a, b) => (b.quantified_value_gbp?.high ?? 0) - (a.quantified_value_gbp?.high ?? 0))
                  .slice(0, 12)
                  .map(i => ({
                    name: i.display_name.length > 22 ? i.display_name.slice(0, 20) + "…" : i.display_name,
                    fullName: i.display_name,
                    high: i.quantified_value_gbp!.high,
                    low:  i.quantified_value_gbp!.low,
                    type: i.value_type,
                  }));
                const typeColor: Record<string, string> = {
                  cost_savings:       "#4ADE80",
                  productivity_gain:  "#60A5FA",
                  risk_avoidance:     "#F87171",
                  capability_uplift:  "#A78BFA",
                  strategic:          "#FBBF24",
                };
                // Summary bar chart data
                const summaryData = [
                  { name: "Gross Value",  high: grossHigh, low: grossLow,  fill: "#4ADE80" },
                  { name: "Total Cost",   high: costHigh,  low: costLow,   fill: "#F87171" },
                  { name: "Net Value",    high: netHigh,   low: netLow,    fill: netHigh >= 0 ? "#60A5FA" : "#F87171" },
                ];
                return (
                  <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Value Summary — 3-Year Horizon</p>
                    </div>
                    {/* Summary: Gross / Cost / Net */}
                    <div className="mb-6">
                      <p className="text-[10px] text-muted-foreground mb-3">High estimate shown. Hover for low estimate.</p>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={summaryData} barCategoryGap="35%" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: "#94A3B8", fontSize: 11 }}
                            axisLine={false} tickLine={false}
                          />
                          <YAxis
                            tickFormatter={fmtK}
                            tick={{ fill: "#94A3B8", fontSize: 10 }}
                            axisLine={false} tickLine={false} width={52}
                          />
                          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                          <Tooltip
                            cursor={{ fill: "rgba(255,255,255,0.04)" }}
                            contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                            formatter={(value: number, _name: string, props: { payload?: { name: string; low: number } }) => [
                              <span key="v">
                                <span style={{ color: props.payload?.name === "Total Cost" ? "#F87171" : "#4ADE80" }}>{fmtK(value)}</span>
                                <span style={{ color: "#94A3B8", marginLeft: 8, fontSize: 10 }}>low: {fmtK(props.payload?.low ?? 0)}</span>
                              </span>,
                              props.payload?.name ?? "",
                            ]}
                          />
                          <Bar dataKey="high" radius={[4, 4, 0, 0]}>
                            {summaryData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Per-initiative horizontal bars */}
                    {initiativeData.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Value by Initiative (High Estimate)</p>
                        <ResponsiveContainer width="100%" height={Math.max(180, initiativeData.length * 32)}>
                          <BarChart
                            data={initiativeData}
                            layout="vertical"
                            barCategoryGap="20%"
                            margin={{ top: 0, right: 60, left: 8, bottom: 0 }}
                          >
                            <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.06)" />
                            <XAxis
                              type="number"
                              tickFormatter={fmtK}
                              tick={{ fill: "#94A3B8", fontSize: 10 }}
                              axisLine={false} tickLine={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={140}
                              tick={{ fill: "#CBD5E1", fontSize: 11 }}
                              axisLine={false} tickLine={false}
                            />
                            <Tooltip
                              cursor={{ fill: "rgba(255,255,255,0.04)" }}
                              contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                              formatter={(value: number, _name: string, props: { payload?: { fullName: string; low: number; type: string } }) => [
                                <span key="v">
                                  <span style={{ color: typeColor[props.payload?.type ?? ""] ?? "#4ADE80" }}>{fmtK(value)}</span>
                                  <span style={{ color: "#94A3B8", marginLeft: 8, fontSize: 10 }}>low: {fmtK(props.payload?.low ?? 0)}</span>
                                </span>,
                                props.payload?.fullName ?? "",
                              ]}
                            />
                            <Bar dataKey="high" radius={[0, 4, 4, 0]}>
                              {initiativeData.map((entry, i) => (
                                <Cell key={i} fill={typeColor[entry.type] ?? "#4ADE80"} fillOpacity={0.8} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        {/* Legend */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                          {Object.entries(typeColor).map(([type, color]) => {
                            const hasType = initiativeData.some(d => d.type === type);
                            if (!hasType) return null;
                            return (
                              <div key={type} className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                                <span className="text-[10px] text-muted-foreground capitalize">{type.replace(/_/g, " ")}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Payback callout */}
                    {ve.payback_period_months && (
                      <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 flex items-center gap-3">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <span className="text-xs font-semibold text-amber-300">Payback Period: </span>
                          <span className="text-xs text-amber-200/80">
                            {ve.payback_period_months.low > 120
                              ? `Beyond 3-year horizon (>${Math.round(ve.payback_period_months.low / 12)} yrs) — value realises in years 4–7`
                              : `${ve.payback_period_months.low}–${ve.payback_period_months.high} months to breakeven`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* A4: Value concentration risk banner */}
              {(() => {
                const totalHigh = ve.total_quantified_value_gbp.high;
                if (totalHigh <= 0) return null;
                const sorted = [...ve.by_initiative]
                  .filter(i => i.quantified_value_gbp && i.quantified_value_gbp.high > 0)
                  .sort((a, b) => (b.quantified_value_gbp?.high ?? 0) - (a.quantified_value_gbp?.high ?? 0));
                if (sorted.length === 0) return null;
                const top = sorted[0];
                const topPct = Math.round((top.quantified_value_gbp!.high / totalHigh) * 100);
                if (topPct < 60) return null;
                return (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/6 p-4 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-300 mb-1">Value concentration risk</p>
                      <p className="text-[11px] text-amber-300/80 leading-relaxed mb-2">
                        <strong>{topPct}%</strong> of this strategy's quantified value depends on a single initiative:{" "}
                        <strong>{top.display_name}</strong>. If this initiative is delayed or under-delivers, the strategy's measurable case weakens significantly.
                      </p>
                      <p className="text-[10px] text-amber-300/60 leading-relaxed">
                        Mitigation: review value assumptions against your operational baseline · consider additional value-generating initiatives to diversify · use phased value recognition rather than full Year-1 attribution.
                      </p>
                    </div>
                  </div>
                );
              })()}
              {/* Per-initiative breakdown — C1: collapsed by default */}
              <div className="rounded-xl border border-white/8 bg-white/2 overflow-hidden">
                <button
                  onClick={() => setPerInitCollapsed(c => !c)}
                  className="w-full px-5 py-3 border-b border-white/8 flex items-center justify-between"
                  aria-expanded={!perInitCollapsed}
                >
                  <span className="text-sm font-medium">Per-Initiative Value Breakdown</span>
                  <div className="flex items-center gap-2">
                    <span
                      role="button"
                      tabIndex={0}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setValueProvenanceOpen(true); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setValueProvenanceOpen(true); } }}
                    >
                      <Info className="w-3 h-3" /> Methodology
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${perInitCollapsed ? "" : "rotate-180"}`} />
                  </div>
                </button>
                {!perInitCollapsed && (
                <div className="divide-y divide-white/5 animate-in slide-in-from-top-2 duration-200">
                  {ve.by_initiative.map(item => (
                    <div key={item.initiative_id} className="px-5 py-3 flex items-start gap-3 hover:bg-white/2 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{item.display_name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            item.value_type === "cost_savings" ? "bg-emerald-500/15 text-emerald-400" :
                            item.value_type === "productivity_gain" ? "bg-blue-500/15 text-blue-400" :
                            item.value_type === "risk_avoidance" ? "bg-red-500/15 text-red-400" :
                            item.value_type === "capability_uplift" ? "bg-violet-500/15 text-violet-400" :
                            "bg-slate-500/15 text-slate-400"
                          }`}>{item.value_type.replace(/_/g, " ")}</span>
                          {item.uses_sector_default && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">sector default</span>
                          )}
                        </div>
                        {item.quantified_value_gbp ? (
                          <div className="text-[11px] text-muted-foreground mt-1">{item.monetisation_breakdown}</div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground mt-1">
                            {item.qualitative_value.slice(0, 2).join(" · ")}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {item.quantified_value_gbp ? (
                          <>
                            <div className="text-sm font-semibold text-emerald-400">£{item.quantified_value_gbp.high.toLocaleString()}</div>
                            <div className="text-[10px] text-muted-foreground">low £{item.quantified_value_gbp.low.toLocaleString()}</div>
                          </>
                        ) : (
                          <div className="text-[11px] text-muted-foreground italic">Qualitative</div>
                        )}
                      </div>
                      <button
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => { setValueProvenanceInitId(item.initiative_id); setValueProvenanceOpen(true); }}
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                )}
              </div>

              {/* Qualitative bullets — C1: collapsed by default */}
              {ve.qualitative_summary.bullet_points.length > 0 && (
                <div className="rounded-xl border border-white/8 bg-white/2 px-5 py-4">
                  <button
                    onClick={() => setQualBulletsCollapsed(c => !c)}
                    className="w-full flex items-center justify-between"
                    aria-expanded={!qualBulletsCollapsed}
                  >
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Qualitative Value Highlights</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>{qualBulletsCollapsed ? `See ${ve.qualitative_summary.bullet_points.length} outcomes` : "Hide"}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${qualBulletsCollapsed ? "" : "rotate-180"}`} />
                    </div>
                  </button>
                  {!qualBulletsCollapsed && (
                    <ul className="space-y-1.5 mt-3 animate-in slide-in-from-top-2 duration-200">
                      {ve.qualitative_summary.bullet_points.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* C2 — Three-Tier ROI */}
              {ve.tiered_value && (() => {
                const tv = ve.tiered_value;
                const fmt = (n: number) => n === 0 ? "—" : `£${Math.round(n / 1000)}k`;
                const tiers = [
                  { label: "Efficiency",    desc: "Time savings, cost reduction, headcount avoidance", low: tv.efficiency.low,    high: tv.efficiency.high,    color: "#4ADE80" },
                  { label: "Effectiveness", desc: "Quality of hire, attrition reduction, engagement",  low: tv.effectiveness.low, high: tv.effectiveness.high, color: "#60A5FA" },
                  { label: "Strategic",     desc: "Risk avoidance, capability uplift, compliance",     low: tv.strategic.low,     high: tv.strategic.high,     color: "#A78BFA" },
                ];
                const totalHigh = tv.efficiency.high + tv.effectiveness.high + tv.strategic.high;
                return (
                  <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <LayoutGrid className="w-4 h-4 text-emerald-400" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Three-Tier Value Analysis</p>
                    </div>
                    <div className="space-y-3">
                      {tiers.map(tier => {
                        const pct = totalHigh > 0 ? Math.round((tier.high / totalHigh) * 100) : 0;
                        return (
                          <div key={tier.label}>
                            <div className="flex items-center justify-between mb-1">
                              <div>
                                <span className="text-xs font-semibold" style={{ color: tier.color }}>{tier.label}</span>
                                <span className="text-[10px] text-muted-foreground ml-2">{tier.desc}</span>
                              </div>
                              <span className="text-xs font-semibold text-foreground">{fmt(tier.low)}–{fmt(tier.high)}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: tier.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* C3 — NPV / IRR Financial Model */}
              {ve.financial_model && (() => {
                const fm = ve.financial_model;
                const fmt = (n: number) => n < 0 ? `-£${Math.abs(Math.round(n / 1000))}k` : `£${Math.round(n / 1000)}k`;
                return (
                  <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Financial Model ({fm.horizon_years}-Year DCF @ {fm.discount_rate_pct}%)</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border border-white/8 bg-white/2 px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Net Present Value</p>
                        <p className={`text-xl font-bold ${fm.npv_gbp.high >= 0 ? "text-blue-400" : "text-red-400"}`}>{fmt(fm.npv_gbp.high)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Low: {fmt(fm.npv_gbp.low)}</p>
                      </div>
                      <div className="rounded-lg border border-white/8 bg-white/2 px-4 py-3">
                        {(fm as any).irr_suppressed ? (
                          // CFO Fix 4: IRR unreliable at this scale — show payback instead
                          <>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Payback Period</p>
                            <p className="text-xl font-bold text-violet-400">
                              {ve.payback_period_months
                                ? ve.payback_period_months.low === 0
                                  ? '<1 mo'
                                  : `${ve.payback_period_months.low}–${ve.payback_period_months.high} mo`
                                : '—'}
                            </p>
                            <p className="text-[10px] text-amber-400/80 mt-0.5">IRR suppressed — use NPV &amp; payback</p>
                          </>
                        ) : (
                          <>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Internal Rate of Return</p>
                            {fm.irr_pct ? (
                              (() => {
                                const fmtIrr = (v: number) => !isFinite(v) || v < 0 ? 'N/A' : `${v.toFixed(1)}%`;
                                return (
                                  <>
                                    <p className="text-xl font-bold text-violet-400">{fmtIrr(fm.irr_pct.high)}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Low: {fmtIrr(fm.irr_pct.low)}</p>
                                  </>
                                );
                              })()
                            ) : (
                              <p className="text-xl font-bold text-muted-foreground">—</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
                      DCF model discounts projected annual cashflows at {fm.discount_rate_pct}% over {fm.horizon_years} years. NPV &gt; 0 indicates the strategy creates value above the cost of capital. IRR is the break-even discount rate.
                    </p>
                    {/* CFO Fix 4: IRR suppressed banner or high-IRR warning */}
                    {(fm as any).irr_suppressed ? (
                      <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2.5 flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-300/90 leading-relaxed">
                          <strong className="text-amber-300">IRR not shown — unreliable at this investment scale.</strong>{" "}
                          When annual value significantly exceeds implementation cost, IRR becomes mathematically extreme and loses meaning as a decision metric.
                          Use <strong className="text-amber-300">NPV and payback period</strong> as the primary financial metrics for board presentation.
                        </p>
                      </div>
                    ) : (
                      fm.irr_pct && fm.irr_pct.high > 40 && isFinite(fm.irr_pct.high) && (
                        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2.5 flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-300/90 leading-relaxed">
                            <strong className="text-amber-300">Indicative figure — sanity check before relying.</strong>{" "}
                            IRR of {fm.irr_pct.high.toFixed(1)}% is materially higher than typical transformation programme returns (15–40%).
                            Possible reasons: value concentration in a single initiative, optimistic improvement assumptions, or implementation costs understated.
                            Recommended: review with Finance before relying on this figure for capital decisions.
                          </p>
                        </div>
                      )
                    )}
                  </div>
                );
              })()}

              {/* C4 — Three-Scenario Analysis */}
              {ve.scenario_analysis && (() => {
                const sa = ve.scenario_analysis;
                const fmt = (n: number) => n < 0 ? `-£${Math.abs(Math.round(n / 1000))}k` : `£${Math.round(n / 1000)}k`;
                const scenarios = [
                  { key: "pessimistic", label: "Pessimistic", desc: "60% of low estimate, 110% of high cost", data: sa.pessimistic, color: "#F87171" },
                  { key: "base",        label: "Base Case",   desc: "Midpoint of low/high estimates",        data: sa.base,        color: "#FBBF24" },
                  { key: "optimistic",  label: "Optimistic",  desc: "120% of high estimate, 90% of low cost", data: sa.optimistic,  color: "#4ADE80" },
                ] as const;
                return (
                  <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="w-4 h-4 text-amber-400" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Three-Scenario Analysis</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {scenarios.map(s => (
                        <div key={s.key} className="rounded-lg border border-white/8 bg-white/2 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: s.color }}>{s.label}</p>
                          <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">{s.desc}</p>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Value</span>
                              <span className="font-semibold" style={{ color: s.color }}>{fmt(s.data.value_gbp)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Net</span>
                              <span className={`font-semibold ${s.data.net_gbp >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(s.data.net_gbp)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">ROI</span>
                              <span className={`font-semibold ${s.data.roi_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {s.data.roi_pct >= 500 ? ">500%" : `${s.data.roi_pct}%`}
                              </span>
                            </div>
                            {s.data.roi_pct >= 500 && (
                              <p className="text-[10px] text-amber-400/80 mt-1.5 leading-snug">⚠️ ROI capped at 500% for display. Use NPV for board presentation.</p>
                            )}
                            {s.data.roi_pct > 200 && s.data.roi_pct < 500 && (
                              <p className="text-[10px] text-amber-400/80 mt-1.5 leading-snug">⚠️ High ROI — reflects 3-yr compounding. Validate with Finance before board presentation.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Caveat */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-[11px] text-amber-300/80">
                <strong className="text-amber-300">Caveat:</strong> {ve.caveat}
                {ve.payback_period_months && ve.payback_period_months.low > 120 && (
                  <p className="mt-2"><strong className="text-amber-300">Payback note:</strong> The payback period extends beyond the 3-year modelling horizon. This is expected for transformative programmes where capability and infrastructure investment precedes value realisation. The NPV and scenario analysis above reflect the 3-year window only; full value typically materialises in years 4–7 as AI-enabled processes compound.</p>
                )}
              </div>

              {/* C1 — Reinvestment Plan (data-driven from calculateValueEnvelope) */}
              {ve.reinvestment_plan && (() => {
                const rp = ve.reinvestment_plan as {
                  case: string; recommended: boolean; headline: string; narrative: string;
                  suggested_reinvestment_gbp: number | null; phase2_focus_areas: string[];
                };
                const isPositive = rp.recommended;
                const borderColor = isPositive ? "border-emerald-500/20" : "border-amber-500/20";
                const bgColor = isPositive ? "bg-emerald-500/5" : "bg-amber-500/5";
                const iconColor = isPositive ? "text-emerald-400" : "text-amber-400";
                const caseLabel = rp.case === "both_positive" ? "Strong return" : rp.case === "straddles_zero" ? "Positive outlook" : "Review scope";
                return (
                  <div className={`rounded-xl border ${borderColor} ${bgColor} px-5 py-4`}>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className={`w-4 h-4 ${iconColor}`} />
                      <p className={`text-[10px] font-bold ${iconColor} uppercase tracking-widest`}>Reinvestment Plan</p>
                      <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border ${isPositive ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-amber-500/30 text-amber-400 bg-amber-500/10"}`}>
                        {caseLabel}
                      </span>
                    </div>
                    <p className={`text-sm font-medium mb-2 ${iconColor}`}>{rp.headline}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{rp.narrative}</p>
                    {rp.suggested_reinvestment_gbp && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Suggested reinvestment:</span>
                        <span className={`text-sm font-bold ${iconColor}`}>£{rp.suggested_reinvestment_gbp.toLocaleString()}</span>
                      </div>
                    )}
                    {rp.phase2_focus_areas && rp.phase2_focus_areas.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">Phase 2 focus areas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {rp.phase2_focus_areas.map((area: string) => (
                            <span key={area} className={`text-[10px] px-2 py-0.5 rounded-full border ${isPositive ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10" : "border-amber-500/30 text-amber-300 bg-amber-500/10"}`}>
                              {area.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* C2 — CEO Sponsorship Banner */}
              {ve.ceo_sponsorship_required && (
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4 text-purple-300" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">CEO Sponsorship Recommended</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        The scale of this strategy — spanning multiple capability domains and requiring significant cross-functional change — indicates that <strong className="text-foreground">CEO-level sponsorship is a critical success factor</strong>. Programmes of this scope have a materially higher success rate when the CEO is an active sponsor rather than a passive approver.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Recommended action: brief the CEO with a one-page summary of the business case and request formal sponsorship before Phase 1 kick-off.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </section>

      {/* Value Provenance Modal */}
      {valueProvenanceOpen && (
        <Dialog open={valueProvenanceOpen} onOpenChange={setValueProvenanceOpen}>
          <DialogContent className="max-w-lg bg-[#0F1117] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">
                {valueProvenanceInitId
                  ? `Value Methodology — ${valueEnvelopeQ.data?.by_initiative.find(i => i.initiative_id === valueProvenanceInitId)?.display_name ?? valueProvenanceInitId}`
                  : "Value Envelope — Methodology"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm text-muted-foreground">
              {valueProvenanceInitId ? (() => {
                const item = valueEnvelopeQ.data?.by_initiative.find(i => i.initiative_id === valueProvenanceInitId);
                if (!item) return <p>No data available.</p>;
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Value Type</div>
                      <div className="text-foreground capitalize">{item.value_type.replace(/_/g, " ")}</div>
                    </div>
                    {item.quantified_value_gbp && (
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Monetisation Breakdown</div>
                        <div className="text-foreground text-xs font-mono bg-white/5 rounded px-3 py-2">{item.monetisation_breakdown}</div>
                      </div>
                    )}
                    {item.qualitative_value.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Qualitative Value</div>
                        <ul className="space-y-1">
                          {item.qualitative_value.map((q, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                              {q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.uses_sector_default && (
                      <div className="rounded bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-300">
                        One or more baseline inputs used a sector default value. Provide your actual operational baseline in the strategy assessment for a more accurate estimate.
                      </div>
                    )}
                    {item.sources.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Sources</div>
                        <ul className="space-y-0.5 text-xs">
                          {item.sources.map((s, i) => <li key={i} className="text-blue-400">{s}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="space-y-3">
                  <p>The value envelope is calculated by applying sector-benchmarked improvement percentages to your operational baseline inputs (hires per year, cost per hire, time to fill, attrition rate, L&D spend, HR cost per FTE).</p>
                  <p>Where you have not provided a baseline value, a sector default is used and flagged with an amber "sector default" badge.</p>
                  <p>Net value subtracts the indicative implementation cost range from the gross value range. Payback period is calculated as total cost ÷ annualised value.</p>
                  <p className="text-amber-300/80 text-xs">All figures are indicative ranges for business case development. Confirm with Finance before commitment.</p>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button size="sm" variant="outline" onClick={() => { setValueProvenanceOpen(false); setValueProvenanceInitId(null); }}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6 — Measurement Plan
      ══════════════════════════════════════════════════════════════════════ */}
      {(() => {
        const cadenceId = structuredInputs?.measurement_cadence as string | undefined;
        const cadenceOpt = cadenceId ? MEASUREMENT_CADENCE_OPTIONS.find(o => o.value === cadenceId) : undefined;
        const pilotDesign = structuredInputs?.pilot_design as { scope?: string; duration?: string; success_metrics?: string[] } | undefined;
        const hasMeasurement = cadenceOpt || pilotDesign;
        if (!hasMeasurement) return null;
        const pilotScopeOpt  = pilotDesign?.scope     ? PILOT_SCOPE_OPTIONS.find(o => o.value === pilotDesign.scope) : undefined;
        const pilotDurOpt    = pilotDesign?.duration   ? PILOT_DURATION_OPTIONS.find(o => o.value === pilotDesign.duration) : undefined;
        const pilotMetricOpts = (pilotDesign?.success_metrics ?? []).map(id => PILOT_SUCCESS_METRICS.find(m => m.id === id)).filter(Boolean) as typeof PILOT_SUCCESS_METRICS;
        return (
          <section id="measurement" className="mb-6">
            <div className="rounded-2xl border border-white/10 bg-white/2 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center">
                  <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">Section 6 — Measurement Plan</p>
                  <h2 className="text-lg font-bold text-foreground">How we will measure progress</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {cadenceOpt && (
                  <div className="rounded-xl border border-white/8 bg-white/2 p-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Review Cadence</p>
                    <p className="text-sm font-semibold text-foreground">{cadenceOpt.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      KPI tracking and strategy re-assessment will follow this rhythm. Schedule the first review before the end of the Foundation phase.
                    </p>
                  </div>
                )}
                {pilotScopeOpt && (
                  <div className="rounded-xl border border-white/8 bg-white/2 p-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Pilot Scope</p>
                    <p className="text-sm font-semibold text-foreground">{pilotScopeOpt.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{pilotScopeOpt.description}</p>
                  </div>
                )}
                {pilotDurOpt && (
                  <div className="rounded-xl border border-white/8 bg-white/2 p-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Pilot Duration</p>
                    <p className="text-sm font-semibold text-foreground">{pilotDurOpt.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Run a structured pilot before full rollout. Define go/no-go criteria at the midpoint.
                    </p>
                  </div>
                )}
                {pilotMetricOpts.length > 0 && (
                  <div className="rounded-xl border border-white/8 bg-white/2 p-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Pilot Success Metrics</p>
                    <div className="space-y-1.5">
                      {pilotMetricOpts.map(m => (
                        <div key={m.id} className="flex items-center gap-2">
                          <span className={`text-[9px] px-1 py-0.5 rounded font-bold uppercase tracking-wide flex-shrink-0 ${
                            m.tier === "efficiency"    ? "bg-green-500/20 text-green-400" :
                            m.tier === "effectiveness" ? "bg-blue-500/20 text-blue-400" :
                            "bg-purple-500/20 text-purple-400"
                          }`}>{m.tier === "efficiency" ? "Eff" : m.tier === "effectiveness" ? "Qual" : "Strat"}</span>
                          <span className="text-xs text-foreground">{m.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })()}

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
                    { source: "McKinsey Global Survey on AI", year: "2024", use: "Sector maturity benchmarks & sub-sector norms" },
                    { source: "Deloitte AI Maturity Index", year: "2023", use: "Maturity level definitions & org-type modifiers" },
                    { source: "CIPD People Profession Survey", year: "2024", use: "HR capability benchmarks & public sector norms" },
                    { source: "BCG AI at Work", year: "2023", use: "Workforce readiness & PE-backed org benchmarks" },
                    { source: "MIT Sloan Management Review", year: "2023", use: "AI culture indicators & SME benchmarks" },
                    { source: "EU AI Act (Regulation 2024/1689)", year: "2024", use: "Regulatory risk classification" },
                    { source: "Gartner HR Technology Survey", year: "2024", use: "Technology adoption benchmarks by org size" },
                    { source: "PwC AI Readiness Survey", year: "2024", use: "Data infrastructure benchmarks by sector" },
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

      {/* ── Provenance modal ── */}
      <ProvenanceModal
        open={provenanceOpen}
        onClose={() => setProvenanceOpen(false)}
        target={provenanceTarget}
        provenanceJson={strategyData?.provenanceJson ?? null}
        selectedInits={selectedInits}
        liveRisks={liveRisks}
      />
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

// ── ProvenanceModal ───────────────────────────────────────────────────────────
interface ProvenanceModalProps {
  open: boolean;
  onClose: () => void;
  target: "vision" | "wontDo" | "costs" | "risks";
  provenanceJson: string | null;
  selectedInits: any[];
  liveRisks: Array<{
    ruleId: string; displayName: string; riskStatement: string;
    severity: "very_high" | "high" | "medium" | "low";
    recommendedAction: string; regulatoryBasis: string[]; sources: string[];
  }> | null;
}

const PROVENANCE_TITLES: Record<string, string> = {
  vision: "Vision Statement — How It Was Generated",
  wontDo: "What We Won't Do — How It Was Generated",
  costs: "Cost Envelope — Sources & Methodology",
  risks: "Delivery Risks — Rule Basis & Sources",
};

function ProvenanceModal({ open, onClose, target, provenanceJson, selectedInits, liveRisks }: ProvenanceModalProps) {
  const provenance = useMemo(() => {
    if (!provenanceJson) return null;
    try { return JSON.parse(provenanceJson) as {
      vision?: { method: string; libraryVersion: string; generatedAt: number };
      wontDo?: { method: string; libraryVersion: string; generatedAt: number };
      costs?: Record<string, { sourceId: string; baseRange: [number, number]; multipliers: string[]; libraryVersion: string }>;
      risks?: Record<string, { ruleId: string; triggeredBy: string; libraryVersion: string }>;
    }; } catch { return null; }
  }, [provenanceJson]);

  const METHOD_LABELS: Record<string, string> = {
    llm_with_quality_gate: "LLM with quality gate",
    static: "Static content library",
    rule_based: "Rule-based engine",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold pr-6">{PROVENANCE_TITLES[target]}</DialogTitle>
        </DialogHeader>

        {!provenance ? (
          <p className="text-sm text-muted-foreground py-4">Provenance data not available. Save your strategy to generate provenance records.</p>
        ) : target === "vision" || target === "wontDo" ? (
          <div className="space-y-4 pt-1">
            <div className="rounded-lg border border-white/8 bg-white/2 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground mb-0.5">Generation Method</p>
                  <p className="text-xs text-muted-foreground">{METHOD_LABELS[provenance[target]?.method ?? ""] ?? provenance[target]?.method ?? "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/6">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Library Version</p>
                  <p className="text-xs font-mono text-foreground">{provenance[target]?.libraryVersion ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Generated</p>
                  <p className="text-xs text-foreground">{provenance[target]?.generatedAt ? new Date(provenance[target]!.generatedAt).toLocaleString() : "—"}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-white/8 bg-white/2 p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Quality Gate</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The {target === "vision" ? "vision statement" : "\"What We Won't Do\" list"} was generated by the AiQ Strategy Engine using a multi-pass LLM process with a quality gate that checks for forbidden phrases, required numeric commitments, and sector-specific vocabulary. Outputs failing the gate are regenerated up to 3 times before falling back to a curated template.
              </p>
            </div>
          </div>
        ) : target === "costs" ? (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Cost estimates are derived from the Content Library base ranges, adjusted by organisation size and ambition tier multipliers. All figures are indicative order-of-magnitude estimates in GBP thousands.
            </p>
            {provenance.costs && Object.entries(provenance.costs).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(provenance.costs).map(([initId, costData]) => {
                  const init = selectedInits.find((i: any) => i.id === initId || i.initiative_id === initId);
                  return (
                    <div key={initId} className="rounded-lg border border-white/8 bg-white/2 p-3">
                      <p className="text-xs font-semibold text-foreground mb-1">{init?.name ?? init?.display_name ?? initId}</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Base range</p>
                          <p className="text-xs font-mono text-foreground">£{costData.baseRange[0]}k–£{costData.baseRange[1]}k</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Multipliers</p>
                          <p className="text-xs text-foreground">{costData.multipliers.join(", ") || "none"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Source</p>
                          <p className="text-xs font-mono text-muted-foreground truncate">{costData.sourceId}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No per-initiative cost provenance available. Save your strategy after selecting initiatives.</p>
            )}
          </div>
        ) : target === "risks" ? (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Risks are identified by the AiQ Risk Rule Engine, which evaluates a rule set from the Content Library against your selected initiatives, ambition tier, and organisation size. Each rule has a regulatory basis and source citations.
            </p>
            {liveRisks && liveRisks.length > 0 ? (
              <div className="space-y-3">
                {liveRisks.map(r => (
                  <div key={r.ruleId} className="rounded-lg border border-white/8 bg-white/2 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-xs font-semibold text-foreground flex-1">{r.displayName}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        r.severity === "very_high" || r.severity === "high" ? "bg-red-500/15 text-red-400" :
                        r.severity === "medium" ? "bg-amber-500/15 text-amber-400" :
                        "bg-green-500/15 text-green-400"
                      }`}>{r.severity.replace("_", " ")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">{r.riskStatement}</p>
                    {r.regulatoryBasis.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {r.regulatoryBasis.map(b => (
                          <span key={b} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{b}</span>
                        ))}
                      </div>
                    )}
                    {r.sources.length > 0 && (
                      <p className="text-[10px] text-muted-foreground/60">Sources: {r.sources.join(" · ")}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : provenance.risks && Object.keys(provenance.risks).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(provenance.risks).map(([ruleId, riskData]) => (
                  <div key={ruleId} className="rounded-lg border border-white/8 bg-white/2 p-3">
                    <p className="text-xs font-semibold text-foreground mb-0.5">{ruleId}</p>
                    <p className="text-[10px] text-muted-foreground">Library v{riskData.libraryVersion}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No risk provenance available. Select initiatives to trigger risk rule evaluation.</p>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
