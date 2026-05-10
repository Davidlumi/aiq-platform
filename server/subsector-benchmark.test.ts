/**
 * Tests for sub-sector benchmark resolution via sectorTaxonomy helpers.
 * Validates that getEffectiveBenchmark and getSubSectors work correctly
 * across all sector/sub-sector combinations.
 */
import { describe, it, expect } from "vitest";
import {
  getEffectiveBenchmark,
  getSubSectors,
  getSubSectorLabel,
  SUB_SECTOR_BENCHMARKS,
  SUB_SECTOR_TAXONOMY,
} from "../shared/sectorTaxonomy";

// Mirror the SECTOR_BENCHMARKS from companyAssessment.ts for testing
const SECTOR_BENCHMARKS: Record<string, number> = {
  "Financial Services": 3.1,
  "Technology": 3.6,
  "Healthcare": 2.4,
  "Education": 2.2,
  "Professional Services": 2.9,
  "Retail": 2.3,
  "Manufacturing": 2.1,
  "Public Sector": 1.9,
  "Energy & Utilities": 2.5,
  "Media & Entertainment": 2.8,
  "Other": 2.5,
};

describe("getEffectiveBenchmark", () => {
  it("returns sub-sector benchmark when sub-sector is known", () => {
    const result = getEffectiveBenchmark(SECTOR_BENCHMARKS, "financial_services", "fintech");
    expect(result).toBe(SUB_SECTOR_BENCHMARKS["fintech"]);
    expect(result).toBe(3.8);
  });

  it("returns sub-sector benchmark for ai_data sub-sector", () => {
    const result = getEffectiveBenchmark(SECTOR_BENCHMARKS, "technology", "ai_data");
    expect(result).toBe(4.2);
  });

  it("falls back to sector-level benchmark when sub-sector is null", () => {
    const result = getEffectiveBenchmark(SECTOR_BENCHMARKS, "financial_services", null);
    expect(result).toBe(3.1);
  });

  it("falls back to sector-level benchmark when sub-sector is undefined", () => {
    const result = getEffectiveBenchmark(SECTOR_BENCHMARKS, "technology", undefined);
    expect(result).toBe(3.6);
  });

  it("falls back to sector-level benchmark when sub-sector is unknown", () => {
    const result = getEffectiveBenchmark(SECTOR_BENCHMARKS, "healthcare", "unknown_sub");
    expect(result).toBe(2.4);
  });

  it("falls back to global default 2.5 for unknown sector with no sub-sector", () => {
    const result = getEffectiveBenchmark(SECTOR_BENCHMARKS, "other", null);
    expect(result).toBe(2.5);
  });

  it("returns sub-sector benchmark for public sector sub-sectors", () => {
    const result = getEffectiveBenchmark(SECTOR_BENCHMARKS, "public_sector", "higher_education");
    expect(result).toBe(2.4);
  });

  it("returns sub-sector benchmark for energy sub-sectors", () => {
    const result = getEffectiveBenchmark(SECTOR_BENCHMARKS, "energy_utilities", "renewables");
    expect(result).toBe(2.7);
  });

  it("returns sub-sector benchmark for media sub-sectors", () => {
    const result = getEffectiveBenchmark(SECTOR_BENCHMARKS, "media_entertainment", "gaming");
    expect(result).toBe(3.3);
  });
});

describe("getSubSectors", () => {
  it("returns sub-sectors for financial_services", () => {
    const subs = getSubSectors("financial_services");
    expect(subs.length).toBeGreaterThan(0);
    expect(subs.map(s => s.value)).toContain("fintech");
  });

  it("returns empty array for 'other' sector", () => {
    const subs = getSubSectors("other");
    expect(subs).toEqual([]);
  });

  it("returns sub-sectors for energy_utilities", () => {
    const subs = getSubSectors("energy_utilities");
    expect(subs.map(s => s.value)).toContain("renewables");
    expect(subs.map(s => s.value)).toContain("oil_gas");
  });

  it("returns sub-sectors for media_entertainment", () => {
    const subs = getSubSectors("media_entertainment");
    expect(subs.map(s => s.value)).toContain("gaming");
    expect(subs.map(s => s.value)).toContain("broadcasting_streaming");
  });

  it("returns empty array for unknown sector", () => {
    const subs = getSubSectors("nonexistent_sector");
    expect(subs).toEqual([]);
  });
});

describe("getSubSectorLabel", () => {
  it("returns display label for known sub-sector", () => {
    expect(getSubSectorLabel("technology", "saas_cloud")).toBe("SaaS / Cloud");
  });

  it("returns the slug itself when sub-sector is not found", () => {
    expect(getSubSectorLabel("technology", "unknown_slug")).toBe("unknown_slug");
  });

  it("returns correct label for fintech", () => {
    expect(getSubSectorLabel("financial_services", "fintech")).toBe("FinTech");
  });
});

describe("SUB_SECTOR_TAXONOMY completeness", () => {
  it("all sub-sector values in taxonomy have benchmark entries", () => {
    const allSubSectors = Object.values(SUB_SECTOR_TAXONOMY).flat().map(s => s.value);
    const missing = allSubSectors.filter(v => SUB_SECTOR_BENCHMARKS[v] === undefined);
    expect(missing).toEqual([]);
  });
});
