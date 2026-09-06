import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const IDLE_SWEEP_INTERVAL = 100;

type ServerErrorHandler = (error: Error) => void;

//todo: listen server
export const listenServer = (
  httpServer: Server,
  port: number,
  onRunTimeError?: ServerErrorHandler,
): Promise<AddressInfo> =>
  new Promise<AddressInfo>((resolve, reject) => {
    const detachStartupListeners = (): void => {
      httpServer.off("error", onBindError);
      httpServer.off("listening", onListening);
    };

    const onBindError = (error: Error): void => {
      detachStartupListeners();
      reject(error);
    };

    const onListening = (): void => {
      detachStartupListeners();
      const address = httpServer.address();
      if (address === null || typeof address === "string") {
        const error = new Error(
          `Expected a tcp address after binding port ${port}`,
        );
        detachStartupListeners();
        if (!httpServer.listening) {
          reject(error);
          return;
        }

        try {
          httpServer.close(() => {
            reject(error);
          });
        } catch {
          reject(error);
        }
        return;
      }

      if (onRunTimeError) httpServer.on("error", onRunTimeError);
        detachStartupListeners();
        resolve(address);
      
    };
    httpServer.on("error", onBindError);
    httpServer.on("listening", onListening);
    try {
      httpServer.listen(port);
    } catch (error) {
      detachStartupListeners();
      reject(error);
    }
  });

//todo: close server
export const closeServer = async (httpServer: Server): Promise<boolean> => {
  if (!httpServer.listening) return false;
  const idleSweeper = setInterval(() => {
    httpServer.closeIdleConnections();
  }, IDLE_SWEEP_INTERVAL);

  try {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => (error ? reject(error) : resolve()));
      httpServer.closeIdleConnections();
    });
  } finally {
    clearInterval(idleSweeper);
  }
  return true;
};
