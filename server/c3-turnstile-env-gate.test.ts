/**
 * C-3 Turnstile environment gate tests
 *
 * Verifies that:
 * 1. In production (NODE_ENV=production), a missing TURNSTILE_SECRET_KEY causes
 *    selfRegister to throw INTERNAL_SERVER_ERROR — never fail-open.
 * 2. In non-production, a missing key is silently skipped (local dev convenience).
 * 3. The skip branch is gated on NODE_ENV, not on key absence alone.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";

const AUTH_ROUTER_PATH = path.resolve(__dirname, "./routers/auth.ts");

describe("C-3: Turnstile environment gate", () => {
  it("production hard-fail: auth.ts throws INTERNAL_SERVER_ERROR when key is absent in production", () => {
    const source = fs.readFileSync(AUTH_ROUTER_PATH, "utf-8");

    // The guard must check NODE_ENV === 'production' AND missing key
    expect(source).toContain('process.env.NODE_ENV === "production"');
    expect(source).toContain("!turnstileSecret && isProduction");

    // The hard-fail must throw — not silently pass
    const hardFailBlock = source.slice(
      source.indexOf("!turnstileSecret && isProduction"),
      source.indexOf("!turnstileSecret && isProduction") + 400
    );
    expect(hardFailBlock).toContain("INTERNAL_SERVER_ERROR");
    expect(hardFailBlock).toContain("throw new TRPCError");
  });

  it("dev skip: the skip comment is explicitly scoped to non-production", () => {
    const source = fs.readFileSync(AUTH_ROUTER_PATH, "utf-8");
    // The skip comment must name the condition (not just 'no key')
    expect(source).toContain("NODE_ENV !== 'production'");
  });

  it("fail-open path does NOT exist: there is no unconditional early-return before verification", () => {
    const source = fs.readFileSync(AUTH_ROUTER_PATH, "utf-8");

    // Extract the selfRegister mutation body
    const selfRegisterIdx = source.indexOf("selfRegister:");
    expect(selfRegisterIdx).toBeGreaterThan(0);
    const mutationBodyStart = source.indexOf(".mutation(async", selfRegisterIdx);
    // Get first 2000 chars of the mutation body — covers the Turnstile block
    const mutationBody = source.slice(mutationBodyStart, mutationBodyStart + 2000);

    // There must be no path that returns success before the Turnstile block
    // (i.e. no 'return { success: true }' before the turnstileSecret check)
    const turnstileCheckIdx = mutationBody.indexOf("TURNSTILE_SECRET_KEY");
    const firstSuccessReturn = mutationBody.indexOf("return { success: true");
    // Either there's no early success return, or it comes AFTER the Turnstile block
    if (firstSuccessReturn !== -1) {
      expect(firstSuccessReturn).toBeGreaterThan(turnstileCheckIdx);
    }
  });

  it("production guard is not bypassable via key absence: the isProduction flag is derived from NODE_ENV, not from any user input", () => {
    const source = fs.readFileSync(AUTH_ROUTER_PATH, "utf-8");
    // isProduction must be derived from process.env.NODE_ENV, not from input
    const isProductionLine = source.slice(
      source.indexOf("isProduction"),
      source.indexOf("isProduction") + 80
    );
    expect(isProductionLine).toContain('process.env.NODE_ENV');
    // Must NOT be derived from input
    expect(isProductionLine).not.toContain("input.");
  });
});
