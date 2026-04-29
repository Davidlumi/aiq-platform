/**
 * Acme Re-seed — Realistic Score Distribution
 * 50 HR professionals across 7 role families, with genuinely varied
 * domain scores that make every dashboard view meaningful.
 *
 * Score scale: 0–100 (maps to 0–10 Peakon display)
 * Readiness bands:
 *   ai_ready        ≥ 75
 *   developing      55–74
 *   not_yet_ready   35–54
 *   foundation_gap  < 35
 */
import mysql from "mysql2/promise";
import { randomUUID } from "crypto";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const tenantId = "tenant-acme-ltd";

// ── Domain keys ──────────────────────────────────────────────────────────────
const DOMAINS = [
  "ai_interaction",
  "ai_output_evaluation",
  "ai_workflow_design",
  "workforce_ai_readiness",
  "ai_ethics_trust",
  "ai_change_leadership",
];

// ── Score helpers ─────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function jitter(base, spread) { return clamp(Math.round(base + (Math.random() - 0.5) * 2 * spread), 0, 100); }
function readiness(score) {
  if (score >= 75) return "ai_ready";
  if (score >= 55) return "developing";
  if (score >= 35) return "not_yet_ready";
  return "foundation_gap";
}
function band(score) {
  if (score >= 70) return "good";
  if (score >= 50) return "developing";
  return "needs_work";
}

/**
 * Build a score_breakdown_json object.
 * domainBases: Record<domainKey, number> — target score 0–100
 */
function buildBreakdown(domainBases, totalAnswers = 38) {
  const capabilityScores = {};
  let sum = 0;
  for (const dk of DOMAINS) {
    const s = jitter(domainBases[dk] ?? 50, 8);
    capabilityScores[dk] = { score: s, band: band(s), signalCount: Math.round(totalAnswers / DOMAINS.length) };
    sum += s;
  }
  const overall = Math.round(sum / DOMAINS.length);
  return {
    overall_score: overall / 100,
    readiness_state: readiness(overall),
    credibility_score: clamp((overall + jitter(0, 10)) / 100, 0, 1),
    confidence_calibration: clamp(0.55 + Math.random() * 0.35, 0, 1),
    governance_score: clamp((capabilityScores.ai_ethics_trust.score + jitter(0, 5)) / 100, 0, 1),
    totalAnswers: totalAnswers,
    capabilityScores,
  };
}

// ── User roster — 50 people across 7 role families ───────────────────────────
// Domain bases are target scores (0-100). Spread of ±8 is applied per user.
// Role family is stored in role_family column so dashboardV2 groups them correctly.
const USERS = [
  // ── HR Leadership (5) ─────────────────────────────────────────────────────
  { id:"acme-u-001", first:"Sarah",    last:"Mitchell",   email:"sarah.mitchell@acme.com",    jobTitle:"Chief People Officer",              roleFamily:"hr_leadership",      expLevel:"principal", aiLevel:"advanced",
    domains:{ ai_interaction:82, ai_output_evaluation:79, ai_workflow_design:74, workforce_ai_readiness:88, ai_ethics_trust:85, ai_change_leadership:90 } },
  { id:"acme-u-002", first:"Jonathan", last:"Hale",       email:"jonathan.hale@acme.com",     jobTitle:"VP People & Culture",               roleFamily:"hr_leadership",      expLevel:"principal", aiLevel:"advanced",
    domains:{ ai_interaction:76, ai_output_evaluation:72, ai_workflow_design:65, workforce_ai_readiness:80, ai_ethics_trust:78, ai_change_leadership:83 } },
  { id:"acme-u-003", first:"Diane",    last:"Osei",       email:"diane.osei@acme.com",        jobTitle:"Head of People Operations",         roleFamily:"hr_leadership",      expLevel:"senior",    aiLevel:"regular",
    domains:{ ai_interaction:68, ai_output_evaluation:65, ai_workflow_design:58, workforce_ai_readiness:72, ai_ethics_trust:70, ai_change_leadership:74 } },
  { id:"acme-u-004", first:"Marcus",   last:"Trent",      email:"marcus.trent@acme.com",      jobTitle:"Director of HR Transformation",     roleFamily:"hr_leadership",      expLevel:"senior",    aiLevel:"regular",
    domains:{ ai_interaction:71, ai_output_evaluation:68, ai_workflow_design:62, workforce_ai_readiness:75, ai_ethics_trust:66, ai_change_leadership:80 } },
  { id:"acme-u-005", first:"Yemi",     last:"Adeyemi",    email:"yemi.adeyemi@acme.com",      jobTitle:"People Strategy Director",          roleFamily:"hr_leadership",      expLevel:"senior",    aiLevel:"advanced",
    domains:{ ai_interaction:78, ai_output_evaluation:74, ai_workflow_design:69, workforce_ai_readiness:82, ai_ethics_trust:80, ai_change_leadership:86 } },

  // ── Business Partnering (8) ───────────────────────────────────────────────
  { id:"acme-u-006", first:"James",    last:"Okafor",     email:"james.okafor@acme.com",      jobTitle:"Senior HR Business Partner",        roleFamily:"business_partnering", expLevel:"senior",   aiLevel:"regular",
    domains:{ ai_interaction:62, ai_output_evaluation:70, ai_workflow_design:45, workforce_ai_readiness:65, ai_ethics_trust:74, ai_change_leadership:60 } },
  { id:"acme-u-007", first:"Natalie",  last:"Cross",      email:"natalie.cross@acme.com",     jobTitle:"HR Business Partner",               roleFamily:"business_partnering", expLevel:"mid",      aiLevel:"occasional",
    domains:{ ai_interaction:55, ai_output_evaluation:58, ai_workflow_design:40, workforce_ai_readiness:60, ai_ethics_trust:65, ai_change_leadership:52 } },
  { id:"acme-u-008", first:"Kwame",    last:"Asante",     email:"kwame.asante@acme.com",      jobTitle:"HR Business Partner — Commercial",  roleFamily:"business_partnering", expLevel:"mid",      aiLevel:"occasional",
    domains:{ ai_interaction:48, ai_output_evaluation:52, ai_workflow_design:35, workforce_ai_readiness:55, ai_ethics_trust:60, ai_change_leadership:45 } },
  { id:"acme-u-009", first:"Sophie",   last:"Drummond",   email:"sophie.drummond@acme.com",   jobTitle:"HR Advisor",                        roleFamily:"business_partnering", expLevel:"mid",      aiLevel:"occasional",
    domains:{ ai_interaction:50, ai_output_evaluation:55, ai_workflow_design:38, workforce_ai_readiness:52, ai_ethics_trust:58, ai_change_leadership:48 } },
  { id:"acme-u-010", first:"Liam",     last:"Farrell",    email:"liam.farrell@acme.com",      jobTitle:"HR Generalist",                     roleFamily:"business_partnering", expLevel:"mid",      aiLevel:"none",
    domains:{ ai_interaction:38, ai_output_evaluation:42, ai_workflow_design:28, workforce_ai_readiness:40, ai_ethics_trust:45, ai_change_leadership:35 } },
  { id:"acme-u-011", first:"Amara",    last:"Diallo",     email:"amara.diallo@acme.com",      jobTitle:"HR Business Partner — Tech",        roleFamily:"business_partnering", expLevel:"senior",   aiLevel:"regular",
    domains:{ ai_interaction:65, ai_output_evaluation:68, ai_workflow_design:55, workforce_ai_readiness:70, ai_ethics_trust:72, ai_change_leadership:63 } },
  { id:"acme-u-012", first:"Tom",      last:"Whitfield",  email:"tom.whitfield@acme.com",     jobTitle:"HR Advisor — Employee Experience",  roleFamily:"business_partnering", expLevel:"mid",      aiLevel:"occasional",
    domains:{ ai_interaction:44, ai_output_evaluation:48, ai_workflow_design:32, workforce_ai_readiness:50, ai_ethics_trust:55, ai_change_leadership:42 } },
  { id:"acme-u-013", first:"Priya",    last:"Kapoor",     email:"priya.kapoor@acme.com",      jobTitle:"Junior HR Business Partner",        roleFamily:"business_partnering", expLevel:"junior",   aiLevel:"none",
    domains:{ ai_interaction:30, ai_output_evaluation:35, ai_workflow_design:22, workforce_ai_readiness:32, ai_ethics_trust:38, ai_change_leadership:28 } },

  // ── Talent Acquisition (7) ────────────────────────────────────────────────
  { id:"acme-u-014", first:"Priya",    last:"Sharma",     email:"priya.sharma@acme.com",      jobTitle:"Talent Acquisition Manager",        roleFamily:"talent_acquisition",  expLevel:"senior",   aiLevel:"regular",
    domains:{ ai_interaction:68, ai_output_evaluation:72, ai_workflow_design:60, workforce_ai_readiness:65, ai_ethics_trust:62, ai_change_leadership:55 } },
  { id:"acme-u-015", first:"Ethan",    last:"Boateng",    email:"ethan.boateng@acme.com",     jobTitle:"Senior Recruiter",                  roleFamily:"talent_acquisition",  expLevel:"mid",      aiLevel:"regular",
    domains:{ ai_interaction:60, ai_output_evaluation:65, ai_workflow_design:52, workforce_ai_readiness:58, ai_ethics_trust:55, ai_change_leadership:48 } },
  { id:"acme-u-016", first:"Isla",     last:"McGregor",   email:"isla.mcgregor@acme.com",     jobTitle:"Talent Partner — Tech",             roleFamily:"talent_acquisition",  expLevel:"mid",      aiLevel:"occasional",
    domains:{ ai_interaction:55, ai_output_evaluation:60, ai_workflow_design:44, workforce_ai_readiness:52, ai_ethics_trust:50, ai_change_leadership:42 } },
  { id:"acme-u-017", first:"Dayo",     last:"Ojo",        email:"dayo.ojo@acme.com",          jobTitle:"Recruiter",                         roleFamily:"talent_acquisition",  expLevel:"mid",      aiLevel:"occasional",
    domains:{ ai_interaction:48, ai_output_evaluation:52, ai_workflow_design:38, workforce_ai_readiness:45, ai_ethics_trust:48, ai_change_leadership:38 } },
  { id:"acme-u-018", first:"Hannah",   last:"Pearce",     email:"hannah.pearce@acme.com",     jobTitle:"Graduate Recruiter",                roleFamily:"talent_acquisition",  expLevel:"junior",   aiLevel:"none",
    domains:{ ai_interaction:35, ai_output_evaluation:40, ai_workflow_design:25, workforce_ai_readiness:38, ai_ethics_trust:42, ai_change_leadership:30 } },
  { id:"acme-u-019", first:"Oluwaseun",last:"Adebayo",    email:"oluwaseun.adebayo@acme.com", jobTitle:"Talent Sourcing Specialist",        roleFamily:"talent_acquisition",  expLevel:"mid",      aiLevel:"regular",
    domains:{ ai_interaction:62, ai_output_evaluation:58, ai_workflow_design:50, workforce_ai_readiness:55, ai_ethics_trust:52, ai_change_leadership:45 } },
  { id:"acme-u-020", first:"Chloe",    last:"Barker",     email:"chloe.barker@acme.com",      jobTitle:"Employer Brand Manager",            roleFamily:"talent_acquisition",  expLevel:"mid",      aiLevel:"occasional",
    domains:{ ai_interaction:58, ai_output_evaluation:62, ai_workflow_design:48, workforce_ai_readiness:60, ai_ethics_trust:55, ai_change_leadership:52 } },

  // ── Learning & Development (6) ────────────────────────────────────────────
  { id:"acme-u-021", first:"Tom",      last:"Brennan",    email:"tom.brennan@acme.com",       jobTitle:"Head of L&D",                       roleFamily:"learning_development", expLevel:"senior",  aiLevel:"regular",
    domains:{ ai_interaction:65, ai_output_evaluation:60, ai_workflow_design:58, workforce_ai_readiness:70, ai_ethics_trust:62, ai_change_leadership:75 } },
  { id:"acme-u-022", first:"Mei",      last:"Zhang",      email:"mei.zhang@acme.com",         jobTitle:"L&D Specialist — Digital",          roleFamily:"learning_development", expLevel:"mid",     aiLevel:"regular",
    domains:{ ai_interaction:62, ai_output_evaluation:58, ai_workflow_design:55, workforce_ai_readiness:65, ai_ethics_trust:58, ai_change_leadership:68 } },
  { id:"acme-u-023", first:"Patrick",  last:"O'Brien",    email:"patrick.obrien@acme.com",    jobTitle:"Learning Designer",                 roleFamily:"learning_development", expLevel:"mid",     aiLevel:"occasional",
    domains:{ ai_interaction:50, ai_output_evaluation:48, ai_workflow_design:42, workforce_ai_readiness:55, ai_ethics_trust:52, ai_change_leadership:58 } },
  { id:"acme-u-024", first:"Zara",     last:"Hussain",    email:"zara.hussain@acme.com",      jobTitle:"L&D Coordinator",                   roleFamily:"learning_development", expLevel:"junior",  aiLevel:"none",
    domains:{ ai_interaction:32, ai_output_evaluation:35, ai_workflow_design:25, workforce_ai_readiness:38, ai_ethics_trust:40, ai_change_leadership:42 } },
  { id:"acme-u-025", first:"Ben",      last:"Okonkwo",    email:"ben.okonkwo@acme.com",       jobTitle:"OD Consultant",                     roleFamily:"learning_development", expLevel:"senior",  aiLevel:"regular",
    domains:{ ai_interaction:68, ai_output_evaluation:65, ai_workflow_design:60, workforce_ai_readiness:72, ai_ethics_trust:65, ai_change_leadership:78 } },
  { id:"acme-u-026", first:"Freya",    last:"Lindqvist",  email:"freya.lindqvist@acme.com",   jobTitle:"Leadership Development Partner",    roleFamily:"learning_development", expLevel:"mid",     aiLevel:"occasional",
    domains:{ ai_interaction:55, ai_output_evaluation:52, ai_workflow_design:45, workforce_ai_readiness:60, ai_ethics_trust:56, ai_change_leadership:65 } },

  // ── Reward & Analytics (7) ────────────────────────────────────────────────
  { id:"acme-u-027", first:"Aisha",    last:"Kamara",     email:"aisha.kamara@acme.com",      jobTitle:"People Analytics Lead",             roleFamily:"reward_analytics",    expLevel:"senior",   aiLevel:"advanced",
    domains:{ ai_interaction:78, ai_output_evaluation:85, ai_workflow_design:72, workforce_ai_readiness:75, ai_ethics_trust:70, ai_change_leadership:65 } },
  { id:"acme-u-028", first:"Daniel",   last:"Park",       email:"daniel.park@acme.com",       jobTitle:"Compensation & Benefits Manager",   roleFamily:"reward_analytics",    expLevel:"mid",      aiLevel:"regular",
    domains:{ ai_interaction:55, ai_output_evaluation:68, ai_workflow_design:48, workforce_ai_readiness:58, ai_ethics_trust:62, ai_change_leadership:50 } },
  { id:"acme-u-029", first:"Nadia",    last:"Volkov",     email:"nadia.volkov@acme.com",      jobTitle:"Senior People Analyst",             roleFamily:"reward_analytics",    expLevel:"senior",   aiLevel:"advanced",
    domains:{ ai_interaction:75, ai_output_evaluation:82, ai_workflow_design:68, workforce_ai_readiness:72, ai_ethics_trust:68, ai_change_leadership:62 } },
  { id:"acme-u-030", first:"Ade",      last:"Bankole",    email:"ade.bankole@acme.com",       jobTitle:"Reward Analyst",                    roleFamily:"reward_analytics",    expLevel:"mid",      aiLevel:"regular",
    domains:{ ai_interaction:58, ai_output_evaluation:65, ai_workflow_design:50, workforce_ai_readiness:55, ai_ethics_trust:60, ai_change_leadership:48 } },
  { id:"acme-u-031", first:"Caitlin",  last:"Moore",      email:"caitlin.moore@acme.com",     jobTitle:"Benefits Specialist",               roleFamily:"reward_analytics",    expLevel:"mid",      aiLevel:"occasional",
    domains:{ ai_interaction:45, ai_output_evaluation:52, ai_workflow_design:38, workforce_ai_readiness:48, ai_ethics_trust:55, ai_change_leadership:40 } },
  { id:"acme-u-032", first:"Remi",     last:"Oladele",    email:"remi.oladele@acme.com",      jobTitle:"Workforce Planning Analyst",        roleFamily:"reward_analytics",    expLevel:"mid",      aiLevel:"regular",
    domains:{ ai_interaction:60, ai_output_evaluation:70, ai_workflow_design:55, workforce_ai_readiness:62, ai_ethics_trust:58, ai_change_leadership:52 } },
  { id:"acme-u-033", first:"Claire",   last:"Nguyen",     email:"claire.nguyen@acme.com",     jobTitle:"Junior People Analyst",             roleFamily:"reward_analytics",    expLevel:"junior",   aiLevel:"none",
    domains:{ ai_interaction:32, ai_output_evaluation:38, ai_workflow_design:25, workforce_ai_readiness:35, ai_ethics_trust:40, ai_change_leadership:28 } },

  // ── ER & Specialists (6) ──────────────────────────────────────────────────
  { id:"acme-u-034", first:"Fatima",   last:"Al-Hassan",  email:"fatima.alhassan@acme.com",   jobTitle:"DEI Programme Manager",             roleFamily:"er_specialists",      expLevel:"mid",      aiLevel:"occasional",
    domains:{ ai_interaction:48, ai_output_evaluation:55, ai_workflow_design:35, workforce_ai_readiness:52, ai_ethics_trust:78, ai_change_leadership:60 } },
  { id:"acme-u-035", first:"George",   last:"Mensah",     email:"george.mensah@acme.com",     jobTitle:"Employee Relations Manager",        roleFamily:"er_specialists",      expLevel:"senior",   aiLevel:"occasional",
    domains:{ ai_interaction:52, ai_output_evaluation:58, ai_workflow_design:40, workforce_ai_readiness:55, ai_ethics_trust:72, ai_change_leadership:58 } },
  { id:"acme-u-036", first:"Leila",    last:"Nazari",     email:"leila.nazari@acme.com",      jobTitle:"ER Specialist",                     roleFamily:"er_specialists",      expLevel:"mid",      aiLevel:"none",
    domains:{ ai_interaction:38, ai_output_evaluation:45, ai_workflow_design:28, workforce_ai_readiness:42, ai_ethics_trust:65, ai_change_leadership:45 } },
  { id:"acme-u-037", first:"Seun",     last:"Afolabi",    email:"seun.afolabi@acme.com",      jobTitle:"Wellbeing Lead",                    roleFamily:"er_specialists",      expLevel:"mid",      aiLevel:"occasional",
    domains:{ ai_interaction:45, ai_output_evaluation:50, ai_workflow_design:35, workforce_ai_readiness:55, ai_ethics_trust:68, ai_change_leadership:52 } },
  { id:"acme-u-038", first:"Ingrid",   last:"Larsson",    email:"ingrid.larsson@acme.com",    jobTitle:"OD Specialist",                     roleFamily:"er_specialists",      expLevel:"senior",   aiLevel:"regular",
    domains:{ ai_interaction:60, ai_output_evaluation:62, ai_workflow_design:50, workforce_ai_readiness:65, ai_ethics_trust:70, ai_change_leadership:68 } },
  { id:"acme-u-039", first:"Kofi",     last:"Mensah",     email:"kofi.mensah@acme.com",       jobTitle:"HR Policy Specialist",              roleFamily:"er_specialists",      expLevel:"mid",      aiLevel:"none",
    domains:{ ai_interaction:35, ai_output_evaluation:42, ai_workflow_design:25, workforce_ai_readiness:38, ai_ethics_trust:62, ai_change_leadership:40 } },

  // ── Operations & Tech (6) ─────────────────────────────────────────────────
  { id:"acme-u-040", first:"Marcus",   last:"Webb",       email:"marcus.webb@acme.com",       jobTitle:"HR Operations Manager",             roleFamily:"operations_tech",     expLevel:"mid",      aiLevel:"occasional",
    domains:{ ai_interaction:52, ai_output_evaluation:55, ai_workflow_design:62, workforce_ai_readiness:58, ai_ethics_trust:50, ai_change_leadership:48 } },
  { id:"acme-u-041", first:"Tunde",    last:"Akinwale",   email:"tunde.akinwale@acme.com",    jobTitle:"HRIS Manager",                      roleFamily:"operations_tech",     expLevel:"senior",   aiLevel:"advanced",
    domains:{ ai_interaction:72, ai_output_evaluation:68, ai_workflow_design:78, workforce_ai_readiness:65, ai_ethics_trust:60, ai_change_leadership:58 } },
  { id:"acme-u-042", first:"Saoirse",  last:"Murphy",     email:"saoirse.murphy@acme.com",    jobTitle:"HR Systems Analyst",                roleFamily:"operations_tech",     expLevel:"mid",      aiLevel:"regular",
    domains:{ ai_interaction:65, ai_output_evaluation:62, ai_workflow_design:70, workforce_ai_readiness:60, ai_ethics_trust:55, ai_change_leadership:50 } },
  { id:"acme-u-043", first:"Javier",   last:"Romero",     email:"javier.romero@acme.com",     jobTitle:"Shared Services Lead",              roleFamily:"operations_tech",     expLevel:"mid",      aiLevel:"occasional",
    domains:{ ai_interaction:48, ai_output_evaluation:50, ai_workflow_design:55, workforce_ai_readiness:52, ai_ethics_trust:45, ai_change_leadership:42 } },
  { id:"acme-u-044", first:"Nneka",    last:"Eze",        email:"nneka.eze@acme.com",         jobTitle:"HR Operations Coordinator",         roleFamily:"operations_tech",     expLevel:"junior",   aiLevel:"none",
    domains:{ ai_interaction:30, ai_output_evaluation:32, ai_workflow_design:38, workforce_ai_readiness:35, ai_ethics_trust:38, ai_change_leadership:28 } },
  { id:"acme-u-045", first:"Aleksei",  last:"Volkov",     email:"aleksei.volkov@acme.com",    jobTitle:"HR Technology Consultant",          roleFamily:"operations_tech",     expLevel:"senior",   aiLevel:"advanced",
    domains:{ ai_interaction:78, ai_output_evaluation:72, ai_workflow_design:82, workforce_ai_readiness:68, ai_ethics_trust:62, ai_change_leadership:60 } },

  // ── Graduates / Trainees (5) ──────────────────────────────────────────────
  { id:"acme-u-046", first:"Ravi",     last:"Patel",      email:"ravi.patel@acme.com",        jobTitle:"HR Graduate Trainee",               roleFamily:"business_partnering", expLevel:"junior",   aiLevel:"none",
    domains:{ ai_interaction:28, ai_output_evaluation:30, ai_workflow_design:20, workforce_ai_readiness:25, ai_ethics_trust:35, ai_change_leadership:22 } },
  { id:"acme-u-047", first:"Amelia",   last:"Foster",     email:"amelia.foster@acme.com",     jobTitle:"People Graduate — Talent Track",    roleFamily:"talent_acquisition",  expLevel:"junior",   aiLevel:"none",
    domains:{ ai_interaction:32, ai_output_evaluation:35, ai_workflow_design:22, workforce_ai_readiness:28, ai_ethics_trust:38, ai_change_leadership:25 } },
  { id:"acme-u-048", first:"Theo",     last:"Osei",       email:"theo.osei@acme.com",         jobTitle:"People Graduate — Analytics Track", roleFamily:"reward_analytics",    expLevel:"junior",   aiLevel:"occasional",
    domains:{ ai_interaction:40, ai_output_evaluation:45, ai_workflow_design:30, workforce_ai_readiness:35, ai_ethics_trust:42, ai_change_leadership:30 } },
  { id:"acme-u-049", first:"Jasmine",  last:"Chowdhury",  email:"jasmine.chowdhury@acme.com", jobTitle:"People Graduate — L&D Track",       roleFamily:"learning_development", expLevel:"junior",  aiLevel:"none",
    domains:{ ai_interaction:30, ai_output_evaluation:32, ai_workflow_design:22, workforce_ai_readiness:30, ai_ethics_trust:38, ai_change_leadership:35 } },
  { id:"acme-u-050", first:"Callum",   last:"Reid",       email:"callum.reid@acme.com",       jobTitle:"People Graduate — Ops Track",       roleFamily:"operations_tech",     expLevel:"junior",   aiLevel:"occasional",
    domains:{ ai_interaction:38, ai_output_evaluation:35, ai_workflow_design:42, workforce_ai_readiness:32, ai_ethics_trust:35, ai_change_leadership:28 } },
];

// ── 1. Ensure tenant exists ───────────────────────────────────────────────────
await conn.query(`
  INSERT INTO tenants (id, name, slug, primary_domain, status, plan, created_at, updated_at)
  VALUES (?, 'ACME Corporation', 'acme', 'acme.com', 'active', 'enterprise', NOW(), NOW())
  ON DUPLICATE KEY UPDATE name='ACME Corporation', status='active', plan='enterprise', updated_at=NOW()
`, [tenantId]);
console.log("✓ Tenant ensured");

// ── 2. Upsert users ───────────────────────────────────────────────────────────
for (const u of USERS) {
  await conn.query(`
    INSERT INTO users (id, tenant_id, email, first_name, last_name, status,
      experience_level, ai_usage_level, job_function, role_family,
      onboarding_completed, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, 1, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      first_name=VALUES(first_name), last_name=VALUES(last_name),
      role_family=VALUES(role_family), job_function=VALUES(job_function),
      experience_level=VALUES(experience_level), ai_usage_level=VALUES(ai_usage_level),
      updated_at=NOW()
  `, [u.id, tenantId, u.email, u.first, u.last,
      u.expLevel, u.aiLevel, u.jobTitle, u.roleFamily]);
}
console.log(`✓ ${USERS.length} users upserted`);

// ── 3. Assign hr_leader role to leadership users ──────────────────────────────
const [roleRows] = await conn.query(`SELECT id FROM roles WHERE \`key\` = 'hr_leader' LIMIT 1`);
if (roleRows.length > 0) {
  const roleId = roleRows[0].id;
  const leaderIds = USERS.filter(u => u.roleFamily === "hr_leadership").map(u => u.id);
  for (const uid of leaderIds) {
    await conn.query(`
      INSERT INTO user_roles (id, tenant_id, user_id, role_id, assigned_at)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE role_id=VALUES(role_id)
    `, [randomUUID(), tenantId, uid, roleId]);
  }
  console.log(`✓ hr_leader role assigned to ${leaderIds.length} leadership users`);
}

// ── 4. Get blueprint ──────────────────────────────────────────────────────────
const [blueprints] = await conn.query(`SELECT id FROM assessment_blueprints WHERE status='published' LIMIT 1`);
if (blueprints.length === 0) throw new Error("No published blueprint found — run seed-assessment-questions.mjs first");
const blueprintId = blueprints[0].id;
console.log(`✓ Using blueprint: ${blueprintId}`);

// ── 5. Get scenarios ──────────────────────────────────────────────────────────
const [scenarios] = await conn.query(`
  SELECT cs.id, cs.domain, cs.difficulty
  FROM content_scenarios cs
  WHERE cs.status = 'published'
    AND EXISTS (SELECT 1 FROM content_scenario_options cso WHERE cso.scenario_id = cs.id)
  ORDER BY RAND()
  LIMIT 200
`);
const [allOptions] = await conn.query(`
  SELECT cso.scenario_id, cso.id as option_id, cso.label as option_key, cso.outcome_class, cso.signal_deltas_json
  FROM content_scenario_options cso
`);
const optsByScenario = {};
for (const o of allOptions) {
  if (!optsByScenario[o.scenario_id]) optsByScenario[o.scenario_id] = [];
  optsByScenario[o.scenario_id].push(o);
}
console.log(`✓ ${scenarios.length} scenarios loaded`);

// Outcome class → score weight
const OUTCOME_WEIGHTS = { excellent: 1.0, good: 0.75, acceptable: 0.5, weak: 0.25, poor: 0.1, critical_failure: 0.0 };

/**
 * Pick an outcome option biased toward the target score (0–100).
 * Higher target → more likely to pick excellent/good.
 */
function pickBiasedOutcome(opts, targetScore) {
  const t = targetScore / 100; // 0–1
  // Build weights: excellent gets t^0.5, critical_failure gets (1-t)^0.5
  const weights = {
    excellent: Math.pow(t, 0.6),
    good: Math.pow(t, 0.4) * 0.8,
    acceptable: 0.3,
    weak: Math.pow(1 - t, 0.4) * 0.5,
    poor: Math.pow(1 - t, 0.6) * 0.3,
    critical_failure: Math.pow(1 - t, 0.8) * 0.1,
  };
  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  let r = Math.random() * total;
  const preferred = ["excellent", "good", "acceptable", "weak", "poor", "critical_failure"];
  const sorted = [...opts].sort((a, b) => preferred.indexOf(a.outcome_class) - preferred.indexOf(b.outcome_class));
  for (const opt of sorted) {
    r -= weights[opt.outcome_class] ?? 0.1;
    if (r <= 0) return opt;
  }
  return sorted[0];
}

// ── 6. Create assessment sessions and scores ──────────────────────────────────
const summary = [];
for (let i = 0; i < USERS.length; i++) {
  const u = USERS[i];
  // Determine session state: 80% completed, 10% in_progress, 10% abandoned
  const stateRoll = Math.random();
  const state = stateRoll < 0.80 ? "completed" : stateRoll < 0.90 ? "in_progress" : "abandoned";
  const totalCount = 35 + Math.floor(Math.random() * 10); // 35–44 questions
  const answeredCount = state === "completed" ? totalCount : Math.floor(totalCount * (0.2 + Math.random() * 0.5));

  // Stagger start dates over last 90 days
  const daysAgo = 5 + Math.floor(Math.random() * 85);
  const startedAt = new Date(Date.now() - daysAgo * 86400000);
  const completedAt = state === "completed" ? new Date(startedAt.getTime() + (40 + Math.random() * 40) * 60000) : null;

  const sessionId = `acme-rs-${u.id}`;
  await conn.query(`
    INSERT INTO assessment_sessions (id, tenant_id, user_id, blueprint_id, state,
      started_at, completed_at, session_metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, '{}', NOW())
    ON DUPLICATE KEY UPDATE state=VALUES(state), completed_at=VALUES(completed_at)
  `, [sessionId, tenantId, u.id, blueprintId, state, startedAt, completedAt]);

  // Compute average target score for this user
  const avgTarget = Math.round(Object.values(u.domains).reduce((s, v) => s + v, 0) / DOMAINS.length);

  // Insert answers
  const answers = [];
  const userScenarios = scenarios.slice((i * 7) % Math.max(1, scenarios.length - 40), ((i * 7) % Math.max(1, scenarios.length - 40)) + totalCount);
  for (let j = 0; j < answeredCount; j++) {
    const scenario = userScenarios[j % userScenarios.length];
    const opts = optsByScenario[scenario.id] || [];
    if (opts.length === 0) continue;
    const chosen = pickBiasedOutcome(opts, avgTarget);
    const confidence = clamp(0.3 + (avgTarget / 100) * 0.5 + (Math.random() - 0.5) * 0.2, 0.1, 0.95);
    const timeMs = 12000 + Math.floor(Math.random() * 80000);
    await conn.query(`
      INSERT INTO assessment_answers (id, session_id, item_id, selected_value_json,
        confidence_score, time_to_answer_ms, revision_count, outcome_class,
        signal_deltas_json, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE outcome_class=VALUES(outcome_class)
    `, [randomUUID(), sessionId, scenario.id,
        JSON.stringify({ optionKey: chosen.option_key, label: chosen.option_key }),
        confidence.toFixed(4), timeMs, Math.random() < 0.08 ? 1 : 0,
        chosen.outcome_class,
        (() => { try { JSON.parse(chosen.signal_deltas_json); return chosen.signal_deltas_json; } catch { return "{}"; } })()]);
    answers.push({ outcomeClass: chosen.outcome_class, confidence });
  }

  // Build and insert score
  if (state === "completed" && answers.length > 0) {
    const breakdown = buildBreakdown(u.domains, answers.length);
    const overallScore = breakdown.overall_score;
    await conn.query(`
      INSERT INTO assessment_scores (id, session_id, overall_score, score_breakdown_json,
        signal_scores_json, generated_at, model_version)
      VALUES (?, ?, ?, ?, '{}', NOW(), '2.0')
      ON DUPLICATE KEY UPDATE
        overall_score=VALUES(overall_score),
        score_breakdown_json=VALUES(score_breakdown_json),
        generated_at=NOW()
    `, [randomUUID(), sessionId, overallScore.toFixed(4), JSON.stringify(breakdown)]);
    summary.push({ name: `${u.first} ${u.last}`, role: u.jobTitle, rf: u.roleFamily, score: Math.round(overallScore * 100), readiness: breakdown.readiness_state });
  } else {
    summary.push({ name: `${u.first} ${u.last}`, role: u.jobTitle, rf: u.roleFamily, score: "—", readiness: state });
  }
}
console.log(`✓ Assessment sessions and scores created`);

// ── 7. Print summary ──────────────────────────────────────────────────────────
console.log("\n── Acme Re-seed Summary ─────────────────────────────────────────────────");
console.log(`${"Name".padEnd(20)} ${"Role Family".padEnd(22)} ${"Score".padStart(5)}  Readiness`);
console.log("─".repeat(75));
for (const s of summary) {
  console.log(`${s.name.padEnd(20)} ${s.rf.padEnd(22)} ${String(s.score).padStart(5)}  ${s.readiness}`);
}
console.log("─".repeat(75));

// Readiness distribution
const completed = summary.filter(s => typeof s.score === "number");
const dist = { ai_ready: 0, developing: 0, not_yet_ready: 0, foundation_gap: 0 };
for (const s of completed) dist[s.readiness] = (dist[s.readiness] || 0) + 1;
console.log(`\nReadiness distribution (${completed.length} completed):`);
for (const [k, v] of Object.entries(dist)) {
  const pct = Math.round((v / completed.length) * 100);
  console.log(`  ${k.padEnd(20)} ${v} (${pct}%)`);
}

await conn.end();
console.log("\n✓ Done");
