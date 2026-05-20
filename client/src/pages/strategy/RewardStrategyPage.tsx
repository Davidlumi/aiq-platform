/**
 * RewardStrategyPage — Stage 3 of the Reward AI Strategy flow.
 *
 * Allows the Reward Leader to:
 *   1. Generate AI-drafted strategic shifts from Stage 1+2 inputs
 *   2. Edit each shift in-place
 *   3. Use per-shift affordances (Expand / Refine / Challenge / Suggest)
 *   4. Add / remove shifts (min 3, max 7)
 *   5. Suggest an additional shift
 *   6. Confirm to clear Stage 3 gate
 *   7. See a staleness banner when Stage 2 changes after confirmation
 *
 * Gate: requires Stage 2 (Vision) to be confirmed.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, RefreshCw, AlertTriangle, Lock,
  Sparkles, Plus, Trash2, ChevronRight, Info,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SectionPageLayout from "@/components/SectionPageLayout";
import { useLocation } from "wouter";
import { randomUUID } from "@/lib/uuid";

// ── Types ─────────────────────────────────────────────────────────────────────
interface StrategicShift {
  id: string;
  text: string;
  aiGeneratedOriginal: string;
}

type Affordance = "expand" | "refine" | "challenge" | "suggest";

const AFFORDANCES: { key: Affordance; label: string; tooltip: string }[] = [
  { key: "expand", label: "Expand", tooltip: "Add depth and specificity" },
  { key: "refine", label: "Refine", tooltip: "Tighten without changing meaning" },
  { key: "challenge", label: "Challenge", tooltip: "Surface probing questions" },
  { key: "suggest", label: "Suggest", tooltip: "Generate a fresh alternative" },
];

const MIN_SHIFTS = 3;
const MAX_SHIFTS = 4;

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
          Your vision has changed since you confirmed these strategic shifts. Review and re-confirm, or keep them as-is.
        </span>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={onKeepAsIs} disabled={isLoading}>
            Keep as-is
          </Button>
          <Button size="sm" onClick={onRegenerate} disabled={isLoading}>
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

// ── Shift card ────────────────────────────────────────────────────────────────
function ShiftCard({
  shift,
  index,
  total,
  onTextChange,
  onAffordance,
  onRemove,
  activeAffordance,
  challengeCallout,
  onDismissChallenge,
  disabled,
}: {
  shift: StrategicShift;
  index: number;
  total: number;
  onTextChange: (id: string, text: string) => void;
  onAffordance: (id: string, affordance: Affordance) => void;
  onRemove: (id: string) => void;
  activeAffordance: { id: string; affordance: Affordance } | null;
  challengeCallout: { id: string; text: string } | null;
  onDismissChallenge: () => void;
  disabled: boolean;
}) {
  const isRunning = activeAffordance?.id === shift.id;

  return (
    <Card className="border border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 shrink-0 pt-1">
            <GripVertical className="h-4 w-4 text-muted-foreground/40" />
            <Badge variant="outline" className="text-xs w-6 h-6 flex items-center justify-center p-0 shrink-0">
              {index + 1}
            </Badge>
          </div>
          <Textarea
            value={shift.text}
            onChange={(e) => onTextChange(shift.id, e.target.value)}
            placeholder="Describe this strategic shift…"
            className="min-h-[80px] resize-y text-sm leading-relaxed flex-1"
            disabled={disabled || isRunning}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(shift.id)}
            disabled={total <= MIN_SHIFTS || disabled}
            title={total <= MIN_SHIFTS ? `Minimum ${MIN_SHIFTS} shifts required` : "Remove shift"}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Affordance buttons */}
        <div className="flex items-center gap-1 flex-wrap pl-9">
          <span className="text-xs text-muted-foreground mr-1">AI:</span>
          {AFFORDANCES.map(({ key, label, tooltip }) => (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 px-2 text-xs text-muted-foreground hover:text-foreground",
                isRunning && activeAffordance?.affordance === key && "text-primary"
              )}
              disabled={disabled || isRunning}
              onClick={() => onAffordance(shift.id, key)}
              title={tooltip}
            >
              {isRunning && activeAffordance?.affordance === key ? (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              ) : null}
              {label}
            </Button>
          ))}
        </div>

        {/* Challenge callout for this shift */}
        {challengeCallout?.id === shift.id && (
          <div className="pl-9">
            <ChallengeCallout text={challengeCallout.text} onDismiss={onDismissChallenge} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RewardStrategyPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: status, isLoading: statusLoading } = trpc.rewardStrategy.getStatus.useQuery();
  const { data: strategyData, isLoading: strategyLoading } = trpc.rewardStrategy.get.useQuery();

  const [shifts, setShifts] = useState<StrategicShift[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [activeAffordance, setActiveAffordance] = useState<{ id: string; affordance: Affordance } | null>(null);
  const [challengeCallout, setChallengeCallout] = useState<{ id: string; text: string } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Populate from server on load
  useEffect(() => {
    if (strategyData?.strategicShiftsJson && !isDirty) {
      setShifts(strategyData.strategicShiftsJson as StrategicShift[]);
    }
  }, [strategyData, isDirty]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveMutation = trpc.rewardStrategy.save.useMutation({
    onSuccess: () => utils.rewardStrategy.get.invalidate(),
  });

  const generateMutation = trpc.rewardStrategy.generate.useMutation({
    onSuccess: (data) => {
      const newShifts = (data.shifts as StrategicShift[]) ?? [];
      setShifts(newShifts);
      setIsDirty(false);
      utils.rewardStrategy.get.invalidate();
      toast.success("Strategic shifts generated.");
    },
    onError: (err) => toast.error(err.message),
  });

  const affordanceMutation = trpc.rewardStrategy.affordance.useMutation({
    onSuccess: (data, variables) => {
      const { blockId, affordance } = variables;
      setActiveAffordance(null);
      if (affordance === "challenge") {
        setChallengeCallout({ id: blockId, text: data.result });
      } else {
        const updated = shifts.map(s =>
          s.id === blockId ? { ...s, text: data.result } : s
        );
        setShifts(updated);
        setIsDirty(true);
        scheduleSave(updated);
      }
    },
    onError: (err) => {
      setActiveAffordance(null);
      toast.error(err.message);
    },
  });

  const suggestMutation = trpc.rewardStrategy.suggestShift.useMutation({
    onSuccess: (data) => {
      const newShift = data.shift as StrategicShift;
      const updated = [...shifts, newShift];
      setShifts(updated);
      setIsDirty(true);
      scheduleSave(updated);
      toast.success("New shift added.");
    },
    onError: (err) => toast.error(err.message),
  });

  const confirmMutation = trpc.rewardStrategy.confirm.useMutation({
    onSuccess: () => {
      utils.rewardStrategy.getStatus.invalidate();
      utils.rewardStrategy.get.invalidate();
      toast.success("Strategic shifts confirmed — Stage 3 complete.");
    },
    onError: (err) => toast.error(err.message),
  });

  const keepAsIsMutation = trpc.rewardStrategy.keepAsIs.useMutation({
    onSuccess: () => {
      utils.rewardStrategy.getStatus.invalidate();
      toast.success("Shifts kept as-is.");
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Autosave ───────────────────────────────────────────────────────────────
  const scheduleSave = useCallback((currentShifts: StrategicShift[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveMutation.mutate({ strategicShifts: currentShifts });
    }, 1200);
  }, [saveMutation]);

  const handleTextChange = (id: string, text: string) => {
    const updated = shifts.map(s => s.id === id ? { ...s, text } : s);
    setShifts(updated);
    setIsDirty(true);
    scheduleSave(updated);
  };

  const handleRemove = (id: string) => {
    if (shifts.length <= MIN_SHIFTS) {
      toast.error(`Minimum ${MIN_SHIFTS} strategic shifts required.`);
      return;
    }
    const updated = shifts.filter(s => s.id !== id);
    setShifts(updated);
    setIsDirty(true);
    scheduleSave(updated);
  };

  const handleAddBlank = () => {
    if (shifts.length >= MAX_SHIFTS) {
      toast.error(`Maximum ${MAX_SHIFTS} strategic shifts allowed.`);
      return;
    }
    const newShift: StrategicShift = {
      id: randomUUID(),
      text: "",
      aiGeneratedOriginal: "",
    };
    const updated = [...shifts, newShift];
    setShifts(updated);
    setIsDirty(true);
  };

  const handleAffordance = (shiftId: string, affordance: Affordance) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift?.text.trim()) {
      toast.error("Please enter some text first.");
      return;
    }
    setChallengeCallout(null);
    setActiveAffordance({ id: shiftId, affordance });
    affordanceMutation.mutate({ blockId: shiftId, affordance, currentText: shift.text });
  };

  const handleConfirm = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveMutation.mutate({ strategicShifts: shifts });
    }
    confirmMutation.mutate();
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const isConfirmed = status?.strategyState === "confirmed";
  const isStale = status?.strategyState === "stale";
  const isLocked = !status?.visionConfirmed;
  const canConfirm = shifts.length >= MIN_SHIFTS &&
    shifts.every(s => s.text.trim().length > 0) &&
    !affordanceMutation.isPending;
  const isAnyRunning = affordanceMutation.isPending || suggestMutation.isPending;

  if (statusLoading || strategyLoading) {
    return (
      <SectionPageLayout
        sectionNumber="03"
        sectionLabel="Strategy"
        title="Reward AI Strategic Shifts"
        accentColor="#8b5cf6"
        icon={<ChevronRight className="h-5 w-5 text-white" />}
      >
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </SectionPageLayout>
    );
  }

  return (
    <SectionPageLayout
      sectionNumber="03"
      sectionLabel="Strategy"
      title="Reward AI Strategic Shifts"
      accentColor="#8b5cf6"
      icon={<ChevronRight className="h-5 w-5 text-white" />}
      isLocked={isLocked}
      stageProgress={
        isLocked
          ? undefined
          : {
              stageNumber: 3,
              title: "Reward AI Strategic Shifts",
              description: isConfirmed
                ? "Strategic shifts confirmed — proceed to Stage 4"
                : `Define ${MIN_SHIFTS}–${MAX_SHIFTS} strategic shifts (${shifts.length} so far)`,
              isCleared: isConfirmed,
              isEdited: isStale,
              canConfirm,
              isPending: confirmMutation.isPending,
              onConfirm: handleConfirm,
              backRoute: "/strategy/reward-vision",
              nextRoute: "/strategy/reward-principles",
              nextLabel: "Principles",
            }
      }
    >
      {/* Locked gate */}
      {isLocked && (
        <Alert className="border-muted">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            {status?.canStartMessage ?? "Confirm your Stage 2 Vision to unlock this stage."}
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
              <span>Strategic shifts confirmed</span>
            </div>
          )}

          {/* Generate / no-draft state */}
          {shifts.length === 0 && !generateMutation.isPending && (
            <Card className="border-dashed border-primary/30 bg-primary/5">
              <CardContent className="p-6 text-center space-y-4">
                <Sparkles className="h-8 w-8 text-primary mx-auto opacity-60" />
                <div className="space-y-1">
                  <p className="font-medium">Generate your strategic shifts</p>
                  <p className="text-sm text-muted-foreground">
                    The AI will draft {MIN_SHIFTS}–{MAX_SHIFTS} shifts based on your Stage 1 inputs and vision. You can edit, add, and remove them freely.
                  </p>
                </div>
                <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate shifts
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Generating skeleton */}
          {generateMutation.isPending && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          )}

          {/* Shift cards */}
          {shifts.length > 0 && (
            <div className="space-y-3">
              {shifts.map((shift, index) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  index={index}
                  total={shifts.length}
                  onTextChange={handleTextChange}
                  onAffordance={handleAffordance}
                  onRemove={handleRemove}
                  activeAffordance={activeAffordance}
                  challengeCallout={challengeCallout}
                  onDismissChallenge={() => setChallengeCallout(null)}
                  disabled={isAnyRunning}
                />
              ))}

              {/* Add / Suggest buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddBlank}
                  disabled={shifts.length >= MAX_SHIFTS || isAnyRunning}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add shift
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => suggestMutation.mutate()}
                  disabled={shifts.length >= MAX_SHIFTS || isAnyRunning}
                >
                  {suggestMutation.isPending ? (
                    <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Suggesting…</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Suggest shift</>
                  )}
                </Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  {shifts.length}/{MAX_SHIFTS} shifts
                </span>
              </div>

              {/* Autosave indicator */}
              {saveMutation.isPending && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Saving…
                </p>
              )}
            </div>
          )}

          {/* Guidance card */}
          <Card className="bg-muted/30 border-border/40">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 text-primary" />
                What makes a strong strategic shift?
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Describes a movement from a current state to a future state</li>
                <li>Is specific enough to guide initiative selection in Stage 5</li>
                <li>Connects to your vision and the priorities you identified in Stage 1</li>
                <li>Is written in plain language — no jargon</li>
                <li>Covers different dimensions: data, process, capability, governance</li>
              </ul>
            </CardContent>
          </Card>

          {/* Confirm CTA */}
          {shifts.length > 0 && !isConfirmed && (
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <span className="text-sm text-muted-foreground">
                {shifts.length < MIN_SHIFTS
                  ? `${MIN_SHIFTS - shifts.length} more shift${MIN_SHIFTS - shifts.length !== 1 ? "s" : ""} needed`
                  : shifts.some(s => !s.text.trim())
                  ? "All shifts must have text before confirming"
                  : "Ready to confirm"}
              </span>
              <Button onClick={handleConfirm} disabled={!canConfirm || confirmMutation.isPending}>
                {confirmMutation.isPending ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Confirming…</>
                ) : (
                  <>Confirm shifts <ChevronRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            </div>
          )}

          {/* Re-confirm after edit */}
          {shifts.length > 0 && isConfirmed && isDirty && (
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <span className="text-sm text-muted-foreground">You have unsaved edits — re-confirm to update.</span>
              <Button onClick={handleConfirm} disabled={!canConfirm || confirmMutation.isPending} variant="outline">
                Re-confirm
              </Button>
            </div>
          )}

          {/* Navigate to Stage 4 */}
          {isConfirmed && !isDirty && (
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => navigate("/strategy/reward-principles")}>
                Continue to Principles <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </SectionPageLayout>
  );
}
