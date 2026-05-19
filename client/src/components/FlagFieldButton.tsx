/**
 * FlagFieldButton — inline flag icon that opens a modal to flag a Company Profile field
 * for correction. Used by Reward leaders on the Company Profile read-only view.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Flag, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface FlagFieldButtonProps {
  fieldName: string;
  fieldLabel: string;
  currentValue?: string | null;
  /** Whether this field already has an open flag */
  hasPendingFlag?: boolean;
}

export default function FlagFieldButton({
  fieldName,
  fieldLabel,
  currentValue,
  hasPendingFlag,
}: FlagFieldButtonProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const flagMutation = trpc.companyProfile.flagField.useMutation({
    onSuccess: () => {
      toast.success(`Flag submitted: Your correction request for "${fieldLabel}" has been sent to the admin.`);
      setOpen(false);
      setNote("");
    },
    onError: (e) => {
      toast.error("Failed to submit flag: " + String(e.message));
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={hasPendingFlag ? "Correction already requested" : `Flag "${fieldLabel}" for correction`}
        className={`inline-flex items-center justify-center w-5 h-5 rounded transition-colors ${
          hasPendingFlag
            ? "text-amber-500 cursor-default"
            : "text-muted-foreground/40 hover:text-amber-500 hover:bg-amber-500/10"
        }`}
        disabled={hasPendingFlag}
      >
        <Flag className="h-3.5 w-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-amber-500" />
              Flag for Correction
            </DialogTitle>
            <DialogDescription>
              Request a correction to the <strong>{fieldLabel}</strong> field in the Company Profile.
              Your admin will be notified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {currentValue && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Current value</Label>
                <div className="p-2.5 rounded-lg bg-muted/50 text-sm border border-border">
                  {currentValue}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="flag-note" className="text-sm font-medium">
                What should it be? <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="flag-note"
                placeholder="Describe the correct value or why this needs updating…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} size="sm">
              Cancel
            </Button>
            <Button
              onClick={() => flagMutation.mutate({ fieldName, notes: note || undefined, suggestedCorrection: undefined })}
              disabled={flagMutation.isPending}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {flagMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Flag className="h-4 w-4 mr-2" />
              )}
              Submit Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
