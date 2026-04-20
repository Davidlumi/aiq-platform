import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Play, CheckCircle2, Clock, AlertCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AssessmentPage() {
  const [, navigate] = useLocation();
  const { data: blueprints } = trpc.assessment.blueprints.useQuery();
  const { data: sessions, isLoading, refetch } = trpc.assessment.history.useQuery({});
  const startMutation = trpc.assessment.startSession.useMutation({
    onSuccess: (result) => {
      navigate(`/assessment/${result.sessionId}`);
    },
    onError: err => toast.error(err.message),
  });

  const handleStart = () => {
    const blueprintId = blueprints?.[0]?.id;
    if (!blueprintId) { toast.error("No assessment blueprint available"); return; }
    startMutation.mutate({ blueprintId });
  };

  const stateIcon = (state: string) => {
    switch (state) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "in_progress": return <Clock className="w-4 h-4 text-amber-500" />;
      default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const stateBadge = (state: string) => {
    const map: Record<string, string> = {
      completed: "bg-emerald-100 text-emerald-800",
      in_progress: "bg-amber-100 text-amber-800",
      abandoned: "bg-red-100 text-red-800",
    };
    return map[state] ?? "bg-muted text-muted-foreground";
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assessments</h1>
          <p className="text-muted-foreground mt-1">
            Adaptive capability assessments that measure your knowledge, confidence, and proficiency
          </p>
        </div>
        <Button
          onClick={handleStart}
          disabled={startMutation.isPending}
          className="bg-accent hover:bg-accent/90 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          {startMutation.isPending ? "Starting…" : "New Assessment"}
        </Button>
      </div>

      {/* Info card */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <ClipboardList className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Adaptive Assessment Engine</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Each assessment adapts to your responses in real time. Questions are sequenced based on your
              confidence level and time taken. Your credibility and risk scores are computed on completion.
            </p>
          </div>
        </div>
      </div>

      {/* Sessions list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : sessions && sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session: any) => (
            <Card key={session.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {stateIcon(session.state)}
                    <div>
                      <p className="text-sm font-semibold text-foreground capitalize">
                        Capability Assessment
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Started: {new Date(session.startedAt).toLocaleDateString()}
                        {session.completedAt && ` · Completed: ${new Date(session.completedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={cn("text-xs", stateBadge(session.state))}>
                      {session.state.replace(/_/g, " ")}
                    </Badge>
                    {session.state === "in_progress" && (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/assessment/${session.id}`)}
                        className="bg-accent hover:bg-accent/90 text-white gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Resume
                      </Button>
                    )}
                    {session.state === "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/assessment/${session.id}`)}
                      >
                        View Results
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground mb-2">No assessments yet</p>
          <p className="text-muted-foreground text-sm mb-6">
            Start your first assessment to establish your capability baseline
          </p>
          <Button
            onClick={handleStart}
            disabled={startMutation.isPending}
            className="bg-accent hover:bg-accent/90 text-white"
          >
            Start First Assessment
          </Button>
        </div>
      )}
    </div>
  );
}
