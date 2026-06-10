/**
 * Signal Watch — Phase D
 * Tenant-facing view of active signal matches.
 * Shows fired matches (founderApproved only) with rationale, cited source,
 * and dismiss-with-reason action wired to the application dedup logic.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Radio,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Category labels & colours ────────────────────────────────────────────────

const CATEGORY_META: Record<
  string,
  { label: string; className: string }
> = {
  regulatory: {
    label: "Regulatory",
    className:
      "dark:bg-red-900/30 bg-red-100/80 dark:text-red-300 text-red-700 dark:border-red-700/40 border-red-300",
  },
  market: {
    label: "Market",
    className:
      "dark:bg-blue-900/30 bg-blue-100/80 dark:text-blue-300 text-blue-700 dark:border-blue-700/40 border-blue-300",
  },
  research: {
    label: "Research",
    className:
      "dark:bg-violet-900/30 bg-violet-100/80 dark:text-violet-300 text-violet-700 dark:border-violet-700/40 border-violet-300",
  },
  technology: {
    label: "Technology",
    className:
      "dark:bg-cyan-900/30 bg-cyan-100/80 dark:text-cyan-300 text-cyan-700 dark:border-cyan-700/40 border-cyan-300",
  },
  geopolitical: {
    label: "Geopolitical",
    className:
      "dark:bg-orange-900/30 bg-orange-100/80 dark:text-orange-300 text-orange-700 dark:border-orange-700/40 border-orange-300",
  },
  other: {
    label: "Other",
    className:
      "dark:bg-muted/40 bg-muted/60 dark:text-muted-foreground text-muted-foreground dark:border-border border-border",
  },
};

const CONFIDENCE_META: Record<
  string,
  { label: string; className: string }
> = {
  high: {
    label: "High confidence",
    className: "dark:text-emerald-400 text-emerald-600",
  },
  medium: {
    label: "Medium confidence",
    className: "dark:text-amber-400 text-amber-600",
  },
  low: {
    label: "Low confidence",
    className: "dark:text-muted-foreground text-muted-foreground",
  },
};

// ─── Dismiss dialog ───────────────────────────────────────────────────────────

function DismissDialog({
  matchId,
  signalTitle,
  onDismissed,
}: {
  matchId: string;
  signalTitle: string;
  onDismissed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const dismissMutation = trpc.signals.dismissMatch.useMutation({
    onSuccess: () => {
      toast.success("Match dismissed");
      setOpen(false);
      setReason("");
      onDismissed();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs"
      >
        Dismiss
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dismiss signal match</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{signalTitle}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Recording a reason prevents the same class of signal from being
              re-raised unless the underlying assumption changes materially.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="dismiss-reason" className="text-xs">
                Reason for dismissal <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="dismiss-reason"
                placeholder="e.g. Already addressed in our legal review dated March 2025, or Not applicable to our current scope."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!reason.trim() || dismissMutation.isPending}
              onClick={() =>
                dismissMutation.mutate({ matchId, dismissReason: reason.trim() })
              }
            >
              {dismissMutation.isPending && (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              )}
              Confirm dismissal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Match card ───────────────────────────────────────────────────────────────

function MatchCard({
  match,
  onDismissed,
}: {
  match: {
    matchId: string;
    signalId: string;
    signalTitle: string;
    signalCategory: string;
    signalSourceUrl: string | null;
    signalAsOfDate: string | null;
    assumptionId: string;
    initiativeId: string;
    matchRationale: string;
    confidenceLevel: string;
    citedSourceUrl: string | null;
    refreshSuggestionId: string | null;
    createdAt: Date;
  };
  onDismissed: () => void;
}) {
  const catMeta =
    CATEGORY_META[match.signalCategory] ?? CATEGORY_META.other;
  const confMeta =
    CONFIDENCE_META[match.confidenceLevel] ?? CONFIDENCE_META.low;

  // Load the assumption text for display
  const assumptionQ = trpc.assumptions.getAssumptions.useQuery(
    { initiativeId: match.initiativeId },
    { staleTime: 60_000 }
  );
  const assumption = assumptionQ.data?.find((a) => a.id === match.assumptionId);

  const detectedDate = match.signalAsOfDate
    ? new Date(match.signalAsOfDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : new Date(match.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  return (
    <Card className="border shadow-none">
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className={`text-xs ${catMeta.className}`}
              >
                {catMeta.label}
              </Badge>
              <span className={`text-xs font-medium ${confMeta.className}`}>
                {confMeta.label}
              </span>
            </div>
            <p className="text-sm font-semibold leading-snug">
              {match.signalTitle}
            </p>
            <p className="text-xs text-muted-foreground">{detectedDate}</p>
          </div>
          <DismissDialog
            matchId={match.matchId}
            signalTitle={match.signalTitle}
            onDismissed={onDismissed}
          />
        </div>

        {/* Assumption affected */}
        {assumption && (
          <div className="rounded-md border dark:bg-amber-900/10 bg-amber-50/60 dark:border-amber-700/30 border-amber-200 p-3">
            <p className="text-xs font-medium dark:text-amber-300 text-amber-700 mb-1">
              Assumption affected
            </p>
            <p className="text-xs text-foreground leading-relaxed">
              {assumption.statement}
            </p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">
              {assumption.type} assumption ·{" "}
              {assumption.initiativeId.replace(/_/g, " ")}
            </p>
          </div>
        )}

        {/* Rationale */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Why this matters
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {match.matchRationale}
          </p>
        </div>

        {/* Source links */}
        {(match.signalSourceUrl || match.citedSourceUrl) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {match.signalSourceUrl && (
              <a
                href={match.signalSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Source
              </a>
            )}
            {match.citedSourceUrl &&
              match.citedSourceUrl !== match.signalSourceUrl && (
                <a
                  href={match.citedSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Cited source
                </a>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SignalWatchPage() {
  const matchesQ = trpc.signals.listActiveMatches.useQuery(undefined, {
    staleTime: 30_000,
  });
  const utils = trpc.useUtils();

  function handleDismissed() {
    utils.signals.listActiveMatches.invalidate();
  }

  const matches = matchesQ.data ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-accent" />
          <h1 className="text-xl font-bold">Signal Watch</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          External developments that may affect your strategy assumptions.
          Each signal has been matched against your confirmed assumptions and
          reviewed before surfacing.
        </p>
      </div>

      {/* Loading */}
      {matchesQ.isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {matchesQ.isError && (
        <div className="flex items-center gap-2 text-sm text-destructive py-4">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Could not load signal matches. Please refresh.</span>
        </div>
      )}

      {/* Empty state */}
      {!matchesQ.isLoading && !matchesQ.isError && matches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p className="text-base font-medium">No active signals</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            No external developments have been matched to your strategy
            assumptions. This page will update when new signals are reviewed
            and approved.
          </p>
        </div>
      )}

      {/* Match list */}
      {matches.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {matches.length} active{" "}
            {matches.length === 1 ? "signal" : "signals"} requiring attention
          </p>
          {matches.map((m) => (
            <MatchCard
              key={m.matchId}
              match={m}
              onDismissed={handleDismissed}
            />
          ))}
        </div>
      )}
    </div>
  );
}
