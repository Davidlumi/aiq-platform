/**
 * Input - AiQ Design System v2.2 §5.6
 *
 * - Height: 44px (WCAG 2.5.8 minimum target)
 * - Focus ring: 2px navy-800, 2px offset
 * - Border: neutral-300 default, navy-800 on focus
 * - Background: raised surface (neutral-0)
 * - Error state: red-700 border + ring
 * - IME composition logic preserved for CJK language support
 */
import { useDialogComposition } from "@/components/ui/dialog";
import { useComposition } from "@/hooks/useComposition";
import { cn } from "@/lib/utils";
import * as React from "react";

function Input({
  className,
  type,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  ...props
}: React.ComponentProps<"input">) {
  // Get dialog composition context if available (no-op if not inside Dialog)
  const dialogComposition = useDialogComposition();

  // IME composition handlers for CJK language support
  const {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown,
  } = useComposition<HTMLInputElement>({
    onKeyDown: (e) => {
      const isComposing =
        (e.nativeEvent as any).isComposing || dialogComposition.justEndedComposing();
      if (e.key === "Enter" && isComposing) return;
      onKeyDown?.(e);
    },
    onCompositionStart: (e) => {
      dialogComposition.setComposing(true);
      onCompositionStart?.(e);
    },
    onCompositionEnd: (e) => {
      dialogComposition.markCompositionEnd();
      setTimeout(() => {
        dialogComposition.setComposing(false);
      }, 100);
      onCompositionEnd?.(e);
    },
  });

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Layout
        "h-11 w-full min-w-0",
        "px-3 py-2.5",
        "text-sm leading-none",
        // Surface & border
        "bg-input",
        "border border-input",
        "rounded-md",
        // Text
        "text-foreground",
        "placeholder:text-muted-foreground",
        // Selection
        "selection:bg-primary/20 selection:text-foreground",
        // Transition
        "transition-[border-color,box-shadow] duration-[120ms]",
        // Focus
        "outline-none",
        "focus-visible:border-ring",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // Error state
        "aria-invalid:border-destructive",
        "aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // File input
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

export { Input };
