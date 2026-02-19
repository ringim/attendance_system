import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  schema: "./src/database/schema.js",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
  // Specify schema for multi-tenancy (not 'public')
  schemaFilter: [process.env.DATABASE_SCHEMA || "attendance_system"],
  verbose: true,
  strict: true,
});
