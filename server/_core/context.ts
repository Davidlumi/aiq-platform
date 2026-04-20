import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const";
import { verifySessionToken } from "../auth";
import { getUserById } from "../db";
import { parse as parseCookies } from "cookie";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    const rawCookies = opts.req.headers.cookie ?? "";
    const cookies = parseCookies(rawCookies);
    const sessionToken = cookies[COOKIE_NAME];
    if (sessionToken) {
      const payload = await verifySessionToken(sessionToken);
      if (payload) {
        user = (await getUserById(payload.userId)) ?? null;
      }
    }
  } catch {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
