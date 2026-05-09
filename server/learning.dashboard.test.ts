import { describe, it, expect } from "vitest";

/**
 * Unit tests for the Learning Plan Dashboard v2 procedures.
 * These are lightweight structural tests since the procedures require
 * authenticated DB context. We test the helper logic directly.
 */

// ── relativeTime helper (extracted from LearningPlanPage) ──────────────────
function relativeTime(ts: number | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "last week";
  return `${Math.floor(days / 7)} weeks ago`;
}

// ── getLearningPhase helper ────────────────────────────────────────────────
function getLearningPhase(levelLabel: string): { label: string; color: string; bg: string } {
  const l = (levelLabel ?? "").toLowerCase();
  if (l === "foundation" || l === "beginner" || l === "emerging")
    return { label: "Foundation", color: "#6366F1", bg: "#6366F118" };
  if (l === "developing" || l === "practitioner")
    return { label: "Building", color: "#C8B07A", bg: "#C8B07A18" };
  if (l === "advanced" || l === "expert" || l === "capable" || l === "strong")
    return { label: "Leading", color: "#047857", bg: "#04785718" };
  return { label: "Foundation", color: "#6366F1", bg: "#6366F118" };
}

describe("Learning Dashboard v2 helpers", () => {
  describe("relativeTime", () => {
    it("returns empty string for null", () => {
      expect(relativeTime(null)).toBe("");
    });

    it("returns 'today' for timestamps within the last 24h", () => {
      expect(relativeTime(Date.now() - 1000 * 60 * 30)).toBe("today");
    });

    it("returns 'yesterday' for timestamps ~1 day ago", () => {
      expect(relativeTime(Date.now() - 1000 * 60 * 60 * 25)).toBe("yesterday");
    });

    it("returns 'X days ago' for timestamps 2-6 days ago", () => {
      expect(relativeTime(Date.now() - 1000 * 60 * 60 * 24 * 3)).toBe("3 days ago");
    });

    it("returns 'last week' for timestamps 7-13 days ago", () => {
      expect(relativeTime(Date.now() - 1000 * 60 * 60 * 24 * 8)).toBe("last week");
    });

    it("returns 'X weeks ago' for timestamps 14+ days ago", () => {
      expect(relativeTime(Date.now() - 1000 * 60 * 60 * 24 * 21)).toBe("3 weeks ago");
    });
  });

  describe("getLearningPhase", () => {
    it("maps 'emerging' to Foundation", () => {
      expect(getLearningPhase("emerging").label).toBe("Foundation");
    });

    it("maps 'developing' to Building", () => {
      expect(getLearningPhase("developing").label).toBe("Building");
    });

    it("maps 'capable' to Leading", () => {
      expect(getLearningPhase("capable").label).toBe("Leading");
    });

    it("maps 'strong' to Leading", () => {
      expect(getLearningPhase("strong").label).toBe("Leading");
    });

    it("defaults unknown values to Foundation", () => {
      expect(getLearningPhase("unknown_level").label).toBe("Foundation");
    });

    it("is case-insensitive", () => {
      expect(getLearningPhase("EMERGING").label).toBe("Foundation");
      expect(getLearningPhase("Developing").label).toBe("Building");
    });
  });

  describe("Block C: domain card score demotion", () => {
    it("formats score correctly (0-100 scale to 0-10)", () => {
      const score = 72;
      const display = `${(score / 10).toFixed(1)} / 10`;
      expect(display).toBe("7.2 / 10");
    });

    it("returns null display for zero score", () => {
      const score = 0;
      const display = score > 0 ? `${(score / 10).toFixed(1)} / 10` : null;
      expect(display).toBeNull();
    });
  });

  describe("Block B: initiative status colour mapping", () => {
    function getStatusColor(status: string) {
      return status === "in_progress"
        ? { label: "In progress" }
        : status === "completed"
        ? { label: "Completed" }
        : { label: "Planned" };
    }

    it("maps in_progress correctly", () => {
      expect(getStatusColor("in_progress").label).toBe("In progress");
    });

    it("maps completed correctly", () => {
      expect(getStatusColor("completed").label).toBe("Completed");
    });

    it("maps unknown status to Planned", () => {
      expect(getStatusColor("not_started").label).toBe("Planned");
    });
  });
});
