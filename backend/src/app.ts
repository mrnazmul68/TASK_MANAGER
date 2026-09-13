import express from "express"
import { errorMiddleware } from "@middlewares/error.middleware.js";

export const app = express()


export const API_TIMEOUT = 15_000;

app.use(errorMiddleware)