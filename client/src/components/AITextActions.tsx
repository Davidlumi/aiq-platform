/**
 * AITextActions — Reusable inline AI action buttons for text fields.
 *
 * Renders a compact toolbar with Expand / Refine / Challenge / Suggest buttons.
 * - Expand / Refine / Suggest: call `intelligence.transformText` and replace text.
 * - Challenge: calls `intelligence.transformText` with action="challenge" and renders
 *   the result as a callout (questions/provocations), NOT auto-replacing the text.
 *   The user can dismiss the callout or copy questions manually.
 * - 20-second client-side timeout: if the mutation hasn't resolved, shows a toast
 *   and cancels the pending state.
 *
 * Usage:
 *   <AITextActions
 *     text={visionStatement}
 *     context={{ stage: "vision", orgContext: { sector, headcount } }}
 *     onResult={(newText) => setVisionStatement(newText)}
 *     disabled={isLoading}
 *   />
 */
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Maximize2, Sparkles, MessageSquareWarning, Wand2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type AITextActionType = "expand" | "refine" | "challenge" | "suggest";

export type AITextActionsContext = {
  /** Which stage/field this text belongs to — used for prompt context */
  stage: "vision" | "strategy_statement" | "principle" | "wont_do" | "general";
  /** Optional org context for richer prompts */
  orgContext?: {
    sector?: string;
    headcount?: number;
    strategyArchetype?: string;
    visionStatement?: string;
  };
  /** Optional additional context string */
  additionalContext?: string;
};

type AITextActionsProps = {
  text: string;
  context: AITextActionsContext;
  onResult: (newText: string) => void;
  disabled?: boolean;
  /** Which actions to show. Defaults to all four. */
  actions?: AITextActionType[];
  className?: string;
  /** Show labels next to icons (default: false — icons only) */
  showLabels?: boolean;
};

const ACTION_CONFIG: Record<
  AITextActionType,
  { label: string; tooltip: string; icon: React.ReactNode }
> = {
  expand: {
    label: "Expand",
    tooltip: "Expand — add more detail and specificity",
    icon: <Maximize2 className="h-3.5 w-3.5" />,
  },
  refine: {
    label: "Refine",
    tooltip: "Refine — sharpen the language and remove vagueness",
    icon: <Wand2 className="h-3.5 w-3.5" />,
  },
  challenge: {
    label: "Challenge",
    tooltip: "Challenge — surface probing questions to stress-test your thinking",
    icon: <MessageSquareWarning className="h-3.5 w-3.5" />,
  },
  suggest: {
    label: "Suggest",
    tooltip: "Suggest — generate a fresh alternative",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
};

const TIMEOUT_MS = 20_000;

export function AITextActions({
  text,
  context,
  onResult,
  disabled = false,
  actions = ["expand", "refine", "challenge", "suggest"],
  className,
  showLabels = false,
}: AITextActionsProps) {
  const [activeAction, setActiveAction] = useState<AITextActionType | null>(null);
  /** Challenge callout — shown instead of replacing text */
  const [challengeCallout, setChallengeCallout] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const clearPendingTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const transformMutation = trpc.intelligence.transformText.useMutation({
    onSuccess: (data, variables) => {
      clearPendingTimeout();
      if (variables.action === "challenge") {
        // Challenge: show as callout, do NOT replace text
        setChallengeCallout(data.text);
      } else {
        onResult(data.text);
      }
      setActiveAction(null);
    },
    onError: (err) => {
      clearPendingTimeout();
      toast.error(`AI action failed: ${err.message}`);
      setActiveAction(null);
    },
  });

  const handleAction = (action: AITextActionType) => {
    if (!text.trim()) {
      toast.error("Please enter some text first before using AI actions.");
      return;
    }
    // Dismiss any existing challenge callout when starting a new action
    setChallengeCallout(null);
    setActiveAction(action);

    // 20-second client-side timeout
    timeoutRef.current = setTimeout(() => {
      setActiveAction(null);
      toast.error("AI action timed out — please try again.");
    }, TIMEOUT_MS);

    transformMutation.mutate({
      text,
      action,
      stage: context.stage,
      orgContext: context.orgContext,
      additionalContext: context.additionalContext,
    });
  };

  const isRunning = transformMutation.isPending;

  return (
    <TooltipProvider>
      <div className={cn("space-y-2", className)}>
        {/* Action buttons row */}
        <div className="flex items-center gap-1">
          {actions.map((action) => {
            const config = ACTION_CONFIG[action];
            const isThisRunning = isRunning && activeAction === action;
            return (
              <Tooltip key={action}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground",
                      showLabels ? "px-2" : "px-1.5",
                      isThisRunning && "text-primary"
                    )}
                    disabled={disabled || isRunning}
                    onClick={() => handleAction(action)}
                  >
                    {isThisRunning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      config.icon
                    )}
                    {showLabels && (
                      <span>{isThisRunning ? "Working…" : config.label}</span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {config.tooltip}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Challenge callout — renders questions, does NOT replace text */}
        {challengeCallout && (
          <div className="relative rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
            <button
              type="button"
              onClick={() => setChallengeCallout(null)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss challenge"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">
              Challenge questions
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pr-4">
              {challengeCallout}
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
