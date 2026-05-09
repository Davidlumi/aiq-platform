/**
 * v1.4 Change 2 — Pathway Breadcrumb (v3 refinement)
 *
 * Renders: Domain ▸ Level ▸ Module N of M
 * Domain and Level segments are clickable links.
 * Sits above the module title.
 *
 * v3 colour discipline:
 *   - Domain segment: muted grey (was per-domain colour, e.g. pink)
 *   - Level segment: muted grey
 *   - Module position (current): primary green — the only coloured segment
 *   - Hover: brighter grey + underline on clickable segments
 */
import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DOMAIN_META: Record<string, { label: string }> = {
  ai_interaction:        { label: "AI Interaction" },
  ai_output_evaluation:  { label: "AI Output Evaluation" },
  ai_workflow_design:    { label: "AI Workflow Design" },
  ai_ethics_trust:       { label: "AI Ethics & Trust" },
  workforce_ai_readiness:{ label: "Workforce AI Readiness" },
  ai_change_leadership:  { label: "AI Change Leadership" },
};

const LEVEL_LABELS: Record<number, string> = {
  1: "Foundation",
  2: "Developing",
  3: "Practitioner",
  4: "Advanced",
  5: "Expert",
  6: "Master",
};

interface ModulePathwayBreadcrumbProps {
  capability: string;
  difficulty: number;
  moduleIndex: number;
  totalModules: number;
  className?: string;
}

export default function ModulePathwayBreadcrumb({
  capability,
  difficulty,
  moduleIndex,
  totalModules,
  className,
}: ModulePathwayBreadcrumbProps) {
  const [, setLocation] = useLocation();
  const domainMeta = DOMAIN_META[capability] ?? { label: capability };
  const levelLabel = LEVEL_LABELS[difficulty] ?? `Level ${difficulty}`;

  const handleDomainClick = () => {
    setLocation(`/development/${capability}`);
  };

  const handleLevelClick = () => {
    setLocation(`/development/${capability}?level=${difficulty}`);
  };

  return (
    <nav
      className={cn("flex items-center gap-1 text-xs flex-wrap", className)}
      aria-label="Module pathway breadcrumb"
    >
      {/* Domain — muted grey, clickable */}
      <button
        onClick={handleDomainClick}
        className="text-muted-foreground/60 hover:text-muted-foreground hover:underline transition-colors font-medium"
        aria-label={`Go to ${domainMeta.label} domain pathway`}
      >
        {domainMeta.label}
      </button>

      <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground/30" />

      {/* Level — muted grey, clickable */}
      <button
        onClick={handleLevelClick}
        className="text-muted-foreground/60 hover:text-muted-foreground hover:underline transition-colors"
        aria-label={`Go to ${levelLabel} level in ${domainMeta.label}`}
      >
        {levelLabel}
      </button>

      <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground/30" />

      {/* Module position — green (current location) */}
      <span className="text-primary font-medium">
        Module {moduleIndex} of {totalModules}
      </span>
    </nav>
  );
}
