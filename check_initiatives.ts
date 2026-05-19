import { getDb } from "./server/db";
import { ailOrgContext, strategyInitiativeLibrary } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("no db"); return; }
  
  // Get selected IDs for Acme
  const [ctx] = await db.select({
    selectedInitiativesJson: ailOrgContext.selectedInitiativesJson,
  }).from(ailOrgContext).where(eq(ailOrgContext.tenantId, "tenant-acme-ltd"));
  
  const selectedIds: string[] = ctx?.selectedInitiativesJson 
    ? JSON.parse(ctx.selectedInitiativesJson as string) 
    : [];
  console.log("Selected IDs:", selectedIds);
  
  // Check which ones exist in the DB library
  const dbLibRows = await db.select({ id: strategyInitiativeLibrary.id, name: strategyInitiativeLibrary.name })
    .from(strategyInitiativeLibrary);
  const dbIds = new Set(dbLibRows.map(r => r.id));
  
  console.log("\nDB library has", dbIds.size, "entries");
  console.log("\nSelected IDs in DB:", selectedIds.filter(id => dbIds.has(id)));
  console.log("Selected IDs NOT in DB:", selectedIds.filter(id => !dbIds.has(id)));
}
main().catch(console.error).finally(() => process.exit(0));
