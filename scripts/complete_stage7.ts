import { getDb } from '../server/db';
import { ailOrgContext } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  const rows = await db.select({ stageGateStateJson: ailOrgContext.stageGateStateJson }).from(ailOrgContext).where(eq(ailOrgContext.tenantId, 'tenant-acme-ltd'));
  const state = JSON.parse(rows[0]?.stageGateStateJson ?? '{}');
  
  // Set stage7 confirmed and businessCaseNarrative
  state.stage7ConfirmedAt = new Date().toISOString();
  
  await db.update(ailOrgContext)
    .set({
      stageGateStateJson: JSON.stringify(state),
      businessCaseNarrative: 'Acme Ltd is investing £690k–£2.6M across 12 AI-enabled HR initiatives over three years. This programme targets £21.6M gross value through improved recruiter productivity, onboarding automation, frontline learning, and AI governance. The net value after full 3-year TCO is £20.4M, with payback expected within 18 months for Phase 1 initiatives. All initiatives are compliant with UK GDPR, the Employment Rights Act 2025, and the Equality Act 2010. CEO sponsorship is recommended given the programme scale and cross-functional dependencies. Phase 1 (Foundation) focuses on documentation automation, compliance training, and recruiter productivity AI — all delivering measurable ROI within 6 months. This investment positions Acme Ltd as an AI-enabled employer of choice in the professional services sector.',
    })
    .where(eq(ailOrgContext.tenantId, 'tenant-acme-ltd'));
  
  console.log('Stage 7 completed successfully');
  console.log('stageGateState:', JSON.stringify(state, null, 2));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
