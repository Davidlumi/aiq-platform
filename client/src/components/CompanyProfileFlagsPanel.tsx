/**
 * CompanyProfileFlagsPanel — admin panel showing open flags on Company Profile fields.
 * Allows admin to accept (update the field) or dismiss (reject) each flag.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Flag, CheckCircle2, XCircle, Loader2, Clock, User } from "lucide-react";
import { toast } from "sonner";

type FlagStatus = "open" | "accepted" | "dismissed";

interface FlagItem {
  id: string;
  fieldName: string;
  flaggedByUserId: string;
  suggestedCorrection: string | null;
  notes: string | null;
  status: FlagStatus;
  createdAt: number;
  resolvedAt: number | null;
  resolveNote: string | null;
  resolvedByUserId: string | null;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function FlagCard({ flag, onResolved }: { flag: FlagItem; onResolved: () => void }) {
  const [resolveOpen, setResolveOpen] = useState(false);
  const [action, setAction] = useState<"accepted" | "dismissed">("accepted");
  const [adminNote, setAdminNote] = useState("");

  const resolveMutation = trpc.companyProfile.resolveFlag.useMutation({
    onSuccess: () => {
      if (action === "accepted") {
        toast.success(`Flag accepted: correction for "${flag.fieldName}" accepted.`);
      } else {
        toast.success(`Flag dismissed: flag for "${flag.fieldName}" dismissed.`);
      }
      setResolveOpen(false);
      onResolved();
    },
    onError: (e) => toast.error("Failed to resolve: " + String(e.message)),
  });

  const statusColors: Record<FlagStatus, string> = {
    open: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    accepted: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    dismissed: "bg-muted text-muted-foreground border-border",
  };

  return (
    <>
      <div className="p-3.5 rounded-lg border border-border bg-card space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{flag.fieldName}</span>
              <Badge className={`text-xs ${statusColors[flag.status]}`}>
                {flag.status}
              </Badge>
            </div>
            {flag.suggestedCorrection && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                Suggested: <span className="font-mono">{flag.suggestedCorrection}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Clock className="h-3 w-3" />
            {timeAgo(flag.createdAt)}
          </div>
        </div>

        {flag.notes && (
          <div className="p-2 rounded bg-muted/50 text-xs text-foreground/80 border border-border">
            <span className="font-medium text-muted-foreground">Note: </span>{flag.notes}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            Flagged by {flag.flaggedByUserId.slice(0, 8)}
          </div>

        {flag.status === "open" && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
              onClick={() => { setAction("accepted"); setResolveOpen(true); }}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 text-muted-foreground hover:bg-muted"
              onClick={() => { setAction("dismissed"); setResolveOpen(true); }}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Dismiss
            </Button>
          </div>
        )}

        {flag.status !== "open" && flag.resolveNote && (
          <div className="p-2 rounded bg-muted/30 text-xs text-muted-foreground border border-border">
            <span className="font-medium">Admin note: </span>{flag.resolveNote}
          </div>
        )}
      </div>

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {action === "accepted" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
              {action === "accepted" ? "Accept Correction" : "Dismiss Flag"}
            </DialogTitle>
            <DialogDescription>
              {action === "accepted"
                ? `This will mark the flag as accepted. You can update the field value in the Company Profile.`
                : `This will dismiss the flag without making changes.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Admin note <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                placeholder="Add a note for the person who raised this flag…"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)} size="sm">
              Cancel
            </Button>
            <Button
              onClick={() =>
                resolveMutation.mutate({
                  flagId: flag.id,
                  resolution: action,
                  resolveNote: adminNote || undefined,
                })
              }
              disabled={resolveMutation.isPending}
              size="sm"
              className={action === "accepted" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
            >
              {resolveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : action === "accepted" ? (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {action === "accepted" ? "Accept" : "Dismiss"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function CompanyProfileFlagsPanel() {
  const { data: flags, refetch } = trpc.companyProfile.listFlags.useQuery({ status: "open" });

  const openFlags = (flags ?? []) as FlagItem[];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Flag className="h-4 w-4 text-amber-500" />
          Correction Flags
          {openFlags.length > 0 && (
            <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-xs ml-auto">
              {openFlags.length} open
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Correction requests raised by Reward leaders on Company Profile fields
        </CardDescription>
      </CardHeader>
      <CardContent>
        {openFlags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-500/50" />
            <p className="text-sm font-medium">No open flags</p>
            <p className="text-xs mt-1">All correction requests have been resolved</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {openFlags.map((flag) => (
              <FlagCard key={flag.id} flag={flag} onResolved={() => refetch()} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
