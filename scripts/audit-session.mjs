import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.js';
import { eq, desc } from 'drizzle-orm';

const conn = await mysql.createPool(process.env.DATABASE_URL);
const db = drizzle(conn, { schema, mode: 'default' });

// Sessions
const sessions = await db.select().from(schema.assessmentSessions).orderBy(desc(schema.assessmentSessions.startedAt)).limit(5);
console.log('\n=== SESSIONS ===');
for (const s of sessions) {
  let meta = {};
  try { meta = typeof s.sessionMetadataJson === 'string' ? JSON.parse(s.sessionMetadataJson) : (s.sessionMetadataJson || {}); } catch {}
  const pending = meta.pendingNextItem;
  const answers = await db.select().from(schema.assessmentAnswers).where(eq(schema.assessmentAnswers.sessionId, s.id));
  console.log(`Session ${s.id} | state: ${s.state} | answers: ${answers.length} | isBaseline: ${meta.isBaseline} | roleHint: ${meta.roleHint}`);
  if (pending) {
    console.log(`  Pending: ${pending.id} | type: ${pending.interactionType} | title: ${pending.title}`);
    console.log(`  hasAiOutput: ${!!pending.aiOutput} | hasDataContext: ${!!pending.dataContext} | options: ${pending.options?.length}`);
  } else {
    console.log('  No pending item');
  }
  
  // Interaction type distribution
  const items = await db.select().from(schema.assessmentItems);
  const itemMap = Object.fromEntries(items.map(i => [i.id, i]));
  const typeCounts = {};
  const outcomeCounts = {};
  const riskCounts = {};
  for (const a of answers) {
    const item = itemMap[a.itemId] || {};
    const type = item.interactionType || 'unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
    outcomeCounts[a.outcomeClass || 'null'] = (outcomeCounts[a.outcomeClass || 'null'] || 0) + 1;
    riskCounts[item.riskLevel || 'unknown'] = (riskCounts[item.riskLevel || 'unknown'] || 0) + 1;
  }
  console.log('  Interaction types:', JSON.stringify(typeCounts));
  console.log('  Outcome classes:', JSON.stringify(outcomeCounts));
  console.log('  Risk levels:', JSON.stringify(riskCounts));
}

// Generated items sample
const genItems = await db.select({
  id: schema.assessmentItems.id,
  title: schema.assessmentItems.title,
  interactionType: schema.assessmentItems.interactionType,
  riskLevel: schema.assessmentItems.riskLevel,
  difficulty: schema.assessmentItems.difficulty,
}).from(schema.assessmentItems).where(eq(schema.assessmentItems.source, 'generated')).limit(5);
console.log('\n=== SAMPLE GENERATED ITEMS ===');
for (const item of genItems) {
  console.log(`  ${item.id} | ${item.interactionType} | risk:${item.riskLevel} | diff:${item.difficulty} | "${item.title}"`);
}

await conn.end();
