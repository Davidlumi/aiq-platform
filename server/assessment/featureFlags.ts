/**
 * S9: AIL Persona Adaptation Feature Flag
 *
 * The AIL (Adaptive Intelligence Layer) persona adaptation feature adjusts
 * starting difficulty and item selection based on a returning participant's
 * historical performance profile. This is a powerful but experimental feature
 * that should be gated until the persona classification engine has been
 * validated against sufficient real-world data.
 *
 * Gating rationale (from v2.1 remediation):
 * - Persona classification requires ≥3 prior completed sessions to be reliable
 * - Premature adaptation can create a self-reinforcing bias loop
 * - The feature should only activate when PERSONA_ADAPTATION_ENABLED=true AND
 *   the user has sufficient prior session history
 *
 * To enable: set PERSONA_ADAPTATION_ENABLED=true in environment variables.
 * Default: disabled (false) until sufficient validation data is available.
 */

// ─── Feature Flag ─────────────────────────────────────────────────────────────

/**
 * S9: Whether AIL persona adaptation is enabled.
 * Reads from PERSONA_ADAPTATION_ENABLED env var.
 * Defaults to false (disabled) for safety.
 */
export function isPersonaAdaptationEnabled(): boolean {
  const val = process.env.PERSONA_ADAPTATION_ENABLED;
  return val === "true" || val === "1";
}

/**
 * S9: Minimum number of prior completed sessions required before
 * persona adaptation activates for a returning participant.
 * Even when the feature flag is on, adaptation is suppressed below this threshold.
 */
export const PERSONA_ADAPTATION_MIN_SESSIONS = 3;

/**
 * S9: Check whether persona adaptation should be applied for a given user.
 *
 * @param priorSessionCount Number of prior completed sessions for this user
 * @returns true if persona adaptation should be applied
 */
export function shouldApplyPersonaAdaptation(priorSessionCount: number): boolean {
  return isPersonaAdaptationEnabled() && priorSessionCount >= PERSONA_ADAPTATION_MIN_SESSIONS;
}

// ─── WS2.1: Outcome-Conditional Anti-Gaming Flag ──────────────────────────────
/**
 * WS2.1: Whether outcome-conditional anti-gaming pattern detection is enabled.
 * When enabled, the anti-gaming engine applies stricter scrutiny to answer
 * sequences that are suspiciously consistent with a single outcome class
 * (e.g. all "strong" answers on governance items regardless of difficulty).
 * Reads from ANTI_GAMING_OUTCOME_CONDITIONAL env var.
 * Defaults to true (enabled) — this is a safety feature.
 */
export function isOutcomeConditionalAntiGamingEnabled(): boolean {
  const val = process.env.ANTI_GAMING_OUTCOME_CONDITIONAL;
  return val !== "false" && val !== "0"; // default ON
}

// ─── WS4.6: Validation Phase Order Randomisation Flag ─────────────────────────
/**
 * WS4.6: Whether the validation phase item order is randomised within the
 * adaptive session. When enabled, validation-phase items are interleaved
 * with adaptive items rather than served as a distinct final block.
 * This reduces order effects and recency bias in validation responses.
 * Reads from VALIDATION_PHASE_ORDER_RANDOMISED env var.
 * Defaults to false (disabled) — enable after sufficient A/B validation.
 */
export function isValidationPhaseRandomised(): boolean {
  const val = process.env.VALIDATION_PHASE_ORDER_RANDOMISED;
  return val === "true" || val === "1";
}
