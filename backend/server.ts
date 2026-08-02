import type { Server } from "node:http";
import { env } from "./src/config/env.js";
import { logger } from "./src/utils/logger.js";
import { disconnectDB } from "./src/config/disconnectDB.js";
import { connectDB } from "./src/config/connectDB.js";
import { app } from "./src/app.js";

let server: Server | null = null;
let isShuttingDown = false;

const PORT: number = env.PORT;
const SHUTDOWN_TIMEOUT = 10_000;

// start server
const startServer = async (): Promise<void> => {
  await connectDB();

  server = app.listen(PORT, () => {
    logger.info(
      {
        PORT: PORT,
        ENV: env.NODE_ENV,
        PID: process.pid,
        VERSION: process.version,
      },
      "Server is running",
    );
    logger.info({ API: `http://localhost:${PORT}/api/v1/` });
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      logger.fatal({ error }, `Port ${PORT} is already in use`);
    } else if (error.code === "EACCES") {
      logger.fatal({ error }, `Permission denied to bind port ${PORT}`);
    } else {
      logger.fatal({ error }, "Unexpected server error, shutting down");
    }
    process.exit(1);
  });
};

// shutdown
const shutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(
    { signal },
    "Shutdown signal received, starting graceful shutdown...",
  );

  const forceTimeout = setTimeout(() => {
    logger.warn(
      { timeoutMs: SHUTDOWN_TIMEOUT },
      "Graceful shutdown timed out, forcing exit",
    );
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);
  forceTimeout.unref();

  try {
    if (server) {
      server.closeIdleConnections();
      await new Promise<void>((resolve, reject) => {
        server?.close((err) => (err ? reject(err) : resolve()));
      });
    }
    await disconnectDB();
    clearTimeout(forceTimeout);
    logger.info("HTTP server closed, graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.fatal({ error }, "Graceful shutdown failed");
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.once("unhandledRejection", (reason: unknown) => {
  logger.fatal({ error: reason }, "Unhandled promise rejection, shutting down");
  shutdown("unhandledRejection");
});
process.once("uncaughtException", (error: Error) => {
  logger.fatal({ error }, "Uncaught exception, shutting down");
  shutdown("uncaughtException");
});

try {
  await startServer();
} catch (error) {
  logger.fatal({ error }, "Failed to start server");
  process.exit(1);
}
