/**
 * Query the 26 remapped scenarios from the live DB.
 * Run: node scripts/query-26-scenarios.mjs
 */
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("No DATABASE_URL — exiting");
  process.exit(0);
}

const ids = [
  "b3f0ebc9","dd9e8d03","446a5daa","eef7366e","0fd516d7","16a91065",
  "c662af60","7e3af81e","41a71f96","90e34932",
  "2b96d4e0","8c5ef89f","359fd546","670e6e2a","17add616","e47a57e7",
  "d7eeba41","054424ff","ce6aef37","741e44d1","b828f638",
  "e0fa86c9","c4cd5a8a","eef73edc","7e9a7390","9ecb96b0",
];

const placeholders = ids.map(() => "?").join(",");
const conn = await mysql.createConnection(url);
const [rows] = await conn.execute(
  `SELECT id, capability_key, title FROM content_scenarios WHERE id IN (${placeholders})`,
  ids
);
rows.forEach(r => console.log(JSON.stringify({ id: r.id, key: r.capability_key, title: r.title })));
await conn.end();
