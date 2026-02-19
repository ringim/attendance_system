# 🚀 Step-by-Step Setup Guide

Complete guide to get your Attendance Management System running in 30 minutes.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] PostgreSQL database (Supabase account recommended)
- [ ] ZKTeco S900 device on network
- [ ] Device IP address and port (default: 4370)
- [ ] Text editor (VS Code recommended)
- [ ] Terminal/Command prompt

## Part 1: Database Setup (10 minutes)

### Important: Multi-Schema Setup

This project is configured to use a **custom PostgreSQL schema** instead of the default `public` schema. This allows you to run multiple projects on a single Supabase instance with complete data isolation.

📖 **See [MULTI_SCHEMA_SETUP.md](MULTI_SCHEMA_SETUP.md) for detailed multi-schema documentation**

### Option A: Supabase (Recommended)

1. **Create Supabase Account**
   - Go to https://supabase.com
   - Click "Start your project"
   - Sign up with GitHub/Google

2. **Create New Project**
   - Click "New Project"
   - Enter project name: `attendance-system`
   - Set database password (save this!)
   - Choose region (closest to you)
   - Click "Create project"
   - Wait 2-3 minutes for provisioning

3. **Get Connection Details**
   - Go to Settings → Database
   - Copy "Connection String" (Direct connection)
   - Format: `postgresql://postgres:[password]@[host]:5432/postgres`
   - Also note Project URL and API keys

4. **Save Credentials**

   ```
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   DATABASE_SCHEMA=attendance_system
   SUPABASE_URL=https://[PROJECT-REF].supabase.co
   SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
   ```

   **Note**: The `DATABASE_SCHEMA` variable ensures your tables are created in a dedicated schema, not in `public`. This allows multiple projects to share one Supabase instance.

### Option B: Local PostgreSQL

1. **Install PostgreSQL**

   ```bash
   # Ubuntu/Debian
   sudo apt install postgresql postgresql-contrib

   # macOS
   brew install postgresql

   # Windows - Download from postgresql.org
   ```

2. **Create Database**

   ```bash
   sudo -u postgres psql
   CREATE DATABASE attendance_db;
   CREATE USER attendance_user WITH PASSWORD 'your-password';
   GRANT ALL PRIVILEGES ON DATABASE attendance_db TO attendance_user;
   \q
   ```

3. **Connection String**
   ```
   DATABASE_URL=postgresql://attendance_user:your-password@localhost:5432/attendance_db
   ```

## Part 2: Backend Setup (10 minutes)

### 1. Clone and Navigate

```bash
# Clone repository (or download ZIP)
git clone <repository-url>
cd attendance-system/backend
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages. Takes 2-3 minutes.

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env file
nano .env  # or use any text editor
```

**Minimal required configuration:**

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=your_connection_string_from_step_1
DATABASE_SCHEMA=attendance_system
JWT_SECRET=your_random_secret_key_min_32_chars
DEVICE_SYNC_INTERVAL=5
ENABLE_AUTO_SYNC=true
```

**Generate JWT Secret:**

```bash
# Option 1: Use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Online generator
# Visit: https://generate-secret.vercel.app/32
```

### 4. Run Database Migrations

```bash
# Generate migration files
npm run db:generate

# Apply migrations to database
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

**Note**: Your tables are created in the `attendance_system` schema, not `public`. This is intentional for multi-project support.

**Verify your schema:**

```bash
npm run db:check
```

This will show you:

- If the schema exists
- All tables in your schema
- Row counts
- Schema size

### 5. Create Admin User

**Important**: Since we're using a custom schema, you'll need to use SQL Editor or Drizzle Studio to manage data.

#### Option 1: Using Supabase SQL Editor

Connect to your database and run:

```sql
-- Set the schema first
SET search_path TO attendance_system;

-- First, hash your password
-- Use online tool: https://bcrypt-generator.com/
-- Or in Node.js:
-- node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('admin123', 10));"

INSERT INTO users (username, email, password_hash, full_name, role, status)
VALUES (
  'admin',
  'admin@example.com',
  '$2a$10$YourBcryptHashedPasswordHere',
  'System Administrator',
  'admin',
  'active'
);
```

#### Option 2: Using Drizzle Studio (Recommended)

```bash
# In backend directory
npm run db:studio
```

This opens a visual interface where you can easily insert data into your tables.

**Note**: Supabase Table Editor shows the `public` schema by default. Since we use `attendance_system` schema, use SQL Editor or Drizzle Studio instead.

### 6. Start Backend Server

```bash
# Development mode (with auto-reload)
npm run dev
```

You should see:

```
===========================================
Server running in development mode
Listening on port 5000
API Version: v1
===========================================
✓ Database connected
```

Test it:

```bash
curl http://localhost:5000/api/v1/health
```

Should return:

```json
{
  "success": true,
  "message": "Server is running"
}
```

## Part 3: Frontend Setup (5 minutes)

### 1. Open New Terminal

Keep backend running, open new terminal window.

```bash
cd attendance-system/frontend
```

### 2. Install Dependencies

```bash
npm install
```

Takes 2-3 minutes.

### 3. Configure Environment

```bash
# Copy example
cp .env.example .env

# Edit .env
nano .env
```

Add:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

### 4. Start Frontend

```bash
npm run dev
```

You should see:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

## Part 4: First Login (2 minutes)

1. **Open Browser**
   - Navigate to: http://localhost:3000

2. **Login**
   - Username: `admin`
   - Password: (the password you used when creating user)
   - Click "Sign In"

3. **Success!**
   - You should see the dashboard
   - Stats will show 0 until you add data

## Part 5: Register Your First Device (5 minutes)

### 1. Find Device IP Address

**Method 1: Check device screen**

- Go to Menu → System → Network
- Note the IP address

**Method 2: Check your router**

- Login to router admin
- Look for connected devices
- Find device named "ZKTeco" or similar

**Method 3: Scan network**

```bash
# Install nmap
sudo apt install nmap  # Ubuntu/Debian
brew install nmap      # macOS

# Scan network (adjust IP range)
nmap -p 4370 192.168.1.0/24
```

### 2. Test Device Connection

```bash
# Test if device is reachable
ping 192.168.1.100  # Use your device IP

# Test if port is open
telnet 192.168.1.100 4370
# Or
nc -zv 192.168.1.100 4370
```

### 3. Register Device in System

1. In dashboard, click "Devices" in sidebar
2. Click "Add Device" (when implemented)
3. Or use API directly:

```bash
# Get auth token first
TOKEN=$(curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}' \
  | jq -r '.data.token')

# Register device
curl -X POST http://localhost:5000/api/v1/devices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Entrance",
    "ipAddress": "192.168.1.100",
    "port": 4370,
    "location": "Building A - Floor 1"
  }'
```

### 4. Test Device Connection

```bash
# Get device ID from response above, then:
DEVICE_ID="your-device-uuid"

curl -X POST http://localhost:5000/api/v1/devices/$DEVICE_ID/test \
  -H "Authorization: Bearer $TOKEN"
```

Should return:

```json
{
  "success": true,
  "message": "Connection successful",
  "data": {
    "info": {...}
  }
}
```

## Part 6: Add Employees (3 minutes)

### Method 1: Via API

```bash
curl -X POST http://localhost:5000/api/v1/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeCode": "EMP001",
    "name": "John Doe",
    "department": "Engineering",
    "deviceUserId": 1
  }'
```

**Important**: `deviceUserId` must match the user ID on the ZKTeco device!

### Method 2: Bulk Import

Create `employees.json`:

```json
{
  "employees": [
    {
      "employeeCode": "EMP001",
      "name": "John Doe",
      "department": "Engineering",
      "deviceUserId": 1
    },
    {
      "employeeCode": "EMP002",
      "name": "Jane Smith",
      "department": "HR",
      "deviceUserId": 2
    }
  ]
}
```

Import:

```bash
curl -X POST http://localhost:5000/api/v1/employees/bulk-import \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @employees.json
```

## Part 7: Start Background Worker (2 minutes)

The worker automatically syncs attendance from devices.

### Development

```bash
# Open new terminal
cd attendance-system/backend

# Start worker
npm run worker
```

You should see:

```
===========================================
Starting Attendance Sync Worker
===========================================
Environment: development
Sync Interval: 5 minutes
Auto-sync enabled: true
===========================================
🔄 Running initial sync...
✓ Sync worker initialized successfully
```

### Production (Linux with systemd)

Create service file:

```bash
sudo nano /etc/systemd/system/attendance-worker.service
```

Add:

```ini
[Unit]
Description=Attendance Sync Worker
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/attendance-system/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/workers/syncWorker.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable attendance-worker
sudo systemctl start attendance-worker
sudo systemctl status attendance-worker
```

## Part 8: Verify Everything Works

### 1. Check Dashboard

- Open http://localhost:3000
- Dashboard should show:
  - 0 for today's attendance (until someone checks in)
  - Number of employees you added
  - 1 active device
  - Attendance rate: 0%

### 2. Trigger Manual Sync

```bash
curl -X POST http://localhost:5000/api/v1/attendance/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Check Sync Status

```bash
curl http://localhost:5000/api/v1/attendance/sync/status \
  -H "Authorization: Bearer $TOKEN"
```

### 4. View Attendance Logs

```bash
curl "http://localhost:5000/api/v1/attendance/logs?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

### Backend won't start

**Issue**: Port already in use

```bash
# Find process using port 5000
lsof -i :5000          # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Kill process
kill -9 <PID>          # Mac/Linux
taskkill /PID <PID> /F # Windows
```

**Issue**: Database connection failed

- Verify DATABASE_URL is correct
- Check if database is running
- Test connection:
  ```bash
  psql "your-connection-string"
  ```

### Frontend won't start

**Issue**: Port 3000 in use

- Edit `vite.config.js`, change port
- Or kill process on port 3000

**Issue**: API calls failing

- Check VITE_API_URL in .env
- Verify backend is running
- Check browser console for CORS errors

### Device connection fails

**Issue**: Cannot reach device

```bash
# Test connectivity
ping <device-ip>

# Test port
nc -zv <device-ip> 4370

# Check firewall
sudo ufw status  # Linux
```

**Issue**: Connection timeout

- Increase timeout in backend/.env:
  ```env
  DEVICE_CONNECTION_TIMEOUT=10000
  ```
- Check device network settings
- Ensure device is powered on

### No attendance data syncing

**Issue**: Employee not found

- Check `deviceUserId` matches device
- View device users:
  ```bash
  curl http://localhost:5000/api/v1/devices/$DEVICE_ID/users \
    -H "Authorization: Bearer $TOKEN"
  ```
- Update employee with correct `deviceUserId`

**Issue**: Sync not running

- Check worker is running
- View worker logs:
  ```bash
  tail -f backend/logs/combined.log
  ```
- Trigger manual sync
- Check ENABLE_AUTO_SYNC is true

## Next Steps

### Production Deployment

1. Follow deployment guide in README.md
2. Set up HTTPS with Let's Encrypt
3. Configure production database
4. Set up monitoring
5. Configure automated backups

### Security Hardening

1. Change default admin password
2. Use strong JWT_SECRET
3. Enable rate limiting
4. Set up firewall rules
5. Implement audit logging review

### Customize System

1. Adjust sync interval
2. Configure work shifts
3. Set up email notifications
4. Customize dashboard widgets
5. Add custom reports

## Getting Help

1. **Check Logs**

   ```bash
   # Backend
   tail -f backend/logs/combined.log

   # Worker
   tail -f backend/logs/combined.log | grep "sync"
   ```

2. **Enable Debug Mode**

   ```env
   # backend/.env
   LOG_LEVEL=debug
   ```

3. **Database Inspection**

   ```bash
   # Using Drizzle Studio
   cd backend
   npm run db:studio
   ```

4. **API Testing**
   - Use Postman/Insomnia
   - Import API collection
   - Test endpoints individually

## Success Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] Can login to dashboard
- [ ] Device registered and online
- [ ] Employees added with correct deviceUserId
- [ ] Worker syncing attendance
- [ ] Attendance logs visible in dashboard

**Congratulations! Your system is now running! 🎉**

For advanced configuration and features, see the main README.md.
