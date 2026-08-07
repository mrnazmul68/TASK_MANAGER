import { env } from "./src/config/env.js";
import { logger } from "./src/utils/logger.js";
import { disconnectDB } from "./src/config/disconnectDB.js";
import { connectDB } from "./src/config/connectDB.js";
import { app } from "./src/app.js";
import { createServer } from "node:http";

let server: ReturnType<typeof createServer> | null = null;
let isShuttingDown = false;

const PORT: number = env.PORT;
const SHUTDOWN_TIMEOUT = 10_000;
const KEEPALIVE_TIMEOUT = 65_000;
const REQUEST_TIMEOUT = 30_000;
const HEADERS_TIMEOUT = KEEPALIVE_TIMEOUT + 5_000;
const DRAIN_DELAY = env.isProduction ? 5_000 : 0;
const LISTEN_ERROR: Readonly<Record<string, string>> = {
  EADDRINUSE: `Port ${PORT} already in use`,
  EACCES: `Required elevated privileges`,
};

// start server
const startServer = async (): Promise<void> => {
  await connectDB();

  const httpServer = createServer(app);
  server = httpServer;

  httpServer.keepAliveTimeout = KEEPALIVE_TIMEOUT;
  httpServer.requestTimeout = REQUEST_TIMEOUT;
  httpServer.headersTimeout = HEADERS_TIMEOUT;

  httpServer.on("error", (error: NodeJS.ErrnoException) => {
    const listenError = LISTEN_ERROR[error.code ?? ""];
    logger.fatal(
      { error, ...(listenError && { PORT: PORT }) },
      listenError ? `${listenError}` : "Server encountered a fatal error",
    );
  });
  await new Promise<void>((resolve) => {
    httpServer.listen(PORT, resolve);
  });
};

// shutdown
const shutdownServer = async (reason: string, exitCode = 0): Promise<void> => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ reason, exitCode }, "Shutting down gracefully");

  const forceShutdown = setTimeout(() => {
    logger.error(
      { timeOut: SHUTDOWN_TIMEOUT },
      "Gracious shutdown timed out, forcing exit",
    );
    server?.closeAllConnections();
  }, SHUTDOWN_TIMEOUT);
  forceShutdown.unref();
  if (exitCode === 0 && DRAIN_DELAY > 0) {
    logger.info(
      { drainDelay: DRAIN_DELAY },
      "Draining connections before closing listener",
    );
    await delay(DRAIN_DELAY);
  }
};

const attachProcessHandlers = (): void => {
  const onFatal =
    (reason: string, level: "fatal" | "error") =>
    (error: unknown): void => {
      logger[level]({ error }, `${reason} - initial shutdown`);
    };
  process.on("uncaughtException", onFatal("uncaughtException", "fatal"));
  process.on("unhandledRejection", onFatal("unhandledRejection", "error"));

  const signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT", "SIGQUIT"];
  for (const signal of signals) {
    process.on(signal, () => {
      logger.info({ signal }, "Received termination signal");
    });
  }
};

try {
  await startServer();
} catch (error) {
  logger.fatal({ error }, "Failed to start server");
  process.exit(1);
}
