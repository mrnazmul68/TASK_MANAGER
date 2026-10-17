import { authRouter } from "@modules/auth/auth.route.js";
import { Router } from "express";
import { ROUTE_SEGMENT } from "@task-vault/shared/constants";

export const router = Router()

router.use(ROUTE_SEGMENT.AUTH, authRouter)