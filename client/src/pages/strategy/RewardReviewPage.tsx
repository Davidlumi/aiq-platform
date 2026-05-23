/**
 * RewardReviewPage — /strategy/reward-review
 * Stage 9 (Reward mode): Review all stages and lock the strategy.
 *
 * Blocks:
 *   1. Page header + run-review CTA
 *   2. Check cards grouped by category (Staleness / Completeness / Coherence / Readiness)
 *   3. Soft flag acknowledgment (with optional rationale)
 *   4. Review summary (AI-generated, editable, affordances)
 *   5. Lock CTA (enabled only when canLock=true)
 *   6. Locked state banner + unlock affordance
 */
import React, { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import SectionPageLayout from "@/components/SectionPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  CheckCircle2, AlertTriangle, XCircle, Lock, LockOpen,
  RefreshCw, Sparkles, ChevronDown, ChevronUp, Wand2,
  Zap, ShieldCheck, Lightbulb, ArrowRight, ClipboardCheck,
  AlertCircle, Info,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type CheckCategory = "staleness" | "completeness" | "coherence" | "readiness";
type CheckStatus = "pass" | "flag";
type FlagType = "hard" | "soft" | null;

interface CheckResult {
  checkId: string;
  category: CheckCategory;
  status: CheckStatus;
  flagType: FlagType;
  message: string;
  sourceStage: number | null;
  resultStateHash: string;
}

interface AcknowledgmentRecord {
  acknowledgedAt: number;
  rationale: string | null;
}

type AcknowledgmentsMap = Record<string, AcknowledgmentRecord>;

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORY_META: Record<CheckCategory, { label: string; icon: React.ReactNode; color: string }> = {
  staleness:    { label: "Staleness",    icon: <RefreshCw className="h-4 w-4" />,     color: "text-orange-500" },
  completeness: { label: "Completeness", icon: <ClipboardCheck className="h-4 w-4" />, color: "text-blue-500" },
  coherence:    { label: "Coherence",    icon: <ShieldCheck className="h-4 w-4" />,    color: "text-purple-500" },
  readiness:    { label: "Readiness",    icon: <Zap className="h-4 w-4" />,            color: "text-emerald-500" },
};

const STAGE_LABELS: Record<number, string> = {
  1: "Stage 1 — Background",
  2: "Stage 2 — Vision",
  3: "Stage 3 — Strategy",
  4: "Stage 4 — Principles",
  5: "Stage 5 — Portfolio",
  6: "Stage 6 — Measures",
  7: "Stage 7 — Business Case",
  8: "Stage 8 — Capability",
};

type AffordanceAction = "expand" | "refine" | "challenge" | "suggest";

// ── Check card ────────────────────────────────────────────────────────────────
function CheckCard({
  check,
  acknowledgments,
  onAcknowledge,
  onNavigate,
}: {
  check: CheckResult;
  acknowledgments: AcknowledgmentsMap;
  onAcknowledge: (checkId: string, resultStateHash: string, rationale?: string) => void;
  onNavigate: (stage: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [ackDialogOpen, setAckDialogOpen] = useState(false);
  const [ackRationale, setAckRationale] = useState("");

  const ackKey = `${check.checkId}::${check.resultStateHash}`;
  const isAcknowledged = !!acknowledgments[ackKey];
  const ack = acknowledgments[ackKey];

  const isPass = check.status === "pass";
  const isHard = check.flagType === "hard";
  const isSoft = check.flagType === "soft";

  return (
    <div className={`rounded-lg border p-4 transition-colors ${
      isPass ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-800/40 dark:bg-emerald-950/20"
      : isHard ? "border-red-200 bg-red-50/30 dark:border-red-800/40 dark:bg-red-950/20"
      : isAcknowledged ? "border-amber-100 bg-amber-50/20 dark:border-amber-800/30 dark:bg-amber-950/10"
      : "border-amber-200 bg-amber-50/30 dark:border-amber-800/40 dark:bg-amber-950/20"
    }`}>
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="mt-0.5 shrink-0">
          {isPass ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : isHard ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : isAcknowledged ? (
            <CheckCircle2 className="h-5 w-5 text-amber-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold text-muted-foreground">{check.checkId}</span>
            {isHard && (
              <Badge variant="destructive" className="text-xs">Hard flag — blocking</Badge>
            )}
            {isSoft && !isAcknowledged && (
              <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200">Soft flag</Badge>
            )}
            {isSoft && isAcknowledged && (
              <Badge className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200">Acknowledged</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-foreground">{check.message}</p>

          {/* Acknowledged rationale */}
          {isAcknowledged && ack?.rationale && (
            <p className="mt-1 text-xs text-muted-foreground italic">Rationale: {ack.rationale}</p>
          )}

          {/* Actions */}
          {!isPass && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {check.sourceStage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => onNavigate(check.sourceStage!)}
                >
                  <ArrowRight className="h-3 w-3" />
                  Go to {STAGE_LABELS[check.sourceStage] ?? `Stage ${check.sourceStage}`}
                </Button>
              )}
              {isSoft && !isAcknowledged && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setAckDialogOpen(true)}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Acknowledge
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Acknowledge dialog */}
      <Dialog open={ackDialogOpen} onOpenChange={setAckDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Acknowledge {check.checkId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{check.message}</p>
            <div>
              <label className="text-sm font-medium">Rationale (optional)</label>
              <Textarea
                className="mt-1"
                placeholder="Why are you proceeding despite this flag?"
                value={ackRationale}
                onChange={e => setAckRationale(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAckDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                onAcknowledge(check.checkId, check.resultStateHash, ackRationale || undefined);
                setAckDialogOpen(false);
                setAckRationale("");
              }}
            >
              Acknowledge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Category section ──────────────────────────────────────────────────────────
function CategorySection({
  category,
  checks,
  acknowledgments,
  onAcknowledge,
  onNavigate,
}: {
  category: CheckCategory;
  checks: CheckResult[];
  acknowledgments: AcknowledgmentsMap;
  onAcknowledge: (checkId: string, resultStateHash: string, rationale?: string) => void;
  onNavigate: (stage: number) => void;
}) {
  const meta = CATEGORY_META[category];
  const flagCount = checks.filter(c => c.status === "flag").length;
  const passCount = checks.filter(c => c.status === "pass").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={meta.color}>{meta.icon}</span>
        <h3 className="font-semibold text-sm">{meta.label}</h3>
        <div className="flex gap-1 ml-auto">
          {passCount > 0 && (
            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
              {passCount} passed
            </Badge>
          )}
          {flagCount > 0 && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
              {flagCount} flagged
            </Badge>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {checks.map(check => (
          <CheckCard
            key={check.checkId}
            check={check}
            acknowledgments={acknowledgments}
            onAcknowledge={onAcknowledge}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RewardReviewPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: statusData, isLoading } = trpc.rewardReview.getStatus.useQuery(undefined, {
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  const review = statusData?.review;
  const checkResults: CheckResult[] = (review?.checkResults as CheckResult[]) ?? [];
  const acknowledgments: AcknowledgmentsMap = (review?.acknowledgments as AcknowledgmentsMap) ?? {};
  const canLock = statusData?.canLock ?? false;
  const blockingCheckIds = statusData?.blockingCheckIds ?? [];
  const strategyLocked = review?.strategyLocked ?? false;

  // ── Local state ────────────────────────────────────────────────────────────
  const [summaryText, setSummaryText] = useState<string>("");
  const [summaryEdited, setSummaryEdited] = useState(false);
  const [affordanceDialogOpen, setAffordanceDialogOpen] = useState(false);
  const [affordanceAction, setAffordanceAction] = useState<AffordanceAction>("expand");
  const [affordanceReason, setAffordanceReason] = useState("");
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);

  // Sync summary text from server
  React.useEffect(() => {
    if (review?.reviewSummaryText && !summaryEdited) {
      setSummaryText(review.reviewSummaryText);
    }
  }, [review?.reviewSummaryText, summaryEdited]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const runReview = trpc.rewardReview.runReview.useMutation({
    onSuccess: () => {
      utils.rewardReview.getStatus.invalidate();
      toast.success("Review complete — check results updated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const acknowledge = trpc.rewardReview.acknowledge.useMutation({
    onSuccess: () => {
      utils.rewardReview.getStatus.invalidate();
      toast.success("Flag acknowledged.");
    },
    onError: (e) => toast.error(e.message),
  });

  const generateSummary = trpc.rewardReview.generateSummary.useMutation({
    onSuccess: (data) => {
      setSummaryText(data.reviewSummaryText);
      setSummaryEdited(false);
      utils.rewardReview.getStatus.invalidate();
      toast.success("Review summary generated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveSummary = trpc.rewardReview.saveSummary.useMutation({
    onSuccess: () => {
      setSummaryEdited(false);
      toast.success("Summary saved.");
    },
    onError: (e) => toast.error(e.message),
  });

  const affordanceMutation = trpc.rewardReview.affordance.useMutation({
    onSuccess: (data) => {
      setSummaryText(data.result);
      setSummaryEdited(true);
      setAffordanceDialogOpen(false);
      setAffordanceReason("");
      toast.success("Summary updated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const lockMutation = trpc.rewardReview.lock.useMutation({
    onSuccess: () => {
      utils.rewardReview.getStatus.invalidate();
      toast.success("Strategy locked — Stage 10 is now final.");
    },
    onError: (e) => toast.error(e.message),
  });

  const unlockMutation = trpc.rewardReview.unlock.useMutation({
    onSuccess: () => {
      utils.rewardReview.getStatus.invalidate();
      setUnlockDialogOpen(false);
      toast.success("Strategy unlocked — Stage 10 output marked as draft.");
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAcknowledge = useCallback((checkId: string, resultStateHash: string, rationale?: string) => {
    acknowledge.mutate({ checkId, resultStateHash, rationale });
  }, [acknowledge]);

  const handleNavigate = useCallback((stage: number) => {
    const routes: Record<number, string> = {
      1: "/strategy/reward-prework",
      2: "/strategy/reward-vision",
      3: "/strategy/reward-strategy",
      4: "/strategy/reward-principles",
      5: "/strategy/reward-initiatives",
      6: "/strategy/reward-success-measures",
      7: "/strategy/reward-business-case",
      8: "/strategy/reward-capability",
    };
    const route = routes[stage];
    if (route) navigate(route);
  }, [navigate]);

  const handleAffordance = useCallback((action: AffordanceAction) => {
    setAffordanceAction(action);
    setAffordanceDialogOpen(true);
  }, []);

  // ── Group checks by category ───────────────────────────────────────────────
  const categories: CheckCategory[] = ["staleness", "completeness", "coherence", "readiness"];
  const checksByCategory = categories.reduce((acc, cat) => {
    acc[cat] = checkResults.filter(c => c.category === cat);
    return acc;
  }, {} as Record<CheckCategory, CheckResult[]>);

  const totalFlags = checkResults.filter(c => c.status === "flag").length;
  const totalPasses = checkResults.filter(c => c.status === "pass").length;
  const hardFlags = checkResults.filter(c => c.flagType === "hard").length;
  const softFlags = checkResults.filter(c => c.flagType === "soft").length;
  const acknowledgedSoftFlags = checkResults.filter(c => {
    if (c.flagType !== "soft") return false;
    const key = `${c.checkId}::${c.resultStateHash}`;
    return !!acknowledgments[key];
  }).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SectionPageLayout
      sectionNumber="09"
      sectionLabel="Review & Lock"
      title="Review & Lock — Validate and lock your strategy"
      accentColor="oklch(0.55 0.18 260)"
      icon={<ClipboardCheck className="h-6 w-6" />}
    >
      <div className="max-w-3xl mx-auto space-y-8 pb-16">

        {/* ── Locked banner ─────────────────────────────────────────────── */}
        {strategyLocked && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30 p-5 flex items-start gap-4">
            <Lock className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">Strategy locked</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                The strategy is locked and Stage 10 output is final. Unlock to make further changes.
              </p>
              {review?.lockedAt && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  Locked {new Date(review.lockedAt).toLocaleString()}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              onClick={() => setUnlockDialogOpen(true)}
            >
              <LockOpen className="h-4 w-4" />
              Unlock
            </Button>
          </div>
        )}

        {/* ── Run review CTA ────────────────────────────────────────────── */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">Run pre-lock review</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Checks all 12 criteria across staleness, completeness, coherence, and readiness.
                {review?.lastRunAt && (
                  <span className="ml-1 text-xs">
                    Last run: {new Date(review.lastRunAt).toLocaleString()}
                  </span>
                )}
              </p>
            </div>
            <Button
              onClick={() => runReview.mutate()}
              disabled={runReview.isPending || strategyLocked}
              className="shrink-0 gap-2"
            >
              {runReview.isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Running…</>
              ) : (
                <><RefreshCw className="h-4 w-4" /> Run review</>
              )}
            </Button>
          </div>

          {/* Summary stats */}
          {checkResults.length > 0 && (
            <div className="mt-4 flex gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-muted-foreground">{totalPasses} passed</span>
              </div>
              {hardFlags > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-muted-foreground">{hardFlags} hard flag{hardFlags > 1 ? "s" : ""}</span>
                </div>
              )}
              {softFlags > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-muted-foreground">
                    {softFlags} soft flag{softFlags > 1 ? "s" : ""} ({acknowledgedSoftFlags} acknowledged)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Loading skeleton ──────────────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* ── Check results ─────────────────────────────────────────────── */}
        {checkResults.length > 0 && (
          <div className="space-y-6">
            {categories.map(cat => {
              const checks = checksByCategory[cat];
              if (!checks || checks.length === 0) return null;
              return (
                <CategorySection
                  key={cat}
                  category={cat}
                  checks={checks}
                  acknowledgments={acknowledgments}
                  onAcknowledge={handleAcknowledge}
                  onNavigate={handleNavigate}
                />
              );
            })}
          </div>
        )}

        {/* ── Review summary ────────────────────────────────────────────── */}
        {checkResults.length > 0 && (
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Review summary</h2>
            </div>

            <Textarea
              value={summaryText}
              onChange={e => { setSummaryText(e.target.value); setSummaryEdited(true); }}
              rows={6}
              placeholder="Generate or write a review summary…"
              className="resize-none"
              disabled={strategyLocked}
            />

            {/* Affordance buttons */}
            {!strategyLocked && (
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                  onClick={() => generateSummary.mutate()}
                  disabled={generateSummary.isPending}>
                  {generateSummary.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {summaryText ? "Regenerate" : "Generate"}
                </Button>
                {summaryText && (
                  <>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                      onClick={() => handleAffordance("expand")}
                      disabled={affordanceMutation.isPending}>
                      <ChevronDown className="h-3 w-3" /> Expand
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                      onClick={() => handleAffordance("refine")}
                      disabled={affordanceMutation.isPending}>
                      <Wand2 className="h-3 w-3" /> Refine
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                      onClick={() => handleAffordance("challenge")}
                      disabled={affordanceMutation.isPending}>
                      <AlertCircle className="h-3 w-3" /> Challenge
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                      onClick={() => handleAffordance("suggest")}
                      disabled={affordanceMutation.isPending}>
                      <Lightbulb className="h-3 w-3" /> Suggest
                    </Button>
                  </>
                )}
                {summaryEdited && summaryText && (
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs ml-auto"
                    onClick={() => saveSummary.mutate({ text: summaryText })}
                    disabled={saveSummary.isPending}>
                    {saveSummary.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                    Save
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Lock CTA ──────────────────────────────────────────────────── */}
        {checkResults.length > 0 && !strategyLocked && (
          <div className={`rounded-xl border p-5 ${
            canLock
              ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20"
              : "border-muted bg-muted/20"
          }`}>
            <div className="flex items-start gap-4">
              <div className={`rounded-lg p-2.5 ${canLock ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-muted"}`}>
                <Lock className={`h-5 w-5 ${canLock ? "text-emerald-600" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1">
                <h2 className={`font-semibold ${canLock ? "text-emerald-800 dark:text-emerald-200" : "text-muted-foreground"}`}>
                  Lock strategy
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {canLock
                    ? "All checks passed or acknowledged. The strategy is ready to lock."
                    : `${blockingCheckIds.length} check${blockingCheckIds.length > 1 ? "s" : ""} must be resolved before locking: ${blockingCheckIds.join(", ")}.`
                  }
                </p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        disabled={!canLock || lockMutation.isPending}
                        onClick={() => lockMutation.mutate()}
                        className={`shrink-0 gap-2 ${canLock ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                      >
                        {lockMutation.isPending ? (
                          <><RefreshCw className="h-4 w-4 animate-spin" /> Locking…</>
                        ) : (
                          <><Lock className="h-4 w-4" /> Lock strategy</>
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canLock && (
                    <TooltipContent>
                      Resolve or acknowledge all flagged checks to enable locking.
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}

        {/* ── Proceed to Stage 10 ───────────────────────────────────────── */}
        {strategyLocked && (
          <div className="flex justify-end">
            <Button
              className="gap-2"
              onClick={() => navigate("/strategy/reward-outputs")}
            >
              Proceed to Stage 10 — Outputs
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Affordance dialog ─────────────────────────────────────────────── */}
      <Dialog open={affordanceDialogOpen} onOpenChange={setAffordanceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">{affordanceAction} review summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {affordanceAction === "expand" && "Add more specific detail about the outstanding issues."}
              {affordanceAction === "refine" && "Make the summary more precise and concise."}
              {affordanceAction === "challenge" && "Identify where the summary is too optimistic or pessimistic."}
              {affordanceAction === "suggest" && "Generate a fresh summary from scratch."}
            </p>
            <div>
              <label className="text-sm font-medium">Additional context (optional)</label>
              <Textarea
                className="mt-1"
                placeholder="Any specific focus or constraint…"
                value={affordanceReason}
                onChange={e => setAffordanceReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAffordanceDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={affordanceMutation.isPending}
              onClick={() => affordanceMutation.mutate({
                action: affordanceAction,
                currentText: summaryText,
                reason: affordanceReason || undefined,
              })}
            >
              {affordanceMutation.isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Working…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Apply</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Unlock confirmation dialog ────────────────────────────────────── */}
      <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unlock strategy</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Unlocking will revert Stage 10 to draft status. You can re-lock after making changes.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={unlockMutation.isPending}
              onClick={() => unlockMutation.mutate()}
            >
              {unlockMutation.isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Unlocking…</>
              ) : (
                "Unlock"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionPageLayout>
  );
}
