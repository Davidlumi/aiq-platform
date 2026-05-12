/**
 * One-time script: fix the stored talking points for Sarah's demo account.
 * Replaces the 4-bullet misaligned set with the correct 5-category content
 * from the brief's worked example, with proper character encoding.
 *
 * Run: node scripts/fix-talking-points.mjs
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const bullets = [
  "We're building an AI-fluent HR function, integrating AI into critical people processes over the next 18 months to reduce admin burden, speed up decision-making, and enable HR to operate as strategic partners.",
  "We're committing to Transformative ambition \u2014 the top tier \u2014 because retail's pace and our role in the customer experience require HR to be an active innovator, not a fast follower.",
  "Today HR's AI capability scores 5.2 out of 10, at foundational level. To deliver this strategy we need to be at 7.3 \u2014 a 2.1 point gap to close over 18 months, with capability development running alongside the 9 initiatives.",
  "We're investing roughly \u00a3660k over three years to unlock an estimated \u00a321.5M in business value \u2014 driven by efficiency gains, faster decisions, and reduced admin burden. Finance will confirm the model as pilots progress.",
  "This is contingent on strong cross-functional alignment with IT and Legal for data governance. Without it, ambition outpaces capacity to deliver responsibly.",
];

const tpJson = JSON.stringify({
  bullets,
  generatedAt: 1778626800000,
  userEdited: false,
  strategyHash: "aW5pdC0wMyxpbml0LTA3LGluaXQtMDks",
});

async function run() {
  // Parse DATABASE_URL: mysql://user:pass@host:port/dbname?ssl=true
  const url = new URL(DATABASE_URL);
  const conn = await createConnection({
    host: url.hostname,
    port: parseInt(url.port || "3306"),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1).split("?")[0],
    ssl: { rejectUnauthorized: false },
  });

  try {
    const [result] = await conn.execute(
      "UPDATE ail_org_context SET leadership_talking_points_json = ? WHERE id = ?",
      [tpJson, "eDDhKB2SJa1bx7968UcE2"]
    );
    console.log("Updated rows:", result.affectedRows);
    console.log("Stored JSON (first 200 chars):", tpJson.slice(0, 200));

    // Verify
    const [rows] = await conn.execute(
      "SELECT leadership_talking_points_json FROM ail_org_context WHERE id = ?",
      ["eDDhKB2SJa1bx7968UcE2"]
    );
    const stored = JSON.parse(rows[0].leadership_talking_points_json);
    console.log("\nVerification — bullet count:", stored.bullets.length);
    stored.bullets.forEach((b, i) => console.log(`  TP${i + 1}: ${b.slice(0, 80)}...`));
    console.log("  strategyHash:", stored.strategyHash);
  } finally {
    await conn.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
