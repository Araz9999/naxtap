# 🚀 Complete Deployment Guide - Naxtap Marketplace

## 📋 Overview

This guide will help you deploy:
1. **Android & iOS Apps** via Expo EAS Build (Primary)
2. **Backend API** (Hono/tRPC server)
3. **Web Version** (Optional, secondary)

---

## 🎯 Part 1: Mobile Apps (Android & iOS) - Expo EAS

### Prerequisites

1. **Expo Account**: Sign up at https://expo.dev
2. **EAS CLI**: Install globally
   ```bash
   npm install -g eas-cli
   ```
3. **Login to Expo**:
   ```bash
   eas login
   ```

### Step 1: Configure EAS

1. **Initialize EAS** (if not already done):
   ```bash
   eas build:configure
   ```

2. **Update `eas.json`** (already created):
   - Review the `eas.json` file
   - Update iOS bundle identifier if needed: `com.naxtap.marketplace`
   - Update Android package name if needed: `com.naxtap.marketplace`

### Step 2: Set Production Environment Variables

Create `.env.production` or update your `.env`:

```env
# Production Environment Variables
NODE_ENV=production

# Backend API URL (Your deployed backend)
EXPO_PUBLIC_RORK_API_BASE_URL=https://api.yourdomain.com
EXPO_PUBLIC_BACKEND_URL=https://api.yourdomain.com

# Frontend URL (if you deploy web)
FRONTEND_URL=https://yourdomain.com

# Expo Router
EXPO_ROUTER_APP_ROOT=./app
EXPO_ROUTER_IMPORT_MODE=eager
```

### Step 3: Build Android APK

```bash
# Build production APK
eas build --platform android --profile production

# Or build preview APK for testing
eas build --platform android --profile preview
```

**What happens:**
- EAS builds your app in the cloud
- You'll get a download link for the APK
- APK can be installed directly on Android devices

### Step 4: Build iOS IPA

```bash
# Build production IPA
eas build --platform ios --profile production

# Or build preview for testing
eas build --platform ios --profile preview
```

**Requirements:**
- Apple Developer Account ($99/year)
- Configure in `eas.json` → `submit.production.ios`
- Or use TestFlight for internal testing

### Step 5: Submit to Stores (Optional)

**Android (Google Play Store):**
```bash
eas submit --platform android --profile production
```

**iOS (App Store):**
```bash
eas submit --platform ios --profile production
```

---

## 🌐 Part 2: Backend API Deployment

### Option A: Deploy to Render (Recommended - Easiest)

1. **Create Render Account**: https://render.com

2. **Create New Web Service**:
   - Connect your GitHub repository
   - Build Command: `npm run build:backend`
   - Start Command: `node backend/dist/server.js`
   - Environment: `Node`

3. **Set Environment Variables** in Render dashboard:
   ```env
   NODE_ENV=production
   PORT=3000
   FRONTEND_URL=https://yourdomain.com
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   JWT_SECRET=your-super-secret-jwt-key-here
   PAYRIFF_MERCHANT_ID=your-payriff-merchant-id
   PAYRIFF_SECRET_KEY=your-payriff-secret-key
   PAYRIFF_BASE_URL=https://api.payriff.com
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   VK_CLIENT_ID=your-vk-client-id
   VK_CLIENT_SECRET=your-vk-client-secret
   RESEND_API_KEY=your-resend-api-key
   EMAIL_FROM=your-verified-email@yourdomain.com
   EMAIL_FROM_NAME=NaxtaPaz
   SMS_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_PHONE_NUMBER=your-twilio-number
   ```

4. **Deploy**: Render will automatically build and deploy

5. **Get Backend URL**: `https://your-app-name.onrender.com`

### Option B: Deploy to Railway

1. **Create Railway Account**: https://railway.app

2. **New Project** → Deploy from GitHub

3. **Configure**:
   - Root Directory: `/`
   - Build Command: `npm run build:backend`
   - Start Command: `node backend/dist/server.js`

4. **Set Environment Variables** (same as Render above)

5. **Deploy**: Railway auto-deploys on git push

### Option C: Deploy to VPS (DigitalOcean/Hetzner)

See `DEPLOYMENT_COMPLETE_GUIDE.md` for detailed VPS setup.

**Quick Steps:**
```bash
# 1. SSH to server
ssh root@your-server-ip

# 2. Install Node.js, PM2, Nginx
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs nginx
npm install -g pm2

# 3. Clone repository
cd /var/www
git clone https://github.com/your-username/naxtap.git
cd naxtap

# 4. Install dependencies
npm install

# 5. Build backend
npm run build:backend

# 6. Create .env file
nano .env
# (paste production environment variables)

# 7. Start with PM2
pm2 start backend/dist/server.js --name naxtap-api
pm2 save
pm2 startup

# 8. Configure Nginx (reverse proxy)
# See DEPLOYMENT_COMPLETE_GUIDE.md for Nginx config
```

---

## 🌍 Part 3: Web Deployment (Optional)

### Deploy to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Build Web Bundle**:
   ```bash
   npm run build:web
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables** in Vercel dashboard:
   ```env
   EXPO_PUBLIC_RORK_API_BASE_URL=https://api.yourdomain.com
   EXPO_PUBLIC_BACKEND_URL=https://api.yourdomain.com
   ```

---

## ✅ Pre-Deployment Checklist

### Security

- [ ] Rate limiting enabled in production (already configured)
- [ ] Strong JWT_SECRET generated
- [ ] All API keys updated for production
- [ ] OAuth redirect URIs updated in Google/VK consoles
- [ ] HTTPS enabled (SSL certificates)

### Environment Variables

- [ ] `NODE_ENV=production`
- [ ] `FRONTEND_URL` set to production domain
- [ ] `EXPO_PUBLIC_RORK_API_BASE_URL` points to deployed backend
- [ ] Database URL configured
- [ ] All payment/social login credentials updated

### OAuth Configuration

- [ ] **Google Cloud Console**:
  - Add redirect URI: `https://api.yourdomain.com/api/auth/google/callback`
  - Remove localhost redirect URIs

- [ ] **VK Developer Console**:
  - Add redirect URI: `https://api.yourdomain.com/api/auth/vk/callback`
  - Remove localhost redirect URIs

### Database

- [ ] Production database created
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Database backups configured

### Testing

- [ ] Test registration flow
- [ ] Test login (email + Google OAuth)
- [ ] Test payment flow
- [ ] Test admin/moderator dashboards
- [ ] Test live chat (Android/iOS)

---

## 🚀 Quick Start Commands

### Build Mobile Apps:
```bash
# Android APK
eas build --platform android --profile production

# iOS IPA
eas build --platform ios --profile production
```

### Deploy Backend (Render):
1. Push code to GitHub
2. Connect repo in Render dashboard
3. Set environment variables
4. Deploy (automatic)

### Deploy Backend (VPS):
```bash
ssh root@your-server
cd /var/www/naxtap
git pull
npm install
npm run build:backend
pm2 restart naxtap-api
```

---

## 📱 Testing After Deployment

### Mobile Apps:

1. **Download APK/IPA** from EAS build page
2. **Install on device**:
   - Android: Transfer APK and install
   - iOS: Install via TestFlight or direct install
3. **Test**:
   - Login/Registration
   - Live chat (verify input works correctly)
   - Payment flow
   - All features

### Backend API:

```bash
# Test API health
curl https://api.yourdomain.com/health

# Test tRPC endpoint
curl -X POST https://api.yourdomain.com/api/trpc/auth.status \
  -H "Content-Type: application/json"
```

---

## 🔧 Troubleshooting

### Mobile App Issues:

**Build fails:**
- Check `eas.json` configuration
- Verify environment variables
- Check Expo account status

**App crashes on startup:**
- Verify `EXPO_PUBLIC_RORK_API_BASE_URL` is correct
- Check backend is accessible
- Review app logs: `eas build:list`

### Backend Issues:

**API not responding:**
- Check PM2 status: `pm2 status`
- Check logs: `pm2 logs naxtap-api`
- Verify port is open: `netstat -tlnp | grep 3000`

**Database connection errors:**
- Verify `DATABASE_URL` is correct
- Check database is accessible
- Run migrations: `npx prisma migrate deploy`

---

## 📞 Support

If you encounter issues:
1. Check logs first
2. Verify all environment variables
3. Test backend API directly
4. Check Expo EAS build logs

---

## 🎉 Deployment Complete!

Once deployed:
- ✅ Android APK ready for distribution
- ✅ iOS IPA ready for TestFlight/App Store
- ✅ Backend API live and accessible
- ✅ Web version (optional) deployed

**Your app is now live! 🚀**
