/**
 * RewardVisionPage — Stage 2 of the Reward AI Strategy flow.
 *
 * Allows the Reward Leader to:
 *   1. Generate an AI-drafted vision from Stage 1 inputs
 *   2. Edit the draft in a textarea
 *   3. Use affordances (Expand / Refine / Challenge / Suggest)
 *   4. Reset to AI-suggested draft
 *   5. Confirm the vision to clear Stage 2 gate
 *   6. See a staleness banner when Stage 1 changes after confirmation
 *
 * Gate: requires Stage 1 (Reward Pre-work) to be confirmed.
 * Confirm requires ≥ 10 words.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, RefreshCw, AlertTriangle, Lock,
  Sparkles, RotateCcw, Info, ChevronRight, Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SectionPageLayout from "@/components/SectionPageLayout";
import { useLocation } from "wouter";

// ── Word count ────────────────────────────────────────────────────────────────
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Affordance buttons ────────────────────────────────────────────────────────
type Affordance = "expand" | "refine" | "challenge" | "suggest";

const AFFORDANCES: { key: Affordance; label: string; tooltip: string }[] = [
  { key: "expand", label: "Expand", tooltip: "Add depth and specificity" },
  { key: "refine", label: "Refine", tooltip: "Tighten without changing meaning" },
  { key: "challenge", label: "Challenge", tooltip: "Surface probing questions" },
  { key: "suggest", label: "Suggest", tooltip: "Generate a fresh alternative" },
];

// ── Staleness banner ──────────────────────────────────────────────────────────
function StalenessBanner({
  onRegenerate,
  onKeepAsIs,
  isLoading,
}: {
  onRegenerate: () => void;
  onKeepAsIs: () => void;
  isLoading: boolean;
}) {
  return (
    <Alert className="border-amber-500/40 bg-amber-500/5">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
        <span className="text-sm">
          Your Stage 1 inputs have changed since you confirmed this vision. Review and re-confirm, or keep it as-is.
        </span>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={onKeepAsIs}
            disabled={isLoading}
          >
            Keep as-is
          </Button>
          <Button
            size="sm"
            onClick={onRegenerate}
            disabled={isLoading}
          >
            {isLoading ? (
              <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Regenerating…</>
            ) : (
              <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Regenerate</>
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// ── Challenge callout ─────────────────────────────────────────────────────────
function ChallengeCallout({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <div className="relative rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground text-xs"
        aria-label="Dismiss"
      >
        ✕
      </button>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">
        Challenge questions
      </p>
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pr-4">
        {text}
      </p>
    </div>
  );
}

// ── Peer vision starters section ───────────────────────────────────────────────
function PeerVisionSection({ onAdopt }: { onAdopt: (text: string) => void }) {
  const { data: peers, isLoading } = trpc.gate.getPeerVisionStarters.useQuery({});

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  if (!peers?.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Peer inspiration</h3>
        <span className="text-xs text-muted-foreground">— see how others frame their Reward AI vision</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {peers.map((peer) => (
          <Card key={peer.id} className="bg-muted/20 border-border/40 hover:border-primary/40 transition-colors group">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-foreground/80 italic leading-relaxed line-clamp-4">
                “{peer.visionText}”
              </p>
              <div className="flex items-center justify-between">
                {peer.archetypeHint && (
                  <Badge variant="secondary" className="text-[10px]">
                    {peer.archetypeHint}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onAdopt(peer.visionText)}
                >
                  Use as starting point
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RewardVisionPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: status, isLoading: statusLoading } = trpc.rewardVision.getStatus.useQuery();
  const { data: visionData, isLoading: visionLoading } = trpc.rewardVision.get.useQuery();

  const [text, setText] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [challengeCallout, setChallengeCallout] = useState<string | null>(null);
  const [activeAffordance, setActiveAffordance] = useState<Affordance | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Populate from server on load
  useEffect(() => {
    if (visionData?.visionText && !isDirty) {
      setText(visionData.visionText);
    }
  }, [visionData, isDirty]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveMutation = trpc.rewardVision.save.useMutation({
    onSuccess: () => utils.rewardVision.get.invalidate(),
  });

  const generateMutation = trpc.rewardVision.generate.useMutation({
    onSuccess: (data) => {
      setText(data.visionText);
      setIsDirty(false);
      utils.rewardVision.get.invalidate();
      toast.success("Vision draft generated.");
    },
    onError: (err) => toast.error(err.message),
  });

  const affordanceMutation = trpc.rewardVision.affordance.useMutation({
    onSuccess: (data, variables) => {
      setActiveAffordance(null);
      if (variables.affordance === "challenge") {
        setChallengeCallout(data.result);
      } else {
        setText(data.result);
        setIsDirty(true);
        scheduleSave(data.result);
      }
    },
    onError: (err) => {
      setActiveAffordance(null);
      toast.error(err.message);
    },
  });

  const confirmMutation = trpc.rewardVision.confirm.useMutation({
    onSuccess: () => {
      utils.rewardVision.getStatus.invalidate();
      utils.rewardVision.get.invalidate();
      toast.success("Vision confirmed — Stage 2 complete.");
    },
    onError: (err) => toast.error(err.message),
  });

  const keepAsIsMutation = trpc.rewardVision.keepAsIs.useMutation({
    onSuccess: () => {
      utils.rewardVision.getStatus.invalidate();
      toast.success("Vision kept as-is.");
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Autosave ───────────────────────────────────────────────────────────────
  const scheduleSave = useCallback((value: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveMutation.mutate({ visionText: value });
    }, 1200);
  }, [saveMutation]);

  const handleTextChange = (value: string) => {
    setText(value);
    setIsDirty(true);
    scheduleSave(value);
  };

  // ── Reset to AI-suggested ──────────────────────────────────────────────────
  const handleReset = () => {
    const original = visionData?.aiGeneratedOriginal;
    if (!original) return;
    setText(original);
    setIsDirty(true);
    scheduleSave(original);
    toast.info("Reset to AI-suggested draft.");
  };

  // ── Affordance ─────────────────────────────────────────────────────────────
  const handleAffordance = (affordance: Affordance) => {
    if (!text.trim()) {
      toast.error("Please enter some text first.");
      return;
    }
    setChallengeCallout(null);
    setActiveAffordance(affordance);
    affordanceMutation.mutate({ affordance, currentText: text });
  };

  // ── Confirm ────────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveMutation.mutate({ visionText: text });
    }
    confirmMutation.mutate();
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const wordCount = countWords(text);
  const canConfirm = wordCount >= 10 && !affordanceMutation.isPending;
  const isConfirmed = status?.visionState === "confirmed";
  const isStale = status?.visionState === "stale";
  const isLocked = !status?.preworkComplete;
  const hasAiDraft = !!visionData?.aiGeneratedOriginal;
  const hasEdits = text !== (visionData?.aiGeneratedOriginal ?? "");

  if (statusLoading || visionLoading) {
    return (
      <SectionPageLayout
        sectionNumber="02"
        sectionLabel="Vision"
        title="Reward AI Vision"
        accentColor="#6366f1"
        icon={<Sparkles className="h-5 w-5 text-white" />}
      >
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-32" />
        </div>
      </SectionPageLayout>
    );
  }

  return (
    <SectionPageLayout
      sectionNumber="02"
      sectionLabel="Vision"
      title="Reward AI Vision"
      accentColor="#6366f1"
      icon={<Sparkles className="h-5 w-5 text-white" />}
      isLocked={isLocked}
      stageProgress={
        isLocked
          ? undefined
          : {
              stageNumber: 2,
              title: "Reward AI Vision",
              description: isConfirmed
                ? "Vision confirmed — proceed to Stage 3"
                : "Draft and confirm your Reward AI vision statement (minimum 10 words)",
              isCleared: isConfirmed,
              isEdited: isStale,
              canConfirm,
              isPending: confirmMutation.isPending,
              onConfirm: handleConfirm,
              backRoute: "/strategy/reward-prework",
              nextRoute: "/strategy/reward-strategy",
              nextLabel: "Strategy",
            }
      }
    >
      {/* Locked gate */}
      {isLocked && (
        <Alert className="border-muted">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            {status?.canStartMessage ?? "Complete Stage 1 (Reward Pre-work) to unlock this stage."}
          </AlertDescription>
        </Alert>
      )}

      {!isLocked && (
        <div className="space-y-6">
          {/* Staleness banner */}
          {isStale && (
            <StalenessBanner
              onRegenerate={() => generateMutation.mutate()}
              onKeepAsIs={() => keepAsIsMutation.mutate()}
              isLoading={generateMutation.isPending}
            />
          )}

          {/* Confirmed badge */}
          {isConfirmed && !isStale && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Vision confirmed</span>
              {hasEdits && (
                <Badge variant="secondary" className="text-xs ml-2">Edited</Badge>
              )}
            </div>
          )}

          {/* Generate / no-draft state */}
          {!text && !generateMutation.isPending && (
            <Card className="border-dashed border-primary/30 bg-primary/5">
              <CardContent className="p-6 text-center space-y-4">
                <Sparkles className="h-8 w-8 text-primary mx-auto opacity-60" />
                <div className="space-y-1">
                  <p className="font-medium">Generate your vision draft</p>
                  <p className="text-sm text-muted-foreground">
                    The AI will draft a vision based on your Stage 1 inputs. You can edit it freely.
                  </p>
                </div>
                <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate draft
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Generating skeleton */}
          {generateMutation.isPending && (
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {/* Vision editor */}
          {(text || !generateMutation.isPending) && text && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Your vision statement</label>
                <div className="flex items-center gap-2">
                  {hasAiDraft && hasEdits && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={handleReset}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset to suggested
                    </Button>
                  )}
                  <span className={cn(
                    "text-xs",
                    wordCount < 10 ? "text-amber-500" : "text-muted-foreground"
                  )}>
                    {wordCount} word{wordCount !== 1 ? "s" : ""}
                    {wordCount < 10 && " (min 10)"}
                  </span>
                </div>
              </div>

              <Textarea
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Write your Reward AI vision here…"
                className="min-h-[140px] resize-y text-base leading-relaxed"
                disabled={affordanceMutation.isPending}
              />

              {/* Affordance buttons */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-muted-foreground mr-1">AI actions:</span>
                {AFFORDANCES.map(({ key, label, tooltip }) => (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-2 text-xs text-muted-foreground hover:text-foreground",
                      activeAffordance === key && "text-primary"
                    )}
                    disabled={affordanceMutation.isPending}
                    onClick={() => handleAffordance(key)}
                    title={tooltip}
                  >
                    {activeAffordance === key ? (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    ) : null}
                    {label}
                  </Button>
                ))}
              </div>

              {/* Challenge callout */}
              {challengeCallout && (
                <ChallengeCallout
                  text={challengeCallout}
                  onDismiss={() => setChallengeCallout(null)}
                />
              )}

              {/* Autosave indicator */}
              {saveMutation.isPending && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Saving…
                </p>
              )}
            </div>
          )}

          {/* Peer vision starters */}
          <PeerVisionSection onAdopt={(visionText) => {
            setText(visionText);
            setIsDirty(true);
            scheduleSave(visionText);
            toast.success("Peer vision adopted — edit freely.");
          }} />

          {/* What makes a good vision — guidance card */}
          <Card className="bg-muted/30 border-border/40">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 text-primary" />
                What makes a strong Reward AI vision?
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>States the outcome for employees and the business, not the technology</li>
                <li>Is specific enough to guide trade-off decisions</li>
                <li>Connects to your organisation's broader purpose and values</li>
                <li>Can be understood by a non-technical stakeholder in one read</li>
                <li>Is 2–4 sentences — long enough to be meaningful, short enough to be memorable</li>
              </ul>
            </CardContent>
          </Card>

          {/* Confirm CTA (below editor, mirrors StageProgressHeader) */}
          {text && !isConfirmed && (
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <span className="text-sm text-muted-foreground">
                {wordCount < 10
                  ? `${10 - wordCount} more word${10 - wordCount !== 1 ? "s" : ""} needed to confirm`
                  : "Ready to confirm"}
              </span>
              <Button
                onClick={handleConfirm}
                disabled={!canConfirm || confirmMutation.isPending}
              >
                {confirmMutation.isPending ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Confirming…</>
                ) : (
                  <>Confirm vision <ChevronRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            </div>
          )}

          {/* Re-confirm after edit */}
          {text && isConfirmed && isDirty && (
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <span className="text-sm text-muted-foreground">You have unsaved edits — re-confirm to update.</span>
              <Button
                onClick={handleConfirm}
                disabled={!canConfirm || confirmMutation.isPending}
                variant="outline"
              >
                Re-confirm
              </Button>
            </div>
          )}

          {/* Navigate to Stage 3 */}
          {isConfirmed && !isDirty && (
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => navigate("/strategy/reward-strategy")}
              >
                Continue to Strategy <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </SectionPageLayout>
  );
}
