import {z} from "zod";
import { envSchema } from "@config/env/schema.js";



const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.log("Invalid env variables", z.treeifyError(parsed.error));
  process.exit(1);
}

const data = parsed.data;

type ParsedEnv = z.infer<typeof envSchema>;
export type Env = Readonly<
  ParsedEnv & {
    readonly isDevelopment: boolean;
    readonly isProduction: boolean;
  }
>;

export const env = Object.freeze({
  ...data,
  isDevelopment: data.NODE_ENV === "development",
  isProduction: data.NODE_ENV === "production",
});
