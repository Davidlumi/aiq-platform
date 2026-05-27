import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

vi.mock("../_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { getDb } from "../db";
import { notifyOwner } from "../_core/notification";

// We test the router logic by calling the procedure directly
// Since tRPC procedures are just functions, we can test them via the caller pattern
describe("leads.capture", () => {
  const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
  const mockDb = { insert: mockInsert };

  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as any).mockResolvedValue(mockDb);
  });

  it("should validate email format", async () => {
    // Import the router after mocks are set up
    const { leadsRouter } = await import("./leads");
    const { createCallerFactory } = await import("../_core/trpc");
    const createCaller = createCallerFactory(leadsRouter);
    const caller = createCaller({ user: null } as any);

    // Invalid email should throw
    await expect(
      caller.capture({ email: "not-an-email", source: "roi_calculator" })
    ).rejects.toThrow();
  });

  it("should insert lead and notify owner on valid input", async () => {
    const { leadsRouter } = await import("./leads");
    const { createCallerFactory } = await import("../_core/trpc");
    const createCaller = createCallerFactory(leadsRouter);
    const caller = createCaller({ user: null } as any);

    const result = await caller.capture({
      email: "test@example.com",
      company: "Acme Corp",
      source: "roi_calculator",
      metadata: { teamSize: 500 },
    });

    expect(result).toEqual({ success: true });
    expect(mockInsert).toHaveBeenCalled();
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("test@example.com"),
      })
    );
  });

  it("should handle missing company gracefully", async () => {
    const { leadsRouter } = await import("./leads");
    const { createCallerFactory } = await import("../_core/trpc");
    const createCaller = createCallerFactory(leadsRouter);
    const caller = createCaller({ user: null } as any);

    const result = await caller.capture({
      email: "jane@company.co.uk",
      source: "roi_calculator",
    });

    expect(result).toEqual({ success: true });
    expect(mockInsert).toHaveBeenCalled();
  });

  it("should throw when database is unavailable", async () => {
    (getDb as any).mockResolvedValue(null);

    const { leadsRouter } = await import("./leads");
    const { createCallerFactory } = await import("../_core/trpc");
    const createCaller = createCallerFactory(leadsRouter);
    const caller = createCaller({ user: null } as any);

    await expect(
      caller.capture({ email: "test@example.com", source: "roi_calculator" })
    ).rejects.toThrow();
  });
});
