/**
 * SectionPageLayout — reusable wrapper for all six strategy section pages.
 *
 * Provides:
 *  - Breadcrumb: "HR AI Strategy / [section title]"
 *  - Section badge: "Section N · [label]"
 *  - Page title (h1)
 *  - Optional right-aligned actions slot
 *  - Consistent max-width, padding, and block spacing
 */
import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
  children: React.ReactNode;
}

export default function SectionPageLayout({
  sectionNumber,
  sectionLabel,
  title,
  accentColor,
  icon,
  actions,
  children,
}: SectionPageLayoutProps) {
  const [, navigate] = useLocation();

  return (
    <div className="max-w-5xl mx-auto pb-16 px-0">
      {/* Breadcrumb */}
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

      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
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
      <div className="space-y-10">
        {children}
      </div>
    </div>
  );
}
