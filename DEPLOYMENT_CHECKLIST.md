# ✅ Railway Deployment Checklist

## 📋 Pre-Deployment Checklist

### Before You Deploy
- [ ] Railway account created
- [ ] Domain `naxtap.az` accessible
- [ ] All API keys collected:
  - [ ] JWT_SECRET generated
  - [ ] Payriff credentials
  - [ ] Google OAuth credentials
  - [ ] Facebook OAuth credentials
  - [ ] VK OAuth credentials
  - [ ] Resend API key
  - [ ] Other optional keys (Twilio, AWS, etc.)

---

## 🔧 Backend Deployment Steps

### 1. Create Railway Project
- [ ] Login to Railway
- [ ] Create new project
- [ ] Connect GitHub repo (or upload code)

### 2. Add PostgreSQL Database
- [ ] Click "+ New" → Database → PostgreSQL
- [ ] Verify `DATABASE_URL` was auto-generated
- [ ] Database is linked to backend service

### 3. Configure Backend Service
- [ ] Build command: `npm run build:backend && npx prisma generate`
- [ ] Start command: `npx prisma migrate deploy && npm run start:backend`
- [ ] Root directory: `/` (or leave blank)

### 4. Set Environment Variables
Copy from `env.production.backend.example` and set in Railway:
- [ ] `JWT_SECRET` (64+ character random string)
- [ ] `FRONTEND_URL=https://naxtap.az`
- [ ] `EXPO_PUBLIC_FRONTEND_URL=https://naxtap.az`
- [ ] `NODE_ENV=production`
- [ ] `PAYRIFF_MERCHANT_ID`
- [ ] `PAYRIFF_SECRET_KEY`
- [ ] `PAYRIFF_BASE_URL=https://api.payriff.com`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `FACEBOOK_APP_ID`
- [ ] `FACEBOOK_APP_SECRET`
- [ ] `VK_CLIENT_ID`
- [ ] `VK_CLIENT_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `EMAIL_FROM=noreply@naxtap.az`
- [ ] `EMAIL_FROM_NAME=Naxtap`

### 5. Deploy Backend
- [ ] Click "Deploy" button
- [ ] Wait for build to complete (~3-5 min)
- [ ] Check logs for errors
- [ ] Note Railway backend URL

### 6. Add Custom Domain
- [ ] Settings → Networking → Custom Domain
- [ ] Add: `api.naxtap.az`
- [ ] Copy CNAME record from Railway
- [ ] Add DNS record to domain registrar
- [ ] Wait for DNS propagation (5-60 min)

### 7. Test Backend
- [ ] Visit `https://api.naxtap.az/` - should return JSON health check
- [ ] Check tRPC endpoint: `https://api.naxtap.az/api/trpc`
- [ ] No errors in Railway logs

---

## 🌐 Frontend Deployment Steps

### 1. Create Frontend Service
- [ ] Click "+ New" → Empty Service
- [ ] Name: "frontend" or "web"
- [ ] Connect same repo (or separate deployment)

### 2. Configure Frontend Service
- [ ] Build command: `npm run build:web`
- [ ] Start command: `node server-frontend.js`
- [ ] Root directory: `/` (or leave blank)

### 3. Set Environment Variables
Copy from `env.production.frontend.example`:
- [ ] `EXPO_PUBLIC_RORK_API_BASE_URL=https://api.naxtap.az`
- [ ] `EXPO_PUBLIC_API_BASE_URL=https://api.naxtap.az`
- [ ] `EXPO_PUBLIC_BACKEND_URL=https://api.naxtap.az`
- [ ] `EXPO_PUBLIC_FRONTEND_URL=https://naxtap.az`
- [ ] `NODE_ENV=production`

### 4. Deploy Frontend
- [ ] Click "Deploy"
- [ ] Wait for build (~2-3 min)
- [ ] Check logs for "✅ Frontend server running"
- [ ] Note Railway frontend URL

### 5. Add Custom Domain
- [ ] Settings → Networking → Custom Domain
- [ ] Add: `naxtap.az`
- [ ] Copy DNS records from Railway
- [ ] Add to domain registrar
- [ ] Wait for propagation

### 6. Test Frontend
- [ ] Visit `https://naxtap.az`
- [ ] App loads correctly
- [ ] Check browser console for errors
- [ ] Test login/authentication
- [ ] Test API calls to backend
- [ ] No CORS errors

---

## 🌍 DNS Configuration

Add these records at your domain registrar:

### For api.naxtap.az (Backend)
```
Type: CNAME
Name: api
Target: [your-backend.up.railway.app]
TTL: 3600
```

### For naxtap.az (Frontend)
```
Type: CNAME or A
Name: @ (or root)
Target: [your-frontend.up.railway.app]
TTL: 3600
```

### Optional: WWW redirect
```
Type: CNAME
Name: www
Target: naxtap.az
TTL: 3600
```

---

## 🧪 Post-Deployment Testing

### Backend Tests
- [ ] Health endpoint: `https://api.naxtap.az/`
- [ ] tRPC endpoint accessible
- [ ] Database queries work
- [ ] Auth endpoints respond
- [ ] Payment endpoints configured
- [ ] Social login callbacks work

### Frontend Tests
- [ ] Homepage loads: `https://naxtap.az`
- [ ] User registration works
- [ ] User login works
- [ ] Listings display
- [ ] Search functionality
- [ ] Store pages work
- [ ] Payment flow functional
- [ ] Image uploads work
- [ ] Mobile responsive
- [ ] SSL certificate active (🔒 in browser)

### Integration Tests
- [ ] Frontend connects to backend API
- [ ] Authentication persists across refresh
- [ ] Real-time features work (chat, calls)
- [ ] Payments process correctly
- [ ] Email confirmations send
- [ ] Push notifications work

---

## ✅ Deployment Complete!

When all items are checked, your Naxtap marketplace is live! 🎉

- Backend: `https://api.naxtap.az`
- Frontend: `https://naxtap.az`
- Mobile: Coming soon (Expo deployment)

Good luck! 🚀
