import { getDb } from "../server/db";
import { ailOrgContext } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) { process.exit(1); }
  const rows = await db.select({ operationalBaselineJson: ailOrgContext.operationalBaselineJson }).from(ailOrgContext).limit(1);
  console.log("operationalBaseline:", JSON.stringify(JSON.parse(rows[0]?.operationalBaselineJson ?? "{}"), null, 2));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
