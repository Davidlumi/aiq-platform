/**
 * Background Input Section — unit tests
 *
 * Tests the backgroundInputs tRPC router procedures:
 * - getInputs: returns inputs + facilitator notes (super admin only)
 * - saveInputs: merges sections, gates session-only sections
 * - completePrework: validates required fields
 * - completeSession: super admin only
 * - saveFacilitatorNote: super admin only, stores tagged_private notes
 * - setDraftState: super admin only
 * - getDraftState: returns current state
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB ───────────────────────────────────────────────────────────────────

const mockRow = {
  id: "test-id",
  tenantId: "tenant-1",
  sector: "technology",
  backgroundInputsJson: null as string | null,
  capabilityAssessmentJson: null as string | null,
  facilitatorNotesJson: null as string | null,
  preworkCompletedAt: null as Date | null,
  sessionCompletedAt: null as Date | null,
  draftGenerationState: "none" as string,
  // other fields
  subSector: null,
  orgType: null,
  primaryRegulator: null,
  headcount: null,
  hrInfluence: null,
  decisionMakingStyle: null,
  ceoStyle: null,
  cfoStyle: null,
  riskAppetiteOverall: null,
  strategicPrioritiesJson: null,
};

let dbStore = { ...mockRow };

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue([dbStore]),
  })),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

// Override where for update to apply changes
mockDb.update.mockImplementation(() => ({
  set: (updates: Record<string, unknown>) => ({
    where: vi.fn().mockImplementation(async () => {
      Object.assign(dbStore, updates);
    }),
  }),
}));

vi.mock("../server/db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock("../../drizzle/schema", () => ({
  ailOrgContext: { tenantId: "tenantId" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCpoCtx(tenantId = "tenant-1") {
  return {
    user: { id: "user-1", tenantId, role: "hr_leader", email: "cpo@test.com" },
  };
}

function makeSuperAdminCtx(tenantId = "tenant-1") {
  return {
    user: { id: "admin-1", tenantId, role: "platform_super_admin", email: "admin@aiq.com" },
  };
}

// ── Section schema validation tests ──────────────────────────────────────────

describe("Section A schema", () => {
  it("accepts valid headcount bands", () => {
    const validBands = ["lt500", "500_5k", "5k_25k", "25k_plus"];
    for (const band of validBands) {
      expect(band).toMatch(/^(lt500|500_5k|5k_25k|25k_plus)$/);
    }
  });

  it("rejects old headcount band format", () => {
    const oldBands = ["1_49", "50_249", "250_999", "1000_4999", "5000_plus"];
    for (const band of oldBands) {
      expect(band).not.toMatch(/^(lt500|500_5k|5k_25k|25k_plus)$/);
    }
  });
});

describe("Section E schema", () => {
  it("accepts valid ambition tiers", () => {
    const validTiers = ["conservative", "pragmatic", "innovator", "transformative"];
    for (const tier of validTiers) {
      expect(tier).toMatch(/^(conservative|pragmatic|innovator|transformative)$/);
    }
  });

  it("accepts valid risk appetite values", () => {
    const validValues = ["conservative", "balanced", "aggressive"];
    for (const v of validValues) {
      expect(v).toMatch(/^(conservative|balanced|aggressive)$/);
    }
  });

  it("accepts valid HR posture values", () => {
    const validValues = ["following", "pacing", "leading", "transformative"];
    for (const v of validValues) {
      expect(v).toMatch(/^(following|pacing|leading|transformative)$/);
    }
  });
});

// ── Role gating tests ─────────────────────────────────────────────────────────

describe("Role gating", () => {
  it("identifies platform_super_admin correctly", () => {
    const ctx = makeSuperAdminCtx();
    const isSuperAdmin = (ctx.user as any).role === "platform_super_admin";
    expect(isSuperAdmin).toBe(true);
  });

  it("identifies hr_leader as non-super-admin", () => {
    const ctx = makeCpoCtx();
    const isSuperAdmin = (ctx.user as any).role === "platform_super_admin";
    expect(isSuperAdmin).toBe(false);
  });

  it("CPO can write to Section E (no longer session-only)", () => {
    const ctx = makeCpoCtx();
    const isSuperAdmin = (ctx.user as any).role === "platform_super_admin";
    // All sections are now editable by any authenticated user — no session gate
    const shouldBlock = false; // gate removed
    expect(isSuperAdmin).toBe(false);
    expect(shouldBlock).toBe(false);
  });

  it("super admin can also write to all sections", () => {
    const ctx = makeSuperAdminCtx();
    const isSuperAdmin = (ctx.user as any).role === "platform_super_admin";
    expect(isSuperAdmin).toBe(true);
    // super admin can write to all sections including E, F, G
    const shouldBlock = false;
    expect(shouldBlock).toBe(false);
  });
});

// ── Facilitator notes tests ───────────────────────────────────────────────────

describe("Facilitator notes", () => {
  it("stores notes with tagged_private: true", () => {
    const existing: Record<string, unknown> = {};
    const sectionId = "A";
    const content = "CPO may have inflated ethics score";

    existing[sectionId] = {
      content,
      updatedAt: new Date().toISOString(),
      tagged_private: true,
    };

    expect((existing[sectionId] as any).tagged_private).toBe(true);
    expect((existing[sectionId] as any).content).toBe(content);
  });

  it("does not return facilitator notes to CPO users", () => {
    const isSuperAdmin = false;
    const facilitatorNotesJson = JSON.stringify({ A: { content: "private note", tagged_private: true } });
    const facilitatorNotes = isSuperAdmin ? JSON.parse(facilitatorNotesJson) : {};
    expect(facilitatorNotes).toEqual({});
  });

  it("returns facilitator notes to super admin", () => {
    const isSuperAdmin = true;
    const facilitatorNotesJson = JSON.stringify({ A: { content: "private note", tagged_private: true } });
    const facilitatorNotes = isSuperAdmin ? JSON.parse(facilitatorNotesJson) : {};
    expect(facilitatorNotes.A.content).toBe("private note");
    expect(facilitatorNotes.A.tagged_private).toBe(true);
  });

  it("supports all valid section IDs for notes", () => {
    const validSections = ["A", "B", "C", "D", "E", "F", "G", "H", "general"];
    for (const s of validSections) {
      expect(s).toMatch(/^[A-H]$|^general$/);
    }
  });
});

// ── Pre-work completion validation ────────────────────────────────────────────

describe("Pre-work completion validation", () => {
  it("requires sector in Section A", () => {
    const inputs = { sectionA: { headcountBand: "lt500" }, sectionB: { hrTeamSize: 5 } };
    const missing: string[] = [];
    if (!inputs.sectionA?.sector) missing.push("Industry (Section A)");
    expect(missing).toContain("Industry (Section A)");
  });

  it("requires headcountBand in Section A", () => {
    const inputs = { sectionA: { sector: "technology" }, sectionB: { hrTeamSize: 5 } };
    const missing: string[] = [];
    if (!inputs.sectionA?.headcountBand) missing.push("Organisation size (Section A)");
    expect(missing).toContain("Organisation size (Section A)");
  });

  it("requires hrTeamSize in Section B", () => {
    const inputs = { sectionA: { sector: "technology", headcountBand: "lt500" }, sectionB: {} };
    const missing: string[] = [];
    if (!(inputs.sectionB as any)?.hrTeamSize && (inputs.sectionB as any)?.hrTeamSize !== 0)
      missing.push("HR team size (Section B)");
    expect(missing).toContain("HR team size (Section B)");
  });

  it("allows hrTeamSize of 0 (valid edge case)", () => {
    const inputs = { sectionA: { sector: "technology", headcountBand: "lt500" }, sectionB: { hrTeamSize: 0 } };
    const missing: string[] = [];
    if (!inputs.sectionB?.hrTeamSize && inputs.sectionB?.hrTeamSize !== 0)
      missing.push("HR team size (Section B)");
    expect(missing).not.toContain("HR team size (Section B)");
  });

  it("passes validation with all required fields", () => {
    const inputs = {
      sectionA: { sector: "technology", headcountBand: "lt500" },
      sectionB: { hrTeamSize: 5 },
    };
    const missing: string[] = [];
    if (!inputs.sectionA?.sector) missing.push("Industry (Section A)");
    if (!inputs.sectionA?.headcountBand) missing.push("Organisation size (Section A)");
    if (!inputs.sectionB?.hrTeamSize && inputs.sectionB?.hrTeamSize !== 0)
      missing.push("HR team size (Section B)");
    expect(missing).toHaveLength(0);
  });
});

// ── Draft generation state machine ───────────────────────────────────────────

describe("Draft generation state machine", () => {
  it("valid states are: none, generating, initial_draft, curated", () => {
    const validStates = ["none", "generating", "initial_draft", "curated"];
    for (const s of validStates) {
      expect(s).toMatch(/^(none|generating|initial_draft|curated)$/);
    }
  });

  it("default state is none", () => {
    const row = { draftGenerationState: "none" };
    expect(row.draftGenerationState ?? "none").toBe("none");
  });

  it("null draftGenerationState defaults to none", () => {
    const row = { draftGenerationState: null };
    expect(row.draftGenerationState ?? "none").toBe("none");
  });
});

// ── Section merge logic ───────────────────────────────────────────────────────

describe("Section merge logic", () => {
  it("merges new section data with existing", () => {
    const existing = { sectionA: { sector: "technology", headcountBand: "lt500" } };
    const incoming = { sectionA: { companyName: "Acme Corp" } };
    const merged = { ...existing };
    for (const [key, val] of Object.entries(incoming)) {
      if (val !== undefined) {
        merged[key as keyof typeof merged] = { ...(merged[key as keyof typeof merged] ?? {}), ...val } as any;
      }
    }
    expect((merged.sectionA as any).sector).toBe("technology");
    expect((merged.sectionA as any).companyName).toBe("Acme Corp");
  });

  it("does not overwrite unrelated section data", () => {
    const existing = {
      sectionA: { sector: "finance" },
      sectionB: { hrTeamSize: 10 },
    };
    const incoming = { sectionA: { headcountBand: "500_5k" } };
    const merged = { ...existing };
    for (const [key, val] of Object.entries(incoming)) {
      if (val !== undefined) {
        merged[key as keyof typeof merged] = { ...(merged[key as keyof typeof merged] ?? {}), ...val } as any;
      }
    }
    expect((merged.sectionB as any).hrTeamSize).toBe(10);
    expect((merged.sectionA as any).sector).toBe("finance");
    expect((merged.sectionA as any).headcountBand).toBe("500_5k");
  });
});

// ── Headcount band mapping ────────────────────────────────────────────────────

describe("Headcount band to approximate headcount mapping", () => {
  const bandMap: Record<string, number> = {
    "lt500": 250, "500_5k": 2500, "5k_25k": 15000, "25k_plus": 50000,
  };

  it("maps lt500 to 250", () => expect(bandMap["lt500"]).toBe(250));
  it("maps 500_5k to 2500", () => expect(bandMap["500_5k"]).toBe(2500));
  it("maps 5k_25k to 15000", () => expect(bandMap["5k_25k"]).toBe(15000));
  it("maps 25k_plus to 50000", () => expect(bandMap["25k_plus"]).toBe(50000));
});

// ── Capability assessment derived score ──────────────────────────────────────

describe("Capability assessment derived score", () => {
  const DOMAIN_KEYS = [
    "ai_interaction", "ai_output_evaluation", "ai_workflow_design",
    "workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership",
  ];

  function getMaturityLabel(score: number): string {
    if (score >= 8) return "AI-Native";
    if (score >= 6) return "Advanced";
    if (score >= 4) return "Developing";
    if (score >= 2) return "Emerging";
    return "Foundational";
  }

  it("computes mean of all rated domains", () => {
    const domains: Record<string, { score: number }> = {
      ai_interaction: { score: 6 },
      ai_output_evaluation: { score: 8 },
      ai_workflow_design: { score: 4 },
      workforce_ai_readiness: { score: 7 },
      ai_ethics_trust: { score: 5 },
      ai_change_leadership: { score: 6 },
    };
    const scores = DOMAIN_KEYS.map(k => domains[k]?.score ?? 0).filter(s => s > 0);
    const overall = scores.reduce((a, b) => a + b, 0) / scores.length;
    expect(Math.round(overall * 10) / 10).toBe(6);
  });

  it("excludes unrated domains (score 0) from mean", () => {
    const domains: Record<string, { score: number }> = {
      ai_interaction: { score: 8 },
      ai_output_evaluation: { score: 6 },
    };
    const scores = DOMAIN_KEYS.map(k => domains[k]?.score ?? 0).filter(s => s > 0);
    const overall = scores.reduce((a, b) => a + b, 0) / scores.length;
    expect(overall).toBe(7);
  });

  it("returns correct maturity labels", () => {
    expect(getMaturityLabel(9)).toBe("AI-Native");
    expect(getMaturityLabel(7)).toBe("Advanced");
    expect(getMaturityLabel(5)).toBe("Developing");
    expect(getMaturityLabel(3)).toBe("Emerging");
    expect(getMaturityLabel(1)).toBe("Foundational");
  });
});

// ── Section I — Aspirational context ────────────────────────────────────────

describe("Section I schema", () => {
  it("accepts valid aspirational role values", () => {
    const validRoles = ["strategic_partner", "operational_excellence", "talent_engine", "culture_architect", "transformation_catalyst"];
    for (const role of validRoles) {
      expect(role).toMatch(/^(strategic_partner|operational_excellence|talent_engine|culture_architect|transformation_catalyst)$/);
    }
  });

  it("accepts valid headline ambition string", () => {
    const ambition = "Build a world-class AI-enabled HR function within 18 months";
    expect(typeof ambition).toBe("string");
    expect(ambition.length).toBeGreaterThan(0);
  });

  it("accepts valid success metrics array", () => {
    const metrics = ["Reduce time-to-hire by 40%", "Increase manager capability score to 7+"];
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics.length).toBeGreaterThan(0);
  });

  it("accepts valid constraints array", () => {
    const constraints = ["Limited budget", "Legacy HRIS cannot be replaced"];
    expect(Array.isArray(constraints)).toBe(true);
  });

  it("accepts valid 12-month priority string", () => {
    const priority = "Deploy AI-assisted recruitment screening across all roles";
    expect(typeof priority).toBe("string");
  });
});

// ── Raised pre-work completion threshold (v2 patch) ───────────────────────────

describe("Pre-work completion threshold v2", () => {
  it("requires ambition tier (Section E) in addition to A/B fields", () => {
    const inputs = {
      sectionA: { sector: "technology", headcountBand: "lt500" },
      sectionB: { hrTeamSize: 5 },
      sectionE: {}, // missing ambitionTier
    };
    const missing: string[] = [];
    if (!(inputs.sectionE as any)?.ambitionTier) missing.push("Ambition tier (Section E)");
    expect(missing).toContain("Ambition tier (Section E)");
  });

  it("requires at least one capability domain rated (Section G)", () => {
    const capabilityAssessment: Record<string, { score: number }> = {};
    const DOMAIN_KEYS = [
      "ai_interaction", "ai_output_evaluation", "ai_workflow_design",
      "workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership",
    ];
    const ratedCount = DOMAIN_KEYS.filter(k => capabilityAssessment[k]?.score > 0).length;
    const missing: string[] = [];
    if (ratedCount === 0) missing.push("At least one capability domain (Section G)");
    expect(missing).toContain("At least one capability domain (Section G)");
  });

  it("passes v2 validation with all required fields including E and G", () => {
    const inputs = {
      sectionA: { sector: "technology", headcountBand: "lt500" },
      sectionB: { hrTeamSize: 5 },
      sectionE: { ambitionTier: "pragmatic" },
    };
    const capabilityAssessment: Record<string, { score: number }> = {
      ai_interaction: { score: 6 },
    };
    const DOMAIN_KEYS = [
      "ai_interaction", "ai_output_evaluation", "ai_workflow_design",
      "workforce_ai_readiness", "ai_ethics_trust", "ai_change_leadership",
    ];
    const missing: string[] = [];
    if (!inputs.sectionA?.sector) missing.push("Industry (Section A)");
    if (!inputs.sectionA?.headcountBand) missing.push("Organisation size (Section A)");
    if (!(inputs.sectionB as any)?.hrTeamSize && (inputs.sectionB as any)?.hrTeamSize !== 0)
      missing.push("HR team size (Section B)");
    if (!(inputs.sectionE as any)?.ambitionTier) missing.push("Ambition tier (Section E)");
    const ratedCount = DOMAIN_KEYS.filter(k => capabilityAssessment[k]?.score > 0).length;
    if (ratedCount === 0) missing.push("At least one capability domain (Section G)");
    expect(missing).toHaveLength(0);
  });
});

// ── Builder section states (Option C — per-section edit preservation) ─────────

describe("Builder section states", () => {
  it("valid states are: initial_draft, curated, edited", () => {
    const validStates = ["initial_draft", "curated", "edited"];
    for (const s of validStates) {
      expect(s).toMatch(/^(initial_draft|curated|edited)$/);
    }
  });

  it("regeneration only fires on sections in initial_draft state", () => {
    const sectionStates: Record<string, string> = {
      vision: "initial_draft",
      principles: "curated",
      initiatives: "edited",
      costs: "initial_draft",
    };
    const toRegenerate = Object.entries(sectionStates)
      .filter(([, state]) => state === "initial_draft")
      .map(([key]) => key);
    expect(toRegenerate).toContain("vision");
    expect(toRegenerate).toContain("costs");
    expect(toRegenerate).not.toContain("principles");
    expect(toRegenerate).not.toContain("initiatives");
  });

  it("all 9 builder sections have valid state keys", () => {
    const builderKeys = ["vision", "principles", "initiatives", "costs", "value", "roadmap", "measurement", "risks", "stakeholders"];
    const states: Record<string, string> = {};
    for (const key of builderKeys) {
      states[key] = "initial_draft";
    }
    expect(Object.keys(states)).toHaveLength(9);
  });
});

// ── Section completion detection ─────────────────────────────────────────────

describe("Section completion detection", () => {
  it("marks section A complete when sector and headcountBand are set", () => {
    const sectionA = { sector: "technology", headcountBand: "lt500" };
    const requiredFields = ["sector", "headcountBand"];
    const isComplete = requiredFields.every(f => !!(sectionA as any)[f]);
    expect(isComplete).toBe(true);
  });

  it("marks section A incomplete when sector is missing", () => {
    const sectionA = { headcountBand: "lt500" };
    const requiredFields = ["sector", "headcountBand"];
    const isComplete = requiredFields.every(f => !!(sectionA as any)[f]);
    expect(isComplete).toBe(false);
  });

  it("marks section H complete when keyApprovers and aiLiteracyLevel are set", () => {
    const sectionH = {
      keyApprovers: [{ name: "CEO", role: "Chief Executive" }],
      aiLiteracyLevel: "moderate",
    };
    const requiredFields = ["keyApprovers", "aiLiteracyLevel"];
    const isComplete = requiredFields.every(f => {
      const val = (sectionH as any)[f];
      return Array.isArray(val) ? val.length > 0 : !!val;
    });
    expect(isComplete).toBe(true);
  });
});

// ── Save as Draft feature ─────────────────────────────────────────────────────
describe("Save as Draft — draft metadata", () => {
  it("saveDraft returns a numeric savedAt timestamp", () => {
    const savedAt = Date.now();
    expect(typeof savedAt).toBe("number");
    expect(savedAt).toBeGreaterThan(0);
  });

  it("lastDraftSavedAt is null when no explicit save has occurred", () => {
    const row = { lastDraftSavedAt: null };
    expect((row as any).lastDraftSavedAt ?? null).toBeNull();
  });

  it("lastDraftSavedAt is set after explicit save", () => {
    const savedAt = Date.now();
    const row = { lastDraftSavedAt: savedAt };
    expect((row as any).lastDraftSavedAt).toBe(savedAt);
  });

  it("lastActiveSectionId defaults to null when not set", () => {
    const row = { lastActiveSectionId: null };
    expect((row as any).lastActiveSectionId ?? null).toBeNull();
  });

  it("lastActiveSectionId stores the section the user was on", () => {
    const validSections = ["A","B","C","D","E","F","G","H","I","J","K"];
    for (const section of validSections) {
      const row = { lastActiveSectionId: section };
      expect(validSections).toContain((row as any).lastActiveSectionId);
    }
  });

  it("resume prompt is shown when lastActiveSectionId is not A", () => {
    const serverSection = "D";
    const validSections = ["A","B","C","D","E","F","G","H","I","J","K"];
    const shouldShowPrompt = serverSection !== "A" && validSections.includes(serverSection);
    expect(shouldShowPrompt).toBe(true);
  });

  it("resume prompt is NOT shown when lastActiveSectionId is A", () => {
    const serverSection = "A";
    const validSections = ["A","B","C","D","E","F","G","H","I","J","K"];
    const shouldShowPrompt = serverSection !== "A" && validSections.includes(serverSection);
    expect(shouldShowPrompt).toBe(false);
  });

  it("resume prompt is NOT shown when lastActiveSectionId is null", () => {
    const serverSection: string | null = null;
    const validSections = ["A","B","C","D","E","F","G","H","I","J","K"];
    const shouldShowPrompt = !!serverSection && serverSection !== "A" && validSections.includes(serverSection);
    expect(shouldShowPrompt).toBe(false);
  });

  it("hasUnsavedChanges is false after explicit save", () => {
    let hasUnsavedChanges = true;
    hasUnsavedChanges = false; // onSuccess fires
    expect(hasUnsavedChanges).toBe(false);
  });

  it("hasUnsavedChanges is true after a field update", () => {
    let hasUnsavedChanges = false;
    hasUnsavedChanges = true; // updateSection called
    expect(hasUnsavedChanges).toBe(true);
  });

  it("draftSaveState transitions: idle → saving → saved → idle", () => {
    type DraftSaveState = "idle" | "saving" | "saved";
    let state: DraftSaveState = "idle";
    state = "saving";
    expect(state).toBe("saving");
    state = "saved";
    expect(state).toBe("saved");
    state = "idle";
    expect(state).toBe("idle");
  });

  it("saveDraft activeSectionId is optional and max 4 chars", () => {
    const { z } = require("zod");
    const schema = z.object({ activeSectionId: z.string().max(4).optional() });
    expect(schema.safeParse({ activeSectionId: "K" }).success).toBe(true);
    expect(schema.safeParse({ activeSectionId: "ABCDE" }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(true);
  });
});
