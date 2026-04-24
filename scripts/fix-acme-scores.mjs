/**
 * Fix Acme Ltd score_breakdown_json:
 * - capabilityScores values must be plain numbers (not objects)
 * - key ai_ethics → ai_ethics_trust (matches Drizzle schema CAPABILITY_KEYS)
 */
import mysql from "mysql2/promise";

// Matches the CAPABILITY_KEYS in dashboard.ts
const CAPABILITY_KEYS = [
  "ai_interaction",
  "ai_output_evaluation",
  "ai_workflow_design",
  "workforce_ai_readiness",
  "ai_ethics_trust",
  "ai_change_leadership",
];

function generateCapabilityScores(overall, seed) {
  let r = seed;
  function rand() { r = (r * 1664525 + 1013904223) & 0xffffffff; return (r >>> 0) / 0xffffffff; }
  const scores = {};
  for (const key of CAPABILITY_KEYS) {
    const variation = (rand() - 0.5) * 30;
    const raw = Math.round(overall + variation);
    scores[key] = Math.max(10, Math.min(95, raw));
  }
  return scores;
}

function generateSignalScores(overall, seed) {
  const signals = [
    "prompt_quality","iteration_quality","context_framing","tool_selection",
    "error_detection_quality","fitness_for_purpose","confidence_calibration","source_verification",
    "process_analysis","handoff_design","efficiency_gain","oversight_integration",
    "gap_diagnosis","intervention_quality","advisory_quality","measurement_rigour",
    "ethical_reasoning","pressure_resistance","stakeholder_awareness","trust_preservation",
    "transparency_quality","resistance_handling","pace_calibration","legitimate_concern_recognition",
    "change_sustainability","vision_articulation",
  ];
  let r = seed + 999;
  function rand() { r = (r * 1664525 + 1013904223) & 0xffffffff; return (r >>> 0) / 0xffffffff; }
  const out = {};
  const baseline = (overall - 50) / 100;
  for (const s of signals) {
    const delta = baseline + (rand() - 0.5) * 0.4;
    out[s] = parseFloat(Math.max(-0.5, Math.min(0.5, delta)).toFixed(3));
  }
  return out;
}

function getReadinessConfig(state) {
  const map = {
    safe:    { label: "AI Ready",        description: "Demonstrates the capability to use AI tools responsibly and effectively in HR practice." },
    at_risk: { label: "Developing",      description: "Shows foundational AI capability with identifiable gaps. Targeted development recommended." },
    unsafe:  { label: "Not Yet Ready",   description: "Significant capability gaps identified. Structured development required before AI-assisted decisions." },
  };
  return map[state] ?? { label: "Unknown", description: "" };
}

// All 50 Acme users — id, score, state, credBand, riskBand
const ORG = [
  { id: "u-acme-001", score: 82, state: "safe",    credBand: "high",   riskBand: "low",    firstName: "Sarah",    lastName: "Thornton",    jobTitle: "Chief People Officer" },
  { id: "u-acme-002", score: 76, state: "safe",    credBand: "high",   riskBand: "low",    firstName: "James",    lastName: "Whitfield",   jobTitle: "Deputy CPO" },
  { id: "u-acme-003", score: 71, state: "safe",    credBand: "high",   riskBand: "low",    firstName: "Priya",    lastName: "Sharma",      jobTitle: "Senior HRBP — Technology" },
  { id: "u-acme-004", score: 68, state: "safe",    credBand: "medium", riskBand: "low",    firstName: "Marcus",   lastName: "Okafor",      jobTitle: "Senior HRBP — Operations" },
  { id: "u-acme-005", score: 59, state: "at_risk", credBand: "medium", riskBand: "medium", firstName: "Fiona",    lastName: "MacLeod",     jobTitle: "HRBP — Commercial" },
  { id: "u-acme-006", score: 54, state: "at_risk", credBand: "medium", riskBand: "medium", firstName: "Daniel",   lastName: "Reyes",       jobTitle: "HRBP — Finance" },
  { id: "u-acme-007", score: 48, state: "at_risk", credBand: "medium", riskBand: "medium", firstName: "Amara",    lastName: "Diallo",      jobTitle: "HRBP — Marketing" },
  { id: "u-acme-008", score: 43, state: "at_risk", credBand: "low",    riskBand: "medium", firstName: "Tom",      lastName: "Griffiths",   jobTitle: "HRBP — Supply Chain" },
  { id: "u-acme-009", score: 36, state: "at_risk", credBand: "low",    riskBand: "high",   firstName: "Zoe",      lastName: "Patel",       jobTitle: "Junior HRBP" },
  { id: "u-acme-010", score: 29, state: "unsafe",  credBand: "low",    riskBand: "high",   firstName: "Kieran",   lastName: "Walsh",       jobTitle: "Junior HRBP" },
  { id: "u-acme-011", score: 74, state: "safe",    credBand: "high",   riskBand: "low",    firstName: "Rachel",   lastName: "Osei",        jobTitle: "Head of Talent Acquisition" },
  { id: "u-acme-012", score: 61, state: "at_risk", credBand: "medium", riskBand: "low",    firstName: "Ben",      lastName: "Kowalski",    jobTitle: "Senior Recruiter — Tech" },
  { id: "u-acme-013", score: 55, state: "at_risk", credBand: "medium", riskBand: "medium", firstName: "Nia",      lastName: "Thompson",    jobTitle: "Recruiter — Commercial" },
  { id: "u-acme-014", score: 47, state: "at_risk", credBand: "low",    riskBand: "medium", firstName: "Luca",     lastName: "Ferrari",     jobTitle: "Recruiter — Operations" },
  { id: "u-acme-015", score: 33, state: "unsafe",  credBand: "low",    riskBand: "high",   firstName: "Aisha",    lastName: "Mensah",      jobTitle: "Junior Recruiter" },
  { id: "u-acme-016", score: 27, state: "unsafe",  credBand: "low",    riskBand: "high",   firstName: "Connor",   lastName: "Burke",       jobTitle: "Talent Coordinator" },
  { id: "u-acme-017", score: 78, state: "safe",    credBand: "high",   riskBand: "low",    firstName: "Helen",    lastName: "Nakamura",    jobTitle: "Head of L&D" },
  { id: "u-acme-018", score: 65, state: "safe",    credBand: "medium", riskBand: "low",    firstName: "Kwame",    lastName: "Asante",      jobTitle: "L&D Business Partner" },
  { id: "u-acme-019", score: 58, state: "at_risk", credBand: "medium", riskBand: "medium", firstName: "Sophie",   lastName: "Laurent",     jobTitle: "L&D Specialist — Digital" },
  { id: "u-acme-020", score: 52, state: "at_risk", credBand: "medium", riskBand: "medium", firstName: "Ravi",     lastName: "Krishnan",    jobTitle: "L&D Specialist — Leadership" },
  { id: "u-acme-021", score: 40, state: "at_risk", credBand: "low",    riskBand: "medium", firstName: "Megan",    lastName: "Price",       jobTitle: "Learning Designer" },
  { id: "u-acme-022", score: 31, state: "unsafe",  credBand: "low",    riskBand: "high",   firstName: "Ethan",    lastName: "Saunders",    jobTitle: "Learning Coordinator" },
  { id: "u-acme-023", score: 69, state: "safe",    credBand: "high",   riskBand: "low",    firstName: "Claire",   lastName: "Drummond",    jobTitle: "Head of Reward" },
  { id: "u-acme-024", score: 62, state: "at_risk", credBand: "medium", riskBand: "low",    firstName: "Yusuf",    lastName: "Al-Rashid",   jobTitle: "Reward Analyst — Senior" },
  { id: "u-acme-025", score: 50, state: "at_risk", credBand: "medium", riskBand: "medium", firstName: "Natalie",  lastName: "Fox",         jobTitle: "Reward Analyst" },
  { id: "u-acme-026", score: 44, state: "at_risk", credBand: "low",    riskBand: "medium", firstName: "Oliver",   lastName: "Chan",        jobTitle: "Compensation Specialist" },
  { id: "u-acme-027", score: 35, state: "at_risk", credBand: "low",    riskBand: "high",   firstName: "Imogen",   lastName: "Blake",       jobTitle: "Benefits Coordinator" },
  { id: "u-acme-028", score: 66, state: "safe",    credBand: "high",   riskBand: "low",    firstName: "Patrick",  lastName: "O'Brien",     jobTitle: "Head of Employee Relations" },
  { id: "u-acme-029", score: 57, state: "at_risk", credBand: "medium", riskBand: "medium", firstName: "Leila",    lastName: "Hassan",      jobTitle: "Senior ER Adviser" },
  { id: "u-acme-030", score: 49, state: "at_risk", credBand: "medium", riskBand: "medium", firstName: "George",   lastName: "Papadopoulos",jobTitle: "ER Adviser" },
  { id: "u-acme-031", score: 38, state: "at_risk", credBand: "low",    riskBand: "high",   firstName: "Tanya",    lastName: "Ivanova",     jobTitle: "ER Coordinator" },
  { id: "u-acme-032", score: 24, state: "unsafe",  credBand: "low",    riskBand: "high",   firstName: "Sam",      lastName: "Adeyemi",     jobTitle: "ER Administrator" },
  { id: "u-acme-033", score: 85, state: "safe",    credBand: "high",   riskBand: "low",    firstName: "Mei",      lastName: "Zhang",       jobTitle: "Head of People Analytics" },
  { id: "u-acme-034", score: 79, state: "safe",    credBand: "high",   riskBand: "low",    firstName: "Arjun",    lastName: "Nair",        jobTitle: "Senior People Data Analyst" },
  { id: "u-acme-035", score: 63, state: "at_risk", credBand: "medium", riskBand: "low",    firstName: "Chloe",    lastName: "Beaumont",    jobTitle: "People Data Analyst" },
  { id: "u-acme-036", score: 55, state: "at_risk", credBand: "medium", riskBand: "medium", firstName: "Hassan",   lastName: "Malik",       jobTitle: "HR Systems Analyst" },
  { id: "u-acme-037", score: 73, state: "safe",    credBand: "high",   riskBand: "low",    firstName: "Ingrid",   lastName: "Sorensen",    jobTitle: "Head of OD" },
  { id: "u-acme-038", score: 60, state: "at_risk", credBand: "medium", riskBand: "medium", firstName: "Tobias",   lastName: "Müller",      jobTitle: "OD Consultant" },
  { id: "u-acme-039", score: 51, state: "at_risk", credBand: "medium", riskBand: "medium", firstName: "Fatima",   lastName: "Al-Amin",     jobTitle: "Change Management Specialist" },
  { id: "u-acme-040", score: 37, state: "at_risk", credBand: "low",    riskBand: "high",   firstName: "Jack",     lastName: "Morrison",    jobTitle: "OD Analyst" },
  { id: "u-acme-041", score: 70, state: "safe",    credBand: "high",   riskBand: "low",    firstName: "Amelia",   lastName: "Okonkwo",     jobTitle: "Head of DEI" },
  { id: "u-acme-042", score: 56, state: "at_risk", credBand: "medium", riskBand: "medium", firstName: "Jordan",   lastName: "Ellis",       jobTitle: "DEI Programme Manager" },
  { id: "u-acme-043", score: 42, state: "at_risk", credBand: "low",    riskBand: "medium", firstName: "Suki",     lastName: "Watanabe",    jobTitle: "DEI Analyst" },
  { id: "u-acme-044", score: 64, state: "at_risk", credBand: "medium", riskBand: "low",    firstName: "Victoria", lastName: "Hartley",     jobTitle: "Head of HR Operations" },
  { id: "u-acme-045", score: 53, state: "at_risk", credBand: "medium", riskBand: "medium", firstName: "Damian",   lastName: "Kowalczyk",   jobTitle: "HR Operations Manager" },
  { id: "u-acme-046", score: 46, state: "at_risk", credBand: "low",    riskBand: "medium", firstName: "Layla",    lastName: "Hussain",     jobTitle: "HR Advisor" },
  { id: "u-acme-047", score: 34, state: "unsafe",  credBand: "low",    riskBand: "high",   firstName: "Nathan",   lastName: "Pearce",      jobTitle: "HR Coordinator" },
  { id: "u-acme-048", score: 26, state: "unsafe",  credBand: "low",    riskBand: "high",   firstName: "Grace",    lastName: "Nwosu",       jobTitle: "HR Administrator" },
  { id: "u-acme-049", score: 67, state: "safe",    credBand: "high",   riskBand: "low",    firstName: "Alexei",   lastName: "Volkov",      jobTitle: "Workforce Planning Manager" },
  { id: "u-acme-050", score: 45, state: "at_risk", credBand: "low",    riskBand: "medium", firstName: "Diane",    lastName: "Chambers",    jobTitle: "Workforce Planner" },
];

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("Connected. Fixing score_breakdown_json for all 50 Acme users...\n");

  for (let i = 0; i < ORG.length; i++) {
    const u = ORG[i];
    const sessionId = `sess-acme-${u.id}`;
    const scoreId = `score-acme-${u.id}`;

    const capabilityScores = generateCapabilityScores(u.score, i * 7919 + 1);
    const signalScores = generateSignalScores(u.score, i * 6271 + 3);
    const readinessConfig = getReadinessConfig(u.state);

    // Governance constraint for at_risk / unsafe
    const governingConstraint = u.state !== "safe" ? {
      capability: u.state === "unsafe" ? "ai_output_evaluation" : "ai_workflow_design",
      score: u.state === "unsafe" ? Math.min(35, u.score) : Math.min(50, u.score),
      band: u.state === "unsafe" ? "critical_failure" : "needs_work",
      thresholdRequired: u.state === "unsafe" ? 45 : 55,
      gap: u.state === "unsafe" ? 45 - Math.min(35, u.score) : 55 - Math.min(50, u.score),
      droveClassification: true,
    } : null;

    const breakdown = {
      readiness: {
        state: u.state,
        label: readinessConfig.label,
        description: readinessConfig.description,
      },
      primaryState: u.state,
      overallScore: u.score,
      // capabilityScores: plain numbers keyed by CAPABILITY_KEYS
      capabilityScores,
      signalScores,
      narrative: `${u.firstName} ${u.lastName} (${u.jobTitle}) completed the AiQ Adaptive Assessment with an overall score of ${u.score}/100, classified as ${readinessConfig.label}.`,
      llmNarrative: {
        strengths: u.score >= 65
          ? `${u.firstName} demonstrates strong capability in AI output evaluation and prompt construction. Particularly effective at identifying AI errors and calibrating confidence appropriately.`
          : `${u.firstName} shows developing capability in AI interaction and prompt quality. Demonstrates awareness of AI limitations.`,
        gaps: u.score < 60
          ? "AI workflow design and change leadership represent the most significant development areas. Structured practice with real HR scenarios is recommended."
          : "Opportunities exist to deepen AI change leadership capability and build more robust oversight frameworks.",
        priorities: u.score < 50
          ? "1. Complete AI Foundations module before taking on AI-assisted HR decisions. 2. Focus on error detection and source verification in AI outputs."
          : "1. Advance AI workflow design skills through the Practitioner pathway. 2. Develop AI change leadership capability to support team adoption.",
      },
      credibilityBand: u.credBand,
      riskBand: u.riskBand,
      totalAnswers: 35 + Math.floor((i * 7 + 3) % 15),
      targetItems: 49,
      governanceAction: u.state === "unsafe" ? "block_ai_decisions" : u.state === "at_risk" ? "require_oversight" : "permit_supervised",
      governingConstraint,
      classificationConfidence: {
        band: u.credBand === "high" ? "high" : u.credBand === "medium" ? "medium" : "low",
        label: u.credBand === "high" ? "High confidence" : u.credBand === "medium" ? "Moderate confidence" : "Low confidence",
        wasDowngraded: u.credBand === "low",
        caveat: u.credBand === "low" ? "Classification confidence is limited due to inconsistent response patterns. Treat this result as indicative rather than definitive." : null,
      },
      normGroupVersion: "v1-synthetic",
      percentileRanks: Object.fromEntries(
        Object.keys(capabilityScores).map(k => {
          const s = capabilityScores[k];
          const band = s >= 75 ? "Top 20%" : s >= 60 ? "Above average" : s >= 45 ? "Around average" : s >= 30 ? "Below average" : "Bottom 20%";
          return [k, { percentile: s, percentileBand: band, percentileBandLabel: band, label: band, normGroupLabel: "HR Professionals (UK)", isSynthetic: true }];
        })
      ),
    };

    await conn.execute(
      "UPDATE assessment_scores SET score_breakdown_json=?, signal_scores_json=? WHERE id=?",
      [JSON.stringify(breakdown), JSON.stringify(signalScores), scoreId]
    );

    process.stdout.write(`  ✓ ${u.firstName} ${u.lastName} (${u.score}/100 — ${u.state})\n`);
  }

  console.log("\n✓ All 50 score_breakdown_json records fixed");
  console.log("  capabilityScores are now plain numbers keyed by CAPABILITY_KEYS");
  console.log("  ai_ethics → ai_ethics_trust corrected");
  await conn.end();
}

main().catch(err => { console.error("FIX FAILED:", err); process.exit(1); });
