import re

# Step 1: Add personaStartingDifficulty to AdaptiveSelectionContext interface
engine_path = "/home/ubuntu/aiq-platform/server/assessment/adaptiveEngine.ts"
with open(engine_path, 'r') as f:
    engine = f.read()

old_ctx_interface = "  // I4: Cross-session deduplication — static item IDs seen in prior sessions\n  priorSeenStaticItemIds?: string[];\n}"
new_ctx_interface = """  // I4: Cross-session deduplication — static item IDs seen in prior sessions
  priorSeenStaticItemIds?: string[];
  // A3: Persona-derived starting difficulty (1=easy, 2=medium, 3=hard) — overrides baseline default of 1
  personaStartingDifficulty?: 1 | 2 | 3;
}"""

if old_ctx_interface in engine:
    engine = engine.replace(old_ctx_interface, new_ctx_interface, 1)
    print("A3 interface: patched")
else:
    print("A3 interface: NOT FOUND")

# Step 2: Use personaStartingDifficulty in buildVariables baseline difficulty
old_base_diff = "  const baseDifficulty: 1 | 2 | 3 = phase === \"baseline\" ? 1 : phase === \"adaptive\" ? 2 : 3;"
new_base_diff = "  // A3: Use persona-derived starting difficulty for baseline phase if available\n  const baseDifficulty: 1 | 2 | 3 = phase === \"baseline\" ? (ctx.personaStartingDifficulty ?? 1) : phase === \"adaptive\" ? 2 : 3;"

if old_base_diff in engine:
    engine = engine.replace(old_base_diff, new_base_diff, 1)
    print("A3 baseDifficulty: patched")
else:
    print("A3 baseDifficulty: NOT FOUND")

with open(engine_path, 'w') as f:
    f.write(engine)

# Step 3: Pass personaStartingDifficulty from session metadata into buildAdaptiveContext ctx
router_path = "/home/ubuntu/aiq-platform/server/routers/assessment.ts"
with open(router_path, 'r') as f:
    router = f.read()

old_ctx_build = "    // I4: Cross-session deduplication\n    priorSeenStaticItemIds: (sessionMetaForTracking?.priorSeenStaticItemIds as string[]) ?? [],"
new_ctx_build = """    // I4: Cross-session deduplication
    priorSeenStaticItemIds: (sessionMetaForTracking?.priorSeenStaticItemIds as string[]) ?? [],
    // A3: Persona-derived starting difficulty — read from session metadata written at session start
    personaStartingDifficulty: (sessionMetaForTracking?.personaStartingDifficulty as 1 | 2 | 3 | undefined) ?? undefined,"""

if old_ctx_build in router:
    router = router.replace(old_ctx_build, new_ctx_build, 1)
    print("A3 ctx build: patched")
else:
    print("A3 ctx build: NOT FOUND")

with open(router_path, 'w') as f:
    f.write(router)
