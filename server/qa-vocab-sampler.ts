/**
 * QA Vocabulary Sampler — triggers all AI outputs using Acme context
 * and checks each output against the vocabulary blacklist.
 * Run with: npx tsx server/qa-vocab-sampler.ts
 */

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Blacklist (union of all procedure blacklists) ────────────────────────────
const MASTER_BLACKLIST = [
  "synergy", "synergies", "leverage", "leveraging", "paradigm", "paradigm shift",
  "disruptive", "disruption", "transformative", "game-changer", "game changer",
  "game-changing", "cutting-edge", "cutting edge", "state-of-the-art", "best-in-class",
  "best in class", "world-class", "world class", "holistic", "robust", "seamless",
  "scalable", "agile", "agility", "ecosystem", "stakeholder alignment", "value proposition",
  "low-hanging fruit", "move the needle", "boil the ocean", "circle back",
  "deep dive", "bandwidth", "pivot", "ideate", "ideation", "empower", "empowering",
  "strategic imperative", "synergise", "synergize", "roi", "human capital",
  "deliverables", "revolutionary", "innovative", "value-add", "learnings",
];

function checkBlacklist(text: string): string[] {
  const lower = text.toLowerCase();
  return MASTER_BLACKLIST.filter(word => lower.includes(word.toLowerCase()));
}

// ─── Acme context ─────────────────────────────────────────────────────────────
const ACME = {
  orgName: "Acme Retail Ltd",
  sector: "Retail",
  headcount: 20000,
  vision: "By 2027, Acme Retail will use AI to make every HR decision faster, fairer, and more effective — reducing frontline attrition by 30% and cutting time-to-hire by 40%.",
  strategy: "Acme will deploy AI-enabled HR capabilities to reduce frontline attrition by 30% and cut time-to-hire by 40% within 18 months.",
  strategyArchetype: "Operational Excellence",
  principles: [
    "We use AI to augment HR judgment, not replace it.",
    "We pilot before we scale — no initiative goes live without a 50-store test.",
    "We measure outcomes, not activity.",
  ],
  wontDos: [
    "We will not use AI to make final hiring decisions without human review.",
    "We will not deploy AI tools that HR managers cannot explain to employees.",
  ],
  outcomes: [
    "Reduce frontline attrition from 35% to 24%",
    "Cut time-to-hire from 28 days to 17 days",
    "Achieve 80% manager adoption of AI scheduling tools",
  ],
  businessCaseNarrative: "Acme Retail operates 812 UK stores with 20,000 employees and 35% annual frontline attrition. The business case targets £4.2M in savings over 3 years through reduced recruitment costs and improved manager productivity.",
  selectedInitiatives: ["fw_shift_scheduling_ai", "fw_frontline_communication", "ta_ai_screening"],
  capabilityData: {
    skills: { current: 3, needed: 4, tactics: ["Upskill 20 HR BPs in AI tool configuration", "Partner with vendor for onboarding training"] },
    capacity: { current: 2, needed: 4, tactics: ["Hire 2 dedicated AI implementation managers", "Reduce BAU reporting burden by 30%"] },
    changeReadiness: { current: 3, needed: 4, tactics: ["Run change readiness workshops in top 10 stores", "Appoint store-level AI champions"] },
    vendorEcosystem: { current: 2, needed: 3, tactics: ["Consolidate to 2 primary AI vendors", "Establish quarterly vendor review cadence"] },
  },
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;
function makeCtx(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "u-acme-001",
    email: "sarah.thornton@acme.co.uk",
    name: "Sarah Thornton",
    loginMethod: "manus",
    role: "user",
    tenantId: "tenant-acme-ltd",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as any;
  return { user, req: {} as any, res: {} as any };
}

interface SampleResult {
  label: string;
  output: string;
  hits: string[];
}

const results: SampleResult[] = [];

function record(label: string, output: string) {
  const hits = checkBlacklist(output);
  results.push({ label, output, hits });
  console.log(`\n${"─".repeat(80)}`);
  console.log(`SAMPLE: ${label}`);
  console.log(`${"─".repeat(80)}`);
  console.log(output);
  if (hits.length > 0) {
    console.log(`\n⚠️  BLACKLIST HITS: ${hits.join(", ")}`);
  } else {
    console.log(`\n✅ No blacklist hits`);
  }
}

async function run() {
  const caller = appRouter.createCaller(makeCtx());

  // ─── Stage 2 Vision: Expand ───────────────────────────────────────────────
  console.log("\n\n=== STAGE 2: VISION ===");
  try {
    const r1 = await caller.intelligence.transformText({
      text: ACME.vision,
      action: "expand",
      stage: "vision",
    });
    record("Stage 2 Vision — Expand", r1.text);
  } catch (e: any) { record("Stage 2 Vision — Expand [ERROR]", e.message); }

  try {
    const r2 = await caller.intelligence.transformText({
      text: ACME.vision,
      action: "refine",
      stage: "vision",
    });
    record("Stage 2 Vision — Refine", r2.text);
  } catch (e: any) { record("Stage 2 Vision — Refine [ERROR]", e.message); }

  // ─── Stage 3 Strategy: Generate draft + Refine ────────────────────────────
  console.log("\n\n=== STAGE 3: STRATEGY ===");
  try {
    const r3 = await caller.intelligence.transformText({
      text: "Draft a strategy statement for Acme Retail's HR AI programme.",
      action: "expand",
      stage: "strategy_statement",
    });
    record("Stage 3 Strategy — Generate draft (expand)", r3.text);
  } catch (e: any) { record("Stage 3 Strategy — Generate draft [ERROR]", e.message); }

  try {
    const r4 = await caller.intelligence.transformText({
      text: ACME.strategy,
      action: "refine",
      stage: "strategy_statement",
    });
    record("Stage 3 Strategy — Refine", r4.text);
  } catch (e: any) { record("Stage 3 Strategy — Refine [ERROR]", e.message); }

  // ─── Stage 4 Principles: Suggest + Suggest more ───────────────────────────
  console.log("\n\n=== STAGE 4: PRINCIPLES ===");
  try {
    const r5 = await caller.intelligence.transformText({
      text: "Suggest AI strategy principles for Acme Retail.",
      action: "suggest",
      stage: "principle",
    });
    record("Stage 4 Principles — Suggest", r5.text);
  } catch (e: any) { record("Stage 4 Principles — Suggest [ERROR]", e.message); }

  try {
    const r6 = await caller.intelligence.transformText({
      text: ACME.principles.join("\n"),
      action: "expand",
      stage: "principle",
    });
    record("Stage 4 Principles — Suggest more (expand)", r6.text);
  } catch (e: any) { record("Stage 4 Principles — Suggest more [ERROR]", e.message); }

  // ─── Stage 4 Won't-do: Suggest ────────────────────────────────────────────
  console.log("\n\n=== STAGE 4: WON'T-DO ===");
  try {
    const r7 = await caller.intelligence.transformText({
      text: "Suggest won't-do statements for Acme Retail's HR AI strategy.",
      action: "suggest",
      stage: "wont_do",
    });
    record("Stage 4 Won't-do — Suggest", r7.text);
  } catch (e: any) { record("Stage 4 Won't-do — Suggest [ERROR]", e.message); }

  try {
    const r8 = await caller.intelligence.transformText({
      text: ACME.wontDos.join("\n"),
      action: "expand",
      stage: "wont_do",
    });
    record("Stage 4 Won't-do — Suggest more (expand)", r8.text);
  } catch (e: any) { record("Stage 4 Won't-do — Suggest more [ERROR]", e.message); }

  // ─── Stage 6 Outcomes: Suggest from framing ───────────────────────────────
  console.log("\n\n=== STAGE 6: OUTCOMES ===");
  try {
    const r9 = await caller.intelligence.transformText({
      text: "Suggest measurable outcomes for Acme Retail's HR AI strategy focused on frontline attrition and hiring.",
      action: "suggest",
      stage: "general",
    });
    record("Stage 6 Outcomes — Suggest (1)", r9.text);
  } catch (e: any) { record("Stage 6 Outcomes — Suggest (1) [ERROR]", e.message); }

  try {
    const r10 = await caller.intelligence.transformText({
      text: "Suggest measurable outcomes for Acme Retail's HR AI strategy focused on manager capability and scheduling.",
      action: "suggest",
      stage: "general",
    });
    record("Stage 6 Outcomes — Suggest (2)", r10.text);
  } catch (e: any) { record("Stage 6 Outcomes — Suggest (2) [ERROR]", e.message); }

  // ─── Stage 6 Primary measures ─────────────────────────────────────────────
  console.log("\n\n=== STAGE 6: PRIMARY MEASURES ===");
  try {
    const r11 = await caller.intelligence.transformText({
      text: "Suggest primary success measures for the AI shift scheduling initiative at Acme Retail.",
      action: "suggest",
      stage: "general",
    });
    record("Stage 6 Primary measures — Suggest (fw_shift_scheduling_ai)", r11.text);
  } catch (e: any) { record("Stage 6 Primary measures — Suggest (1) [ERROR]", e.message); }

  try {
    const r12 = await caller.intelligence.transformText({
      text: "Suggest primary success measures for the AI screening initiative at Acme Retail.",
      action: "suggest",
      stage: "general",
    });
    record("Stage 6 Primary measures — Suggest (ta_ai_screening)", r12.text);
  } catch (e: any) { record("Stage 6 Primary measures — Suggest (2) [ERROR]", e.message); }

  // ─── Stage 7 Business case narrative: Generate + Refine ──────────────────
  console.log("\n\n=== STAGE 7: BUSINESS CASE NARRATIVE ===");
  try {
    const r13 = await caller.intelligence.generateBusinessCaseNarrative({
      orgName: ACME.orgName,
      sector: ACME.sector,
      headcount: ACME.headcount,
      vision: ACME.vision,
      strategy: ACME.strategy,
      archetype: ACME.strategyArchetype,
      selectedInitiatives: ACME.selectedInitiatives,
      totalCostLow: 1200000,
      totalCostHigh: 1800000,
      totalValueLow: 3500000,
      totalValueHigh: 4200000,
    });
    record("Stage 7 Business case — Generate", r13.text);

    // Refine the generated narrative
    const r14 = await caller.intelligence.transformText({
      text: r13.text,
      action: "refine",
      stage: "business_case",
    });
    record("Stage 7 Business case — Refine", r14.text);
  } catch (e: any) { record("Stage 7 Business case — Generate [ERROR]", e.message); }

  // ─── Stage 8 Capability tactics: Suggest for 2 gaps ──────────────────────
  console.log("\n\n=== STAGE 8: CAPABILITY TACTICS ===");
  try {
    const r15 = await caller.intelligence.suggestCapabilityTactics({
      dimension: "skills",
      current: 3,
      needed: 4,
      sector: ACME.sector,
      ambitionTier: "progressive",
      selectedInitiatives: ACME.selectedInitiatives,
    });
    record("Stage 8 Capability tactics — skills gap (3→4)", JSON.stringify(r15.tactics, null, 2));
  } catch (e: any) { record("Stage 8 Capability tactics — skills [ERROR]", e.message); }

  try {
    const r16 = await caller.intelligence.suggestCapabilityTactics({
      dimension: "capacity",
      current: 2,
      needed: 4,
      sector: ACME.sector,
      ambitionTier: "progressive",
      selectedInitiatives: ACME.selectedInitiatives,
    });
    record("Stage 8 Capability tactics — capacity gap (2→4)", JSON.stringify(r16.tactics, null, 2));
  } catch (e: any) { record("Stage 8 Capability tactics — capacity [ERROR]", e.message); }

  // ─── Stage 8 Delivery narrative: Generate ────────────────────────────────
  console.log("\n\n=== STAGE 8: DELIVERY NARRATIVE ===");
  try {
    const r17 = await caller.intelligence.generateCapabilityNarrative({
      sector: ACME.sector,
      ambitionTier: "progressive",
      selectedInitiatives: ACME.selectedInitiatives,
      capabilityData: ACME.capabilityData,
    });
    record("Stage 8 Delivery narrative — Generate", r17.text);
  } catch (e: any) { record("Stage 8 Delivery narrative — Generate [ERROR]", e.message); }

  // ─── Stage 9 Tensions: initial + Refresh ─────────────────────────────────
  console.log("\n\n=== STAGE 9: TENSIONS ===");
  try {
    const r18 = await caller.intelligence.generateReviewTensions({
      strategyStatement: ACME.strategy,
      strategyArchetype: ACME.strategyArchetype,
      selectedInitiatives: ACME.selectedInitiatives,
      businessCaseNarrative: ACME.businessCaseNarrative,
    });
    record("Stage 9 Tensions — Initial", JSON.stringify(r18.tensions, null, 2));

    // Refresh (second call)
    const r19 = await caller.intelligence.generateReviewTensions({
      strategyStatement: ACME.strategy,
      strategyArchetype: ACME.strategyArchetype,
      selectedInitiatives: ACME.selectedInitiatives,
      businessCaseNarrative: ACME.businessCaseNarrative,
    });
    record("Stage 9 Tensions — Refresh", JSON.stringify(r19.tensions, null, 2));
  } catch (e: any) { record("Stage 9 Tensions — Initial [ERROR]", e.message); }

  // ─── Stage 10 Board report: all 6 sections ────────────────────────────────
  console.log("\n\n=== STAGE 10: BOARD REPORT SECTIONS ===");
  const boardSectionIds = ["context", "strategic_direction", "initiative_portfolio", "investment_case", "capability_readiness", "governance"] as const;

  // We'll call transformText with board_report stage for each section
  // (simulating what the streaming endpoint does — generate then refine)
  const sectionTexts: Record<string, string> = {};

  for (const sectionId of boardSectionIds) {
    try {
      const r = await caller.intelligence.transformText({
        text: `Generate the ${sectionId} section of the board report for Acme Retail. ${ACME.businessCaseNarrative}`,
        action: "expand",
        stage: "board_report",
      });
      sectionTexts[sectionId] = r.text;
      record(`Stage 10 Board report — ${sectionId} (generate)`, r.text);
    } catch (e: any) { record(`Stage 10 Board report — ${sectionId} [ERROR]`, e.message); }
  }

  // 2 Refine outputs on different sections
  const refineTargets = ["context", "strategic_direction"] as const;
  for (const sectionId of refineTargets) {
    if (sectionTexts[sectionId]) {
      try {
        const r = await caller.intelligence.transformText({
          text: sectionTexts[sectionId],
          action: "refine",
          stage: "board_report",
        });
        record(`Stage 10 Board report — ${sectionId} (refine)`, r.text);
      } catch (e: any) { record(`Stage 10 Board report — ${sectionId} refine [ERROR]`, e.message); }
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log("\n\n" + "=".repeat(80));
  console.log("VOCABULARY SAMPLING SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total samples: ${results.length}`);
  const withHits = results.filter(r => r.hits.length > 0);
  console.log(`Samples with blacklist hits: ${withHits.length}`);
  if (withHits.length > 0) {
    console.log("\nBLACKLIST VIOLATIONS:");
    for (const r of withHits) {
      console.log(`  ❌ ${r.label}: ${r.hits.join(", ")}`);
    }
  } else {
    console.log("\n✅ All samples clean — no blacklist violations detected.");
  }

  // Write results to file for report
  const fs = await import("fs");
  fs.writeFileSync("/tmp/qa-vocab-results.json", JSON.stringify(results, null, 2));
  console.log("\nFull results written to /tmp/qa-vocab-results.json");
}

run().catch(console.error);
