/**
 * ReviewSessionPage — Stage 10: Review Session
 *
 * T10 rebuild: adds 8-element sign-off panel, attendees field, and date-held field.
 * Sections:
 *   1. Session details (date held + attendees)
 *   2. Sign-off panel (8 strategy elements, each: agreed / conditions / unresolved / N/A)
 *   3. AI-generated tensions / hard questions (5 items)
 *   4. Session notes (free text, auto-saved)
 *   5. Gate confirm (all non-N/A elements must have a status)
 *
 * Gate: completeStage10 — validates sign-off server-side, persists reviewSignOffJson
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGate } from "@/contexts/GateContext";
import { useDeepDive } from "@/hooks/useDeepDive";
import { DeepDiveConfirmedStatus } from "@/components/DeepDiveConfirmedStatus";
import SectionPageLayout from "@/components/SectionPageLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ArrowRight,
  Loader2,
  MessageSquare,
  AlertTriangle,
  Users,
  Calendar,
  ClipboardCheck,
  CheckCheck,
  AlertCircle,
  MinusCircle,
  HelpCircle,
} from "lucide-react";
import { INITIATIVE_LIBRARY } from "@/../../shared/initiativeLibrary";
import { getModeLabels } from "@/../../shared/modeLabels";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tension {
  title: string;
  description: string;
  talkingPoint: string;
}

type SignOffStatus = "agreed" | "conditions" | "unresolved" | "na";

interface SignOffElement {
  id: string;
  label: string;
  description: string;
  status: SignOffStatus | "";
  isEmpty: boolean;
  notes: string;
}

interface SignOffData {
  elements: SignOffElement[];
  attendees: string;
  dateHeld: string; // ISO date string YYYY-MM-DD
}

// ─── Sign-off element definitions ────────────────────────────────────────────

const SIGN_OFF_ELEMENTS: Array<{ id: string; label: string; description: string }> = [
  {
    id: "vision",
    label: "Vision statement",
    description: "The organisation's AI-enabled people strategy vision",
  },
  {
    id: "principles",
    label: "Guiding principles",
    description: "The strategic principles shaping how AI is applied to people",
  },
  {
    id: "initiatives",
    label: "Initiative portfolio",
    description: "The selected initiatives and their strategic rationale",
  },
  {
    id: "roadmap",
    label: "Roadmap",
    description: "The Now / Next / Later horizon plan for delivery",
  },
  {
    id: "measures",
    label: "Success measures",
    description: "Outcomes and primary measures for each initiative",
  },
  {
    id: "capability",
    label: "Capability assessment",
    description: "Current capability gaps and development investment required",
  },
  {
    id: "risks",
    label: "Risk register",
    description: "Identified risks and mitigations for the strategy",
  },
  {
    id: "business_case",
    label: "Business case",
    description: "Investment narrative and financial justification",
  },
];

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{
  value: SignOffStatus;
  label: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  borderClass: string;
  bgClass: string;
}> = [
  {
    value: "agreed",
    label: "Agreed",
    description: "Stakeholders approved without conditions",
    icon: <CheckCheck className="w-3.5 h-3.5" />,
    colorClass: "text-emerald-700 dark:text-emerald-400",
    borderClass: "border-emerald-500/40",
    bgClass: "bg-emerald-500/10",
  },
  {
    value: "conditions",
    label: "Agreed with conditions",
    description: "Approved subject to specific changes or caveats",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    colorClass: "text-amber-700 dark:text-amber-400",
    borderClass: "border-amber-500/40",
    bgClass: "bg-amber-500/10",
  },
  {
    value: "unresolved",
    label: "Unresolved",
    description: "Significant disagreement or deferral — needs follow-up",
    icon: <HelpCircle className="w-3.5 h-3.5" />,
    colorClass: "text-rose-700 dark:text-rose-400",
    borderClass: "border-rose-500/40",
    bgClass: "bg-rose-500/10",
  },
  {
    value: "na",
    label: "N/A",
    description: "Not applicable — this element was not completed",
    icon: <MinusCircle className="w-3.5 h-3.5" />,
    colorClass: "text-muted-foreground",
    borderClass: "border-border",
    bgClass: "bg-muted/30",
  },
];

function getStatusConfig(status: SignOffStatus | "") {
  if (!status) return null;
  return STATUS_OPTIONS.find(s => s.value === status) ?? null;
}

// ─── TensionCard ──────────────────────────────────────────────────────────────

function TensionCard({ tension, index }: { tension: Tension; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-semibold mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground leading-snug">{tension.title}</p>
          {!expanded && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tension.description}</p>
          )}
        </div>
        <span className="flex-shrink-0 text-muted-foreground mt-0.5">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">The challenge</p>
            <p className="text-sm text-foreground">{tension.description}</p>
          </div>
          <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-md p-3">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">Suggested talking point</p>
            <p className="text-sm text-foreground">{tension.talkingPoint}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SignOffRow ───────────────────────────────────────────────────────────────

function SignOffRow({
  element,
  onChange,
  onNotesChange,
  disabled,
}: {
  element: SignOffElement;
  onChange: (id: string, status: SignOffStatus | "") => void;
  onNotesChange: (id: string, notes: string) => void;
  disabled: boolean;
}) {
  const statusCfg = getStatusConfig(element.status);
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <div
      className={[
        "rounded-lg border transition-colors",
        statusCfg ? `${statusCfg.borderClass} ${statusCfg.bgClass}` : "border-border bg-card",
        element.isEmpty ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className="p-3 flex items-start gap-3">
        {/* Label column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{element.label}</p>
            {element.isEmpty && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 text-muted-foreground">
                Not completed
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{element.description}</p>
        </div>

        {/* Status buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {element.isEmpty ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded border border-border bg-muted/30">
              <MinusCircle className="w-3 h-3" />
              N/A
            </span>
          ) : (
            STATUS_OPTIONS.filter(s => s.value !== "na").map(opt => (
              <button
                key={opt.value}
                disabled={disabled}
                onClick={() => onChange(element.id, element.status === opt.value ? "" : opt.value)}
                title={opt.description}
                className={[
                  "flex items-center gap-1 text-xs px-2 py-1 rounded border transition-all",
                  element.status === opt.value
                    ? `${opt.colorClass} ${opt.borderClass} ${opt.bgClass} font-medium`
                    : "text-muted-foreground border-border hover:border-muted-foreground/40 hover:bg-muted/40",
                  disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                ].join(" ")}
              >
                {opt.icon}
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            ))
          )}

          {/* Notes toggle (only for non-empty, non-N/A) */}
          {!element.isEmpty && (
            <button
              onClick={() => setNotesOpen(v => !v)}
              title="Add notes for this element"
              className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inline notes */}
      {notesOpen && !element.isEmpty && (
        <div className="px-3 pb-3 border-t border-border/40 pt-2">
          <Textarea
            value={element.notes}
            onChange={e => onNotesChange(element.id, e.target.value)}
            placeholder="Optional notes for this element (conditions, follow-up actions, etc.)"
            rows={2}
            className="text-xs resize-none"
          />
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDefaultSignOff(
  serverData: {
    strategyStatement?: string | null;
    selectedInitiativesJson?: string | null;
    successMeasuresJson?: string | null;
    outcomesJson?: string | null;
    stage8CapabilityJson?: string | null;
    businessCaseNarrative?: string | null;
    roadmapJson?: string | null;
    riskRegisterJson?: string | null;
  } | null
): SignOffData {
  const hasVision = !!(serverData?.strategyStatement?.trim());
  const hasPrinciples = (() => {
    // Principles are stored in strategyStatement or a separate field; treat as populated if vision exists
    return hasVision;
  })();
  const hasInitiatives = (() => {
    try {
      const p = JSON.parse(serverData?.selectedInitiativesJson ?? "[]");
      return Array.isArray(p) && p.length > 0;
    } catch { return false; }
  })();
  const hasRoadmap = (() => {
    try {
      const p = JSON.parse(serverData?.roadmapJson ?? "null");
      return !!(p && (Array.isArray(p.initiatives) ? p.initiatives.length > 0 : false));
    } catch { return false; }
  })();
  const hasMeasures = (() => {
    const raw = serverData?.successMeasuresJson ?? serverData?.outcomesJson;
    try {
      const p = JSON.parse(raw ?? "null");
      return !!(p && typeof p === "object");
    } catch { return false; }
  })();
  const hasCapability = (() => {
    try {
      const p = JSON.parse(serverData?.stage8CapabilityJson ?? "null");
      return !!(p && typeof p === "object");
    } catch { return false; }
  })();
  const hasRisks = (() => {
    try {
      const p = JSON.parse(serverData?.riskRegisterJson ?? "null");
      return Array.isArray(p) && p.length > 0;
    } catch { return false; }
  })();
  const hasBusinessCase = !!(serverData?.businessCaseNarrative?.trim());

  const isEmptyMap: Record<string, boolean> = {
    vision: !hasVision,
    principles: !hasPrinciples,
    initiatives: !hasInitiatives,
    roadmap: !hasRoadmap,
    measures: !hasMeasures,
    capability: !hasCapability,
    risks: !hasRisks,
    business_case: !hasBusinessCase,
  };

  return {
    elements: SIGN_OFF_ELEMENTS.map(def => ({
      id: def.id,
      label: def.label,
      description: def.description,
      status: isEmptyMap[def.id] ? "na" : "",
      isEmpty: isEmptyMap[def.id],
      notes: "",
    })),
    attendees: "",
    dateHeld: new Date().toISOString().slice(0, 10),
  };
}

function parseSignOff(json: string | null | undefined, serverData: Parameters<typeof buildDefaultSignOff>[0]): SignOffData {
  if (!json) return buildDefaultSignOff(serverData);
  try {
    const parsed = JSON.parse(json) as Partial<SignOffData>;
    // Merge with defaults to ensure all 8 elements are present
    const defaults = buildDefaultSignOff(serverData);
    const mergedElements = defaults.elements.map(def => {
      const saved = (parsed.elements ?? []).find(e => e.id === def.id);
      if (!saved) return def;
      return {
        ...def,
        status: saved.status ?? def.status,
        notes: saved.notes ?? "",
        isEmpty: def.isEmpty, // always re-derive isEmpty from live data
      };
    });
    return {
      elements: mergedElements,
      attendees: parsed.attendees ?? "",
      dateHeld: parsed.dateHeld ?? defaults.dateHeld,
    };
  } catch {
    return buildDefaultSignOff(serverData);
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReviewSessionPage() {
  const [, navigate] = useLocation();
  const gate = useGate();
  const { isDeepDive } = useDeepDive();
  const modeLabels = getModeLabels(gate.tenantMode);
  const reportTitle = modeLabels.stage10Label;

  // Mode-guard redirect
  useEffect(() => {
    if (!gate.isLoading && gate.tenantMode === "reward") {
      navigate("/strategy/reward-review");
      return;
    }
    if (!gate.isLoading && !gate.isStage10Accessible) {
      navigate("/strategy");
    }
  }, [gate.isLoading, gate.isStage10Accessible, gate.tenantMode, navigate]);

  // Data
  const sessionQ = trpc.intelligence.getReviewSession.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Local state
  const [notes, setNotes] = useState("");
  const [tensions, setTensions] = useState<Tension[]>([]);
  const [tensionsGeneratedAt, setTensionsGeneratedAt] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signOff, setSignOff] = useState<SignOffData | null>(null);
  const [successFlash, setSuccessFlash] = useState(false);
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const signOffRef = useRef(signOff);
  signOffRef.current = signOff;

  // Populate from server data
  useEffect(() => {
    if (!sessionQ.data) return;
    setNotes(sessionQ.data.reviewSessionNotes ?? "");
    if (sessionQ.data.reviewTensionsJson) {
      try {
        const parsed = JSON.parse(sessionQ.data.reviewTensionsJson);
        if (Array.isArray(parsed.tensions)) {
          setTensions(parsed.tensions);
          setTensionsGeneratedAt(Date.now());
        }
      } catch { /* ignore */ }
    }
    // Initialise sign-off from saved JSON (or derive from live data)
    const derived = parseSignOff(
      (sessionQ.data as { reviewSignOffJson?: string | null }).reviewSignOffJson,
      sessionQ.data
    );
    setSignOff(derived);
  }, [sessionQ.data]);

  // Mutations
  const saveSessionMutation = trpc.intelligence.saveReviewSession.useMutation();
  const generateTensionsMutation = trpc.intelligence.generateReviewTensions.useMutation({
    onSuccess: (data) => {
      setTensions(data.tensions);
      setTensionsGeneratedAt(Date.now());
      saveSessionMutation.mutate({
        reviewTensionsJson: JSON.stringify({ tensions: data.tensions }),
      });
      toast.success("5 tensions generated");
    },
    onError: () => toast.error("Failed to generate tensions — please try again"),
  });

  const completeStage10Mutation = trpc.gate.completeStage10.useMutation({
    onSuccess: () => {
      gate.refetch();
      setSuccessFlash(true);
      toast.success("Review confirmed — Board Report unlocked");
      setTimeout(() => navigate("/strategy/board-report"), 2200);
    },
    onError: (err) => toast.error(err.message),
  });

  // Auto-save notes (debounced 1.5s)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleNotesChange = useCallback((val: string) => {
    setNotes(val);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveSessionMutation.mutate({ reviewSessionNotes: notesRef.current });
    }, 1500);
  }, [saveSessionMutation]);

  // Auto-save sign-off (debounced 1.5s)
  const signOffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistSignOff = useCallback((data: SignOffData) => {
    if (signOffTimerRef.current) clearTimeout(signOffTimerRef.current);
    signOffTimerRef.current = setTimeout(() => {
      saveSessionMutation.mutate({ reviewSignOffJson: JSON.stringify(data) });
    }, 1500);
  }, [saveSessionMutation]);

  const handleStatusChange = useCallback((id: string, status: SignOffStatus | "") => {
    setSignOff(prev => {
      if (!prev) return prev;
      const updated: SignOffData = {
        ...prev,
        elements: prev.elements.map(el =>
          el.id === id ? { ...el, status } : el
        ),
      };
      persistSignOff(updated);
      return updated;
    });
  }, [persistSignOff]);

  const handleElementNotesChange = useCallback((id: string, notes: string) => {
    setSignOff(prev => {
      if (!prev) return prev;
      const updated: SignOffData = {
        ...prev,
        elements: prev.elements.map(el =>
          el.id === id ? { ...el, notes } : el
        ),
      };
      persistSignOff(updated);
      return updated;
    });
  }, [persistSignOff]);

  const handleAttendeesChange = useCallback((val: string) => {
    setSignOff(prev => {
      if (!prev) return prev;
      const updated: SignOffData = { ...prev, attendees: val };
      persistSignOff(updated);
      return updated;
    });
  }, [persistSignOff]);

  const handleDateHeldChange = useCallback((val: string) => {
    setSignOff(prev => {
      if (!prev) return prev;
      const updated: SignOffData = { ...prev, dateHeld: val };
      persistSignOff(updated);
      return updated;
    });
  }, [persistSignOff]);

  const handleGenerateTensions = () => {
    const data = sessionQ.data;
    if (!data) return;
    let selectedInitiatives: string[] = [];
    try {
      const parsed = JSON.parse(data.selectedInitiativesJson ?? "[]");
      selectedInitiatives = (Array.isArray(parsed) ? parsed : []).map((item: { id?: string } | string) =>
        typeof item === "string" ? item : (item?.id ?? "")
      ).filter(Boolean).map((id: string) => {
        const lib = INITIATIVE_LIBRARY.find(i => i.id === id);
        return lib?.label ?? id;
      });
    } catch { /* ignore */ }

    generateTensionsMutation.mutate({
      strategyStatement: data.strategyStatement ?? undefined,
      strategyArchetype: data.strategyArchetype ?? undefined,
      selectedInitiatives,
      businessCaseNarrative: data.businessCaseNarrative ?? undefined,
    });
  };

  // Gate: all non-empty elements must have a status
  const canConfirm = !!signOff && signOff.elements
    .filter(el => !el.isEmpty)
    .every(el => !!el.status);

  const blockedCount = signOff
    ? signOff.elements.filter(el => !el.isEmpty && !el.status).length
    : 0;

  const handleConfirmReview = () => {
    const current = signOffRef.current;
    // Save notes + sign-off, then confirm gate
    saveSessionMutation.mutate(
      {
        reviewSessionNotes: notesRef.current,
        reviewSignOffJson: current ? JSON.stringify(current) : undefined,
      },
      {
        onSettled: () => {
          completeStage10Mutation.mutate({
            reviewHeldAt: current?.dateHeld
              ? new Date(current.dateHeld).getTime()
              : Date.now(),
            reviewSignOffJson: current ? JSON.stringify(current) : undefined,
          });
          setConfirmOpen(false);
        },
      }
    );
  };

  const isLoading = gate.isLoading || sessionQ.isLoading;
  const stage10Cleared = gate.stage10Cleared;

  // Sign-off summary stats
  const signOffStats = signOff ? {
    agreed: signOff.elements.filter(el => el.status === "agreed").length,
    conditions: signOff.elements.filter(el => el.status === "conditions").length,
    unresolved: signOff.elements.filter(el => el.status === "unresolved").length,
    na: signOff.elements.filter(el => el.isEmpty || el.status === "na").length,
    pending: signOff.elements.filter(el => !el.isEmpty && !el.status).length,
  } : null;

  if (isLoading) {
    return (
      <SectionPageLayout
        sectionNumber="10"
        isDeepDive={isDeepDive}
        confirmedAt={gate.gateState?.stage10.completedAt}
        sectionLabel="Review"
        title="Review Session"
        accentColor="#6366f1"
        icon={<Users className="w-4 h-4 text-white" />}
      >
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </SectionPageLayout>
    );
  }

  return (
    <SectionPageLayout
      sectionNumber="10"
      isDeepDive={isDeepDive}
      confirmedAt={gate.gateState?.stage10.completedAt}
      sectionLabel="Review"
      title="Review Session"
      accentColor="#6366f1"
      icon={<Users className="w-4 h-4 text-white" />}
      stageProgress={!isDeepDive ? {
        stageNumber: 10,
        title: "Leadership Review Session",
        description: `Hold your strategy review session with leadership stakeholders, record sign-offs for each element, then confirm the session took place to unlock the ${reportTitle}.`,
        isCleared: !!stage10Cleared,
        isEdited: false,
        canConfirm: canConfirm,
        isPending: completeStage10Mutation.isPending,
        onConfirm: () => stage10Cleared ? navigate("/strategy/board-report") : setConfirmOpen(true),
        backRoute: "/strategy/business-case",
        nextRoute: "/strategy/board-report",
        nextLabel: reportTitle,
      } : undefined}
    >
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Stage cleared banner */}
        {stage10Cleared && !isDeepDive && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Review session confirmed</p>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                Stage 10 cleared. You can still update your sign-off and notes below.
              </p>
            </div>
          </div>
        )}
        {stage10Cleared && isDeepDive && (
          <DeepDiveConfirmedStatus
            confirmedAt={gate.gateState?.stage10.completedAt}
            label="Stage 10 confirmed"
          />
        )}

        {/* Success flash */}
        {successFlash && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/15 border border-emerald-500/30 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Stage 10 confirmed</p>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                Moving to {reportTitle}…
              </p>
            </div>
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500 flex-shrink-0" />
          </div>
        )}

        {/* ── Section 1: Session details ───────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Session details</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Date held
              </label>
              <Input
                type="date"
                value={signOff?.dateHeld ?? ""}
                onChange={e => handleDateHeldChange(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Attendees <span className="text-muted-foreground/60 font-normal">(optional)</span>
              </label>
              <Input
                type="text"
                value={signOff?.attendees ?? ""}
                onChange={e => handleAttendeesChange(e.target.value)}
                placeholder="e.g. CPO, CHRO, CFO, CTO"
                className="text-sm"
              />
            </div>
          </div>
        </section>

        {/* ── Section 2: Sign-off panel ────────────────────────────────────── */}
        <section>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-indigo-500" />
                Strategy sign-off
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Record the outcome for each strategy element. Elements not yet completed are automatically marked N/A.
              </p>
            </div>
            {/* Summary badges */}
            {signOffStats && (
              <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                {signOffStats.agreed > 0 && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                    {signOffStats.agreed} agreed
                  </Badge>
                )}
                {signOffStats.conditions > 0 && (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs">
                    {signOffStats.conditions} conditional
                  </Badge>
                )}
                {signOffStats.unresolved > 0 && (
                  <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-xs">
                    {signOffStats.unresolved} unresolved
                  </Badge>
                )}
                {signOffStats.pending > 0 && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {signOffStats.pending} pending
                  </Badge>
                )}
              </div>
            )}
          </div>

          {signOff ? (
            <div className="space-y-2">
              {signOff.elements.map(el => (
                <SignOffRow
                  key={el.id}
                  element={el}
                  onChange={handleStatusChange}
                  onNotesChange={handleElementNotesChange}
                  disabled={!!stage10Cleared}
                />
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-lg p-6 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
            </div>
          )}

          {/* Gate hint */}
          {blockedCount > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                {blockedCount} element{blockedCount > 1 ? "s" : ""} still need{blockedCount === 1 ? "s" : ""} a status before you can confirm.
              </span>
            </div>
          )}
        </section>

        {/* ── Section 3: Tensions ──────────────────────────────────────────── */}
        <section>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Hard questions to anticipate
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Five tensions your {modeLabels.sponsorLabel} is likely to raise, with suggested talking points.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateTensions}
              disabled={generateTensionsMutation.isPending}
              className="flex-shrink-0"
            >
              {generateTensionsMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating…</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5 mr-1.5" />{tensions.length > 0 ? "Regenerate" : "Generate tensions"}</>
              )}
            </Button>
          </div>

          {tensions.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Generate tensions to see the hard questions your {modeLabels.sponsorLabel} might raise.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tensions.map((t, i) => (
                <TensionCard key={i} tension={t} index={i} />
              ))}
              {tensionsGeneratedAt && (
                <p className="text-xs text-muted-foreground text-right">
                  Generated {new Date(tensionsGeneratedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── Section 4: Session notes ─────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Session notes</h2>
            <Badge variant="outline" className="text-xs">Optional</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Record what was discussed, decisions made, and any follow-up actions. These notes can be included as an appendix in the {reportTitle.toLowerCase()}.
          </p>
          <Textarea
            value={notes}
            onChange={e => handleNotesChange(e.target.value)}
            placeholder="e.g. CEO raised concerns about the pace of change in the frontline workforce initiative. Agreed to add a phased rollout milestone in Q3…"
            rows={8}
            className="resize-y font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            {notes.split(/\s+/).filter(Boolean).length} words · auto-saved
          </p>
        </section>

        {/* ── Gate footer ──────────────────────────────────────────────────── */}
        <section className="border-t border-border pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Confirm review held</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Self-attestation that the strategy review session has taken place. This unlocks Stage 11: {reportTitle}.
              </p>
              {!canConfirm && blockedCount > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Complete the sign-off above before confirming ({blockedCount} pending).
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {stage10Cleared ? (
                <Button onClick={() => navigate("/strategy/board-report")} className="gap-1.5">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={completeStage10Mutation.isPending || !canConfirm}
                >
                  {completeStage10Mutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Confirming…</>
                  ) : (
                    "Confirm review held"
                  )}
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm review session held?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  By confirming, you attest that a strategy review session has taken place and the strategy has been discussed with relevant stakeholders. This will unlock Stage 11: {reportTitle}.
                </p>
                {signOffStats && (
                  <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
                    <p className="text-xs font-medium text-foreground">Sign-off summary</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {signOffStats.agreed > 0 && (
                        <span className="text-xs text-emerald-700 dark:text-emerald-400">{signOffStats.agreed} agreed</span>
                      )}
                      {signOffStats.conditions > 0 && (
                        <span className="text-xs text-amber-700 dark:text-amber-400">{signOffStats.conditions} conditional</span>
                      )}
                      {signOffStats.unresolved > 0 && (
                        <span className="text-xs text-rose-700 dark:text-rose-400">{signOffStats.unresolved} unresolved</span>
                      )}
                      {signOffStats.na > 0 && (
                        <span className="text-xs text-muted-foreground">{signOffStats.na} N/A</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReview}
              disabled={completeStage10Mutation.isPending}
            >
              {completeStage10Mutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Confirming…</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-1.5" />Confirm</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionPageLayout>
  );
}
