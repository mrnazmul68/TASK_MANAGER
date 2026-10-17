import { z } from "zod";
import type { RequestHandler } from "express";

type Schema = z.ZodType;
type Validated = {
  body?: Schema;
};
type RequestPart = keyof Validated;

const   PART_ORDER: readonly RequestPart[] = ["body"];

export const validate = (schemas: Validated): RequestHandler => {
  const jobs = PART_ORDER;
};
