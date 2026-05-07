/**
 * useNotifications — SSE-based real-time notification hook
 *
 * Connects to /api/sse/notifications and shows toast notifications
 * for incoming events. Auto-reconnects on disconnect.
 *
 * Usage:
 *   useNotifications(); // Call once in AppShell or root layout
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

interface SsePayload {
  type: "nudge" | "assessment_complete" | "plan_updated" | "milestone" | "system" | "connected";
  title: string;
  body?: string;
  link?: string;
  timestamp?: number;
}

const RECONNECT_DELAY_MS = 5_000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useNotifications(): void {
  const { user } = useAuth();
  const esRef = useRef<EventSource | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    function connect() {
      if (esRef.current) {
        esRef.current.close();
      }

      const es = new EventSource("/api/sse/notifications");
      esRef.current = es;

      es.onmessage = (event: MessageEvent) => {
        try {
          const data: SsePayload = JSON.parse(event.data as string);
          if (data.type === "connected") return; // Suppress initial connection event

          const toastFn = data.type === "milestone" ? toast.success
            : data.type === "system" ? toast.info
            : toast;

          toastFn(data.title, {
            description: data.body,
            action: data.link ? {
              label: "View",
              onClick: () => { window.location.href = data.link!; },
            } : undefined,
            duration: 6_000,
          });

          reconnectAttempts.current = 0;
        } catch {
          // Ignore malformed events
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;

        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    }

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [user]);
}
