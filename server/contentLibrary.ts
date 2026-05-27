/**
 * Content Library loader
 * Loads the pre-built library.json at server boot and exposes typed helpers
 * for procedures to query initiatives, risk rules, benchmarks, and templates.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { INITIATIVE_LIBRARY } from "../shared/initiativeLibrary";

// ── Types ──────────────────────────────────────────────────────────────────

export interface LibraryMeta {
  version: string;
  built_at: string;
  git_sha: string;
  content_counts: Record<string, number>;
}

export interface CostRange {
  base_range_gbp?: [number, number];
  size_multipliers?: Record<string, number>;
  ambition_multipliers?: Record<string, number>;
  caveat?: string;
}

export interface InitiativeRisk {
  risk_id: string;
  statement: string;
  severity: "low" | "medium" | "high" | "very_high";
  mitigation: string;
  sources: string[];
}

export interface QuantifiedValue {
  primary_metric: string;
  typical_improvement_pct: { low: number; high: number };
  monetisation_formula: string;
  sources: string[];
  confidence: "high" | "medium" | "low";
  payback_months: { low: number; high: number };
}

export interface ValueModel {
  primary_value_type: "cost_savings" | "productivity_gain" | "risk_avoidance" | "capability_uplift" | "strategic";
  quantified_value: QuantifiedValue | null;
  qualitative_value: string[];
  qualitative_value_only: boolean;
}

export type CrossFunctionalDependencies = Partial<Record<"it_data" | "legal_compliance" | "finance" | "l_and_d" | "comms", string[]>>;

export interface Initiative {
  initiative_id: string;
  display_name: string;
  category: string;
  short_description: string;
  capability_domains_addressed: string[];
  typical_phase: "foundation" | "build" | "scale" | "optimise";
  applicable_personas: string[];
  applicable_industries: string[];
  cost: CostRange;
  typical_risks: InitiativeRisk[];
  dependencies: string[];
  typical_outcomes: string[];
  outcome_ids: string[];
  regulatory_exposure: {
    eu_ai_act: string;
    gdpr: string;
    employment_law: string;
  };
  sources: string[];
  confidence: "high" | "medium" | "low";
  last_reviewed: string;
  reviewer: string;
  review_tier: string;
  value_model?: ValueModel;
  cross_functional_dependencies?: CrossFunctionalDependencies;
  // v1.3: manager function tags for E2 manager dashboard filtering
  function_tags?: string[];
  // v1.3.1: function scope — which platform mode(s) this initiative applies to
  function_scope?: "cpo" | "reward" | "both";
}

export interface RiskRule {
  rule_id: string;
  display_name: string;
  trigger_condition: string;
  risk_statement: string;
  severity: "low" | "medium" | "high" | "very_high";
  recommended_action: string;
  regulatory_basis: string[];
  sources: string[];
  last_reviewed: string;
  reviewer: string;
}

export interface SectorBenchmark {
  sector_id: string;
  display_name: string;
  individual_capability_benchmarks: Record<string, {
    p25: number; p50: number; p75: number; confidence: string; sources: string[];
  }>;
  overall_individual_benchmark: { p25: number; p50: number; p75: number };
  organisational_maturity_benchmark: {
    overall: { p25: number; p50: number; p75: number };
    [key: string]: { p50: number } | { p25: number; p50: number; p75: number };
  };
  notes: string;
  last_reviewed: string;
  reviewer: string;
}

export interface Source {
  source_id: string;
  citation: string;
  source_type: string;
  url?: string;
  publication_date: string;
  accessed: string;
  notes?: string;
  // v1.3: content freshness fields
  last_reviewed_date?: string;  // ISO date — when this source was last verified by content team
  confidence?: "high" | "medium" | "low";  // editorial confidence in the source
}

export interface ContentLibrary {
  meta: LibraryMeta;
  sources: Record<string, Source>;
  frameworks: Record<string, unknown[]>;
  initiatives: Record<string, Initiative>;
  risk_rules: Record<string, RiskRule>;
  sector_benchmarks: Record<string, SectorBenchmark>;
  templates: Record<string, unknown>;
}

// ── Loader ─────────────────────────────────────────────────────────────────

let _library: ContentLibrary | null = null;

export function getContentLibrary(): ContentLibrary {
  if (!_library) {
    const __filename = fileURLToPath(import.meta.url);
    const __dir = dirname(__filename);
    // Try multiple candidate paths to support dev (server/), production (dist/),
    // and any edge case where the file may be in the project root or server/ sibling.
    const candidates = [
      join(__dir, "content-library.json"),          // dist/content-library.json (production)
      join(__dir, "library.json"),                   // dist/library.json (fallback)
      join(__dir, "..", "server", "content-library.json"), // project root → server/
      join(__dir, "..", "server", "library.json"),         // project root → server/
    ];
    const libPath = candidates.find(p => existsSync(p));
    if (!libPath) {
      throw new Error(
        `Content library not found. Tried:\n${candidates.join("\n")}`
      );
    }
    const raw = readFileSync(libPath, "utf-8");
    _library = JSON.parse(raw) as ContentLibrary;
    console.log(
      `[ContentLibrary] Loaded v${_library.meta.version} @ ${_library.meta.git_sha} ` +
      `(${_library.meta.content_counts.initiatives} initiatives, ` +
      `${_library.meta.content_counts.risk_rules} risk rules)`
    );
  }
  return _library;
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function getInitiative(id: string): Initiative | undefined {
  return getContentLibrary().initiatives[id];
}

export function getAllInitiatives(): Initiative[] {
  return Object.values(getContentLibrary().initiatives);
}

export function getInitiativesByPhase(phase: Initiative["typical_phase"]): Initiative[] {
  return getAllInitiatives().filter(i => i.typical_phase === phase);
}

export function getRiskRule(id: string): RiskRule | undefined {
  return getContentLibrary().risk_rules[id];
}

export function getAllRiskRules(): RiskRule[] {
  return Object.values(getContentLibrary().risk_rules);
}

export function getSectorBenchmark(sectorId: string): SectorBenchmark | undefined {
  return getContentLibrary().sector_benchmarks[sectorId];
}

export function getAllSectorBenchmarks(): SectorBenchmark[] {
  return Object.values(getContentLibrary().sector_benchmarks);
}

export function getSource(id: string): Source | undefined {
  return getContentLibrary().sources[id];
}

export function resolveSources(ids: string[]): Source[] {
  const lib = getContentLibrary();
  return ids.map(id => lib.sources[id]).filter(Boolean);
}

/**
 * Returns true if a source has not been reviewed in the last 18 months.
 * Used to show stale badges in the methodology appendix.
 */
export function isSourceStale(source: Source, referenceDate?: Date): boolean {
  const ref = referenceDate ?? new Date();
  const reviewed = source.last_reviewed_date ?? source.accessed;
  if (!reviewed) return false;
  const reviewedDate = new Date(reviewed);
  const monthsDiff =
    (ref.getFullYear() - reviewedDate.getFullYear()) * 12 +
    (ref.getMonth() - reviewedDate.getMonth());
  return monthsDiff > 18;
}

export function getLibraryVersion(): string {
  return getContentLibrary().meta.version;
}

export function getLibraryMeta(): LibraryMeta {
  return getContentLibrary().meta;
}

/**
 * Compute cost estimate for an initiative given org size and ambition tier.
 * Returns { min: number, max: number, caveat: string } in GBP.
 */
export function estimateInitiativeCost(
  initiativeId: string,
  orgSize: number,
  ambitionTier: "embracers" | "innovators" | "transformative"
): { min: number; max: number; caveat: string } | null {
  const initiative = getInitiative(initiativeId);
  if (!initiative?.cost?.base_range_gbp) return null;

  const [baseMin, baseMax] = initiative.cost.base_range_gbp;

  // Size multiplier
  let sizeMult = 1.0;
  const sm = initiative.cost.size_multipliers;
  if (sm) {
    if (orgSize < 100 && sm["<100"]) sizeMult = sm["<100"];
    else if (orgSize < 500 && sm["100-500"]) sizeMult = sm["100-500"];
    else if (orgSize < 2000 && sm["500-2000"]) sizeMult = sm["500-2000"];
    else if (sm["2000+"]) sizeMult = sm["2000+"];
  }

  // Ambition multiplier
  const am = initiative.cost.ambition_multipliers;
  const ambitionMult = am?.[ambitionTier] ?? 1.0;

  return {
    min: Math.round(baseMin * sizeMult * ambitionMult),
    max: Math.round(baseMax * sizeMult * ambitionMult),
    caveat: initiative.cost.caveat ?? "",
  };
}

// ── Legacy ID backward-compat ─────────────────────────────────────────────────
/**
 * Resolves a mix of legacy numeric IDs (init-XX, 1-indexed), current
 * snake_case content-library IDs, and shared-library IDs to a deduplicated
 * array of valid initiative IDs. Silently drops IDs that cannot be resolved.
 *
 * Priority:
 *   1. Content library (getAllInitiatives) — full value model + cost estimate
 *   2. Shared initiative library (INITIATIVE_LIBRARY) — cost estimate via y1CostRange
 *   3. Legacy numeric IDs (init-XX) mapped to content library by index
 */
export function resolveInitiativeIds(ids: string[]): string[] {
  const allInits = getAllInitiatives();
  const validSet = new Set(allInits.map(i => i.initiative_id));
  const sharedSet = new Set(INITIATIVE_LIBRARY.map(i => i.id));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (validSet.has(id)) {
      if (!seen.has(id)) { seen.add(id); result.push(id); }
      continue;
    }
    const m = id.match(/^init-(\d+)$/);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      const resolved = allInits[idx]?.initiative_id ?? null;
      if (resolved && validSet.has(resolved) && !seen.has(resolved)) {
        seen.add(resolved); result.push(resolved);
      }
      continue;
    }
    // Accept shared library IDs directly — calculateCostEnvelope has a fallback for these
    if (sharedSet.has(id) && !seen.has(id)) {
      seen.add(id); result.push(id);
    }
  }
  return result;
}
