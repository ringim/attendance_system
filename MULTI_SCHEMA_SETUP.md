# Multi-Schema Setup Guide for Supabase

This guide explains how to use a single Supabase instance with multiple schemas for different projects.

## Overview

Instead of using the default `public` schema, each project will have its own dedicated schema in your Supabase PostgreSQL database. This allows you to:

- Run multiple projects on one Supabase instance
- Keep data completely isolated between projects
- Manage permissions per schema
- Reduce costs by sharing infrastructure

## Architecture

```
Supabase Instance (Single Database)
├── public (unused - default schema)
├── attendance_system (this project)
├── project_alpha (another project)
├── project_beta (another project)
└── ... (more projects)
```

## Configuration Changes Made

### 1. Environment Variables

Added `DATABASE_SCHEMA` to `.env`:

```env
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
DATABASE_SCHEMA=attendance_system
```

### 2. Drizzle Configuration

Updated `drizzle.config.js` to use schema filtering:

```javascript
export default defineConfig({
  // ... other config
  schemaFilter: [process.env.DATABASE_SCHEMA || "attendance_system"],
});
```

### 3. Database Connection

Modified `backend/src/database/index.js` to:

- Set `search_path` on connection
- Verify schema exists
- Provide schema creation helper

### 4. Database Schema

Updated `backend/src/database/schema.js` to:

- Use `pgSchema()` to define custom schema
- Apply schema to all tables

### 5. Migration Script

Enhanced `backend/src/database/migrate.js` to:

- Create schema if it doesn't exist
- Set search_path before running migrations
- Show which schema is being used

## Setup Instructions

### For This Project (Attendance System)

1. **Copy environment file**

   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Configure your .env**

   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   DATABASE_SCHEMA=attendance_system
   JWT_SECRET=your_secret_here
   # ... other variables
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Run migrations**

   ```bash
   npm run db:migrate
   ```

   You should see:

   ```
   🔄 Running migrations...
   📦 Target schema: attendance_system
   📝 Ensuring schema 'attendance_system' exists...
   ✅ Migrations completed successfully
   ✅ All tables created in schema: attendance_system
   ```

5. **Verify in Supabase Dashboard**
   - Go to SQL Editor
   - Run: `SELECT schema_name FROM information_schema.schemata;`
   - You should see `attendance_system` in the list

6. **View your tables**
   ```sql
   SET search_path TO attendance_system;
   \dt
   ```

### For Additional Projects

When you want to add another project to the same Supabase instance:

1. **Clone/setup the new project**

2. **Configure with different schema**

   ```env
   DATABASE_URL=postgresql://postgres:[SAME-PASSWORD]@db.[SAME-PROJECT-REF].supabase.co:5432/postgres
   DATABASE_SCHEMA=project_alpha  # Different schema name
   ```

3. **Run migrations for that project**

   ```bash
   npm run db:migrate
   ```

4. **Each project is now isolated**
   - `attendance_system` schema has its tables
   - `project_alpha` schema has its tables
   - No conflicts or data mixing

## Verifying Schema Isolation

### Check which schemas exist:

```sql
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('pg_catalog', 'information_schema');
```

### List tables in specific schema:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'attendance_system';
```

### Query data from specific schema:

```sql
-- Explicit schema reference
SELECT * FROM attendance_system.employees;

-- Or set search_path
SET search_path TO attendance_system;
SELECT * FROM employees;
```

## Supabase Dashboard Access

The Supabase Table Editor shows the `public` schema by default. To view your custom schemas:

### Option 1: SQL Editor

Use the SQL Editor to query your schemas directly:

```sql
SET search_path TO attendance_system;
SELECT * FROM employees LIMIT 10;
```

### Option 2: Direct SQL Queries

Always prefix table names with schema:

```sql
SELECT * FROM attendance_system.employees;
INSERT INTO attendance_system.devices (...) VALUES (...);
```

### Option 3: Drizzle Studio (Recommended)

Use Drizzle Studio for a visual interface:

```bash
cd backend
npm run db:studio
```

This will open a web interface showing your schema's tables.

## Connection String Format

Your connection string remains the same for all projects:

```
postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

The schema is specified separately via `DATABASE_SCHEMA` environment variable.

## Permissions & Security

### Row Level Security (RLS)

If you want to use Supabase's RLS features with custom schemas:

```sql
-- Enable RLS on a table in custom schema
ALTER TABLE attendance_system.employees ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can view their own data"
ON attendance_system.employees
FOR SELECT
USING (auth.uid() = user_id);
```

### Schema Permissions

Grant appropriate permissions to your database user:

```sql
-- Grant usage on schema
GRANT USAGE ON SCHEMA attendance_system TO postgres;

-- Grant all privileges on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA attendance_system TO postgres;

-- Grant privileges on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA attendance_system
GRANT ALL PRIVILEGES ON TABLES TO postgres;
```

## Backup & Restore

### Backup specific schema:

```bash
pg_dump -h db.[project-ref].supabase.co \
  -U postgres \
  -n attendance_system \
  -F c \
  -f attendance_system_backup.dump \
  postgres
```

### Restore specific schema:

```bash
pg_restore -h db.[project-ref].supabase.co \
  -U postgres \
  -n attendance_system \
  -d postgres \
  attendance_system_backup.dump
```

## Troubleshooting

### Issue: Tables not found

**Problem**: `relation "employees" does not exist`

**Solution**: Check your search_path

```sql
SHOW search_path;
SET search_path TO attendance_system, public;
```

### Issue: Schema doesn't exist

**Problem**: `schema "attendance_system" does not exist`

**Solution**: Run migrations or create manually

```sql
CREATE SCHEMA IF NOT EXISTS attendance_system;
```

### Issue: Permission denied

**Problem**: `permission denied for schema attendance_system`

**Solution**: Grant permissions

```sql
GRANT ALL ON SCHEMA attendance_system TO postgres;
```

### Issue: Drizzle can't find tables

**Problem**: Drizzle queries fail

**Solution**: Ensure `DATABASE_SCHEMA` is set in `.env` and restart your app

## Best Practices

1. **Naming Convention**: Use descriptive schema names
   - ✅ `attendance_system`, `inventory_app`, `crm_platform`
   - ❌ `schema1`, `test`, `app`

2. **Environment Variables**: Always set `DATABASE_SCHEMA`
   - Prevents accidental use of `public` schema
   - Makes schema explicit in configuration

3. **Migrations**: Always run migrations with correct schema
   - Check output to confirm target schema
   - Verify tables created in correct location

4. **Documentation**: Document which schemas are used
   - Keep a registry of projects and their schemas
   - Document any cross-schema dependencies

5. **Monitoring**: Monitor schema sizes
   ```sql
   SELECT
     schemaname,
     pg_size_pretty(sum(pg_total_relation_size(schemaname||'.'||tablename))::bigint) as size
   FROM pg_tables
   WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
   GROUP BY schemaname;
   ```

## Migration from Public Schema

If you already have data in the `public` schema:

### Option 1: Move data to new schema

```sql
-- Create new schema
CREATE SCHEMA attendance_system;

-- Move tables
ALTER TABLE public.employees SET SCHEMA attendance_system;
ALTER TABLE public.devices SET SCHEMA attendance_system;
-- ... repeat for all tables
```

### Option 2: Copy data to new schema

```sql
-- Create new schema and tables (via migrations)
-- Then copy data
INSERT INTO attendance_system.employees
SELECT * FROM public.employees;

INSERT INTO attendance_system.devices
SELECT * FROM public.devices;
-- ... repeat for all tables
```

## Cost Considerations

Using multiple schemas in one Supabase instance:

- ✅ Single database connection pool
- ✅ Shared compute resources
- ✅ One backup/restore process
- ✅ Lower cost than multiple projects
- ⚠️ All projects share database limits
- ⚠️ Need to monitor total database size

## Summary

You now have a multi-schema setup that allows you to:

- Run multiple projects on one Supabase instance
- Keep data completely isolated
- Manage each project independently
- Reduce infrastructure costs

Each project just needs its own `DATABASE_SCHEMA` value in the `.env` file, and everything else works automatically!
