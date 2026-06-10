/**
 * SignalsAdminPage — /admin/signals
 *
 * Minimal approval write path. Lists every signal with its founderApproved
 * status and provides a per-row Approve button that calls
 * trpc.signals.approveSignal. Nothing more; full signal management is deferred.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Redirect } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { CheckCircle2, Clock, ExternalLink, ShieldCheck, AlertCircle, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Category colour map ──────────────────────────────────────────────────────

const CATEGORY_COLOURS: Record<string, string> = {
  regulatory:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  market:      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  research:    "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  technology:  "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  geopolitical:"bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  other:       "bg-muted text-muted-foreground",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SignalsAdminPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: signals, isLoading, error } = trpc.signals.listSignals.useQuery(
    undefined,
    // Only fetch if the user is a platform superuser — the procedure will throw FORBIDDEN otherwise
    { enabled: !!(user as any)?.isPlatformSuperuser }
  );

  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Hard gate: redirect non-superusers immediately.
  // The nav entry is already hidden for non-superusers, but direct URL access must also be blocked.
  if (user && !(user as any).isPlatformSuperuser) {
    return <Redirect to="/dashboard" />;
  }

  const approve = trpc.signals.approveSignal.useMutation({
    onMutate: ({ signalId }) => {
      setApprovingId(signalId);
    },
    onSuccess: (_data, { signalId }) => {
      toast.success("Signal approved — it will now be surfaced to tenants.");
      utils.signals.listSignals.invalidate();
      setApprovingId(null);
    },
    onError: (err, { signalId }) => {
      toast.error(`Approval failed: ${err.message}`);
      setApprovingId(null);
    },
  });

  // ── Derived counts ────────────────────────────────────────────────────────

  const approved   = signals?.filter((s) => s.founderApproved).length ?? 0;
  const unapproved = signals?.filter((s) => !s.founderApproved).length ?? 0;
  const total      = signals?.length ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Radio className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Signal Approval</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Signals must be founder-approved before they are surfaced to any tenant.
            Approve a signal only after you have verified its accuracy and relevance.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total signals</p>
            <p className="text-3xl font-bold mt-1">{total}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">Approved</p>
            <p className="text-3xl font-bold mt-1 text-green-700 dark:text-green-400">{approved}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">Pending approval</p>
            <p className="text-3xl font-bold mt-1 text-amber-700 dark:text-amber-400">{unapproved}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gate note */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
        <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>
          <strong>founderApproved gate:</strong> unapproved signals are blocked at two points — the
          matching engine throws <code className="font-mono text-xs">FORBIDDEN</code> before any DB
          write, and <code className="font-mono text-xs">listActiveMatches</code> filters on{" "}
          <code className="font-mono text-xs">founderApproved = true</code>. Approving a signal
          makes it eligible for the next matching run.
        </span>
      </div>

      {/* Signals table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All signals</CardTitle>
          <CardDescription>
            Ordered newest first. Approve a signal to make it eligible for tenant matching.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Clock className="h-5 w-5 animate-spin mr-2" />
              Loading signals…
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-destructive gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>Failed to load signals: {error.message}</span>
            </div>
          ) : !signals || signals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Radio className="h-8 w-8 opacity-30" />
              <p className="text-sm">No signals yet. Create the first signal from the Signal Watch page.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Signal</TableHead>
                  <TableHead className="w-[12%]">Category</TableHead>
                  <TableHead className="w-[10%]">As of</TableHead>
                  <TableHead className="w-[12%]">Status</TableHead>
                  <TableHead className="w-[14%]">Created</TableHead>
                  <TableHead className="w-[12%] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.map((sig) => (
                  <TableRow
                    key={sig.id}
                    className={cn(
                      sig.founderApproved
                        ? "opacity-70"
                        : "bg-amber-50/40 dark:bg-amber-950/10"
                    )}
                  >
                    {/* Title + summary */}
                    <TableCell className="py-3">
                      <div className="font-medium text-sm leading-snug">{sig.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {sig.summary}
                      </div>
                      {sig.sourceUrl && (
                        <a
                          href={sig.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          {sig.sourceLabel ?? "Source"}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          CATEGORY_COLOURS[sig.category] ?? CATEGORY_COLOURS.other
                        )}
                      >
                        {sig.category}
                      </span>
                    </TableCell>

                    {/* As-of date */}
                    <TableCell className="text-xs text-muted-foreground">
                      {sig.asOfDate ?? "—"}
                    </TableCell>

                    {/* Approval status */}
                    <TableCell>
                      {sig.founderApproved ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-green-300 text-green-700 dark:border-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="gap-1 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
                        >
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>

                    {/* Created at */}
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(sig.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>

                    {/* Approve button */}
                    <TableCell className="text-right">
                      {sig.founderApproved ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-default">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              Approved
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            This signal is already approved and visible to tenants.
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs px-3"
                          disabled={approvingId === sig.id}
                          onClick={() => approve.mutate({ signalId: sig.id })}
                        >
                          {approvingId === sig.id ? (
                            <>
                              <Clock className="h-3 w-3 mr-1 animate-spin" />
                              Approving…
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
