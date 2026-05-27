/**
 * Per-user LLM rate limiter (PROD-2.1)
 *
 * Limits each user to MAX_CALLS_PER_WINDOW LLM invocations per WINDOW_MS.
 * Uses an in-process sliding-window counter (Map<userId, timestamps[]>).
 *
 * This is intentionally lightweight — no Redis dependency.
 * For multi-instance deployments, replace with a Redis-backed counter.
 *
 * Limits:
 *   - 30 LLM calls per user per 10 minutes (normal interactive use)
 *   - Separate stricter limit for streaming endpoints (20 per 10 min)
 */
import { TRPCError } from "@trpc/server";

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CALLS = 30;              // standard invocations
const MAX_STREAM_CALLS = 20;       // streaming invocations (more expensive)

// Map<userId, timestamp[]>
const callLog = new Map<string, number[]>();
const streamLog = new Map<string, number[]>();

function checkLimit(log: Map<string, number[]>, userId: string, max: number, label: string): void {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const timestamps = (log.get(userId) ?? []).filter(t => t > windowStart);
  if (timestamps.length >= max) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `LLM ${label} rate limit reached (${max} per 10 min). Please wait before generating more content.`,
    });
  }
  timestamps.push(now);
  log.set(userId, timestamps);
}

/** Call before any non-streaming invokeLLM call. Throws TRPC TOO_MANY_REQUESTS if over limit. */
export function assertLLMRateLimit(userId: string): void {
  checkLimit(callLog, userId, MAX_CALLS, "call");
}

/** Call before any streaming LLM call. Throws TRPC TOO_MANY_REQUESTS if over limit. */
export function assertLLMStreamRateLimit(userId: string): void {
  checkLimit(streamLog, userId, MAX_STREAM_CALLS, "stream");
}

/** Returns remaining calls for the current window (for diagnostics / UI hints). */
export function getLLMRateLimitRemaining(userId: string): { calls: number; streams: number } {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const calls = MAX_CALLS - ((callLog.get(userId) ?? []).filter(t => t > windowStart).length);
  const streams = MAX_STREAM_CALLS - ((streamLog.get(userId) ?? []).filter(t => t > windowStart).length);
  return { calls: Math.max(0, calls), streams: Math.max(0, streams) };
}
