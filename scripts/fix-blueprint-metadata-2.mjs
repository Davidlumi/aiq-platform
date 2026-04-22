/**
 * Fix pr/va items with proper interaction types
 * These are all prioritisation/validation items that got defaulted to situational_judgement
 */
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const FIXES = {
  // PRIORITISATION items (pr01-pr10) — these are all about choosing what to do first
  "item-pr01": { interactionType: "prioritisation", question: "What do you check first?" },
  "item-pr02": { interactionType: "prioritisation", question: "What do you address first?" },
  "item-pr03": { interactionType: "prioritisation", question: "What do you fix first?" },
  "item-pr04": { interactionType: "prioritisation", question: "What do you prioritise?" },
  "item-pr05": { interactionType: "prioritisation", question: "What do you prioritise?" },
  "item-pr06": { interactionType: "prioritisation", question: "What do you prioritise?" },
  "item-pr07": { interactionType: "prioritisation", question: "What should guide your choice?" },
  "item-pr08": { interactionType: "prioritisation", question: "What do you choose?" },
  "item-pr09": { interactionType: "prioritisation", question: "What matters most?" },
  "item-pr10": { interactionType: "prioritisation", question: "What do you address first?" },

  // VALIDATION items (va01-va08) — these are about validation decisions
  "item-va01": { interactionType: "prioritisation", question: "What do you validate first?" },
  "item-va02": { interactionType: "prioritisation", question: "What do you choose?" },
  "item-va03": { interactionType: "prioritisation", question: "What do you prioritise?" },
  "item-va04": { interactionType: "risk_judgement", question: "What level of validation is appropriate?" },
  "item-va05": { interactionType: "risk_judgement", question: "What do you do?" },
  "item-va06": { interactionType: "risk_judgement", question: "What do you do?" },
  "item-va07": { interactionType: "prioritisation", question: "What do you focus on?" },
  "item-va08": { interactionType: "prioritisation", question: "What do you choose?" },

  // GOVERNANCE items (rg01-rg06) — these are already governance_decision but fix question text
  "item-rg01": { interactionType: "governance_decision", question: "What do you do?" },
  "item-rg02": { interactionType: "governance_decision", question: "What do you do?" },
  "item-rg03": { interactionType: "governance_decision", question: "What is your response?" },
  "item-rg04": { interactionType: "governance_decision", question: "What do you do?" },
  "item-rg05": { interactionType: "governance_decision", question: "What do you do?" },
  "item-rg06": { interactionType: "governance_decision", question: "What do you do?" },
};

const [items] = await conn.query(
  "SELECT id, metadata_json FROM assessment_items WHERE status='published' AND id NOT LIKE 'gen-%'"
);

let updated = 0;
for (const item of items) {
  const fix = FIXES[item.id];
  if (!fix) continue;
  
  const meta = typeof item.metadata_json === 'string' ? JSON.parse(item.metadata_json) : item.metadata_json;
  meta.interaction_type = fix.interactionType;
  meta.question = fix.question;
  
  await conn.query(
    "UPDATE assessment_items SET metadata_json = ?, item_type = ? WHERE id = ?",
    [JSON.stringify(meta), fix.interactionType, item.id]
  );
  updated++;
  console.log(`  ${item.id}: ${fix.interactionType}`);
}

console.log(`\nUpdated ${updated} items`);

// Final distribution
const [types] = await conn.query(
  "SELECT item_type, COUNT(*) as cnt FROM assessment_items WHERE status='published' AND id NOT LIKE 'gen-%' GROUP BY item_type ORDER BY cnt DESC"
);
console.log("\nFinal item type distribution:");
types.forEach(t => console.log(`  ${t.item_type}: ${t.cnt}`));

await conn.end();
