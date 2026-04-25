/**
 * Tabs — AiQ Design System v2.2 §5.8
 *
 * Pattern: underline tabs — transparent background, 2px navy-800 bottom border on active.
 * No pill/filled background. No rounded container.
 */
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "flex items-end gap-0 bg-transparent",
        "border-b border-[var(--color-neutral-200)]",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex items-center justify-center",
        "px-4 py-2.5",
        "text-sm font-normal leading-none whitespace-nowrap",
        "text-[var(--color-neutral-600)]",
        "bg-transparent border-0 border-b-2 border-b-transparent",
        "-mb-px", // overlap tablist bottom border
        "cursor-pointer select-none",
        "transition-colors duration-[120ms]",
        "hover:text-[var(--color-neutral-900)] hover:border-b-[var(--color-neutral-300)]",
        "data-[state=active]:text-[var(--color-neutral-900)] data-[state=active]:font-medium data-[state=active]:border-b-[var(--navy-800)]",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--navy-800)] focus-visible:ring-offset-2 focus-visible:rounded-sm",
        "disabled:pointer-events-none disabled:opacity-40",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
