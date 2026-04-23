path = "/home/ubuntu/aiq-platform/server/routers/assessment.ts"
with open(path, 'r') as f:
    content = f.read()

old_block = """- Governance flag: ${results.failureModes.governanceFlag ? "Yes — governance concerns detected" : "No"}
- Over-reliance risk: ${results.failureModes.modes.includes("over_reliance") ? "Yes" : "No"}
Paragraph 1 (Strengths): What this person does well in their AI capability profile. Reference specific capabilities.
Paragraph 2 (Gaps): Where the most significant development opportunities lie. Be honest but constructive.
Paragraph 3 (Priorities): The 2-3 most important actions they should take to improve their AI readiness in their role.
Return ONLY a JSON object with keys: "strengths", "gaps", "priorities" — each containing one paragraph of plain prose text.\`,"""

new_block = """- Governance flag: ${results.failureModes.governanceFlag ? "Yes — governance concerns detected" : "No"}
- Over-reliance risk: ${results.failureModes.modes.includes("over_reliance") ? "Yes" : "No"}
- C2: All failure modes detected: ${results.failureModes.modes.length > 0 ? results.failureModes.modes.join(", ") : "None"}
- C2: Gaming scrutiny level: ${results.gamingAnalysis.scrutinyLevel}
${priorCapabilityScoresForNarrative ? `- C1: Prior session capability scores: ${Object.entries(priorCapabilityScoresForNarrative).map(([k, v]) => `${k}: ${Math.round(v as number)}/100`).join(", ")}
- C1: Score changes since last assessment: ${Object.entries(results.capabilityScores).map(([k, v]) => { const prior = (priorCapabilityScoresForNarrative as Record<string, number>)[k]; return prior !== undefined ? \`\${k}: \${Math.round(v.score - prior) >= 0 ? "+" : ""}\${Math.round(v.score - prior)}\` : null; }).filter(Boolean).join(", ")}` : "- C1: First assessment (no prior scores available for delta context)"}
Paragraph 1 (Strengths): What this person does well in their AI capability profile. Reference specific capabilities and any improvements since their last assessment if prior scores are available.
Paragraph 2 (Gaps): Where the most significant development opportunities lie. Reference any detected failure modes (e.g., over_reliance, blind_ai_acceptance, governance_bypass) if present. Be honest but constructive.
Paragraph 3 (Priorities): The 2-3 most important actions they should take to improve their AI readiness in their role.
Return ONLY a JSON object with keys: "strengths", "gaps", "priorities" — each containing one paragraph of plain prose text.\`,"""

if old_block in content:
    content = content.replace(old_block, new_block, 1)
    print("C1+C2 narrative prompt: patched")
else:
    print("C1+C2 narrative prompt: NOT FOUND")
    # Debug: show the actual text around the governance flag line
    idx = content.find("- Governance flag:")
    if idx >= 0:
        print("Found at index", idx)
        print(repr(content[idx:idx+400]))

with open(path, 'w') as f:
    f.write(content)
