/**
 * StrategyVisionPage — Stage 2 of the v3 strategy flow.
 *
 * Allows the CPO to:
 *   1. Browse peer vision starters (anonymised, sector/size filtered)
 *   2. Adopt a starter as inspiration or write from scratch
 *   3. Refine using AITextActions (Expand / Refine / Challenge / Suggest)
 *   4. Confirm the vision to clear Stage 2 gate
 *
 * Gate behaviour:
 *   - Requires Stage 1 (pre-work) to be cleared
 *   - Confirmation requires ≥ 10 words
 *   - Editing after confirmation marks stage as edited (cascade banner shown)
 */
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGate } from "@/contexts/GateContext";
import { useDeepDive } from "@/hooks/useDeepDive";
import { AITextActions } from "@/components/AITextActions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2, ChevronRight, Lock, Lightbulb, Quote,
  RefreshCw, ArrowRight, AlertTriangle, Info,
} from "lucide-react";
import StageProgressHeader from "@/components/StageProgressHeader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Archetype hint labels ────────────────────────────────────────────────────
const ARCHETYPE_LABELS: Record<string, string> = {
  augmentation: "AI supports our people",
  transformation: "AI changes how HR works",
  differentiation: "AI sets us apart as an employer",
  efficiency: "AI cuts cost and admin",
  defensive: "AI keeps us safe and compliant",
};

// ─── Word count helper ────────────────────────────────────────────────────────
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Peer Vision Card ─────────────────────────────────────────────────────────
function PeerVisionCard({
  entry,
  onAdopt,
}: {
  entry: { id: string; visionText: string; archetypeHint?: string };
  onAdopt: (text: string) => void;
}) {
  const [adopted, setAdopted] = useState(false);

  const handleAdopt = () => {
    onAdopt(entry.visionText);
    setAdopted(true);
    setTimeout(() => setAdopted(false), 2000);
  };

  return (
    <Card className="group relative border border-border/60 hover:border-primary/40 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          {entry.archetypeHint && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {ARCHETYPE_LABELS[entry.archetypeHint] ?? entry.archetypeHint}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">Peer example</span>
        </div>
        <blockquote className="text-sm text-foreground/80 leading-relaxed italic border-l-2 border-primary/30 pl-3">
          "{entry.visionText}"
        </blockquote>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={handleAdopt}
        >
          {adopted ? (
            <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-500" />Adopted as starting point</>
          ) : (
            <><Quote className="h-3.5 w-3.5 mr-1.5" />Use as starting point</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Stage gate banner ────────────────────────────────────────────────────────
function GateBanner({ type }: { type: "locked" | "cleared" | "edited" }) {
  if (type === "locked") {
    return (
      <Alert className="border-amber-500/40 bg-amber-500/5">
        <Lock className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
          Complete Stage 1 (pre-work) before setting your vision.
        </AlertDescription>
      </Alert>
    );
  }
  if (type === "cleared") {
    return (
      <Alert className="border-green-500/40 bg-green-500/5">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertDescription className="text-sm text-green-700 dark:text-green-400">
          Vision confirmed. Stage 3 (Strategy) is now unlocked.
        </AlertDescription>
      </Alert>
    );
  }
  // edited after clearing
  return (
    <Alert className="border-amber-500/40 bg-amber-500/5">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
        You've edited your vision since confirming it. Re-confirm to update Stage 3.
      </AlertDescription>
    </Alert>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StrategyVisionPage() {
  const [, navigate] = useLocation();
  const gate = useGate();
  const { isDeepDive } = useDeepDive();

  // Local editor state
  const [visionText, setVisionText] = useState("");
  const [hasEdited, setHasEdited] = useState(false);
  const [inspirationSource, setInspirationSource] = useState<string | undefined>(undefined);

  // Gate redirect — if Stage 1 is not cleared, redirect back
  useEffect(() => {
    if (gate.isLoading) return;
    if (!gate.isStage2Accessible) {
      navigate("/strategy/diagnostic");
    }
  }, [gate.isLoading, gate.isStage2Accessible, navigate]);

  // Load existing vision from gate state
  useEffect(() => {
    if (gate.visionStatement && !hasEdited) {
      setVisionText(gate.visionStatement);
    }
    if (gate.visionInspirationSource) {
      setInspirationSource(gate.visionInspirationSource);
    }
  }, [gate.visionStatement, gate.visionInspirationSource, hasEdited]);

  // Peer vision starters
  const { data: peerData, isLoading: peersLoading, refetch: refetchPeers } = trpc.gate.getPeerVisionStarters.useQuery(
    {},
    { staleTime: 60_000 }
  );

  // Complete stage 2 mutation
  const completeStage2 = trpc.gate.completeStage2.useMutation({
    onSuccess: () => {
      gate.refetch();
      toast.success("Vision confirmed — Stage 3 unlocked.");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Mark edited mutation (called when user edits after clearing)
  const markEdited = trpc.gate.markEdited.useMutation({
    onSuccess: () => gate.refetch(),
  });

  const handleTextChange = useCallback((value: string) => {
    setVisionText(value);
    setHasEdited(true);
    // If stage was cleared and user edits, mark as edited
    if (gate.stage2Cleared) {
      markEdited.mutate({ stage: "stage2" });
    }
  }, [gate.stage2Cleared, markEdited]);

  const handleAdoptPeer = (text: string) => {
    setVisionText(text);
    setHasEdited(true);
    setInspirationSource("peer_library");
    if (gate.stage2Cleared) {
      markEdited.mutate({ stage: "stage2" });
    }
    toast.success("Peer vision adopted as starting point. Edit it to make it yours.");
  };

  const handleConfirm = () => {
    completeStage2.mutate({
      visionStatement: visionText,
      visionInspirationSource: inspirationSource,
    });
  };

  const wordCount = countWords(visionText);
  const canConfirm = wordCount >= 10 && !completeStage2.isPending;
  const isLocked = !gate.isStage2Accessible;

  // Determine banner type
  const bannerType = isLocked
    ? "locked"
    : gate.stage2EditedAfterClearing
    ? "edited"
    : gate.stage2Cleared
    ? "cleared"
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Stage progress header */}
      {!isDeepDive && !isLocked && (
        <StageProgressHeader
          stageNumber={2}
          title="Vision Statement"
          description="Review your AI-drafted vision statement, refine it to make it yours (at least 10 words), then confirm to unlock Stage 3: Strategy."
          isCleared={!!gate.stage2Cleared}
          isEdited={!!gate.stage2EditedAfterClearing}
          canConfirm={canConfirm}
          isPending={completeStage2.isPending}
          onConfirm={() => gate.stage2Cleared && !gate.stage2EditedAfterClearing ? navigate("/strategy/strategy") : handleConfirm()}
          backRoute="/strategy/diagnostic"
          nextRoute="/strategy/strategy"
          nextLabel="Strategy"
        />
      )}

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className="hover:text-foreground cursor-pointer"
            onClick={() => navigate("/strategy")}
          >
            {isDeepDive ? "← Back to summary" : "Strategy"}
          </span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">
            {isDeepDive ? `Deep dive — Vision` : "Stage 2 — Vision"}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Your HR AI Vision</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          A clear vision statement anchors your strategy. It should describe the future state you're
          building toward — specific enough to guide decisions, concise enough to remember.
        </p>
      </div>

      {/* Gate banner */}
      {bannerType && <GateBanner type={bannerType} />}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Editor */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Your vision statement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={visionText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Write your HR AI vision here, or adopt a peer example on the right as a starting point…"
                className="min-h-[160px] resize-none text-sm leading-relaxed"
                disabled={isLocked}
              />

              {/* Word count + AI actions bar */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs",
                    wordCount < 10 ? "text-muted-foreground" : "text-green-600 dark:text-green-400"
                  )}
                >
                  {wordCount} word{wordCount !== 1 ? "s" : ""}
                  {wordCount < 10 && " (minimum 10)"}
                </span>

                {!isLocked && visionText.trim().length > 0 && (
                  <AITextActions
                    text={visionText}
                    context={{ stage: "vision" }}
                    onResult={(newText) => {
                      setVisionText(newText);
                      setHasEdited(true);
                    }}
                    showLabels
                  />
                )}
              </div>

              {/* Inspiration source note */}
              {inspirationSource === "peer_library" && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Started from a peer example. Edit to make it specific to your organisation.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Confirm button */}
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={handleConfirm}
                      disabled={!canConfirm || isLocked}
                      className="gap-2"
                    >
                      {completeStage2.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {gate.stage2Cleared ? "Re-confirm vision" : "Confirm vision"}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canConfirm && !isLocked && (
                  <TooltipContent>
                    {wordCount < 10
                      ? `Add ${10 - wordCount} more word${10 - wordCount !== 1 ? "s" : ""} to confirm`
                      : "Vision is ready to confirm"}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            {gate.stage2Cleared && !gate.stage2EditedAfterClearing && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate("/strategy/strategy")}
              >
                Continue to Strategy
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Right: Peer vision starters */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Peer examples
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => refetchPeers()}
              disabled={peersLoading}
            >
              <RefreshCw className={cn("h-3 w-3", peersLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Anonymised examples from peer organisations. Use as inspiration — not as-is.
          </p>

          {peersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {(peerData ?? []).map((entry) => (
                <PeerVisionCard
                  key={entry.id}
                  entry={entry}
                  onAdopt={handleAdoptPeer}
                />
              ))}
              {(peerData ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No peer examples available for your filters.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
