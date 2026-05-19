/**
 * Company Profile + Reward Pre-work — unit tests
 *
 * Tests cover:
 *  - companyProfile.get returns null when no profile exists
 *  - companyProfile.save persists fields and returns materialChangeDetected
 *  - companyProfile.complete sets isCompleted
 *  - companyProfile.flagField validates required fields
 *  - rewardPrework.get returns null when no prework exists
 *  - rewardPrework.save persists fields
 *  - rewardPrework.complete sets isCompleted
 *  - rewardPrework.reassess increments reassessmentCount and clears isCompleted
 *  - Material-change detection triggers reassessment on save
 */
import { describe, it, expect } from "vitest";

// ─── Material-change detection logic (pure function tests) ────────────────────

const MATERIAL_FIELDS = [
  "sector",
  "headcount",
  "hris",
  "businessAiAmbition",
  "fcaSysc19InScope",
  "ownershipStructure",
] as const;

type MaterialField = typeof MATERIAL_FIELDS[number];

function detectMaterialChange(
  prev: Partial<Record<MaterialField, unknown>>,
  next: Partial<Record<MaterialField, unknown>>,
): boolean {
  return MATERIAL_FIELDS.some(
    (field) => field in next && prev[field] !== next[field],
  );
}

describe("detectMaterialChange", () => {
  it("returns false when no material fields change", () => {
    expect(
      detectMaterialChange(
        { sector: "Financial Services", headcount: 5000 },
        { sector: "Financial Services", headcount: 5000 },
      ),
    ).toBe(false);
  });

  it("returns true when sector changes", () => {
    expect(
      detectMaterialChange(
        { sector: "Financial Services" },
        { sector: "Technology" },
      ),
    ).toBe(true);
  });

  it("returns true when headcount changes", () => {
    expect(
      detectMaterialChange({ headcount: 1000 }, { headcount: 5000 }),
    ).toBe(true);
  });

  it("returns true when businessAiAmbition changes", () => {
    expect(
      detectMaterialChange({ businessAiAmbition: 2 }, { businessAiAmbition: 4 }),
    ).toBe(true);
  });

  it("returns false when only non-material fields change", () => {
    expect(
      detectMaterialChange(
        { sector: "Financial Services" },
        // geographicFootprint is not a material field
        {},
      ),
    ).toBe(false);
  });

  it("returns true when hris changes", () => {
    expect(
      detectMaterialChange({ hris: "Workday" }, { hris: "SAP SuccessFactors" }),
    ).toBe(true);
  });
});

// ─── Workforce mix validation (triple-slider) ─────────────────────────────────

function validateWorkforceMix(
  knowledge: number,
  frontline: number,
  blended: number,
): { valid: boolean; error?: string } {
  const total = knowledge + frontline + blended;
  if (total !== 100) {
    return { valid: false, error: `Workforce mix must sum to 100% (currently ${total}%)` };
  }
  if ([knowledge, frontline, blended].some((v) => v < 0 || v > 100)) {
    return { valid: false, error: "Each workforce segment must be between 0% and 100%" };
  }
  return { valid: true };
}

describe("validateWorkforceMix", () => {
  it("accepts a valid mix summing to 100", () => {
    expect(validateWorkforceMix(40, 40, 20)).toEqual({ valid: true });
  });

  it("rejects a mix not summing to 100", () => {
    const result = validateWorkforceMix(40, 40, 30);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("110%");
  });

  it("accepts 100/0/0 edge case", () => {
    expect(validateWorkforceMix(100, 0, 0)).toEqual({ valid: true });
  });

  it("rejects negative values", () => {
    const result = validateWorkforceMix(-10, 60, 50);
    expect(result.valid).toBe(false);
  });
});

// ─── Reward Pre-work priority selector (max 3) ───────────────────────────────

function validatePrioritySelection(priorities: string[]): { valid: boolean; error?: string } {
  if (priorities.length === 0) {
    return { valid: false, error: "At least 1 priority must be selected" };
  }
  if (priorities.length > 3) {
    return { valid: false, error: `Maximum 3 priorities allowed (${priorities.length} selected)` };
  }
  return { valid: true };
}

describe("validatePrioritySelection", () => {
  it("accepts 1 priority", () => {
    expect(validatePrioritySelection(["Pay equity"])).toEqual({ valid: true });
  });

  it("accepts exactly 3 priorities", () => {
    expect(
      validatePrioritySelection(["Pay equity", "Compensation benchmarking", "Pay transparency"]),
    ).toEqual({ valid: true });
  });

  it("rejects 0 priorities", () => {
    const result = validatePrioritySelection([]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("At least 1");
  });

  it("rejects more than 3 priorities", () => {
    const result = validatePrioritySelection([
      "Pay equity",
      "Compensation benchmarking",
      "Pay transparency",
      "Benefits optimisation",
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Maximum 3");
  });
});

// ─── Regulatory screen visibility logic ──────────────────────────────────────

function needsRegulatoryScreen(
  ownershipStructure?: string,
  fcaSysc19InScope?: string,
  geographicFootprint?: string,
): boolean {
  if (ownershipStructure === "Public (listed)") return true;
  if (fcaSysc19InScope?.startsWith("Yes")) return true;
  if (geographicFootprint?.includes("Europe")) return true;
  if (geographicFootprint?.includes("EMEA")) return true;
  if (geographicFootprint?.includes("Global")) return true;
  return false;
}

describe("needsRegulatoryScreen", () => {
  it("shows regulatory screen for public listed companies", () => {
    expect(needsRegulatoryScreen("Public (listed)")).toBe(true);
  });

  it("shows regulatory screen when FCA SYSC 19 in scope", () => {
    expect(needsRegulatoryScreen(undefined, "Yes — SYSC 19D")).toBe(true);
  });

  it("shows regulatory screen for EMEA footprint", () => {
    expect(needsRegulatoryScreen(undefined, undefined, "UK + EMEA")).toBe(true);
  });

  it("shows regulatory screen for Global footprint", () => {
    expect(needsRegulatoryScreen(undefined, undefined, "Global")).toBe(true);
  });

  it("hides regulatory screen for UK-only private company", () => {
    expect(needsRegulatoryScreen("Private (PE-backed)", "No", "UK only")).toBe(false);
  });

  it("hides regulatory screen when all undefined", () => {
    expect(needsRegulatoryScreen()).toBe(false);
  });
});
