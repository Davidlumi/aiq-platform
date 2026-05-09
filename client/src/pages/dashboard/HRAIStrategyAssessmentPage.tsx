/**
 * HRAIStrategyAssessmentPage — HR AI Strategy Assessment Wizard (v3 — Block B1/B2)
 *
 * 5-step wizard:
 *   Step 1   — Business AI Aspiration (structured: outcomes, problems, risk appetite, timeline, success markers)
 *   Step 1.5 — Operational Baseline (optional metrics for ROI calculation)
 *   Step 2   — HR's Role (structured: leadership position, processes, governance principles + voice capture)
 *   Step 3   — AI-Drafted Vision & Principles (editable)
 *   Step 4   — Initiative Selection + Commit
 *
 * Migration: existing aspirationAnswersJson / hrRoleAnswersJson preserved in DB for backward compat.
 * New structuredInputsJson and operationalBaselineJson columns added (Block B1/B2 schema).
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Target,
  Users,
  Lightbulb,
  Shield,
  Zap,
  Layers,
  TrendingUp,
  ArrowRight,
  Loader2,
  Edit3,
  CheckCircle2,
  ListPlus,
  RefreshCw,
  AlertCircle,
  BarChart2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  getBusinessOutcomes,
  BUSINESS_PROBLEMS,
  RISK_APPETITE_OPTIONS,
  SUCCESS_MARKERS,
  TIMELINE_OPTIONS,
  HR_LEADERSHIP_POSITIONS,
  HR_PROCESSES,
  GOVERNANCE_PRINCIPLES,
  getGovernanceDefaults,
  getSectorBenchmarks,
  computeSectorDefaultBaseline,
  EXISTING_AI_TOOLS,
  AI_PHILOSOPHY_OPTIONS,
  EXECUTIVE_SPONSORS,
  GATEKEEPERS,
  AFFECTED_GROUPS,
  POTENTIAL_RESISTORS,
  getStakeholderDefaults,
  MEASUREMENT_CADENCE_OPTIONS,
  SOLUTION_DELIVERY_OPTIONS,
  type StructuredInputs,
  type OperationalBaseline,
  type AiPhilosophy,
  type StakeholderMap,
  type MeasurementCadence,
  UK_REGULATORY_FRAMEWORKS,
  PILOT_SCOPE_OPTIONS,
  PILOT_DURATION_OPTIONS,
  PILOT_SUCCESS_METRICS,
} from "@/../../shared/strategyInputs";

// ─── Constants ────────────────────────────────────────────────────────────────

const BUSINESS_LEVELS: Record<number, { label: string; description: string }> = {
  1: { label: "Cautious",       description: "AI used selectively in low-risk, back-office processes." },
  2: { label: "Exploratory",    description: "Piloting AI in specific workflows, building internal confidence." },
  3: { label: "Progressive",    description: "AI embedded in core HR processes; confident, critical use expected." },
  4: { label: "Ambitious",      description: "AI is a strategic differentiator; HR leads adoption across the business." },
  5: { label: "Transformative", description: "AI is central to the business model; HR professionals are AI-native." },
};

const PEOPLE_LEVELS: Record<number, { label: string; description: string }> = {
  1: { label: "Followers",     description: "HR people use AI tools as directed; compliance is the primary expectation." },
  2: { label: "Adopters",      description: "HR people learn and use AI tools in their day-to-day work." },
  3: { label: "Practitioners", description: "HR people apply AI confidently and evaluate outputs critically." },
  4: { label: "Champions",     description: "HR people advocate for AI, coach others, and contribute to governance." },
  5: { label: "Innovators",    description: "HR people design AI-enabled processes and shape the organisation's AI strategy." },
};

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

// ─── Wizard step indicator ────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  const steps = [
    { label: "Business Aspiration", icon: <Target className="w-4 h-4" /> },
    { label: "Baseline",            icon: <BarChart2 className="w-4 h-4" /> },
    { label: "Stakeholders",        icon: <Users className="w-4 h-4" /> },
    { label: "HR's Role",           icon: <Shield className="w-4 h-4" /> },
    { label: "AI Draft",            icon: <Sparkles className="w-4 h-4" /> },
    { label: "Initiatives",         icon: <ListPlus className="w-4 h-4" /> },
  ];
  return (
    <div className="flex items-start gap-0 mb-8">
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const isComplete = stepNum < current;
        const isCurrent  = stepNum === current;
        return (
          <React.Fragment key={stepNum}>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ minWidth: 56 }}>
              <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${
                isComplete
                  ? "bg-green-500 border-green-500 text-black"
                  : isCurrent
                  ? "bg-green-500/15 border-green-500 text-green-400"
                  : "bg-white/4 border-white/15 text-muted-foreground"
              }`}>
                {isComplete ? <Check className="w-4 h-4" /> : step.icon}
              </div>
              <span className={`text-[10px] font-medium text-center leading-tight ${
                isCurrent ? "text-green-400" : isComplete ? "text-foreground/60" : "text-muted-foreground/50"
              }`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mt-[18px] transition-colors ${
                stepNum < current ? "bg-green-500" : "bg-white/8"
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Chip multi-select ────────────────────────────────────────────────────────
function ChipSelect({
  options,
  selected,
  onToggle,
  maxSelect,
  color = "green",
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  maxSelect?: number;
  color?: "green" | "blue" | "purple";
}) {
  const colorMap = {
    green:  { active: "bg-green-500/20 border-green-500/50 text-green-300", inactive: "border-white/25 text-foreground/75 hover:border-white/45 hover:text-foreground" },
    blue:   { active: "bg-blue-500/20 border-blue-500/50 text-blue-300", inactive: "border-white/25 text-foreground/75 hover:border-white/45 hover:text-foreground" },
    purple: { active: "bg-purple-500/20 border-purple-500/50 text-purple-300", inactive: "border-white/25 text-foreground/75 hover:border-white/45 hover:text-foreground" },
  };
  const c = colorMap[color];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isSelected = selected.includes(opt.id);
        const isDisabled = !isSelected && maxSelect !== undefined && selected.length >= maxSelect;
        return (
          <button
            key={opt.id}
            onClick={() => !isDisabled && onToggle(opt.id)}
            disabled={isDisabled}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${
              isSelected ? c.active : isDisabled ? "border-white/6 text-muted-foreground/30 cursor-not-allowed" : c.inactive
            }`}
          >
            {isSelected && <Check className="w-3 h-3 inline mr-1" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Card-style single select ─────────────────────────────────────────────────
function CardSelect<T extends number | string>({
  options,
  selected,
  onSelect,
  color = "green",
}: {
  options: { value: T; label: string; description?: string }[];
  selected: T | null;
  onSelect: (v: T) => void;
  color?: "green" | "blue";
}) {
  const colorMap = {
    green: { active: "border-green-500/50 bg-green-500/8", dot: "bg-green-500" },
    blue:  { active: "border-blue-500/50 bg-blue-500/8", dot: "bg-blue-500" },
  };
  const c = colorMap[color];
  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map(opt => {
        const isSelected = selected === opt.value;
        return (
          <button
            key={String(opt.value)}
            onClick={() => onSelect(opt.value)}
            className={`w-full text-left rounded-xl border p-4 transition-all ${
              isSelected ? c.active : "border-white/8 bg-white/2 hover:border-white/15 hover:bg-white/4"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                isSelected ? `${c.dot} border-transparent` : "border-white/20"
              }`}>
                {isSelected && <Check className="w-3 h-3 text-black" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-snug">
                  {typeof opt.value === "number" && <span className="text-muted-foreground mr-1">{opt.value}.</span>}
                  {opt.label}
                </p>
                {opt.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{opt.description}</p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Ranked select (pick top 3 in order) ─────────────────────────────────────
function RankedSelect({
  options,
  selected,
  onToggle,
  maxSelect = 3,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  maxSelect?: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const rank = selected.indexOf(opt.id);
        const isSelected = rank !== -1;
        const isDisabled = !isSelected && selected.length >= maxSelect;
        return (
          <button
            key={opt.id}
            onClick={() => !isDisabled && onToggle(opt.id)}
            disabled={isDisabled}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium flex items-center gap-1.5 ${
              isSelected
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                : isDisabled
                ? "border-white/6 text-muted-foreground/30 cursor-not-allowed"
                : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
            }`}
          >
            {isSelected && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {rank + 1}
              </span>
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Principle card (editable) ────────────────────────────────────────────────
function PrincipleCard({
  index,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: {
  index: number;
  title: string;
  description: string;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
}) {
  const colors = ["#60A5FA", "#A78BFA", "#4ADE80", "#FBBF24", "#F472B6"];
  const color = colors[index % colors.length];
  return (
    <div
      className="rounded-xl border p-5 bg-white/2"
      style={{ borderColor: `${color}25`, borderLeftColor: color, borderLeftWidth: "3px" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
          style={{ background: `${color}18`, color }}
        >
          {index + 1}
        </div>
        <input
          className="flex-1 bg-transparent text-sm font-semibold text-foreground border-none outline-none focus:ring-0 placeholder:text-muted-foreground/40"
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="Principle title..."
        />
        <Edit3 className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
      </div>
      <Textarea
        value={description}
        onChange={e => onDescriptionChange(e.target.value)}
        rows={2}
        className="resize-none bg-white/4 border-white/10 text-sm placeholder:text-muted-foreground/50 focus:border-green-500/40"
        placeholder="Describe this principle..."
      />
    </div>
  );
}

// ─── Initiative library modal ─────────────────────────────────────────────────
function InitiativeLibraryModal({
  open,
  onClose,
  allInitiatives,
  selectedIds,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  allInitiatives: any[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [detailInitiative, setDetailInitiative] = useState<any | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = allInitiatives;
    if (categoryFilter !== "All") {
      list = list.filter(i => {
        const mapped = CATEGORY_MAP[i.category] ?? i.category;
        return mapped === categoryFilter || i.category === categoryFilter;
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(i =>
        i.name?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        (CATEGORY_MAP[i.category] ?? i.category)?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allInitiatives, categoryFilter, search]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[88vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-white/8 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-semibold">Initiative Library</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedIds.size} selected · {filtered.length} shown
                </p>
              </div>
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-400 text-black font-semibold"
                onClick={onClose}
              >
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Done ({selectedIds.size})
              </Button>
            </div>
            <div className="mt-3 mb-2">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search initiatives..."
                className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-green-500/40"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
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
                      onClick={e => { e.stopPropagation(); setDetailInitiative(init); }}
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
                  <p className="text-sm">No initiatives found.</p>
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="text-xs text-green-400 hover:text-green-300 mt-2 transition-colors"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailInitiative} onOpenChange={() => setDetailInitiative(null)}>
        {detailInitiative && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold pr-6">{detailInitiative.name}</DialogTitle>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {detailInitiative.aiType && (
                  <Badge style={{ background: `${AI_TYPE_COLORS[detailInitiative.aiType] ?? "#9CA3AF"}20`, color: AI_TYPE_COLORS[detailInitiative.aiType] ?? "#9CA3AF" }}>
                    {detailInitiative.aiType}
                  </Badge>
                )}
                {detailInitiative.decisionAuthority && (
                  <Badge variant="outline" className="text-xs">{DA_LABELS[detailInitiative.decisionAuthority] ?? detailInitiative.decisionAuthority}</Badge>
                )}
                {detailInitiative.regulatoryFlag && (
                  <Badge className="bg-amber-500/15 text-amber-400 text-xs">EU AI Act</Badge>
                )}
              </div>
            </DialogHeader>
            {detailInitiative.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{detailInitiative.description}</p>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => setDetailInitiative(null)}>Close</Button>
              <Button
                size="sm"
                className={selectedIds.has(detailInitiative.id)
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                  : "bg-green-500 hover:bg-green-400 text-black font-semibold"
                }
                onClick={() => { onToggle(detailInitiative.id); setDetailInitiative(null); }}
              >
                {selectedIds.has(detailInitiative.id) ? "Remove" : "Add to Strategy"}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

// ─── Baseline field row ───────────────────────────────────────────────────────
function BaselineField({
  label,
  fieldKey,
  value,
  sectorDefault,
  usingSectorDefault,
  onValueChange,
  onToggleDefault,
  unit,
  hint,
}: {
  label: string;
  fieldKey: string;
  value: number | undefined;
  sectorDefault: number;
  usingSectorDefault: boolean;
  onValueChange: (v: number | undefined) => void;
  onToggleDefault: () => void;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/2 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground mb-0.5">{label}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            checked={usingSectorDefault}
            onChange={onToggleDefault}
            className="rounded border-white/20 bg-white/4 text-green-500 focus:ring-green-500/40"
          />
          Use sector average ({unit ? `${unit}` : ""}{sectorDefault.toLocaleString()})
        </label>
      </div>
      <div className="mt-3">
        <div className="relative">
          {unit && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{unit}</span>
          )}
          <input
            type="number"
            value={usingSectorDefault ? sectorDefault : (value ?? "")}
            onChange={e => onValueChange(e.target.value === "" ? undefined : Number(e.target.value))}
            disabled={usingSectorDefault}
            className={`w-full rounded-lg border bg-white/4 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-green-500/40 transition-colors ${
              unit ? "pl-7" : ""
            } ${usingSectorDefault ? "opacity-50 cursor-not-allowed border-white/8" : "border-white/10"}`}
            placeholder={usingSectorDefault ? String(sectorDefault) : "Enter value..."}
            min={0}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main wizard page ─────────────────────────────────────────────────────────
export default function HRAIStrategyAssessmentPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Fetch existing assessment (pre-fill if re-taking) ──────────────────────
  const existingQ = trpc.intelligence.getStrategyAssessment.useQuery(undefined, { retry: false });
  const orgContextQ = trpc.intelligence.orgContext.useQuery(undefined, { retry: false });
  const initiativesQ = trpc.strategy.listInitiatives.useQuery(
    { tenantId: user?.tenantId ?? "" },
    { enabled: !!user?.tenantId }
  );

  // ── Wizard state ───────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [isDirty, setIsDirty] = useState(false);

  // Step 1 — Structured business aspiration
  const [businessOutcomes, setBusinessOutcomes] = useState<string[]>([]);
  const [businessProblems, setBusinessProblems] = useState<string[]>([]);
  const [riskAppetite, setRiskAppetite] = useState<1|2|3|4|5 | null>(null);
  const [timelineMonths, setTimelineMonths] = useState<number | null>(null);
  const [successMarkers, setSuccessMarkers] = useState<string[]>([]);

  // Step 1 — A1: existing AI tools
  const [existingAiTools, setExistingAiTools] = useState<string[]>([]);

  // Step 1.5 — Operational baseline
  const [baselineValues, setBaselineValues] = useState<Omit<OperationalBaseline, "_sector_default_used">>({});
  const [sectorDefaultUsed, setSectorDefaultUsed] = useState<Record<string, boolean>>({});

  // Step 2 — Structured HR role
  const [hrLeadershipPosition, setHrLeadershipPosition] = useState<1|2|3|4|5 | null>(null);
  const [hrProcessesPriority, setHrProcessesPriority] = useState<string[]>([]);
  const [governancePrinciples, setGovernancePrinciples] = useState<string[]>([]);
  const [voiceCapture, setVoiceCapture] = useState("");
  // Step 2 — A3: AI philosophy
  const [aiPhilosophy, setAiPhilosophy] = useState<AiPhilosophy | null>(null);

  // Step 2.5 — B1: Stakeholder map
  const [stakeholderMap, setStakeholderMap] = useState<StakeholderMap>({
    executive_sponsors: [],
    gatekeepers: [],
    affected_groups: [],
    potential_resistors: [],
    notes: "",
  });

  // Step 3 (HR's Role) — D1: Measurement cadence
  const [measurementCadence, setMeasurementCadence] = useState<MeasurementCadence | null>(null);
  // E1 — UK regulatory frameworks
  const [ukRegulatoryFrameworks, setUkRegulatoryFrameworks] = useState<string[]>([]);
  // D2 — Pilot design
  const [pilotScope, setPilotScope]         = useState<string>("");
  const [pilotDuration, setPilotDuration]   = useState<string>("");
  const [pilotMetrics, setPilotMetrics]     = useState<string[]>([]);
  // Step 1 — D3: Solution delivery confidence
  const [solutionDeliveryConfidence, setSolutionDeliveryConfidence] = useState<1|2|3|4|5 | null>(null);

  // Step 3 — Vision & Principles
  const [visionStatement, setVisionStatement] = useState("");
  const [principles, setPrinciples] = useState<Array<{ title: string; description: string }>>([]);
  const [wontDo, setWontDo] = useState<string[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Step 4 — Initiatives + Ambition levels
  const [businessLevel, setBusinessLevel] = useState<number>(3);
  const [peopleLevel, setPeopleLevel] = useState<number>(3);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showLibrary, setShowLibrary] = useState(false);

  // ── Derived values ─────────────────────────────────────────────────────────
  const sector = orgContextQ.data?.sector ?? "other";
  const headcount = orgContextQ.data?.headcount ?? 500;
  const sectorLabel = sector.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const sectorBenchmarks = getSectorBenchmarks(sector);
  const availableOutcomes = useMemo(() => getBusinessOutcomes(sector), [sector]);
  const governanceDefaults = useMemo(() => getGovernanceDefaults(sector), [sector]);

  // ── Pre-fill from existing assessment ─────────────────────────────────────
  useEffect(() => {
    const d = existingQ.data;
    if (!d?.completed) return;

    // Pre-fill structured inputs if available
    const rawStructured = (d as Record<string, unknown>).structuredInputs;
    if (rawStructured && typeof rawStructured === "object") {
      const si = rawStructured as Partial<StructuredInputs>;
      if (si.business_outcomes?.length) setBusinessOutcomes(si.business_outcomes);
      if (si.business_problems?.length) setBusinessProblems(si.business_problems);
      if (si.risk_appetite) setRiskAppetite(si.risk_appetite);
      if (si.timeline_months) setTimelineMonths(si.timeline_months);
      if (si.success_markers_ranked?.length) setSuccessMarkers(si.success_markers_ranked);
      if (si.hr_leadership_position) setHrLeadershipPosition(si.hr_leadership_position);
      if (si.hr_processes_priority?.length) setHrProcessesPriority(si.hr_processes_priority);
      if (si.governance_principles?.length) setGovernancePrinciples(si.governance_principles);
      if (si.voice_capture) setVoiceCapture(si.voice_capture);
      if (si.existing_ai_tools?.length) setExistingAiTools(si.existing_ai_tools);
      if (si.ai_philosophy) setAiPhilosophy(si.ai_philosophy);
      if (si.stakeholder_map) setStakeholderMap(si.stakeholder_map);
      if (si.measurement_cadence) setMeasurementCadence(si.measurement_cadence);
      if (si.uk_regulatory_frameworks) setUkRegulatoryFrameworks(si.uk_regulatory_frameworks);
      if (si.pilot_design?.scope)            setPilotScope(si.pilot_design.scope);
      if (si.pilot_design?.duration)         setPilotDuration(si.pilot_design.duration);
      if (si.pilot_design?.success_metrics)  setPilotMetrics(si.pilot_design.success_metrics);
      if (si.solution_delivery_confidence) setSolutionDeliveryConfidence(si.solution_delivery_confidence);
    }

    // Pre-fill operational baseline if available
    const rawBaseline = (d as Record<string, unknown>).operationalBaseline;
    if (rawBaseline && typeof rawBaseline === "object") {
      const ob = rawBaseline as OperationalBaseline;
      const { _sector_default_used, ...values } = ob;
      setBaselineValues(values);
      if (_sector_default_used) setSectorDefaultUsed(_sector_default_used as Record<string, boolean>);
    }

    // Pre-fill vision/principles
    if (d.visionStatement) { setVisionStatement(d.visionStatement); setHasGenerated(true); }
    if (d.guidingPrinciples) { setPrinciples(d.guidingPrinciples); setHasGenerated(true); }
    if (d.businessAmbitionLevel) setBusinessLevel(d.businessAmbitionLevel);
    if (d.peopleAmbitionLevel) setPeopleLevel(d.peopleAmbitionLevel);
    if (d.selectedInitiativeIds?.length) setSelectedIds(new Set(d.selectedInitiativeIds));
    const rawWontDo = (d as Record<string, unknown>).wontDo;
    if (Array.isArray(rawWontDo) && rawWontDo.length > 0) setWontDo(rawWontDo as string[]);
  }, [existingQ.data]);

  // ── Set governance defaults on sector load ─────────────────────────────────
  useEffect(() => {
    if (governancePrinciples.length === 0 && governanceDefaults.length > 0) {
      setGovernancePrinciples(governanceDefaults);
    }
  }, [governanceDefaults]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Set stakeholder defaults when ambition levels are known ───────────────
  useEffect(() => {
    const hasData = existingQ.data?.completed;
    if (!hasData && stakeholderMap.executive_sponsors.length === 0) {
      const defaults = getStakeholderDefaults(
        orgContextQ.data?.businessAmbitionLevel ?? 3,
        orgContextQ.data?.peopleAmbitionLevel ?? 3,
      );
      setStakeholderMap(defaults);
    }
  }, [orgContextQ.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Unsaved-progress guard ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ── Scroll to top on step change ───────────────────────────────────────────
  const goToStep = useCallback((n: number) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const generateMut = trpc.intelligence.generateVisionWithQualityGate.useMutation({
    onSuccess: (data) => {
      setVisionStatement(data.visionStatement);
      setPrinciples(data.principles);
      if (data.wontDo) setWontDo(data.wontDo);
      setHasGenerated(true);
      setIsDirty(true);
    },
    onError: (err) => { toast.error("Failed to generate vision: " + err.message); },
  });
  const buildProvenanceMut = trpc.intelligence.buildProvenanceMap.useMutation();

  const saveMut = trpc.intelligence.saveStrategyAssessment.useMutation({
    onSuccess: () => {
      setIsDirty(false);
      toast.success("HR AI Strategy committed successfully.");
      navigate("/ai-strategy");
    },
    onError: (err) => { toast.error("Failed to save strategy: " + err.message); },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const allInitiatives = initiativesQ.data ?? [];

  const toggleInitiative = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setIsDirty(true);
  }, []);

  const toggleSuccessMarker = useCallback((id: string) => {
    setSuccessMarkers(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
    setIsDirty(true);
  }, []);

  const toggleBaselineDefault = useCallback((field: string) => {
    setSectorDefaultUsed(prev => ({ ...prev, [field]: !prev[field] }));
    setIsDirty(true);
  }, []);

  const skipAllBaseline = useCallback(() => {
    const defaults = computeSectorDefaultBaseline(sector, headcount);
    const { _sector_default_used, ...values } = defaults;
    setBaselineValues(values);
    setSectorDefaultUsed({
      hires_per_year: true,
      cost_per_hire_gbp: true,
      time_to_fill_days: true,
      voluntary_attrition_rate_pct: true,
      l_and_d_spend_per_fte_gbp: true,
      hr_cost_per_fte_gbp: true,
    });
    setIsDirty(true);
  }, [sector, headcount]);

  // ── Step validation ────────────────────────────────────────────────────────
  const step1Valid = businessOutcomes.length >= 1 && businessProblems.length >= 1 && riskAppetite !== null && timelineMonths !== null && successMarkers.length === 3;
  // Step 1.5 is always valid (all optional)
  const step2Valid = hrLeadershipPosition !== null && hrProcessesPriority.length >= 1 && governancePrinciples.length >= 1;
  const step3Valid = visionStatement.trim().length >= 20 && principles.length === 5;
  const step4Valid = selectedIds.size > 0;

  // ── Build structured inputs object ────────────────────────────────────────
  const buildStructuredInputs = useCallback((): StructuredInputs => ({
    business_outcomes: businessOutcomes,
    business_problems: businessProblems,
    timeline_months: timelineMonths ?? 18,
    risk_appetite: riskAppetite ?? 3,
    success_markers_ranked: (successMarkers.length === 3 ? successMarkers : [...successMarkers, ...Array(3 - successMarkers.length).fill("")]) as [string, string, string],
    hr_leadership_position: hrLeadershipPosition ?? 3,
    hr_processes_priority: hrProcessesPriority,
    governance_principles: governancePrinciples,
    voice_capture: voiceCapture.trim() || undefined,
    existing_ai_tools: existingAiTools.length > 0 ? existingAiTools : undefined,
    ai_philosophy: aiPhilosophy ?? undefined,
    stakeholder_map: stakeholderMap,
    measurement_cadence: measurementCadence ?? undefined,
    uk_regulatory_frameworks: ukRegulatoryFrameworks.length > 0 ? ukRegulatoryFrameworks : undefined,
    pilot_design: (pilotScope || pilotDuration || pilotMetrics.length > 0) ? {
      scope:           pilotScope || undefined,
      duration:        pilotDuration || undefined,
      success_metrics: pilotMetrics.length > 0 ? pilotMetrics : undefined,
    } : undefined,
    solution_delivery_confidence: solutionDeliveryConfidence ?? undefined,
  }), [businessOutcomes, businessProblems, timelineMonths, riskAppetite, successMarkers, hrLeadershipPosition, hrProcessesPriority, governancePrinciples, voiceCapture, existingAiTools, aiPhilosophy, stakeholderMap, measurementCadence, solutionDeliveryConfidence]);

  const buildOperationalBaseline = useCallback((): OperationalBaseline => ({
    ...baselineValues,
    _sector_default_used: sectorDefaultUsed as Record<string, boolean>,
  }), [baselineValues, sectorDefaultUsed]);

  // ── Generate vision ────────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    const si = buildStructuredInputs();
    const riskLabel = RISK_APPETITE_OPTIONS.find(r => r.value === si.risk_appetite)?.label ?? "Balanced";
    const riskDesc = RISK_APPETITE_OPTIONS.find(r => r.value === si.risk_appetite)?.description ?? "";
    const outcomeLabels = si.business_outcomes.map(id => availableOutcomes.find(o => o.id === id)?.label ?? id);
    const problemLabels = si.business_problems.map(id => BUSINESS_PROBLEMS.find(p => p.id === id)?.label ?? id);
    const markerLabels = si.success_markers_ranked.map(id => SUCCESS_MARKERS.find(m => m.id === id)?.label ?? id);
    const processLabels = si.hr_processes_priority.map(id => HR_PROCESSES.find(p => p.id === id)?.label ?? id);
    const govLabels = si.governance_principles.map(id => GOVERNANCE_PRINCIPLES.find(g => g.id === id)?.label ?? id);
    const hrPosLabel = HR_LEADERSHIP_POSITIONS.find(p => p.value === si.hr_leadership_position)?.label ?? "";
    const timelineYear = new Date().getFullYear() + Math.ceil((si.timeline_months ?? 18) / 12);

    // Synthesise structured inputs into aspiration/hrRole answer maps for backward compat with generateVisionWithQualityGate
    const aspirationAnswers: Record<string, string> = {
      ai_outcomes: `Top business outcomes: ${outcomeLabels.join(", ")}`,
      business_problems: `Key problems to solve: ${problemLabels.join(", ")}`,
      timeline: `Timeline: ${si.timeline_months} months (by end of ${timelineYear})`,
      risk_appetite: `Risk appetite: ${riskLabel} — ${riskDesc}`,
      success_definition: `Success markers (ranked): 1. ${markerLabels[0]}, 2. ${markerLabels[1]}, 3. ${markerLabels[2]}`,
    };
    const hrRoleAnswers: Record<string, string> = {
      lead_vs_support: hrPosLabel,
      hr_processes_first: `Priority processes: ${processLabels.join(", ")}`,
      governance_principles: `Governance commitments: ${govLabels.join(", ")}`,
    };
    if (si.voice_capture) {
      hrRoleAnswers.additional_context = si.voice_capture;
    }

    generateMut.mutate({
      sector: sectorLabel,
      businessAmbitionLabel: BUSINESS_LEVELS[businessLevel]?.label ?? "Progressive",
      peopleAmbitionLabel: PEOPLE_LEVELS[peopleLevel]?.label ?? "Practitioners",
      aspirationAnswers,
      hrRoleAnswers,
    });
  }, [buildStructuredInputs, availableOutcomes, sectorLabel, businessLevel, peopleLevel, generateMut]);

  // ── Commit strategy ────────────────────────────────────────────────────────
  const handleCommit = async () => {
    let provenanceJson: string | undefined;
    try {
      const ambitionTier: "cautious" | "progressive" | "transformative" =
        businessLevel >= 4 ? "transformative" : businessLevel >= 3 ? "progressive" : "cautious";
      const provenance = await buildProvenanceMut.mutateAsync({
        selectedInitiativeIds: Array.from(selectedIds),
        visionStatement,
        sector: sectorLabel,
        ambitionTier,
      });
      provenanceJson = JSON.stringify(provenance);
    } catch {
      // Non-blocking
    }

    const si = buildStructuredInputs();
    const ob = buildOperationalBaseline();

    // Backward-compat: synthesise aspirationAnswers / hrRoleAnswers from structured inputs
    const outcomeLabels = si.business_outcomes.map(id => availableOutcomes.find(o => o.id === id)?.label ?? id);
    const problemLabels = si.business_problems.map(id => BUSINESS_PROBLEMS.find(p => p.id === id)?.label ?? id);
    const markerLabels = si.success_markers_ranked.map(id => SUCCESS_MARKERS.find(m => m.id === id)?.label ?? id);
    const processLabels = si.hr_processes_priority.map(id => HR_PROCESSES.find(p => p.id === id)?.label ?? id);
    const govLabels = si.governance_principles.map(id => GOVERNANCE_PRINCIPLES.find(g => g.id === id)?.label ?? id);
    const hrPosLabel = HR_LEADERSHIP_POSITIONS.find(p => p.value === si.hr_leadership_position)?.label ?? "";

    saveMut.mutate({
      aspirationAnswers: {
        ai_outcomes: outcomeLabels.join(", "),
        business_problems: problemLabels.join(", "),
        timeline: `${si.timeline_months} months`,
        risk_appetite: RISK_APPETITE_OPTIONS.find(r => r.value === si.risk_appetite)?.label ?? "Balanced",
        success_definition: markerLabels.join(", "),
      },
      hrRoleAnswers: {
        lead_vs_support: hrPosLabel,
        hr_processes_first: processLabels.join(", "),
        governance_principles: govLabels.join(", "),
        ...(si.voice_capture ? { additional_context: si.voice_capture } : {}),
      },
      visionStatement,
      guidingPrinciples: principles,
      wontDo: wontDo.length > 0 ? wontDo : undefined,
      businessAmbitionLevel: businessLevel,
      peopleAmbitionLevel: peopleLevel,
      selectedInitiativeIds: Array.from(selectedIds),
      provenanceJson,
      structuredInputsJson: JSON.stringify(si),
      operationalBaselineJson: JSON.stringify(ob),
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const isLoading = existingQ.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-400 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading your strategy…</p>
        </div>
      </div>
    );
  }

  const isRetake = !!existingQ.data?.completed;

  return (
    <div ref={scrollRef} className="min-h-screen bg-background">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-white/8 bg-white/2">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <button
            onClick={() => navigate("/ai-strategy")}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1 mb-3"
          >
            <ChevronLeft className="w-4 h-4" />
            HR AI Strategy
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {isRetake ? "Update HR AI Strategy" : "HR AI Strategy Assessment"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isRetake
                  ? "Your previous answers are pre-filled — update any section and recommit."
                  : "Complete 3 structured steps to generate your AI vision and guiding principles."}
              </p>
            </div>
            {isRetake && (
              <Badge className="ml-auto bg-green-500/20 text-green-400 border-green-500/30 text-xs flex-shrink-0">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Strategy active
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ── Wizard body ─────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <StepIndicator current={step} total={6} />

        {/* ── Step 1: Business AI Aspiration ─────────────────────────────── */}
        {step === 1 && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                  <Target className="w-4 h-4 text-green-400" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Business AI Aspiration</h2>
              </div>
              <p className="text-sm text-muted-foreground ml-9">
                Tell us what your organisation wants to achieve with AI. These selections shape your HR AI strategy.
              </p>
            </div>

            <div className="space-y-6">
              {/* Business outcomes */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">
                  What AI outcomes matter most to your organisation?
                </p>
                <p className="text-xs text-muted-foreground mb-4">Select all that apply. Sector-specific options are included for {sectorLabel}.</p>
                <ChipSelect
                  options={availableOutcomes}
                  selected={businessOutcomes}
                  onToggle={id => { setBusinessOutcomes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); setIsDirty(true); }}
                  color="green"
                />
                {businessOutcomes.length === 0 && (
                  <p className="text-xs text-amber-400/80 mt-3 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Select at least one outcome.</p>
                )}
              </div>

              {/* Business problems */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">
                  What business problems should AI solve in the next 1–3 years?
                </p>
                <p className="text-xs text-muted-foreground mb-4">Select all that apply.</p>
                <ChipSelect
                  options={BUSINESS_PROBLEMS}
                  selected={businessProblems}
                  onToggle={id => { setBusinessProblems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); setIsDirty(true); }}
                  color="green"
                />
                {businessProblems.length === 0 && (
                  <p className="text-xs text-amber-400/80 mt-3 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Select at least one problem.</p>
                )}
              </div>

              {/* Risk appetite */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">
                  What is your organisation's risk appetite for AI?
                </p>
                <p className="text-xs text-muted-foreground mb-4">Select the level that best describes your organisation's approach.</p>
                <CardSelect
                  options={RISK_APPETITE_OPTIONS}
                  selected={riskAppetite}
                  onSelect={v => { setRiskAppetite(v as 1|2|3|4|5); setIsDirty(true); }}
                  color="green"
                />
              </div>

              {/* Timeline */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">
                  What is your organisation's timeline for AI adoption?
                </p>
                <p className="text-xs text-muted-foreground mb-4">Select the planning horizon that matches your board-level commitment.</p>
                <div className="flex flex-wrap gap-2">
                  {TIMELINE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setTimelineMonths(opt.value); setIsDirty(true); }}
                      className={`text-sm px-4 py-2 rounded-lg border transition-colors font-medium ${
                        timelineMonths === opt.value
                          ? "bg-green-500/20 border-green-500/50 text-green-300"
                          : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Success markers — ranked top 3 */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">
                  What does AI success look like? <span className="text-muted-foreground font-normal">(Rank your top 3)</span>
                </p>
                <p className="text-xs text-muted-foreground mb-4">Click to select in order of priority. First click = #1 priority.</p>
                <RankedSelect
                  options={SUCCESS_MARKERS}
                  selected={successMarkers}
                  onToggle={toggleSuccessMarker}
                  maxSelect={3}
                />
                {successMarkers.length < 3 && (
                  <p className="text-xs text-amber-400/80 mt-3 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Select exactly 3 success markers ({3 - successMarkers.length} more needed).
                  </p>
                )}
              </div>

              {/* A1 — Existing AI tools */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">
                  Which AI or digital HR tools do you already have in place? <span className="text-muted-foreground font-normal">(Optional)</span>
                </p>
                <p className="text-xs text-muted-foreground mb-4">Select all that apply. This helps us avoid recommending tools you already have and identify integration opportunities.</p>
                <ChipSelect
                  options={EXISTING_AI_TOOLS}
                  selected={existingAiTools}
                  onToggle={id => {
                    setExistingAiTools(prev => {
                      if (id === "none") return prev.includes("none") ? [] : ["none"];
                      const without = prev.filter(x => x !== "none");
                      return without.includes(id) ? without.filter(x => x !== id) : [...without, id];
                    });
                    setIsDirty(true);
                  }}
                  color="green"
                />
              </div>
            </div>

            {/* D3 — Solution Delivery Confidence */}
            <div className="rounded-xl border border-white/8 bg-white/3 p-5">
              <p className="text-sm font-semibold text-foreground mb-1">
                How confident is your organisation in delivering AI change programmes? <span className="text-muted-foreground font-normal">(Optional)</span>
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                This adjusts phase durations and change management cost estimates in your strategy.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {SOLUTION_DELIVERY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setSolutionDeliveryConfidence(opt.value as 1|2|3|4|5); setIsDirty(true); }}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      solutionDeliveryConfidence === opt.value
                        ? "border-cyan-500 bg-cyan-500/10 text-foreground"
                        : "border-white/10 bg-white/3 text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    <div className="text-xs font-bold mb-1">{opt.value}. {opt.label}</div>
                    <div className="text-xs opacity-70 leading-snug">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end mt-8 pt-4 border-t border-white/6">
              <Button
                disabled={!step1Valid}
                onClick={() => goToStep(2)}
                className="bg-green-500 hover:bg-green-400 text-black font-semibold px-6"
              >
                Next: Operational Baseline
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 1.5: Operational Baseline ─────────────────────────────── */}
        {step === 2 && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4 text-amber-400" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Operational Baseline</h2>
              </div>
              <p className="text-sm text-muted-foreground ml-9">
                These numbers help us calculate value estimates in your strategy. Estimates are fine — provide your best guess and we'll show ranges. You can refine later. Skip if you don't have these to hand.
              </p>
            </div>

            {/* Skip all */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-6 flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-foreground font-medium">All fields are optional</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We'll use {sectorLabel} sector averages for any fields you skip. Sector defaults are sourced from CIPD and SHRM benchmarks.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={skipAllBaseline}
                className="flex-shrink-0 text-xs"
              >
                Skip all — use sector averages
              </Button>
            </div>

            <div className="space-y-3">
              <BaselineField
                label="Hires per year"
                fieldKey="hires_per_year"
                value={baselineValues.hires_per_year}
                sectorDefault={Math.round((sectorBenchmarks.hires_per_year_per_1000_employees.median / 1000) * headcount)}
                usingSectorDefault={!!sectorDefaultUsed.hires_per_year}
                onValueChange={v => { setBaselineValues(prev => ({ ...prev, hires_per_year: v })); setIsDirty(true); }}
                onToggleDefault={() => toggleBaselineDefault("hires_per_year")}
                hint="Total external hires made in a typical year"
              />
              <BaselineField
                label="Cost per hire"
                fieldKey="cost_per_hire_gbp"
                value={baselineValues.cost_per_hire_gbp}
                sectorDefault={sectorBenchmarks.cost_per_hire_gbp.median}
                usingSectorDefault={!!sectorDefaultUsed.cost_per_hire_gbp}
                onValueChange={v => { setBaselineValues(prev => ({ ...prev, cost_per_hire_gbp: v })); setIsDirty(true); }}
                onToggleDefault={() => toggleBaselineDefault("cost_per_hire_gbp")}
                unit="£"
                hint="All-in cost including agency fees, advertising, and internal time"
              />
              <BaselineField
                label="Time to fill (days)"
                fieldKey="time_to_fill_days"
                value={baselineValues.time_to_fill_days}
                sectorDefault={sectorBenchmarks.time_to_fill_days.median}
                usingSectorDefault={!!sectorDefaultUsed.time_to_fill_days}
                onValueChange={v => { setBaselineValues(prev => ({ ...prev, time_to_fill_days: v })); setIsDirty(true); }}
                onToggleDefault={() => toggleBaselineDefault("time_to_fill_days")}
                hint="Average days from job opening to accepted offer"
              />
              <BaselineField
                label="Voluntary attrition rate"
                fieldKey="voluntary_attrition_rate_pct"
                value={baselineValues.voluntary_attrition_rate_pct}
                sectorDefault={sectorBenchmarks.voluntary_attrition_rate_pct.median}
                usingSectorDefault={!!sectorDefaultUsed.voluntary_attrition_rate_pct}
                onValueChange={v => { setBaselineValues(prev => ({ ...prev, voluntary_attrition_rate_pct: v })); setIsDirty(true); }}
                onToggleDefault={() => toggleBaselineDefault("voluntary_attrition_rate_pct")}
                unit="%"
                hint="Percentage of employees who voluntarily leave each year"
              />
              <BaselineField
                label="L&D spend per FTE"
                fieldKey="l_and_d_spend_per_fte_gbp"
                value={baselineValues.l_and_d_spend_per_fte_gbp}
                sectorDefault={sectorBenchmarks.l_and_d_spend_per_fte_gbp.median}
                usingSectorDefault={!!sectorDefaultUsed.l_and_d_spend_per_fte_gbp}
                onValueChange={v => { setBaselineValues(prev => ({ ...prev, l_and_d_spend_per_fte_gbp: v })); setIsDirty(true); }}
                onToggleDefault={() => toggleBaselineDefault("l_and_d_spend_per_fte_gbp")}
                unit="£"
                hint="Annual learning & development budget per full-time employee"
              />
              <BaselineField
                label="HR cost per FTE"
                fieldKey="hr_cost_per_fte_gbp"
                value={baselineValues.hr_cost_per_fte_gbp}
                sectorDefault={sectorBenchmarks.hr_cost_per_fte_gbp.median}
                usingSectorDefault={!!sectorDefaultUsed.hr_cost_per_fte_gbp}
                onValueChange={v => { setBaselineValues(prev => ({ ...prev, hr_cost_per_fte_gbp: v })); setIsDirty(true); }}
                onToggleDefault={() => toggleBaselineDefault("hr_cost_per_fte_gbp")}
                unit="£"
                hint="Total HR function cost divided by total headcount"
              />
            </div>

            <div className="flex justify-between mt-8 pt-4 border-t border-white/6">
              <Button variant="outline" onClick={() => goToStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <Button
                onClick={() => goToStep(3)}
                className="bg-green-500 hover:bg-green-400 text-black font-semibold px-6"
              >
                Next: Stakeholder Map
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2.5: Stakeholder Map (B1) ─────────────────────────────── */}
        {step === 3 && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-teal-400" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Stakeholder Map</h2>
              </div>
              <p className="text-sm text-muted-foreground ml-9">
                Identify who needs to sponsor, approve, and be engaged in your AI strategy. Pre-filled with sensible defaults — adjust to reflect your organisation.
              </p>
            </div>

            <div className="space-y-5">
              {/* Executive sponsors */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">Executive sponsors</p>
                <p className="text-xs text-muted-foreground mb-4">Who at C-suite or board level is backing this initiative?</p>
                <ChipSelect
                  options={EXECUTIVE_SPONSORS}
                  selected={stakeholderMap.executive_sponsors}
                  onToggle={id => {
                    setStakeholderMap(prev => ({
                      ...prev,
                      executive_sponsors: prev.executive_sponsors.includes(id)
                        ? prev.executive_sponsors.filter(x => x !== id)
                        : [...prev.executive_sponsors, id],
                    }));
                    setIsDirty(true);
                  }}
                  color="blue"
                />
              </div>

              {/* Gatekeepers */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">Gatekeepers</p>
                <p className="text-xs text-muted-foreground mb-4">Which functions must approve or be consulted before deployment?</p>
                <ChipSelect
                  options={GATEKEEPERS}
                  selected={stakeholderMap.gatekeepers}
                  onToggle={id => {
                    setStakeholderMap(prev => ({
                      ...prev,
                      gatekeepers: prev.gatekeepers.includes(id)
                        ? prev.gatekeepers.filter(x => x !== id)
                        : [...prev.gatekeepers, id],
                    }));
                    setIsDirty(true);
                  }}
                  color="green"
                />
              </div>

              {/* Affected groups */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">Affected groups</p>
                <p className="text-xs text-muted-foreground mb-4">Who will be directly impacted by the AI tools and processes you're introducing?</p>
                <ChipSelect
                  options={AFFECTED_GROUPS}
                  selected={stakeholderMap.affected_groups}
                  onToggle={id => {
                    setStakeholderMap(prev => ({
                      ...prev,
                      affected_groups: prev.affected_groups.includes(id)
                        ? prev.affected_groups.filter(x => x !== id)
                        : [...prev.affected_groups, id],
                    }));
                    setIsDirty(true);
                  }}
                  color="purple"
                />
              </div>

              {/* Potential resistors */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">Potential resistors <span className="text-muted-foreground font-normal">(Optional)</span></p>
                <p className="text-xs text-muted-foreground mb-4">Who might push back, and why? Being honest here improves your change plan.</p>
                <ChipSelect
                  options={POTENTIAL_RESISTORS}
                  selected={stakeholderMap.potential_resistors}
                  onToggle={id => {
                    setStakeholderMap(prev => ({
                      ...prev,
                      potential_resistors: prev.potential_resistors.includes(id)
                        ? prev.potential_resistors.filter(x => x !== id)
                        : [...prev.potential_resistors, id],
                    }));
                    setIsDirty(true);
                  }}
                  color="green"
                />
              </div>

              {/* Notes */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">Additional context <span className="text-muted-foreground font-normal">(Optional)</span></p>
                <p className="text-xs text-muted-foreground mb-3">Any political dynamics, named individuals, or timing constraints worth noting?</p>
                <Textarea
                  value={stakeholderMap.notes ?? ""}
                  onChange={e => { setStakeholderMap(prev => ({ ...prev, notes: e.target.value })); setIsDirty(true); }}
                  rows={3}
                  maxLength={400}
                  className="resize-none bg-white/4 border-white/10 text-sm placeholder:text-muted-foreground/50 focus:border-teal-500/40"
                  placeholder="e.g. Our CFO is sceptical — we need a quick win before the Q2 board. Trade union consultation required for any workforce-impacting tools."
                />
                <p className="text-xs text-muted-foreground mt-1.5 text-right">{(stakeholderMap.notes ?? "").length}/400</p>
              </div>

              {/* E1 — UK Regulatory Frameworks */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">
                  Which UK regulatory frameworks apply to your AI initiatives? <span className="text-muted-foreground font-normal">(Optional)</span>
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Selecting these generates a Regulatory Readiness checklist in your strategy. Select all that apply.
                </p>
                <div className="space-y-2">
                  {UK_REGULATORY_FRAMEWORKS.map(fw => (
                    <button
                      key={fw.id}
                      onClick={() => {
                        setUkRegulatoryFrameworks(prev =>
                          prev.includes(fw.id) ? prev.filter(x => x !== fw.id) : [...prev, fw.id]
                        );
                        setIsDirty(true);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-colors ${
                        ukRegulatoryFrameworks.includes(fw.id)
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                          : "border-white/8 text-muted-foreground hover:border-white/20 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide flex-shrink-0 mt-0.5 ${
                          fw.risk === "high"   ? "bg-red-500/20 text-red-400" :
                          fw.risk === "medium" ? "bg-amber-500/20 text-amber-400" :
                          "bg-white/10 text-muted-foreground"
                        }`}>{fw.risk}</span>
                        <div>
                          <p className="text-sm font-medium leading-tight">{fw.label}</p>
                          {fw.description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{fw.description}</p>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-8 pt-4 border-t border-white/6">
              <Button variant="outline" onClick={() => goToStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <Button
                onClick={() => goToStep(4)}
                className="bg-green-500 hover:bg-green-400 text-black font-semibold px-6"
              >
                Next: HR's Role
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: HR's Role ──────────────────────────────────────────── */}
        {step === 4 && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <h2 className="text-lg font-bold text-foreground">HR's Role in the AI Vision</h2>
              </div>
              <p className="text-sm text-muted-foreground ml-9">
                Define how HR will enable, lead, and govern AI adoption across your organisation.
              </p>
            </div>

            <div className="space-y-6">
              {/* HR leadership position */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">
                  What is HR's leadership position on AI?
                </p>
                <p className="text-xs text-muted-foreground mb-4">Select the statement that best describes your CHRO's mandate.</p>
                <CardSelect
                  options={HR_LEADERSHIP_POSITIONS}
                  selected={hrLeadershipPosition}
                  onSelect={v => { setHrLeadershipPosition(v as 1|2|3|4|5); setIsDirty(true); }}
                  color="blue"
                />
              </div>

              {/* HR processes priority */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">
                  Which HR processes should AI transform first? <span className="text-muted-foreground font-normal">(Select up to 5)</span>
                </p>
                <p className="text-xs text-muted-foreground mb-4">Prioritise processes with the highest volume, cost, or strategic importance.</p>
                <ChipSelect
                  options={HR_PROCESSES}
                  selected={hrProcessesPriority}
                  onToggle={id => { setHrProcessesPriority(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); setIsDirty(true); }}
                  maxSelect={5}
                  color="blue"
                />
                {hrProcessesPriority.length === 0 && (
                  <p className="text-xs text-amber-400/80 mt-3 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Select at least one process.</p>
                )}
              </div>

              {/* Governance principles */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">
                  What governance principles matter most?
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Sector defaults for {sectorLabel} are pre-checked. Adjust as needed.
                </p>
                <ChipSelect
                  options={GOVERNANCE_PRINCIPLES}
                  selected={governancePrinciples}
                  onToggle={id => { setGovernancePrinciples(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); setIsDirty(true); }}
                  color="purple"
                />
                {governancePrinciples.length === 0 && (
                  <p className="text-xs text-amber-400/80 mt-3 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Select at least one principle.</p>
                )}
              </div>

              {/* A3 — AI philosophy */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">
                  What is your organisation’s AI philosophy?
                </p>
                <p className="text-xs text-muted-foreground mb-4">This shapes how initiatives are framed — whether AI augments your people or replaces manual steps.</p>
                <div className="space-y-2">
                  {AI_PHILOSOPHY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setAiPhilosophy(opt.value); setIsDirty(true); }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                        aiPhilosophy === opt.value
                          ? "bg-blue-500/15 border-blue-500/40 text-foreground"
                          : "border-white/8 text-muted-foreground hover:border-white/20 hover:text-foreground"
                      }`}
                    >
                      <p className={`text-sm font-semibold mb-0.5 ${aiPhilosophy === opt.value ? "text-blue-300" : ""}`}>{opt.label}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* D1 — Measurement cadence */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">
                  How often will you review and measure progress? <span className="text-muted-foreground font-normal">(Optional)</span>
                </p>
                <p className="text-xs text-muted-foreground mb-4">Sets the rhythm for KPI tracking and strategy re-assessment in your measurement plan.</p>
                <div className="space-y-2">
                  {MEASUREMENT_CADENCE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setMeasurementCadence(opt.value); setIsDirty(true); }}
                      className={`w-full text-left p-3 rounded-xl border transition-colors text-sm ${
                        measurementCadence === opt.value
                          ? "bg-green-500/15 border-green-500/40 text-green-300"
                          : "border-white/8 text-muted-foreground hover:border-white/20 hover:text-foreground"
                      }`}
                    >
                      {measurementCadence === opt.value && <Check className="w-3 h-3 inline mr-1.5" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* D2 — Pilot Design */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">
                  How do you want to pilot your first initiative? <span className="text-muted-foreground font-normal">(Optional)</span>
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  This shapes the Pilot Design section of your strategy — scope, duration, and success metrics.
                </p>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Pilot Scope</p>
                    <div className="grid grid-cols-2 gap-2">
                      {PILOT_SCOPE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setPilotScope(opt.value); setIsDirty(true); }}
                          className={`text-left p-3 rounded-xl border transition-colors ${
                            pilotScope === opt.value
                              ? "bg-blue-500/15 border-blue-500/40 text-blue-300"
                              : "border-white/8 text-muted-foreground hover:border-white/20 hover:text-foreground"
                          }`}
                        >
                          <p className="text-xs font-semibold leading-tight">{opt.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{opt.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Pilot Duration</p>
                    <div className="flex flex-wrap gap-2">
                      {PILOT_DURATION_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setPilotDuration(opt.value); setIsDirty(true); }}
                          className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                            pilotDuration === opt.value
                              ? "bg-blue-500/15 border-blue-500/40 text-blue-300"
                              : "border-white/8 text-muted-foreground hover:border-white/20 hover:text-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Success Metrics <span className="font-normal normal-case">(select up to 4)</span></p>
                    <div className="space-y-1.5">
                      {PILOT_SUCCESS_METRICS.map(m => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setPilotMetrics(prev =>
                              prev.includes(m.id)
                                ? prev.filter(x => x !== m.id)
                                : prev.length < 4 ? [...prev, m.id] : prev
                            );
                            setIsDirty(true);
                          }}
                          className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
                            pilotMetrics.includes(m.id)
                              ? "bg-blue-500/15 border-blue-500/40 text-blue-300"
                              : "border-white/8 text-muted-foreground hover:border-white/20 hover:text-foreground"
                          }`}
                        >
                          <span className={`text-[9px] px-1 py-0.5 rounded font-bold uppercase tracking-wide flex-shrink-0 ${
                            m.tier === "efficiency"    ? "bg-green-500/20 text-green-400" :
                            m.tier === "effectiveness" ? "bg-blue-500/20 text-blue-400" :
                            "bg-purple-500/20 text-purple-400"
                          }`}>{m.tier.slice(0, 3)}</span>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* Voice capture */}
              <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                <p className="text-sm font-semibold text-foreground mb-1">
                  Anything else we should know about your context? <span className="text-muted-foreground font-normal">(Optional)</span>
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Board mandates, recent events, or constraints that should shape your strategy. Max 500 characters.
                </p>
                <Textarea
                  value={voiceCapture}
                  onChange={e => { if (e.target.value.length <= 500) { setVoiceCapture(e.target.value); setIsDirty(true); } }}
                  rows={3}
                  className="resize-none bg-white/4 border-white/10 text-sm placeholder:text-muted-foreground/50 focus:border-green-500/40"
                  placeholder="e.g. We have a board mandate to reduce HR headcount by 20% over 3 years. Our CHRO is new and wants quick wins before the end of Q1..."
                />
                <p className="text-xs text-muted-foreground mt-1.5 text-right">{voiceCapture.length}/500</p>
              </div>
            </div>

            <div className="flex justify-between mt-8 pt-4 border-t border-white/6">
              <Button variant="outline" onClick={() => goToStep(3)}>
                <ChevronLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <Button
                disabled={!step2Valid}
                onClick={() => goToStep(5)}
                className="bg-green-500 hover:bg-green-400 text-black font-semibold px-6"
              >
                Next: AI Draft
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            {!step2Valid && (
              <p className="text-xs text-muted-foreground text-right mt-2">
                Please select a leadership position, at least one process, and at least one governance principle.
              </p>
            )}
          </div>
        )}

        {/* ── Step 4: AI Draft ───────────────────────────────────────────── */}
        {step === 5 && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <h2 className="text-lg font-bold text-foreground">AI-Drafted Vision & Principles</h2>
              </div>
              <p className="text-sm text-muted-foreground ml-9">
                {hasGenerated
                  ? "Review and edit the AI-generated vision and principles. These will form the foundation of your HR AI strategy."
                  : "Click Generate to create your AI-drafted vision statement and guiding principles based on your inputs."}
              </p>
            </div>

            {!hasGenerated && (
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-8 text-center mb-6">
                <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground mb-1">Ready to generate your strategy</p>
                <p className="text-xs text-muted-foreground mb-5">
                  Based on your {sectorLabel} context, {businessOutcomes.length} outcomes, and {businessProblems.length} problems.
                </p>
                <Button
                  onClick={handleGenerate}
                  disabled={generateMut.isPending}
                  className="bg-purple-500 hover:bg-purple-400 text-white font-semibold px-8"
                >
                  {generateMut.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />Generate Vision & Principles</>
                  )}
                </Button>
              </div>
            )}

            {hasGenerated && (
              <div className="space-y-6">
                {/* Vision statement */}
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-foreground">Vision Statement</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerate}
                      disabled={generateMut.isPending}
                      className="text-xs h-7 px-3"
                    >
                      {generateMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                      Regenerate
                    </Button>
                  </div>
                  <Textarea
                    value={visionStatement}
                    onChange={e => { setVisionStatement(e.target.value); setIsDirty(true); }}
                    rows={4}
                    className="resize-none bg-white/4 border-white/10 text-sm focus:border-purple-500/40"
                  />
                </div>

                {/* Guiding principles */}
                {principles.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-3">Guiding Principles</p>
                    <div className="space-y-3">
                      {principles.map((p, i) => (
                        <PrincipleCard
                          key={i}
                          index={i}
                          title={p.title}
                          description={p.description}
                          onTitleChange={v => { setPrinciples(prev => prev.map((x, j) => j === i ? { ...x, title: v } : x)); setIsDirty(true); }}
                          onDescriptionChange={v => { setPrinciples(prev => prev.map((x, j) => j === i ? { ...x, description: v } : x)); setIsDirty(true); }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Won't do */}
                {wontDo.length > 0 && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
                    <p className="text-sm font-semibold text-foreground mb-3">What We Won't Do</p>
                    <ul className="space-y-2">
                      {wontDo.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-red-400 font-bold flex-shrink-0 mt-0.5">✕</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between mt-8 pt-4 border-t border-white/6">
              <Button variant="outline" onClick={() => goToStep(4)}>
                <ChevronLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <Button
                disabled={!step3Valid}
                onClick={() => goToStep(6)}
                className="bg-green-500 hover:bg-green-400 text-black font-semibold px-6"
              >
                Next: Select Initiatives
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 5: Initiatives ────────────────────────────────────────── */}
        {step === 6 && (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                  <ListPlus className="w-4 h-4 text-green-400" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Select Initiatives</h2>
              </div>
              <p className="text-sm text-muted-foreground ml-9">
                Choose the AI initiatives that will make up your strategy roadmap. You can adjust these later.
              </p>
            </div>

            {/* Ambition levels */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { label: "Business AI Ambition", levels: BUSINESS_LEVELS, value: businessLevel, onChange: (v: number) => { setBusinessLevel(v); setIsDirty(true); } },
                { label: "People AI Ambition", levels: PEOPLE_LEVELS, value: peopleLevel, onChange: (v: number) => { setPeopleLevel(v); setIsDirty(true); } },
              ].map(({ label, levels, value, onChange }) => (
                <div key={label} className="rounded-xl border border-white/8 bg-white/2 p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{label}</p>
                  <div className="flex gap-1.5 mb-2">
                    {[1,2,3,4,5].map(n => (
                      <button
                        key={n}
                        onClick={() => onChange(n)}
                        className={`flex-1 h-8 rounded-md text-xs font-bold transition-colors ${
                          n === value
                            ? "bg-green-500 text-black"
                            : n < value
                            ? "bg-green-500/20 text-green-400"
                            : "bg-white/4 text-muted-foreground hover:bg-white/8"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-foreground">{levels[value]?.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{levels[value]?.description}</p>
                </div>
              ))}
            </div>

            {/* Selected initiatives */}
            <div className="rounded-xl border border-white/8 bg-white/2 p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedIds.size} initiative{selectedIds.size !== 1 ? "s" : ""} selected</p>
                  <p className="text-xs text-muted-foreground">Recommended: 6–12 initiatives across 3 phases</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowLibrary(true)}
                  className="bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30 text-xs"
                >
                  <ListPlus className="w-3.5 h-3.5 mr-1.5" />
                  Browse Library
                </Button>
              </div>

              {selectedIds.size === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ListPlus className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No initiatives selected yet.</p>
                  <button
                    onClick={() => setShowLibrary(true)}
                    className="text-xs text-green-400 hover:text-green-300 mt-1 transition-colors"
                  >
                    Browse the initiative library →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {allInitiatives
                    .filter(i => selectedIds.has(i.id))
                    .map(init => {
                      const catColor = CATEGORY_COLOURS[CATEGORY_MAP[init.category] ?? init.category] ?? "#9CA3AF";
                      return (
                        <div
                          key={init.id}
                          className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/2 px-4 py-3"
                          style={{ borderLeftColor: catColor, borderLeftWidth: "3px" }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{init.name}</p>
                            <p className="text-xs text-muted-foreground">{CATEGORY_MAP[init.category] ?? init.category}</p>
                          </div>
                          <button
                            onClick={() => toggleInitiative(init.id)}
                            className="text-xs text-red-400/60 hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Commit */}
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5 mb-6">
              <p className="text-sm font-semibold text-foreground mb-1">Ready to commit your strategy?</p>
              <p className="text-xs text-muted-foreground mb-4">
                This will generate your full HR AI Strategy document with cost envelope, risk assessment, and initiative roadmap.
                You can update it at any time.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                {[
                  { label: "Sector", value: sectorLabel },
                  { label: "Risk Appetite", value: RISK_APPETITE_OPTIONS.find(r => r.value === riskAppetite)?.label ?? "—" },
                  { label: "Timeline", value: timelineMonths ? `${timelineMonths} months` : "—" },
                  { label: "Initiatives", value: `${selectedIds.size} selected` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-white/4 px-3 py-2">
                    <p className="text-muted-foreground">{label}</p>
                    <p className="text-foreground font-semibold mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-white/6">
              <Button variant="outline" onClick={() => goToStep(5)}>
                <ChevronLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <Button
                disabled={!step4Valid || saveMut.isPending}
                onClick={handleCommit}
                className="bg-green-500 hover:bg-green-400 text-black font-semibold px-8"
              >
                {saveMut.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Committing…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" />Commit Strategy</>
                )}
              </Button>
            </div>
            {!step4Valid && (
              <p className="text-xs text-muted-foreground text-right mt-2">
                Please select at least one initiative to continue.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Initiative library modal ─────────────────────────────────────── */}
      <InitiativeLibraryModal
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        allInitiatives={allInitiatives}
        selectedIds={selectedIds}
        onToggle={toggleInitiative}
      />
    </div>
  );
}
