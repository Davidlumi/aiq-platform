/**
 * DeepDiveConfirmedStatus — shown in gate footers when deep-dive mode is active
 * and the stage has already been confirmed.
 *
 * Replaces the progress/gate-clearing indicators with a simple status badge.
 * Edit affordances remain available (the section is not locked).
 */
import { CheckCircle2 } from "lucide-react";

interface DeepDiveConfirmedStatusProps {
  confirmedAt: number | null | undefined;
  label?: string;
}

export function DeepDiveConfirmedStatus({
  confirmedAt,
  label = "Section confirmed",
}: DeepDiveConfirmedStatusProps) {
  const dateLabel = confirmedAt
    ? new Date(confirmedAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-3 flex items-center gap-3">
      <CheckCircle2
        className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0"
        aria-hidden="true"
      />
      <div>
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {label}
        </p>
        {dateLabel && (
          <p className="text-xs text-muted-foreground">
            Section status: confirmed {dateLabel}
          </p>
        )}
      </div>
    </div>
  );
}
