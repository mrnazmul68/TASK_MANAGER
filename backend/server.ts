import { createServer, type Server } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { connectDb, disconnectDb } from "@config/connectDB.js";
import { env } from "@config/env.js";
import { app } from "@app";
import { logger } from "@utils/logger.js";
import { closeServer, listenServer } from "@utils/httpServer.js";
import { beginShutdown, isShuttingDown } from "@shared/lifeCycle.js";
import type { AddressInfo } from "node:net";

const CONNECTION_CHECKING_INTERVAL = 5_000;
const KEEP_ALIVE_TIMEOUT = 65_000;
const HEADERS_TIMEOUT = 30_000;
const REQUEST_TIMEOUT = 30_000;
const DRAIN_DELAY = env.isProduction ? 5_000 : 0;
const SHUTDOWN_TIMEOUT = 35_000;
const LOG_FLUSH_TIMEOUT = 500;
const LISTEN_ERRORS: Readonly<Record<string, string>> = {
  EADDRINUSE: "is already in use",
  EACCES: "Required elevated privileges",
};

let server: Server | null = null;
let httpClosePromise: Promise<void> | null = null;
let listenPromise: Promise<AddressInfo> | null = null;
let exitPromise: Promise<never> | null = null;
let pendingExitCode = 0;
let drainController: AbortController | null = null;

type cleanUpStep = readonly [label: string, close: () => void | Promise<void>];

//run cleanup steps
const runCleanupStep = async ([label, close]: cleanUpStep): Promise<void> => {
  try {
    await close();
  } catch (err) {
    pendingExitCode = 1;
    logSafely("error", { err }, `Failed to close ${label}`);
  }
};

//todo: abort graceful shutdown
const abortGracefulShutdown = (): void => {
  drainController?.abort();
  server?.closeAllConnections();
};

//todo: print log safely
const logSafely = (
  level: "fatal" | "error" | "warn" | "info",
  bindings: Record<string, unknown>, //Circular reference / non-serializable object
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
    let listenError: unknown;
    try {
      if (listenPromise) await listenPromise;
    } catch (error) {
      listenError = error;
    }
    if (await closeServer(activeServer))
      logSafely("info", {}, "HTTP Server closed");
    if (listenError) throw listenError;
  })();

  return httpClosePromise; //eta ekta pending promise return korceh, zeta resolve korle undefined pawya zabe. eta js rule
};

//todo: initial shutdown
const initiateShutdown = (reason: string, exitCode: number): void => {
  void shutdown(reason, exitCode).catch((error: unknown) => {
    pendingExitCode = 1;
    drainController?.abort();
    server?.closeAllConnections();
    logSafely(
      "fatal",
      {
        error,
        reason,
      },
      "Shutdown failed",
    );
    void exitAfterFlush(1);
  });
};

//todo: shutdown server
const shutdown = async (reason: string, exitCode: number): Promise<void> => {
  if (exitCode !== 0 && pendingExitCode === 0) pendingExitCode = exitCode;
  if (isShuttingDown()) {
    if (exitCode !== 0) {
      abortGracefulShutdown();
      logSafely("error", { reason, exitCode }, "Fatal error during shutdown");
    }
    return;
  }

  beginShutdown();
  logSafely("info", { reason, exitCode }, "Shutting down HTTP server");
  if (pendingExitCode === 0 && DRAIN_DELAY > 0) {
    logSafely(
      "info",
      { DRAIN_DELAY: DRAIN_DELAY },
      "Draining before closing listener",
    );
    drainController = new AbortController();

    try {
      await delay(DRAIN_DELAY, undefined, { signal: drainController.signal });
    } catch (error) {
      if (!drainController.signal.aborted) throw error; //abort na/node er unexpect  error hole throw kora error ta initialShutdown er catch e zabe
    } finally {
      drainController = null;
    }
  }
  if (pendingExitCode !== 0) server?.closeAllConnections();

  const forceTimer = setTimeout(() => {
    server?.closeAllConnections();
    logSafely(
      "error",

      { timeoutMs: SHUTDOWN_TIMEOUT },
      "Graceful shutdown timed out, forcing exit",
    );
    void exitAfterFlush(1);
  }, SHUTDOWN_TIMEOUT);

  await runCleanupStep(["HTTP server", closeHttpServer]);
  await runCleanupStep(["Database connection", disconnectDb]);

  clearTimeout(forceTimer);
  await exitAfterFlush(pendingExitCode);
};

//todo: exit after flush
const exitAfterFlush = (code: number): Promise<never> => {
  //এটা never resolve করবে, কারণ ভেতরে process.exit() আছে
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
  return exitPromise; //return মানে হলো, ফাংশনের ভেতরে যা তৈরি হলো — সেই value-টার একটা reference/handle caller-এর হাতে তুলে দেওয়া।
};

//todo: process handler function
const attachProcessHandlers = (): void => {
  const onFatal =
    (reason: string, level: "fatal" | "error") =>
    (error: unknown): void => {
      logSafely(level, { error }, `${reason} — initiating shutdown`);
      initiateShutdown(reason, 1);
    };
  process.on("uncaughtException", onFatal("uncaughtException", "fatal"));
  process.on("unhandledRejection", onFatal("unhandledRejection", "error")); // promise er rejection handle na korle, nodejs default behavior hisebe process exit kore dey. tai ekhane handle kora hocche.

  const signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT", "SIGQUIT", "SIGHUP"];
  for (const signal of signals) {
    process.on(signal, () => {
      if (isShuttingDown()) {
        pendingExitCode = 1;
        abortGracefulShutdown();
        logSafely("warn", { signal }, "Repeated termination signal force exit");
        void exitAfterFlush(1);
        return;
      }
      initiateShutdown(signal, 0);
    });
  }
};

//todo: start server
const startServer = async (): Promise<void> => {
  await connectDb();
  if (isShuttingDown()) return;
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

  if (isShuttingDown()) return;

  const onServerError = (error: Error): void => {
    logSafely("fatal", { error }, "Server encountered a fatal error");
    initiateShutdown("serverError", 1);
  };
  const pendingListen = (listenPromise = listenServer(
    httpServer,
    env.PORT,
    onServerError,
  )); //chained assignment

  let address: AddressInfo;

  try {
    address = await pendingListen;
  } finally {
    if (listenPromise === pendingListen) listenPromise = null;
  }
  if (isShuttingDown()) {
    await closeHttpServer();
    return;
  }

  logger.info(
    {
      PORT: address.port,
      ENV: env.NODE_ENV,
      PID: process.pid,
      NODE: process.version,
    },
    "Server started",
  );

  if (env.isDevelopment) {
    const BASE_URL = `http://localhost:${env.PORT}/api/v1`;
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
  logSafely(
    "fatal",
    { err, ...(listenError && { port: env.PORT }) },
    listenError ? `Port ${env.PORT} ${listenError}` : "Failed to start server",
  );
  await shutdown("startupFailure", 1);
}
