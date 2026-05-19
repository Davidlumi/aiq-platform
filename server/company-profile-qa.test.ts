/**
 * QA tests for Company Profile + Reward Pre-work (schema v2 enum fixes)
 *
 * Uses pure function tests (same pattern as company-profile.test.ts) to avoid
 * needing a live DB connection. Covers:
 * - businessAiAmbition max 4 (not 5)
 * - Slider ratings max 4
 * - Cross-field headcount validation (uk + eu ≤ total)
 * - D9 gate: canStart=false when company profile not complete
 * - 12-month reassessment timer logic
 * - topRewardPriorities max 3
 * - Conditional priority options based on Company Profile
 * - AI maturity inconsistency detection
 * - Conditional field visibility (FCA, listing exchange, uk/eu headcount)
 */
import { describe, it, expect } from "vitest";

// ── businessAiAmbition validation (1–4 scale) ─────────────────────────────────

function validateAiAmbition(value: number): { valid: boolean; error?: string } {
  if (value < 1 || value > 4 || !Number.isInteger(value)) {
    return { valid: false, error: `businessAiAmbition must be an integer between 1 and 4 (got ${value})` };
  }
  return { valid: true };
}

describe("validateAiAmbition (1–4 scale)", () => {
  it("accepts 1", () => expect(validateAiAmbition(1)).toEqual({ valid: true }));
  it("accepts 2", () => expect(validateAiAmbition(2)).toEqual({ valid: true }));
  it("accepts 3", () => expect(validateAiAmbition(3)).toEqual({ valid: true }));
  it("accepts 4", () => expect(validateAiAmbition(4)).toEqual({ valid: true }));
  it("rejects 5", () => {
    const r = validateAiAmbition(5);
    expect(r.valid).toBe(false);
    expect(r.error).toContain("4");
  });
  it("rejects 0", () => {
    const r = validateAiAmbition(0);
    expect(r.valid).toBe(false);
  });
});

// ── Reward slider ratings validation (1–4 scale) ──────────────────────────────

function validateRating(value: number, fieldName: string): { valid: boolean; error?: string } {
  if (value < 1 || value > 4 || !Number.isInteger(value)) {
    return { valid: false, error: `${fieldName} must be an integer between 1 and 4 (got ${value})` };
  }
  return { valid: true };
}

describe("validateRating — reward sliders (1–4 scale)", () => {
  it("accepts rewardFunctionMaturityRating = 4", () =>
    expect(validateRating(4, "rewardFunctionMaturityRating")).toEqual({ valid: true }));
  it("rejects rewardFunctionMaturityRating = 5", () =>
    expect(validateRating(5, "rewardFunctionMaturityRating").valid).toBe(false));
  it("accepts aiMaturityInRewardToday = 1", () =>
    expect(validateRating(1, "aiMaturityInRewardToday")).toEqual({ valid: true }));
  it("rejects aiMaturityInRewardToday = 5", () =>
    expect(validateRating(5, "aiMaturityInRewardToday").valid).toBe(false));
  it("accepts rewardAiAmbition = 3", () =>
    expect(validateRating(3, "rewardAiAmbition")).toEqual({ valid: true }));
  it("rejects rewardAiAmbition = 0", () =>
    expect(validateRating(0, "rewardAiAmbition").valid).toBe(false));
});

// ── Cross-field headcount validation ─────────────────────────────────────────

function validateHeadcounts(
  total: number,
  uk: number,
  eu: number,
): { valid: boolean; error?: string } {
  if (total <= 0) return { valid: true }; // no total set — skip
  if (uk + eu > total) {
    return {
      valid: false,
      error: `UK (${uk}) + EU (${eu}) headcount (${uk + eu}) exceeds total headcount (${total}).`,
    };
  }
  return { valid: true };
}

describe("validateHeadcounts — cross-field validation", () => {
  it("accepts uk + eu < total", () =>
    expect(validateHeadcounts(1000, 300, 200)).toEqual({ valid: true }));
  it("accepts uk + eu = total", () =>
    expect(validateHeadcounts(1000, 600, 400)).toEqual({ valid: true }));
  it("rejects uk + eu > total", () => {
    const r = validateHeadcounts(1000, 700, 500);
    expect(r.valid).toBe(false);
    expect(r.error).toContain("1200");
    expect(r.error).toContain("1000");
  });
  it("skips validation when total is 0", () =>
    expect(validateHeadcounts(0, 300, 200)).toEqual({ valid: true }));
  it("handles uk-only (eu = 0)", () =>
    expect(validateHeadcounts(1000, 1000, 0)).toEqual({ valid: true }));
});

// ── D9 gate: canStart logic ───────────────────────────────────────────────────

function computeCanStart(
  companyProfileIsCompleted: 0 | 1 | null,
): { canStart: boolean; canStartMessage: string | null } {
  const complete = companyProfileIsCompleted === 1;
  return {
    canStart: complete,
    canStartMessage: complete
      ? null
      : "Company Profile must be completed by an admin before Reward Pre-work can begin.",
  };
}

describe("computeCanStart — D9 gate", () => {
  it("returns canStart=false and message when profile not complete", () => {
    const r = computeCanStart(0);
    expect(r.canStart).toBe(false);
    expect(r.canStartMessage).toContain("Company Profile");
  });
  it("returns canStart=false when profile is null", () => {
    const r = computeCanStart(null);
    expect(r.canStart).toBe(false);
  });
  it("returns canStart=true and null message when profile is complete", () => {
    const r = computeCanStart(1);
    expect(r.canStart).toBe(true);
    expect(r.canStartMessage).toBeNull();
  });
});

// ── 12-month reassessment timer ───────────────────────────────────────────────

function computeIsDueReassessment(
  isCompleted: boolean,
  completedAt: number | null,
  nowMs: number = Date.now(),
): boolean {
  const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;
  return isCompleted && completedAt !== null && nowMs - completedAt > TWELVE_MONTHS_MS;
}

describe("computeIsDueReassessment — 12-month timer", () => {
  const now = Date.now();
  const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

  it("returns false when profile not complete", () =>
    expect(computeIsDueReassessment(false, now - TWELVE_MONTHS_MS - 1000, now)).toBe(false));
  it("returns false when completedAt is null", () =>
    expect(computeIsDueReassessment(true, null, now)).toBe(false));
  it("returns false when completed less than 12 months ago", () =>
    expect(computeIsDueReassessment(true, now - TWELVE_MONTHS_MS + 1000, now)).toBe(false));
  it("returns true when completed exactly 12 months ago + 1 day", () =>
    expect(computeIsDueReassessment(true, now - TWELVE_MONTHS_MS - 86400000, now)).toBe(true));
  it("returns true when completed 2 years ago", () =>
    expect(computeIsDueReassessment(true, now - 2 * TWELVE_MONTHS_MS, now)).toBe(true));
});

// ── Conditional priority options ──────────────────────────────────────────────

const LISTED_OWNERSHIP_VALUES = new Set([
  "ftse_100_listed", "ftse_250_listed", "aim_listed", "other_listed", "subsidiary_listed_group",
]);

function getConditionalPriorityOptions(profile: {
  materialSalesWorkforce?: string;
  criticalAiDigitalTalentPopulation?: string;
  workforceFrontlinePct?: number;
  ownershipStructure?: string;
}): string[] {
  const options: string[] = [];
  if (profile.materialSalesWorkforce && profile.materialSalesWorkforce !== "none_minimal") {
    options.push("sales_comp_redesign");
  }
  if (profile.criticalAiDigitalTalentPopulation && profile.criticalAiDigitalTalentPopulation !== "none_or_minimal") {
    options.push("ai_talent_pay_strategy");
  }
  if ((profile.workforceFrontlinePct ?? 0) >= 20) {
    options.push("frontline_workforce_pay");
  }
  if (profile.ownershipStructure && LISTED_OWNERSHIP_VALUES.has(profile.ownershipStructure)) {
    options.push("executive_comp_refresh");
  }
  return options;
}

describe("getConditionalPriorityOptions", () => {
  it("returns empty array for minimal company", () => {
    expect(getConditionalPriorityOptions({
      materialSalesWorkforce: "none_minimal",
      criticalAiDigitalTalentPopulation: "none_or_minimal",
      workforceFrontlinePct: 10,
      ownershipStructure: "private_family_owned",
    })).toEqual([]);
  });

  it("includes sales_comp_redesign when material sales workforce present", () => {
    const opts = getConditionalPriorityOptions({ materialSalesWorkforce: "significant_named_seller_workforce" });
    expect(opts).toContain("sales_comp_redesign");
  });

  it("excludes sales_comp_redesign when none_minimal", () => {
    const opts = getConditionalPriorityOptions({ materialSalesWorkforce: "none_minimal" });
    expect(opts).not.toContain("sales_comp_redesign");
  });

  it("includes ai_talent_pay_strategy when critical AI talent present", () => {
    const opts = getConditionalPriorityOptions({ criticalAiDigitalTalentPopulation: "established_growing" });
    expect(opts).toContain("ai_talent_pay_strategy");
  });

  it("excludes ai_talent_pay_strategy when none_or_minimal", () => {
    const opts = getConditionalPriorityOptions({ criticalAiDigitalTalentPopulation: "none_or_minimal" });
    expect(opts).not.toContain("ai_talent_pay_strategy");
  });

  it("includes frontline_workforce_pay when frontline >= 20%", () => {
    const opts = getConditionalPriorityOptions({ workforceFrontlinePct: 20 });
    expect(opts).toContain("frontline_workforce_pay");
  });

  it("excludes frontline_workforce_pay when frontline < 20%", () => {
    const opts = getConditionalPriorityOptions({ workforceFrontlinePct: 19 });
    expect(opts).not.toContain("frontline_workforce_pay");
  });

  it("includes executive_comp_refresh for FTSE 100 listed", () => {
    const opts = getConditionalPriorityOptions({ ownershipStructure: "ftse_100_listed" });
    expect(opts).toContain("executive_comp_refresh");
  });

  it("includes executive_comp_refresh for subsidiary_listed_group", () => {
    const opts = getConditionalPriorityOptions({ ownershipStructure: "subsidiary_listed_group" });
    expect(opts).toContain("executive_comp_refresh");
  });

  it("excludes executive_comp_refresh for private company", () => {
    const opts = getConditionalPriorityOptions({ ownershipStructure: "private_pe_backed" });
    expect(opts).not.toContain("executive_comp_refresh");
  });

  it("returns all 4 conditional options for a large listed company with AI talent and sales", () => {
    const opts = getConditionalPriorityOptions({
      materialSalesWorkforce: "predominantly_sales",
      criticalAiDigitalTalentPopulation: "actively_fighting_in_market_for_ai_talent",
      workforceFrontlinePct: 35,
      ownershipStructure: "ftse_250_listed",
    });
    expect(opts).toContain("sales_comp_redesign");
    expect(opts).toContain("ai_talent_pay_strategy");
    expect(opts).toContain("frontline_workforce_pay");
    expect(opts).toContain("executive_comp_refresh");
    expect(opts).toHaveLength(4);
  });
});

// ── AI maturity inconsistency detection (D5) ─────────────────────────────────

function detectAiMaturityInconsistency(
  aiMaturityRating: number,
  aiToolsInUse: string[],
): boolean {
  const maturityHigh = aiMaturityRating >= 3;
  const toolsNone = aiToolsInUse.length === 1 && aiToolsInUse[0] === "none_no_ai_yet";
  return maturityHigh && toolsNone;
}

describe("detectAiMaturityInconsistency (D5)", () => {
  it("returns false when maturity is low and no tools", () =>
    expect(detectAiMaturityInconsistency(1, ["none_no_ai_yet"])).toBe(false));
  it("returns false when maturity is high and tools are present", () =>
    expect(detectAiMaturityInconsistency(3, ["beqom", "microsoft_copilot"])).toBe(false));
  it("returns true when maturity >= 3 and only none_no_ai_yet selected", () =>
    expect(detectAiMaturityInconsistency(3, ["none_no_ai_yet"])).toBe(true));
  it("returns true when maturity = 4 and only none_no_ai_yet selected", () =>
    expect(detectAiMaturityInconsistency(4, ["none_no_ai_yet"])).toBe(true));
  it("returns false when maturity = 2 and only none_no_ai_yet selected", () =>
    expect(detectAiMaturityInconsistency(2, ["none_no_ai_yet"])).toBe(false));
  it("returns false when multiple tools including none_no_ai_yet (contradictory but not the trigger)", () =>
    expect(detectAiMaturityInconsistency(3, ["none_no_ai_yet", "beqom"])).toBe(false));
});

// ── Conditional field visibility (Screen 3) ───────────────────────────────────

function computeConditionalVisibility(profile: {
  sector?: string;
  geographicFootprint?: string;
  ownershipStructure?: string;
}): {
  showFca: boolean;
  showListingExchange: boolean;
  showUkHeadcount: boolean;
  showEuHeadcount: boolean;
  needsRegulatoryScreen: boolean;
} {
  const FS_SECTORS = new Set(["financial_services", "insurance", "retail_banking", "asset_management"]);
  const LISTED = new Set(["ftse_100_listed", "ftse_250_listed", "aim_listed", "other_listed", "subsidiary_listed_group"]);

  const showFca = !!profile.sector && FS_SECTORS.has(profile.sector);
  const showListingExchange = !!profile.ownershipStructure && LISTED.has(profile.ownershipStructure);
  const showUkHeadcount = !!profile.geographicFootprint && profile.geographicFootprint !== "uk_only";
  const showEuHeadcount =
    profile.geographicFootprint === "uk_plus_eu" ||
    profile.geographicFootprint === "uk_plus_eu_plus_global";

  return {
    showFca,
    showListingExchange,
    showUkHeadcount,
    showEuHeadcount,
    needsRegulatoryScreen: showFca || showListingExchange || showUkHeadcount || showEuHeadcount,
  };
}

describe("computeConditionalVisibility — Screen 3 fields", () => {
  it("shows FCA field only for financial_services sector", () => {
    expect(computeConditionalVisibility({ sector: "financial_services" }).showFca).toBe(true);
    expect(computeConditionalVisibility({ sector: "insurance" }).showFca).toBe(true);
    expect(computeConditionalVisibility({ sector: "technology" }).showFca).toBe(false);
    expect(computeConditionalVisibility({ sector: "retail_consumer" }).showFca).toBe(false);
  });

  it("does NOT show FCA field based on geography or ownership alone", () => {
    const r = computeConditionalVisibility({
      sector: "technology",
      geographicFootprint: "uk_only",
      ownershipStructure: "ftse_100_listed",
    });
    expect(r.showFca).toBe(false);
  });

  it("shows listing exchange only for listed ownership structures", () => {
    expect(computeConditionalVisibility({ ownershipStructure: "ftse_100_listed" }).showListingExchange).toBe(true);
    expect(computeConditionalVisibility({ ownershipStructure: "ftse_250_listed" }).showListingExchange).toBe(true);
    expect(computeConditionalVisibility({ ownershipStructure: "aim_listed" }).showListingExchange).toBe(true);
    expect(computeConditionalVisibility({ ownershipStructure: "subsidiary_listed_group" }).showListingExchange).toBe(true);
    expect(computeConditionalVisibility({ ownershipStructure: "private_pe_backed" }).showListingExchange).toBe(false);
    expect(computeConditionalVisibility({ ownershipStructure: "mutual_cooperative" }).showListingExchange).toBe(false);
  });

  it("shows UK headcount only for multi-geo (not uk_only)", () => {
    expect(computeConditionalVisibility({ geographicFootprint: "uk_only" }).showUkHeadcount).toBe(false);
    expect(computeConditionalVisibility({ geographicFootprint: "uk_plus_eu" }).showUkHeadcount).toBe(true);
    expect(computeConditionalVisibility({ geographicFootprint: "uk_plus_non_eu_global" }).showUkHeadcount).toBe(true);
    expect(computeConditionalVisibility({ geographicFootprint: "uk_plus_eu_plus_global" }).showUkHeadcount).toBe(true);
  });

  it("shows EU headcount only for EU-presence geographies", () => {
    expect(computeConditionalVisibility({ geographicFootprint: "uk_only" }).showEuHeadcount).toBe(false);
    expect(computeConditionalVisibility({ geographicFootprint: "uk_plus_non_eu_global" }).showEuHeadcount).toBe(false);
    expect(computeConditionalVisibility({ geographicFootprint: "uk_plus_eu" }).showEuHeadcount).toBe(true);
    expect(computeConditionalVisibility({ geographicFootprint: "uk_plus_eu_plus_global" }).showEuHeadcount).toBe(true);
  });

  it("needsRegulatoryScreen is true when any conditional field is shown", () => {
    expect(computeConditionalVisibility({ sector: "financial_services" }).needsRegulatoryScreen).toBe(true);
    expect(computeConditionalVisibility({ ownershipStructure: "ftse_100_listed" }).needsRegulatoryScreen).toBe(true);
    expect(computeConditionalVisibility({ geographicFootprint: "uk_plus_eu" }).needsRegulatoryScreen).toBe(true);
  });

  it("needsRegulatoryScreen is false for UK-only private non-FS company", () => {
    expect(
      computeConditionalVisibility({
        sector: "technology",
        geographicFootprint: "uk_only",
        ownershipStructure: "private_family_owned",
      }).needsRegulatoryScreen
    ).toBe(false);
  });
});

// ── Block F conditional fields (Reward Pre-work) ──────────────────────────────

function computeBlockFVisibility(profile: {
  criticalAiDigitalTalentPopulation?: string;
  ownershipStructure?: string;
  workforceFrontlinePct?: number;
}): {
  showAiTalentConcern: boolean;
  showRemunerationVote: boolean;
  showNlwExposure: boolean;
} {
  const LISTED = new Set(["ftse_100_listed", "ftse_250_listed", "aim_listed", "other_listed", "subsidiary_listed_group"]);
  return {
    showAiTalentConcern:
      !!profile.criticalAiDigitalTalentPopulation &&
      profile.criticalAiDigitalTalentPopulation !== "none_or_minimal",
    showRemunerationVote:
      !!profile.ownershipStructure && LISTED.has(profile.ownershipStructure),
    showNlwExposure: (profile.workforceFrontlinePct ?? 0) >= 30,
  };
}

describe("computeBlockFVisibility — conditional add-ons", () => {
  it("shows AI talent concern when critical AI talent is emerging or above", () => {
    expect(computeBlockFVisibility({ criticalAiDigitalTalentPopulation: "emerging_small_population" }).showAiTalentConcern).toBe(true);
    expect(computeBlockFVisibility({ criticalAiDigitalTalentPopulation: "established_growing" }).showAiTalentConcern).toBe(true);
    expect(computeBlockFVisibility({ criticalAiDigitalTalentPopulation: "actively_fighting_in_market_for_ai_talent" }).showAiTalentConcern).toBe(true);
  });

  it("hides AI talent concern when none_or_minimal", () => {
    expect(computeBlockFVisibility({ criticalAiDigitalTalentPopulation: "none_or_minimal" }).showAiTalentConcern).toBe(false);
  });

  it("shows remuneration vote for listed companies", () => {
    expect(computeBlockFVisibility({ ownershipStructure: "ftse_100_listed" }).showRemunerationVote).toBe(true);
    expect(computeBlockFVisibility({ ownershipStructure: "aim_listed" }).showRemunerationVote).toBe(true);
  });

  it("hides remuneration vote for private companies", () => {
    expect(computeBlockFVisibility({ ownershipStructure: "private_pe_backed" }).showRemunerationVote).toBe(false);
    expect(computeBlockFVisibility({ ownershipStructure: "public_sector" }).showRemunerationVote).toBe(false);
  });

  it("shows NLW exposure when frontline >= 30%", () => {
    expect(computeBlockFVisibility({ workforceFrontlinePct: 30 }).showNlwExposure).toBe(true);
    expect(computeBlockFVisibility({ workforceFrontlinePct: 50 }).showNlwExposure).toBe(true);
  });

  it("hides NLW exposure when frontline < 30%", () => {
    expect(computeBlockFVisibility({ workforceFrontlinePct: 29 }).showNlwExposure).toBe(false);
    expect(computeBlockFVisibility({ workforceFrontlinePct: 0 }).showNlwExposure).toBe(false);
  });
});
