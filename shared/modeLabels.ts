/**
 * modeLabels.ts — centralised mode-aware label system for the Two-Mode Build.
 *
 * CPO mode   → the original HR AI Strategy flow (Chief People Officer audience)
 * Reward mode → the Reward Leader flow (Head of Reward / CFO / CHRO audience)
 *
 * Usage:
 *   import { getModeLabels } from "@/../../shared/modeLabels";
 *   const labels = getModeLabels(tenantMode);
 *   labels.stage10Label  // "Board Report" | "Exec Report"
 */

export type TenantMode = "cpo" | "reward";

export interface ModeLabels {
  /** Short name for the mode shown in the UI badge */
  modeBadge: string;
  /** Full role title for the primary user */
  roleTitle: string;
  /** The audience for the final deliverable (Stage 10) */
  finalAudience: string;
  /** Stage 10 label */
  stage10Label: string;
  /** Stage 10 short label */
  stage10ShortLabel: string;
  /** Stage 10 tooltip */
  stage10What: string;
  /** Stage 9 label */
  stage9Label: string;
  /** Stage 9 tooltip */
  stage9What: string;
  /** Stage 7 narrative audience description */
  stage7AudienceDesc: string;
  /** Stage 1 tooltip */
  stage1What: string;
  /** Generic "HR team" label */
  teamLabel: string;
  /** Generic "CPO" / "Head of Reward" label */
  leaderLabel: string;
  /** "Board" | "CFO & CHRO" */
  sponsorLabel: string;
  /** "HR function" | "Reward function" */
  functionLabel: string;
}

const CPO_LABELS: ModeLabels = {
  modeBadge: "CPO Mode",
  roleTitle: "Chief People Officer",
  finalAudience: "Board",
  stage10Label: "Board Report",
  stage10ShortLabel: "Report",
  stage10What: "Generate and finalise your board-ready strategy report",
  stage9Label: "Review",
  stage9What: "Hold your leadership review session and record tensions",
  stage7AudienceDesc: "The case you'll take to your board. Numbers and risks support the argument — but the argument is the deliverable.",
  stage1What: "Complete the 9 background input sections about your organisation",
  teamLabel: "HR team",
  leaderLabel: "CPO",
  sponsorLabel: "Board",
  functionLabel: "HR function",
};

const REWARD_LABELS: ModeLabels = {
  modeBadge: "Reward Mode",
  roleTitle: "Head of Reward",
  finalAudience: "CFO & CHRO",
  stage10Label: "Exec Report",
  stage10ShortLabel: "Report",
  stage10What: "Generate and finalise your CFO & CHRO-ready reward strategy report",
  stage9Label: "Review",
  stage9What: "Hold your leadership review session and record tensions with your CHRO and CFO",
  stage7AudienceDesc: "The case you'll take to your CFO and CHRO. Numbers and risks support the argument — but the argument is the deliverable.",
  stage1What: "Complete the background input sections about your organisation and reward context",
  teamLabel: "Reward team",
  leaderLabel: "Head of Reward",
  sponsorLabel: "CFO & CHRO",
  functionLabel: "Reward function",
};

export function getModeLabels(mode: TenantMode | null | undefined): ModeLabels {
  return mode === "reward" ? REWARD_LABELS : CPO_LABELS;
}
