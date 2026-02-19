import postgres from "postgres";
import bcryptjs from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const createAdmin = async () => {
  const connectionString = process.env.DATABASE_URL;
  const schemaName = process.env.DATABASE_SCHEMA || "attendance_system";

  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
  }

  console.log("🔐 Creating admin user...");
  console.log(`📦 Target schema: ${schemaName}`);

  const sql = postgres(connectionString, { max: 1 });

  try {
    // Set search_path
    await sql.unsafe(`SET search_path TO ${schemaName}, public`);

    // Hash the password
    const password = "admin123";
    const passwordHash = bcryptjs.hashSync(password, 10);

    console.log("🔑 Password hashed successfully");

    // Insert admin user
    const result = await sql`
      INSERT INTO users (username, email, password_hash, full_name, role, status)
      VALUES (
        'admin',
        'admin@example.com',
        ${passwordHash},
        'System Administrator',
        'admin',
        'active'
      )
      RETURNING id, username, email, full_name, role
    `;

    console.log("✅ Admin user created successfully!");
    console.log("");
    console.log("📋 User Details:");
    console.log(`   ID: ${result[0].id}`);
    console.log(`   Username: ${result[0].username}`);
    console.log(`   Email: ${result[0].email}`);
    console.log(`   Full Name: ${result[0].full_name}`);
    console.log(`   Role: ${result[0].role}`);
    console.log("");
    console.log("🔐 Login Credentials:");
    console.log(`   Username: admin`);
    console.log(`   Password: admin123`);
    console.log("");
    console.log("⚠️  Please change the password after first login!");
  } catch (error) {
    if (error.code === "23505") {
      console.error("❌ Admin user already exists!");
      console.log("");
      console.log("💡 If you need to reset the password, use:");
      console.log("   npm run reset-admin-password");
    } else {
      console.error("❌ Error creating admin user:", error.message);
      throw error;
    }
  } finally {
    await sql.end();
  }
};

// Run if executed directly
createAdmin()
  .then(() => {
    console.log("Process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Process failed:", error);
    process.exit(1);
  });
