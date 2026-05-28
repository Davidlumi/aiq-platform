/**
 * Fix 4 — UI Copy Snapshot Test
 *
 * Locks the renamed labels introduced in Fix 4 of the Evidence Pack Remediation Brief.
 * If any of these strings change in the source files, this test will fail and force
 * a deliberate review before the change is committed.
 *
 * Labels locked:
 *  - Individual assessment page title: "AI Skills Check · 6 domains"
 *  - Stage 8 reward capability page title: "Reward Readiness · 5 areas"
 *  - Nav label for individual assessment: "AI Skills Check"
 *  - Board report stage list label for Stage 8: "Reward Readiness · 5 areas"
 *
 * Source files checked:
 *  - client/src/pages/assessment/AssessmentPage.tsx
 *  - client/src/pages/strategy/RewardCapabilityPage.tsx
 *  - client/src/components/AppShell.tsx
 *  - client/src/components/DashboardLayout.tsx
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "..");

function readClient(relPath: string): string {
  return readFileSync(resolve(root, "client/src", relPath), "utf-8");
}

describe("UI Copy Snapshot (Fix 4)", () => {
  it("AssessmentPage.tsx contains the renamed individual assessment title", () => {
    const content = readClient("pages/assessment/AssessmentPage.tsx");
    expect(content).toContain("AI Skills Check");
    // Must NOT contain the old ambiguous label as a page heading
    // (it may appear in comments, but not as a visible heading string)
    expect(content).not.toMatch(/["'`]AI Capability Assessment["'`]/);
  });

  it("RewardCapabilityPage.tsx contains the renamed Stage 8 title", () => {
    const content = readClient("pages/strategy/RewardCapabilityPage.tsx");
    expect(content).toContain("Reward Readiness");
    expect(content).not.toMatch(/["'`]Capability Assessment["'`]/);
  });

  it("AppShell.tsx nav label for assessment is 'AI Skills Check'", () => {
    const content = readClient("components/AppShell.tsx");
    expect(content).toContain("AI Skills Check");
  });

  it("DashboardLayout.tsx nav label for assessment is 'AI Skills Check'", () => {
    const content = readClient("components/DashboardLayout.tsx");
    expect(content).toContain("AI Skills Check");
  });

  it("No UI file uses the ambiguous 'Capability Assessment' label as a quoted string", () => {
    const filesToCheck = [
      "pages/assessment/AssessmentPage.tsx",
      "pages/strategy/RewardCapabilityPage.tsx",
      "components/AppShell.tsx",
      "components/DashboardLayout.tsx",
    ];
    for (const f of filesToCheck) {
      const content = readClient(f);
      expect(
        content,
        `${f} still contains ambiguous 'Capability Assessment' label`
      ).not.toMatch(/["'`]Capability Assessment["'`]/);
    }
  });
});
