/**
 * Learning Plan Page — AiQ Enterprise Platform
 *
 * Canonical learner view from the build bible:
 * - Active learning plan with why-assigned rationale per item
 * - Capability gap indicators showing which gap each module addresses
 * - Progress tracking with completion states
 * - ExplanationDrawer for plan generation logic
 * - Modality badges with brand colours
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ExplanationDrawer } from "@/components/ExplanationDrawer";
import { toast } from "sonner";
import {
  BookOpen,
  Play,
  CheckCircle2,
  Clock,
  Zap,
  RefreshCw,
  Info,
  ChevronRight,
  Target,
  Lightbulb,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Modality Config ──────────────────────────────────────────────────────────

const MODALITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  microlearning:    { label: "Micro",       color: "#3B4EFF", bg: "#3B4EFF12" },
  scenario:         { label: "Scenario",    color: "#AA3377", bg: "#AA337712" },
  simulation:       { label: "Simulation",  color: "#EE8866", bg: "#EE886612" },
  coach_prompt:     { label: "Coaching",    color: "#228833", bg: "#22883312" },
  video:            { label: "Video",       color: "#EE6677", bg: "#EE667712" },
  article:          { label: "Article",     color: "#66CCEE", bg: "#66CCEE12" },
  case_study:       { label: "Case Study",  color: "#AA3377", bg: "#AA337712" },
  reflective_prompt:{ label: "Reflection",  color: "#228833", bg: "#22883312" },
};

// ─── Capability Gap Badge ─────────────────────────────────────────────────────

const CAPABILITY_COLORS: Record<string, string> = {
  execution:          "#4477AA",
  prioritisation:     "#AA3377",
  validation:         "#228833",
  judgement:          "#EE6677",
  governance:         "#EE8866",
  appropriateness:    "#66CCEE",
  data_interpretation:"#BBBBBB",
};

function CapabilityBadge({ capability }: { capability: string }) {
  const color = CAPABILITY_COLORS[capability.toLowerCase()] ?? "#9CA3AF";
  const label = capability.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border"
      style={{ color, backgroundColor: `${color}12`, borderColor: `${color}30` }}
    >
      <Target className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

// ─── Learning Item Card ───────────────────────────────────────────────────────

function LearningItemCard({
  item,
  index,
  onStart,
  onComplete,
  isPending,
}: {
  item: any;
  index: number;
  onStart: () => void;
  onComplete: () => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = item.status === "completed";
  const isInProgress = item.status === "in_progress";

  const modality = item.content?.modality ?? "article";
  const modalityConfig = MODALITY_CONFIG[modality] ?? { label: modality, color: "#9CA3AF", bg: "#9CA3AF12" };

  // Parse capability from rationale or metadata
  const capability = item.content?.capabilityArea ?? item.content?.capability_area ?? "";

  return (
    <div
      className={cn(
        "border border-border rounded-xl bg-card transition-all duration-200",
        isCompleted && "opacity-60",
        !isCompleted && "hover:border-[#3B4EFF]/30 hover:shadow-sm"
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Step indicator */}
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5",
              isCompleted  ? "bg-[#228833]/12 text-[#228833]" :
              isInProgress ? "bg-[#3B4EFF]/12 text-[#3B4EFF]" :
                             "bg-muted text-muted-foreground"
            )}
          >
            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground leading-snug">
                {item.content?.title ?? "Learning Module"}
              </p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: modalityConfig.color, backgroundColor: modalityConfig.bg }}
                >
                  {modalityConfig.label}
                </span>
                {item.content?.estimatedMinutes && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.content.estimatedMinutes}m
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {item.content?.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {item.content.description}
              </p>
            )}

            {/* Capability badge + why-assigned */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {capability && <CapabilityBadge capability={capability} />}
              {item.rationale && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[#3B4EFF] transition-colors"
                >
                  <Lightbulb className="w-3 h-3" />
                  Why assigned
                  <ChevronRight className={cn("w-3 h-3 transition-transform", expanded && "rotate-90")} />
                </button>
              )}
            </div>

            {/* Why-assigned rationale (expanded) */}
            {expanded && item.rationale && (
              <div className="mt-2 p-2.5 rounded-lg bg-[#3B4EFF]/4 border border-[#3B4EFF]/15">
                <p className="text-xs text-foreground/80 leading-relaxed">{item.rationale}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              {isCompleted ? (
                <span className="text-xs text-[#228833] flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed
                </span>
              ) : isInProgress ? (
                <Button
                  size="sm"
                  onClick={onComplete}
                  disabled={isPending}
                  className="gap-1.5 text-xs h-7 bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white"
                >
                  <Play className="w-3 h-3" />
                  Continue
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onStart}
                  disabled={isPending}
                  className="gap-1.5 text-xs h-7 bg-muted text-muted-foreground hover:bg-[#3B4EFF]/10 hover:text-[#3B4EFF]"
                >
                  <Play className="w-3 h-3" />
                  Start
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LearningPlanPage() {
  const { data: plan, isLoading, refetch } = trpc.learning.activePlan.useQuery({});

  const generateMutation = trpc.learning.generatePlan.useMutation({
    onSuccess: () => {
      toast.success("Learning plan generated!");
      refetch();
    },
    onError: err => toast.error(err.message),
  });

  const progressMutation = trpc.learning.updateProgress.useMutation({
    onSuccess: () => refetch(),
    onError: err => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground font-sora">My Learning Plan</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            A personalised learning path based on your capability assessment
          </p>
        </div>
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl bg-muted/20">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-base font-semibold text-foreground mb-2">No active learning plan</p>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            Complete an assessment first to get a personalised plan, or generate one based on your current profile.
          </p>
          <Button
            onClick={() => generateMutation.mutate({})}
            disabled={generateMutation.isPending}
            className="bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white gap-2"
          >
            <Zap className="w-4 h-4" />
            {generateMutation.isPending ? "Generating…" : "Generate Learning Plan"}
          </Button>
        </div>
      </div>
    );
  }

  const items = plan.items ?? [];
  const completed = items.filter((i: any) => i.status === "completed").length;
  const inProgress = items.filter((i: any) => i.status === "in_progress").length;
  const total = items.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-sora">My Learning Plan</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {total} modules · {completed} completed · {inProgress} in progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExplanationDrawer
            trigger={
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 bg-card">
                <Info className="w-3.5 h-3.5" />
                How this plan was built
              </button>
            }
            title="How Your Learning Plan Was Built"
            subtitle="AiQ generates personalised plans based on your assessment results and role requirements"
          >
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Your learning plan is generated by analysing three inputs:</p>
              <ol className="space-y-2 list-decimal list-inside">
                <li><strong className="text-foreground">Assessment results</strong> — capability gaps identified from your most recent assessment</li>
                <li><strong className="text-foreground">Role requirements</strong> — the capability standards defined for your role and seniority level</li>
                <li><strong className="text-foreground">Policy restrictions</strong> — any active policy rules that require specific remediation content</li>
              </ol>
              <p>Each module is assigned a <em>rationale</em> explaining exactly which gap it addresses. Click "Why assigned" on any item to see this.</p>
            </div>
          </ExplanationDrawer>
          <Button
            onClick={() => generateMutation.mutate({})}
            disabled={generateMutation.isPending}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", generateMutation.isPending && "animate-spin")} />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Progress summary */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Overall Progress</p>
            <p className="text-xs text-muted-foreground">{completed} of {total} modules completed</p>
          </div>
          <span className="text-2xl font-bold text-[#3B4EFF]">{percent}%</span>
        </div>
        <Progress value={percent} className="h-2.5" />
        {inProgress > 0 && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-[#EE8866]" />
            {inProgress} module{inProgress > 1 ? "s" : ""} in progress
          </p>
        )}
      </div>

      {/* Learning items */}
      <div className="space-y-3">
        {items.map((item: any, index: number) => (
          <LearningItemCard
            key={item.id}
            item={item}
            index={index}
            isPending={progressMutation.isPending}
            onStart={() =>
              progressMutation.mutate({
                contentItemId: item.contentItemId,
                planItemId: item.id,
                status: "in_progress",
                progressPercent: 0,
              })
            }
            onComplete={() =>
              progressMutation.mutate({
                contentItemId: item.contentItemId,
                planItemId: item.id,
                status: "completed",
                progressPercent: 100,
              })
            }
          />
        ))}
      </div>
    </div>
  );
}
