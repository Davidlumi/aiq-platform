/**
 * v1.4 Change 1 — Visible Personalisation Panel
 *
 * Always-visible 2-line context block below the module header:
 *   Line 1: Journey position ("Module 3 of 6 in Foundation — 2 completed so far")
 *   Line 2: Strategy linkage ("Linked to: AI Recruitment Automation initiative (Q3)")
 *
 * If priming_text_v2 is available (Change 3), renders a structured hook/concepts/application block.
 * Collapse preference persists per user via tRPC mutation.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Sparkles, ChevronDown, ChevronUp, Target, MapPin, Lightbulb, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ModulePersonalisationPanelProps {
  moduleId: string;
  className?: string;
}

interface PrimingTextV2 {
  hook: string;
  key_concepts: string[];
  hr_application: string;
  time_to_value: string;
}

function parsePrimingText(raw: string | null | undefined): PrimingTextV2 | null {
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed?.hook && Array.isArray(parsed?.key_concepts)) return parsed as PrimingTextV2;
    return null;
  } catch {
    return null;
  }
}

export default function ModulePersonalisationPanel({ moduleId, className }: ModulePersonalisationPanelProps) {
  const { data: ctx, isLoading } = trpc.adaptiveLearning.getJourneyContext.useQuery(
    { moduleId },
    { enabled: !!moduleId, staleTime: 1000 * 60 * 5 }
  );

  const [collapsed, setCollapsed] = useState(false);
  const setCollapsedMutation = trpc.adaptiveLearning.setPersonalisationCollapsed.useMutation();

  // Sync initial collapse state from server preference
  useEffect(() => {
    if (ctx !== undefined && ctx !== null) {
      setCollapsed(ctx.collapsed ?? false);
    }
  }, [ctx?.collapsed]);

  const handleToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    setCollapsedMutation.mutate({ collapsed: next });
  };

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-border bg-muted/10 px-4 py-3 animate-pulse", className)}>
        <div className="h-3 rounded bg-muted w-2/3 mb-2" />
        <div className="h-3 rounded bg-muted w-1/2" />
      </div>
    );
  }

  if (!ctx) return null;

  const hasStrategyLinkage = !!ctx.strategyLinkage;
  const hasJourneyPosition = !!ctx.journeyPosition;
  const priming = parsePrimingText((ctx as any).primingTextV2);

  if (!hasJourneyPosition && !hasStrategyLinkage && !priming) return null;

  return (
    <div className={cn("rounded-xl border border-primary/20 bg-primary/5 overflow-hidden", className)}>
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        <span className="text-xs font-semibold text-primary flex-1">Your learning context</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
          onClick={handleToggle}
          aria-label={collapsed ? "Expand personalisation panel" : "Collapse personalisation panel"}
        >
          {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Content — collapses */}
      {!collapsed && (
        <div className="px-4 pb-3 space-y-3 border-t border-primary/10">
          {/* Journey position + strategy linkage */}
          {(hasJourneyPosition || hasStrategyLinkage) && (
            <div className="space-y-1.5 pt-2">
              {hasJourneyPosition && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-3 w-3 text-primary/70 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground/80 leading-relaxed">{ctx.journeyPosition}</p>
                </div>
              )}
              {hasStrategyLinkage && ctx.strategyLinkage && (
                <div className="flex items-start gap-2">
                  <Target className="h-3 w-3 text-primary/70 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    Linked to: <span className="font-medium text-primary">{ctx.strategyLinkage.initiativeName}</span>
                    {ctx.strategyLinkage.phase && (
                      <span className="text-muted-foreground"> ({ctx.strategyLinkage.phase})</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* priming_text_v2 structured block (Change 3) */}
          {priming && (
            <div className="space-y-2.5 pt-1 border-t border-primary/10">
              {/* Hook */}
              <div className="flex items-start gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-medium text-foreground/90 leading-relaxed italic">"{priming.hook}"</p>
              </div>

              {/* Key concepts */}
              {priming.key_concepts?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {priming.key_concepts.map((concept, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20 font-normal"
                    >
                      {concept}
                    </Badge>
                  ))}
                </div>
              )}

              {/* HR application */}
              {priming.hr_application && (
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-3 w-3 text-primary/70 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground/70 leading-relaxed">
                    <span className="font-medium text-foreground/80">In practice: </span>
                    {priming.hr_application}
                  </p>
                </div>
              )}

              {/* Time to value */}
              {priming.time_to_value && (
                <p className="text-[10px] text-muted-foreground leading-relaxed pl-5">
                  ✓ {priming.time_to_value}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
