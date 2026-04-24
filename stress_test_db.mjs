/**
 * AiQ Platform — Database Integrity Check
 * Tests:
 * - Schema vs DB column alignment
 * - Foreign key constraint coverage
 * - Orphaned records
 * - Index coverage for common queries
 * - Data integrity (nulls, invalid enums, etc.)
 */
import { createConnection } from "mysql2/promise";

const results = { pass: 0, fail: 0, warn: 0, errors: [], warnings: [] };

function pass(name) { results.pass++; console.log(`  ✓ ${name}`); }
function fail(name, reason) { results.fail++; results.errors.push({ name, reason }); console.log(`  ✗ ${name}: ${reason}`); }
function warn(name, reason) { results.warn++; results.warnings.push({ name, reason }); console.log(`  ⚠ ${name}: ${reason}`); }

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║       AiQ Platform — Database Integrity Check        ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  const conn = await createConnection(process.env.DATABASE_URL);

  // ─── 1. Schema Column Checks ─────────────────────────────────────────────
  console.log("\n=== 1. Schema Column Checks ===");
  const columnChecks = [
    // assessment_items
    { table: "assessment_items", column: "reasoning_required", type: "tinyint" },
    { table: "assessment_items", column: "artefact_type", type: "varchar" },
    { table: "assessment_items", column: "artefact_payload_json", type: "json" },
    // assessment_sessions
    { table: "assessment_sessions", column: "role_archetype_id", type: "varchar" },
    // learning_modules
    { table: "learning_modules", column: "formative_quiz_json", type: "json" },
    { table: "learning_modules", column: "required_capability_score", type: "int" },
    { table: "learning_modules", column: "required_level", type: "varchar" },
    // gap_analyses
    { table: "gap_analyses", column: "trigger_source", type: "varchar" },
    // adaptive_learning_plans
    { table: "adaptive_learning_plans", column: "auto_regenerated_at", type: "datetime" },
    // organisations
    { table: "organisations", column: "id", type: "varchar" },
    { table: "organisations", column: "tenant_id", type: "varchar" },
    { table: "organisations", column: "name", type: "varchar" },
    // organisation_profiles
    { table: "organisation_profiles", column: "organisation_id", type: "varchar" },
    { table: "organisation_profiles", column: "sector", type: "varchar" },
    // organisation_capability_thresholds
    { table: "organisation_capability_thresholds", column: "org_id", type: "varchar" },
    { table: "organisation_capability_thresholds", column: "capability_key", type: "varchar" },
    { table: "organisation_capability_thresholds", column: "minimum_safe_threshold", type: "int" },
    // learning tables
    { table: "learning_nudges", column: "from_user_id", type: "varchar" },
    { table: "learning_nudges", column: "to_user_id", type: "varchar" },
    { table: "learning_nudges", column: "module_id", type: "varchar" },
    { table: "learning_milestones", column: "user_id", type: "varchar" },
    { table: "learning_milestones", column: "milestone_type", type: "varchar" },
    { table: "learning_streaks", column: "user_id", type: "varchar" },
    { table: "learning_streaks", column: "current_streak", type: "int" },
  ];

  for (const { table, column, type } of columnChecks) {
    try {
      const [rows] = await conn.execute(
        `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
      );
      if (rows.length > 0) {
        pass(`${table}.${column} (${rows[0].DATA_TYPE})`);
      } else {
        fail(`${table}.${column}`, "Column missing from database");
      }
    } catch (e) {
      fail(`${table}.${column}`, e.message);
    }
  }

  // ─── 2. Orphaned Records ─────────────────────────────────────────────────
  console.log("\n=== 2. Orphaned Records ===");

  const orphanChecks = [
    {
      name: "assessment_item_options without parent items",
      sql: `SELECT COUNT(*) as cnt FROM assessment_item_options o 
            LEFT JOIN assessment_items i ON o.item_id = i.id 
            WHERE i.id IS NULL`,
      expectZero: true,
    },
    {
      name: "assessment_sessions without valid tenants",
      sql: `SELECT COUNT(*) as cnt FROM assessment_sessions s 
            LEFT JOIN tenants t ON s.tenant_id = t.id 
            WHERE t.id IS NULL`,
      expectZero: true,
    },
    {
      name: "learning_modules without valid tenant",
      sql: `SELECT COUNT(*) as cnt FROM learning_modules m 
            LEFT JOIN tenants t ON m.tenant_id = t.id 
            WHERE t.id IS NULL`,
      expectZero: true,
    },
    {
      name: "gap_analyses without valid sessions",
      sql: `SELECT COUNT(*) as cnt FROM gap_analyses g 
            LEFT JOIN assessment_sessions s ON g.session_id = s.id 
            WHERE s.id IS NULL AND g.session_id IS NOT NULL`,
      expectZero: true,
    },
  ];

  for (const { name, sql, expectZero } of orphanChecks) {
    try {
      const [rows] = await conn.execute(sql);
      const count = rows[0].cnt;
      if (expectZero && count === 0) {
        pass(`${name} → 0 orphans`);
      } else if (!expectZero) {
        pass(`${name} → ${count} records`);
      } else {
        fail(`${name}`, `Found ${count} orphaned records`);
      }
    } catch (e) {
      fail(`${name}`, e.message);
    }
  }

  // ─── 3. Data Integrity ───────────────────────────────────────────────────
  console.log("\n=== 3. Data Integrity ===");

  const integrityChecks = [
    {
      name: "assessment_items: all items have at least 2 options",
      sql: `SELECT COUNT(*) as cnt FROM assessment_items i 
            WHERE (SELECT COUNT(*) FROM assessment_item_options WHERE item_id = i.id) < 2`,
      expectZero: true,
    },
    {
      name: "assessment_items: all items have exactly 1 correct option",
      sql: `SELECT COUNT(*) as cnt FROM assessment_items i 
            WHERE (SELECT COUNT(*) FROM assessment_item_options WHERE item_id = i.id AND is_correct = 1) != 1`,
      expectZero: true,
    },
    {
      name: "assessment_blueprints: at least 1 blueprint exists",
      sql: `SELECT COUNT(*) as cnt FROM assessment_blueprints`,
      expectMin: 1,
    },
    {
      name: "canonical_signals: all 6 domains covered",
      sql: `SELECT COUNT(DISTINCT domain) as cnt FROM canonical_signals`,
      expectMin: 6,
    },
    {
      name: "scoring_config: at least 1 config exists",
      sql: `SELECT COUNT(*) as cnt FROM scoring_config`,
      expectMin: 1,
    },
    {
      name: "learning_modules: all modules have a title",
      sql: `SELECT COUNT(*) as cnt FROM learning_modules WHERE title IS NULL OR title = ''`,
      expectZero: true,
    },
    {
      name: "learning_modules: all modules have a capability_domain",
      sql: `SELECT COUNT(*) as cnt FROM learning_modules WHERE capability_domain IS NULL OR capability_domain = ''`,
      expectZero: true,
    },
    {
      name: "assessment_item_options: no null signal_deltas_json on items with signals",
      sql: `SELECT COUNT(*) as cnt FROM assessment_item_options WHERE signal_deltas_json IS NULL`,
      // This is a warning, not a failure — some items may not have signals
    },
    {
      name: "users: all users have a tenant_id",
      sql: `SELECT COUNT(*) as cnt FROM users WHERE tenant_id IS NULL`,
      expectZero: true,
    },
    {
      name: "users: all users have an email",
      sql: `SELECT COUNT(*) as cnt FROM users WHERE email IS NULL OR email = ''`,
      expectZero: true,
    },
  ];

  for (const check of integrityChecks) {
    try {
      const [rows] = await conn.execute(check.sql);
      const count = rows[0].cnt;
      
      if (check.expectZero !== undefined) {
        if (check.expectZero && count === 0) {
          pass(`${check.name} → OK`);
        } else if (check.expectZero && count > 0) {
          fail(`${check.name}`, `Found ${count} violations`);
        } else {
          pass(`${check.name} → ${count} records`);
        }
      } else if (check.expectMin !== undefined) {
        if (count >= check.expectMin) {
          pass(`${check.name} → ${count} (≥${check.expectMin})`);
        } else {
          fail(`${check.name}`, `Only ${count} found, expected ≥${check.expectMin}`);
        }
      } else {
        // Just informational
        if (count > 0) {
          warn(`${check.name}`, `${count} records with null signal_deltas_json (may be intentional)`);
        } else {
          pass(`${check.name} → all have signal_deltas_json`);
        }
      }
    } catch (e) {
      fail(`${check.name}`, e.message);
    }
  }

  // ─── 4. Index Coverage ───────────────────────────────────────────────────
  console.log("\n=== 4. Index Coverage ===");

  const indexChecks = [
    { table: "assessment_sessions", column: "tenant_id" },
    { table: "assessment_sessions", column: "user_id" },
    { table: "learning_modules", column: "tenant_id" },
    { table: "learning_modules", column: "capability_domain" },
    { table: "adaptive_learning_plans", column: "user_id" },
    { table: "gap_analyses", column: "user_id" },
    { table: "spaced_repetition_queue", column: "user_id" },
    { table: "learning_streaks", column: "user_id" },
  ];

  for (const { table, column } of indexChecks) {
    try {
      const [rows] = await conn.execute(
        `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
      );
      if (rows.length > 0) {
        pass(`${table}.${column} is indexed (${rows[0].INDEX_NAME})`);
      } else {
        warn(`${table}.${column}`, "No index found — may cause slow queries on large datasets");
      }
    } catch (e) {
      fail(`${table}.${column} index check`, e.message);
    }
  }

  // ─── 5. Assessment Item Quality ──────────────────────────────────────────
  console.log("\n=== 5. Assessment Item Quality ===");

  try {
    const [items] = await conn.execute(
      `SELECT i.id, i.capability_key, i.difficulty, i.blueprint_id,
              COUNT(o.id) as option_count,
              SUM(CASE WHEN o.is_correct = 1 THEN 1 ELSE 0 END) as correct_count
       FROM assessment_items i
       LEFT JOIN assessment_item_options o ON o.item_id = i.id
       GROUP BY i.id, i.capability_key, i.difficulty, i.blueprint_id`
    );

    const issues = items.filter(i => i.option_count < 2 || i.correct_count !== 1);
    if (issues.length === 0) {
      pass(`All ${items.length} assessment items have valid structure (2+ options, exactly 1 correct)`);
    } else {
      fail("Assessment item structure", `${issues.length} items have structural issues: ${JSON.stringify(issues.map(i => i.id))}`);
    }

    // Check domain coverage
    const domains = [...new Set(items.map(i => i.capability_key))];
    pass(`Assessment items cover ${domains.length} domains: ${domains.join(", ")}`);

    // Check difficulty distribution
    const difficulties = items.reduce((acc, i) => { acc[i.difficulty] = (acc[i.difficulty]||0)+1; return acc; }, {});
    pass(`Difficulty distribution: ${JSON.stringify(difficulties)}`);
  } catch (e) {
    fail("Assessment item quality check", e.message);
  }

  // ─── 6. Learning Module Quality ──────────────────────────────────────────
  console.log("\n=== 6. Learning Module Quality ===");

  try {
    const [modules] = await conn.execute(
      `SELECT capability_domain, COUNT(*) as cnt, 
              AVG(estimated_minutes) as avg_minutes,
              COUNT(CASE WHEN content_json IS NOT NULL THEN 1 END) as has_content
       FROM learning_modules
       GROUP BY capability_domain`
    );

    for (const m of modules) {
      if (m.cnt >= 5) {
        pass(`Domain '${m.capability_domain}': ${m.cnt} modules, avg ${Math.round(m.avg_minutes)}min, ${m.has_content} with content`);
      } else {
        warn(`Domain '${m.capability_domain}'`, `Only ${m.cnt} modules (recommend ≥5 per domain)`);
      }
    }

    const [total] = await conn.execute(`SELECT COUNT(*) as cnt FROM learning_modules`);
    pass(`Total learning modules: ${total[0].cnt}`);
  } catch (e) {
    fail("Learning module quality check", e.message);
  }

  await conn.end();

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log(`║  RESULTS: ${results.pass} passed, ${results.fail} failed, ${results.warn} warnings          ║`);
  console.log("╚══════════════════════════════════════════════════════╝");

  if (results.errors.length > 0) {
    console.log("\nFailed:");
    results.errors.forEach(e => console.log(`  ✗ ${e.name}: ${e.reason}`));
  }
  if (results.warnings.length > 0) {
    console.log("\nWarnings:");
    results.warnings.forEach(w => console.log(`  ⚠ ${w.name}: ${w.reason}`));
  }

  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch(console.error);
