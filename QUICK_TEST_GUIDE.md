# 🚀 Quick Testing Guide

## ✅ Website is Running!
- **Frontend:** http://localhost:3000
- **Backend:** Should be running on port 3000 (or configured port)

---

## 👤 Test Users (Pre-configured)

I've added test users to the database. Use these to test:

### 1. **Admin User**
- **Email:** `admin@test.com`
- **Password:** `Admin1234`
- **Role:** Admin
- **Use for:** Testing admin panel (when created)

### 2. **Moderator User**
- **Email:** `moderator@test.com`
- **Password:** `Mod1234`
- **Role:** Moderator
- **Use for:** Testing moderator panel

### 3. **Regular User**
- **Email:** `user@test.com`
- **Password:** `Test1234`
- **Role:** User
- **Use for:** General testing

---

## 🧪 Testing Steps

### Step 1: Start Backend Server
Open a **NEW terminal** and run:
```bash
npm run start:backend
# OR
npm run server:ts
```

Wait for: `✅ TS API running at http://0.0.0.0:3000`

### Step 2: Test Login
1. Go to http://localhost:3000
2. Click "Login" or go to `/auth/login`
3. Try logging in with:
   - `admin@test.com` / `Admin1234`
   - `moderator@test.com` / `Mod1234`
   - `user@test.com` / `Test1234`

### Step 3: Test Each Feature

#### ✅ **Moderator Panel** (Partially Working)
1. Login as `moderator@test.com` or `admin@test.com`
2. Go to **Settings** → **"Moderasiya paneli"** (Moderation Panel)
3. OR navigate directly to: http://localhost:3000/moderation
4. **What to check:**
   - ✅ Does the panel load?
   - ⚠️ Most features show "Coming Soon" - this is expected
   - ✅ Check if statistics show up
   - ✅ Check if you can see the dashboard

#### ⚠️ **Operator Panel** (UI Only)
1. Navigate to: http://localhost:3000/operator-dashboard
2. **What to check:**
   - ✅ Does the panel load?
   - ⚠️ Shows mock data (no real backend connection)
   - ✅ Check if UI displays correctly

#### ❌ **Admin Panel** (Not Created Yet)
- This needs to be built first
- Will be accessible at `/admin` or `/admin-dashboard`

#### ✅ **Social Login** (Needs OAuth Setup)
1. Go to `/auth/login`
2. Click Google/Facebook/VK buttons
3. **Expected:** Will fail if OAuth credentials not configured
4. **To make it work:** Add OAuth credentials to `.env`

#### ⚠️ **Phone Registration** (Partial)
1. Go to `/auth/register`
2. Fill in form including phone number
3. **What works:**
   - ✅ Phone field accepts input
   - ✅ Phone is saved with registration
4. **What doesn't work:**
   - ❌ Phone-only registration (still requires email)
   - ❌ SMS/OTP verification

#### ✅ **Payment Sections** (Needs Payriff Setup)
1. Login as any user
2. Go to `/wallet`
3. **What to check:**
   - ✅ Wallet page loads
   - ✅ Balance displays
   - ⚠️ Payment features need Payriff credentials
4. **Other payment pages:**
   - `/payment/payriff` - Payment page
   - `/saved-cards` - Saved cards
   - `/payment-history` - Payment history
   - `/topup` - Top-up wallet
   - `/transfer` - Transfer money

---

## 📋 Quick Test Checklist

### ✅ Can Test Now:
- [ ] Login with test users
- [ ] Moderator panel UI (most features show "Coming Soon")
- [ ] Operator panel UI (mock data)
- [ ] Registration form (with phone field)
- [ ] Payment pages UI (won't process without Payriff)

### ❌ Needs Implementation:
- [ ] Admin panel (doesn't exist)
- [ ] Moderator panel backend connection
- [ ] Operator panel backend connection
- [ ] Phone-only registration
- [ ] SMS/OTP verification

### ⚠️ Needs Configuration:
- [ ] Social login (needs OAuth credentials)
- [ ] Payments (needs Payriff credentials)

---

## 🔍 How to Check What's Broken

1. **Open Browser DevTools** (F12)
2. **Console Tab:** Check for errors
3. **Network Tab:** 
   - See which API calls fail
   - Check if backend is responding
4. **Application Tab:** 
   - Check if user is logged in
   - Check stored tokens

---

## 🐛 Common Issues

### Backend Not Running
**Error:** Network errors, API calls fail
**Fix:** Start backend with `npm run start:backend`

### Can't Login
**Error:** Login fails, wrong credentials
**Fix:** Use test users: `admin@test.com` / `Admin1234`

### Moderator Panel Shows "Coming Soon"
**Status:** Expected - backend routes exist but not connected to UI

### Operator Panel Shows Mock Data
**Status:** Expected - no backend integration yet

---

## 📝 What to Report

After testing, tell me:
1. ✅ What works
2. ❌ What's broken
3. ⚠️ What shows "Coming Soon" or mock data
4. 🔧 What needs configuration (OAuth, Payriff)

Then we'll fix the broken parts and implement the missing features!

---

**Ready to test? Start with Step 1 (start backend) and Step 2 (login)!**

