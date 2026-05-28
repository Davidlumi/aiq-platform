/**
 * Fix 12 — Reward Taxonomy Canonical Test
 *
 * Mirrors the role of Test A (canonical-facts.test.ts) for the assessment domain taxonomy,
 * but for the reward capability dimension taxonomy.
 *
 * Invariants locked here:
 *  1. CAPABILITY_DIMENSIONS has exactly 5 entries
 *  2. All 5 expected keys are present (no legacy "governance" key)
 *  3. DIMENSION_META has a label and description for every CAPABILITY_DIMENSIONS value
 *  4. capabilityLinkConfig dimensionMappings covers all 5 dimensions
 *  5. Each dimensionMapping entry has at least one domain with a positive weight
 *  6. No legacy key ("governance") appears in any of the above
 *
 * If any of these fail, a taxonomy change was made without updating this test.
 */

import { describe, it, expect } from "vitest";
import {
  CAPABILITY_DIMENSIONS,
  DIMENSION_META,
} from "./services/rewardCapabilityService";
import { CAPABILITY_LINK_CONFIG } from "./services/capabilityLinkConfig";

const EXPECTED_DIMENSIONS = [
  "data_foundations",
  "change_management",
  "systems_integration",
  "reward_governance",
  "team_skills",
] as const;

const LEGACY_KEY = "governance"; // must never appear as a dimension key

describe("Reward Taxonomy Canonical (Fix 12)", () => {
  it("CAPABILITY_DIMENSIONS has exactly 5 entries", () => {
    expect(CAPABILITY_DIMENSIONS).toHaveLength(5);
  });

  it("CAPABILITY_DIMENSIONS contains all 5 expected keys", () => {
    for (const key of EXPECTED_DIMENSIONS) {
      expect(CAPABILITY_DIMENSIONS).toContain(key);
    }
  });

  it("CAPABILITY_DIMENSIONS does not contain the legacy 'governance' key", () => {
    expect(CAPABILITY_DIMENSIONS).not.toContain(LEGACY_KEY);
  });

  it("DIMENSION_META has a label and description for every CAPABILITY_DIMENSIONS value", () => {
    for (const dim of CAPABILITY_DIMENSIONS) {
      const meta = DIMENSION_META[dim];
      expect(meta, `DIMENSION_META missing entry for '${dim}'`).toBeDefined();
      expect(meta.label, `DIMENSION_META['${dim}'].label is empty`).toBeTruthy();
      expect(meta.description, `DIMENSION_META['${dim}'].description is empty`).toBeTruthy();
    }
  });

  it("DIMENSION_META does not have a legacy 'governance' key", () => {
    expect(Object.keys(DIMENSION_META)).not.toContain(LEGACY_KEY);
  });

  it("capabilityLinkConfig.dimensionMappings covers all 5 dimensions", () => {
    const mappingKeys = Object.keys(CAPABILITY_LINK_CONFIG.dimensionMappings);
    for (const dim of EXPECTED_DIMENSIONS) {
      expect(mappingKeys, `dimensionMappings missing entry for '${dim}'`).toContain(dim);
    }
  });

  it("capabilityLinkConfig.dimensionMappings does not have a legacy 'governance' key", () => {
    expect(Object.keys(CAPABILITY_LINK_CONFIG.dimensionMappings)).not.toContain(LEGACY_KEY);
  });

  it("every dimensionMapping entry has at least one domain with a positive weight", () => {
    for (const dim of EXPECTED_DIMENSIONS) {
      const mapping = CAPABILITY_LINK_CONFIG.dimensionMappings[dim];
      if (!mapping) continue; // already caught above
      const positiveWeights = mapping.domains.filter((d) => d.weight > 0);
      expect(
        positiveWeights.length,
        `dimensionMappings['${dim}'].domains has no positive-weight entries`
      ).toBeGreaterThan(0);
    }
  });

  it("capabilityLinkConfig has exactly 5 dimensionMappings entries", () => {
    expect(Object.keys(CAPABILITY_LINK_CONFIG.dimensionMappings)).toHaveLength(5);
  });
});
