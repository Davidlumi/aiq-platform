/**
 * Seed strategic priorities and org context for the Acme Ltd demo tenant.
 * This ensures the Strategic Alignment section on the Leader Dashboard has data.
 */
import mysql from "mysql2/promise";
import { randomUUID } from "crypto";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const TENANT_ID = "tenant-acme-ltd";

const strategicPriorities = [
  "Automate high-volume recruitment screening with AI while maintaining fairness",
  "Upskill all HR business partners on AI-assisted decision making",
  "Implement ethical AI governance framework across all HR processes",
  "Transform workforce planning with predictive analytics",
  "Build AI change leadership capability in senior HR team",
];

const currentChallenges = [
  "Regulatory pressure on AI transparency in hiring decisions",
  "Inconsistent AI adoption across HR teams — some advanced, others resistant",
  "Data quality issues limiting predictive analytics accuracy",
  "Skills gap in evaluating AI-generated outputs critically",
  "Balancing automation efficiency with employee trust and engagement",
];

// Check if org context already exists for this tenant
const [existing] = await conn.query(
  "SELECT id, strategic_priorities_json FROM ail_org_context WHERE tenant_id = ?",
  [TENANT_ID]
);

if (existing.length > 0) {
  // Update existing row with strategic priorities
  await conn.query(
    `UPDATE ail_org_context SET
      strategic_priorities_json = ?,
      current_challenges_json = ?,
      hr_influence = 'strategic_partner',
      ai_governance_framework = 1,
      ai_ethics_committee = 0,
      has_ai_usage_policy = 1,
      has_data_protection_policy = 1,
      ai_policy_status = 'draft',
      updated_at = NOW()
    WHERE tenant_id = ?`,
    [JSON.stringify(strategicPriorities), JSON.stringify(currentChallenges), TENANT_ID]
  );
  console.log(`✓ Updated org context for ${TENANT_ID} with ${strategicPriorities.length} strategic priorities`);
} else {
  // Insert new org context row
  const id = randomUUID();
  await conn.query(
    `INSERT INTO ail_org_context (
      id, tenant_id, sector, headcount, structure,
      risk_appetite_overall, risk_appetite_legal, risk_appetite_reputational, risk_appetite_innovation,
      ai_maturity_level, primary_regulator,
      hr_influence, decision_making_style, hierarchy_level,
      has_ai_usage_policy, has_data_protection_policy, has_redundancy_policy, has_whistleblowing_policy, has_edi_policy,
      ai_governance_framework, ai_ethics_committee,
      ai_policy_status,
      strategic_priorities_json, current_challenges_json,
      geographies_json, current_ai_tools_json,
      created_at, updated_at
    ) VALUES (
      ?, ?, 'financial_services', 2800, 'matrix',
      'moderate', 'risk_averse', 'risk_averse', 'moderate',
      'scaling', 'FCA',
      'strategic_partner', 'data_driven', 'moderate',
      1, 1, 1, 1, 1,
      1, 0,
      'draft',
      ?, ?,
      '["UK","EU","US"]', '["Copilot","Workday AI","Textio"]',
      NOW(), NOW()
    )`,
    [id, TENANT_ID, JSON.stringify(strategicPriorities), JSON.stringify(currentChallenges)]
  );
  console.log(`✓ Created org context for ${TENANT_ID} with ${strategicPriorities.length} strategic priorities`);
}

// Verify
const [verify] = await conn.query(
  "SELECT strategic_priorities_json, current_challenges_json FROM ail_org_context WHERE tenant_id = ?",
  [TENANT_ID]
);
if (verify.length > 0) {
  const priorities = JSON.parse(verify[0].strategic_priorities_json || "[]");
  const challenges = JSON.parse(verify[0].current_challenges_json || "[]");
  console.log(`✓ Verified: ${priorities.length} priorities, ${challenges.length} challenges stored`);
} else {
  console.error("✗ Failed to verify org context");
}

await conn.end();
console.log("Done.");
