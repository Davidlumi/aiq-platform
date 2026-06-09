/**
 * Phase D Gate Runner
 *
 * Runs the signal matching engine against 13 signals × 5 initiatives
 * using the Phase C org context (UK-domestic tenant, no EU operations).
 *
 * Output: per-signal verdict + named assumption + rationale + cited source
 * for founder judgment against the pre-recorded expectation table.
 *
 * Scoring is NOT done here — raw output is pasted for founder judgment.
 */

import { invokeLLM } from "./_core/llm";

// ─── Phase C org context (UK-domestic, no EU operations) ─────────────────────

const ORG_CONTEXT = `Organisation: UK-based financial services firm, 2,400 employees
Sector: Financial services (banking/insurance)
Headcount band: 1,000–4,999
Jurisdiction: UK-domestic only — no EU operations, no US operations
Ambition tier: Transformative
Business direction: Growth
Skills framework: Partial (in progress)
Workforce composition: 60% office-based, 40% hybrid
Manager capability for insights: Moderate
Pivotal job families: Risk analysts, compliance officers, relationship managers`;

// ─── 5 initiatives with their assumptions (from Phase C decomposition) ────────

const INITIATIVES = [
  {
    slug: "cr_pay_equity",
    title: "Pay Equity Analysis AI",
    assumptions: [
      { id: "pe-a1", statement: "Legal privilege arrangements will be in place before analysis begins, protecting findings from tribunal discovery" },
      { id: "pe-a2", statement: "Sufficient pay data quality exists across all employee groups to support statistically valid analysis" },
      { id: "pe-a3", statement: "HR and legal teams have capacity to act on findings within the regulatory reporting window" },
      { id: "pe-a4", statement: "The organisation will not face material pay equity litigation during the analysis period" },
      { id: "pe-a5", statement: "Ethnicity and disability pay data will be available at sufficient granularity for intersectional analysis" },
    ],
  },
  {
    slug: "fw_shift_scheduling_ai",
    title: "AI Shift Scheduling",
    assumptions: [
      { id: "ss-a1", statement: "Union or works council agreement (or confirmed absence of union recognition) will be obtained before deployment" },
      { id: "ss-a2", statement: "Workforce management system integration is technically feasible within the project timeline" },
      { id: "ss-a3", statement: "Employees will accept AI-generated schedules without significant resistance" },
      { id: "ss-a4", statement: "Scheduling constraints (shift patterns, rest requirements) are sufficiently documented for algorithmic encoding" },
    ],
  },
  {
    slug: "rt_flight_risk_prediction",
    title: "Flight Risk Prediction",
    assumptions: [
      { id: "fr-a1", statement: "Minimum 2 years of structured HRIS data will be available for model training" },
      { id: "fr-a2", statement: "Manager capability to act appropriately on flight risk predictions will be developed before deployment" },
      { id: "fr-a3", statement: "Automated decision-making safeguards and human review processes will be in place before deployment" },
      { id: "fr-a4", statement: "Employee data used for prediction will be limited to professionally relevant signals" },
      { id: "fr-a5", statement: "The model will not produce discriminatory predictions across protected characteristics" },
    ],
  },
  {
    slug: "ta_video_interview_assessment",
    title: "AI Video Interview Assessment",
    assumptions: [
      { id: "vi-a1", statement: "Vendor will provide explainability and bias auditing capabilities meeting UK employment law requirements" },
      { id: "vi-a2", statement: "Accommodation process for candidates who cannot complete video assessment will be in place" },
      { id: "vi-a3", statement: "Candidate transparency disclosure will be provided before assessment begins" },
      { id: "vi-a4", statement: "Assessment scores will not be used as the sole basis for hiring decisions" },
      { id: "vi-a5", statement: "Regulatory compliance obligations for AI-assisted recruitment will be met by the vendor" },
    ],
  },
  {
    slug: "wp_succession_planning",
    title: "AI Succession Planning",
    assumptions: [
      { id: "sp-a1", statement: "Performance and potential data in HRIS will be of sufficient quality for succession modelling" },
      { id: "sp-a2", statement: "Executive sponsorship for AI-assisted succession will be secured before deployment" },
      { id: "sp-a3", statement: "Succession rankings will be treated as confidential and access will be restricted to authorised HR and leadership" },
      { id: "sp-a4", statement: "Data governance framework will cover the use of employee data in succession modelling" },
      { id: "sp-a5", statement: "The organisation will not face legal challenge to succession decisions during the deployment period" },
    ],
  },
];

// ─── 13 signals (from founder-approved gate set) ─────────────────────────────

const SIGNALS = [
  // Category A — UK-domestic, expected to threaten a named assumption
  {
    id: "A1",
    category: "A",
    title: "ICO ADM-in-recruitment report + draft guidance (31 Mar 2026)",
    summary: "The UK Information Commissioner's Office published its report on automated decision-making (ADM) in recruitment and issued draft guidance. Key findings: UK GDPR Article 22 (as amended by the DUAA) requires meaningful human review with genuine override authority — not rubber-stamp review. DPIAs for ADM systems are frequently inadequate. Employers deploying AI in recruitment must ensure human reviewers have the capability and authority to override AI decisions, not merely the formal right.",
    sourceUrl: "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2026/03/ico-adm-recruitment-report",
    category_label: "regulatory",
  },
  {
    id: "A2",
    category: "A",
    title: "Mandatory ethnicity and disability pay gap reporting confirmed (25 Mar 2026)",
    summary: "The UK government confirmed mandatory ethnicity and disability pay gap reporting for employers with 250+ employees, with the Equality (Race and Disability) Bill introduced. Reporting requirements will be phased in from 2027. Employers must collect and report pay data broken down by ethnicity and disability status, with action plans required where gaps exceed thresholds.",
    sourceUrl: "https://www.gov.uk/government/news/ethnicity-disability-pay-gap-reporting-mandatory",
    category_label: "regulatory",
  },
  {
    id: "A3",
    category: "A",
    title: "Gender pay gap equality action plans + menopause duty guidance (Mar–Apr 2026)",
    summary: "Updated EHRC guidance requires employers to produce equality action plans alongside gender pay gap reports, with specific reference to menopause as a workplace health and disability issue. Employers with 250+ employees must demonstrate active steps to close pay gaps, not merely report them.",
    sourceUrl: "https://www.equalityhumanrights.com/guidance/gender-pay-gap-action-plans-2026",
    category_label: "regulatory",
  },
  {
    id: "A4",
    category: "A",
    title: "Trade Union Act 2016 repeal + union workplace-access rights strengthened (Feb/Oct 2026)",
    summary: "The Employment Rights Act 2025 repealed the Trade Union Act 2016, removing restrictions on industrial action and strengthening union workplace-access rights. Unions now have enhanced rights to access workplaces for organising and representation purposes. The threshold for lawful industrial action has been reduced.",
    sourceUrl: "https://www.gov.uk/government/news/employment-rights-act-2025-trade-union-provisions",
    category_label: "regulatory",
  },
  // Category B — plausible but should NOT flatly fire
  {
    id: "B1",
    category: "B",
    title: "EU AI Act high-risk AI system timeline postponed (7 May 2026)",
    summary: "The European Commission announced a 12-month postponement of the EU AI Act's high-risk AI system compliance deadline, now set for August 2027. This affects AI systems in employment, recruitment, and worker management classified as high-risk under Annex III. The postponement follows lobbying from industry groups citing implementation complexity.",
    sourceUrl: "https://ec.europa.eu/commission/presscorner/detail/en/ip_26_2847",
    category_label: "regulatory",
  },
  {
    id: "B2",
    category: "B",
    title: "US White House AI executive order on federal AI deployment (May–Jun 2026)",
    summary: "The US White House issued an executive order requiring federal agencies to conduct AI impact assessments before deploying AI systems affecting employment decisions. The order establishes a federal AI governance framework with mandatory human review requirements for AI-assisted HR decisions in federal employment.",
    sourceUrl: "https://www.whitehouse.gov/briefing-room/presidential-actions/2026/05/ai-executive-order",
    category_label: "regulatory",
  },
  {
    id: "B3",
    category: "B",
    title: "DeepSeek V4 open-weight model release (early 2026)",
    summary: "DeepSeek released DeepSeek V4, an open-weight large language model achieving performance comparable to GPT-4o at significantly lower inference cost. The model is available for commercial deployment with permissive licensing. Enterprise adoption is accelerating due to cost advantages.",
    sourceUrl: "https://deepseek.com/blog/deepseek-v4-release",
    category_label: "technology",
  },
  {
    id: "B4",
    category: "B",
    title: "Stanford HAI AI Index: frontier models fail ~1 in 3 enterprise tasks (Apr 2026)",
    summary: "The Stanford Human-Centered AI Institute's 2026 AI Index found that frontier AI models fail approximately 1 in 3 enterprise-grade tasks requiring multi-step reasoning or domain-specific knowledge. The report highlights reliability gaps in HR and legal applications specifically.",
    sourceUrl: "https://aiindex.stanford.edu/report/2026",
    category_label: "research",
  },
  {
    id: "B5",
    category: "B",
    title: "EU Pay Transparency Directive transposition deadline (7 Jun 2026)",
    summary: "The EU Pay Transparency Directive (2023/970/EU) transposition deadline passed on 7 June 2026. EU member states must now implement pay transparency requirements including the right to information about pay levels, gender pay gap reporting for employers with 100+ employees, and joint pay assessments where gaps exceed 5%.",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L0970",
    category_label: "regulatory",
  },
  // Category C — noise floor, must be silent
  {
    id: "C1",
    category: "C",
    title: "Bank of England holds Bank Rate at 3.75% (Mar/Apr 2026)",
    summary: "The Bank of England's Monetary Policy Committee voted to hold the Bank Rate at 3.75% at its March and April 2026 meetings, citing persistent services inflation and wage growth above target. Markets had priced in a 25bp cut. The decision reflects continued caution about premature easing.",
    sourceUrl: "https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/2026/march-2026",
    category_label: "market",
  },
  {
    id: "C2",
    category: "C",
    title: "Middle East / Iran conflict pushing UK energy prices higher (2026)",
    summary: "Escalating tensions in the Middle East, including Iranian threats to Strait of Hormuz shipping, have pushed Brent crude above $95/barrel. UK household energy bills are forecast to rise 8–12% in Q3 2026. Business energy costs are increasing, with manufacturing and logistics sectors most affected.",
    sourceUrl: "https://www.ft.com/content/middle-east-energy-prices-2026",
    category_label: "geopolitical",
  },
  {
    id: "C3",
    category: "C",
    title: "UK National Rail timetable change — December 2026 major revision",
    summary: "Network Rail announced the December 2026 major timetable revision, the largest since 2018. The revision affects intercity and commuter services across the network, with significant changes to peak-hour services in London, Manchester, and Birmingham. Journey times on some routes will increase by 10–15 minutes.",
    sourceUrl: "https://www.networkrail.co.uk/running-the-railway/timetables/december-2026-revision",
    category_label: "other",
  },
  // A1 override check: does Phase C have an ADM/human-review assumption on flight-risk/video-interview?
  // (This is the same as A1 but run separately to check the override condition)
  {
    id: "A1-override",
    category: "A",
    title: "A1 override check: ICO ADM guidance — does Phase C have an ADM assumption?",
    summary: "Same signal as A1. This run checks whether the flight-risk and video-interview initiatives have an ADM/human-review assumption that A1 can fire against. If no such assumption exists, the correct outcome is the no-coverage flag, not a fire.",
    sourceUrl: "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2026/03/ico-adm-recruitment-report",
    category_label: "regulatory",
  },
];

// ─── Matching engine (same logic as signals.ts, extracted for gate runner) ────

async function runMatchForSignal(
  sig: typeof SIGNALS[0],
  allAssumptions: Array<{ id: string; initiativeId: string; initiativeTitle: string; type: string; statement: string }>,
  jurisdiction: string
): Promise<{ signalId: string; rawOutput: string; parsed: unknown }> {
  const assumptionList = allAssumptions
    .map((a, i) => `[${i + 1}] ID:${a.id} | Initiative:"${a.initiativeTitle}" | Type:${a.type}\n    Statement: ${a.statement}`)
    .join("\n\n");

  const systemPrompt = `You are a senior HR strategy analyst performing a signal-to-assumption matching review.

Your task: given an external development (signal) and a list of named assumptions from an organisation's HR AI strategy, identify ONLY the assumptions that are materially threatened or affected by this signal.

RULES:
1. JURISDICTION FIRST. The organisation is ${jurisdiction}. Before firing on any regulatory or legal signal, confirm the signal applies to this jurisdiction. If it is EU-only, US-only, or otherwise out of scope, return an empty matches array with a jurisdictionNote explaining why. Do NOT fire a flat threat with no jurisdiction check.
2. SPECIFICITY. A match must name the specific assumption text and explain the specific mechanism by which this signal threatens it. "GDPR compliance" is not a rationale. "UK GDPR Art. 22 meaningful human review requirement now requires override authority, which threatens the assumption that [specific text]" is a rationale.
3. FIRED-ONLY. Return only assumptions that are materially affected. If no assumption is threatened, return an empty matches array. Silence is the correct answer for noise-floor signals.
4. NO TOPICAL OVER-REACH. A signal about union law does not automatically fire against a scheduling initiative unless you can articulate the specific two-step inference: (a) what the law change means, and (b) how it specifically threatens the named assumption text. If you cannot articulate both steps, stay silent.
5. CONFIDENCE. Assign confidenceLevel: "high" (direct, specific threat), "medium" (reasonably inferred), "low" (plausible but uncertain).

Return a JSON object with this exact shape:
{
  "jurisdictionSilent": false,
  "jurisdictionNote": null,
  "matches": [
    {
      "assumptionId": "id-string",
      "matchRationale": "string — specific mechanism",
      "citedSourceUrl": "string or null",
      "confidenceLevel": "high" | "medium" | "low"
    }
  ]
}

If the signal is out of jurisdiction:
{
  "jurisdictionSilent": true,
  "jurisdictionNote": "string — why this signal does not apply",
  "matches": []
}

No other text. No markdown fences.`;

  const userContent = `Signal: ${sig.title}
Category: ${sig.category_label}
Summary: ${sig.summary}
Source: ${sig.sourceUrl}

Assumptions to evaluate (${allAssumptions.length} total):
${assumptionList}`;

  let rawOutput = "";
  let parsed: unknown = null;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });
    const rawContent = response.choices?.[0]?.message?.content;
    rawOutput = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? "");
    const cleaned = rawOutput.replace(/```json?/g, "").replace(/```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    rawOutput = `LLM call failed: ${e}`;
  }

  return { signalId: sig.id, rawOutput, parsed };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Flatten all assumptions across all initiatives
  const allAssumptions = INITIATIVES.flatMap((init) =>
    init.assumptions.map((a) => ({
      id: a.id,
      initiativeId: init.slug,
      initiativeTitle: init.title,
      type: "assumption",
      statement: a.statement,
    }))
  );

  console.log(`\n${"=".repeat(80)}`);
  console.log(`PHASE D GATE RUN — ${new Date().toISOString()}`);
  console.log(`Tenant: UK-domestic (no EU operations, no US operations)`);
  console.log(`Signals: ${SIGNALS.length} | Assumptions: ${allAssumptions.length} across ${INITIATIVES.length} initiatives`);
  console.log(`${"=".repeat(80)}\n`);

  for (const sig of SIGNALS) {
    console.log(`\n${"─".repeat(80)}`);
    console.log(`SIGNAL ${sig.id} [Category ${sig.category}] — ${sig.title}`);
    console.log(`${"─".repeat(80)}`);

    const result = await runMatchForSignal(sig, allAssumptions, "UK-domestic (no EU operations, no US operations)");

    // Print raw output
    console.log("\n[RAW LLM OUTPUT]");
    console.log(result.rawOutput);

    // Print parsed summary
    if (result.parsed && typeof result.parsed === "object") {
      const p = result.parsed as Record<string, unknown>;
      const matches = Array.isArray(p.matches) ? p.matches : [];

      console.log(`\n[PARSED SUMMARY]`);
      console.log(`  jurisdictionSilent: ${p.jurisdictionSilent}`);
      if (p.jurisdictionNote) console.log(`  jurisdictionNote: ${p.jurisdictionNote}`);
      console.log(`  fires: ${matches.length}`);

      if (matches.length > 0) {
        for (const m of matches) {
          const match = m as Record<string, unknown>;
          const assumption = allAssumptions.find((a) => a.id === match.assumptionId);
          console.log(`\n  FIRE:`);
          console.log(`    assumptionId: ${match.assumptionId}`);
          console.log(`    initiative: ${assumption?.initiativeTitle ?? "UNKNOWN"}`);
          console.log(`    assumption: "${assumption?.statement ?? "NOT FOUND"}"`);
          console.log(`    rationale: ${match.matchRationale}`);
          console.log(`    confidence: ${match.confidenceLevel}`);
          console.log(`    citedSource: ${match.citedSourceUrl ?? "null"}`);
        }
      } else {
        console.log(`  → SILENT`);
      }
    }

    // Small delay between calls to avoid rate limiting
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log(`GATE RUN COMPLETE`);
  console.log(`${"=".repeat(80)}\n`);
}

main().catch(console.error);
