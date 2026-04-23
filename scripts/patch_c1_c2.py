path = "/home/ubuntu/aiq-platform/server/routers/assessment.ts"
with open(path, 'r') as f:
    content = f.read()

# C1: Load prior capability scores in completeSession and compute deltas for narrative
# Insert prior score loading just before the narrative generation block
old_narrative_start = "      // R9: Generate LLM-powered personalised development narrative\n      let llmNarrative: { strengths: string; gaps: string; priorities: string } | null = null;"
new_narrative_start = """      // C1: Load prior capability scores for longitudinal delta context in narrative
      let priorCapabilityScoresForNarrative: Record<string, number> | null = null;
      try {
        const priorSessions = await db
          .select({ scoreBreakdownJson: assessmentScores.scoreBreakdownJson })
          .from(assessmentScores)
          .where(eq(assessmentScores.userId, ctx.user.id))
          .orderBy(desc(assessmentScores.createdAt))
          .limit(1);
        if (priorSessions[0]?.scoreBreakdownJson) {
          const priorBreakdown = typeof priorSessions[0].scoreBreakdownJson === "string"
            ? JSON.parse(priorSessions[0].scoreBreakdownJson as string)
            : priorSessions[0].scoreBreakdownJson as Record<string, unknown>;
          if (priorBreakdown?.capabilityScores && typeof priorBreakdown.capabilityScores === "object") {
            priorCapabilityScoresForNarrative = Object.fromEntries(
              Object.entries(priorBreakdown.capabilityScores as Record<string, { score: number }>)
                .map(([k, v]) => [k, v.score])
            );
          }
        }
      } catch { /* non-fatal */ }
      // R9: Generate LLM-powered personalised development narrative
      let llmNarrative: { strengths: string; gaps: string; priorities: string } | null = null;"""

if old_narrative_start in content:
    content = content.replace(old_narrative_start, new_narrative_start, 1)
    print("C1 prior score load: patched")
else:
    print("C1 prior score load: NOT FOUND")

# C1: Add score delta context to the narrative prompt
old_narrative_user = """              content: `Write a 3-paragraph development narrative for a ${roleArchetypeName} who just completed an AI capability assessment.
Assessment results:
- Overall score: ${Math.round(results.overallScore)}/100
- Readiness state: ${readinessLabel}
- Capability scores: ${capSummary}
- Key strengths: ${topStrengths}
- Key gaps: ${topGaps}
- Governance flag: ${results.failureModes.governanceFlag ? "Yes — governance concerns detected" : "No"}
- Over-reliance risk: ${results.failureModes.modes.includes("over_reliance") ? "Yes" : "No"}
Paragraph 1 (Strengths): What this person does well in their AI capability profile. Reference specific capabilities.
Paragraph 2 (Gaps): Where the most significant development opportunities lie. Be honest but constructive.
Paragraph 3 (Priorities): The 2-3 most important actions they should take to improve their AI readiness in their role.
Return ONLY a JSON object with keys: "strengths", "gaps", "priorities" — each containing one paragraph of plain prose text.\`,"""

new_narrative_user = """              content: `Write a 3-paragraph development narrative for a ${roleArchetypeName} who just completed an AI capability assessment.
Assessment results:
- Overall score: ${Math.round(results.overallScore)}/100
- Readiness state: ${readinessLabel}
- Capability scores: ${capSummary}
- Key strengths: ${topStrengths}
- Key gaps: ${topGaps}
- Governance flag: ${results.failureModes.governanceFlag ? "Yes — governance concerns detected" : "No"}
- Over-reliance risk: ${results.failureModes.modes.includes("over_reliance") ? "Yes" : "No"}
- Failure modes detected: ${results.failureModes.modes.length > 0 ? results.failureModes.modes.join(", ") : "None"}
- Gaming scrutiny level: ${results.gamingAnalysis.scrutinyLevel}
${priorCapabilityScoresForNarrative ? `- Prior session capability scores: ${Object.entries(priorCapabilityScoresForNarrative).map(([k, v]) => `${k}: ${Math.round(v as number)}/100`).join(", ")}
- Score changes since last assessment: ${Object.entries(results.capabilityScores).map(([k, v]) => { const prior = (priorCapabilityScoresForNarrative as Record<string, number>)[k]; return prior !== undefined ? \`\${k}: \${Math.round(v.score - prior) >= 0 ? "+" : ""}\${Math.round(v.score - prior)}\` : null; }).filter(Boolean).join(", ")}` : "- First assessment (no prior scores available)"}
Paragraph 1 (Strengths): What this person does well in their AI capability profile. Reference specific capabilities and any improvements since their last assessment if prior scores are available.
Paragraph 2 (Gaps): Where the most significant development opportunities lie. Reference any detected failure modes (over-reliance, blind AI acceptance, etc.) if present. Be honest but constructive.
Paragraph 3 (Priorities): The 2-3 most important actions they should take to improve their AI readiness in their role.
Return ONLY a JSON object with keys: "strengths", "gaps", "priorities" — each containing one paragraph of plain prose text.\`,"""

if old_narrative_user in content:
    content = content.replace(old_narrative_user, new_narrative_user, 1)
    print("C1+C2 narrative prompt: patched")
else:
    print("C1+C2 narrative prompt: NOT FOUND")

with open(path, 'w') as f:
    f.write(content)
