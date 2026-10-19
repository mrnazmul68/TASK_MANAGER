import { z } from "zod";
import type { RequestHandler } from "express";
import { type FieldError, toFieldErrors } from "@task-vault/shared/validation";

type Schema = z.ZodType;

type Validated = {
  body?: Schema;
};

const parseOrThrow = async <S extends Schema>(
  schema: S,
  value: unknown,
): Promise<z.output<S>> => {
  const result = await schema.safeParseAsync(value);
  if (!result.success) {
    const errors = toFieldErrors(result.error.issues);
  }
};

//validate function
export const validate = (schemas: Validated): RequestHandler => {
  if (!schemas.body) {
    throw new Error(
      "validate() needs at least one of `body`, `params` or `query`",
    );
  }
  return (req, _res, next) => {
    if (schemas.body) req.body = parseOrThrow(req.body, schemas);
  };
};
