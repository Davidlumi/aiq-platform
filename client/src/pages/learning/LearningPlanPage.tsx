import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { BookOpen, Play, CheckCircle2, Clock, Zap, RefreshCw, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MODALITY_COLORS: Record<string, string> = {
  microlearning: "bg-blue-100 text-blue-800",
  scenario: "bg-purple-100 text-purple-800",
  simulation: "bg-amber-100 text-amber-800",
  coach_prompt: "bg-emerald-100 text-emerald-800",
  video: "bg-red-100 text-red-800",
  article: "bg-slate-100 text-slate-800",
};

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
      <div className="p-6 space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-2">No active learning plan</p>
          <p className="text-muted-foreground text-sm mb-6">
            Complete an assessment first, or generate a learning plan based on your current profile.
          </p>
          <Button
            onClick={() => generateMutation.mutate({})}
            disabled={generateMutation.isPending}
            className="bg-accent hover:bg-accent/90 text-white gap-2"
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
  const total = items.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Learning Plan</h1>
          <p className="text-muted-foreground mt-1">
            Personalised learning path based on your capability assessment
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate({})}
          disabled={generateMutation.isPending}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", generateMutation.isPending && "animate-spin")} />
          Regenerate
        </Button>
      </div>

      {/* Progress summary */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Overall Progress</p>
              <p className="text-xs text-muted-foreground">{completed} of {total} modules completed</p>
            </div>
            <span className="text-2xl font-bold text-accent">{percent}%</span>
          </div>
          <Progress value={percent} className="h-3" />
        </CardContent>
      </Card>

      {/* Learning items */}
      <div className="space-y-3">
        {items.map((item: any, index: number) => {
          const isCompleted = item.status === "completed";
          const isInProgress = item.status === "in_progress";
          return (
            <Card
              key={item.id}
              className={cn(
                "transition-all",
                isCompleted ? "opacity-70" : "hover:shadow-sm"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Step indicator */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold",
                      isCompleted ? "bg-emerald-100 text-emerald-700" :
                      isInProgress ? "bg-accent/20 text-accent" :
                      "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {item.content?.title ?? "Learning Module"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {item.content?.description ?? item.rationale}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.content?.modality && (
                          <Badge className={cn("text-xs", MODALITY_COLORS[item.content.modality] ?? "bg-muted text-muted-foreground")}>
                            {item.content.modality.replace(/_/g, " ")}
                          </Badge>
                        )}
                        {item.content?.estimatedMinutes && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.content.estimatedMinutes}m
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      {!isCompleted && (
                        <Button
                          size="sm"
                          onClick={() =>
                            progressMutation.mutate({
                              contentItemId: item.contentItemId,
                              planItemId: item.id,
                              status: "completed",
                              progressPercent: 100,
                            })
                          }
                          disabled={progressMutation.isPending}
                          className={cn(
                            "gap-1 text-xs h-7",
                            isInProgress
                              ? "bg-accent hover:bg-accent/90 text-white"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          {isInProgress ? (
                            <><Play className="w-3 h-3" />Continue</>
                          ) : (
                            <><Play className="w-3 h-3" />Start</>
                          )}
                        </Button>
                      )}
                      {!isCompleted && !isInProgress && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                          progressMutation.mutate({
                          contentItemId: item.contentItemId,
                          planItemId: item.id,
                          status: "in_progress",
                          progressPercent: 0,
                        })
                          }
                          className="text-xs h-7"
                        >
                          Mark In Progress
                        </Button>
                      )}
                      {isCompleted && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
