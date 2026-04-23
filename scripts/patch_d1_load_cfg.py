path = "/home/ubuntu/aiq-platform/server/routers/assessment.ts"
with open(path, 'r') as f:
    content = f.read()

# In getNextItem: load activeScoringCfg right after parsing session metadata
old_role_hint = """      const roleHint = (meta.roleHint as string) ?? null;
      const priorCapabilityScores = (meta.priorCapabilityScores as Record<string, number>) ?? null;
      // Fetch user profile for personalisation"""

new_role_hint = """      const roleHint = (meta.roleHint as string) ?? null;
      const priorCapabilityScores = (meta.priorCapabilityScores as Record<string, number>) ?? null;
      // D1: Load active scoring config for configurable evidence thresholds
      const activeScoringCfg = await getActiveScoringConfig();
      // Fetch user profile for personalisation"""

if old_role_hint in content:
    content = content.replace(old_role_hint, new_role_hint, 1)
    print("D1 getNextItem cfg load: patched")
else:
    print("D1 getNextItem cfg load: NOT FOUND")

# In startSession: load activeScoringCfg for totalTarget
old_start = """      const cfg = await getActiveScoringConfig();"""
new_start = """      const cfg = await getActiveScoringConfig();
      const activeScoringCfg = cfg; // D1: alias for consistency with getNextItem"""

if old_start in content:
    content = content.replace(old_start, new_start, 1)
    print("D1 startSession alias: patched")
else:
    print("D1 startSession alias: NOT FOUND")

with open(path, 'w') as f:
    f.write(content)
