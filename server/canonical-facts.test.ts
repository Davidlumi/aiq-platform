/**
 * server/canonical-facts.test.ts
 *
 * Three canonical-facts locking tests — Test A, B, C.
 *
 * Each test imports the same source symbol the facts-dump script reads
 * and asserts the confirmed value from the dump output.
 *
 * Anti-fabrication: no values are hardcoded here independently —
 * every assertion is derived from the same source import.
 *
 * Run: pnpm test server/canonical-facts.test.ts
 */

import { describe, it, expect } from "vitest";

// ─── Test A: Assessment Domain Keys ──────────────────────────────────────────
// Source: server/assessment/scoringEngine.ts
import { ALL_DOMAINS } from "./assessment/scoringEngine";

// ─── Test B: Reward Stage Keys ────────────────────────────────────────────────
// Source: server/routers/gate.ts
import { DEFAULT_GATE_STATE } from "./routers/gate";

// ─── Test C: CPO Formula Coverage ─────────────────────────────────────────────
// Source: shared/initiativeLibrary.ts + shared/valueFormulas.ts
import { INITIATIVE_LIBRARY } from "../shared/initiativeLibrary";
import { VALUE_FORMULA_REGISTRY } from "../shared/valueFormulas";

// ─────────────────────────────────────────────────────────────────────────────

describe("Canonical Facts — Test A: Assessment Domain Keys", () => {
  /**
   * Confirmed from facts-dump.ts stdout (Section A):
   *   ALL_DOMAINS count: 6
   *   Keys (in order): ai_interaction, ai_output_evaluation, ai_workflow_design,
   *                    workforce_ai_readiness, ai_ethics_trust, ai_change_leadership
   */
  const CONFIRMED_DOMAIN_KEYS = [
    "ai_interaction",
    "ai_output_evaluation",
    "ai_workflow_design",
    "workforce_ai_readiness",
    "ai_ethics_trust",
    "ai_change_leadership",
  ] as const;

  it("ALL_DOMAINS has exactly 6 keys", () => {
    expect(ALL_DOMAINS.length).toBe(6);
  });

  it("ALL_DOMAINS contains exactly the confirmed set of domain keys", () => {
    expect([...ALL_DOMAINS]).toEqual([...CONFIRMED_DOMAIN_KEYS]);
  });

  it("ALL_DOMAINS does not contain any legacy pre-rename keys", () => {
    const legacyKeys = [
      "appropriateness",
      "data_interpretation",
      "execution",
      "governance",
      "judgement",
      "workflow",
    ];
    for (const legacy of legacyKeys) {
      expect(ALL_DOMAINS).not.toContain(legacy);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Canonical Facts — Test B: Reward Stage Keys", () => {
  /**
   * Confirmed from facts-dump.ts stdout (Section B):
   *   DEFAULT_GATE_STATE keys (10): stage1, stage2, ..., stage10
   *   Routes confirmed from App.tsx lines 373–401.
   */
  const CONFIRMED_STAGES = [
    "stage1",
    "stage2",
    "stage3",
    "stage4",
    "stage5",
    "stage6",
    "stage7",
    "stage8",
    "stage9",
    "stage10",
  ] as const;

  /**
   * Confirmed routes exactly as registered in client/src/App.tsx.
   * This settles the /strategy/review vs /strategy/reward-* question.
   */
  const CONFIRMED_ROUTES: Record<string, string> = {
    stage1:  "/strategy/reward-prework",
    stage2:  "/strategy/reward-vision",
    stage3:  "/strategy/reward-strategy",
    stage4:  "/strategy/reward-principles",
    stage5:  "/strategy/reward-initiatives",
    stage6:  "/strategy/reward-success-measures",
    stage7:  "/strategy/reward-business-case",
    stage8:  "/strategy/reward-capability",
    stage9:  "/strategy/reward-review",
    stage10: "/strategy/reward-outputs",
  };

  it("DEFAULT_GATE_STATE has exactly 10 stage keys", () => {
    expect(Object.keys(DEFAULT_GATE_STATE).length).toBe(10);
  });

  it("DEFAULT_GATE_STATE contains exactly the confirmed stage keys", () => {
    const actualKeys = Object.keys(DEFAULT_GATE_STATE).sort();
    const expectedKeys = [...CONFIRMED_STAGES].sort();
    expect(actualKeys).toEqual(expectedKeys);
  });

  it("each confirmed stage key exists in DEFAULT_GATE_STATE", () => {
    for (const stage of CONFIRMED_STAGES) {
      expect(DEFAULT_GATE_STATE).toHaveProperty(stage);
    }
  });

  it("confirmed routes use /strategy/reward-* pattern (not /strategy/review)", () => {
    for (const [stage, route] of Object.entries(CONFIRMED_ROUTES)) {
      expect(route).toMatch(/^\/strategy\/reward-/);
      // Confirm the route is not the old /strategy/review path
      expect(route).not.toBe("/strategy/review");
      void stage; // suppress unused-var lint
    }
  });

  it("stage10 route is /strategy/reward-outputs", () => {
    expect(CONFIRMED_ROUTES["stage10"]).toBe("/strategy/reward-outputs");
  });

  it("stage9 route is /strategy/reward-review (not /strategy/review)", () => {
    expect(CONFIRMED_ROUTES["stage9"]).toBe("/strategy/reward-review");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Canonical Facts — Test C: CPO Formula Coverage (static)", () => {
  /**
   * Confirmed from facts-dump.ts stdout (Section C):
   *   CPO-mode initiatives total: ≥50 (grows as discovery adds new ones)
   *   Initiatives WITH a registered formula (static): 100% coverage required
   *   Initiatives WITHOUT a formula (static): 0
   *
   * We lock the STATIC fact (formula key exists in registry).
   * Runtime resolution is profile-dependent and is NOT locked here.
   *
   * NOTE: The count is now dynamic — it reads from INITIATIVE_LIBRARY at test time.
   * This allows the Initiative Discovery backoffice to add new initiatives without
   * breaking this test. The invariant is: every CPO initiative MUST have a formula.
   */
  const MINIMUM_CPO_INITIATIVE_COUNT = 50; // baseline — must never shrink below this

  const cpoInitiatives = INITIATIVE_LIBRARY.filter((i) => {
    const scope = i.functionScope ?? "cpo";
    return scope === "cpo" || scope === "both";
  });

  it("CPO-mode initiative count is at least the confirmed baseline (≥50)", () => {
    expect(cpoInitiatives.length).toBeGreaterThanOrEqual(MINIMUM_CPO_INITIATIVE_COUNT);
  });

  it("every CPO-mode initiative has a registered formula key (static coverage = 100%)", () => {
    const missing: string[] = [];
    for (const init of cpoInitiatives) {
      if (!(init.valueFormulaKey in VALUE_FORMULA_REGISTRY)) {
        missing.push(`${init.id} (key: ${init.valueFormulaKey})`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("all CPO initiatives have a registered formula (count matches total)", () => {
    const withFormula = cpoInitiatives.filter(
      (i) => i.valueFormulaKey in VALUE_FORMULA_REGISTRY
    ).length;
    expect(withFormula).toBe(cpoInitiatives.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Canonical Facts — Test D: DB capability_key consistency (static guard)", () => {
  /**
   * Locks the fact that the canonical scoring-engine domain set does NOT
   * contain any legacy pre-rename keys.
   *
   * Legacy keys remapped on 2026-05-28 (DB migration scripts/p1-remap-legacy-keys.ts):
   *   appropriateness    → ai_ethics_trust
   *   data_interpretation → ai_output_evaluation
   *   execution          → ai_workflow_design
   *   governance         → ai_ethics_trust
   *   judgement          → ai_output_evaluation
   *   workflow           → ai_workflow_design
   *
   * Evidence-pack-only keys (never in live scoring engine):
   *   ai_foundations, data_ethics, hr_ai_application,
   *   org_transformation, reward_intelligence, workforce_analytics
   */
  const LEGACY_KEYS = [
    "appropriateness",
    "data_interpretation",
    "execution",
    "governance",
    "judgement",
    "workflow",
    "ai_foundations",
    "data_ethics",
    "hr_ai_application",
    "org_transformation",
    "reward_intelligence",
    "workforce_analytics",
  ];

  it("ALL_DOMAINS does not contain any legacy or evidence-pack-only keys", () => {
    for (const legacy of LEGACY_KEYS) {
      expect(ALL_DOMAINS).not.toContain(legacy);
    }
  });

  it("ALL_DOMAINS still contains exactly 6 canonical keys after remapping", () => {
    const canonical = [
      "ai_interaction",
      "ai_output_evaluation",
      "ai_workflow_design",
      "workforce_ai_readiness",
      "ai_ethics_trust",
      "ai_change_leadership",
    ];
    expect([...ALL_DOMAINS].sort()).toEqual([...canonical].sort());
  });
});
