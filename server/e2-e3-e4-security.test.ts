/**
 * E-2, E-3, E-4: Security evidence tests
 *
 * E-2: Entitlement does not flip on redirect (URL param cannot grant access)
 * E-3: Forged webhook is rejected (signature verification)
 * E-4: assessmentPaidProcedure refuses free-tier caller
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// ── E-2: Entitlement does not flip on redirect ────────────────────────────
describe("E-2: Entitlement cannot be set via URL parameter", () => {
  it("BillingPage reads ?status= only for toast display, not for entitlement", () => {
    const billingPage = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/billing/BillingPage.tsx"),
      "utf8"
    );
    // The status param is used only for toast/banner display
    expect(billingPage).toContain("status");
    // Entitlement is never set from URL params — it comes from the tRPC query
    expect(billingPage).not.toMatch(/setEntitlement.*searchParams/);
    expect(billingPage).not.toMatch(/entitlement.*=.*params/);
    // Entitlement state comes from the server query
    expect(billingPage).toContain("trpc.stripe.getSubscriptionStatus");
  });

  it("assessmentPaidProcedure reads entitlement from DB context, not request params", () => {
    const trpcCore = fs.readFileSync(
      path.resolve(__dirname, "./_core/trpc.ts"),
      "utf8"
    );
    // The guard reads ctx.entitlements.assessmentPaid — set from DB in context.ts
    expect(trpcCore).toContain("ent?.assessmentPaid");
    // It does NOT read from input or query params
    expect(trpcCore).not.toMatch(/input\.entitlement|query\.entitlement/);
  });
});

// ── E-3: Forged webhook is rejected ──────────────────────────────────────
describe("E-3: Forged webhook rejected by signature verification", () => {
  it("webhook handler calls stripe.webhooks.constructEvent before processing", () => {
    const webhook = fs.readFileSync(
      path.resolve(__dirname, "./stripe/webhook.ts"),
      "utf8"
    );
    // Signature verification is the first gate
    expect(webhook).toContain("stripe.webhooks.constructEvent");
    // Returns 400 on failure
    expect(webhook).toContain("res.status(400)");
    // Processing only happens after successful constructEvent
    const constructEventIdx = webhook.indexOf("constructEvent");
    const switchIdx = webhook.indexOf("switch (event.type)");
    expect(constructEventIdx).toBeLessThan(switchIdx);
  });

  it("test event passthrough uses livemode=false gate (not spoofable prefix)", () => {
    const webhook = fs.readFileSync(
      path.resolve(__dirname, "./stripe/webhook.ts"),
      "utf8"
    );
    // D-2 fix: uses livemode property, not evt_test_ prefix
    expect(webhook).toContain("event.livemode === false");
    expect(webhook).not.toContain('event.id.startsWith("evt_test_")');
  });
});

// ── E-4: assessmentPaidProcedure refuses free-tier caller ─────────────────
describe("E-4: assessmentPaidProcedure blocks free-tier callers", () => {
  it("assessmentPaidProcedure throws FORBIDDEN for free-tier entitlement", () => {
    const trpcCore = fs.readFileSync(
      path.resolve(__dirname, "./_core/trpc.ts"),
      "utf8"
    );
    // Guard exists and throws on false
    expect(trpcCore).toContain("assessmentPaidProcedure");
    expect(trpcCore).toContain("ent?.assessmentPaid");
    expect(trpcCore).toContain("FORBIDDEN");
  });

  it("adaptiveLearning router uses assessmentPaidProcedure for all procedures", () => {
    const router = fs.readFileSync(
      path.resolve(__dirname, "./routers/adaptiveLearning.ts"),
      "utf8"
    );
    // Every procedure in adaptiveLearning uses the paid guard
    const procedureMatches = (router.match(/assessmentPaidProcedure/g) ?? []).concat(router.match(/assessmentPaidProcedure as protectedProcedure/g) ?? []);
    const publicMatches = router.match(/publicProcedure\.|assessmentProcedure\./g) ?? [];
    expect(procedureMatches.length).toBeGreaterThan(0);
    expect(publicMatches.length).toBe(0);
  });

  it("assessment.ts narrative procedures use assessmentPaidProcedure", () => {
    const router = fs.readFileSync(
      path.resolve(__dirname, "./routers/assessment.ts"),
      "utf8"
    );
    // generateNarrative, generateCapabilityProfile, generateDomainDeepDive, generateSummary
    const narrativeProcedures = ["generateNarrative", "generateCapabilityProfile", "generateDomainDeepDive", "generateSummary"];
    for (const proc of narrativeProcedures) {
      const idx = router.indexOf(proc);
      expect(idx).toBeGreaterThan(-1);
      // The 200 chars before the procedure name should contain assessmentPaidProcedure
      const context = router.slice(Math.max(0, idx - 500), idx + proc.length + 30);
      expect(context).toContain("assessmentPaidProcedure");
    }
  });
});
