import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, ArrowLeft, ChevronRight,
  AlertTriangle, TrendingUp, TrendingDown, Info, Lightbulb, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

function ConsequencePanel({ consequence, scoreDelta, riskDelta, onContinue }: {
  consequence: string; scoreDelta: number; riskDelta: number; onContinue: () => void;
}) {
  const isPos = scoreDelta > 0;
  const isNeg = scoreDelta < 0;
  return (
    <div className={cn("rounded-xl border-2 p-5 space-y-4",
      isPos ? "border-[#228833] bg-[#22883308]" : isNeg ? "border-[#EE6677] bg-[#EE667708]" : "border-[#EE8866] bg-[#EE886608]")}>
      <div className="flex items-start gap-3">
        {isPos ? <CheckCircle2 className="w-5 h-5 text-[#228833] mt-0.5 shrink-0" />
          : isNeg ? <XCircle className="w-5 h-5 text-[#EE6677] mt-0.5 shrink-0" />
          : <AlertTriangle className="w-5 h-5 text-[#EE8866] mt-0.5 shrink-0" />}
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">
            {isPos ? "Good decision" : isNeg ? "Poor decision" : "Partial credit"}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">{consequence}</p>
        </div>
      </div>
      <div className="flex gap-4 pt-1">
        <div className="flex items-center gap-1.5">
          {scoreDelta >= 0 ? <TrendingUp className="w-4 h-4 text-[#228833]" /> : <TrendingDown className="w-4 h-4 text-[#EE6677]" />}
          <span className={cn("text-sm font-semibold", scoreDelta >= 0 ? "text-[#228833]" : "text-[#EE6677]")}>
            {scoreDelta >= 0 ? "+" : ""}{scoreDelta} score
          </span>
        </div>
        {riskDelta !== 0 && (
          <div className="flex items-center gap-1.5">
            {riskDelta <= 0 ? <TrendingDown className="w-4 h-4 text-[#228833]" /> : <TrendingUp className="w-4 h-4 text-[#EE6677]" />}
            <span className={cn("text-sm font-semibold", riskDelta <= 0 ? "text-[#228833]" : "text-[#EE6677]")}>
              {riskDelta >= 0 ? "+" : ""}{riskDelta} risk
            </span>
          </div>
        )}
      </div>
      <Button onClick={onContinue} className="w-full bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white gap-2">
        Continue <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function ScoreTracker({ events }: { events: any[] }) {
  const choices = events.filter((e: any) => e.eventType === "choice_made");
  const total = choices.reduce((s: number, e: any) => {
    try { return s + (JSON.parse(e.metadataJson || "{}").scoreDelta ?? 0); } catch { return s; }
  }, 0);
  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-[#3B4EFF]" />
        <span className="text-muted-foreground">{choices.length} decisions</span>
      </div>
      <div className="flex items-center gap-1.5">
        {total >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-[#228833]" /> : <TrendingDown className="w-3.5 h-3.5 text-[#EE6677]" />}
        <span className={cn("font-semibold", total >= 0 ? "text-[#228833]" : "text-[#EE6677]")}>
          {total >= 0 ? "+" : ""}{total}
        </span>
      </div>
    </div>
  );
}

function CompletionScreen({ session, events, onBack, onLearning }: {
  session: any; events: any[]; onBack: () => void; onLearning: () => void;
}) {
  const isPassed = session.state === "passed";
  const choices = events.filter((e: any) => e.eventType === "choice_made");
  const total = choices.reduce((s: number, e: any) => {
    try { return s + (JSON.parse(e.metadataJson || "{}").scoreDelta ?? 0); } catch { return s; }
  }, 0);
  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="text-center py-8 space-y-3">
        {isPassed ? <CheckCircle2 className="w-16 h-16 mx-auto text-[#228833]" /> : <XCircle className="w-16 h-16 mx-auto text-[#EE6677]" />}
        <h1 className="text-2xl font-bold text-foreground font-sora">{isPassed ? "Simulation Passed" : "Simulation Failed"}</h1>
        <p className="text-muted-foreground">
          {isPassed ? "You demonstrated appropriate judgement and policy compliance throughout this scenario."
            : "Review the learning materials and try again to improve your decision-making."}
        </p>
      </div>
      <Card className="border-border">
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{choices.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Decisions Made</p>
            </div>
            <div className="text-center">
              <p className={cn("text-3xl font-bold", total >= 0 ? "text-[#228833]" : "text-[#EE6677]")}>{total >= 0 ? "+" : ""}{total}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Score</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {choices.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-sora">Decision History</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2">
            {choices.map((e: any, i: number) => {
              let meta: any = {};
              try { meta = JSON.parse(e.metadataJson || "{}"); } catch {}
              return (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-white",
                    (meta.scoreDelta ?? 0) >= 0 ? "bg-[#228833]" : "bg-[#EE6677]")}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground">{meta.choiceLabel ?? `Decision ${i + 1}`}</p>
                    {meta.scoreDelta !== undefined && (
                      <p className={cn("text-xs font-semibold mt-0.5", meta.scoreDelta >= 0 ? "text-[#228833]" : "text-[#EE6677]")}>
                        {meta.scoreDelta >= 0 ? "+" : ""}{meta.scoreDelta}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      <div className="flex gap-3">
        <Button onClick={onBack} className="flex-1 bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white">Back to Simulations</Button>
        <Button onClick={onLearning} variant="outline" className="flex-1 gap-2"><BookOpen className="w-4 h-4" /> Learning Plan</Button>
      </div>
    </div>
  );
}

export default function SimulationSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, navigate] = useLocation();
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [lastConsequence, setLastConsequence] = useState<{ text: string; scoreDelta: number; riskDelta: number } | null>(null);

  const { data, isLoading, refetch } = trpc.simulation.session.useQuery(
    { sessionId: sessionId! }, { enabled: !!sessionId }
  );

  const choiceMutation = trpc.simulation.makeChoice.useMutation({
    onSuccess: (result: any) => {
      if (result?.consequence) {
        setLastConsequence({ text: result.consequence, scoreDelta: result.scoreDelta ?? 0, riskDelta: result.riskDelta ?? 0 });
      } else {
        setSelectedChoice(null);
        refetch();
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const completeMutation = trpc.simulation.completeSession.useMutation({
    onSuccess: () => { toast.success("Simulation submitted!"); refetch(); },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return (
    <div className="p-6 space-y-4 max-w-3xl">
      <Skeleton className="h-8 w-48" /><Skeleton className="h-64" /><Skeleton className="h-32" />
    </div>
  );

  if (!data) return (
    <div className="p-6 text-center space-y-4">
      <p className="text-muted-foreground">Session not found.</p>
      <Button onClick={() => navigate("/simulations")}>Back to Simulations</Button>
    </div>
  );

  const { session, currentNode, events } = data;

  if (session.state === "completed" || session.state === "passed" || session.state === "failed") {
    return <CompletionScreen session={session} events={events} onBack={() => navigate("/simulations")} onLearning={() => navigate("/learning")} />;
  }

  if (lastConsequence) {
    return (
      <div className="p-6 space-y-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/simulations")} className="gap-1 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Simulations
        </Button>
        <ConsequencePanel consequence={lastConsequence.text} scoreDelta={lastConsequence.scoreDelta} riskDelta={lastConsequence.riskDelta}
          onContinue={() => { setLastConsequence(null); setSelectedChoice(null); refetch(); }} />
      </div>
    );
  }

  if (!currentNode) {
    return (
      <div className="p-6 space-y-6 max-w-3xl">
        <div className="text-center py-8 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-[#228833] mx-auto" />
          <h2 className="text-xl font-bold font-sora">All scenarios complete</h2>
          <p className="text-muted-foreground text-sm">Submit your simulation to receive your score.</p>
          <Button onClick={() => completeMutation.mutate({ sessionId: sessionId! })} disabled={completeMutation.isPending}
            className="mt-4 bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white">
            {completeMutation.isPending ? "Submitting…" : "Submit Simulation"}
          </Button>
        </div>
      </div>
    );
  }

  const ctx: Record<string, any> = (currentNode.contextJson && typeof currentNode.contextJson === "object" ? currentNode.contextJson : {}) as Record<string, any>;

  const negativeChoices = events.filter((e: any) => {
    try { return e.eventType === "choice_made" && JSON.parse(e.metadataJson || "{}").scoreDelta < 0; } catch { return false; }
  });

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/simulations")} className="gap-1 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Simulations
        </Button>
        <ScoreTracker events={events} />
      </div>

      {(ctx.setting || ctx.capability) && (
        <div className="flex flex-wrap gap-2">
          {ctx.setting && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground">
              <Info className="w-3 h-3" />{ctx.setting}
            </div>
          )}
          {ctx.capability && <Badge variant="outline" className="text-xs capitalize">{ctx.capability}</Badge>}
          {ctx.stakes && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700">
              <AlertTriangle className="w-3 h-3" />{ctx.stakes}
            </div>
          )}
        </div>
      )}

      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#3B4EFF] flex items-center justify-center text-white text-xs font-bold">
              {events.filter((e: any) => e.eventType === "choice_made").length + 1}
            </div>
            <CardTitle className="text-sm font-sora text-muted-foreground">Scenario</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-base text-foreground leading-relaxed font-medium">{currentNode.prompt}</p>
          {currentNode.choices && currentNode.choices.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Choose your response:</p>
              {currentNode.choices.map((choice: any, idx: number) => (
                <button key={choice.id} onClick={() => setSelectedChoice(choice.id)}
                  className={cn("w-full text-left p-4 rounded-xl border-2 transition-all text-sm leading-relaxed",
                    selectedChoice === choice.id
                      ? "border-[#3B4EFF] bg-[#3B4EFF08] text-foreground"
                      : "border-border hover:border-[#3B4EFF]/40 hover:bg-muted/40 text-foreground")}>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-current text-xs font-bold mr-2.5 shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {choice.label}
                </button>
              ))}
              <Button
                onClick={() => { if (selectedChoice && sessionId) choiceMutation.mutate({ sessionId: sessionId, nodeId: currentNode.id, choiceId: selectedChoice }); }}
                disabled={!selectedChoice || choiceMutation.isPending}
                className="w-full bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white gap-2 mt-1">
                {choiceMutation.isPending ? "Processing…" : "Confirm Choice"} <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={() => completeMutation.mutate({ sessionId: sessionId! })} disabled={completeMutation.isPending}
              className="w-full bg-[#3B4EFF] hover:bg-[#3B4EFF]/90 text-white">
              {completeMutation.isPending ? "Submitting…" : "Submit Simulation"}
            </Button>
          )}
        </CardContent>
      </Card>

      {negativeChoices.length >= 2 && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            <span className="font-semibold">Guided mode active.</span> Consider the policy implications carefully before making your next decision.
          </p>
        </div>
      )}
    </div>
  );
}
