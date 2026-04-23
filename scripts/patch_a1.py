path = "/home/ubuntu/aiq-platform/server/assessment/adaptiveEngine.ts"
with open(path, 'r') as f:
    content = f.read()

# Step 1: Add featureFlags import
old_import = 'import type { ContradictionProbeSpec } from "./contradictionEngine";'
new_import = 'import type { ContradictionProbeSpec } from "./contradictionEngine";\nimport { isValidationPhaseRandomised } from "./featureFlags";'

if old_import in content:
    content = content.replace(old_import, new_import, 1)
    print("A1 import: patched")
else:
    print("A1 import: NOT FOUND")

# Step 2: Apply randomisation in the validation phase block
old_validation = """  // Priority 5: Validation — confirm/challenge strongest capability
  // C1: Vary validation interaction type instead of always using contradiction_probe.
  // Rotate through high-difficulty types to avoid predictable validation pattern.
  if (phase === "validation") {
    const strongest = findStrongestCapability(ctx.capabilityScores, ctx.roleArchetype);
    const validationTypes: InteractionType[] = ["contradiction_probe", "risk_judgement", "governance_decision", "scenario_critique"];
    const leastUsedValidationType = findLeastUsedType(validationTypes, ctx.interactionTypesUsed);
    return buildVariables(strongest, leastUsedValidationType, ctx, phase, {
      difficulty: 3,
      riskLevel: "High",
      contradictionIntent: leastUsedValidationType === "contradiction_probe",
    });
  }"""

new_validation = """  // Priority 5: Validation — confirm/challenge strongest capability
  // C1: Vary validation interaction type instead of always using contradiction_probe.
  // Rotate through high-difficulty types to avoid predictable validation pattern.
  // A1/WS4.6: When isValidationPhaseRandomised() is true, shuffle the validation type pool
  // so the order of challenge types is not predictable across sessions.
  if (phase === "validation") {
    const strongest = findStrongestCapability(ctx.capabilityScores, ctx.roleArchetype);
    let validationTypes: InteractionType[] = ["contradiction_probe", "risk_judgement", "governance_decision", "scenario_critique"];
    if (isValidationPhaseRandomised()) {
      // Fisher-Yates shuffle — deterministic within a session (uses answeredCount as seed offset)
      const pool = [...validationTypes];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = (ctx.answeredCount + i) % (i + 1);
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      validationTypes = pool;
    }
    const leastUsedValidationType = findLeastUsedType(validationTypes, ctx.interactionTypesUsed);
    return buildVariables(strongest, leastUsedValidationType, ctx, phase, {
      difficulty: 3,
      riskLevel: "High",
      contradictionIntent: leastUsedValidationType === "contradiction_probe",
    });
  }"""

if old_validation in content:
    content = content.replace(old_validation, new_validation, 1)
    print("A1 validation block: patched")
else:
    print("A1 validation block: NOT FOUND")

with open(path, 'w') as f:
    f.write(content)
