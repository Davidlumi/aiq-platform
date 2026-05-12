/**
 * StrategyAmbitionPage — /strategy/ambition
 * Section 02: Where we're going
 *
 * Mixed-edit pattern:
 *  INLINE-EDITABLE: visionStatement, guidingPrinciples, wontDo
 *  WIZARD-SOURCED:  commitments, waysOfWork, currentLandscape, stakeholderMap
 *
 * Wizard deep-link NOT supported in v1 → single top-of-page banner pattern.
 */
import React, { useState, useEffect, useRef, useCallback, useId } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Target, Sparkles, AlertCircle,
  Plus, Trash2, MoreHorizontal, Info, UserCheck, Lock as LockIcon,
  Users, AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import SectionPageLayout from "@/components/SectionPageLayout";
import {
  InlineEditableBlock,
  WizardSourcedBlock,
  MobileEditSheet,
} from "@/components/strategy/EditableBlocks";
import {
  EXISTING_AI_TOOLS,
  AI_PHILOSOPHY_OPTIONS,
  EXECUTIVE_SPONSORS,
  GATEKEEPERS,
  AFFECTED_GROUPS,
  POTENTIAL_RESISTORS,
  SUCCESS_MARKERS,
} from "@/../../shared/strategyInputs";

// ─── Constants ────────────────────────────────────────────────────────────────

const BUSINESS_LEVELS: Record<number, { label: string; waysOfWork: string }> = {
  1: { label: "Cautious",      waysOfWork: "AI will be introduced carefully, with human oversight at every step." },
  2: { label: "Exploratory",   waysOfWork: "AI will be piloted in low-risk processes to build confidence and capability." },
  3: { label: "Progressive",   waysOfWork: "AI will augment HR workflows, with humans retaining decision authority." },
  4: { label: "Ambitious",     waysOfWork: "AI will be embedded across most HR processes, driving significant efficiency and insight." },
  5: { label: "Transformative",waysOfWork: "AI will fundamentally reshape how HR operates, enabling new business models." },
};

const PEOPLE_LEVELS: Record<number, { label: string; expectation: string; tooltip: string }> = {
  1: { label: "AI-Aware",      expectation: "HR teams will understand AI basics and know when to escalate.", tooltip: "HR staff understand AI concepts and can identify when AI is being used, but do not yet use it directly." },
  2: { label: "AI-Assisted",   expectation: "HR teams will use AI tools confidently in day-to-day work.", tooltip: "HR staff use AI tools in their day-to-day work with guidance and support." },
  3: { label: "AI-Augmented",  expectation: "HR teams will co-design AI solutions and interpret AI outputs critically.", tooltip: "HR staff work alongside AI systems, critically evaluating outputs and co-designing solutions." },
  4: { label: "AI-Native",     expectation: "HR teams will build, configure, and govern AI tools independently.", tooltip: "HR staff build, configure, and govern AI tools without external dependency." },
  5: { label: "AI-Led",        expectation: "HR teams will lead enterprise AI strategy and set the standard for the organisation.", tooltip: "HR leads enterprise AI strategy, setting the standard for the wider organisation." },
};

const OUT_OF_SCOPE_DEFAULTS: Record<number, string[]> = {
  1: [
    "Autonomous AI decision-making in any employment process",
    "Generative AI tools for employee-facing communications",
    "Predictive analytics for individual performance assessment",
    "AI-driven compensation modelling without human sign-off",
    "Unmonitored AI in any high-risk HR workflow",
  ],
  2: [
    "Full automation of recruitment shortlisting",
    "AI-generated performance ratings without manager review",
    "Autonomous workforce planning recommendations",
    "Real-time employee sentiment monitoring at individual level",
    "AI tools that have not passed a bias audit",
  ],
  3: [
    "Replacing human judgement in promotion or redundancy decisions",
    "Deploying AI in collective bargaining or ER processes without legal review",
    "AI-generated individual development plans without manager validation",
    "Sharing employee AI capability data with third parties",
  ],
  4: [
    "Fully autonomous hiring decisions without human review",
    "AI systems that cannot explain their recommendations to employees",
    "Deploying AI tools that have not been assessed against the EU AI Act",
    "Individual-level AI monitoring without employee consent",
  ],
  5: [
    "AI systems that remove human accountability from employment decisions",
    "Deploying frontier AI models in HR without a dedicated ethics review",
    "AI-generated contracts or legal documents without solicitor review",
  ],
};

// ─── Toast batching ───────────────────────────────────────────────────────────

// Singleton toast ID so new saves replace the previous toast within 5s
const TOAST_ID = "ambition-save";

function fireToast(message: string, onUndo?: () => void) {
  toast.success(message, {
    id: TOAST_ID,
    duration: 5000,
    action: onUndo ? { label: "Undo", onClick: onUndo } : undefined,
  });
  (window as any).umami?.track("strategy.ambition.undo.clicked", { action: message });
}

// ─── Rich text editor (vision) ────────────────────────────────────────────────

const CHAR_LIMIT = 800;
const CHAR_WARN  = 600;

function VisionEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  const len = value.length;
  const atWarn = len >= CHAR_WARN && len < CHAR_LIMIT;
  const atLimit = len >= CHAR_LIMIT;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= CHAR_LIMIT) {
      onChange(e.target.value);
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-2 pb-2 border-b border-border/50">
        <button
          type="button"
          className="px-2 py-0.5 text-xs font-bold rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Bold (not supported in plain text — use **text**)"
          aria-label="Bold"
        >B</button>
        <button
          type="button"
          className="px-2 py-0.5 text-xs italic rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Italic (not supported in plain text — use _text_)"
          aria-label="Italic"
        >I</button>
        <span className="text-muted-foreground/30 text-xs mx-1">|</span>
        <span className="text-[10px] text-muted-foreground/50">Bold · Italic · Links only</span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        rows={4}
        className="w-full bg-transparent resize-none text-base leading-relaxed text-foreground focus:outline-none font-serif placeholder:text-muted-foreground/50 placeholder:italic"
        placeholder="Enter your vision statement…"
        aria-label="Vision statement editor"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      />
      {/* Character count */}
      <div className="flex items-center justify-end mt-1">
        {atWarn && !atLimit && (
          <span className="text-[10px] text-amber-400 mr-2 flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" />
            Approaching {CHAR_LIMIT}-character limit
          </span>
        )}
        <span className={`text-[10px] ${atLimit ? "text-red-400" : "text-muted-foreground/50"}`}>
          {len}/{CHAR_LIMIT}
        </span>
      </div>
    </div>
  );
}

// ─── Principle card ───────────────────────────────────────────────────────────

interface Principle {
  title: string;
  description: string;
}

function PrincipleCard({
  principle,
  index,
  isEditing,
  onEditStart,
  onSave,
  onRemove,
  saveStatus,
}: {
  principle: Principle;
  index: number;
  isEditing: boolean;
  onEditStart: () => void;
  onSave: (p: Principle) => void;
  onRemove: () => void;
  saveStatus?: "saving" | "saved" | null;
}) {
  const [draft, setDraft] = useState<Principle>(principle);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(principle); }, [principle]);
  useEffect(() => { if (isEditing) titleRef.current?.focus(); }, [isEditing]);

  const colours = ["#60A5FA", "#4ADE80", "#FBBF24", "#F87171", "#A78BFA", "#34D399", "#FB923C", "#38BDF8"];
  const accent = colours[index % colours.length];

  if (isEditing) {
    return (
      <div className="rounded-xl border border-primary/40 bg-card p-4 space-y-2 ring-1 ring-primary/20">
        <input
          ref={titleRef}
          value={draft.title}
          onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
          className="w-full bg-transparent border-b border-border/60 pb-1 text-sm font-semibold text-foreground focus:outline-none focus:border-primary/60"
          placeholder="Principle title…"
          aria-label="Principle title"
        />
        <textarea
          value={draft.description}
          onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
          rows={3}
          className="w-full bg-transparent text-xs text-muted-foreground resize-none focus:outline-none placeholder:text-muted-foreground/40"
          placeholder="Describe this principle…"
          aria-label="Principle description"
        />
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            className="h-6 text-xs px-3"
            onClick={() => onSave(draft)}
            disabled={saveStatus === "saving"}
          >
            {saveStatus === "saving" ? "Saving…" : "Save"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs px-2 text-muted-foreground"
            onClick={() => { setDraft(principle); onSave(principle); }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative rounded-xl border border-border bg-card p-4 hover:border-border/80 transition-colors cursor-pointer" onClick={onEditStart}>
      {showRemoveConfirm ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex-1">Remove this principle?</span>
          <Button size="sm" variant="destructive" className="h-6 text-xs px-2" onClick={(e) => { e.stopPropagation(); onRemove(); }}>Yes</Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={(e) => { e.stopPropagation(); setShowRemoveConfirm(false); }}>Cancel</Button>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${accent}20` }}>
              <span className="text-[10px] font-bold" style={{ color: accent }}>{index + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground mb-0.5">{principle.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{principle.description}</p>
            </div>
          </div>
          {/* Overflow menu */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                  onClick={e => e.stopPropagation()}
                  aria-label="Principle options"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditStart(); }}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-400 focus:text-red-400"
                  onClick={(e) => { e.stopPropagation(); setShowRemoveConfirm(true); }}
                >
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {/* Save status */}
          {saveStatus === "saved" && (
            <span className="absolute bottom-2 right-2 text-[10px] text-green-400">Saved</span>
          )}
        </>
      )}
    </div>
  );
}

// ─── Exclusion item ───────────────────────────────────────────────────────────

function ExclusionItem({
  item,
  index,
  onSave,
  onRemove,
}: {
  item: string;
  index: number;
  onSave: (v: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item);
  const [showConfirm, setShowConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(item); }, [item]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  if (showConfirm) {
    return (
      <li className="flex items-center gap-2 py-1.5 px-1 rounded-lg bg-red-500/8 border border-red-500/20">
        <span className="text-xs text-muted-foreground flex-1">Remove this exclusion?</span>
        <Button size="sm" variant="destructive" className="h-6 text-xs px-2" onClick={onRemove}>Yes</Button>
        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setShowConfirm(false)}>Cancel</Button>
      </li>
    );
  }

  if (editing) {
    return (
      <li className="flex items-center gap-2">
        <span className="text-red-400 text-xs flex-shrink-0">×</span>
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { onSave(draft.trim()); setEditing(false); }}
          onKeyDown={e => {
            if (e.key === "Enter") { onSave(draft.trim()); setEditing(false); }
            if (e.key === "Escape") { setDraft(item); setEditing(false); }
          }}
          className="flex-1 bg-transparent border-b border-primary/40 text-sm text-foreground focus:outline-none py-0.5"
          aria-label={`Edit exclusion ${index + 1}`}
        />
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-2.5 py-1 rounded-lg hover:bg-white/3 px-1 transition-colors cursor-pointer" onClick={() => setEditing(true)}>
      <span className="text-red-400 text-xs flex-shrink-0">×</span>
      <span className="text-sm text-muted-foreground flex-1 leading-relaxed">{item}</span>
      <button
        type="button"
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-red-400 flex-shrink-0 ml-1"
        onClick={e => { e.stopPropagation(); setShowConfirm(true); }}
        aria-label={`Remove exclusion ${index + 1}`}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </li>
  );
}

// ─── Block skeletons ──────────────────────────────────────────────────────────

function BlockSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-5 space-y-3">
      <Skeleton className="h-3 w-24 rounded" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 rounded ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StrategyAmbitionPage() {
  const [, navigate] = useLocation();

  // Queries
  const strategyQ       = trpc.intelligence.getStrategy.useQuery();
  const assessmentQ     = trpc.intelligence.getStrategyAssessment.useQuery();
  const companyResultsQ = trpc.companyAssessment.getMyAssessmentResults.useQuery();

  const strategy       = strategyQ.data;
  const assessment     = assessmentQ.data;
  const companyResults = companyResultsQ.data;

  // Derived data
  const businessLevel = assessment?.businessAmbitionLevel ?? strategy?.businessAmbitionLevel ?? 3;
  const peopleLevel   = assessment?.peopleAmbitionLevel   ?? strategy?.peopleAmbitionLevel   ?? 3;
  const bLevel        = BUSINESS_LEVELS[businessLevel];
  const pLevel        = PEOPLE_LEVELS[peopleLevel];

  const structuredInputs = assessment?.structuredInputs as Record<string, unknown> | null | undefined;

  const guidingPrinciples: Principle[] = (assessment?.guidingPrinciples ?? []) as Principle[];
  const wontDoItems: string[] = (assessment?.wontDo && assessment.wontDo.length > 0)
    ? assessment.wontDo
    : (OUT_OF_SCOPE_DEFAULTS[businessLevel] ?? []);

  // Commitments: wizard-sourced from success_markers_ranked
  const successMarkersRanked = structuredInputs?.success_markers_ranked as string[] | undefined;
  const commitments: Array<{ statement: string; measurement: string }> = successMarkersRanked
    ? successMarkersRanked.map(id => {
        const m = (SUCCESS_MARKERS as Array<{ id: string; label: string; measurement?: string }>).find(s => s.id === id);
        return { statement: m?.label ?? id, measurement: m?.measurement ?? "" };
      })
    : [];

  // ── Edit state ────────────────────────────────────────────────────────────
  const [visionEditing, setVisionEditing]         = useState(false);
  const [visionDraft, setVisionDraft]             = useState("");
  const [visionSaveStatus, setVisionSaveStatus]   = useState<"saving" | "saved" | null>(null);

  const [principleEditing, setPrincipleEditing]   = useState<number | null>(null);
  const [principlesSaveStatus, setPrinciplesSaveStatus] = useState<"saving" | "saved" | null>(null);
  const [localPrinciples, setLocalPrinciples]     = useState<Principle[]>([]);

  const [exclusionEditing, setExclusionEditing]   = useState<number | null>(null);
  const [localExclusions, setLocalExclusions]     = useState<string[]>([]);
  const [exclusionSaveStatus, setExclusionSaveStatus] = useState<"saving" | "saved" | null>(null);

  // Mobile sheet state
  const [mobileVisionOpen, setMobileVisionOpen]   = useState(false);
  const [mobilePrincipleOpen, setMobilePrincipleOpen] = useState<number | null>(null);
  const [mobileExclusionOpen, setMobileExclusionOpen] = useState(false);

  // Undo state
  const [prevVision, setPrevVision]               = useState<string | null>(null);
  const [prevPrinciples, setPrevPrinciples]       = useState<Principle[] | null>(null);
  const [prevExclusions, setPrevExclusions]       = useState<string[] | null>(null);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 600;

  useEffect(() => {
    if (assessment) {
      setVisionDraft(assessment.visionStatement ?? "");
      setLocalPrinciples((assessment.guidingPrinciples ?? []) as Principle[]);
    }
  }, [assessment]);

  useEffect(() => {
    setLocalExclusions(wontDoItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(wontDoItems)]);

  // Telemetry on mount
  useEffect(() => {
    (window as any).umami?.track("strategy.section.viewed", { section: "ambition" });
  }, []);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const utils = trpc.useUtils();

  const patchMutation = trpc.intelligence.patchStrategyField.useMutation({
    onSuccess: () => {
      utils.intelligence.getStrategyAssessment.invalidate();
      utils.intelligence.getStrategy.invalidate();
    },
    onError: (err) => {
      toast.error(`Save failed: ${err.message}`, { id: TOAST_ID });
    },
  });

  const patch = useCallback(async (
    field: "visionStatement" | "wontDo" | "commitments" | "guidingPrinciples",
    value: unknown
  ) => {
    await patchMutation.mutateAsync({ field, value } as any);
  }, [patchMutation]);

  // ── Vision save ───────────────────────────────────────────────────────────
  const handleVisionSave = async () => {
    const prev = assessment?.visionStatement ?? "";
    if (visionDraft === prev) { setVisionEditing(false); return; }
    setPrevVision(prev);
    setVisionSaveStatus("saving");
    (window as any).umami?.track("strategy.ambition.block.edit-saved", { block: "vision", field: "visionStatement" });
    try {
      await patch("visionStatement", visionDraft);
      setVisionSaveStatus("saved");
      setTimeout(() => setVisionSaveStatus(null), 1500);
      setVisionEditing(false);
      setMobileVisionOpen(false);
      fireToast("Vision saved", () => {
        (window as any).umami?.track("strategy.ambition.undo.clicked", { action: "vision" });
        patch("visionStatement", prev).then(() => {
          setVisionDraft(prev);
          utils.intelligence.getStrategyAssessment.invalidate();
        });
      });
    } catch {
      setVisionSaveStatus(null);
      (window as any).umami?.track("strategy.ambition.block.edit-failed", { block: "vision", error: "mutation failed" });
    }
  };

  // ── Principles save ───────────────────────────────────────────────────────
  const handlePrincipleSave = async (index: number, updated: Principle) => {
    const newList = localPrinciples.map((p, i) => i === index ? updated : p);

    // Soft limit warning at 9+
    if (newList.length > 8 && !window.confirm("Strategies with more than 8 principles tend to dilute focus. Consider consolidating. Save anyway?")) {
      return;
    }

    setPrevPrinciples([...localPrinciples]);
    setLocalPrinciples(newList);
    setPrincipleEditing(null);
    setMobilePrincipleOpen(null);
    setPrinciplesSaveStatus("saving");
    (window as any).umami?.track("strategy.ambition.block.edit-saved", { block: "principles", field: "guidingPrinciples" });
    try {
      await patch("guidingPrinciples", newList);
      setPrinciplesSaveStatus("saved");
      setTimeout(() => setPrinciplesSaveStatus(null), 1500);
      fireToast(`Principle ${index + 1} saved`, () => {
        (window as any).umami?.track("strategy.ambition.undo.clicked", { action: `principle ${index + 1}` });
        const prev = prevPrinciples ?? localPrinciples;
        setLocalPrinciples(prev);
        patch("guidingPrinciples", prev).then(() => utils.intelligence.getStrategyAssessment.invalidate());
      });
    } catch {
      setPrinciplesSaveStatus(null);
      setLocalPrinciples(localPrinciples);
      (window as any).umami?.track("strategy.ambition.block.edit-failed", { block: "principles", error: "mutation failed" });
    }
  };

  const handleAddPrinciple = () => {
    const newList = [...localPrinciples, { title: "", description: "" }];
    setLocalPrinciples(newList);
    setPrincipleEditing(newList.length - 1);
    (window as any).umami?.track("strategy.ambition.principle.added");
  };

  const handleRemovePrinciple = async (index: number) => {
    const prev = [...localPrinciples];
    const newList = localPrinciples.filter((_, i) => i !== index);
    setPrevPrinciples(prev);
    setLocalPrinciples(newList);
    setPrinciplesSaveStatus("saving");
    (window as any).umami?.track("strategy.ambition.principle.removed", { principleIndex: index });
    try {
      await patch("guidingPrinciples", newList);
      setPrinciplesSaveStatus("saved");
      setTimeout(() => setPrinciplesSaveStatus(null), 1500);
      fireToast("Principle removed", () => {
        setLocalPrinciples(prev);
        patch("guidingPrinciples", prev).then(() => utils.intelligence.getStrategyAssessment.invalidate());
      });
    } catch {
      setPrinciplesSaveStatus(null);
      setLocalPrinciples(prev);
    }
  };

  // ── Exclusions save ───────────────────────────────────────────────────────
  const handleExclusionSave = async (index: number, value: string) => {
    const prev = [...localExclusions];
    const newList = localExclusions.map((e, i) => i === index ? value : e).filter(e => e.trim().length > 0);
    setPrevExclusions(prev);
    setLocalExclusions(newList);
    setExclusionEditing(null);
    setExclusionSaveStatus("saving");
    (window as any).umami?.track("strategy.ambition.block.edit-saved", { block: "exclusions", field: "wontDo" });
    try {
      await patch("wontDo", newList);
      setExclusionSaveStatus("saved");
      setTimeout(() => setExclusionSaveStatus(null), 1500);
      fireToast("Exclusion saved", () => {
        setLocalExclusions(prev);
        patch("wontDo", prev).then(() => utils.intelligence.getStrategyAssessment.invalidate());
      });
    } catch {
      setExclusionSaveStatus(null);
      setLocalExclusions(prev);
    }
  };

  const handleAddExclusion = () => {
    const newList = [...localExclusions, ""];
    setLocalExclusions(newList);
    setExclusionEditing(newList.length - 1);
    (window as any).umami?.track("strategy.ambition.exclusion.added");
  };

  const handleRemoveExclusion = async (index: number) => {
    const prev = [...localExclusions];
    const newList = localExclusions.filter((_, i) => i !== index);
    setPrevExclusions(prev);
    setLocalExclusions(newList);
    setExclusionSaveStatus("saving");
    (window as any).umami?.track("strategy.ambition.exclusion.removed", { exclusionIndex: index });
    try {
      await patch("wontDo", newList);
      setExclusionSaveStatus("saved");
      setTimeout(() => setExclusionSaveStatus(null), 1500);
      fireToast("Exclusion removed", () => {
        setLocalExclusions(prev);
        patch("wontDo", prev).then(() => utils.intelligence.getStrategyAssessment.invalidate());
      });
    } catch {
      setExclusionSaveStatus(null);
      setLocalExclusions(prev);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  const isLoading = strategyQ.isLoading || assessmentQ.isLoading;
  const isError   = strategyQ.isError   || assessmentQ.isError;

  if (isLoading) {
    return (
      <SectionPageLayout
        sectionNumber="02"
        sectionLabel="Ambition"
        title="Where we're going"
        accentColor="#2DD4BF"
        icon={<Target className="w-5 h-5" />}
      >
        <div className="space-y-5">
          <BlockSkeleton lines={4} />
          <BlockSkeleton lines={2} />
          <BlockSkeleton lines={3} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <BlockSkeleton key={i} lines={2} />)}
          </div>
          <BlockSkeleton lines={3} />
          <BlockSkeleton lines={2} />
        </div>
      </SectionPageLayout>
    );
  }

  if (isError) {
    return (
      <SectionPageLayout
        sectionNumber="02"
        sectionLabel="Ambition"
        title="Where we're going"
        accentColor="#2DD4BF"
        icon={<Target className="w-5 h-5" />}
      >
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Failed to load ambition data</p>
            <p className="text-xs text-muted-foreground mb-3">There was a problem loading your strategy. Please try refreshing the page.</p>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { assessmentQ.refetch(); strategyQ.refetch(); }}>
              Retry
            </Button>
          </div>
        </div>
      </SectionPageLayout>
    );
  }

  // ── Empty state (no strategy) ─────────────────────────────────────────────
  if (!assessment?.completed) {
    return (
      <SectionPageLayout
        sectionNumber="02"
        sectionLabel="Ambition"
        title="Where we're going"
        accentColor="#2DD4BF"
        icon={<Target className="w-5 h-5" />}
      >
        <div className="rounded-xl border border-dashed border-teal-500/20 bg-teal-500/4 p-8 flex flex-col items-center text-center gap-4">
          <Target className="w-8 h-8 text-teal-400" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Generate your strategy to set your ambition</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Complete the Build Strategy wizard to generate a vision statement, guiding principles, and ambition framing.
            </p>
          </div>
          <Button size="sm" className="h-8 text-xs" onClick={() => navigate("/ai-strategy/assessment")}>
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />Build Strategy
          </Button>
        </div>
      </SectionPageLayout>
    );
  }

  // ── Wizard banner (since deep-linking is NOT supported in v1) ─────────────
  const WizardBanner = (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center gap-3 mb-6">
      <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
      <p className="text-xs text-muted-foreground flex-1">
        Some sections of your ambition can only be changed by re-running the strategy assessment.
      </p>
      <button
        type="button"
        className="text-xs text-amber-400 hover:text-amber-300 font-medium whitespace-nowrap flex items-center gap-1 transition-colors"
        onClick={() => {
          (window as any).umami?.track("strategy.ambition.wizard-banner.clicked");
          navigate("/ai-strategy/assessment");
        }}
      >
        Re-run assessment →
      </button>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <SectionPageLayout
        sectionNumber="02"
        sectionLabel="Ambition"
        title="Where we're going"
        accentColor="#2DD4BF"
        icon={<Target className="w-5 h-5" />}
      >
        {WizardBanner}

        {/* ── 1. Vision statement (INLINE-EDITABLE) ─────────────────────── */}
        <InlineEditableBlock
          label="Vision Statement"
          editLabel="Edit vision statement"
          isEditing={visionEditing && !isMobile}
          onEditStart={() => {
            if (isMobile) {
              setMobileVisionOpen(true);
              (window as any).umami?.track("strategy.ambition.block.edit-opened", { block: "vision", surface: "bottom-sheet" });
            } else {
              setVisionEditing(true);
              (window as any).umami?.track("strategy.ambition.block.edit-opened", { block: "vision", surface: "inline" });
            }
          }}
          saveStatus={visionSaveStatus}
          className="border-teal-500/20 bg-teal-500/4"
        >
          {/* Ambition framing pills */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-300 cursor-help">
                  Business: <strong className="font-semibold">{bLevel?.label ?? "—"}</strong>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {bLevel?.waysOfWork}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-300 cursor-help">
                  HR: <strong className="font-semibold">{pLevel?.label ?? "—"}</strong>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {pLevel?.tooltip}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Vision text — editorial serif */}
          {visionEditing && !isMobile ? (
            <div>
              <VisionEditor value={visionDraft} onChange={setVisionDraft} />
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" className="h-7 text-xs px-3" onClick={handleVisionSave} disabled={visionSaveStatus === "saving"}>
                  {visionSaveStatus === "saving" ? "Saving…" : "Save"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-muted-foreground" onClick={() => { setVisionDraft(assessment.visionStatement ?? ""); setVisionEditing(false); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : assessment.visionStatement ? (
            <p
              className="text-base leading-relaxed text-foreground"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", lineHeight: "1.6" }}
            >
              <span className="text-teal-400/60 text-2xl leading-none mr-1 align-top">"</span>
              {assessment.visionStatement}
              <span className="text-teal-400/60 text-2xl leading-none ml-1 align-bottom">"</span>
            </p>
          ) : (
            <div className="flex items-center gap-3 py-2">
              <p className="text-sm text-muted-foreground italic flex-1">Vision pending. Generate your strategy or write your own.</p>
              <Button size="sm" variant="outline" className="h-7 text-xs border-teal-500/30 text-teal-400" onClick={() => setVisionEditing(true)}>
                Write vision
              </Button>
            </div>
          )}
        </InlineEditableBlock>

        {/* Mobile sheet for vision */}
        <MobileEditSheet
          blockName="Vision Statement"
          isOpen={mobileVisionOpen}
          onDone={handleVisionSave}
          onCancel={() => { setMobileVisionOpen(false); setVisionDraft(assessment.visionStatement ?? ""); (window as any).umami?.track("strategy.ambition.block.edit-cancelled", { block: "vision" }); }}
        >
          <VisionEditor value={visionDraft} onChange={setVisionDraft} />
        </MobileEditSheet>

        {/* ── 2. By the end of this strategy period (WIZARD-SOURCED) ─────── */}
        <WizardSourcedBlock label="By the end of this strategy period, HR will:">
          {commitments.length > 0 ? (
            <ol className="space-y-3">
              {commitments.map((c, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-teal-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-teal-400">{i + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm text-foreground leading-relaxed">{c.statement}</p>
                    {c.measurement && (
                      <p className="text-xs text-muted-foreground mt-0.5">{c.measurement}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Source data not yet provided. Complete the assessment wizard to populate this.
            </p>
          )}
        </WizardSourcedBlock>

        {/* ── 3. How AI will change ways of work (WIZARD-SOURCED) ─────────── */}
        {bLevel && pLevel && (
          <WizardSourcedBlock label="How AI will change ways of work">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {companyResults?.companyName ?? "The organisation"}'s business is set on a{" "}
              <strong className="text-teal-300">{bLevel.label}</strong> AI ambition, and HR is expected to operate at the{" "}
              <strong className="text-teal-300">{pLevel.label}</strong> tier to deliver it.{" "}
              {bLevel.waysOfWork} {pLevel.expectation}
            </p>
          </WizardSourcedBlock>
        )}

        {/* ── 4. Guiding principles (INLINE-EDITABLE) ─────────────────────── */}
        <InlineEditableBlock
          label="Guiding Principles"
          editLabel="Edit guiding principles"
          isEditing={false}
          onEditStart={() => {}}
          saveStatus={principlesSaveStatus}
        >
          {localPrinciples.length === 0 ? (
            <div className="flex items-center gap-3 py-2">
              <p className="text-sm text-muted-foreground italic flex-1">No guiding principles yet.</p>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleAddPrinciple}>
                <Plus className="w-3 h-3 mr-1" />Add principle
              </Button>
            </div>
          ) : (
            <>
              {/* 2-column grid; last card spans 2 cols when count is odd */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {localPrinciples.map((p, i) => {
                  const isLast = i === localPrinciples.length - 1;
                  const isOdd  = localPrinciples.length % 2 !== 0;
                  return (
                    <div key={i} className={isLast && isOdd ? "sm:col-span-2" : ""}>
                      <PrincipleCard
                        principle={p}
                        index={i}
                        isEditing={principleEditing === i && !isMobile}
                        onEditStart={() => {
                          if (isMobile) {
                            setMobilePrincipleOpen(i);
                            (window as any).umami?.track("strategy.ambition.block.edit-opened", { block: "principles", surface: "bottom-sheet" });
                          } else {
                            setPrincipleEditing(i);
                            (window as any).umami?.track("strategy.ambition.block.edit-opened", { block: "principles", surface: "inline" });
                          }
                        }}
                        onSave={(updated) => handlePrincipleSave(i, updated)}
                        onRemove={() => handleRemovePrinciple(i)}
                        saveStatus={principleEditing === i ? principlesSaveStatus : null}
                      />
                      {/* Mobile sheet per principle */}
                      <MobileEditSheet
                        blockName={`Principle ${i + 1}`}
                        isOpen={mobilePrincipleOpen === i}
                        onDone={() => {
                          const card = localPrinciples[i];
                          handlePrincipleSave(i, card);
                        }}
                        onCancel={() => { setMobilePrincipleOpen(null); (window as any).umami?.track("strategy.ambition.block.edit-cancelled", { block: "principles" }); }}
                      >
                        <div className="space-y-3">
                          <input
                            value={localPrinciples[i]?.title ?? ""}
                            onChange={e => {
                              const n = [...localPrinciples];
                              n[i] = { ...n[i], title: e.target.value };
                              setLocalPrinciples(n);
                            }}
                            className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                            placeholder="Principle title…"
                          />
                          <textarea
                            value={localPrinciples[i]?.description ?? ""}
                            onChange={e => {
                              const n = [...localPrinciples];
                              n[i] = { ...n[i], description: e.target.value };
                              setLocalPrinciples(n);
                            }}
                            rows={5}
                            className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                            placeholder="Describe this principle…"
                          />
                        </div>
                      </MobileEditSheet>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleAddPrinciple}
              >
                <Plus className="w-3.5 h-3.5" />Add principle
              </button>
            </>
          )}
        </InlineEditableBlock>

        {/* ── 5. Current AI landscape (WIZARD-SOURCED) ────────────────────── */}
        {(() => {
          const tools = structuredInputs?.existing_ai_tools as string[] | undefined;
          const hasTools = Array.isArray(tools) && tools.length > 0 && !tools.includes("none");
          return (
            <WizardSourcedBlock label="Current AI Landscape">
              {hasTools ? (
                <>
                  <p className="text-xs text-muted-foreground mb-3">
                    Tools already deployed in HR — initiatives will complement rather than duplicate these.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(tools as string[]).map(toolId => {
                      const tool = EXISTING_AI_TOOLS.find(t => t.id === toolId);
                      return tool ? (
                        <span key={toolId} className="text-xs px-2.5 py-1 rounded-full border border-border/60 bg-muted/30 text-muted-foreground">
                          {tool.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Source data not yet provided. Complete the assessment wizard to populate this.
                </p>
              )}
            </WizardSourcedBlock>
          );
        })()}

        {/* ── 6. What we won't do (INLINE-EDITABLE) ───────────────────────── */}
        <InlineEditableBlock
          label="What We Won't Do"
          editLabel="Edit exclusions"
          isEditing={false}
          onEditStart={() => {
            if (isMobile) {
              setMobileExclusionOpen(true);
              (window as any).umami?.track("strategy.ambition.block.edit-opened", { block: "exclusions", surface: "bottom-sheet" });
            }
          }}
          saveStatus={exclusionSaveStatus}
          className="border-red-500/15 bg-red-500/4"
        >
          {/* Intro line */}
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            A strategy that makes no cuts is a wishlist. The following are explicitly out of scope for this strategy period.
          </p>

          {localExclusions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic mb-3">No exclusions defined yet.</p>
          ) : (
            <ul className="space-y-1 mb-3">
              {localExclusions.map((item, i) => (
                <ExclusionItem
                  key={i}
                  item={item}
                  index={i}
                  onSave={(v) => handleExclusionSave(i, v)}
                  onRemove={() => handleRemoveExclusion(i)}
                />
              ))}
            </ul>
          )}

          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleAddExclusion}
          >
            <Plus className="w-3.5 h-3.5" />Add exclusion
          </button>
        </InlineEditableBlock>

        {/* Mobile sheet for exclusions */}
        <MobileEditSheet
          blockName="What We Won't Do"
          isOpen={mobileExclusionOpen}
          onDone={async () => {
            setMobileExclusionOpen(false);
            setExclusionSaveStatus("saving");
            try {
              await patch("wontDo", localExclusions);
              setExclusionSaveStatus("saved");
              setTimeout(() => setExclusionSaveStatus(null), 1500);
              fireToast("Exclusions saved");
            } catch {
              setExclusionSaveStatus(null);
            }
          }}
          onCancel={() => {
            setMobileExclusionOpen(false);
            setLocalExclusions(wontDoItems);
            (window as any).umami?.track("strategy.ambition.block.edit-cancelled", { block: "exclusions" });
          }}
        >
          <div className="space-y-2">
            {localExclusions.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={item}
                  onChange={e => {
                    const n = [...localExclusions];
                    n[i] = e.target.value;
                    setLocalExclusions(n);
                  }}
                  className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="Exclusion…"
                />
                <button
                  type="button"
                  className="text-muted-foreground hover:text-red-400 transition-colors"
                  onClick={() => setLocalExclusions(localExclusions.filter((_, j) => j !== i))}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
              onClick={() => setLocalExclusions([...localExclusions, ""])}
            >
              <Plus className="w-3.5 h-3.5" />Add exclusion
            </button>
          </div>
        </MobileEditSheet>

        {/* ── 7. Stakeholder map (WIZARD-SOURCED) ─────────────────────────── */}
        {(() => {
          const sm = structuredInputs?.stakeholder_map as {
            executive_sponsors?: string[];
            gatekeepers?: string[];
            affected_groups?: string[];
            potential_resistors?: string[];
            notes?: string;
          } | undefined;

          const hasData = sm && (
            (sm.executive_sponsors?.length ?? 0) > 0 ||
            (sm.gatekeepers?.length ?? 0) > 0 ||
            (sm.affected_groups?.length ?? 0) > 0 ||
            (sm.potential_resistors?.length ?? 0) > 0
          );

          return (
            <WizardSourcedBlock label="Stakeholder Map">
              {hasData ? (
                <>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                    {[
                      { key: "executive_sponsors",  label: "Executive Sponsors",  ids: sm!.executive_sponsors ?? [],  options: EXECUTIVE_SPONSORS,  color: "#60A5FA",  icon: <UserCheck className="w-3.5 h-3.5" /> },
                      { key: "gatekeepers",         label: "Gatekeepers",         ids: sm!.gatekeepers ?? [],         options: GATEKEEPERS,         color: "#FBBF24",  icon: <LockIcon className="w-3.5 h-3.5" /> },
                      { key: "affected_groups",     label: "Affected Groups",     ids: sm!.affected_groups ?? [],     options: AFFECTED_GROUPS,     color: "#4ADE80",  icon: <Users className="w-3.5 h-3.5" /> },
                      { key: "potential_resistors", label: "Potential Resistors", ids: sm!.potential_resistors ?? [], options: POTENTIAL_RESISTORS, color: "#F87171",  icon: <AlertCircle className="w-3.5 h-3.5" /> },
                    ].map(q => (
                      <div key={q.key} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span style={{ color: q.color }}>{q.icon}</span>
                          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: q.color }}>{q.label}</p>
                        </div>
                        {q.ids.length === 0 ? (
                          <p className="text-xs text-muted-foreground/50 italic">None identified</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {q.ids.map(id => {
                              const opt = (q.options as readonly { id: string; label: string }[]).find(o => o.id === id);
                              return opt ? (
                                <span
                                  key={id}
                                  className="text-xs px-2 py-0.5 rounded-full border"
                                  style={{ borderColor: `${q.color}40`, background: `${q.color}15`, color: q.color }}
                                  tabIndex={0}
                                  role="listitem"
                                >
                                  {opt.label}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {sm!.notes && (
                    <div className="mt-3 rounded-lg bg-muted/20 border border-border/40 px-3 py-2">
                      <p className="text-xs text-muted-foreground leading-relaxed">{sm!.notes}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Source data not yet provided. Complete the assessment wizard to populate this.
                </p>
              )}
            </WizardSourcedBlock>
          );
        })()}

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Next step</p>
            <p className="text-sm text-foreground">Review the initiative roadmap and confirm your phased plan.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 border-border/50 hover:border-border"
            onClick={() => navigate("/strategy/plan")}
          >
            View plan
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>

      </SectionPageLayout>
    </TooltipProvider>
  );
}
