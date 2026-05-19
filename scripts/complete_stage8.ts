import { getDb } from '../server/db';
import { ailOrgContext } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  const rows = await db.select({ stageGateStateJson: ailOrgContext.stageGateStateJson }).from(ailOrgContext).where(eq(ailOrgContext.tenantId, 'tenant-acme-ltd'));
  const state = JSON.parse(rows[0]?.stageGateStateJson ?? '{}');
  
  // Set stage8 confirmed
  if (!state.stage8) state.stage8 = { completedAt: null, lastEditedAt: null };
  state.stage8.completedAt = Date.now();
  state.stage8.lastEditedAt = null;
  
  const capabilityPlan = {
    dimensions: {
      skills: { current: 2, needed: 4 },
      capacity: { current: 2, needed: 4 },
      changeReadiness: { current: 3, needed: 4 },
      vendorEcosystem: { current: 2, needed: 4 },
    },
    narrative: `Acme Ltd has identified significant capability gaps across all four dimensions that must be addressed to execute the 12-initiative HR AI strategy. Our current AI skills baseline is rated 2 out of 5, reflecting limited AI literacy across the HR function. We will close this gap through a structured upskilling programme: all 45 HR team members will complete the AiQ AI Foundations module by Q2 2026, with HR Business Partners completing the Advanced AI for HR Leaders programme by Q3 2026. We have partnered with a specialist AI learning provider to deliver 16 hours of structured learning per person over six months.

Capacity is our most critical constraint. The current team is operating at 95% utilisation, leaving insufficient bandwidth for transformation delivery. We will create a dedicated AI Transformation team of 3 FTEs (1 Programme Manager, 1 Change Lead, 1 Data Analyst) by April 2026, funded from the £690k–£2.6M investment envelope. Each Phase 1 initiative will have a named HR Business Partner as initiative owner, with 20% of their time ring-fenced for delivery.

Change readiness is moderate at 3 out of 5. We have strong senior sponsorship from the CPO and CEO, but middle management engagement requires investment. We will run AI Change Champion workshops with all 120 line managers in Q1 2026, and deploy a monthly AI adoption dashboard to track engagement metrics across all 12 initiatives.

Our vendor ecosystem is underdeveloped at 2 out of 5. We will conduct a structured market assessment in Q1 2026, shortlist 3 vendors per initiative category, and complete vendor selection for Phase 1 initiatives by Q2 2026. All vendor contracts will include AI ethics clauses aligned to the Equality Act 2010 and Employment Rights Act 2025.`,
  };
  
  await db.update(ailOrgContext)
    .set({
      stageGateStateJson: JSON.stringify(state),
      capabilityPlanJson: JSON.stringify(capabilityPlan),
    })
    .where(eq(ailOrgContext.tenantId, 'tenant-acme-ltd'));
  
  console.log('Stage 8 completed successfully');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
