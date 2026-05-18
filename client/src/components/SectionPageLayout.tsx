/**
 * SectionPageLayout — reusable wrapper for all strategy section pages.
 *
 * Provides:
 *  - Breadcrumb: "HR AI Strategy / [section title]"  (or "Back to summary / Deep dive — [label]")
 *  - Section badge: "Section N · [label]"
 *  - Page title (h1)
 *  - Optional right-aligned actions slot
 *  - Optional gate banner (locked / edited-after-clearing)
 *  - Deep-dive mode banner + "Back to summary" breadcrumb
 *  - Consistent max-width, padding, and block spacing
 */
import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, AlertTriangle, BookOpen } from "lucide-react";

interface SectionPageLayoutProps {
  /** Section number, e.g. "06" */
  sectionNumber: string;
  /** Short section label, e.g. "Measurement" */
  sectionLabel: string;
  /** Full page h1 title */
  title: string;
  /** Accent colour for the icon background (CSS colour string) */
  accentColor: string;
  /** Icon element rendered inside the accent circle */
  icon: React.ReactNode;
  /** Optional actions rendered in the top-right of the header */
  actions?: React.ReactNode;
  /**
   * When true the page renders a locked banner and dims the body.
   * The CPO can still navigate here to read content but cannot edit.
   */
  isLocked?: boolean;
  /**
   * When true the page renders an "edited after clearing" cascade banner
   * prompting the CPO to re-confirm.
   */
  editedAfterClearing?: boolean;
  /** Label for the upstream stage that was edited, used in the cascade banner */
  upstreamStageLabel?: string;
  /**
   * When true the page renders in "deep dive" mode:
   * - Header shows "Deep dive — [sectionLabel]" with a "Back to summary" link
   * - A subtle info banner explains the mode
   */
  isDeepDive?: boolean;
  /** Timestamp (ms) when this stage was confirmed — shown in deep-dive header */
  confirmedAt?: number | null;
  children: React.ReactNode;
}

export default function SectionPageLayout({
  sectionNumber,
  sectionLabel,
  title,
  accentColor,
  icon,
  actions,
  isLocked = false,
  editedAfterClearing = false,
  upstreamStageLabel,
  isDeepDive = false,
  confirmedAt,
  children,
}: SectionPageLayoutProps) {
  const [, navigate] = useLocation();

  const confirmedLabel = confirmedAt
    ? new Date(confirmedAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="max-w-5xl mx-auto pb-16 px-0">
      {/* Breadcrumb */}
      {isDeepDive ? (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 mb-6 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/strategy")}
          >
            <ArrowLeft className="w-3 h-3 mr-1" aria-hidden="true" />
            Back to summary
          </Button>
          <span className="text-muted-foreground text-xs" aria-hidden="true">/</span>
          <span className="text-xs font-medium text-foreground">Deep dive — {sectionLabel}</span>
          {confirmedLabel && (
            <span className="ml-auto text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              Confirmed {confirmedLabel}
            </span>
          )}
        </nav>
      ) : (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 mb-6 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/strategy")}
          >
            <ArrowLeft className="w-3 h-3 mr-1" aria-hidden="true" />
            HR AI Strategy
          </Button>
          <span className="text-muted-foreground text-xs" aria-hidden="true">/</span>
          <span className="text-xs font-medium text-foreground">{sectionLabel}</span>
        </nav>
      )}

      {/* Deep-dive mode banner */}
      {isDeepDive && (
        <div className="flex items-center gap-3 rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-2.5 mb-6">
          <BookOpen className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" aria-hidden="true" />
          <p className="text-xs text-violet-400">
            <span className="font-semibold">Deep dive mode</span> — you can review and edit this section. Changes will trigger cascade banners on downstream stages.
          </p>
        </div>
      )}

      {/* Locked gate banner */}
      {isLocked && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 mb-6">
          <Lock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              This section is locked
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete the previous stage to unlock editing. You can read this section but cannot make changes.
            </p>
          </div>
        </div>
      )}

      {/* Edited-after-clearing cascade banner */}
      {!isLocked && editedAfterClearing && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 mb-6">
          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
              {upstreamStageLabel
                ? `${upstreamStageLabel} has been updated`
                : "An earlier stage has been updated"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review this section and re-confirm if the changes affect your decisions here.
            </p>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className={`flex items-center gap-3 mb-8 ${isLocked ? "opacity-60" : ""}`}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accentColor}20`, color: accentColor }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Section {sectionNumber}
          </p>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
        </div>
        {actions && (
          <div className="ml-auto flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Page body */}
      <div className={`space-y-10 ${isLocked ? "pointer-events-none opacity-60 select-none" : ""}`}>
        {children}
      </div>
    </div>
  );
}
