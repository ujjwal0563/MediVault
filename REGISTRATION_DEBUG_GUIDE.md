# Registration Debug Guide

## Problem Summary

When signing up as a patient or doctor through the web app:
- ✅ The dashboard shows successfully
- ✅ No error messages appear
- ❌ User details are NOT saved in MongoDB Atlas
- ✅ Postman registration works and saves to MongoDB

## Root Cause

The frontend had a **silent fallback to "demo mode"** that was catching all API errors and hiding them from you. When the registration API call failed, instead of showing an error, it would:
1. Log to console (which you might not see)
2. Set user data locally
3. Navigate to the dashboard anyway
4. **Never actually save to MongoDB**

## Fix Applied

Updated `Register.tsx` to:
- ✅ Remove silent demo mode fallback
- ✅ Show actual API errors in an Alert dialog
- ✅ Display the real error message so you can debug

## How to Debug

### Step 1: Check if Backend is Running

```bash
# Navigate to backend directory
cd MediVault/backend

# Check if server is running
# You should see something like "Server running on port 5000"
```

If not running, start it:
```bash
npm start
# or
npm run dev
```

### Step 2: Verify BASE_URL Configuration

**File:** `MediVault/frontend/services/api.ts` (Lines 7-15)

Current configuration:
```typescript
const BASE_URL = (() => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.5.0.108:5000/api/v1';
    }
    return 'http://localhost:5000/api/v1';
  }
  return "https://medivault-cxas.onrender.com/api/v1";
})();
```

**Check:**
- For Android emulator: Uses `http://10.5.0.108:5000/api/v1`
- For iOS/Web in dev: Uses `http://localhost:5000/api/v1`
- For production: Uses `https://medivault-cxas.onrender.com/api/v1`

**Common Issues:**
1. **Wrong IP for Android:** If using Android emulator, the IP `10.5.0.108` might be wrong for your network
   - For Android Emulator, use: `http://10.0.2.2:5000/api/v1`
   - For physical Android device on same WiFi: Use your computer's local IP

2. **Web App on Different Port:** If running web on a different machine/port, `localhost` won't work
   - Find your computer's local IP address
   - Replace `localhost` with your IP (e.g., `http://192.168.1.100:5000/api/v1`)

### Step 3: Test the Registration Now

Try registering again. You should now see an **actual error message** if something fails:

**Possible errors you might see:**

#### Error: "Network error. Please check your internet connection."
**Cause:** Frontend can't reach backend
**Solutions:**
1. Ensure backend is running on port 5000
2. Check firewall isn't blocking the connection
3. Update BASE_URL with correct IP address

#### Error: "Request timed out. Please check your connection."
**Cause:** Backend is too slow or not responding
**Solutions:**
1. Check backend logs for errors
2. Restart backend server
3. Check MongoDB connection

#### Error: "Email already registered."
**Cause:** That email is already in the database
**Solution:** Use a different email or delete the existing user from MongoDB

#### Error: "Hospital ID is required for doctor registration."
**Cause:** Doctor registration missing hospital ID
**Solution:** Fill in the hospital ID field

### Step 4: Check Browser/App Console

Open developer tools and check console for errors:

**For Web:**
```
Right-click → Inspect → Console tab
```

**For React Native:**
```
In terminal where you ran `npm start` or `expo start`
Press 'j' to open debugger
```

Look for:
- Network errors
- CORS errors
- API call failures

### Step 5: Verify Backend MongoDB Connection

**File:** `MediVault/backend/src/server.js` or similar

Check:
1. MongoDB connection string is correct
2. MongoDB Atlas IP whitelist includes your IP (or use 0.0.0.0/0 for all)
3. Database user has proper permissions

### Step 6: Test API Endpoint Directly

Test if the backend endpoint is reachable:

```bash
# From your terminal
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "password123",
    "role": "patient"
  }'
```

Expected response: JSON with `token` and `user` object

### Step 7: Check CORS Configuration

If you see CORS errors in the console, check backend CORS settings:

**File:** `MediVault/backend/src/server.js` or `app.js`

Should have something like:
```javascript
const cors = require('cors');
app.use(cors({
  origin: '*', // or specific origin like 'http://localhost:19006'
  credentials: true
}));
```

## Quick Fix Checklist

- [ ] Backend server is running
- [ ] MongoDB Atlas is accessible
- [ ] BASE_URL in frontend matches where backend is running
- [ ] CORS is properly configured in backend
- [ ] No firewall blocking the connection
- [ ] Using unique email for each registration test
- [ ] For doctors: Hospital ID is provided

## Platform-Specific Solutions

### Android Emulator
```typescript
// In api.ts, change to:
if (Platform.OS === 'android') {
  return 'http://10.0.2.2:5000/api/v1'; // Use 10.0.2.2 for Android emulator
}
```

### Physical Android Device
```typescript
// Find your computer's IP on local network
// Windows: ipconfig
// Mac/Linux: ifconfig or ip addr

if (Platform.OS === 'android') {
  return 'http://192.168.1.XXX:5000/api/v1'; // Replace XXX with your IP
}
```

### Web Browser (localhost)
```typescript
// Should work as-is if backend is on same machine
return 'http://localhost:5000/api/v1';
```

### Production/Deployed
```typescript
// Uses the render.com URL
return "https://medivault-cxas.onrender.com/api/v1";
```

## How to Verify It's Working

After fixing, you should see:

1. **Success:** 
   - Redirect to dashboard
   - User appears in MongoDB Atlas
   - No error alerts

2. **Failure:**
   - Alert dialog with clear error message
   - Console logs with error details
   - User does NOT navigate to dashboard

## MongoDB Atlas Verification

To check if users are being saved:

1. Login to MongoDB Atlas (https://cloud.mongodb.com)
2. Go to your cluster
3. Click "Browse Collections"
4. Find your database (likely `medivault` or similar)
5. Find `users` collection
6. You should see newly registered users there

## Additional Notes

- The timeout is set to 120 seconds (`TIMEOUT_MS = 120000` in api.ts)
- Registration requires: firstName, lastName, email, password, role
- Doctors also require: hospitalId
- Passwords must be at least 8 characters

## Still Not Working?

If you're still having issues after trying all the above:

1. **Check backend logs** when you attempt registration
2. **Compare Postman request** with frontend request (use network tab in DevTools)
3. **Verify request payload** matches what backend expects
4. **Check if there are any middleware errors** in backend

## Testing Tips

### Test with Postman (Working)
```json
POST http://localhost:5000/api/v1/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "password123",
  "role": "patient"
}
```

### Test with Frontend (Now with Error Visibility)
Just use the registration form. If it fails, you'll see the exact error message.

## Next Steps

1. Try registering now - you should see an error if something's wrong
2. Share the error message you receive
3. Check the specific section above for that error
4. Verify MongoDB after successful registration