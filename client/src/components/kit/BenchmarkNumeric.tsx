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
 *
 * Visual layer: AiQ Design System v1.4 tokens (no hardcoded hex values).
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

  // Basis badge using AiQ token-based chip styles
  const basisBadge = () => {
    if (!basis) return null;
    if (basis === "benchmark_default") {
      return (
        <span
          className="aiq-chip"
          style={{
            background: "var(--aiq-basis-benchmark-fill)",
            borderColor: "var(--aiq-basis-benchmark-border)",
            color: "var(--aiq-basis-benchmark-text)",
            fontSize: "11px",
          }}
        >
          <TrendingUp style={{ width: "10px", height: "10px" }} />
          Sector benchmark
        </span>
      );
    }
    if (basis === "user_provided") {
      return (
        <span
          className="aiq-chip"
          style={{
            background: "var(--aiq-basis-owned-fill)",
            borderColor: "var(--aiq-basis-owned-border)",
            color: "var(--aiq-basis-owned-text)",
            fontSize: "11px",
          }}
        >
          <PenLine style={{ width: "10px", height: "10px" }} />
          Your figure
        </span>
      );
    }
    if (basis === "self_declared") {
      return (
        <span
          className="aiq-chip"
          style={{
            background: "var(--aiq-basis-drafted-fill)",
            borderColor: "var(--aiq-basis-drafted-border)",
            color: "var(--aiq-basis-drafted-text)",
            fontSize: "11px",
          }}
        >
          <CheckCircle2 style={{ width: "10px", height: "10px" }} />
          Self-declared
        </span>
      );
    }
    return null;
  };

  // Input border/bg override for provenance state
  const inputStyle: React.CSSProperties = {
    width: "112px",
    height: "36px",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    fontFamily: "var(--aiq-font)",
    ...(basis === "benchmark_default"
      ? {
          borderColor: "var(--aiq-basis-benchmark-border)",
          background: "var(--aiq-basis-benchmark-fill)",
        }
      : basis === "user_provided"
      ? {
          borderColor: "var(--aiq-basis-owned-border)",
          background: "var(--aiq-surface)",
        }
      : {}),
    ...(disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}),
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-2">
        {/* Numeric input using .aiq-field */}
        <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
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
            className="aiq-field"
            style={inputStyle}
          />
          {unit && (
            <span
              style={{
                marginLeft: "6px",
                fontSize: "13px",
                color: "var(--aiq-text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {unit}
            </span>
          )}
        </div>

        {/* Use benchmark button using .aiq-btn */}
        {hasBenchmark && (
          <button
            type="button"
            disabled={disabled || basis === "benchmark_default"}
            onClick={handleUseBenchmark}
            className="aiq-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              ...(basis === "benchmark_default"
                ? {
                    background: "var(--aiq-basis-benchmark-fill)",
                    borderColor: "var(--aiq-basis-benchmark-border)",
                    color: "var(--aiq-basis-benchmark-text)",
                    cursor: "default",
                    opacity: 0.8,
                  }
                : {}),
              ...((disabled || basis === "benchmark_default") ? { opacity: 0.6 } : {}),
            }}
          >
            <TrendingUp style={{ width: "12px", height: "12px" }} />
            Use benchmark
            {hasBenchmark && (
              <span style={{ fontVariantNumeric: "tabular-nums", fontSize: "11px", opacity: 0.7 }}>
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
          <p style={{ fontSize: "11px", color: "var(--aiq-text-muted)" }}>
            Benchmark: {benchmarkSource}
          </p>
        )}
      </div>
    </div>
  );
}
