/**
 * Server-Sent Events (SSE) — AiQ Platform
 *
 * Lightweight real-time notification channel using SSE.
 * Replaces the deferred WebSocket requirement (line 62 in todo.md).
 *
 * Architecture:
 *   - In-memory connection registry keyed by userId
 *   - /api/sse/notifications endpoint for client subscription
 *   - pushNotification() helper to send events to specific users
 *   - Heartbeat every 30s to keep connections alive
 *
 * Usage:
 *   Server: import { pushNotification } from "./sse";
 *           pushNotification(userId, { type: "nudge", title: "...", body: "..." });
 *
 *   Client: const es = new EventSource("/api/sse/notifications");
 *           es.onmessage = (e) => { const data = JSON.parse(e.data); ... };
 */

import type { Express, Request, Response } from "express";
import { parse as parseCookies } from "cookie";
import { verifySessionToken } from "./auth";
import { COOKIE_NAME } from "../shared/const";

// ─── Connection registry ──────────────────────────────────────────────────────

interface SseClient {
  userId: string;
  res: Response;
  connectedAt: number;
}

const clients = new Map<string, SseClient[]>(); // userId → clients[]

function addClient(userId: string, res: Response): void {
  const existing = clients.get(userId) ?? [];
  clients.set(userId, [...existing, { userId, res, connectedAt: Date.now() }]);
}

function removeClient(userId: string, res: Response): void {
  const existing = clients.get(userId) ?? [];
  const updated = existing.filter(c => c.res !== res);
  if (updated.length === 0) {
    clients.delete(userId);
  } else {
    clients.set(userId, updated);
  }
}

// ─── Push helper ──────────────────────────────────────────────────────────────

export interface SseNotificationPayload {
  type: "nudge" | "assessment_complete" | "plan_updated" | "milestone" | "system";
  title: string;
  body?: string;
  link?: string;
  timestamp?: number;
}

/**
 * Push a real-time notification to all active SSE connections for a user.
 * Returns the number of clients that received the event.
 */
export function pushNotification(userId: string, payload: SseNotificationPayload): number {
  const userClients = clients.get(userId) ?? [];
  if (userClients.length === 0) return 0;

  const data = JSON.stringify({ ...payload, timestamp: payload.timestamp ?? Date.now() });
  let sent = 0;
  for (const client of userClients) {
    try {
      client.res.write(`data: ${data}\n\n`);
      sent++;
    } catch {
      // Client disconnected — will be cleaned up on close event
    }
  }
  return sent;
}

/**
 * Broadcast a notification to all connected clients (e.g. system announcements).
 */
export function broadcastNotification(payload: SseNotificationPayload): number {
  let total = 0;
  for (const userId of Array.from(clients.keys())) {
    total += pushNotification(userId, payload);
  }
  return total;
}

// ─── Route registration ───────────────────────────────────────────────────────

export function registerSseRoutes(app: Express): void {
  /**
   * GET /api/sse/notifications
   * Establishes an SSE stream for the authenticated user.
   * Auth: session cookie (same as tRPC).
   */
  app.get("/api/sse/notifications", async (req: Request, res: Response) => {
    // Authenticate via session cookie (same as tRPC context — no cookie-parser middleware needed)
    const rawCookies = req.headers.cookie ?? "";
    const cookies = parseCookies(rawCookies);
    const sessionId = cookies[COOKIE_NAME];
    if (!sessionId) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }

    let userId: string;
    try {
      const user = await verifySessionToken(sessionId);
      if (!user?.userId) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      userId = user.userId;
    } catch {
      res.status(401).json({ error: "Invalid session" });
      return;
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
    res.flushHeaders();

    // Register client
    addClient(userId, res);

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`);

    // Heartbeat every 30s to keep the connection alive
    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 30_000);

    // Cleanup on disconnect
    req.on("close", () => {
      clearInterval(heartbeat);
      removeClient(userId, res);
    });
  });

  /**
   * GET /api/sse/status
   * Returns the number of active SSE connections (admin/debug endpoint).
   */
  app.get("/api/sse/status", (_req: Request, res: Response) => {
    const totalClients = Array.from(clients.values()).reduce((sum, c) => sum + c.length, 0);
    res.json({ connectedUsers: clients.size, totalClients });
  });
}
