import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { ViewAsProvider } from "@/contexts/ViewAsContext";
import { GateProvider } from "@/contexts/GateContext";
import "./index.css";

const queryClient = new QueryClient();

// ─── Error classification ──────────────────────────────────────────────────────
//
// tRPC errors fall into two categories:
//
//   EXPECTED — normal application flow; the UI already handles these gracefully
//   via loading/error states, toasts, or redirects. Logging them as errors would
//   create noise that obscures genuine bugs.
//
//   UNEXPECTED — genuine infrastructure or logic failures that engineers need to
//   see in the console to diagnose and fix.
//
// Classification table:
//
//   UNAUTHORIZED  → auth.me returns this on every unauthenticated page load.
//                   Handled by redirectToLoginIfUnauthorized() below.
//   FORBIDDEN     → role-gated procedures; the UI renders an access-denied state.
//   NOT_FOUND     → missing records; the UI renders an empty/404 state.
//   BAD_REQUEST   → Zod validation failures; the UI renders field-level errors.
//   CONFLICT      → duplicate-record guards; the UI renders an inline error.
//   TOO_MANY_REQUESTS → rate-limit; the UI renders a retry prompt.
//   PRECONDITION_FAILED → gate/stage checks; the UI renders a locked state.
//
//   INTERNAL_SERVER_ERROR → always unexpected; must be logged.
//   TIMEOUT / PARSE_ERROR / METHOD_NOT_SUPPORTED → always unexpected.
//
const EXPECTED_TRPC_CODES = new Set([
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "BAD_REQUEST",
  "CONFLICT",
  "TOO_MANY_REQUESTS",
  "PRECONDITION_FAILED",
]);

/**
 * Returns true when the error is an expected application-flow error that the UI
 * already handles gracefully and that should not appear in the error console.
 */
function isExpectedError(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) return false;

  // Match by tRPC data.code (preferred — most specific)
  const code = (error.data as { code?: string } | null | undefined)?.code;
  if (code && EXPECTED_TRPC_CODES.has(code)) return true;

  // Fallback: match by message for the two named constants (legacy path)
  if (error.message === UNAUTHED_ERR_MSG) return true;
  if (error.message === NOT_ADMIN_ERR_MSG) return true;

  return false;
}

// ─── Auth redirect ─────────────────────────────────────────────────────────────

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  if (error.message !== UNAUTHED_ERR_MSG) return;
  // Only redirect when not already on the login page to avoid redirect loops.
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
};

// ─── Global query error handler ────────────────────────────────────────────────

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    if (!isExpectedError(error)) {
      console.error("[API Query Error]", error);
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    if (!isExpectedError(error)) {
      console.error("[API Mutation Error]", error);
    }
  }
});

// ─── tRPC client ───────────────────────────────────────────────────────────────

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <ViewAsProvider>
        <GateProvider>
          <App />
        </GateProvider>
      </ViewAsProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
