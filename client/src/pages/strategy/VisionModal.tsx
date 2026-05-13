/**
 * VisionModal — vision_modal_build_brief.md implementation.
 *
 * Opens from:
 *  - "Complete" button on empty Vision card (visionStatement is null)
 *  - Pencil icon on filled Vision card
 *
 * Data model: 10 fields per brief § 4, stored in ailOrgContext.visionInputsJson
 * AI draft: generated via intelligence.generateVisionDraft (brief § 6 prompt spec)
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  X, Target, Lock, RefreshCw, Loader2, AlertCircle,
  Building2, Users, TrendingUp, Sparkles, ExternalLink,
  DollarSign, BarChart2, UserPlus, Heart, Smile,
  Zap, Bot, Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VisionInputs {
  outcomeChased: "cost" | "growth" | "talent_supply" | "customer_experience" | "employee_experience" | null;
  businessAmbitionTier: number; // 1-4
  hrDeliveryTier: number;       // 1-4
  augmentationPhilosophy: "amplify" | "automate" | "substitute" | null;
  painAreas: string[];
  painAreasOther: string[];
  reinvestmentTargets: string[];
  reinvestmentTargetsOther: string[];
  timeHorizonYears: 1 | 3 | 5;
  governanceLocks: string[];
}

const DEFAULT_INPUTS: VisionInputs = {
  outcomeChased: null,
  businessAmbitionTier: 2,
  hrDeliveryTier: 2,
  augmentationPhilosophy: null,
  painAreas: [],
  painAreasOther: [],
  reinvestmentTargets: [],
  reinvestmentTargetsOther: [],
  timeHorizonYears: 3,
  governanceLocks: ["hiring", "firing", "promotion", "pay"],
};

// ─── Constants ────────────────────────────────────────────────────────────────

const OUTCOME_OPTIONS = [
  { value: "cost", label: "Cost reduction", icon: DollarSign },
  { value: "growth", label: "Business growth", icon: TrendingUp },
  { value: "talent_supply", label: "Talent supply", icon: UserPlus },
  { value: "customer_experience", label: "Customer experience", icon: Smile },
  { value: "employee_experience", label: "Employee experience", icon: Heart },
] as const;

const BUSINESS_TIER_LABELS = ["Foundational", "Measured", "Bold", "Transformative"];
const HR_TIER_LABELS = ["AI-aware", "AI-using", "AI-enabled", "AI-Led"];

const PHILOSOPHY_OPTIONS = [
  { value: "amplify", label: "Amplify", desc: "AI makes our people more effective", icon: Zap },
  { value: "automate", label: "Automate", desc: "End-to-end process automation", icon: Bot },
  { value: "substitute", label: "Substitute", desc: "AI does the work where it can", icon: Minimize2 },
] as const;

const PAIN_AREA_OPTIONS = [
  "Slow hiring", "High attrition", "Skills gaps", "Manual HR processes",
  "Poor data quality", "Compliance risk", "Low engagement", "Inconsistent performance",
  "Talent pipeline gaps", "High cost-per-hire",
];

const REINVESTMENT_OPTIONS = [
  "Learning & development", "Strategic workforce planning", "HR business partnering",
  "Talent analytics", "Employee experience", "Diversity & inclusion",
  "Succession planning", "Organisational design",
];

const DEFAULT_GOVERNANCE_LOCKS = ["hiring", "firing", "promotion", "pay"];
const EXTRA_GOVERNANCE_OPTIONS = [
  "disciplinary", "redundancy", "performance_management", "salary_benchmarking",
];
const ALL_GOVERNANCE_OPTIONS = [...DEFAULT_GOVERNANCE_LOCKS, ...EXTRA_GOVERNANCE_OPTIONS];
const GOVERNANCE_LABELS: Record<string, string> = {
  hiring: "Hiring", firing: "Firing", promotion: "Promotion", pay: "Pay",
  disciplinary: "Disciplinary", redundancy: "Redundancy",
  performance_management: "Performance mgmt", salary_benchmarking: "Salary benchmarking",
};

// ─── Threshold check ──────────────────────────────────────────────────────────

function isThresholdMet(inputs: VisionInputs): boolean {
  return (
    inputs.outcomeChased !== null &&
    inputs.augmentationPhilosophy !== null &&
    (inputs.painAreas.length + inputs.painAreasOther.length) >= 1 &&
    (inputs.reinvestmentTargets.length + inputs.reinvestmentTargetsOther.length) >= 1
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
    </div>
  );
}

function TierSlider({
  value,
  onChange,
  labels,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  labels: string[];
  ariaLabel: string;
}) {
  return (
    <div className="space-y-2">
      {/* Track */}
      <div className="relative flex items-center h-6">
        <div className="absolute inset-x-0 h-1 rounded-full bg-white/10" />
        <div
          className="absolute h-1 rounded-full bg-teal-500 transition-all duration-150"
          style={{ width: `${((value - 1) / 3) * 100}%` }}
        />
        {/* Stop markers */}
        {[1, 2, 3, 4].map((stop) => (
          <button
            key={stop}
            type="button"
            aria-label={`${ariaLabel}: ${labels[stop - 1]}`}
            onClick={() => onChange(stop)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" && value > 1) { e.preventDefault(); onChange(value - 1); }
              if (e.key === "ArrowRight" && value < 4) { e.preventDefault(); onChange(value + 1); }
            }}
            className={cn(
              "absolute w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
              stop === value
                ? "bg-teal-400 border-teal-400 scale-125"
                : "bg-[#0f1623] border-white/30 hover:border-teal-400/60"
            )}
            style={{ left: `calc(${((stop - 1) / 3) * 100}% - 7px)` }}
          />
        ))}
      </div>
      {/* Labels */}
      <div className="flex justify-between">
        {labels.map((label, i) => (
          <span
            key={label}
            className={cn(
              "text-[10px] transition-colors",
              i + 1 === value ? "font-bold text-teal-400" : "text-muted-foreground"
            )}
            style={{ width: "25%", textAlign: i === 0 ? "left" : i === 3 ? "right" : "center" }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChipButton({
  selected,
  onClick,
  children,
  icon: Icon,
  locked,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ElementType;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
        selected && !locked
          ? "bg-teal-500/20 border-teal-500/50 text-teal-300"
          : locked
          ? "bg-purple-500/20 border-purple-500/50 text-purple-300 cursor-default"
          : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
      )}
      aria-pressed={selected}
      disabled={locked}
    >
      {Icon && <Icon className="w-3 h-3" aria-hidden="true" />}
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface VisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (visionText: string) => void;
  initialInputs?: VisionInputs | null;
  initialDraft?: string | null;
  orgDescriptor?: string | null;
  companyName?: string | null;
  capabilityScore?: number | null;
  capabilityLabel?: string | null;
  capabilityCount?: number | null;
  // Legacy props (ignored — kept for backward compat with StrategyAmbitionPage)
  sector?: string | null;
  headcount?: number | null;
  businessAmbitionLabel?: string | null;
  peopleAmbitionLabel?: string | null;
}

export function VisionModal({
  isOpen,
  onClose,
  onSaved,
  initialInputs,
  initialDraft,
  orgDescriptor,
  companyName,
  capabilityScore,
  capabilityLabel,
  capabilityCount,
}: VisionModalProps) {
  // ── Inputs state ─────────────────────────────────────────────────────────────
  const [inputs, setInputs] = useState<VisionInputs>(() => initialInputs ?? DEFAULT_INPUTS);
  const [savedInputs, setSavedInputs] = useState<VisionInputs>(() => initialInputs ?? DEFAULT_INPUTS);

  // ── Draft state ───────────────────────────────────────────────────────────────
  const [draftText, setDraftText] = useState<string>(initialDraft ?? "");
  const [draftGeneratedAt, setDraftGeneratedAt] = useState<Date | null>(null);
  const [inputsChangedAfterDraft, setInputsChangedAfterDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  // ── Other chip state ──────────────────────────────────────────────────────────
  const [painOtherInput, setPainOtherInput] = useState("");
  const [painOtherOpen, setPainOtherOpen] = useState(false);
  const [reinvestOtherInput, setReinvestOtherInput] = useState("");
  const [reinvestOtherOpen, setReinvestOtherOpen] = useState(false);

  // ── Save state ────────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);

  // ── Autosave ──────────────────────────────────────────────────────────────────
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutosaveRef = useRef<string>(JSON.stringify(inputs));

  // ── Draft debounce ────────────────────────────────────────────────────────────
  const draftDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Unsaved changes ───────────────────────────────────────────────────────────
  const hasUnsavedChanges = JSON.stringify(inputs) !== JSON.stringify(savedInputs);

  // ── tRPC mutations ────────────────────────────────────────────────────────────
  const saveInputsMutation = trpc.intelligence.saveVisionInputs.useMutation();
  const generateDraftMutation = trpc.intelligence.generateVisionDraft.useMutation({
    onSuccess: (data) => {
      setDraftText(data.visionDraft);
      setDraftGeneratedAt(new Date());
      setInputsChangedAfterDraft(false);
      setDraftError(null);
    },
    onError: (err) => {
      setDraftError(err.message ?? "Couldn't generate draft. Retry.");
    },
  });

  // ── Re-init on open ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const raw = initialInputs ?? DEFAULT_INPUTS;
      // Clamp tier values to 1–4: stored DB values may be on the 1–5 assessment scale
      const init: VisionInputs = {
        ...raw,
        businessAmbitionTier: Math.min(Math.max(raw.businessAmbitionTier ?? 2, 1), 4),
        hrDeliveryTier: Math.min(Math.max(raw.hrDeliveryTier ?? 2, 1), 4),
      };
      setInputs(init);
      setSavedInputs(init);
      setDraftText(initialDraft ?? "");
      setDraftGeneratedAt(null);
      setInputsChangedAfterDraft(false);
      setDraftError(null);
      lastAutosaveRef.current = JSON.stringify(init);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Track stale draft ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (draftGeneratedAt) setInputsChangedAfterDraft(true);
  }, [inputs]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Autosave every 5s ─────────────────────────────────────────────────────────
  const doAutosave = useCallback(async (current: VisionInputs) => {
    const serialised = JSON.stringify(current);
    if (serialised === lastAutosaveRef.current) return;
    lastAutosaveRef.current = serialised;
    try {
      await saveInputsMutation.mutateAsync(current);
    } catch {
      toast.error("Couldn't autosave — your edits are kept locally.");
    }
  }, [saveInputsMutation]);

  useEffect(() => {
    if (!isOpen) return;
    autosaveTimerRef.current = setInterval(() => doAutosave(inputs), 5000);
    return () => { if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current); };
  }, [isOpen, inputs, doAutosave]);

  // ── Auto-generate draft when threshold met (debounced 2s) ─────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    if (!isThresholdMet(inputs)) return;
    draftDebounceRef.current = setTimeout(() => {
      triggerGenerate(inputs);
    }, 2000);
    return () => { if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current); };
  }, [inputs, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Esc key ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, hasUnsavedChanges]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function update(patch: Partial<VisionInputs>) {
    setInputs(prev => ({ ...prev, ...patch }));
  }

  function triggerGenerate(current: VisionInputs) {
    if (!isThresholdMet(current)) return;
    const orgDesc = orgDescriptor ?? (companyName ? companyName : null);
    generateDraftMutation.mutate({
      ...current,
      orgDescriptor: orgDesc,
      capabilityScore: capabilityScore ?? undefined,
      capabilityLabel: capabilityLabel ?? undefined,
      capabilityCount: capabilityCount ?? undefined,
    });
  }

  function handleCancel() {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm("You have unsaved changes. Save before closing?");
      if (confirmed) { handleSave(); return; }
    }
    onClose();
  }

  async function handleSave() {
    if (!draftText.trim()) {
      toast.error("Generate a vision draft before saving.");
      return;
    }
    setIsSaving(true);
    try {
      await saveInputsMutation.mutateAsync(inputs);
      setSavedInputs(inputs);
      onSaved(draftText.trim());
    } catch (err: any) {
      toast.error(err?.message ?? "Save failed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function toggleChip(arr: string[], value: string): string[] {
    return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
  }

  function addOtherPain() {
    const v = painOtherInput.trim();
    if (!v) return;
    update({ painAreasOther: [...inputs.painAreasOther, v] });
    setPainOtherInput("");
    setPainOtherOpen(false);
  }

  function addOtherReinvest() {
    const v = reinvestOtherInput.trim();
    if (!v) return;
    update({ reinvestmentTargetsOther: [...inputs.reinvestmentTargetsOther, v] });
    setReinvestOtherInput("");
    setReinvestOtherOpen(false);
  }

  if (!isOpen) return null;

  const thresholdMet = isThresholdMet(inputs);
  const isGenerating = generateDraftMutation.isPending;
  const isStale = inputsChangedAfterDraft && draftGeneratedAt !== null && draftText !== "";

  const orgDesc = orgDescriptor ?? (companyName ? companyName : null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Define your AI vision"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-[600px] max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#0f1623] shadow-2xl flex flex-col">

        {/* ── Header ───────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/15 text-teal-400">
              <Target className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Define your AI vision</h2>
              <p className="text-[11px] text-muted-foreground">Capture your strategic intent · generate a board-ready draft</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Context strip ─────────────────────────────────────────────────────── */}
        <div className="px-6 py-3 border-b border-white/8 bg-white/3 flex-shrink-0">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {/* Org profile */}
            <div className="flex items-start gap-2 min-w-0">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                {orgDesc ? (
                  <>
                    <p className="text-xs text-foreground/80 truncate">{orgDesc}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Editable in your organisation profile ·{" "}
                      <a href="/strategy/org-profile" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                        Edit profile ↗
                      </a>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground italic">No organisation profile yet</p>
                    <p className="text-[10px] text-muted-foreground">
                      The draft will be more generic without it ·{" "}
                      <a href="/strategy/org-profile" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                        Add profile ↗
                      </a>
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Capability score */}
            <div className="flex items-start gap-2 min-w-0">
              <Users className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                {capabilityCount && capabilityCount > 0 ? (
                  <>
                    <p className="text-xs text-foreground/80">
                      <span className="font-semibold text-teal-400">{capabilityScore?.toFixed(1) ?? "—"}</span>
                      <span className="text-muted-foreground">/10</span>
                      {capabilityLabel && <span className="ml-1.5 text-foreground/60">{capabilityLabel}</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Aggregate of {capabilityCount} assessment{capabilityCount !== 1 ? "s" : ""} ·{" "}
                      <a href="/strategy/capability" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                        See breakdown ↗
                      </a>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground italic">No assessments completed yet</p>
                    <p className="text-[10px] text-muted-foreground">
                      The draft will be more generic without them ·{" "}
                      <a href="/assessment" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                        Start assessment ↗
                      </a>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Section 1: Your ambition ─────────────────────────────────────── */}
          <section>
            <SectionLabel icon={Target} label="Your ambition" />

            {/* Outcome cards — 5 columns */}
            <div className="mb-5">
              <p className="text-xs text-muted-foreground mb-2.5">
                What's the primary outcome you're chasing?{" "}
                <span className="text-teal-400 text-[10px]">Required</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {OUTCOME_OPTIONS.map(({ value, label, icon: Icon }) => {
                  const selected = inputs.outcomeChased === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update({ outcomeChased: selected ? null : value })}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); update({ outcomeChased: selected ? null : value }); } }}
                      aria-pressed={selected}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
                        selected
                          ? "bg-teal-500/15 border-teal-500/50 text-teal-300"
                          : "bg-white/4 border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                      <span className="text-[11px] font-medium leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Business tier slider */}
            <div className="mb-5">
              <p className="text-xs text-muted-foreground mb-3">Business AI ambition tier</p>
              <TierSlider
                value={inputs.businessAmbitionTier}
                onChange={(v) => update({ businessAmbitionTier: v })}
                labels={BUSINESS_TIER_LABELS}
                ariaLabel="Business ambition tier"
              />
            </div>

            {/* HR delivery tier slider */}
            <div className="mb-5">
              <p className="text-xs text-muted-foreground mb-3">HR delivery tier</p>
              <TierSlider
                value={inputs.hrDeliveryTier}
                onChange={(v) => update({ hrDeliveryTier: v })}
                labels={HR_TIER_LABELS}
                ariaLabel="HR delivery tier"
              />
            </div>

            {/* Philosophy cards — 3 columns */}
            <div>
              <p className="text-xs text-muted-foreground mb-2.5">
                Augmentation philosophy{" "}
                <span className="text-teal-400 text-[10px]">Required</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PHILOSOPHY_OPTIONS.map(({ value, label, desc, icon: Icon }) => {
                  const selected = inputs.augmentationPhilosophy === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update({ augmentationPhilosophy: selected ? null : value })}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); update({ augmentationPhilosophy: selected ? null : value }); } }}
                      aria-pressed={selected}
                      className={cn(
                        "flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
                        selected
                          ? "bg-teal-500/15 border-teal-500/50"
                          : "bg-white/4 border-white/10 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn("w-3.5 h-3.5", selected ? "text-teal-400" : "text-muted-foreground")} aria-hidden="true" />
                        <span className={cn("text-xs font-semibold", selected ? "text-teal-300" : "text-foreground")}>{label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-snug">{desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <hr className="border-white/8" />

          {/* ── Section 2: Where AI plays ────────────────────────────────────── */}
          <section>
            <SectionLabel icon={Sparkles} label="Where AI plays" />

            {/* Pain areas */}
            <div className="mb-5">
              <p className="text-xs text-muted-foreground mb-2.5">
                Pain areas AI should address{" "}
                <span className="text-teal-400 text-[10px]">Select at least 1</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {PAIN_AREA_OPTIONS.map((opt) => (
                  <ChipButton
                    key={opt}
                    selected={inputs.painAreas.includes(opt)}
                    onClick={() => update({ painAreas: toggleChip(inputs.painAreas, opt) })}
                  >
                    {opt}
                  </ChipButton>
                ))}
                {inputs.painAreasOther.map((opt) => (
                  <ChipButton
                    key={opt}
                    selected
                    onClick={() => update({ painAreasOther: inputs.painAreasOther.filter(v => v !== opt) })}
                  >
                    {opt} ×
                  </ChipButton>
                ))}
                {/* + Other chip */}
                {!painOtherOpen ? (
                  <ChipButton selected={false} onClick={() => setPainOtherOpen(true)}>
                    + Other
                  </ChipButton>
                ) : (
                  <div className="flex items-center gap-1.5 w-full mt-1">
                    <input
                      autoFocus
                      value={painOtherInput}
                      onChange={(e) => setPainOtherInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOtherPain(); } if (e.key === "Escape") { setPainOtherOpen(false); setPainOtherInput(""); } }}
                      placeholder="Type and press Enter…"
                      className="flex-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
                    />
                    <Button size="sm" className="h-6 text-xs px-2" onClick={addOtherPain}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => { setPainOtherOpen(false); setPainOtherInput(""); }}>Cancel</Button>
                  </div>
                )}
              </div>
            </div>

            {/* Reinvestment targets */}
            <div>
              <p className="text-xs text-muted-foreground mb-2.5">
                Where to reinvest freed capacity{" "}
                <span className="text-teal-400 text-[10px]">Select at least 1</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {REINVESTMENT_OPTIONS.map((opt) => (
                  <ChipButton
                    key={opt}
                    selected={inputs.reinvestmentTargets.includes(opt)}
                    onClick={() => update({ reinvestmentTargets: toggleChip(inputs.reinvestmentTargets, opt) })}
                  >
                    {opt}
                  </ChipButton>
                ))}
                {inputs.reinvestmentTargetsOther.map((opt) => (
                  <ChipButton
                    key={opt}
                    selected
                    onClick={() => update({ reinvestmentTargetsOther: inputs.reinvestmentTargetsOther.filter(v => v !== opt) })}
                  >
                    {opt} ×
                  </ChipButton>
                ))}
                {!reinvestOtherOpen ? (
                  <ChipButton selected={false} onClick={() => setReinvestOtherOpen(true)}>
                    + Other
                  </ChipButton>
                ) : (
                  <div className="flex items-center gap-1.5 w-full mt-1">
                    <input
                      autoFocus
                      value={reinvestOtherInput}
                      onChange={(e) => setReinvestOtherInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOtherReinvest(); } if (e.key === "Escape") { setReinvestOtherOpen(false); setReinvestOtherInput(""); } }}
                      placeholder="Type and press Enter…"
                      className="flex-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
                    />
                    <Button size="sm" className="h-6 text-xs px-2" onClick={addOtherReinvest}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => { setReinvestOtherOpen(false); setReinvestOtherInput(""); }}>Cancel</Button>
                  </div>
                )}
              </div>
            </div>
          </section>

          <hr className="border-white/8" />

          {/* ── Section 3: Time and boundaries ──────────────────────────────── */}
          <section>
            <SectionLabel icon={Lock} label="Time and boundaries" />

            {/* Time horizon pill toggle */}
            <div className="mb-5">
              <p className="text-xs text-muted-foreground mb-2.5">Time horizon</p>
              <div className="inline-flex rounded-lg border border-white/10 overflow-hidden">
                {([1, 3, 5] as const).map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => update({ timeHorizonYears: yr })}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); update({ timeHorizonYears: yr }); } }}
                    aria-pressed={inputs.timeHorizonYears === yr}
                    className={cn(
                      "px-4 py-1.5 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
                      inputs.timeHorizonYears === yr
                        ? "bg-teal-500/20 text-teal-300"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    {yr} {yr === 1 ? "year" : "years"}
                  </button>
                ))}
              </div>
            </div>

            {/* Governance locks */}
            <div>
              <p className="text-xs text-muted-foreground mb-2.5">
                Governance locks — humans must sign off on:
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_GOVERNANCE_OPTIONS.map((opt) => {
                  const isLocked = inputs.governanceLocks.includes(opt);
                  const isDefault = DEFAULT_GOVERNANCE_LOCKS.includes(opt);
                  return (
                    <ChipButton
                      key={opt}
                      selected={isLocked}
                      locked={isDefault && isLocked}
                      icon={isLocked ? Lock : undefined}
                      onClick={() => {
                        if (isDefault) return; // pre-locked, can't remove
                        update({ governanceLocks: toggleChip(inputs.governanceLocks, opt) });
                      }}
                    >
                      {GOVERNANCE_LABELS[opt] ?? opt}
                    </ChipButton>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Hiring, firing, promotion and pay are locked by default (legal baseline). Add more if needed.
              </p>
            </div>
          </section>

          <hr className="border-white/8" />

          {/* ── Draft block ──────────────────────────────────────────────────── */}
          <section>
            <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
              {/* Draft header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">
                    Drafted from your answers and context · editable
                  </span>
                  {isStale && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                      <AlertCircle className="w-2.5 h-2.5" aria-hidden="true" />
                      Inputs changed · regenerate to refresh
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => triggerGenerate(inputs)}
                  disabled={isGenerating || !thresholdMet}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
                    thresholdMet && !isGenerating
                      ? "text-teal-400 hover:bg-teal-500/10"
                      : "text-muted-foreground/40 cursor-not-allowed"
                  )}
                  aria-label="Regenerate draft"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="w-3 h-3" aria-hidden="true" />
                  )}
                  {isGenerating ? "Generating…" : "Regenerate"}
                </button>
              </div>

              {/* Draft body */}
              <div className="p-4">
                {isGenerating ? (
                  /* Skeleton */
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 bg-white/8 rounded w-full" />
                    <div className="h-3 bg-white/8 rounded w-5/6" />
                    <div className="h-3 bg-white/8 rounded w-4/6" />
                  </div>
                ) : draftError ? (
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-label="Error" />
                    <span>{draftError}</span>
                    <button
                      type="button"
                      onClick={() => { setDraftError(null); triggerGenerate(inputs); }}
                      className="underline hover:no-underline ml-1"
                    >
                      Retry
                    </button>
                  </div>
                ) : draftText ? (
                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    rows={5}
                    className="w-full bg-transparent text-sm text-foreground leading-relaxed resize-none focus:outline-none placeholder:text-muted-foreground/40"
                    aria-label="Vision draft — editable"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {thresholdMet
                      ? "Generating your draft…"
                      : "Fill in the inputs above to see a draft. You need: an outcome, a philosophy, at least one pain area, and at least one reinvestment target."}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/8 flex-shrink-0 bg-[#0f1623]">
          <p className="text-[11px] text-muted-foreground hidden sm:block">
            Updates anytime via the pencil on the card.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs px-3 text-muted-foreground hover:text-foreground"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs px-4 bg-teal-600 hover:bg-teal-500 text-white"
              onClick={handleSave}
              disabled={isSaving || !draftText.trim()}
            >
              {isSaving ? (
                <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" aria-hidden="true" />Saving…</>
              ) : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
