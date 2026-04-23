path = "/home/ubuntu/aiq-platform/server/routers/assessment.ts"
with open(path, 'r') as f:
    content = f.read()

# In submitAnswer: load activeScoringCfg right after the session guard (double newline)
old_submit = '      if (!session[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Active session not found" });\n\n      // Resolve outcome from selected option'
new_submit = '      if (!session[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Active session not found" });\n      // D1: Load active scoring config for configurable evidence thresholds\n      const activeScoringCfg = await getActiveScoringConfig();\n\n      // Resolve outcome from selected option'

if old_submit in content:
    content = content.replace(old_submit, new_submit, 1)
    print("D1 submitAnswer cfg load: patched")
else:
    print("D1 submitAnswer cfg load: NOT FOUND")
    # Show what's there
    idx = content.find('message: "Active session not found" })')
    print(repr(content[idx:idx+120]))

with open(path, 'w') as f:
    f.write(content)
