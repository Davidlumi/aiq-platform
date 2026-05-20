/** Thin wrapper around crypto.randomUUID for consistent import across pages. */
export function randomUUID(): string {
  return crypto.randomUUID();
}
