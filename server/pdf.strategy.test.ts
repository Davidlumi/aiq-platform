/**
 * FEAT-PDF-3: Vitest for the AI Strategy PDF generation endpoint
 *
 * Tests the registerPdfRoutes function and the route handler logic
 * without requiring a live HTTP server (no supertest dependency).
 *
 * Tests:
 * 1. Route handler returns 401 when unauthenticated (no cookie)
 * 2. Route handler returns 400 for unknown PDF type
 * 3. Route handler sets correct headers for ai_strategy type when authenticated
 * 4. registerPdfRoutes mounts the GET route at /api/pdf/:type
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { COOKIE_NAME } from "../shared/const";

// ─── Mock verifySessionToken so we control auth ───────────────────────────────
vi.mock("./auth", () => ({
  verifySessionToken: vi.fn(),
}));

// ─── Mock getUserById so we control the user returned ────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  getUserById: vi.fn(),
  getTenantById: vi.fn().mockResolvedValue(null),
}));

// ─── Mock PDFDocument to avoid real PDF generation ───────────────────────────
vi.mock("pdfkit", () => {
  const EventEmitter = require("events");
  class MockPDFDocument extends EventEmitter {
    pipe = vi.fn();
    end = vi.fn();
    page = { width: 595, height: 842 };
    y = 40;
    fontSize = vi.fn().mockReturnThis();
    font = vi.fn().mockReturnThis();
    fillColor = vi.fn().mockReturnThis();
    text = vi.fn().mockReturnThis();
    moveDown = vi.fn().mockReturnThis();
    rect = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    stroke = vi.fn().mockReturnThis();
    image = vi.fn().mockReturnThis();
    addPage = vi.fn().mockReturnThis();
    bufferedPageRange = vi.fn().mockReturnValue({ start: 0, count: 1 });
    flushPages = vi.fn().mockReturnThis();
    switchToPage = vi.fn().mockReturnThis();
    save = vi.fn().mockReturnThis();
    restore = vi.fn().mockReturnThis();
    translate = vi.fn().mockReturnThis();
    scale = vi.fn().mockReturnThis();
    moveTo = vi.fn().mockReturnThis();
    lineTo = vi.fn().mockReturnThis();
    lineWidth = vi.fn().mockReturnThis();
    opacity = vi.fn().mockReturnThis();
    roundedRect = vi.fn().mockReturnThis();
    circle = vi.fn().mockReturnThis();
    polygon = vi.fn().mockReturnThis();
    path = vi.fn().mockReturnThis();
    clip = vi.fn().mockReturnThis();
    fillAndStroke = vi.fn().mockReturnThis();
    constructor(_opts?: any) {
      super();
    }
  }
  return { default: MockPDFDocument };
});

import { verifySessionToken } from "./auth";
import { getUserById } from "./db";

// ─── Helper: build a minimal mock Express request ────────────────────────────
function buildReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    params: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

// ─── Helper: build a mock Express response that captures calls ────────────────
function buildRes() {
  const calls: { method: string; args: any[] }[] = [];
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    headersSent: false,
    _calls: calls,
  } as unknown as Response & { _calls: typeof calls };
  return res;
}

// ─── Import the module under test ─────────────────────────────────────────────
import { registerPdfRoutes } from "./pdf";

// ─── Helper: extract the route handler registered at /api/pdf/:type ──────────
function extractRouteHandler() {
  let capturedHandler: ((req: Request, res: Response) => Promise<void>) | null = null;
  const mockApp = {
    get: vi.fn((path: string, handler: (req: Request, res: Response) => Promise<void>) => {
      if (path === "/api/pdf/:type") {
        capturedHandler = handler;
      }
    }),
  };
  registerPdfRoutes(mockApp as any);
  return capturedHandler;
}

describe("registerPdfRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mounts a GET route at /api/pdf/:type", () => {
    const mockApp = { get: vi.fn() };
    registerPdfRoutes(mockApp as any);
    expect(mockApp.get).toHaveBeenCalledWith(
      "/api/pdf/:type",
      expect.any(Function)
    );
  });
});

describe("PDF route handler — authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no cookie is present", async () => {
    vi.mocked(verifySessionToken).mockResolvedValue(null);
    const handler = extractRouteHandler();
    expect(handler).not.toBeNull();

    const req = buildReq({ params: { type: "ai_strategy" } } as any);
    const res = buildRes();

    await handler!(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorised" });
  });

  it("returns 401 when cookie is present but token is invalid", async () => {
    vi.mocked(verifySessionToken).mockResolvedValue(null);
    const handler = extractRouteHandler();
    expect(handler).not.toBeNull();

    const req = buildReq({
      headers: { cookie: `${COOKIE_NAME}=invalid-token` },
      params: { type: "ai_strategy" },
    } as any);
    const res = buildRes();

    await handler!(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorised" });
  });

  it("returns 401 when token is valid but user is not found", async () => {
    vi.mocked(verifySessionToken).mockResolvedValue({ userId: 999 } as any);
    vi.mocked(getUserById).mockResolvedValue(null);

    const handler = extractRouteHandler();
    expect(handler).not.toBeNull();

    const req = buildReq({
      headers: { cookie: `${COOKIE_NAME}=valid-token` },
      params: { type: "ai_strategy" },
    } as any);
    const res = buildRes();

    await handler!(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorised" });
  });
});

describe("PDF route handler — type validation", () => {
  const mockUser = {
    id: 1,
    openId: "test-open-id",
    email: "test@example.com",
    name: "Test User",
    role: "user" as const,
    tenantId: "tenant-1",
    loginMethod: "manus" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifySessionToken).mockResolvedValue({ userId: 1 } as any);
    vi.mocked(getUserById).mockResolvedValue(mockUser as any);
  });

  it("returns 400 for an unknown PDF type", async () => {
    const handler = extractRouteHandler();
    expect(handler).not.toBeNull();

    const req = buildReq({
      headers: { cookie: `${COOKIE_NAME}=valid-token` },
      params: { type: "unknown_type_xyz" },
      query: {},
    } as any);
    const res = buildRes();

    await handler!(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Unknown PDF type" });
  });

  it("accepts ai_strategy as a valid PDF type", async () => {
    const handler = extractRouteHandler();
    expect(handler).not.toBeNull();

    const req = buildReq({
      headers: { cookie: `${COOKIE_NAME}=valid-token` },
      params: { type: "ai_strategy" },
      query: {},
    } as any);

    // Build a res that captures setHeader calls
    const setHeaderCalls: Array<[string, string]> = [];
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn((name: string, value: string) => { setHeaderCalls.push([name, value]); }),
      headersSent: false,
      pipe: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    } as unknown as Response;

    // The handler will call doc.pipe(res) and doc.end() — both are mocked
    // We just verify it does NOT return 400 or 401
    await handler!(req, res);

    // Should NOT have returned a 400 or 401
    const statusCalls = (res.status as ReturnType<typeof vi.fn>).mock.calls;
    const errorStatuses = statusCalls.filter(([code]) => code === 400 || code === 401);
    expect(errorStatuses).toHaveLength(0);

    // Should have set Content-Type header
    const contentTypeCall = setHeaderCalls.find(([name]) => name === "Content-Type");
    expect(contentTypeCall).toBeDefined();
    expect(contentTypeCall?.[1]).toBe("application/pdf");

    // Should have set Content-Disposition header
    const dispositionCall = setHeaderCalls.find(([name]) => name === "Content-Disposition");
    expect(dispositionCall).toBeDefined();
    expect(dispositionCall?.[1]).toContain("aiq-ai-strategy-report.pdf");
  });

  it("accepts all valid PDF types without returning 400", async () => {
    const validTypes = [
      "assessment_report",
      "learning_plan",
      "team_dashboard",
      "capability_profile",
      "ai_strategy",
    ];

    for (const type of validTypes) {
      const handler = extractRouteHandler();
      expect(handler).not.toBeNull();

      const req = buildReq({
        headers: { cookie: `${COOKIE_NAME}=valid-token` },
        params: { type },
        query: {},
      } as any);
      const res = buildRes();

      await handler!(req, res);

      const statusCalls = (res.status as ReturnType<typeof vi.fn>).mock.calls;
      const badRequestCalls = statusCalls.filter(([code]) => code === 400);
      expect(badRequestCalls).toHaveLength(0);
    }
  });
});
