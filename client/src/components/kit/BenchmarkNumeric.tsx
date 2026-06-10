/**
 * BenchmarkNumeric
 *
 * Priority 0 component kit — AiQ Realignment Option 2.
 *
 * Interaction pattern:
 *   1. Input renders with benchmark value shown as placeholder/ghost
 *   2. "Use benchmark" button pre-fills the input with the benchmark value
 *      and sets basis = "benchmark_default"
 *   3. User can type their own value → basis = "user_provided"
 *   4. Basis badge shows the current provenance (benchmark_default / user_provided)
 *
 * Provenance states (B1 — InputFieldBasis from shared/strategyInputs.ts):
 *   "benchmark_default" — value is the sector benchmark (pre-filled or accepted)
 *   "self_declared"     — value was typed by the user without benchmark guidance
 *   "user_provided"     — user explicitly overrode the benchmark
 */

import { cn } from "@/lib/utils";
import { TrendingUp, CheckCircle2, PenLine } from "lucide-react";

export type NumericBasis = "benchmark_default" | "self_declared" | "user_provided";

interface BenchmarkNumericProps {
  /** Current numeric value (undefined = empty) */
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  /** Current provenance basis */
  basis?: NumericBasis;
  onBasisChange?: (basis: NumericBasis) => void;
  /** The sector benchmark value to show and optionally pre-fill */
  benchmark?: number;
  /** Unit label shown after the input (e.g. "days", "£", "%") */
  unit?: string;
  /** Source label shown next to the benchmark (e.g. "CIPD 2024 median") */
  benchmarkSource?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function BenchmarkNumeric({
  value,
  onChange,
  basis,
  onBasisChange,
  benchmark,
  unit,
  benchmarkSource,
  min,
  max,
  step = 1,
  disabled = false,
  className,
  placeholder,
}: BenchmarkNumericProps) {
  const hasBenchmark = benchmark !== undefined;
  const isEmpty = value === undefined || value === null || (value as unknown as string) === "";

  const handleChange = (raw: string) => {
    const n = raw === "" ? undefined : Number(raw);
    onChange(n);
    if (n !== undefined) {
      onBasisChange?.("user_provided");
    }
  };

  const handleUseBenchmark = () => {
    if (benchmark === undefined) return;
    onChange(benchmark);
    onBasisChange?.("benchmark_default");
  };

  const basisBadge = () => {
    if (!basis) return null;
    if (basis === "benchmark_default") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-600 dark:text-sky-400">
          <TrendingUp className="w-2.5 h-2.5" />
          Sector benchmark
        </span>
      );
    }
    if (basis === "user_provided") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          <PenLine className="w-2.5 h-2.5" />
          Your figure
        </span>
      );
    }
    if (basis === "self_declared") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
          <CheckCircle2 className="w-2.5 h-2.5" />
          Self-declared
        </span>
      );
    }
    return null;
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-2">
        {/* Numeric input */}
        <div className="relative flex items-center">
          <input
            type="number"
            value={value ?? ""}
            onChange={e => handleChange(e.target.value)}
            placeholder={
              placeholder ??
              (hasBenchmark ? `e.g. ${benchmark}` : "Enter value")
            }
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={cn(
              "w-28 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm",
              "text-right font-mono tabular-nums",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              "transition-colors",
              basis === "benchmark_default" && "border-sky-400/60 bg-sky-50/40 dark:bg-sky-900/20",
              basis === "user_provided" && "border-emerald-400/60",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          />
          {unit && (
            <span className="ml-1.5 text-sm text-muted-foreground whitespace-nowrap">{unit}</span>
          )}
        </div>

        {/* Use benchmark button */}
        {hasBenchmark && (
          <button
            type="button"
            disabled={disabled || basis === "benchmark_default"}
            onClick={handleUseBenchmark}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border",
              "transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              basis === "benchmark_default"
                ? "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300/60 cursor-default"
                : "bg-background text-foreground border-border hover:border-sky-400/60 hover:bg-sky-50/40 dark:hover:bg-sky-900/20",
              (disabled || basis === "benchmark_default") && "opacity-60 hover:scale-100",
            )}
          >
            <TrendingUp className="w-3 h-3" />
            Use benchmark
            {hasBenchmark && (
              <span className="font-mono tabular-nums text-[11px] opacity-70">
                ({benchmark}{unit ? ` ${unit}` : ""})
              </span>
            )}
          </button>
        )}
      </div>

      {/* Footer: basis badge + benchmark source */}
      <div className="flex items-center justify-between px-0.5">
        <div>{basisBadge()}</div>
        {hasBenchmark && benchmarkSource && (
          <p className="text-[10px] text-muted-foreground">
            Benchmark: {benchmarkSource}
          </p>
        )}
      </div>
    </div>
  );
}
