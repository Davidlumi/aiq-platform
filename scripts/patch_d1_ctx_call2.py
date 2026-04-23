path = "/home/ubuntu/aiq-platform/server/routers/assessment.ts"
with open(path, 'r') as f:
    content = f.read()

old_call2 = """              const { generationVars, ctx: adaptiveCtx } = buildAdaptiveContext(
              answers,
              newAnsweredCount,
              roleHint,
              userProfile,"""

new_call2 = """              const { generationVars, ctx: adaptiveCtx } = buildAdaptiveContext(
              answers,
              newAnsweredCount,
              roleHint,
              activeScoringCfg,
              userProfile,"""

if old_call2 in content:
    content = content.replace(old_call2, new_call2, 1)
    print("buildAdaptiveContext call site 2: patched")
else:
    print("buildAdaptiveContext call site 2: NOT FOUND")

# Also check line 402 — it's inside buildAdaptiveContext itself, which means
# totalTarget: activeScoringCfg.evidenceTargetItems is inside the function body
# and activeScoringCfg is now a parameter, so it should be in scope.
# But we need to verify the parameter name in the function body matches.
idx = content.find("function buildAdaptiveContext(")
print(f"Function starts at char {idx}")
print(repr(content[idx:idx+400]))

with open(path, 'w') as f:
    f.write(content)
