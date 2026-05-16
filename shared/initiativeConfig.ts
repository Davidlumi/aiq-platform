/**
 * Initiative Config — Parameterised multipliers and thresholds for the Fit+Impact engine (v3).
 *
 * ALL multipliers are stored here, not in formulas or library entries, so they can be
 * tuned during beta without redeployment. Multipliers are derived from documented case
 * study patterns.
 *
 * BETA CALIBRATION NOTE: These are starting estimates. Update as actual outcomes are
 * observed vs predicted during the beta cohort.
 */

export const INITIATIVE_CONFIG = {
  // ─── Shared defaults ─────────────────────────────────────────────────────
  defaults: {
    annualWorkingHours: 1800,
    workingDaysPerYear: 250,
    avgSalaryFallback: 45000,
    managerSalaryMultiplier: 1.4,   // loaded manager cost = avg salary × 1.4
    managerFraction: 0.12,          // ~12% of headcount are managers
    attritionCostMultiplier: 0.75,  // 75% of salary = cost to replace (conservative)
  },

  // ─── Top-level engine multipliers ────────────────────────────────────────
  managerCapabilityMultipliers: {
    Strong: 0.70,
    Mixed: 0.50,
    Variable: 0.45,
    Weak: 0.30,
  } as Record<string, number>,

  ambitionTierMultipliers: {
    conservative: 0.60,
    pragmatic: 0.80,
    innovator: 1.00,
    transformative: 1.20,
  } as Record<string, number>,

  dataQualityMultipliers: {
    poor: 0.40,
    fair: 0.60,
    good: 0.80,
    excellent: 1.00,
  } as Record<string, number>,

  // ─── Fit scoring thresholds (v3) ─────────────────────────────────────────
  fitScoring: {
    /** v3: 80+ = STRONG_FIT (at least 30 pts of positive signal above base) */
    strongFitThreshold: 80,
    /** v3: 50–79 = POSSIBLE_FIT; below 50 = WEAK_FIT */
    possibleFitThreshold: 50,
  },

  // ─── Confidence labelling ─────────────────────────────────────────────────
  confidence: {
    highMaxEstimateCount: 0,
    mediumMaxEstimateCount: 2,
  },

  // ─── TA Category ─────────────────────────────────────────────────────────
  ta_high_volume_hiring: {
    adminTimeReductionMultiplier: 0.50,
    screeningCostPerApplication: 3.50,
    screeningReductionRate: 0.70,
    minApplicationVolumeForHardGate: 5000,
  },

  ta_candidate_chatbot: {
    screeningHoursPerHire: 2.0,
    automationRate: 0.60,
    conversionUpliftRate: 0.05,
  },

  ta_interview_scheduling: {
    schedulingHoursPerInterview: 1.5,
    interviewsPerHire: 3,
    timeReductionRate: 0.80,
  },

  ta_sourcing_matching: {
    qualityOfHireUpliftRate: 0.10,
    timeToFillReductionRate: 0.25,
  },

  ta_video_interview_assessment: {
    interviewHoursPerHire: 4.0,
    timeReductionRate: 0.40,
  },

  ta_bias_monitoring: {
    riskReductionPerHead: 50,
    auditCostAvoided: 75000,
  },

  ta_recruiter_productivity_ai: {
    recruiterFteFraction: 0.30,
    productivityUpliftRate: 0.25,
  },

  ta_offer_generation: {
    offerProcessHoursPerHire: 2.5,
    timeReductionRate: 0.70,
  },

  ta_jd_optimization: {
    qualityUpliftRate: 0.08,
    timeToFillReductionRate: 0.15,
  },

  // ─── Onboarding Category ─────────────────────────────────────────────────
  on_personalised_journeys: {
    timeToProductivityReductionDays: 15,
    productivityValueFraction: 0.60,
    firstYearAttritionReduction: 0.10,
  },

  on_new_hire_chatbot: {
    queriesPerNewHire: 25,
    queryDeflectionRate: 0.65,
    rampDaysReduction: 5,
  },

  on_documentation_automation: {
    docHoursPerHire: 3.0,
    timeReductionRate: 0.70,
    hrAdminHoursPerWeek: 4.0,
    adminReductionRate: 0.50,
  },

  on_buddy_matching: {
    firstYearAttritionReduction: 0.08,
    rampDaysReduction: 7,
  },

  // ─── L&D Category ────────────────────────────────────────────────────────
  ld_personalised_learning: {
    ldEfficiencyGain: 0.25,
    skillsUpliftProductivityValue: 0.03,
  },

  ld_workforce_reskilling: {
    reskillTargetFraction: 0.20,
    productivityUpliftRate: 0.05,
    retentionUpliftRate: 0.08,
  },

  ld_ai_coaching: {
    coachingCoverageRate: 0.30,
    performanceUpliftRate: 0.04,
    externalCoachingCostPerPerson: 2500,
  },

  ld_compliance_training: {
    complianceRiskValuePerHead: 150,
    complianceTrainingFraction: 0.20,
    efficiencyGain: 0.30,
  },

  ld_content_creation: {
    contentBudgetFraction: 0.35,
    costReductionRate: 0.40,
    speedUpliftValue: 0.15,
  },

  ld_knowledge_management: {
    weeklySearchMinutes: 30,
    searchTimeReductionRate: 0.40,
  },

  // ─── Internal Mobility Category ──────────────────────────────────────────
  im_talent_marketplace: {
    externalHireDisplacementRate: 0.15,
    contractorDisplacementRate: 0.10,
    retentionValueMultiplier: 0.05,
  },

  im_skills_inference: {
    mobilityEnablementValueFraction: 0.08,
    workforcePlanningValueFraction: 0.03,
  },

  im_mentor_matching: {
    retentionUpliftRate: 0.05,
    performanceUpliftRate: 0.02,
  },

  // ─── Performance Management Category ─────────────────────────────────────
  pm_continuous_performance: {
    productivityUpliftRate: 0.04,
    coveredPopulationFraction: 0.60,
  },

  pm_review_writing: {
    reviewHoursPerManager: 8.0,
    timeReductionRate: 0.60,
    hrAdminHoursPerCycle: 20,
  },

  pm_okr_goal_alignment: {
    alignmentProductivityUplift: 0.03,
  },

  // ─── Employee Experience Category ────────────────────────────────────────
  ee_sentiment_listening: {
    engagementUpliftPoints: 5,
    engagementToRevenueMultiplier: 0.002,
    attritionReductionRate: 0.10,
  },

  ee_recognition_rewards: {
    attritionReductionRate: 0.08,
    productivityUpliftRate: 0.02,
  },

  ee_wellbeing_burnout: {
    absenceDaysReduction: 1.5,
    attritionReductionRate: 0.08,
  },

  ee_internal_comms_ai: {
    commsHoursPerWeek: 6.0,
    timeReductionRate: 0.40,
    engagementUpliftRate: 0.01,
  },

  // ─── Retention Category ───────────────────────────────────────────────────
  rt_flight_risk_prediction: {
    attritionReductionRate: 0.20,
    managerActionProbability: {
      Strong: 0.70,
      Mixed: 0.50,
      Variable: 0.45,
      Weak: 0.30,
    } as Record<string, number>,
    minYearsHrisDataForHardGate: 2,
  },

  rt_stay_interview_ai: {
    retentionUpliftRate: 0.12,
  },

  rt_exit_intelligence: {
    attritionReductionRate: 0.08,
  },

  // ─── HR Operations Category ───────────────────────────────────────────────
  hr_virtual_assistant: {
    queryDeflectionRate: 0.60,
    hrFteRedeploymentValue: 0.30,
    minMonthlyQueryVolumeForHardGate: 500,
  },

  hr_policy_generation: {
    policyHoursPerFtePerYear: 80,
    timeReductionRate: 0.50,
  },

  hr_benefits_decision_support: {
    benefitsQueriesPerEmployee: 3,
    queryDeflectionRate: 0.55,
    benefitsOptimisationValuePerEmployee: 120,
  },

  // ─── Workforce Planning Category ─────────────────────────────────────────
  wp_workforce_planning: {
    planningEfficiencyRate: 0.015,
    hiringOptimisationRate: 0.08,
  },

  wp_succession_planning: {
    seniorRoleFraction: 0.20,
    riskReductionRate: 0.30,
    readinessUpliftRate: 0.05,
  },

  wp_org_design: {
    spanEfficiencyGain: 0.02,
  },

  wp_location_strategy: {
    locationOptimisationRate: 0.10,
    revenueImpactRate: 0.001,
  },

  // ─── Compensation & Reward Category ──────────────────────────────────────
  cr_pay_equity: {
    regulatoryRiskValueRate: 0.005,
    auditCostAvoided: 50000,
  },

  cr_compensation_recommendations: {
    compCycleHoursPerManager: 6.0,
    timeReductionRate: 0.50,
    payEquityValueRate: 0.005,
  },

  // ─── Manager Effectiveness Category ──────────────────────────────────────
  mg_manager_copilot: {
    adminHoursPerWeek: 5.0,
    timeReductionRate: 0.40,
    teamProductivityUplift: 0.02,
  },

  mg_difficult_conversations: {
    difficultConversationRate: 0.15,
    handlingImprovementRate: 0.20,
    hardCaseFraction: 0.10,
  },

  // ─── Governance Category ──────────────────────────────────────────────────
  gv_ai_governance: {
    riskReductionRate: 0.003,
    deploymentAccelerationMultiplier: 0.60,
  },

  gv_cross_cutting_bias_audit: {
    riskReductionRate: 0.004,
    auditCostAvoided: 80000,
  },

  // ─── Frontline Category ───────────────────────────────────────────────────
  fw_shift_scheduling_ai: {
    labourCostReductionRate: 0.03,
    overtimeReductionRate: 0.15,
  },

  fw_frontline_learning: {
    performanceUpliftRate: 0.03,
    ldEfficiencyGain: 0.20,
  },

  fw_frontline_communication: {
    attritionReductionRate: 0.10,
    productivityUpliftRate: 0.02,
  },

  fw_store_manager_assistant: {
    hoursRecoveredPerManagerPerWeek: 4.0,
    managerTurnoverRate: 0.20,
    managerRetentionReduction: 0.15,
    teamEngagementUpliftRate: 0.02,
  },

  // ─── Legacy aliases (kept for backward compat with old tests) ────────────
  attritionPrediction: {
    attritionCostAsMultipleOfSalary: 0.75,
    attritionReductionRate: 0.20,
    managerActionProbability: {
      Strong: 0.70,
      Mixed: 0.50,
      Variable: 0.45,
      Weak: 0.30,
    } as Record<string, number>,
    avgSalaryFallback: 45000,
    minYearsHrisDataForHardGate: 2,
  },
} as const;

export type ManagerCapabilityLevel = keyof typeof INITIATIVE_CONFIG.rt_flight_risk_prediction.managerActionProbability;
