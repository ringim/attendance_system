import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run database migrations with schema support
 */
const runMigrations = async () => {
  const connectionString = process.env.DATABASE_URL;
  const schemaName = process.env.DATABASE_SCHEMA || "attendance_system";

  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
  }

  console.log("🔄 Running migrations...");
  console.log(`📦 Target schema: ${schemaName}`);

  const migrationClient = postgres(connectionString, { max: 1 });

  try {
    // Create schema if it doesn't exist
    console.log(`📝 Ensuring schema '${schemaName}' exists...`);
    try {
      await migrationClient.unsafe(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
      console.log(`✅ Schema '${schemaName}' is ready`);
    } catch (schemaError) {
      // Ignore if schema already exists (code 42P06)
      if (schemaError.code !== "42P06") {
        throw schemaError;
      }
      console.log(`✅ Schema '${schemaName}' already exists`);
    }

    // Set search_path for this connection
    await migrationClient.unsafe(`SET search_path TO ${schemaName}, public`);

    const db = drizzle(migrationClient);

    // Run migrations
    await migrate(db, {
      migrationsFolder: join(__dirname, "../../drizzle"),
    });

    console.log("✅ Migrations completed successfully");
    console.log(`✅ All tables created in schema: ${schemaName}`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await migrationClient.end();
  }
};

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      console.log("Migration process completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration process failed:", error);
      process.exit(1);
    });
}

export default runMigrations;
