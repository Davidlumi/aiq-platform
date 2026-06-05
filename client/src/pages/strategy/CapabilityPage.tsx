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
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Pencil,
  X,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";

// ─── Risk register types ──────────────────────────────────────────────────────

type RiskStatus = "pending" | "accepted" | "edited" | "dismissed";

interface RiskRegisterItem {
  id: string;
  title: string;
  description: string;
  likelihood: number;
  impact: number;
  mitigation: string;
  status: RiskStatus;
  aiSuggested: boolean;
  createdAt: number;
}

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
  const isRewardMode = gate.tenantMode === "reward";
  // Mode-aware dimension config: Reward mode uses Reward-specific descriptions
  const activeDimConfig = isRewardMode
    ? DIMENSION_CONFIG.map(d => {
        if (d.key === "skills") return { ...d, description: "Does your Reward team have the data & analytics literacy to execute?" };
        if (d.key === "capacity") return { ...d, description: "Does your team have the time and headcount to run reward cycles?" };
        if (d.key === "changeReadiness") return { ...d, description: "Are managers and employees ready to adopt new reward frameworks?" };
        if (d.key === "vendorEcosystem") return { ...d, description: "Do you have the compensation benchmarking and HRIS supplier relationships needed?" };
        return d;
      })
    : DIMENSION_CONFIG;

  // ── Data ──────────────────────────────────────────────────────────────────
  const capabilityQ = trpc.intelligence.getCapabilityAssessment.useQuery();
  const assessmentQ = trpc.intelligence.getStrategyAssessment.useQuery();

  // ── Local state ───────────────────────────────────────────────────────────
  const [cap, setCap] = useState<CapabilityState>(EMPTY_STATE);
  const [loaded, setLoaded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // T11: material-gap soft prompt state
  const [materialGapPromptOpen, setMaterialGapPromptOpen] = useState(false);

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
    if (loaded) {
      debouncedSave(next);
      // T11: editing capability after Stage 8 cleared → stale Stage 9 Business Case
      if (gate.stage8Cleared) gate.markEdited("stage8");
    }
  }, [loaded, debouncedSave, gate]);

  const updateDim = useCallback((key: DimKey, data: DimData) => {
    setCap(prev => {
      const next = { ...prev, [key]: data };
      if (loaded) {
        debouncedSave(next);
        // T11: editing capability after Stage 8 cleared → stale Stage 9 Business Case
        if (gate.stage8Cleared) gate.markEdited("stage8");
      }
      return next;
    });
  }, [loaded, debouncedSave, gate]);

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
      mode: isRewardMode ? "reward" : "cpo",
    });
  };

  // ── Risk register state ─────────────────────────────────────────────────
  const [risks, setRisks] = useState<RiskRegisterItem[]>([]);
  const [risksLoaded, setRisksLoaded] = useState(false);
  const [editingRiskId, setEditingRiskId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<RiskRegisterItem>>({});
  const [isSuggestingRisks, setIsSuggestingRisks] = useState(false);

  const riskRegisterQ = trpc.intelligence.getRiskRegister.useQuery();
  const saveRisksMut = trpc.intelligence.saveRiskRegister.useMutation();
  const suggestRisksMut = trpc.intelligence.suggestRisks.useMutation({
    onSuccess: (data) => {
      const newRisks: RiskRegisterItem[] = (data.risks as any[]).map((r: any) => ({
        id: crypto.randomUUID(),
        title: r.title,
        description: r.description,
        likelihood: r.likelihood ?? 3,
        impact: r.impact ?? 3,
        mitigation: r.mitigation ?? "",
        status: "pending" as RiskStatus,
        aiSuggested: true,
        createdAt: Date.now(),
      }));
      setRisks(prev => {
        const merged = [...prev, ...newRisks.filter(nr => !prev.some(p => p.title === nr.title))];
        saveRisksMut.mutate({ risksJson: JSON.stringify(merged) });
        return merged;
      });
      setIsSuggestingRisks(false);
      toast.success(`${newRisks.length} risk${newRisks.length !== 1 ? "s" : ""} suggested — review each one before confirming.`);
    },
    onError: () => {
      setIsSuggestingRisks(false);
      toast.error("Could not suggest risks. Please try again.");
    },
  });

  // Load saved risks
  useEffect(() => {
    if (!risksLoaded && riskRegisterQ.data !== undefined) {
      if (riskRegisterQ.data && Array.isArray(riskRegisterQ.data)) {
        setRisks(riskRegisterQ.data as RiskRegisterItem[]);
      }
      setRisksLoaded(true);
    }
  }, [riskRegisterQ.data, risksLoaded]);

  const saveRisksDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistRisks = useCallback((updated: RiskRegisterItem[]) => {
    if (saveRisksDebounceRef.current) clearTimeout(saveRisksDebounceRef.current);
    saveRisksDebounceRef.current = setTimeout(() => {
      saveRisksMut.mutate({ risksJson: JSON.stringify(updated) });
    }, 800);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateRisk = useCallback((id: string, patch: Partial<RiskRegisterItem>) => {
    setRisks(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, ...patch } : r);
      persistRisks(updated);
      return updated;
    });
  }, [persistRisks]);

  const addManualRisk = useCallback(() => {
    const newRisk: RiskRegisterItem = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      likelihood: 3,
      impact: 3,
      mitigation: "",
      status: "accepted",
      aiSuggested: false,
      createdAt: Date.now(),
    };
    setRisks(prev => {
      const updated = [...prev, newRisk];
      persistRisks(updated);
      return updated;
    });
    setEditingRiskId(newRisk.id);
    setEditDraft({ title: "", description: "", likelihood: 3, impact: 3, mitigation: "" });
  }, [persistRisks]);

  const deleteRisk = useCallback((id: string) => {
    setRisks(prev => {
      const updated = prev.filter(r => r.id !== id);
      persistRisks(updated);
      return updated;
    });
  }, [persistRisks]);

  const handleSuggestRisks = () => {
    setIsSuggestingRisks(true);
    suggestRisksMut.mutate({
      sector: assessmentQ.data?.sector ?? undefined,
      selectedInitiatives: selectedInitiativeNames,
      ambitionTier,
    });
  };

  // ── Risk gate validation ──────────────────────────────────────────────────
  const pendingAiRisks = risks.filter(r => r.aiSuggested && r.status === "pending");
  const actionedRisks = risks.filter(r => r.status !== "pending");
  const risksWithMitigation = actionedRisks.filter(r => r.mitigation.trim().length > 0);
  const riskGateOk = pendingAiRisks.length === 0 && risksWithMitigation.length >= 1;

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

  // T11: material gap = any dimension where needed > current + 1 (i.e. gap > 1 level)
  const hasMaterialGap = activeDimConfig.some(d => {
    const dim = cap[d.key];
    return dim.current > 0 && dim.needed > 0 && (dim.needed - dim.current) > 1;
  });

  const handleConfirmStage8 = () => {
    // T11: if a material gap exists and Stage 7 is already cleared, show soft prompt first
    if (hasMaterialGap && gate.stage7Cleared && !materialGapPromptOpen) {
      setMaterialGapPromptOpen(true);
      return;
    }
    setMaterialGapPromptOpen(false);
    completeStage8Mut.mutate({
      stage8CapabilityJson: JSON.stringify(cap),
      riskRegisterJson: JSON.stringify(risks),
    });
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const allDimsScored = activeDimConfig.every(
    d => cap[d.key].current > 0 && cap[d.key].needed > 0
  );

  const allGapsCovered = activeDimConfig.every(d => {
    const dim = cap[d.key];
    const gap = dim.current > 0 && dim.needed > 0 ? dim.needed - dim.current : 0;
    if (gap <= 0) return true;
    return dim.tactics.filter(t => t.trim().length > 0).length >= 1;
  });

  const narrativeWordCount = cap.deliveryNarrative.trim().split(/\s+/).filter(Boolean).length;
  const narrativeOk = narrativeWordCount >= 200;

  const canConfirm = allDimsScored && allGapsCovered && narrativeOk && riskGateOk;

  const isLocked = !gate.isStage8Accessible;

  // ── Summary stats ─────────────────────────────────────────────────────────
  const scoredDims = activeDimConfig.filter(d => cap[d.key].current > 0 && cap[d.key].needed > 0);
  const gapDims = scoredDims.filter(d => cap[d.key].needed > cap[d.key].current);
  const totalTactics = activeDimConfig.reduce((acc, d) => acc + cap[d.key].tactics.filter(t => t.trim()).length, 0);

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
        title: "Capability to Deliver · 4 dimensions",
        description: "Score your capability across four dimensions, identify gaps, and generate your delivery narrative. Confirm when all dimensions are scored and the narrative is complete.",
        isCleared: !!gate.stage8Cleared,
        isEdited: !!gate.stage8EditedAfterClearing,
        canConfirm,
        isPending: completeStage8Mut.isPending,
        onConfirm: handleConfirmStage8,
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
        {activeDimConfig.map(config => (
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

      {/* Risk Register */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Risk Register
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Identify delivery risks and confirm a mitigation for each. AI-suggested risks must be explicitly accepted, edited, or dismissed before you can confirm.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={handleSuggestRisks}
              disabled={isSuggestingRisks || isLocked}
            >
              {isSuggestingRisks ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {isSuggestingRisks ? "Suggesting…" : "Suggest risks"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={addManualRisk}
              disabled={isLocked}
            >
              <Plus className="w-3 h-3" />
              Add risk
            </Button>
          </div>
        </div>

        {risks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <ShieldAlert className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No risks recorded yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Use “Suggest risks” to get AI-generated risks, or add your own.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {risks.map(risk => {
              const isEditing = editingRiskId === risk.id;
              const score = risk.likelihood * risk.impact;
              const severity = score >= 16 ? "high" : score >= 9 ? "medium" : "low";
              const severityColor = severity === "high" ? "text-red-400 bg-red-500/10 border-red-500/20" : severity === "medium" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";

              return (
                <div
                  key={risk.id}
                  className={`rounded-lg border p-4 space-y-3 transition-colors ${
                    risk.status === "pending" ? "border-amber-500/40 bg-amber-500/5" :
                    risk.status === "dismissed" ? "border-border bg-muted/20 opacity-60" :
                    "border-border bg-muted/10"
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {risk.aiSuggested && (
                        <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/20">AI</span>
                      )}
                      {risk.status === "pending" && (
                        <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">Needs action</span>
                      )}
                      {risk.status === "dismissed" && (
                        <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">Dismissed</span>
                      )}
                      {(risk.status === "accepted" || risk.status === "edited") && (
                        <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Accepted</span>
                      )}
                      {isEditing ? (
                        <Input
                          value={editDraft.title ?? ""}
                          onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))}
                          placeholder="Risk title…"
                          className="h-7 text-sm font-semibold"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-semibold text-foreground truncate">{risk.title || <span className="text-muted-foreground italic">Untitled risk</span>}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${severityColor}`}>
                        {severity.toUpperCase()}
                      </span>
                      {!isLocked && !isEditing && (
                        <>
                          <button
                            onClick={() => { setEditingRiskId(risk.id); setEditDraft({ title: risk.title, description: risk.description, likelihood: risk.likelihood, impact: risk.impact, mitigation: risk.mitigation }); }}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteRisk(risk.id)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {isEditing ? (
                    <Textarea
                      value={editDraft.description ?? ""}
                      onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))}
                      placeholder="Describe the risk…"
                      className="text-xs min-h-[60px] resize-none"
                    />
                  ) : risk.description ? (
                    <p className="text-xs text-muted-foreground">{risk.description}</p>
                  ) : null}

                  {/* Likelihood / Impact */}
                  {isEditing && (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Likelihood (1–5)</label>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={editDraft.likelihood ?? 3}
                          onChange={e => setEditDraft(d => ({ ...d, likelihood: Math.min(5, Math.max(1, Number(e.target.value))) }))}
                          className="h-7 text-sm mt-1"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Impact (1–5)</label>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={editDraft.impact ?? 3}
                          onChange={e => setEditDraft(d => ({ ...d, impact: Math.min(5, Math.max(1, Number(e.target.value))) }))}
                          className="h-7 text-sm mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {/* Mitigation */}
                  {isEditing ? (
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Mitigation</label>
                      <Textarea
                        value={editDraft.mitigation ?? ""}
                        onChange={e => setEditDraft(d => ({ ...d, mitigation: e.target.value }))}
                        placeholder="How will you mitigate this risk?…"
                        className="text-xs min-h-[60px] resize-none mt-1"
                      />
                    </div>
                  ) : risk.mitigation ? (
                    <div className="rounded bg-muted/30 border border-border px-3 py-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Mitigation</p>
                      <p className="text-xs text-foreground">{risk.mitigation}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-400 italic">No mitigation recorded yet.</p>
                  )}

                  {/* Action buttons */}
                  {isEditing ? (
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => { setEditingRiskId(null); setEditDraft({}); }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const wasAiPending = risk.aiSuggested && risk.status === "pending";
                          updateRisk(risk.id, {
                            title: editDraft.title ?? risk.title,
                            description: editDraft.description ?? risk.description,
                            likelihood: editDraft.likelihood ?? risk.likelihood,
                            impact: editDraft.impact ?? risk.impact,
                            mitigation: editDraft.mitigation ?? risk.mitigation,
                            status: wasAiPending ? "edited" : risk.status === "pending" ? "accepted" : risk.status,
                          });
                          setEditingRiskId(null);
                          setEditDraft({});
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  ) : risk.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                        onClick={() => updateRisk(risk.id, { status: "accepted" })}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => { setEditingRiskId(risk.id); setEditDraft({ title: risk.title, description: risk.description, likelihood: risk.likelihood, impact: risk.impact, mitigation: risk.mitigation }); }}
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit & accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 text-muted-foreground"
                        onClick={() => updateRisk(risk.id, { status: "dismissed" })}
                      >
                        <ShieldX className="w-3.5 h-3.5" /> Dismiss
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {/* Risk gate status */}
        {risks.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-1 border-t border-border">
            {pendingAiRisks.length > 0 && (
              <p className="text-xs text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {pendingAiRisks.length} AI-suggested risk{pendingAiRisks.length !== 1 ? "s" : ""} need{pendingAiRisks.length === 1 ? "s" : ""} action before you can confirm.
              </p>
            )}
            {risksWithMitigation.length === 0 && pendingAiRisks.length === 0 && (
              <p className="text-xs text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                At least 1 accepted risk must have a mitigation.
              </p>
            )}
            {riskGateOk && (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Risk register complete — {risksWithMitigation.length} risk{risksWithMitigation.length !== 1 ? "s" : ""} with mitigation.
              </p>
            )}
          </div>
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
              onClick={() => { if (hasMaterialGap && gate.stage7Cleared) { handleConfirmStage8(); } else { setConfirmOpen(true); } }}
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

      {/* T11: Material-gap soft prompt — fires before confirm when a material gap exists and Stage 7 is cleared */}
      <Dialog open={materialGapPromptOpen} onOpenChange={setMaterialGapPromptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Material capability gap detected
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              You've recorded a material capability gap — one or more dimensions are more than one level below what the strategy requires.
            </p>
            <p className="font-medium text-foreground">
              Do your Stage 7 success measure targets still hold given these gaps?
            </p>
            <p className="text-xs">
              You can proceed without changing them — this is a prompt, not a block. If the gaps affect your targets, go back to Stage 7 first.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setMaterialGapPromptOpen(false); navigate("/strategy/measures"); }}>
              Review Stage 7 targets
            </Button>
            <Button size="sm" onClick={handleConfirmStage8} disabled={completeStage8Mut.isPending}>
              {completeStage8Mut.isPending ? "Confirming…" : "Targets still hold — confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {activeDimConfig.map(d => {
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
              onClick={handleConfirmStage8}
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
