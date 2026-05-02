/**
 * AiQ AI People Strategy Builder — v2
 * Feedback fixes:
 *  - Two-axis ambition controls (Business 4-level + People 4-level)
 *  - No tabs: all panels stacked vertically on single scrollable page
 *  - Initiative rows with decision authority badge, regulatory flag label,
 *    owning segments, criticality & quarter dropdowns inline
 *  - "+ Add an initiative not on the list" button below library
 *  - Filter chips aligned to spec categories
 *  - Warning triangles replaced with "EU AI Act high-risk" pill
 *  - Domain gap bars use monochrome (single accent colour)
 */
import React, { useState, useMemo, useCallback } from "react";
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
  Target,
  Plus,
  CheckCircle2,
  TrendingUp,
  Users,
  Layers,
  Shield,
  Lightbulb,
  X,
  Info,
  Zap,
  GitCompare,
  Rocket,
  Building2,
  ChevronDown,
  ChevronUp,
  GitBranch,
  BarChart3,
  XCircle,
  CalendarDays,
  Download,
} from "lucide-react";
import { toast } from "sonner";

// ─── Domain config ────────────────────────────────────────────────────────────
const DOMAINS = [
  { key: "interaction", label: "AI Interaction", short: "Interaction" },
  { key: "output_eval", label: "AI Output Evaluation", short: "Output Eval" },
  { key: "workflow", label: "AI Workflow Design", short: "Workflow" },
  { key: "workforce", label: "Workforce AI Readiness", short: "Workforce" },
  { key: "ethics", label: "AI Ethics & Trust", short: "Ethics" },
  { key: "change", label: "AI Change Leadership", short: "Change" },
];

// ─── Ambition level descriptors ───────────────────────────────────────────────
const BUSINESS_LEVELS: Record<number, { label: string; description: string }> = {
  1: { label: "Conservative", description: "AI used selectively in low-risk, back-office processes. Compliance and stability are the priority." },
  2: { label: "Cautious", description: "Piloting AI in specific workflows. Building internal confidence before wider rollout." },
  3: { label: "Augmenter", description: "AI embedded in core HR processes. The organisation expects HR to use AI tools confidently." },
  4: { label: "Pioneer", description: "AI is a strategic differentiator. HR is expected to lead AI adoption across the business." },
};

const PEOPLE_LEVELS: Record<number, { label: string; description: string }> = {
  1: { label: "Compliance", description: "HR people use AI tools as directed. Compliance with policy is the primary expectation." },
  2: { label: "Embedding", description: "HR people are expected to learn and use AI tools in their day-to-day work." },
  3: { label: "Capability-led", description: "HR people apply AI confidently, evaluate outputs critically, and adapt workflows." },
  4: { label: "Transformative", description: "HR people design AI-enabled processes, lead change, and shape the organisation's AI strategy." },
};

// Spec-aligned filter categories
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
  "Talent Acquisition": <Users className="w-3.5 h-3.5" />,
  "Learning & Development": <Lightbulb className="w-3.5 h-3.5" />,
  "Performance & Development": <TrendingUp className="w-3.5 h-3.5" />,
  "Performance & Engagement": <TrendingUp className="w-3.5 h-3.5" />,
  "Workforce Planning": <Layers className="w-3.5 h-3.5" />,
  "Pay & Reward": <Target className="w-3.5 h-3.5" />,
  "Reward & Compensation": <Target className="w-3.5 h-3.5" />,
  "HR Operations": <Zap className="w-3.5 h-3.5" />,
  "Ethics & Governance": <Shield className="w-3.5 h-3.5" />,
  "GenAI Workforce Rollout": <Zap className="w-3.5 h-3.5" />,
};

const QUARTER_OPTIONS = ["Q1 26", "Q2 26", "Q3 26", "Q4 26", "Q1 27", "Q2 27", "Q3 27", "Q4 27"];

const DA_LABELS: Record<string, string> = {
  recommends_to_human: "Recommends",
  human_in_loop: "Human-in-loop",
  full_automation: "Full automation",
};

const AI_TYPE_COLORS: Record<string, string> = {
  generative: "#A78BFA",
  predictive: "#60A5FA",
  automation: "#4ADE80",
  analytical: "#FBBF24",
  agentic: "#F472B6",
};


// ─── Four-question narrative frame ───────────────────────────────────────────
const STRATEGY_QUESTIONS = [
  { id: 1, label: "Where are we now?", description: "Set your industry context and ambition level" },
  { id: 2, label: "What does that mean?", description: "Review your capability baseline and gaps" },
  { id: 3, label: "What should we do?", description: "Select initiatives and see projected impact" },
  { id: 4, label: "What can we take to the board?", description: "Commit your strategy and export a board pack" },
];
function StrategyProgressBar({ selectedCount, isCommitted }: { selectedCount: number; isCommitted: boolean }) {
  const activeStep = isCommitted ? 4 : selectedCount > 0 ? 3 : 2;
  return (
    <div className="flex items-center gap-0 mb-6">
      {STRATEGY_QUESTIONS.map((q, i) => (
        <React.Fragment key={q.id}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            activeStep === q.id
              ? "bg-green-500/10 border border-green-500/30"
              : activeStep > q.id
              ? "opacity-60"
              : "opacity-30"
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              activeStep > q.id
                ? "bg-green-500 text-black"
                : activeStep === q.id
                ? "bg-green-500/20 text-green-400 border border-green-500/40"
                : "bg-white/5 text-muted-foreground border border-white/10"
            }`}>
              {activeStep > q.id ? "✓" : q.id}
            </div>
            <div className="hidden sm:block">
              <p className={`text-xs font-medium leading-tight ${activeStep === q.id ? "text-green-400" : "text-foreground"}`}>{q.label}</p>
              <p className="text-xs text-muted-foreground leading-tight">{q.description}</p>
            </div>
          </div>
          {i < STRATEGY_QUESTIONS.length - 1 && (
            <div className={`flex-1 h-px mx-1 ${activeStep > q.id + 1 ? "bg-green-500/40" : "bg-white/8"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Radar chart ─────────────────────────────────────────────────────────────
function RadarChart({
  baseline,
  target,
  compare,
  size = 280,
}: {
  baseline: number[];
  target: number[];
  compare?: number[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const n = 6;
  const angles = Array.from({ length: n }, (_, i) => (i * 2 * Math.PI) / n - Math.PI / 2);

  function point(val: number, idx: number) {
    const ratio = Math.max(0, Math.min(1, val / 5));
    return {
      x: cx + r * ratio * Math.cos(angles[idx]),
      y: cy + r * ratio * Math.sin(angles[idx]),
    };
  }

  function toPath(pts: { x: number; y: number }[]) {
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
  }

  const baselinePoints = baseline.map((v, i) => point(v, i));
  const targetPoints = target.map((v, i) => point(v, i));
  const comparePoints = compare?.map((v, i) => point(v, i));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[1, 2, 3, 4, 5].map(level => {
        const pts = angles.map(a => ({
          x: cx + r * (level / 5) * Math.cos(a),
          y: cy + r * (level / 5) * Math.sin(a),
        }));
        return (
          <polygon key={level} points={pts.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        );
      })}
      {angles.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      ))}
      {/* Baseline */}
      <path d={toPath(baselinePoints)} fill="rgba(96,165,250,0.12)" stroke="#60A5FA" strokeWidth="1.5" />
      {/* Target */}
      <path d={toPath(targetPoints)} fill="rgba(74,222,128,0.10)" stroke="#4ADE80" strokeWidth="2" strokeDasharray="5,3" />
      {/* Compare */}
      {comparePoints && (
        <path d={toPath(comparePoints)} fill="rgba(167,139,250,0.10)" stroke="#A78BFA" strokeWidth="1.5" strokeDasharray="3,2" />
      )}
      {baselinePoints.map((p, i) => <circle key={`b${i}`} cx={p.x} cy={p.y} r={3} fill="#60A5FA" />)}
      {targetPoints.map((p, i) => <circle key={`t${i}`} cx={p.x} cy={p.y} r={3.5} fill="#4ADE80" />)}
      {angles.map((a, i) => {
        const lx = cx + (r + 22) * Math.cos(a);
        const ly = cy + (r + 22) * Math.sin(a);
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="rgba(255,255,255,0.55)">
            {DOMAINS[i].short}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Gap table row (monochrome) ───────────────────────────────────────────────
function GapRow({ domain, baseline, target, gap }: { domain: string; baseline: number; target: number; gap: number }) {
  const baseWidth = Math.max(0, Math.min(100, (baseline / 5) * 100));
  const targetWidth = Math.max(0, Math.min(100, (target / 5) * 100));
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className="w-36 text-xs text-muted-foreground truncate">{domain}</div>
      <div className="flex-1 relative h-4 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="absolute top-0 left-0 h-full rounded" style={{ width: `${baseWidth}%`, background: "rgba(96,165,250,0.35)" }} />
        <div className="absolute top-0 left-0 h-full rounded" style={{ width: `${targetWidth}%`, background: "rgba(96,165,250,0.75)" }} />
      </div>
      <div className="w-10 text-right text-xs font-mono text-muted-foreground">{baseline.toFixed(1)}</div>
      <div className="w-10 text-right text-xs font-mono font-semibold text-blue-400">{target.toFixed(1)}</div>
      <div className="w-12 text-right text-xs font-mono text-green-400">
        {gap > 0 ? `+${gap.toFixed(1)}` : "—"}
      </div>
    </div>
  );
}

// ─── Initiative row ───────────────────────────────────────────────────────────
function InitiativeRow({
  initiative,
  selected,
  strategyInitiative,
  onToggle,
  onUpdateCriticality,
  onUpdateQuarter,
}: {
  initiative: any;
  selected: boolean;
  strategyInitiative?: any;
  onToggle: () => void;
  onUpdateCriticality?: (v: number) => void;
  onUpdateQuarter?: (v: string) => void;
}) {
  const typeColor = AI_TYPE_COLORS[initiative.aiType] ?? "#9CA3AF";
  const segments: string[] = initiative.owningSegmentsJson ?? [];

  return (
    <div
      className={`rounded-xl border transition-all duration-150 ${
        selected
          ? "border-green-500/40 bg-green-500/5"
          : "border-white/8 bg-white/2 hover:border-white/15 hover:bg-white/4"
      }`}
    >
      <div className="flex items-start gap-3 p-3.5">
        {/* Toggle checkbox */}
        <button
          onClick={onToggle}
          className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
            selected ? "bg-green-500 border-green-500" : "border-white/20 hover:border-white/40"
          }`}
        >
          {selected && <CheckCircle2 className="w-3 h-3 text-black" />}
        </button>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-sm font-medium text-foreground leading-snug">{initiative.name}</p>
            {/* Regulatory flag pill */}
            {initiative.regulatoryFlag && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 cursor-help whitespace-nowrap">
                      EU AI Act high-risk
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {initiative.regulatoryFlag}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Metadata row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* AI type */}
            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: `${typeColor}20`, color: typeColor }}>
              {initiative.aiType}
            </span>
            {/* Decision authority */}
            <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground border border-white/8">
              {DA_LABELS[initiative.decisionAuthority] ?? initiative.decisionAuthority}
            </span>
            {/* Owning segments */}
            {segments.slice(0, 2).map((seg: string) => (
              <span key={seg} className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground border border-white/8">
                {seg}
              </span>
            ))}
            {segments.length > 2 && (
              <span className="text-xs text-muted-foreground">+{segments.length - 2} more</span>
            )}
          </div>
        </div>

        {/* Criticality + Quarter (only when selected) */}
        {selected && strategyInitiative && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Select
              value={String(strategyInitiative.criticality)}
              onValueChange={v => onUpdateCriticality?.(parseInt(v))}
            >
              <SelectTrigger className="h-6 text-xs w-24 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Standard</SelectItem>
                <SelectItem value="2">Priority</SelectItem>
                <SelectItem value="3">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={strategyInitiative.targetQuarter}
              onValueChange={v => onUpdateQuarter?.(v)}
            >
              <SelectTrigger className="h-6 text-xs w-20 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUARTER_OPTIONS.map(q => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button onClick={onToggle} className="text-muted-foreground hover:text-red-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Custom initiative modal ──────────────────────────────────────────────────
function CustomInitiativeModal({
  open,
  onClose,
  tenantId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("HR Operations");
  const [aiType, setAiType] = useState("generative");
  const [decisionAuthority, setDecisionAuthority] = useState("recommends_to_human");
  const [weights, setWeights] = useState([0.3, 0.2, 0.2, 0.1, 0.1, 0.1]);

  const createMutation = trpc.strategy.createCustomInitiative.useMutation({
    onSuccess: ({ id }) => {
      toast.success("Custom initiative created");
      onCreated(id);
      onClose();
      setName(""); setDescription("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a Custom Initiative</DialogTitle>
          <DialogDescription>
            Define a bespoke AI initiative not in the standard library.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Initiative name *</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-white/30"
              placeholder="e.g. AI-Powered Succession Planning"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-white/30 resize-none"
              rows={3}
              placeholder="What does this initiative do and what outcome does it drive?"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FILTER_CATEGORIES.filter(c => c !== "All").map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">AI type</label>
              <Select value={aiType} onValueChange={setAiType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["generative", "predictive", "automation", "analytical", "agentic"].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Decision authority</label>
            <Select value={decisionAuthority} onValueChange={setDecisionAuthority}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recommends_to_human">Recommends to human</SelectItem>
                <SelectItem value="human_in_loop">Human in the loop</SelectItem>
                <SelectItem value="full_automation">Full automation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Domain impact weights (must sum to ~1.0)</label>
            <div className="space-y-1.5">
              {DOMAINS.map((d, i) => (
                <div key={d.key} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 truncate">{d.short}</span>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={weights[i]}
                    onChange={e => {
                      const newW = [...weights];
                      newW[i] = parseFloat(e.target.value);
                      setWeights(newW);
                    }}
                    className="flex-1 accent-green-400"
                  />
                  <span className="text-xs font-mono w-8 text-right text-muted-foreground">{weights[i].toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 bg-green-500 hover:bg-green-400 text-black font-semibold"
              disabled={!name.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  tenantId, name: name.trim(), description, category, aiType,
                  decisionAuthority, owningSegments: [], weights,
                  baseTarget: 3.5, complexity: 3, keywords: [],
                })
              }
            >
              {createMutation.isPending ? "Creating…" : "Create initiative"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Ambition selector ────────────────────────────────────────────────────────
function AmbitionSelector({
  label,
  value,
  levels,
  onChange,
}: {
  label: string;
  value: number;
  levels: Record<number, { label: string; description: string }>;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{label}</p>
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map(level => (
          <TooltipProvider key={level}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onChange(level)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all border ${
                    value === level
                      ? "bg-green-500/20 border-green-500/50 text-green-400"
                      : "border-white/8 text-muted-foreground hover:border-white/20 hover:text-foreground"
                  }`}
                >
                  {levels[level].label}
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                {levels[level].description}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StrategyBuilderPage() {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? "";
  const utils = trpc.useUtils();

  const [activeStrategyId, setActiveStrategyId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareStrategyId, setCompareStrategyId] = useState<string | null>(null);
  const [riskExpanded, setRiskExpanded] = useState(true);
  const [patternsExpanded, setPatternsExpanded] = useState(true);

  // ── Queries ──
  const industriesQ = trpc.strategy.listIndustries.useQuery();
  const initiativesQ = trpc.strategy.listInitiatives.useQuery({ tenantId });
  const strategiesQ = trpc.strategy.listStrategies.useQuery({ tenantId });
  const strategyQ = trpc.strategy.getStrategy.useQuery(
    { strategyId: activeStrategyId! },
    { enabled: !!activeStrategyId }
  );
  const compareStrategyQ = trpc.strategy.getStrategy.useQuery(
    { strategyId: compareStrategyId! },
    { enabled: !!compareStrategyId && compareMode }
  );
  const patternsQ = trpc.strategy.getPatterns.useQuery();

  const baselineScores = useMemo(() => [2.8, 2.6, 2.4, 2.5, 2.7, 2.3], []);

  const outputQ = trpc.strategy.computeOutput.useQuery(
    { strategyId: activeStrategyId!, baselineScores },
    { enabled: !!activeStrategyId }
  );
  const compareOutputQ = trpc.strategy.computeOutput.useQuery(
    { strategyId: compareStrategyId!, baselineScores },
    { enabled: !!compareStrategyId && compareMode }
  );

  // ── Mutations ──
  const createStrategyMut = trpc.strategy.createStrategy.useMutation({
    onSuccess: ({ id }) => {
      setActiveStrategyId(id);
      utils.strategy.listStrategies.invalidate();
      toast.success("New strategy created");
    },
    onError: e => toast.error(e.message),
  });

  const toggleInitMut = trpc.strategy.toggleInitiative.useMutation({
    onSuccess: () => {
      utils.strategy.getStrategy.invalidate({ strategyId: activeStrategyId! });
      utils.strategy.computeOutput.invalidate({ strategyId: activeStrategyId! });
    },
    onError: e => toast.error(e.message),
  });

  const updateStrategyMut = trpc.strategy.updateStrategy.useMutation({
    onSuccess: () => {
      utils.strategy.getStrategy.invalidate({ strategyId: activeStrategyId! });
      utils.strategy.computeOutput.invalidate({ strategyId: activeStrategyId! });
    },
  });

  const updateInitiativeMut = trpc.strategy.updateInitiative.useMutation({
    onSuccess: () => {
      utils.strategy.getStrategy.invalidate({ strategyId: activeStrategyId! });
      utils.strategy.computeOutput.invalidate({ strategyId: activeStrategyId! });
    },
    onError: e => toast.error(e.message),
  });

  const commitMut = trpc.strategy.commitStrategy.useMutation({
    onSuccess: () => {
      utils.strategy.listStrategies.invalidate();
      utils.strategy.getStrategy.invalidate({ strategyId: activeStrategyId! });
      setShowCommitDialog(false);
      toast.success("Strategy committed to roadmap!");
    },
    onError: e => toast.error(e.message),
  });

  // ── Derived ──
  const strategy = strategyQ.data?.strategy;
  const industry = strategyQ.data?.industry;
  const selectedInitiativeIds = useMemo(
    () => new Set((strategyQ.data?.initiatives ?? []).map(i => i.initiativeId)),
    [strategyQ.data]
  );
  const selectedInitiativeMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const si of strategyQ.data?.initiatives ?? []) {
      map[si.initiativeId] = si;
    }
    return map;
  }, [strategyQ.data]);

  const allInitiatives = initiativesQ.data ?? [];

  // Map seeded categories to spec filter categories
  const CATEGORY_MAP: Record<string, string> = {
    "Talent Acquisition": "Talent Acquisition",
    "Learning & Development": "Learning & Development",
    "Performance & Engagement": "Performance & Development",
    "Performance & Development": "Performance & Development",
    "Workforce Planning": "Workforce Planning",
    "Reward & Compensation": "Pay & Reward",
    "Pay & Reward": "Pay & Reward",
    "HR Operations": "HR Operations",
    "Ethics & Governance": "Ethics & Governance",
  };

  const filteredInitiatives = useMemo(() => {
    if (categoryFilter === "All") return allInitiatives;
    if (categoryFilter === "Custom") return allInitiatives.filter(i => i.isUserDefined);
    return allInitiatives.filter(i => {
      const mapped = CATEGORY_MAP[i.category] ?? i.category;
      return mapped === categoryFilter;
    });
  }, [allInitiatives, categoryFilter]);

  const output = outputQ.data;
  const compareOutput = compareOutputQ.data;

  // ── Handlers ──
  const handleCreateStrategy = useCallback(() => {
    const industries = industriesQ.data ?? [];
    const defaultIndustry = industries[0];
    if (!defaultIndustry) return;
    const existingCount = (strategiesQ.data ?? []).length;
    const slot = (["A", "B", "C"] as const)[Math.min(existingCount, 2)];
    createStrategyMut.mutate({
      tenantId,
      name: `Strategy ${slot}`,
      industryId: defaultIndustry.id,
      businessAmbition: 2,
      peopleAmbition: 2,
      slot,
    });
  }, [tenantId, industriesQ.data, strategiesQ.data, createStrategyMut]);

  const handleToggleInitiative = useCallback(
    (initiativeId: string) => {
      if (!activeStrategyId) return;
      toggleInitMut.mutate({
        strategyId: activeStrategyId,
        initiativeId,
        criticality: 1,
        targetQuarter: "Q2 26",
        targetQuarterOffset: 6,
      });
    },
    [activeStrategyId, toggleInitMut]
  );

  // ── No strategy yet ──
  if (!activeStrategyId && (strategiesQ.data?.length ?? 0) === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">AI People Strategy Builder</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Build a data-driven AI people strategy. Select initiatives from the library,
            see projected capability gains, and commit to a roadmap.
          </p>
        </div>
        <Button
          className="bg-green-500 hover:bg-green-400 text-black font-semibold px-6"
          onClick={handleCreateStrategy}
          disabled={createStrategyMut.isPending || !industriesQ.data?.length}
        >
          <Plus className="w-4 h-4 mr-2" />
          {createStrategyMut.isPending ? "Creating…" : "Create your first strategy"}
        </Button>
      </div>
    );
  }

  if (!activeStrategyId && (strategiesQ.data?.length ?? 0) > 0) {
    setActiveStrategyId(strategiesQ.data![0].id);
    return null;
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">AI People Strategy Builder</p>
          <h1 className="text-2xl font-bold text-foreground">{strategy?.name ?? "Loading…"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {industry?.name ?? ""} · {selectedInitiativeIds.size} initiatives selected · {output?.riskCount ?? 0} risk items
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {(strategiesQ.data?.length ?? 0) > 0 && (
            <Select value={activeStrategyId ?? ""} onValueChange={setActiveStrategyId}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                {strategiesQ.data?.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.status === "committed" ? " ✓" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(strategiesQ.data?.length ?? 0) > 1 && (
            <Button
              variant="outline" size="sm"
              className={compareMode ? "border-green-500 text-green-400" : ""}
              onClick={() => setCompareMode(!compareMode)}
            >
              <GitCompare className="w-3.5 h-3.5 mr-1.5" />
              Compare
            </Button>
          )}
          {(strategiesQ.data?.length ?? 0) < 3 && (
            <Button variant="outline" size="sm" onClick={handleCreateStrategy} disabled={createStrategyMut.isPending}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New
            </Button>
          )}
          {strategy?.status === "draft" && (
            <Button size="sm" className="bg-green-500 hover:bg-green-400 text-black font-semibold" onClick={() => setShowCommitDialog(true)}>
              <Rocket className="w-3.5 h-3.5 mr-1.5" />
              Commit to roadmap
            </Button>
          )}
          {strategy?.status === "committed" && (
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Committed
              </Badge>
              <button
                onClick={() => {
                  const bpLines: string[] = [];
                  bpLines.push("AI PEOPLE STRATEGY \u2014 BOARD PACK");
                  bpLines.push("=".repeat(50));
                  bpLines.push(`Strategy: ${strategy?.name ?? ""}`);
                  bpLines.push(`Industry: ${industry?.name ?? ""}`);
                  bpLines.push(`Initiatives selected: ${selectedInitiativeIds.size}`);
                  bpLines.push("");
                  const mm = (output as any)?.maturityMatrix;
                  if (mm) {
                    bpLines.push("MATURITY POSITION"); bpLines.push("-".repeat(30));
                    bpLines.push(`Archetype: ${mm.archetype}`);
                    bpLines.push(mm.archetypeDescription);
                    bpLines.push(`Capability Foundations: ${mm.capabilityFoundations}%`);
                    bpLines.push(`Adoption Intensity: ${mm.adoptionIntensity}%`);
                    bpLines.push("");
                  }
                  const currentPath = ((output as any)?.strategicPaths as any[])?.find((p: any) => p.isCurrentPath);
                  if (currentPath) {
                    bpLines.push("STRATEGIC PATH"); bpLines.push("-".repeat(30));
                    bpLines.push(`Path: ${currentPath.name}`);
                    bpLines.push(currentPath.rationale);
                    bpLines.push("");
                  }
                  bpLines.push("DOMAIN GAP ANALYSIS"); bpLines.push("-".repeat(30));
                  (output?.gaps ?? []).forEach((g: any) => {
                    bpLines.push(`${g.domain}: Baseline ${g.baseline.toFixed(1)} \u2192 Target ${g.target.toFixed(1)} (Gap: +${g.gap.toFixed(1)})`);
                  });
                  bpLines.push("");
                  bpLines.push("RISK REGISTER"); bpLines.push("-".repeat(30));
                  (output?.riskItems ?? []).forEach((r: any) => {
                    bpLines.push(`[${r.severity.toUpperCase()}] ${r.initiativeName}: ${r.regulatoryFlag}`);
                    bpLines.push(`  Mitigation: ${r.mitigation} | Owner: ${r.ownerRole} | Review: ${r.reviewCadence}`);
                  });
                  bpLines.push("");
                  bpLines.push("90-DAY ACTION PLAN"); bpLines.push("-".repeat(30));
                  ((output as any)?.ninetyDayPlan as any[] ?? []).forEach((wave: any) => {
                    bpLines.push(`\n${wave.label.toUpperCase()}`);
                    wave.actions.forEach((a: any) => bpLines.push(`  - ${a.action} (${a.owner})`));
                  });
                  bpLines.push("");
                  bpLines.push("STOP-DOING REGISTER"); bpLines.push("-".repeat(30));
                  ((output as any)?.stopDoing as any[] ?? []).forEach((s: any) => {
                    bpLines.push(`STOP: ${s.practice}`);
                    bpLines.push(`  ${s.reason}`);
                  });
                  const blob = new Blob([bpLines.join("\n")], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${(strategy?.name ?? "strategy").replace(/\s+/g, "-")}-board-pack.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Board pack exported");
                }}
                className="text-xs px-2.5 py-1 rounded-lg border border-white/15 text-muted-foreground hover:border-green-500/40 hover:text-green-400 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3 h-3" />
                Export board pack
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Context: Industry + Two-axis ambition ── */}
      <div className="space-y-3">
        {/* Industry */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">Industry</p>
            <Select
              value={strategy?.industryId ?? ""}
              onValueChange={v => updateStrategyMut.mutate({ strategyId: activeStrategyId!, industryId: v })}
            >
              <SelectTrigger className="h-7 text-sm border-0 bg-transparent p-0 focus:ring-0 w-auto">
                <SelectValue placeholder="Select industry…" />
              </SelectTrigger>
              <SelectContent>
                {industriesQ.data?.map(ind => (
                  <SelectItem key={ind.id} value={ind.id}>{ind.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Four-question narrative progress ── */}
        <StrategyProgressBar
          selectedCount={selectedInitiativeIds.size}
          isCommitted={strategy?.status === "committed"}
        />
        {/* Business ambition */}
        <AmbitionSelector
          label="Business AI Ambition — how aggressively the organisation adopts AI"
          value={strategy?.businessAmbition ?? 2}
          levels={BUSINESS_LEVELS}
          onChange={v => updateStrategyMut.mutate({ strategyId: activeStrategyId!, businessAmbition: v })}
        />

        {/* People ambition */}
        <AmbitionSelector
          label="People AI Ambition — what is expected of HR people"
          value={strategy?.peopleAmbition ?? 2}
          levels={PEOPLE_LEVELS}
          onChange={v => updateStrategyMut.mutate({ strategyId: activeStrategyId!, peopleAmbition: v })}
        />
      </div>

      {/* ── Main layout: left picker + right stacked panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left: Initiative library ── */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Initiative Library</h2>
            {/* Category filter chips */}
            <div className="flex gap-1.5 flex-wrap">
              {FILTER_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    categoryFilter === cat
                      ? "border-green-500/60 bg-green-500/10 text-green-400"
                      : "border-white/10 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Initiative rows */}
          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {initiativesQ.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
            ) : filteredInitiatives.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No initiatives in this category.</div>
            ) : (
              filteredInitiatives.map(init => (
                <InitiativeRow
                  key={init.id}
                  initiative={init}
                  selected={selectedInitiativeIds.has(init.id)}
                  strategyInitiative={selectedInitiativeMap[init.id]}
                  onToggle={() => handleToggleInitiative(init.id)}
                  onUpdateCriticality={v =>
                    updateInitiativeMut.mutate({
                      strategyInitiativeId: selectedInitiativeMap[init.id]?.id,
                      criticality: v,
                    })
                  }
                  onUpdateQuarter={v =>
                    updateInitiativeMut.mutate({
                      strategyInitiativeId: selectedInitiativeMap[init.id]?.id,
                      targetQuarter: v,
                    })
                  }
                />
              ))
            )}
          </div>

          {/* Add custom initiative — below library, full width */}
          <button
            onClick={() => setShowCustomModal(true)}
            className="w-full py-2.5 rounded-xl border border-dashed border-white/15 text-xs text-muted-foreground hover:border-green-500/40 hover:text-green-400 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add an initiative not on the list
          </button>
        </div>

        {/* ── Right: Stacked output panels ── */}
        <div className="lg:col-span-3 space-y-6">

          {/* ── 1. Capability Radar ── */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Capability Radar</h3>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-blue-400 inline-block" />
                  Baseline
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 inline-block" style={{ borderTop: "2px dashed #4ADE80", background: "none" }} />
                  Target
                </span>
                {compareMode && compareOutput && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-purple-400 inline-block" />
                    Compare
                  </span>
                )}
              </div>
            </div>
            {outputQ.isLoading ? (
              <Skeleton className="h-64 w-64 mx-auto rounded-full" />
            ) : (
              <div className="flex justify-center">
                <RadarChart
                  baseline={output?.baselineScores ?? baselineScores}
                  target={output?.targetScores ?? baselineScores}
                  compare={compareMode && compareOutput ? compareOutput.targetScores : undefined}
                  size={280}
                />
              </div>
            )}
          </div>

          {/* ── 2. Domain Gap Analysis ── */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Domain Gap Analysis</h3>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Baseline</span>
                <span>Target</span>
                <span>Δ</span>
              </div>
            </div>
            {outputQ.isLoading ? (
              <Skeleton className="h-40" />
            ) : (
              <div>
                {(output?.gaps ?? []).map(g => (
                  <GapRow key={g.key} domain={g.domain} baseline={g.baseline} target={g.target} gap={g.gap} />
                ))}
              </div>
            )}
          </div>

          {/* ── 3. HR Segment Demand ── */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">HR Segment Demand</h3>
            {outputQ.isLoading ? (
              <Skeleton className="h-32" />
            ) : (
              <div className="space-y-2">
                {(output?.segmentDemand ?? []).map(seg => (
                  <div key={seg.segment} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-44 truncate">{seg.segment}</span>
                    <div className="flex-1 h-3 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${Math.min(100, (seg.initiatives / Math.max(1, allInitiatives.length)) * 300)}%`,
                          background: "#60A5FA",
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-6 text-right">{seg.initiatives}</span>
                    <span className="text-xs text-muted-foreground w-20 text-right">
                      {seg.initiatives > 0 ? `Complexity ${seg.avgComplexity}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 4. Compare panel (only when compare mode active) ── */}
          {compareMode && (
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Compare Strategy</h3>
                <Select value={compareStrategyId ?? ""} onValueChange={setCompareStrategyId}>
                  <SelectTrigger className="h-7 text-xs w-36">
                    <SelectValue placeholder="Select strategy…" />
                  </SelectTrigger>
                  <SelectContent>
                    {strategiesQ.data?.filter(s => s.id !== activeStrategyId).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {compareStrategyId && compareOutput ? (
                <div className="space-y-1">
                  {compareOutput.gaps.map((g, i) => {
                    const mainGap = output?.gaps[i]?.gap ?? 0;
                    const diff = g.gap - mainGap;
                    return (
                      <div key={g.key} className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground w-36 truncate">{g.domain}</span>
                        <span className="font-mono">Target: {g.target.toFixed(1)}</span>
                        <span className="font-mono ml-auto" style={{ color: diff > 0 ? "#4ADE80" : diff < 0 ? "#F87171" : "#9CA3AF" }}>
                          {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} vs {strategy?.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Select a strategy to compare.</p>
              )}
            </div>
          )}

          {/* ── 5. Risk Register ── */}
          <div className="rounded-xl border border-white/8 bg-white/3">
            <button
              className="w-full flex items-center justify-between p-5 text-left"
              onClick={() => setRiskExpanded(!riskExpanded)}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Risk Register</h3>
                {(output?.riskItems?.length ?? 0) > 0 && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                    {output!.riskItems.length}
                  </Badge>
                )}
              </div>
              {riskExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {riskExpanded && (
              <div className="px-5 pb-5">
                {outputQ.isLoading ? (
                  <Skeleton className="h-40" />
                ) : (output?.riskItems ?? []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="w-7 h-7 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No regulatory risks identified.</p>
                    <p className="text-xs mt-1">Add initiatives with regulatory flags to see risks here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {output!.riskItems.map((risk, i) => (
                      <div key={i} className={`p-4 rounded-xl border ${risk.severity === "high" ? "border-red-500/30 bg-red-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-foreground">{risk.initiativeName}</p>
                          <Badge className={risk.severity === "high" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}>
                            {risk.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{risk.regulatoryFlag}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Mitigation: </span><span className="text-foreground">{risk.mitigation}</span></div>
                          <div><span className="text-muted-foreground">Owner: </span><span className="text-foreground">{risk.ownerRole}</span></div>
                          <div><span className="text-muted-foreground">Review: </span><span className="text-foreground">{risk.reviewCadence}</span></div>
                          <div><span className="text-muted-foreground">Launch: </span><span className="text-foreground">{risk.launchQuarter}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── 6. Strategic Patterns ── */}
          <div className="rounded-xl border border-white/8 bg-white/3">
            <button
              className="w-full flex items-center justify-between p-5 text-left"
              onClick={() => setPatternsExpanded(!patternsExpanded)}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Strategic Patterns</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Patterns are pre-defined initiative bundles that deliver a coherent strategic outcome. Matched patterns appear when you have selected all required initiatives.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {(output?.matchedPatterns?.length ?? 0) > 0 && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    {output!.matchedPatterns.length} matched
                  </Badge>
                )}
              </div>
              {patternsExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {patternsExpanded && (
              <div className="px-5 pb-5">
                {patternsQ.isLoading ? (
                  <Skeleton className="h-40" />
                ) : (
                  <div className="space-y-3">
                    {(patternsQ.data ?? []).map(pattern => {
                      const isMatched = output?.matchedPatterns.some(p => p.id === pattern.id);
                      const missingCount = pattern.minInitiatives.filter(id => !selectedInitiativeIds.has(id)).length;
                      return (
                        <div key={pattern.id} className={`p-4 rounded-xl border transition-all ${isMatched ? "border-green-500/40 bg-green-500/5" : "border-white/8 bg-white/2"}`}>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-foreground">{pattern.name}</p>
                            {isMatched ? (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Matched
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">{missingCount} more needed</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{pattern.description}</p>
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {pattern.domains.map(d => {
                              const dom = DOMAINS.find(x => x.key === d);
                              return dom ? (
                                <span key={d} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">
                                  {dom.short}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>


          {/* ── 6. Three Strategic Paths ── */}
          {output && (output as any).strategicPaths && (
            <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-foreground">Three Strategic Paths</h3>
                <span className="text-xs text-muted-foreground ml-auto">Your current selection aligns to the highlighted path</span>
              </div>
              <div className="px-5 pb-5 space-y-3">
                {((output as any).strategicPaths as any[]).map((path: any) => (
                  <div key={path.id} className={`p-4 rounded-xl border transition-all ${
                    path.isCurrentPath
                      ? "border-green-500/40 bg-green-500/5"
                      : "border-white/8 bg-white/2"
                  }`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-foreground">{path.name}</p>
                      {path.isCurrentPath && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 flex-shrink-0">
                          Your path
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{path.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 7. 2x2 Maturity Matrix ── */}
          {output && (output as any).maturityMatrix && (
            <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-foreground">Organisational Maturity Position</h3>
              </div>
              <div className="px-5 pb-5">
                {(() => {
                  const mm = (output as any).maturityMatrix;
                  const archetypeColors: Record<string, string> = {
                    "AI Leader": "text-green-400 border-green-500/40 bg-green-500/5",
                    "Solid Foundation": "text-blue-400 border-blue-500/40 bg-blue-500/5",
                    "Fast Mover": "text-amber-400 border-amber-500/40 bg-amber-500/5",
                    "Emerging": "text-muted-foreground border-white/15 bg-white/3",
                  };
                  const cls = archetypeColors[mm.archetype] ?? "text-foreground border-white/15 bg-white/3";
                  return (
                    <div className="space-y-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold ${cls}`}>
                        <Target className="w-4 h-4" />
                        {mm.archetype}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{mm.archetypeDescription}</p>
                      <div className="w-full max-w-[260px] mx-auto">
                        <div className="grid grid-cols-2 grid-rows-2 gap-1.5">
                          {[
                            { label: "Solid Foundation", sub: "High CF · Low AI", color: "bg-blue-500/8 border-blue-500/15" },
                            { label: "AI Leader", sub: "High CF · High AI", color: "bg-green-500/8 border-green-500/15" },
                            { label: "Emerging", sub: "Low CF · Low AI", color: "bg-white/3 border-white/8" },
                            { label: "Fast Mover", sub: "Low CF · High AI", color: "bg-amber-500/8 border-amber-500/15" },
                          ].map(cell => {
                            const isActive = cell.label === mm.archetype;
                            return (
                              <div key={cell.label} className={`rounded-lg border p-3 flex flex-col justify-center items-center text-center transition-all ${cell.color} ${isActive ? "ring-1 ring-green-400/50" : "opacity-40"}`}>
                                <p className={`text-xs font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{cell.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{cell.sub}</p>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
                          <span>← Low Adoption</span>
                          <span>High Adoption →</span>
                        </div>
                      </div>
                      <div className="space-y-2 mt-2">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Capability Foundations</span>
                            <span className="text-foreground font-mono">{mm.capabilityFoundations}%</span>
                          </div>
                          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${mm.capabilityFoundations}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Adoption Intensity</span>
                            <span className="text-foreground font-mono">{mm.adoptionIntensity}%</span>
                          </div>
                          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${mm.adoptionIntensity}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ── 8. Stop-doing register ── */}
          {output && (output as any).stopDoing && ((output as any).stopDoing as any[]).length > 0 && (
            <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-semibold text-foreground">Stop-Doing Register</h3>
                <span className="ml-auto text-xs text-muted-foreground">{((output as any).stopDoing as any[]).length} practices to retire</span>
              </div>
              <div className="px-5 pb-5 space-y-2">
                {((output as any).stopDoing as any[]).map((item: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg border border-red-500/15 bg-red-500/5">
                    <p className="text-xs font-medium text-foreground mb-0.5 line-through decoration-red-400/50">{item.practice}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 9. 90-day plan (shown when strategy is committed) ── */}
          {strategy?.status === "committed" && output && (output as any).ninetyDayPlan && ((output as any).ninetyDayPlan as any[]).length > 0 && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-green-400">90-Day Action Plan</h3>
                <span className="ml-auto text-xs text-muted-foreground">First steps to execution</span>
              </div>
              <div className="px-5 pb-5 space-y-4">
                {((output as any).ninetyDayPlan as any[]).map((wave: any) => (
                  <div key={wave.wave}>
                    <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">{wave.label}</p>
                    <div className="space-y-1.5">
                      {wave.actions.map((action: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-white/3 border border-white/8">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground leading-relaxed">{action.action}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Owner: {action.owner}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Commit dialog ── */}
      <Dialog open={showCommitDialog} onOpenChange={setShowCommitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Commit Strategy to Roadmap</DialogTitle>
            <DialogDescription>
              This will lock the strategy and create a committed roadmap. You can still create new strategy variants to compare.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="rounded-xl border border-white/8 bg-white/3 p-4 text-sm">
              <p className="font-medium text-foreground mb-1">{strategy?.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedInitiativeIds.size} initiatives · {output?.riskCount ?? 0} risk items · {industry?.name}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCommitDialog(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-green-500 hover:bg-green-400 text-black font-semibold"
                disabled={commitMut.isPending}
                onClick={() => commitMut.mutate({ strategyId: activeStrategyId! })}
              >
                {commitMut.isPending ? "Committing…" : "Commit strategy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Custom initiative modal ── */}
      <CustomInitiativeModal
        open={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        tenantId={tenantId}
        onCreated={id => {
          utils.strategy.listInitiatives.invalidate();
          if (activeStrategyId) {
            toggleInitMut.mutate({
              strategyId: activeStrategyId,
              initiativeId: id,
              criticality: 1,
              targetQuarter: "Q2 26",
              targetQuarterOffset: 6,
            });
          }
        }}
      />
    </div>
  );
}
