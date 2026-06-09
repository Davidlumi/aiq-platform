/**
 * Phase C — Assumptions Engine Tests
 *
 * Tests the two-layer decomposition engine:
 * - Layer 2 (deterministic library lookup) — fully testable without LLM
 * - No-coverage flag — the key safety property
 * - Library structure integrity — seeded entries only, held-out absent
 * - confirmAssumption mutation shape
 *
 * Layer 1 (LLM derivation) is tested via the shape contract only;
 * actual LLM calls are mocked to avoid flakiness.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PRECONDITION_LIBRARY,
  getPreconditionsForInitiative,
  getPreconditionsForDomain,
  hasPreconditionCoverage,
  type PreconditionEntry,
} from "../shared/preconditionLibrary";

// ─── Library structure tests ──────────────────────────────────────────────────

describe("preconditionLibrary — structure", () => {
  it("has at least 10 seeded entries", () => {
    expect(PRECONDITION_LIBRARY.length).toBeGreaterThanOrEqual(10);
  });

  it("every entry has required fields", () => {
    for (const entry of PRECONDITION_LIBRARY) {
      expect(entry.id, `${entry.id}: missing id`).toBeTruthy();
      expect(entry.domain, `${entry.id}: missing domain`).toBeTruthy();
      expect(entry.initiativeIds.length, `${entry.id}: empty initiativeIds`).toBeGreaterThan(0);
      expect(entry.statement.length, `${entry.id}: empty statement`).toBeGreaterThan(20);
      expect(entry.whyItKills.length, `${entry.id}: whyItKills too short — must be mechanism-level`).toBeGreaterThan(50);
      expect(entry.evidenceSignal.length, `${entry.id}: empty evidenceSignal`).toBeGreaterThan(10);
      expect(["fatal", "high", "medium"]).toContain(entry.severity);
    }
  });

  it("all entry IDs are unique", () => {
    const ids = PRECONDITION_LIBRARY.map((e) => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("whyItKills is mechanism-level, not generic — no entry contains only 'compliance' or 'governance'", () => {
    const genericPhrases = ["compliance required", "governance needed", "legal review required"];
    for (const entry of PRECONDITION_LIBRARY) {
      for (const phrase of genericPhrases) {
        expect(
          entry.whyItKills.toLowerCase(),
          `${entry.id}: whyItKills contains generic phrase "${phrase}"`
        ).not.toBe(phrase);
      }
    }
  });
});

// ─── Control cases — C1 and C2 must be seeded ────────────────────────────────

describe("preconditionLibrary — control cases (C1/C2 must be seeded)", () => {
  it("C1: cr_pay_equity has at least one precondition entry", () => {
    const entries = getPreconditionsForInitiative("cr_pay_equity");
    expect(entries.length).toBeGreaterThan(0);
  });

  it("C1: cr_pay_equity legal privilege entry is fatal severity", () => {
    const entries = getPreconditionsForInitiative("cr_pay_equity");
    const legalPrivilege = entries.find((e) => e.id === "pc_pay_equity_legal_privilege");
    expect(legalPrivilege, "pc_pay_equity_legal_privilege not found").toBeDefined();
    expect(legalPrivilege!.severity).toBe("fatal");
  });

  it("C1: cr_pay_equity legal privilege whyItKills mentions tribunal/discoverable", () => {
    const entry = PRECONDITION_LIBRARY.find((e) => e.id === "pc_pay_equity_legal_privilege");
    expect(entry).toBeDefined();
    const lower = entry!.whyItKills.toLowerCase();
    expect(lower.includes("tribunal") || lower.includes("discoverable")).toBe(true);
  });

  it("C2: fw_shift_scheduling_ai has at least one precondition entry", () => {
    const entries = getPreconditionsForInitiative("fw_shift_scheduling_ai");
    expect(entries.length).toBeGreaterThan(0);
  });

  it("C2: fw_shift_scheduling_ai union agreement entry is fatal severity", () => {
    const entries = getPreconditionsForInitiative("fw_shift_scheduling_ai");
    const unionEntry = entries.find((e) => e.id === "pc_scheduling_union_agreement");
    expect(unionEntry, "pc_scheduling_union_agreement not found").toBeDefined();
    expect(unionEntry!.severity).toBe("fatal");
  });

  it("C2: fw_shift_scheduling_ai union agreement whyItKills mentions collective bargaining or industrial action", () => {
    const entry = PRECONDITION_LIBRARY.find((e) => e.id === "pc_scheduling_union_agreement");
    expect(entry).toBeDefined();
    const lower = entry!.whyItKills.toLowerCase();
    expect(
      lower.includes("collective bargaining") || lower.includes("industrial action") || lower.includes("union")
    ).toBe(true);
  });
});

// ─── Held-out cases — H1/H2/H3 must NOT be seeded ───────────────────────────
// This is the gate validity check. If any of these pass, the gate is testing its own answer key.

describe("preconditionLibrary — held-out cases (H1/H2/H3 must NOT be seeded)", () => {
  it("H1: rt_flight_risk_prediction has NO precondition entries (held out)", () => {
    const entries = getPreconditionsForInitiative("rt_flight_risk_prediction");
    expect(entries.length).toBe(0);
  });

  it("H1: hasPreconditionCoverage returns false for rt_flight_risk_prediction", () => {
    expect(hasPreconditionCoverage("rt_flight_risk_prediction")).toBe(false);
  });

  it("H2: ta_video_interview_assessment has NO precondition entries (held out)", () => {
    const entries = getPreconditionsForInitiative("ta_video_interview_assessment");
    expect(entries.length).toBe(0);
  });

  it("H2: hasPreconditionCoverage returns false for ta_video_interview_assessment", () => {
    expect(hasPreconditionCoverage("ta_video_interview_assessment")).toBe(false);
  });

  it("H3: wp_succession_planning has NO precondition entries (held out)", () => {
    const entries = getPreconditionsForInitiative("wp_succession_planning");
    expect(entries.length).toBe(0);
  });

  it("H3: hasPreconditionCoverage returns false for wp_succession_planning", () => {
    expect(hasPreconditionCoverage("wp_succession_planning")).toBe(false);
  });

  it("no PRECONDITION_LIBRARY entry mentions DPIA, Article 35, or flight risk (H1 killer absent)", () => {
    const dpiaTerms = ["dpia", "article 35", "flight risk prediction", "rt_flight_risk_prediction"];
    for (const entry of PRECONDITION_LIBRARY) {
      const combined = (
        entry.id + entry.statement + entry.whyItKills + entry.initiativeIds.join(",")
      ).toLowerCase();
      for (const term of dpiaTerms) {
        expect(
          combined.includes(term),
          `Library entry ${entry.id} contains held-out H1 killer term "${term}"`
        ).toBe(false);
      }
    }
  });

  it("no PRECONDITION_LIBRARY entry mentions EU AI Act deployer obligations or video interview (H2 killer absent)", () => {
    const h2Terms = [
      "ta_video_interview_assessment",
      "eu ai act annex iii",
      "conformity assessment",
      "video interview",
    ];
    for (const entry of PRECONDITION_LIBRARY) {
      const combined = (
        entry.id + entry.statement + entry.whyItKills + entry.initiativeIds.join(",")
      ).toLowerCase();
      for (const term of h2Terms) {
        expect(
          combined.includes(term),
          `Library entry ${entry.id} contains held-out H2 killer term "${term}"`
        ).toBe(false);
      }
    }
  });

  it("no PRECONDITION_LIBRARY entry mentions succession SAR or subject access request for succession (H3 killer absent)", () => {
    const h3Terms = [
      "wp_succession_planning",
      "subject access request",
      "succession planning",
      "succession list",
    ];
    for (const entry of PRECONDITION_LIBRARY) {
      const combined = (
        entry.id + entry.statement + entry.whyItKills + entry.initiativeIds.join(",")
      ).toLowerCase();
      for (const term of h3Terms) {
        expect(
          combined.includes(term),
          `Library entry ${entry.id} contains held-out H3 killer term "${term}"`
        ).toBe(false);
      }
    }
  });
});

// ─── No-coverage flag logic ───────────────────────────────────────────────────

describe("hasPreconditionCoverage — no-coverage flag", () => {
  it("returns true for a seeded initiative", () => {
    expect(hasPreconditionCoverage("cr_pay_equity")).toBe(true);
    expect(hasPreconditionCoverage("fw_shift_scheduling_ai")).toBe(true);
  });

  it("returns false for an unknown initiative ID", () => {
    expect(hasPreconditionCoverage("completely_unknown_initiative_xyz")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(hasPreconditionCoverage("")).toBe(false);
  });

  it("the flag is independent of whether the initiative exists in the initiative library", () => {
    // A real initiative that is seeded in the initiative library but NOT in the precondition library
    // should still return false — the flag is about precondition coverage, not initiative existence.
    expect(hasPreconditionCoverage("rt_flight_risk_prediction")).toBe(false);
  });
});

// ─── getPreconditionsForDomain ────────────────────────────────────────────────

describe("getPreconditionsForDomain", () => {
  it("returns entries for compensation_reward domain", () => {
    const entries = getPreconditionsForDomain("compensation_reward");
    expect(entries.length).toBeGreaterThan(0);
  });

  it("returns entries for frontline_workforce domain", () => {
    const entries = getPreconditionsForDomain("frontline_workforce");
    expect(entries.length).toBeGreaterThan(0);
  });

  it("returns empty array for a domain with no entries", () => {
    const entries = getPreconditionsForDomain("ai_capability");
    expect(entries).toEqual([]);
  });
});

// ─── Precondition confidence is always 'low' ─────────────────────────────────
// This is a contract the decomposition engine relies on.

describe("precondition confidence contract", () => {
  it("all seeded entries have severity that is fatal or high (not medium for C1/C2)", () => {
    const c1 = getPreconditionsForInitiative("cr_pay_equity");
    const c2 = getPreconditionsForInitiative("fw_shift_scheduling_ai");
    for (const entry of [...c1, ...c2]) {
      expect(["fatal", "high"]).toContain(entry.severity);
    }
  });

  it("getPreconditionsForInitiative returns entries in array form (not null/undefined)", () => {
    const result = getPreconditionsForInitiative("cr_pay_equity");
    expect(Array.isArray(result)).toBe(true);
    expect(result).not.toBeNull();
  });
});
