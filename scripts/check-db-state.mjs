import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Static items with options
const [[withOpts]] = await conn.query(`
  SELECT COUNT(DISTINCT ai.id) as cnt 
  FROM assessment_items ai 
  INNER JOIN assessment_item_options aio ON aio.item_id = ai.id 
  WHERE ai.status = 'published'
`);
console.log("Static items with options:", withOpts.cnt);

// All static items breakdown
const [[allItems]] = await conn.query(`SELECT COUNT(*) as cnt FROM assessment_items WHERE status='published'`);
console.log("All published static items:", allItems.cnt);

// Active sessions
const [sessions] = await conn.query(`
  SELECT id, state, blueprint_id, created_at 
  FROM assessment_sessions 
  WHERE state = 'in_progress' 
  ORDER BY created_at DESC 
  LIMIT 3
`);
console.log("\nActive sessions:", sessions.length);

for (const sess of sessions) {
  const [answers] = await conn.query(
    `SELECT item_id FROM assessment_answers WHERE session_id = ? ORDER BY id`,
    [sess.id]
  );
  console.log(`\nSession ${sess.id}:`);
  console.log(`  Answers: ${answers.length}`);
  const csIds = answers.filter(a => a.item_id.startsWith("cs-")).length;
  const genIds = answers.filter(a => a.item_id.startsWith("gen-")).length;
  const staticIds = answers.filter(a => !a.item_id.startsWith("cs-") && !a.item_id.startsWith("gen-")).length;
  console.log(`  Content scenario answers: ${csIds}`);
  console.log(`  Generated item answers: ${genIds}`);
  console.log(`  Static item answers: ${staticIds}`);
}

// Check if LLM generation budget is being hit
const [[genItems]] = await conn.query(`
  SELECT COUNT(*) as cnt FROM assessment_items WHERE id LIKE 'gen-%' AND status='published'
`);
console.log("\nGenerated items in DB:", genItems.cnt);

await conn.end();
