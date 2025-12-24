# ⚡ Quick Test Reference Card

## 🔑 **Test Credentials**

```
Admin:     admin@test.com / Admin1234
Moderator: (create via admin or use existing)
User:      (register new or use existing)
```

---

## 🎯 **5-Minute Quick Test**

### **1. Admin Access (2 min)**
```
1. Login: admin@test.com / Admin1234
2. Go to: Profile → Settings → "Moderasiya paneli"
3. ✅ Check: Panel loads, stats visible
```

### **2. Moderator Access (2 min)**
```
1. Login as moderator (or create one)
2. Go to: Profile → Settings → "Moderasiya paneli"
3. ✅ Check: Panel loads, limited features
```

### **3. Operator Dashboard (1 min)**
```
1. Navigate: http://localhost:3000/operator-dashboard
2. ✅ Check: Dashboard loads, chats visible
```

---

## ✅ **What Should Work**

| Feature | Admin | Moderator | User |
|---------|-------|-----------|------|
| **Login** | ✅ | ✅ | ✅ |
| **Moderation Panel** | ✅ | ✅ | ❌ |
| **Operator Dashboard** | ✅ | ✅ | ✅ |
| **Admin Features** | ✅ | ❌ | ❌ |
| **Reports/Tickets** | ⚠️ | ⚠️ | ❌ |

**Legend:** ✅ Works | ⚠️ UI works, backend may need connection | ❌ No access

---

## 🔍 **Quick Debug**

**If panel doesn't load:**
1. Check browser console (F12) for errors
2. Verify user role: `localStorage.getItem('auth_user')`
3. Check backend is running: `http://localhost:3000/`

**If access denied:**
1. Verify role in user object
2. Check if route protection is working
3. Try logging out and back in

---

## 📍 **Key URLs**

- **Login:** `http://localhost:3000/auth/login`
- **Moderation:** `http://localhost:3000/moderation`
- **Operator:** `http://localhost:3000/operator-dashboard`
- **Settings:** Profile tab → Settings

---

**For detailed testing, see `MANUAL_TESTING_GUIDE.md`**

