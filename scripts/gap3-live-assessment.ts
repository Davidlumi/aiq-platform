/**
 * Gap 3 (part 2): Run a real, live-LLM assessment item for a reward leader
 * Calls generateAdaptiveItem which invokes the LLM via invokeLLM()
 * This proves the engine generates items with canonical capability keys
 */
import { generateAdaptiveItem, selectNextGenerationVariables, DEFAULT_ORG_INTENT } from "../server/assessment/adaptiveEngine";
import { resolveRoleArchetype } from "../server/assessment/roleArchetypes";
import { ALL_DOMAINS, DOMAIN_DISPLAY } from "../server/assessment/scoringEngine";

async function main() {
  console.log("\n" + "═".repeat(65));
  console.log("GAP 3 (LIVE LLM): REAL ASSESSMENT ITEM GENERATION");
  console.log("═".repeat(65));

  const archetype = resolveRoleArchetype("reward");
  console.log(`\nRole archetype: ${archetype.displayName} (seniority: ${archetype.seniority})`);

  // Build selection context for a reward leader starting their assessment
  const emptyCapScores = Object.fromEntries(
    ALL_DOMAINS.map(k => [k, { score: 50, signalCount: 0 }])
  ) as any;

  const ctx = {
    answeredCount: 0,
    totalTarget: 20,
    capabilityScores: emptyCapScores,
    interactionTypesUsed: {} as any,
    riskExposure: { Low: 0, Medium: 0, High: 0 },
    gamingAnalysis: { isGaming: false, injectionRequired: false, recommendedInjections: [], confidence: 0, patterns: [] },
    contradictionProbes: [],
    roleArchetype: archetype,
    orgIntent: DEFAULT_ORG_INTENT,
    personaStartingDifficulty: 2 as const,
    userSector: "financial_services",
    userSeniority: "senior",
  };

  // Step 1: Select generation variables (no LLM call)
  const vars = selectNextGenerationVariables(ctx);
  console.log("\n[Step 1] selectNextGenerationVariables output:");
  console.log("─".repeat(65));
  console.log(`  targetCapability:  ${vars.targetCapability}`);
  console.log(`  display label:     ${DOMAIN_DISPLAY[vars.targetCapability]}`);
  console.log(`  interactionType:   ${vars.interactionType}`);
  console.log(`  difficulty:        ${vars.difficulty}`);
  console.log(`  riskLevel:         ${vars.riskLevel}`);
  console.log(`  phase:             ${vars.phase}`);
  console.log(`  workflowContext:   ${vars.workflowContext}`);
  console.log(`  Is canonical key:  ${ALL_DOMAINS.includes(vars.targetCapability as any) ? "✓ YES" : "✗ NO"}`);

  // Step 2: Generate the actual item via live LLM
  console.log("\n[Step 2] generateAdaptiveItem — calling live LLM...");
  console.log("─".repeat(65));
  const startTime = Date.now();
  const item = await generateAdaptiveItem(vars);
  const elapsed = Date.now() - startTime;

  console.log(`  ✓ Item generated in ${elapsed}ms`);
  console.log(`\n  capabilityKey:     ${item.capabilityKey}`);
  console.log(`  display label:     ${DOMAIN_DISPLAY[item.capabilityKey]}`);
  console.log(`  interactionType:   ${item.interactionType}`);
  console.log(`  difficulty:        ${item.difficulty}`);
  console.log(`  riskLevel:         ${item.riskLevel}`);
  console.log(`  Is canonical key:  ${ALL_DOMAINS.includes(item.capabilityKey as any) ? "✓ YES" : "✗ NO"}`);

  console.log("\n[Step 3] Generated scenario (truncated to 200 chars):");
  console.log("─".repeat(65));
  const scenarioText = typeof item.scenario === "string" ? item.scenario : JSON.stringify(item.scenario);
  console.log("  " + scenarioText.slice(0, 200) + (scenarioText.length > 200 ? "..." : ""));

  console.log("\n[Step 4] Options:");
  console.log("─".repeat(65));
  if (Array.isArray(item.options)) {
    for (const opt of item.options.slice(0, 2)) {
      console.log(`  [${opt.label}] ${opt.outcomeClass}: ${opt.text.slice(0, 100)}...`);
    }
    console.log(`  (${item.options.length} options total)`);
  }

  console.log("\n[Step 5] Canonical key assertion:");
  console.log("─".repeat(65));
  if (!ALL_DOMAINS.includes(item.capabilityKey as any)) {
    throw new Error(`FAIL: item.capabilityKey "${item.capabilityKey}" is not in ALL_DOMAINS`);
  }
  console.log(`  ✓ item.capabilityKey "${item.capabilityKey}" is in ALL_DOMAINS`);
  console.log(`  ✓ Display label: "${DOMAIN_DISPLAY[item.capabilityKey]}"`);

  console.log("\n" + "═".repeat(65));
  console.log("GAP 3 LIVE LLM ASSESSMENT COMPLETE");
  console.log("═".repeat(65));
}

main().catch(e => { console.error(e); process.exit(1); });
