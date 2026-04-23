path = "/home/ubuntu/aiq-platform/server/routers/assessment.ts"
with open(path, 'r') as f:
    content = f.read()

# Add activeScoringCfg as a parameter to buildAdaptiveContext
old_sig = """function buildAdaptiveContext(
  answers: AnswerData[],
  answeredCount: number,
  roleHint: string | null,
  userProfile: {"""

new_sig = """function buildAdaptiveContext(
  answers: AnswerData[],
  answeredCount: number,
  roleHint: string | null,
  activeScoringCfg: import("../assessment/scoringConfig").ActiveScoringConfig,
  userProfile: {"""

if old_sig in content:
    content = content.replace(old_sig, new_sig, 1)
    print("buildAdaptiveContext signature: patched")
else:
    print("buildAdaptiveContext signature: NOT FOUND")

# Update call site 1 in getNextItem (line ~851)
old_call1 = """            const { generationVars } = buildAdaptiveContext(
              answers,
              answeredCount,
              roleHint,"""

new_call1 = """            const { generationVars } = buildAdaptiveContext(
              answers,
              answeredCount,
              roleHint,
              activeScoringCfg,"""

if old_call1 in content:
    content = content.replace(old_call1, new_call1, 1)
    print("buildAdaptiveContext call site 1: patched")
else:
    print("buildAdaptiveContext call site 1: NOT FOUND")

# Update call site 2 in completeSession (line ~1078)
old_call2 = """              const { generationVars, ctx: adaptiveCtx } = buildAdaptiveContext(
                answers,
                answeredCount,
                roleHint,"""

new_call2 = """              const { generationVars, ctx: adaptiveCtx } = buildAdaptiveContext(
                answers,
                answeredCount,
                roleHint,
                activeScoringCfg,"""

if old_call2 in content:
    content = content.replace(old_call2, new_call2, 1)
    print("buildAdaptiveContext call site 2: patched")
else:
    print("buildAdaptiveContext call site 2: NOT FOUND")

with open(path, 'w') as f:
    f.write(content)
