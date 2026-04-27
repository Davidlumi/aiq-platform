/**
 * server/email.test.ts
 * Validates that:
 *  1. RESEND_API_KEY is set and accepted by the Resend API
 *  2. The email helper module imports without errors
 *  3. sendApplicationConfirmation / sendOwnerApplicationAlert / sendStatusChangeEmail
 *     are exported functions
 */
import { describe, it, expect } from "vitest";
import {
  sendApplicationConfirmation,
  sendOwnerApplicationAlert,
  sendStatusChangeEmail,
} from "./email";

describe("email helper", () => {
  it("exports the three email functions", () => {
    expect(typeof sendApplicationConfirmation).toBe("function");
    expect(typeof sendOwnerApplicationAlert).toBe("function");
    expect(typeof sendStatusChangeEmail).toBe("function");
  });

  it("RESEND_API_KEY is set in environment", () => {
    const key = process.env.RESEND_API_KEY;
    expect(key, "RESEND_API_KEY must be set").toBeTruthy();
    expect(key?.startsWith("re_"), "RESEND_API_KEY should start with re_").toBe(true);
  });

  it("Resend API key is valid (can list domains)", async () => {
    const key = process.env.RESEND_API_KEY;
    if (!key) return; // skip if not set

    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    expect(res.status, `Resend API returned ${res.status} — check your API key`).toBe(200);
    const json = await res.json() as { data?: unknown[] };
    expect(Array.isArray(json.data)).toBe(true);
  });
});
