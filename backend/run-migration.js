import dotenv from "dotenv";
import postgres from "postgres";
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config();

const runMigration = async () => {
  let sql;

  try {
    console.log("🔄 Starting database migration...");

    // Create postgres connection
    sql = postgres(process.env.DATABASE_URL, {
      connect_timeout: 10,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
    });

    // Test connection
    await sql`SELECT 1`;
    console.log("✅ Database connected successfully");

    // Check if migration is already applied
    console.log("🔍 Checking if migration is already applied...");

    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'attendance_system' 
        AND table_name = 'devices' 
        AND column_name = 'connection_type'
    `;

    if (columnExists.length > 0) {
      console.log(
        "⚠️  Migration already applied - connection_type column exists",
      );

      // Check current devices
      const devices = await sql`
        SELECT id, name, ip_address, connection_type 
        FROM attendance_system.devices 
        WHERE deleted_at IS NULL
      `;

      console.log(`📱 Current devices (${devices.length}):`);
      devices.forEach((device) => {
        console.log(
          `   - ${device.name}: ${device.ip_address} (${device.connection_type || "NULL"})`,
        );
      });

      return;
    }

    console.log("🚀 Applying migration...");

    // Read and execute migration SQL
    const migrationSQL = fs.readFileSync(
      "add-connection-type-migration.sql",
      "utf8",
    );

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    for (const statement of statements) {
      console.log(`   Executing: ${statement.substring(0, 50)}...`);
      await sql.unsafe(statement);
    }

    console.log("✅ Migration completed successfully!");

    // Verify migration
    console.log("🔍 Verifying migration...");

    const newColumnExists = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'attendance_system' 
        AND table_name = 'devices' 
        AND column_name IN ('connection_type', 'adms_config')
      ORDER BY column_name
    `;

    console.log("📋 New columns added:");
    newColumnExists.forEach((col) => {
      console.log(
        `   - ${col.column_name}: ${col.data_type} (default: ${col.column_default || "NULL"})`,
      );
    });

    // Check updated devices
    const updatedDevices = await sql`
      SELECT id, name, ip_address, connection_type, adms_config
      FROM attendance_system.devices 
      WHERE deleted_at IS NULL
    `;

    console.log(`\n📱 Updated devices (${updatedDevices.length}):`);
    updatedDevices.forEach((device) => {
      console.log(
        `   - ${device.name}: ${device.ip_address} (${device.connection_type})`,
      );
    });

    console.log("\n🎉 Migration completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Restart your backend server");
    console.log("2. Test ADMS configuration in frontend");
    console.log("3. Try background monitoring toggle");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);

    if (error.message.includes("already exists")) {
      console.log("💡 This might mean the migration was partially applied.");
      console.log(
        "   Check your database manually or run the verification queries.",
      );
    } else if (error.message.includes("permission denied")) {
      console.log(
        "💡 Database permission issue. Make sure your user has ALTER TABLE privileges.",
      );
    } else if (error.message.includes("connection")) {
      console.log(
        "💡 Database connection issue. Check your DATABASE_URL and network connection.",
      );
    }

    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
};

// Run migration
runMigration();
