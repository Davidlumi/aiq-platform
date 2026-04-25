import { describe, expect, it } from "vitest";
import {
  DOMAIN_KEYS,
  DOMAIN_LABELS,
  DOMAIN_COLOURS,
  RATING_KEYS,
  RATING_LABELS,
  RATING_COLOURS_INDIVIDUAL,
  RATING_COLOURS_ORG,
  ROLE_FAMILY_KEYS,
  ROLE_FAMILY_LABELS,
  stateToRating,
  confidenceBand,
  archetypeToRoleFamily,
  roleFamilyFromUserField,
  scoreToNavyBg,
  scoreToNavyText,
} from "../shared/dashboard";

// ─── Shared dashboard constants ─────────────────────────────────────────────

describe("shared/dashboard constants", () => {
  it("defines exactly 6 capability domains", () => {
    expect(DOMAIN_KEYS).toHaveLength(6);
    expect(DOMAIN_KEYS).toContain("ai_interaction");
    expect(DOMAIN_KEYS).toContain("ai_output_evaluation");
    expect(DOMAIN_KEYS).toContain("ai_workflow_design");
    expect(DOMAIN_KEYS).toContain("workforce_ai_readiness");
    expect(DOMAIN_KEYS).toContain("ai_ethics_trust");
    expect(DOMAIN_KEYS).toContain("ai_change_leadership");
  });

  it("has a label and colour for every domain key", () => {
    for (const dk of DOMAIN_KEYS) {
      expect(DOMAIN_LABELS[dk]).toBeDefined();
      expect(typeof DOMAIN_LABELS[dk]).toBe("string");
      expect(DOMAIN_COLOURS[dk]).toBeDefined();
      expect(DOMAIN_COLOURS[dk]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("defines exactly 5 readiness ratings", () => {
    expect(RATING_KEYS).toHaveLength(5);
    expect(RATING_KEYS).toContain("ai_ready");
    expect(RATING_KEYS).toContain("developing");
    expect(RATING_KEYS).toContain("not_yet_ready");
    expect(RATING_KEYS).toContain("foundation_gap");
    expect(RATING_KEYS).toContain("insufficient_evidence");
  });

  it("has a label and colour set for every rating key", () => {
    for (const rk of RATING_KEYS) {
      expect(RATING_LABELS[rk]).toBeDefined();
      expect(typeof RATING_LABELS[rk]).toBe("string");
      expect(RATING_COLOURS_INDIVIDUAL[rk]).toBeDefined();
      expect(RATING_COLOURS_INDIVIDUAL[rk].dot).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("rating labels match the spec (5-point scale)", () => {
    expect(RATING_LABELS.ai_ready).toBe("AI Ready");
    expect(RATING_LABELS.developing).toBe("Developing");
    expect(RATING_LABELS.not_yet_ready).toBe("Not Yet Ready");
    expect(RATING_LABELS.foundation_gap).toBe("Foundation Gap");
    expect(RATING_LABELS.insufficient_evidence).toBe("Insufficient Evidence");
  });

  it("defines role families", () => {
    expect(ROLE_FAMILY_KEYS.length).toBeGreaterThanOrEqual(1);
    for (const rfk of ROLE_FAMILY_KEYS) {
      expect(ROLE_FAMILY_LABELS[rfk]).toBeDefined();
      expect(typeof ROLE_FAMILY_LABELS[rfk]).toBe("string");
    }
  });

});

// ─── stateToRating mapping ──────────────────────────────────────────────────

describe("stateToRating mapping", () => {
  it("maps safe → ai_ready", () => {
    expect(stateToRating("safe")).toBe("ai_ready");
  });

  it("maps at_risk → developing", () => {
    expect(stateToRating("at_risk")).toBe("developing");
  });

  it("maps unsafe → not_yet_ready", () => {
    expect(stateToRating("unsafe")).toBe("not_yet_ready");
  });

  it("maps foundation_gap → foundation_gap", () => {
    expect(stateToRating("foundation_gap")).toBe("foundation_gap");
  });

  it("maps unknown → insufficient_evidence", () => {
    expect(stateToRating("unknown")).toBe("insufficient_evidence");
  });

  it("maps unknown_insufficient_evidence → insufficient_evidence", () => {
    expect(stateToRating("unknown_insufficient_evidence")).toBe("insufficient_evidence");
  });

  it("maps null → insufficient_evidence", () => {
    expect(stateToRating(null)).toBe("insufficient_evidence");
  });

  it("maps undefined → insufficient_evidence", () => {
    expect(stateToRating(undefined)).toBe("insufficient_evidence");
  });
});

// ─── confidenceBand ─────────────────────────────────────────────────────────

describe("confidenceBand", () => {
  it("returns high for >= 0.70", () => {
    expect(confidenceBand(0.70)).toBe("high");
    expect(confidenceBand(0.95)).toBe("high");
  });

  it("returns moderate for >= 0.50 and < 0.70", () => {
    expect(confidenceBand(0.50)).toBe("moderate");
    expect(confidenceBand(0.69)).toBe("moderate");
  });

  it("returns low for < 0.50", () => {
    expect(confidenceBand(0.49)).toBe("low");
    expect(confidenceBand(0.10)).toBe("low");
  });

  it("returns low for null/undefined", () => {
    expect(confidenceBand(null)).toBe("low");
    expect(confidenceBand(undefined)).toBe("low");
  });
});

// ─── archetypeToRoleFamily ──────────────────────────────────────────────────

describe("archetypeToRoleFamily", () => {
  it("maps hrbp → business_partnering", () => {
    expect(archetypeToRoleFamily("hrbp")).toBe("business_partnering");
  });

  it("maps talent_acquisition → talent_acquisition", () => {
    expect(archetypeToRoleFamily("talent_acquisition")).toBe("talent_acquisition");
  });

  it("maps hr_leader → hr_leadership", () => {
    expect(archetypeToRoleFamily("hr_leader")).toBe("hr_leadership");
  });

  it("defaults null to business_partnering", () => {
    expect(archetypeToRoleFamily(null)).toBe("business_partnering");
  });

  it("defaults unknown archetype to business_partnering", () => {
    expect(archetypeToRoleFamily("unknown_role")).toBe("business_partnering");
  });
});

// ─── roleFamilyFromUserField ────────────────────────────────────────────────

describe("roleFamilyFromUserField", () => {
  it("maps display label to key", () => {
    expect(roleFamilyFromUserField("Business Partnering")).toBe("business_partnering");
    expect(roleFamilyFromUserField("Talent Acquisition")).toBe("talent_acquisition");
    expect(roleFamilyFromUserField("Learning & Development")).toBe("learning_development");
  });

  it("maps key directly", () => {
    expect(roleFamilyFromUserField("business_partnering")).toBe("business_partnering");
  });

  it("defaults null to business_partnering", () => {
    expect(roleFamilyFromUserField(null)).toBe("business_partnering");
  });
});

// ─── scoreToNavyBg ──────────────────────────────────────────────────────────

describe("scoreToNavyBg", () => {
  it("returns darkest navy for scores >= 80", () => {
    expect(scoreToNavyBg(80)).toBe("#0F172A");
    expect(scoreToNavyBg(100)).toBe("#0F172A");
  });

  it("returns lightest navy for scores < 30", () => {
    expect(scoreToNavyBg(0)).toBe("#CBD5E1");
    expect(scoreToNavyBg(29)).toBe("#CBD5E1");
  });

  it("returns progressively darker for higher scores", () => {
    const s30 = scoreToNavyBg(30);
    const s50 = scoreToNavyBg(50);
    const s70 = scoreToNavyBg(70);
    const s90 = scoreToNavyBg(90);
    // Each should be different
    expect(new Set([s30, s50, s70, s90]).size).toBe(4);
  });
});

// ─── scoreToNavyText ────────────────────────────────────────────────────────

describe("scoreToNavyText", () => {
  it("returns light text for scores >= 50", () => {
    expect(scoreToNavyText(50)).toBe("#F8FAFC");
    expect(scoreToNavyText(80)).toBe("#F8FAFC");
  });

  it("returns dark text for scores < 50", () => {
    expect(scoreToNavyText(49)).toBe("#1E293B");
    expect(scoreToNavyText(0)).toBe("#1E293B");
  });
});

// ─── Colour accessibility ───────────────────────────────────────────────────

describe("colour accessibility", () => {
  it("each rating has a distinct dot colour (individual)", () => {
    const colours = RATING_KEYS.map(rk => RATING_COLOURS_INDIVIDUAL[rk].dot);
    expect(new Set(colours).size).toBe(colours.length);
  });

  it("each rating has a distinct dot colour (org)", () => {
    const colours = RATING_KEYS.map(rk => RATING_COLOURS_ORG[rk].dot);
    expect(new Set(colours).size).toBe(colours.length);
  });

  it("each domain has a distinct colour", () => {
    const colours = DOMAIN_KEYS.map(dk => DOMAIN_COLOURS[dk]);
    expect(new Set(colours).size).toBe(colours.length);
  });

  it("individual rating colours have all required fields", () => {
    for (const rk of RATING_KEYS) {
      const c = RATING_COLOURS_INDIVIDUAL[rk];
      expect(c.bg).toMatch(/^#/);
      expect(c.text).toMatch(/^#/);
      expect(c.border).toMatch(/^#/);
      expect(c.dot).toMatch(/^#/);
    }
  });
});
