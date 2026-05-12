/**
 * EditableBlocks.tsx
 *
 * Two reusable block wrappers that establish the mixed-edit pattern for the
 * Ambition page (and future Investment-Risk / Value pages).
 *
 * InlineEditableBlock  — standard card, pencil icon, click-to-edit, save on blur
 * WizardSourcedBlock   — tinted card, lock icon, "From assessment wizard" tag, no edit
 */
import React, { useRef, useEffect } from "react";
import { Pencil, Lock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── InlineEditableBlock ──────────────────────────────────────────────────────

interface InlineEditableBlockProps {
  /** Block heading shown in top-left */
  label: string;
  /** aria-label for the pencil button */
  editLabel?: string;
  /** Whether the block is currently in edit mode */
  isEditing: boolean;
  /** Called when the user clicks the pencil or anywhere on the block content */
  onEditStart: () => void;
  /** Optional save indicator text: "Saving…" | "Saved" | null */
  saveStatus?: "saving" | "saved" | null;
  className?: string;
  children: React.ReactNode;
}

export function InlineEditableBlock({
  label,
  editLabel,
  isEditing,
  onEditStart,
  saveStatus,
  className,
  children,
}: InlineEditableBlockProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card transition-colors duration-150",
        !isEditing && "hover:border-border/80 cursor-pointer group",
        isEditing && "border-primary/40 ring-1 ring-primary/20",
        className
      )}
      onClick={!isEditing ? onEditStart : undefined}
      role={!isEditing ? "button" : undefined}
      tabIndex={!isEditing ? 0 : undefined}
      onKeyDown={!isEditing ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEditStart(); } } : undefined}
      aria-label={!isEditing ? `Edit ${label}` : undefined}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-5 pt-4 pb-0">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && (
            <span className="text-[10px] text-muted-foreground animate-pulse">Saving…</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-[10px] text-green-400">Saved</span>
          )}
          <button
            type="button"
            aria-label={editLabel ?? `Edit ${label}`}
            onClick={(e) => { e.stopPropagation(); onEditStart(); }}
            className={cn(
              "p-1 rounded transition-colors",
              "text-muted-foreground/40 group-hover:text-muted-foreground",
              isEditing && "text-primary",
              // Always visible on touch devices
              "touch:text-muted-foreground"
            )}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-5 pt-3">{children}</div>
    </div>
  );
}

// ─── WizardSourcedBlock ───────────────────────────────────────────────────────

interface WizardSourcedBlockProps {
  /** Block heading shown in top-left */
  label: string;
  /** If provided, shows "Edit in assessment wizard →" link */
  wizardHref?: string;
  className?: string;
  children: React.ReactNode;
}

export function WizardSourcedBlock({
  label,
  wizardHref,
  className,
  children,
}: WizardSourcedBlockProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-border/60 bg-muted/30",
        // No hover state — wizard-sourced blocks are not interactive
        className
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-5 pt-4 pb-0">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
        <div className="flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-muted-foreground/50" />
          <span className="text-[10px] text-muted-foreground/60">From assessment wizard</span>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-5 pt-3">{children}</div>

      {/* Wizard edit link (only if deep-linking is supported) */}
      {wizardHref && (
        <div className="px-5 pb-4 pt-0 border-t border-border/40 mt-1">
          <a
            href={wizardHref}
            aria-label={`Edit ${label} in assessment wizard`}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Edit in assessment wizard
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}

// ─── MobileEditSheet ──────────────────────────────────────────────────────────

interface MobileEditSheetProps {
  /** Block name shown in the sheet header */
  blockName: string;
  isOpen: boolean;
  onDone: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}

export function MobileEditSheet({
  blockName,
  isOpen,
  onDone,
  onCancel,
  children,
}: MobileEditSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Trap focus inside sheet when open
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      const firstFocusable = sheetRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  // Handle system back gesture (popstate)
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => onCancel();
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden" role="dialog" aria-modal="true" aria-label={`Edit ${blockName}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative bg-card border-t border-border rounded-t-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 flex-shrink-0">
          <span className="text-sm font-semibold text-foreground">{blockName}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDone}
              className="text-sm font-semibold text-primary hover:text-primary/80 px-3 py-1.5 rounded transition-colors"
            >
              Done
            </button>
          </div>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
