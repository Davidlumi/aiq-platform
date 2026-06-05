/**
 * StrategyStrategyPage — Stage 3 of the v3 strategy flow.
 *
 * Allows the CPO to:
 *   1. Select a strategy archetype (5 cards: Augmentation / Transformation /
 *      Differentiation / Efficiency / Defensive)
 *   2. View auto-drafted strategy statement (LLM-generated from archetype + vision)
 *   3. Edit and refine using AITextActions
 *   4. Confirm to clear Stage 3 gate
 *
 * Gate behaviour:
 *   - Requires Stage 2 (vision) to be cleared
 *   - Confirmation requires archetype selected AND ≥ 15 words in statement
 *   - Editing after confirmation marks stage as edited
 */
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGate } from "@/contexts/GateContext";
import { AITextActions } from "@/components/AITextActions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2, ChevronRight, Lock, Sparkles, RefreshCw,
  ArrowRight, AlertTriangle, Zap, TrendingUp, Target,
  ShieldCheck, Cpu,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import StageProgressHeader from "@/components/StageProgressHeader";

// ─── Archetype definitions ────────────────────────────────────────────────────
type ArchetypeKey = "augmentation" | "transformation" | "differentiation" | "efficiency" | "defensive";

const ARCHETYPES: Array<{
  key: ArchetypeKey;
  label: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  colour: string;
}> = [
  {
    key: "augmentation",
    label: "AI supports our people",
    tagline: "Humans stay in charge — AI helps them decide better",
    description:
      "Your HR team uses AI to make faster, better-informed decisions, but a person is always responsible for the outcome. The right choice if you work in a regulated industry or your organisation needs to build trust in AI before going further.",
    icon: <Cpu className="h-5 w-5" />,
    colour: "border-blue-500/40 hover:border-blue-500/70",
  },
  {
    key: "transformation",
    label: "AI changes how HR works",
    tagline: "HR leads a fundamental shift in how the function operates",
    description:
      "AI doesn't just assist — it changes the way HR is structured, how roles are defined, and how the function delivers value. HR takes the lead on AI adoption across the business. This needs strong leadership buy-in and a team ready for significant change.",
    icon: <TrendingUp className="h-5 w-5" />,
    colour: "border-violet-500/40 hover:border-violet-500/70",
  },
  {
    key: "differentiation",
    label: "AI sets us apart as an employer",
    tagline: "Use AI to build an employee experience competitors can't match",
    description:
      "AI helps you create a workplace, talent brand, or people capability that is genuinely hard for rivals to copy. The right choice if you compete for talent in a tight market and want to stand out.",
    icon: <Target className="h-5 w-5" />,
    colour: "border-emerald-500/40 hover:border-emerald-500/70",
  },
  {
    key: "efficiency",
    label: "AI cuts cost and admin",
    tagline: "Automate the routine so HR can focus on what matters",
    description:
      "AI takes on repetitive HR tasks — reducing paperwork, speeding up processes, and freeing your team for higher-value work. Practical and easy to measure. The right choice if reducing cost or headcount pressure is the main driver.",
    icon: <Zap className="h-5 w-5" />,
    colour: "border-amber-500/40 hover:border-amber-500/70",
  },
  {
    key: "defensive",
    label: "AI keeps us safe and compliant",
    tagline: "Reduce legal, regulatory, and reputational risk",
    description:
      "AI is used mainly to protect the organisation — checking for bias, maintaining audit trails, and ensuring you meet legal and regulatory requirements. Building capability comes second to managing risk.",
    icon: <ShieldCheck className="h-5 w-5" />,
    colour: "border-rose-500/40 hover:border-rose-500/70",
  },
];

// ─── Word count helper ────────────────────────────────────────────────────────
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Gate banner ──────────────────────────────────────────────────────────────
function GateBanner({ type }: { type: "locked" | "cleared" | "edited" }) {
  if (type === "locked") {
    return (
      <Alert className="border-amber-500/40 bg-amber-500/5">
        <Lock className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
          Confirm your vision (Stage 2) before choosing your strategy archetype.
        </AlertDescription>
      </Alert>
    );
  }
  if (type === "cleared") {
    return (
      <Alert className="border-green-500/40 bg-green-500/5">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertDescription className="text-sm text-green-700 dark:text-green-400">
          Strategy confirmed. Stage 4 (Principles) is now unlocked.
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert className="border-amber-500/40 bg-amber-500/5">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
        You've edited your strategy since confirming it. Re-confirm to update Stage 4.
      </AlertDescription>
    </Alert>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StrategyStrategyPage() {
  const [, navigate] = useLocation();
  const gate = useGate();

  const [selectedArchetype, setSelectedArchetype] = useState<ArchetypeKey | null>(null);
  const [strategyStatement, setStrategyStatement] = useState("");
  const [hasEdited, setHasEdited] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);

  // Gate redirect — if Stage 2 is not cleared, this page is inaccessible
  useEffect(() => {
    if (gate.isLoading) return;
    if (!gate.isStage3Accessible) {
      // Stage 2 not yet cleared — redirect to Vision (or Overview if Stage 1 not done)
      navigate(gate.isStage2Accessible ? "/strategy/vision" : "/strategy");
    }
  }, [gate.isLoading, gate.isStage3Accessible, gate.isStage2Accessible, navigate]);

  // Load existing values from gate state
  useEffect(() => {
    if (gate.strategyArchetype && !hasEdited) {
      setSelectedArchetype(gate.strategyArchetype as ArchetypeKey);
    }
    if (gate.strategyStatement && !hasEdited) {
      setStrategyStatement(gate.strategyStatement);
    }
  }, [gate.strategyArchetype, gate.strategyStatement, hasEdited]);

  // Auto-draft mutation
  const draftStatement = trpc.gate.draftStrategyStatement.useMutation({
    onSuccess: (data) => {
      setStrategyStatement(data.statement);
      setIsDrafting(false);
    },
    onError: (err) => {
      toast.error(`Draft failed: ${err.message}`);
      setIsDrafting(false);
    },
  });

  // Complete stage 3 mutation
  const completeStage3 = trpc.gate.completeStage3.useMutation({
    onSuccess: () => {
      gate.refetch();
      toast.success("Strategy confirmed — Stage 4 unlocked.");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Mark edited mutation
  const markEdited = trpc.gate.markEdited.useMutation({
    onSuccess: () => gate.refetch(),
  });

  const handleArchetypeSelect = (key: ArchetypeKey) => {
    setSelectedArchetype(key);
    setHasEdited(true);
    if (gate.stage3Cleared) {
      markEdited.mutate({ stage: "stage3" });
    }
    // Auto-draft if no statement yet or statement was AI-generated
    if (!strategyStatement.trim() || !hasEdited) {
      setIsDrafting(true);
      draftStatement.mutate({
        archetype: key,
        visionStatement: gate.visionStatement ?? undefined,
      });
    }
  };

  const handleStatementChange = useCallback((value: string) => {
    setStrategyStatement(value);
    setHasEdited(true);
    if (gate.stage3Cleared) {
      markEdited.mutate({ stage: "stage3" });
    }
  }, [gate.stage3Cleared, markEdited]);

  const handleDraftFromArchetype = () => {
    if (!selectedArchetype) return;
    setIsDrafting(true);
    draftStatement.mutate({
      archetype: selectedArchetype,
      visionStatement: gate.visionStatement ?? undefined,
    });
  };

  const handleConfirm = () => {
    if (!selectedArchetype) return;
    completeStage3.mutate({
      strategyArchetype: selectedArchetype,
      strategyStatement,
    });
  };

  const wordCount = countWords(strategyStatement);
  const canConfirm = !!selectedArchetype && wordCount >= 15 && !completeStage3.isPending;
  const isLocked = !gate.isStage3Accessible;

  const bannerType = isLocked
    ? "locked"
    : gate.stage3EditedAfterClearing
    ? "edited"
    : gate.stage3Cleared
    ? "cleared"
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Stage progress header */}
      {!isLocked && (
        <StageProgressHeader
          stageNumber={3}
          title="Strategy Archetype"
          description="Choose your AI strategy archetype, review the AI-drafted strategy statement, refine it, then confirm to unlock Stage 4: Principles."
          isCleared={!!gate.stage3Cleared}
          isEdited={!!gate.stage3EditedAfterClearing}
          canConfirm={canConfirm}
          isPending={completeStage3.isPending}
          onConfirm={() => gate.stage3Cleared && !gate.stage3EditedAfterClearing ? navigate("/strategy/principles") : handleConfirm()}
          backRoute="/strategy/vision"
          nextRoute="/strategy/principles"
          nextLabel="Principles"
        />
      )}

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className="hover:text-foreground cursor-pointer"
            onClick={() => navigate("/strategy")}
          >
            Strategy
          </span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span
            className="hover:text-foreground cursor-pointer"
            onClick={() => navigate("/strategy/vision")}
          >
            Vision
          </span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Stage 3 — Strategy</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Your HR AI Strategy</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Choose the strategic archetype that best describes how AI will create value in your HR
          function. This shapes how the engine selects and prioritises initiatives.
        </p>
      </div>

      {/* Gate banner */}
      {bannerType && <GateBanner type={bannerType} />}

      {/* Vision context */}
      {gate.visionStatement && (
        <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Your vision</p>
          <p className="text-sm italic text-foreground/80">"{gate.visionStatement}"</p>
        </div>
      )}

      {/* Archetype cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium">Choose your archetype</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ARCHETYPES.map((arch) => {
            const isSelected = selectedArchetype === arch.key;
            return (
              <button
                key={arch.key}
                type="button"
                disabled={isLocked}
                onClick={() => handleArchetypeSelect(arch.key)}
                className={cn(
                  "text-left rounded-lg border-2 p-4 transition-all space-y-2",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : cn("border-border/60 bg-card", arch.colour),
                  isLocked && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className={cn("p-1.5 rounded-md", isSelected ? "text-primary" : "text-muted-foreground")}>
                    {arch.icon}
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{arch.label}</p>
                  <p className="text-xs text-muted-foreground">{arch.tagline}</p>
                </div>
                <p className="text-xs text-muted-foreground/80 leading-relaxed">
                  {arch.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Strategy statement editor */}
      {selectedArchetype && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Strategy statement</h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleDraftFromArchetype}
              disabled={isDrafting || isLocked}
            >
              <Sparkles className={cn("h-3.5 w-3.5", isDrafting && "animate-pulse")} />
              {isDrafting ? "Drafting…" : "Re-draft with AI"}
            </Button>
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              {isDrafting ? (
                <div className="min-h-[120px] flex items-center justify-center">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Drafting strategy statement…
                  </div>
                </div>
              ) : (
                <Textarea
                  value={strategyStatement}
                  onChange={(e) => handleStatementChange(e.target.value)}
                  placeholder="Describe how AI will create value in your HR function…"
                  className="min-h-[120px] resize-none text-sm leading-relaxed"
                  disabled={isLocked}
                />
              )}

              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs",
                    wordCount < 15 ? "text-muted-foreground" : "text-green-600 dark:text-green-400"
                  )}
                >
                  {wordCount} word{wordCount !== 1 ? "s" : ""}
                  {wordCount < 15 && " (minimum 15)"}
                </span>

                {!isLocked && strategyStatement.trim().length > 0 && (
                  <AITextActions
                    text={strategyStatement}
                    context={{
                      stage: "strategy_statement",
                      orgContext: {
                        strategyArchetype: selectedArchetype,
                        visionStatement: gate.visionStatement ?? undefined,
                      },
                    }}
                    onResult={(newText) => {
                      setStrategyStatement(newText);
                      setHasEdited(true);
                    }}
                    showLabels
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm + continue */}
      <div className="flex items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  onClick={handleConfirm}
                  disabled={!canConfirm || isLocked}
                  className="gap-2"
                >
                  {completeStage3.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {gate.stage3Cleared ? "Re-confirm strategy" : "Confirm strategy"}
                </Button>
              </span>
            </TooltipTrigger>
            {!canConfirm && !isLocked && (
              <TooltipContent>
                {!selectedArchetype
                  ? "Select an archetype first"
                  : wordCount < 15
                  ? `Add ${15 - wordCount} more word${15 - wordCount !== 1 ? "s" : ""} to confirm`
                  : "Strategy is ready to confirm"}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {gate.stage3Cleared && !gate.stage3EditedAfterClearing && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate("/strategy/principles")}
          >
            Continue to Principles
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
