path = "/home/ubuntu/aiq-platform/server/routers/assessment.ts"
with open(path, 'r') as f:
    content = f.read()

# Fix: gamingAnalysis is not in scope at line 1574 — it's results.gamingAnalysis
old = """      // A5: Write policyEvaluations row when gaming scrutiny is high
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
      }"""

new = """      // A5: Write policyEvaluations row when gaming scrutiny is high
      if (results.gamingAnalysis.scrutinyLevel === "high") {
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
              scrutinyLevel: results.gamingAnalysis.scrutinyLevel,
              patterns: results.gamingAnalysis.patterns,
              detectedAt: new Date().toISOString(),
              source: "automated_gaming_detection",
            },
          });
        } catch { /* non-fatal — do not block session completion */ }
      }"""

if old in content:
    content = content.replace(old, new, 1)
    print("A5 fix: patched")
else:
    print("A5 fix: NOT FOUND")

with open(path, 'w') as f:
    f.write(content)
