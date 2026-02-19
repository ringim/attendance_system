# 🚀 Production Deployment Guide

Complete guide for deploying the Attendance Management System to production with security best practices.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Cloud Hosting Options](#cloud-hosting-options)
3. [Deployment Methods](#deployment-methods)
4. [Security Configuration](#security-configuration)
5. [Multi-Location Setup](#multi-location-setup)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying to production, ensure you have:

- [ ] Production database (Supabase/PostgreSQL)
- [ ] Domain name (optional but recommended)
- [ ] SSL certificate (Let's Encrypt or cloud provider)
- [ ] Backup strategy in place
- [ ] Environment variables configured
- [ ] Security measures implemented
- [ ] Monitoring tools set up

---

## Cloud Hosting Options

### Option 1: DigitalOcean (Recommended for Beginners)

**Cost:** Starting at $6/month  
**Pros:** Simple, good documentation, predictable pricing  
**Best for:** Small to medium deployments

### Option 2: AWS EC2

**Cost:** Free tier available, then pay-as-you-go  
**Pros:** Scalable, many services, global infrastructure  
**Best for:** Enterprise deployments

### Option 3: Railway / Render

**Cost:** Free tier available  
**Pros:** Easiest deployment, automatic HTTPS  
**Best for:** Quick deployments, startups

### Option 4: VPS (Contabo, Hetzner, Linode)

**Cost:** $3-10/month  
**Pros:** Cost-effective, full control  
**Best for:** Budget-conscious deployments

---

## Deployment Methods

### Method 1: DigitalOcean Droplet (Detailed Guide)

#### Step 1: Create Droplet

1. **Sign up at DigitalOcean**
   - Go to https://digitalocean.com
   - Create account and add payment method

2. **Create Droplet**

   ```
   Image: Ubuntu 22.04 LTS
   Plan: Basic ($6/month - 1GB RAM, 1 CPU)
   Datacenter: Choose closest to your users
   Authentication: SSH Key (recommended) or Password
   Hostname: attendance-server
   ```

3. **Note your Droplet IP address** (e.g., 203.0.113.45)

#### Step 2: Initial Server Setup

```bash
# SSH into your server
ssh root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y

# Create non-root user
adduser attendance
usermod -aG sudo attendance

# Switch to new user
su - attendance
```

#### Step 3: Install Dependencies

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Nginx (Web Server)
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Verify installations
node --version
npm --version
pm2 --version
nginx -v
```

#### Step 4: Clone and Setup Application

```bash
# Clone your repository
cd /home/attendance
git clone YOUR_REPOSITORY_URL attendance-system
cd attendance-system

# Setup Backend
cd backend
npm install --production

# Create production .env file
nano .env
```

**Production .env Configuration:**

```env
# Server Configuration
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres.xxxxx:PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres
DATABASE_SCHEMA=attendance_system

# JWT Configuration (Generate new secure keys!)
JWT_SECRET=GENERATE_NEW_64_CHAR_SECRET_HERE
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# ZKTeco Device Configuration
DEVICE_SYNC_INTERVAL=5
DEVICE_CONNECTION_TIMEOUT=10000
DEVICE_MAX_RETRIES=3

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/home/attendance/logs

# CORS (Your frontend domain)
CORS_ORIGIN=https://yourdomain.com

# Worker Configuration
ENABLE_AUTO_SYNC=true
SYNC_BATCH_SIZE=1000

# Security
HELMET_ENABLED=true
TRUST_PROXY=true
```

**Generate Secure JWT Secret:**

```bash
# Generate 64-character random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Step 5: Run Database Migrations

```bash
cd /home/attendance/attendance-system/backend

# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Create admin user
npm run create-admin
```

#### Step 6: Setup PM2 (Process Manager)

```bash
# Start backend with PM2
cd /home/attendance/attendance-system/backend
pm2 start src/index.js --name attendance-api

# Start worker
pm2 start src/workers/syncWorker.js --name attendance-worker

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs

# Check status
pm2 status
pm2 logs attendance-api
```

#### Step 7: Setup Frontend

```bash
cd /home/attendance/attendance-system/frontend

# Install dependencies
npm install

# Create production .env
nano .env
```

**Frontend .env:**

```env
VITE_API_URL=https://api.yourdomain.com/api/v1
```

**Build frontend:**

```bash
npm run build
# This creates a 'dist' folder with static files
```

#### Step 8: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/attendance
```

**Nginx Configuration:**

```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /home/attendance/attendance-system/frontend/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable site and restart Nginx:**

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/attendance /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### Step 9: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (recommended)

# Test auto-renewal
sudo certbot renew --dry-run
```

#### Step 10: Configure Firewall

```bash
# Enable UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

---

### Method 2: Railway Deployment (Easiest)

#### Step 1: Prepare Your Code

1. **Add railway.json to backend:**

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

2. **Add Procfile to backend:**

```
web: node src/index.js
worker: node src/workers/syncWorker.js
```

#### Step 2: Deploy to Railway

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables from your .env
6. Deploy!

Railway will:

- Automatically detect Node.js
- Install dependencies
- Run migrations
- Provide HTTPS URL

---

## Security Configuration

### 1. Environment Variables Security

**Never commit these to Git:**

```bash
# Add to .gitignore
.env
.env.local
.env.production
*.pem
*.key
```

**Use environment variable management:**

- Railway: Built-in env vars
- DigitalOcean: App Platform env vars
- AWS: Systems Manager Parameter Store
- Manual: Use `.env` files with proper permissions

```bash
# Set proper permissions
chmod 600 .env
```

### 2. Database Security

**Supabase Security:**

```sql
-- Enable Row Level Security (RLS)
ALTER TABLE attendance_system.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_system.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_system.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (example)
CREATE POLICY "Users can view their own data"
  ON attendance_system.users
  FOR SELECT
  USING (auth.uid() = id);
```

**Connection Security:**

- Use SSL connections (Supabase provides this)
- Use connection pooling (PgBouncer)
- Rotate database passwords regularly
- Use read-only replicas for reporting

### 3. API Security

**Rate Limiting (Already configured in code):**

```javascript
// backend/src/index.js
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP",
});

app.use("/api/", limiter);
```

**Additional Security Middleware:**

```bash
cd backend
npm install express-mongo-sanitize xss-clean hpp
```

```javascript
// Add to backend/src/index.js
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import hpp from "hpp";

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());
```

### 4. Device Connection Security

**Whitelist Server IP on Device Network:**

```bash
# On each branch router/firewall
# Only allow connections from your server IP
iptables -A INPUT -p tcp --dport 4370 -s YOUR_SERVER_IP -j ACCEPT
iptables -A INPUT -p tcp --dport 4370 -j DROP
```

**Use VPN for Device Connections (Recommended):**

See [Multi-Location Setup](#multi-location-setup) section.

### 5. Backup Strategy

**Automated Database Backups:**

```bash
# Create backup script
nano /home/attendance/backup.sh
```

```bash
#!/bin/bash
# Backup script

BACKUP_DIR="/home/attendance/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_URL="your_database_connection_string"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump $DB_URL > $BACKUP_DIR/db_backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: db_backup_$DATE.sql.gz"
```

```bash
# Make executable
chmod +x /home/attendance/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line:
0 2 * * * /home/attendance/backup.sh
```

**Supabase Automatic Backups:**

Supabase Pro plan includes:

- Daily automated backups
- Point-in-time recovery
- 7-day retention (configurable)

### 6. Monitoring & Alerts

**Setup PM2 Monitoring:**

```bash
# Install PM2 Plus (free tier available)
pm2 link YOUR_SECRET_KEY YOUR_PUBLIC_KEY

# Monitor from web dashboard
# https://app.pm2.io
```

**Setup Log Rotation:**

```bash
# Install logrotate
sudo apt install logrotate

# Create logrotate config
sudo nano /etc/logrotate.d/attendance
```

```
/home/attendance/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 attendance attendance
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

**Setup Uptime Monitoring:**

Use free services:

- UptimeRobot (https://uptimerobot.com)
- Pingdom (https://pingdom.com)
- StatusCake (https://statuscake.com)

Configure to check:

- Frontend: https://yourdomain.com
- API Health: https://api.yourdomain.com/api/v1/health

---

## Multi-Location Setup

### Scenario: Devices in Different Cities

**Architecture:**

```
Cloud Server (Central)
    ↓ Internet ↓
Branch A (Lagos) - Device A
Branch B (Abuja) - Device B
Branch C (Port Harcourt) - Device C
```

### Option 1: Direct Connection (Port Forwarding)

**At Each Branch Location:**

1. **Get Public IP or Setup DDNS:**

```bash
# Check public IP
curl ifconfig.me

# Or setup DDNS (No-IP, DuckDNS, etc.)
# Example: branch-lagos.ddns.net
```

2. **Configure Router Port Forwarding:**

```
Router Settings:
- External Port: 4370
- Internal IP: 192.168.1.5 (device IP)
- Internal Port: 4370
- Protocol: TCP
```

3. **Configure Firewall (Security):**

```bash
# Only allow your server IP
# Router/Firewall rule:
Source IP: YOUR_SERVER_IP
Destination Port: 4370
Action: ALLOW

# Block all other IPs
Source IP: ANY
Destination Port: 4370
Action: DENY
```

4. **Register Device in System:**

```
Name: Lagos Office Device
IP Address: branch-lagos.ddns.net (or public IP)
Port: 4370
Location: Lagos, Nigeria
```

### Option 2: VPN Connection (Recommended)

**Using Tailscale (Easiest):**

1. **Install Tailscale on Server:**

```bash
# On your cloud server
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

2. **Install Tailscale at Each Branch:**

```bash
# On a computer at each branch (Windows/Mac/Linux)
# Download from https://tailscale.com/download

# After installation, login and connect
tailscale up
```

3. **Note Tailscale IPs:**

```bash
# Check Tailscale IP
tailscale ip -4

# Example IPs:
Server: 100.64.0.1
Branch A: 100.64.0.5
Branch B: 100.64.0.8
Branch C: 100.64.0.12
```

4. **Register Devices Using Tailscale IPs:**

```
Device A: 100.64.0.5:4370 (Lagos)
Device B: 100.64.0.8:4370 (Abuja)
Device C: 100.64.0.12:4370 (Port Harcourt)
```

**Benefits:**

- ✅ Encrypted connection
- ✅ No port forwarding needed
- ✅ Works behind NAT/firewalls
- ✅ Free for personal use (up to 100 devices)

### Option 3: WireGuard VPN (Advanced)

**Setup WireGuard Server:**

```bash
# On cloud server
sudo apt install wireguard

# Generate keys
wg genkey | tee privatekey | wg pubkey > publickey

# Configure WireGuard
sudo nano /etc/wireguard/wg0.conf
```

```ini
[Interface]
PrivateKey = SERVER_PRIVATE_KEY
Address = 10.0.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT

# Branch A
[Peer]
PublicKey = BRANCH_A_PUBLIC_KEY
AllowedIPs = 10.0.0.2/32

# Branch B
[Peer]
PublicKey = BRANCH_B_PUBLIC_KEY
AllowedIPs = 10.0.0.3/32

# Branch C
[Peer]
PublicKey = BRANCH_C_PUBLIC_KEY
AllowedIPs = 10.0.0.4/32
```

**Start WireGuard:**

```bash
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0
```

---

## Monitoring & Maintenance

### Daily Checks

```bash
# Check PM2 processes
pm2 status

# Check logs
pm2 logs attendance-api --lines 50
pm2 logs attendance-worker --lines 50

# Check disk space
df -h

# Check memory usage
free -h

# Check database connections
# (via Supabase dashboard)
```

### Weekly Maintenance

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Restart services
pm2 restart all

# Check SSL certificate expiry
sudo certbot certificates

# Review logs for errors
grep -i error /home/attendance/logs/*.log
```

### Monthly Tasks

- Review user access logs
- Check backup integrity
- Update dependencies (npm outdated)
- Review and optimize database queries
- Check for security updates

### Performance Optimization

**Enable Nginx Caching:**

```nginx
# Add to Nginx config
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;

location /api/v1/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_use_stale error timeout http_500 http_502 http_503;
    # ... rest of proxy config
}
```

**Database Connection Pooling:**

```javascript
// backend/src/database/index.js
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, {
  max: 10, // Maximum connections
  idle_timeout: 20,
  connect_timeout: 10,
});
```

---

## Troubleshooting

### Issue: Cannot Connect to Device

**Check 1: Network Connectivity**

```bash
# From server, ping device
ping DEVICE_IP

# Check if port is open
nc -zv DEVICE_IP 4370
```

**Check 2: Firewall Rules**

```bash
# Check UFW status
sudo ufw status

# Check if port 4370 is allowed outbound
sudo ufw allow out 4370/tcp
```

**Check 3: Device Configuration**

- Verify device IP hasn't changed
- Check device is powered on
- Verify port 4370 is correct
- Test from local network first

### Issue: High Memory Usage

```bash
# Check memory
free -h

# Check which process is using memory
ps aux --sort=-%mem | head

# Restart PM2 processes
pm2 restart all

# Clear PM2 logs
pm2 flush
```

### Issue: Database Connection Errors

**Check 1: Connection String**

```bash
# Test database connection
psql "YOUR_DATABASE_URL"
```

**Check 2: Connection Limits**

- Supabase free tier: 60 connections
- Check active connections in Supabase dashboard
- Reduce connection pool size if needed

**Check 3: Network Issues**

```bash
# Check if database host is reachable
ping db.xxxxx.supabase.co

# Check DNS resolution
nslookup db.xxxxx.supabase.co
```

### Issue: SSL Certificate Renewal Failed

```bash
# Check certificate status
sudo certbot certificates

# Manually renew
sudo certbot renew --force-renewal

# Check Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Issue: PM2 Process Keeps Crashing

```bash
# Check logs
pm2 logs attendance-api --err

# Check for errors in application logs
tail -f /home/attendance/logs/error.log

# Restart with increased memory
pm2 delete attendance-api
pm2 start src/index.js --name attendance-api --max-memory-restart 500M
```

---

## Security Checklist

Before going live, verify:

- [ ] All environment variables are set correctly
- [ ] JWT_SECRET is strong and unique
- [ ] Database uses SSL connections
- [ ] HTTPS is enabled (SSL certificate installed)
- [ ] Firewall is configured (UFW enabled)
- [ ] Rate limiting is active
- [ ] CORS is configured correctly
- [ ] Admin password is changed from default
- [ ] Backup system is working
- [ ] Monitoring is set up
- [ ] Logs are being rotated
- [ ] Security headers are enabled (Helmet)
- [ ] Device connections are secured (VPN or IP whitelist)
- [ ] PM2 is set to restart on boot
- [ ] Database backups are automated
- [ ] Error logging is configured
- [ ] API endpoints require authentication
- [ ] Sensitive data is not logged
- [ ] Dependencies are up to date

---

## Quick Reference Commands

```bash
# PM2 Management
pm2 status                    # Check process status
pm2 logs                      # View logs
pm2 restart all               # Restart all processes
pm2 stop all                  # Stop all processes
pm2 delete all                # Delete all processes
pm2 save                      # Save current process list
pm2 resurrect                 # Restore saved processes

# Nginx Management
sudo nginx -t                 # Test configuration
sudo systemctl restart nginx  # Restart Nginx
sudo systemctl status nginx   # Check status
sudo tail -f /var/log/nginx/error.log  # View error logs

# System Management
sudo systemctl status         # Check all services
df -h                         # Check disk space
free -h                       # Check memory
htop                          # Interactive process viewer
journalctl -xe                # View system logs

# Database
npm run db:migrate            # Run migrations
npm run db:check              # Check schema
npm run db:studio             # Open Drizzle Studio

# SSL Certificate
sudo certbot renew            # Renew certificates
sudo certbot certificates     # List certificates
```

---

## Support & Resources

- **Documentation:** See README.md and SETUP.md
- **DigitalOcean Tutorials:** https://www.digitalocean.com/community/tutorials
- **Nginx Documentation:** https://nginx.org/en/docs/
- **PM2 Documentation:** https://pm2.keymetrics.io/docs/
- **Let's Encrypt:** https://letsencrypt.org/docs/
- **Tailscale Docs:** https://tailscale.com/kb/

---

## Next Steps

After deployment:

1. ✅ Test all functionality
2. ✅ Register all devices
3. ✅ Sync employees from devices
4. ✅ Configure auto-sync worker
5. ✅ Set up monitoring alerts
6. ✅ Train users on the system
7. ✅ Document any custom configurations
8. ✅ Schedule regular maintenance

**Your system is now production-ready! 🎉**
