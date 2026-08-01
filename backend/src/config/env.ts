import z from "zod";

const envSchema = z.object({
  PORT: z.coerce
    .number()
    .int()
    .min(1, "Port is required")
    .max(65535)
    .default(3000),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .optional(),
  MONGODB_URI: z
    .string()
    .trim()
    .min(1, "Mongodb uri is required")
    .max(500, "Mongodb uri cannot be exceed 1000 characters")
    .startsWith("mongodb", { message: "MongoDB uri must start with mongodb" }),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.log("Invalid env variables", z.treeifyError(parsed.error));
  process.exit(1);
}

type Env = z.infer<typeof envSchema>;
//  type Env = {
//   PORT: number;
//   NODE_ENV: "development" | "production";
//   MONGODB_URI: string;
// }

export const env: Env = Object.freeze(parsed.data);
