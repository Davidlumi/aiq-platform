/**
 * v3 Change 7c — Personalisation Panel (complete implementation)
 *
 * Renders two warm, contextual sentences:
 *   1. Journey position: "You're 4 of 4 in your AI Change Leadership pathway at the Advanced stage."
 *   2. Strategy linkage: "This module supports your [initiative] initiative ([phase])."
 *
 * Visual treatment (Changes 7a + 7b):
 *   - No green border or green header icon
 *   - Subtle left accent line in neutral grey
 *   - Sentence-case copy, no ALL-CAPS label
 *   - Collapse toggle as small text link (not a button)
 *   - Preference persists via tRPC mutation
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

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

/** Build a warm journey sentence from the journeyPosition string returned by the server. */
function buildJourneySentence(journeyPosition: string | null | undefined): string | null {
  if (!journeyPosition) return null;
  // Server returns e.g. "Module 3 of 6 in Foundation — 2 completed so far"
  // We surface it as-is but could reformat if needed
  return journeyPosition;
}

/** Build a strategy linkage sentence. */
function buildStrategyLinkageSentence(
  strategyLinkage: { initiativeName: string; phase?: string | null; status?: string | null } | null | undefined
): string | null {
  if (!strategyLinkage?.initiativeName) return null;
  const parts: string[] = [`This module supports your ${strategyLinkage.initiativeName} initiative`];
  const meta: string[] = [];
  if (strategyLinkage.phase) meta.push(strategyLinkage.phase);
  if (strategyLinkage.status) meta.push(strategyLinkage.status);
  if (meta.length > 0) parts.push(` (${meta.join(", ")})`);
  return parts.join("") + ".";
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
      <div className={cn("pl-4 border-l-2 border-muted-foreground/15 py-1 animate-pulse", className)}>
        <div className="h-3 rounded bg-muted w-3/4 mb-1.5" />
        <div className="h-3 rounded bg-muted w-2/3" />
      </div>
    );
  }

  if (!ctx) return null;

  const journeySentence = buildJourneySentence(ctx.journeyPosition);
  const strategySentence = buildStrategyLinkageSentence(ctx.strategyLinkage as any);
  const priming = parsePrimingText((ctx as any).primingTextV2);

  // Only render if there's something meaningful to show
  if (!journeySentence && !strategySentence && !priming) return null;

  return (
    <div
      className={cn(
        "pl-4 border-l-2 border-muted-foreground/20 py-1 space-y-2",
        className
      )}
    >
      {/* Main context copy — two sentences */}
      {!collapsed && (
        <div className="space-y-1">
          {journeySentence && (
            <p className="text-sm text-foreground/70 leading-relaxed">{journeySentence}</p>
          )}
          {strategySentence && (
            <p className="text-sm text-foreground/70 leading-relaxed">{strategySentence}</p>
          )}

          {/* Priming text (optional, progressive disclosure) */}
          {priming && (
            <div className="pt-1 space-y-1.5">
              {priming.hook && (
                <p className="text-xs text-muted-foreground/80 italic leading-relaxed">"{priming.hook}"</p>
              )}
              {priming.hr_application && (
                <p className="text-xs text-muted-foreground/70 leading-relaxed">
                  <span className="font-medium">In practice: </span>
                  {priming.hr_application}
                </p>
              )}
              {priming.time_to_value && (
                <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
                  ✓ {priming.time_to_value}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Collapse toggle — small text link, not a button */}
      <button
        onClick={handleToggle}
        className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        aria-label={collapsed ? "Show learning context" : "Hide learning context"}
      >
        {collapsed ? "Show context" : "Hide"}
      </button>
    </div>
  );
}
