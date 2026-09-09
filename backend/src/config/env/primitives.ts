import z from "zod";

export type IntegerBounds = Readonly<{ min: number; max: number }>;

const assertIntegerConfiguration = (
  fallback: number,
  { min, max }: IntegerBounds,
): void => {
  if (
    !Number.isSafeInteger(min) ||
    !Number.isSafeInteger(max) ||
    min < 0 ||
    min > max
  ) {
    throw new RangeError(
      `Invalid environment, bounds must be ordered safe integers`,
    );
  }

  if (!Number.isSafeInteger(fallback) || fallback < min || fallback > max) {
    throw new RangeError(
      `Integer environment fallback must be a safe integer between ${min} and ${max}`,
    );
  }
};

const blankToUndefined = (
  value: unknown,
  mode: "trim" | "preserve",
): unknown => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  return mode === "trim" ? trimmed : value;
};

const blankAsAbsent = <T extends z.ZodType>(schema: T) => {
  z.preprocess((value) => blankToUndefined(value, "trim"), schema.optional())
  .transform((value, ctx)=>{
    if(value === undefined) rejects(ctx, 'is required')
      return value;
  }) as unknown as z.ZodPreprocess<T>
};

export const integerFromEnv = (fallback: number, bounds: IntegerBounds) => {
  assertIntegerConfiguration(fallback, bounds);
  const { min, max } = bounds;
  return blankAsAbsent();
};
