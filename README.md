# 🎯 Attendance Management System

A production-ready, scalable attendance management system integrating ZKTeco S900 biometric devices with cloud backend and modern web dashboard.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🌟 Overview

This system provides a complete solution for managing employee attendance using ZKTeco biometric devices. It features real-time syncing, cloud storage, role-based access control, and an intuitive web dashboard.

### Key Capabilities

- **Device Integration**: Connect multiple ZKTeco S900 devices via TCP/IP
- **Background Syncing**: Automatic periodic synchronization of attendance data
- **Cloud Storage**: PostgreSQL database with Supabase for scalability
- **Web Dashboard**: Modern React interface for monitoring and management
- **RESTful API**: Clean, documented API for extensibility
- **Role-Based Access**: Admin, Manager, and Viewer roles
- **Production-Ready**: Comprehensive error handling, logging, and monitoring

## ✨ Features

### Backend

- ✅ ZKTeco S900 device integration
- ✅ Multi-device support
- ✅ Background sync worker with cron scheduling
- ✅ Automatic deduplication of records
- ✅ Connection pooling and retry logic
- ✅ JWT authentication
- ✅ Role-based authorization
- ✅ Input validation and sanitization
- ✅ Structured logging with Winston
- ✅ Rate limiting
- ✅ Comprehensive error handling
- ✅ Database migrations with Drizzle ORM
- ✅ Audit logging

### Frontend

- ✅ Responsive React dashboard
- ✅ Real-time attendance monitoring
- ✅ Employee management
- ✅ Device registration and testing
- ✅ Attendance log viewer with filtering
- ✅ Dashboard with statistics
- ✅ Manual sync trigger
- ✅ Dark mode support (coming soon)
- ✅ Export functionality (coming soon)

## 🏗️ System Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  ZKTeco     │◄────────┤   Backend    │◄────────┤   Frontend  │
│  S900       │  TCP/IP │   Node.js    │  REST   │   React     │
│  Devices    │         │   Express    │   API   │   SPA       │
└─────────────┘         └──────────────┘         └─────────────┘
                               │
                               │
                        ┌──────▼───────┐
                        │  PostgreSQL  │
                        │  (Supabase)  │
                        └──────────────┘
                               │
                        ┌──────▼───────┐
                        │ Sync Worker  │
                        │  (Cron Job)  │
                        └──────────────┘
```

### Components

1. **ZKTeco S900 Devices**: Biometric attendance terminals
2. **Backend API**: Node.js + Express server
3. **Database**: PostgreSQL (hosted on Supabase)
4. **Sync Worker**: Background process for data synchronization
5. **Frontend Dashboard**: React web application
6. **File Storage**: Supabase Storage (optional, for future use)

## 🛠️ Tech Stack

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM
- **Device SDK**: zklib
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Joi
- **Logging**: Winston
- **Scheduler**: node-cron

### Frontend

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State**: Zustand
- **HTTP**: Axios
- **Charts**: Recharts
- **Icons**: Lucide React

### Infrastructure

- **Database**: Supabase PostgreSQL
- **Deployment**: Docker / PM2 / Systemd
- **Reverse Proxy**: Nginx (recommended)

## 🚀 Quick Start

### Important: Multi-Schema Database Setup

This project uses **PostgreSQL schemas** for data isolation, allowing multiple projects on one Supabase instance.

📖 **Documentation**:

- [SETUP.md](SETUP.md) - Complete step-by-step setup guide
- [MULTI_SCHEMA_SETUP.md](MULTI_SCHEMA_SETUP.md) - Multi-schema configuration details
- [SCHEMA_QUICK_REFERENCE.md](SCHEMA_QUICK_REFERENCE.md) - Quick commands and tips

### Prerequisites

```bash
# Check Node.js version (18+ required)
node --version

# Check npm version
npm --version
```

### 1. Clone Repository

```bash
git clone <repository-url>
cd attendance-system
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration
# IMPORTANT: Set DATABASE_SCHEMA=attendance_system

# Run database migrations
npm run db:migrate

# Start backend server
npm run dev
```

Backend runs at: `http://localhost:5000`

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment
echo "VITE_API_URL=http://localhost:5000/api/v1" > .env

# Start frontend
npm run dev
```

Frontend runs at: `http://localhost:3000`

### 4. Create Admin User

Connect to your database and run:

```bash
# Option 1: Use Drizzle Studio (recommended)
cd backend
npm run db:studio
```

```sql
# Option 2: Use Supabase SQL Editor
SET search_path TO attendance_system;

INSERT INTO users (username, email, password_hash, full_name, role, status)
VALUES (
  'admin',
  'admin@example.com',
  '$2a$10$xyz...', -- Hash your password with bcrypt
  'System Administrator',
  'admin',
  'active'
);
```

**Note**: Since we use a custom schema, use SQL Editor (not Table Editor) in Supabase.

### 5. Register a Device

1. Login to dashboard at `http://localhost:3000`
2. Navigate to "Devices"
3. Click "Add Device"
4. Enter device details:
   - Name: Main Entrance
   - IP Address: 192.168.1.100
   - Port: 4370 (default)
   - Location: Building A
5. Test connection
6. Save device

## 📖 Detailed Setup

### Database Setup (Supabase)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note your project URL and keys

2. **Get Database URL**

   ```
   Settings → Database → Connection String (Direct)
   ```

3. **Update .env**

   ```env
   DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
   SUPABASE_URL=https://[project-ref].supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Run Migrations**
   ```bash
   cd backend
   npm run db:migrate
   ```

### ZKTeco Device Setup

1. **Network Configuration**
   - Connect device to network
   - Set static IP or reserve DHCP
   - Ensure device is reachable from server

2. **Device Settings**
   - Enable TCP/IP communication
   - Default port: 4370
   - Note device serial number

3. **Test Connectivity**

   ```bash
   ping <device-ip>
   telnet <device-ip> 4370
   ```

4. **Register in System**
   - Use frontend UI or API
   - Test connection via "Test Connection" button

### Background Worker Setup

The sync worker runs as a separate process:

```bash
cd backend
npm run worker
```

**As systemd service (Linux):**

```bash
# Create service file
sudo nano /etc/systemd/system/attendance-worker.service

[Unit]
Description=Attendance Sync Worker
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/backend
ExecStart=/usr/bin/node src/workers/syncWorker.js
Restart=always

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable attendance-worker
sudo systemctl start attendance-worker
```

## 📚 Usage Guide

### Employee Management

**Add Employee:**

1. Navigate to "Employees"
2. Click "Add Employee"
3. Fill in details:
   - Employee Code (unique)
   - Name
   - Department
   - Device User ID (from ZKTeco device)
4. Save

**Bulk Import:**

1. Prepare CSV file:
   ```csv
   employeeCode,name,department,deviceUserId
   EMP001,John Doe,IT,1
   EMP002,Jane Smith,HR,2
   ```
2. Use "Bulk Import" feature
3. Review and confirm

### Device Management

**Register Device:**

- IP Address: Device network address
- Port: Default 4370
- Location: Physical location
- Test connection before saving

**Sync Devices:**

- Manual: Click "Sync Now" button
- Automatic: Runs every N minutes (configured in .env)

### Attendance Monitoring

**View Logs:**

- Filter by date range
- Filter by employee
- Filter by device
- Filter by direction (in/out)

**Employee Summary:**

- Select employee
- Choose date range
- View attendance statistics
- Export report (coming soon)

### Sync Management

**Monitor Sync Status:**

- Dashboard shows last sync time
- Sync statistics available
- View sync history

**Trigger Manual Sync:**

- All devices: Click "Sync All"
- Specific device: Device page → "Sync Now"

## 🔌 API Documentation

### Authentication

**Login:**

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}

Response:
{
  "success": true,
  "data": {
    "user": {...},
    "token": "jwt-token"
  }
}
```

**Use Token:**

```bash
Authorization: Bearer <token>
```

### Employees

**List Employees:**

```bash
GET /api/v1/employees?page=1&limit=50&search=john

Response:
{
  "success": true,
  "data": {
    "employees": [...],
    "pagination": {...}
  }
}
```

**Create Employee:**

```bash
POST /api/v1/employees
Authorization: Bearer <token>

{
  "employeeCode": "EMP001",
  "name": "John Doe",
  "department": "IT",
  "deviceUserId": 1
}
```

### Devices

**Register Device:**

```bash
POST /api/v1/devices
Authorization: Bearer <token>

{
  "name": "Main Entrance",
  "ipAddress": "192.168.1.100",
  "port": 4370,
  "location": "Building A"
}
```

**Test Connection:**

```bash
POST /api/v1/devices/:id/test
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Connection successful",
  "data": {...}
}
```

### Attendance

**Get Logs:**

```bash
GET /api/v1/attendance/logs?startDate=2024-01-01&endDate=2024-01-31

Response:
{
  "success": true,
  "data": {
    "logs": [...],
    "pagination": {...}
  }
}
```

**Trigger Sync:**

```bash
POST /api/v1/attendance/sync
Authorization: Bearer <token>

{
  "deviceId": "uuid" // optional, sync specific device
}
```

See `backend/README.md` for complete API documentation.

## 🚢 Deployment

### Docker Deployment

**Backend Dockerfile:**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "src/index.js"]
```

**Docker Compose:**

```yaml
version: "3.8"

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    restart: always

  worker:
    build: ./backend
    command: node src/workers/syncWorker.js
    environment:
      - DATABASE_URL=${DATABASE_URL}
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Backend
cd backend
pm2 start src/index.js --name attendance-api

# Worker
pm2 start src/workers/syncWorker.js --name attendance-worker

# Save and auto-restart
pm2 save
pm2 startup
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /var/www/attendance/frontend/dist;
        try_files $uri /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🐛 Troubleshooting

### Device Connection Issues

**Problem**: Cannot connect to device

**Solutions**:

1. Verify device IP and port
2. Check network connectivity: `ping <device-ip>`
3. Check firewall rules
4. Verify device is powered on
5. Test from backend server directly

### Database Connection Issues

**Problem**: Cannot connect to database

**Solutions**:

1. Verify DATABASE_URL in .env
2. Check Supabase project status
3. Verify network access
4. Check connection limits

### Sync Issues

**Problem**: Attendance not syncing

**Solutions**:

1. Check worker is running: `pm2 status`
2. View worker logs: `tail -f logs/combined.log`
3. Verify devices are online
4. Check employee deviceUserId mapping
5. Trigger manual sync

### Authentication Issues

**Problem**: Cannot login

**Solutions**:

1. Verify user exists in database
2. Check password hash
3. Verify JWT_SECRET is set
4. Check token expiration
5. Clear browser cache/localStorage

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Development Guidelines

- Follow existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- ZKTeco for biometric device technology
- Supabase for database platform
- Open source community for amazing tools

## 📞 Support

For issues and questions:

- Create an issue on GitHub
- Check documentation in /backend and /frontend
- Review troubleshooting guide

## 🗺️ Roadmap

### Version 1.1 (Planned)

- [ ] WebSocket real-time updates
- [ ] Export to CSV/PDF
- [ ] Email notifications
- [ ] Advanced reporting
- [ ] Multi-tenancy support

### Version 1.2 (Planned)

- [ ] Mobile app (React Native)
- [ ] Biometric enrollment via web
- [ ] Shift management
- [ ] Leave management
- [ ] Geofencing

### Version 2.0 (Future)

- [ ] AI-powered analytics
- [ ] Facial recognition support
- [ ] Integration with HR systems
- [ ] Advanced access control

---

**Built with ❤️ for modern attendance management**
