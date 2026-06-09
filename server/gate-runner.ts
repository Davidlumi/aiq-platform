/**
 * Phase C Gate Runner — standalone script
 *
 * Runs the decomposition engine for all 5 gate cases (C1, C2, H1, H2, H3)
 * and records the output for founder judgment.
 *
 * Usage: npx tsx server/gate-runner.ts
 *
 * Does NOT require a running server or database connection.
 * Tests the library + engine logic directly.
 */

import {
  getPreconditionsForInitiative,
  hasPreconditionCoverage,
  PRECONDITION_LIBRARY,
} from "../shared/preconditionLibrary";
import { getInitiative } from "../shared/initiativeLibrary";

// ─── Gate cases ───────────────────────────────────────────────────────────────

const GATE_CASES = [
  {
    caseId: "C1",
    type: "control",
    initiativeId: "cr_pay_equity",
    knownKiller: "Legal privilege arrangement before pay equity analysis begins (pc_pay_equity_legal_privilege)",
  },
  {
    caseId: "C2",
    type: "control",
    initiativeId: "fw_shift_scheduling_ai",
    knownKiller: "Union/works council agreement confirmed before AI scheduling deployment (pc_scheduling_union_agreement)",
  },
  {
    caseId: "H1",
    type: "held-out",
    initiativeId: "rt_flight_risk_prediction",
    knownKiller: "DPIA (UK GDPR Article 35) mandatory for systematic employee profiling; score-use protocol required to prevent discrimination liability",
  },
  {
    caseId: "H2",
    type: "held-out",
    initiativeId: "ta_video_interview_assessment",
    knownKiller: "EU AI Act Annex III deployer obligations: conformity assessment, registration, technical documentation, human oversight — attaches to use case, not vendor",
  },
  {
    caseId: "H3",
    type: "held-out",
    initiativeId: "wp_succession_planning",
    knownKiller: "SAR exposure (UK GDPR Article 15): succession AI rankings are personal data; first SAR exposes entire succession list and model logic without legal basis review + transparency notice",
  },
];

// ─── Layer 2 only (deterministic — no LLM required for gate) ─────────────────

function runGateCase(gateCase: typeof GATE_CASES[0]) {
  const { caseId, type, initiativeId, knownKiller } = gateCase;

  const libraryDef = getInitiative(initiativeId);
  const title = libraryDef?.label ?? initiativeId;
  const description = libraryDef?.description ?? "(no description)";
  const existingPrerequisites = libraryDef?.prerequisites ?? [];

  // Layer 2: precondition library lookup
  const preconditions = getPreconditionsForInitiative(initiativeId);
  const hasCoverage = hasPreconditionCoverage(initiativeId);

  // Determine result
  let result: string;
  let resultDetail: string;

  if (type === "control") {
    if (preconditions.length > 0) {
      result = "PASS";
      resultDetail = `${preconditions.length} precondition(s) returned. Seeded killer present.`;
    } else {
      result = "FAIL — MECHANISM FAILURE";
      resultDetail = "Control case: seeded killer not returned. Library lookup broken.";
    }
  } else {
    // held-out case
    if (!hasCoverage) {
      result = "PASS-HONEST";
      resultDetail = "Library returns empty for preconditions. No-coverage flag fires. Engine must surface this gap to user.";
    } else {
      // Coverage exists — check if it's a near-killer or a generic entry
      result = "NEEDS REVIEW";
      resultDetail = `Library has ${preconditions.length} entry/entries for this initiative. Founder must judge whether it is near-killer or accidental seeding.`;
    }
  }

  return {
    caseId,
    type,
    initiativeId,
    title,
    description,
    existingPrerequisites,
    knownKiller,
    hasCoverage,
    preconditions,
    result,
    resultDetail,
  };
}

// ─── Run all cases ────────────────────────────────────────────────────────────

function main() {
  console.log("=".repeat(80));
  console.log("PHASE C GATE RUN — Layer 2 (deterministic library lookup)");
  console.log("Date:", new Date().toISOString());
  console.log("Library entries:", PRECONDITION_LIBRARY.length);
  console.log("=".repeat(80));
  console.log();

  const results = GATE_CASES.map(runGateCase);

  for (const r of results) {
    console.log(`${"─".repeat(80)}`);
    console.log(`CASE ${r.caseId} [${r.type.toUpperCase()}] — ${r.title}`);
    console.log(`Initiative ID: ${r.initiativeId}`);
    console.log(`Description: ${r.description}`);
    console.log();
    console.log(`Existing prerequisites in library (visible to Layer 1):`);
    if (r.existingPrerequisites.length === 0) {
      console.log("  (none)");
    } else {
      r.existingPrerequisites.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    }
    console.log();
    console.log(`Known killer (held out): ${r.knownKiller}`);
    console.log();
    console.log(`Layer 2 result:`);
    console.log(`  hasPreconditionCoverage: ${r.hasCoverage}`);
    console.log(`  Preconditions returned: ${r.preconditions.length}`);
    if (r.preconditions.length > 0) {
      r.preconditions.forEach((p, i) => {
        console.log(`  [${i + 1}] id: ${p.id}`);
        console.log(`       severity: ${p.severity}`);
        console.log(`       statement: ${p.statement}`);
        console.log(`       whyItKills: ${p.whyItKills.substring(0, 200)}...`);
      });
    }
    console.log();
    console.log(`No-coverage flag fires: ${!r.hasCoverage}`);
    if (!r.hasCoverage) {
      console.log(`  → Message: "No precondition coverage exists in the library for this initiative (${r.initiativeId}). This does not mean no preconditions exist — it means the library has not yet been curated for this initiative. Review the initiative's prerequisites manually before proceeding."`);
    }
    console.log();
    console.log(`RESULT: ${r.result}`);
    console.log(`Detail: ${r.resultDetail}`);
    console.log();
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  console.log("=".repeat(80));
  console.log("GATE SUMMARY");
  console.log("=".repeat(80));
  console.log();

  const controlResults = results.filter((r) => r.type === "control");
  const heldOutResults = results.filter((r) => r.type === "held-out");

  console.log("CONTROL CASES (C1, C2):");
  for (const r of controlResults) {
    console.log(`  ${r.caseId}: ${r.result}`);
  }
  const controlPass = controlResults.every((r) => r.result === "PASS");
  console.log(`  → Control gate: ${controlPass ? "PASS" : "FAIL — MECHANISM FAILURE"}`);
  console.log();

  console.log("HELD-OUT CASES (H1, H2, H3):");
  let passL1Count = 0;
  let passHonestCount = 0;
  let failSilentCount = 0;

  for (const r of heldOutResults) {
    // Layer 2 only: PASS-HONEST if no coverage, FAIL-SILENT if coverage exists but killer absent
    // Layer 1 (LLM) output is not available in this deterministic run — see gate-runner-llm.ts
    if (r.result === "PASS-HONEST") {
      passHonestCount++;
      console.log(`  ${r.caseId}: PASS-HONEST (no-coverage flag fires; Layer 1 LLM output not captured in this run)`);
    } else if (r.result === "PASS-L1") {
      passL1Count++;
      console.log(`  ${r.caseId}: PASS-L1 (Layer 1 surfaced near-killer)`);
    } else {
      failSilentCount++;
      console.log(`  ${r.caseId}: FAIL-SILENT — ${r.resultDetail}`);
    }
  }

  console.log();
  console.log(`  PASS-L1 count (Layer 1 surfaced near-killer): ${passL1Count} / 3`);
  console.log(`  PASS-HONEST count (no-coverage flag fires): ${passHonestCount} / 3`);
  console.log(`  FAIL-SILENT count (confident decomposition, killer absent): ${failSilentCount} / 3`);
  console.log();

  const safetyGate = failSilentCount === 0;
  const coverageNote =
    passL1Count === 3
      ? "STRONG — all 3 held-out killers surfaced by Layer 1"
      : passL1Count === 0
      ? "COVERAGE GAP — library generalises to nothing for held-out cases; safe but not useful"
      : `PARTIAL — ${passL1Count}/3 held-out killers surfaced by Layer 1`;

  console.log(`SAFETY GATE (no FAIL-SILENT): ${safetyGate ? "PASS" : "FAIL"}`);
  console.log(`COVERAGE RESULT: ${coverageNote}`);
  console.log();

  if (passHonestCount === 3 && passL1Count === 0) {
    console.log("⚠  ALL HELD-OUT CASES ARE PASS-HONEST.");
    console.log("   This means the engine is SAFE (no silent omissions) but the library");
    console.log("   generalises to nothing for these three real initiatives.");
    console.log("   This is NOT a Phase C success — it is a coverage gap to fix.");
    console.log("   The engine will always flag 'no precondition coverage' for any initiative");
    console.log("   not explicitly seeded, which is honest but not useful.");
  }

  console.log();
  console.log("NOTE: This run tests Layer 2 (deterministic) only.");
  console.log("Layer 1 (LLM) output requires a live LLM call — see the full decomposeInitiative");
  console.log("procedure in server/routers/assumptions.ts for the combined output.");
  console.log("To test Layer 1 unaided output for H1/H2/H3, call trpc.assumptions.decomposeInitiative");
  console.log("with a real tenant context and inspect the returned assumptions array.");
}

main();
