/**
 * ReviewSessionPage — Stage 9: Review Session
 *
 * Helps the CPO prepare for and record a strategy review session.
 * Sections:
 *   1. AI-generated tensions / hard questions (5 items)
 *   2. Session notes (free text, auto-saved)
 *   3. Soft gate: self-attestation that the review was held
 *
 * Gate: completeStage9 (soft gate — self-attestation only)
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGate } from "@/contexts/GateContext";
import { useDeepDive } from "@/hooks/useDeepDive";
import SectionPageLayout from "@/components/SectionPageLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { INITIATIVE_LIBRARY } from "@/../../shared/initiativeLibrary";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tension {
  title: string;
  description: string;
  talkingPoint: string;
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReviewSessionPage() {
  const [, navigate] = useLocation();
  const gate = useGate();
  const { isDeepDive } = useDeepDive();

  // Gate redirect
  useEffect(() => {
    if (!gate.isLoading && !gate.isStage9Accessible) {
      navigate("/strategy");
    }
  }, [gate.isLoading, gate.isStage9Accessible, navigate]);

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
  const notesRef = useRef(notes);
  notesRef.current = notes;

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
  }, [sessionQ.data]);

  // Mutations
  const saveSessionMutation = trpc.intelligence.saveReviewSession.useMutation();
  const generateTensionsMutation = trpc.intelligence.generateReviewTensions.useMutation({
    onSuccess: (data) => {
      setTensions(data.tensions);
      setTensionsGeneratedAt(Date.now());
      // Persist tensions
      saveSessionMutation.mutate({
        reviewTensionsJson: JSON.stringify({ tensions: data.tensions }),
      });
      toast.success("5 tensions generated");
    },
    onError: () => toast.error("Failed to generate tensions — please try again"),
  });

  const completeStage9Mutation = trpc.gate.completeStage9.useMutation({
    onSuccess: () => {
      gate.refetch();
      toast.success("Stage 9 confirmed — review session recorded");
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

  const handleConfirmReview = () => {
    // Save notes first, then confirm gate
    saveSessionMutation.mutate(
      { reviewSessionNotes: notes },
      {
        onSettled: () => {
          completeStage9Mutation.mutate({ reviewHeldAt: Date.now() });
          setConfirmOpen(false);
        },
      }
    );
  };

  const isLoading = gate.isLoading || sessionQ.isLoading;
  const stage9Cleared = gate.stage9Cleared;

  if (isLoading) {
    return (
      <SectionPageLayout sectionNumber="09"
      isDeepDive={isDeepDive}
      confirmedAt={gate.gateState?.stage9.completedAt}
      sectionLabel="Review" title="Review Session" accentColor="#6366f1" icon={<Users className="w-4 h-4 text-white" />}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </SectionPageLayout>
    );
  }

  return (
    <SectionPageLayout
      sectionNumber="09"
      isDeepDive={isDeepDive}
      confirmedAt={gate.gateState?.stage9.completedAt}
      sectionLabel="Review"
      title="Review Session"
      accentColor="#6366f1"
      icon={<Users className="w-4 h-4 text-white" />}
    >
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Stage cleared banner */}
        {stage9Cleared && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Review session confirmed</p>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                Stage 9 cleared. You can still update your notes below.
              </p>
            </div>
          </div>
        )}

        {/* Section 1: Tensions */}
        <section>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Hard questions to anticipate
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Five tensions your board or CEO is likely to raise, with suggested talking points.
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
                Generate tensions to see the hard questions your board might raise.
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

        {/* Section 2: Session notes */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Session notes</h2>
            <Badge variant="outline" className="text-xs">Optional</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Record what was discussed, decisions made, and any follow-up actions. These notes can be included as an appendix in the board report.
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

        {/* Gate footer */}
        <section className="border-t border-border pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Confirm review held</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Self-attestation that the strategy review session has taken place. This unlocks Stage 10: Board Report.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {stage9Cleared ? (
                <Button onClick={() => navigate("/strategy/board-report")} className="gap-1.5">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={completeStage9Mutation.isPending}
                >
                  {completeStage9Mutation.isPending ? (
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
            <AlertDialogDescription>
              By confirming, you attest that a strategy review session has taken place and the strategy has been discussed with relevant stakeholders. This will unlock Stage 10: Board Report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReview}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionPageLayout>
  );
}
