import { getDb } from '/home/ubuntu/aiq-platform/server/db';
import { ailOrgContext } from '/home/ubuntu/aiq-platform/drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  const rows = await db.select({ stageGateStateJson: ailOrgContext.stageGateStateJson }).from(ailOrgContext).where(eq(ailOrgContext.tenantId, 'tenant-acme-ltd'));
  const state = JSON.parse(rows[0]?.stageGateStateJson ?? '{}');
  
  // Fix: set stage7.completedAt (the actual gate field)
  if (!state.stage7) state.stage7 = { completedAt: null, lastEditedAt: null };
  state.stage7.completedAt = Date.now();
  state.stage7.lastEditedAt = null;
  
  await db.update(ailOrgContext)
    .set({ stageGateStateJson: JSON.stringify(state) })
    .where(eq(ailOrgContext.tenantId, 'tenant-acme-ltd'));
  
  console.log('Stage 7 gate fixed:', state.stage7);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
