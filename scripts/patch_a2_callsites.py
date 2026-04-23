path = "/home/ubuntu/aiq-platform/server/assessment/sessionController.ts"
with open(path, 'r') as f:
    content = f.read()

# All three call sites have identical surrounding context — use line-aware replacement
# The pattern is: gamingAnswers);\n    const gamingAnalysis = analyseGamingPatterns(gamingAnswers);
# We replace all three occurrences with the role-aware version

old = "    const gamingAnalysis = analyseGamingPatterns(gamingAnswers);"
new = "    // A2: Pass roleFamily and seniority to enable role-aware gaming thresholds\n    const _seniorityLevel = roleArchetype.seniority === \"junior\" ? 1 : roleArchetype.seniority === \"mid\" ? 2 : roleArchetype.seniority === \"senior\" ? 3 : 4;\n    const gamingAnalysis = analyseGamingPatterns(gamingAnswers, roleArchetype.gamingFamily, _seniorityLevel);"

count = content.count(old)
print(f"Found {count} occurrences of analyseGamingPatterns(gamingAnswers)")

content = content.replace(old, new)

with open(path, 'w') as f:
    f.write(content)

print(f"Replaced all {count} occurrences")
