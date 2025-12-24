# 🧪 Manual Testing Guide - Role-Based Dashboards

## 📋 **Test Credentials**

Use these credentials to test different roles:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Admin** | `admin@test.com` | `Admin1234` | Full access to all features |
| **Moderator** | Create via admin panel | - | Limited permissions |
| **Regular User** | Register new or use existing | - | Basic user features |

---

## 🎯 **TEST 1: ADMIN DASHBOARD & ACCESS**

### **Step 1: Login as Admin**
1. Go to: `http://localhost:3000/auth/login`
2. Enter:
   - **Email:** `admin@test.com`
   - **Password:** `Admin1234`
3. Click **"Daxil ol"** (Login)
4. ✅ **Expected:** Should redirect to main app (tabs)

### **Step 2: Access Moderation Panel (Admin)**
1. After login, go to **Profile** tab (bottom navigation)
2. Click **Settings** (gear icon)
3. Scroll down to find **"Moderasiya paneli"** (Moderation Panel)
4. Click on it
5. ✅ **Expected:** Should open `/moderation` page

### **Step 3: Check Admin Features in Moderation Panel**
**What to verify:**

- [ ] **Statistics Dashboard Loads**
  - Total Reports count
  - Pending Reports count
  - Resolved Reports count
  - Open Tickets count
  - Active Moderators count

- [ ] **Reports Section**
  - Can see pending reports list
  - Can see resolved reports list
  - Reports show correct status (pending/resolved)

- [ ] **Tickets Section**
  - Can see open tickets
  - Can see in-progress tickets
  - Ticket status is visible

- [ ] **Moderator Management** (Admin Only)
  - Can see list of moderators
  - Can see moderator count
  - "Manage Moderators" button visible (if implemented)

- [ ] **Analytics Section**
  - Statistics cards display correctly
  - Numbers update (if backend connected)

### **Step 4: Check Admin-Only Features**
1. In Settings page, look for admin-specific options
2. ✅ **Expected:** Admin should see more options than regular users
3. Check if you can:
   - [ ] Access moderation panel
   - [ ] See system settings (if available)
   - [ ] Manage users (if available)

### **Step 5: Test Admin Redirect After Login**
1. Logout (if logged in)
2. Login as admin again
3. ✅ **Expected:** Should NOT redirect to admin dashboard automatically
4. ✅ **Expected:** Should go to main app, admin can access moderation panel via Settings

---

## 🎯 **TEST 2: MODERATOR DASHBOARD & ACCESS**

### **Step 1: Create/Login as Moderator**
**Option A: Create Moderator via Admin**
1. Login as admin (`admin@test.com`)
2. Go to Moderation Panel
3. Look for "Manage Moderators" or similar
4. Create a new moderator user
5. Note the email/password

**Option B: Use Existing Moderator**
- If moderator exists, login with their credentials

### **Step 2: Access Moderation Panel (Moderator)**
1. Login as moderator
2. Go to **Profile** → **Settings**
3. Click **"Moderasiya paneli"** (Moderation Panel)
4. ✅ **Expected:** Should open moderation panel

### **Step 3: Check Moderator Permissions**
**What to verify:**

- [ ] **Can Access Moderation Panel**
  - Panel loads without errors
  - No "Access Denied" message

- [ ] **Can View Reports**
  - Can see pending reports
  - Can see resolved reports
  - Report details visible

- [ ] **Can View Tickets**
  - Can see open tickets
  - Can see ticket status

- [ ] **Limited Permissions** (Moderator vs Admin)
  - [ ] Cannot manage moderators (if admin-only feature)
  - [ ] Cannot access admin-only settings
  - [ ] Can only see assigned reports/tickets (if implemented)

### **Step 4: Test Moderator Restrictions**
1. Try to access admin-only features
2. ✅ **Expected:** Should be blocked or not visible
3. Check if moderator sees fewer options than admin

---

## 🎯 **TEST 3: OPERATOR DASHBOARD**

### **Step 1: Access Operator Dashboard**
1. Login as any user (admin, moderator, or regular)
2. Navigate directly to: `http://localhost:3000/operator-dashboard`
3. ✅ **Expected:** Dashboard should load

### **Step 2: Check Operator Dashboard Features**
**What to verify:**

- [ ] **Dashboard Loads**
  - No errors in console
  - UI displays correctly

- [ ] **Chat Lists**
  - Waiting chats section visible
  - Active chats section visible
  - Closed chats section visible

- [ ] **Chat Management**
  - Can see chat details
  - Can select a chat
  - Chat messages display (if any)

- [ ] **Operator Actions**
  - "Take Chat" button works (if implemented)
  - Can send messages in chat
  - Can close conversations

- [ ] **Statistics**
  - Operator stats display
  - Response time shown
  - Rating shown (if available)

### **Step 3: Test Live Chat Integration**
1. Open operator dashboard
2. Check if chats load from backend
3. ✅ **Expected:** Should show real chats or empty state
4. Check browser console for API calls
5. Verify if `trpc.liveChat.getConversations` is called

---

## 🎯 **TEST 4: REGULAR USER ACCESS RESTRICTIONS**

### **Step 1: Login as Regular User**
1. Register a new user OR login with existing user account
2. ✅ **Expected:** Should NOT have admin/moderator role

### **Step 2: Try to Access Moderation Panel**
1. Go to **Profile** → **Settings**
2. ✅ **Expected:** Should NOT see "Moderasiya paneli" option
3. Try direct URL: `http://localhost:3000/moderation`
4. ✅ **Expected:** Should show "Access Denied" or redirect to login

### **Step 3: Try to Access Operator Dashboard**
1. Navigate to: `http://localhost:3000/operator-dashboard`
2. ✅ **Expected:** Should load (operator dashboard may be accessible to all)
3. Check if user can actually use operator features

---

## 🎯 **TEST 5: ROLE-BASED ROUTING**

### **Step 1: Test Login Redirects**
1. **Admin Login:**
   - Login as admin
   - ✅ **Expected:** Redirects to main app (not admin dashboard)
   - ✅ **Expected:** Can access moderation via Settings

2. **Moderator Login:**
   - Login as moderator
   - ✅ **Expected:** Redirects to main app
   - ✅ **Expected:** Can access moderation via Settings

3. **Regular User Login:**
   - Login as regular user
   - ✅ **Expected:** Redirects to main app
   - ✅ **Expected:** Cannot access moderation panel

### **Step 2: Test Direct URL Access**
1. **As Admin:**
   - Go to `/moderation` directly
   - ✅ **Expected:** Should load

2. **As Moderator:**
   - Go to `/moderation` directly
   - ✅ **Expected:** Should load

3. **As Regular User:**
   - Go to `/moderation` directly
   - ✅ **Expected:** Should show error or redirect

---

## 🎯 **TEST 6: PERMISSIONS & FEATURES**

### **Check What Each Role Can Do:**

#### **Admin Can:**
- [ ] Access moderation panel
- [ ] View all reports
- [ ] View all tickets
- [ ] Manage moderators (if implemented)
- [ ] View analytics
- [ ] Access all user features

#### **Moderator Can:**
- [ ] Access moderation panel
- [ ] View reports (assigned or all)
- [ ] View tickets
- [ ] Resolve reports (if implemented)
- [ ] Access basic user features
- [ ] ❌ Cannot manage moderators
- [ ] ❌ Cannot access admin-only settings

#### **Regular User Can:**
- [ ] Access main app features
- [ ] Create listings
- [ ] Send messages
- [ ] Use wallet/payments
- [ ] ❌ Cannot access moderation panel
- [ ] ❌ Cannot see admin features

---

## 🔍 **DEBUGGING TIPS**

### **If Something Doesn't Work:**

1. **Check Browser Console (F12)**
   - Look for errors
   - Check network requests
   - Verify API calls are successful

2. **Check User Role**
   - In console, type: `localStorage.getItem('auth_user')`
   - Verify role is correct: `"role":"ADMIN"` or `"role":"MODERATOR"`

3. **Check Backend Logs**
   - Look at terminal where backend is running
   - Check for authentication errors
   - Verify JWT token is valid

4. **Check API Responses**
   - Open Network tab in DevTools
   - Look for `/api/trpc/moderation.*` calls
   - Verify responses are 200 OK

---

## ✅ **PASS/FAIL CHECKLIST**

### **Admin Dashboard:**
- [ ] Admin can login ✅
- [ ] Admin can access moderation panel ✅
- [ ] Statistics display correctly ⚠️ (check backend connection)
- [ ] Reports section works ⚠️ (check backend connection)
- [ ] Tickets section works ⚠️ (check backend connection)
- [ ] Admin-only features visible ✅

### **Moderator Dashboard:**
- [ ] Moderator can login ✅
- [ ] Moderator can access moderation panel ✅
- [ ] Moderator sees limited options ✅
- [ ] Cannot access admin-only features ✅
- [ ] Reports/tickets display ⚠️ (check backend connection)

### **Operator Dashboard:**
- [ ] Dashboard loads ✅
- [ ] Chat lists display ⚠️ (check backend connection)
- [ ] Can interact with chats ⚠️ (check backend connection)
- [ ] Statistics display ⚠️ (check backend connection)

### **Access Control:**
- [ ] Regular users cannot access moderation ✅
- [ ] Role-based redirects work ✅
- [ ] Direct URL access is protected ✅

---

## 📝 **NOTES**

- ⚠️ **Backend Connection:** Some features may show "Coming Soon" or use mock data if backend isn't fully connected
- ✅ **UI Works:** All dashboards have UI implemented
- 🔧 **Backend Needed:** Some features need backend API integration
- 🎯 **Priority:** Focus on testing what's currently implemented

---

## 🚀 **Quick Test Commands**

```bash
# Start backend
npm run server:ts

# Start frontend (in another terminal)
npm run start:web

# Test admin login
curl -X POST http://localhost:3000/api/trpc/auth.login \
  -H "Content-Type: application/json" \
  -d '{"json":{"email":"admin@test.com","password":"Admin1234"}}'
```

---

**Test each section systematically and mark ✅ or ❌ for each item!**

