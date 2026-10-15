import { authRouter } from "@modules/auth/auth.route.js";
import { Router } from "express";

export const router = Router()

router.use("/auth", authRouter)