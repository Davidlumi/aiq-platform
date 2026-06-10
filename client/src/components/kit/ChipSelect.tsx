/**
 * ChipSelect / ChipMultiSelect
 *
 * Priority 0 component kit — AiQ Realignment Option 2.
 *
 * Usage:
 *   Single:  <ChipSelect options={[...]} value={v} onChange={setV} />
 *   Multi:   <ChipMultiSelect options={[...]} value={arr} onChange={setArr} max={3} />
 *
 * Both variants accept an optional `other` prop that renders a free-text escape hatch
 * when the user selects the "Other" chip.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

export interface ChipOption {
  value: string;
  label: string;
  /** Optional icon or emoji prefix shown inside the chip */
  icon?: React.ReactNode;
}

// ─── Single-select ────────────────────────────────────────────────────────────

interface ChipSelectProps {
  options: ChipOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** Show an "Other" chip that reveals a free-text input */
  other?: boolean;
  otherValue?: string;
  onOtherChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ChipSelect({
  options,
  value,
  onChange,
  other = false,
  otherValue = "",
  onOtherChange,
  disabled = false,
  className,
}: ChipSelectProps) {
  const isOtherSelected = value === "__other__";

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value === opt.value ? null : opt.value)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "hover:scale-[1.03] active:scale-[0.97]",
            value === opt.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background text-foreground border-border hover:border-primary/60 hover:bg-primary/5",
            disabled && "opacity-50 cursor-not-allowed hover:scale-100",
          )}
        >
          {opt.icon && <span className="shrink-0">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}

      {other && (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(isOtherSelected ? null : "__other__")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150",
              "hover:scale-[1.03] active:scale-[0.97]",
              isOtherSelected
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-foreground border-border hover:border-primary/60 hover:bg-primary/5",
              disabled && "opacity-50 cursor-not-allowed hover:scale-100",
            )}
          >
            Other…
          </button>
          {isOtherSelected && (
            <Input
              autoFocus
              placeholder="Describe…"
              value={otherValue}
              onChange={e => onOtherChange?.(e.target.value)}
              className="h-8 w-48 text-sm"
              disabled={disabled}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Multi-select ─────────────────────────────────────────────────────────────

interface ChipMultiSelectProps {
  options: ChipOption[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Maximum number of selections (undefined = unlimited) */
  max?: number;
  /** Show an "Other" chip that reveals a free-text input */
  other?: boolean;
  otherValue?: string;
  onOtherChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ChipMultiSelect({
  options,
  value,
  onChange,
  max,
  other = false,
  otherValue = "",
  onOtherChange,
  disabled = false,
  className,
}: ChipMultiSelectProps) {
  const toggle = (v: string) => {
    if (value.includes(v)) {
      onChange(value.filter(x => x !== v));
    } else {
      if (max !== undefined && value.length >= max) return;
      onChange([...value, v]);
    }
  };

  const isOtherSelected = value.includes("__other__");
  const atMax = max !== undefined && value.length >= max && !isOtherSelected;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const selected = value.includes(opt.value);
          const blocked = !selected && atMax;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled || blocked}
              onClick={() => toggle(opt.value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "hover:scale-[1.03] active:scale-[0.97]",
                selected
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-foreground border-border hover:border-primary/60 hover:bg-primary/5",
                (disabled || blocked) && "opacity-40 cursor-not-allowed hover:scale-100",
              )}
            >
              {opt.icon && <span className="shrink-0">{opt.icon}</span>}
              {opt.label}
              {selected && (
                <X
                  className="w-3 h-3 ml-0.5 opacity-70"
                  onClick={e => { e.stopPropagation(); toggle(opt.value); }}
                />
              )}
            </button>
          );
        })}

        {other && (
          <>
            <button
              type="button"
              disabled={disabled || (!isOtherSelected && atMax)}
              onClick={() => toggle("__other__")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150",
                "hover:scale-[1.03] active:scale-[0.97]",
                isOtherSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-foreground border-border hover:border-primary/60 hover:bg-primary/5",
                (disabled || (!isOtherSelected && atMax)) && "opacity-40 cursor-not-allowed hover:scale-100",
              )}
            >
              Other…
              {isOtherSelected && <X className="w-3 h-3 ml-0.5 opacity-70" />}
            </button>
            {isOtherSelected && (
              <Input
                autoFocus
                placeholder="Describe…"
                value={otherValue}
                onChange={e => onOtherChange?.(e.target.value)}
                className="h-8 w-48 text-sm"
                disabled={disabled}
              />
            )}
          </>
        )}
      </div>

      {max !== undefined && (
        <p className="text-xs text-muted-foreground">
          {value.length}/{max} selected
          {atMax && <span className="text-amber-600 dark:text-amber-400 ml-1">— maximum reached</span>}
        </p>
      )}
    </div>
  );
}
