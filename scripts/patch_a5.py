import re

path = "/home/ubuntu/aiq-platform/server/routers/assessment.ts"
with open(path, 'r') as f:
    content = f.read()

# Step 1: Add policyEvaluations and policyRules to schema imports
old_import = 'import { llmItemReviewQueue, assessmentReviewFlags, assessmentAnswerTelemetry } from "../../drizzle/schema";'
new_import = 'import { llmItemReviewQueue, assessmentReviewFlags, assessmentAnswerTelemetry, policyEvaluations, policyRules } from "../../drizzle/schema";\nimport { randomUUID } from "crypto";'

if old_import in content:
    content = content.replace(old_import, new_import, 1)
    print("A5 import: patched")
else:
    print("A5 import: NOT FOUND")

# Step 2: Add the high-scrutiny policy evaluation write after the gaming analysis block
# Find the point just before the AIL pipeline call at session completion
# The marker is the AIL bridge comment
old_ail = "      // I2: Wire assessment completion into the AIL pipeline (non-fatal, fire-and-forget)\n      try {"
new_ail = """      // A5: Write policyEvaluations row when gaming scrutiny is high
      if (gamingAnalysis.scrutinyLevel === "high") {
        try {
          // Look up or use a sentinel policy rule key for automated gaming detection
          const gamingPolicyRows = await db
            .select({ id: policyRules.id })
            .from(policyRules)
            .where(eq(policyRules.key, "automated_gaming_detection"))
            .limit(1);
          const policyRuleId = gamingPolicyRows[0]?.id ?? "automated_gaming_detection";
          await db.insert(policyEvaluations).values({
            id: randomUUID(),
            userId: ctx.user.id,
            policyRuleId,
            contextType: "assessment_session",
            contextId: input.sessionId,
            result: "flagged",
            explanationJson: {
              scrutinyLevel: gamingAnalysis.scrutinyLevel,
              patterns: gamingAnalysis.patterns,
              detectedAt: new Date().toISOString(),
              source: "automated_gaming_detection",
            },
          });
        } catch { /* non-fatal — do not block session completion */ }
      }
      // I2: Wire assessment completion into the AIL pipeline (non-fatal, fire-and-forget)
      try {"""

if old_ail in content:
    content = content.replace(old_ail, new_ail, 1)
    print("A5 policy eval write: patched")
else:
    print("A5 policy eval write: NOT FOUND")

with open(path, 'w') as f:
    f.write(content)
