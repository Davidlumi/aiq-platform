import { getDb } from "./db";
import { tenants, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("no db"); process.exit(1); }
  const rows = await db
    .select({ slug: tenants.slug, email: users.email, firstName: users.firstName, lastName: users.lastName })
    .from(tenants)
    .innerJoin(users, eq(users.tenantId, tenants.id))
    .where(eq(users.isPlatformSuperuser, true))
    .limit(5);
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
