path = "/home/ubuntu/aiq-platform/drizzle/schema.ts"
with open(path, 'r') as f:
    content = f.read()

old_notes = """  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
// ─── S10: Organisation-Configurable Thresholds ────────────────────────────────"""

new_notes = """  // D1: Configurable evidence sufficiency thresholds (previously MINIMUM_EVIDENCE in sessionController.ts)
  evidenceTotalItems: int("evidence_total_items").notNull().default(20),
  evidenceSignalsPerCapability: int("evidence_signals_per_capability").notNull().default(3),
  evidenceDistinctInteractionTypes: int("evidence_distinct_interaction_types").notNull().default(5),
  evidenceHighRiskProportion: decimal("evidence_high_risk_proportion", { precision: 4, scale: 3 }).notNull().default("0.250"),
  evidenceTargetItems: int("evidence_target_items").notNull().default(49),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
// ─── S10: Organisation-Configurable Thresholds ────────────────────────────────"""

if old_notes in content:
    content = content.replace(old_notes, new_notes, 1)
    print("D1 schema: patched")
else:
    print("D1 schema: NOT FOUND")

with open(path, 'w') as f:
    f.write(content)
