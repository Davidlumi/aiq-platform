/**
 * Phase C — Layer 1 Targeted Precondition-Pass Test
 *
 * Tests whether the LLM can surface mandatory legal/regulatory/structural
 * preconditions when that is its EXPLICIT, SOLE task — not as a byproduct
 * of general decomposition.
 *
 * This is the second configuration: the LLM is told to hunt for preconditions
 * specifically, name the statute or instrument, and distinguish mandatory
 * obligations from best-practice recommendations.
 *
 * Same three held-out initiatives: H1, H2, H3.
 * Library still empty for all three.
 * Same blind strict scoring bar.
 *
 * Usage: npx tsx server/layer1-targeted-pass.ts
 */

import { invokeLLM } from "./_core/llm";
import { getInitiative } from "../shared/initiativeLibrary";
import { hasPreconditionCoverage } from "../shared/preconditionLibrary";

// ─── Representative UK mid-market org context (same as general-decomposition run) ─

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

// ─── Targeted precondition-pass system prompt ─────────────────────────────────
// This is the different configuration: the LLM's explicit, sole task is to
// surface mandatory pre-deployment preconditions — not general assumptions.

const TARGETED_SYSTEM_PROMPT = `You are a specialist employment law and AI governance analyst. Your task is to identify mandatory pre-deployment preconditions for an AI initiative — obligations that MUST be satisfied before the initiative can be deployed, not recommendations or best practices.

SCOPE: Legal, regulatory, and structural preconditions only. You are NOT producing general business assumptions (cost, capability, market, pressure). You are hunting specifically for:
1. Mandatory legal obligations (statutes, regulations, case law) that apply to this specific use case
2. Regulatory requirements that attach to the deployer (not the vendor) for this category of AI system
3. Structural prerequisites whose absence makes deployment legally or operationally impossible

RULES:
1. Name the specific statute, regulation, or instrument — not a generic category. "GDPR compliance" is not acceptable. "UK GDPR Article 35 — Data Protection Impact Assessment mandatory for systematic monitoring of employees" is acceptable.
2. Distinguish mandatory from recommended. A DPIA is mandatory under Article 35 for high-risk processing. A bias audit may be recommended but is not mandatory. Only include mandatory obligations.
3. Identify who the obligation attaches to. If a regulation imposes obligations on the deployer that the vendor cannot discharge on their behalf, say so explicitly.
4. If an obligation exists but you are uncertain whether it applies to this specific use case, include it with confidence: "low" and explain the uncertainty.
5. Do NOT include general data governance, change management, or capability requirements — those are Layer 1 general assumptions, not preconditions.
6. If you cannot identify any mandatory preconditions specific to this initiative, say so explicitly — do not pad with generic compliance gestures.

Return a JSON object with this exact shape:
{
  "preconditions": [
    {
      "statement": "string — the specific obligation in plain English",
      "instrument": "string — the specific statute, regulation, article, or instrument (e.g. 'UK GDPR Article 35', 'EU AI Act Annex III', 'Employment Relations Act 1999 s.188')",
      "obligationHolder": "deployer" | "vendor" | "both",
      "mandatory": true | false,
      "confidence": "high" | "medium" | "low",
      "whyItKills": "string — the specific failure mechanism if this precondition is not met before deployment"
    }
  ],
  "noPreconditionsFound": boolean,
  "noPreconditionsReason": "string — only if noPreconditionsFound is true"
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

  console.log("Calling LLM (targeted precondition-pass)...");
  const start = Date.now();

  let rawResponse = "";
  let preconditions: unknown[] = [];
  let noPreconditionsFound = false;
  let error = "";

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: TARGETED_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });
    const rawContent = response.choices?.[0]?.message?.content;
    rawResponse = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? "");
    const cleaned = rawResponse.replace(/```json?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    preconditions = Array.isArray(parsed?.preconditions) ? parsed.preconditions : [];
    noPreconditionsFound = parsed?.noPreconditionsFound === true;
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

  if (noPreconditionsFound) {
    console.log("LLM returned: noPreconditionsFound = true");
    console.log("This is an honest PASS-HONEST at the targeted level.");
    return;
  }

  console.log(`Parsed preconditions: ${preconditions.length}`);
  console.log();

  for (let i = 0; i < preconditions.length; i++) {
    const p = preconditions[i] as Record<string, unknown>;
    console.log(`[${i + 1}] instrument: ${p.instrument}`);
    console.log(`    obligationHolder: ${p.obligationHolder} | mandatory: ${p.mandatory} | confidence: ${p.confidence}`);
    console.log(`    statement: ${p.statement}`);
    console.log(`    whyItKills: ${String(p.whyItKills).substring(0, 300)}`);
    console.log();
  }
}

async function main() {
  console.log("=".repeat(80));
  console.log("PHASE C — LAYER 1 TARGETED PRECONDITION-PASS TEST");
  console.log("Date:", new Date().toISOString());
  console.log("Configuration: LLM explicitly tasked with surfacing mandatory preconditions");
  console.log("Library status for H1/H2/H3: EMPTY (confirmed)");
  console.log("=".repeat(80));
  console.log();
  console.log("IMPORTANT: Score each case BEFORE reading the known killers.");
  console.log("Known killers: H1=DPIA+score-use-protocol, H2=EU AI Act deployer obligations,");
  console.log("H3=SAR exposure on succession rankings (GDPR Article 15).");
  console.log("Generic ('consider GDPR', 'data governance needed') does NOT count as a hit.");
  console.log();

  for (const { caseId, initiativeId } of HELD_OUT_CASES) {
    await runCase(caseId, initiativeId);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("=".repeat(80));
  console.log("TARGETED PRECONDITION-PASS TEST COMPLETE");
  console.log("=".repeat(80));
}

main().catch(console.error);
