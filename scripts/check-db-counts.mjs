import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [[cs]] = await conn.query('SELECT COUNT(*) as cnt FROM content_scenarios WHERE status="published"');
console.log("Published content_scenarios:", cs.cnt);

const [[si]] = await conn.query('SELECT COUNT(*) as cnt FROM assessment_items WHERE status="published"');
console.log("Published assessment_items:", si.cnt);

const [bps] = await conn.query("SELECT id, name FROM assessment_blueprints LIMIT 5");
console.log("Blueprints:", bps);

const [[opts]] = await conn.query('SELECT COUNT(*) as cnt FROM content_scenario_options');
console.log("content_scenario_options:", opts.cnt);

// Check if there are enough scenarios to fill 50 questions
const [[unique]] = await conn.query('SELECT COUNT(DISTINCT id) as cnt FROM content_scenarios WHERE status="published"');
console.log("Unique published scenarios:", unique.cnt);

// Check how many scenarios have options
const [[withOpts]] = await conn.query(`
  SELECT COUNT(DISTINCT cs.id) as cnt 
  FROM content_scenarios cs 
  INNER JOIN content_scenario_options cso ON cso.scenario_id = cs.id 
  WHERE cs.status = "published"
`);
console.log("Scenarios with options:", withOpts.cnt);

await conn.end();
