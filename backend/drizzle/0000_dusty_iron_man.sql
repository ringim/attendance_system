CREATE SCHEMA IF NOT EXISTS "attendance_system";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance_system"."attendance_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid,
	"device_id" uuid,
	"device_user_id" integer,
	"timestamp" timestamp NOT NULL,
	"direction" varchar(10),
	"verify_mode" integer,
	"status" varchar(20) DEFAULT 'present',
	"raw_data" jsonb,
	"synced_at" timestamp DEFAULT now(),
	"processed" boolean DEFAULT false,
	"processed_at" timestamp,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance_system"."audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource" varchar(50) NOT NULL,
	"resource_id" varchar(255),
	"ip_address" varchar(45),
	"user_agent" text,
	"changes" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance_system"."devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"device_id" varchar(50),
	"serial_number" varchar(100),
	"model" varchar(50) DEFAULT 'S900',
	"ip_address" varchar(45) NOT NULL,
	"port" integer DEFAULT 4370 NOT NULL,
	"location" varchar(255),
	"description" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"is_online" boolean DEFAULT false,
	"last_sync_at" timestamp,
	"last_seen_at" timestamp,
	"connection_config" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "devices_device_id_unique" UNIQUE("device_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance_system"."employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"department" varchar(100),
	"position" varchar(100),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"device_user_id" integer,
	"rfid_card" varchar(50),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance_system"."sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"status" varchar(20) NOT NULL,
	"records_processed" integer DEFAULT 0,
	"records_inserted" integer DEFAULT 0,
	"records_skipped" integer DEFAULT 0,
	"error_message" text,
	"error_details" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance_system"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"full_name" varchar(255),
	"role" varchar(20) DEFAULT 'manager' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_timestamp_idx" ON "attendance_system"."attendance_logs" ("employee_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "device_timestamp_idx" ON "attendance_system"."attendance_logs" ("device_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "timestamp_idx" ON "attendance_system"."attendance_logs" ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "synced_at_idx" ON "attendance_system"."attendance_logs" ("synced_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processed_idx" ON "attendance_system"."attendance_logs" ("processed");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_attendance_idx" ON "attendance_system"."attendance_logs" ("employee_id","device_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_action_idx" ON "attendance_system"."audit_logs" ("user_id","action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resource_idx" ON "attendance_system"."audit_logs" ("resource","resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_created_at_idx" ON "attendance_system"."audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "device_ip_address_idx" ON "attendance_system"."devices" ("ip_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "device_status_idx" ON "attendance_system"."devices" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "device_location_idx" ON "attendance_system"."devices" ("location");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "employee_code_idx" ON "attendance_system"."employees" ("employee_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_department_idx" ON "attendance_system"."employees" ("department");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_status_idx" ON "attendance_system"."employees" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "device_user_id_idx" ON "attendance_system"."employees" ("device_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_device_status_idx" ON "attendance_system"."sync_logs" ("device_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_started_at_idx" ON "attendance_system"."sync_logs" ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "username_idx" ON "attendance_system"."users" ("username");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_idx" ON "attendance_system"."users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "role_idx" ON "attendance_system"."users" ("role");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_system"."attendance_logs" ADD CONSTRAINT "attendance_logs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "attendance_system"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_system"."attendance_logs" ADD CONSTRAINT "attendance_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "attendance_system"."devices"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_system"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "attendance_system"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_system"."sync_logs" ADD CONSTRAINT "sync_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "attendance_system"."devices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
