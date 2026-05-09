/**
 * v1.4 Change 2 — Pathway Breadcrumb
 *
 * Renders: Domain ▸ Level ▸ Module N of M
 * Domain and Level segments are clickable links.
 * Sits above the module title.
 */
import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DOMAIN_META: Record<string, { label: string; color: string }> = {
  ai_interaction:        { label: "AI Interaction",        color: "#3B82F6" },
  ai_output_evaluation:  { label: "AI Output Evaluation",  color: "#8B5CF6" },
  ai_workflow_design:    { label: "AI Workflow Design",     color: "#10B981" },
  ai_ethics_trust:       { label: "AI Ethics & Trust",     color: "#F59E0B" },
  workforce_ai_readiness:{ label: "Workforce AI Readiness",color: "#EF4444" },
  ai_change_leadership:  { label: "AI Change Leadership",  color: "#EC4899" },
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
  const domainMeta = DOMAIN_META[capability] ?? { label: capability, color: "#888" };
  const levelLabel = LEVEL_LABELS[difficulty] ?? `Level ${difficulty}`;

  const handleDomainClick = () => {
    setLocation(`/development/${capability}`);
  };

  const handleLevelClick = () => {
    setLocation(`/development/${capability}?level=${difficulty}`);
  };

  return (
    <nav
      className={cn("flex items-center gap-1 text-xs text-muted-foreground flex-wrap", className)}
      aria-label="Module pathway breadcrumb"
    >
      {/* Domain */}
      <button
        onClick={handleDomainClick}
        className="hover:text-foreground transition-colors font-medium"
        style={{ color: domainMeta.color }}
        aria-label={`Go to ${domainMeta.label} domain pathway`}
      >
        {domainMeta.label}
      </button>

      <ChevronRight className="h-3 w-3 flex-shrink-0 opacity-50" />

      {/* Level */}
      <button
        onClick={handleLevelClick}
        className="hover:text-foreground transition-colors"
        aria-label={`Go to ${levelLabel} level in ${domainMeta.label}`}
      >
        {levelLabel}
      </button>

      <ChevronRight className="h-3 w-3 flex-shrink-0 opacity-50" />

      {/* Module position */}
      <span className="text-muted-foreground/70">
        Module {moduleIndex} of {totalModules}
      </span>
    </nav>
  );
}
