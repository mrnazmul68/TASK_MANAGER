import pino from "pino";
import { env } from "../config/env.js";

const defaultLevel = env.NODE_ENV === "development" ? "debug" : "info";

export const logger = pino({
  name: "TASK_MANAGER_APP",
  level: env.LOG_LEVEL ?? defaultLevel,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "newPassword",
      "currentPassword",
      "refreshToken",
      "accessToken",
      "secret",
    ],
    censor: "[REDUCTED]",
  },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss",
          },
        }
      : undefined,
});
