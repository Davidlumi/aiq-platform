/**
 * rewardReviewService.ts — Stage 9 Review & Lock
 *
 * Pure functions. No DB access — callers pass in the loaded stage data.
 *
 * Checks:
 *   Staleness  — S1
 *   Completeness — C1, C2, C3, C4
 *   Coherence  — H1 (AI fallback), H2, H3, H4 (AI)
 *   Readiness  — R1, R2, R3, R4
 *
 * canLock(results, acks) — true only when zero hard flags and every soft flag
 *   is either resolved (status=pass after re-run) or acknowledged.
 *
 * Acknowledgment key: `${checkId}::${resultStateHash}` — persists across re-runs
 *   for unchanged results; a changed result invalidates the stale ack.
 */

import { createHash } from "crypto";
import {
  REWARD_INITIATIVE_LIBRARY,
  getRewardInitiative,
} from "../../shared/rewardInitiativeLibrary";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CheckCategory = "staleness" | "completeness" | "coherence" | "readiness";
export type CheckStatus = "pass" | "flag";
export type FlagType = "hard" | "soft";

export interface CheckResult {
  checkId: string;
  category: CheckCategory;
  status: CheckStatus;
  flagType: FlagType | null;   // null when status=pass
  message: string;
  sourceStage: number | null;  // which stage to navigate to for resolution
  resultStateHash: string;     // hash of the check's result data — ack key
}

export interface AcknowledgmentRecord {
  acknowledgedAt: number;
  rationale: string | null;
}

export type AcknowledgmentsMap = Record<string, AcknowledgmentRecord>;

// ── Stage data shapes (minimal — only what the checks need) ───────────────────

export interface StageStateData {
  /** Stage 1 */
  prework: {
    isCompleted: boolean;
    rewardAiAmbition: number | null;
    topRewardPrioritiesNext12Months: string[] | null;
  } | null;
  /** Stage 2 */
  vision: {
    state: string; // "unconfirmed" | "confirmed" | "stale"
  } | null;
  /** Stage 3 */
  strategy: {
    state: string;
    strategicShiftsJson: Array<{ id: string; text: string }> | null;
  } | null;
  /** Stage 4 */
  principles: {
    state: string;
    principlesJson: Array<{ id: string; principleId: string | null; text: string; selected: boolean }> | null;
    wontDosJson: Array<{ id: string; wontDoId: string | null; text: string; selected: boolean }> | null;
  } | null;
  /** Stage 5 */
  portfolio: {
    isCompleted: boolean;
    selectedInitiativesJson: string[] | null;
  } | null;
  /** Stage 5 custom initiatives */
  customInitiatives: Array<{
    id: string;
    title: string;
    inPortfolio: boolean;
    /** null = not rated yet */
    dataIntensity: string | null;
    changeImpact: string | null;
    integrationNeed: string | null;
    governanceSensitivity: string | null;
    /** Stage 7 cost/value */
    year1CostLow: number | null;
    year1CostHigh: number | null;
    valueLow: number | null;
    valueHigh: number | null;
  }>;
  /** Stage 6 */
  successMeasuresStage: {
    isConfirmed: boolean;
    isStale: boolean;
  } | null;
  successMeasures: Array<{
    initiativeId: string;
    isArchived: boolean;
  }>;
  /** Stage 7 */
  businessCase: {
    isConfirmed: boolean;
    isStale: boolean;
  } | null;
  /** Stage 7 computed model */
  businessCaseModel: {
    rollup: {
      conservative: { netBenefit3yr: number };
    };
    programmeFundingLines: Array<{ initiativeId: string }>;
  } | null;
  /** Stage 8 */
  capabilityStage: {
    isConfirmed: boolean;
    isStale: boolean;
    enablementCostJson: { low: number; high: number; note: string } | null;
  } | null;
  capabilityDimensions: Array<{
    dimension: string;
    currentLevel: string | null;
    requiredLevel: string | null;
    gapStatus: string | null;
    actionNote: string | null;
  }>;
}

// ── Hash helpers ──────────────────────────────────────────────────────────────

function hashResult(data: unknown): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 16);
}

// ── Acknowledgment key ────────────────────────────────────────────────────────

export function ackKey(checkId: string, resultStateHash: string): string {
  return `${checkId}::${resultStateHash}`;
}

// ── Individual check helpers ──────────────────────────────────────────────────

function pass(checkId: string, category: CheckCategory, message: string, data: unknown): CheckResult {
  return { checkId, category, status: "pass", flagType: null, message, sourceStage: null, resultStateHash: hashResult(data) };
}

function flag(
  checkId: string,
  category: CheckCategory,
  flagType: FlagType,
  message: string,
  sourceStage: number | null,
  data: unknown
): CheckResult {
  return { checkId, category, status: "flag", flagType, message, sourceStage, resultStateHash: hashResult(data) };
}

// ── S1 — Staleness ────────────────────────────────────────────────────────────

export function runStalenessChecks(data: StageStateData): CheckResult[] {
  const staleStages: number[] = [];

  if (data.vision?.state === "stale") staleStages.push(2);
  if (data.strategy?.state === "stale") staleStages.push(3);
  if (data.principles?.state === "stale") staleStages.push(4);
  if (data.successMeasuresStage?.isStale) staleStages.push(6);
  if (data.businessCase?.isStale) staleStages.push(7);
  if (data.capabilityStage?.isStale) staleStages.push(8);

  const resultData = { staleStages };

  if (staleStages.length === 0) {
    return [pass("S1", "staleness", "All confirmed stages are current.", resultData)];
  }

  return [
    flag(
      "S1",
      "staleness",
      "hard",
      `Stage${staleStages.length > 1 ? "s" : ""} ${staleStages.join(", ")} ${staleStages.length > 1 ? "are" : "is"} stale — reconfirm before locking.`,
      staleStages[0],
      resultData
    ),
  ];
}

// ── C1–C4 — Completeness ──────────────────────────────────────────────────────

export function runCompletenessChecks(data: StageStateData): CheckResult[] {
  const results: CheckResult[] = [];

  // C1 — All stages 1-8 confirmed
  const unconfirmed: number[] = [];
  if (!data.prework?.isCompleted) unconfirmed.push(1);
  if (!data.vision || data.vision.state !== "confirmed") unconfirmed.push(2);
  if (!data.strategy || data.strategy.state !== "confirmed") unconfirmed.push(3);
  if (!data.principles || data.principles.state !== "confirmed") unconfirmed.push(4);
  if (!data.portfolio?.isCompleted) unconfirmed.push(5);
  if (!data.successMeasuresStage?.isConfirmed) unconfirmed.push(6);
  if (!data.businessCase?.isConfirmed) unconfirmed.push(7);
  if (!data.capabilityStage?.isConfirmed) unconfirmed.push(8);

  const c1Data = { unconfirmed };
  if (unconfirmed.length === 0) {
    results.push(pass("C1", "completeness", "All stages 1–8 are confirmed.", c1Data));
  } else {
    results.push(flag(
      "C1", "completeness", "soft",
      `Stage${unconfirmed.length > 1 ? "s" : ""} ${unconfirmed.join(", ")} ${unconfirmed.length > 1 ? "are" : "is"} not yet confirmed.`,
      unconfirmed[0], c1Data
    ));
  }

  // C2 — Every selected initiative has at least one success measure
  const selectedIds = data.portfolio?.selectedInitiativesJson ?? [];
  const customInPortfolio = data.customInitiatives.filter(c => c.inPortfolio).map(c => c.id);
  const allSelectedIds = [...selectedIds, ...customInPortfolio];
  const measuredIds = new Set(
    data.successMeasures.filter(m => !m.isArchived).map(m => m.initiativeId)
  );
  const missingMeasures = allSelectedIds.filter(id => !measuredIds.has(id));
  const c2Data = { missingMeasures };
  if (missingMeasures.length === 0) {
    results.push(pass("C2", "completeness", "Every selected initiative has at least one success measure.", c2Data));
  } else {
    const titles = missingMeasures.map(id => {
      const lib = getRewardInitiative(id);
      return lib?.title ?? id;
    });
    results.push(flag(
      "C2", "completeness", "soft",
      `${missingMeasures.length} initiative${missingMeasures.length > 1 ? "s" : ""} ${missingMeasures.length > 1 ? "have" : "has"} no success measures: ${titles.slice(0, 3).join(", ")}${titles.length > 3 ? ` +${titles.length - 3} more` : ""}.`,
      6, c2Data
    ));
  }

  // C3 — Capability assessed for all five dimensions
  const DIMENSIONS = ["data_foundations", "change_management", "systems_integration", "governance", "team_skills"];
  const assessedDims = new Set(
    data.capabilityDimensions.filter(d => d.currentLevel !== null).map(d => d.dimension)
  );
  const unassessedDims = DIMENSIONS.filter(d => !assessedDims.has(d));
  const c3Data = { unassessedDims };
  if (unassessedDims.length === 0) {
    results.push(pass("C3", "completeness", "All five capability dimensions have been assessed.", c3Data));
  } else {
    results.push(flag(
      "C3", "completeness", "soft",
      `${unassessedDims.length} capability dimension${unassessedDims.length > 1 ? "s" : ""} not yet assessed: ${unassessedDims.join(", ")}.`,
      8, c3Data
    ));
  }

  // C4 — Custom initiatives in portfolio have cost/value and capability rating
  const incompleteCustom = data.customInitiatives.filter(ci => {
    if (!ci.inPortfolio) return false;
    const noCapability = ci.dataIntensity === null;
    const noCostValue = ci.year1CostLow === null && ci.valueLow === null;
    return noCapability || noCostValue;
  });
  const c4Data = { incompleteCustom: incompleteCustom.map(c => ({ id: c.id, title: c.title })) };
  if (incompleteCustom.length === 0) {
    results.push(pass("C4", "completeness", "All custom initiatives have cost/value and capability ratings.", c4Data));
  } else {
    results.push(flag(
      "C4", "completeness", "soft",
      `${incompleteCustom.length} custom initiative${incompleteCustom.length > 1 ? "s" : ""} ${incompleteCustom.length > 1 ? "are" : "is"} missing cost/value or capability ratings: ${incompleteCustom.map(c => c.title).join(", ")}.`,
      5, c4Data
    ));
  }

  return results;
}

// ── H1–H4 — Coherence ────────────────────────────────────────────────────────

/**
 * H2 — Principle support: every confirmed principle is supported by ≥1 selected initiative.
 * Uses `supportsPrincipleIds` from the library.
 */
export function runH2PrincipleSupport(data: StageStateData): CheckResult {
  const selectedIds = data.portfolio?.selectedInitiativesJson ?? [];
  const confirmedPrinciples = (data.principles?.principlesJson ?? [])
    .filter(p => p.selected && p.principleId !== null)
    .map(p => p.principleId as string);

  if (confirmedPrinciples.length === 0) {
    const d = { confirmedPrinciples: [], orphaned: [] };
    return pass("H2", "coherence", "No canonical principles confirmed — nothing to check.", d);
  }

  // Build set of principle IDs supported by selected initiatives
  const supportedPrincipleIds = new Set<string>();
  for (const id of selectedIds) {
    const initiative = getRewardInitiative(id);
    if (initiative?.supportsPrincipleIds) {
      for (const pid of initiative.supportsPrincipleIds) {
        supportedPrincipleIds.add(pid);
      }
    }
  }

  const orphaned = confirmedPrinciples.filter(pid => !supportedPrincipleIds.has(pid));
  const d = { confirmedPrinciples, orphaned };

  if (orphaned.length === 0) {
    return pass("H2", "coherence", "All confirmed principles are supported by at least one selected initiative.", d);
  }

  return flag(
    "H2", "coherence", "soft",
    `${orphaned.length} principle${orphaned.length > 1 ? "s" : ""} ${orphaned.length > 1 ? "are" : "is"} not supported by any selected initiative: ${orphaned.join(", ")}.`,
    4, d
  );
}

/**
 * H3 — Won't-do compliance: no selected initiative violates a confirmed won't-do.
 * Uses `affectsInitiativesJson` from the won't-do template table (passed in).
 */
export function runH3WontDoCompliance(
  data: StageStateData,
  wontDoTemplates: Array<{ wontDoId: string; affectsInitiativesJson: number[] | null }>
): CheckResult {
  const selectedIds = data.portfolio?.selectedInitiativesJson ?? [];
  const confirmedWontDoIds = (data.principles?.wontDosJson ?? [])
    .filter(w => w.selected && w.wontDoId !== null)
    .map(w => w.wontDoId as string);

  if (confirmedWontDoIds.length === 0) {
    const d = { violations: [] };
    return pass("H3", "coherence", "No won't-dos confirmed — nothing to check.", d);
  }

  // Build set of initiative numbers that are selected
  const selectedNumbers = new Set<number>(
    selectedIds
      .map(id => getRewardInitiative(id)?.number)
      .filter((n): n is number => n !== undefined)
  );

  const violations: Array<{ wontDoId: string; initiativeNumbers: number[] }> = [];
  for (const wontDoId of confirmedWontDoIds) {
    const template = wontDoTemplates.find(t => t.wontDoId === wontDoId);
    if (!template?.affectsInitiativesJson) continue;
    const affected = template.affectsInitiativesJson.filter(n => selectedNumbers.has(n));
    if (affected.length > 0) {
      violations.push({ wontDoId, initiativeNumbers: affected });
    }
  }

  const d = { violations };
  if (violations.length === 0) {
    return pass("H3", "coherence", "No selected initiative violates a confirmed won't-do.", d);
  }

  return flag(
    "H3", "coherence", "soft",
    `${violations.length} won't-do conflict${violations.length > 1 ? "s" : ""} detected — a selected initiative contradicts a confirmed exclusion.`,
    4, d
  );
}

/**
 * H4 — Ambition match: portfolio scope broadly consistent with stated ambition.
 * Deterministic heuristic (AI call is done in the router for the narrative).
 * Soft flag only.
 */
export function runH4AmbitionMatch(data: StageStateData): CheckResult {
  const selectedIds = data.portfolio?.selectedInitiativesJson ?? [];
  const customInPortfolio = data.customInitiatives.filter(c => c.inPortfolio).length;
  const totalCount = selectedIds.length + customInPortfolio;
  const ambition = data.prework?.rewardAiAmbition ?? 3; // 1-5

  // Heuristic: ambition 4-5 with ≤2 initiatives is under-scoped;
  //            ambition 1-2 with ≥10 initiatives is over-scoped.
  const d = { totalCount, ambition };

  if (ambition >= 4 && totalCount <= 2) {
    return flag(
      "H4", "coherence", "soft",
      `High ambition (${ambition}/5) but only ${totalCount} initiative${totalCount !== 1 ? "s" : ""} selected — portfolio may be under-scoped for the stated ambition.`,
      5, d
    );
  }
  if (ambition <= 2 && totalCount >= 10) {
    return flag(
      "H4", "coherence", "soft",
      `Cautious ambition (${ambition}/5) but ${totalCount} initiatives selected — portfolio scope may exceed the stated ambition.`,
      5, d
    );
  }

  return pass("H4", "coherence", "Portfolio scope is broadly consistent with the stated ambition.", d);
}

/**
 * H1 — Shift coverage: every strategic shift is served by ≥1 selected initiative.
 *
 * LIMITATION — read before relying on this check:
 *
 * H1 is an independent AI judgment, not a deterministic mapping. The LLM receives the
 * shift texts and initiative titles from the library and decides whether coverage is
 * adequate. Stage 5’s recommendation engine makes the same kind of judgment using the
 * same library titles, so the two calls usually agree — but they are separate LLM
 * invocations answering different questions and can disagree.
 *
 * Stage 5 asks “which initiatives best fit this profile?”; H1 asks “do the selected
 * initiatives cover these shifts?”. If the user curated a portfolio that differs from
 * Stage 5’s recommendations, H1 may flag a shift that Stage 5 considered served by an
 * initiative the user chose not to select — and that flag is correct.
 *
 * There is NO structural guarantee that H1 will never contradict Stage 5. A real
 * guarantee would require a deterministic shift→initiative mapping (e.g. a lookup table
 * in the library) that both stages share. That mapping does not currently exist.
 *
 * For beta: H1 is a soft, dismissible flag. Its value is as a prompt to review
 * coverage, not as an authoritative verdict. Users can acknowledge and proceed.
 *
 * This function returns a placeholder that the router replaces with the AI result.
 */
export function runH1ShiftCoverageSync(data: StageStateData): CheckResult {
  const shifts = data.strategy?.strategicShiftsJson ?? [];
  const selectedIds = data.portfolio?.selectedInitiativesJson ?? [];
  const d = { shiftCount: shifts.length, initiativeCount: selectedIds.length };

  if (shifts.length === 0) {
    return pass("H1", "coherence", "No strategic shifts confirmed — nothing to check.", d);
  }
  if (selectedIds.length === 0) {
    return flag("H1", "coherence", "soft", "No initiatives selected — shifts cannot be served.", 5, d);
  }

  // Pending AI judgment — router will replace this with the actual result
  return pass("H1", "coherence", "Shift coverage check pending AI analysis.", { ...d, pending: true });
}

export function runCoherenceChecks(
  data: StageStateData,
  wontDoTemplates: Array<{ wontDoId: string; affectsInitiativesJson: number[] | null }>,
  h1Result?: CheckResult // AI result injected by router
): CheckResult[] {
  const h1 = h1Result ?? runH1ShiftCoverageSync(data);
  const h2 = runH2PrincipleSupport(data);
  const h3 = runH3WontDoCompliance(data, wontDoTemplates);
  const h4 = runH4AmbitionMatch(data);
  return [h1, h2, h3, h4];
}

// ── R1–R4 — Readiness ─────────────────────────────────────────────────────────

export function runReadinessChecks(data: StageStateData): CheckResult[] {
  const results: CheckResult[] = [];

  // R1 — Conservative scenario net-negative
  if (!data.businessCase?.isConfirmed || !data.businessCaseModel) {
    // Graceful degradation — business case not confirmed, surface as C1 not R1
    // (already caught by C1)
  } else {
    const conservativeNet = data.businessCaseModel.rollup.conservative.netBenefit3yr;
    const r1Data = { conservativeNet };
    if (conservativeNet < 0) {
      results.push(flag(
        "R1", "readiness", "soft",
        `Conservative scenario is net-negative (${conservativeNet < 0 ? "−" : ""}£${Math.abs(Math.round(conservativeNet / 1000))}k over 3 years). The central case may still be positive — acknowledge if you plan to lead with the risk/compliance rationale.`,
        7, r1Data
      ));
    } else {
      results.push(pass("R1", "readiness", "Conservative scenario is net-positive.", r1Data));
    }
  }

  // R2 — Capability reds without enablement actions
  if (data.capabilityStage?.isConfirmed) {
    const redWithoutAction = data.capabilityDimensions.filter(
      d => d.gapStatus === "significant_gap" && (!d.actionNote || d.actionNote.trim().length < 10)
    );
    const r2Data = { redWithoutAction: redWithoutAction.map(d => d.dimension) };
    if (redWithoutAction.length === 0) {
      results.push(pass("R2", "readiness", "All significant capability gaps have enablement actions.", r2Data));
    } else {
      results.push(flag(
        "R2", "readiness", "soft",
        `${redWithoutAction.length} significant capability gap${redWithoutAction.length > 1 ? "s" : ""} without an enablement action: ${redWithoutAction.map(d => d.dimension.replace(/_/g, " ")).join(", ")}.`,
        8, r2Data
      ));
    }
  }

  // R3 — Enablement cost material
  if (data.capabilityStage?.isConfirmed && data.capabilityStage.enablementCostJson) {
    const { low, high } = data.capabilityStage.enablementCostJson;
    const r3Data = { enablementCostLow: low, enablementCostHigh: high };
    if (low > 0) {
      results.push(flag(
        "R3", "readiness", "soft",
        `Enablement cost (£${Math.round(low / 1000)}k–£${Math.round(high / 1000)}k) is additional to the business-case investment. Acknowledge or fold a phase-0 line into the business case.`,
        8, r3Data
      ));
    } else {
      results.push(pass("R3", "readiness", "No additional enablement investment required.", r3Data));
    }
  }

  // R4 — Programme funding pending
  if (data.businessCaseModel) {
    const pfLines = data.businessCaseModel.programmeFundingLines;
    const r4Data = { programmeFundingCount: pfLines.length };
    if (pfLines.length > 0) {
      results.push(flag(
        "R4", "readiness", "soft",
        `${pfLines.length} initiative${pfLines.length > 1 ? "s" : ""} ${pfLines.length > 1 ? "include" : "includes"} programme funding (payroll uplift) that is a separate decision — acknowledge as pending.`,
        7, r4Data
      ));
    } else {
      results.push(pass("R4", "readiness", "No programme-funded initiatives in portfolio.", r4Data));
    }
  }

  return results;
}

// ── canLock ───────────────────────────────────────────────────────────────────

/**
 * Returns true only when:
 *   - zero hard flags are outstanding (status=flag AND flagType=hard)
 *   - every soft flag is either resolved (status=pass after re-run) or acknowledged
 */
export function canLock(
  checkResults: CheckResult[],
  acknowledgments: AcknowledgmentsMap
): { canLock: boolean; blockingCheckIds: string[] } {
  const blocking: string[] = [];

  for (const check of checkResults) {
    if (check.status !== "flag") continue;

    if (check.flagType === "hard") {
      blocking.push(check.checkId);
      continue;
    }

    // Soft flag — must be acknowledged with the current result state hash
    const key = ackKey(check.checkId, check.resultStateHash);
    if (!acknowledgments[key]) {
      blocking.push(check.checkId);
    }
  }

  return { canLock: blocking.length === 0, blockingCheckIds: blocking };
}

/**
 * Prune stale acknowledgments: remove any ack whose result state hash no longer
 * matches any current check result. Keeps acks for unchanged checks.
 */
export function pruneStaleAcknowledgments(
  checkResults: CheckResult[],
  acknowledgments: AcknowledgmentsMap
): AcknowledgmentsMap {
  const validKeys = new Set(
    checkResults.map(c => ackKey(c.checkId, c.resultStateHash))
  );
  const pruned: AcknowledgmentsMap = {};
  for (const [key, ack] of Object.entries(acknowledgments)) {
    if (validKeys.has(key)) {
      pruned[key] = ack;
    }
  }
  return pruned;
}
