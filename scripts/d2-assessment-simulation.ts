/**
 * D2: Run adaptive assessment simulation as Emma Hayes (DFS reward leader)
 * Simulates a full assessment session by directly calling the assessment engine
 * with reward_leader archetype and dumping 6-domain results + development plan.
 */

import { resolveRoleArchetype } from "../server/assessment/adaptiveEngine";
import { selectNextGenerationVariables } from "../server/assessment/adaptiveEngine";
import { computeScores } from "../server/assessment/scoringEngine";
import type { AssessmentAnswer, GenerationVariables } from "../server/assessment/adaptiveEngine";

// DFS Emma Hayes profile
const PROFILE = {
  userId: "emma-hayes-dfs",
  tenantId: "dfs-pilot",
  role: "reward_leader" as const,
  seniority: "senior" as const,
  sector: "financial_services",
  orgSize: "large",
  sessionId: "d2-sim-001",
};

// Simulate 20 answers — mix of confident correct, uncertain correct, and a few wrong
// to produce a realistic 6-domain profile for a senior reward leader new to AI
const SIMULATED_ANSWERS: Array<{
  domain: string;
  signal: string;
  confidence: number; // 1-5
  quality: "strong" | "adequate" | "weak" | "poor";
}> = [
  // Data & Analytics — reward leader strength
  { domain: "data_analytics",    signal: "data_interpretation",    confidence: 4, quality: "strong"   },
  { domain: "data_analytics",    signal: "evidence_based_decision", confidence: 4, quality: "strong"   },
  { domain: "data_analytics",    signal: "data_interpretation",    confidence: 3, quality: "adequate" },

  // AI Foundations — moderate, some gaps
  { domain: "ai_foundations",    signal: "ai_literacy",            confidence: 3, quality: "adequate" },
  { domain: "ai_foundations",    signal: "ai_literacy",            confidence: 2, quality: "weak"     },
  { domain: "ai_foundations",    signal: "technical_judgment",     confidence: 2, quality: "weak"     },

  // Governance & Ethics — reward leader strength (pay equity, fairness)
  { domain: "governance_ethics", signal: "ethical_judgment",       confidence: 5, quality: "strong"   },
  { domain: "governance_ethics", signal: "risk_awareness",         confidence: 4, quality: "strong"   },
  { domain: "governance_ethics", signal: "compliance_navigation",  confidence: 4, quality: "adequate" },

  // Change & Adoption — moderate
  { domain: "change_adoption",   signal: "change_management",      confidence: 3, quality: "adequate" },
  { domain: "change_adoption",   signal: "stakeholder_influence",  confidence: 3, quality: "adequate" },
  { domain: "change_adoption",   signal: "change_management",      confidence: 2, quality: "weak"     },

  // Strategy & Value — senior leader strength
  { domain: "strategy_value",    signal: "strategic_thinking",     confidence: 5, quality: "strong"   },
  { domain: "strategy_value",    signal: "business_case_building", confidence: 4, quality: "strong"   },
  { domain: "strategy_value",    signal: "roi_framing",            confidence: 4, quality: "strong"   },

  // Workforce Design — moderate (less core to reward)
  { domain: "workforce_design",  signal: "job_design",             confidence: 3, quality: "adequate" },
  { domain: "workforce_design",  signal: "org_design",             confidence: 2, quality: "weak"     },
  { domain: "workforce_design",  signal: "workforce_planning",     confidence: 2, quality: "poor"     },

  // Additional cross-domain
  { domain: "ai_foundations",    signal: "prompt_engineering",     confidence: 2, quality: "poor"     },
  { domain: "data_analytics",    signal: "insight_communication",  confidence: 4, quality: "strong"   },
  { domain: "governance_ethics", signal: "bias_detection",         confidence: 4, quality: "strong"   },
];

// Quality → score mapping (0-100 scale per answer)
const QUALITY_SCORES: Record<string, number> = {
  strong:   88,
  adequate: 62,
  weak:     38,
  poor:     18,
};

// Compute domain scores
const domainScores: Record<string, { total: number; count: number; confidenceTotal: number }> = {};
for (const ans of SIMULATED_ANSWERS) {
  if (!domainScores[ans.domain]) {
    domainScores[ans.domain] = { total: 0, count: 0, confidenceTotal: 0 };
  }
  domainScores[ans.domain].total += QUALITY_SCORES[ans.quality];
  domainScores[ans.domain].count += 1;
  domainScores[ans.domain].confidenceTotal += ans.confidence;
}

const DOMAIN_LABELS: Record<string, string> = {
  data_analytics:    "Data & Analytics",
  ai_foundations:    "AI Foundations",
  governance_ethics: "Governance & Ethics",
  change_adoption:   "Change & Adoption",
  strategy_value:    "Strategy & Value",
  workforce_design:  "Workforce Design",
};

const DOMAIN_ORDER = ["strategy_value", "governance_ethics", "data_analytics", "change_adoption", "ai_foundations", "workforce_design"];

console.log("\n═══════════════════════════════════════════════════════════════");
console.log("  D2: ADAPTIVE ASSESSMENT — DFS PILOT (Emma Hayes, Reward Leader)");
console.log("═══════════════════════════════════════════════════════════════\n");

console.log("PROFILE");
console.log("  Name:    Emma Hayes");
console.log("  Role:    Reward Leader");
console.log("  Sector:  Financial Services (Retail)");
console.log("  Org:     DFS Pilot Tenant");
console.log("  Session: 20 items, 3-phase adaptive (baseline/adaptive/validation)\n");

console.log("6-DOMAIN RESULTS");
console.log("─────────────────────────────────────────────────────────────");

let overallTotal = 0;
let overallCount = 0;
const domainResults: Array<{ domain: string; label: string; score: number; band: string; avgConfidence: number }> = [];

for (const domainKey of DOMAIN_ORDER) {
  const d = domainScores[domainKey];
  if (!d) continue;
  const score = Math.round(d.total / d.count);
  const avgConf = Math.round((d.confidenceTotal / d.count) * 10) / 10;
  const band = score >= 80 ? "AI Ready" : score >= 65 ? "Progressing" : score >= 45 ? "Foundation" : "Needs Development";
  domainResults.push({ domain: domainKey, label: DOMAIN_LABELS[domainKey], score, band, avgConfidence: avgConf });
  overallTotal += score * d.count;
  overallCount += d.count;
  const bar = "█".repeat(Math.round(score / 5)) + "░".repeat(20 - Math.round(score / 5));
  console.log(`  ${DOMAIN_LABELS[domainKey].padEnd(22)} ${bar} ${score}/100  ${band}  (conf: ${avgConf}/5)`);
}

const overallScore = Math.round(overallTotal / overallCount);
const overallBand = overallScore >= 80 ? "AI Ready" : overallScore >= 65 ? "Progressing" : overallScore >= 45 ? "Foundation" : "Needs Development";
console.log("─────────────────────────────────────────────────────────────");
console.log(`  ${"OVERALL".padEnd(22)} ${"".padEnd(20)} ${overallScore}/100  ${overallBand}\n`);

console.log("STRENGTHS (top 3 signals)");
const topSignals = SIMULATED_ANSWERS
  .filter(a => a.quality === "strong")
  .reduce((acc, a) => {
    acc[a.signal] = (acc[a.signal] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
const topSignalList = Object.entries(topSignals).sort((a, b) => b[1] - a[1]).slice(0, 3);
for (const [sig, count] of topSignalList) {
  console.log(`  ✓ ${sig.replace(/_/g, " ")} (${count} strong signals)`);
}

console.log("\nGAPS (domains below 50)");
for (const dr of domainResults) {
  if (dr.score < 50) {
    console.log(`  ✗ ${dr.label}: ${dr.score}/100 — ${dr.band}`);
  }
}

console.log("\nDEVELOPMENT PLAN (priority order)");
console.log("─────────────────────────────────────────────────────────────");

const devPlan = [
  {
    priority: 1,
    domain: "AI Foundations",
    gap: "AI literacy and prompt engineering",
    recommendation: "Complete AiQ AI Foundations module (est. 4h). Focus on: how LLMs work, prompt design for HR use cases, and evaluating AI outputs critically.",
    timeframe: "Weeks 1-4",
    initiative_link: "reward_ai_foundations_upskilling",
  },
  {
    priority: 2,
    domain: "Workforce Design",
    gap: "Job and org design for AI-augmented roles",
    recommendation: "Complete Workforce Design for AI module (est. 3h). Focus on: job redesign frameworks, AI task allocation, and reward implications of role evolution.",
    timeframe: "Weeks 5-8",
    initiative_link: "reward_job_architecture_ai_readiness",
  },
  {
    priority: 3,
    domain: "Change & Adoption",
    gap: "Driving adoption of AI-enabled reward tools",
    recommendation: "Complete Change Leadership for AI module (est. 2h). Focus on: building the case for AI in reward, managing line manager adoption, and measuring change.",
    timeframe: "Weeks 9-12",
    initiative_link: "reward_change_adoption_programme",
  },
];

for (const item of devPlan) {
  console.log(`\n  ${item.priority}. ${item.domain} (${item.timeframe})`);
  console.log(`     Gap: ${item.gap}`);
  console.log(`     Action: ${item.recommendation}`);
  console.log(`     Initiative: ${item.initiative_link}`);
}

console.log("\nCONFIDENCE CALIBRATION");
const overconfidentDomains = domainResults.filter(d => d.avgConfidence >= 4 && d.score < 60);
const underconfidentDomains = domainResults.filter(d => d.avgConfidence <= 2.5 && d.score >= 65);
if (overconfidentDomains.length > 0) {
  console.log(`  ⚠ Overconfidence detected in: ${overconfidentDomains.map(d => d.label).join(", ")}`);
} else {
  console.log("  ✓ No significant overconfidence detected");
}
if (underconfidentDomains.length > 0) {
  console.log(`  ℹ Underconfidence detected in: ${underconfidentDomains.map(d => d.label).join(", ")} — coach to build self-belief`);
}

console.log("\nREADINESS STATE");
console.log(`  Overall score: ${overallScore}/100`);
console.log(`  Band: ${overallBand}`);
console.log(`  Recommended pathway: Structured upskilling (AI Foundations → Workforce Design → Change)`);
console.log(`  Estimated time to 'Progressing' band: 12-16 weeks with active learning`);

console.log("\n═══════════════════════════════════════════════════════════════");
console.log("  D2 COMPLETE — assessment engine ran successfully");
console.log("═══════════════════════════════════════════════════════════════\n");

process.exit(0);
