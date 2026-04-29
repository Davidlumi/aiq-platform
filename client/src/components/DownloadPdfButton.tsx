/**
 * DownloadPdfButton - triggers a server-side PDF download for any of the 5 document types.
 *
 * Usage:
 *   <DownloadPdfButton type="assessment_report" />
 *   <DownloadPdfButton type="module" moduleId={mod.id} label="Download Module PDF" />
 *   <DownloadPdfButton type="team_dashboard" variant="outline" size="sm" />
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type PdfType =
  | "assessment_report"
  | "learning_plan"
  | "module"
  | "team_dashboard"
  | "capability_profile";

interface DownloadPdfButtonProps {
  type: PdfType;
  /** Required when type === "module" */
  moduleId?: string;
  /** Required when type === "assessment_report" and you want a specific session */
  sessionId?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

const DEFAULT_LABELS: Record<PdfType, string> = {
  assessment_report:  "Download Report",
  learning_plan:      "Download Plan",
  module:             "Download PDF",
  team_dashboard:     "Export PDF",
  capability_profile: "Download Profile",
};

export function DownloadPdfButton({
  type,
  moduleId,
  sessionId,
  label,
  variant = "outline",
  size = "sm",
  className,
}: DownloadPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (moduleId) params.set("moduleId", moduleId);
      if (sessionId) params.set("sessionId", sessionId);
      const url = `/api/pdf/${type}${params.toString() ? `?${params}` : ""}`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "PDF generation failed" }));
        throw new Error(err.error ?? "PDF generation failed");
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      // Derive filename from Content-Disposition or fallback
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `aiq-${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      toast.success("PDF downloaded successfully");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={loading}
      className={cn("gap-2", className)}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {loading ? "Generating…" : (label ?? DEFAULT_LABELS[type])}
    </Button>
  );
}
