/**
 * StrategyRoadmapStagePage — Stage 6 of 11 (NEW in v4)
 *
 * Purpose: Assign each selected initiative to a horizon (Now / Next / Later by default).
 * Users can rename horizons, add dates, add initiatives to horizons via drag-style
 * assignment, and optionally record dependencies between initiatives.
 *
 * Gate: All selected initiatives must be assigned to a horizon before confirming.
 * Dependencies are optional — zero is valid.
 *
 * Data model: roadmapJson saved to ailOrgContext.roadmapJson
 * {
 *   horizons: Array<{ id, label, startDate?, endDate?, order }>,
 *   assignments: Array<{ initiativeId, horizonId }>,
 *   dependencies: Array<{ fromId, toId, reason? }>
 * }
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Map, Plus, Trash2, Pencil, Check, X, ChevronRight,
  ArrowRight, Loader2, CheckCircle2, Sparkles, Calendar,
  GitBranch, AlertCircle, Info, GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { useGate } from "@/contexts/GateContext";
import SectionPageLayout from "@/components/SectionPageLayout";
import { toast } from "sonner";
import { INITIATIVE_LIBRARY } from "../../../../shared/initiativeLibrary";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Horizon {
  id: string;
  label: string;
  startDate?: string | null;
  endDate?: string | null;
  order: number;
}

interface Assignment {
  initiativeId: string;
  horizonId: string;
}

interface Dependency {
  fromId: string;
  toId: string;
  reason?: string;
}

interface RoadmapData {
  horizons: Horizon[];
  assignments: Assignment[];
  dependencies: Dependency[];
}

// ─── Default horizons ─────────────────────────────────────────────────────────

const DEFAULT_HORIZONS: Horizon[] = [
  { id: "now",  label: "Now",  startDate: null, endDate: null, order: 0 },
  { id: "next", label: "Next", startDate: null, endDate: null, order: 1 },
  { id: "later",label: "Later",startDate: null, endDate: null, order: 2 },
];

// ─── Horizon colour palette ───────────────────────────────────────────────────

const HORIZON_COLORS = [
  { bg: "bg-emerald-500/10", border: "border-emerald-500/30", badge: "bg-emerald-500/20 text-emerald-300", dot: "bg-emerald-400" },
  { bg: "bg-violet-500/10",  border: "border-violet-500/30",  badge: "bg-violet-500/20 text-violet-300",  dot: "bg-violet-400"  },
  { bg: "bg-amber-500/10",   border: "border-amber-500/30",   badge: "bg-amber-500/20 text-amber-300",   dot: "bg-amber-400"   },
  { bg: "bg-sky-500/10",     border: "border-sky-500/30",     badge: "bg-sky-500/20 text-sky-300",     dot: "bg-sky-400"     },
  { bg: "bg-rose-500/10",    border: "border-rose-500/30",    badge: "bg-rose-500/20 text-rose-300",    dot: "bg-rose-400"    },
];

function getHorizonColor(index: number) {
  return HORIZON_COLORS[index % HORIZON_COLORS.length];
}

// ─── Initiative card ──────────────────────────────────────────────────────────

interface InitiativeCardProps {
  id: string;
  label: string;
  description: string;
  phaseV3?: string;
  y1CostRange?: { low: number; high: number };
  horizonId: string | null;
  horizons: Horizon[];
  onAssign: (initiativeId: string, horizonId: string) => void;
  dependencies: Dependency[];
  allInitiatives: Array<{ id: string; label: string }>;
  onAddDependency: (fromId: string, toId: string) => void;
  onRemoveDependency: (fromId: string, toId: string) => void;
}

function InitiativeCard({
  id, label, description, phaseV3, y1CostRange,
  horizonId, horizons, onAssign,
  dependencies, allInitiatives, onAddDependency, onRemoveDependency,
}: InitiativeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [depPickerOpen, setDepPickerOpen] = useState(false);

  const incomingDeps = dependencies.filter(d => d.toId === id);
  const outgoingDeps = dependencies.filter(d => d.fromId === id);

  const phaseColors: Record<string, string> = {
    foundation: "text-emerald-400 bg-emerald-500/10",
    build:      "text-violet-400 bg-violet-500/10",
    scale:      "text-amber-400 bg-amber-500/10",
    optimise:   "text-sky-400 bg-sky-500/10",
  };

  const assignedHorizon = horizons.find(h => h.id === horizonId);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
      {/* Card header */}
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 text-slate-500">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{label}</span>
            {phaseV3 && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${phaseColors[phaseV3] ?? "text-slate-400 bg-slate-500/10"}`}>
                {phaseV3}
              </span>
            )}
            {y1CostRange && (
              <span className="text-[10px] text-slate-500">
                £{y1CostRange.low}k–{y1CostRange.high}k Y1
              </span>
            )}
          </div>
          {expanded && (
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{description}</p>
          )}
          {/* Dependencies */}
          {(incomingDeps.length > 0 || outgoingDeps.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {incomingDeps.map(d => {
                const src = allInitiatives.find(i => i.id === d.fromId);
                return src ? (
                  <span key={d.fromId} className="inline-flex items-center gap-1 text-[10px] bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded-full">
                    <ArrowRight className="w-2.5 h-2.5 rotate-180" />
                    {src.label}
                  </span>
                ) : null;
              })}
              {outgoingDeps.map(d => {
                const tgt = allInitiatives.find(i => i.id === d.toId);
                return tgt ? (
                  <span key={d.toId} className="inline-flex items-center gap-1 text-[10px] bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded-full">
                    <ArrowRight className="w-2.5 h-2.5" />
                    {tgt.label}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Toggle details"
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        </div>
      </div>

      {/* Horizon assignment row */}
      <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-slate-500 shrink-0">Horizon:</span>
        <div className="flex gap-1.5 flex-wrap">
          {horizons.map((h, idx) => {
            const col = getHorizonColor(idx);
            const active = horizonId === h.id;
            return (
              <button
                key={h.id}
                onClick={() => onAssign(id, h.id)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all ${
                  active
                    ? `${col.badge} ${col.border} border`
                    : "text-slate-500 border-white/10 hover:border-white/20 hover:text-slate-300"
                }`}
              >
                {active && <span className="mr-1">✓</span>}
                {h.label}
              </button>
            );
          })}
        </div>

        {/* Dependency toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setDepPickerOpen(true)}
                className="ml-auto p-1 rounded text-slate-600 hover:text-slate-400 transition-colors"
              >
                <GitBranch className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Add / remove dependencies</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Dependency picker dialog */}
      <Dialog open={depPickerOpen} onOpenChange={setDepPickerOpen}>
        <DialogContent className="bg-[#0f1623] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-sm">Dependencies for "{label}"</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-400 mb-3">
            Mark initiatives that must be completed <strong className="text-slate-300">before</strong> this one can start.
            Dependencies are optional and informational.
          </p>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {allInitiatives.filter(i => i.id !== id).map(i => {
              const isDep = dependencies.some(d => d.fromId === i.id && d.toId === id);
              return (
                <button
                  key={i.id}
                  onClick={() => isDep ? onRemoveDependency(i.id, id) : onAddDependency(i.id, id)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                    isDep
                      ? "bg-violet-500/10 text-violet-300 border border-violet-500/30"
                      : "text-slate-400 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${isDep ? "border-violet-400 bg-violet-500/20" : "border-slate-600"}`}>
                    {isDep && <Check className="w-2 h-2" />}
                  </span>
                  {i.label}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setDepPickerOpen(false)} className="text-xs">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Horizon column ───────────────────────────────────────────────────────────

interface HorizonColumnProps {
  horizon: Horizon;
  colorIdx: number;
  initiatives: Array<{ id: string; label: string; description: string; phaseV3?: string; y1CostRange?: { low: number; high: number } }>;
  allHorizons: Horizon[];
  allInitiatives: Array<{ id: string; label: string }>;
  onAssign: (initiativeId: string, horizonId: string) => void;
  onEditHorizon: (h: Horizon) => void;
  onDeleteHorizon: (id: string) => void;
  dependencies: Dependency[];
  onAddDependency: (fromId: string, toId: string) => void;
  onRemoveDependency: (fromId: string, toId: string) => void;
}

function HorizonColumn({
  horizon, colorIdx, initiatives, allHorizons, allInitiatives,
  onAssign, onEditHorizon, onDeleteHorizon,
  dependencies, onAddDependency, onRemoveDependency,
}: HorizonColumnProps) {
  const col = getHorizonColor(colorIdx);
  const totalCost = initiatives.reduce((sum, i) => {
    const def = INITIATIVE_LIBRARY.find(d => d.id === i.id);
    return sum + (def?.y1CostRange?.low ?? 0);
  }, 0);

  return (
    <div className={`rounded-2xl border ${col.border} ${col.bg} p-4 flex flex-col gap-3 min-h-[200px]`}>
      {/* Column header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${col.dot}`} />
          <span className="text-sm font-bold text-white">{horizon.label}</span>
          <span className="text-[11px] text-slate-500">{initiatives.length} initiative{initiatives.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-1">
          {horizon.startDate && (
            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
              <Calendar className="w-2.5 h-2.5" />
              {horizon.startDate}
            </span>
          )}
          <button
            onClick={() => onEditHorizon(horizon)}
            className="p-1 rounded text-slate-600 hover:text-slate-300 transition-colors"
            aria-label="Edit horizon"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDeleteHorizon(horizon.id)}
            className="p-1 rounded text-slate-600 hover:text-rose-400 transition-colors"
            aria-label="Delete horizon"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Cost summary */}
      {totalCost > 0 && (
        <div className="text-[10px] text-slate-500">
          Est. Y1 cost floor: £{totalCost.toLocaleString()}k+
        </div>
      )}

      {/* Initiative cards */}
      <div className="flex flex-col gap-2">
        {initiatives.length === 0 && (
          <div className="text-[11px] text-slate-600 italic text-center py-4 border border-dashed border-white/5 rounded-lg">
            No initiatives assigned yet
          </div>
        )}
        {initiatives.map(i => (
          <InitiativeCard
            key={i.id}
            id={i.id}
            label={i.label}
            description={i.description}
            phaseV3={i.phaseV3}
            y1CostRange={i.y1CostRange}
            horizonId={horizon.id}
            horizons={allHorizons}
            onAssign={onAssign}
            dependencies={dependencies}
            allInitiatives={allInitiatives}
            onAddDependency={onAddDependency}
            onRemoveDependency={onRemoveDependency}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Edit horizon dialog ──────────────────────────────────────────────────────

interface EditHorizonDialogProps {
  horizon: Horizon | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Horizon) => void;
}

function EditHorizonDialog({ horizon, open, onClose, onSave }: EditHorizonDialogProps) {
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (horizon) {
      setLabel(horizon.label);
      setStartDate(horizon.startDate ?? "");
      setEndDate(horizon.endDate ?? "");
    }
  }, [horizon]);

  if (!horizon) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f1623] border-white/10 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white text-sm">Edit horizon</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Label</label>
            <Input
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="bg-white/5 border-white/10 text-white text-sm h-8"
              placeholder="e.g. Now, Q1 2026, H1…"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Start date <span className="text-slate-600">(optional)</span></label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-sm h-8"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">End date <span className="text-slate-600">(optional)</span></label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-sm h-8"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-600 flex items-start gap-1">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            Dates are optional. Leave blank to keep Now / Next / Later as relative horizons.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button size="sm" variant="outline" onClick={onClose} className="text-xs">Cancel</Button>
          <Button
            size="sm"
            onClick={() => {
              if (!label.trim()) return;
              onSave({ ...horizon, label: label.trim(), startDate: startDate || null, endDate: endDate || null });
              onClose();
            }}
            className="text-xs bg-teal-600 hover:bg-teal-500 text-white"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StrategyRoadmapStagePage() {
  const [, navigate] = useLocation();
  const gate = useGate();

  // Server data
  const strategyQ = trpc.intelligence.getStrategy.useQuery(undefined, { staleTime: 30_000 });
  const roadmapQ  = trpc.intelligence.getRoadmap.useQuery(undefined, { staleTime: 30_000 });

  // Gate mutation
  const completeStage6Mut = trpc.gate.completeStage6.useMutation({
    onSuccess: () => {
      gate.refetch();
      setJustConfirmed(true);
      toast.success("Roadmap confirmed — Outcomes unlocked");
      setTimeout(() => navigate("/strategy/measures"), 2200);
    },
    onError: (err) => toast.error(err.message ?? "Could not confirm roadmap."),
  });

  // Local state
  const [horizons, setHorizons] = useState<Horizon[]>(DEFAULT_HORIZONS);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [editingHorizon, setEditingHorizon] = useState<Horizon | null>(null);
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [aiSuggestPending, setAiSuggestPending] = useState(false);

  // Seed from saved roadmapJson on load
  useEffect(() => {
    if (!roadmapQ.data?.roadmap) return;
    const saved = roadmapQ.data.roadmap;
    if (saved.horizons?.length) setHorizons(saved.horizons);
    if (saved.assignments?.length) setAssignments(saved.assignments);
    if (saved.dependencies?.length) setDependencies(saved.dependencies);
  }, [roadmapQ.data]);

  // Derive selected initiatives from Stage 5
  const selectedIds: string[] = useMemo(() => {
    return strategyQ.data?.selectedInitiativeIds ?? [];
  }, [strategyQ.data]);

  const initiativeDetails = useMemo(() => {
    return selectedIds.map(id => {
      const def = INITIATIVE_LIBRARY.find(d => d.id === id);
      return {
        id,
        label: def?.label ?? id,
        description: def?.description ?? "",
        phaseV3: def?.phaseV3,
        y1CostRange: def?.y1CostRange,
        prerequisites: def?.prerequisites ?? [],
        coDeployments: def?.coDeployments ?? [],
      };
    });
  }, [selectedIds]);

  // Unassigned initiatives
  const unassignedIds = useMemo(() => {
    const assigned = new Set(assignments.map(a => a.initiativeId));
    return selectedIds.filter(id => !assigned.has(id));
  }, [selectedIds, assignments]);

  // Can confirm: all initiatives assigned
  const canConfirm = unassignedIds.length === 0 && selectedIds.length > 0 && !completeStage6Mut.isPending;

  // Assign initiative to horizon
  const handleAssign = useCallback((initiativeId: string, horizonId: string) => {
    setAssignments(prev => {
      const without = prev.filter(a => a.initiativeId !== initiativeId);
      return [...without, { initiativeId, horizonId }];
    });
    // Mark stage as edited if previously confirmed
    if (gate.stage6Cleared) {
      gate.markEdited("stage6");
    }
  }, [gate]);

  // Add / remove dependency
  const handleAddDependency = useCallback((fromId: string, toId: string) => {
    setDependencies(prev => {
      if (prev.some(d => d.fromId === fromId && d.toId === toId)) return prev;
      return [...prev, { fromId, toId }];
    });
    if (gate.stage6Cleared) gate.markEdited("stage6");
  }, [gate]);

  const handleRemoveDependency = useCallback((fromId: string, toId: string) => {
    setDependencies(prev => prev.filter(d => !(d.fromId === fromId && d.toId === toId)));
    if (gate.stage6Cleared) gate.markEdited("stage6");
  }, [gate]);

  // Add horizon
  const handleAddHorizon = () => {
    const newId = `horizon_${Date.now()}`;
    setHorizons(prev => [...prev, { id: newId, label: `Horizon ${prev.length + 1}`, startDate: null, endDate: null, order: prev.length }]);
    if (gate.stage6Cleared) gate.markEdited("stage6");
  };

  // Edit horizon
  const handleSaveHorizon = (updated: Horizon) => {
    setHorizons(prev => prev.map(h => h.id === updated.id ? updated : h));
    if (gate.stage6Cleared) gate.markEdited("stage6");
  };

  // Delete horizon (reassign its initiatives to unassigned)
  const handleDeleteHorizon = (horizonId: string) => {
    if (horizons.length <= 1) return; // must keep at least one
    setHorizons(prev => prev.filter(h => h.id !== horizonId));
    setAssignments(prev => prev.filter(a => a.horizonId !== horizonId));
    if (gate.stage6Cleared) gate.markEdited("stage6");
  };

  // AI suggest: auto-assign unassigned initiatives using phaseV3 heuristic
  const handleAiSuggest = async () => {
    setAiSuggestPending(true);
    await new Promise(r => setTimeout(r, 800)); // brief UX pause

    const phaseToHorizon: Record<string, string> = {
      foundation: horizons[0]?.id ?? "now",
      build:      horizons[1]?.id ?? horizons[0]?.id ?? "now",
      scale:      horizons[2]?.id ?? horizons[1]?.id ?? horizons[0]?.id ?? "now",
      optimise:   horizons[horizons.length - 1]?.id ?? "now",
    };

    setAssignments(prev => {
      const updated = [...prev];
      for (const init of initiativeDetails) {
        const alreadyAssigned = updated.some(a => a.initiativeId === init.id);
        if (!alreadyAssigned) {
          const horizonId = init.phaseV3 ? (phaseToHorizon[init.phaseV3] ?? horizons[0]?.id) : horizons[0]?.id;
          if (horizonId) updated.push({ initiativeId: init.id, horizonId });
        }
      }
      return updated;
    });

    // Suggest dependencies from library prerequisites / coDeployments
    setDependencies(prev => {
      const updated = [...prev];
      for (const init of initiativeDetails) {
        for (const coId of init.coDeployments) {
          if (selectedIds.includes(coId) && !updated.some(d => d.fromId === init.id && d.toId === coId)) {
            // Only suggest, don't force
          }
        }
      }
      return updated;
    });

    setAiSuggestPending(false);
  };

  // Confirm
  const handleConfirm = () => {
    const roadmapJson = JSON.stringify({ horizons, assignments, dependencies });
    completeStage6Mut.mutate({ roadmapJson });
  };

  const isLocked = !gate.isStage6Accessible;

  if (strategyQ.isLoading || roadmapQ.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <SectionPageLayout
        sectionNumber="06"
        sectionLabel="Roadmap"
        title="Sequence your initiatives"
        accentColor="rgb(20,184,166)"
        icon={<Map className="w-5 h-5 text-teal-400" />}
        isLocked={isLocked}
        editedAfterClearing={gate.stage6EditedAfterClearing}
        upstreamStageLabel="Initiatives (Stage 5)"
        stageProgress={{
          stageNumber: 6,
          title: "Roadmap",
          description: "Assign every selected initiative to a horizon. Dependencies are optional. Confirm when all initiatives are placed.",
          isCleared: gate.stage6Cleared,
          isEdited: gate.stage6EditedAfterClearing,
          canConfirm,
          isPending: completeStage6Mut.isPending,
          onConfirm: handleConfirm,
          backRoute: "/strategy/plan",
          nextRoute: "/strategy/measures",
          nextLabel: "Outcomes",
        }}
      >
        {/* Success flash */}
        {justConfirmed && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">Stage 6 confirmed — Outcomes unlocked.</p>
              <p className="text-xs text-emerald-400/70 mt-0.5 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Moving to Outcomes…
              </p>
            </div>
          </div>
        )}

        {/* Unassigned warning */}
        {unassignedIds.length > 0 && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-300">
                {unassignedIds.length} initiative{unassignedIds.length !== 1 ? "s" : ""} not yet assigned
              </p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                All initiatives must be placed in a horizon before you can confirm.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAiSuggest}
              disabled={aiSuggestPending}
              className="shrink-0 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            >
              {aiSuggestPending ? (
                <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Suggesting…</>
              ) : (
                <><Sparkles className="w-3 h-3 mr-1" /> Auto-assign</>
              )}
            </Button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {selectedIds.length} initiative{selectedIds.length !== 1 ? "s" : ""} across {horizons.length} horizon{horizons.length !== 1 ? "s" : ""}
            </span>
            {unassignedIds.length === 0 && selectedIds.length > 0 && (
              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">All assigned</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unassignedIds.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAiSuggest}
                disabled={aiSuggestPending}
                className="text-xs h-7 border-teal-500/30 text-teal-300 hover:bg-teal-500/10"
              >
                {aiSuggestPending ? (
                  <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Suggesting…</>
                ) : (
                  <><Sparkles className="w-3 h-3 mr-1" /> AI suggest</>
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddHorizon}
              className="text-xs h-7 border-white/10 text-slate-300 hover:bg-white/5"
            >
              <Plus className="w-3 h-3 mr-1" /> Add horizon
            </Button>
          </div>
        </div>

        {/* Horizon columns */}
        {horizons.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            No horizons defined. Click "Add horizon" to create one.
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(horizons.length, 3)}, 1fr)` }}>
            {[...horizons].sort((a, b) => a.order - b.order).map((h, idx) => {
              const hInitiatives = assignments
                .filter(a => a.horizonId === h.id)
                .map(a => initiativeDetails.find(i => i.id === a.initiativeId))
                .filter(Boolean) as typeof initiativeDetails;

              return (
                <HorizonColumn
                  key={h.id}
                  horizon={h}
                  colorIdx={idx}
                  initiatives={hInitiatives}
                  allHorizons={horizons}
                  allInitiatives={initiativeDetails.map(i => ({ id: i.id, label: i.label }))}
                  onAssign={handleAssign}
                  onEditHorizon={h => setEditingHorizon(h)}
                  onDeleteHorizon={handleDeleteHorizon}
                  dependencies={dependencies}
                  onAddDependency={handleAddDependency}
                  onRemoveDependency={handleRemoveDependency}
                />
              );
            })}
          </div>
        )}

        {/* Unassigned pool */}
        {unassignedIds.length > 0 && (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300">Unassigned initiatives</span>
              <span className="text-[11px] text-slate-500">— click a horizon button on each card to assign</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {unassignedIds.map(id => {
                const init = initiativeDetails.find(i => i.id === id);
                if (!init) return null;
                return (
                  <InitiativeCard
                    key={id}
                    id={id}
                    label={init.label}
                    description={init.description}
                    phaseV3={init.phaseV3}
                    y1CostRange={init.y1CostRange}
                    horizonId={null}
                    horizons={horizons}
                    onAssign={handleAssign}
                    dependencies={dependencies}
                    allInitiatives={initiativeDetails.map(i => ({ id: i.id, label: i.label }))}
                    onAddDependency={handleAddDependency}
                    onRemoveDependency={handleRemoveDependency}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Methodology note */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-400">Horizons</strong> represent relative sequencing, not fixed timelines.
            "Now" means active or imminent; "Next" means planned for the near term; "Later" means future consideration.
            Add dates to any horizon to convert it to a fiscal or calendar period.
            <strong className="text-slate-400"> Dependencies</strong> are informational — they do not block confirmation.
          </p>
        </div>
      </SectionPageLayout>

      {/* Edit horizon dialog */}
      <EditHorizonDialog
        horizon={editingHorizon}
        open={!!editingHorizon}
        onClose={() => setEditingHorizon(null)}
        onSave={handleSaveHorizon}
      />
    </TooltipProvider>
  );
}
