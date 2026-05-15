/**
 * Initiative Config — Parameterised multipliers and thresholds for the Fit+Impact engine.
 *
 * ALL multipliers are stored here, not in formulas or library entries, so they can be
 * tuned during beta without redeployment. Multipliers are derived from documented case
 * study patterns (see case-studies-and-data-requirements.md).
 *
 * BETA CALIBRATION NOTE: These are starting estimates. Update as actual outcomes are
 * observed vs predicted during the beta cohort.
 */

export const INITIATIVE_CONFIG = {
  // ─── Working time constants ───────────────────────────────────────────────
  annualWorkingHours: 1800,          // FTE working hours per year
  workingDaysPerYear: 250,           // Working days per year

  // ─── High-volume hiring AI ────────────────────────────────────────────────
  highVolumeHiring: {
    adminTimeReductionMultiplier: 0.50,   // 50% typical admin time reduction (Unilever/Hilton pattern)
    timeToFillReductionMultiplier: 0.40,  // 40% typical time-to-fill reduction
    minApplicationVolumeForHardGate: 5000,
  },

  // ─── HR chatbot / operations ──────────────────────────────────────────────
  hrChatbot: {
    queryDeflectionRate: 0.60,            // 60% query deflection rate (Moveworks pattern)
    hrFteRedeploymentValue: 0.30,         // 30% of deflected time realised as FTE redeployment value
    minutesToHours: 1 / 60,
    minMonthlyQueryVolumeForHardGate: 500,
  },

  // ─── Internal talent marketplace ─────────────────────────────────────────
  internalMobility: {
    externalHireDisplacementRate: 0.15,   // 15% of external hires displaced by internal mobility
    contractorDisplacementRate: 0.10,     // 10% of contractor spend displaced
    retentionValueMultiplier: 0.05,       // 5% attrition reduction × salary base
    avgSalaryMultiplierOfHeadcount: 45000, // £45K average salary (UK benchmark, override with actual)
  },

  // ─── Attrition prediction ─────────────────────────────────────────────────
  attritionPrediction: {
    attritionCostAsMultipleOfSalary: 0.75, // 75% of salary = cost to replace (conservative)
    attritionReductionRate: 0.20,          // 20% attrition reduction achievable
    managerActionProbability: {
      Strong: 0.70,
      Mixed: 0.50,
      Variable: 0.45,
      Weak: 0.30,
    } as Record<string, number>,
    avgSalaryFallback: 45000,              // £45K fallback if no revenue data
    minYearsHrisDataForHardGate: 2,        // IBM/HP pattern requires ≥2 years historical data
  },

  // ─── L&D personalisation ──────────────────────────────────────────────────
  ldPersonalisation: {
    ldEfficiencyGain: 0.25,               // 25% L&D spend efficiency gain (Accenture/DBS pattern)
    skillsUpliftProductivityValue: 0.03,  // 3% productivity uplift from skills development
    avgSalaryFallback: 45000,
  },

  // ─── Performance AI ───────────────────────────────────────────────────────
  performanceAI: {
    productivityUpliftRate: 0.04,         // 4% productivity uplift (GE pattern)
    coveredPopulationFraction: 0.60,      // 60% of workforce covered
    avgSalaryFallback: 45000,
  },

  // ─── Engagement AI / sentiment analysis ──────────────────────────────────
  engagementAI: {
    engagementUpliftPoints: 5,            // 5 point engagement score uplift (Microsoft pattern)
    engagementToRevenueMultiplier: 0.002, // 0.2% revenue per engagement point (Gallup-derived)
  },

  // ─── Offer / contract generation ─────────────────────────────────────────
  offerGeneration: {
    offerProcessHoursPerHire: 2.5,        // Hours per hire for offer/contract process
    timeReductionRate: 0.70,              // 70% time reduction
  },

  // ─── Bias monitoring ─────────────────────────────────────────────────────
  biasMonitoring: {
    // Qualitative risk reduction — no direct financial formula
    // Value expressed as scenario-based regulatory risk reduction
    regulatoryRiskScenarioValue: 250000,  // £250K scenario value (conservative regulatory fine avoidance)
  },

  // ─── Interview scheduling automation ─────────────────────────────────────
  interviewScheduling: {
    schedulingHoursPerInterview: 1.5,     // Hours per interview for scheduling
    interviewsPerHire: 3,                 // Average interviews per hire
    timeReductionRate: 0.80,              // 80% time reduction (Hilton pattern)
  },

  // ─── Onboarding personalisation ───────────────────────────────────────────
  onboardingPersonalisation: {
    timeToProductivityReductionDays: 15,  // 15 days faster time to productivity (Customer.io pattern)
    workingDaysToHours: 8,
    productivityValueFraction: 0.60,      // 60% of daily salary value during ramp
  },

  // ─── Skills inference and mapping ────────────────────────────────────────
  skillsInference: {
    mobilityEnablementValueFraction: 0.08, // 8% of internal mobility value enabled by skills data
    workforcePlanningValueFraction: 0.03,  // 3% of total salary base in planning efficiency
    avgSalaryFallback: 45000,
  },

  // ─── Top-level multipliers (used by engine and tests) ───────────────────────
  managerCapabilityMultipliers: {
    strong: 0.7,
    mixed: 0.5,
    variable: 0.45,
    weak: 0.3,
  } as Record<string, number>,

  ambitionTierMultipliers: {
    conservative: 0.6,
    pragmatic: 0.8,
    innovator: 1.0,
    transformative: 1.2,
  } as Record<string, number>,

  dataQualityMultipliers: {
    poor: 0.4,
    fair: 0.6,
    good: 0.8,
    excellent: 1.0,
  } as Record<string, number>,

  // ─── Fit scoring thresholds ───────────────────────────────────────────────
  fitScoring: {
    strongFitThreshold: 70,   // soft score ≥ 70 → STRONG_FIT
    possibleFitThreshold: 40, // soft score 40–69 → POSSIBLE_FIT; <40 → POOR_FIT
  },

  // ─── Confidence labelling ─────────────────────────────────────────────────
  confidence: {
    highMaxEstimateCount: 0,   // 0 estimate fields → HIGH
    mediumMaxEstimateCount: 2, // 1–2 estimate fields → MEDIUM; 3+ → LOW
  },
} as const;

export type ManagerCapabilityLevel = keyof typeof INITIATIVE_CONFIG.attritionPrediction.managerActionProbability;
