/**
 * AITextActions — Reusable inline AI action buttons for text fields.
 *
 * Renders a compact toolbar with Expand / Refine / Challenge / Suggest buttons.
 * Each action calls `intelligence.transformText` on the server and replaces
 * the current text with the AI-generated result.
 *
 * Usage:
 *   <AITextActions
 *     text={visionStatement}
 *     context={{ stage: "vision", orgContext: { sector, headcount } }}
 *     onResult={(newText) => setVisionStatement(newText)}
 *     disabled={isLoading}
 *   />
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Maximize2, Sparkles, MessageSquareWarning, Wand2 } from "lucide-react";
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
    tooltip: "Challenge — rewrite to be more ambitious or contrarian",
    icon: <MessageSquareWarning className="h-3.5 w-3.5" />,
  },
  suggest: {
    label: "Suggest",
    tooltip: "Suggest — generate a fresh alternative",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
};

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

  const transformMutation = trpc.intelligence.transformText.useMutation({
    onSuccess: (data) => {
      onResult(data.text);
      setActiveAction(null);
    },
    onError: (err) => {
      toast.error(`AI action failed: ${err.message}`);
      setActiveAction(null);
    },
  });

  const handleAction = (action: AITextActionType) => {
    if (!text.trim()) {
      toast.error("Please enter some text first before using AI actions.");
      return;
    }
    setActiveAction(action);
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
      <div className={cn("flex items-center gap-1", className)}>
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
    </TooltipProvider>
  );
}
