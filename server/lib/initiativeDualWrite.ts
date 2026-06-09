/**
 * initiativeDualWrite.ts
 *
 * Finding A-5 — Temporary dual-write mechanism (Phase A → Phase B transition).
 *
 * Every write to `ail_org_context.selectedInitiativesJson` must also upsert the
 * corresponding `initiative` rows so the 16 readers (still on the blob) stay correct
 * AND the rows stay current.
 *
 * REMOVAL TRIGGER: When Phase B migrates all 16 readers off the blob to the `initiative`
 * table, blob writes are dropped and the rows become the sole source. This module and all
 * call sites must be removed at that point. Must not become permanent architecture.
 *
 * ID format handled:
 *   - Static library slugs (e.g. "hr_virtual_assistant") → matched by source_slug
 *   - UUIDs that already exist as initiative.id → matched directly
 *   - Unknown strings → inserted as ai_drafted initiative with no source_slug
 */

import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { initiative } from "../../drizzle/schema";
import RAW_LIBRARY from "../../scripts/initiative_library.json" assert { type: "json" };

// initiative_library.json is a dict keyed by slug: { slug: { label, description, category } }
type LibEntry = { label: string; description?: string; category?: string };
type LibEntryResolved = { id: string; title: string; description?: string; category?: string };
const LIBRARY_MAP = new Map<string, LibEntryResolved>(
  Object.entries(RAW_LIBRARY as Record<string, LibEntry>).map(([slug, e]) => [
    slug,
    { id: slug, title: e.label, description: e.description, category: e.category },
  ])
);

/**
 * Upsert initiative rows for a tenant based on a list of initiative IDs/slugs.
 *
 * Called immediately after every write to ail_org_context.selectedInitiativesJson.
 * Mirrors the conditional logic of the caller — only called when the blob is actually written.
 *
 * @param db     - Drizzle DB instance
 * @param tenantId - The tenant whose initiative rows to upsert
 * @param ids    - The array of initiative IDs/slugs written to the blob
 * @param status - The status to set on newly inserted rows ("draft" | "committed")
 */
export async function upsertInitiativeRows(
  db: MySql2Database<Record<string, never>>,
  tenantId: string,
  ids: string[],
  status: "draft" | "committed" = "draft"
): Promise<void> {
  if (!ids || ids.length === 0) return;

  // 1. Fetch all existing initiative rows for this tenant in one query
  const existing = await db
    .select({ id: initiative.id, sourceSlug: initiative.sourceSlug })
    .from(initiative)
    .where(eq(initiative.tenantId, tenantId));

  const bySlug = new Map(existing.map((r) => [r.sourceSlug ?? "", r.id]));
  const byId = new Set(existing.map((r) => r.id));

  // 2. For each ID in the incoming list, upsert if not already present
  for (let rank = 0; rank < ids.length; rank++) {
    const rawId = ids[rank];
    if (!rawId) continue;

    // Already exists as a UUID initiative.id — update priority_rank and status only
    if (byId.has(rawId)) {
      await db
        .update(initiative)
        .set({ priorityRank: rank + 1, status, updatedAt: new Date() })
        .where(and(eq(initiative.id, rawId), eq(initiative.tenantId, tenantId)));
      continue;
    }

    // Already exists by source_slug — update priority_rank and status only
    if (bySlug.has(rawId)) {
      const existingId = bySlug.get(rawId)!;
      await db
        .update(initiative)
        .set({ priorityRank: rank + 1, status, updatedAt: new Date() })
        .where(and(eq(initiative.id, existingId), eq(initiative.tenantId, tenantId)));
      continue;
    }

    // New — insert. Look up static library for metadata.
    const libEntry = LIBRARY_MAP.get(rawId);
    const newId = randomUUID();
    await db.insert(initiative).values({
      id: newId,
      tenantId,
      libraryInitiativeId: null,
      sourceSlug: libEntry ? rawId : null,
      title: (libEntry as LibEntryResolved | undefined)?.title ?? rawId,
      description: libEntry?.description ?? null,
      basis: libEntry ? "library_selected" : "ai_drafted",
      aiDrafted: !libEntry,
      priorityRank: rank + 1,
      domain: libEntry?.category ?? null,
      status,
    });
  }

  // 3. Mark any initiative rows that are no longer in the list as "dropped"
  //    (only if they were previously draft — do not drop committed rows automatically)
  const incomingSet = new Set(ids);
  for (const row of existing) {
    const slug = row.sourceSlug ?? "";
    const isIncoming = incomingSet.has(row.id) || incomingSet.has(slug);
    if (!isIncoming) {
      await db
        .update(initiative)
        .set({ status: "dropped", updatedAt: new Date() })
        .where(
          and(
            eq(initiative.id, row.id),
            eq(initiative.tenantId, tenantId),
            eq(initiative.status, "draft")
          )
        );
    }
  }
}
