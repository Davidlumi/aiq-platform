/**
 * QA: Board report initiative_portfolio section re-generation
 * Verifies that the fixed prompt now references Sarah's actual selected initiatives by name.
 * Run with: npx tsx server/qa-board-report-portfolio.ts
 */

// Acme's actual selected initiatives with descriptions (from INITIATIVE_LIBRARY)
const ACME_INITIATIVES = [
  {
    label: "AI Shift Scheduling",
    description: "AI-powered scheduling optimisation for frontline workers, reducing scheduling conflicts and last-minute changes.",
  },
  {
    label: "Frontline Communication AI",
    description: "AI-assisted communication tools for managers to reach frontline workers with targeted, personalised messages.",
  },
  {
    label: "AI Screening",
    description: "AI-powered CV screening and candidate ranking to reduce time-to-shortlist for high-volume roles.",
  },
];

const context = {
  orgName: "Acme Retail Ltd",
  strategyStatement: "Acme will deploy AI-enabled HR capabilities to reduce frontline attrition by 30% and cut time-to-hire by 40% within 18 months.",
  strategyArchetype: "Operational Excellence",
  hrAmbitionLevel: 2,
  businessAmbitionLevel: 2,
  selectedInitiatives: ACME_INITIATIVES.map(i => i.label),
  selectedInitiativesWithDescriptions: ACME_INITIATIVES,
  outcomesJson: JSON.stringify([
    { outcome: "Reduce frontline attrition from 35% to 24%" },
    { outcome: "Cut time-to-hire from 28 days to 17 days" },
    { outcome: "Achieve 80% manager adoption of AI scheduling tools" },
  ]),
  businessCaseNarrative: "Acme Retail operates 812 UK stores with 20,000 employees and 35% annual frontline attrition. The business case targets £4.2M in savings over 3 years through reduced recruitment costs and improved manager productivity.",
  capabilityJson: "{}",
  reviewNotes: "",
  includeNotes: false,
};

// We need to export buildSectionPrompt for testing — let's call the LLM directly
import { invokeLLM } from "./_core/llm";
import { VOCAB_BLACKLIST } from "../shared/vocabBlacklist";

const [minWords, maxWords] = [250, 350];
const blacklistStr = VOCAB_BLACKLIST.join(", ");

const initiativeList = ACME_INITIATIVES
  .map((i, idx) => `${idx + 1}. ${i.label} — ${i.description}`)
  .join("\n");

const sharedContext = `
Organisation: ${context.orgName}
HR Ambition: ${context.businessAmbitionLevel}/4, Business Ambition: ${context.businessAmbitionLevel}/4
Strategy archetype: ${context.strategyArchetype}
Strategy statement: ${context.strategyStatement}
Selected initiatives (${ACME_INITIATIVES.length} total):
${initiativeList}
Outcomes: ${context.outcomesJson}
Business case narrative: ${context.businessCaseNarrative}
`.trim();

const systemPrompt = `You are a senior HR strategy advisor writing a board-level report for ${context.orgName}. 
Write in clear, direct, professional prose suitable for a board audience. 
Avoid jargon. Do not use bullet points — write in flowing paragraphs.
Target length: ${minWords}–${maxWords} words for this section.
Vocabulary blacklist — never use these words or phrases: ${blacklistStr}
Do not include a section heading — the heading will be added by the UI.
Write only the section content.`;

const instruction = `Write the Initiative Portfolio section. You MUST reference each of the selected initiatives by name (they are listed in the context above). Describe them as a coherent portfolio, not a list. Explain how they fit together, what sequencing logic underpins them, and how they connect to the strategic direction. Reference the outcomes and success measures. Do not invent initiatives that are not in the list.`;

const prompt = `${systemPrompt}\n\nContext:\n${sharedContext}\n\nInstruction:\n${instruction}`;

async function run() {
  console.log("Generating initiative_portfolio section with fixed prompt...\n");
  console.log("=== PROMPT CONTEXT (initiatives section) ===");
  console.log(`Selected initiatives (${ACME_INITIATIVES.length} total):`);
  console.log(initiativeList);
  console.log("\n=== GENERATING... ===\n");

  const response = await invokeLLM({
    messages: [
      { role: "user", content: prompt },
    ],
  });

  const text = (response as any)?.choices?.[0]?.message?.content ?? "";
  const content = typeof text === "string" ? text.trim() : "";
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  console.log("=== GENERATED INITIATIVE_PORTFOLIO SECTION ===\n");
  console.log(content);
  console.log(`\n=== WORD COUNT: ${wordCount} ===`);

  // Check for initiative name references
  const initiativeNames = ACME_INITIATIVES.map(i => i.label.toLowerCase());
  const contentLower = content.toLowerCase();
  const referenced = initiativeNames.filter(name => contentLower.includes(name.toLowerCase()));
  const missing = initiativeNames.filter(name => !contentLower.includes(name.toLowerCase()));

  console.log("\n=== INITIATIVE REFERENCE CHECK ===");
  console.log(`Referenced by name: ${referenced.length}/${ACME_INITIATIVES.length}`);
  if (referenced.length > 0) {
    console.log(`  ✅ Found: ${referenced.join(", ")}`);
  }
  if (missing.length > 0) {
    console.log(`  ❌ Missing: ${missing.join(", ")}`);
  }

  // Check blacklist
  const hits = VOCAB_BLACKLIST.filter(word => contentLower.includes(word.toLowerCase()));
  if (hits.length > 0) {
    console.log(`\n⚠️  BLACKLIST HITS: ${hits.join(", ")}`);
  } else {
    console.log("\n✅ No blacklist hits");
  }
}

run().catch(console.error);
