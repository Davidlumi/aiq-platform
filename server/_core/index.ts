import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { rateLimit } from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerPdfRoutes } from "../pdf";
import { registerSseRoutes } from "../sse";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { coachEngine } from "../coach/engine";
import { diagnosticModeHandler } from "../coach/modes/diagnostic";
import { debriefModeHandler } from "../coach/modes/debrief";
import { learningModeHandler } from "../coach/modes/learning";
import { applyModeHandler } from "../coach/modes/apply";
import { strategyCoachModeHandler } from "../coach/modes/strategy";

// Register all AiQ Coach mode handlers at startup
coachEngine.registerMode(diagnosticModeHandler);
coachEngine.registerMode(debriefModeHandler);
coachEngine.registerMode(learningModeHandler);
coachEngine.registerMode(applyModeHandler);
coachEngine.registerMode(strategyCoachModeHandler);

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // TD-1: Trust the platform gateway's X-Forwarded-For header for accurate IP identification
  app.set("trust proxy", 1);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Rate limiting on auth/OAuth endpoints (TD-1)
  // 20 requests per 15 minutes per IP — prevents brute-force and credential stuffing
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many authentication requests, please try again later." },
    skip: () => process.env.NODE_ENV === "test",
  });
  app.use("/api/oauth", authLimiter);

  // General API rate limit — 300 requests per 5 minutes per IP
  const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    skip: () => process.env.NODE_ENV === "test",
  });
  app.use("/api/trpc", apiLimiter);

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerPdfRoutes(app);
  registerSseRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
