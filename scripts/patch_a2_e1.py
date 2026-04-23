import re

# ── E1: Add gamingFamily field to RoleArchetype interface and all archetype definitions ──
ra_path = "/home/ubuntu/aiq-platform/server/assessment/roleArchetypes.ts"
with open(ra_path, 'r') as f:
    ra = f.read()

# Add gamingFamily to interface
old = "  /** Decision authority level */\n  decisionAuthority:"
new = "  /** E1: Gaming threshold family for WS2.2 role-aware anti-gaming */\n  gamingFamily: \"specialist\" | \"generalist\" | \"leader\" | \"coordinator\";\n  /** Decision authority level */\n  decisionAuthority:"
if old in ra:
    ra = ra.replace(old, new, 1)
    print("E1 interface: patched")
else:
    print("E1 interface: NOT FOUND")

# Map each archetype id to its gaming family
GAMING_FAMILY_MAP = {
    "hrbp":              "generalist",
    "hr_generalist":     "generalist",
    "hr_advisor":        "generalist",
    "talent_acquisition":"specialist",
    "er_specialist":     "specialist",
    "ld_specialist":     "specialist",
    "people_analytics":  "specialist",
    "hr_ops":            "coordinator",
    "reward":            "specialist",
    "hr_leader":         "leader",
    "hr_professional":   "generalist",
}

for archetype_id, family in GAMING_FAMILY_MAP.items():
    # Insert gamingFamily after the id line for each archetype
    # Pattern: id: "archetype_id",\n    displayName:
    old_pattern = f'    id: "{archetype_id}",\n    displayName:'
    new_pattern = f'    id: "{archetype_id}",\n    gamingFamily: "{family}", // E1\n    displayName:'
    if old_pattern in ra:
        ra = ra.replace(old_pattern, new_pattern, 1)
        print(f"E1 {archetype_id}: patched -> {family}")
    else:
        print(f"E1 {archetype_id}: NOT FOUND")

with open(ra_path, 'w') as f:
    f.write(ra)

# ── A2: Update analyseGamingPatterns to accept DB thresholds override ──
age_path = "/home/ubuntu/aiq-platform/server/assessment/antiGamingEngine.ts"
with open(age_path, 'r') as f:
    age = f.read()

# Add dbThresholds optional parameter to analyseGamingPatterns
old = "  /** WS2.2: Declared seniority level (1-4) for seniority-inconsistency suppression */\n  declaredSeniority?: number\n): GamingAnalysis {"
new = "  /** WS2.2: Declared seniority level (1-4) for seniority-inconsistency suppression */\n  declaredSeniority?: number,\n  /** A2: DB-loaded thresholds override (from antiGamingThresholds table) */\n  dbThresholds?: Partial<RoleAwareGamingThresholds>\n): GamingAnalysis {"
if old in age:
    age = age.replace(old, new, 1)
    print("A2 signature: patched")
else:
    print("A2 signature: NOT FOUND")

# Wire dbThresholds into the threshold resolution
old = "  const thresholds = ROLE_GAMING_THRESHOLDS[roleFamily ?? \"\"] ?? DEFAULT_GAMING_THRESHOLDS;"
new = "  // A2: DB thresholds override takes precedence over compiled role thresholds\n  const baseThresholds = ROLE_GAMING_THRESHOLDS[roleFamily ?? \"\"] ?? DEFAULT_GAMING_THRESHOLDS;\n  const thresholds: RoleAwareGamingThresholds = dbThresholds\n    ? { ...baseThresholds, ...dbThresholds }\n    : baseThresholds;"
if old in age:
    age = age.replace(old, new, 1)
    print("A2 threshold wiring: patched")
else:
    print("A2 threshold wiring: NOT FOUND")

with open(age_path, 'w') as f:
    f.write(age)

# ── A2: Update sessionController to pass roleFamily and DB thresholds ──
sc_path = "/home/ubuntu/aiq-platform/server/assessment/sessionController.ts"
with open(sc_path, 'r') as f:
    sc = f.read()

# All three call sites pass gamingAnswers — update them to pass roleFamily
# The roleArchetype is already resolved at each call site
# Call site 1: line ~168
old1 = "    const gamingAnalysis = analyseGamingPatterns(gamingAnswers);\n    const contradictions"
new1 = "    const gamingAnalysis = analyseGamingPatterns(gamingAnswers, roleArchetype.gamingFamily, roleArchetype.seniority === \"junior\" ? 1 : roleArchetype.seniority === \"mid\" ? 2 : roleArchetype.seniority === \"senior\" ? 3 : 4);\n    const contradictions"
if old1 in sc:
    sc = sc.replace(old1, new1, 1)
    print("A2 SC call1: patched")
else:
    print("A2 SC call1: NOT FOUND")

# Call site 2: line ~295
old2 = "    const gamingAnalysis = analyseGamingPatterns(gamingAnswers);\n    const contradictionPairs"
new2 = "    const gamingAnalysis = analyseGamingPatterns(gamingAnswers, roleArchetype.gamingFamily, roleArchetype.seniority === \"junior\" ? 1 : roleArchetype.seniority === \"mid\" ? 2 : roleArchetype.seniority === \"senior\" ? 3 : 4);\n    const contradictionPairs"
if old2 in sc:
    sc = sc.replace(old2, new2, 1)
    print("A2 SC call2: patched")
else:
    print("A2 SC call2: NOT FOUND")

# Call site 3: line ~413
old3 = "    const gamingAnalysis = analyseGamingPatterns(gamingAnswers);\n    const contradictionAnalysis"
new3 = "    const gamingAnalysis = analyseGamingPatterns(gamingAnswers, roleArchetype.gamingFamily, roleArchetype.seniority === \"junior\" ? 1 : roleArchetype.seniority === \"mid\" ? 2 : roleArchetype.seniority === \"senior\" ? 3 : 4);\n    const contradictionAnalysis"
if old3 in sc:
    sc = sc.replace(old3, new3, 1)
    print("A2 SC call3: patched")
else:
    print("A2 SC call3: NOT FOUND")

with open(sc_path, 'w') as f:
    f.write(sc)

print("A2+E1 patch complete")
