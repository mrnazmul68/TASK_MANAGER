import { createServer, type Server } from "node:http";
import { clearInterval } from "node:timers";
import { setTimeout as delay } from "node:timers/promises";
import { disconnectDB } from "@config/disconnectDB.js";
import { connectDB } from "@config/connectDB.js";
import { env } from "@config/env.js";
import { app } from "@app";
import { logger } from "@utils/logger.js";
import { listenServer } from "@utils/httpServer.js";

const CONNECTION_CHECKING_INTERVAL = 5_000;
const KEEP_ALIVE_TIMEOUT = 65_000;
const HEADERS_TIMEOUT = 30_000;
const REQUEST_TIMEOUT = 30_000;
const IDLE_SWEEP_INTERVAL = 100;
const DRAIN_DELAY = env.isProduction ? 5_000 : 0;
const SHUTDOWN_TIMEOUT = 35_000;
const LOG_FLUSH_TIMEOUT = 500;
const LISTEN_ERRORS: Readonly<Record<string, string>> = {
  EADDRINUSE: "is already in use",
  EACCES: "Required elevated privileges",
};

let shuttingDown = false;
let server: Server | null = null;
let httpClosePromise: Promise<void> | null = null;
let listenPromise: Promise<void> | null = null;
let exitPromise: Promise<never> | null = null;
let pendingExitCode = 0;
let drainController: AbortController | null = null;

//todo: log creash safety
const logCrashSafely = (
  level: "fatal" | "error",
  bindings: Record<string, unknown>,
  message: string,
): void => {
  try {
    logger[level](bindings, message);
  } catch {
    try {
      logger[level](`${message} error details unserializable`);
    } catch {}
  }
};

//todo: close http server
const closeHttpServer = async (): Promise<void> => {
  if (httpClosePromise) return httpClosePromise;
  const activeServer = server;
  if (!activeServer) return;

  httpClosePromise = (async (): Promise<void> => {
    if (listenPromise) await listenPromise;
    if (!activeServer?.listening) return;
    const idleSweeper = setInterval(() => {
      activeServer.closeIdleConnections();
    }, IDLE_SWEEP_INTERVAL);

    try {
      await new Promise<void>((resolve, reject) => {
        activeServer.close((err) => (err ? reject(err) : resolve()));
      });
    } finally {
      clearInterval(idleSweeper);
    }
    logger.info("HTTP server closed");
  })();

  return httpClosePromise;
};

//todo: initial shutdown
const initiateShutdown = (reason: string, exitCode: number): void => {
  void shutdown(reason, exitCode).catch((err: unknown) => {
    pendingExitCode = 1;
    drainController?.abort();
    server?.closeAllConnections();
    logCrashSafely("fatal", { err, reason }, "shutdown failed");
    void exitAfterFlush(1);
  });
};

//todo: shut down server
const shutdown = async (reason: string, exitCode: number): Promise<void> => {
  if (exitCode !== 0 && pendingExitCode === 0) pendingExitCode = exitCode;
  if (shuttingDown) {
    if (exitCode !== 0) {
      drainController?.abort();
      server?.closeAllConnections();
      logger.error({ reason, exitCode }, "Fatal error during shutdown");
    }
    return;
  }
  shuttingDown = true;
  logger.info({ reason, exitCode }, "Shutting down HTTP server");
  if (pendingExitCode === 0 && DRAIN_DELAY > 0) {
    logger.info(
      { DRAIN_DELAY: DRAIN_DELAY },
      "Draining before closing listener",
    );
    drainController = new AbortController();
    try {
      await delay(DRAIN_DELAY, undefined, { signal: drainController.signal });
    } catch (err) {
      if (!drainController.signal.aborted) throw err;
    } finally {
      drainController = null;
    }
  }
  if (pendingExitCode !== 0) server?.closeAllConnections();
  const steps: ReadonlyArray<
    readonly [label: string, close: () => Promise<void>]
  > = [
    ["HTTP server", closeHttpServer],
    ["database connection", disconnectDB],
  ];

  const forceTimer = setTimeout(() => {
    server?.closeAllConnections();
    try {
      logger.error(
        { timeoutMs: SHUTDOWN_TIMEOUT },
        "Graceful shutdown timed out, forcing exit",
      );
    } catch {}
    void exitAfterFlush(1);
  }, SHUTDOWN_TIMEOUT);

  for (const [label, close] of steps) {
    try {
      await close();
    } catch (err) {
      pendingExitCode = 1;
      logger.error({ err }, `Failed to close ${label}`);
    }
  }
  clearTimeout(forceTimer);
  await exitAfterFlush(pendingExitCode);
};

//todo: exit after flush
const exitAfterFlush = (code: number): Promise<never> => {
  if (code !== 0) pendingExitCode = code;
  exitPromise ??= (async (): Promise<never> => {
    await Promise.race([
      new Promise<void>((resolve) => {
        logger.flush(() => resolve());
      }),
      delay(LOG_FLUSH_TIMEOUT),
    ]).catch(() => undefined);
    process.exit(pendingExitCode);
  })();
  return exitPromise;
};

//todo: process handler
const attachProcessHandlers = (): void => {
  const onFatal =
    (reason: string, level: "fatal" | "error") =>
    (err: unknown): void => {
      logCrashSafely(level, { err }, `${reason} — initiating shutdown`);
      initiateShutdown(reason, 1);
    };

  process.on("uncaughtException", onFatal("uncaughtException", "fatal"));
  process.on("unhandledRejection", onFatal("unhandledRejection", "error"));

  const signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT", "SIGQUIT", "SIGHUP"];
  for (const signal of signals) {
    process.on(signal, () => {
      if (shuttingDown) {
        try {
          logger.warn({ signal }, "Repeated termination signal — forcing exit");
        } catch {}
        void exitAfterFlush(1);
        return;
      }
      initiateShutdown(signal, 0);
    });
  }
};

//todo: start server
const startServer = async (): Promise<void> => {
  await connectDB();
  if (shuttingDown) return;
  const httpServer = createServer(
    {
      connectionsCheckingInterval: CONNECTION_CHECKING_INTERVAL,
    },
    app,
  );

  server = httpServer;
  httpServer.keepAliveTimeout = KEEP_ALIVE_TIMEOUT;
  httpServer.headersTimeout = HEADERS_TIMEOUT;
  httpServer.requestTimeout = REQUEST_TIMEOUT;

  if (shuttingDown) return;
  const pendingListen = (listenPromise = listenServer(httpServer, env.PORT));
  try {
    await pendingListen;
  } finally {
    if (listenPromise === pendingListen) listenPromise = null;
  }
  if (shuttingDown) {
    await closeHttpServer();
    return;
  }
  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    logCrashSafely("fatal", { err }, "server encountered a fatal error");
    initiateShutdown("serverError", 1);
  });
  logger.info(
    {
      PORT: env.PORT,
      ENV: env.NODE_ENV,
      PID: process.pid,
      NODE: process.version,
    },
    "Server started",
  );

  if (env.isDevelopment) {
    const BASE_URL = `http://localhost:${env.PORT}`;
    logger.info(
      { API: `${BASE_URL}`, HEALTH: `${BASE_URL}/health` },
      "Local endpoints",
    );
  }
};

//todo: run the server
attachProcessHandlers();
try {
  await startServer();
} catch (err) {
  const code = (err as NodeJS.ErrnoException | null)?.code ?? "";
  const listenError = LISTEN_ERRORS[code];
  logCrashSafely(
    "fatal",
    { err, ...(listenError && { port: env.PORT }) },
    listenError ? `Port ${env.PORT} ${listenError}` : "Failed to start server",
  );
  await shutdown("startupFailure", 1);
}
