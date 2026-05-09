/**
 * Button - AiQ Design System v2.3 §5.5
 *
 * Hierarchy:
 *   default     = primary action (green fill) - one per view
 *   secondary   = secondary action (outlined, transparent bg, light text on dark bg)
 *   outline     = alias for secondary (backward compat)
 *   ghost       = tertiary / toolbar (no border, hover fill, light text)
 *   destructive = irreversible actions (red-700)
 *   link        = inline text actions
 *
 * Accessibility:
 *   - Minimum 44×44px touch target (WCAG 2.5.8)
 *   - Use aria-disabled + loading prop for in-progress states
 *   - Sentence case enforced by convention - no text-transform
 *   - All variants use high-contrast text on the dark theme background
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap shrink-0",
    "font-medium text-sm leading-none",
    "rounded-md border border-transparent",
    "transition-colors",
    "select-none",
    "outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&[aria-disabled=true]]:pointer-events-none [&[aria-disabled=true]]:opacity-50",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        /** Primary - green fill. One per view. */
        default:
          "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)] hover:bg-[oklch(65%_0.220_142)] active:bg-[oklch(60%_0.220_142)]",

        /** Secondary - outlined, transparent bg, light text for dark theme */
        secondary:
          "bg-transparent text-[var(--color-foreground)] border-[var(--color-border)] hover:bg-[var(--color-secondary)] hover:border-[oklch(40%_0.060_264)] active:bg-[var(--color-muted)]",

        /** Outline - alias for secondary (backward compat) */
        outline:
          "bg-transparent text-[var(--color-foreground)] border-[var(--color-border)] hover:bg-[var(--color-secondary)] hover:border-[oklch(40%_0.060_264)] active:bg-[var(--color-muted)]",

        /** Ghost - no border, hover fill only, light text for dark theme */
        ghost:
          "bg-transparent text-[var(--color-muted-foreground)] border-transparent hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)] active:bg-[var(--color-muted)]",

        /** Destructive - irreversible actions */
        destructive:
          "bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)] border-[var(--color-destructive)] hover:bg-[oklch(48%_0.200_27)] active:bg-[oklch(44%_0.200_27)]",

        /** Link - inline text action */
        link:
          "bg-transparent text-[var(--color-primary)] border-transparent underline underline-offset-2 hover:text-[oklch(65%_0.220_142)] p-0 h-auto min-h-0",
      },
      size: {
        /** Default - 44px height (WCAG 2.5.8 minimum target) */
        default: "h-11 px-4 py-2.5 min-w-[44px] has-[>svg]:px-3",

        /** Small - 36px, adequate for dense toolbars */
        sm: "h-9 px-3 py-2 text-xs min-w-[36px] gap-1.5 has-[>svg]:px-2.5",

        /** Large - 48px */
        lg: "h-12 px-6 py-3 text-base min-w-[48px] has-[>svg]:px-4",

        /** Icon - square 44×44 */
        icon: "size-11",

        /** Icon small - square 36×36 */
        "icon-sm": "size-9",

        /** Icon large - square 48×48 */
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Show loading spinner - uses aria-disabled so screen readers still reach the button */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    return (
      <Comp
        data-slot="button"
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={asChild ? undefined : isDisabled}
        aria-disabled={isDisabled || undefined}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin size-4 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
