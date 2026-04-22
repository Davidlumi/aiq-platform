import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get the active session
const [sessions] = await conn.query(`
  SELECT id, state, blueprint_id, session_metadata_json, user_id
  FROM assessment_sessions 
  WHERE state = 'in_progress' 
  ORDER BY id DESC 
  LIMIT 3
`);

console.log("Active sessions:", sessions.length);

for (const sess of sessions) {
  console.log(`\n=== Session: ${sess.id} ===`);
  console.log("Blueprint:", sess.blueprint_id);
  
  const [answers] = await conn.query(
    `SELECT item_id FROM assessment_answers WHERE session_id = ?`,
    [sess.id]
  );
  console.log("Answers:", answers.length);
  
  const answeredIds = answers.map(a => a.item_id);
  
  // Check how many static items are left
  const [allItems] = await conn.query(
    `SELECT id FROM assessment_items WHERE blueprint_id = ? AND status = 'published'`,
    [sess.blueprint_id]
  );
  const unanswered = allItems.filter(i => !answeredIds.includes(i.id));
  console.log("Total static items:", allItems.length);
  console.log("Unanswered static items:", unanswered.length);
  
  // Check if any generated items exist that haven't been answered
  const [genItems] = await conn.query(
    `SELECT id FROM assessment_items WHERE id LIKE 'gen-%' AND blueprint_id = ? AND status = 'published'`,
    [sess.blueprint_id]
  );
  const unansweredGen = genItems.filter(i => !answeredIds.includes(i.id));
  console.log("Generated items:", genItems.length);
  console.log("Unanswered generated items:", unansweredGen.length);
  if (unansweredGen.length > 0) {
    console.log("Unanswered gen IDs:", unansweredGen.map(i => i.id));
  }
  
  // Check what phase we're in
  const answeredCount = answers.length;
  const totalTarget = 50;
  const progress = answeredCount / totalTarget;
  const phase = progress < 0.35 ? "baseline" : progress < 0.75 ? "adaptive" : "validation";
  console.log(`\nAnswered: ${answeredCount}/${totalTarget} (${Math.round(progress*100)}%) → Phase: ${phase}`);
  
  // Simulate what getNextStaticItem would return
  const [nextStatic] = await conn.query(
    `SELECT ai.id, ai.metadata_json FROM assessment_items ai 
     WHERE ai.blueprint_id = ? AND ai.status = 'published' AND ai.id NOT LIKE 'gen-%'
     AND ai.id NOT IN (${answeredIds.filter(id => !id.startsWith('gen-')).map(() => '?').join(',') || "'__none__'"})
     ORDER BY JSON_EXTRACT(ai.metadata_json, '$.display_order') ASC
     LIMIT 5`,
    [sess.blueprint_id, ...answeredIds.filter(id => !id.startsWith('gen-'))]
  );
  console.log("\nNext static items available:", nextStatic.length);
  if (nextStatic.length > 0) {
    console.log("Next static item ID:", nextStatic[0].id);
  }
}

await conn.end();
