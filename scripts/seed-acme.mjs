/**
 * Acme Ltd Demo Org Seed Script
 * 50 HR employees, completed assessments, realistic score distribution
 * Company code: acme | Password: manutd99
 */
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
const { createConnection } = mysql;
import { randomUUID } from "crypto";

const BLUEPRINT_ID = "bp-aiq-v10-standard";
const PASSWORD = "manutd99";
const TENANT_SLUG = "acme";
const TENANT_ID = "tenant-acme-ltd";
const TENANT_NAME = "Acme Ltd";

// ─── Org Structure ────────────────────────────────────────────────────────────
// 50 HR employees across all major HR roles
// Realistic bell-curve: ~10% high performers (75+), ~65% mid range (45-74), ~25% developing (20-44)
// Readiness states: safe ~20%, at_risk ~55%, unsafe ~25%

const ORG = [
  // ── C-Suite / Executive (2) ─────────────────────────────────────────────
  { id: "u-acme-001", firstName: "Sarah", lastName: "Thornton",    email: "sarah.thornton@acme.co.uk",    role: "hr_leader",  jobTitle: "Chief People Officer",          dept: "Executive",         seniority: "executive",  score: 82, state: "safe",    credBand: "high",   riskBand: "low"    },
  { id: "u-acme-002", firstName: "James", lastName: "Whitfield",   email: "james.whitfield@acme.co.uk",   role: "hr_leader",  jobTitle: "Deputy CPO",                    dept: "Executive",         seniority: "executive",  score: 76, state: "safe",    credBand: "high",   riskBand: "low"    },

  // ── HR Business Partners (8) ─────────────────────────────────────────────
  { id: "u-acme-003", firstName: "Priya",   lastName: "Sharma",     email: "priya.sharma@acme.co.uk",      role: "manager",    jobTitle: "Senior HRBP — Technology",      dept: "HRBP",              seniority: "senior",     score: 71, state: "safe",    credBand: "high",   riskBand: "low"    },
  { id: "u-acme-004", firstName: "Marcus",  lastName: "Okafor",     email: "marcus.okafor@acme.co.uk",     role: "manager",    jobTitle: "Senior HRBP — Operations",      dept: "HRBP",              seniority: "senior",     score: 68, state: "safe",    credBand: "medium", riskBand: "low"    },
  { id: "u-acme-005", firstName: "Fiona",   lastName: "MacLeod",    email: "fiona.macleod@acme.co.uk",     role: "manager",    jobTitle: "HRBP — Commercial",             dept: "HRBP",              seniority: "mid",        score: 59, state: "at_risk", credBand: "medium", riskBand: "medium" },
  { id: "u-acme-006", firstName: "Daniel",  lastName: "Reyes",      email: "daniel.reyes@acme.co.uk",      role: "manager",    jobTitle: "HRBP — Finance",                dept: "HRBP",              seniority: "mid",        score: 54, state: "at_risk", credBand: "medium", riskBand: "medium" },
  { id: "u-acme-007", firstName: "Amara",   lastName: "Diallo",     email: "amara.diallo@acme.co.uk",      role: "learner",    jobTitle: "HRBP — Marketing",              dept: "HRBP",              seniority: "mid",        score: 48, state: "at_risk", credBand: "medium", riskBand: "medium" },
  { id: "u-acme-008", firstName: "Tom",     lastName: "Griffiths",  email: "tom.griffiths@acme.co.uk",     role: "learner",    jobTitle: "HRBP — Supply Chain",           dept: "HRBP",              seniority: "mid",        score: 43, state: "at_risk", credBand: "low",    riskBand: "medium" },
  { id: "u-acme-009", firstName: "Zoe",     lastName: "Patel",      email: "zoe.patel@acme.co.uk",         role: "learner",    jobTitle: "Junior HRBP",                   dept: "HRBP",              seniority: "junior",     score: 36, state: "at_risk", credBand: "low",    riskBand: "high"   },
  { id: "u-acme-010", firstName: "Kieran",  lastName: "Walsh",      email: "kieran.walsh@acme.co.uk",      role: "learner",    jobTitle: "Junior HRBP",                   dept: "HRBP",              seniority: "junior",     score: 29, state: "unsafe",  credBand: "low",    riskBand: "high"   },

  // ── Talent Acquisition (6) ───────────────────────────────────────────────
  { id: "u-acme-011", firstName: "Rachel",  lastName: "Osei",       email: "rachel.osei@acme.co.uk",       role: "manager",    jobTitle: "Head of Talent Acquisition",    dept: "Talent",            seniority: "senior",     score: 74, state: "safe",    credBand: "high",   riskBand: "low"    },
  { id: "u-acme-012", firstName: "Ben",     lastName: "Kowalski",   email: "ben.kowalski@acme.co.uk",      role: "learner",    jobTitle: "Senior Recruiter — Tech",       dept: "Talent",            seniority: "mid",        score: 61, state: "at_risk", credBand: "medium", riskBand: "low"    },
  { id: "u-acme-013", firstName: "Nia",     lastName: "Thompson",   email: "nia.thompson@acme.co.uk",      role: "learner",    jobTitle: "Recruiter — Commercial",        dept: "Talent",            seniority: "mid",        score: 55, state: "at_risk", credBand: "medium", riskBand: "medium" },
  { id: "u-acme-014", firstName: "Luca",    lastName: "Ferrari",    email: "luca.ferrari@acme.co.uk",      role: "learner",    jobTitle: "Recruiter — Operations",        dept: "Talent",            seniority: "mid",        score: 47, state: "at_risk", credBand: "low",    riskBand: "medium" },
  { id: "u-acme-015", firstName: "Aisha",   lastName: "Mensah",     email: "aisha.mensah@acme.co.uk",      role: "learner",    jobTitle: "Junior Recruiter",              dept: "Talent",            seniority: "junior",     score: 33, state: "unsafe",  credBand: "low",    riskBand: "high"   },
  { id: "u-acme-016", firstName: "Connor",  lastName: "Burke",      email: "connor.burke@acme.co.uk",      role: "learner",    jobTitle: "Talent Coordinator",            dept: "Talent",            seniority: "junior",     score: 27, state: "unsafe",  credBand: "low",    riskBand: "high"   },

  // ── Learning & Development (6) ───────────────────────────────────────────
  { id: "u-acme-017", firstName: "Helen",   lastName: "Nakamura",   email: "helen.nakamura@acme.co.uk",    role: "manager",    jobTitle: "Head of L&D",                   dept: "L&D",               seniority: "senior",     score: 78, state: "safe",    credBand: "high",   riskBand: "low"    },
  { id: "u-acme-018", firstName: "Kwame",   lastName: "Asante",     email: "kwame.asante@acme.co.uk",      role: "learner",    jobTitle: "L&D Business Partner",          dept: "L&D",               seniority: "mid",        score: 65, state: "safe",    credBand: "medium", riskBand: "low"    },
  { id: "u-acme-019", firstName: "Sophie",  lastName: "Laurent",    email: "sophie.laurent@acme.co.uk",    role: "learner",    jobTitle: "L&D Specialist — Digital",      dept: "L&D",               seniority: "mid",        score: 58, state: "at_risk", credBand: "medium", riskBand: "medium" },
  { id: "u-acme-020", firstName: "Ravi",    lastName: "Krishnan",   email: "ravi.krishnan@acme.co.uk",     role: "learner",    jobTitle: "L&D Specialist — Leadership",   dept: "L&D",               seniority: "mid",        score: 52, state: "at_risk", credBand: "medium", riskBand: "medium" },
  { id: "u-acme-021", firstName: "Megan",   lastName: "Price",      email: "megan.price@acme.co.uk",       role: "learner",    jobTitle: "Learning Designer",             dept: "L&D",               seniority: "junior",     score: 40, state: "at_risk", credBand: "low",    riskBand: "medium" },
  { id: "u-acme-022", firstName: "Ethan",   lastName: "Saunders",   email: "ethan.saunders@acme.co.uk",    role: "learner",    jobTitle: "Learning Coordinator",          dept: "L&D",               seniority: "junior",     score: 31, state: "unsafe",  credBand: "low",    riskBand: "high"   },

  // ── Reward & Compensation (5) ────────────────────────────────────────────
  { id: "u-acme-023", firstName: "Claire",  lastName: "Drummond",   email: "claire.drummond@acme.co.uk",   role: "manager",    jobTitle: "Head of Reward",                dept: "Reward",            seniority: "senior",     score: 69, state: "safe",    credBand: "high",   riskBand: "low"    },
  { id: "u-acme-024", firstName: "Yusuf",   lastName: "Al-Rashid",  email: "yusuf.alrashid@acme.co.uk",    role: "learner",    jobTitle: "Reward Analyst — Senior",       dept: "Reward",            seniority: "mid",        score: 62, state: "at_risk", credBand: "medium", riskBand: "low"    },
  { id: "u-acme-025", firstName: "Natalie", lastName: "Fox",        email: "natalie.fox@acme.co.uk",       role: "learner",    jobTitle: "Reward Analyst",                dept: "Reward",            seniority: "mid",        score: 50, state: "at_risk", credBand: "medium", riskBand: "medium" },
  { id: "u-acme-026", firstName: "Oliver",  lastName: "Chan",       email: "oliver.chan@acme.co.uk",       role: "learner",    jobTitle: "Compensation Specialist",       dept: "Reward",            seniority: "mid",        score: 44, state: "at_risk", credBand: "low",    riskBand: "medium" },
  { id: "u-acme-027", firstName: "Imogen",  lastName: "Blake",      email: "imogen.blake@acme.co.uk",      role: "learner",    jobTitle: "Benefits Coordinator",          dept: "Reward",            seniority: "junior",     score: 35, state: "at_risk", credBand: "low",    riskBand: "high"   },

  // ── Employee Relations (5) ───────────────────────────────────────────────
  { id: "u-acme-028", firstName: "Patrick", lastName: "O'Brien",    email: "patrick.obrien@acme.co.uk",    role: "manager",    jobTitle: "Head of Employee Relations",    dept: "ER",                seniority: "senior",     score: 66, state: "safe",    credBand: "high",   riskBand: "low"    },
  { id: "u-acme-029", firstName: "Leila",   lastName: "Hassan",     email: "leila.hassan@acme.co.uk",      role: "learner",    jobTitle: "Senior ER Adviser",             dept: "ER",                seniority: "mid",        score: 57, state: "at_risk", credBand: "medium", riskBand: "medium" },
  { id: "u-acme-030", firstName: "George",  lastName: "Papadopoulos", email: "george.papadopoulos@acme.co.uk", role: "learner", jobTitle: "ER Adviser",                  dept: "ER",                seniority: "mid",        score: 49, state: "at_risk", credBand: "medium", riskBand: "medium" },
  { id: "u-acme-031", firstName: "Tanya",   lastName: "Ivanova",    email: "tanya.ivanova@acme.co.uk",     role: "learner",    jobTitle: "ER Coordinator",                dept: "ER",                seniority: "junior",     score: 38, state: "at_risk", credBand: "low",    riskBand: "high"   },
  { id: "u-acme-032", firstName: "Sam",     lastName: "Adeyemi",    email: "sam.adeyemi@acme.co.uk",       role: "learner",    jobTitle: "ER Administrator",              dept: "ER",                seniority: "junior",     score: 24, state: "unsafe",  credBand: "low",    riskBand: "high"   },

  // ── People Analytics (4) ─────────────────────────────────────────────────
  { id: "u-acme-033", firstName: "Mei",     lastName: "Zhang",      email: "mei.zhang@acme.co.uk",         role: "manager",    jobTitle: "Head of People Analytics",      dept: "Analytics",         seniority: "senior",     score: 85, state: "safe",    credBand: "high",   riskBand: "low"    },
  { id: "u-acme-034", firstName: "Arjun",   lastName: "Nair",       email: "arjun.nair@acme.co.uk",        role: "learner",    jobTitle: "Senior People Data Analyst",    dept: "Analytics",         seniority: "mid",        score: 79, state: "safe",    credBand: "high",   riskBand: "low"    },
  { id: "u-acme-035", firstName: "Chloe",   lastName: "Beaumont",   email: "chloe.beaumont@acme.co.uk",    role: "learner",    jobTitle: "People Data Analyst",           dept: "Analytics",         seniority: "mid",        score: 63, state: "at_risk", credBand: "medium", riskBand: "low"    },
  { id: "u-acme-036", firstName: "Hassan",  lastName: "Malik",      email: "hassan.malik@acme.co.uk",      role: "learner",    jobTitle: "HR Systems Analyst",            dept: "Analytics",         seniority: "mid",        score: 55, state: "at_risk", credBand: "medium", riskBand: "medium" },

  // ── Organisational Development (4) ──────────────────────────────────────
  { id: "u-acme-037", firstName: "Ingrid",  lastName: "Sorensen",   email: "ingrid.sorensen@acme.co.uk",   role: "manager",    jobTitle: "Head of OD",                    dept: "OD",                seniority: "senior",     score: 73, state: "safe",    credBand: "high",   riskBand: "low"    },
  { id: "u-acme-038", firstName: "Tobias",  lastName: "Müller",     email: "tobias.muller@acme.co.uk",     role: "learner",    jobTitle: "OD Consultant",                 dept: "OD",                seniority: "mid",        score: 60, state: "at_risk", credBand: "medium", riskBand: "medium" },
  { id: "u-acme-039", firstName: "Fatima",  lastName: "Al-Amin",    email: "fatima.alamin@acme.co.uk",     role: "learner",    jobTitle: "Change Management Specialist",  dept: "OD",                seniority: "mid",        score: 51, state: "at_risk", credBand: "medium", riskBand: "medium" },
  { id: "u-acme-040", firstName: "Jack",    lastName: "Morrison",   email: "jack.morrison@acme.co.uk",     role: "learner",    jobTitle: "OD Analyst",                    dept: "OD",                seniority: "junior",     score: 37, state: "at_risk", credBand: "low",    riskBand: "high"   },

  // ── Diversity, Equity & Inclusion (3) ───────────────────────────────────
  { id: "u-acme-041", firstName: "Amelia",  lastName: "Okonkwo",    email: "amelia.okonkwo@acme.co.uk",    role: "manager",    jobTitle: "Head of DEI",                   dept: "DEI",               seniority: "senior",     score: 70, state: "safe",    credBand: "high",   riskBand: "low"    },
  { id: "u-acme-042", firstName: "Jordan",  lastName: "Ellis",      email: "jordan.ellis@acme.co.uk",      role: "learner",    jobTitle: "DEI Programme Manager",         dept: "DEI",               seniority: "mid",        score: 56, state: "at_risk", credBand: "medium", riskBand: "medium" },
  { id: "u-acme-043", firstName: "Suki",    lastName: "Watanabe",   email: "suki.watanabe@acme.co.uk",     role: "learner",    jobTitle: "DEI Analyst",                   dept: "DEI",               seniority: "junior",     score: 42, state: "at_risk", credBand: "low",    riskBand: "medium" },

  // ── HR Operations & Shared Services (5) ─────────────────────────────────
  { id: "u-acme-044", firstName: "Victoria",lastName: "Hartley",    email: "victoria.hartley@acme.co.uk",  role: "manager",    jobTitle: "Head of HR Operations",         dept: "HR Ops",            seniority: "senior",     score: 64, state: "at_risk", credBand: "medium", riskBand: "low"    },
  { id: "u-acme-045", firstName: "Damian",  lastName: "Kowalczyk",  email: "damian.kowalczyk@acme.co.uk",  role: "learner",    jobTitle: "HR Operations Manager",         dept: "HR Ops",            seniority: "mid",        score: 53, state: "at_risk", credBand: "medium", riskBand: "medium" },
  { id: "u-acme-046", firstName: "Layla",   lastName: "Hussain",    email: "layla.hussain@acme.co.uk",     role: "learner",    jobTitle: "HR Advisor",                    dept: "HR Ops",            seniority: "mid",        score: 46, state: "at_risk", credBand: "low",    riskBand: "medium" },
  { id: "u-acme-047", firstName: "Nathan",  lastName: "Pearce",     email: "nathan.pearce@acme.co.uk",     role: "learner",    jobTitle: "HR Coordinator",                dept: "HR Ops",            seniority: "junior",     score: 34, state: "unsafe",  credBand: "low",    riskBand: "high"   },
  { id: "u-acme-048", firstName: "Grace",   lastName: "Nwosu",      email: "grace.nwosu@acme.co.uk",       role: "learner",    jobTitle: "HR Administrator",              dept: "HR Ops",            seniority: "junior",     score: 26, state: "unsafe",  credBand: "low",    riskBand: "high"   },

  // ── Workforce Planning (3) ───────────────────────────────────────────────
  { id: "u-acme-049", firstName: "Alexei",  lastName: "Volkov",     email: "alexei.volkov@acme.co.uk",     role: "manager",    jobTitle: "Workforce Planning Manager",    dept: "Workforce Planning",seniority: "senior",     score: 67, state: "safe",    credBand: "high",   riskBand: "low"    },
  { id: "u-acme-050", firstName: "Diane",   lastName: "Chambers",   email: "diane.chambers@acme.co.uk",    role: "learner",    jobTitle: "Workforce Planner",             dept: "Workforce Planning",seniority: "mid",        score: 45, state: "at_risk", credBand: "low",    riskBand: "medium" },
];

// ─── Score → Capability Breakdown ─────────────────────────────────────────────
// Generates realistic per-domain scores from an overall score
function generateCapabilityScores(overall, seed) {
  const domains = [
    { key: "ai_interaction",        label: "AI Interaction",          weight: 0.20 },
    { key: "ai_output_evaluation",  label: "AI Output Evaluation",    weight: 0.25 },
    { key: "ai_workflow_design",    label: "AI Workflow Design",      weight: 0.20 },
    { key: "workforce_ai_readiness",label: "Workforce AI Readiness",  weight: 0.15 },
    { key: "ai_ethics",             label: "AI Ethics & Employee Trust", weight: 0.10 },
    { key: "ai_change_leadership",  label: "AI Change Leadership",    weight: 0.10 },
  ];
  const colours = {
    ai_interaction: "#1D4ED8",
    ai_output_evaluation: "#7C3AED",
    ai_workflow_design: "#0F766E",
    workforce_ai_readiness: "#B45309",
    ai_ethics: "#BE123C",
    ai_change_leadership: "#1E40AF",
  };
  // Pseudo-random variation based on seed
  let r = seed;
  function rand() { r = (r * 1664525 + 1013904223) & 0xffffffff; return (r >>> 0) / 0xffffffff; }
  const scores = {};
  for (const d of domains) {
    // Vary ±15 from overall, clamped to [10, 95]
    const variation = (rand() - 0.5) * 30;
    const raw = Math.round(overall + variation);
    const clamped = Math.max(10, Math.min(95, raw));
    scores[d.key] = {
      score: clamped,
      displayName: d.label,
      colour: colours[d.key],
      signalCount: Math.floor(rand() * 5) + 3,
    };
  }
  return scores;
}

// ─── Score → Signal Scores ─────────────────────────────────────────────────
function generateSignalScores(overall, seed) {
  const signals = [
    "prompt_quality","iteration_quality","context_framing","tool_selection",
    "error_detection_quality","fitness_for_purpose","confidence_calibration","source_verification",
    "process_analysis","handoff_design","efficiency_gain","oversight_integration",
    "gap_diagnosis","intervention_quality","advisory_quality","measurement_rigour",
    "ethical_reasoning","pressure_resistance","stakeholder_awareness","trust_preservation",
    "transparency_quality","resistance_handling","pace_calibration","legitimate_concern_recognition",
    "change_sustainability","vision_articulation",
  ];
  let r = seed + 999;
  function rand() { r = (r * 1664525 + 1013904223) & 0xffffffff; return (r >>> 0) / 0xffffffff; }
  const out = {};
  const baseline = (overall - 50) / 100; // -0.5 to +0.45
  for (const s of signals) {
    const delta = baseline + (rand() - 0.5) * 0.4;
    out[s] = parseFloat(Math.max(-0.5, Math.min(0.5, delta)).toFixed(3));
  }
  return out;
}

// ─── Readiness Config ─────────────────────────────────────────────────────────
function getReadinessConfig(state) {
  const map = {
    safe:    { label: "AI Ready",        description: "Demonstrates the capability to use AI tools responsibly and effectively in HR practice.", barColor: "#228833" },
    at_risk: { label: "Developing",      description: "Shows foundational AI capability with identifiable gaps. Targeted development recommended.", barColor: "#EE8866" },
    unsafe:  { label: "Not Yet Ready",   description: "Significant capability gaps identified. Structured development required before AI-assisted decisions.", barColor: "#EE6677" },
    unknown: { label: "Insufficient Data", description: "Insufficient evidence to classify.", barColor: "#888888" },
  };
  return map[state] ?? map.unknown;
}

// ─── Narrative Templates ──────────────────────────────────────────────────────
function generateNarrative(user, overall, state) {
  const stateLabel = getReadinessConfig(state).label;
  const strengthDomain = overall >= 65 ? "AI Output Evaluation" : "AI Interaction";
  const gapDomain = overall < 55 ? "AI Workflow Design" : "AI Change Leadership";
  return `${user.firstName} ${user.lastName} (${user.jobTitle}) completed the AiQ Adaptive Assessment with an overall score of ${overall}/100, classified as ${stateLabel}. ` +
    `Relative strengths were observed in ${strengthDomain}, with development opportunities identified in ${gapDomain}. ` +
    (state === "safe" ? "This profile supports supervised use of AI tools in HR decision-making contexts." :
     state === "at_risk" ? "A targeted development plan is recommended, focusing on practical AI application and output evaluation." :
     "Structured capability development is required before AI-assisted HR decisions are appropriate.");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const conn = await createConnection(process.env.DATABASE_URL);
  console.log("✓ Connected to database");

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  console.log("✓ Password hashed");

  // ── 1. Tenant ──────────────────────────────────────────────────────────────
  await conn.execute(`
    INSERT INTO tenants (id, name, slug, primary_domain, status, plan, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'active', 'enterprise', NOW(), NOW())
    ON DUPLICATE KEY UPDATE name=VALUES(name), status='active', plan='enterprise'
  `, [TENANT_ID, TENANT_NAME, TENANT_SLUG, "acme.co.uk"]);
  console.log("✓ Tenant created: Acme Ltd (slug: acme)");

  await conn.execute(`
    INSERT INTO tenant_settings (id, tenant_id, credibility_threshold, revalidation_days_low, revalidation_days_medium, revalidation_days_high, config_json, created_at, updated_at)
    VALUES (?, ?, 0.7500, 90, 60, 30, '{}', NOW(), NOW())
    ON DUPLICATE KEY UPDATE tenant_id=tenant_id
  `, [`ts-${TENANT_ID}`, TENANT_ID]);

  // ── 2. Users ───────────────────────────────────────────────────────────────
  for (const u of ORG) {
    await conn.execute(`
      INSERT INTO users (id, tenant_id, email, first_name, last_name, password_hash, status, onboarding_completed, experience_level, ai_usage_level, job_function, seniority_level, sector, role_family, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', true, ?, ?, ?, ?, 'Professional Services', ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE first_name=VALUES(first_name), status='active'
    `, [
      u.id, TENANT_ID, u.email, u.firstName, u.lastName, passwordHash,
      u.seniority === "junior" ? "junior" : u.seniority === "mid" ? "mid" : "senior",
      u.score >= 65 ? "regular" : u.score >= 45 ? "occasional" : "none",
      u.jobTitle, u.seniority, u.dept,
    ]);

    // Assign role
    const roleId = u.role === "hr_leader" ? "role-hl-001" :
                   u.role === "manager"   ? "role-mgr-001" :
                   u.role === "auditor"   ? "role-aud-001" : "role-lrn-001";
    const urId = `ur-${u.id}`;
    await conn.execute(`
      INSERT INTO user_roles (id, tenant_id, user_id, role_id, assigned_at)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE role_id=VALUES(role_id)
    `, [urId, TENANT_ID, u.id, roleId]);
  }
  console.log(`✓ ${ORG.length} users created with roles`);

  // ── 3. Assessment Sessions + Scores ────────────────────────────────────────
  // Stagger completion dates over the past 90 days
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < ORG.length; i++) {
    const u = ORG[i];
    const sessionId = `sess-acme-${u.id}`;
    const scoreId = `score-acme-${u.id}`;

    // Stagger completion: spread over 90 days
    const completedAt = new Date(ninetyDaysAgo + (i / ORG.length) * (now - ninetyDaysAgo));
    const startedAt = new Date(completedAt.getTime() - (15 + Math.floor(Math.random() * 30)) * 60 * 1000);

    const capabilityScores = generateCapabilityScores(u.score, i * 7919 + 1);
    const signalScores = generateSignalScores(u.score, i * 6271 + 3);
    const narrative = generateNarrative(u, u.score, u.state);
    const readinessConfig = getReadinessConfig(u.state);

    const credScore = u.credBand === "high" ? 0.85 : u.credBand === "medium" ? 0.72 : 0.55;
    const riskScore = u.riskBand === "high" ? 0.78 : u.riskBand === "medium" ? 0.55 : 0.28;

    const breakdown = {
      readiness: {
        state: u.state,
        label: readinessConfig.label,
        description: readinessConfig.description,
      },
      primaryState: u.state,
      overallScore: u.score,
      capabilityScores,
      signalScores,
      narrative,
      llmNarrative: {
        strengths: `${u.firstName} demonstrates ${u.score >= 65 ? "strong" : "developing"} capability in AI output evaluation and prompt construction. ${u.score >= 70 ? "Particularly effective at identifying AI errors and calibrating confidence appropriately." : "Shows awareness of AI limitations with room to develop more systematic evaluation approaches."}`,
        gaps: `${u.score < 60 ? "AI workflow design and change leadership represent the most significant development areas. Structured practice with real HR scenarios is recommended." : "Opportunities exist to deepen AI change leadership capability and build more robust oversight frameworks."}`,
        priorities: `1. ${u.score < 50 ? "Complete AI Foundations module before taking on AI-assisted HR decisions" : "Advance AI workflow design skills through the Practitioner pathway"}. 2. ${u.score < 65 ? "Focus on error detection and source verification in AI outputs" : "Develop AI change leadership capability to support team adoption"}.`,
      },
      credibilityBand: u.credBand,
      riskBand: u.riskBand,
      totalAnswers: 35 + Math.floor(Math.random() * 15),
      targetItems: 49,
      governanceAction: u.state === "unsafe" ? "block_ai_decisions" : u.state === "at_risk" ? "require_oversight" : "permit_supervised",
      governingConstraint: u.state !== "safe" ? {
        capability: u.state === "unsafe" ? "ai_output_evaluation" : "ai_workflow_design",
        score: u.state === "unsafe" ? Math.min(35, u.score) : Math.min(50, u.score),
        band: u.state === "unsafe" ? "critical_failure" : "needs_work",
        thresholdRequired: u.state === "unsafe" ? 45 : 55,
        gap: u.state === "unsafe" ? 45 - Math.min(35, u.score) : 55 - Math.min(50, u.score),
        droveClassification: true,
      } : null,
      classificationConfidence: {
        band: u.credBand === "high" ? "high" : u.credBand === "medium" ? "medium" : "low",
        label: u.credBand === "high" ? "High confidence" : u.credBand === "medium" ? "Moderate confidence" : "Low confidence",
        wasDowngraded: u.credBand === "low",
        caveat: u.credBand === "low" ? "Classification confidence is limited due to inconsistent response patterns. Treat this result as indicative rather than definitive." : null,
      },
      normGroupVersion: "v1-synthetic",
      percentileRanks: Object.fromEntries(
        Object.keys(capabilityScores).map(k => {
          const s = capabilityScores[k].score;
          const band = s >= 75 ? "Top 20%" : s >= 60 ? "Above average" : s >= 45 ? "Around average" : s >= 30 ? "Below average" : "Bottom 20%";
          return [k, { percentile: s, percentileBand: band, percentileBandLabel: band, label: band, normGroupLabel: "HR Professionals (UK)", isSynthetic: true }];
        })
      ),
    };

    // Insert session
    await conn.execute(`
      INSERT INTO assessment_sessions (id, tenant_id, user_id, blueprint_id, state, started_at, completed_at, session_metadata_json, norm_group_version, locale_code, device_type, scoring_config_version_at_start, created_at)
      VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, 'v1-synthetic', 'en-GB', 'desktop', 1, ?)
      ON DUPLICATE KEY UPDATE state='completed', completed_at=VALUES(completed_at)
    `, [
      sessionId, TENANT_ID, u.id, BLUEPRINT_ID,
      startedAt, completedAt,
      JSON.stringify({ roleHint: u.jobTitle, dept: u.dept }),
      startedAt,
    ]);

    // Insert score
    await conn.execute(`
      INSERT INTO assessment_scores (id, session_id, overall_score, score_breakdown_json, signal_scores_json, generated_at, model_version, scoring_config_version)
      VALUES (?, ?, ?, ?, ?, ?, 'v10', 1)
      ON DUPLICATE KEY UPDATE overall_score=VALUES(overall_score), score_breakdown_json=VALUES(score_breakdown_json)
    `, [
      scoreId, sessionId, u.score,
      JSON.stringify(breakdown),
      JSON.stringify(signalScores),
      completedAt,
    ]);

    // Insert credibility score
    await conn.execute(`
      INSERT INTO credibility_scores (id, user_id, assessment_session_id, credibility_score, band, reason_json, model_version, generated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'v1', ?)
      ON DUPLICATE KEY UPDATE credibility_score=VALUES(credibility_score)
    `, [
      `cred-${u.id}`, u.id, sessionId, credScore, u.credBand,
      JSON.stringify({ consistency: credScore, calibration: credScore - 0.05 }),
      completedAt,
    ]);

    // Insert risk score
    await conn.execute(`
      INSERT INTO risk_scores (id, user_id, risk_score, band, reason_json, model_version, generated_at)
      VALUES (?, ?, ?, ?, ?, 'v1', ?)
      ON DUPLICATE KEY UPDATE risk_score=VALUES(risk_score)
    `, [
      `risk-${u.id}`, u.id, riskScore, u.riskBand,
      JSON.stringify({ roleSensitivity: "high", gapSeverity: u.state === "unsafe" ? "critical" : u.state === "at_risk" ? "moderate" : "low" }),
      completedAt,
    ]);

    // Insert user state
    await conn.execute(`
      INSERT INTO user_states (id, user_id, primary_state, credibility_state, risk_state, learning_state, compliance_state, effective_from, state_reason_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE primary_state=VALUES(primary_state), credibility_state=VALUES(credibility_state), risk_state=VALUES(risk_state)
    `, [
      `us-${u.id}`, u.id, u.state, u.credBand, u.riskBand,
      u.state === "safe" ? "active" : "in_progress",
      u.state === "unsafe" ? "at_risk" : "compliant",
      completedAt,
      JSON.stringify({ classifiedBy: "scoring_engine_v10", overallScore: u.score }),
    ]);

    process.stdout.write(`  ✓ ${u.firstName} ${u.lastName} (${u.score}/100 — ${u.state})\n`);
  }

  console.log("\n✓ All 50 assessment sessions and scores seeded");
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  ACME LTD DEMO ORG — SEED COMPLETE");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Company code : acme`);
  console.log(`  Password     : manutd99`);
  console.log(`  Users        : ${ORG.length}`);
  console.log(`  CPO login    : sarah.thornton@acme.co.uk`);
  console.log(`  Manager eg.  : priya.sharma@acme.co.uk`);
  console.log(`  Learner eg.  : zoe.patel@acme.co.uk`);
  console.log("═══════════════════════════════════════════════════════\n");

  await conn.end();
}

main().catch(err => { console.error("SEED FAILED:", err); process.exit(1); });
