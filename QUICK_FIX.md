# 🚨 Quick Fix for "Missing or insufficient permissions"

## The Problem
You're seeing: **"Missing or insufficient permissions"** in the browser.

This means Firebase is connected, but Firestore security rules are blocking access.

## The Solution (2 minutes)

### Step 1: Open Firestore Rules
Click this link (or copy-paste into browser):
```
https://console.firebase.google.com/project/dach-ai-mvps/firestore/rules
```

### Step 2: Replace the Rules
Delete everything in the rules editor and paste this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Step 3: Publish
1. Click the **"Publish"** button (top right)
2. Wait for confirmation (usually 1-2 seconds)

### Step 4: Test
1. Go back to your browser: http://localhost:3001
2. Click **"View Cases"** or **"View Templates"**
3. The error should be gone! ✅

---

## Why This Works
- Your Firebase is **already configured correctly** ✅
- The connection is **working** ✅  
- The only issue is **security rules blocking access** ❌
- The rules above allow read/write access (for development)

## For Production Later
When you're ready for production, you'll want to add proper authentication and restrict access. For now, this lets you test the app.

---

**Still not working?** Make sure you:
1. Clicked "Publish" (not just "Save")
2. Refreshed your browser page
3. Waited a few seconds after publishing
