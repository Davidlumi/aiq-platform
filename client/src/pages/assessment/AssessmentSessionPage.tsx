import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Clock, ChevronRight, CheckCircle2, Award, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AssessmentSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, navigate] = useLocation();

  // We use the blueprint to get items to show
  const { data: sessionData, isLoading, refetch } = trpc.assessment.session.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  const { data: blueprintData } = trpc.assessment.blueprint.useQuery(
    { blueprintId: sessionData?.session?.blueprintId ?? "" },
    { enabled: !!sessionData?.session?.blueprintId }
  );

  const [selectedValue, setSelectedValue] = useState<string>("");
  const [freeText, setFreeText] = useState<string>("");
  const [confidence, setConfidence] = useState<number>(50);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [completed, setCompleted] = useState(false);
  const [completionResult, setCompletionResult] = useState<any>(null);

  const submitMutation = trpc.assessment.submitAnswer.useMutation({
    onSuccess: () => {
      setSelectedValue("");
      setFreeText("");
      setConfidence(50);
      setStartTime(Date.now());
      refetch();
    },
    onError: err => toast.error(err.message),
  });

  const completeMutation = trpc.assessment.completeSession.useMutation({
    onSuccess: (result) => {
      setCompleted(true);
      setCompletionResult(result);
      toast.success("Assessment completed!");
    },
    onError: err => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Session not found</p>
        <Button onClick={() => navigate("/assessment")} className="mt-4">Back to Assessments</Button>
      </div>
    );
  }

  const session = sessionData.session;
  const answers = sessionData.answers ?? [];
  const allItems = blueprintData?.items ?? [];
  const answeredItemIds = new Set(answers.map((a: any) => a.itemId));
  const unansweredItems = allItems.filter((item: any) => !answeredItemIds.has(item.id));
  const currentItem = unansweredItems[0] ?? null;
  const answeredCount = answers.length;
  const totalItems = allItems.length || 10;
  const progress = totalItems > 0 ? Math.round((answeredCount / totalItems) * 100) : 0;

  // Completed state
  if (completed || session.state === "completed") {
    const result = completionResult;
    return (
      <div className="p-6 space-y-6 max-w-3xl">
        <div className="text-center py-8">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Assessment Complete!</h1>
          <p className="text-muted-foreground mt-2">
            Your results have been calculated and your learning plan has been updated.
          </p>
        </div>

        {result && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Overall Score", value: `${Math.round(result.overallScore)}%`, icon: Award, color: "text-blue-600 bg-blue-50" },
              { label: "Credibility", value: result.credibilityBand, icon: Award, color: "text-emerald-600 bg-emerald-50" },
              { label: "Risk Level", value: result.riskBand, icon: Shield, color: "text-amber-600 bg-amber-50" },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={cn("rounded-xl p-4 text-center", item.color)}>
                  <Icon className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-xl font-bold capitalize">{item.value ?? "—"}</p>
                  <p className="text-xs font-medium mt-1">{item.label}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={() => navigate("/learning")} className="flex-1 bg-accent hover:bg-accent/90 text-white">
            View Learning Plan
          </Button>
          <Button onClick={() => navigate("/assessment")} variant="outline" className="flex-1">
            Back to Assessments
          </Button>
        </div>
      </div>
    );
  }

  // All answered — show complete button
  if (!currentItem && answeredCount > 0) {
    return (
      <div className="p-6 space-y-6 max-w-3xl">
        <div className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">All questions answered!</h2>
          <p className="text-muted-foreground mt-2">Click below to complete your assessment and calculate your scores.</p>
          <Button
            onClick={() => completeMutation.mutate({ sessionId: sessionId! })}
            disabled={completeMutation.isPending}
            className="mt-6 bg-accent hover:bg-accent/90 text-white"
          >
            {completeMutation.isPending ? "Calculating…" : "Complete Assessment"}
          </Button>
        </div>
      </div>
    );
  }

  // No items loaded yet
  if (!currentItem) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Loading assessment questions…</p>
      </div>
    );
  }

  const handleSubmit = () => {
    const timeTaken = Math.round((Date.now() - startTime));
    const val = currentItem.itemType === "free_text" ? null : selectedValue || null;
    const ft = currentItem.itemType === "free_text" ? freeText : undefined;
    if (!val && !ft) { toast.error("Please select or enter an answer"); return; }
    submitMutation.mutate({
      sessionId: sessionId!,
      itemId: currentItem.id,
      selectedValue: val,
      freeText: ft,
      confidenceScore: confidence / 100,
      timeToAnswerMs: timeTaken,
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">Capability Assessment</h1>
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Question {answeredCount + 1} of {totalItems}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground">{progress}% complete</p>
      </div>

      {/* Question card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs capitalize">
                    {currentItem.itemType?.replace(/_/g, " ") ?? "question"}
                  </Badge>
                {currentItem.difficulty && (
                  <Badge variant="outline" className="text-xs capitalize">
                    Level {currentItem.difficulty}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base font-medium leading-relaxed">
                {currentItem.prompt}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* MCQ options */}
          {currentItem.itemType !== "free_text" && currentItem.options && currentItem.options.length > 0 && (
            <RadioGroup value={selectedValue} onValueChange={setSelectedValue}>
              <div className="space-y-2">
                {currentItem.options.map((option: any) => (
                  <div
                    key={option.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedValue === option.value
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/50 hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedValue(option.value)}
                  >
                    <RadioGroupItem value={option.value} id={option.id} />
                    <Label htmlFor={option.id} className="cursor-pointer flex-1 text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {/* Free text */}
          {currentItem.itemType === "free_text" && (
            <Textarea
              placeholder="Enter your answer here…"
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              className="min-h-[120px]"
            />
          )}

          {/* Confidence slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Confidence Level</Label>
              <span className="text-sm font-semibold text-accent">{confidence}%</span>
            </div>
            <Slider
              value={[confidence]}
              onValueChange={([v]) => setConfidence(v)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Not confident</span>
              <span>Very confident</span>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || (!selectedValue && !freeText)}
            className="w-full bg-accent hover:bg-accent/90 text-white gap-2"
          >
            {submitMutation.isPending ? "Saving…" : "Next Question"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
