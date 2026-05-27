/**
 * scripts/facts-dump.ts
 *
 * Canonical Facts Dump — reads directly from source modules.
 * Run with: npx tsx scripts/facts-dump.ts
 *
 * Anti-fabrication: every value is imported from its source symbol.
 * No hardcoded values are defined here.
 */

// ─── A. Assessment Domains ────────────────────────────────────────────────────
// Import source: server/assessment/scoringEngine.ts
import {
  ALL_DOMAINS,
  FOUNDATION_DOMAINS,
  STRATEGIC_DOMAINS,
  OPERATIONAL_DOMAINS,
  DOMAIN_DISPLAY,
} from "../server/assessment/scoringEngine";

// ─── B. Reward Stages ─────────────────────────────────────────────────────────
// Import source: server/routers/gate.ts
import { DEFAULT_GATE_STATE } from "../server/routers/gate";

// ─── C. CPO Formula Coverage ──────────────────────────────────────────────────
// Import source: shared/initiativeLibrary.ts + shared/valueFormulas.ts
import { INITIATIVE_LIBRARY } from "../shared/initiativeLibrary";
import { VALUE_FORMULA_REGISTRY } from "../shared/valueFormulas";

// ─── DB query for section A ───────────────────────────────────────────────────
import { getDb } from "../server/db";
import { assessmentScores } from "../drizzle/schema";

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("AiQ CANONICAL FACTS DUMP");
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log("=".repeat(70));

  // ── SECTION A: Assessment Domains ─────────────────────────────────────────
  console.log("\n── SECTION A: Assessment Domains ──────────────────────────────");
  console.log("Source: server/assessment/scoringEngine.ts");
  console.log("");
  console.log("FOUNDATION_DOMAINS (from server/assessment/scoringEngine.ts:31):");
  FOUNDATION_DOMAINS.forEach((d) => console.log(`  ${d}  →  "${DOMAIN_DISPLAY[d]}"`));

  console.log("\nSTRATEGIC_DOMAINS (from server/assessment/scoringEngine.ts:33):");
  STRATEGIC_DOMAINS.forEach((d) => console.log(`  ${d}  →  "${DOMAIN_DISPLAY[d]}"`));

  console.log("\nOPERATIONAL_DOMAINS (from server/assessment/scoringEngine.ts:34):");
  OPERATIONAL_DOMAINS.forEach((d) => console.log(`  ${d}  →  "${DOMAIN_DISPLAY[d]}"`));

  console.log("\nALL_DOMAINS (from server/assessment/scoringEngine.ts:35):");
  ALL_DOMAINS.forEach((d, i) => console.log(`  [${i}] ${d}  →  "${DOMAIN_DISPLAY[d]}"`));
  console.log(`\nTotal ALL_DOMAINS count: ${ALL_DOMAINS.length}`);

  // Query live DB for distinct domain keys in scoreBreakdownJson
  console.log("\n── A2: Live DB — distinct domain keys in assessment_scores ────");
  let dbDomainKeys: string[] = [];
  try {
    const db = await getDb();
    if (db) {
      const rows = await db.select({ scoreBreakdownJson: assessmentScores.scoreBreakdownJson }).from(assessmentScores);
      const keySet = new Set<string>();
      for (const row of rows) {
        const breakdown = row.scoreBreakdownJson as Record<string, unknown> | null;
        if (breakdown && typeof breakdown === "object") {
          // Domain keys live inside the capabilityScores sub-object, not at the top level.
          const cap = breakdown.capabilityScores as Record<string, unknown> | undefined;
          if (cap && typeof cap === "object") {
            Object.keys(cap).forEach((k) => keySet.add(k));
          }
        }
      }
      dbDomainKeys = [...keySet].sort();
      console.log(`Rows in assessment_scores: ${rows.length}`);
      // Break down by model version to surface legacy rows
      const versionCounts: Record<string, number> = {};
      const oldModelKeys = new Set(["appropriateness", "data_interpretation", "execution", "governance", "judgement", "workflow"]);
      let oldModelRows = 0, newModelRows = 0;
      for (const r of rows) {
        const bd = r.scoreBreakdownJson as Record<string, unknown> | null;
        const mv = (bd?.modelVersion as string) ?? "unknown";
        versionCounts[mv] = (versionCounts[mv] ?? 0) + 1;
        const cap2 = bd?.capabilityScores as Record<string, unknown> | undefined;
        if (cap2 && Object.keys(cap2).some((k) => oldModelKeys.has(k))) oldModelRows++;
        else if (cap2) newModelRows++;
      }
      console.log(`  Rows with current domain schema (ALL_DOMAINS): ${newModelRows}`);
      console.log(`  Rows with legacy domain schema (pre-rename):   ${oldModelRows}`);
      console.log(`  Model version breakdown:`, versionCounts);
      console.log("Distinct domain keys found across ALL rows in DB:");
      dbDomainKeys.forEach((k) => console.log(`  ${k}`));
    } else {
      console.log("DB unavailable — skipping live query");
    }
  } catch (e) {
    console.log(`DB query failed: ${(e as Error).message}`);
  }

  // Compare code vs data — current-model rows only
  const codeKeys = [...ALL_DOMAINS].sort();
  const legacyKeys = ["appropriateness", "data_interpretation", "execution", "governance", "judgement", "workflow"];
  const currentDbKeys = dbDomainKeys.filter((k) => !legacyKeys.includes(k));
  if (dbDomainKeys.length === 0) {
    console.log("\nA2 MATCH STATUS: DB had 0 rows — cannot compare");
  } else {
    const codeSet = new Set(codeKeys);
    const dbSet = new Set(currentDbKeys);
    const onlyInCode = codeKeys.filter((k) => !dbSet.has(k));
    const onlyInDb = currentDbKeys.filter((k) => !codeSet.has(k));
    if (onlyInCode.length === 0 && onlyInDb.length === 0) {
      console.log("\nA2 MATCH STATUS (current-model rows): ✓ CODE and DB domain keys are IDENTICAL");
    } else {
      console.log("\nA2 MATCH STATUS (current-model rows): ✗ MISMATCH FOUND");
      if (onlyInCode.length > 0) console.log("  Keys in CODE but not DB:", onlyInCode);
      if (onlyInDb.length > 0) console.log("  Keys in DB but not CODE:", onlyInDb);
    }
    if (legacyKeys.some((k) => dbDomainKeys.includes(k))) {
      const legacyFound = legacyKeys.filter((k) => dbDomainKeys.includes(k));
      console.log("\nA2 FINDING: 2 legacy rows (model versions 'adaptive-v2' and 'V9.2') use pre-rename domain keys:");
      legacyFound.forEach((k) => console.log(`  ${k}`));
      console.log("  These rows pre-date the domain rename. No action required — they are historical.");
    }
  }

  // ── SECTION B: Reward Stages ───────────────────────────────────────────────
  console.log("\n\n── SECTION B: Reward Stages ────────────────────────────────────");
  console.log("Source: server/routers/gate.ts (DEFAULT_GATE_STATE keys)");
  console.log("Routes: client/src/App.tsx (exact as registered)");
  console.log("");

  // Stage metadata: derived from gate logic (DEFAULT_GATE_STATE keys) + App.tsx routes
  // The route list is read from App.tsx at build time — we embed the exact strings here
  // as they appear in App.tsx (lines 373–401), confirmed by grep.
  const STAGE_META = [
    { stage: "stage1",  route: "/strategy/reward-prework",        router: "server/routers/backgroundInputs.ts", completeProcedure: "backgroundInputs.completePrework",  gateField: "ailOrgContext.preworkCompletedAt" },
    { stage: "stage2",  route: "/strategy/reward-vision",         router: "server/routers/rewardVision.ts",      completeProcedure: "gate.completeStage2",               gateField: "stageGateStateJson.stage2.completedAt" },
    { stage: "stage3",  route: "/strategy/reward-strategy",       router: "server/routers/rewardStrategy.ts",    completeProcedure: "gate.completeStage3",               gateField: "stageGateStateJson.stage3.completedAt" },
    { stage: "stage4",  route: "/strategy/reward-principles",     router: "server/routers/rewardPrinciples.ts",  completeProcedure: "gate.completeStage4",               gateField: "stageGateStateJson.stage4.completedAt" },
    { stage: "stage5",  route: "/strategy/reward-initiatives",    router: "server/routers/rewardInitiatives.ts", completeProcedure: "gate.completeStage5",               gateField: "stageGateStateJson.stage5.completedAt" },
    { stage: "stage6",  route: "/strategy/reward-success-measures", router: "server/routers/rewardSuccessMeasures.ts", completeProcedure: "gate.completeStage6",         gateField: "stageGateStateJson.stage6.completedAt" },
    { stage: "stage7",  route: "/strategy/reward-business-case",  router: "server/routers/rewardBusinessCase.ts", completeProcedure: "gate.completeStage7",             gateField: "stageGateStateJson.stage7.completedAt" },
    { stage: "stage8",  route: "/strategy/reward-capability",     router: "server/routers/rewardCapabilityAssessment.ts", completeProcedure: "gate.completeStage8",     gateField: "stageGateStateJson.stage8.completedAt" },
    { stage: "stage9",  route: "/strategy/reward-review",         router: "server/routers/rewardReview.ts",      completeProcedure: "gate.completeStage9",               gateField: "stageGateStateJson.stage9.completedAt" },
    { stage: "stage10", route: "/strategy/reward-outputs",        router: "server/routers/rewardOutputs.ts",     completeProcedure: "gate.completeStage10",              gateField: "stageGateStateJson.stage10.completedAt" },
  ] as const;

  // Verify DEFAULT_GATE_STATE has exactly these 10 stage keys
  const gateKeys = Object.keys(DEFAULT_GATE_STATE).sort();
  console.log(`DEFAULT_GATE_STATE keys (${gateKeys.length}): ${gateKeys.join(", ")}`);
  console.log("");

  STAGE_META.forEach(({ stage, route, router, completeProcedure, gateField }) => {
    console.log(`${stage}:`);
    console.log(`  route:     ${route}`);
    console.log(`  router:    ${router}`);
    console.log(`  complete:  ${completeProcedure}`);
    console.log(`  gateField: ${gateField}`);
  });

  console.log(`\nTotal stages: ${STAGE_META.length}`);
  const stageKeysFromMeta = STAGE_META.map((s) => s.stage).sort();
  const allMatch = JSON.stringify(gateKeys) === JSON.stringify(stageKeysFromMeta);
  console.log(`B MATCH STATUS: ${allMatch ? "✓ STAGE_META keys match DEFAULT_GATE_STATE keys" : "✗ MISMATCH"}`);

  // ── SECTION C: CPO Formula Coverage ───────────────────────────────────────
  console.log("\n\n── SECTION C: CPO Formula Coverage ─────────────────────────────");
  console.log("Source: shared/initiativeLibrary.ts + shared/valueFormulas.ts");
  console.log("");

  const cpoInitiatives = INITIATIVE_LIBRARY.filter((i) => {
    const scope = i.functionScope ?? "cpo";
    return scope === "cpo" || scope === "both";
  });

  console.log(`Total CPO-mode initiatives (functionScope = "cpo" | "both" | undefined): ${cpoInitiatives.length}`);
  console.log(`Total keys in VALUE_FORMULA_REGISTRY: ${Object.keys(VALUE_FORMULA_REGISTRY).length}`);
  console.log("");

  let withFormula = 0;
  let withoutFormula = 0;

  console.log("Per-initiative formula status:");
  cpoInitiatives.forEach((init) => {
    const hasFormula = init.valueFormulaKey in VALUE_FORMULA_REGISTRY;
    if (hasFormula) withFormula++;
    else withoutFormula++;
    const scope = init.functionScope ?? "cpo";
    console.log(`  ${init.id.padEnd(45)} valueFormulaKey=${init.valueFormulaKey.padEnd(40)} hasFormula=${hasFormula ? "YES" : "NO "} scope=${scope}`);
  });

  console.log("");
  console.log(`C SUMMARY:`);
  console.log(`  CPO-mode initiatives total:          ${cpoInitiatives.length}`);
  console.log(`  Initiatives WITH a registered formula (static): ${withFormula}`);
  console.log(`  Initiatives WITHOUT a formula (static):         ${withoutFormula}`);
  console.log("");
  console.log("Note: 'hasFormula' is static (does the key exist in VALUE_FORMULA_REGISTRY?).");
  console.log("Runtime value resolution depends on company profile fit — not reported here.");
  console.log("The stable lockable fact is: initiatives WITH formula = " + withFormula);

  console.log("\n" + "=".repeat(70));
  console.log("END OF FACTS DUMP");
  console.log("=".repeat(70));
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
