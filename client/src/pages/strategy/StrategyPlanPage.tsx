/**
 * StrategyPlanPage — /strategy/plan
 * Section 03: The Plan — phased initiative roadmap with execution state
 *
 * Blocks:
 *   1. Page header (breadcrumb, view toggle, Edit selection button)
 *   2. Hero (plan shape, total envelope, execution-state pills, blocked-initiative banner)
 *   3. Phase strip (4 cards, clickable to filter, blocked count label)
 *   4. Function distribution chart (6 bars, clickable to filter)
 *   5. Operational view (initiative list, filters, sort, inline chip edits, add/remove)
 *   6. Empty / loading / error states for each block
 */
import { useGate } from "@/contexts/GateContext";
import StageProgressHeader from "@/components/StageProgressHeader";
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, LayoutGrid, List, AlertTriangle, Clock,
  CheckCircle2, Circle, PauseCircle, XCircle, Plus,
  Trash2, ChevronDown, Info, ExternalLink, Loader2, BarChart2,
  TrendingUp,
} from "lucide-react";
import InitiativeDrawer, { type DrawerInitiative } from "@/components/InitiativeDrawer";

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASE_CONFIG: Record<string, {
  label: string; short: string; color: string; bg: string;
  months: string; description: string;
}> = {
  Q1: { label: "Phase 1 — Foundation", short: "Foundation", color: "#60A5FA", bg: "bg-blue-500/10 dark:text-blue-300 text-blue-700 border-blue-500/20",   months: "Months 1–3",   description: "Governance, literacy, and quick wins that de-risk everything that follows." },
  Q2: { label: "Phase 2 — Build",      short: "Build",       color: "#A78BFA", bg: "bg-violet-500/10 dark:text-violet-300 text-violet-700 border-violet-500/20", months: "Months 4–6",   description: "Core tooling and process automation across priority HR workflows." },
  Q3: { label: "Phase 3 — Scale",      short: "Scale",       color: "#4ADE80", bg: "bg-green-500/10 dark:text-green-300 text-green-700 border-green-500/20",   months: "Months 7–12",  description: "Expand proven use cases, integrate analytics, and embed AI in BAU." },
  Q4: { label: "Phase 4 — Optimise",   short: "Optimise",    color: "#FBBF24", bg: "bg-amber-500/10 dark:text-amber-300 text-amber-700 border-amber-500/20",   months: "Months 13–18", description: "Continuous improvement, advanced analytics, and operating model maturation." },
};

const PHASE_COST: Record<string, { low: number; high: number }> = {
  Q1: { low: 20,  high: 60  },
  Q2: { low: 40,  high: 120 },
  Q3: { low: 80,  high: 200 },
  Q4: { low: 100, high: 300 },
};

const HR_FUNCTIONS = [
  "Talent Acquisition",
  "Learning & Development",
  "Performance & Development",
  "Workforce Planning",
  "Pay & Reward",
  "HR Operations",
  "Ethics & Governance",
] as const;

const FUNCTION_COLOURS: Record<string, string> = {
  "Talent Acquisition":        "#60A5FA",
  "Learning & Development":    "#4ADE80",
  "Performance & Development": "#A78BFA",
  "Workforce Planning":        "#F472B6",
  "Pay & Reward":              "#FBBF24",
  "HR Operations":             "#FB923C",
  "Ethics & Governance":       "var(--muted-foreground)",
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
  "Governance & Ethics":       "Ethics & Governance",
  "Change & Capability":       "HR Operations",
  "HR Business Partnering":    "Workforce Planning",
  "People Analytics":          "Workforce Planning",
};

const STATUS_CONFIG: Record<string, {
  label: string; icon: React.ReactNode; bg: string; dot: string;
}> = {
  not_started: { label: "Not started", icon: <Circle className="w-3 h-3" />,        bg: "bg-muted text-muted-foreground border-border",         dot: "bg-zinc-500" },
  in_progress:  { label: "In flight",   icon: <Loader2 className="w-3 h-3 animate-spin" />, bg: "bg-blue-500/10 dark:text-blue-300 text-blue-700 border-blue-500/20",   dot: "bg-blue-400" },
  paused:       { label: "Blocked",     icon: <PauseCircle className="w-3 h-3" />,   bg: "bg-amber-500/10 dark:text-amber-300 text-amber-700 border-amber-500/20", dot: "bg-amber-400" },
  completed:    { label: "Completed",   icon: <CheckCircle2 className="w-3 h-3" />,  bg: "bg-green-500/10 dark:text-green-300 text-green-700 border-green-500/20", dot: "bg-green-400" },
  cancelled:    { label: "Cancelled",   icon: <XCircle className="w-3 h-3" />,       bg: "bg-red-500/10 dark:text-red-400 text-red-600 border-red-500/20",       dot: "bg-red-400" },
};

const FOUNDATION_CATEGORIES = new Set(["Change & Capability", "Governance & Ethics", "HR Operations", "Ethics & Governance"]);
const SCALE_CATEGORIES      = new Set(["People Analytics", "HR Business Partnering", "Workforce Planning"]);
const OPTIMISE_CATEGORIES   = new Set(["Ethics & Governance", "Governance & Ethics", "People Analytics", "HR Business Partnering"]);

function assignDefaultPhase(initiative: { category?: string | null; complexity?: number | null; name?: string | null }): string {
  const complexity = Number(initiative.complexity ?? 3);
  const cat = initiative.category ?? "";
  const name = (initiative.name ?? "").toLowerCase();
  if (name.includes("literacy") || name.includes("ethics & governance")) return "Q1";
  if (complexity <= 2 && FOUNDATION_CATEGORIES.has(cat)) return "Q1";
  if (complexity <= 2) return "Q2";
  if (complexity === 3 && FOUNDATION_CATEGORIES.has(cat)) return "Q2";
  if (complexity === 3 && SCALE_CATEGORIES.has(cat)) return "Q3";
  if (complexity === 3) return "Q2";
  if (complexity >= 4 && OPTIMISE_CATEGORIES.has(cat)) return "Q4";
  if (complexity >= 4 && SCALE_CATEGORIES.has(cat)) return "Q3";
  if (complexity >= 4) return "Q3";
  return "Q2";
}

function resolveFunction(init: { category?: string | null; functionOverride?: string | null }): string {
  if (init.functionOverride) return init.functionOverride;
  return CATEGORY_MAP[init.category ?? ""] ?? (init.category ?? "HR Operations");
}

function resolvePhase(init: { targetQuarter?: string | null; category?: string | null; complexity?: number | null; name?: string | null }): string {
  if (init.targetQuarter && PHASE_CONFIG[init.targetQuarter]) return init.targetQuarter;
  return assignDefaultPhase(init);
}

// ─── Undo Toast ───────────────────────────────────────────────────────────────

interface UndoAction {
  id: string;
  message: string;
  onUndo: () => void;
}

function useUndoToast() {
  const showUndo = useCallback((message: string, onUndo: () => void) => {
    toast(message, {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: onUndo,
      },
    });
  }, []);
  return { showUndo };
}

// ─── Cost Impact Preview ──────────────────────────────────────────────────────

function CostImpactPreview({ phase, currentCount }: { phase: string; currentCount: number }) {
  const cfg = PHASE_COST[phase] ?? PHASE_COST.Q2;
  const low  = cfg.low  * (currentCount + 1);
  const high = cfg.high * (currentCount + 1);
  return (
    <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs">
      <div className="flex items-center gap-1.5 dark:text-amber-400 text-amber-600 font-medium mb-1">
        <BarChart2 className="w-3.5 h-3.5" />
        Cost impact preview
      </div>
      <p className="text-muted-foreground">
        Adding this initiative to <span className="text-foreground font-medium">{PHASE_CONFIG[phase]?.short ?? phase}</span> raises the phase envelope to{" "}
        <span className="text-foreground font-medium">£{low}k–£{high}k</span>.
      </p>
    </div>
  );
}

// ─── Initiative Detail Modal ──────────────────────────────────────────────────

function InitiativeDetailModal({ initiative, open, onClose }: {
  initiative: any | null; open: boolean; onClose: () => void;
}) {
  const [, navigate] = useLocation();
  if (!initiative) return null;
  const phase = resolvePhase(initiative);
  const fn    = resolveFunction(initiative);
  const phaseCfg = PHASE_CONFIG[phase];
  const fnColor  = FUNCTION_COLOURS[fn] ?? "#9CA3AF";
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold pr-6 text-foreground">{initiative.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="flex flex-wrap gap-2">
            {phaseCfg && (
              <Badge variant="outline" className={phaseCfg.bg + " text-xs"}>
                {phaseCfg.short}
              </Badge>
            )}
            <Badge variant="outline" style={{ borderColor: fnColor + "40", color: fnColor, backgroundColor: fnColor + "15" }} className="text-xs">
              {fn}
            </Badge>
            {initiative.aiType && (
              <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border capitalize">
                {initiative.aiType}
              </Badge>
            )}
            {initiative.regulatoryFlag && (
              <Badge variant="outline" className="text-xs bg-red-500/10 dark:text-red-400 text-red-600 border-red-500/20">
                {initiative.regulatoryFlag}
              </Badge>
            )}
          </div>
          {initiative.description && (
            <p className="text-sm text-foreground/70 leading-relaxed">{initiative.description}</p>
          )}
          {initiative.decisionAuthority && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground/70" />
              <span>Decision authority: <span className="text-foreground/70">{initiative.decisionAuthority.replace(/_/g, " ")}</span></span>
            </div>
          )}
          {initiative.statusReason && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs dark:text-amber-300 text-amber-700">
              <span className="font-medium">Block reason: </span>{initiative.statusReason}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" className="text-xs" onClick={() => { onClose(); navigate("/strategy/investment-risk"); }}>
              <ExternalLink className="w-3 h-3 mr-1" />
              View in Investment &amp; Risk
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Remove Confirmation Modal ────────────────────────────────────────────────

function RemoveConfirmModal({ initiative, open, onClose, onConfirm, phaseCount }: {
  initiative: any | null; open: boolean; onClose: () => void; onConfirm: () => void; phaseCount: number;
}) {
  if (!initiative) return null;
  const phase = resolvePhase(initiative);
  const cfg   = PHASE_COST[phase] ?? PHASE_COST.Q2;
  const newLow  = cfg.low  * Math.max(0, phaseCount - 1);
  const newHigh = cfg.high * Math.max(0, phaseCount - 1);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground">Remove initiative?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <p className="text-sm text-foreground/70">
            Remove <span className="font-medium text-foreground">{initiative.name}</span> from your strategy? This cannot be undone from this page — you can re-add it via the initiative selector.
          </p>
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs">
            <div className="flex items-center gap-1.5 dark:text-amber-400 text-amber-600 font-medium mb-1">
              <BarChart2 className="w-3.5 h-3.5" />
              Cost impact preview
            </div>
            <p className="text-muted-foreground">
              Removing this initiative reduces the <span className="text-foreground font-medium">{PHASE_CONFIG[phase]?.short ?? phase}</span> envelope to{" "}
              <span className="text-foreground font-medium">£{newLow}k–£{newHigh}k</span>.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>Remove</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Initiative Selector Modal ────────────────────────────────────────────────

function InitiativeSelectorModal({ open, onClose, onAdd, currentIds, strategyData }: {
  open: boolean; onClose: () => void;
  onAdd: (id: string) => void;
  currentIds: Set<string>;
  strategyData: any;
}) {
  const [search, setSearch] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const libraryQ = trpc.contentLibrary.meta.useQuery(undefined, { enabled: open });
  const allInitQ = trpc.strategy.listInitiatives.useQuery(
    {},
    { enabled: open }
  );

  const candidates = useMemo(() => {
    if (!allInitQ.data) return [];
    return allInitQ.data.filter((i: any) => !currentIds.has(i.id));
  }, [allInitQ.data, currentIds]);

  const filtered = useMemo(() => {
    if (!search.trim()) return candidates;
    const q = search.toLowerCase();
    return candidates.filter((i: any) =>
      (i.name ?? "").toLowerCase().includes(q) ||
      (i.category ?? "").toLowerCase().includes(q)
    );
  }, [candidates, search]);

  const previewInit = useMemo(() => filtered.find((i: any) => i.id === previewId), [filtered, previewId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground">Add initiative to strategy</DialogTitle>
        </DialogHeader>
        <div className="flex gap-3 flex-1 min-h-0">
          {/* Left: list */}
          <div className="flex-1 flex flex-col min-h-0">
            <input
              type="text"
              placeholder="Search initiatives…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-3"
            />
            <div className="overflow-y-auto flex-1 space-y-1 pr-1">
              {allInitQ.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground/70 text-center py-8">No matching initiatives</p>
              ) : (
                filtered.map((init: any) => {
                  const phase = resolvePhase(init);
                  const phaseCfg = PHASE_CONFIG[phase];
                  return (
                    <button
                      key={init.id}
                      onClick={() => setPreviewId(init.id === previewId ? null : init.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                        previewId === init.id
                          ? "bg-primary/10 border-primary/30 text-foreground"
                          : "bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <div className="font-medium text-xs truncate">{init.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {phaseCfg && (
                          <span className="text-[10px]" style={{ color: phaseCfg.color }}>{phaseCfg.short}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground/70">{CATEGORY_MAP[init.category] ?? init.category}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          {/* Right: preview */}
          <div className="w-56 shrink-0 border-l border-border pl-3">
            {previewInit ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-foreground">{previewInit.name}</p>
                {previewInit.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{previewInit.description}</p>
                )}
                <CostImpactPreview
                  phase={resolvePhase(previewInit)}
                  currentCount={currentIds.size}
                />
                <Button
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => { onAdd(previewInit.id); onClose(); }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add to strategy
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/70 text-center pt-8">Select an initiative to preview its cost impact</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Phase Chip Popover ───────────────────────────────────────────────────────

function PhaseChip({ value, onChange, readonly }: {
  value: string; onChange: (v: string) => void; readonly?: boolean;
}) {
  const cfg = PHASE_CONFIG[value] ?? PHASE_CONFIG.Q2;
  if (readonly) {
    return (
      <Badge variant="outline" className={cfg.bg + " text-xs"}>
        {cfg.short}
      </Badge>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-opacity hover:opacity-80 ${cfg.bg}`}>
          {cfg.short}
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1 bg-card border-border" align="start">
        {Object.entries(PHASE_CONFIG).map(([k, v]) => (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={`w-full text-left px-3 py-1.5 rounded text-xs hover:bg-muted transition-colors ${k === value ? "text-foreground font-medium" : "text-muted-foreground"}`}
          >
            {v.short}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ─── Function Chip Popover ────────────────────────────────────────────────────

function FunctionChip({ value, onChange, readonly }: {
  value: string; onChange: (v: string) => void; readonly?: boolean;
}) {
  const color = FUNCTION_COLOURS[value] ?? "#9CA3AF";
  if (readonly) {
    return (
      <Badge variant="outline" style={{ borderColor: color + "40", color, backgroundColor: color + "15" }} className="text-xs">
        {value}
      </Badge>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-opacity hover:opacity-80"
          style={{ borderColor: color + "40", color, backgroundColor: color + "15" }}
        >
          {value}
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1 bg-card border-border" align="start">
        {HR_FUNCTIONS.map(fn => (
          <button
            key={fn}
            onClick={() => onChange(fn)}
            className={`w-full text-left px-3 py-1.5 rounded text-xs hover:bg-muted transition-colors ${fn === value ? "text-foreground font-medium" : "text-muted-foreground"}`}
          >
            {fn}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ─── Status Chip Popover ──────────────────────────────────────────────────────

function StatusChip({ value, onChange, readonly }: {
  value: string; onChange: (v: string) => void; readonly?: boolean;
}) {
  const cfg = STATUS_CONFIG[value] ?? STATUS_CONFIG.not_started;
  if (readonly) {
    return (
      <Badge variant="outline" className={cfg.bg + " text-xs gap-1"}>
        {cfg.icon}
        {cfg.label}
      </Badge>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-opacity hover:opacity-80 ${cfg.bg}`}>
          {cfg.icon}
          {cfg.label}
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1 bg-card border-border" align="start">
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={`w-full text-left px-3 py-1.5 rounded text-xs hover:bg-muted transition-colors flex items-center gap-2 ${k === value ? "text-foreground font-medium" : "text-muted-foreground"}`}
          >
            {v.icon}
            {v.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────


// ─── Stage 5 Principles Banner ────────────────────────────────────────────────

function Stage5PrinciplesBanner() {
  const gate = useGate();
  if (!gate.stage4Cleared) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-foreground">Plan re-scored against your principles</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Initiative fit scores now reflect your guiding principles and what you’ve ruled out.
          Initiatives that conflict with a principle are marked as misaligned.
        </p>
      </div>
    </div>
  );
}

export default function StrategyPlanPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const gate = useGate();
  const { isStage5Accessible, stage5Cleared: isStage5Cleared } = gate;

  // Confirm Plan dialog
  const [confirmPlanOpen, setConfirmPlanOpen] = useState(false);
  const confirmPlanMutation = trpc.gate.completeStage5.useMutation({
    onSuccess: () => {
      utils.intelligence.getStrategy.invalidate();
      utils.gate.getState.invalidate();  // eslint-disable-line @typescript-eslint/no-floating-promises
      setConfirmPlanOpen(false);
      toast.success("Plan confirmed — moving to Measurement");
      navigate("/strategy/measurement");
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to confirm plan");
    },
  });

  // View mode: "executive" (read-only, board-ready) or "operational" (editable)
  const [viewMode, setViewMode] = useState<"executive" | "operational">(() => {
    try { return (localStorage.getItem("strategy_plan_view") as "executive" | "operational") ?? "executive"; } catch { return "executive"; }
  });
  useEffect(() => {
    try { localStorage.setItem("strategy_plan_view", viewMode); } catch {}
  }, [viewMode]);

  // Filters (single-select within category, AND across)
  const [phaseFilter, setPhaseFilter]     = useState<string | null>(null);
  const [functionFilter, setFunctionFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter]   = useState<string | null>(null);
  const [sortBy, setSortBy]               = useState<"status" | "phase" | "function" | "name">("status");

  // Modals
  const [detailInit,  setDetailInit]  = useState<any | null>(null);
  const [removeInit,  setRemoveInit]  = useState<any | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);

  // Drawer state
  const [drawerInitId, setDrawerInitId] = useState<string | null>(null);

  // Data queries
  const strategyQ = trpc.intelligence.getStrategy.useQuery();
  const initiativesQ = trpc.intelligence.getStrategyInitiatives.useQuery();

  // Cost envelope
  const costEnvelopeQ = trpc.intelligence.calculateCostEnvelope.useQuery(
    {
      selectedInitiativeIds: strategyQ.data?.selectedInitiativeIds ?? [],
      ambitionTier: "progressive",
      orgSize: "medium",
    },
    { enabled: !!strategyQ.data?.selectedInitiativeIds?.length }
  );

  // Mutations
  const patchInitiative = trpc.intelligence.patchStrategyInitiative.useMutation({
    onSuccess: () => utils.intelligence.getStrategyInitiatives.invalidate(),
  });
  const saveStrategy = trpc.intelligence.saveStrategy.useMutation({
    onSuccess: () => {
      utils.intelligence.getStrategy.invalidate();
      utils.intelligence.getStrategyInitiatives.invalidate();
    },
  });

  const { showUndo } = useUndoToast();

  // Derived data
  const initiatives = useMemo(() => initiativesQ.data ?? [], [initiativesQ.data]);

  const enriched = useMemo(() => initiatives.map(init => ({
    ...init,
    _phase: resolvePhase(init),
    _function: resolveFunction(init),
  })), [initiatives]);

  const currentIds = useMemo(() => new Set(enriched.map(i => i.id)), [enriched]);

  // Drawer init (must come after enriched)
  const drawerInit = useMemo(
    () => enriched.find(i => i.id === drawerInitId) ?? null,
    [enriched, drawerInitId]
  );

  // Execution state counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const init of enriched) {
      counts[init.status ?? "not_started"] = (counts[init.status ?? "not_started"] ?? 0) + 1;
    }
    return counts;
  }, [enriched]);

  const blockedInits = useMemo(() =>
    enriched.filter(i => i.status === "paused"),
    [enriched]
  );

  // Phase strip data
  const phaseData = useMemo(() =>
    Object.entries(PHASE_CONFIG).map(([key, cfg]) => {
      const inits = enriched.filter(i => i._phase === key);
      const blocked = inits.filter(i => i.status === "paused").length;
      const cost = PHASE_COST[key];
      return { key, cfg, count: inits.length, blocked, costLow: cost.low * inits.length, costHigh: cost.high * inits.length };
    }),
    [enriched]
  );

  // Function distribution
  const functionData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const fn of HR_FUNCTIONS) counts[fn] = 0;
    for (const init of enriched) counts[init._function] = (counts[init._function] ?? 0) + 1;
    const max = Math.max(...Object.values(counts), 1);
    return HR_FUNCTIONS.map(fn => ({ fn, count: counts[fn] ?? 0, pct: ((counts[fn] ?? 0) / max) * 100 }));
  }, [enriched]);

  // Filtered + sorted list (capped at 12 in executive view, uncapped in operational)
  const PLAN_CAP = 12;
  const filteredList = useMemo(() => {
    let list = [...enriched];
    if (phaseFilter)    list = list.filter(i => i._phase === phaseFilter);
    if (functionFilter) list = list.filter(i => i._function === functionFilter);
    if (statusFilter)   list = list.filter(i => (i.status ?? "not_started") === statusFilter);
    list.sort((a, b) => {
      if (sortBy === "phase")    return (a._phase ?? "").localeCompare(b._phase ?? "");
      if (sortBy === "function") return (a._function ?? "").localeCompare(b._function ?? "");
      if (sortBy === "name")     return (a.name ?? "").localeCompare(b.name ?? "");
      // status: blocked first, then in_progress, not_started, completed, cancelled
      const order = ["paused", "in_progress", "not_started", "completed", "cancelled"];
      return order.indexOf(a.status ?? "not_started") - order.indexOf(b.status ?? "not_started");
    });
    // Apply curation cap in executive view when no filters are active
    if (viewMode === "executive" && !phaseFilter && !functionFilter && !statusFilter) {
      return list.slice(0, PLAN_CAP);
    }
    return list;
  }, [enriched, phaseFilter, functionFilter, statusFilter, sortBy, viewMode]);

  // Handlers
  const handlePhaseChange = useCallback((init: any, newPhase: string) => {
    const oldPhase = init._phase;
    patchInitiative.mutate({ initiativeId: init.id, targetQuarter: newPhase });
    showUndo(`Moved "${init.name}" to ${PHASE_CONFIG[newPhase]?.short}`, () => {
      patchInitiative.mutate({ initiativeId: init.id, targetQuarter: oldPhase });
    });
    (window as any).umami?.track("strategy.plan.phase-chip.changed", { initiativeId: init.id, from: oldPhase, to: newPhase });
  }, [patchInitiative, showUndo]);

  const handleFunctionChange = useCallback((init: any, newFn: string) => {
    const oldFn = init._function;
    patchInitiative.mutate({ initiativeId: init.id, functionOverride: newFn });
    showUndo(`Changed "${init.name}" function to ${newFn}`, () => {
      patchInitiative.mutate({ initiativeId: init.id, functionOverride: oldFn === (CATEGORY_MAP[init.category ?? ""] ?? init.category) ? null : oldFn });
    });
    (window as any).umami?.track("strategy.plan.function-chip.changed", { initiativeId: init.id, from: oldFn, to: newFn });
  }, [patchInitiative, showUndo]);

  const handleStatusChange = useCallback((init: any, newStatus: string) => {
    const oldStatus = init.status ?? "not_started";
    patchInitiative.mutate({ initiativeId: init.id, status: newStatus as any });
    showUndo(`Status changed to "${STATUS_CONFIG[newStatus]?.label}"`, () => {
      patchInitiative.mutate({ initiativeId: init.id, status: oldStatus as any });
    });
    (window as any).umami?.track("strategy.plan.status-chip.changed", { initiativeId: init.id, from: oldStatus, to: newStatus });
  }, [patchInitiative, showUndo]);

  const handleAddInitiative = useCallback((id: string) => {
    if (!strategyQ.data) return;
    const newIds = [...(strategyQ.data.selectedInitiativeIds ?? []), id];
    saveStrategy.mutate({
      businessAmbitionLevel: strategyQ.data.businessAmbitionLevel ?? 3,
      peopleAmbitionLevel:   strategyQ.data.peopleAmbitionLevel ?? 3,
      domainTargets:         strategyQ.data.domainTargets ?? {},
      ambitionTargetScore:   strategyQ.data.ambitionTargetScore ?? 70,
      ambitionTargetDate:    strategyQ.data.ambitionTargetDate,
      ambitionTargetLabel:   strategyQ.data.ambitionTargetLabel,
      selectedInitiativeIds: newIds,
    });
    (window as any).umami?.track("strategy.plan.initiative.added", { initiativeId: id });
  }, [strategyQ.data, saveStrategy]);

  const handleRemoveInitiative = useCallback((init: any) => {
    if (!strategyQ.data) return;
    const newIds = (strategyQ.data.selectedInitiativeIds ?? []).filter(id => id !== init.id);
    saveStrategy.mutate({
      businessAmbitionLevel: strategyQ.data.businessAmbitionLevel ?? 3,
      peopleAmbitionLevel:   strategyQ.data.peopleAmbitionLevel ?? 3,
      domainTargets:         strategyQ.data.domainTargets ?? {},
      ambitionTargetScore:   strategyQ.data.ambitionTargetScore ?? 70,
      ambitionTargetDate:    strategyQ.data.ambitionTargetDate,
      ambitionTargetLabel:   strategyQ.data.ambitionTargetLabel,
      selectedInitiativeIds: newIds,
    });
    setRemoveInit(null);
    (window as any).umami?.track("strategy.plan.initiative.removed", { initiativeId: init.id });
  }, [strategyQ.data, saveStrategy]);

  const isLoading = strategyQ.isLoading || initiativesQ.isLoading;
  const isError   = strategyQ.isError   || initiativesQ.isError;

  // Cost envelope display
  const totalLow  = costEnvelopeQ.data?.totalMin ?? phaseData.reduce((s, p) => s + p.costLow,  0);
  const totalHigh = costEnvelopeQ.data?.totalMax ?? phaseData.reduce((s, p) => s + p.costHigh, 0);

  // Engine-derived value totals (sum of midpoints from fit results)
  const { valueTotalLow, valueTotalHigh } = useMemo(() => {
    let low = 0; let high = 0;
    for (const init of enriched) {
      if (init.valueRange && init.fitStatus !== "HARD_GATE_FAIL" && init.fitStatus !== "NOT_APPLICABLE") {
        low  += (init.valueRange as any).low  ?? 0;
        high += (init.valueRange as any).high ?? 0;
      }
    }
    return { valueTotalLow: low, valueTotalHigh: high };
  }, [enriched]);

  // Fit score colour helper
  function fitBadgeClass(fitStatus: string | null | undefined): string {
    if (fitStatus === "STRONG_FIT")     return "bg-green-500/10 text-green-400 border-green-500/20";
    if (fitStatus === "POSSIBLE_FIT")   return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    if (fitStatus === "POOR_FIT")       return "bg-red-500/10 text-red-400 border-red-500/20";
    if (fitStatus === "WEAK_FIT")        return "bg-red-500/10 text-red-400 border-red-500/20";
    if (fitStatus === "HARD_GATE_FAIL") return "bg-muted text-muted-foreground border-border";
    if (fitStatus === "NOT_APPLICABLE") return "bg-muted text-muted-foreground border-border";
    return "";
  }
  function fitLabel(fitStatus: string | null | undefined): string {
    if (fitStatus === "STRONG_FIT")     return "Strong fit";
    if (fitStatus === "POSSIBLE_FIT")   return "Possible fit";
    if (fitStatus === "POOR_FIT")       return "Weak fit";
    if (fitStatus === "WEAK_FIT")        return "Weak fit";
    if (fitStatus === "HARD_GATE_FAIL") return "N/A";
    if (fitStatus === "NOT_APPLICABLE") return "N/A";
    return "";
  }

  const hasExecutionData = Object.values(statusCounts).some(v => v > 0 && Object.keys(statusCounts).some(k => k !== "not_started"));

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Page Header ── */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate("/strategy")}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm shrink-0"
              aria-label="Back to Strategy overview"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Strategy</span>
            </button>
            <span className="text-zinc-600 hidden sm:inline">/</span>
            <h1 className="text-sm font-semibold text-foreground truncate">03 — The Plan</h1>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View toggle */}
            <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode("executive")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "executive"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground/90"
                }`}
                aria-pressed={viewMode === "executive"}
              >
                <LayoutGrid className="w-3 h-3" />
                <span className="hidden sm:inline">Executive</span>
              </button>
              <button
                onClick={() => setViewMode("operational")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "operational"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground/90"
                }`}
                aria-pressed={viewMode === "operational"}
              >
                <List className="w-3 h-3" />
                <span className="hidden sm:inline">Operational</span>
              </button>
            </div>

            {/* Edit selection */}
            <Button
              size="sm"
              variant="outline"
              className="text-xs bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-border"
              onClick={() => navigate("/strategy")}
            >
              Edit selection
            </Button>

            {/* Confirm Plan (Stage 5 gate) */}
            {isStage5Accessible && !isStage5Cleared && (
              <Button
                size="sm"
                className="text-xs"
                disabled={enriched.length === 0 || confirmPlanMutation.isPending}
                onClick={() => setConfirmPlanOpen(true)}
              >
                {confirmPlanMutation.isPending ? (
                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Confirming…</>
                ) : (
                  "Confirm plan"
                )}
              </Button>
            )}
            {isStage5Cleared && (
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1 px-2 py-1">
                <CheckCircle2 className="w-3 h-3" />Plan confirmed
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Stage 5 progress header ── */}
        {isStage5Accessible && (
          <StageProgressHeader
            stageNumber={5}
            title="The Plan"
            description="Review your AI initiative portfolio, adjust phases and priorities, then confirm the plan to unlock Success Measures."
            isCleared={!!isStage5Cleared}
            isEdited={!!gate.stage5EditedAfterClearing}
            canConfirm={enriched.length > 0}
            isPending={confirmPlanMutation.isPending}
            onConfirm={() => isStage5Cleared && !gate.stage5EditedAfterClearing ? navigate("/strategy/roadmap") : setConfirmPlanOpen(true)}
            backRoute="/strategy/ambition"
            nextRoute="/strategy/roadmap"
            nextLabel="Outcomes"
          />
        )}
        {/* ── Stage 5 banner: shown after principles confirmed ── */}
        <Stage5PrinciplesBanner />

        {/* ── Hero ── */}
        <section aria-label="Plan summary">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : isError ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm dark:text-red-400 text-red-600">
              Failed to load plan data. Please refresh.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Plan shape + envelope */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-card border border-border">
                  <p className="text-xs text-muted-foreground/70 mb-1">Plan shape</p>
                  <p className="text-2xl font-bold text-foreground">{enriched.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">initiatives across {phaseData.filter(p => p.count > 0).length} phases</p>
                </div>
                <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-card border border-border">
                  <p className="text-xs text-muted-foreground/70 mb-1">Estimated investment</p>
                  <p className="text-2xl font-bold text-foreground">
                    £{totalLow >= 1000 ? `${(totalLow / 1000).toFixed(1)}M` : `${totalLow}k`}–£{totalHigh >= 1000 ? `${(totalHigh / 1000).toFixed(1)}M` : `${totalHigh}k`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">estimated 18-month range</p>
                </div>
              </div>

              {/* Execution state pills (only when at least one non-not_started) */}
              {hasExecutionData && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusCounts).map(([status, count]) => {
                    if (!count) return null;
                    const cfg = STATUS_CONFIG[status];
                    if (!cfg) return null;
                    return (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${cfg.bg} ${statusFilter === status ? "ring-1 ring-white/20" : ""}`}
                        aria-pressed={statusFilter === status}
                      >
                        {cfg.icon}
                        {count} {cfg.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Blocked-initiative banner */}
              {blockedInits.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 dark:text-amber-400 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium dark:text-amber-300 text-amber-700">
                      {blockedInits.length} initiative{blockedInits.length > 1 ? "s" : ""} blocked
                    </p>
                    {blockedInits.slice(0, 2).map(init => (
                      <p key={init.id} className="text-xs text-muted-foreground mt-0.5">
                        <span className="text-foreground/70 font-medium">{init.name}</span>
                        {init.statusReason ? ` — ${init.statusReason}` : ""}
                      </p>
                    ))}
                    {blockedInits.length > 2 && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5">+{blockedInits.length - 2} more</p>
                    )}
                  </div>
                  <button
                    className="ml-auto shrink-0 text-xs dark:text-amber-400 text-amber-600 hover:dark:text-amber-300 text-amber-700 transition-colors"
                    onClick={() => { setStatusFilter("paused"); (window as any).umami?.track("strategy.plan.blocked-banner.clicked"); }}
                  >
                    View all →
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Phase Strip ── */}
        <section aria-label="Phases">
          <h2 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3">Phase breakdown</h2>
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {phaseData.map(({ key, cfg, count, blocked, costLow, costHigh }) => (
                <button
                  key={key}
                  onClick={() => setPhaseFilter(phaseFilter === key ? null : key)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    phaseFilter === key
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card hover:border-border"
                  }`}
                  aria-pressed={phaseFilter === key}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-2 h-2 rounded-full mt-1" style={{ backgroundColor: cfg.color }} />
                    {blocked > 0 && (
                      <span className="text-[10px] dark:text-amber-400 text-amber-600 font-medium flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {blocked} blocked
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-foreground mb-0.5">{cfg.short}</p>
                  <p className="text-xs text-muted-foreground/70 mb-2">{cfg.months}</p>
                  <p className="text-lg font-bold text-foreground">{count}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {count > 0 ? `£${costLow}k–£${costHigh}k` : "No initiatives"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Function Distribution Chart ── */}
        <section aria-label="Function distribution">
          <h2 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3">By HR function</h2>
          {isLoading ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : (
            <div className="p-4 rounded-xl bg-card border border-border space-y-2.5">
              {functionData.map(({ fn, count, pct }) => {
                const color = FUNCTION_COLOURS[fn] ?? "#9CA3AF";
                return (
                  <button
                    key={fn}
                    onClick={() => setFunctionFilter(functionFilter === fn ? null : fn)}
                    className={`w-full flex items-center gap-3 group transition-opacity ${
                      functionFilter && functionFilter !== fn ? "opacity-40" : ""
                    }`}
                    aria-pressed={functionFilter === fn}
                  >
                    <span className="text-xs text-muted-foreground w-40 text-left truncate group-hover:text-foreground transition-colors">{fn}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-4 text-right">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Initiative List (Operational / Executive) ── */}
        <section aria-label="Initiative list">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h2 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
              Initiatives
              {(phaseFilter || functionFilter || statusFilter) && (
                <span className="ml-2 dark:text-violet-400 text-violet-600 normal-case font-normal">
                  (filtered — <button onClick={() => { setPhaseFilter(null); setFunctionFilter(null); setStatusFilter(null); }} className="underline hover:no-underline">clear</button>)
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              {/* Sort */}
              <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
                <SelectTrigger className="h-7 text-xs w-32 bg-card border-border text-foreground/70">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="status">Sort: Status</SelectItem>
                  <SelectItem value="phase">Sort: Phase</SelectItem>
                  <SelectItem value="function">Sort: Function</SelectItem>
                  <SelectItem value="name">Sort: Name</SelectItem>
                </SelectContent>
              </Select>
              {/* Add initiative */}
              {viewMode === "operational" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs bg-transparent border-border text-muted-foreground hover:text-foreground"
                  onClick={() => { setSelectorOpen(true); (window as any).umami?.track("strategy.plan.add-initiative.opened"); }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : isError ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm dark:text-red-400 text-red-600">
              Failed to load initiatives. Please refresh.
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-8 rounded-xl bg-card border border-border border-dashed text-center">
              <p className="text-sm text-muted-foreground/70">
                {enriched.length === 0
                  ? "No initiatives selected yet. Use the initiative selector to build your plan."
                  : "No initiatives match the current filters."}
              </p>
              {enriched.length === 0 && viewMode === "operational" && (
                <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => setSelectorOpen(true)}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add initiative
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredList.map(init => (
                <div
                  key={init.id}
                  className="group p-3 sm:p-4 rounded-xl bg-card border border-border hover:border-border transition-colors"
                >
                  <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 mt-2 ${STATUS_CONFIG[init.status ?? "not_started"]?.dot ?? "bg-zinc-500"}`} />

                    {/* Name + description */}
                    <div className="flex-1 min-w-0">
                      <button
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left"
                        onClick={() => setDrawerInitId(init.id)}
                      >
                        {init.name}
                      </button>
                      {/* Fit rationale snippet */}
                      {init.fitRationale && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">{init.fitRationale}</p>
                      )}
                      {!init.fitRationale && init.description && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">{init.description}</p>
                      )}
                      {/* Chips row */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <PhaseChip
                          value={init._phase}
                          onChange={v => handlePhaseChange(init, v)}
                          readonly={viewMode === "executive"}
                        />
                        <FunctionChip
                          value={init._function}
                          onChange={v => handleFunctionChange(init, v)}
                          readonly={viewMode === "executive"}
                        />
                        <StatusChip
                          value={init.status ?? "not_started"}
                          onChange={v => handleStatusChange(init, v)}
                          readonly={viewMode === "executive"}
                        />
                        {init.regulatoryFlag && (
                          <Badge variant="outline" className="text-[10px] bg-red-500/10 dark:text-red-400 text-red-600 border-red-500/20">
                            {init.regulatoryFlag}
                          </Badge>
                        )}
                        {/* Fit score badge */}
                        {(init as any).fitStatus && (init as any).fitStatus !== "HARD_GATE_FAIL" && (init as any).fitStatus !== "NOT_APPLICABLE" && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] cursor-pointer ${fitBadgeClass((init as any).fitStatus)}`}
                            onClick={e => { e.stopPropagation(); setDrawerInitId(init.id); }}
                          >
                            {(init as any).fitScore != null && `${(init as any).fitScore} · `}{fitLabel((init as any).fitStatus)}
                          </Badge>
                        )}
                        {/* Value badge */}
                        {(init as any).valueRange && (init as any).fitStatus !== "HARD_GATE_FAIL" && (init as any).fitStatus !== "NOT_APPLICABLE" && (() => {
                          const vr = (init as any).valueRange as { low: number; high: number };
                          const mid = Math.round((vr.low + vr.high) / 2);
                          const fmt = (k: number) => k >= 1000 ? `£${(k / 1000).toFixed(1)}M` : `£${k}k`;
                          return (
                            <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-400 border-violet-500/20">
                              <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                              {fmt(mid)}
                            </Badge>
                          );
                        })()}
                        {/* Yr 1 cost badge */}
                        {(init as any).y1CostRange && (() => {
                          const cr = (init as any).y1CostRange as { low: number; high: number };
                          const fmt = (k: number) => k >= 1000 ? `£${(k / 1000).toFixed(1)}M` : `£${k}k`;
                          return (
                            <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
                              Cost: {fmt(cr.low)}–{fmt(cr.high)}
                            </Badge>
                          );
                        })()}
                        {/* TTV badge */}
                        {(init as any).timeToValueMonths && (
                          <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
                            <Clock className="w-2.5 h-2.5 mr-0.5" />
                            {(init as any).timeToValueMonths.min}–{(init as any).timeToValueMonths.max}m
                          </Badge>
                        )}
                        {/* Principle mismatch flag */}
                        {(init as any).principleAlignment?.ranking === "violates" && (
                          <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-500 border-red-500/20 gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Conflicts with principle
                          </Badge>
                        )}
                        {/* Principle aligned indicator */}
                        {(init as any).principleAlignment?.ranking === "aligned" && (init as any).principleAlignment?.score >= 0.7 && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Principles aligned
                          </Badge>
                        )}
                      </div>
                      {/* Principle alignment rationale — one-liner shown below the badge row */}
                      {(init as any).principleAlignment?.rationale && (
                        <p className={`text-[11px] mt-1 leading-snug line-clamp-1 ${
                          (init as any).principleAlignment?.ranking === "violates"
                            ? "text-red-400/80"
                            : "text-emerald-500/70"
                        }`}>
                          {(init as any).principleAlignment.rationale}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {viewMode === "operational" && (
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setDetailInit(init)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          aria-label="View details"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setRemoveInit(init)}
                          className="p-1.5 rounded-lg text-muted-foreground/70 hover:text-red-400 hover:bg-muted transition-colors"
                          aria-label="Remove from strategy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Footer cross-links ── */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground/70 hover:text-foreground/70" onClick={() => navigate("/strategy/investment-risk")}>
            View Investment &amp; Risk →
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground/70 hover:text-foreground/70" onClick={() => navigate("/strategy/value")}>
            View Value →
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-violet-400 hover:text-violet-300 ml-auto" onClick={() => navigate("/strategy/draft")}>
            Next: Strategy draft →
          </Button>
        </div>
      </div>

      {/* ── Modals ── */}
      <InitiativeDetailModal
        initiative={detailInit}
        open={!!detailInit}
        onClose={() => setDetailInit(null)}
      />

      <RemoveConfirmModal
        initiative={removeInit}
        open={!!removeInit}
        onClose={() => setRemoveInit(null)}
        onConfirm={() => removeInit && handleRemoveInitiative(removeInit)}
        phaseCount={removeInit ? phaseData.find(p => p.key === removeInit._phase)?.count ?? 1 : 1}
      />

      <InitiativeSelectorModal
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onAdd={handleAddInitiative}
        currentIds={currentIds}
        strategyData={strategyQ.data}
      />

      {/* ── Initiative Drawer ── */}
      <InitiativeDrawer
        initiative={drawerInit as DrawerInitiative | null}
        allInPlan={enriched as DrawerInitiative[]}
        open={!!drawerInitId}
        onClose={() => setDrawerInitId(null)}
        onRemove={id => { setDrawerInitId(null); setRemoveInit(enriched.find(i => i.id === id) ?? null); }}
        isInPlan={true}
        onNavigate={id => setDrawerInitId(id)}
      />

      {/* ── Confirm Plan Dialog ── */}
      <Dialog open={confirmPlanOpen} onOpenChange={setConfirmPlanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm plan?</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3 text-sm text-muted-foreground">
            <p>
              You are about to confirm a plan of <strong className="text-foreground">{enriched.length} initiative{enriched.length !== 1 ? "s" : ""}</strong>.
              This will advance the strategy to the <strong className="text-foreground">Measurement</strong> stage.
            </p>
            {enriched.some((i: any) => i.principleAlignment?.ranking === "violates") && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {enriched.filter((i: any) => i.principleAlignment?.ranking === "violates").length} initiative{enriched.filter((i: any) => i.principleAlignment?.ranking === "violates").length !== 1 ? "s" : ""} conflict with your stated principles. Ensure you have reviewed and accepted these before confirming.
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground/60">You can return to this page to revise the plan — doing so will require re-confirming.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmPlanOpen(false)} disabled={confirmPlanMutation.isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={confirmPlanMutation.isPending}
              onClick={() => confirmPlanMutation.mutate({ selectedInitiativeIds: enriched.map((i: any) => i.id) })}
            >
              {confirmPlanMutation.isPending ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Confirming…</>
              ) : (
                "Confirm plan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
