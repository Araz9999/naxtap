# ⚡ Quick Deployment Steps

## 🎯 Goal: Deploy Android/iOS Apps + Backend API

---

## Step 1: Install EAS CLI (5 minutes)

```bash
npm install -g eas-cli
eas login
```

---

## Step 2: Configure EAS Build (2 minutes)

```bash
eas build:configure
```

This will use the `eas.json` file we created.

---

## Step 3: Update Environment Variables

**For Mobile Apps** (in your `.env` or `.env.production`):

```env
NODE_ENV=production
EXPO_PUBLIC_RORK_API_BASE_URL=https://api.yourdomain.com
EXPO_PUBLIC_BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

**Important**: Replace `yourdomain.com` with your actual backend URL!

---

## Step 4: Build Android APK (10-15 minutes)

```bash
eas build --platform android --profile production
```

**What happens:**
- EAS builds your app in the cloud
- You'll get a download link
- Download the APK and install on Android devices

---

## Step 5: Build iOS IPA (10-15 minutes)

```bash
eas build --platform ios --profile production
```

**Note**: Requires Apple Developer account for App Store submission.

---

## Step 6: Deploy Backend API

### Option A: Render (Easiest - Recommended)

1. Go to https://render.com
2. Create account → New Web Service
3. Connect GitHub repo
4. Settings:
   - **Build Command**: `npm run build:backend`
   - **Start Command**: `node backend/dist/server.js`
5. Add environment variables (see `DEPLOYMENT_GUIDE.md`)
6. Deploy!

### Option B: Railway

1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Configure same as Render
4. Deploy!

---

## Step 7: Update OAuth Redirect URIs

### Google Cloud Console:
1. Go to https://console.cloud.google.com
2. APIs & Services → Credentials
3. Edit your OAuth 2.0 Client
4. Add Authorized redirect URI:
   ```
   https://api.yourdomain.com/api/auth/google/callback
   ```
5. Remove localhost URIs

### VK Developer Console:
1. Go to https://vk.com/apps?act=manage
2. Edit your app
3. Add redirect URI:
   ```
   https://api.yourdomain.com/api/auth/vk/callback
   ```

---

## Step 8: Test Everything

### Mobile App:
- [ ] Install APK/IPA on device
- [ ] Test login
- [ ] Test registration
- [ ] Test live chat (verify input works!)
- [ ] Test payment flow

### Backend API:
```bash
curl https://api.yourdomain.com/health
```

---

## ✅ Done!

Your app is now live:
- ✅ Android APK ready
- ✅ iOS IPA ready
- ✅ Backend API deployed
- ✅ All features working

---

## 🆘 Need Help?

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

