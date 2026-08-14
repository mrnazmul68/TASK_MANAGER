import mongoose, { type ConnectOptions } from "mongoose";
import { logger } from "@utils/logger.js";
import { env } from "@config/env.js";

mongoose.connection.on("error", (error) => {
  logger.error({ error }, "Mongodb connection error");
});

mongoose.connection.on("disconnected", () => {
  logger.warn("Mongodb disconnected");
});

mongoose.connection.on("reconnected", () => {
  logger.info("Mongodb reconnected");
});

const isProduction = env.NODE_ENV === "production";

const CONNECTION_OPTIONS: ConnectOptions = {
  maxPoolSize: isProduction ? 100 : 10,
  minPoolSize: isProduction ? 10 : 2,
  serverSelectionTimeoutMS: 5_000,
  socketTimeoutMS: 45_000,
  heartbeatFrequencyMS: 10_000,
  retryWrites: true,
  compressors: ["snappy", "zstd"],
  ...(isProduction && {
    w: "majority",
    readPreference: "secondaryPreferred" as const,
  }),
};

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    logger.info("DB is already connected");
    return;
  }

  const connect = await mongoose.connect(env.MONGODB_URI, CONNECTION_OPTIONS);
  logger.info(
    {
      HOST: connect.connection.host,
      NAME: connect.connection.name,
    },
    "DB is connected successfully",
  );
};
