/**
 * Fix static assessment item metadata:
 * 1. Add interaction_type to all items based on their content
 * 2. Fix question text to match interaction type
 * 3. Ensure item_type column matches interaction_type
 */
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Map of item ID → correct interaction_type and question text
// Based on audit of all 49 items
const ITEM_FIXES = {
  // EXECUTION items (24 items)
  "item-ex02": { interactionType: "error_detection",      question: "What is the most important action to take?" },
  "item-ex03": { interactionType: "output_improvement",   question: "What is the best way to improve this prompt?" },
  "item-ex04": { interactionType: "situational_judgement",question: "What do you do?" },
  "item-ex05": { interactionType: "error_detection",      question: "What is the most significant problem with this output?" },
  "item-ex06": { interactionType: "situational_judgement",question: "What do you do?" },
  "item-ex07": { interactionType: "situational_judgement",question: "What do you do?" },
  "item-ex08": { interactionType: "error_detection",      question: "What is the most significant error in this analysis?" },
  "item-ex09": { interactionType: "output_improvement",   question: "What is the best way to improve this output?" },
  "item-ex10": { interactionType: "prioritisation",       question: "What do you check first?" },
  "item-ex11": { interactionType: "prioritisation",       question: "What do you address first?" },
  "item-ex12": { interactionType: "prioritisation",       question: "What do you fix first?" },
  "item-ex13": { interactionType: "prioritisation",       question: "What do you prioritise?" },
  "item-ex14": { interactionType: "prioritisation",       question: "What do you prioritise?" },
  "item-ex15": { interactionType: "prioritisation",       question: "What do you prioritise?" },
  "item-ex16": { interactionType: "prioritisation",       question: "What should guide your choice?" },
  "item-ex17": { interactionType: "prioritisation",       question: "What do you choose?" },
  "item-ex18": { interactionType: "prioritisation",       question: "What matters most?" },
  "item-ex19": { interactionType: "prioritisation",       question: "What do you address first?" },
  "item-ex30": { interactionType: "prioritisation",       question: "What do you validate first?" },
  "item-ex31": { interactionType: "prioritisation",       question: "What do you choose?" },
  "item-ex32": { interactionType: "prioritisation",       question: "What do you prioritise?" },
  "item-ex33": { interactionType: "risk_judgement",       question: "What level of validation is appropriate?" },
  "item-ex34": { interactionType: "risk_judgement",       question: "What do you do?" },
  "item-ex35": { interactionType: "risk_judgement",       question: "What do you do?" },
  "item-ex36": { interactionType: "prioritisation",       question: "What do you focus on?" },
  "item-ex37": { interactionType: "prioritisation",       question: "What do you choose?" },

  // JUDGEMENT items (9 items)
  "item-ju01": { interactionType: "risk_judgement",       question: "What do you do?" },
  "item-ju02": { interactionType: "situational_judgement",question: "What do you do?" },
  "item-ju03": { interactionType: "situational_judgement",question: "What is your approach?" },
  "item-ju04": { interactionType: "scenario_critique",    question: "What is the most significant problem with this recommendation?" },
  "item-ju05": { interactionType: "risk_judgement",       question: "What do you do?" },
  "item-ju06": { interactionType: "data_interpretation",  question: "What do you do?" },
  "item-ju07": { interactionType: "risk_judgement",       question: "What do you do?" },
  "item-ju08": { interactionType: "scenario_critique",    question: "What is the most significant problem with this recommendation?" },
  "item-ju09": { interactionType: "risk_judgement",       question: "What do you do?" },
  "item-ju10": { interactionType: "scenario_critique",    question: "What is the most significant problem with this recommendation?" },

  // DATA INTERPRETATION items (3 items)
  "item-di01": { interactionType: "data_interpretation",  question: "What do you do?" },
  "item-di02": { interactionType: "data_interpretation",  question: "What do you do?" },
  "item-di03": { interactionType: "data_interpretation",  question: "What do you do?" },

  // WORKFLOW items (1 item)
  "item-wf01": { interactionType: "multi_step_workflow",  question: "What do you do?" },

  // APPROPRIATENESS items (6 items)
  "item-ap01": { interactionType: "governance_decision",  question: "What do you do?" },
  "item-ap02": { interactionType: "risk_judgement",       question: "What do you do?" },
  "item-ap03": { interactionType: "governance_decision",  question: "What is your approach?" },
  "item-ap04": { interactionType: "risk_judgement",       question: "What do you do?" },
  "item-ap05": { interactionType: "governance_decision",  question: "What is your approach?" },
  "item-ap06": { interactionType: "situational_judgement",question: "What do you do?" },

  // GOVERNANCE items (6 items)
  "item-go01": { interactionType: "governance_decision",  question: "What do you do?" },
  "item-go02": { interactionType: "governance_decision",  question: "What do you do?" },
  "item-go03": { interactionType: "governance_decision",  question: "What is your response?" },
  "item-go04": { interactionType: "governance_decision",  question: "What do you do?" },
  "item-go05": { interactionType: "governance_decision",  question: "What do you do?" },
  "item-go06": { interactionType: "governance_decision",  question: "What do you do?" },
};

// First, get all static items to find their actual IDs
const [items] = await conn.query(
  "SELECT id, metadata_json FROM assessment_items WHERE status='published' AND id NOT LIKE 'gen-%'"
);

console.log(`Found ${items.length} static items to update`);

let updated = 0;
let skipped = 0;

for (const item of items) {
  const fix = ITEM_FIXES[item.id];
  if (!fix) {
    // Try to infer from content
    const meta = typeof item.metadata_json === 'string' ? JSON.parse(item.metadata_json) : item.metadata_json;
    if (!meta.interaction_type) {
      // Default based on capability_key
      const defaultByCapability = {
        execution: "situational_judgement",
        judgement: "situational_judgement",
        governance: "governance_decision",
        appropriateness: "risk_judgement",
        workflow: "multi_step_workflow",
        data_interpretation: "data_interpretation",
      };
      const interactionType = defaultByCapability[meta.capability_key] || "situational_judgement";
      meta.interaction_type = interactionType;
      await conn.query(
        "UPDATE assessment_items SET metadata_json = ?, item_type = ? WHERE id = ?",
        [JSON.stringify(meta), interactionType, item.id]
      );
      updated++;
      console.log(`  [default] ${item.id}: ${interactionType}`);
    } else {
      skipped++;
    }
    continue;
  }

  const meta = typeof item.metadata_json === 'string' ? JSON.parse(item.metadata_json) : item.metadata_json;
  meta.interaction_type = fix.interactionType;
  meta.question = fix.question;

  await conn.query(
    "UPDATE assessment_items SET metadata_json = ?, item_type = ? WHERE id = ?",
    [JSON.stringify(meta), fix.interactionType, item.id]
  );
  updated++;
  console.log(`  [fixed] ${item.id}: ${fix.interactionType} | Q: ${fix.question}`);
}

console.log(`\nDone: ${updated} updated, ${skipped} already had interaction_type`);

// Verify the fix
const [types] = await conn.query(
  "SELECT item_type, COUNT(*) as cnt FROM assessment_items WHERE status='published' AND id NOT LIKE 'gen-%' GROUP BY item_type ORDER BY cnt DESC"
);
console.log("\nItem type distribution after fix:");
types.forEach(t => console.log(`  ${t.item_type}: ${t.cnt}`));

await conn.end();
