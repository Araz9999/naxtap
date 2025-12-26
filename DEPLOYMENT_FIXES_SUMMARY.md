# 🔧 VPS Deployment Fixes & Preparation Summary

## ✅ Changes Made

### 1. Fixed Backend Server Port
**File**: `backend/server.ts`
- **Issue**: Default port was 3001, but should be 3000 to match ecosystem.config.js and nginx.conf
- **Fix**: Changed default port from `3001` to `3000`
- **Impact**: Ensures consistency across all configuration files

### 2. Updated .gitignore
**File**: `.gitignore`
- **Issue**: Logs directory was not explicitly ignored
- **Fix**: Added `logs/` and `*.log` to .gitignore
- **Impact**: Prevents log files from being committed to repository

### 3. Fixed Nginx Configuration
**File**: `nginx.conf`
- **Issue**: Original config had SSL certificates hardcoded, which would cause nginx to fail before SSL setup
- **Fix**: Created HTTP-only configuration that works initially, certbot will add SSL automatically
- **Impact**: Allows deployment to proceed without SSL first, then certbot adds SSL configuration

### 4. Updated Deployment Guide
**File**: `VPS_DEPLOYMENT_GUIDE.md`
- **Issue**: Missing clarification about nginx config working initially without SSL
- **Fix**: Added note explaining that nginx.conf works with HTTP initially, and certbot will add SSL
- **Impact**: Clearer instructions for deployment process

### 5. Created Comprehensive Deployment Checklist
**File**: `DEPLOYMENT_CHECKLIST_FINAL.md`
- **New**: Complete step-by-step checklist for VPS deployment
- **Includes**: Pre-deployment requirements, all phases, troubleshooting, and useful commands
- **Impact**: Easier to follow deployment process

---

## 📋 Pre-Deployment Checklist

Before pushing to GitHub and deploying, ensure:

- [ ] All code changes committed
- [ ] `.env` file is **NOT** committed (already in .gitignore ✓)
- [ ] `.env.example` has all required variables documented
- [ ] Database credentials are ready
- [ ] Domain DNS is configured (naxtap.az → VPS IP)
- [ ] All API keys are collected for .env file

---

## 🚀 Quick Deployment Steps

### 1. Push Code to GitHub
```bash
git add .
git commit -m "Prepare for VPS deployment - fixed configurations"
git push origin main
```

### 2. On VPS Server

#### Initial Setup (One-Time)
```bash
# Connect to VPS
ssh root@your-vps-ip

# Install Node.js, PM2, Nginx, Certbot, PostgreSQL
# (See DEPLOYMENT_CHECKLIST_FINAL.md for detailed commands)
```

#### Deploy Application
```bash
# Create app directory
sudo mkdir -p /var/www/naxtap
sudo chown -R $USER:$USER /var/www/naxtap
cd /var/www/naxtap

# Clone repository
git clone https://github.com/yourusername/naxtap.git .

# Setup environment
cp env.example .env
nano .env  # Edit with your actual values

# Install and build
npm install
npm run build:backend
npx prisma generate
npx prisma migrate deploy
npm run build:web
mkdir -p logs

# Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/naxtap
sudo ln -s /etc/nginx/sites-available/naxtap /etc/nginx/sites-enabled/naxtap
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL
sudo certbot --nginx -d naxtap.az -d www.naxtap.az

# Start applications
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Follow instructions
```

---

## 🔑 Critical Environment Variables

Your `.env` file on the VPS must have these minimum variables:

```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://naxtap.az
EXPO_PUBLIC_FRONTEND_URL=https://naxtap.az
EXPO_PUBLIC_RORK_API_BASE_URL=https://naxtap.az
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=<generate-strong-random-string>
```

Generate JWT_SECRET:
```bash
openssl rand -base64 64
```

---

## 🎯 Configuration Summary

| Component | Port | Configuration File |
|-----------|------|-------------------|
| Backend API | 3000 | `backend/dist/server.js` (via PM2) |
| Frontend | 3001 | `server-frontend.js` (via PM2) |
| Nginx | 80/443 | `/etc/nginx/sites-available/naxtap` |
| PostgreSQL | 5432 | Configured via DATABASE_URL |

---

## 📝 Files Modified

1. ✅ `backend/server.ts` - Fixed default port
2. ✅ `.gitignore` - Added logs directory
3. ✅ `nginx.conf` - HTTP-only initial configuration
4. ✅ `VPS_DEPLOYMENT_GUIDE.md` - Added clarification notes
5. ✅ `DEPLOYMENT_CHECKLIST_FINAL.md` - Created comprehensive checklist
6. ✅ `DEPLOYMENT_FIXES_SUMMARY.md` - This file

---

## ✅ Verification Steps

After deployment, verify:

1. **Backend is running**:
   ```bash
   curl http://localhost:3000/
   # Should return: {"status":"ok","message":"API is running",...}
   ```

2. **Frontend is running**:
   ```bash
   curl http://localhost:3001/
   # Should return HTML
   ```

3. **PM2 status**:
   ```bash
   pm2 status
   # Both apps should be "online"
   ```

4. **Domain access**:
   - Visit: `https://naxtap.az`
   - Visit: `https://naxtap.az/api`
   - Both should work

5. **SSL Certificate**:
   ```bash
   sudo certbot certificates
   # Should show valid certificate for naxtap.az
   ```

---

## 🆘 Common Issues & Solutions

### Issue: Backend won't start
**Solution**: Check `.env` file has DATABASE_URL and JWT_SECRET set correctly

### Issue: Nginx won't start
**Solution**: Run `sudo nginx -t` to check configuration syntax

### Issue: SSL certificate fails
**Solution**: Ensure DNS is properly configured and points to VPS IP

### Issue: PM2 apps keep restarting
**Solution**: Check logs with `pm2 logs` to see error messages

---

## 📚 Additional Documentation

- **Detailed Guide**: `VPS_DEPLOYMENT_GUIDE.md`
- **Quick Checklist**: `DEPLOYMENT_CHECKLIST_FINAL.md`
- **Quick Commands**: `VPS_QUICK_COMMANDS.md`

---

## ✨ Ready for Deployment!

All configurations have been fixed and verified. You can now:
1. Push the code to GitHub
2. Follow the deployment steps on your VPS
3. Your application will be live at https://naxtap.az

Good luck with your deployment! 🚀

