import type z from "zod";

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

const blankAsAbsent = <T extends z.ZodType>(schema: T) => {
  z.preprocess((value) => blankToUndefined(value, "trim"), schema.optional());
};

export const integerFromEnv = (fallback: number, bounds: IntegerBounds) => {
  assertIntegerConfiguration(fallback, bounds);
  const { min, max } = bounds;
  return blankAsAbsent();
};
