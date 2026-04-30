/**
 * AiQ AI People Strategy Builder
 * Full implementation: context controls, initiative picker, radar, gap table,
 * segment demand, sequencing, risk register, strategic patterns, compare mode.
 */
import { useState, useMemo, useCallback } from "react";
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
  AlertTriangle,
  TrendingUp,
  Users,
  Layers,
  Shield,
  Lightbulb,
  ChevronRight,
  X,
  Info,
  Zap,
  GitCompare,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";

// ─── Domain config ────────────────────────────────────────────────────────────
const DOMAINS = [
  { key: "interaction", label: "AI Interaction", short: "Interaction", color: "#60A5FA" },
  { key: "output_eval", label: "AI Output Evaluation", short: "Output Eval", color: "#F472B6" },
  { key: "workflow", label: "AI Workflow Design", short: "Workflow", color: "#4ADE80" },
  { key: "workforce", label: "Workforce AI Readiness", short: "Workforce", color: "#FBBF24" },
  { key: "ethics", label: "AI Ethics & Trust", short: "Ethics", color: "#A78BFA" },
  { key: "change", label: "AI Change Leadership", short: "Change", color: "#34D399" },
];

const AMBITION_LABELS: Record<number, string> = {
  1: "Conservative",
  2: "Balanced",
  3: "Ambitious",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Talent Acquisition": <Users className="w-3.5 h-3.5" />,
  "Learning & Development": <Lightbulb className="w-3.5 h-3.5" />,
  "Performance & Engagement": <TrendingUp className="w-3.5 h-3.5" />,
  "Workforce Planning": <Layers className="w-3.5 h-3.5" />,
  "Reward & Compensation": <Target className="w-3.5 h-3.5" />,
  "HR Operations": <Zap className="w-3.5 h-3.5" />,
  "Ethics & Governance": <Shield className="w-3.5 h-3.5" />,
};

// ─── Radar chart ─────────────────────────────────────────────────────────────
function RadarChart({
  baseline,
  target,
  size = 280,
}: {
  baseline: number[];
  target: number[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const n = 6;
  const angles = Array.from({ length: n }, (_, i) => (i * 2 * Math.PI) / n - Math.PI / 2);

  function point(val: number, idx: number, maxVal = 5) {
    const ratio = Math.max(0, Math.min(1, val / maxVal));
    const angle = angles[idx];
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
    };
  }

  const gridLevels = [1, 2, 3, 4, 5];
  const baselinePoints = baseline.map((v, i) => point(v, i));
  const targetPoints = target.map((v, i) => point(v, i));

  function toPath(pts: { x: number; y: number }[]) {
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {gridLevels.map(level => {
        const pts = angles.map(a => ({
          x: cx + r * (level / 5) * Math.cos(a),
          y: cy + r * (level / 5) * Math.sin(a),
        }));
        return (
          <polygon
            key={level}
            points={pts.map(p => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        );
      })}
      {/* Axes */}
      {angles.map((a, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={cx + r * Math.cos(a)}
          y2={cy + r * Math.sin(a)}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
      ))}
      {/* Baseline polygon */}
      <path
        d={toPath(baselinePoints)}
        fill="rgba(96,165,250,0.15)"
        stroke="#60A5FA"
        strokeWidth="1.5"
      />
      {/* Target polygon */}
      <path
        d={toPath(targetPoints)}
        fill="rgba(74,222,128,0.12)"
        stroke="#4ADE80"
        strokeWidth="2"
        strokeDasharray="5,3"
      />
      {/* Dots */}
      {baselinePoints.map((p, i) => (
        <circle key={`b${i}`} cx={p.x} cy={p.y} r={3} fill="#60A5FA" />
      ))}
      {targetPoints.map((p, i) => (
        <circle key={`t${i}`} cx={p.x} cy={p.y} r={3.5} fill="#4ADE80" />
      ))}
      {/* Labels */}
      {angles.map((a, i) => {
        const lx = cx + (r + 22) * Math.cos(a);
        const ly = cy + (r + 22) * Math.sin(a);
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fill="rgba(255,255,255,0.6)"
          >
            {DOMAINS[i].short}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Gap table row ────────────────────────────────────────────────────────────
function GapRow({
  domain,
  baseline,
  target,
  gap,
  color,
}: {
  domain: string;
  baseline: number;
  target: number;
  gap: number;
  color: string;
}) {
  const barWidth = Math.max(0, Math.min(100, (target / 5) * 100));
  const baseWidth = Math.max(0, Math.min(100, (baseline / 5) * 100));
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className="w-32 text-xs text-muted-foreground truncate">{domain}</div>
      <div className="flex-1 relative h-5 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        {/* Baseline */}
        <div
          className="absolute top-0 left-0 h-full rounded opacity-50"
          style={{ width: `${baseWidth}%`, background: color }}
        />
        {/* Target */}
        <div
          className="absolute top-0 left-0 h-full rounded"
          style={{ width: `${barWidth}%`, background: color, opacity: 0.85 }}
        />
      </div>
      <div className="w-10 text-right text-xs font-mono text-muted-foreground">{baseline.toFixed(1)}</div>
      <div className="w-10 text-right text-xs font-mono font-semibold" style={{ color }}>{target.toFixed(1)}</div>
      <div className="w-12 text-right text-xs font-mono" style={{ color: gap > 0 ? "#4ADE80" : "#9CA3AF" }}>
        {gap > 0 ? `+${gap.toFixed(1)}` : gap.toFixed(1)}
      </div>
    </div>
  );
}

// ─── Initiative card ──────────────────────────────────────────────────────────
function InitiativeCard({
  initiative,
  selected,
  onToggle,
}: {
  initiative: any;
  selected: boolean;
  onToggle: () => void;
}) {
  const AI_TYPE_COLORS: Record<string, string> = {
    generative: "#A78BFA",
    predictive: "#60A5FA",
    automation: "#4ADE80",
    analytical: "#FBBF24",
    agentic: "#F472B6",
  };
  const typeColor = AI_TYPE_COLORS[initiative.aiType] ?? "#9CA3AF";

  return (
    <div
      onClick={onToggle}
      className={`relative p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
        selected
          ? "border-green-500/60 bg-green-500/8"
          : "border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/5"
      }`}
    >
      {selected && (
        <CheckCircle2 className="absolute top-2.5 right-2.5 w-4 h-4 text-green-400" />
      )}
      <div className="flex items-start gap-2 mb-2">
        <span
          className="text-xs px-1.5 py-0.5 rounded font-medium"
          style={{ background: `${typeColor}22`, color: typeColor }}
        >
          {initiative.aiType}
        </span>
        {initiative.regulatoryFlag && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                {initiative.regulatoryFlag}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <p className="text-sm font-medium text-foreground leading-snug mb-1 pr-5">
        {initiative.name}
      </p>
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {initiative.description}
      </p>
      <div className="flex items-center gap-2 mt-2.5">
        <span className="text-xs text-muted-foreground">Complexity</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-sm"
              style={{
                background: i < initiative.complexity ? typeColor : "rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </div>
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
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Custom Initiative</DialogTitle>
          <DialogDescription>
            Define a bespoke AI initiative for your organisation.
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
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(CATEGORY_ICONS).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">AI type</label>
              <Select value={aiType} onValueChange={setAiType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
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
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommends_to_human">Recommends to human</SelectItem>
                <SelectItem value="human_in_loop">Human in the loop</SelectItem>
                <SelectItem value="full_automation">Full automation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">
              Domain impact weights (must sum to ~1.0)
            </label>
            <div className="space-y-1.5">
              {DOMAINS.map((d, i) => (
                <div key={d.key} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 truncate">{d.short}</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={weights[i]}
                    onChange={e => {
                      const newW = [...weights];
                      newW[i] = parseFloat(e.target.value);
                      setWeights(newW);
                    }}
                    className="flex-1 accent-green-400"
                  />
                  <span className="text-xs font-mono w-8 text-right" style={{ color: d.color }}>
                    {weights[i].toFixed(2)}
                  </span>
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
                  tenantId,
                  name: name.trim(),
                  description,
                  category,
                  aiType,
                  decisionAuthority,
                  owningSegments: [],
                  weights,
                  baseTarget: 3.5,
                  complexity: 3,
                  keywords: [],
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StrategyBuilderPage() {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? "";
  const utils = trpc.useUtils();

  // ── State ──
  const [activeStrategyId, setActiveStrategyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"initiatives" | "output" | "risks" | "patterns">("initiatives");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareStrategyId, setCompareStrategyId] = useState<string | null>(null);

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

  // Baseline scores from dashboard (mock for now — in production read from dashboardV2)
  const baselineScores = useMemo(() => [5.3, 5.5, 4.5, 5.4, 5.6, 4.9], []);

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

  const allInitiatives = initiativesQ.data ?? [];
  const categories = useMemo(
    () => ["all", ...Array.from(new Set(allInitiatives.map(i => i.category)))],
    [allInitiatives]
  );
  const filteredInitiatives = useMemo(
    () =>
      categoryFilter === "all"
        ? allInitiatives
        : allInitiatives.filter(i => i.category === categoryFilter),
    [allInitiatives, categoryFilter]
  );

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
            Build a data-driven AI people strategy in minutes. Select initiatives from the library,
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

  // Auto-select first strategy
  if (!activeStrategyId && (strategiesQ.data?.length ?? 0) > 0) {
    setActiveStrategyId(strategiesQ.data![0].id);
    return null;
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">
            AI People Strategy Builder
          </p>
          <h1 className="text-2xl font-bold text-foreground">
            {strategy?.name ?? "Loading…"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {industry?.name ?? ""} · {output?.initiativeCount ?? 0} initiatives selected ·{" "}
            {output?.riskCount ?? 0} risk items
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Strategy switcher */}
          {(strategiesQ.data?.length ?? 0) > 0 && (
            <Select value={activeStrategyId ?? ""} onValueChange={setActiveStrategyId}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                {strategiesQ.data?.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.status === "committed" && " ✓"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {/* Compare toggle */}
          {(strategiesQ.data?.length ?? 0) > 1 && (
            <Button
              variant="outline"
              size="sm"
              className={compareMode ? "border-green-500 text-green-400" : ""}
              onClick={() => setCompareMode(!compareMode)}
            >
              <GitCompare className="w-3.5 h-3.5 mr-1.5" />
              Compare
            </Button>
          )}
          {/* New strategy */}
          {(strategiesQ.data?.length ?? 0) < 3 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateStrategy}
              disabled={createStrategyMut.isPending}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New
            </Button>
          )}
          {/* Commit */}
          {strategy?.status === "draft" && (
            <Button
              size="sm"
              className="bg-green-500 hover:bg-green-400 text-black font-semibold"
              onClick={() => setShowCommitDialog(true)}
            >
              <Rocket className="w-3.5 h-3.5 mr-1.5" />
              Commit to roadmap
            </Button>
          )}
          {strategy?.status === "committed" && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Committed
            </Badge>
          )}
        </div>
      </div>

      {/* ── Context controls ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Industry */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <p className="text-xs text-muted-foreground mb-1.5">Industry</p>
          <Select
            value={strategy?.industryId ?? ""}
            onValueChange={v =>
              updateStrategyMut.mutate({ strategyId: activeStrategyId!, industryId: v })
            }
          >
            <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0 focus:ring-0">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {industriesQ.data?.map(ind => (
                <SelectItem key={ind.id} value={ind.id}>{ind.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Business ambition */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <p className="text-xs text-muted-foreground mb-1.5">Business ambition</p>
          <Select
            value={String(strategy?.businessAmbition ?? 2)}
            onValueChange={v =>
              updateStrategyMut.mutate({
                strategyId: activeStrategyId!,
                businessAmbition: parseInt(v),
              })
            }
          >
            <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3].map(v => (
                <SelectItem key={v} value={String(v)}>{AMBITION_LABELS[v]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* People ambition */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <p className="text-xs text-muted-foreground mb-1.5">People ambition</p>
          <Select
            value={String(strategy?.peopleAmbition ?? 2)}
            onValueChange={v =>
              updateStrategyMut.mutate({
                strategyId: activeStrategyId!,
                peopleAmbition: parseInt(v),
              })
            }
          >
            <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3].map(v => (
                <SelectItem key={v} value={String(v)}>{AMBITION_LABELS[v]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <p className="text-xs text-muted-foreground mb-1.5">Selected initiatives</p>
          <p className="text-xl font-bold text-foreground">{selectedInitiativeIds.size}</p>
          <p className="text-xs text-muted-foreground">of {allInitiatives.length} available</p>
        </div>
      </div>

      {/* ── Main layout: left picker + right output ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left: Initiative picker ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Initiative Library</h2>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowCustomModal(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Custom
            </Button>
          </div>

          {/* Category filter */}
          <div className="flex gap-1.5 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  categoryFilter === cat
                    ? "border-green-500/60 bg-green-500/10 text-green-400"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                }`}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>

          {/* Initiative cards */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {initiativesQ.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))
            ) : (
              filteredInitiatives.map(init => (
                <InitiativeCard
                  key={init.id}
                  initiative={init}
                  selected={selectedInitiativeIds.has(init.id)}
                  onToggle={() => handleToggleInitiative(init.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right: Output panels ── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Tab bar */}
          <div className="flex gap-1 bg-white/3 rounded-xl p-1 border border-white/8">
            {(["initiatives", "output", "risks", "patterns"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "output" ? "Capability Impact" : tab === "risks" ? "Risk Register" : tab === "patterns" ? "Patterns" : "Selected"}
              </button>
            ))}
          </div>

          {/* ── Tab: Selected initiatives ── */}
          {activeTab === "initiatives" && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Selected Initiatives ({selectedInitiativeIds.size})
              </h3>
              {strategyQ.isLoading ? (
                <Skeleton className="h-40" />
              ) : (strategyQ.data?.initiatives ?? []).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Layers className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No initiatives selected yet.</p>
                  <p className="text-xs mt-1">Pick from the library on the left.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {strategyQ.data?.initiatives.map(init => (
                    <div
                      key={init.id}
                      className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/3 border border-white/5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{init.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{init.category} · {init.targetQuarter}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Select
                          value={String(init.criticality)}
                          onValueChange={v =>
                            updateInitiativeMut.mutate({
                              strategyInitiativeId: init.id,
                              criticality: parseInt(v),
                            })
                          }
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
                        <button
                          onClick={() => handleToggleInitiative(init.initiativeId)}
                          className="text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Capability impact ── */}
          {activeTab === "output" && (
            <div className="space-y-4">
              {/* Radar */}
              <div className="rounded-xl border border-white/8 bg-white/3 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Capability Radar</h3>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-blue-400 inline-block" />
                      Baseline
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-green-400 inline-block border-dashed" style={{ borderTop: "2px dashed #4ADE80", background: "none" }} />
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
                      size={280}
                    />
                  </div>
                )}
              </div>

              {/* Gap table */}
              <div className="rounded-xl border border-white/8 bg-white/3 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Domain Gap Analysis</h3>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>Baseline</span>
                    <span>Target</span>
                    <span>Δ</span>
                  </div>
                </div>
                {outputQ.isLoading ? (
                  <Skeleton className="h-40" />
                ) : (
                  <div>
                    {(output?.gaps ?? []).map((g, i) => (
                      <GapRow
                        key={g.key}
                        domain={g.domain}
                        baseline={g.baseline}
                        target={g.target}
                        gap={g.gap}
                        color={DOMAINS[i].color}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Segment demand */}
              <div className="rounded-xl border border-white/8 bg-white/3 p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">HR Segment Demand</h3>
                {outputQ.isLoading ? (
                  <Skeleton className="h-32" />
                ) : (
                  <div className="space-y-2">
                    {(output?.segmentDemand ?? []).map(seg => (
                      <div key={seg.segment} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-40 truncate">{seg.segment}</span>
                        <div className="flex-1 h-3 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div
                            className="h-full rounded"
                            style={{
                              width: `${Math.min(100, (seg.initiatives / Math.max(1, allInitiatives.length)) * 300)}%`,
                              background: seg.avgComplexity > 3 ? "#F472B6" : "#60A5FA",
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground w-6 text-right">{seg.initiatives}</span>
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          {seg.initiatives > 0 ? `Complexity ${seg.avgComplexity}` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Compare panel */}
              {compareMode && (
                <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Compare Strategy</h3>
                    <Select
                      value={compareStrategyId ?? ""}
                      onValueChange={setCompareStrategyId}
                    >
                      <SelectTrigger className="h-7 text-xs w-36">
                        <SelectValue placeholder="Select strategy…" />
                      </SelectTrigger>
                      <SelectContent>
                        {strategiesQ.data
                          ?.filter(s => s.id !== activeStrategyId)
                          .map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {compareStrategyId && compareOutput && (
                    <div className="space-y-1">
                      {compareOutput.gaps.map((g, i) => {
                        const mainGap = output?.gaps[i]?.gap ?? 0;
                        const diff = g.gap - mainGap;
                        return (
                          <div key={g.key} className="flex items-center gap-3 text-xs">
                            <span className="text-muted-foreground w-32 truncate">{g.domain}</span>
                            <span className="font-mono">Target: {g.target.toFixed(1)}</span>
                            <span
                              className="font-mono ml-auto"
                              style={{ color: diff > 0 ? "#4ADE80" : diff < 0 ? "#F87171" : "#9CA3AF" }}
                            >
                              {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} vs {strategy?.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Risk register ── */}
          {activeTab === "risks" && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Risk Register</h3>
              {outputQ.isLoading ? (
                <Skeleton className="h-40" />
              ) : (output?.riskItems ?? []).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No regulatory risks identified.</p>
                  <p className="text-xs mt-1">Add initiatives with regulatory flags to see risks here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {output?.riskItems.map((risk, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border ${
                        risk.severity === "high"
                          ? "border-red-500/30 bg-red-500/5"
                          : "border-amber-500/30 bg-amber-500/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-foreground">{risk.initiativeName}</p>
                        <Badge
                          className={
                            risk.severity === "high"
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          }
                        >
                          {risk.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{risk.regulatoryFlag}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Mitigation: </span>
                          <span className="text-foreground">{risk.mitigation}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Owner: </span>
                          <span className="text-foreground">{risk.ownerRole}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Review: </span>
                          <span className="text-foreground">{risk.reviewCadence}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Launch: </span>
                          <span className="text-foreground">{risk.launchQuarter}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Strategic patterns ── */}
          {activeTab === "patterns" && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-5">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-semibold text-foreground">Strategic Patterns</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Patterns are pre-defined initiative bundles that deliver a coherent strategic outcome.
                      Matched patterns appear when you have selected all required initiatives.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {patternsQ.isLoading ? (
                <Skeleton className="h-40" />
              ) : (
                <div className="space-y-3">
                  {(patternsQ.data ?? []).map(pattern => {
                    const isMatched = output?.matchedPatterns.some(p => p.id === pattern.id);
                    const missingCount = pattern.minInitiatives.filter(
                      id => !selectedInitiativeIds.has(id)
                    ).length;
                    return (
                      <div
                        key={pattern.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isMatched
                            ? "border-green-500/40 bg-green-500/5"
                            : "border-white/8 bg-white/2"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-foreground">{pattern.name}</p>
                          {isMatched ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Matched
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {missingCount} more needed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {pattern.description}
                        </p>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {pattern.domains.map(d => {
                            const dom = DOMAINS.find(x => x.key === d);
                            return dom ? (
                              <span
                                key={d}
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: `${dom.color}22`, color: dom.color }}
                              >
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
      </div>

      {/* ── Commit dialog ── */}
      <Dialog open={showCommitDialog} onOpenChange={setShowCommitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Commit Strategy to Roadmap</DialogTitle>
            <DialogDescription>
              This will lock the strategy and create a committed roadmap. You can still create new
              strategy variants to compare.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="rounded-xl border border-white/8 bg-white/3 p-4 text-sm">
              <p className="font-medium text-foreground mb-1">{strategy?.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedInitiativeIds.size} initiatives · {output?.riskCount ?? 0} risk items ·{" "}
                {industry?.name}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCommitDialog(false)}>
                Cancel
              </Button>
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
