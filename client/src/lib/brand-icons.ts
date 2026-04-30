/**
 * AiQ Brand Icons — client-side icon map
 *
 * Maps domain keys and level keys to Lucide React icon components.
 * Import from here instead of defining DOMAIN_ICONS locally in page files.
 */
import {
  MessageSquare,
  ScanSearch,
  Workflow,
  Users,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { DomainKey } from "@shared/brand";

/** Canonical icon component per domain */
export const DOMAIN_ICONS: Record<DomainKey, LucideIcon> = {
  ai_interaction:         MessageSquare,  // Prompting / dialogue
  ai_output_evaluation:   ScanSearch,     // Scrutinising outputs
  ai_workflow_design:     Workflow,       // Process / flow design
  workforce_ai_readiness: Users,          // Team / people
  ai_ethics_trust:        ShieldCheck,    // Ethics / safety
  ai_change_leadership:   TrendingUp,     // Growth / transformation
};

/** Get the icon component for a domain key, with a safe fallback */
export function getDomainIcon(key: string): LucideIcon {
  return DOMAIN_ICONS[key as DomainKey] ?? MessageSquare;
}
