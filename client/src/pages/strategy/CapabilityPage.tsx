/**
 * CapabilityPage — Stage 8 of the v3 HR AI Strategy flow.
 *
 * "Capability to deliver" — the honesty check. Sarah maps current capability
 * against what the strategy requires across four dimensions, identifies gaps,
 * and articulates how she'll close them.
 *
 * Four dimensions: Skills | Capacity | Change readiness | Vendor ecosystem
 * Each scored 1–5 on current and needed axes. Tactics required for positive gaps.
 * Delivery narrative (≥ 200 words) required to clear the gate.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGate } from "@/contexts/GateContext";
import { useDeepDive } from "@/hooks/useDeepDive";
import { DeepDiveConfirmedStatus } from "@/components/DeepDiveConfirmedStatus";
import SectionPageLayout from "@/components/SectionPageLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Zap,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DimKey = "skills" | "capacity" | "changeReadiness" | "vendorEcosystem";

interface DimData {
  current: number;
  needed: number;
  tactics: string[];
}

interface CapabilityState {
  skills: DimData;
  capacity: DimData;
  changeReadiness: DimData;
  vendorEcosystem: DimData;
  deliveryNarrative: string;
}

const EMPTY_DIM: DimData = { current: 0, needed: 0, tactics: [] };

const EMPTY_STATE: CapabilityState = {
  skills: { ...EMPTY_DIM },
  capacity: { ...EMPTY_DIM },
  changeReadiness: { ...EMPTY_DIM },
  vendorEcosystem: { ...EMPTY_DIM },
  deliveryNarrative: "",
};

const SCALE_LABELS: Record<number, string> = {
  1: "Significant gap",
  2: "Below requirement",
  3: "Adequate",
  4: "Strong",
  5: "Exceptional",
};

const DIMENSION_CONFIG: { key: DimKey; label: string; description: string; color: string }[] = [
  {
    key: "skills",
    label: "Skills",
    description: "Does your HR team have the AI literacy to execute?",
    color: "#818CF8",
  },
  {
    key: "capacity",
    label: "Capacity",
    description: "Does your team have the time and headcount?",
    color: "#34D399",
  },
  {
    key: "changeReadiness",
    label: "Change readiness",
    description: "Are managers, employees, and the org ready to adopt?",
    color: "#FBBF24",
  },
  {
    key: "vendorEcosystem",
    label: "Vendor ecosystem",
    description: "Do you have the supplier relationships needed?",
    color: "#F472B6",
  },
];

// ─── Score selector component ─────────────────────────────────────────────────

function ScoreSelector({
  value,
  onChange,
  label,
  color,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  color: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="flex gap-1.5" role="group" aria-label={`${label} score`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            aria-label={`${n} — ${SCALE_LABELS[n]}`}
            aria-pressed={value === n}
            title={SCALE_LABELS[n]}
            className={[
              "w-9 h-9 rounded-lg text-sm font-bold border-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1",
              value === n
                ? "border-transparent text-white shadow-md scale-105"
                : "border-border text-muted-foreground hover:border-current hover:text-foreground bg-transparent",
              disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
            style={value === n ? { background: color, borderColor: color, "--tw-ring-color": color } as React.CSSProperties : {}}
          >
            {n}
          </button>
        ))}
      </div>
      {value > 0 && (
        <span className="text-[11px] text-muted-foreground">{SCALE_LABELS[value]}</span>
      )}
    </div>
  );
}

// ─── Gap indicator ────────────────────────────────────────────────────────────

function GapIndicator({ current, needed, color }: { current: number; needed: number; color: string }) {
  if (current === 0 || needed === 0) return null;
  const gap = needed - current;
  if (gap > 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
        <TrendingUp className="w-3.5 h-3.5" />
        <span>Gap: {gap} point{gap !== 1 ? "s" : ""} — tactics required</span>
      </div>
    );
  }
  if (gap < 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
        <TrendingDown className="w-3.5 h-3.5" />
        <span>You're ahead — investment may be redirectable</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
      <Minus className="w-3.5 h-3.5" />
      <span>At requirement — no gap to close</span>
    </div>
  );
}

// ─── Dimension card ───────────────────────────────────────────────────────────

function DimensionCard({
  config,
  data,
  onChange,
  onSuggestTactics,
  isSuggesting,
  isLocked,
}: {
  config: (typeof DIMENSION_CONFIG)[number];
  data: DimData;
  onChange: (d: DimData) => void;
  onSuggestTactics: () => void;
  isSuggesting: boolean;
  isLocked: boolean;
}) {
  const gap = data.current > 0 && data.needed > 0 ? data.needed - data.current : null;
  const needsTactics = gap !== null && gap > 0;

  const addTactic = () => {
    onChange({ ...data, tactics: [...data.tactics, ""] });
  };

  const updateTactic = (idx: number, val: string) => {
    const t = [...data.tactics];
    t[idx] = val;
    onChange({ ...data, tactics: t });
  };

  const removeTactic = (idx: number) => {
    onChange({ ...data, tactics: data.tactics.filter((_, i) => i !== idx) });
  };

  return (
    <div
      className="rounded-xl border border-border bg-card p-5 space-y-5"
      style={{ borderLeftColor: config.color, borderLeftWidth: 3 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">{config.label}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
        </div>
        {data.current > 0 && data.needed > 0 && (
          <Badge
            variant="outline"
            className="text-[10px] shrink-0"
            style={{ borderColor: `${config.color}60`, color: config.color }}
          >
            {data.current}/5 → {data.needed}/5
          </Badge>
        )}
      </div>

      {/* Scoring */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ScoreSelector
          value={data.current}
          onChange={(v) => onChange({ ...data, current: v })}
          label="Current state"
          color={config.color}
          disabled={isLocked}
        />
        <ScoreSelector
          value={data.needed}
          onChange={(v) => onChange({ ...data, needed: v })}
          label="Needed for strategy"
          color={config.color}
          disabled={isLocked}
        />
      </div>

      {/* Gap indicator */}
      <GapIndicator current={data.current} needed={data.needed} color={config.color} />

      {/* Tactics section — only shown when gap > 0 */}
      {needsTactics && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Tactics to close the gap</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={onSuggestTactics}
              disabled={isSuggesting || isLocked}
            >
              <Sparkles className="w-3 h-3" />
              {isSuggesting ? "Suggesting…" : "Suggest tactics"}
            </Button>
          </div>

          {data.tactics.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No tactics added yet. Use "Suggest tactics" or add your own.
            </p>
          )}

          {data.tactics.map((tactic, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${config.color}20`, color: config.color }}>
                <ChevronRight className="w-3 h-3" />
              </div>
              <input
                type="text"
                value={tactic}
                onChange={(e) => updateTactic(idx, e.target.value)}
                disabled={isLocked}
                placeholder="Describe the tactic…"
                className="flex-1 text-sm bg-transparent border-b border-border focus:border-foreground outline-none py-0.5 text-foreground placeholder:text-muted-foreground/50"
              />
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => removeTactic(idx)}
                  className="text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                  aria-label="Remove tactic"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          {!isLocked && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground pl-0"
              onClick={addTactic}
            >
              <Plus className="w-3 h-3" />
              Add tactic
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CapabilityPage() {
  const [, navigate] = useLocation();
  const gate = useGate();
  const { isDeepDive } = useDeepDive();
  const utils = trpc.useUtils();

  // ── Data ──────────────────────────────────────────────────────────────────
  const capabilityQ = trpc.intelligence.getCapabilityAssessment.useQuery();
  const assessmentQ = trpc.intelligence.getStrategyAssessment.useQuery();

  // ── Local state ───────────────────────────────────────────────────────────
  const [cap, setCap] = useState<CapabilityState>(EMPTY_STATE);
  const [loaded, setLoaded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Load saved data ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded && capabilityQ.data !== undefined) {
      if (capabilityQ.data) {
        const d = capabilityQ.data as any;
        setCap({
          skills: d.skills ?? { ...EMPTY_DIM },
          capacity: d.capacity ?? { ...EMPTY_DIM },
          changeReadiness: d.changeReadiness ?? { ...EMPTY_DIM },
          vendorEcosystem: d.vendorEcosystem ?? { ...EMPTY_DIM },
          deliveryNarrative: d.deliveryNarrative ?? "",
        });
      }
      setLoaded(true);
    }
  }, [capabilityQ.data, loaded]);

  // ── Auto-save ─────────────────────────────────────────────────────────────
  const saveCapMut = trpc.intelligence.saveCapabilityAssessment.useMutation();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = useCallback((state: CapabilityState) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveCapMut.mutate({ capabilityJson: JSON.stringify(state) });
    }, 1500);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateCap = useCallback((next: CapabilityState) => {
    setCap(next);
    if (loaded) debouncedSave(next);
  }, [loaded, debouncedSave]);

  const updateDim = useCallback((key: DimKey, data: DimData) => {
    setCap(prev => {
      const next = { ...prev, [key]: data };
      if (loaded) debouncedSave(next);
      return next;
    });
  }, [loaded, debouncedSave]);

  // ── AI: suggest tactics ───────────────────────────────────────────────────
  const [suggestingDim, setSuggestingDim] = useState<DimKey | null>(null);
  const suggestTacticsMut = trpc.intelligence.suggestCapabilityTactics.useMutation({
    onSuccess: (data, variables) => {
      const dim = variables.dimension as DimKey;
      setCap(prev => {
        const next = {
          ...prev,
          [dim]: {
            ...prev[dim],
            tactics: [...prev[dim].tactics, ...data.tactics],
          },
        };
        debouncedSave(next);
        return next;
      });
      setSuggestingDim(null);
      toast.success("Tactics suggested — review and edit as needed.");
    },
    onError: () => {
      setSuggestingDim(null);
      toast.error("Could not suggest tactics. Please try again.");
    },
  });

  const ambitionTier = (() => {
    const bl = assessmentQ.data?.businessAmbitionLevel ?? 3;
    if (bl >= 4) return "transformative" as const;
    if (bl >= 3) return "progressive" as const;
    return "cautious" as const;
  })();

  const selectedInitiativeNames = (assessmentQ.data?.selectedInitiativeIds ?? []).slice(0, 8);

  const handleSuggestTactics = (key: DimKey) => {
    const d = cap[key];
    if (d.current === 0 || d.needed === 0) {
      toast.warning("Set both current and needed scores first.");
      return;
    }
    setSuggestingDim(key);
    suggestTacticsMut.mutate({
      dimension: key,
      current: d.current,
      needed: d.needed,
      sector: assessmentQ.data?.sector ?? undefined,
      ambitionTier,
      selectedInitiatives: selectedInitiativeNames,
    });
  };

  // ── AI: generate narrative ────────────────────────────────────────────────
  const generateNarrativeMut = trpc.intelligence.generateCapabilityNarrative.useMutation({
    onSuccess: (data) => {
      const next = { ...cap, deliveryNarrative: data.text };
      updateCap(next);
      toast.success("Delivery narrative generated.");
    },
    onError: () => toast.error("Could not generate narrative. Please try again."),
  });

  const handleGenerateNarrative = () => {
    generateNarrativeMut.mutate({
      capabilityData: {
        skills: cap.skills.current > 0 && cap.skills.needed > 0 ? cap.skills : undefined,
        capacity: cap.capacity.current > 0 && cap.capacity.needed > 0 ? cap.capacity : undefined,
        changeReadiness: cap.changeReadiness.current > 0 && cap.changeReadiness.needed > 0 ? cap.changeReadiness : undefined,
        vendorEcosystem: cap.vendorEcosystem.current > 0 && cap.vendorEcosystem.needed > 0 ? cap.vendorEcosystem : undefined,
      },
      sector: assessmentQ.data?.sector ?? undefined,
      ambitionTier,
      selectedInitiatives: selectedInitiativeNames,
    });
  };

  // ── Gate confirm ──────────────────────────────────────────────────────────
  const completeStage8Mut = trpc.gate.completeStage8.useMutation({
    onSuccess: () => {
      gate.refetch();
      utils.gate.getState.invalidate();
      setConfirmOpen(false);
      toast.success("Stage 8 confirmed — capability plan locked.");
      navigate("/strategy");
    },
    onError: (err) => {
      toast.error(err.message ?? "Could not confirm capability plan.");
    },
  });

  // ── Validation ────────────────────────────────────────────────────────────
  const allDimsScored = DIMENSION_CONFIG.every(
    d => cap[d.key].current > 0 && cap[d.key].needed > 0
  );

  const allGapsCovered = DIMENSION_CONFIG.every(d => {
    const dim = cap[d.key];
    const gap = dim.current > 0 && dim.needed > 0 ? dim.needed - dim.current : 0;
    if (gap <= 0) return true;
    return dim.tactics.filter(t => t.trim().length > 0).length >= 1;
  });

  const narrativeWordCount = cap.deliveryNarrative.trim().split(/\s+/).filter(Boolean).length;
  const narrativeOk = narrativeWordCount >= 200;

  const canConfirm = allDimsScored && allGapsCovered && narrativeOk;

  const isLocked = !gate.isStage8Accessible;

  // ── Summary stats ─────────────────────────────────────────────────────────
  const scoredDims = DIMENSION_CONFIG.filter(d => cap[d.key].current > 0 && cap[d.key].needed > 0);
  const gapDims = scoredDims.filter(d => cap[d.key].needed > cap[d.key].current);
  const totalTactics = DIMENSION_CONFIG.reduce((acc, d) => acc + cap[d.key].tactics.filter(t => t.trim()).length, 0);

  return (
    <SectionPageLayout
      sectionNumber="08"
      sectionLabel="Capability to deliver"
      title="Capability to deliver"
      accentColor="#818CF8"
      icon={<Zap className="w-5 h-5" />}
      isLocked={isLocked}
      editedAfterClearing={gate.stage8EditedAfterClearing}
      upstreamStageLabel="Business case"
      isDeepDive={isDeepDive}
      confirmedAt={gate.gateState?.stage8.completedAt}
      stageProgress={!isDeepDive && !isLocked ? {
        stageNumber: 8,
        title: "Capability Assessment",
        description: "Score your capability across four dimensions, identify gaps, and generate your delivery narrative. Confirm when all dimensions are scored and the narrative is complete.",
        isCleared: !!gate.stage8Cleared,
        isEdited: !!gate.stage8EditedAfterClearing,
        canConfirm,
        isPending: completeStage8Mut.isPending,
        onConfirm: () => completeStage8Mut.mutate({ stage8CapabilityJson: JSON.stringify(cap) }),
        backRoute: "/strategy/business-case",
        nextRoute: "/strategy/review",
        nextLabel: "Review Session",
      } : undefined}
    >
      {/* Intro */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground max-w-2xl">
          The honesty check. Map your current capability against what the strategy requires across
          four dimensions, identify the gaps, and articulate how you'll close them. Without this,
          the strategy is wishful.
        </p>
        {scoredDims.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{scoredDims.length} of 4 dimensions scored</span>
            </div>
            {gapDims.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>{gapDims.length} gap{gapDims.length !== 1 ? "s" : ""} to close</span>
              </div>
            )}
            {totalTactics > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>{totalTactics} tactic{totalTactics !== 1 ? "s" : ""} listed</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scale legend */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Scale reference</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {Object.entries(SCALE_LABELS).map(([n, label]) => (
            <div key={n} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-5 h-5 rounded-md bg-border flex items-center justify-center text-[10px] font-bold text-foreground">{n}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dimension cards */}
      <div className="space-y-4">
        {DIMENSION_CONFIG.map(config => (
          <DimensionCard
            key={config.key}
            config={config}
            data={cap[config.key]}
            onChange={(d) => updateDim(config.key, d)}
            onSuggestTactics={() => handleSuggestTactics(config.key)}
            isSuggesting={suggestingDim === config.key}
            isLocked={isLocked}
          />
        ))}
      </div>

      {/* Delivery narrative */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Delivery narrative</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              How will you close the gaps and execute the strategy? Minimum 200 words.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-medium ${narrativeOk ? "text-emerald-500" : "text-muted-foreground"}`}>
              {narrativeWordCount} words{narrativeOk ? "" : ` / 200 required`}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={handleGenerateNarrative}
              disabled={generateNarrativeMut.isPending || !allDimsScored || isLocked}
            >
              <Sparkles className="w-3 h-3" />
              {generateNarrativeMut.isPending ? "Generating…" : "Generate narrative"}
            </Button>
          </div>
        </div>

        <Textarea
          value={cap.deliveryNarrative}
          onChange={(e) => updateCap({ ...cap, deliveryNarrative: e.target.value })}
          disabled={isLocked}
          placeholder="Describe how you will build the capability needed to execute this strategy. Be specific about timelines, owners, and how each gap will be closed…"
          className="min-h-[200px] text-sm resize-y"
          aria-label="Delivery narrative"
        />

        {!narrativeOk && cap.deliveryNarrative.trim().length > 0 && (
          <p className="text-xs text-amber-500 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {200 - narrativeWordCount} more word{200 - narrativeWordCount !== 1 ? "s" : ""} needed to meet the minimum.
          </p>
        )}
      </div>

      {/* Gate confirm */}
      {!isLocked && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Confirm capability plan</p>
            <p className="text-xs text-muted-foreground">
              All 4 dimensions scored, tactics for all gaps, and delivery narrative confirmed.
            </p>
            {!canConfirm && (
              <ul className="text-xs text-amber-500 space-y-0.5 mt-1">
                {!allDimsScored && <li>• Score all 4 dimensions (current and needed)</li>}
                {!allGapsCovered && <li>• Add at least 1 tactic for each gap area</li>}
                {!narrativeOk && <li>• Delivery narrative must be at least 200 words ({narrativeWordCount} / 200)</li>}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-2">
            {gate.stage8Cleared && !isDeepDive && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => navigate("/strategy/review")}
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              disabled={!canConfirm || completeStage8Mut.isPending}
              onClick={() => setConfirmOpen(true)}
              className="gap-2 shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              {completeStage8Mut.isPending ? "Confirming…" : gate.stage8Cleared ? "Re-confirm" : "Confirm capability →"}
            </Button>
          </div>
        </div>
      )}

      {gate.stage8Cleared && isDeepDive && (
        <DeepDiveConfirmedStatus
          confirmedAt={gate.gateState?.stage8.completedAt}
          label="Stage 8 confirmed"
        />
      )}

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm capability plan?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              This will lock Stage 8 and mark your capability plan as confirmed.
              You can still return to edit, but you'll need to re-confirm.
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
              {DIMENSION_CONFIG.map(d => {
                const dim = cap[d.key];
                const gap = dim.needed - dim.current;
                return (
                  <div key={d.key} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{d.label}</span>
                    <span className="text-muted-foreground">
                      {dim.current}/5 → {dim.needed}/5
                      {gap > 0 ? ` (${dim.tactics.filter(t => t.trim()).length} tactic${dim.tactics.filter(t => t.trim()).length !== 1 ? "s" : ""})` : " ✓"}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                <span className="font-medium text-foreground">Delivery narrative</span>
                <span className="text-muted-foreground">{narrativeWordCount} words</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => completeStage8Mut.mutate({ stage8CapabilityJson: JSON.stringify(cap) })}
              disabled={completeStage8Mut.isPending}
            >
              {completeStage8Mut.isPending ? "Confirming…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionPageLayout>
  );
}
