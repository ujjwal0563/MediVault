# Quick Fix Guide - Registration Not Saving to MongoDB

## What Was Wrong?

Your app was silently falling back to "demo mode" when the API failed, so users appeared to be registered but were never saved to MongoDB.

## What Was Fixed?

✅ **Removed silent demo mode fallback** - Now you'll see actual error messages
✅ **Centralized API configuration** - Easier to configure backend URL
✅ **Better error handling** - Shows you exactly what went wrong

---

## Quick Setup (Choose Your Scenario)

### 🌐 Scenario 1: Web Browser (Same Computer as Backend)
**No changes needed!** Should work as-is if backend is running on `localhost:5000`

### 🤖 Scenario 2: Android Emulator
**File:** `MediVault/frontend/services/config.ts`
```typescript
// Line 23 - Change to:
const DEV_ANDROID_EMULATOR_URL = 'http://10.0.2.2:5000/api/v1';
```

### 📱 Scenario 3: Physical Device (Phone/Tablet on Same WiFi)

**Step 1:** Find your computer's IP address
- **Windows:** Open CMD → Run `ipconfig` → Look for "IPv4 Address" (e.g., 192.168.1.100)
- **Mac/Linux:** Open Terminal → Run `ifconfig` → Look for "inet" (e.g., 192.168.1.100)

**Step 2:** Update config file
**File:** `MediVault/frontend/services/config.ts`
```typescript
// Line 30 - Replace with your IP:
const DEV_LOCAL_NETWORK_URL = 'http://YOUR_IP_HERE:5000/api/v1';
// Example: const DEV_LOCAL_NETWORK_URL = 'http://192.168.1.100:5000/api/v1';

// Line 47 - Set to true:
const USE_PHYSICAL_DEVICE = true;
```

### 🚀 Scenario 4: Testing Production Backend
**File:** `MediVault/frontend/services/config.ts`
```typescript
// Line 53 - Set to true:
const USE_PRODUCTION_IN_DEV = true;
```

---

## Testing the Fix

### 1. Start Backend
```bash
cd MediVault/backend
npm start
```
✅ Should see: "Server running on port 5000"

### 2. Start Frontend
```bash
cd MediVault/frontend
npm start
```

### 3. Try Registering
When you register now, you'll either:
- ✅ **Success:** Redirected to dashboard + user saved in MongoDB
- ❌ **Error:** Alert showing the actual problem (network, validation, etc.)

### 4. Verify in MongoDB Atlas
1. Go to https://cloud.mongodb.com
2. Browse Collections → Your Database → `users` collection
3. You should see the new user!

---

## Common Errors & Solutions

### ❌ "Network error. Please check your internet connection."
**Problem:** Frontend can't reach backend

**Solutions:**
1. ✅ Ensure backend is running
2. ✅ Check BASE_URL in `config.ts` matches where backend is running
3. ✅ Disable firewall temporarily to test
4. ✅ For physical devices: Make sure computer and device are on same WiFi

### ❌ "Request timed out. Please check your connection."
**Problem:** Backend is slow or not responding

**Solutions:**
1. ✅ Check backend console for errors
2. ✅ Restart backend server
3. ✅ Verify MongoDB connection in backend

### ❌ "Email already registered."
**Problem:** Email already exists in database

**Solutions:**
1. ✅ Use a different email
2. ✅ Delete user from MongoDB Atlas
3. ✅ Clear your test data

### ❌ "Hospital ID is required for doctor registration."
**Problem:** Missing required field for doctors

**Solution:**
✅ Fill in the Hospital ID field (e.g., "HOSP-2024-001")

---

## Quick Configuration Reference

### Current Setup (config.ts)

| Platform/Device | URL Variable | Default Value |
|----------------|--------------|---------------|
| Web/iOS Simulator | `DEV_LOCALHOST_URL` | `http://localhost:5000/api/v1` |
| Android Emulator | `DEV_ANDROID_EMULATOR_URL` | `http://10.0.2.2:5000/api/v1` |
| Physical Device | `DEV_LOCAL_NETWORK_URL` | Update with your IP |
| Production | `PROD_API_URL` | `https://medivault-cxas.onrender.com/api/v1` |

### Toggle Switches (config.ts)

```typescript
const USE_PHYSICAL_DEVICE = false;      // Set true for phone/tablet
const USE_PRODUCTION_IN_DEV = false;    // Set true to test prod API
```

---

## Verification Checklist

Before testing, ensure:
- [ ] Backend server is running on port 5000
- [ ] MongoDB Atlas connection is working
- [ ] Frontend `config.ts` has correct URL for your setup
- [ ] Both frontend and backend are on same network (for physical devices)
- [ ] No firewall blocking the connection
- [ ] Using a unique email for each test

---

## How to See API Logs

The app now logs API configuration on startup. Check console for:
```
==================================================
🔧 API CONFIGURATION
==================================================
Environment: DEVELOPMENT
Platform: web
Base URL: http://localhost:5000/api/v1
Timeout: 120000 ms
API Logging: Enabled
==================================================
```

This helps you confirm the app is using the correct URL!

---

## Still Not Working?

1. **Check backend logs** when you try to register
2. **Open browser DevTools** (F12) → Network tab → See the actual request
3. **Compare with Postman** - Check if frontend sends same data as Postman
4. **Share the error message** you see in the Alert dialog

---

## Files Modified

✅ `MediVault/frontend/app/screens/Register.tsx` - Removed demo mode fallback
✅ `MediVault/frontend/services/api.ts` - Updated to use centralized config
✅ `MediVault/frontend/services/config.ts` - New configuration file (EDIT THIS!)

---

## Need Help?

Check the detailed guide: `REGISTRATION_DEBUG_GUIDE.md`
