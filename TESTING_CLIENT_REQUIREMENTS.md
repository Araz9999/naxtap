# Testing Guide - Client Requirements

## ✅ Setup Complete
- Website is running on http://localhost:3000
- Backend should be running on port 3000 (or configured port)

---

## 🧪 Testing Checklist

### 1. **Admin Panel** ⚠️ NEEDS IMPLEMENTATION
**Status:** ❌ Not Implemented Yet

**How to Test:**
- [ ] Login as admin user
- [ ] Navigate to admin dashboard (needs to be created)
- [ ] Test user management features
- [ ] Test system settings
- [ ] Test analytics dashboard
- [ ] Test moderator management

**Current State:** Admin panel doesn't exist yet - needs to be built

---

### 2. **Moderator Panel** ⚠️ PARTIALLY WORKING
**Status:** ⚠️ UI Exists, Backend Not Fully Connected

**How to Test:**
1. **Access Moderator Panel:**
   - Login with a user that has `role: 'moderator'` or `role: 'admin'`
   - Go to Settings → "Moderasiya paneli" (Moderation Panel)
   - OR navigate to `/moderation`

2. **Test Features:**
   - [ ] View reports dashboard
   - [ ] Manage reports (currently shows "Coming Soon")
   - [ ] Manage support tickets (currently shows "Coming Soon")
   - [ ] View moderation statistics
   - [ ] User management (currently shows "Coming Soon")
   - [ ] Moderator management (currently shows "Coming Soon")

**Current State:** UI exists but most features show "Coming Soon" - backend routes exist but not connected

---

### 3. **Operator Panel** ⚠️ NOT FUNCTIONAL
**Status:** ❌ UI Only, No Backend Integration

**How to Test:**
1. **Access Operator Panel:**
   - Navigate to `/operator-dashboard`
   - OR access from profile/settings if link exists

2. **Test Features:**
   - [ ] View operator dashboard
   - [ ] See waiting chats
   - [ ] Take/assign chats
   - [ ] Send messages in live chat
   - [ ] Close conversations
   - [ ] View operator statistics

**Current State:** UI exists but uses mock data - no real backend integration

---

### 4. **Social Login** ✅ IMPLEMENTED (Needs Testing)
**Status:** ✅ Code Exists, Needs Credential Setup

**How to Test:**
1. **Setup (First Time Only):**
   - Configure OAuth credentials in `.env`:
     ```
     GOOGLE_CLIENT_ID=your-google-client-id
     GOOGLE_CLIENT_SECRET=your-google-client-secret
     FACEBOOK_APP_ID=your-facebook-app-id
     FACEBOOK_APP_SECRET=your-facebook-app-secret
     VK_CLIENT_ID=your-vk-client-id
     VK_CLIENT_SECRET=your-vk-client-secret
     ```

2. **Test Login:**
   - [ ] Go to `/auth/login`
   - [ ] Click "Google" button
   - [ ] Complete OAuth flow
   - [ ] Verify user is logged in
   - [ ] Repeat for Facebook
   - [ ] Repeat for VK

**Current State:** Code is implemented, but needs OAuth credentials configured

---

### 5. **Phone Registration** ⚠️ PARTIAL
**Status:** ⚠️ Phone Field Exists, But No Phone-Only Registration

**How to Test:**
1. **Current Registration:**
   - [ ] Go to `/auth/register`
   - [ ] Fill in name, email, phone, password
   - [ ] Submit registration
   - [ ] Verify phone number is saved

2. **Missing Features:**
   - [ ] Phone-only registration (no email required)
   - [ ] SMS/OTP verification
   - [ ] Phone number login

**Current State:** Registration accepts phone but requires email. No SMS verification system.

---

### 6. **Payment Sections** ✅ IMPLEMENTED (Needs Testing)
**Status:** ✅ Code Exists, Needs Payriff Credentials

**How to Test:**
1. **Setup (First Time Only):**
   - Configure Payriff in `.env`:
     ```
     PAYRIFF_MERCHANT_ID=your-merchant-id
     PAYRIFF_SECRET_KEY=your-secret-key
     ```

2. **Test Payment Flows:**
   - [ ] Go to wallet page (`/wallet`)
   - [ ] Test top-up functionality
   - [ ] Test card saving (`/payment/card-save`)
   - [ ] Test payment creation (`/payment/payriff`)
   - [ ] Test saved cards (`/saved-cards`)
   - [ ] Test payment history (`/payment-history`)
   - [ ] Test transfer functionality
   - [ ] Test auto-pay features

**Current State:** Payment code is implemented, needs Payriff credentials for testing

---

## 🚀 Quick Test Steps

### Step 1: Start Backend Server
```bash
npm run start:backend
# OR
npm run server:ts
```

### Step 2: Test with Demo Users

**Create test users in backend:**
- Admin user: email: `admin@test.com`, role: `admin`
- Moderator user: email: `mod@test.com`, role: `moderator`
- Regular user: email: `user@test.com`, role: `user`

### Step 3: Test Each Feature

1. **Login/Register:**
   - Test email/password registration
   - Test social login (if credentials configured)
   - Test phone registration (partial)

2. **Moderator Panel:**
   - Login as moderator/admin
   - Go to Settings → Moderation Panel
   - Check what works vs "Coming Soon"

3. **Operator Panel:**
   - Navigate to `/operator-dashboard`
   - Check if it loads (will show mock data)

4. **Payments:**
   - Go to `/wallet`
   - Try payment flows (will need Payriff credentials)

---

## 📝 What Needs to Be Fixed

### Priority 1 (Critical):
1. ❌ **Admin Panel** - Doesn't exist, needs to be created
2. ⚠️ **Moderator Panel** - Connect backend routes to frontend
3. ❌ **Operator Panel** - Connect to backend live chat API
4. ⚠️ **Phone Registration** - Add SMS/OTP system

### Priority 2 (Testing):
5. ✅ **Social Login** - Configure OAuth credentials and test
6. ✅ **Payment Sections** - Configure Payriff and test

---

## 🔍 How to Check What's Working

1. **Open Browser Console** (F12)
2. **Check Network Tab** - See which API calls succeed/fail
3. **Check Console Errors** - See what's broken
4. **Test Each Feature** - Go through the checklist above

---

## 📞 Next Steps

After testing, we'll need to:
1. Build the Admin Panel
2. Connect Moderator Panel to backend
3. Connect Operator Panel to backend
4. Add Phone Registration with SMS
5. Test Social Login with real credentials
6. Test Payments with Payriff

Ready to start testing? Let me know what you find!

