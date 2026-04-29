/**
 * Card - AiQ Design System v2.2 §5.4
 *
 * Variants:
 *   default  - raised surface, radius-md (6px), elevation-sm, 24px padding
 *   elevated - raised surface, radius-lg (8px), elevation-md, 32px padding
 *   sunken   - sunken surface, radius-md (6px), no shadow, 16px padding
 *
 * CardDivider provides a 1px horizontal rule that bleeds to card edges.
 * CardTitle uses type-heading-xs (17px/500).
 * CardDescription uses type-body-sm (14px/400) in text-secondary.
 * CardFooter uses type-caption (13px/400) in text-tertiary.
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "flex flex-col bg-card text-card-foreground border",
  {
    variants: {
      variant: {
        default:
          "rounded-md border-[var(--color-neutral-200)] shadow-[var(--elevation-sm)] gap-0",
        elevated:
          "rounded-lg border-[var(--color-neutral-200)] shadow-[var(--elevation-md)] gap-0",
        sunken:
          "rounded-md border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] shadow-none gap-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface CardProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof cardVariants> {}

function Card({ className, variant, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-variant={variant ?? "default"}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5",
        "px-6 pt-6 pb-0",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-[17px] font-medium leading-[26px] text-[var(--color-neutral-900)]",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "text-[14px] font-normal leading-[20px] text-[var(--color-neutral-600)]",
        className
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 py-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center px-6 pb-6 pt-0",
        "text-sm font-normal leading-[18px] text-[var(--color-neutral-500)]",
        className
      )}
      {...props}
    />
  );
}

/** Horizontal rule that bleeds to card edges. Place between CardContent sections. */
function CardDivider({ className, ...props }: React.ComponentProps<"hr">) {
  return (
    <hr
      data-slot="card-divider"
      className={cn("border-0 border-t border-[var(--color-neutral-200)] mx-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardDivider,
};
