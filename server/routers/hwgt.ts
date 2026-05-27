/**
 * HWGT Router — "How We Get There" (Section 03)
 * Manages the phased initiative roadmap for the AIQ strategy platform.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { hwgtInitiatives, ailOrgContext } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { assertLLMRateLimit } from "../_core/llmRateLimit";
import { nanoid } from "nanoid";
import { eq, and, asc } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConnectsTo = { type: "outcome" | "principle"; index: number; label: string };

// ─── Default Initiatives ──────────────────────────────────────────────────────

const DEFAULT_INITIATIVES = [
  // Foundation (months 1-3)
  {
    title: "AI decision rules",
    description: "Agree which decisions humans make and which AI can support.",
    hrFunction: "Ethics & Governance",
    phase: "foundation" as const,
    costLow: 40, costHigh: 80,
    costNote: "Mostly internal time + light external advisory. Higher end if you bring in an external AI ethics consultant.",
    whySuggesting: "You've committed to keeping humans in the loop on consequential decisions. Before deploying any AI tool, you need agreed rules on **where AI can act, where it must propose to a human, and what reviewer documentation looks like.** This is the foundation that lets every other AI initiative proceed safely — without it, each later deployment has to make its own governance up.",
    whatInvolvesJson: [
      "Define which HR decisions need a human in the loop (hiring, promotion, performance, termination)",
      "Set documentation standards for human reviewers",
      "Agree escalation paths when AI confidence is low",
      "Establish a quarterly governance review",
    ],
    worthKnowing: "**UK ICO guidance applies.** Decisions agreed here affect every later initiative — get them right first. Depending on your structure, you may also need union or works council consultation.",
    connectsToJson: [
      { type: "outcome" as const, index: 3, label: "Outcome 3" },
      { type: "principle" as const, index: 1, label: "Principle 1" },
      { type: "principle" as const, index: 2, label: "Principle 2" },
    ],
    sortOrder: 10,
  },
  {
    title: "HR team AI training (foundation)",
    description: "Everyone in HR learns the basics of AI before tools land.",
    hrFunction: "Learning & Development",
    phase: "foundation" as const,
    costLow: 30, costHigh: 60,
    costNote: "Per-seat costs scale with team size. The 12-person team fits comfortably in the lower range with an off-the-shelf programme.",
    whySuggesting: "Your strategy explicitly says skills come before deployment, and your Practitioner outcome jumps from **22% to 85% in 18 months**. The team can't get there without a structured baseline programme.",
    whatInvolvesJson: [
      "4–6 week structured curriculum for the full HR team",
      "Mix of AI fundamentals, HR-specific use cases, ethical considerations",
      "Assessment to baseline current capability levels",
      "Feeds the Practitioner-level outcome measurement",
    ],
    worthKnowing: "This needs to land before any deployment-stage initiative. If timing slips, defer the deployment work — don't deploy ahead of capability.",
    connectsToJson: [
      { type: "outcome" as const, index: 2, label: "Outcome 2" },
      { type: "principle" as const, index: 4, label: "Principle 4" },
    ],
    sortOrder: 20,
  },
  {
    title: "Workforce communications plan",
    description: "Tell people what's coming. Build trust before tools arrive.",
    hrFunction: "Workforce Planning",
    phase: "foundation" as const,
    costLow: 20, costHigh: 40,
    costNote: "Internal time-heavy. Cost mostly reflects content production and any external comms support.",
    whySuggesting: "Trust is one of your measurable outcomes (**48% → 80%**), and the research is consistent: workforces that hear about AI deployment plans early are dramatically more receptive than those who hear about it after the fact.",
    whatInvolvesJson: [
      "Workforce-facing comms strategy: what we'll deploy, when, why, what it means for them",
      "Manager talking points and FAQs",
      "Two-way feedback channels for concerns",
      "Cadence: pre-deployment, at-deployment, post-deployment for each major tool",
    ],
    worthKnowing: "If your organisation has unions or works councils, formal consultation may be required before AI deployment begins. Plan for this in the comms timeline.",
    connectsToJson: [
      { type: "outcome" as const, index: 4, label: "Outcome 4" },
      { type: "principle" as const, index: 5, label: "Principle 5" },
    ],
    sortOrder: 30,
  },
  // Build (months 4-6)
  {
    title: "Rethink hiring (before AI)",
    description: "Improve the hiring process first. Make sure it's right before automating.",
    hrFunction: "Talent Acquisition",
    phase: "build" as const,
    costLow: 40, costHigh: 90,
    costNote: "Depends on whether you bring in external workflow design help or use internal HR + TA leadership time.",
    whySuggesting: "Principle 3 says **we redesign first, then deploy AI.** Automating a bad process makes it faster, not better. Before AI lands in hiring, the workflow needs to be redesigned to be AI-native — humans focus on judgment and relationships while AI handles structured tasks.",
    whatInvolvesJson: [
      "Map current hiring process end-to-end with timing data",
      "Identify which steps are judgment-heavy (keep human) vs structured (candidate for AI)",
      "Redesign the workflow with the AI-augmented future state in mind",
      "Pilot the redesigned process manually before adding AI",
    ],
    worthKnowing: "This step is what makes the admin time reduction (**6h → 3h**) achievable. Without it, deploying AI just creates parallel work rather than reducing the total.",
    connectsToJson: [
      { type: "outcome" as const, index: 1, label: "Outcome 1" },
      { type: "principle" as const, index: 3, label: "Principle 3" },
    ],
    sortOrder: 40,
  },
  {
    title: "Bias monitoring system",
    description: "Build the tools that catch bias and keep audit records.",
    hrFunction: "Ethics & Governance",
    phase: "build" as const,
    costLow: 50, costHigh: 100,
    costNote: "Build-vs-buy. Specialist UK vendors offer turnkey bias-monitoring SaaS at the lower end; custom integration with existing HR systems lands higher.",
    whySuggesting: "**UK Equality Act 2010** makes algorithmic discrimination in employment decisions legally actionable. Before any AI deployment that touches candidate selection, the bias-monitoring infrastructure needs to be in place — otherwise you're flying blind on the most regulated dimension of HR AI.",
    whatInvolvesJson: [
      "Select bias-monitoring platform or build internal capability",
      "Define monitored metrics aligned to UK Equality Act categories",
      "Establish audit trail standards for all AI-assisted hiring decisions",
      "Set thresholds that trigger human review",
    ],
    worthKnowing: "**UK Equality Act 2010** — protected characteristics include age, disability, race, religion, sex, sexual orientation. Bias monitoring must cover these explicitly. **ICO** has separate guidance on AI fairness.",
    connectsToJson: [
      { type: "outcome" as const, index: 4, label: "Outcome 4" },
      { type: "principle" as const, index: 2, label: "Principle 2" },
    ],
    sortOrder: 50,
  },
  {
    title: "HR specialist AI training (advanced)",
    description: "Deeper training for HR specialists who'll use AI day-to-day.",
    hrFunction: "Learning & Development",
    phase: "build" as const,
    costLow: 50, costHigh: 90,
    costNote: "Specialist-track training costs more per seat but covers a smaller cohort (~5–7 specialists from the 12-person team).",
    whySuggesting: "After foundational training, the specialists who'll actually operate AI tools day-to-day need deeper capability. This is the second wave of your Practitioner-level outcome — moving from 'everyone gets the basics' to 'key roles can lead AI deployment confidently.'",
    whatInvolvesJson: [
      "Identify which HR roles will operate AI tools regularly (TA leads, L&D, governance)",
      "Specialist training covering tool-specific workflows, prompt engineering, output evaluation",
      "Hands-on practice in a sandbox before live deployment",
      "Certification or assessment to confirm Practitioner-level capability",
    ],
    worthKnowing: "This cohort becomes internal champions when broader deployment happens. Choose participants who'll evangelise as well as operate.",
    connectsToJson: [
      { type: "outcome" as const, index: 2, label: "Outcome 2" },
    ],
    sortOrder: 60,
  },
  // Scale (months 7-12)
  {
    title: "AI for interview scheduling",
    description: "AI handles scheduling, calendar invites, and candidate emails.",
    hrFunction: "Talent Acquisition",
    phase: "scale" as const,
    costLow: 60, costHigh: 120,
    costNote: "SaaS-based deployment at the lower end; integration with Workday and existing calendars adds cost.",
    whySuggesting: "This is the first concrete AI deployment in your redesigned hiring workflow. Scheduling is **low-risk** (no consequential decisions) and **high-volume** — immediate time savings without touching candidate evaluation.",
    whatInvolvesJson: [
      "Select scheduling AI platform",
      "Integrate with Workday and team calendars",
      "Configure candidate communication templates (with human-readable signatures)",
      "Pilot with one hiring team, scale based on feedback",
    ],
    worthKnowing: "**UK GDPR** — candidates must be informed that AI is involved in scheduling and have a route to human contact. Build this into the comms.",
    connectsToJson: [
      { type: "outcome" as const, index: 1, label: "Outcome 1" },
    ],
    sortOrder: 70,
  },
  {
    title: "Employee trust survey",
    description: "Ask employees how they feel about AI in HR. Repeat quarterly.",
    hrFunction: "Workforce Planning",
    phase: "scale" as const,
    costLow: 15, costHigh: 30,
    costNote: "Low cost — primarily survey platform fees and analysis time. Higher end if you bring in external survey design support.",
    whySuggesting: "You can't manage what you can't measure. Outcome 4 sets a specific trust target (**48% → 80% by Q3 2027**) but until this survey is in place, the baseline is theoretical and progress is unmeasurable.",
    whatInvolvesJson: [
      "Design survey instrument (5–10 questions focused on AI use in HR decisions)",
      "Establish baseline measurement (first wave)",
      "Quarterly cadence going forward",
      "Reporting back to the workforce on what changes based on responses",
    ],
    worthKnowing: "How you respond to the first wave's findings sets the trust trajectory more than the survey itself. Plan the response cadence alongside the measurement.",
    connectsToJson: [
      { type: "outcome" as const, index: 4, label: "Outcome 4" },
    ],
    sortOrder: 80,
  },
  // Optimise (months 13-18)
  {
    title: "AI shortlisting (with human review)",
    description: "AI proposes a shortlist. A human reviewer always signs off.",
    hrFunction: "Talent Acquisition",
    phase: "optimise" as const,
    costLow: 100, costHigh: 180,
    costNote: "Most complex initiative — significant integration, governance, and ongoing operation costs. Higher end accounts for external AI ethics review.",
    whySuggesting: "This is the most consequential AI deployment in your plan and is **deliberately last** — it only proceeds after governance (initiative 1), workforce comms (initiative 3), workflow redesign (initiative 4), bias monitoring (initiative 5), and specialist skills (initiatives 2, 6) are all in place. Principle 1 (Human-in-the-loop) is fully expressed here: AI proposes, humans always decide.",
    whatInvolvesJson: [
      "Select shortlisting AI tool or develop with chosen vendor",
      "Integrate with bias monitoring infrastructure",
      "Define mandatory reviewer documentation per shortlist decision",
      "Pilot with one role/team before broader rollout",
      "Continuous monitoring of demographic outcomes",
    ],
    worthKnowing: "**UK Equality Act and ICO guidance** both apply. This is the initiative most likely to attract regulatory scrutiny. Plan for an external ethics audit before scaling beyond pilot.",
    connectsToJson: [
      { type: "outcome" as const, index: 3, label: "Outcome 3" },
      { type: "outcome" as const, index: 1, label: "Outcome 1" },
    ],
    sortOrder: 90,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCost(low: number | null | undefined, high: number | null | undefined): string {
  if (!low && !high) return "Cost TBD";
  if (low && high) return `£${low}K–£${high}K`;
  if (low) return `~£${low}K`;
  return `~£${high}K`;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const hwgtRouter = router({

  // ── Get all active initiatives for tenant ──────────────────────────────────
  getInitiatives: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const rows = await db
      .select()
      .from(hwgtInitiatives)
      .where(and(
        eq(hwgtInitiatives.tenantId, ctx.user.tenantId),
        eq(hwgtInitiatives.isDismissed, 0),
      ))
      .orderBy(asc(hwgtInitiatives.sortOrder), asc(hwgtInitiatives.createdAt));

    // If no initiatives exist, seed defaults
    if (rows.length === 0) {
      const toInsert = DEFAULT_INITIATIVES.map((d) => ({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        ...d,
      }));
      await db.insert(hwgtInitiatives).values(toInsert);
      return toInsert.map((i) => ({ ...i, isDismissed: 0, dismissedAt: null, diagDismissedJson: null, costNote: i.costNote ?? null, hrFunction: i.hrFunction ?? null, costLow: i.costLow ?? null, costHigh: i.costHigh ?? null }));
    }

    return rows;
  }),

  // ── Save (create or update) an initiative ─────────────────────────────────
  saveInitiative: protectedProcedure
    .input(z.object({
      id: z.string().optional(),
      title: z.string().min(1),
      description: z.string().min(1),
      hrFunction: z.string().optional().nullable(),
      phase: z.enum(["foundation", "build", "scale", "optimise"]),
      costLow: z.number().int().optional().nullable(),
      costHigh: z.number().int().optional().nullable(),
      costNote: z.string().optional().nullable(),
      whySuggesting: z.string().optional().nullable(),
      whatInvolvesJson: z.array(z.string()).optional().nullable(),
      worthKnowing: z.string().optional().nullable(),
      connectsToJson: z.array(z.object({
        type: z.enum(["outcome", "principle"]),
        index: z.number().int(),
        label: z.string(),
      })).optional().nullable(),
      status: z.enum(["suggested", "edited", "user_added", "dismissed"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const now = Date.now();

      if (input.id) {
        // Update existing
        const existing = await db.select().from(hwgtInitiatives)
          .where(and(eq(hwgtInitiatives.id, input.id), eq(hwgtInitiatives.tenantId, ctx.user.tenantId)))
          .limit(1);
        if (!existing.length) throw new TRPCError({ code: "NOT_FOUND" });

        const currentStatus = existing[0].status;
        const newStatus = input.status ?? (currentStatus === "suggested" ? "edited" : currentStatus);

        await db.update(hwgtInitiatives).set({
          title: input.title,
          description: input.description,
          hrFunction: input.hrFunction ?? null,
          phase: input.phase,
          costLow: input.costLow ?? null,
          costHigh: input.costHigh ?? null,
          costNote: input.costNote ?? null,
          whySuggesting: input.whySuggesting ?? null,
          whatInvolvesJson: input.whatInvolvesJson ?? null,
          worthKnowing: input.worthKnowing ?? null,
          connectsToJson: input.connectsToJson ?? null,
          status: newStatus,
          updatedAt: new Date(),
        }).where(eq(hwgtInitiatives.id, input.id));

        return { id: input.id, status: newStatus };
      } else {
        // Create new user-added initiative
        const id = nanoid();
        const maxOrder = await db.select({ s: hwgtInitiatives.sortOrder })
          .from(hwgtInitiatives)
          .where(and(eq(hwgtInitiatives.tenantId, ctx.user.tenantId), eq(hwgtInitiatives.phase, input.phase)))
          .orderBy(asc(hwgtInitiatives.sortOrder));
        const nextOrder = maxOrder.length ? (maxOrder[maxOrder.length - 1].s + 10) : 10;

        await db.insert(hwgtInitiatives).values({
          id,
          tenantId: ctx.user.tenantId,
          title: input.title,
          description: input.description,
          hrFunction: input.hrFunction ?? null,
          phase: input.phase,
          costLow: input.costLow ?? null,
          costHigh: input.costHigh ?? null,
          costNote: input.costNote ?? null,
          whySuggesting: input.whySuggesting ?? null,
          whatInvolvesJson: input.whatInvolvesJson ?? null,
          worthKnowing: input.worthKnowing ?? null,
          connectsToJson: input.connectsToJson ?? null,
          status: "user_added",
          sortOrder: nextOrder,
        });

        return { id, status: "user_added" as const };
      }
    }),

  // ── Dismiss an initiative ─────────────────────────────────────────────────
  dismissInitiative: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const existing = await db.select().from(hwgtInitiatives)
        .where(and(eq(hwgtInitiatives.id, input.id), eq(hwgtInitiatives.tenantId, ctx.user.tenantId)))
        .limit(1);
      if (!existing.length) throw new TRPCError({ code: "NOT_FOUND" });

      await db.update(hwgtInitiatives).set({
        isDismissed: 1,
        dismissedAt: Date.now(),
        status: "dismissed",
        updatedAt: new Date(),
      }).where(eq(hwgtInitiatives.id, input.id));

      return { success: true };
    }),

  // ── Move initiative to a different phase ──────────────────────────────────
  movePhase: protectedProcedure
    .input(z.object({
      id: z.string(),
      phase: z.enum(["foundation", "build", "scale", "optimise"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const existing = await db.select().from(hwgtInitiatives)
        .where(and(eq(hwgtInitiatives.id, input.id), eq(hwgtInitiatives.tenantId, ctx.user.tenantId)))
        .limit(1);
      if (!existing.length) throw new TRPCError({ code: "NOT_FOUND" });

      await db.update(hwgtInitiatives).set({
        phase: input.phase,
        updatedAt: new Date(),
      }).where(eq(hwgtInitiatives.id, input.id));

      return { success: true };
    }),

  // ── Regenerate AI content for a single initiative ─────────────────────────
  regenerateInitiative: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertLLMRateLimit(ctx.user.id); // PROD-2.1
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db.select().from(hwgtInitiatives)
        .where(and(eq(hwgtInitiatives.id, input.id), eq(hwgtInitiatives.tenantId, ctx.user.tenantId)))
        .limit(1);
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND" });
      const initiative = rows[0];

      // Get org context for personalisation
      const ctxRows = await db.select().from(ailOrgContext)
        .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
        .limit(1);
      const orgCtx = ctxRows[0] ?? null;
      const orgName = "the organisation";
      const sector = orgCtx?.sector ?? "HR";
      const teamSize = 12;

      const prompt = `You are writing initiative content for an HR AI strategy roadmap.

Organisation: ${orgName} (${sector} sector, ${teamSize}-person HR team)
Initiative: "${initiative.title}"
Description: "${initiative.description}"
Phase: ${initiative.phase}
HR Function: ${initiative.hrFunction ?? "General HR"}

Write three sections:
1. WHY_SUGGESTING: 2-3 sentences. Reference specific Ambition commitments if possible. Pattern: "You've committed to X. To reach that, Y has to happen. This initiative does Y."
2. WHAT_INVOLVES: 3-5 bullet points of concrete activities (not categories). Return as JSON array of strings.
3. WORTH_KNOWING: 1-3 sentences on real risks, UK regulatory references (ICO, UK Equality Act 2010, UK GDPR), or dependencies. No platitudes.

Return JSON: { "whySuggesting": "...", "whatInvolvesJson": ["...", "..."], "worthKnowing": "..." }`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert HR AI strategy consultant. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "initiative_content",
            strict: true,
            schema: {
              type: "object",
              properties: {
                whySuggesting: { type: "string" },
                whatInvolvesJson: { type: "array", items: { type: "string" } },
                worthKnowing: { type: "string" },
              },
              required: ["whySuggesting", "whatInvolvesJson", "worthKnowing"],
              additionalProperties: false,
            },
          },
        },
      });

      let parsed: { whySuggesting: string; whatInvolvesJson: string[]; worthKnowing: string };
      try {
        parsed = JSON.parse(response.choices[0].message.content as string);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid JSON" });
      }

      await db.update(hwgtInitiatives).set({
        whySuggesting: parsed.whySuggesting,
        whatInvolvesJson: parsed.whatInvolvesJson,
        worthKnowing: parsed.worthKnowing,
        updatedAt: new Date(),
      }).where(eq(hwgtInitiatives.id, input.id));

      return { success: true, ...parsed };
    }),

  // ── Regenerate full plan (preserves edited/user_added, re-generates untouched suggested) ──
  regeneratePlan: protectedProcedure.mutation(async ({ ctx }) => {
    assertLLMRateLimit(ctx.user.id); // PROD-2.1
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    // Get org context
    const ctxRows = await db.select().from(ailOrgContext)
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId))
      .limit(1);
    const orgCtx = ctxRows[0] ?? null;
    const orgName = "the organisation";
    const sector = orgCtx?.sector ?? "HR";
    const teamSize = 12;
    const ambitionTier = orgCtx?.businessAmbitionLevel ?? 3;

    // Get existing initiatives
    const existing = await db.select().from(hwgtInitiatives)
      .where(eq(hwgtInitiatives.tenantId, ctx.user.tenantId));

    // Keep edited, user_added, and dismissed — only regenerate untouched "suggested"
    const toKeep = existing.filter(i => i.status !== "suggested" || i.isDismissed === 1);
    const toRegenerate = existing.filter(i => i.status === "suggested" && i.isDismissed === 0);

    // Delete the untouched suggested ones
    if (toRegenerate.length > 0) {
      for (const i of toRegenerate) {
        await db.update(hwgtInitiatives).set({ isDismissed: 1 }).where(eq(hwgtInitiatives.id, i.id));
      }
    }

    // Generate new suggestions via AI
    const prompt = `You are generating a phased HR AI strategy roadmap for ${orgName} (${sector} sector, ${teamSize}-person HR team, ambition tier ${ambitionTier}/5).

Generate 9 initiatives across 4 phases:
- Foundation (months 1-3): 3 initiatives — governance, literacy, communications
- Build (months 4-6): 3 initiatives — process redesign, monitoring, advanced skills
- Scale (months 7-12): 2 initiatives — first AI deployments
- Optimise (months 13-18): 1 initiative — most consequential AI deployment

For each initiative:
- title: plain English, action-oriented (no "Programme/Framework/System" suffixes)
- description: one line, casual but informative
- hrFunction: one of [Talent Acquisition, Learning & Development, Performance & Development, Workforce Planning, Pay & Reward, HR Operations, Ethics & Governance]
- phase: foundation|build|scale|optimise
- costLow/costHigh: integer £K estimates
- costNote: 1-2 sentences on cost drivers
- whySuggesting: 2-3 sentences referencing specific strategy commitments
- whatInvolvesJson: 3-5 concrete activity bullets
- worthKnowing: 1-3 sentences on UK regulatory risks (ICO, UK Equality Act 2010, UK GDPR) or dependencies

Return JSON: { "initiatives": [...] }`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an expert HR AI strategy consultant. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
    });

    let aiInitiatives: typeof DEFAULT_INITIATIVES = [];
    try {
      const parsed = JSON.parse(response.choices[0].message.content as string);
      aiInitiatives = parsed.initiatives ?? [];
    } catch {
      // Fall back to defaults if AI fails
      aiInitiatives = DEFAULT_INITIATIVES;
    }

    // Insert new AI-generated initiatives
    const phaseOrder: Record<string, number> = { foundation: 0, build: 100, scale: 200, optimise: 300 };
    let phaseCounters: Record<string, number> = { foundation: 0, build: 0, scale: 0, optimise: 0 };

    for (const init of aiInitiatives) {
      const phase = (init.phase as string) in phaseOrder ? init.phase : "foundation";
      phaseCounters[phase] = (phaseCounters[phase] ?? 0) + 10;
      await db.insert(hwgtInitiatives).values({
        id: nanoid(),
        tenantId: ctx.user.tenantId,
        title: init.title,
        description: init.description,
        hrFunction: init.hrFunction ?? null,
        phase,
        costLow: init.costLow ?? null,
        costHigh: init.costHigh ?? null,
        costNote: init.costNote ?? null,
        whySuggesting: init.whySuggesting ?? null,
        whatInvolvesJson: init.whatInvolvesJson ?? null,
        worthKnowing: init.worthKnowing ?? null,
        connectsToJson: init.connectsToJson ?? null,
        status: "suggested",
        sortOrder: (phaseOrder[phase] ?? 0) + phaseCounters[phase],
      });
    }

    return { success: true, count: aiInitiatives.length };
  }),

  // ── Dismiss a diagnostic banner ───────────────────────────────────────────
  dismissDiagnostic: protectedProcedure
    .input(z.object({ diagKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      // Store dismissed diagnostic keys in a special sentinel row
      const rows = await db.select().from(hwgtInitiatives)
        .where(and(eq(hwgtInitiatives.tenantId, ctx.user.tenantId)))
        .limit(1);

      if (rows.length > 0) {
        const first = rows[0];
        const current: string[] = Array.isArray(first.diagDismissedJson) ? first.diagDismissedJson : [];
        if (!current.includes(input.diagKey)) {
          await db.update(hwgtInitiatives).set({
            diagDismissedJson: [...current, input.diagKey],
          }).where(eq(hwgtInitiatives.id, first.id));
        }
      }
      return { success: true };
    }),

  // ── Move initiative to a different phase ─────────────────────────────────
  moveInitiativePhase: protectedProcedure
    .input(z.object({
      id: z.string(),
      phase: z.enum(["foundation", "build", "scale", "optimise"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(hwgtInitiatives)
        .set({ phase: input.phase, updatedAt: new Date() })
        .where(and(eq(hwgtInitiatives.id, input.id), eq(hwgtInitiatives.tenantId, ctx.user.tenantId)));
      return { success: true };
    }),

  // ── Mark plan as reviewed ───────────────────────────────────────────────
  markReviewed: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    await db.update(ailOrgContext)
      .set({
        lastReviewedAt: new Date(),
        lastReviewedBy: `${ctx.user.firstName} ${ctx.user.lastName}`,
      })
      .where(eq(ailOrgContext.tenantId, ctx.user.tenantId));
    return { success: true };
  }),

  // ── Get dismissed diagnostic keys ─────────────────────────────────────────
  getDismissedDiagnostics: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const rows = await db.select({ d: hwgtInitiatives.diagDismissedJson })
      .from(hwgtInitiatives)
      .where(eq(hwgtInitiatives.tenantId, ctx.user.tenantId))
      .limit(1);
    if (!rows.length) return [];
    return Array.isArray(rows[0].d) ? rows[0].d : [];
  }),
});
