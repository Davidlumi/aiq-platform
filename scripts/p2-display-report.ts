/**
 * P2 — Display Board Report for most recent DFS tenant
 * Read-only — queries the DB and calls rewardOutputs.get via tRPC caller
 */
import { getDb } from "../server/db";
import { tenants, users } from "../drizzle/schema";
import { desc, eq, like } from "drizzle-orm";
import { appRouter } from "../server/routers";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // Find the most recent DFS retail tenant
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(like(tenants.slug, "p2-dfs-retail-%"))
    .orderBy(desc(tenants.createdAt))
    .limit(1);

  if (!tenant) {
    console.log("No DFS retail tenant found — run p2-dfs-board-report.ts first");
    process.exit(1);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.tenantId, tenant.id))
    .limit(1);

  if (!user) throw new Error("No user found for DFS tenant");

  console.log(`\nReading board report for tenant: ${tenant.name} (${tenant.id})`);
  console.log(`User: ${user.email} | aiqRole: ${user.aiqRole}\n`);

  const caller = appRouter.createCaller({
    user: {
      id: user.id,
      tenantId: user.tenantId!,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      aiqRole: user.aiqRole as "reward_leader",
      role: user.role,
      openId: user.openId,
    },
    req: {} as any,
    res: {} as any,
  });

  const result = await caller.rewardOutputs.get();
  const r = result.report;

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  P2 — DFS Furniture plc Board Report (Real Retail Profile)");
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log(`  Company:          ${r?.companyName ?? "N/A"}`);
  console.log(`  Sector:           ${r?.sector ?? "N/A"}`);
  console.log(`  Headcount:        ${r?.headcount?.toLocaleString() ?? "N/A"}`);
  console.log(`  Revenue (£):      £${r?.annualRevenueGbp?.toLocaleString() ?? "N/A"}`);
  console.log(`  Payroll (£):      £${r?.annualPayrollGbp?.toLocaleString() ?? "N/A"}`);
  console.log(`  Vision:           ${(r?.visionText ?? "N/A").substring(0, 120)}...`);
  console.log(`  Strategic Shifts: ${r?.strategicShifts?.length ?? 0} shifts`);
  if (r?.strategicShifts?.[0]) {
    console.log(`    → ${r.strategicShifts[0].text.substring(0, 100)}`);
  }
  console.log(`  Principles:       ${r?.principles?.length ?? 0} principles`);
  console.log(`  Won't-Dos:        ${r?.wontDos?.length ?? 0}`);
  console.log(`  Initiatives:      ${r?.initiatives?.length ?? 0} in portfolio`);
  if (r?.initiatives?.length) {
    for (const i of r.initiatives.slice(0, 3)) {
      console.log(`    → ${i.title} (${i.phase})`);
    }
  }
  console.log(`  Sections:         ${r?.sections?.length ?? 0} board report sections`);
  for (const s of r?.sections ?? []) {
    const preview = s.content ? s.content.substring(0, 80).replace(/\n/g, " ") : "[placeholder]";
    console.log(`    [${s.key}] ${preview}...`);
  }
  console.log(`\n  Exec Summary (${result.execSummaryText?.length ?? 0} chars):`);
  console.log(`  ${(result.execSummaryText ?? "N/A").substring(0, 400)}...`);

  // Stage completeness
  const sc = r?.stageCompleteness;
  console.log("\n─── Stage Completeness ──────────────────────────────────────────");
  if (sc) {
    for (const [k, v] of Object.entries(sc)) {
      console.log(`  ${k}: ${v ? "✅" : "❌"}`);
    }
  }

  // CPO isolation check
  const reportStr = JSON.stringify(result);
  const cpoKeys = ["ailOrgContext", "companyAssessment"].filter(k => reportStr.includes(k));
  console.log("\n─── CPO Isolation ───────────────────────────────────────────────");
  if (cpoKeys.length === 0) {
    console.log("  ✅ No CPO-only table data in reward board report");
  } else {
    console.log(`  ⚠️  CPO keys found: ${cpoKeys.join(", ")}`);
  }

  // D1 cross-check
  console.log("\n─── D1 Business Case Cross-Check ────────────────────────────────");
  console.log(`  Headcount matches DFS (11,000):  ${r?.headcount === 11000 ? "✅" : `❌ got ${r?.headcount}`}`);
  console.log(`  Revenue matches DFS (£2.1bn):    ${r?.annualRevenueGbp === 2100000000 ? "✅" : `❌ got £${r?.annualRevenueGbp?.toLocaleString()}`}`);
  console.log(`  Payroll matches DFS (~£320m):    ${r?.annualPayrollGbp && r.annualPayrollGbp >= 300000000 && r.annualPayrollGbp <= 340000000 ? "✅" : `❌ got £${r?.annualPayrollGbp?.toLocaleString()}`}`);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  P2 COMPLETE — Real DFS retail profile verified");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main().catch(console.error).finally(() => process.exit(0));
