export type IntegerBounds = Readonly<{ min: number; max: number }>;

const assertIntegerConfiguration = (
  fallback: number,
  { min, max }: IntegerBounds,
): void => {
  if (
    !Number.isSafeInteger(fallback) ||
    !Number.isSafeInteger(max) ||
    min < 0 ||
    max > max
  ) {
    throw new RangeError(
      `Invalid invironment, bounds must be ordered safe intefers`,
    );
  }
};

export const integerFromEnv = (fallback: number, bounds: IntegerBounds) => {
  assertIntegerConfiguration(fallback, bounds);
};
