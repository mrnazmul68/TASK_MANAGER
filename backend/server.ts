import { app } from "@app";
import { connectDB } from "@config/connectDB.js";
import { disconnectDB } from "@config/disconnectDB.js";
import { env } from "@config/env.js";
import { listenServer } from "@utils/httpServer.js";
import { logger } from "@utils/logger.js";
import { createServer, Server } from "node:http";
import { clearInterval } from "node:timers";
import { setTimeout as delay } from "node:timers/promises";

const PORT = env.PORT;

const CONNECTION_CHECKING_INTERVAL = 5_000;
const KEEPALIVE_TIMEOUT = 65_000;
const REQUEST_TIMEOUT = 30_000;
const HEADERS_TIMEOUT = 30_000;
const IDLE_SWEEP_INTERVAL = 100;
const DRAIN_DELAY = env.isProduction ? 5_000 : 0;
const SHUTDOWN_TIMEOUT = 35_000;
const LOG_FLUSH_TIMEOUT = 500;

let server: Server | null = null;
let isShuttingDown = false;
let httpClosePromise: Promise<void> | null = null;
let listenPromise: Promise<void> | null = null;
let exitPromise: Promise<never> | null = null;
let pendingExitCode = 0;
let drainController: AbortController | null = null;

const logCrashSafely = (
  level: "fatal" | "error",
  bindings: Record<string, unknown>,
  message: string,
): void => {
  try {
    logger[level](bindings, message);
  } catch (error) {
    try {
      logger[level](`${message} error details unserializable`);
    } catch (error) {}
  }
};

//todo: closeHttpsServer
const closeHttpsServer = async (): Promise<void> => {
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
    logger.info("http server closed");
  })();

  return httpClosePromise;
};

// todo: initate shutdown
const initiateShutdown = (reason: string, exitCode: number): void => {};

//todo: exit after flush
const exiltAfterFlush = (code: number): Promise<never> => {
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

//todo gracefull shutdown
const shutDown = async (reason: string, exitCode: number): Promise<void> => {
  if (exitCode !== 0 && pendingExitCode === 0) pendingExitCode = exitCode;
  if (isShuttingDown) {
    if (exitCode !== 0) {
      drainController?.abort();
      server?.closeAllConnections();
      logger.error({ reason, exitCode }, "Fatal error during shutdown");
    }
    return;
  }
  isShuttingDown = true;
  logger.info({ reason, exitCode }, "Shutting down");
  if (pendingExitCode === 0 && DRAIN_DELAY > 0) {
    logger.info(
      { drainDelay: DRAIN_DELAY },
      "Draining before closing listener",
    );
    drainController = new AbortController();
    try {
      await delay(DRAIN_DELAY, undefined, { signal: drainController.signal });
    } catch (error) {
      if (!drainController.signal.aborted) throw error;
    } finally {
      drainController = null;
    }
  }
  if (pendingExitCode !== 0) server?.closeAllConnections();
  const steps: ReadonlyArray<
    readonly [lebel: string, close: () => Promise<void>]
  > = [
    ["HTTP Server", closeHttpsServer],
    ["Database Connection", disconnectDB],
  ];

  //todo: force exit
  const forceExit = setTimeout(() => {
    server?.closeAllConnections();
    try {
      logger.error(
        { timeOut: SHUTDOWN_TIMEOUT },
        "Gracefull shutdown timeout, force exit",
      );
    } catch (error) {}
  }, SHUTDOWN_TIMEOUT);

  for (const [label, close] of steps) {
    try {
      await close();
    } catch (error) {
      pendingExitCode = 1;
      logger.error({ error }, `Failed to close ${label}`);
    }
  }
  clearTimeout(forceExit);
};

//todo: listerner function
const listener = (httpServer: Server, port: number) =>
  new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, () => {
      httpServer.removeListener("error", reject);
      resolve();
    });
  });

//todo: start server
const startServer = async (): Promise<void> => {
  await connectDB();
  if (isShuttingDown) return;

  const httpServer = createServer(
    { connectionsCheckingInterval: CONNECTION_CHECKING_INTERVAL },
    app,
  );

  server = httpServer;

  httpServer.keepAliveTimeout = KEEPALIVE_TIMEOUT;
  httpServer.requestTimeout = REQUEST_TIMEOUT;
  httpServer.headersTimeout = HEADERS_TIMEOUT;

  if (isShuttingDown) return;
  const pendingListen = (listenPromise = listenServer(httpServer, PORT));
  try {
    await pendingListen;
  } finally {
    if (listenPromise === pendingListen) listenPromise = null;
  }

  if (isShuttingDown) {
    await closeHttpsServer();
    return;
  }
  httpServer.on("error", (error: NodeJS.ErrnoException) => {
    logCrashSafely("fatal", { error }, "Server encountered  a fata error");
  });
};
