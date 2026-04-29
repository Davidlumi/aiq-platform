/**
 * Button - AiQ Design System v2.2 §5.5
 *
 * Hierarchy:
 *   default     = primary action (navy-800 fill) - one per view
 *   secondary   = secondary action (outlined, transparent bg)
 *   outline     = alias for secondary (backward compat)
 *   ghost       = tertiary / toolbar (no border, hover fill)
 *   destructive = irreversible actions (red-700)
 *   link        = inline text actions
 *
 * Accessibility:
 *   - Minimum 44×44px touch target (WCAG 2.5.8)
 *   - Use aria-disabled + loading prop for in-progress states
 *   - Sentence case enforced by convention - no text-transform
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
    "outline-none focus-visible:ring-2 focus-visible:ring-[var(--navy-800)] focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&[aria-disabled=true]]:pointer-events-none [&[aria-disabled=true]]:opacity-50",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        /** Primary - navy-800 fill. One per view. */
        default:
          "bg-[var(--navy-800)] text-white border-[var(--navy-800)] hover:bg-[var(--navy-900)] active:bg-[var(--navy-1000)]",

        /** Secondary - outlined, transparent bg */
        secondary:
          "bg-transparent text-[var(--color-neutral-900)] border-[var(--color-neutral-300)] hover:bg-[var(--color-neutral-50)] hover:border-[var(--color-neutral-400)] active:bg-[var(--color-neutral-100)]",

        /** Outline - alias for secondary (backward compat) */
        outline:
          "bg-transparent text-[var(--color-neutral-900)] border-[var(--color-neutral-300)] hover:bg-[var(--color-neutral-50)] hover:border-[var(--color-neutral-400)] active:bg-[var(--color-neutral-100)]",

        /** Ghost - no border, hover fill only */
        ghost:
          "bg-transparent text-[var(--color-neutral-700)] border-transparent hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-neutral-900)] active:bg-[var(--color-neutral-200)]",

        /** Destructive - irreversible actions */
        destructive:
          "bg-[var(--color-red-700)] text-white border-[var(--color-red-700)] hover:bg-[var(--color-red-900)] active:bg-[var(--color-red-900)]",

        /** Link - inline text action */
        link:
          "bg-transparent text-[var(--navy-800)] border-transparent underline underline-offset-2 hover:text-[var(--navy-900)] p-0 h-auto min-h-0",
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
