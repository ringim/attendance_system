import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  pgSchema,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Get schema name from environment or use default
const schemaName = process.env.DATABASE_SCHEMA || "attendance_system";

// Define the schema
export const customSchema = pgSchema(schemaName);

/**
 * Employees Table
 * Stores employee information
 */
export const employees = customSchema.table(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeCode: varchar("employee_code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 20 }),
    department: varchar("department", { length: 100 }),
    position: varchar("position", { length: 100 }),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive, suspended
    deviceUserId: integer("device_user_id"), // ZKTeco device user ID
    rfidCard: varchar("rfid_card", { length: 50 }),
    metadata: jsonb("metadata"), // Additional flexible data
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    employeeCodeIdx: uniqueIndex("employee_code_idx").on(table.employeeCode),
    employeeDepartmentIdx: index("employee_department_idx").on(
      table.department,
    ),
    employeeStatusIdx: index("employee_status_idx").on(table.status),
    deviceUserIdIdx: index("device_user_id_idx").on(table.deviceUserId),
  }),
);

/**
 * Devices Table
 * Stores ZKTeco device information
 */
export const devices = customSchema.table(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    deviceId: varchar("device_id", { length: 50 }).unique(), // Unique device identifier
    serialNumber: varchar("serial_number", { length: 100 }),
    model: varchar("model", { length: 50 }).default("S900"),
    ipAddress: varchar("ip_address", { length: 45 }).notNull(), // Support IPv6
    port: integer("port").notNull().default(4370),
    location: varchar("location", { length: 255 }),
    description: text("description"),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive, error
    isOnline: boolean("is_online").default(false),
    lastSyncAt: timestamp("last_sync_at"),
    lastSeenAt: timestamp("last_seen_at"),
    connectionConfig: jsonb("connection_config"), // Additional device-specific config
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    ipAddressIdx: index("device_ip_address_idx").on(table.ipAddress),
    deviceStatusIdx: index("device_status_idx").on(table.status),
    deviceLocationIdx: index("device_location_idx").on(table.location),
  }),
);

/**
 * Attendance Logs Table
 * Stores all attendance records from devices
 */
export const attendanceLogs = customSchema.table(
  "attendance_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id").references(() => employees.id, {
      onDelete: "cascade",
    }),
    deviceId: uuid("device_id").references(() => devices.id, {
      onDelete: "set null",
    }),
    deviceUserId: integer("device_user_id"), // ZKTeco user ID for reference
    timestamp: timestamp("timestamp").notNull(), // Actual attendance time
    direction: varchar("direction", { length: 10 }), // in, out, or null
    verifyMode: integer("verify_mode"), // Verification method (fingerprint, card, password, etc.)
    status: varchar("status", { length: 20 }).default("present"), // present, absent, late, early_leave
    rawData: jsonb("raw_data"), // Store original device data
    syncedAt: timestamp("synced_at").defaultNow(), // When record was synced to cloud
    processed: boolean("processed").default(false), // For post-processing
    processedAt: timestamp("processed_at"),
    notes: text("notes"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    employeeTimestampIdx: index("employee_timestamp_idx").on(
      table.employeeId,
      table.timestamp,
    ),
    deviceTimestampIdx: index("device_timestamp_idx").on(
      table.deviceId,
      table.timestamp,
    ),
    timestampIdx: index("timestamp_idx").on(table.timestamp),
    syncedAtIdx: index("synced_at_idx").on(table.syncedAt),
    processedIdx: index("processed_idx").on(table.processed),
    // Composite index for deduplication
    uniqueAttendanceIdx: uniqueIndex("unique_attendance_idx").on(
      table.employeeId,
      table.deviceId,
      table.timestamp,
    ),
  }),
);

/**
 * Sync Logs Table
 * Track device sync operations
 */
export const syncLogs = customSchema.table(
  "sync_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: uuid("device_id").references(() => devices.id, {
      onDelete: "cascade",
    }),
    startedAt: timestamp("started_at").notNull(),
    completedAt: timestamp("completed_at"),
    status: varchar("status", { length: 20 }).notNull(), // running, success, failed, partial
    recordsProcessed: integer("records_processed").default(0),
    recordsInserted: integer("records_inserted").default(0),
    recordsSkipped: integer("records_skipped").default(0),
    errorMessage: text("error_message"),
    errorDetails: jsonb("error_details"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    syncDeviceStatusIdx: index("sync_device_status_idx").on(
      table.deviceId,
      table.status,
    ),
    syncStartedAtIdx: index("sync_started_at_idx").on(table.startedAt),
  }),
);

/**
 * Users Table (Admin/Manager authentication)
 */
export const users = customSchema.table(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 255 }),
    role: varchar("role", { length: 20 }).notNull().default("manager"), // admin, manager, viewer
    status: varchar("status", { length: 20 }).notNull().default("active"),
    lastLoginAt: timestamp("last_login_at"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    usernameIdx: uniqueIndex("username_idx").on(table.username),
    emailIdx: uniqueIndex("email_idx").on(table.email),
    roleIdx: index("role_idx").on(table.role),
  }),
);

/**
 * Audit Logs Table
 * Track all system actions for compliance
 */
export const auditLogs = customSchema.table(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 100 }).notNull(), // create, update, delete, login, etc.
    resource: varchar("resource", { length: 50 }).notNull(), // employees, devices, attendance, etc.
    resourceId: varchar("resource_id", { length: 255 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    changes: jsonb("changes"), // Before/after data
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userActionIdx: index("user_action_idx").on(table.userId, table.action),
    resourceIdx: index("resource_idx").on(table.resource, table.resourceId),
    createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
  }),
);
