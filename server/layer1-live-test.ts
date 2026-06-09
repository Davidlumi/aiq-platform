/**
 * Phase C — Layer 1 Live Test
 *
 * Calls the LLM directly for H1, H2, H3 with:
 * - The exact same system prompt used by the production engine
 * - A representative UK mid-market org context (no real tenant data required)
 * - The precondition library still empty for these three initiatives
 *
 * This is the unaided test: the LLM receives the initiative title/description
 * and org context only. No hints about DPIA, EU AI Act, or SAR exposure.
 *
 * Usage: npx tsx server/layer1-live-test.ts
 */

import { invokeLLM } from "./_core/llm";
import { getInitiative } from "../shared/initiativeLibrary";
import { hasPreconditionCoverage } from "../shared/preconditionLibrary";

// ─── Representative UK mid-market org context ─────────────────────────────────
// Realistic context for a 3,500-person UK retail/logistics employer.
// Chosen to give the LLM enough signal to produce substantive Layer 1 output
// without hinting at any of the three known killers.

const ORG_CONTEXT = `Headcount: 3500
Sector: Retail / Logistics
UK sites: 14
Regulatory environment: Standard UK employment law; no sector-specific regulatory overlay declared
HR sub-functions in scope: ["talent_acquisition","learning_development","workforce_planning","reward","employee_relations"]
HR data quality: 3 (moderate — some gaps in job family and grade data)
HR system integration: 2 (low — HRIS and payroll not fully integrated)
Years of HRIS data: 4
ATS system: Workday Recruiting
Workforce digital access: 60% (frontline workers have limited digital access)
Annual hires: 420
Attrition rate: 22%
Annual L&D spend: £480k
Cost per external hire: £3200
Change readiness: 2 (low — previous change programmes have stalled)
Business direction: Growth through acquisition
Skills framework: In progress
Workforce composition: 65% frontline hourly, 35% salaried
Manager capability: 2 (low — managers struggle to act on people data)
Pivotal job families: Warehouse operations, logistics coordination, store management`;

// ─── System prompt (exact copy from production engine) ────────────────────────

const SYSTEM_PROMPT = `You are a senior HR strategy analyst decomposing an AI initiative into its underlying assumptions.

Your task: given an AI initiative and an organisation's context, produce a structured set of assumptions across four types.

ASSUMPTION TYPES:
- cost: What does this initiative cost to deploy and sustain? (vendor fees, implementation, change management, internal resource)
- capability: What HR/people capability does the organisation need to have or build to make this initiative succeed?
- market: What does the external market or sector context need to be true for this initiative to deliver its projected value?
- pressure: What internal organisational pressure or strategic driver must exist for this initiative to maintain momentum?

RULES:
1. Produce 1–3 assumptions per type. Do not pad with generic claims.
2. Every assumption must reference a specific fact from the org context provided, OR cite a sector benchmark. Do not invent.
3. For each assumption, assess:
   - basis: one of "self_declared" (org told us), "assessed" (derived from what org told us), "benchmark_default" (sector average used because org did not provide), "calculated" (derived from formula)
   - sourceRef: which field or benchmark this comes from (e.g. "sectionC.dataQualityRating", "sector benchmark: retail HRIS integration maturity")
   - strength: "strong" (directly evidenced), "moderate" (reasonably inferred), "weak" (thin evidence), "unverified" (no evidence)
   - confidence: "high" (reliable), "medium" (reasonable), "low" (uncertain — surface for user confirmation)
4. Do NOT produce precondition-type assumptions. Layer 1 covers cost/capability/market/pressure only.
5. Do NOT produce generic platitudes. "Executive sponsorship is important" is not an assumption — it is a truism.

Return a JSON object with this exact shape:
{
  "assumptions": [
    {
      "type": "cost" | "capability" | "market" | "pressure",
      "statement": "string — the assumption in plain English",
      "basis": "self_declared" | "assessed" | "benchmark_default" | "calculated",
      "sourceRef": "string — specific field or benchmark",
      "strength": "strong" | "moderate" | "weak" | "unverified",
      "confidence": "high" | "medium" | "low"
    }
  ]
}

No other text. No markdown fences.`;

// ─── Gate cases ───────────────────────────────────────────────────────────────

const HELD_OUT_CASES = [
  {
    caseId: "H1",
    initiativeId: "rt_flight_risk_prediction",
  },
  {
    caseId: "H2",
    initiativeId: "ta_video_interview_assessment",
  },
  {
    caseId: "H3",
    initiativeId: "wp_succession_planning",
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

async function runCase(caseId: string, initiativeId: string) {
  const libraryDef = getInitiative(initiativeId);
  const title = libraryDef?.label ?? initiativeId;
  const description = libraryDef?.description ?? "(no description)";
  const existingPrerequisites = libraryDef?.prerequisites ?? [];

  // Confirm library is still empty for this initiative
  const hasCoverage = hasPreconditionCoverage(initiativeId);

  console.log(`${"─".repeat(80)}`);
  console.log(`CASE ${caseId} — ${title} (${initiativeId})`);
  console.log(`Library coverage: ${hasCoverage ? "SEEDED (ABORT — test invalid)" : "EMPTY (correct)"}`);
  console.log(`Description: ${description}`);
  console.log(`Existing prerequisites visible to LLM:`);
  existingPrerequisites.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  console.log();

  if (hasCoverage) {
    console.log("ABORT: library has been seeded for this initiative. Test is invalid.");
    return;
  }

  const userContent = `Initiative: ${title}
Description: ${description}

Organisation context:
${ORG_CONTEXT}`;

  console.log("Calling LLM...");
  const start = Date.now();

  let rawResponse = "";
  let assumptions: unknown[] = [];
  let error = "";

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });
    const rawContent = response.choices?.[0]?.message?.content;
    rawResponse = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? "");
    const cleaned = rawResponse.replace(/```json?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    assumptions = Array.isArray(parsed?.assumptions) ? parsed.assumptions : [];
  } catch (e) {
    error = String(e);
    rawResponse = error;
  }

  const elapsed = Date.now() - start;

  console.log(`LLM call completed in ${elapsed}ms`);
  console.log();
  console.log("=== RAW LLM RESPONSE (unedited) ===");
  console.log(rawResponse);
  console.log("=== END RAW RESPONSE ===");
  console.log();

  if (error) {
    console.log(`ERROR: ${error}`);
    return;
  }

  console.log(`Parsed assumptions: ${assumptions.length}`);
  console.log();

  // Print each assumption in a readable format for blind scoring
  for (let i = 0; i < assumptions.length; i++) {
    const a = assumptions[i] as Record<string, string>;
    console.log(`[${i + 1}] type: ${a.type} | confidence: ${a.confidence} | strength: ${a.strength}`);
    console.log(`    statement: ${a.statement}`);
    console.log(`    basis: ${a.basis} | sourceRef: ${a.sourceRef}`);
    console.log();
  }
}

async function main() {
  console.log("=".repeat(80));
  console.log("PHASE C — LAYER 1 LIVE TEST (unaided LLM, no precondition library seeding)");
  console.log("Date:", new Date().toISOString());
  console.log("Org context: UK retail/logistics, 3500 headcount, 14 sites");
  console.log("Library status for H1/H2/H3: EMPTY (confirmed by hasPreconditionCoverage)");
  console.log("=".repeat(80));
  console.log();
  console.log("IMPORTANT: This output is the RAW Layer 1 result.");
  console.log("Score each case BEFORE reading the known killers.");
  console.log("Known killers are in PhaseC_GatePlan_Confirmed_TwoTightenings.md.");
  console.log();

  for (const { caseId, initiativeId } of HELD_OUT_CASES) {
    await runCase(caseId, initiativeId);
    // Small delay between calls to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("=".repeat(80));
  console.log("LAYER 1 LIVE TEST COMPLETE");
  console.log("Score each case specific-vs-generic before reading the known killers.");
  console.log("=".repeat(80));
}

main().catch(console.error);
