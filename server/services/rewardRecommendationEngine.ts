/**
 * Reward Recommendation Engine — v1
 *
 * Implements the four-signal scoring model from Stage 5 build brief §3:
 *   Signal 1: Sector fit (from initiative library SectorFitMap)
 *   Signal 2: Workforce fit (WorkforceFitRule evaluation)
 *   Signal 3: Capability fit (CapabilityFitRule evaluation)
 *   Signal 4: Priority fit (PriorityFitRule evaluation)
 *
 * Scoring:
 *   STRONG_FIT    = 3 points
 *   MODERATE_FIT  = 2 points
 *   WEAK_FIT      = 1 point
 *   NOT_RECOMMENDED = 0 points (and flags the initiative as not recommended)
 *
 * Final fit signal:
 *   NOT_RECOMMENDED if any rule returns NOT_RECOMMENDED
 *   STRONG_FIT  if average ≥ 2.5
 *   MODERATE_FIT if average ≥ 1.5
 *   WEAK_FIT otherwise
 *
 * Value calibration:
 *   calibratedLow  = base3yrLow  * payrollMult * headcountMult * sectorMult
 *   calibratedHigh = base3yrHigh * payrollMult * headcountMult * sectorMult
 *   payrollMult    = 1 + log10(payroll / baseline) * factor  (clamped 0.5–3)
 *   headcountMult  = 1 + log10(headcount / baseline) * factor (clamped 0.5–3)
 */

import crypto from "crypto";
import {
  REWARD_INITIATIVE_LIBRARY,
  type RewardInitiative,
  type FitSignal,
  type CapabilityFitRule,
  type WorkforceFitRule,
  type PriorityFitRule,
  type CostCalibration,
} from "../../shared/rewardInitiativeLibrary";

// ─── Input types ──────────────────────────────────────────────────────────────

export interface RewardEngineInputs {
  // Company Profile fields
  sector: string;
  geographicFootprint: string;
  ownershipStructure: string;
  totalEmployeeHeadcount: number | null;
  totalPayrollGbp: number | null;
  workforceFrontlinePct: number | null;
  workforceKnowledgePct: number | null;
  materialSalesWorkforce: string | null;
  criticalAiDigitalTalentPopulation: string | null;
  businessAiAmbition: number | null;
  fcaSysc19InScope: string | null;

  // Reward Pre-work fields
  rewardFunctionSize: number | null;
  rewardFunctionMaturityRating: number | null;
  aiMaturityInRewardToday: number | null;
  rewardAiAmbition: number | null;
  payEquityCapability: string | null;
  payStructureMaturity: string | null;
  ukGenderPayGapStatus: string | null;
  pensionSchemeArchitecture: string | null;
  externalCompDataSources: string[] | null;
  aiToolsCurrentlyInRewardUse: string[] | null;
  compManagementPlatform: string | null;
  unionWorksCouncilCoverage: string | null;
  primaryTriggerForRewardAiStrategy: string | null;
  topRewardPrioritiesNext12Months: string[] | null;
  strategicTimeline: string | null;
  aiTalentRetentionConcern: string | null;
  recentRemunerationVoteConcerns: string | null;
  nationalLivingWageExposure: string | null;
  /** Canonical principle IDs the tenant has confirmed in Stage 4 */
  confirmedPrincipleIds: string[];
  /** Won't-do template IDs the tenant has confirmed in Stage 4 */
  confirmedWontDoIds: string[];
  /** Won't-do note text keyed by wontDoId — for reassurance rendering */
  wontDoNotesByWontDoId: Record<string, string>;
  /** Principle text keyed by principleId — for alignment note rendering */
  principleTextByPrincipleId: Record<string, string>;
  /** Won't-do initiative numbers affected, keyed by wontDoId */
  wontDoAffectedNumbersByWontDoId: Record<string, number[]>;
}

export interface RewardRecommendationResult {
  initiativeId: string;
  number: number;
  title: string;
  shortDescription: string;
  subDomain: string;
  defaultPhase: string;
  complexity: string;
  fitSignal: FitSignal;
  fitScore: number;
  fitScoreMax: number;
  reasoningLines: string[];
  notRecommendedReason: string | null;
  calibratedValueLow: number;
  calibratedValueHigh: number;
  /** Calibrated Year 1 implementation cost range (interpolated by headcount + sector) */
  calibratedYear1CostLow: number;
  calibratedYear1CostHigh: number;
  /** Calibrated ongoing annual cost range */
  calibratedOngoingCostLow: number;
  calibratedOngoingCostHigh: number;
  /** Cost type: annual | project | per_cycle | per_deal */
  costType: string;
  /** True when implementation cost excludes programme funding */
  excludesProgrammeFunding: boolean;
  programmeFundingNote: string | null;
  costNote: string | null;
  bundleWith: string | null;
  prerequisiteOf: string[];
  requiresPrerequisite: string | null;
  signalBreakdown: {
    sector: FitSignal;
    workforce: FitSignal | null;
    capability: FitSignal | null;
    priority: FitSignal | null;
  };
  /** Canonical principle IDs confirmed by the tenant that this initiative supports */
  alignedPrincipleIds: string[];
  /** Principle text for each aligned principle (for UI rendering) */
  alignedPrincipleTexts: string[];
  /** Reassurance notes from won't-do templates that affect this initiative */
  wontDoReassuranceNotes: string[];
  /** Whether the fit score was boosted by principle alignment */
  principleBoostApplied: boolean;
}

export interface RewardEngineOutput {
  recommended: RewardRecommendationResult[];
  notRecommended: RewardRecommendationResult[];
  portfolioValueLow: number;
  portfolioValueHigh: number;
  engineVersion: string;
  inputsHash: string;
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

const FIT_SCORE: Record<FitSignal, number> = {
  STRONG_FIT: 3,
  MODERATE_FIT: 2,
  WEAK_FIT: 1,
  NOT_RECOMMENDED: 0,
};

function scoreToSignal(score: number): FitSignal {
  if (score >= 2.5) return "STRONG_FIT";
  if (score >= 1.5) return "MODERATE_FIT";
  return "WEAK_FIT";
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ─── Signal evaluators ────────────────────────────────────────────────────────

function evaluateSectorFit(initiative: RewardInitiative, sector: string): FitSignal {
  const sectorFit = initiative.sectorFit;
  return (sectorFit[sector as keyof typeof sectorFit] ?? sectorFit.default) ?? "MODERATE_FIT";
}

function evaluateWorkforceFit(
  rules: WorkforceFitRule[],
  inputs: RewardEngineInputs
): FitSignal | null {
  if (rules.length === 0) return null;
  let worst: FitSignal = "STRONG_FIT";
  for (const rule of rules) {
    let fieldVal: number | string | null = null;
    if (rule.field === "workforceFrontlinePct") fieldVal = inputs.workforceFrontlinePct;
    else if (rule.field === "workforceKnowledgePct") fieldVal = inputs.workforceKnowledgePct;
    else if (rule.field === "materialSalesWorkforce") fieldVal = inputs.materialSalesWorkforce;
    else if (rule.field === "criticalAiDigitalTalentPopulation") fieldVal = inputs.criticalAiDigitalTalentPopulation;

    if (fieldVal === null || fieldVal === undefined) continue;

    let matches = false;
    if (typeof rule.value === "number" && typeof fieldVal === "number") {
      if (rule.op === ">=") matches = fieldVal >= rule.value;
      else if (rule.op === "<") matches = fieldVal < rule.value;
      else if (rule.op === "==") matches = fieldVal === rule.value;
      else if (rule.op === "!=") matches = fieldVal !== rule.value;
    } else if (typeof rule.value === "string" && typeof fieldVal === "string") {
      if (rule.op === "==") matches = fieldVal === rule.value;
      else if (rule.op === "!=") matches = fieldVal !== rule.value;
    } else if (Array.isArray(rule.value) && typeof fieldVal === "string") {
      if ((rule.op as string) === "in") matches = (rule.value as string[]).includes(fieldVal);
      else if ((rule.op as string) === "not_in") matches = !(rule.value as string[]).includes(fieldVal);
    }

    if (matches) {
      if (FIT_SCORE[rule.result] < FIT_SCORE[worst]) {
        worst = rule.result;
      }
    }
  }
  return worst;
}

function evaluateCapabilityFit(
  rules: CapabilityFitRule[],
  inputs: RewardEngineInputs
): { signal: FitSignal | null; notRecommendedReason: string | null } {
  if (rules.length === 0) return { signal: null, notRecommendedReason: null };

  let worst: FitSignal = "STRONG_FIT";
  let notRecommendedReason: string | null = null;

  for (const rule of rules) {
    let fieldVal: string | number | string[] | null = null;
    if (rule.field === "payEquityCapability") fieldVal = inputs.payEquityCapability;
    else if (rule.field === "payStructureMaturity") fieldVal = inputs.payStructureMaturity;
    else if (rule.field === "aiMaturityInRewardToday") fieldVal = inputs.aiMaturityInRewardToday;
    else if (rule.field === "rewardFunctionMaturityRating") fieldVal = inputs.rewardFunctionMaturityRating;
    else if (rule.field === "rewardAiAmbition") fieldVal = inputs.rewardAiAmbition;
    else if (rule.field === "compManagementPlatform") fieldVal = inputs.compManagementPlatform;
    else if (rule.field === "aiToolsCurrentlyInRewardUse") fieldVal = inputs.aiToolsCurrentlyInRewardUse;
    else if (rule.field === "externalCompDataSources") fieldVal = inputs.externalCompDataSources;
    else if (rule.field === "pensionSchemeArchitecture") fieldVal = inputs.pensionSchemeArchitecture;
    else if (rule.field === "unionWorksCouncilCoverage") fieldVal = inputs.unionWorksCouncilCoverage;

    if (fieldVal === null || fieldVal === undefined) continue;

    let matches = false;
    const ruleValue = rule.value;

    if (typeof ruleValue === "number" && typeof fieldVal === "number") {
      if (rule.op === ">=") matches = fieldVal >= ruleValue;
      else if (rule.op === "<") matches = fieldVal < ruleValue;
      else if (rule.op === "==") matches = fieldVal === ruleValue;
      else if (rule.op === "!=") matches = fieldVal !== ruleValue;
    } else if (typeof ruleValue === "string" && typeof fieldVal === "string") {
      if (rule.op === "==") matches = fieldVal === ruleValue;
      else if (rule.op === "!=") matches = fieldVal !== ruleValue;
    } else if (Array.isArray(ruleValue)) {
      if (Array.isArray(fieldVal)) {
        // field is an array (e.g. aiToolsCurrentlyInRewardUse)
        if (rule.op === "in") {
          // any element of fieldVal is in ruleValue
          matches = (fieldVal as string[]).some((v) => (ruleValue as string[]).includes(v));
        } else if (rule.op === "not_in") {
          matches = !(fieldVal as string[]).some((v) => (ruleValue as string[]).includes(v));
        }
      } else if (typeof fieldVal === "string") {
        if (rule.op === "in") matches = (ruleValue as string[]).includes(fieldVal);
        else if (rule.op === "not_in") matches = !(ruleValue as string[]).includes(fieldVal);
      }
    }

    if (matches) {
      if (rule.result === "NOT_RECOMMENDED") {
        notRecommendedReason = rule.reasoning ?? "Not recommended based on current capability.";
        worst = "NOT_RECOMMENDED";
        break;
      }
      if (FIT_SCORE[rule.result] < FIT_SCORE[worst]) {
        worst = rule.result;
      }
    }
  }

  return { signal: worst, notRecommendedReason };
}

function evaluatePriorityFit(
  rules: PriorityFitRule[],
  inputs: RewardEngineInputs
): FitSignal | null {
  if (rules.length === 0) return null;
  let best: FitSignal = "WEAK_FIT";
  for (const rule of rules) {
    let fieldVal: string | string[] | null = null;
    if (rule.field === "topRewardPrioritiesNext12Months") fieldVal = inputs.topRewardPrioritiesNext12Months;
    else if (rule.field === "primaryTriggerForRewardAiStrategy") fieldVal = inputs.primaryTriggerForRewardAiStrategy;
    else if (rule.field === "ukGenderPayGapStatus") fieldVal = inputs.ukGenderPayGapStatus;
    else if (rule.field === "ownershipStructure") fieldVal = inputs.ownershipStructure;
    else if (rule.field === "fcaSysc19InScope") fieldVal = inputs.fcaSysc19InScope;
    else if (rule.field === "strategicTimeline") fieldVal = inputs.strategicTimeline;

    if (fieldVal === null || fieldVal === undefined) continue;

    let matches = false;
    const ruleValue = rule.value;

    if (rule.op === "contains" && Array.isArray(fieldVal)) {
      matches = (fieldVal as string[]).includes(ruleValue as string);
    } else if (rule.op === "==" && typeof fieldVal === "string") {
      matches = fieldVal === ruleValue;
    } else if (rule.op === "!=" && typeof fieldVal === "string") {
      matches = fieldVal !== ruleValue;
    } else if (rule.op === "in" && typeof fieldVal === "string" && Array.isArray(ruleValue)) {
      matches = (ruleValue as string[]).includes(fieldVal);
    } else if (rule.op === "not_in" && typeof fieldVal === "string" && Array.isArray(ruleValue)) {
      matches = !(ruleValue as string[]).includes(fieldVal);
    }

    if (matches && FIT_SCORE[rule.result] > FIT_SCORE[best]) {
      best = rule.result;
    }
  }
  return best;
}

// ─── Cost calibration ───────────────────────────────────────────────────────

/**
 * Interpolation model (NOT a multiplier-on-top-of-range):
 *   position = clamp((log10(hc) − log10(hcMin)) / (log10(hcMax) − log10(hcMin)), 0, 1)
 *   Anchors: hcMin=1,000 (low-end research calibration), hcMax=10,000 (high-end research calibration)
 *   estimated_cost_mid = year1Low + position × (year1High − year1Low)
 *   then × sectorMultiplier (clamped 0.6-2×, applied after interpolation)
 *   output band: ±25% around midpoint (reflects real implementation-cost uncertainty)
 *   Orgs outside 1,000–10,000 range clamp to the researched low/high end.
 */
function calibrateCost(
  cc: CostCalibration,
  inputs: RewardEngineInputs
): { year1Low: number; year1High: number; ongoingLow: number; ongoingHigh: number } {
  const headcount = Math.max(inputs.totalEmployeeHeadcount ?? 3000, 1);

    // Interpolation position: 0 at headcountMin, 1 at headcountMax (log scale)
  const logMin = Math.log10(cc.headcountMin);
  const logMax = Math.log10(cc.headcountMax);
  const position = clamp((Math.log10(headcount) - logMin) / (logMax - logMin), 0, 1);
  // Interpolate within the researched range
  const year1Mid = cc.year1Low + position * (cc.year1High - cc.year1Low);
  const ongoingMid = cc.ongoingAnnualLow + position * (cc.ongoingAnnualHigh - cc.ongoingAnnualLow);
  // Sector or sub-domain multiplier (applied after interpolation, clamped 0.6-2×)
  const rawSectorMult = cc.sectorMultipliers[inputs.sector] ?? cc.defaultSectorMultiplier;
  const mult = clamp(cc.subDomainMultiplier ?? rawSectorMult, 0.6, 2);

  // Produce a low/high range: ±25% around midpoint (reflects real implementation-cost uncertainty)
  const year1Low = Math.round(year1Mid * mult * 0.75);
  const year1High = Math.round(year1Mid * mult * 1.25);
  const ongoingLow = Math.round(ongoingMid * mult * 0.75);
  const ongoingHigh = Math.round(ongoingMid * mult * 1.25);

  return { year1Low, year1High, ongoingLow, ongoingHigh };
}

// ─── Value calibration ────────────────────────────────────────────────────────

function calibrateValue(
  initiative: RewardInitiative,
  inputs: RewardEngineInputs
): { low: number; high: number } {
  const vc = initiative.valueCalibration;

  const payroll = inputs.totalPayrollGbp ?? vc.payrollBaseline;
  const headcount = inputs.totalEmployeeHeadcount ?? vc.headcountBaseline;

  const payrollMult = clamp(
    1 + (Math.log10(Math.max(payroll, 1) / vc.payrollBaseline)) * vc.payrollFactor,
    0.5,
    3
  );
  const headcountMult = clamp(
    1 + (Math.log10(Math.max(headcount, 1) / vc.headcountBaseline)) * vc.headcountFactor,
    0.5,
    3
  );

  const sectorMult =
    vc.sectorMultipliers[inputs.sector] ?? vc.defaultSectorMultiplier;

  const low = Math.round(vc.base3yrLow * payrollMult * headcountMult * sectorMult);
  const high = Math.round(vc.base3yrHigh * payrollMult * headcountMult * sectorMult);

  return { low, high };
}

// ─── Reasoning template interpolation ────────────────────────────────────────

function interpolateReasoning(template: string, inputs: RewardEngineInputs): string {
  return template
    .replace("{sector}", inputs.sector ?? "your sector")
    .replace("{hris}", "your HRIS")
    .replace("{payEquityCapability}", inputs.payEquityCapability ?? "current level")
    .replace("{ukGenderPayGapStatus}", inputs.ukGenderPayGapStatus ?? "current status")
    .replace("{payStructureMaturity}", inputs.payStructureMaturity ?? "current level")
    .replace("{criticalAiDigitalTalentPopulation}", inputs.criticalAiDigitalTalentPopulation ?? "current level")
    .replace("{materialSalesWorkforce}", inputs.materialSalesWorkforce ?? "current level")
    .replace("{workforceFrontlinePct}", inputs.workforceFrontlinePct != null ? `${inputs.workforceFrontlinePct}%` : "your frontline %")
    .replace("{workforceKnowledgePct}", inputs.workforceKnowledgePct != null ? `${inputs.workforceKnowledgePct}%` : "your knowledge worker %")
    .replace("{pensionSchemeArchitecture}", inputs.pensionSchemeArchitecture ?? "current scheme")
    .replace("{fcaSysc19InScope}", inputs.fcaSysc19InScope ?? "current status")
    .replace("{externalCompDataSources}", inputs.externalCompDataSources?.join(", ") ?? "your current sources");
}

function selectReasoningLines(
  initiative: RewardInitiative,
  fitSignal: FitSignal,
  inputs: RewardEngineInputs
): string[] {
  const templates = initiative.reasoningTemplates;
  let lines: string[];
  if (fitSignal === "NOT_RECOMMENDED") lines = templates.not_recommended;
  else if (fitSignal === "STRONG_FIT") lines = templates.strong_fit;
  else if (fitSignal === "MODERATE_FIT") lines = templates.moderate_fit;
  else lines = templates.weak_fit;

  return lines.slice(0, 3).map((t) => interpolateReasoning(t, inputs));
}

// ─── Main engine ──────────────────────────────────────────────────────────────

export function runRewardRecommendationEngine(
  inputs: RewardEngineInputs
): RewardEngineOutput {
  const recommended: RewardRecommendationResult[] = [];
  const notRecommended: RewardRecommendationResult[] = [];

  for (const initiative of REWARD_INITIATIVE_LIBRARY) {
    // ── Signal 1: Sector fit
    const sectorSignal = evaluateSectorFit(initiative, inputs.sector);

    // ── Signal 2: Workforce fit
    const workforceSignal = evaluateWorkforceFit(initiative.workforceFitRules, inputs);

    // ── Signal 3: Capability fit
    const { signal: capabilitySignal, notRecommendedReason: capNotRec } =
      evaluateCapabilityFit(initiative.capabilityFitRules, inputs);

    // ── Signal 4: Priority fit
    const prioritySignal = evaluatePriorityFit(initiative.priorityFitRules, inputs);

    // ── NOT_RECOMMENDED short-circuit
    let notRecommendedReason: string | null = null;

    if (sectorSignal === "NOT_RECOMMENDED") {
      notRecommendedReason = "Not recommended for your sector.";
    } else if (workforceSignal === "NOT_RECOMMENDED") {
      notRecommendedReason = "Not recommended based on your workforce composition.";
    } else if (capabilitySignal === "NOT_RECOMMENDED") {
      notRecommendedReason = capNotRec ?? "Not recommended based on current capability.";
    } else if (prioritySignal === "NOT_RECOMMENDED") {
      notRecommendedReason = "Not recommended based on your current priorities.";
    }

    // Also check notRecommendedIf conditions
    if (!notRecommendedReason && initiative.notRecommendedIf) {
      for (const cond of initiative.notRecommendedIf) {
        // Evaluate simple ownership structure conditions
        if (cond.condition.includes("ownershipStructure")) {
          const listedTypes = ["ftse_100_listed", "ftse_250_listed", "aim_listed", "other_listed", "subsidiary_listed_group"];
          const nonListedPrivate = ["private_pe_backed", "private_vc_backed", "private_family_owned", "mutual_cooperative", "public_sector", "not_for_profit"];
          if (
            cond.condition.includes("public_sector") &&
            nonListedPrivate.includes(inputs.ownershipStructure)
          ) {
            notRecommendedReason = cond.reasoning;
            break;
          }
          if (
            cond.condition.includes("ftse_100_listed") &&
            !listedTypes.includes(inputs.ownershipStructure)
          ) {
            // This is for LTIP — only listed
            // Already handled by priorityFitRules
          }
        }
      }
    }

    // ── Compute composite score (excluding NOT_RECOMMENDED signals)
    const signals: number[] = [];
    if (sectorSignal !== "NOT_RECOMMENDED") signals.push(FIT_SCORE[sectorSignal]);
    if (workforceSignal && workforceSignal !== "NOT_RECOMMENDED") signals.push(FIT_SCORE[workforceSignal]);
    if (capabilitySignal && capabilitySignal !== "NOT_RECOMMENDED") signals.push(FIT_SCORE[capabilitySignal]);
    if (prioritySignal && prioritySignal !== "NOT_RECOMMENDED") signals.push(FIT_SCORE[prioritySignal]);

    const fitScore = signals.length > 0 ? signals.reduce((a, b) => a + b, 0) / signals.length : 2;
    const fitSignal: FitSignal = notRecommendedReason ? "NOT_RECOMMENDED" : scoreToSignal(fitScore);

    // ── Value calibration
    const { low: calibratedValueLow, high: calibratedValueHigh } = calibrateValue(initiative, inputs);

    // ── Cost calibration
    const {
      year1Low: calibratedYear1CostLow,
      year1High: calibratedYear1CostHigh,
      ongoingLow: calibratedOngoingCostLow,
      ongoingHigh: calibratedOngoingCostHigh,
    } = calibrateCost(initiative.costCalibration, inputs);

    // ── Principle alignment
    const confirmedPrincipleIds = inputs.confirmedPrincipleIds ?? [];
    const confirmedWontDoIds = inputs.confirmedWontDoIds ?? [];
    const principleTextByPrincipleId = inputs.principleTextByPrincipleId ?? {};
    const wontDoNotesByWontDoId = inputs.wontDoNotesByWontDoId ?? {};
    const wontDoAffectedNumbersByWontDoId = inputs.wontDoAffectedNumbersByWontDoId ?? {};

    const initiativeSupportedPrinciples = initiative.supportsPrincipleIds ?? [];
    const alignedPrincipleIds = initiativeSupportedPrinciples.filter((pid) =>
      confirmedPrincipleIds.includes(pid)
    );
    const alignedPrincipleTexts = alignedPrincipleIds.map(
      (pid) => principleTextByPrincipleId[pid] ?? pid
    );

    // ── Won't-do reassurance notes for this initiative
    const wontDoReassuranceNotes: string[] = [];
    for (const wontDoId of confirmedWontDoIds) {
      const affectedNumbers = wontDoAffectedNumbersByWontDoId[wontDoId] ?? [];
      if (affectedNumbers.includes(initiative.number)) {
        const note = wontDoNotesByWontDoId[wontDoId];
        if (note) wontDoReassuranceNotes.push(note);
      }
    }

    // ── Principle boost: +0.1 per aligned confirmed principle, capped at +0.3 total (max fitScore 3)
    // Cumulative: more aligned principles = stronger boost, reflecting depth of alignment (§5.5)
    let boostedFitScore = fitScore;
    let principleBoostApplied = false;
    if (alignedPrincipleIds.length > 0 && fitSignal !== "NOT_RECOMMENDED") {
      const rawBoost = alignedPrincipleIds.length * 0.1;
      const cappedBoost = Math.min(rawBoost, 0.3);
      boostedFitScore = Math.min(fitScore + cappedBoost, 3);
      principleBoostApplied = true;
    }
    const finalFitSignal: FitSignal = notRecommendedReason ? "NOT_RECOMMENDED" : scoreToSignal(boostedFitScore);

    // ── Reasoning
    const reasoningLines = selectReasoningLines(initiative, finalFitSignal, inputs);

    const result: RewardRecommendationResult = {
      initiativeId: initiative.id,
      number: initiative.number,
      title: initiative.title,
      shortDescription: initiative.shortDescription,
      subDomain: initiative.subDomain,
      defaultPhase: initiative.defaultPhase,
      complexity: initiative.complexity,
      fitSignal: finalFitSignal,
      fitScore: Math.round(boostedFitScore * 100) / 100,
      fitScoreMax: 3,
      reasoningLines,
      notRecommendedReason,
      calibratedValueLow,
      calibratedValueHigh,
      calibratedYear1CostLow,
      calibratedYear1CostHigh,
      calibratedOngoingCostLow,
      calibratedOngoingCostHigh,
      costType: initiative.costCalibration.costType,
      excludesProgrammeFunding: initiative.costCalibration.excludesProgrammeFunding ?? false,
      programmeFundingNote: initiative.costCalibration.programmeFundingNote ?? null,
      costNote: initiative.costCalibration.costNote ?? null,
      bundleWith: initiative.bundleWith ?? null,
      prerequisiteOf: initiative.prerequisiteOf ?? [],
      requiresPrerequisite: initiative.requiresPrerequisite ?? null,
      signalBreakdown: {
        sector: sectorSignal,
        workforce: workforceSignal,
        capability: capabilitySignal,
        priority: prioritySignal,
      },
      alignedPrincipleIds,
      alignedPrincipleTexts,
      wontDoReassuranceNotes,
      principleBoostApplied,
    };

    if (notRecommendedReason) {
      notRecommended.push(result);
    } else {
      recommended.push(result);
    }
  }

  // Sort recommended: STRONG_FIT first, then MODERATE_FIT, then WEAK_FIT; within each group by fitScore desc
  recommended.sort((a, b) => {
    const sigOrder: Record<FitSignal, number> = { STRONG_FIT: 0, MODERATE_FIT: 1, WEAK_FIT: 2, NOT_RECOMMENDED: 3 };
    if (sigOrder[a.fitSignal] !== sigOrder[b.fitSignal]) {
      return sigOrder[a.fitSignal] - sigOrder[b.fitSignal];
    }
    return b.fitScore - a.fitScore;
  });

  // Also sort notRecommended by number for stable display
  notRecommended.sort((a, b) => a.number - b.number);

  // Portfolio value = sum of recommended initiatives' calibrated value
  const portfolioValueLow = recommended.reduce((s, r) => s + r.calibratedValueLow, 0);
  const portfolioValueHigh = recommended.reduce((s, r) => s + r.calibratedValueHigh, 0);

  // Compute inputs hash for caching
  const inputsHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(inputs))
    .digest("hex");

  return {
    recommended,
    notRecommended,
    portfolioValueLow,
    portfolioValueHigh,
    engineVersion: "v1",
    inputsHash,
  };
}

// ─── Helper: build engine inputs from DB rows ─────────────────────────────────

export function buildEngineInputs(
  companyProfile: Record<string, unknown>,
  rewardPrework: Record<string, unknown>,
  principlesData?: {
    confirmedPrincipleIds: string[];
    confirmedWontDoIds: string[];
    wontDoNotesByWontDoId: Record<string, string>;
    principleTextByPrincipleId: Record<string, string>;
    wontDoAffectedNumbersByWontDoId: Record<string, number[]>;
  }
): RewardEngineInputs {
  return {
    // Company Profile
    sector: (companyProfile.sector as string) ?? "unknown",
    geographicFootprint: (companyProfile.geographicFootprint as string) ?? "uk_only",
    ownershipStructure: (companyProfile.ownershipStructure as string) ?? "unknown",
    totalEmployeeHeadcount: (companyProfile.totalEmployeeHeadcount as number) ?? null,
    totalPayrollGbp: (companyProfile.totalPayrollGbp as number) ?? null,
    workforceFrontlinePct: (companyProfile.workforceFrontlinePct as number) ?? null,
    workforceKnowledgePct: (companyProfile.workforceKnowledgePct as number) ?? null,
    materialSalesWorkforce: (companyProfile.materialSalesWorkforce as string) ?? null,
    criticalAiDigitalTalentPopulation: (companyProfile.criticalAiDigitalTalentPopulation as string) ?? null,
    businessAiAmbition: (companyProfile.businessAiAmbition as number) ?? null,
    fcaSysc19InScope: (companyProfile.fcaSysc19InScope as string) ?? null,

    // Reward Pre-work
    rewardFunctionSize: (rewardPrework.rewardFunctionSize as number) ?? null,
    rewardFunctionMaturityRating: (rewardPrework.rewardFunctionMaturityRating as number) ?? null,
    aiMaturityInRewardToday: (rewardPrework.aiMaturityInRewardToday as number) ?? null,
    rewardAiAmbition: (rewardPrework.rewardAiAmbition as number) ?? null,
    payEquityCapability: (rewardPrework.payEquityCapability as string) ?? null,
    payStructureMaturity: (rewardPrework.payStructureMaturity as string) ?? null,
    ukGenderPayGapStatus: (rewardPrework.ukGenderPayGapStatus as string) ?? null,
    pensionSchemeArchitecture: (rewardPrework.pensionSchemeArchitecture as string) ?? null,
    externalCompDataSources: (rewardPrework.externalCompDataSources as string[]) ?? null,
    aiToolsCurrentlyInRewardUse: (rewardPrework.aiToolsCurrentlyInRewardUse as string[]) ?? null,
    compManagementPlatform: (rewardPrework.compManagementPlatform as string) ?? null,
    unionWorksCouncilCoverage: (rewardPrework.unionWorksCouncilCoverage as string) ?? null,
    primaryTriggerForRewardAiStrategy: (rewardPrework.primaryTriggerForRewardAiStrategy as string) ?? null,
    topRewardPrioritiesNext12Months: (rewardPrework.topRewardPrioritiesNext12Months as string[]) ?? null,
    strategicTimeline: (rewardPrework.strategicTimeline as string) ?? null,
    aiTalentRetentionConcern: (rewardPrework.aiTalentRetentionConcern as string) ?? null,
    recentRemunerationVoteConcerns: (rewardPrework.recentRemunerationVoteConcerns as string) ?? null,
    nationalLivingWageExposure: (rewardPrework.nationalLivingWageExposure as string) ?? null,
    confirmedPrincipleIds: principlesData?.confirmedPrincipleIds ?? [],
    confirmedWontDoIds: principlesData?.confirmedWontDoIds ?? [],
    wontDoNotesByWontDoId: principlesData?.wontDoNotesByWontDoId ?? {},
    principleTextByPrincipleId: principlesData?.principleTextByPrincipleId ?? {},
    wontDoAffectedNumbersByWontDoId: principlesData?.wontDoAffectedNumbersByWontDoId ?? {},
  };
}
