/**
 * Content Library Router
 * Exposes the pre-built content library (initiatives, risk rules, sector
 * benchmarks, templates, sources) via tRPC procedures.
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  getContentLibrary,
  getAllInitiatives,
  getAllRiskRules,
  getAllSectorBenchmarks,
  getInitiative,
  getRiskRule,
  getSectorBenchmark,
  resolveSources,
  getLibraryMeta,
  estimateInitiativeCost,
} from "../contentLibrary";

export const contentLibraryRouter = router({
  // ── Meta ────────────────────────────────────────────────────────────────
  meta: publicProcedure.query(() => {
    return getLibraryMeta();
  }),

  // ── Initiatives ─────────────────────────────────────────────────────────
  listInitiatives: publicProcedure
    .input(z.object({
      phase: z.enum(["foundation", "build", "scale", "optimise", "all"]).optional().default("all"),
      category: z.string().optional(),
      domain: z.string().optional(),
    }))
    .query(({ input }) => {
      let items = getAllInitiatives();
      if (input.phase !== "all") {
        items = items.filter(i => i.typical_phase === input.phase);
      }
      if (input.category) {
        items = items.filter(i => i.category === input.category);
      }
      if (input.domain) {
        items = items.filter(i => i.capability_domains_addressed.includes(input.domain!));
      }
      return items.map(i => ({
        initiative_id: i.initiative_id,
        display_name: i.display_name,
        category: i.category,
        short_description: i.short_description,
        typical_phase: i.typical_phase,
        capability_domains_addressed: i.capability_domains_addressed,
        outcome_ids: i.outcome_ids,
        regulatory_exposure: i.regulatory_exposure,
        confidence: i.confidence,
        last_reviewed: i.last_reviewed,
        cost_range: i.cost?.base_range_gbp,
      }));
    }),

  getInitiative: publicProcedure
    .input(z.object({ initiative_id: z.string() }))
    .query(({ input }) => {
      const item = getInitiative(input.initiative_id);
      if (!item) return null;
      const sources = resolveSources(item.sources);
      return { ...item, resolved_sources: sources };
    }),

  estimateCost: publicProcedure
    .input(z.object({
      initiative_id: z.string(),
      org_size: z.number().min(1).max(1000000),
      ambition_tier: z.enum(["embracers", "innovators", "transformative"]),
    }))
    .query(({ input }) => {
      return estimateInitiativeCost(
        input.initiative_id,
        input.org_size,
        input.ambition_tier
      );
    }),

  // ── Risk Rules ───────────────────────────────────────────────────────────
  listRiskRules: publicProcedure.query(() => {
    return getAllRiskRules().map(r => ({
      rule_id: r.rule_id,
      display_name: r.display_name,
      severity: r.severity,
      risk_statement: r.risk_statement,
      recommended_action: r.recommended_action,
      last_reviewed: r.last_reviewed,
    }));
  }),

  getRiskRule: publicProcedure
    .input(z.object({ rule_id: z.string() }))
    .query(({ input }) => {
      const item = getRiskRule(input.rule_id);
      if (!item) return null;
      const sources = resolveSources(item.sources);
      return { ...item, resolved_sources: sources };
    }),

  // ── Sector Benchmarks ────────────────────────────────────────────────────
  listSectorBenchmarks: publicProcedure.query(() => {
    return getAllSectorBenchmarks().map(s => ({
      sector_id: s.sector_id,
      display_name: s.display_name,
      overall_individual_benchmark: s.overall_individual_benchmark,
      organisational_maturity_benchmark: s.organisational_maturity_benchmark,
      notes: s.notes,
      last_reviewed: s.last_reviewed,
    }));
  }),

  getSectorBenchmark: publicProcedure
    .input(z.object({ sector_id: z.string() }))
    .query(({ input }) => {
      return getSectorBenchmark(input.sector_id) ?? null;
    }),

  // ── Sources ──────────────────────────────────────────────────────────────
  listSources: publicProcedure.query(() => {
    const lib = getContentLibrary();
    return Object.values(lib.sources).map(s => ({
      source_id: s.source_id,
      citation: s.citation,
      source_type: s.source_type,
      url: s.url,
      publication_date: s.publication_date,
    }));
  }),

  // ── Admin: full library dump (admin only) ────────────────────────────────
  adminGetFullLibrary: protectedProcedure.query(({ ctx }) => {
    // Only the platform owner can access the full library dump
    const isOwner = ctx.user.id === ENV.ownerOpenId || ctx.user.email === ENV.ownerOpenId;
    if (!isOwner) {
      throw new Error("FORBIDDEN");
    }
    const lib = getContentLibrary();
    return {
      meta: lib.meta,
      initiative_count: Object.keys(lib.initiatives).length,
      risk_rule_count: Object.keys(lib.risk_rules).length,
      sector_benchmark_count: Object.keys(lib.sector_benchmarks).length,
      template_count: Object.keys(lib.templates).length,
      source_count: Object.keys(lib.sources).length,
      initiatives: Object.values(lib.initiatives),
      risk_rules: Object.values(lib.risk_rules),
      sector_benchmarks: Object.values(lib.sector_benchmarks),
      sources: Object.values(lib.sources),
    };
  }),
});
