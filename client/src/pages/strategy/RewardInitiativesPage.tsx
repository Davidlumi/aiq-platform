/**
 * RewardInitiativesPage — /strategy/reward-initiatives
 * Stage 5 (Reward mode): Build your initiative portfolio
 *
 * Blocks:
 *   1. Page header + gate banner (locked if prework not complete)
 *   2. Portfolio summary strip (count, value range, phase breakdown)
 *   3. Recommendation list (filter by sub-domain / phase / fit signal, sort)
 *   4. Initiative cards with fit signal, reasoning, add/dismiss actions
 *   5. Bundling / prerequisite prompt banners
 *   6. Not-recommended section (collapsed by default)
 *   7. Custom initiative add form
 *   8. Complete Stage 5 CTA
 */

import React, { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGate } from "@/contexts/GateContext";
import SectionPageLayout from "@/components/SectionPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Sparkles, AlertTriangle, Info, Layers, TrendingUp,
  ArrowRight, Trash2, Pencil, Lock, RefreshCw, TrendingDown, Minus,
} from "lucide-react";
import type { RewardRecommendationResult, RewardEngineOutput } from "@/../../server/services/rewardRecommendationEngine";

// ─── Constants ────────────────────────────────────────────────────────────────

const FIT_SIGNAL_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}> = {
  STRONG_FIT: {
    label: "Strong fit",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  MODERATE_FIT: {
    label: "Moderate fit",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    icon: <Info className="w-3.5 h-3.5" />,
  },
  WEAK_FIT: {
    label: "Weak fit",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  NOT_RECOMMENDED: {
    label: "Not recommended",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

const PHASE_CONFIG: Record<string, { color: string; bg: string }> = {
  Foundation: { color: "text-blue-600 dark:text-blue-300",  bg: "bg-blue-500/10 border-blue-500/20" },
  Build:      { color: "text-violet-600 dark:text-violet-300", bg: "bg-violet-500/10 border-violet-500/20" },
  Optimise:   { color: "text-amber-600 dark:text-amber-300", bg: "bg-amber-500/10 border-amber-500/20" },
};

const COMPLEXITY_CONFIG: Record<string, string> = {
  Low:     "text-emerald-600 dark:text-emerald-400",
  Medium:  "text-blue-600 dark:text-blue-400",
  High:    "text-amber-600 dark:text-amber-400",
  Highest: "text-rose-600 dark:text-rose-400",
};

const DISMISS_REASONS = [
  { value: "already_doing_this", label: "We're already doing this" },
  { value: "not_relevant_to_our_context", label: "Not relevant to our context" },
  { value: "too_complex_for_now", label: "Too complex for now" },
  { value: "budget_constraints", label: "Budget constraints" },
  { value: "other", label: "Other" },
];

const SUB_DOMAINS = [
  "All",
  "Compensation",
  "Pay Equity",
  "Pay Transparency",
  "Benefits",
  "Reward Operations",
  "Executive Compensation",
  "Sales Compensation",
];

function formatValue(low: number, high: number): string {
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
    if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
    return `£${n}`;
  };
  return `${fmt(low)} – ${fmt(high)}`;
}

// ─── Initiative Card ──────────────────────────────────────────────────────────

function InitiativeCard({
  initiative,
  isInPortfolio,
  isDismissed,
  onAdd,
  onRemove,
  onDismiss,
  onUndismiss,
  bundlePartner,
  prerequisiteFor,
}: {
  initiative: RewardRecommendationResult;
  isInPortfolio: boolean;
  isDismissed: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onDismiss: () => void;
  onUndismiss: () => void;
  bundlePartner?: RewardRecommendationResult;
  prerequisiteFor?: RewardRecommendationResult[];
}) {
  const [expanded, setExpanded] = useState(false);
  const fitCfg = FIT_SIGNAL_CONFIG[initiative.fitSignal] ?? FIT_SIGNAL_CONFIG.MODERATE_FIT;
  const phaseCfg = PHASE_CONFIG[initiative.defaultPhase] ?? PHASE_CONFIG.Foundation;

  return (
    <div
      className={`rounded-xl border bg-card transition-all ${
        isInPortfolio
          ? "border-emerald-500/40 ring-1 ring-emerald-500/20"
          : isDismissed
          ? "border-border/40 opacity-60"
          : "border-border hover:border-border/80"
      }`}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                #{initiative.number}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 h-4 ${phaseCfg.bg} ${phaseCfg.color} border`}
              >
                {initiative.defaultPhase}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 h-4 ${fitCfg.bg} ${fitCfg.color} ${fitCfg.border} border flex items-center gap-0.5`}
              >
                {fitCfg.icon}
                {fitCfg.label}
              </Badge>
              {isInPortfolio && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 border flex items-center gap-0.5"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  In portfolio
                </Badge>
              )}
            </div>
            <h3 className="text-sm font-semibold text-foreground leading-snug">
              {initiative.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{initiative.subDomain}</p>
          </div>

          {/* Value + complexity */}
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-semibold text-foreground">
              {formatValue(initiative.calibratedValueLow, initiative.calibratedValueHigh)}
            </p>
            <p className="text-[10px] text-muted-foreground">3-yr value est.</p>
            <p className={`text-[10px] font-medium mt-0.5 ${COMPLEXITY_CONFIG[initiative.complexity] ?? ""}`}>
              {initiative.complexity} complexity
            </p>
          </div>
        </div>

        {/* Short description */}
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">
          {initiative.shortDescription}
        </p>

        {/* Expand toggle */}
        <button
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mt-2 transition-colors"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <><ChevronUp className="w-3 h-3" /> Hide reasoning</>
          ) : (
            <><ChevronDown className="w-3 h-3" /> Show reasoning</>
          )}
        </button>

        {/* Expanded reasoning */}
        {expanded && (
          <div className="mt-3 space-y-1.5">
            {initiative.reasoningLines.map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground mt-0.5 flex-shrink-0">·</span>
                <p className="text-xs text-muted-foreground">{line}</p>
              </div>
            ))}
            {/* Principle alignment notes */}
            {initiative.alignedPrincipleTexts && initiative.alignedPrincipleTexts.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/40">
                <p className="text-[9px] font-semibold text-violet-500 dark:text-violet-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Supports your principles
                </p>
                <div className="flex flex-wrap gap-1">
                  {initiative.alignedPrincipleTexts.map((text, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
                    >
                      {text}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Won't-do reassurance notes */}
            {initiative.wontDoReassuranceNotes && initiative.wontDoReassuranceNotes.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/40">
                <p className="text-[9px] font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Consistent with your won’t-dos
                </p>
                <div className="space-y-0.5">
                  {initiative.wontDoReassuranceNotes.map((note, i) => (
                    <p key={i} className="text-[9px] text-muted-foreground">✓ {note}</p>
                  ))}
                </div>
              </div>
            )}
            {/* Signal breakdown */}
            <div className="mt-2 pt-2 border-t border-border/40 grid grid-cols-4 gap-1">
              {Object.entries(initiative.signalBreakdown).map(([key, sig]) => {
                if (!sig) return null;
                const cfg = FIT_SIGNAL_CONFIG[sig] ?? FIT_SIGNAL_CONFIG.MODERATE_FIT;
                return (
                  <div key={key} className="text-center">
                    <p className="text-[9px] text-muted-foreground capitalize">{key}</p>
                    <p className={`text-[9px] font-medium ${cfg.color}`}>{cfg.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bundle / prerequisite hints */}
        {bundlePartner && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-violet-500 dark:text-violet-400">
            <Layers className="w-3 h-3 flex-shrink-0" />
            <span>Often bundled with <strong>{bundlePartner.title}</strong></span>
          </div>
        )}
        {initiative.requiresPrerequisite && (
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-amber-500 dark:text-amber-400">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>Requires prerequisite initiative</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
          {isDismissed ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onUndismiss}
            >
              Restore
            </Button>
          ) : isInPortfolio ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
              onClick={onRemove}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Remove
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={onAdd}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add to portfolio
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Custom initiative card ───────────────────────────────────────────────────

function CustomInitiativeCard({
  initiative,
  onEdit,
  onRemove,
}: {
  initiative: {
    id: string;
    title: string;
    description: string;
    subDomain: string;
    phase: string;
    complexity: string;
    valueLow: number;
    valueHigh: number;
  };
  onEdit: () => void;
  onRemove: () => void;
}) {
  const phaseCfg = PHASE_CONFIG[initiative.phase] ?? PHASE_CONFIG.Foundation;

  return (
    <div className="rounded-xl border border-violet-500/30 bg-card ring-1 ring-violet-500/10 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 border"
            >
              Custom
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 h-4 ${phaseCfg.bg} ${phaseCfg.color} border`}
            >
              {initiative.phase}
            </Badge>
          </div>
          <h3 className="text-sm font-semibold text-foreground">{initiative.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{initiative.subDomain}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{initiative.description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-semibold text-foreground">
            {formatValue(initiative.valueLow, initiative.valueHigh)}
          </p>
          <p className="text-[10px] text-muted-foreground">3-yr value est.</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit}>
          <Pencil className="w-3 h-3 mr-1" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-rose-600 dark:text-rose-400"
          onClick={onRemove}
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Remove
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RewardInitiativesPage() {
  const [, navigate] = useLocation();
  const { isStage5Accessible, stage5Cleared, stage4EditedAfterClearing } = useGate();

  // Filters
  const [filterSubDomain, setFilterSubDomain] = useState("All");
  const [filterPhase, setFilterPhase] = useState("All");
  const [filterFit, setFilterFit] = useState("All");
  const [showNotRecommended, setShowNotRecommended] = useState(false);

  // Dismiss modal
  const [dismissTarget, setDismissTarget] = useState<RewardRecommendationResult | null>(null);
  const [dismissReason, setDismissReason] = useState<string>("");
  const [dismissFreeText, setDismissFreeText] = useState("");

  // Custom initiative modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [customForm, setCustomForm] = useState<{
    title: string;
    description: string;
    subDomain: string;
    phase: "Foundation" | "Build" | "Optimise";
    complexity: "Low" | "Medium" | "High" | "Highest";
    valueLow: number;
    valueHigh: number;
    costLow: number | undefined;
    costHigh: number | undefined;
    notes: string;
  }>({
    title: "",
    description: "",
    subDomain: "Compensation",
    phase: "Foundation",
    complexity: "Medium",
    valueLow: 0,
    valueHigh: 0,
    costLow: undefined,
    costHigh: undefined,
    notes: "",
  });

  // Complete modal + soft-gate state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [softGateWarnings, setSoftGateWarnings] = useState<string[]>([]);
  const [overrideSoftGates, setOverrideSoftGates] = useState(false);
  const [showDiffBanner, setShowDiffBanner] = useState(true);

  // Data
  const statusQuery = trpc.rewardInitiatives.getStatus.useQuery();
  const recommendationsQuery = trpc.rewardInitiatives.getRecommendations.useQuery(undefined, {
    enabled: statusQuery.data?.canStart === true,
  });
  const portfolioQuery = trpc.rewardInitiatives.getPortfolio.useQuery();

  const utils = trpc.useUtils();

  const addMutation = trpc.rewardInitiatives.addToPortfolio.useMutation({
    onSuccess: () => { utils.rewardInitiatives.getPortfolio.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const removeMutation = trpc.rewardInitiatives.removeFromPortfolio.useMutation({
    onSuccess: () => { utils.rewardInitiatives.getPortfolio.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const dismissMutation = trpc.rewardInitiatives.dismiss.useMutation({
    onSuccess: () => {
      utils.rewardInitiatives.getPortfolio.invalidate();
      setDismissTarget(null);
      setDismissReason("");
      setDismissFreeText("");
    },
    onError: (e) => toast.error(e.message),
  });
  const undismissMutation = trpc.rewardInitiatives.undismiss.useMutation({
    onSuccess: () => { utils.rewardInitiatives.getPortfolio.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const addCustomMutation = trpc.rewardInitiatives.addCustom.useMutation({
    onSuccess: () => {
      utils.rewardInitiatives.getPortfolio.invalidate();
      setShowCustomModal(false);
      resetCustomForm();
      toast.success("Custom initiative added.");
    },
    onError: (e) => toast.error(e.message),
  });
  const editCustomMutation = trpc.rewardInitiatives.editCustom.useMutation({
    onSuccess: () => {
      utils.rewardInitiatives.getPortfolio.invalidate();
      setShowCustomModal(false);
      setEditingCustomId(null);
      resetCustomForm();
      toast.success("Custom initiative updated.");
    },
    onError: (e) => toast.error(e.message),
  });
  const removeCustomMutation = trpc.rewardInitiatives.removeCustom.useMutation({
    onSuccess: () => { utils.rewardInitiatives.getPortfolio.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const completeMutation = trpc.rewardInitiatives.complete.useMutation({
    onSuccess: () => {
      utils.rewardInitiatives.getStatus.invalidate();
      utils.gate.getState.invalidate();
      // Staleness cascade (stages 6, 7, 8) is now handled server-side in complete
      setShowCompleteModal(false);
      setSoftGateWarnings([]);
      setOverrideSoftGates(false);
      toast.success("Stage 5 complete — your initiative portfolio is confirmed.");
      navigate("/strategy");
    },
    onError: (e) => {
      // Detect soft-gate warning payload
      try {
        const parsed = JSON.parse(e.message) as { type: string; warnings: string[] };
        if (parsed.type === "soft_gate_warnings" && parsed.warnings?.length) {
          setSoftGateWarnings(parsed.warnings);
          return;
        }
      } catch {
        // Not a JSON payload — fall through
      }
      toast.error(e.message);
    },
  });

  // Diff query — only runs after recommendations have loaded
  const diffQuery = trpc.rewardInitiatives.getDiff.useQuery(undefined, {
    enabled: statusQuery.data?.canStart === true,
  });

  function handleCompleteClick() {
    setSoftGateWarnings([]);
    setOverrideSoftGates(false);
    setShowCompleteModal(true);
  }

  function resetCustomForm() {
    setCustomForm({
      title: "", description: "", subDomain: "Compensation",
      phase: "Foundation", complexity: "Medium",
      valueLow: 0, valueHigh: 0,
      costLow: undefined, costHigh: undefined,
      notes: "",
    });
  }

  // Cost validation: both-or-neither, and low ≤ high
  const costValidationError = useMemo(() => {
    const { costLow, costHigh } = customForm;
    const hasLow = costLow !== undefined && costLow > 0;
    const hasHigh = costHigh !== undefined && costHigh > 0;
    if (hasLow && !hasHigh) return "Please enter both a low and high cost estimate, or leave both blank.";
    if (!hasLow && hasHigh) return "Please enter both a low and high cost estimate, or leave both blank.";
    if (hasLow && hasHigh && costLow! > costHigh!) return "Cost low must be ≤ cost high.";
    return null;
  }, [customForm.costLow, customForm.costHigh]);

  const recommendations = recommendationsQuery.data as RewardEngineOutput | undefined;
  const portfolio = portfolioQuery.data;

  const selectedIds = new Set(portfolio?.selectedInitiatives ?? []);
  const dismissedIds = new Set((portfolio?.dismissedInitiatives ?? []).map((d) => d.initiativeId));

  // Build a lookup of all recommended results by id
  const allResultsById = useMemo(() => {
    const map = new Map<string, RewardRecommendationResult>();
    recommendations?.recommended.forEach((r) => map.set(r.initiativeId, r));
    recommendations?.notRecommended.forEach((r) => map.set(r.initiativeId, r));
    return map;
  }, [recommendations]);

  // Filter recommended list
  const filteredRecommended = useMemo(() => {
    if (!recommendations) return [];
    return recommendations.recommended.filter((r) => {
      if (filterSubDomain !== "All" && r.subDomain !== filterSubDomain) return false;
      if (filterPhase !== "All" && r.defaultPhase !== filterPhase) return false;
      if (filterFit !== "All" && r.fitSignal !== filterFit) return false;
      return true;
    });
  }, [recommendations, filterSubDomain, filterPhase, filterFit]);

  // Portfolio summary stats
  const portfolioStats = useMemo(() => {
    if (!recommendations || !portfolio) return null;
    const selectedRecs = Array.from(selectedIds)
      .map((id) => allResultsById.get(id))
      .filter(Boolean) as RewardRecommendationResult[];
    const customTotal = portfolio.customInitiatives.reduce(
      (acc, c) => ({ low: acc.low + c.valueLow, high: acc.high + c.valueHigh }),
      { low: 0, high: 0 }
    );
    const recTotal = selectedRecs.reduce(
      (acc, r) => ({ low: acc.low + r.calibratedValueLow, high: acc.high + r.calibratedValueHigh }),
      { low: 0, high: 0 }
    );
    const phaseCounts: Record<string, number> = { Foundation: 0, Build: 0, Optimise: 0 };
    selectedRecs.forEach((r) => { phaseCounts[r.defaultPhase] = (phaseCounts[r.defaultPhase] ?? 0) + 1; });
    portfolio.customInitiatives.forEach((c) => { phaseCounts[c.phase] = (phaseCounts[c.phase] ?? 0) + 1; });

    return {
      count: selectedIds.size + portfolio.customInitiatives.length,
      valueLow: recTotal.low + customTotal.low,
      valueHigh: recTotal.high + customTotal.high,
      phaseCounts,
    };
  }, [recommendations, portfolio, selectedIds, allResultsById]);

  const isLocked = !isStage5Accessible;
  const isComplete = Boolean(portfolio?.isCompleted);

  const handleDismissConfirm = useCallback(() => {
    if (!dismissTarget || !dismissReason) return;
    dismissMutation.mutate({
      initiativeId: dismissTarget.initiativeId,
      reason: dismissReason as "already_doing_this" | "not_relevant_to_our_context" | "too_complex_for_now" | "budget_constraints" | "other",
      freeText: dismissFreeText || undefined,
    });
  }, [dismissTarget, dismissReason, dismissFreeText, dismissMutation]);

  const handleCustomSubmit = useCallback(() => {
    if (editingCustomId) {
      editCustomMutation.mutate({ id: editingCustomId, ...customForm });
    } else {
      addCustomMutation.mutate(customForm);
    }
  }, [editingCustomId, customForm, addCustomMutation, editCustomMutation]);

  const openEditCustom = useCallback((c: typeof portfolio extends undefined ? never : NonNullable<typeof portfolio>["customInitiatives"][number]) => {
    setEditingCustomId(c.id);
    setCustomForm({
      title: c.title,
      description: c.description,
      subDomain: c.subDomain,
      phase: c.phase as "Foundation" | "Build" | "Optimise",
      complexity: c.complexity as "Low" | "Medium" | "High" | "Highest",
      valueLow: c.valueLow,
      valueHigh: c.valueHigh,
      costLow: c.costLow ?? undefined,
      costHigh: c.costHigh ?? undefined,
      notes: c.notes ?? "",
    });
    setShowCustomModal(true);
  }, []);

  const isLoading = statusQuery.isLoading || recommendationsQuery.isLoading || portfolioQuery.isLoading;

  return (
    <SectionPageLayout
      sectionNumber="05"
      sectionLabel="Initiative Portfolio"
      title="Reward Initiative Portfolio"
      accentColor="#10B981"
      icon={<Sparkles className="w-5 h-5" />}
      isLocked={isLocked}
      editedAfterClearing={stage4EditedAfterClearing}
      upstreamStageLabel="Reward Pre-work"
      actions={
        !isLocked && !isComplete ? (
          <Button
            size="sm"
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleCompleteClick}
            disabled={!portfolioStats || portfolioStats.count < 1}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Complete Stage 5
          </Button>
        ) : isComplete ? (
          <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 border text-xs px-2 py-1">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Stage complete
          </Badge>
        ) : undefined
      }
    >
      {/* Re-assessment diff banner */}
      {showDiffBanner && diffQuery.data?.hasDiff && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3">
          <RefreshCw className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              Recommendations updated
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your inputs have changed since the last run. Here’s what changed:
            </p>
            <div className="mt-2 space-y-1">
              {diffQuery.data.newlyRecommended.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <Plus className="w-3 h-3 flex-shrink-0" />
                  <span>
                    <strong>{diffQuery.data.newlyRecommended.length}</strong> newly recommended:{" "}
                    {diffQuery.data.newlyRecommended.slice(0, 3).map((r) => r.title).join(", ")}
                    {diffQuery.data.newlyRecommended.length > 3 && ` +${diffQuery.data.newlyRecommended.length - 3} more`}
                  </span>
                </div>
              )}
              {diffQuery.data.noLongerRecommended.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                  <Minus className="w-3 h-3 flex-shrink-0" />
                  <span>
                    <strong>{diffQuery.data.noLongerRecommended.length}</strong> no longer recommended:{" "}
                    {diffQuery.data.noLongerRecommended.slice(0, 3).map((r) => r.title).join(", ")}
                    {diffQuery.data.noLongerRecommended.length > 3 && ` +${diffQuery.data.noLongerRecommended.length - 3} more`}
                  </span>
                </div>
              )}
              {diffQuery.data.changedFitLevel.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <TrendingDown className="w-3 h-3 flex-shrink-0" />
                  <span>
                    <strong>{diffQuery.data.changedFitLevel.length}</strong> changed fit level:{" "}
                    {diffQuery.data.changedFitLevel.slice(0, 3).map((r) => `${r.title} (${FIT_SIGNAL_CONFIG[r.previousFit]?.label ?? r.previousFit} → ${FIT_SIGNAL_CONFIG[r.currentFit]?.label ?? r.currentFit})`).join(", ")}
                    {diffQuery.data.changedFitLevel.length > 3 && ` +${diffQuery.data.changedFitLevel.length - 3} more`}
                  </span>
                </div>
              )}
              {/* Principle-driven reordering: score changed ≥0.05 but signal didn't flip */}
              {(diffQuery.data as any).changedFitScore?.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400">
                  <TrendingUp className="w-3 h-3 flex-shrink-0" />
                  <span>
                    <strong>{(diffQuery.data as any).changedFitScore.length}</strong> reordered by principle alignment:{" "}
                    {(diffQuery.data as any).changedFitScore.slice(0, 3).map((r: any) => {
                      const delta = r.currentScore - r.previousScore;
                      return `${r.title} (${delta > 0 ? "+" : ""}${delta.toFixed(2)})`;
                    }).join(", ")}
                    {(diffQuery.data as any).changedFitScore.length > 3 && ` +${(diffQuery.data as any).changedFitScore.length - 3} more`}
                  </span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Review your portfolio selections in light of these changes.
            </p>
          </div>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors ml-2 flex-shrink-0"
            onClick={() => setShowDiffBanner(false)}
            aria-label="Dismiss diff banner"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Gate banner — prework not complete */}
      {!statusQuery.data?.canStart && !statusQuery.isLoading && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <Lock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              Complete Reward Pre-work first
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {statusQuery.data?.canStartMessage ?? "Complete Stage 1 Reward Pre-work to unlock initiative recommendations."}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 h-7 text-xs"
              onClick={() => navigate("/strategy/reward-prework")}
            >
              Go to Reward Pre-work
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Portfolio summary strip */}
      {!isLoading && portfolioStats && portfolioStats.count > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-foreground">Your portfolio</h2>
            <Badge className="ml-auto bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 border text-xs">
              {portfolioStats.count} initiative{portfolioStats.count !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">3-yr value</p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {formatValue(portfolioStats.valueLow, portfolioStats.valueHigh)}
              </p>
            </div>
            {Object.entries(portfolioStats.phaseCounts).map(([phase, count]) => (
              count > 0 && (
                <div key={phase} className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{phase}</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{count} initiative{count !== 1 ? "s" : ""}</p>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Recommendations section */}
      {!isLoading && recommendations && (
        <>
          {/* Intro */}
          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              Recommended initiatives
            </h2>
            <p className="text-xs text-muted-foreground">
              {recommendations.recommended.length} initiatives recommended based on your Company Profile and Reward Pre-work.
              Add those that fit your priorities to build your portfolio.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterSubDomain} onValueChange={setFilterSubDomain}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue placeholder="Sub-domain" />
              </SelectTrigger>
              <SelectContent>
                {SUB_DOMAINS.map((d) => (
                  <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPhase} onValueChange={setFilterPhase}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="Phase" />
              </SelectTrigger>
              <SelectContent>
                {["All", "Foundation", "Build", "Optimise"].map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterFit} onValueChange={setFilterFit}>
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue placeholder="Fit signal" />
              </SelectTrigger>
              <SelectContent>
                {["All", "STRONG_FIT", "MODERATE_FIT", "WEAK_FIT"].map((f) => (
                  <SelectItem key={f} value={f} className="text-xs">
                    {f === "All" ? "All fits" : FIT_SIGNAL_CONFIG[f]?.label ?? f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterSubDomain !== "All" || filterPhase !== "All" || filterFit !== "All") && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => { setFilterSubDomain("All"); setFilterPhase("All"); setFilterFit("All"); }}
              >
                Clear filters
              </Button>
            )}
            <span className="ml-auto text-[10px] text-muted-foreground">
              {filteredRecommended.length} of {recommendations.recommended.length} shown
            </span>
          </div>

          {/* Initiative cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecommended.map((initiative) => {
              const bundlePartner = initiative.bundleWith
                ? allResultsById.get(initiative.bundleWith)
                : undefined;
              const prerequisiteFor = initiative.prerequisiteOf
                .map((id) => allResultsById.get(id))
                .filter(Boolean) as RewardRecommendationResult[];

              return (
                <InitiativeCard
                  key={initiative.initiativeId}
                  initiative={initiative}
                  isInPortfolio={selectedIds.has(initiative.initiativeId)}
                  isDismissed={dismissedIds.has(initiative.initiativeId)}
                  onAdd={() => addMutation.mutate({ initiativeId: initiative.initiativeId })}
                  onRemove={() => removeMutation.mutate({ initiativeId: initiative.initiativeId })}
                  onDismiss={() => setDismissTarget(initiative)}
                  onUndismiss={() => undismissMutation.mutate({ initiativeId: initiative.initiativeId })}
                  bundlePartner={bundlePartner}
                  prerequisiteFor={prerequisiteFor}
                />
              );
            })}
          </div>

          {filteredRecommended.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No initiatives match the current filters.
            </div>
          )}

          {/* Custom initiatives */}
          {portfolio && portfolio.customInitiatives.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">Custom initiatives</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {portfolio.customInitiatives.map((c) => (
                  <CustomInitiativeCard
                    key={c.id}
                    initiative={c}
                    onEdit={() => openEditCustom(c)}
                    onRemove={() => {
                      if (confirm("Remove this custom initiative?")) {
                        removeCustomMutation.mutate({ id: c.id });
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Add custom initiative button */}
          {!isLocked && !isComplete && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-dashed"
                onClick={() => { resetCustomForm(); setEditingCustomId(null); setShowCustomModal(true); }}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add custom initiative
              </Button>
            </div>
          )}

          {/* Not recommended section */}
          {recommendations.notRecommended.length > 0 && (
            <div>
              <button
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowNotRecommended((v) => !v)}
              >
                {showNotRecommended ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {showNotRecommended ? "Hide" : "Show"} not-recommended initiatives ({recommendations.notRecommended.length})
              </button>

              {showNotRecommended && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.notRecommended.map((initiative) => (
                    <div
                      key={initiative.initiativeId}
                      className="rounded-xl border border-border/40 bg-card/60 p-4 opacity-70"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 border flex items-center gap-0.5"
                            >
                              <XCircle className="w-2.5 h-2.5" />
                              Not recommended
                            </Badge>
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">{initiative.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{initiative.subDomain}</p>
                          {initiative.notRecommendedReason && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              {initiative.notRecommendedReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Dismiss modal */}
      <Dialog open={Boolean(dismissTarget)} onOpenChange={(open) => { if (!open) setDismissTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Dismiss initiative</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Why are you dismissing <strong>{dismissTarget?.title}</strong>?
            </p>
            <div className="space-y-2">
              {DISMISS_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors ${
                    dismissReason === r.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="dismiss-reason"
                    value={r.value}
                    checked={dismissReason === r.value}
                    onChange={() => setDismissReason(r.value)}
                    className="accent-primary"
                  />
                  <span className="text-sm">{r.label}</span>
                </label>
              ))}
            </div>
            {dismissReason === "other" && (
              <Textarea
                placeholder="Please describe your reason…"
                value={dismissFreeText}
                onChange={(e) => setDismissFreeText(e.target.value)}
                rows={3}
                className="text-sm"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDismissTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!dismissReason || dismissMutation.isPending}
              onClick={handleDismissConfirm}
            >
              Dismiss initiative
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom initiative modal */}
      <Dialog
        open={showCustomModal}
        onOpenChange={(open) => {
          if (!open) { setShowCustomModal(false); setEditingCustomId(null); resetCustomForm(); }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingCustomId ? "Edit custom initiative" : "Add custom initiative"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Title *</Label>
              <Input
                value={customForm.title}
                onChange={(e) => setCustomForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. AI-Powered Salary Survey Automation"
                className="text-sm"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description *</Label>
              <Textarea
                value={customForm.description}
                onChange={(e) => setCustomForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe what this initiative involves and what it will deliver…"
                rows={3}
                className="text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Sub-domain</Label>
                <Select
                  value={customForm.subDomain}
                  onValueChange={(v) => setCustomForm((f) => ({ ...f, subDomain: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUB_DOMAINS.filter((d) => d !== "All").map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phase</Label>
                <Select
                  value={customForm.phase}
                  onValueChange={(v) => setCustomForm((f) => ({ ...f, phase: v as "Foundation" | "Build" | "Optimise" }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Foundation", "Build", "Optimise"].map((p) => (
                      <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Complexity</Label>
                <Select
                  value={customForm.complexity}
                  onValueChange={(v) => setCustomForm((f) => ({ ...f, complexity: v as "Low" | "Medium" | "High" | "Highest" }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Low", "Medium", "High", "Highest"].map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Est. 3-yr value (£)</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    value={customForm.valueLow || ""}
                    onChange={(e) => setCustomForm((f) => ({ ...f, valueLow: Number(e.target.value) }))}
                    placeholder="Low"
                    className="text-xs h-9"
                  />
                  <span className="text-xs text-muted-foreground">–</span>
                  <Input
                    type="number"
                    min={0}
                    value={customForm.valueHigh || ""}
                    onChange={(e) => setCustomForm((f) => ({ ...f, valueHigh: Number(e.target.value) }))}
                    placeholder="High"
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>
            {/* Cost fields */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                Est. Year 1 implementation cost (£)
                <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Enter both low and high, or leave both blank. Used by Stage 7 business case.
              </p>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  value={customForm.costLow ?? ""}
                  onChange={(e) => setCustomForm((f) => ({ ...f, costLow: e.target.value === "" ? undefined : Number(e.target.value) }))}
                  placeholder="Low"
                  className={`text-xs h-9 ${costValidationError ? "border-rose-500" : ""}`}
                />
                <span className="text-xs text-muted-foreground">–</span>
                <Input
                  type="number"
                  min={0}
                  value={customForm.costHigh ?? ""}
                  onChange={(e) => setCustomForm((f) => ({ ...f, costHigh: e.target.value === "" ? undefined : Number(e.target.value) }))}
                  placeholder="High"
                  className={`text-xs h-9 ${costValidationError ? "border-rose-500" : ""}`}
                />
              </div>
              {costValidationError && (
                <p className="text-[10px] text-rose-500">{costValidationError}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                value={customForm.notes}
                onChange={(e) => setCustomForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional context, risks, or dependencies…"
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowCustomModal(false); setEditingCustomId(null); resetCustomForm(); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={
                !customForm.title.trim() ||
                !customForm.description.trim() ||
                !!costValidationError ||
                addCustomMutation.isPending ||
                editCustomMutation.isPending
              }
              onClick={handleCustomSubmit}
            >
              {editingCustomId ? "Save changes" : "Add initiative"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Stage 5 modal */}
      <Dialog
        open={showCompleteModal}
        onOpenChange={(open) => {
          if (!open) { setShowCompleteModal(false); setSoftGateWarnings([]); setOverrideSoftGates(false); }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Complete Stage 5?</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {/* Portfolio summary */}
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <p>
                <strong>{portfolioStats?.count ?? 0} initiative{(portfolioStats?.count ?? 0) !== 1 ? "s" : ""}</strong>
                {" "}in your portfolio • estimated 3-year value:{" "}
                <strong>{portfolioStats ? formatValue(portfolioStats.valueLow, portfolioStats.valueHigh) : "—"}</strong>
              </p>
              {portfolioStats && (
                <p className="text-xs text-muted-foreground mt-1">
                  Phase breakdown:{" "}
                  {Object.entries(portfolioStats.phaseCounts)
                    .filter(([, c]) => c > 0)
                    .map(([p, c]) => `${c} ${p}`)
                    .join(" · ") || "None"}
                </p>
              )}
            </div>

            {/* Soft-gate warnings */}
            {softGateWarnings.length > 0 && (
              <div className="space-y-2">
                {softGateWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">{w}</p>
                  </div>
                ))}
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideSoftGates}
                    onChange={(e) => setOverrideSoftGates(e.target.checked)}
                    className="mt-0.5 accent-amber-500"
                  />
                  <span className="text-xs text-muted-foreground">
                    I understand the recommendations above and want to proceed with my current portfolio.
                  </span>
                </label>
              </div>
            )}

            {softGateWarnings.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Completing Stage 5 will lock your initiative portfolio and unlock Stage 6. You can re-open this stage at any time.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowCompleteModal(false); setSoftGateWarnings([]); setOverrideSoftGates(false); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={
                completeMutation.isPending ||
                (softGateWarnings.length > 0 && !overrideSoftGates)
              }
              onClick={() => completeMutation.mutate({ overrideSoftGates })}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              {softGateWarnings.length > 0 ? "Proceed anyway" : "Confirm portfolio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionPageLayout>
  );
}
