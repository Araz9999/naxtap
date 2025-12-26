# 🚀 Naxtap Hostinger VPS Deployment Guide

## Overview
This guide will help you deploy Naxtap marketplace on your Hostinger VPS with domain naxtap.az.

**What You Need:**
- Hostinger VPS access
- Domain naxtap.az pointed to VPS IP
- PostgreSQL database
- All API keys in `.env` file
- SSH access to VPS

---

## 📋 Pre-Deployment Checklist

### On Your VPS
- [ ] Ubuntu/Debian Linux installed
- [ ] Root or sudo access
- [ ] Domain DNS pointed to VPS IP address
- [ ] PostgreSQL database created
- [ ] `.env` file configured with all API keys

### Local Machine
- [ ] All code ready
- [ ] `.env` file complete
- [ ] PostgreSQL connection string updated

---

## 🖥️ PART 1: Server Setup (One-Time)

### Step 1: Connect to Your VPS

```bash
# SSH into your Hostinger VPS
ssh root@your-vps-ip

# Or if you have a user account:
ssh username@your-vps-ip
```

### Step 2: Update System

```bash
# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y
```

### Step 3: Install Node.js 20.x

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Step 4: Install PostgreSQL (if not installed)

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

In PostgreSQL prompt:
```sql
CREATE DATABASE mydb;
CREATE USER postgres WITH PASSWORD 'test1234';
GRANT ALL PRIVILEGES ON DATABASE mydb TO postgres;
\q
```

### Step 5: Install PM2 Process Manager

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### Step 6: Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### Step 7: Install Certbot (for SSL)

```bash
# Install Certbot for Let's Encrypt SSL
sudo apt install -y certbot python3-certbot-nginx
```

### Step 8: Configure Firewall

```bash
# Allow SSH
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## 📦 PART 2: Deploy Your Application

### Step 1: Create Application Directory

```bash
# Create directory for your app
sudo mkdir -p /var/www/naxtap

# Change ownership to your user
sudo chown -R $USER:$USER /var/www/naxtap

# Navigate to directory
cd /var/www/naxtap
```

### Step 2: Upload Your Code

**Option A: Using Git (Recommended)**

```bash
# If using GitHub
git clone https://github.com/yourusername/naxtap.git .

# Or if using private repo
git clone https://your-username:your-token@github.com/yourusername/naxtap.git .
```

**Option B: Using SCP from Local Machine**

On your local machine:
```bash
# Navigate to your project
cd c:\Users\PMY\Downloads\lapsonuncu2\lapsonuncu2

# Upload to VPS (use your VPS IP)
scp -r * root@your-vps-ip:/var/www/naxtap/
```

**Option C: Using FTP/SFTP**
- Use FileZilla or WinSCP
- Connect to your VPS
- Upload all files to `/var/www/naxtap/`

### Step 3: Install Dependencies

```bash
cd /var/www/naxtap

# Install all dependencies
npm install
```

### Step 4: Build Backend

```bash
# Build TypeScript backend
npm run build:backend

# Verify build
ls backend/dist/  # Should show server.js
```

### Step 5: Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Optional: Seed database
npx prisma db seed
```

### Step 6: Build Frontend

```bash
# Build web frontend
npm run build:web

# Verify build
ls dist/  # Should show index.html and assets
```

### Step 7: Create Logs Directory

```bash
# Create directory for PM2 logs
mkdir -p logs
```

---

## 🔧 PART 3: Configure Nginx

### Step 1: Copy Nginx Configuration

```bash
cd /var/www/naxtap

# Copy your nginx config (this config works with HTTP initially)
sudo cp nginx.conf /etc/nginx/sites-available/naxtap

# Create symbolic link
sudo ln -s /etc/nginx/sites-available/naxtap /etc/nginx/sites-enabled/naxtap

# Remove default config
sudo rm /etc/nginx/sites-enabled/default
```

**Note:** The nginx.conf file is configured to work with HTTP initially. After running certbot in the next section, it will automatically add SSL configuration.

### Step 2: Test Nginx Configuration

```bash
# Test configuration
sudo nginx -t

# Should see: "syntax is ok" and "test is successful"
```

### Step 3: Start/Restart Nginx

```bash
# Start Nginx (if not running) or reload
sudo systemctl start nginx
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx
```

---

## 🔒 PART 4: Setup SSL Certificate

### Step 1: Ensure DNS is Configured

Before running certbot, make sure:
- `naxtap.az` points to your VPS IP
- `www.naxtap.az` points to your VPS IP (CNAME or A record)

Check DNS propagation:
```bash
nslookup naxtap.az
```

### Step 2: Get SSL Certificate

```bash
# Get SSL certificate from Let's Encrypt
sudo certbot --nginx -d naxtap.az -d www.naxtap.az

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose redirect HTTP to HTTPS (option 2)
```

### Step 3: Test SSL Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certificate will auto-renew before expiration
```

---

## 🚀 PART 5: Start Applications with PM2

### Step 1: Start Both Apps

```bash
cd /var/www/naxtap

# Start backend and frontend using PM2
pm2 start ecosystem.config.js --env production
```

### Step 2: Verify Apps are Running

```bash
# Check PM2 processes
pm2 status

# Should show:
# - naxtap-backend (status: online)
# - naxtap-frontend (status: online)
```

### Step 3: View Logs

```bash
# View all logs
pm2 logs

# View backend logs only
pm2 logs naxtap-backend

# View frontend logs only
pm2 logs naxtap-frontend
```

### Step 4: Save PM2 Configuration

```bash
# Save current processes
pm2 save

# Setup PM2 to start on boot
pm2 startup

# Copy and run the command PM2 outputs
```

---

## ✅ PART 6: Verify Deployment

### Test Backend API

```bash
# Test from VPS
curl http://localhost:3000/

# Should return: {"status":"ok","message":"API is running",...}
```

### Test Frontend

```bash
# Test from VPS
curl http://localhost:3001/

# Should return HTML
```

### Test Domain with SSL

Open browser and visit:
- `https://naxtap.az` - Should load your app
- `https://naxtap.az/api` - Should return backend response

---

## 🔧 PART 7: Useful Commands

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs

# Restart all apps
pm2 restart all

# Restart specific app
pm2 restart naxtap-backend

# Stop all apps
pm2 stop all

# Delete all apps
pm2 delete all

# Monitor resources
pm2 monit
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/naxtap_error.log

# View access logs
sudo tail -f /var/log/nginx/naxtap_access.log
```

### PostgreSQL Commands

```bash
# Connect to database
sudo -u postgres psql mydb

# In PostgreSQL prompt:
\dt              # List tables
\d table_name    # Describe table
SELECT * FROM "User" LIMIT 5;  # Query data
\q               # Exit
```

### System Commands

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
htop

# View system logs
sudo journalctl -xe
```

---

## 🔄 Updating Your Application

When you need to update your code:

```bash
# Navigate to app directory
cd /var/www/naxtap

# Pull latest code (if using Git)
git pull origin main

# Install any new dependencies
npm install

# Rebuild backend
npm run build:backend

# Rebuild frontend
npm run build:web

# Run database migrations (if any)
npx prisma migrate deploy

# Restart applications
pm2 restart all

# Check status
pm2 status
```

---

## 🐛 Troubleshooting

### Backend Won't Start

```bash
# Check backend logs
pm2 logs naxtap-backend

# Check if port 3000 is available
sudo lsof -i :3000

# Verify .env file exists
cat .env | grep DATABASE_URL

# Test database connection
npx prisma db push --preview-feature
```

### Frontend Won't Load

```bash
# Check frontend logs
pm2 logs naxtap-frontend

# Verify dist folder exists
ls -la dist/

# Check if port 3001 is available
sudo lsof -i :3001
```

### Nginx Errors

```bash
# Check nginx error log
sudo tail -f /var/log/nginx/naxtap_error.log

# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Renew certificate manually
sudo certbot renew

# Check certificate status
sudo certbot certificates

# Test nginx SSL
sudo nginx -t
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Check connection from app
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"
```

### Port Already in Use

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process (replace PID)
sudo kill -9 PID

# Or stop all PM2 processes
pm2 delete all
```

---

## 📊 Monitoring & Maintenance

### Setup Monitoring

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Set log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Monthly Maintenance

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
cd /var/www/naxtap
npm update

# Check disk space
df -h

# Clean old logs
pm2 flush
```

### Backup Database

```bash
# Backup PostgreSQL database
pg_dump -U postgres mydb > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U postgres mydb < backup_20251224.sql
```

---

## 🎯 Quick Command Reference

```bash
# Deploy/Update
cd /var/www/naxtap && git pull && npm install && npm run build:backend && npm run build:web && npx prisma migrate deploy && pm2 restart all

# View all logs
pm2 logs

# Restart everything
pm2 restart all && sudo systemctl reload nginx

# Check status
pm2 status && sudo systemctl status nginx

# Emergency stop
pm2 stop all
```

---

## ✅ Deployment Complete!

Your Naxtap marketplace should now be live at:
- **Frontend**: https://naxtap.az
- **Backend API**: https://naxtap.az/api

### Next Steps
1. Test all features thoroughly
2. Set up automated backups
3. Configure monitoring alerts
4. Deploy mobile apps to Expo
5. Submit to app stores

Good luck! 🚀
