ALTER TABLE "attendance_system"."devices" ADD COLUMN "connection_type" varchar(20) DEFAULT 'tcp' NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_system"."devices" ADD COLUMN "adms_config" jsonb;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "device_connection_type_idx" ON "attendance_system"."devices" ("connection_type");