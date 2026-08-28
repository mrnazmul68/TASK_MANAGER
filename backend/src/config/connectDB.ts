import mongoose, { type ConnectOptions } from "mongoose";
import { logger } from "@utils/logger.js";
import { SERVICE_NAME } from "@shared/identity.js";
import { env } from "@config/env.js";

let closingPromise: Promise<void> | null = null;
let connectionPromise: Promise<void> | null = null;
let hasEstablishedClient: boolean = false;

const POOL_CHECKOUT_TIMEOUT = 2_000;
const SERVER_SELECTION_TIMEOUT = env.isProduction ? 15_000 : 5_000;
const QUERY_TIMEOUT = 12_000;

const CONNECTION_OPTIONS: ConnectOptions = {
  appName: SERVICE_NAME,
  maxPoolSize: env.isProduction ? 100 : 10,
  minPoolSize: env.isProduction ? 5 : 0,
  maxIdleTimeMS: 60_000,
  waitQueueTimeoutMS: POOL_CHECKOUT_TIMEOUT,
  serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  retryWrites: true,
  retryReads: true,
  compressors: ["zlib"],
  zlibCompressionLevel: 6,
  autoIndex: !env.isProduction,
  autoCreate: !env.isProduction,
  bufferCommands: false,
  ...(env.isProduction && {
    writeConcern: {
      w: "majority" as const,
      wtimeoutMS: QUERY_TIMEOUT,
    },
  }),
};

let isDbConnected = (): boolean =>
  mongoose.connection.readyState === mongoose.ConnectionStates.connected;

const discardClient = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
  } catch (error) {``
    logger.error({ error }, "MongoDB failed to connect-cleanup error");
  }
};

const assertTransactionTopology = async (): Promise<void> => {
  let hello: Record<string, unknown> | undefined;
};

const openConnection = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URI, CONNECTION_OPTIONS);
  } catch (error) {
    await discardClient();
    throw new Error("Failed to establish mongodb connection");
  }

  if (env.isProduction) {
    try {
    } catch (error) {}
  }
};

export const connectDB = async (): Promise<void> => {
  if (closingPromise) {
    throw new Error("MongoDb connection is closing");
  }
  if (connectionPromise) return connectionPromise;
  if (isDbConnected()) return;
  if (hasEstablishedClient) {
    throw new Error("Mongodb connection is temporarily unavailable");
  }
  const attempt = (connectionPromise = openConnection());
};

// import mongoose, { type ConnectOptions } from "mongoose";
// import { logger } from "@utils/logger.js";
// import { env } from "@config/env.js";

// mongoose.connection.on("error", (error) => {
//   logger.error({ error }, "Mongodb connection error");
// });

// mongoose.connection.on("disconnected", () => {
//   logger.warn("Mongodb disconnected");
// });

// mongoose.connection.on("reconnected", () => {
//   logger.info("Mongodb reconnected");
// });

// const isProduction = env.NODE_ENV === "production";

// const CONNECTION_OPTIONS: ConnectOptions = {
//   maxPoolSize: isProduction ? 100 : 10,
//   minPoolSize: isProduction ? 10 : 2,
//   serverSelectionTimeoutMS: 5_000,
//   socketTimeoutMS: 45_000,
//   heartbeatFrequencyMS: 10_000,
//   retryWrites: true,
//   compressors: ["snappy", "zstd"],
//   ...(isProduction && {
//     w: "majority",
//     readPreference: "secondaryPreferred" as const,
//   }),
// };

// export const connectDB = async () => {
//   if (mongoose.connection.readyState === 1) {
//     logger.info("DB is already connected");
//     return;
//   }

//   const connect = await mongoose.connect(env.MONGODB_URI, CONNECTION_OPTIONS);
//   logger.info(
//     {
//       HOST: connect.connection.host,
//       NAME: connect.connection.name,
//     },
//     "DB is connected successfully",
//   );
// };
