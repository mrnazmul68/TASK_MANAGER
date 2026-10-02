import { Router } from "express";
import { register } from "@modules/auth/auth.controller.js";

export const authRouter = Router()

authRouter.post("/register", register)