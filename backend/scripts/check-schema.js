#!/usr/bin/env node

/**
 * Schema Verification Script
 * Checks if the configured schema exists and lists its tables
 */

import postgres from "postgres";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, "../.env") });

const connectionString = process.env.DATABASE_URL;
const schemaName = process.env.DATABASE_SCHEMA || "attendance_system";

if (!connectionString) {
  console.error("❌ DATABASE_URL is not defined in .env file");
  process.exit(1);
}

console.log("🔍 Schema Verification Tool\n");
console.log("=".repeat(50));
console.log(
  `Database: ${connectionString.split("@")[1]?.split("/")[0] || "Unknown"}`,
);
console.log(`Target Schema: ${schemaName}`);
console.log("=".repeat(50));
console.log("");

const client = postgres(connectionString, { max: 1 });

async function checkSchema() {
  try {
    // Check if schema exists
    console.log("📦 Checking if schema exists...");
    const schemaCheck = await client`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = ${schemaName}
    `;

    if (schemaCheck.length === 0) {
      console.log(`❌ Schema '${schemaName}' does not exist`);
      console.log("\n💡 To create it, run: npm run db:migrate\n");
      return;
    }

    console.log(`✅ Schema '${schemaName}' exists\n`);

    // List all schemas
    console.log("📋 All schemas in database:");
    const allSchemas = await client`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schema_name
    `;
    allSchemas.forEach((s) => {
      const marker = s.schema_name === schemaName ? "→" : " ";
      console.log(`  ${marker} ${s.schema_name}`);
    });
    console.log("");

    // List tables in the schema
    console.log(`📊 Tables in '${schemaName}' schema:`);
    const tables = await client`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = ${schemaName} 
         AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = ${schemaName}
      ORDER BY table_name
    `;

    if (tables.length === 0) {
      console.log("  ⚠️  No tables found");
      console.log("\n💡 Run migrations to create tables: npm run db:migrate\n");
    } else {
      tables.forEach((t) => {
        console.log(`  ✓ ${t.table_name} (${t.column_count} columns)`);
      });
      console.log(`\n  Total: ${tables.length} tables\n`);
    }

    // Check row counts
    if (tables.length > 0) {
      console.log("📈 Row counts:");
      for (const table of tables) {
        try {
          const count = await client.unsafe(`
            SELECT COUNT(*) as count 
            FROM ${schemaName}.${table.table_name}
          `);
          console.log(`  ${table.table_name}: ${count[0].count} rows`);
        } catch (error) {
          console.log(`  ${table.table_name}: Error reading count`);
        }
      }
      console.log("");
    }

    // Check search_path
    console.log("🔍 Current search_path:");
    const searchPath = await client`SHOW search_path`;
    console.log(`  ${searchPath[0].search_path}\n`);

    // Schema size
    console.log("💾 Schema size:");
    const size = await client`
      SELECT 
        pg_size_pretty(sum(pg_total_relation_size(schemaname||'.'||tablename))::bigint) as size
      FROM pg_tables
      WHERE schemaname = ${schemaName}
    `;
    console.log(`  ${size[0]?.size || "0 bytes"}\n`);

    console.log("✅ Schema verification complete!\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkSchema();
