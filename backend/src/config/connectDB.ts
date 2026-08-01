import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;

  const connect = await mongoose.connect(env.MONGODB_URI);
  logger.info(
    {
      HOST: connect.connection.host,
      NAME: connect.connection.name,
    },
    "DB is connected successfully",
  );
};
