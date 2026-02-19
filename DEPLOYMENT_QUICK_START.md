# ⚡ Quick Deployment Guide

Fast-track guide to get your system deployed in 30 minutes.

## Choose Your Deployment Method

### 🟢 Easiest: Railway (5 minutes)

1. Push code to GitHub
2. Go to https://railway.app
3. Connect GitHub repo
4. Add environment variables
5. Deploy!

**Cost:** Free tier available, then $5/month

---

### 🟡 Recommended: DigitalOcean (30 minutes)

**What you need:**

- DigitalOcean account ($6/month)
- Domain name (optional)
- 30 minutes

**Quick Steps:**

```bash
# 1. Create Ubuntu 22.04 Droplet ($6/month)
# 2. SSH into server
ssh root@YOUR_IP

# 3. Run setup script
curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/setup.sh | bash

# 4. Configure environment
cd /home/attendance/attendance-system/backend
nano .env
# Add your DATABASE_URL and JWT_SECRET

# 5. Start services
pm2 start src/index.js --name api
pm2 start src/workers/syncWorker.js --name worker
pm2 save

# 6. Setup Nginx + SSL
sudo certbot --nginx -d yourdomain.com
```

**Done!** Access at https://yourdomain.com

---

## Multi-Location Setup (Different Cities)

### Option 1: Tailscale VPN (Easiest & Secure)

**At Each Location:**

1. Install Tailscale: https://tailscale.com/download
2. Connect to network
3. Note the Tailscale IP (e.g., 100.64.0.5)
4. Register device using Tailscale IP

**Benefits:**

- ✅ Secure encrypted connection
- ✅ No port forwarding
- ✅ Free for up to 100 devices

### Option 2: Port Forwarding (Simple but Less Secure)

**At Each Location:**

1. Get public IP or setup DDNS (No-IP, DuckDNS)
2. Forward port 4370 on router to device
3. Whitelist only your server IP
4. Register device using public IP/DDNS

---

## Security Essentials

### Must-Do Before Going Live:

```bash
# 1. Generate strong JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Enable firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# 3. Setup SSL
sudo certbot --nginx -d yourdomain.com

# 4. Setup backups (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/attendance/backup.sh

# 5. Change default admin password
# Login and change via UI
```

---

## Environment Variables Template

```env
# Production .env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://postgres:PASSWORD@host:5432/postgres
DATABASE_SCHEMA=attendance_system
JWT_SECRET=YOUR_64_CHAR_SECRET_HERE
CORS_ORIGIN=https://yourdomain.com
ENABLE_AUTO_SYNC=true
```

---

## Quick Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs

# Restart services
pm2 restart all

# Check SSL
sudo certbot certificates

# Test Nginx config
sudo nginx -t
```

---

## Troubleshooting

**Can't connect to device?**

```bash
ping DEVICE_IP
nc -zv DEVICE_IP 4370
```

**Service crashed?**

```bash
pm2 logs
pm2 restart all
```

**SSL not working?**

```bash
sudo certbot renew --force-renewal
sudo systemctl restart nginx
```

---

## Cost Breakdown

### Minimal Setup ($6/month)

- DigitalOcean Droplet: $6/month
- Supabase Free Tier: $0
- Domain (optional): $10/year
- SSL Certificate: Free (Let's Encrypt)

**Total: ~$6/month**

### Recommended Setup ($20/month)

- DigitalOcean Droplet: $12/month (2GB RAM)
- Supabase Pro: $25/month (better backups)
- Domain: $10/year
- Monitoring: Free (UptimeRobot)

**Total: ~$38/month**

---

## Next Steps After Deployment

1. ✅ Login with admin credentials
2. ✅ Change admin password
3. ✅ Register all devices
4. ✅ Sync employees
5. ✅ Test attendance sync
6. ✅ Setup monitoring alerts
7. ✅ Train your team

---

## Support

- Full Guide: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- Setup Guide: See [SETUP.md](SETUP.md)
- Issues: Check troubleshooting section

**Ready to deploy? Follow the detailed guide in DEPLOYMENT_GUIDE.md**
