import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
import config from "../config/index.js";
import logger from "../utils/logger.js";

/**
 * PostgreSQL connection using postgres.js with schema support
 */
const connectionString = config.database.url;
const schemaName = config.database.schema || "attendance_system";

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

// Create postgres connection with schema configuration
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // Set search_path to use specific schema
  onconnect: async (connection) => {
    await connection.unsafe(`SET search_path TO ${schemaName}, public`);
  },
});

// Create Drizzle instance
const db = drizzle(client, { schema, logger: false });

/**
 * Test database connection and schema
 */
export const testConnection = async () => {
  try {
    await client`SELECT 1`;
    // Verify schema exists
    const schemaCheck = await client`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = ${schemaName}
    `;

    if (schemaCheck.length === 0) {
      logger.warn(
        `Schema '${schemaName}' does not exist. It will be created during migration.`,
      );
    } else {
      logger.info(
        `Database connection established successfully using schema: ${schemaName}`,
      );
    }
    return true;
  } catch (error) {
    logger.error("Database connection failed:", error);
    throw error;
  }
};

/**
 * Create schema if it doesn't exist
 */
export const ensureSchema = async () => {
  try {
    await client.unsafe(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    logger.info(`Schema '${schemaName}' ensured`);
  } catch (error) {
    logger.error(`Error creating schema '${schemaName}':`, error);
    throw error;
  }
};

/**
 * Close database connection
 */
export const closeConnection = async () => {
  try {
    await client.end();
    logger.info("Database connection closed");
  } catch (error) {
    logger.error("Error closing database connection:", error);
    throw error;
  }
};

export { db, client, schemaName };
export default db;
