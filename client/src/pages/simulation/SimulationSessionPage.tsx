import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle2, ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SimulationSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, navigate] = useLocation();
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.simulation.session.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  const choiceMutation = trpc.simulation.makeChoice.useMutation({
    onSuccess: () => {
      setSelectedChoice(null);
      refetch();
    },
    onError: err => toast.error(err.message),
  });

  const completeMutation = trpc.simulation.completeSession.useMutation({
    onSuccess: () => {
      toast.success("Simulation completed!");
      refetch();
    },
    onError: err => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Session not found</p>
        <Button onClick={() => navigate("/simulation")} className="mt-4">Back to Simulations</Button>
      </div>
    );
  }

  const { session, currentNode, events } = data;

  if (session.state === "completed") {
    return (
      <div className="p-6 space-y-6 max-w-3xl">
        <div className="text-center py-8">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Simulation Complete!</h1>
          <p className="text-muted-foreground mt-2">
            You completed {events.filter((e: any) => e.eventType === "choice_made").length} decision points.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate("/simulation")} className="flex-1 bg-accent hover:bg-accent/90 text-white">
            Back to Simulations
          </Button>
          <Button onClick={() => navigate("/learning")} variant="outline" className="flex-1">
            View Learning Plan
          </Button>
        </div>
      </div>
    );
  }

  if (!currentNode) {
    return (
      <div className="p-6 space-y-6 max-w-3xl">
        <div className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold">All scenarios complete!</h2>
          <Button
            onClick={() => completeMutation.mutate({ sessionId: sessionId! })}
            disabled={completeMutation.isPending}
            className="mt-6 bg-accent hover:bg-accent/90 text-white"
          >
            {completeMutation.isPending ? "Finishing…" : "Complete Simulation"}
          </Button>
        </div>
      </div>
    );
  }

  const handleChoice = () => {
    if (!selectedChoice) return;
    choiceMutation.mutate({
      sessionId: sessionId!,
      nodeId: currentNode.id,
      choiceId: selectedChoice,
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/simulation")} className="gap-1">
          <ArrowLeft className="w-4 h-4" />
          Simulations
        </Button>
        <Badge variant="outline" className="text-xs">
          {events.filter((e: any) => e.eventType === "choice_made").length} decisions made
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{currentNode.nodeType === "end" ? "Conclusion" : "Scenario"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-foreground leading-relaxed">{currentNode.prompt}</p>

          {currentNode.choices && currentNode.choices.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Choose your response:</p>
              {currentNode.choices.map((choice: any) => (
                <div
                  key={choice.id}
                  onClick={() => setSelectedChoice(choice.id)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors text-sm",
                    selectedChoice === choice.id
                      ? "border-accent bg-accent/5 text-foreground"
                      : "border-border hover:border-accent/50 hover:bg-muted/50 text-foreground"
                  )}
                >
                  {choice.label}
                </div>
              ))}
              <Button
                onClick={handleChoice}
                disabled={!selectedChoice || choiceMutation.isPending}
                className="w-full bg-accent hover:bg-accent/90 text-white gap-2 mt-2"
              >
                {choiceMutation.isPending ? "Processing…" : "Confirm Choice"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => completeMutation.mutate({ sessionId: sessionId! })}
              disabled={completeMutation.isPending}
              className="w-full bg-accent hover:bg-accent/90 text-white"
            >
              {completeMutation.isPending ? "Finishing…" : "Complete Simulation"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
