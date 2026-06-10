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
 *
 * Visual layer: AiQ Design System v1.4 tokens (no hardcoded hex values).
 * Uses .aiq-choice / .aiq-choice--selected / .aiq-choice--multi from aiq-components.css.
 */

import { cn } from "@/lib/utils";
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
      {options.map(opt => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(selected ? null : opt.value)}
            className={cn(
              "aiq-choice",
              selected && "aiq-choice--selected",
            )}
            style={{
              width: "auto",
              padding: "6px 14px",
              borderRadius: "var(--aiq-radius-md)",
              fontSize: "13px",
              ...(disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}),
            }}
          >
            {opt.icon && <span style={{ flexShrink: 0 }}>{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}

      {other && (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(isOtherSelected ? null : "__other__")}
            className={cn(
              "aiq-choice",
              isOtherSelected && "aiq-choice--selected",
            )}
            style={{
              width: "auto",
              padding: "6px 14px",
              borderRadius: "var(--aiq-radius-md)",
              fontSize: "13px",
              ...(disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}),
            }}
          >
            Other…
          </button>
          {isOtherSelected && (
            <input
              autoFocus
              placeholder="Describe…"
              value={otherValue}
              onChange={e => onOtherChange?.(e.target.value)}
              className="aiq-field"
              disabled={disabled}
              style={{ height: "34px", width: "192px", padding: "6px 11px", fontSize: "13px" }}
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
                "aiq-choice aiq-choice--multi",
                selected && "aiq-choice--selected",
              )}
              style={{
                width: "auto",
                padding: "6px 14px",
                borderRadius: "var(--aiq-radius-md)",
                fontSize: "13px",
                ...((disabled || blocked) ? { opacity: 0.4, cursor: "not-allowed" } : {}),
              }}
            >
              {opt.icon && <span style={{ flexShrink: 0 }}>{opt.icon}</span>}
              {opt.label}
              {selected && (
                <X
                  style={{ width: "12px", height: "12px", marginLeft: "2px", opacity: 0.7 }}
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
                "aiq-choice aiq-choice--multi",
                isOtherSelected && "aiq-choice--selected",
              )}
              style={{
                width: "auto",
                padding: "6px 14px",
                borderRadius: "var(--aiq-radius-md)",
                fontSize: "13px",
                ...((disabled || (!isOtherSelected && atMax)) ? { opacity: 0.4, cursor: "not-allowed" } : {}),
              }}
            >
              Other…
              {isOtherSelected && (
                <X style={{ width: "12px", height: "12px", marginLeft: "2px", opacity: 0.7 }} />
              )}
            </button>
            {isOtherSelected && (
              <input
                autoFocus
                placeholder="Describe…"
                value={otherValue}
                onChange={e => onOtherChange?.(e.target.value)}
                className="aiq-field"
                disabled={disabled}
                style={{ height: "34px", width: "192px", padding: "6px 11px", fontSize: "13px" }}
              />
            )}
          </>
        )}
      </div>

      {max !== undefined && (
        <p style={{ fontSize: "12px", color: "var(--aiq-text-muted)" }}>
          {value.length}/{max} selected
          {atMax && (
            <span style={{ color: "var(--aiq-warn-text)", marginLeft: "4px" }}>
              — maximum reached
            </span>
          )}
        </p>
      )}
    </div>
  );
}
