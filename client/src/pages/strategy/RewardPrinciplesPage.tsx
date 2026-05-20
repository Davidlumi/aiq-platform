/**
 * RewardPrinciplesPage — Stage 4 of the Reward AI Strategy flow.
 *
 * Allows the Reward Leader to:
 *   1. Generate AI-drafted principles and won't-dos from Stage 1–3 inputs
 *   2. Edit each item in-place (unlink threshold: < 40% token overlap clears canonical mapping)
 *   3. Use per-item affordances (Expand / Refine / Challenge / Suggest)
 *   4. Add / remove principles (min 3, max 8) and won't-dos (min 2, max 6)
 *   5. Suggest additional principles or won't-dos
 *   6. Browse and select from canonical templates
 *   7. Confirm to clear Stage 4 gate
 *   8. See a staleness banner when Stage 3 changes after confirmation
 *
 * Gate: requires Stage 3 (Strategy) to be confirmed.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  CheckCircle2, RefreshCw, AlertTriangle, Lock,
  Sparkles, Plus, Trash2, ChevronRight, Info, Link, Link2Off,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SectionPageLayout from "@/components/SectionPageLayout";
import { useLocation } from "wouter";
import { randomUUID } from "@/lib/uuid";

// ── Types ─────────────────────────────────────────────────────────────────────
interface PrincipleItem {
  id: string;
  principleId: string | null;
  text: string;
  source: "ai_suggested" | "canonical_selected" | "custom";
  aiGeneratedOriginal: string;
}

interface WontDoItem {
  id: string;
  wontDoId: string | null;
  text: string;
  source: "ai_suggested" | "canonical_selected" | "custom";
  aiGeneratedOriginal: string;
}

interface CanonicalPrinciple {
  principleId: string;
  text: string;
  mapsToInitiativesJson: number[];
  surfacedWhenJson: Record<string, string[]>;
}

interface CanonicalWontDo {
  wontDoId: string;
  text: string;
  affectsInitiativesJson: number[];
  effect: string;
  noteText: string;
}

type Affordance = "expand" | "refine" | "challenge" | "suggest";

const AFFORDANCES: { key: Affordance; label: string; tooltip: string }[] = [
  { key: "expand", label: "Expand", tooltip: "Add depth and specificity" },
  { key: "refine", label: "Refine", tooltip: "Tighten without changing meaning" },
  { key: "challenge", label: "Challenge", tooltip: "Surface probing questions" },
  { key: "suggest", label: "Suggest", tooltip: "Generate a fresh alternative" },
];

const MIN_PRINCIPLES = 3;
const MAX_PRINCIPLES = 8;
const MIN_WONT_DOS = 2;
const MAX_WONT_DOS = 6;

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
          Your strategic shifts have changed since you confirmed these principles. Review and re-confirm, or keep them as-is.
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

// ── Item card (shared for principles and won't-dos) ───────────────────────────
function ItemCard({
  item,
  index,
  total,
  itemType,
  onTextChange,
  onAffordance,
  onRemove,
  activeAffordance,
  challengeCallout,
  onDismissChallenge,
  disabled,
  minItems,
}: {
  item: PrincipleItem | WontDoItem;
  index: number;
  total: number;
  itemType: "principle" | "wont_do";
  onTextChange: (id: string, text: string) => void;
  onAffordance: (id: string, affordance: Affordance, itemType: "principle" | "wont_do") => void;
  onRemove: (id: string) => void;
  activeAffordance: { id: string; affordance: Affordance } | null;
  challengeCallout: { id: string; text: string } | null;
  onDismissChallenge: () => void;
  disabled: boolean;
  minItems: number;
}) {
  const isRunning = activeAffordance?.id === item.id;
  const isCanonical = itemType === "principle"
    ? !!(item as PrincipleItem).principleId
    : !!(item as WontDoItem).wontDoId;

  return (
    <Card className="border border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 shrink-0 pt-1">
            <Badge variant="outline" className="text-xs w-6 h-6 flex items-center justify-center p-0 shrink-0">
              {index + 1}
            </Badge>
            {isCanonical ? (
              <Link className="h-3.5 w-3.5 text-primary/60 shrink-0" aria-label="Linked to canonical template" />
            ) : (
              <Link2Off className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" aria-label="Custom item" />
            )}
          </div>
          <Textarea
            value={item.text}
            onChange={(e) => onTextChange(item.id, e.target.value)}
            placeholder={itemType === "principle" ? "Write a principle…" : "Write a won't-do…"}
            className="min-h-[72px] resize-y text-sm leading-relaxed flex-1"
            disabled={disabled || isRunning}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(item.id)}
            disabled={total <= minItems || disabled}
            title={total <= minItems ? `Minimum ${minItems} required` : "Remove"}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Source badge */}
        <div className="flex items-center gap-1 pl-9">
          {item.source === "canonical_selected" && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Canonical</Badge>
          )}
          {item.source === "custom" && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">Custom</Badge>
          )}
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
              onClick={() => onAffordance(item.id, key, itemType)}
              title={tooltip}
            >
              {isRunning && activeAffordance?.affordance === key ? (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              ) : null}
              {label}
            </Button>
          ))}
        </div>

        {/* Challenge callout */}
        {challengeCallout?.id === item.id && (
          <div className="pl-9">
            <ChallengeCallout text={challengeCallout.text} onDismiss={onDismissChallenge} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Canonical template picker ─────────────────────────────────────────────────
function CanonicalPicker({
  open,
  onClose,
  type,
  canonicalPrinciples,
  canonicalWontDos,
  existingIds,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  type: "principle" | "wont_do";
  canonicalPrinciples: CanonicalPrinciple[];
  canonicalWontDos: CanonicalWontDo[];
  existingIds: string[];
  onSelect: (item: PrincipleItem | WontDoItem) => void;
}) {
  const items = type === "principle" ? canonicalPrinciples : canonicalWontDos;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === "principle" ? "Canonical Principles" : "Canonical Won't-dos"}
          </DialogTitle>
          <DialogDescription>
            Select a template to add to your {type === "principle" ? "principles" : "won't-dos"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {items.map((item) => {
            const id = type === "principle"
              ? (item as CanonicalPrinciple).principleId
              : (item as CanonicalWontDo).wontDoId;
            const isAlreadyAdded = existingIds.includes(id);
            return (
              <div
                key={id}
                className={cn(
                  "rounded-lg border p-3 space-y-1 cursor-pointer hover:bg-muted/50 transition-colors",
                  isAlreadyAdded && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => {
                  if (isAlreadyAdded) return;
                  const newItem = type === "principle"
                    ? {
                        id: randomUUID(),
                        principleId: (item as CanonicalPrinciple).principleId,
                        text: item.text,
                        source: "canonical_selected" as const,
                        aiGeneratedOriginal: item.text,
                      }
                    : {
                        id: randomUUID(),
                        wontDoId: (item as CanonicalWontDo).wontDoId,
                        text: item.text,
                        source: "canonical_selected" as const,
                        aiGeneratedOriginal: item.text,
                      };
                  onSelect(newItem);
                  onClose();
                }}
              >
                <p className="text-sm">{item.text}</p>
                {type === "wont_do" && (item as CanonicalWontDo).noteText && (
                  <p className="text-xs text-muted-foreground">{(item as CanonicalWontDo).noteText}</p>
                )}
                {isAlreadyAdded && (
                  <Badge variant="secondary" className="text-[10px]">Already added</Badge>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RewardPrinciplesPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: status, isLoading: statusLoading } = trpc.rewardPrinciples.getStatus.useQuery();
  const { data: principlesData, isLoading: principlesLoading } = trpc.rewardPrinciples.get.useQuery();
  const { data: templates } = trpc.rewardPrinciples.getTemplates.useQuery();

  const [principles, setPrinciples] = useState<PrincipleItem[]>([]);
  const [wontDos, setWontDos] = useState<WontDoItem[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [activeAffordance, setActiveAffordance] = useState<{ id: string; affordance: Affordance } | null>(null);
  const [challengeCallout, setChallengeCallout] = useState<{ id: string; text: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState<"principle" | "wont_do" | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Populate from server on load
  useEffect(() => {
    if (principlesData && !isDirty) {
      setPrinciples((principlesData.principlesJson as PrincipleItem[] | null) ?? []);
      setWontDos((principlesData.wontDosJson as WontDoItem[] | null) ?? []);
    }
  }, [principlesData, isDirty]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveMutation = trpc.rewardPrinciples.save.useMutation({
    onSuccess: (data) => {
      utils.rewardPrinciples.get.invalidate();
      if (data.unlinkedIds.length > 0) {
        toast.info(`${data.unlinkedIds.length} item${data.unlinkedIds.length > 1 ? "s" : ""} unlinked from canonical template due to significant edits.`);
      }
    },
  });

  const generateMutation = trpc.rewardPrinciples.generate.useMutation({
    onSuccess: (data) => {
      setPrinciples(data.principles as PrincipleItem[]);
      setWontDos(data.wontDos as WontDoItem[]);
      setIsDirty(false);
      utils.rewardPrinciples.get.invalidate();
      toast.success("Principles and won't-dos generated.");
    },
    onError: (err) => toast.error(err.message),
  });

  const regenerateMutation = trpc.rewardPrinciples.regenerateSuggestions.useMutation({
    onSuccess: (data) => {
      setPrinciples(data.principles as PrincipleItem[]);
      setWontDos(data.wontDos as WontDoItem[]);
      setIsDirty(false);
      utils.rewardPrinciples.get.invalidate();
      toast.success("AI suggestions refreshed (custom items preserved).");
    },
    onError: (err) => toast.error(err.message),
  });

  const affordanceMutation = trpc.rewardPrinciples.affordance.useMutation({
    onSuccess: (data, variables) => {
      const { itemId, affordance, itemType } = variables;
      setActiveAffordance(null);
      if (affordance === "challenge") {
        setChallengeCallout({ id: itemId, text: data.result });
      } else {
        if (itemType === "principle") {
          const updated = principles.map(p =>
            p.id === itemId ? { ...p, text: data.result } : p
          );
          setPrinciples(updated);
          scheduleSave(updated, wontDos);
        } else {
          const updated = wontDos.map(w =>
            w.id === itemId ? { ...w, text: data.result } : w
          );
          setWontDos(updated);
          scheduleSave(principles, updated);
        }
        setIsDirty(true);
      }
    },
    onError: (err) => {
      setActiveAffordance(null);
      toast.error(err.message);
    },
  });

  const suggestPrincipleMutation = trpc.rewardPrinciples.suggestPrinciple.useMutation({
    onSuccess: (data) => {
      const updated = [...principles, data.principle as PrincipleItem];
      setPrinciples(updated);
      setIsDirty(true);
      scheduleSave(updated, wontDos);
      toast.success("Principle suggested.");
    },
    onError: (err) => toast.error(err.message),
  });

  const suggestWontDoMutation = trpc.rewardPrinciples.suggestWontDo.useMutation({
    onSuccess: (data) => {
      const updated = [...wontDos, data.wontDo as WontDoItem];
      setWontDos(updated);
      setIsDirty(true);
      scheduleSave(principles, updated);
      toast.success("Won't-do suggested.");
    },
    onError: (err) => toast.error(err.message),
  });

  const confirmMutation = trpc.rewardPrinciples.confirm.useMutation({
    onSuccess: () => {
      utils.rewardPrinciples.getStatus.invalidate();
      utils.rewardPrinciples.get.invalidate();
      toast.success("Principles confirmed — Stage 4 complete.");
    },
    onError: (err) => toast.error(err.message),
  });

  const keepAsIsMutation = trpc.rewardPrinciples.keepAsIs.useMutation({
    onSuccess: () => {
      utils.rewardPrinciples.getStatus.invalidate();
      toast.success("Principles kept as-is.");
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Autosave ───────────────────────────────────────────────────────────────
  const scheduleSave = useCallback((p: PrincipleItem[], w: WontDoItem[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveMutation.mutate({ principles: p, wontDos: w });
    }, 1200);
  }, [saveMutation]);

  const handlePrincipleTextChange = (id: string, text: string) => {
    const updated = principles.map(p => p.id === id ? { ...p, text } : p);
    setPrinciples(updated);
    setIsDirty(true);
    scheduleSave(updated, wontDos);
  };

  const handleWontDoTextChange = (id: string, text: string) => {
    const updated = wontDos.map(w => w.id === id ? { ...w, text } : w);
    setWontDos(updated);
    setIsDirty(true);
    scheduleSave(principles, updated);
  };

  const handleRemovePrinciple = (id: string) => {
    if (principles.length <= MIN_PRINCIPLES) {
      toast.error(`Minimum ${MIN_PRINCIPLES} principles required.`);
      return;
    }
    const updated = principles.filter(p => p.id !== id);
    setPrinciples(updated);
    setIsDirty(true);
    scheduleSave(updated, wontDos);
  };

  const handleRemoveWontDo = (id: string) => {
    if (wontDos.length <= MIN_WONT_DOS) {
      toast.error(`Minimum ${MIN_WONT_DOS} won't-dos required.`);
      return;
    }
    const updated = wontDos.filter(w => w.id !== id);
    setWontDos(updated);
    setIsDirty(true);
    scheduleSave(principles, updated);
  };

  const handleAddBlankPrinciple = () => {
    if (principles.length >= MAX_PRINCIPLES) {
      toast.error(`Maximum ${MAX_PRINCIPLES} principles allowed.`);
      return;
    }
    const newItem: PrincipleItem = {
      id: randomUUID(),
      principleId: null,
      text: "",
      source: "custom",
      aiGeneratedOriginal: "",
    };
    const updated = [...principles, newItem];
    setPrinciples(updated);
    setIsDirty(true);
  };

  const handleAddBlankWontDo = () => {
    if (wontDos.length >= MAX_WONT_DOS) {
      toast.error(`Maximum ${MAX_WONT_DOS} won't-dos allowed.`);
      return;
    }
    const newItem: WontDoItem = {
      id: randomUUID(),
      wontDoId: null,
      text: "",
      source: "custom",
      aiGeneratedOriginal: "",
    };
    const updated = [...wontDos, newItem];
    setWontDos(updated);
    setIsDirty(true);
  };

  const handleAffordance = (id: string, affordance: Affordance, itemType: "principle" | "wont_do") => {
    const item = itemType === "principle"
      ? principles.find(p => p.id === id)
      : wontDos.find(w => w.id === id);
    if (!item?.text.trim()) {
      toast.error("Please enter some text first.");
      return;
    }
    setChallengeCallout(null);
    setActiveAffordance({ id, affordance });
    affordanceMutation.mutate({ itemId: id, affordance, currentText: item.text, itemType });
  };

  const handleCanonicalSelect = (item: PrincipleItem | WontDoItem) => {
    if (pickerOpen === "principle") {
      if (principles.length >= MAX_PRINCIPLES) {
        toast.error(`Maximum ${MAX_PRINCIPLES} principles allowed.`);
        return;
      }
      const updated = [...principles, item as PrincipleItem];
      setPrinciples(updated);
      setIsDirty(true);
      scheduleSave(updated, wontDos);
    } else if (pickerOpen === "wont_do") {
      if (wontDos.length >= MAX_WONT_DOS) {
        toast.error(`Maximum ${MAX_WONT_DOS} won't-dos allowed.`);
        return;
      }
      const updated = [...wontDos, item as WontDoItem];
      setWontDos(updated);
      setIsDirty(true);
      scheduleSave(principles, updated);
    }
  };

  const handleConfirm = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveMutation.mutate({ principles, wontDos });
    }
    confirmMutation.mutate();
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const isConfirmed = status?.principlesState === "confirmed";
  const isStale = status?.principlesState === "stale";
  const isLocked = !status?.strategyConfirmed;
  const canConfirm = principles.length >= MIN_PRINCIPLES &&
    wontDos.length >= MIN_WONT_DOS &&
    principles.every(p => p.text.trim().length > 0) &&
    wontDos.every(w => w.text.trim().length > 0) &&
    !affordanceMutation.isPending;
  const isAnyRunning = affordanceMutation.isPending || suggestPrincipleMutation.isPending || suggestWontDoMutation.isPending;
  const hasContent = principles.length > 0 || wontDos.length > 0;

  const existingPrincipleIds = principles
    .filter(p => p.principleId)
    .map(p => p.principleId as string);
  const existingWontDoIds = wontDos
    .filter(w => w.wontDoId)
    .map(w => w.wontDoId as string);

  if (statusLoading || principlesLoading) {
    return (
      <SectionPageLayout
        sectionNumber="04"
        sectionLabel="Principles"
        title="Reward AI Principles & Won't-dos"
        accentColor="#ec4899"
        icon={<BookOpen className="h-5 w-5 text-white" />}
      >
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </SectionPageLayout>
    );
  }

  return (
    <SectionPageLayout
      sectionNumber="04"
      sectionLabel="Principles"
      title="Reward AI Principles & Won't-dos"
      accentColor="#ec4899"
      icon={<BookOpen className="h-5 w-5 text-white" />}
      isLocked={isLocked}
      stageProgress={
        isLocked
          ? undefined
          : {
              stageNumber: 4,
              title: "Reward AI Principles & Won\u2019t-dos",
              description: isConfirmed
                ? "Principles confirmed — proceed to Stage 5"
                : `Define ${MIN_PRINCIPLES}–${MAX_PRINCIPLES} principles and ${MIN_WONT_DOS}–${MAX_WONT_DOS} won\u2019t-dos`,
              isCleared: isConfirmed,
              isEdited: isStale,
              canConfirm,
              isPending: confirmMutation.isPending,
              onConfirm: handleConfirm,
              backRoute: "/strategy/reward-strategy",
              nextRoute: "/strategy/reward-initiatives",
              nextLabel: "Initiatives",
            }
      }
    >
      {/* Locked gate */}
      {isLocked && (
        <Alert className="border-muted">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            {status?.canStartMessage ?? "Confirm your Stage 3 Strategic Shifts to unlock this stage."}
          </AlertDescription>
        </Alert>
      )}

      {!isLocked && (
        <div className="space-y-8">
          {/* Staleness banner */}
          {isStale && (
            <StalenessBanner
              onRegenerate={() => generateMutation.mutate()}
              onKeepAsIs={() => keepAsIsMutation.mutate()}
              isLoading={generateMutation.isPending || regenerateMutation.isPending}
            />
          )}

          {/* Confirmed badge */}
          {isConfirmed && !isStale && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Principles confirmed</span>
            </div>
          )}

          {/* Generate / no-content state */}
          {!hasContent && !generateMutation.isPending && (
            <Card className="border-dashed border-primary/30 bg-primary/5">
              <CardContent className="p-6 text-center space-y-4">
                <Sparkles className="h-8 w-8 text-primary mx-auto opacity-60" />
                <div className="space-y-1">
                  <p className="font-medium">Generate your principles and won't-dos</p>
                  <p className="text-sm text-muted-foreground">
                    The AI will draft {MIN_PRINCIPLES}–{MAX_PRINCIPLES} governing principles and {MIN_WONT_DOS}–{MAX_WONT_DOS} won't-dos based on your strategy. You can edit, add, and remove them freely.
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
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          )}

          {/* Principles section */}
          {hasContent && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Principles</h3>
                    <p className="text-sm text-muted-foreground">
                      Governing rules that guide every Reward AI decision. {principles.length}/{MAX_PRINCIPLES}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => regenerateMutation.mutate()}
                      disabled={isAnyRunning || regenerateMutation.isPending}
                      title="Refresh AI suggestions (preserves custom items)"
                    >
                      {regenerateMutation.isPending ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {principles.map((p, index) => (
                  <ItemCard
                    key={p.id}
                    item={p}
                    index={index}
                    total={principles.length}
                    itemType="principle"
                    onTextChange={handlePrincipleTextChange}
                    onAffordance={handleAffordance}
                    onRemove={handleRemovePrinciple}
                    activeAffordance={activeAffordance}
                    challengeCallout={challengeCallout}
                    onDismissChallenge={() => setChallengeCallout(null)}
                    disabled={isAnyRunning}
                    minItems={MIN_PRINCIPLES}
                  />
                ))}

                {/* Add / Suggest / Canonical buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddBlankPrinciple}
                    disabled={principles.length >= MAX_PRINCIPLES || isAnyRunning}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add principle
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => suggestPrincipleMutation.mutate()}
                    disabled={principles.length >= MAX_PRINCIPLES || isAnyRunning}
                  >
                    {suggestPrincipleMutation.isPending ? (
                      <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Suggesting…</>
                    ) : (
                      <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Suggest</>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPickerOpen("principle")}
                    disabled={principles.length >= MAX_PRINCIPLES || isAnyRunning}
                  >
                    <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                    Browse canonical
                  </Button>
                </div>
              </div>

              {/* Won't-dos section */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Won't-dos</h3>
                  <p className="text-sm text-muted-foreground">
                    Explicit constraints that protect employees and the organisation. {wontDos.length}/{MAX_WONT_DOS}
                  </p>
                </div>

                {wontDos.map((w, index) => (
                  <ItemCard
                    key={w.id}
                    item={w}
                    index={index}
                    total={wontDos.length}
                    itemType="wont_do"
                    onTextChange={handleWontDoTextChange}
                    onAffordance={handleAffordance}
                    onRemove={handleRemoveWontDo}
                    activeAffordance={activeAffordance}
                    challengeCallout={challengeCallout}
                    onDismissChallenge={() => setChallengeCallout(null)}
                    disabled={isAnyRunning}
                    minItems={MIN_WONT_DOS}
                  />
                ))}

                {/* Add / Suggest / Canonical buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddBlankWontDo}
                    disabled={wontDos.length >= MAX_WONT_DOS || isAnyRunning}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add won't-do
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => suggestWontDoMutation.mutate()}
                    disabled={wontDos.length >= MAX_WONT_DOS || isAnyRunning}
                  >
                    {suggestWontDoMutation.isPending ? (
                      <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Suggesting…</>
                    ) : (
                      <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Suggest</>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPickerOpen("wont_do")}
                    disabled={wontDos.length >= MAX_WONT_DOS || isAnyRunning}
                  >
                    <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                    Browse canonical
                  </Button>
                </div>
              </div>

              {/* Guidance card */}
              <Card className="bg-muted/30 border-border/40">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Info className="h-4 w-4 text-primary" />
                    Principles vs won't-dos
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground mb-1">Principles</p>
                      <p>Governing rules that guide decisions. Start with "We" or a verb. Should be testable — you can ask "did we follow this?"</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">Won't-dos</p>
                      <p>Explicit constraints on what AI won't do in Reward. Start with "We won't" or "We will not". Protect employees and the organisation.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Autosave indicator */}
              {saveMutation.isPending && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Saving…
                </p>
              )}

              {/* Confirm CTA */}
              {!isConfirmed && (
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-sm text-muted-foreground">
                    {principles.length < MIN_PRINCIPLES
                      ? `${MIN_PRINCIPLES - principles.length} more principle${MIN_PRINCIPLES - principles.length !== 1 ? "s" : ""} needed`
                      : wontDos.length < MIN_WONT_DOS
                      ? `${MIN_WONT_DOS - wontDos.length} more won't-do${MIN_WONT_DOS - wontDos.length !== 1 ? "s" : ""} needed`
                      : "Ready to confirm"}
                  </span>
                  <Button onClick={handleConfirm} disabled={!canConfirm || confirmMutation.isPending}>
                    {confirmMutation.isPending ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Confirming…</>
                    ) : (
                      <>Confirm principles <ChevronRight className="h-4 w-4 ml-1" /></>
                    )}
                  </Button>
                </div>
              )}

              {/* Re-confirm after edit */}
              {isConfirmed && isDirty && (
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-sm text-muted-foreground">You have unsaved edits — re-confirm to update.</span>
                  <Button onClick={handleConfirm} disabled={!canConfirm || confirmMutation.isPending} variant="outline">
                    Re-confirm
                  </Button>
                </div>
              )}

              {/* Navigate to Stage 5 */}
              {isConfirmed && !isDirty && (
                <div className="flex justify-end pt-2">
                  <Button variant="outline" onClick={() => navigate("/strategy/reward-initiatives")}>
                    Continue to Initiatives <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Canonical picker modal */}
      {pickerOpen && (
        <CanonicalPicker
          open={!!pickerOpen}
          onClose={() => setPickerOpen(null)}
          type={pickerOpen}
          canonicalPrinciples={(templates?.principles ?? []) as CanonicalPrinciple[]}
          canonicalWontDos={(templates?.wontDos ?? []) as CanonicalWontDo[]}
          existingIds={pickerOpen === "principle" ? existingPrincipleIds : existingWontDoIds}
          onSelect={handleCanonicalSelect}
        />
      )}
    </SectionPageLayout>
  );
}
