import type { Server } from "node:http";
import { env } from "./src/config/env.js";
import { app } from "./src/app.js";
import { logger } from "./src/utils/logger.js";
import { disconnectDB } from "./src/config/disconnectDB.js";

let server: Server | null = null;
let isShuttingdown = false;

const PORT: number = env.PORT;

const shutdown = async (signal: string): Promise<void> => {
  if (isShuttingdown) return;
  isShuttingdown = true;
  logger.info({ signal }, "Server is shutting down gracefully...");

  const forceTimeOut = setTimeout(() => {
    logger.info({ signal }, "Server is shutting down forcefully");
    process.exit(1);
  }, 10_000);
  forceTimeOut.unref();

  try {
    if (server) {
      server.closeIdleConnections();
      await new Promise<void>((resolve, reject) => {
        server?.close((err) => (err ? reject(err) : resolve()));
      });
    }
    await disconnectDB();
    clearTimeout(forceTimeOut);
    logger.info("HTTP server closed, gracefull shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Error during gracefull shutdown");
    process.exit(1);
  }
};
