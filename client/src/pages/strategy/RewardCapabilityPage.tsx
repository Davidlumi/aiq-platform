/**
 * RewardCapabilityPage — /strategy/reward-capability
 * Stage 8 (Reward mode): Assess organisational capability to deliver the portfolio.
 *
 * Blocks:
 *   1. Page header + gate banner (locked if Stage 5 not complete)
 *   2. Stale banner (portfolio changed after confirmation)
 *   3. Generate assessment CTA (AI pre-populate gap statements + action notes)
 *   4. Per-dimension cards: required level, current level selector, gap status, gap statement, action note
 *   5. Affordance buttons (Expand / Refine / Challenge / Suggest) on gap statement and action note
 *   6. Sequencing flags panel (advisory — which initiatives are ready/need enablement/blocked)
 *   7. Enablement cost summary
 *   8. Confirm Stage 8 CTA
 */

import React, { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import SectionPageLayout from "@/components/SectionPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Sparkles, CheckCircle2, AlertTriangle, Lock, RefreshCw,
  ChevronDown, ChevronUp, Zap, Wand2, ShieldCheck, Lightbulb,
  Database, Users, Plug, Scale, GraduationCap, ArrowRight,
  TrendingUp, CircleDot, Info, DollarSign, User,
} from "lucide-react";
import { getRewardInitiative } from "@/../../shared/rewardInitiativeLibrary";

// ── Types ─────────────────────────────────────────────────────────────────────

type CapabilityLevel = "low" | "medium" | "high" | "very_high";
type GapStatus = "no_gap" | "minor_gap" | "significant_gap";
type SequencingStatus = "ready" | "needs_enablement" | "blocked";
type CapabilityDimension = "data_foundations" | "change_management" | "systems_integration" | "governance" | "team_skills";
type AffordanceField = "gapStatement" | "actionNote";
type AffordanceAction = "expand" | "refine" | "challenge" | "suggest";

interface DimensionRow {
  dimension: CapabilityDimension;
  label: string;
  description: string;
  requiredLevel: CapabilityLevel;
  currentLevel: CapabilityLevel | null;
  gapStatus: GapStatus | null;
  gapStatement: string | null;
  gapStatementAiOriginal: string | null;
  actionNote: string | null;
  actionNoteAiOriginal: string | null;
  isChallenged: boolean;
  challengeNote: string | null;
  owner: string | null;
  updatedAt: number | null;
}

interface SequencingFlag {
  initiativeId: string;
  status: SequencingStatus;
  reason?: string;
}

interface EnablementCost {
  low: number;
  high: number;
  note: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const DIMENSION_ICONS: Record<CapabilityDimension, React.ReactNode> = {
  data_foundations: <Database className="w-5 h-5" />,
  change_management: <Users className="w-5 h-5" />,
  systems_integration: <Plug className="w-5 h-5" />,
  governance: <Scale className="w-5 h-5" />,
  team_skills: <GraduationCap className="w-5 h-5" />,
};

const LEVEL_CONFIG: Record<CapabilityLevel, { label: string; badge: string; dot: string }> = {
  low: {
    label: "Low",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    dot: "bg-rose-500",
  },
  medium: {
    label: "Medium",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    dot: "bg-amber-500",
  },
  high: {
    label: "High",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  very_high: {
    label: "Very High",
    badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
    dot: "bg-violet-500",
  },
};

const GAP_CONFIG: Record<GapStatus, { label: string; badge: string; icon: React.ReactNode }> = {
  no_gap: {
    label: "No gap",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  minor_gap: {
    label: "Minor gap",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  significant_gap: {
    label: "Significant gap",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
};

const SEQUENCING_CONFIG: Record<SequencingStatus, { label: string; badge: string; icon: React.ReactNode }> = {
  ready: {
    label: "Ready",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  needs_enablement: {
    label: "Needs enablement",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  blocked: {
    label: "Blocked",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    icon: <Lock className="w-3.5 h-3.5" />,
  },
};

const AFFORDANCE_CONFIG: Record<AffordanceAction, { label: string; icon: React.ReactNode; description: string }> = {
  expand: { label: "Expand", icon: <Zap className="w-3 h-3" />, description: "Add specificity and detail" },
  refine: { label: "Refine", icon: <Wand2 className="w-3 h-3" />, description: "Tighten for clarity" },
  challenge: { label: "Challenge", icon: <ShieldCheck className="w-3 h-3" />, description: "Flag overstatement or assumptions" },
  suggest: { label: "Suggest", icon: <Lightbulb className="w-3 h-3" />, description: "Fresh AI suggestion" },
};

function formatGbp(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `£${Math.round(n / 1_000)}k`;
  return `£${n}`;
}

// ── DimensionCard ─────────────────────────────────────────────────────────────

interface DimensionCardProps {
  dim: DimensionRow;
  isLocked: boolean;
  onSave: (updates: Partial<DimensionRow>) => void;
  isSaving: boolean;
}

function DimensionCard({ dim, isLocked, onSave, isSaving }: DimensionCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [localGapStatement, setLocalGapStatement] = useState(dim.gapStatement ?? "");
  const [localActionNote, setLocalActionNote] = useState(dim.actionNote ?? "");
  const [localOwner, setLocalOwner] = useState(dim.owner ?? "");
  const [affordanceField, setAffordanceField] = useState<AffordanceField | null>(null);
  const [affordanceAction, setAffordanceAction] = useState<AffordanceAction | null>(null);
  const [affordanceReason, setAffordanceReason] = useState("");
  const [affordanceDialogOpen, setAffordanceDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  const affordanceMutation = trpc.rewardCapabilityAssessment.affordance.useMutation({
    onSuccess: (data) => {
      if (affordanceField === "gapStatement") {
        setLocalGapStatement(data.result);
        onSave({ gapStatement: data.result });
      } else {
        setLocalActionNote(data.result);
        onSave({ actionNote: data.result });
      }
      setAffordanceDialogOpen(false);
      setAffordanceReason("");
      toast.success("Updated");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleLevelChange = (level: CapabilityLevel) => {
    onSave({ currentLevel: level });
  };

  const handleGapStatementBlur = () => {
    if (localGapStatement !== (dim.gapStatement ?? "")) {
      onSave({ gapStatement: localGapStatement });
    }
  };

  const handleActionNoteBlur = () => {
    if (localActionNote !== (dim.actionNote ?? "")) {
      onSave({ actionNote: localActionNote });
    }
  };

  const handleOwnerBlur = () => {
    if (localOwner !== (dim.owner ?? "")) {
      onSave({ owner: localOwner });
    }
  };

  const openAffordance = (field: AffordanceField, action: AffordanceAction) => {
    setAffordanceField(field);
    setAffordanceAction(action);
    setAffordanceDialogOpen(true);
  };

  const runAffordance = () => {
    if (!affordanceField || !affordanceAction) return;
    affordanceMutation.mutate({
      dimension: dim.dimension,
      field: affordanceField,
      action: affordanceAction,
      currentText: affordanceField === "gapStatement" ? localGapStatement : localActionNote,
      reason: affordanceReason || undefined,
    });
  };

  const gapCfg = dim.gapStatus ? GAP_CONFIG[dim.gapStatus] : null;

  return (
    <div className={`rounded-xl border bg-card transition-all ${dim.isChallenged ? "border-amber-500/50" : "border-border"}`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {DIMENSION_ICONS[dim.dimension]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{dim.label}</span>
            {dim.isChallenged && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />Challenged
              </Badge>
            )}
            {gapCfg && (
              <Badge variant="outline" className={`${gapCfg.badge} text-xs flex items-center gap-1`}>
                {gapCfg.icon}{gapCfg.label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{dim.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="outline" className={`${LEVEL_CONFIG[dim.requiredLevel].badge} text-xs`}>
            Required: {LEVEL_CONFIG[dim.requiredLevel].label}
          </Badge>
          {dim.currentLevel && (
            <Badge variant="outline" className={`${LEVEL_CONFIG[dim.currentLevel].badge} text-xs`}>
              Current: {LEVEL_CONFIG[dim.currentLevel].label}
            </Badge>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          {/* Current level selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Current capability level
              </Label>
              <Select
                value={dim.currentLevel ?? ""}
                onValueChange={(v) => handleLevelChange(v as CapabilityLevel)}
                disabled={isLocked}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select current level…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low — significant development needed</SelectItem>
                  <SelectItem value="medium">Medium — some capability exists</SelectItem>
                  <SelectItem value="high">High — well-established capability</SelectItem>
                  <SelectItem value="very_high">Very High — advanced, proven capability</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Owner (optional)
              </Label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-9 text-sm"
                  placeholder="Name or team…"
                  value={localOwner}
                  onChange={(e) => setLocalOwner(e.target.value)}
                  onBlur={handleOwnerBlur}
                  disabled={isLocked}
                />
              </div>
            </div>
          </div>

          {/* Gap statement */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Gap statement
              </Label>
              {!isLocked && (
                <div className="flex gap-1">
                  {(["expand", "refine", "challenge", "suggest"] as AffordanceAction[]).map((action) => (
                    <TooltipProvider key={action}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs gap-1"
                            onClick={() => openAffordance("gapStatement", action)}
                          >
                            {AFFORDANCE_CONFIG[action].icon}
                            <span className="hidden sm:inline">{AFFORDANCE_CONFIG[action].label}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{AFFORDANCE_CONFIG[action].description}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              )}
            </div>
            <Textarea
              className="min-h-[80px] text-sm resize-none"
              placeholder="Describe the current state and gap for this dimension…"
              value={localGapStatement}
              onChange={(e) => setLocalGapStatement(e.target.value)}
              onBlur={handleGapStatementBlur}
              disabled={isLocked}
            />
            {dim.isChallenged && dim.challengeNote && (
              <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                <span className="font-medium">Challenge note:</span> {dim.challengeNote}
              </div>
            )}
          </div>

          {/* Action note */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Recommended action
              </Label>
              {!isLocked && (
                <div className="flex gap-1">
                  {(["expand", "refine", "suggest"] as AffordanceAction[]).map((action) => (
                    <TooltipProvider key={action}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs gap-1"
                            onClick={() => openAffordance("actionNote", action)}
                          >
                            {AFFORDANCE_CONFIG[action].icon}
                            <span className="hidden sm:inline">{AFFORDANCE_CONFIG[action].label}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{AFFORDANCE_CONFIG[action].description}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              )}
            </div>
            <Textarea
              className="min-h-[72px] text-sm resize-none"
              placeholder="Describe the key action to close this gap…"
              value={localActionNote}
              onChange={(e) => setLocalActionNote(e.target.value)}
              onBlur={handleActionNoteBlur}
              disabled={isLocked}
            />
          </div>
        </div>
      )}

      {/* Affordance dialog */}
      <Dialog open={affordanceDialogOpen} onOpenChange={setAffordanceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {affordanceAction && AFFORDANCE_CONFIG[affordanceAction].icon}
              {affordanceAction && AFFORDANCE_CONFIG[affordanceAction].label} —{" "}
              {affordanceField === "gapStatement" ? "Gap statement" : "Action note"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {affordanceAction && AFFORDANCE_CONFIG[affordanceAction].description}
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Additional context (optional)</Label>
              <Textarea
                className="min-h-[72px] text-sm resize-none"
                placeholder="Any specific context to guide the AI…"
                value={affordanceReason}
                onChange={(e) => setAffordanceReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAffordanceDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={runAffordance}
              disabled={affordanceMutation.isPending}
              className="gap-2"
            >
              {affordanceMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RewardCapabilityPage() {
  const [, navigate] = useLocation();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const { data, isLoading, refetch } = trpc.rewardCapabilityAssessment.getStatus.useQuery();
  const utils = trpc.useUtils();

  const generateMutation = trpc.rewardCapabilityAssessment.generateAssessment.useMutation({
    onSuccess: () => {
      utils.rewardCapabilityAssessment.getStatus.invalidate();
      toast.success("Assessment generated — review and adjust each dimension");
    },
    onError: (err) => toast.error(err.message),
  });

  const saveDimensionMutation = trpc.rewardCapabilityAssessment.saveDimension.useMutation({
    onSuccess: () => {
      utils.rewardCapabilityAssessment.getStatus.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const confirmMutation = trpc.rewardCapabilityAssessment.confirm.useMutation({
    onSuccess: () => {
      utils.rewardCapabilityAssessment.getStatus.invalidate();
      setConfirmDialogOpen(false);
      toast.success("Stage 8 confirmed");
      navigate("/strategy/reward-outputs");
    },
    onError: (err) => toast.error(err.message),
  });

  const keepAsIsMutation = trpc.rewardCapabilityAssessment.keepAsIs.useMutation({
    onSuccess: () => {
      utils.rewardCapabilityAssessment.getStatus.invalidate();
      toast.success("Kept as-is");
    },
    onError: (err) => toast.error(err.message),
  });

  // E2: Custom initiative capability ratings
  const { data: customCapData, refetch: refetchCustomCap } = trpc.rewardCapabilityAssessment.getCustomInitiativeCapability.useQuery();
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{ id: string; title: string } | null>(null);
  const [ratingValues, setRatingValues] = useState<{
    dataIntensity: "low" | "medium" | "high";
    changeImpact: "low" | "medium" | "high";
    integrationNeed: "low" | "medium" | "high";
    governanceSensitivity: "low" | "medium" | "high";
  }>({
    dataIntensity: "medium",
    changeImpact: "medium",
    integrationNeed: "medium",
    governanceSensitivity: "medium",
  });

  const rateCustomMutation = trpc.rewardCapabilityAssessment.rateCustomInitiative.useMutation({
    onSuccess: () => {
      utils.rewardCapabilityAssessment.getStatus.invalidate();
      refetchCustomCap();
      setRatingDialogOpen(false);
      toast.success("Capability ratings saved — required levels updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const openRatingDialog = (ci: { id: string; title: string; dataIntensity: string; changeImpact: string; integrationNeed: string; governanceSensitivity: string }) => {
    setRatingTarget({ id: ci.id, title: ci.title });
    setRatingValues({
      dataIntensity: ci.dataIntensity as "low" | "medium" | "high",
      changeImpact: ci.changeImpact as "low" | "medium" | "high",
      integrationNeed: ci.integrationNeed as "low" | "medium" | "high",
      governanceSensitivity: ci.governanceSensitivity as "low" | "medium" | "high",
    });
    setRatingDialogOpen(true);
  };

  const unratedCustom = (customCapData ?? []).filter((ci) => !ci.isRated);
  const hasUnratedCustom = unratedCustom.length > 0;

  const isLocked = !data?.canStart;
  const isStale = data?.stage?.isStale ?? false;
  const isConfirmed = data?.stage?.isConfirmed ?? false;
  const dimensions: DimensionRow[] = (data?.dimensions ?? []) as DimensionRow[];
  const sequencingFlags: SequencingFlag[] = (data?.sequencingFlags ?? []) as SequencingFlag[];
  const enablementCost = data?.enablementCost as EnablementCost | undefined;
  const initiativeIds: string[] = data?.initiativeIds ?? [];

  const hasAnyAssessed = dimensions.some((d) => d.currentLevel !== null);
  const allAssessed = dimensions.length > 0 && dimensions.every((d) => d.currentLevel !== null);
  const hasSignificantGaps = dimensions.some((d) => d.gapStatus === "significant_gap");

  const handleSaveDimension = useCallback((dimension: CapabilityDimension, updates: Partial<DimensionRow>) => {
    saveDimensionMutation.mutate({
      dimension,
      currentLevel: updates.currentLevel ?? undefined,
      gapStatement: updates.gapStatement ?? undefined,
      actionNote: updates.actionNote ?? undefined,
      owner: updates.owner ?? undefined,
    });
  }, [saveDimensionMutation]);

  if (isLoading) {
    return (
      <SectionPageLayout
        sectionNumber="08"
        sectionLabel="Capability"
        title="Capability Assessment"
        accentColor="#7c3aed"
        icon={<GraduationCap className="h-5 w-5 text-white" />}
      >
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </SectionPageLayout>
    );
  }

  return (
    <SectionPageLayout
      sectionNumber="08"
      sectionLabel="Capability"
      title="Capability Assessment"
      accentColor="#7c3aed"
      icon={<GraduationCap className="h-5 w-5 text-white" />}
      isLocked={isLocked}
      editedAfterClearing={isStale}
      upstreamStageLabel="Stage 5 (portfolio)"
      stageProgress={{
        stageNumber: 8,
        title: "Capability Assessment",
        description: "Assess organisational readiness across five dimensions and identify enablement actions.",
        isCleared: isConfirmed && !isStale,
        isEdited: hasAnyAssessed,
        canConfirm: hasAnyAssessed,
        isPending: confirmMutation.isPending,
        onConfirm: () => setConfirmDialogOpen(true),
        backRoute: "/strategy/reward-business-case",
        nextRoute: "/strategy/reward-outputs",
        nextLabel: "Stage 10: Outputs",
      }}
    >
      <div className="space-y-6">
        {/* Locked banner */}
        {isLocked && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Complete Stage 5 first</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Confirm your initiative portfolio before assessing capability requirements.
              </p>
            </div>
          </div>
        )}

        {/* Stale banner */}
        {isStale && !isLocked && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Portfolio changed</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your initiative portfolio has changed since you confirmed this stage. Review and re-confirm, or keep as-is.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => keepAsIsMutation.mutate()}
              disabled={keepAsIsMutation.isPending}
              className="flex-shrink-0"
            >
              Keep as-is
            </Button>
          </div>
        )}

        {/* E2: Custom initiative capability rating prompt */}
        {!isLocked && hasUnratedCustom && (
          <div className="rounded-xl border border-violet-500/40 bg-violet-500/5 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CircleDot className="w-5 h-5 text-violet-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Rate your custom initiatives</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your portfolio includes custom initiatives. Rate their capability demand so they are included in the required-level calculation.
                  Until rated, they default to <strong>medium</strong> on all dimensions.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {unratedCustom.map((ci) => (
                <div key={ci.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 flex-shrink-0">Custom</Badge>
                    <span className="text-sm font-medium truncate">{ci.title}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0 ml-2 gap-1.5"
                    onClick={() => openRatingDialog(ci)}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Rate demand
                  </Button>
                </div>
              ))}
            </div>
            {(customCapData ?? []).filter((ci) => ci.isRated).length > 0 && (
              <p className="text-xs text-muted-foreground">
                {(customCapData ?? []).filter((ci) => ci.isRated).length} of {(customCapData ?? []).length} rated.
              </p>
            )}
          </div>
        )}

        {/* Generate CTA */}
        {!isLocked && dimensions.length === 0 && (
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Generate capability assessment</p>
              <p className="text-xs text-muted-foreground mt-1">
                AI will analyse your portfolio and suggest gap statements and actions for each dimension.
                You review and adjust — nothing is auto-confirmed.
              </p>
            </div>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="gap-2"
            >
              {generateMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate assessment
            </Button>
          </div>
        )}

        {/* Regenerate button (when dimensions already exist) */}
        {!isLocked && dimensions.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {allAssessed ? "All dimensions assessed." : `${dimensions.filter((d) => d.currentLevel !== null).length} of ${dimensions.length} dimensions assessed.`}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="gap-2"
            >
              {generateMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Regenerate suggestions
            </Button>
          </div>
        )}

        {/* Dimension cards */}
        {dimensions.length > 0 && (
          <div className="space-y-3">
            {dimensions.map((dim) => (
              <DimensionCard
                key={dim.dimension}
                dim={dim}
                isLocked={isLocked}
                onSave={(updates) => handleSaveDimension(dim.dimension, updates)}
                isSaving={saveDimensionMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Sequencing flags panel */}
        {sequencingFlags.length > 0 && hasAnyAssessed && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold text-sm">Advisory sequencing</h3>
                <p className="text-xs text-muted-foreground">
                  Based on your capability assessment. These are advisory — you can proceed regardless.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {sequencingFlags.map((flag) => {
                const initiative = getRewardInitiative(flag.initiativeId);
                const cfg = SEQUENCING_CONFIG[flag.status];
                return (
                  <div key={flag.initiativeId} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <Badge variant="outline" className={`${cfg.badge} text-xs flex items-center gap-1 flex-shrink-0 mt-0.5`}>
                      {cfg.icon}{cfg.label}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{initiative?.title ?? flag.initiativeId}</p>
                      {flag.reason && (
                        <p className="text-xs text-muted-foreground mt-0.5">{flag.reason}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Enablement cost summary */}
        {enablementCost && hasAnyAssessed && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold text-sm">Enablement cost estimate</h3>
                <p className="text-xs text-muted-foreground">Indicative order-of-magnitude — not a project budget</p>
              </div>
            </div>
            {enablementCost.low === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                No additional enablement investment required
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{formatGbp(enablementCost.low)}</p>
                    <p className="text-xs text-muted-foreground">Low estimate</p>
                  </div>
                  <div className="text-muted-foreground">—</div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{formatGbp(enablementCost.high)}</p>
                    <p className="text-xs text-muted-foreground">High estimate</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{enablementCost.note}</p>
              </div>
            )}
          </div>
        )}

        {/* Significant gap warning */}
        {hasSignificantGaps && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-rose-700 dark:text-rose-300">Significant gaps identified</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                One or more dimensions have significant gaps. Review the sequencing flags above and ensure your action notes address these before confirming.
                You can still confirm — this is advisory.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* E2: Custom initiative rating dialog */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-500" />
              Rate capability demand
            </DialogTitle>
          </DialogHeader>
          {ratingTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Rate how demanding <strong>{ratingTarget.title}</strong> is on each capability dimension.
                This affects the required level calculation for your portfolio.
              </p>
              {([
                { key: "dataIntensity" as const, label: "Data intensity", description: "Volume and quality of data required" },
                { key: "changeImpact" as const, label: "Change impact", description: "Degree of organisational change involved" },
                { key: "integrationNeed" as const, label: "Integration need", description: "Systems and API integration complexity" },
                { key: "governanceSensitivity" as const, label: "Governance sensitivity", description: "Risk, compliance, and oversight requirements" },
              ] as const).map(({ key, label, description }) => (
                <div key={key} className="space-y-1.5">
                  <div>
                    <Label className="text-xs font-medium">{label}</Label>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Select
                    value={ratingValues[key]}
                    onValueChange={(v) => setRatingValues((prev) => ({ ...prev, [key]: v as "low" | "medium" | "high" }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => ratingTarget && rateCustomMutation.mutate({ id: ratingTarget.id, ...ratingValues })}
              disabled={rateCustomMutation.isPending || !ratingTarget}
              className="gap-2"
            >
              {rateCustomMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save ratings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm capability assessment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Confirming locks this assessment and feeds the sequencing flags and enablement cost into your Stage 10 output.
            </p>
            {hasSignificantGaps && (
              <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-3 text-rose-700 dark:text-rose-300 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                You have significant gaps. Consider reviewing action notes before confirming.
              </div>
            )}
            <p>You can re-confirm at any time if the portfolio changes.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="gap-2"
            >
              {confirmMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirm Stage 8
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionPageLayout>
  );
}
