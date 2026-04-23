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
