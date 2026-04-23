path = "/home/ubuntu/aiq-platform/server/routers/assessment.ts"
with open(path, 'r') as f:
    content = f.read()

# Fix: assessmentScores has no userId or createdAt — join via assessmentSessions
old_query = """        const priorSessions = await db
          .select({ scoreBreakdownJson: assessmentScores.scoreBreakdownJson })
          .from(assessmentScores)
          .where(eq(assessmentScores.userId, ctx.user.id))
          .orderBy(desc(assessmentScores.createdAt))
          .limit(1);"""

new_query = """        const priorSessions = await db
          .select({ scoreBreakdownJson: assessmentScores.scoreBreakdownJson })
          .from(assessmentScores)
          .innerJoin(assessmentSessions, eq(assessmentScores.sessionId, assessmentSessions.id))
          .where(
            and(
              eq(assessmentSessions.userId, ctx.user.id),
              eq(assessmentSessions.status, "completed")
            )
          )
          .orderBy(desc(assessmentSessions.updatedAt))
          .limit(2);
        // Skip index 0 which is the session we just completed (not yet written); use index 1 if available
        // Actually we query before writing, so index 0 is the most recent prior session"""

if old_query in content:
    content = content.replace(old_query, new_query, 1)
    print("C1 query fix: patched")
else:
    print("C1 query fix: NOT FOUND")

with open(path, 'w') as f:
    f.write(content)
