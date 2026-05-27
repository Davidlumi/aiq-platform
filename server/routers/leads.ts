/**
 * Marketing Leads Router
 * Captures email leads from marketing pages (ROI calculator, etc.)
 * and notifies the owner.
 */
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { marketingLeads } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";
import { TRPCError } from "@trpc/server";

export const leadsRouter = router({
  /**
   * Capture a marketing lead (public, no auth required)
   */
  capture: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        company: z.string().optional(),
        source: z.enum(["roi_calculator", "demo_request", "newsletter"]).default("roi_calculator"),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const now = Math.floor(Date.now() / 1000);

      await db.insert(marketingLeads).values({
        email: input.email.toLowerCase().trim(),
        company: input.company?.trim() || null,
        source: input.source,
        metadata: input.metadata || null,
        createdAt: now,
      });

      // Notify owner about the new lead
      await notifyOwner({
        title: `New lead: ${input.email}`,
        content: [
          `**Source:** ${input.source.replace(/_/g, " ")}`,
          input.company ? `**Company:** ${input.company}` : "",
          input.metadata ? `**Details:** ${JSON.stringify(input.metadata)}` : "",
        ].filter(Boolean).join("\n"),
      });

      return { success: true };
    }),
});
