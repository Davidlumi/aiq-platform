/**
 * Phase C — Layer 1 Differentiation Test
 *
 * Third configuration: the LLM is explicitly asked "what makes THIS initiative's
 * risk profile different from generic HR AI?" — targeting the class of miss where
 * the LLM knows the general framework but not the initiative-specific mechanism.
 *
 * Test cases:
 * - H3: wp_succession_planning — known killer: SAR exposure on succession rankings (Art. 15)
 * - H1: rt_flight_risk_prediction — known killer: score-use-protocol (upstream of Art. 22)
 *
 * Same blind strict scoring bar:
 * - H3 hit: names Article 15 SAR + the specific exposure mechanism on succession rankings
 * - H1 hit: names score-use-protocol as a distinct pre-deployment structural requirement
 *
 * Usage: npx tsx server/layer1-differentiation-test.ts
 */

import { invokeLLM } from "./_core/llm";
import { getInitiative } from "../shared/initiativeLibrary";
import { hasPreconditionCoverage } from "../shared/preconditionLibrary";

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

// ─── Differentiation system prompt ───────────────────────────────────────────
// The key difference: the LLM is asked to identify what is SPECIFIC to this
// initiative — not the general AI-in-HR precondition baseline, but the risks
// and obligations that arise from the PARTICULAR nature of this initiative.

const DIFFERENTIATION_SYSTEM_PROMPT = `You are a specialist employment law and AI governance analyst. You have already produced the standard precondition baseline for this AI initiative (UK GDPR core obligations, Equality Act, automated decision-making safeguards, processor contracts). That baseline is assumed to be in place.

Your task now is different: identify what makes THIS initiative's legal and operational risk profile DIFFERENT from generic HR AI. You are looking for:

1. **Initiative-specific risk mechanisms** — risks that arise from the particular nature of this initiative that would NOT apply to a generic HR analytics tool. What is it about THIS specific use case that creates a distinct legal or operational exposure?

2. **Rights and obligations specific to this data type or use** — are there specific data subject rights, specific regulatory obligations, or specific operational prerequisites that attach to THIS category of data or THIS use case, that do not attach to HR AI generally?

3. **The gap between what looks complete and what is actually complete** — what would a non-specialist reviewing a standard GDPR/Equality Act compliance checklist miss, because it is specific to this initiative?

RULES:
1. Do NOT repeat the standard baseline (GDPR Article 35 DPIA, Article 6 lawful basis, Article 13/14 transparency, Article 32 security, Equality Act discrimination). Assume those are covered.
2. Name the specific statute, article, or instrument if one applies. If the risk is operational rather than legal, describe the specific mechanism precisely.
3. If you cannot identify anything that distinguishes this initiative from generic HR AI, say so explicitly — do not pad.
4. Maximum 5 entries. Quality over quantity.

Return a JSON object with this exact shape:
{
  "differentiators": [
    {
      "statement": "string — the specific differentiating risk or obligation",
      "instrument": "string — specific statute/article if applicable, or 'operational' if no specific legal instrument",
      "specificity": "string — one sentence explaining WHY this is specific to this initiative and not generic HR AI",
      "confidence": "high" | "medium" | "low",
      "whyItKills": "string — the specific failure mechanism"
    }
  ],
  "noDifferentiatorsFound": boolean,
  "noDifferentiatorsReason": "string — only if noDifferentiatorsFound is true"
}

No other text. No markdown fences.`;

const CASES = [
  {
    caseId: "H3",
    initiativeId: "wp_succession_planning",
    knownKillerHint: "H3=SAR exposure on succession rankings (GDPR Article 15)",
  },
  {
    caseId: "H1",
    initiativeId: "rt_flight_risk_prediction",
    knownKillerHint: "H1=score-use-protocol as distinct pre-deployment structural requirement",
  },
];

async function runCase(caseId: string, initiativeId: string) {
  const libraryDef = getInitiative(initiativeId);
  const title = libraryDef?.label ?? initiativeId;
  const description = libraryDef?.description ?? "(no description)";
  const existingPrerequisites = libraryDef?.prerequisites ?? [];
  const hasCoverage = hasPreconditionCoverage(initiativeId);

  console.log(`${"─".repeat(80)}`);
  console.log(`CASE ${caseId} — ${title} (${initiativeId})`);
  console.log(`Library coverage: ${hasCoverage ? "SEEDED (ABORT)" : "EMPTY (correct)"}`);
  console.log(`Description: ${description}`);
  console.log(`Existing prerequisites visible to LLM:`);
  existingPrerequisites.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  console.log();

  if (hasCoverage) {
    console.log("ABORT: library seeded. Test invalid.");
    return;
  }

  const userContent = `Initiative: ${title}
Description: ${description}

Organisation context:
${ORG_CONTEXT}`;

  console.log("Calling LLM (differentiation prompt)...");
  const start = Date.now();

  let rawResponse = "";
  let differentiators: unknown[] = [];
  let noDifferentiatorsFound = false;
  let error = "";

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: DIFFERENTIATION_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });
    const rawContent = response.choices?.[0]?.message?.content;
    rawResponse = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? "");
    const cleaned = rawResponse.replace(/```json?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    differentiators = Array.isArray(parsed?.differentiators) ? parsed.differentiators : [];
    noDifferentiatorsFound = parsed?.noDifferentiatorsFound === true;
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

  if (noDifferentiatorsFound) {
    console.log("LLM returned: noDifferentiatorsFound = true");
    return;
  }

  console.log(`Parsed differentiators: ${differentiators.length}`);
  console.log();

  for (let i = 0; i < differentiators.length; i++) {
    const d = differentiators[i] as Record<string, unknown>;
    console.log(`[${i + 1}] instrument: ${d.instrument} | confidence: ${d.confidence}`);
    console.log(`    statement: ${d.statement}`);
    console.log(`    specificity: ${d.specificity}`);
    console.log(`    whyItKills: ${String(d.whyItKills).substring(0, 300)}`);
    console.log();
  }
}

async function main() {
  console.log("=".repeat(80));
  console.log("PHASE C — LAYER 1 DIFFERENTIATION TEST");
  console.log("Date:", new Date().toISOString());
  console.log("Configuration: LLM asked 'what makes THIS initiative different from generic HR AI?'");
  console.log("Library status for H1/H3: EMPTY (confirmed)");
  console.log("=".repeat(80));
  console.log();
  console.log("IMPORTANT: Score each case BEFORE reading the known killers.");
  console.log("H3 hit: names Article 15 SAR + specific exposure on succession rankings");
  console.log("H1 hit: names score-use-protocol as distinct pre-deployment structural requirement");
  console.log("Generic ('data privacy considerations') does NOT count.");
  console.log();

  for (const { caseId, initiativeId } of CASES) {
    await runCase(caseId, initiativeId);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("=".repeat(80));
  console.log("DIFFERENTIATION TEST COMPLETE");
  console.log("=".repeat(80));
}

main().catch(console.error);
