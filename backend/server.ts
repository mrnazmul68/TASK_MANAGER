import type { Server } from "node:http";
import { env } from "./src/config/env.js";
import { logger } from "./src/utils/logger.js";
import { disconnectDB } from "./src/config/disconnectDB.js";
import { connectDB } from "./src/config/connectDB.js";

let server: Server | null = null;
let isShuttingdown = false;

const PORT: number = env.PORT;
const TIMER = 10_000;

//start server
const startServer = async (): Promise<void> => {
  await connectDB();
};

//shutdown
const shutdown = async (signal: string): Promise<void> => {
  if (isShuttingdown) return;
  isShuttingdown = true;
  logger.info({ signal }, "Server is shutting down gracefully...");

  const forceTimeOut = setTimeout(() => {
    logger.info({ TIMEOUT: TIMER }, "Server is shutting down forcefully");
    process.exit(1);
  }, TIMER);
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

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.once("uncaughtException", (reasons: unknown) => {
  logger.info({ reasons: error }, "Shutdown due to Uncaught-exception");
  shutdown("uncaughtException");
});
process.once("unhandledRejection", (error: Error) => {
  logger.info({ error }, "Shutdown due to Unhandled-rejection");
  shutdown("unhandledRejection");
});
