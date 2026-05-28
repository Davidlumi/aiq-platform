/**
 * Fix 6 — LLM-Column Schema Guard Test
 *
 * Asserts that all columns known to store LLM-generated output are declared as
 * `text` (unbounded) in drizzle/schema.ts, not `varchar(n)`.
 *
 * Audit result (28 May 2026):
 *   All LLM-output columns confirmed as `text`. The only free-text varchar columns
 *   are user-typed short inputs (roleHintFreetext, triggerReason) and a citation
 *   note (baselineSourceNote, 500 chars) — none of these receive LLM output.
 *
 * If a new LLM-output column is added as varchar, this test will fail.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const schemaPath = resolve(__dirname, "../drizzle/schema.ts");
const schema = readFileSync(schemaPath, "utf-8");

/**
 * Extract all column definitions matching the given column name pattern.
 * Returns an array of { line, colName, colType } objects.
 */
function extractColumnDefs(namePattern: RegExp): Array<{ line: number; colName: string; colType: string }> {
  const results: Array<{ line: number; colName: string; colType: string }> = [];
  const lines = schema.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(namePattern);
    if (match) {
      const colName = match[1];
      const isText = /\btext\s*\(/.test(line);
      const isVarchar = /\bvarchar\s*\(/.test(line);
      const colType = isText ? "text" : isVarchar ? "varchar" : "other";
      results.push({ line: i + 1, colName, colType });
    }
  }
  return results;
}

// Columns that store LLM-generated output — must all be `text`
const LLM_OUTPUT_COLUMN_PATTERNS = [
  /(\w*[Nn]arrative\w*)\s*:/,
  /(\w*[Ss]ummary\w*)\s*:/,
  /(\w*[Ss]tatement\w*)\s*:/,
  /(\w*[Vv]ision\w*)\s*:/,
  /(\w*[Bb]oardReport\w*)\s*:/,
  /(\w*[Bb]usiness[Cc]ase\w*)\s*:/,
  /(\w*[Aa]pproach[Ll]ine\w*)\s*:/,
  /(\w*[Ff]irst[Dd]raft\w*)\s*:/,
  /(\w*[Ee]xecutive[Ss]ummary\w*)\s*:/,
  /(\w*[Cc]ontent\w*)\s*:.*text\(/,  // content columns in board report sections
];

// Columns that are explicitly allowed to be varchar (user-typed short inputs, not LLM output)
const ALLOWED_VARCHAR_COLUMNS = new Set([
  "roleHintFreetext",
  "triggerReason",
  "baselineSourceNote",
]);

describe("LLM-Column Schema Guard (Fix 6)", () => {
  it("narrativeSummary is declared as text", () => {
    expect(schema).toMatch(/narrativeSummary\s*:\s*text\(/);
  });

  it("businessCaseNarrative is declared as text", () => {
    expect(schema).toMatch(/businessCaseNarrative\s*:\s*text\(/);
  });

  it("visionStatement is declared as text", () => {
    expect(schema).toMatch(/visionStatement\s*:\s*text\(/);
  });

  it("boardReportSectionsJson is declared as text", () => {
    expect(schema).toMatch(/boardReportSectionsJson\s*:\s*text\(/);
  });

  it("strategyStatement is declared as text", () => {
    expect(schema).toMatch(/strategyStatement\s*:\s*text\(/);
  });

  it("approachLine is declared as text", () => {
    expect(schema).toMatch(/approachLine\s*:\s*text\(/);
  });

  it("visionAiFirstDraft is declared as text", () => {
    expect(schema).toMatch(/visionAiFirstDraft\s*:\s*text\(/);
  });

  it("executiveSummary is declared as text", () => {
    expect(schema).toMatch(/executiveSummary\s*:\s*text\(/);
  });

  it("companyAiContextNarrative is declared as text", () => {
    expect(schema).toMatch(/companyAiContextNarrative\s*:\s*text\(/);
  });

  it("strategyNarrative is declared as text", () => {
    expect(schema).toMatch(/strategyNarrative\s*:\s*text\(/);
  });

  it("no LLM-output column name suffix appears as varchar in the schema", () => {
    // Any column whose name ends in Narrative, Summary, Statement, FirstDraft, or BoardReport
    // must be text, not varchar
    const lines = schema.split("\n");
    const violations: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/\bvarchar\s*\(/.test(line)) {
        const nameMatch = line.match(/(\w+)\s*:\s*varchar/);
        if (nameMatch) {
          const colName = nameMatch[1];
          if (ALLOWED_VARCHAR_COLUMNS.has(colName)) continue;
          // Flag any varchar column whose name suggests LLM output
          if (/[Nn]arrative|[Ss]ummary|[Ss]tatement|[Ff]irst[Dd]raft|[Bb]oard[Rr]eport|[Vv]ision[Aa]i|[Bb]usiness[Cc]ase|[Aa]pproach[Ll]ine|[Ee]xecutive[Ss]ummary/.test(colName)) {
            violations.push(`Line ${i + 1}: ${colName} is varchar but appears to be an LLM-output column`);
          }
        }
      }
    }
    expect(violations, `LLM-output columns declared as varchar:\n${violations.join("\n")}`).toHaveLength(0);
  });
});
