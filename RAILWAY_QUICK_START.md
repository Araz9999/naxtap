# 🚀 Naxtap Railway Deployment - Quick Start

## Files Created for Deployment

### Configuration Files
1. **`railway.backend.json`** - Railway config for backend service
2. **`railway.frontend.json`** - Railway config for frontend service
3. **`Procfile.backend`** - Fallback backend deployment config
4. **`server-frontend.js`** - Production web server for frontend

### Environment Templates
5. **`env.production.backend.example`** - Backend environment variables template
6. **`env.production.frontend.example`** - Frontend environment variables template

### Documentation
7. **`RAILWAY_DEPLOYMENT.md`** - Complete deployment guide with step-by-step instructions
8. **`DEPLOYMENT_CHECKLIST.md`** - Checklist to track deployment progress

### Updated Files
9. **`package.json`** - Added deployment scripts:
   - `deploy:backend` - Full backend deployment
   - `deploy:web` - Full frontend deployment

---

## 🎯 What to Do Next

### Step 1: Prepare Your API Keys
Gather these credentials before deploying:

**REQUIRED:**
- JWT_SECRET (generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- Payriff credentials (merchant ID & secret key)
- Resend API key (for emails)

**For Social Login:**
- Google OAuth credentials
- Facebook OAuth credentials
- VK OAuth credentials

### Step 2: Deploy Backend First
1. Create Railway account at https://railway.app
2. Create new project
3. Add PostgreSQL database
4. Deploy backend service
5. Set environment variables from `env.production.backend.example`
6. Configure custom domain: `api.naxtap.az`

### Step 3: Deploy Frontend Second
1. Add new service to same Railway project
2. Deploy frontend service
3. Set environment variables from `env.production.frontend. example`
4. Configure custom domain: `naxtap.az`

### Step 4: Test Everything
Use `DEPLOYMENT_CHECKLIST.md` to verify:
- Backend health check works
- Frontend loads correctly
- Authentication works
- API calls successful
- No CORS errors

---

## 📝 Important Notes

### Domain Configuration
You'll need to add DNS records at your domain registrar:
- `api.naxtap.az` → Backend (CNAME to Railway)
- `naxtap.az` → Frontend (CNAME to Railway)

### Cost
- **Backend + Database**: ~$5/month
- **Frontend**: ~$5/month
- **Total**: ~$10/month on Railway Hobby plan

### Environment Variables
**CRITICAL**: Never commit `.env` files to Git. Railway provides a secure way to set environment variables in their dashboard.

---

## 📚 Full Documentation

For detailed instructions, refer to:
1. **`RAILWAY_DEPLOYMENT.md`** - Complete deployment guide
2. **`DEPLOYMENT_CHECKLIST.md`** - Step-by-step checklist
3. **`deployment_strategy.md`** (in artifacts folder) - Strategy overview

---

## ✅ Your Code is Ready!

Everything is configured and ready for Railway deployment. Just follow the guides and you'll be live in ~1-2 hours!

**Deploy order:**
1. ⭐ Backend first (with PostgreSQL)
2. 🌐 Frontend second (web app)
3. 📱 Expo mobile app last (after Railway is stable)

Good luck with your deployment! 🎉
