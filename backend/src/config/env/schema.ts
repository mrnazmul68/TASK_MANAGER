import {z} from "zod";
import { integerFromEnv } from "./primitives.js";

const PORT_BOUNDS = { min: 1, max: 65535 } as const;

export const envSchema = z.object({
  PORT: integerFromEnv(5000, PORT_BOUNDS),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .optional(),
  MONGODB_URI: z
    .string()
    .trim()
    .min(1, "Mongodb uri is required")
    .max(500, "MongoDB URI cannot exceed 500 characters")
    .startsWith("mongodb", {
      message: "MongoDB uri must start with mongodb",
    }),
});