path = "/home/ubuntu/aiq-platform/server/routers/assessment.ts"
with open(path, 'r') as f:
    content = f.read()

replacements = [
    # totalTarget at session start
    ("totalTarget: MINIMUM_EVIDENCE.targetItems,",
     "totalTarget: activeScoringCfg.evidenceTargetItems,"),
    # phase determination in getNextItem
    ("const phase = determineSessionPhase(answeredCount, MINIMUM_EVIDENCE.targetItems);",
     "const phase = determineSessionPhase(answeredCount, activeScoringCfg.evidenceTargetItems);"),
    # evidenceSufficient check
    ("        MINIMUM_EVIDENCE.targetItems,\n",
     "        activeScoringCfg.evidenceTargetItems,\n"),
    # early-completion check 1
    ("        answeredCount < MINIMUM_EVIDENCE.targetItems &&",
     "        answeredCount < activeScoringCfg.evidenceTargetItems &&"),
    # early-completion check 2
    ("        (answeredCount >= MINIMUM_EVIDENCE.targetItems && !nextItem) ||",
     "        (answeredCount >= activeScoringCfg.evidenceTargetItems && !nextItem) ||"),
    # totalItems in the state return
    ("        totalItems: MINIMUM_EVIDENCE.targetItems,",
     "        totalItems: activeScoringCfg.evidenceTargetItems,"),
    # completeSession minimum check
    ("      if (newAnsweredCount < MINIMUM_EVIDENCE.targetItems) {",
     "      if (newAnsweredCount < activeScoringCfg.evidenceTargetItems) {"),
]

count = 0
for old, new in replacements:
    if old in content:
        content = content.replace(old, new, 1)
        count += 1
        print(f"  patched: {old[:60]!r}")
    else:
        print(f"  NOT FOUND: {old[:60]!r}")

print(f"D1 router: {count}/{len(replacements)} replacements applied")

with open(path, 'w') as f:
    f.write(content)
