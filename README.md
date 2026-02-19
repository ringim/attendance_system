# ZKTeco Attendance Management System

A modern, full-stack attendance management system with real-time monitoring capabilities for ZKTeco biometric devices. Built with React, Node.js, and PostgreSQL.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-18.2.0-blue.svg)

## Features

### Core Functionality

- **Real-Time Attendance Monitoring** - Live feed of attendance events with SSE (Server-Sent Events)
- **Employee Management** - Complete CRUD operations with bulk import from devices
- **Device Management** - Register, test, and manage multiple ZKTeco devices
- **Attendance Logs** - Comprehensive filtering, search, and CSV export
- **Dashboard Analytics** - Real-time statistics and insights
- **Multi-Device Support** - Monitor multiple devices simultaneously

### Technical Highlights

- JWT-based authentication with role-based access control
- Automatic background sync worker with configurable intervals
- Batch operations for performance optimization
- RESTful API with comprehensive error handling
- Responsive UI with Tailwind CSS
- PostgreSQL with custom schema architecture

## Compatible Devices

This system works with ZKTeco devices that support TCP/IP communication:

- ZKTeco S900
- ZKTeco F18
- ZKTeco K40
- ZKTeco MB360
- Other ZKTeco models with TCP/IP support

## Tech Stack

### Backend

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM
- **Device Communication**: node-zklib
- **Authentication**: JWT
- **Validation**: Joi
- **Logging**: Winston

### Frontend

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Routing**: React Router v6

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Supabase account)
- ZKTeco device with TCP/IP connectivity

### Installation

1. Clone the repository

```bash
git clone https://github.com/ringim/attendance_system.git
cd attendance_system
```

2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run migrate
npm run create-admin
npm start
```

3. Setup Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your backend URL
npm run dev
```

4. Access the application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Default credentials: `admin` / `admin123`

## Configuration

### Environment Variables

#### Backend (.env)

```env
# Database
DATABASE_URL=your_postgresql_connection_string

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=development

# Device Sync
DEVICE_SYNC_INTERVAL=*/5 * * * *
ENABLE_AUTO_SYNC=true
```

#### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000
```

See [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) for detailed configuration guide.

## Usage

### 1. Register a Device

Navigate to Devices page and add your ZKTeco device:

- IP Address: Device IP (e.g., 192.168.1.5)
- Port: Usually 4370
- Name: Descriptive name
- Location: Physical location

### 2. Sync Employees

Go to Employees page and click "Sync from Device" to import all users from your device.

### 3. Monitor Attendance

- **Dashboard**: View today's statistics and recent logs
- **Attendance Logs**: Filter, search, and export attendance records
- **Live Monitor**: Real-time attendance feed with instant notifications

### 4. Background Sync

Start the automatic sync worker:

```bash
cd backend
npm run worker
```

Or use PM2 for production:

```bash
pm2 start src/workers/syncWorker.js --name attendance-worker
```

## API Documentation

### Authentication

```
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/verify
```

### Devices

```
GET    /api/v1/devices
POST   /api/v1/devices
PUT    /api/v1/devices/:id
DELETE /api/v1/devices/:id
POST   /api/v1/devices/:id/test
GET    /api/v1/devices/:id/info
```

### Employees

```
GET    /api/v1/employees
POST   /api/v1/employees
PUT    /api/v1/employees/:id
DELETE /api/v1/employees/:id
POST   /api/v1/employees/sync
```

### Attendance

```
GET  /api/v1/attendance/logs
GET  /api/v1/attendance/dashboard
POST /api/v1/attendance/sync
GET  /api/v1/attendance/realtime/:deviceId (SSE)
GET  /api/v1/attendance/realtime-all (SSE)
```

## Deployment

### Quick Deploy Options

- **Railway**: One-click deploy with PostgreSQL addon
- **DigitalOcean**: Droplet with PM2 process manager
- **AWS**: EC2 + RDS for production scale

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for comprehensive deployment instructions.

### Multi-Location Setup

For distributed deployments across multiple locations:

- VPN setup (Tailscale/WireGuard)
- Port forwarding configuration
- DDNS for dynamic IPs

See [ZKTECO_LIBRARY_CAPABILITIES.md](ZKTECO_LIBRARY_CAPABILITIES.md) for multi-location architecture.

## Project Structure

```
attendance_system/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── database/        # Database schema and migrations
│   │   ├── middlewares/     # Express middlewares
│   │   ├── modules/         # Feature modules
│   │   │   ├── attendance/
│   │   │   ├── auth/
│   │   │   ├── devices/
│   │   │   └── employees/
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utilities
│   │   └── workers/         # Background jobs
│   └── scripts/             # Database scripts
├── frontend/
│   └── src/
│       ├── components/      # React components
│       ├── pages/           # Page components
│       ├── services/        # API services
│       ├── store/           # State management
│       └── styles/          # CSS files
└── docs/                    # Documentation
```

## Database Schema

The system uses a custom PostgreSQL schema (`attendance_system`) with the following tables:

- `users` - System users with role-based access
- `devices` - Registered ZKTeco devices
- `employees` - Employee records
- `attendance_logs` - Attendance records
- `sync_history` - Sync operation logs
- `audit_logs` - System audit trail

See [SCHEMA_ARCHITECTURE.md](SCHEMA_ARCHITECTURE.md) for detailed schema documentation.

## Development

### Running Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Code Style

- ESLint for JavaScript linting
- Prettier for code formatting
- Follow Airbnb JavaScript Style Guide

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Limitations

- **Fingerprint Enrollment**: Must be done physically on the device (not supported via software)
- **Device Clock**: Some devices may have incorrect time settings (check device configuration)
- **Network**: Devices must be accessible via TCP/IP from the server

## Troubleshooting

### Device Connection Issues

```bash
# Test device connectivity
ping 192.168.1.5

# Check if port is open
nc -zv 192.168.1.5 4370
```

### Database Connection

```bash
# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT 1"
```

### Logs

```bash
# Backend logs
tail -f backend/logs/combined.log

# Worker logs
pm2 logs attendance-worker
```

## Performance

- Handles 1000+ employees efficiently
- Batch operations for bulk imports (100 records/chunk)
- Real-time monitoring with minimal latency
- Optimized database queries with indexes

## Security

- JWT token-based authentication
- Password hashing with bcrypt
- SQL injection prevention with parameterized queries
- CORS configuration for API security
- Environment variable protection
- Rate limiting on API endpoints

## Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced reporting and analytics
- [ ] Email/SMS notifications
- [ ] Shift management
- [ ] Leave management integration
- [ ] Multi-tenant SaaS version
- [ ] Biometric template backup

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with assistance from Claude (Anthropic) and Kiro AI
- ZKTeco for device protocol documentation
- Open source community for amazing tools and libraries

## Author

**Abubakar Kabiru**

- LinkedIn: [linkedin.com/in/abubakarringim](https://linkedin.com/in/abubakarringim)
- GitHub: [@ringim](https://github.com/ringim)

## Support

For issues, questions, or contributions:

- Open an issue on GitHub
- Contact via LinkedIn

---

**Development Time**: ~8-10 hours
**Status**: Production Ready ✅
