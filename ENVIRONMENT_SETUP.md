# Environment Setup Guide

This guide will help you set up the environment variables for both backend and frontend.

## 🔧 Backend Configuration

### 1. Copy the example file

```bash
cd backend
cp .env.example .env
```

### 2. Update the following variables in `backend/.env`:

#### Database Configuration (Supabase)

1. **Get Supabase Credentials:**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Go to Project Settings > API
   - Copy the following:
     - `Project URL` → `SUPABASE_URL`
     - `anon public` key → `SUPABASE_ANON_KEY`
     - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

2. **Get Database URL:**
   - Go to Project Settings > Database
   - Copy the connection string (Pooler mode recommended)
   - Format: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@[HOST]:5432/postgres`
   - Replace `[PASSWORD]` with your database password

Example:

```env
SUPABASE_URL=https://abcdefghijk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres.abcdefghijk:YourPassword123@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

#### JWT Secret

Generate a secure random string:

```bash
openssl rand -hex 32
```

Copy the output and paste it as `JWT_SECRET`:

```env
JWT_SECRET=your-generated-secret-here
```

#### CORS Origin

Update if your frontend runs on a different port:

```env
CORS_ORIGIN=http://localhost:3000
```

### 3. Complete Backend .env Example:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres.your-project:your-password@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Database Schema
DATABASE_SCHEMA=attendance_system

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# ZKTeco Device Configuration
DEVICE_SYNC_INTERVAL=5
DEVICE_CONNECTION_TIMEOUT=5000
DEVICE_MAX_RETRIES=3

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# CORS
CORS_ORIGIN=http://localhost:3000

# Worker Configuration
ENABLE_AUTO_SYNC=true
SYNC_BATCH_SIZE=1000
```

---

## 🎨 Frontend Configuration

### 1. Copy the example file

```bash
cd frontend
cp .env.example .env
```

### 2. Update the API URL in `frontend/.env`:

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api/v1
```

**Note:** If you deploy the backend to a different URL, update this accordingly:

```env
# Production example
VITE_API_URL=https://api.yourdomain.com/api/v1
```

---

## 🚀 Quick Setup Script

Create a file `setup-env.sh` in the root directory:

```bash
#!/bin/bash

echo "🔧 Setting up environment files..."

# Backend
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env"
    echo "⚠️  Please update backend/.env with your credentials"
else
    echo "ℹ️  backend/.env already exists"
fi

# Frontend
if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env"
else
    echo "ℹ️  frontend/.env already exists"
fi

echo ""
echo "📝 Next steps:"
echo "1. Update backend/.env with your Supabase credentials"
echo "2. Generate JWT secret: openssl rand -hex 32"
echo "3. Run: cd backend && npm install"
echo "4. Run: cd frontend && npm install"
echo "5. Run migrations: cd backend && npm run db:migrate"
echo "6. Create admin user: cd backend && npm run create-admin"
echo ""
echo "🎉 Setup complete!"
```

Make it executable:

```bash
chmod +x setup-env.sh
./setup-env.sh
```

---

## 🔒 Security Best Practices

### ⚠️ IMPORTANT:

1. **Never commit `.env` files to Git**
   - Already in `.gitignore`
   - Only commit `.env.example` with dummy data

2. **Use strong JWT secrets in production**
   - Minimum 32 characters
   - Use `openssl rand -hex 32` to generate

3. **Rotate secrets regularly**
   - Change JWT_SECRET periodically
   - Update database passwords

4. **Use environment-specific values**
   - Development: `localhost`
   - Production: Your domain

5. **Restrict CORS origins**
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`

---

## 🌍 Production Deployment

### Backend (.env for production):

```env
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Use your production Supabase project
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role-key

# Production database
DATABASE_URL=postgresql://postgres.your-prod:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
DATABASE_SCHEMA=attendance_system

# Strong production JWT secret
JWT_SECRET=use-a-very-strong-secret-here-minimum-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Device configuration
DEVICE_SYNC_INTERVAL=5
DEVICE_CONNECTION_TIMEOUT=5000
DEVICE_MAX_RETRIES=3

# Stricter rate limiting for production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Production logging
LOG_LEVEL=warn
LOG_FILE_PATH=./logs

# Production CORS
CORS_ORIGIN=https://yourdomain.com

# Worker
ENABLE_AUTO_SYNC=true
SYNC_BATCH_SIZE=1000
```

### Frontend (.env for production):

```env
VITE_API_URL=https://api.yourdomain.com/api/v1
```

---

## 🧪 Testing Configuration

For testing, you might want a separate `.env.test`:

```env
NODE_ENV=test
PORT=5001
DATABASE_URL=postgresql://postgres:password@localhost:5432/attendance_test
DATABASE_SCHEMA=attendance_test
JWT_SECRET=test-secret-key
CORS_ORIGIN=http://localhost:3001
```

---

## 📋 Checklist

Before running the application:

- [ ] Copied `.env.example` to `.env` in both backend and frontend
- [ ] Updated Supabase credentials
- [ ] Generated and set JWT_SECRET
- [ ] Updated CORS_ORIGIN if needed
- [ ] Installed dependencies (`npm install`)
- [ ] Ran database migrations
- [ ] Created admin user
- [ ] Tested database connection

---

## 🆘 Troubleshooting

### Database Connection Issues:

1. **Check Supabase project is active**
2. **Verify connection string format**
3. **Ensure password doesn't contain special characters** (URL encode if needed)
4. **Check if IP is whitelisted** (Supabase > Project Settings > Database > Connection Pooling)

### JWT Issues:

1. **Ensure JWT_SECRET is set**
2. **Check secret length** (minimum 32 characters recommended)
3. **Verify token expiration times**

### CORS Issues:

1. **Check CORS_ORIGIN matches frontend URL**
2. **Include protocol** (http:// or https://)
3. **No trailing slash**

---

## 📞 Need Help?

If you encounter issues:

1. Check the logs in `backend/logs/`
2. Verify all environment variables are set
3. Test database connection: `npm run db:check`
4. Review the error messages carefully

---

**Remember:** Never share your `.env` file or commit it to version control!
