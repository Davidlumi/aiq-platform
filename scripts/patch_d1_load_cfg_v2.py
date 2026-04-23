path = "/home/ubuntu/aiq-platform/server/routers/assessment.ts"
with open(path, 'r') as f:
    content = f.read()

# In getNextItem: load activeScoringCfg right after priorCapabilityScores
old_role_hint = "      const priorCapabilityScores = (meta.priorCapabilityScores as Record<string, number>) ?? null;\n      // Fetch user profile for personalisation"
new_role_hint = "      const priorCapabilityScores = (meta.priorCapabilityScores as Record<string, number>) ?? null;\n      // D1: Load active scoring config for configurable evidence thresholds\n      const activeScoringCfg = await getActiveScoringConfig();\n      // Fetch user profile for personalisation"

if old_role_hint in content:
    content = content.replace(old_role_hint, new_role_hint, 1)
    print("D1 getNextItem cfg load: patched")
else:
    print("D1 getNextItem cfg load: NOT FOUND")
    # Debug: show what's around priorCapabilityScores
    idx = content.find("priorCapabilityScores = (meta.priorCapabilityScores")
    if idx >= 0:
        print(repr(content[idx:idx+200]))

with open(path, 'w') as f:
    f.write(content)
