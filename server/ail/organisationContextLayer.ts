/**
 * Organisation Context Layer (OCL)
 * Injects organisation-specific context into every simulation.
 * Makes simulations feel like they are happening in THIS company.
 */

import { nanoid } from "nanoid";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { ailOrgContext } from "../../drizzle/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrgContextInput {
  tenantId: string;
  sector?: string;
  primaryRegulator?: string;
  additionalRegulators?: string[];
  reportingRequirements?: string[];
  recentRegulatoryActions?: string[];
  headcount?: number;
  structure?: string;
  geographies?: string[];
  strategicPriorities?: string[];
  currentChallenges?: string[];
  recentEvents?: string[];
  riskAppetiteOverall?: string;
  riskAppetiteLegal?: string;
  riskAppetiteReputational?: string;
  riskAppetiteInnovation?: string;
  aiMaturityLevel?: string;
  currentAiTools?: string[];
  aiGovernanceFramework?: boolean;
  aiEthicsCommittee?: boolean;
  recentAiIncidents?: string[];
  hierarchyLevel?: string;
  decisionMakingStyle?: string;
  hrInfluence?: string;
  ceoStyle?: string;
  cfoStyle?: string;
  hasAiUsagePolicy?: boolean;
  hasDataProtectionPolicy?: boolean;
  hasRedundancyPolicy?: boolean;
  hasWhistleblowingPolicy?: boolean;
  hasEdiPolicy?: boolean;
  // Phase 2 additions
  aiToolsInUse?: string[];
  ukRegulatoryFrameworks?: string[];
  aiPolicyStatus?: "none" | "draft" | "approved" | "embedded";
  quarterlyReviewEnabled?: boolean;
  revalidationCycleMonths?: number;
  smallHRFunctionMode?: boolean;
  companyAiContextNarrative?: string;
  // Sub-sector selection (Phase 2 sub-sector feature)
  subSector?: string | null;
  // Organisation type for benchmark modifiers
  orgType?: string | null;
  // Phase 3: Business Ambition Linkage
  ambitionTargetScore?: number | null;   // 0-100 raw (shown as 0-10 Peakon)
  ambitionTargetDate?: string | null;    // ISO date YYYY-MM-DD
  ambitionTargetLabel?: string | null;   // e.g. "Ready to deploy AI across all HR workflows"
}

export interface SimulationContextInjection {
  // Scenario framing text to prepend to simulation opening
  scenarioFraming: string;
  // Stakeholder behaviour modifiers
  stakeholderModifiers: {
    ceoStyle: string;
    cfoStyle: string;
    pressureIntensity: "low" | "moderate" | "high" | "maximum";
  };
  // Consequence calibration
  consequenceCalibration: {
    legalConsequenceSeverity: "low" | "moderate" | "high" | "critical";
    regulatoryExposure: string;
    reputationalRisk: "low" | "moderate" | "high";
  };
  // Active policies to reference in simulation
  activePolicies: string[];
  // Regulatory references to inject
  regulatoryReferences: string[];
}

// ─── Sector-specific regulatory context ──────────────────────────────────────

export const SECTOR_REGULATORY_CONTEXT: Record<string, {
  regulator: string;
  keyLegislation: string[];
  reportingRequirements: string[];
  aiRisks: string[];
}> = {
  financial_services: {
    regulator: "FCA / PRA",
    keyLegislation: ["Financial Services and Markets Act 2000", "Consumer Duty", "Senior Managers & Certification Regime", "UK GDPR"],
    reportingRequirements: ["Gender pay gap report", "Ethnicity pay gap (voluntary)", "Diversity & inclusion data (FCA)"],
    aiRisks: ["Model risk management", "Algorithmic bias in credit decisions", "Explainability requirements under Consumer Duty"],
  },
  healthcare: {
    regulator: "CQC / NHS England",
    keyLegislation: ["Health and Social Care Act 2008", "NHS Constitution", "UK GDPR", "Equality Act 2010"],
    reportingRequirements: ["Safe staffing levels", "Workforce Race Equality Standard", "Gender pay gap report"],
    aiRisks: ["Patient safety implications", "Clinical decision support bias", "Safe recruitment requirements"],
  },
  technology: {
    regulator: "ICO",
    keyLegislation: ["UK GDPR", "Data Protection Act 2018", "Equality Act 2010", "Employment Rights Act 1996"],
    reportingRequirements: ["Gender pay gap report", "Modern slavery statement"],
    aiRisks: ["Algorithmic hiring bias", "Surveillance and monitoring", "Global pay equity complexity"],
  },
  public_sector: {
    regulator: "ICO / EHRC",
    keyLegislation: ["Equality Act 2010 (Public Sector Equality Duty)", "UK GDPR", "Employment Rights Act 1996", "Freedom of Information Act 2000"],
    reportingRequirements: ["Public Sector Equality Duty report", "Gender pay gap report", "Workforce diversity data"],
    aiRisks: ["Public accountability for algorithmic decisions", "Transparency requirements", "Procurement rules for AI tools"],
  },
  professional_services: {
    regulator: "SRA / ICAEW / FRC (depending on profession)",
    keyLegislation: ["UK GDPR", "Equality Act 2010", "Employment Rights Act 1996"],
    reportingRequirements: ["Gender pay gap report", "Diversity data (professional body requirements)"],
    aiRisks: ["Client confidentiality in AI tools", "Professional liability for AI-assisted decisions", "Bias in billable hours analysis"],
  },
  retail: {
    regulator: "ICO",
    keyLegislation: ["UK GDPR", "Equality Act 2010", "National Minimum Wage Act 1998", "Employment Rights Act 1996"],
    reportingRequirements: ["Gender pay gap report", "Modern slavery statement"],
    aiRisks: ["Shift scheduling bias", "Performance monitoring and surveillance", "Zero-hours contract compliance"],
  },
  manufacturing: {
    regulator: "HSE / ICO",
    keyLegislation: ["Health and Safety at Work Act 1974", "UK GDPR", "Equality Act 2010", "Employment Rights Act 1996"],
    reportingRequirements: ["Gender pay gap report", "Modern slavery statement"],
    aiRisks: ["Predictive maintenance vs workforce planning", "Skills gap in AI-adjacent roles", "Union consultation requirements"],
  },
  energy_utilities: {
    regulator: "Ofgem / HSE / ICO",
    keyLegislation: ["UK GDPR", "Equality Act 2010", "Employment Rights Act 1996", "Health and Safety at Work Act 1974", "Energy Act 2023"],
    reportingRequirements: ["Gender pay gap report", "Modern slavery statement", "SECR energy reporting"],
    aiRisks: ["Critical infrastructure risk from AI-driven operational decisions", "Algorithmic bias in safety-critical roles", "Union consultation requirements"],
  },
  media_entertainment: {
    regulator: "Ofcom / ICO",
    keyLegislation: ["UK GDPR", "Equality Act 2010", "Employment Rights Act 1996", "Online Safety Act 2023"],
    reportingRequirements: ["Gender pay gap report", "Diversity in broadcasting (Ofcom)"],
    aiRisks: ["AI-generated content and copyright liability", "Algorithmic bias in creative hiring", "Freelancer and gig worker classification"],
  },
  logistics_transport: {
    regulator: "DVSA / HSE / ICO",
    keyLegislation: ["UK GDPR", "Equality Act 2010", "Employment Rights Act 1996", "Health and Safety at Work Act 1974", "Working Time Regulations 1998"],
    reportingRequirements: ["Gender pay gap report", "Modern slavery statement", "Driver hours compliance"],
    aiRisks: ["Algorithmic management of drivers and warehouse workers", "Surveillance and monitoring of mobile workers", "Union consultation on AI-driven scheduling"],
  },
  education: {
    regulator: "Ofsted / OfS / ICO",
    keyLegislation: ["UK GDPR", "Equality Act 2010", "Education Act 2011", "Children Act 2004", "Employment Rights Act 1996"],
    reportingRequirements: ["Gender pay gap report", "Workforce census (DfE)", "Safeguarding compliance"],
    aiRisks: ["Safeguarding implications of AI in staff recruitment", "Bias in AI-assisted student outcome predictions affecting HR planning", "Data protection for staff and student data"],
  },
  hospitality_leisure: {
    regulator: "ICO / HSE",
    keyLegislation: ["UK GDPR", "Equality Act 2010", "National Minimum Wage Act 1998", "Employment Rights Act 1996", "Working Time Regulations 1998"],
    reportingRequirements: ["Gender pay gap report", "Modern slavery statement"],
    aiRisks: ["Algorithmic tipping and pay distribution", "Zero-hours contract compliance with AI scheduling", "High turnover and bias in AI-driven recruitment"],
  },
  other: {
    regulator: "ICO",
    keyLegislation: ["UK GDPR", "Equality Act 2010", "Employment Rights Act 1996"],
    reportingRequirements: ["Gender pay gap report"],
    aiRisks: ["General algorithmic bias", "Data protection compliance"],
  },
};

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Upsert the organisation context for a tenant.
 */
export async function upsertOrgContext(input: OrgContextInput): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select({ id: ailOrgContext.id })
    .from(ailOrgContext)
    .where(eq(ailOrgContext.tenantId, input.tenantId))
    .limit(1);

  const data = {
    sector: (input.sector as any) ?? "other",
    subSector: input.subSector ?? null,
    orgType: input.orgType ?? null,
    primaryRegulator: input.primaryRegulator,
    additionalRegulatorsJson: JSON.stringify(input.additionalRegulators ?? []),
    reportingRequirementsJson: JSON.stringify(input.reportingRequirements ?? []),
    recentRegulatoryActionsJson: JSON.stringify(input.recentRegulatoryActions ?? []),
    headcount: input.headcount,
    structure: (input.structure as any) ?? "centralised",
    geographiesJson: JSON.stringify(input.geographies ?? []),
    strategicPrioritiesJson: JSON.stringify(input.strategicPriorities ?? []),
    currentChallengesJson: JSON.stringify(input.currentChallenges ?? []),
    recentEventsJson: JSON.stringify(input.recentEvents ?? []),
    riskAppetiteOverall: (input.riskAppetiteOverall as any) ?? "moderate",
    riskAppetiteLegal: (input.riskAppetiteLegal as any) ?? "risk_averse",
    riskAppetiteReputational: (input.riskAppetiteReputational as any) ?? "moderate",
    riskAppetiteInnovation: (input.riskAppetiteInnovation as any) ?? "moderate",
    aiMaturityLevel: (input.aiMaturityLevel as any) ?? "early_adopter",
    currentAiToolsJson: JSON.stringify(input.currentAiTools ?? []),
    aiGovernanceFramework: input.aiGovernanceFramework ?? false,
    aiEthicsCommittee: input.aiEthicsCommittee ?? false,
    recentAiIncidentsJson: JSON.stringify(input.recentAiIncidents ?? []),
    hierarchyLevel: (input.hierarchyLevel as any) ?? "moderate",
    decisionMakingStyle: (input.decisionMakingStyle as any) ?? "consensus",
    hrInfluence: (input.hrInfluence as any) ?? "operational",
    ceoStyle: (input.ceoStyle as any) ?? "collaborative",
    cfoStyle: (input.cfoStyle as any) ?? "cost_focused",
    hasAiUsagePolicy: input.hasAiUsagePolicy ?? false,
    hasDataProtectionPolicy: input.hasDataProtectionPolicy ?? true,
    hasRedundancyPolicy: input.hasRedundancyPolicy ?? false,
    hasWhistleblowingPolicy: input.hasWhistleblowingPolicy ?? false,
    hasEdiPolicy: input.hasEdiPolicy ?? false,
    // Phase 2 fields
    aiToolsInUseJson: JSON.stringify(input.aiToolsInUse ?? []),
    ukRegulatoryFrameworksJson: JSON.stringify(input.ukRegulatoryFrameworks ?? []),
    aiPolicyStatus: (input.aiPolicyStatus as any) ?? "none",
    quarterlyReviewEnabled: input.quarterlyReviewEnabled ?? false,
    revalidationCycleMonths: input.revalidationCycleMonths ?? 12,
    smallHRFunctionMode: input.smallHRFunctionMode ?? false,
    companyAiContextNarrative: input.companyAiContextNarrative ?? null,
    // Phase 3: Business Ambition Linkage
    ambitionTargetScore: input.ambitionTargetScore ?? null,
    ambitionTargetDate: input.ambitionTargetDate ?? null,
    ambitionTargetLabel: input.ambitionTargetLabel ?? null,
    updatedAt: new Date(),
  };

  if (existing[0]) {
    await db.update(ailOrgContext).set(data).where(eq(ailOrgContext.tenantId, input.tenantId));
  } else {
    await db.insert(ailOrgContext).values({ id: nanoid(), tenantId: input.tenantId, ...data });
  }
}

/**
 * Get the organisation context for a tenant.
 */
export async function getOrgContext(tenantId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(ailOrgContext)
    .where(eq(ailOrgContext.tenantId, tenantId))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Generate simulation context injection based on the organisation's profile.
 * This is called before each simulation to adapt it to the organisation's context.
 */
export async function generateSimulationContextInjection(
  tenantId: string
): Promise<SimulationContextInjection> {
  const ctx = await getOrgContext(tenantId);

  // Default injection if no context configured
  if (!ctx) {
    return {
      scenarioFraming: "",
      stakeholderModifiers: {
        ceoStyle: "collaborative",
        cfoStyle: "cost_focused",
        pressureIntensity: "moderate",
      },
      consequenceCalibration: {
        legalConsequenceSeverity: "moderate",
        regulatoryExposure: "Standard employment law exposure",
        reputationalRisk: "moderate",
      },
      activePolicies: [],
      regulatoryReferences: ["UK GDPR", "Equality Act 2010", "Employment Rights Act 1996"],
    };
  }

  const sector = ctx.sector ?? "other";
  const sectorCtx = SECTOR_REGULATORY_CONTEXT[sector] ?? SECTOR_REGULATORY_CONTEXT.other;

  // Build scenario framing text
  const strategicPriorities = JSON.parse(ctx.strategicPrioritiesJson ?? "[]") as string[];
  const currentChallenges = JSON.parse(ctx.currentChallengesJson ?? "[]") as string[];
  const recentEvents = JSON.parse(ctx.recentEventsJson ?? "[]") as string[];

  let framingParts: string[] = [];
  if (strategicPriorities.length > 0) {
    framingParts.push(`The organisation's current strategic priorities include: ${strategicPriorities.slice(0, 2).join(" and ")}.`);
  }
  if (currentChallenges.length > 0) {
    framingParts.push(`The organisation is currently navigating: ${currentChallenges.slice(0, 2).join(" and ")}.`);
  }
  if (recentEvents.length > 0) {
    framingParts.push(`Recent context: ${recentEvents.slice(0, 1).join(". ")}.`);
  }

  // Determine pressure intensity from risk appetite and culture
  let pressureIntensity: "low" | "moderate" | "high" | "maximum" = "moderate";
  if (ctx.riskAppetiteOverall === "risk_tolerant" && ctx.cfoStyle === "growth_focused") {
    pressureIntensity = "high";
  } else if (ctx.riskAppetiteOverall === "risk_averse") {
    pressureIntensity = "moderate";
  } else if (ctx.hierarchyLevel === "hierarchical" && ctx.decisionMakingStyle === "top_down") {
    pressureIntensity = "maximum";
  }

  // Determine legal consequence severity
  let legalConsequenceSeverity: "low" | "moderate" | "high" | "critical" = "moderate";
  if (ctx.riskAppetiteLegal === "risk_averse" || sector === "financial_services" || sector === "healthcare") {
    legalConsequenceSeverity = "high";
  } else if (ctx.riskAppetiteLegal === "risk_tolerant") {
    legalConsequenceSeverity = "moderate";
  }

  // Build active policies list
  const activePolicies: string[] = [];
  if (ctx.hasAiUsagePolicy) activePolicies.push("AI Usage Policy");
  if (ctx.hasDataProtectionPolicy) activePolicies.push("Data Protection Policy");
  if (ctx.hasRedundancyPolicy) activePolicies.push("Redundancy Policy");
  if (ctx.hasWhistleblowingPolicy) activePolicies.push("Whistleblowing Policy");
  if (ctx.hasEdiPolicy) activePolicies.push("Equality, Diversity & Inclusion Policy");

  return {
    scenarioFraming: framingParts.join(" "),
    stakeholderModifiers: {
      ceoStyle: ctx.ceoStyle ?? "collaborative",
      cfoStyle: ctx.cfoStyle ?? "cost_focused",
      pressureIntensity,
    },
    consequenceCalibration: {
      legalConsequenceSeverity,
      regulatoryExposure: `Regulated by ${ctx.primaryRegulator ?? sectorCtx.regulator}. Key legislation: ${sectorCtx.keyLegislation.slice(0, 3).join(", ")}.`,
      reputationalRisk: ctx.riskAppetiteReputational === "risk_averse" ? "high" : "moderate",
    },
    activePolicies,
    regulatoryReferences: sectorCtx.keyLegislation,
  };
}
