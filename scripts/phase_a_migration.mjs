/**
 * Phase A Data Migration Script
 * Spec: AiQ_PhaseA_Schema_Spec_v2_LOCKED.md (with approved deviations #1 and #2)
 * 
 * What this script does:
 *  1. Reads all ail_org_context rows that have selected_initiatives_json or risk_register_json
 *  2. Creates initiative rows from selected_initiatives_json (§4.1)
 *  3. Creates initiative_risk rows from risk_register_json (§4.2)
 *  4. Remaps roadmap_json assignments/dependencies to new initiative UUIDs (§4.3)
 *  5. Preserves original blobs in _backup columns (§4.5 reversibility)
 *  6. Produces before/after counts (§4.5 integrity proof)
 *
 * Safety:
 *  - Idempotent: checks for existing initiative rows before inserting
 *  - Reversible: original blobs backed up to *_backup columns
 *  - Dry-run mode: set DRY_RUN=true to preview without writing
 *
 * Run: node scripts/phase_a_migration.mjs [--dry-run]
 */

import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load all 68 initiative slugs from the extracted static library JSON
// Generated from shared/initiativeLibrary.ts by scripts/extract_initiative_library.py
const rawLib = JSON.parse(readFileSync(join(__dirname, '../scripts/initiative_library_snapshot.json'), 'utf8'));

// Build STATIC_LIBRARY: slug → { title, description, domain }
const STATIC_LIBRARY = {};
for (const [slug, entry] of Object.entries(rawLib)) {
  STATIC_LIBRARY[slug] = {
    title: entry.label,
    description: entry.description,
    domain: entry.category,
  };
}

const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL not set');

  // Parse mysql://user:pass@host:port/db?params
  const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!match) throw new Error('Cannot parse DATABASE_URL: ' + dbUrl);
  const [, user, password, host, port, database] = match;

  const conn = await mysql.createConnection({
    host, port: parseInt(port), user, password, database,
    ssl: { rejectUnauthorized: false },
  });

  console.log(`\n=== Phase A Migration (${DRY_RUN ? 'DRY RUN' : 'LIVE'}) ===\n`);

  // ── Step 0: Add backup columns if they don't exist ──────────────────────────
  if (!DRY_RUN) {
    for (const col of ['selected_initiatives_json_backup', 'roadmap_json_backup']) {
      const [cols] = await conn.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ail_org_context' AND COLUMN_NAME = ?`,
        [col]
      );
      if (cols.length === 0) {
        console.log(`Adding backup column: ${col}`);
        await conn.execute(`ALTER TABLE ail_org_context ADD COLUMN \`${col}\` LONGTEXT NULL`);
      }
    }
  }

  // ── Step 1: Read source rows ─────────────────────────────────────────────────
  const [rows] = await conn.execute(
    `SELECT tenant_id, selected_initiatives_json, risk_register_json, roadmap_json, stage_gate_state_json
     FROM ail_org_context
     WHERE selected_initiatives_json IS NOT NULL OR risk_register_json IS NOT NULL`
  );

  console.log(`Tenants with data to migrate: ${rows.length}`);

  // ── Before counts ────────────────────────────────────────────────────────────
  const [[{ init_before }]] = await conn.execute('SELECT COUNT(*) as init_before FROM `initiative`');
  const [[{ risk_before }]] = await conn.execute('SELECT COUNT(*) as risk_before FROM `initiative_risk`');
  console.log(`\nBEFORE: initiative rows=${init_before}, initiative_risk rows=${risk_before}`);

  let totalInitiatives = 0;
  let totalRisks = 0;
  const allIdMaps = {}; // tenantId → { slug → new UUID }

  for (const row of rows) {
    const tenantId = row.tenant_id;
    const selectedJson = row.selected_initiatives_json ? JSON.parse(row.selected_initiatives_json) : [];
    const riskJson = row.risk_register_json ? JSON.parse(row.risk_register_json) : null;
    const roadmapJson = row.roadmap_json ? JSON.parse(row.roadmap_json) : null;
    const gateJson = row.stage_gate_state_json ? JSON.parse(row.stage_gate_state_json) : null;

    // Determine if strategy was committed (stage5 completed)
    const stage5Completed = gateJson?.stage5?.completedAt != null;
    const initiativeStatus = stage5Completed ? 'committed' : 'draft';

    console.log(`\nTenant: ${tenantId}`);
    console.log(`  selected_initiatives: ${JSON.stringify(selectedJson)}`);
    console.log(`  strategy status: ${initiativeStatus}`);
    console.log(`  risks: ${riskJson?.risks?.length ?? 0}`);

    // ── §4.1: selected_initiatives_json → initiative rows ──────────────────────
    const idMap = {}; // slug → new UUID
    for (let i = 0; i < selectedJson.length; i++) {
      const slug = selectedJson[i];
      const libData = STATIC_LIBRARY[slug];

      if (!libData) {
        console.warn(`  WARNING: Unknown slug "${slug}" — no static library entry. Skipping.`);
        continue;
      }

      // Check if already migrated (idempotency)
      const [[existing]] = await conn.execute(
        'SELECT id FROM `initiative` WHERE tenant_id = ? AND source_slug = ?',
        [tenantId, slug]
      );

      let newId;
      if (existing) {
        newId = existing.id;
        console.log(`  [SKIP] initiative already exists: slug=${slug} id=${newId}`);
      } else {
        newId = randomUUID();
        console.log(`  [INSERT] initiative: slug=${slug} → id=${newId} title="${libData.title}"`);

        if (!DRY_RUN) {
          await conn.execute(
            `INSERT INTO \`initiative\` 
             (id, tenant_id, library_initiative_id, source_slug, title, description, basis, ai_drafted, priority_rank, domain, status)
             VALUES (?, ?, NULL, ?, ?, ?, 'library_selected', false, ?, ?, ?)`,
            [newId, tenantId, slug, libData.title, libData.description, i + 1, libData.domain, initiativeStatus]
          );
        }
        totalInitiatives++;
      }
      idMap[slug] = newId;
    }
    allIdMaps[tenantId] = idMap;

    // ── §4.2: risk_register_json → initiative_risk rows ───────────────────────
    if (riskJson?.risks?.length > 0) {
      for (const risk of riskJson.risks) {
        // Check idempotency — preserve original blob IDs
        const [[existingRisk]] = await conn.execute(
          'SELECT id FROM `initiative_risk` WHERE id = ?',
          [risk.id]
        );

        if (existingRisk) {
          console.log(`  [SKIP] initiative_risk already exists: id=${risk.id}`);
          continue;
        }

        // Map initiativeId if present
        const mappedInitiativeId = risk.initiativeId ? (idMap[risk.initiativeId] ?? null) : null;

        // Map numeric likelihood/impact (1-5) to enum (low/medium/high)
        const mapLevel = (n) => {
          if (n == null) return null;
          if (n <= 2) return 'low';
          if (n <= 3) return 'medium';
          return 'high';
        };

        console.log(`  [INSERT] initiative_risk: id=${risk.id} title="${risk.title?.substring(0, 40)}"`);

        if (!DRY_RUN) {
          await conn.execute(
            `INSERT INTO \`initiative_risk\`
             (id, tenant_id, initiative_id, title, description, likelihood, impact, mitigation, status, ai_suggested)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              risk.id,
              tenantId,
              mappedInitiativeId,
              risk.title,
              risk.description ?? null,
              mapLevel(risk.likelihood),
              mapLevel(risk.impact),
              risk.mitigation ?? null,
              risk.status ?? 'open',
              risk.aiSuggested ? 1 : 0,
            ]
          );
        }
        totalRisks++;
      }
    }

    // ── §4.3: Remap roadmap_json slug references ───────────────────────────────
    if (roadmapJson && Object.keys(idMap).length > 0) {
      let remapped = false;

      // Remap assignments[].initiativeId
      for (const assignment of roadmapJson.assignments ?? []) {
        if (idMap[assignment.initiativeId]) {
          console.log(`  [REMAP] roadmap assignment: ${assignment.initiativeId} → ${idMap[assignment.initiativeId]}`);
          assignment.initiativeId = idMap[assignment.initiativeId];
          remapped = true;
        }
      }

      // Remap dependencies[].fromId / .toId
      for (const dep of roadmapJson.dependencies ?? []) {
        if (idMap[dep.fromId]) { dep.fromId = idMap[dep.fromId]; remapped = true; }
        if (idMap[dep.toId]) { dep.toId = idMap[dep.toId]; remapped = true; }
      }

      if (remapped && !DRY_RUN) {
        // Backup original roadmap_json first
        await conn.execute(
          `UPDATE ail_org_context 
           SET roadmap_json_backup = roadmap_json, roadmap_json = ?
           WHERE tenant_id = ?`,
          [JSON.stringify(roadmapJson), tenantId]
        );
        console.log(`  [UPDATE] roadmap_json remapped and backed up`);
      }
    }

    // ── Backup selected_initiatives_json ──────────────────────────────────────
    if (!DRY_RUN && selectedJson.length > 0) {
      await conn.execute(
        `UPDATE ail_org_context 
         SET selected_initiatives_json_backup = selected_initiatives_json
         WHERE tenant_id = ? AND selected_initiatives_json_backup IS NULL`,
        [tenantId]
      );
    }
  }

  // ── After counts ─────────────────────────────────────────────────────────────
  const [[{ init_after }]] = await conn.execute('SELECT COUNT(*) as init_after FROM `initiative`');
  const [[{ risk_after }]] = await conn.execute('SELECT COUNT(*) as risk_after FROM `initiative_risk`');

  console.log(`\n=== MIGRATION SUMMARY ===`);
  console.log(`BEFORE: initiative=${init_before}, initiative_risk=${risk_before}`);
  console.log(`AFTER:  initiative=${init_after}, initiative_risk=${risk_after}`);
  console.log(`Inserted: initiative=${totalInitiatives}, initiative_risk=${totalRisks}`);
  console.log(`ID maps built: ${JSON.stringify(allIdMaps, null, 2)}`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes written to DB.');
  } else {
    console.log('\nMigration complete.');
  }

  await conn.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
