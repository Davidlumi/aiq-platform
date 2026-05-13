/**
 * VisionModal — Capture 8 strategic vision inputs and generate an AI draft.
 *
 * Opens from:
 *  - "Complete" button on empty Vision card (visionStatement is null)
 *  - Pencil icon on filled Vision card
 *
 * Data model: 8 textarea/number inputs stored in ailOrgContext.visionInputsJson
 * AI draft: generated via intelligence.generateVisionDraft, stored as visionStatement
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  X, Target, Cpu, Clock, RefreshCw, Loader2, AlertCircle,
  Building2, Users, Sparkles, ChevronDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VisionInputs {
  ambitionStatement: string;
  aiRoleInHR: string;
  aiRoleInBusiness: string;
  timeHorizonMonths: number;
  geographicScope: string;
  constraints: string;
  successLooksLike: string;
  whatWontChange: string;
}

const DEFAULT_INPUTS: VisionInputs = {
  ambitionStatement: "",
  aiRoleInHR: "",
  aiRoleInBusiness: "",
  timeHorizonMonths: 36,
  geographicScope: "",
  constraints: "",
  successLooksLike: "",
  whatWontChange: "",
};

const TIME_OPTIONS = [
  { value: 6,  label: "6 months" },
  { value: 12, label: "1 year" },
  { value: 18, label: "18 months" },
  { value: 24, label: "2 years" },
  { value: 36, label: "3 years" },
  { value: 48, label: "4 years" },
  { value: 60, label: "5 years" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sectorLabel(sector: string | null | undefined): string {
  const map: Record<string, string> = {
    financial_services: "Financial Services",
    healthcare: "Healthcare",
    technology: "Technology",
    retail: "Retail",
    public_sector: "Public Sector",
    professional_services: "Professional Services",
    manufacturing: "Manufacturing",
    energy_utilities: "Energy & Utilities",
    media_entertainment: "Media & Entertainment",
    logistics_transport: "Logistics & Transport",
    education: "Education",
    hospitality_leisure: "Hospitality & Leisure",
    other: "Other",
  };
  return sector ? (map[sector] ?? sector) : "";
}

function formatHeadcount(n: number | null | undefined): string {
  if (!n) return "";
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k employees`;
  return `${n} employees`;
}

function isThresholdMet(inputs: VisionInputs): boolean {
  return (
    inputs.ambitionStatement.trim().length >= 10 &&
    inputs.aiRoleInHR.trim().length >= 10 &&
    inputs.aiRoleInBusiness.trim().length >= 10 &&
    inputs.geographicScope.trim().length >= 2
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-teal-400 opacity-80">{icon}</span>
      <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-foreground/80 mb-1.5">
      {children}
      {required && <span className="text-teal-400 ml-0.5">*</span>}
    </label>
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  ariaLabel?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      aria-label={ariaLabel}
      className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/40 resize-none transition-colors"
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface VisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when Save is clicked — passes the final vision text */
  onSaved: (visionText: string) => void;
  /** Existing vision inputs to pre-populate */
  initialInputs?: VisionInputs | null;
  /** Existing vision draft text */
  initialDraft?: string | null;
  /** Context: sector */
  sector?: string | null;
  /** Context: headcount */
  headcount?: number | null;
  /** Context: business ambition level label */
  businessAmbitionLabel?: string | null;
  /** Context: people ambition level label */
  peopleAmbitionLabel?: string | null;
  /** Context: company name */
  companyName?: string | null;
  /** Context: HR capability score (0-10) */
  capabilityScore?: number | null;
  /** Context: HR capability maturity label */
  capabilityLabel?: string | null;
  /** Context: number of completed capability assessments */
  capabilityCount?: number | null;
}

export function VisionModal({
  isOpen,
  onClose,
  onSaved,
  initialInputs,
  initialDraft,
  sector,
  headcount,
  businessAmbitionLabel,
  peopleAmbitionLabel,
  companyName,
  capabilityScore,
  capabilityLabel,
  capabilityCount,
}: VisionModalProps) {
  // ── Inputs state ────────────────────────────────────────────────────────────
  const [inputs, setInputs] = useState<VisionInputs>(initialInputs ?? DEFAULT_INPUTS);
  const [savedInputs, setSavedInputs] = useState<VisionInputs>(initialInputs ?? DEFAULT_INPUTS);

  // ── Draft state ─────────────────────────────────────────────────────────────
  const [draftText, setDraftText] = useState<string>(initialDraft ?? "");
  const [draftGeneratedAt, setDraftGeneratedAt] = useState<Date | null>(null);
  const [inputsChangedAfterDraft, setInputsChangedAfterDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  // ── Save state ───────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);

  // ── Autosave timer ───────────────────────────────────────────────────────────
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutosaveRef = useRef<string>(JSON.stringify(inputs));

  // ── Unsaved changes guard ────────────────────────────────────────────────────
  const hasUnsavedChanges = JSON.stringify(inputs) !== JSON.stringify(savedInputs);

  // ── tRPC mutations ───────────────────────────────────────────────────────────
  const utils = trpc.useUtils();

  const saveVisionInputsMutation = trpc.intelligence.saveVisionInputs.useMutation({
    onSuccess: () => {
      setSavedInputs({ ...inputs });
      lastAutosaveRef.current = JSON.stringify(inputs);
    },
    onError: () => {
      toast.error("Couldn't autosave — your edits are kept locally.");
    },
  });

  const generateDraftMutation = trpc.intelligence.generateVisionDraft.useMutation({
    onSuccess: (data) => {
      setDraftText(data.visionDraft);
      setDraftGeneratedAt(new Date());
      setInputsChangedAfterDraft(false);
      setDraftError(null);
    },
    onError: (err) => {
      setDraftError(err.message ?? "Couldn't generate draft. Please retry.");
    },
  });

  const patchMutation = trpc.intelligence.patchStrategyField.useMutation({
    onSuccess: () => {
      utils.intelligence.getStrategyAssessment.invalidate();
    },
  });

  // ── Sync initial data ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const init = initialInputs ?? DEFAULT_INPUTS;
      setInputs(init);
      setSavedInputs(init);
      lastAutosaveRef.current = JSON.stringify(init);
      setDraftText(initialDraft ?? "");
      setDraftGeneratedAt(null);
      setInputsChangedAfterDraft(false);
      setDraftError(null);
    }
  }, [isOpen, initialInputs, initialDraft]);

  // ── Autosave on input change ─────────────────────────────────────────────────
  const scheduleAutosave = useCallback((newInputs: VisionInputs) => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      const current = JSON.stringify(newInputs);
      if (current !== lastAutosaveRef.current) {
        saveVisionInputsMutation.mutate(newInputs);
      }
    }, 5000);
  }, [saveVisionInputsMutation]);

  const updateField = useCallback(<K extends keyof VisionInputs>(
    key: K,
    value: VisionInputs[K],
  ) => {
    setInputs(prev => {
      const next = { ...prev, [key]: value };
      scheduleAutosave(next);
      if (draftGeneratedAt) setInputsChangedAfterDraft(true);
      return next;
    });
  }, [scheduleAutosave, draftGeneratedAt]);

  // ── Generate draft ───────────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    setDraftError(null);
    generateDraftMutation.mutate({
      ...inputs,
      sector: sector ?? "other",
      orgSize: headcount ? formatHeadcount(headcount) : undefined,
    });
  }, [inputs, sector, headcount, generateDraftMutation]);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // 1. Save the 8 inputs
      await saveVisionInputsMutation.mutateAsync(inputs);
      // 2. Save the vision text (draft or user-edited)
      if (draftText.trim()) {
        await patchMutation.mutateAsync({ field: "visionStatement", value: draftText.trim() });
        await patchMutation.mutateAsync({ field: "userVisionInput", value: draftText.trim() });
      }
      onSaved(draftText.trim());
    } catch {
      toast.error("Couldn't save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Cancel ───────────────────────────────────────────────────────────────────
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Close without saving?")) return;
    }
    onClose();
  };

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, hasUnsavedChanges]);

  // ── Cleanup ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const thresholdMet = isThresholdMet(inputs);
  const isGenerating = generateDraftMutation.isPending;
  const sLabel = sectorLabel(sector);
  const hLabel = formatHeadcount(headcount);

  // Org descriptor line
  const orgDescriptorParts = [companyName, sLabel, hLabel].filter(Boolean);
  const orgDescriptor = orgDescriptorParts.length > 0
    ? orgDescriptorParts.join(" · ")
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Vision modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-[620px] max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-[#0f1623] shadow-2xl flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/15 text-teal-400">
              <Target className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Define your AI vision</h2>
              <p className="text-[11px] text-muted-foreground">Capture your strategic intent and generate a board-ready draft</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Context strip ──────────────────────────────────────────────────── */}
        <div className="px-6 py-3 border-b border-white/8 bg-white/3 flex-shrink-0">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {/* Org profile */}
            <div className="flex items-start gap-2 min-w-0">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                {orgDescriptor ? (
                  <>
                    <p className="text-xs text-foreground/80 truncate">{orgDescriptor}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Editable in your organisation profile
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground italic">No organisation profile yet</p>
                    <p className="text-[10px] text-muted-foreground">The draft will be more generic without it</p>
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
                      Aggregate of {capabilityCount} individual assessment{capabilityCount !== 1 ? "s" : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground italic">No assessments completed yet</p>
                    <p className="text-[10px] text-muted-foreground">The draft will be more generic without them</p>
                  </>
                )}
              </div>
            </div>

            {/* Ambition levels */}
            {(businessAmbitionLabel || peopleAmbitionLabel) && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  Business: {businessAmbitionLabel ?? "—"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  HR: {peopleAmbitionLabel ?? "—"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Section 1: Your ambition ─────────────────────────────────────── */}
          <section aria-labelledby="section-ambition">
            <SectionHeader icon={<Target className="w-3.5 h-3.5" />} label="Your ambition" />

            <div className="space-y-4">
              <div>
                <FieldLabel required>What is your ambition for AI in your organisation?</FieldLabel>
                <Textarea
                  value={inputs.ambitionStatement}
                  onChange={v => updateField("ambitionStatement", v)}
                  placeholder="e.g. We want AI to fundamentally change how we attract, develop and retain talent — shifting HR from reactive to predictive across all people decisions."
                  rows={3}
                  ariaLabel="Ambition statement"
                />
              </div>

              <div>
                <FieldLabel required>What role will AI play specifically within the HR function?</FieldLabel>
                <Textarea
                  value={inputs.aiRoleInHR}
                  onChange={v => updateField("aiRoleInHR", v)}
                  placeholder="e.g. AI will automate routine HR admin, surface real-time workforce insights, and support managers with evidence-based recommendations on hiring and development."
                  rows={3}
                  ariaLabel="AI role in HR"
                />
              </div>
            </div>
          </section>

          <hr className="border-white/8" />

          {/* ── Section 2: Where AI plays ────────────────────────────────────── */}
          <section aria-labelledby="section-where-ai">
            <SectionHeader icon={<Cpu className="w-3.5 h-3.5" />} label="Where AI plays" />

            <div className="space-y-4">
              <div>
                <FieldLabel required>What role will AI play in the wider business?</FieldLabel>
                <Textarea
                  value={inputs.aiRoleInBusiness}
                  onChange={v => updateField("aiRoleInBusiness", v)}
                  placeholder="e.g. AI will be central to our customer service, supply chain optimisation, and product personalisation — HR needs to build the workforce to operate and govern these systems."
                  rows={3}
                  ariaLabel="AI role in business"
                />
              </div>

              <div>
                <FieldLabel required>What is the geographic scope of this strategy?</FieldLabel>
                <input
                  type="text"
                  value={inputs.geographicScope}
                  onChange={e => updateField("geographicScope", e.target.value)}
                  placeholder="e.g. UK and Ireland, or Global with UK HQ"
                  aria-label="Geographic scope"
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/40 transition-colors"
                />
              </div>
            </div>
          </section>

          <hr className="border-white/8" />

          {/* ── Section 3: Time and boundaries ───────────────────────────────── */}
          <section aria-labelledby="section-time">
            <SectionHeader icon={<Clock className="w-3.5 h-3.5" />} label="Time &amp; boundaries" />

            <div className="space-y-4">
              {/* Time horizon */}
              <div>
                <FieldLabel>Time horizon</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {TIME_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField("timeHorizonMonths", opt.value)}
                      aria-pressed={inputs.timeHorizonMonths === opt.value}
                      className={[
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                        inputs.timeHorizonMonths === opt.value
                          ? "bg-teal-500/20 border-teal-500/50 text-teal-300"
                          : "bg-white/4 border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground",
                      ].join(" ")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel>What constraints must this strategy work within?</FieldLabel>
                <Textarea
                  value={inputs.constraints}
                  onChange={v => updateField("constraints", v)}
                  placeholder="e.g. Budget cap of £500k in year 1, no redundancies from AI deployment, must comply with UK employment law and GDPR."
                  rows={2}
                  ariaLabel="Constraints"
                />
              </div>

              <div>
                <FieldLabel>What does success look like in {TIME_OPTIONS.find(o => o.value === inputs.timeHorizonMonths)?.label ?? `${inputs.timeHorizonMonths} months`}?</FieldLabel>
                <Textarea
                  value={inputs.successLooksLike}
                  onChange={v => updateField("successLooksLike", v)}
                  placeholder="e.g. 80% of HR admin is automated, time-to-hire reduced by 40%, every manager has access to a real-time people dashboard, HR team is AI-proficient at level 3+."
                  rows={3}
                  ariaLabel="What success looks like"
                />
              </div>

              <div>
                <FieldLabel>What will NOT change — what are the non-negotiables?</FieldLabel>
                <Textarea
                  value={inputs.whatWontChange}
                  onChange={v => updateField("whatWontChange", v)}
                  placeholder="e.g. Humans will always make the final call on hiring, firing, pay and promotion. We will not deploy AI in any process without an explainability requirement."
                  rows={2}
                  ariaLabel="What will not change"
                />
              </div>
            </div>
          </section>

          <hr className="border-white/8" />

          {/* ── AI Draft block ───────────────────────────────────────────────── */}
          <section aria-labelledby="section-draft">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-teal-400 opacity-80">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
                  AI draft
                </span>
                {draftText && inputsChangedAfterDraft && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
                    <AlertCircle className="w-2.5 h-2.5" aria-hidden="true" />
                    Inputs changed · regenerate to refresh
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
                onClick={handleGenerate}
                disabled={!thresholdMet || isGenerating}
                aria-label={draftText ? "Regenerate vision draft" : "Generate vision draft"}
              >
                {isGenerating ? (
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="w-3 h-3" aria-hidden="true" />
                )}
                {draftText ? "Regenerate" : "Generate draft"}
              </Button>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/3 p-4">
              {isGenerating ? (
                <div className="space-y-2" aria-live="polite" aria-label="Generating draft">
                  <div className="h-3 rounded bg-white/8 aiq-shimmer w-full" />
                  <div className="h-3 rounded bg-white/8 aiq-shimmer w-5/6" />
                  <div className="h-3 rounded bg-white/8 aiq-shimmer w-4/6" />
                </div>
              ) : draftError ? (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>{draftError}</span>
                  <button
                    onClick={handleGenerate}
                    className="ml-auto text-xs underline hover:no-underline"
                  >
                    Retry
                  </button>
                </div>
              ) : draftText ? (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Drafted from your answers and context · editable below
                  </p>
                  <textarea
                    value={draftText}
                    onChange={e => setDraftText(e.target.value)}
                    rows={4}
                    aria-label="Vision draft — editable"
                    className="w-full bg-transparent text-sm text-foreground leading-relaxed resize-none focus:outline-none placeholder:text-muted-foreground/50"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {thresholdMet
                    ? "Click \"Generate draft\" to create your AI-drafted vision statement."
                    : "Fill in the four required fields above (marked with *) to generate a draft."}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/8 flex-shrink-0 bg-white/2">
          <p className="text-[11px] text-muted-foreground">
            Updates anytime via the pencil on the card.
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs px-4 bg-teal-600 hover:bg-teal-500 text-white"
              onClick={handleSave}
              disabled={isSaving || (!draftText.trim() && !hasUnsavedChanges)}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1.5" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
