import { app } from "@app";
import { connectDB } from "@config/connectDB.js";
import { env } from "@config/env.js";
import { listenServer } from "@utils/httpServer.js";
import { logger } from "@utils/logger.js";
import { createServer, Server } from "node:http";
import { clearInterval } from "node:timers";

const PORT = env.PORT;

const CONNECTION_CHECKING_INTERVAL = 5_000;
const KEEPALIVE_TIMEOUT = 65_000;
const REQUEST_TIMEOUT = 30_000;
const HEADERS_TIMEOUT = 30_000;
const IDLE_SWEEP_INTERVAL = 100;
const SHUTDOWN_TIMEOUT = 35_000;

let server: Server | null = null;
let isShuttingDown = false;
let httpClosePromise: Promise<void> | null = null;
let listenPromise: Promise<void> | null = null;

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
