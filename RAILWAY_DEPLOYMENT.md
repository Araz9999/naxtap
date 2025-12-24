# Railway Deployment Guide for Naxtap Marketplace

## 🚀 Quick Start Deployment

### Prerequisites
- Railway account (https://railway.app)
- GitHub repository (recommended) or local code
- All API keys and credentials ready

---

## 📦 BACKEND DEPLOYMENT (Deploy First!)

### Step 1: Create Backend Project on Railway

1. Go to https://railway.app
2. Click **"New Project"**
3. Choose deployment method:
   - **Option A**: Connect GitHub repository (recommended)
   - **Option B**: Deploy from local directory (CLI)

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically:
   - Create a PostgreSQL instance
   - Generate `DATABASE_URL` environment variable
   - Link it to your backend service

### Step 3: Configure Backend Service

1. Click on your backend service
2. Go to **"Settings"** tab
3. Set **Root Directory**: Leave blank or set to `/` (monorepo)
4. Set **Build Command**: `npm run build:backend && npx prisma generate`
5. Set **Start Command**: `npx prisma migrate deploy && npm run start:backend`

### Step 4: Set Environment Variables

Go to **"Variables"** tab and add these:

```bash
# Auto-provided by Railway (don't set manually)
DATABASE_URL=postgresql://...

# REQUIRED - Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-64-character-random-string

# Frontend URLs
FRONTEND_URL=https://naxtap.az
EXPO_PUBLIC_FRONTEND_URL=https://naxtap.az

# Production mode
NODE_ENV=production
PORT=3000

# Payriff Payment (Get from Payriff dashboard)
PAYRIFF_MERCHANT_ID=your-merchant-id
PAYRIFF_SECRET_KEY=your-secret-key
PAYRIFF_BASE_URL=https://api.payriff.com

# Social Login - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Social Login - Facebook
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Social Login - VK
VK_CLIENT_ID=your-vk-client-id
VK_CLIENT_SECRET=your-vk-client-secret

# Email Service (Resend)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@naxtap.az
EMAIL_FROM_NAME=Naxtap
```

### Step 5: Deploy Backend

1. Click **"Deploy"** button (or push to GitHub if connected)
2. Wait for build to complete (~3-5 minutes)
3. Check deployment logs for errors
4. Copy your Railway backend URL (e.g., `https://naxtap-backend-production.up.railway.app`)

### Step 6: Add Custom Domain to Backend

1. Go to **"Settings"** → **"Networking"** → **"Custom Domain"**
2. Click **"Add Custom Domain"**
3. Enter: `api.naxtap.az`
4. Railway will provide DNS records
5. Add DNS records to your domain registrar:
   ```
   Type: CNAME
   Name: api
   Value: [Railway provides this]
   ```
6. Wait for DNS propagation (~5-60 minutes)

### Step 7: Test Backend

Visit `https://api.naxtap.az/` - you should see:
```json
{
  "status": "ok",
  "message": "API is running",
  "timestamp": "2025-12-24T..."
}
```

---

## 🌐 FRONTEND DEPLOYMENT (Deploy Second!)

### Step 1: Create Frontend Service

1. In the same Railway project, click **"+ New"** → **"Empty Service"**
2. Name it: "frontend" or "web"
3. Connect to same GitHub repo (or deploy separately)

### Step 2: Configure Frontend Service

1. Go to **"Settings"** tab
2. Set **Root Directory**: Leave blank or `/`
3. Set **Build Command**: `npm run build:web`
4. Set **Start Command**: `node server-frontend.js`

### Step 3: Set Frontend Environment Variables

Go to **"Variables"** tab and add:

```bash
# Backend API URL (use custom domain)
EXPO_PUBLIC_RORK_API_BASE_URL=https://api.naxtap.az
EXPO_PUBLIC_API_BASE_URL=https://api.naxtap.az
EXPO_PUBLIC_BACKEND_URL=https://api.naxtap.az

# Frontend URL
EXPO_PUBLIC_FRONTEND_URL=https://naxtap.az

# Optional
NODE_ENV=production
PORT=8080
```

### Step 4: Deploy Frontend

1. Click **"Deploy"**
2. Wait for build (~2-3 minutes)
3. Check logs for "✅ Frontend server running"
4. Copy Railway frontend URL

### Step 5: Add Custom Domain to Frontend

1. Go to **"Settings"** → **"Networking"** → **"Custom Domain"**
2. Add: `naxtap.az`
3. Add DNS records to your domain:
   ```
   Type: A or CNAME
   Name: @
   Value: [Railway provides]
   ```

### Step 6: Test Frontend

Visit `https://naxtap.az` - your app should load!

---

## 🔧 DNS Configuration Summary

Add these records to your domain registrar (e.g., GoDaddy, Namecheap, Cloudflare):

```dns
# Backend API
Type: CNAME
Name: api
Target: [Railway backend URL from settings]
TTL: 3600

# Frontend Web
Type: CNAME
Name: @ (or www)
Target: [Railway frontend URL from settings]
TTL: 3600

# Optional: Redirect www to root
Type: CNAME
Name: www
Target: naxtap.az
TTL: 3600
```

---

## 🧪 Testing Checklist

After deployment, test these:

### Backend API Tests
- [ ] Health check: `https://api.naxtap.az/`
- [ ] tRPC endpoint: `https://api.naxtap.az/api/trpc`
- [ ] Auth endpoints work
- [ ] Database connections successful

### Frontend Tests
- [ ] Homepage loads: `https://naxtap.az`
- [ ] Authentication flow works
- [ ] API calls to backend successful
- [ ] No CORS errors in browser console
- [ ] Images and assets load
- [ ] Mobile responsive design works

---

## 🐛 Troubleshooting

### Build Fails
- Check Railway logs for errors
- Ensure all dependencies in `package.json`
- Verify build commands are correct

### Database Connection Fails
- Check `DATABASE_URL` is set correctly
- Ensure Prisma migrations ran
- Check PostgreSQL service is running

### CORS Errors
- Verify `FRONTEND_URL` in backend matches your domain
- Check backend CORS configuration in `backend/hono.ts`

### Environment Variables Not Working
- Restart deployment after adding new variables
- Check for typos in variable names
- Ensure values don't have extra spaces

### Custom Domain Not Working
- Wait for DNS propagation (up to 24 hours, usually 1 hour)
- Check DNS records are correct with `nslookup api.naxtap.az`
- Ensure SSL certificate is active (Railway auto-generates)

---

## 📊 Railway Dashboard Tips

### Monitoring
- View logs: **"Deployments"** → **"View Logs"**
- Check metrics: **"Metrics"** tab shows CPU, memory, network usage
- Set up alerts for downtime

### Scaling
- **"Settings"** → **"Resources"** to upgrade plan
- Railway auto-scales based on plan

### Rollback
- **"Deployments"** tab shows deployment history
- Click any previous deployment to rollback

---

## 💰 Cost Estimate

- **Starter Plan**: $5/month per service
  - Backend: $5/month
  - Frontend: $5/month
  - PostgreSQL: Included
  - **Total**: ~$10/month

- **Developer Plan**: $20/month (better performance)

---

## 🎯 Next Steps After Deployment

1. ✅ Test all features thoroughly
2. ✅ Set up monitoring and alerts
3. ✅ Configure backups for database
4. ✅ Add error tracking (Sentry, etc.)
5. ✅ Deploy mobile apps to Expo
6. ✅ Submit to app stores

---

## 📱 Expo Mobile Deployment (Next Phase)

After Railway is working, deploy mobile apps:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# Build
eas build --platform android --profile production
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

Make sure to update mobile app environment to use:
```
EXPO_PUBLIC_RORK_API_BASE_URL=https://api.naxtap.az
```

---

## 🆘 Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Expo Docs: https://docs.expo.dev

Good luck with deployment! 🚀
