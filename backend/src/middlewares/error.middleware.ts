import type { NextFunction, ErrorRequestHandler } from "express";
import type { FieldError } from "@shared/http/envelope.js";

interface ErrorLike {
  name?: string;
  code?: number | string;
  statusCode?: number;
  status?: number;
  expose?: boolean;
  message?: string;
  errors?: Record<string, { path?: string; message?: string }> | unknown[];
  path?: string;
  type?: string;
  stack?: string;
  issues?: Array<{ path: PropertyKey[]; message: string }>;
}

interface NormalizedError {
  statusCode: number;
  message: string;
  errors?: readonly FieldError[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeError = (err: unknown): NormalizedError | null => {};

export const errorMiddleware: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errObj: ErrorLike = isObject(err) ? (err as ErrorLike) : {};
  const normalized = normalizeError(err);
};
