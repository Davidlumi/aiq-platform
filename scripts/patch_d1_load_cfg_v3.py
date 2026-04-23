path = "/home/ubuntu/aiq-platform/server/routers/assessment.ts"
with open(path, 'r') as f:
    content = f.read()

# In getNextItem: load activeScoringCfg right after priorCapabilityScores
# Debug output showed double newline between priorCapabilityScores and the comment
old_role_hint = "      const priorCapabilityScores = (meta.priorCapabilityScores as Record<string, number>) ?? null;\n\n      // Fetch user profile for personalisation"
new_role_hint = "      const priorCapabilityScores = (meta.priorCapabilityScores as Record<string, number>) ?? null;\n      // D1: Load active scoring config for configurable evidence thresholds\n      const activeScoringCfg = await getActiveScoringConfig();\n\n      // Fetch user profile for personalisation"

if old_role_hint in content:
    content = content.replace(old_role_hint, new_role_hint, 1)
    print("D1 getNextItem cfg load: patched")
else:
    print("D1 getNextItem cfg load: NOT FOUND")

# Also need to handle buildAdaptiveContext at line 402 — it's in a helper function, not a procedure
# The helper function needs activeScoringCfg passed as a parameter
# Let's check line 402 context
lines = content.split('\n')
print(f"Line 402: {lines[401]!r}")
print(f"Line 401: {lines[400]!r}")
print(f"Line 403: {lines[402]!r}")

with open(path, 'w') as f:
    f.write(content)
