import { Router } from "express";
import { ROUTE_SEGMENT } from "@task-vault/shared/constants";
import { authRouter } from "@modules/auth/auth.routes.js";

export const router = Router()

router.use(ROUTE_SEGMENT.AUTH, authRouter)