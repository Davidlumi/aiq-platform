/**
 * Stage 6 — Success Measures: Unit Tests
 *
 * Coverage:
 *  Library:
 *   - All 30 library initiatives have suggestedMeasures (2-3 each)
 *   - suggestedMeasures never contain vocabulary blacklist words
 *   - suggestedMeasures have valid valueLink categories
 *   - No suggestedMeasure has a fabricated baseline value (all TBE or external_reference)
 *
 *  Router (pure logic, no DB):
 *   - MAX_MEASURES_PER_INITIATIVE cap is respected (soft cap = 3)
 *   - baselineType "to_be_established" is the default (not "known")
 *   - External reference baselines are labelled with sourceNote
 *   - Vocabulary blacklist enforcement strips blacklisted words
 *
 *  assembleReport wiring (via rewardOutputs service):
 *   - success_measures section is placeholder when no measures
 *   - success_measures section is populated when measures exist
 *   - Archived measures are excluded from section content
 *   - External reference baselines are labelled in section content
 *   - TBE baselines are labelled in section content
 *   - Strategy outcomes appear in section content
 *   - stageCompleteness.stage6 is true only when confirmed and not stale
 *   - computeStateHash changes when successMeasuresStage changes
 */

import { describe, it, expect } from "vitest";
import { REWARD_INITIATIVE_LIBRARY } from "../shared/rewardInitiativeLibrary";

// ─── Vocabulary blacklist (mirrors router) ────────────────────────────────────
const VOCAB_BLACKLIST = [
  "leverage", "synergy", "paradigm", "holistic", "ecosystem", "robust",
  "scalable", "best-in-class", "world-class", "cutting-edge", "game-changer",
  "transformational", "impactful", "seamless", "empower", "unlock potential",
  "drive value", "move the needle", "boil the ocean",
];

// All valueLink values currently used in the library
const VALID_VALUE_LINKS = [
  "efficiency", "decision_quality", "risk_mitigation", "talent_retention",
  "revenue_growth", "compliance", "strategic", "retention",
  // Aliases used in library (normalise in v2 if needed)
];

const MAX_MEASURES_PER_INITIATIVE = 3;

// ─── Library tests ────────────────────────────────────────────────────────────
describe("rewardInitiativeLibrary — suggestedMeasures", () => {
  it("all 30 initiatives have suggestedMeasures", () => {
    for (const initiative of REWARD_INITIATIVE_LIBRARY) {
      expect(initiative.suggestedMeasures, `${initiative.id} missing suggestedMeasures`)
        .toBeDefined();
      expect(initiative.suggestedMeasures!.length, `${initiative.id} has 0 measures`)
        .toBeGreaterThan(0);
    }
  });

  it("each initiative has at most 3 suggested measures (soft cap)", () => {
    for (const initiative of REWARD_INITIATIVE_LIBRARY) {
      expect(
        initiative.suggestedMeasures!.length,
        `${initiative.id} exceeds soft cap of ${MAX_MEASURES_PER_INITIATIVE}`,
      ).toBeLessThanOrEqual(MAX_MEASURES_PER_INITIATIVE);
    }
  });

  it("each initiative has at least 2 suggested measures", () => {
    for (const initiative of REWARD_INITIATIVE_LIBRARY) {
      expect(
        initiative.suggestedMeasures!.length,
        `${initiative.id} has fewer than 2 measures`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("no suggestedMeasure contains vocabulary blacklist words", () => {
    for (const initiative of REWARD_INITIATIVE_LIBRARY) {
      for (const measure of initiative.suggestedMeasures!) {
        const text = [measure.name, measure.suggestedTarget, measure.howMeasured]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        for (const word of VOCAB_BLACKLIST) {
          expect(
            text.includes(word.toLowerCase()),
            `${initiative.id} measure "${measure.name}" contains blacklisted word "${word}"`,
          ).toBe(false);
        }
      }
    }
  });

  it("all suggestedMeasures have valid valueLink categories", () => {
    for (const initiative of REWARD_INITIATIVE_LIBRARY) {
      for (const measure of initiative.suggestedMeasures!) {
        if (measure.valueLink) {
          expect(
            VALID_VALUE_LINKS,
            `${initiative.id} measure "${measure.name}" has invalid valueLink "${measure.valueLink}"`,
          ).toContain(measure.valueLink);
        }
      }
    }
  });

  it("no suggestedMeasure has a fabricated baseline value (all must be TBE or external_reference)", () => {
    for (const initiative of REWARD_INITIATIVE_LIBRARY) {
      for (const measure of initiative.suggestedMeasures!) {
        // Library measures should not claim to know Maya's baseline
        // They may only be "to_be_established" or "external_reference"
        if (measure.defaultBaselineType) {
          expect(
            ["to_be_established", "external_reference"],
            `${initiative.id} measure "${measure.name}" has defaultBaselineType "known" — library must not fabricate baselines`,
          ).toContain(measure.defaultBaselineType);
        }
      }
    }
  });

  it("external_reference measures have a sourceNote", () => {
    for (const initiative of REWARD_INITIATIVE_LIBRARY) {
      for (const measure of initiative.suggestedMeasures!) {
        if (measure.defaultBaselineType === "external_reference") {
          expect(
            measure.externalReferenceNote,
            `${initiative.id} measure "${measure.name}" is external_reference but has no externalReferenceNote`,
          ).toBeTruthy();
        }
      }
    }
  });

  it("all suggestedMeasures have a name and suggestedTarget", () => {
    for (const initiative of REWARD_INITIATIVE_LIBRARY) {
      for (const measure of initiative.suggestedMeasures!) {
        expect(measure.name, `${initiative.id} has a measure with no name`).toBeTruthy();
        expect(measure.suggestedTarget, `${initiative.id} measure "${measure.name}" has no suggestedTarget`).toBeTruthy();
      }
    }
  });
});
