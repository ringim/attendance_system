# Schema Quick Reference

## Quick Commands

### Verify Your Schema Setup

```bash
# Run the schema verification tool
cd backend
npm run db:check
```

This shows:

- Schema existence
- All tables and column counts
- Row counts per table
- Schema size
- Current search_path

### View Your Schema Tables

```sql
-- In Supabase SQL Editor
SET search_path TO attendance_system;
\dt
```

### Query Your Tables

```sql
-- Option 1: Set search path
SET search_path TO attendance_system;
SELECT * FROM employees;

-- Option 2: Use full table name
SELECT * FROM attendance_system.employees;
```

### Check Which Schemas Exist

```sql
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('pg_catalog', 'information_schema');
```

### View Tables in Your Schema

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'attendance_system';
```

## Environment Variables

```env
# Same connection string for all projects
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# Different schema per project
DATABASE_SCHEMA=attendance_system  # This project
# DATABASE_SCHEMA=project_alpha    # Another project
# DATABASE_SCHEMA=inventory_app    # Another project
```

## Common Tasks

### Add New Project to Same Supabase

1. Set different `DATABASE_SCHEMA` in new project's `.env`
2. Run migrations: `npm run db:migrate`
3. Done! Tables created in separate schema

### View Data in Supabase Dashboard

- Use SQL Editor (not Table Editor)
- Always start with: `SET search_path TO attendance_system;`
- Or use Drizzle Studio: `npm run db:studio`

### Backup Your Schema

```bash
pg_dump -h db.[ref].supabase.co \
  -U postgres \
  -n attendance_system \
  -F c \
  -f backup.dump \
  postgres
```

### Check Schema Size

```sql
SELECT
  schemaname,
  pg_size_pretty(sum(pg_total_relation_size(schemaname||'.'||tablename))::bigint) as size
FROM pg_tables
WHERE schemaname = 'attendance_system'
GROUP BY schemaname;
```

## Troubleshooting

### "Table not found" error

```sql
-- Check your search_path
SHOW search_path;

-- Set it correctly
SET search_path TO attendance_system, public;
```

### Can't see tables in Supabase UI

- This is normal! Table Editor shows `public` schema only
- Use SQL Editor or Drizzle Studio instead

### Migrations not working

```bash
# Check your .env has DATABASE_SCHEMA set
cat backend/.env | grep DATABASE_SCHEMA

# Should output: DATABASE_SCHEMA=attendance_system
```

## Project Structure

```
Supabase Instance
├── public (unused)
└── attendance_system (this project)
    ├── employees
    ├── devices
    ├── attendance_logs
    ├── sync_logs
    ├── users
    └── audit_logs
```

## Key Points

✅ Each project = one schema  
✅ Same DATABASE_URL for all projects  
✅ Different DATABASE_SCHEMA per project  
✅ Complete data isolation  
✅ Use SQL Editor or Drizzle Studio to view data  
✅ Migrations automatically create schema

📖 See [MULTI_SCHEMA_SETUP.md](MULTI_SCHEMA_SETUP.md) for full documentation
