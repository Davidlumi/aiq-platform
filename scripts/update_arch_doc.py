path = "/home/ubuntu/aiq-platform/docs/aiq-assessment-architecture-v2.2.md"
with open(path, "r") as f:
    content = f.read()

# 1. Update Section 5.2 — insert new rows after the existing two-row table
old_52 = """| `blockingFailureMinItems` | 2 | Minimum number of **answer-level** blocking failure mode triggers required to produce a `block` classification impact |
| `downgradeFailureMinItems` | 1 | Minimum number of **answer-level** failure mode triggers (any type) required to produce a `downgrade` |

The engine counts"""

new_52 = """| `blockingFailureMinItems` | 2 | Minimum number of **answer-level** blocking failure mode triggers required to produce a `block` classification impact |
| `downgradeFailureMinItems` | 1 | Minimum number of **answer-level** failure mode triggers (any type) required to produce a `downgrade` |
| `baseFailureThresholdMagnitude` | 1.50 | Per-answer weighted delta magnitude at which a failure mode triggers (e.g. `blind_acceptance_risk < -1.50`) |
| `catastrophicMarginMultiplier` | 1.50 | Multiplier applied to `baseFailureThresholdMagnitude` to determine the catastrophic single-item threshold (default: 1.50 × 1.50 = 2.25) |
| `atRiskConfidenceFloor` | 0.35 | Below this composite confidence, an `at_risk` classification is downgraded to `insufficient_evidence` |
| `provisionalConfidenceThreshold` | 0.40 | Below this composite confidence, `unknown_insufficient_evidence` is returned regardless of score |
| `confidenceFloor` | 0.50 | Below this composite confidence (but above `provisionalConfidenceThreshold`), `isProvisional = true` is set on the result |
| `minimumSafeClassificationConfidence` | 0.55 | Below this composite confidence, a `safe` classification is downgraded to `at_risk` |

**WS1.2 Item 1 (Apr 2026):** `baseFailureThresholdMagnitude`, `catastrophicMarginMultiplier`, `atRiskConfidenceFloor`, `provisionalConfidenceThreshold`, `confidenceFloor`, and `minimumSafeClassificationConfidence` were previously hard-coded compile-time constants. They are now stored in `scoring_config` (migration `0019`) and loaded via `getActiveScoringConfig()`. All defaults reproduce the former hard-coded behaviour exactly.

The engine counts"""

assert old_52 in content, f"Section 5.2 pattern not found"
content = content.replace(old_52, new_52)

# 2. Append two new changelog entries before *End of document.*
old_end = "---\n\n*End of document.*"
new_entries = """---
### WS1.2 Item 1 — Six Hard-Coded Scoring Constants Made Configurable

**Problem:** The E3 hybrid delta threshold (`1.5`), catastrophic margin multiplier (`1.5`), confidence floor (`0.50`), provisional confidence threshold (`0.40`), at-risk confidence floor (`0.35`), and minimum-safe classification confidence (`0.55`) were compile-time constants in `scoringEngine.ts` and `classificationConfidenceGate.ts`. They could not be adjusted without a code change and redeploy.

**Change:** All six constants are now columns in `scoring_config` (migration `0019_configurable_scoring_thresholds.sql`). `getActiveScoringConfig()` reads and caches them. They are threaded through the call chain: `assessment.ts` router → `SessionController.computeResults` → `detectFailureModes` (base threshold + catastrophic margin) → `classifyReadiness` (provisional threshold + confidence floor) → `applyClassificationConfidenceGate` (safe threshold + at-risk floor). All defaults reproduce the former hard-coded behaviour exactly — no behaviour change for existing sessions.

**Migration:** `0019_configurable_scoring_thresholds.sql` — adds six `DECIMAL(5,3)` columns with `NOT NULL DEFAULT` values matching the former constants. The existing v2.2 row (version=2) is updated to carry these values explicitly.

**Test coverage:** `server/scoring-config-overrides.test.ts` — 22 tests covering: `baseFailureThresholdMagnitude` (raised/lowered), `catastrophicMarginMultiplier` (lowered to trigger catastrophic path), `atRiskConfidenceFloor` (raised), `minimumSafeClassificationConfidence` (lowered/raised), `provisionalConfidenceThreshold` (raised), `confidenceFloor` (raised), and default-identity (explicit defaults produce identical results to no opts).

---
### WS1.2 Item 2 — `isProvisional` Semantics Clarified (Option A)

**Problem:** The `isProvisional` flag had ambiguous semantics. The question was whether it should fire when a `safe` classification is downgraded to `at_risk` by the confidence gate (Option B), or only when composite confidence is in the provisional band `[0.40, 0.50)` (Option A).

**Decision:** Option A. `isProvisional` has narrow, band-specific semantics: it fires only when `compositeConfidence ∈ [provisionalConfidenceThreshold, confidenceFloor)`. The gate-downgrade case (safe → at_risk at confidence < 0.55) is already surfaced via the caveat banner on the headline result card (`applyClassificationConfidenceGate` returns `wasDowngraded=true` and a `caveat` string). Adding `isProvisional=true` to the gate-downgrade case would create a second, different signal on the same amber banner, confusing participants.

**Code change:** The `isProvisional` computation in `classifyReadiness` now uses the configurable `provThreshold` and `confFloor` variables (introduced by Item 1) instead of the module-level constants. The code comment is updated to document the narrow semantics explicitly.

---
*End of document.*"""

assert old_end in content, "End of document marker not found"
content = content.replace(old_end, new_entries)

with open(path, "w") as f:
    f.write(content)
print("Architecture doc updated successfully")
