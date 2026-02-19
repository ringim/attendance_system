import dotenv from "dotenv";

dotenv.config();

/**
 * Application Configuration
 * Centralized configuration management
 */
const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 5000,
  apiVersion: process.env.API_VERSION || "v1",

  // Database
  database: {
    url: process.env.DATABASE_URL,
    schema: process.env.DATABASE_SCHEMA || "attendance_system",
  },

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || "change-this-secret-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },

  // ZKTeco Device
  device: {
    syncInterval: parseInt(process.env.DEVICE_SYNC_INTERVAL, 10) || 5, // minutes
    connectionTimeout:
      parseInt(process.env.DEVICE_CONNECTION_TIMEOUT, 10) || 5000, // ms
    maxRetries: parseInt(process.env.DEVICE_MAX_RETRIES, 10) || 3,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 min
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || "info",
    filePath: process.env.LOG_FILE_PATH || "./logs",
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },

  // Worker
  worker: {
    enableAutoSync: process.env.ENABLE_AUTO_SYNC === "true",
    syncBatchSize: parseInt(process.env.SYNC_BATCH_SIZE, 10) || 1000,
  },

  // Server
  server: {
    isDevelopment: process.env.NODE_ENV === "development",
    isProduction: process.env.NODE_ENV === "production",
    isTest: process.env.NODE_ENV === "test",
  },
};

/**
 * Validate required configuration
 */
export const validateConfig = () => {
  const required = ["DATABASE_URL", "JWT_SECRET"];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
};

export default config;
