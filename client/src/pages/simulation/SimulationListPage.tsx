import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Layers, Play, Clock, Award } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SimulationListPage() {
  const [, navigate] = useLocation();
  const { data: simulations, isLoading } = trpc.simulation.list.useQuery();
  const { data: history } = trpc.simulation.history.useQuery({});

  const startMutation = trpc.simulation.startSession.useMutation({
    onSuccess: (result) => {
      navigate(`/simulation/${result.sessionId}`);
    },
    onError: err => toast.error(err.message),
  });

  const completedIds = new Set((history ?? []).filter((h: any) => h.state === "completed").map((h: any) => h.simulationId));

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Simulations</h1>
        <p className="text-muted-foreground mt-1">
          Scenario-based simulations to practise real-world decision making
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : !simulations || simulations.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No simulations available yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {simulations.map((sim: any) => {
            const isDone = completedIds.has(sim.id);
            return (
              <Card key={sim.id} className="hover:shadow-sm transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{sim.title}</CardTitle>
                    {isDone && (
                      <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                        <Award className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">{sim.description}</p>
                  <div className="flex items-center gap-3">
                    {sim.estimatedMinutes && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ~{sim.estimatedMinutes} min
                      </span>
                    )}
                    {sim.difficulty && (
                      <Badge variant="outline" className="text-xs">
                        Level {sim.difficulty}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => startMutation.mutate({ simulationId: sim.id })}
                    disabled={startMutation.isPending}
                    className="w-full bg-accent hover:bg-accent/90 text-white gap-2"
                  >
                    <Play className="w-3 h-3" />
                    {isDone ? "Replay" : "Start Simulation"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
