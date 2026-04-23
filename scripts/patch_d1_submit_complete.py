path = "/home/ubuntu/aiq-platform/server/routers/assessment.ts"
with open(path, 'r') as f:
    content = f.read()

# In submitAnswer: load activeScoringCfg right after the session guard
old_submit = "      if (!session[0]) throw new TRPCError({ code: \"NOT_FOUND\", message: \"Active session not found\" });\n      // Resolve outcome from selected option"
new_submit = "      if (!session[0]) throw new TRPCError({ code: \"NOT_FOUND\", message: \"Active session not found\" });\n      // D1: Load active scoring config for configurable evidence thresholds\n      const activeScoringCfg = await getActiveScoringConfig();\n      // Resolve outcome from selected option"

if old_submit in content:
    content = content.replace(old_submit, new_submit, 1)
    print("D1 submitAnswer cfg load: patched")
else:
    print("D1 submitAnswer cfg load: NOT FOUND")

# In completeSession: check if activeScoringCfg is already loaded
# It should be at line 1230 from the original D1 router patch
idx = content.find("const activeScoringCfg = await getActiveScoringConfig();")
count = content.count("const activeScoringCfg = await getActiveScoringConfig();")
print(f"activeScoringCfg load count: {count}")

# Check line 1087 error — it's the second call site of buildAdaptiveContext
# which now has activeScoringCfg as 4th param but the call passes userProfile as 4th
# Let's check what's at line 1087
lines = content.split('\n')
print(f"Line 1087: {lines[1086]!r}")
print(f"Line 1088: {lines[1087]!r}")
print(f"Line 1089: {lines[1088]!r}")

with open(path, 'w') as f:
    f.write(content)
