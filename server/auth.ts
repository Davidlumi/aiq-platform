/**
 * AiQ Email/Password Authentication Service
 * Standard JWT-based auth — no OAuth, no social login.
 */
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import { ENV } from "./_core/env";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import type { Request, Response } from "express";

const SALT_ROUNDS = 12;

export interface AiQSessionPayload {
  userId: string;
  tenantId: string;
  email: string;
}

function getSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: AiQSessionPayload): Promise<string> {
  const expiresInMs = ONE_YEAR_MS;
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
  return new SignJWT({
    userId: payload.userId,
    tenantId: payload.tenantId,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .setJti(nanoid())
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<AiQSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    const { userId, tenantId, email } = payload as Record<string, unknown>;
    if (
      typeof userId !== "string" ||
      typeof tenantId !== "string" ||
      typeof email !== "string"
    ) {
      return null;
    }
    return { userId, tenantId, email };
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(req: Request) {
  const isSecure = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https";
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: (isSecure ? "none" : "lax") as "none" | "lax",
    path: "/",
  };
}

export function setSessionCookie(res: Response, req: Request, token: string) {
  res.cookie(COOKIE_NAME, token, {
    ...getSessionCookieOptions(req),
    maxAge: ONE_YEAR_MS,
  });
}

export function clearSessionCookie(res: Response, req: Request) {
  res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: -1 });
}

export function generateResetToken(): string {
  return nanoid(48);
}
