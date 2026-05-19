/**
 * ReassessmentBanner — shown on RewardPreworkPage when the Company Profile
 * has been updated since the pre-work was completed, prompting the user to
 * review and re-confirm their pre-work answers.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface ReassessmentBannerProps {
  /** Number of times reassessment has been triggered */
  reassessmentCount: number;
  /** Whether the pre-work is currently in a re-assessment state (not completed) */
  isInReassessment: boolean;
  /** Callback when the user confirms they've reviewed and want to re-complete */
  onReassessmentStarted?: () => void;
}

export default function ReassessmentBanner({
  reassessmentCount,
  isInReassessment,
  onReassessmentStarted,
}: ReassessmentBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const reassessMutation = trpc.rewardPrework.reassess.useMutation({
    onSuccess: (data) => {
      toast.success(`Re-assessment #${data.reassessmentCount} started. Please review your answers and re-complete when ready.`);
      onReassessmentStarted?.();
    },
    onError: (e) => toast.error("Failed to start re-assessment: " + String(e.message)),
  });

  if (dismissed) return null;

  // If already in re-assessment mode (not completed), show the in-progress banner
  if (isInReassessment && reassessmentCount > 0) {
    return (
      <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <RefreshCw className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-600">Re-assessment in progress</p>
          <p className="text-xs text-amber-600/80 mt-0.5">
            The Company Profile has been updated. Please review your answers below and re-complete when ready.
            {reassessmentCount > 1 && ` (Re-assessment #${reassessmentCount})`}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-500/60 hover:text-amber-500 transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // If completed but company profile has changed, show the prompt to start re-assessment
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-600">Company Profile updated</p>
        <p className="text-xs text-amber-600/80 mt-0.5">
          Your admin has updated the Company Profile since you last completed your pre-work.
          Some of your answers may need to be reviewed.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
          onClick={() => reassessMutation.mutate()}
          disabled={reassessMutation.isPending}
        >
          {reassessMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          Review Now
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-500/60 hover:text-amber-500 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
