import { app } from "@app";
import { connectDB } from "@config/connectDB.js";
import { env } from "@config/env.js";
import { logger } from "@utils/logger.js";
import { createServer, Server } from "node:http";
import { clearInterval } from "node:timers";

const PORT = env.PORT;

const CONNECTION_CHECKING_INTERVAL = 5_000;
const KEEPALIVE_TIMEOUT = 65_000;
const REQUEST_TIMEOUT = 30_000;
const HEADERS_TIMEOUT = 30_000;
const IDLE_SWEEP_INTERVAL = 100;

let server: Server | null = null;
let isShuttingDown = false;
let httpClosePromise: Promise<void> | null = null;

//todo: closeHttpsServer
const closeHttpsServer = async (): Promise<void> => {
  if (httpClosePromise) return httpClosePromise;
  const activeServer = server;
  if (!activeServer?.listening) return;
  httpClosePromise = (async (): Promise<void> => {
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
  await listener(httpServer, PORT);
};


// import { createServer, Server } from "node:http";
// import { setTimeout as delay } from "node:timers/promises";
// import { env } from "@config/env.js";
// import { app } from "@app";
// import { connectDB } from "@config/connectDB.js";
// import { logger } from "@utils/logger.js";
// import { disconnectDB } from "@config/disconnectDB.js";

// let server: Server | null = null;
// let isShuttingDown = false;
// let pendingExitCode = 0;

// const PORT: number = env.PORT;
// const SHUTDOWN_TIMEOUT = 10_000;
// const KEEPALIVE_TIMEOUT = 65_000;
// const REQUEST_TIMEOUT = 30_000;
// const HEADERS_TIMEOUT = 30_000;
// const DRAIN_DELAY = env.isProduction ? 5_000 : 0;
// const LOG_FLUSH_TIMEOUT = 500;
// const CONNECTION_CHECKING_INTERVAL = 5_000;
// const LISTEN_ERROR: Readonly<Record<string, string>> = {
//   EADDRINUSE: `Port ${PORT} already in use`,
//   EACCES: `Required elevated privileges`,
// };

// //todo: listener helper function
// const listen = (httpServer: Server, port: number): Promise<void> =>
//   new Promise<void>((resolve, reject) => {
//     httpServer.once("error", reject);
//     httpServer.listen(PORT, () => {
//       httpServer.removeListener("error", reject);
//       resolve();
//     });
//   });

// //todo: start server
// const startServer = async (): Promise<void> => {
//   await connectDB();
//   const httpServer = createServer(app);
//   server = httpServer;

//   httpServer.keepAliveTimeout = KEEPALIVE_TIMEOUT;
//   httpServer.requestTimeout = REQUEST_TIMEOUT;
//   httpServer.headersTimeout = HEADERS_TIMEOUT;

//   await listen(httpServer, PORT);
//   httpServer.on("error", (error: NodeJS.ErrnoException) => {
//     logger.fatal({ error }, "Server encountared a fatal error");
//     void shutdownServer("Server error", 1);
//   });
//   logger.info(
//     {
//       PORT: PORT,
//       ENV: env.NODE_ENV,
//       PID: process.pid,
//       VERSION: process.version,
//     },
//     "Server started",
//   );
//   if (env.isDevelopment) {
//     const BASE_URL = `http://localhost:${PORT}`;
//     logger.info(
//       { API: `${BASE_URL}/api/v1`, HEALTH: `${BASE_URL}/health` },
//       "Local endpoints",
//     );
//   }

//   await new Promise<void>((resolve) => {
//     httpServer.listen(PORT, resolve);
//   });
// };

// //todo: shutDown helper funtion
// const exitAfterFlush = async (code: number): Promise<never> => {
//   await Promise.race([
//     new Promise<void>((resolve) => {
//       logger.flush(() => resolve());
//     }),
//     delay(LOG_FLUSH_TIMEOUT),
//   ]).catch(() => undefined);
//   process.exit(code);
// };

// // todo: shutDown helper function
// const closeHttpServer = async (): Promise<void> => {
//   const activeServer = server;
//   if (!activeServer) return;
//   activeServer.closeIdleConnections;

//   await new Promise<void>((resolve, reject) => {
//     activeServer.close((err) => (err ? reject(err) : resolve()));
//   });
//   logger.info("HTTP server closed");
// };

// //todo: shutdown server
// const shutdownServer = async (reason: string, exitCode = 0): Promise<void> => {
//   if (exitCode !== 0 && pendingExitCode === 0) pendingExitCode = exitCode;
//   if (isShuttingDown) {
//     if (exitCode !== 0) {
//       logger.error({ reason, exitCode }, "Fatal error during shutdown");
//     }
//     return;
//   }

//   isShuttingDown = true;
//   logger.info({ reason, exitCode }, "Shutting down gracefully");

//   const forceShutdown = setTimeout(() => {
//     logger.error(
//       { timeOut: SHUTDOWN_TIMEOUT },
//       "Gracious shutdown timed out, forcing exit",
//     );
//     server?.closeAllConnections();
//   }, SHUTDOWN_TIMEOUT);
//   forceShutdown.unref();

//   if (exitCode === 0 && DRAIN_DELAY > 0) {
//     logger.info(
//       { drainDelay: DRAIN_DELAY },
//       "Draining connections before closing listener",
//     );
//     await delay(DRAIN_DELAY);
//   }

//   const steps: ReadonlyArray<
//     readonly [label: string, close: () => Promise<void>]
//   > = [
//     ["http server", closeHttpServer],
//     ["database connection", disconnectDB],
//   ];

//   let cleanupFailed = false;
//   for (const [label, close] of steps) {
//     try {
//       await close();
//     } catch (error) {
//       cleanupFailed = true;
//       logger.error({ error }, `Failed to close ${label}`);
//     }
//   }

//   clearTimeout(forceShutdown);
//   await exitAfterFlush(cleanupFailed ? 1 : pendingExitCode);
// };

// //todo: helper function of shutdown error handling setup
// const attachProcessHandlers = (): void => {
//   const onFatal =
//     (reason: string, level: "fatal" | "error") =>
//     (error: unknown): void => {
//       try {
//         logger[level]({ error }, `${reason} - initial shutdown`);
//       } catch {
//         try {
//           logger[level](`${reason}- initial shutdown`);
//         } catch {}
//       }
//     };

//   process.on("uncaughtException", onFatal("uncaughtException", "fatal"));
//   process.on("unhandledRejection", onFatal("unhandledRejection", "error"));

//   const signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT", "SIGQUIT"];
//   for (const signal of signals) {
//     process.on(signal, () => {
//       logger.info({ signal }, "Received termination signal");
//     });
//   }
// };

// //todo: run all here
// try {
//   await startServer();
// } catch (error) {
//   const code = (error as NodeJS.ErrnoException | null)?.code ?? "";
//   const listenError = LISTEN_ERROR[code];
//   logger.fatal(
//     { error, ...(listenError && { PORT: PORT }) },
//     "Failed to start server",
//   );
//   await shutdownServer("startupFailure", 1);
// }
