# Attendance Management System - Backend

Production-ready backend for ZKTeco S900 biometric device integration with cloud-based attendance management.

## 🏗️ Architecture

### Tech Stack

- **Runtime**: Node.js (LTS)
- **Framework**: Express.js
- **Database**: Supabase PostgreSQL
- **ORM**: Drizzle ORM
- **Device Integration**: zklib (ZKTeco SDK)
- **Authentication**: JWT
- **Validation**: Joi
- **Logging**: Winston
- **Scheduling**: node-cron

### Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration management
│   ├── database/         # Database schema & connection
│   ├── modules/          # Feature modules
│   │   ├── attendance/   # Attendance management
│   │   ├── employees/    # Employee management
│   │   ├── devices/      # Device management
│   │   └── auth/         # Authentication
│   ├── services/         # Business logic services
│   │   ├── zkDevice.service.js   # ZKTeco integration
│   │   └── sync.service.js       # Background sync
│   ├── routes/           # API routes
│   ├── middlewares/      # Express middlewares
│   ├── workers/          # Background workers
│   ├── utils/            # Utility functions
│   └── index.js          # Main server file
├── drizzle/              # Database migrations
├── logs/                 # Application logs
├── .env.example          # Environment template
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ LTS
- PostgreSQL database (Supabase recommended)
- ZKTeco S900 device on network
- npm or yarn

### Installation

1. **Clone and navigate to backend**

   ```bash
   cd backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database**

   ```bash
   # Generate migration files
   npm run db:generate

   # Run migrations
   npm run db:migrate
   ```

5. **Create initial admin user**

   Connect to your database and run:

   ```sql
   INSERT INTO users (username, email, password_hash, full_name, role, status)
   VALUES (
     'admin',
     'admin@example.com',
     '$2a$10$YourHashedPasswordHere',  -- Use bcrypt to hash password
     'Administrator',
     'admin',
     'active'
   );
   ```

   Or use bcryptjs to hash a password:

   ```javascript
   import bcrypt from "bcryptjs";
   const hash = await bcrypt.hash("your-password", 10);
   console.log(hash);
   ```

### Running the Application

**Development mode:**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

**Run background worker:**

```bash
npm run worker
```

**Database tools:**

```bash
# Open Drizzle Studio (GUI)
npm run db:studio

# Generate new migration
npm run db:generate

# Run migrations
npm run db:migrate
```

## 📡 API Documentation

### Base URL

```
http://localhost:5000/api/v1
```

### Authentication

All protected routes require JWT token in header:

```
Authorization: Bearer <token>
```

### Endpoints

#### **Auth**

- `POST /auth/login` - User login
- `POST /auth/register` - Register user (admin only)
- `GET /auth/profile` - Get current user
- `POST /auth/change-password` - Change password
- `GET /auth/verify` - Verify token

#### **Employees**

- `GET /employees` - List employees (with pagination)
- `GET /employees/:id` - Get employee by ID
- `POST /employees` - Create employee
- `PUT /employees/:id` - Update employee
- `DELETE /employees/:id` - Delete employee
- `GET /employees/departments` - List departments
- `POST /employees/bulk-import` - Bulk import

#### **Devices**

- `GET /devices` - List devices
- `GET /devices/:id` - Get device by ID
- `POST /devices` - Register device
- `PUT /devices/:id` - Update device
- `DELETE /devices/:id` - Delete device
- `POST /devices/:id/test` - Test connection
- `GET /devices/:id/info` - Get device info
- `GET /devices/:id/users` - Get device users
- `GET /devices/stats` - Connection statistics

#### **Attendance**

- `GET /attendance/logs` - Get attendance logs
- `GET /attendance/logs/:id` - Get log by ID
- `GET /attendance/employee/:id/summary` - Employee summary
- `POST /attendance/sync` - Trigger manual sync
- `GET /attendance/sync/status` - Sync status
- `GET /attendance/sync/statistics` - Sync statistics
- `GET /attendance/dashboard` - Dashboard stats
- `GET /attendance/realtime/:deviceId` - Real-time SSE stream (single device)
- `GET /attendance/realtime-all` - Real-time SSE stream (all devices)
- `GET /attendance/background-monitor/status` - Background monitoring status
- `POST /attendance/background-monitor/start` - Start background monitoring
- `POST /attendance/background-monitor/stop` - Stop background monitoring
- `GET /attendance/background-monitor/stream` - Background monitoring SSE stream

### Query Parameters

**Pagination:**

```
?page=1&limit=50
```

**Filtering employees:**

```
?search=john&department=IT&status=active
```

**Filtering attendance:**

```
?employeeId=uuid&deviceId=uuid&startDate=2024-01-01&endDate=2024-01-31&direction=in
```

## 🔐 Security

### Authentication & Authorization

- JWT-based authentication
- Role-based access control (Admin, Manager, Viewer)
- Password hashing with bcryptjs
- Token expiration and refresh

### Security Measures

- Helmet.js for security headers
- Rate limiting on API endpoints
- Input validation with Joi
- SQL injection prevention (Drizzle ORM)
- CORS configuration
- Environment variable protection

### Roles & Permissions

| Role    | Permissions                                 |
| ------- | ------------------------------------------- |
| Admin   | Full access - all CRUD operations           |
| Manager | Read all, Create/Update employees & devices |
| Viewer  | Read-only access                            |

## 🔄 ZKTeco Device Integration

### Supported Devices

- ZKTeco S900 (tested)
- Compatible with most ZKTeco devices using TCP/IP

### Connection Configuration

```javascript
{
  ip: "192.168.1.100",      // Device IP address
  port: 4370,                // Default ZKTeco port
  timeout: 5000,             // Connection timeout (ms)
}
```

### Device Operations

- Connect/disconnect to devices
- Fetch attendance logs
- Get device information
- Retrieve registered users
- Test connection health
- Auto-reconnection with retry logic
- Real-time monitoring via SSE
- Background monitoring (24/7 capture)

### Attendance Log Format

```javascript
{
  deviceUserId: 1,           // User ID on device
  timestamp: Date,           // Attendance time
  direction: "in" | "out",   // Check-in or out (optional)
  verifyMode: 1,             // Verification method
  deviceIp: "192.168.1.100",
  devicePort: 4370,
  rawData: {...}             // Original device data
}
```

### Real-Time Features

**Manual Real-Time Monitoring:**

- Connect to device and stream live attendance
- SSE endpoint: `GET /api/v1/attendance/realtime/:deviceId`
- Requires active frontend connection
- Stops when connection closes

**Background Monitoring:**

- Runs 24/7 on backend (independent of frontend)
- Captures attendance even when app is closed
- SSE endpoint: `GET /api/v1/attendance/background-monitor/stream`
- Persistent state with automatic reconnection
- Logs stored in database for historical access

## 📊 Background Services

### Background Sync Worker

**Features:**

- Automatic periodic syncing (configurable interval)
- Syncs all active devices
- Deduplication of records
- Error handling and retry logic
- Comprehensive sync logging
- Graceful shutdown

**Configuration:**

```env
ENABLE_AUTO_SYNC=true       # Enable/disable auto-sync
DEVICE_SYNC_INTERVAL=5      # Sync every N minutes
SYNC_BATCH_SIZE=1000        # Records per batch
```

**Running the Worker:**

```bash
# Start worker
npm run worker

# Worker runs independently from API server
# Can run multiple instances for redundancy
```

**Sync Process:**

1. Query all active devices
2. Connect to each device
3. Fetch attendance logs since last sync
4. Map device user IDs to employee IDs
5. Insert records with deduplication
6. Update device sync timestamps
7. Log sync results

### Background Monitoring Service

**Features:**

- 24/7 attendance capture (runs on backend)
- Works independently of frontend
- Automatic device reconnection
- Real-time event emission via EventEmitter
- SSE streaming to connected clients
- Database persistence for all logs

**How it works:**

1. Service starts monitoring all active devices
2. Continuously polls devices for new attendance
3. Validates and sanitizes timestamps
4. Maps device users to employees
5. Saves logs to database
6. Emits events for SSE clients
7. Handles device disconnections gracefully

**API Endpoints:**

- `POST /attendance/background-monitor/start` - Start monitoring
- `POST /attendance/background-monitor/stop` - Stop monitoring
- `GET /attendance/background-monitor/status` - Get status
- `GET /attendance/background-monitor/stream` - SSE stream

## 🗄️ Database Schema

### Tables

- **employees** - Employee information
- **devices** - ZKTeco device registry
- **attendance_logs** - Attendance records
- **sync_logs** - Sync operation history
- **users** - System users (admins/managers)
- **audit_logs** - System audit trail

### Key Relationships

- Attendance logs → Employee (many-to-one)
- Attendance logs → Device (many-to-one)
- Sync logs → Device (many-to-one)

### Indexes

Optimized indexes on:

- Employee lookups (code, device_user_id)
- Attendance queries (employee_id, timestamp, device_id)
- Deduplication (unique composite index)

## 📝 Logging

### Log Levels

- `error` - Error messages
- `warn` - Warning messages
- `info` - Informational messages
- `debug` - Debug messages (development)

### Log Files

- `logs/error.log` - Error logs only
- `logs/combined.log` - All logs
- Console output in development

### Log Format

```json
{
  "timestamp": "2024-01-15 10:30:45",
  "level": "info",
  "message": "Device synced successfully",
  "service": "attendance-backend",
  "deviceId": "uuid",
  "recordsInserted": 45
}
```

## 🧪 Testing

### Manual API Testing

Use tools like Postman, Insomnia, or curl:

```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Get employees (with token)
curl http://localhost:5000/api/v1/employees \
  -H "Authorization: Bearer <your-token>"
```

### Testing Device Connection

1. Register device via API
2. Test connection: `POST /api/v1/devices/:id/test`
3. View device info: `GET /api/v1/devices/:id/info`
4. Trigger manual sync: `POST /api/v1/attendance/sync`

## 🔧 Configuration

### Environment Variables

| Variable                    | Description           | Default        |
| --------------------------- | --------------------- | -------------- |
| `NODE_ENV`                  | Environment           | development    |
| `PORT`                      | Server port           | 5000           |
| `DATABASE_URL`              | PostgreSQL connection | required       |
| `JWT_SECRET`                | JWT secret key        | required       |
| `JWT_EXPIRES_IN`            | Token expiration      | 7d             |
| `DEVICE_SYNC_INTERVAL`      | Sync interval (min)   | 5              |
| `DEVICE_CONNECTION_TIMEOUT` | Device timeout (ms)   | 5000           |
| `RATE_LIMIT_MAX_REQUESTS`   | Rate limit            | 100            |
| `CORS_ORIGIN`               | Allowed origins       | localhost:3000 |

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET`
- [ ] Configure proper `DATABASE_URL`
- [ ] Set up log rotation
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up monitoring
- [ ] Run worker as separate service
- [ ] Set up database backups
- [ ] Configure firewall rules

### PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start API server
pm2 start src/index.js --name attendance-api

# Start worker
pm2 start src/workers/syncWorker.js --name attendance-worker

# Save configuration
pm2 save

# Set up auto-restart on reboot
pm2 startup
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "src/index.js"]
```

## 📈 Monitoring

### Health Check

```bash
GET /api/v1/health
```

### Metrics to Monitor

- API response times
- Database connection pool
- Sync success rate
- Device online status
- Error rates
- Memory usage

## 🐛 Troubleshooting

### Device Connection Issues

```bash
# Check device is reachable
ping <device-ip>

# Test device connection via API
POST /api/v1/devices/:id/test

# Check connection stats
GET /api/v1/devices/stats

# View device logs
tail -f logs/combined.log | grep "device"
```

### Sync Issues

```bash
# Check sync status
GET /api/v1/attendance/sync/status

# View sync statistics
GET /api/v1/attendance/sync/statistics

# Trigger manual sync
POST /api/v1/attendance/sync

# Check worker logs
tail -f logs/combined.log | grep "sync"
```

### Database Issues

```bash
# Test connection
node -e "import('./src/database/index.js').then(d => d.testConnection())"

# View migrations
npm run db:studio
```

## 📚 Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Express.js Guide](https://expressjs.com/)
- [ZKTeco Protocol Documentation](https://github.com/caobo171/node-zklib)
- [JWT Best Practices](https://jwt.io/introduction)

## 🤝 Support

For issues or questions:

1. Check logs: `logs/error.log`
2. Verify configuration: `.env`
3. Test device connectivity
4. Review API responses

## 📄 License

MIT License - See LICENSE file for details
