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
 */

import { useState, useRef } from "react";
import { Loader2, Sparkles, Undo2, CheckCircle2, PenLine } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
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

  const basisBadge = () => {
    if (isDrafted) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary/80">
          <Sparkles className="w-2.5 h-2.5" />
          AI draft — edit to own
        </span>
      );
    }
    if (isOwned) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-2.5 h-2.5" />
          Owned
        </span>
      );
    }
    return null;
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative">
        <Textarea
          value={value}
          onChange={e => handleChange(e.target.value)}
          placeholder={isEmpty ? keywordPlaceholder : placeholder}
          maxLength={maxLength}
          rows={minRows}
          disabled={disabled || pending}
          className={cn(
            "pr-20 pb-9 resize-none transition-colors",
            isDrafted && "border-primary/40 bg-primary/5",
            isOwned && "border-emerald-500/30",
          )}
        />

        {/* AI button — bottom-right */}
        <button
          type="button"
          disabled={disabled || pending}
          onClick={handleAiClick}
          className={cn(
            "absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold",
            "transition-all duration-150 hover:scale-105 hover:brightness-110 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isDrafted
              ? "bg-primary/20 text-primary border border-primary/40"
              : "bg-primary text-primary-foreground",
            (disabled || pending) && "opacity-50 cursor-not-allowed hover:scale-100",
          )}
        >
          {pending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : isDrafted ? (
            <Sparkles className="w-3 h-3" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          {isDrafted ? regenLabel : aiLabel}
        </button>

        {/* Undo button — appears after AI draft */}
        {isDrafted && prevValueRef.current !== null && (
          <button
            type="button"
            onClick={handleUndo}
            title="Undo AI draft"
            className="absolute bottom-2 right-[4.5rem] flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Undo2 className="w-3 h-3" />
          </button>
        )}

        {/* Owned indicator — bottom-left */}
        {isOwned && (
          <span className="absolute bottom-2 left-2.5 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
            <PenLine className="w-2.5 h-2.5" />
            Owned
          </span>
        )}
      </div>

      {/* Footer row: basis badge + char count */}
      <div className="flex items-center justify-between px-0.5">
        <div>{basisBadge()}</div>
        {maxLength && (
          <p className={cn("text-xs text-muted-foreground", value.length >= maxLength && "text-destructive")}>
            {value.length}/{maxLength}
          </p>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
