/**
 * KeywordExpand
 *
 * Priority 0 component kit — AiQ Realignment Option 2.
 *
 * Interaction pattern:
 *   1. User types a few keywords (seed)
 *   2. Clicks ✨ AI → server drafts a full paragraph
 *   3. User reads, edits if needed → text is now "owned"
 *   4. Undo button restores pre-draft value
 *
 * Provenance states (§4b):
 *   "empty"      — no content yet
 *   "ai_drafted" — AI generated, not yet edited by user
 *   "owned"      — user has edited the AI draft (or typed from scratch)
 *
 * The `basis` prop / `onBasisChange` callback surfaces the provenance to the
 * parent so it can be persisted alongside the text value.
 *
 * Visual layer: AiQ Design System v1.4 tokens (no hardcoded hex values).
 */

import { useState, useRef } from "react";
import { Loader2, Sparkles, Undo2, CheckCircle2, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

export type KeywordExpandBasis = "empty" | "ai_drafted" | "owned";

interface KeywordExpandProps {
  /** Current text value */
  value: string;
  /** Called on every keystroke */
  onChange: (value: string) => void;
  /** Current provenance basis */
  basis?: KeywordExpandBasis;
  /** Called when basis changes */
  onBasisChange?: (basis: KeywordExpandBasis) => void;
  /**
   * Async function that calls the server AI draft endpoint.
   * Receives the current value (keywords) and returns the drafted text.
   */
  onAiDraft: (hint: string) => Promise<string>;
  placeholder?: string;
  /** Placeholder shown when the field is empty — guides keyword entry */
  keywordPlaceholder?: string;
  maxLength?: number;
  minRows?: number;
  disabled?: boolean;
  className?: string;
  /** Label shown on the AI button */
  aiLabel?: string;
  /** Label shown when AI draft is active and user clicks again */
  regenLabel?: string;
}

export function KeywordExpand({
  value,
  onChange,
  basis = "empty",
  onBasisChange,
  onAiDraft,
  placeholder,
  keywordPlaceholder = "Type a few keywords, then click ✨ AI to generate…",
  maxLength,
  minRows = 3,
  disabled = false,
  className,
  aiLabel = "AI",
  regenLabel = "Regen",
}: KeywordExpandProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevValueRef = useRef<string | null>(null);

  const isDrafted = basis === "ai_drafted";
  const isOwned = basis === "owned";
  const isEmpty = !value.trim();

  const handleChange = (next: string) => {
    onChange(next);
    setError(null);
    // Once the user edits anything, mark as owned
    if (basis === "ai_drafted" && next !== value) {
      onBasisChange?.("owned");
    } else if (basis === "empty" && next.trim()) {
      // Still "empty" basis until AI runs — leave as-is so parent knows
      // no AI has touched it yet. Parent can decide to treat typed-from-scratch
      // as "owned" on save.
    }
  };

  const handleAiClick = async () => {
    if (isEmpty) {
      setError("Type a few keywords first, then click AI to generate.");
      return;
    }
    prevValueRef.current = value;
    setPending(true);
    setError(null);
    try {
      const draft = await onAiDraft(value);
      onChange(draft);
      onBasisChange?.("ai_drafted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI generation failed";
      setError(msg);
    } finally {
      setPending(false);
    }
  };

  const handleUndo = () => {
    if (prevValueRef.current !== null) {
      onChange(prevValueRef.current);
      onBasisChange?.("empty");
      prevValueRef.current = null;
    }
  };

  // Basis badge using AiQ token-based chip styles
  const basisBadge = () => {
    if (isDrafted) {
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
          <Sparkles style={{ width: "10px", height: "10px" }} />
          AI draft — edit to own
        </span>
      );
    }
    if (isOwned) {
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
          <CheckCircle2 style={{ width: "10px", height: "10px" }} />
          Owned
        </span>
      );
    }
    return null;
  };

  // Textarea border/bg override for provenance state
  const textareaStyle: React.CSSProperties = isDrafted
    ? {
        borderColor: "var(--aiq-basis-drafted-border)",
        background: "var(--aiq-basis-drafted-fill)",
      }
    : isOwned
    ? {
        borderColor: "var(--aiq-basis-owned-border)",
        background: "var(--aiq-surface)",
      }
    : {};

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative">
        {/* Native textarea styled with .aiq-field */}
        <textarea
          value={value}
          onChange={e => handleChange(e.target.value)}
          placeholder={isEmpty ? keywordPlaceholder : placeholder}
          maxLength={maxLength}
          rows={minRows}
          disabled={disabled || pending}
          className="aiq-field"
          style={{
            resize: "none",
            paddingRight: "5.5rem",
            paddingBottom: "2.25rem",
            transition: "border-color var(--aiq-dur-fast) var(--aiq-ease), background var(--aiq-dur-fast) var(--aiq-ease)",
            ...textareaStyle,
          }}
        />

        {/* AI button — bottom-right, uses .aiq-btn */}
        <button
          type="button"
          disabled={disabled || pending}
          onClick={handleAiClick}
          className={cn("aiq-btn", isDrafted ? "" : "aiq-btn--primary")}
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 10px",
            fontSize: "12px",
            fontWeight: 600,
            ...(isDrafted
              ? {
                  background: "var(--aiq-basis-drafted-fill)",
                  borderColor: "var(--aiq-basis-drafted-border)",
                  color: "var(--aiq-basis-drafted-text)",
                }
              : {}),
          }}
        >
          {pending ? (
            <Loader2 style={{ width: "12px", height: "12px" }} className="animate-spin" />
          ) : (
            <Sparkles style={{ width: "12px", height: "12px" }} />
          )}
          {isDrafted ? regenLabel : aiLabel}
        </button>

        {/* Undo button — appears after AI draft */}
        {isDrafted && prevValueRef.current !== null && (
          <button
            type="button"
            onClick={handleUndo}
            title="Undo AI draft"
            className="aiq-btn aiq-btn--ghost"
            style={{
              position: "absolute",
              bottom: "8px",
              right: "72px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              fontSize: "12px",
            }}
          >
            <Undo2 style={{ width: "12px", height: "12px" }} />
          </button>
        )}

        {/* Owned indicator — bottom-left */}
        {isOwned && (
          <span
            style={{
              position: "absolute",
              bottom: "10px",
              left: "10px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              color: "var(--aiq-basis-owned-text)",
            }}
          >
            <PenLine style={{ width: "10px", height: "10px" }} />
            Owned
          </span>
        )}
      </div>

      {/* Footer row: basis badge + char count */}
      <div className="flex items-center justify-between px-0.5">
        <div>{basisBadge()}</div>
        {maxLength && (
          <p
            style={{
              fontSize: "12px",
              color: value.length >= maxLength ? "var(--aiq-danger-text)" : "var(--aiq-text-muted)",
            }}
          >
            {value.length}/{maxLength}
          </p>
        )}
      </div>

      {error && (
        <p className="aiq-field-error">{error}</p>
      )}
    </div>
  );
}
