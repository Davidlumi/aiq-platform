path = "/home/ubuntu/aiq-platform/server/assessment/sessionController.ts"
with open(path, 'r') as f:
    content = f.read()

# Replace the MINIMUM_EVIDENCE constant export with a deprecation notice
# and add a helper that reads from the active config
old_const = """export const MINIMUM_EVIDENCE = {
  totalItems: 20,
  signalsPerCapability: 3,
  distinctInteractionTypes: 5,
  highRiskProportion: 0.25,
  targetItems: 49,  // Matches static blueprint bank exactly — no LLM generation needed for standard sessions
};"""

new_const = """/** @deprecated D1: MINIMUM_EVIDENCE is now configurable via scoring_config.
 * Use getActiveScoringConfig() and read the evidence_* fields directly in the router.
 * This constant is kept for backward compatibility with any code that has not yet been migrated.
 * The values here are the original defaults and will not reflect DB overrides.
 */
export const MINIMUM_EVIDENCE = {
  totalItems: 20,
  signalsPerCapability: 3,
  distinctInteractionTypes: 5,
  highRiskProportion: 0.25,
  targetItems: 49,
};"""

if old_const in content:
    content = content.replace(old_const, new_const, 1)
    print("D1 MINIMUM_EVIDENCE deprecation: patched")
else:
    print("D1 MINIMUM_EVIDENCE deprecation: NOT FOUND")

with open(path, 'w') as f:
    f.write(content)
