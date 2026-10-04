import type { RegisterInput } from "@modules/auth/auth.service.js";
import * as authService from "@modules/auth/auth.service.js";
import type { Request, Response } from "express";

//todo: register user
export const register = async (
  req: Request<unknown, unknown, RegisterInput>,
  res: Response,
) => {
  const response = await authService.registerUser(req.body);
  res.status(201).json({succes:true, ...response});
};
