import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.connection.close();
  logger.info("DB connection closed");
};
