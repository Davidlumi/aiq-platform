/**
 * Badge — AiQ Design System v2.2 §5.7
 *
 * Shape: rectangular (radius-xs = 2px), not pill.
 * Text: sentence case, 13px / 12px (sm).
 * Dual-audience state variants:
 *   - individual-* = never red (participant-facing)
 *   - org-*        = semantic colour permitted (manager/CPO-facing)
 *
 * Backward-compat variants: default, secondary, outline, destructive.
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center gap-1",
    "w-fit whitespace-nowrap shrink-0",
    "rounded-[2px]", // radius-xs — rectangular, not pill
    "border",
    "text-xs font-normal leading-none",
    "px-2 py-1",
    "overflow-hidden",
    "transition-colors",
    "[&>svg]:size-3 [&>svg]:pointer-events-none [&>svg]:shrink-0",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--navy-800)] focus-visible:ring-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        // ── Shadcn backward-compat ──────────────────────────────────────
        default:
          "bg-[var(--navy-800)] text-white border-[var(--navy-800)]",
        secondary:
          "bg-[var(--color-neutral-100)] text-[var(--color-neutral-800)] border-[var(--color-neutral-200)]",
        outline:
          "bg-transparent text-[var(--color-neutral-800)] border-[var(--color-neutral-300)]",
        destructive:
          "bg-[var(--color-red-50)] text-[var(--color-red-900)] border-[var(--color-red-100)]",

        // ── Individual (participant-facing) — never red ─────────────────
        "strong-individual":
          "bg-[var(--state-strong-individual-bg)] text-[var(--state-strong-individual-text)] border-[var(--state-strong-individual-border)]",
        "developing-individual":
          "bg-[var(--state-developing-individual-bg)] text-[var(--state-developing-individual-text)] border-[var(--state-developing-individual-border)]",
        "critical-individual":
          "bg-[var(--state-critical-individual-bg)] text-[var(--state-critical-individual-text)] border-[var(--state-critical-individual-border)]",
        "foundation-individual":
          "bg-[var(--state-foundation-individual-bg)] text-[var(--state-foundation-individual-text)] border-[var(--state-foundation-individual-border)]",
        "insufficient":
          "bg-[var(--state-insufficient-bg)] text-[var(--state-insufficient-text)] border-[var(--state-insufficient-border)]",

        // ── Org (manager/CPO-facing) — semantic colour permitted ────────
        "strong-org":
          "bg-[var(--state-strong-org-bg)] text-[var(--state-strong-org-text)] border-[var(--state-strong-org-border)]",
        "developing-org":
          "bg-[var(--state-developing-org-bg)] text-[var(--state-developing-org-text)] border-[var(--state-developing-org-border)]",
        "critical-org":
          "bg-[var(--state-critical-org-bg)] text-[var(--state-critical-org-text)] border-[var(--state-critical-org-border)]",
        "foundation-org":
          "bg-[var(--state-foundation-org-bg)] text-[var(--state-foundation-org-text)] border-[var(--state-foundation-org-border)]",

        // ── Neutral / muted ─────────────────────────────────────────────
        muted:
          "bg-[var(--color-neutral-50)] text-[var(--color-neutral-700)] border-[var(--color-neutral-200)]",
        navy:
          "bg-[var(--navy-50)] text-[var(--navy-800)] border-[var(--navy-100)]",
      },
      size: {
        default: "text-[13px] px-2 py-1",
        sm:      "text-[12px] px-1.5 py-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
