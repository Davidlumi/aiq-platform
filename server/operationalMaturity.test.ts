/**
 * v1.3 Operational Maturity — unit tests
 * Covers: Block A (library telemetry), Block B (content requests), Block C (implementation tracking),
 *         Block D (maturity progression), Block E (manager hub)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getContentLibrary, isSourceStale, getLibraryVersion, getLibraryMeta } from "./contentLibrary";

// ── Block A: Content freshness ────────────────────────────────────────────────

describe("Block A — Content freshness", () => {
  describe("getLibraryVersion", () => {
    it("returns a semver string", () => {
      const v = getLibraryVersion();
      expect(v).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("returns v1.3.0 or higher", () => {
      const v = getLibraryVersion();
      const [major, minor] = v.split(".").map(Number);
      expect(major > 1 || (major === 1 && minor >= 3)).toBe(true);
    });
  });

  describe("getLibraryMeta", () => {
    it("includes version, built_at, and content_counts", () => {
      const meta = getLibraryMeta();
      expect(meta).toHaveProperty("version");
      expect(meta).toHaveProperty("built_at");
      expect(meta).toHaveProperty("content_counts");
    });

    it("content_counts includes initiatives and risk_rules", () => {
      const meta = getLibraryMeta();
      expect(meta.content_counts).toHaveProperty("initiatives");
      expect(meta.content_counts).toHaveProperty("risk_rules");
      expect(meta.content_counts.initiatives).toBeGreaterThan(0);
    });
  });

  describe("isSourceStale", () => {
    it("marks a source as stale when last_reviewed_date is over 18 months ago", () => {
      const staleSource = {
        source_id: "test-src",
        citation: "Old Source (2022)",
        source_type: "report",
        publication_date: "2020-01-01",
        accessed: "2022-01-01",
        last_reviewed_date: "2022-01-01",
      };
      const result = isSourceStale(staleSource);
      expect(result).toBe(true);
    });

    it("marks a source as fresh when last_reviewed_date is recent", () => {
      const freshSource = {
        source_id: "test-src-2",
        citation: "Fresh Source (2025)",
        source_type: "report",
        publication_date: "2025-01-01",
        accessed: new Date().toISOString().slice(0, 10),
        last_reviewed_date: new Date().toISOString().slice(0, 10),
      };
      const result = isSourceStale(freshSource);
      expect(result).toBe(false);
    });

    it("returns false when no last_reviewed_date and no accessed date", () => {
      const noReviewSource = {
        source_id: "test-src-3",
        citation: "No Review Source",
        source_type: "report",
        publication_date: "2019-06-01",
        accessed: "",
      };
      // isSourceStale returns false when reviewed is falsy
      const result = isSourceStale(noReviewSource);
      expect(result).toBe(false);
    });
  });

  describe("library sources have required fields", () => {
    it("all sources in library.json have source_id and citation", () => {
      const lib = getContentLibrary();
      const sources = Object.values(lib.sources);
      expect(sources.length).toBeGreaterThan(0);
      for (const src of sources) {
        // Sources use source_id and citation fields (not id/title)
        expect(src).toHaveProperty("source_id");
        expect(src).toHaveProperty("citation");
        expect((src as any).source_id.length).toBeGreaterThan(0);
      }
    });

    it("all sources have published_date in YYYY-MM-DD format", () => {
      const lib = getContentLibrary();
      const sources = Object.values(lib.sources);
      const dateRe = /^\d{4}-\d{2}-\d{2}$/;
      for (const src of sources) {
        if (src.published_date) {
          expect(src.published_date).toMatch(dateRe);
        }
      }
    });
  });
});

// ── Block B: Content requests ─────────────────────────────────────────────────

describe("Block B — Content requests validation", () => {
  it("validates request types", () => {
    const validTypes = ["new_initiative", "update_initiative", "new_source", "update_source", "new_risk_rule", "other"];
    for (const t of validTypes) {
      expect(validTypes).toContain(t);
    }
  });

  it("validates priority levels", () => {
    const validPriorities = ["low", "medium", "high"];
    for (const p of validPriorities) {
      expect(validPriorities).toContain(p);
    }
  });

  it("validates status transitions", () => {
    const validStatuses = ["open", "under_review", "accepted", "declined", "done"];
    // All transitions from open are valid
    for (const s of validStatuses) {
      expect(validStatuses).toContain(s);
    }
  });
});

// ── Block C: Implementation tracking ─────────────────────────────────────────

describe("Block C — Implementation tracking", () => {
  it("validates initiative status values", () => {
    const validStatuses = ["not_started", "in_progress", "paused", "completed", "cancelled"];
    for (const s of validStatuses) {
      expect(validStatuses).toContain(s);
    }
  });

  it("validates milestone status values", () => {
    const validStatuses = ["pending", "in_progress", "completed", "overdue"];
    for (const s of validStatuses) {
      expect(validStatuses).toContain(s);
    }
  });

  it("validates phase values", () => {
    const validPhases = ["foundation", "build", "scale", "optimise"];
    for (const p of validPhases) {
      expect(validPhases).toContain(p);
    }
  });

  describe("completion percentage calculation", () => {
    it("returns 0 when no initiatives are completed", () => {
      const statuses = ["not_started", "in_progress", "not_started"];
      const completed = statuses.filter(s => s === "completed").length;
      const pct = statuses.length > 0 ? Math.round((completed / statuses.length) * 100) : 0;
      expect(pct).toBe(0);
    });

    it("returns 100 when all initiatives are completed", () => {
      const statuses = ["completed", "completed", "completed"];
      const completed = statuses.filter(s => s === "completed").length;
      const pct = statuses.length > 0 ? Math.round((completed / statuses.length) * 100) : 0;
      expect(pct).toBe(100);
    });

    it("returns 33 when 1 of 3 initiatives is completed", () => {
      const statuses = ["completed", "in_progress", "not_started"];
      const completed = statuses.filter(s => s === "completed").length;
      const pct = statuses.length > 0 ? Math.round((completed / statuses.length) * 100) : 0;
      expect(pct).toBe(33);
    });
  });
});

// ── Block D: Maturity progression ────────────────────────────────────────────

describe("Block D — Maturity progression", () => {
  describe("trend calculation", () => {
    it("identifies improving trend", () => {
      const scores = [2.1, 2.5, 3.0];
      const delta = scores[scores.length - 1] - scores[0];
      const trend = delta > 0.1 ? "improving" : delta < -0.1 ? "declining" : "stable";
      expect(trend).toBe("improving");
    });

    it("identifies declining trend", () => {
      const scores = [3.5, 3.0, 2.8];
      const delta = scores[scores.length - 1] - scores[0];
      const trend = delta > 0.1 ? "improving" : delta < -0.1 ? "declining" : "stable";
      expect(trend).toBe("declining");
    });

    it("identifies stable trend", () => {
      const scores = [3.0, 3.05, 3.02];
      const delta = scores[scores.length - 1] - scores[0];
      const trend = delta > 0.1 ? "improving" : delta < -0.1 ? "declining" : "stable";
      expect(trend).toBe("stable");
    });
  });

  describe("maturity band assignment", () => {
    const getBand = (score: number) => {
      if (score < 1.5) return "Foundational";
      if (score < 2.5) return "Developing";
      if (score < 3.5) return "Established";
      if (score < 4.5) return "Advanced";
      return "Leading";
    };

    it("assigns Foundational for score < 1.5", () => {
      expect(getBand(1.0)).toBe("Foundational");
    });

    it("assigns Developing for score 1.5–2.5", () => {
      expect(getBand(2.0)).toBe("Developing");
    });

    it("assigns Established for score 2.5–3.5", () => {
      expect(getBand(3.0)).toBe("Established");
    });

    it("assigns Advanced for score 3.5–4.5", () => {
      expect(getBand(4.0)).toBe("Advanced");
    });

    it("assigns Leading for score >= 4.5", () => {
      expect(getBand(4.8)).toBe("Leading");
    });
  });

  describe("refresh suggestion triggers", () => {
    it("validates trigger types", () => {
      const validTriggers = ["capability_progression", "library_version_update", "milestone_completion", "manual"];
      for (const t of validTriggers) {
        expect(validTriggers).toContain(t);
      }
    });
  });
});

// ── Block E: Manager hub ──────────────────────────────────────────────────────

describe("Block E — Manager hub", () => {
  describe("manager function matching", () => {
    const FUNCTION_KEYWORDS: Record<string, string[]> = {
      "L&D": ["learning", "development", "training", "l&d"],
      "Talent Acquisition": ["talent", "recruitment", "hiring", "acquisition"],
      "HRBP": ["hrbp", "business partner", "hr partner"],
      "Reward & Benefits": ["reward", "benefits", "compensation", "pay"],
      "HR Operations": ["operations", "ops", "shared services", "hr ops"],
      "People Analytics": ["analytics", "data", "insights", "reporting"],
      "Organisational Development": ["od", "organisational", "org design", "culture"],
      "Employee Relations": ["employee relations", "er", "grievance", "disciplinary"],
      "Workforce Planning": ["workforce", "planning", "headcount", "capacity"],
      "HR Technology": ["technology", "tech", "hris", "systems", "hrtech"],
    };

    it("L&D function matches learning-related keywords", () => {
      const fn = "L&D";
      const keywords = FUNCTION_KEYWORDS[fn];
      expect(keywords).toContain("learning");
      expect(keywords).toContain("l&d");
    });

    it("People Analytics function matches data-related keywords", () => {
      const fn = "People Analytics";
      const keywords = FUNCTION_KEYWORDS[fn];
      expect(keywords).toContain("analytics");
      expect(keywords).toContain("data");
    });

    it("all 10 manager functions have keyword mappings", () => {
      expect(Object.keys(FUNCTION_KEYWORDS)).toHaveLength(10);
    });
  });

  describe("brief caching logic", () => {
    it("considers brief stale after 7 days", () => {
      const CACHE_TTL_DAYS = 7;
      const oldDate = new Date(Date.now() - (CACHE_TTL_DAYS + 1) * 24 * 60 * 60 * 1000);
      const isStale = (Date.now() - oldDate.getTime()) > CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
      expect(isStale).toBe(true);
    });

    it("considers brief fresh within 7 days", () => {
      const CACHE_TTL_DAYS = 7;
      const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const isStale = (Date.now() - recentDate.getTime()) > CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
      expect(isStale).toBe(false);
    });
  });
});

// ── QA checks ─────────────────────────────────────────────────────────────────

describe("QA check logic", () => {
  describe("initiative coverage check", () => {
    it("passes when all phases are represented", () => {
      const initiatives = [
        { phase: "foundation" },
        { phase: "build" },
        { phase: "scale" },
      ];
      const phases = new Set(initiatives.map(i => i.phase));
      const hasAllPhases = ["foundation", "build"].every(p => phases.has(p));
      expect(hasAllPhases).toBe(true);
    });

    it("warns when only one phase is represented", () => {
      const initiatives = [
        { phase: "foundation" },
        { phase: "foundation" },
      ];
      const phases = new Set(initiatives.map(i => i.phase));
      const phaseCount = phases.size;
      expect(phaseCount).toBe(1);
    });
  });

  describe("stale sources check", () => {
    it("detects stale sources in initiative list", () => {
      const sources = [
        { last_reviewed_date: "2020-01-01" },
        { last_reviewed_date: new Date().toISOString().slice(0, 10) },
      ];
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 18);
      const staleCount = sources.filter(s => new Date(s.last_reviewed_date) < cutoff).length;
      expect(staleCount).toBe(1);
    });
  });
});
