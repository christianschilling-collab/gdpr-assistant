# 🔥 Fix Firestore Permissions Error

You're seeing: **"Missing or insufficient permissions"**

This means Firebase is connected, but Firestore security rules are blocking access.

## Quick Fix (Development)

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `dach-ai-mvps`
3. **Go to Firestore Database**:
   - Click "Build" in the left sidebar
   - Click "Firestore Database"
4. **Click the "Rules" tab**
5. **Replace the rules with this** (for development/testing):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents
    // ⚠️ WARNING: This allows anyone to read/write your data
    // Only use this for development/testing!
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

6. **Click "Publish"**

## After Publishing

1. **Refresh your browser** (the GDPR Assistant page)
2. **Try clicking "View Cases" again**
3. The error should be gone!

## For Production (Later)

When you're ready for production, you'll want to add proper authentication and more restrictive rules. For now, the open rules above will let you test the application.

---

**Your Firebase Project**: `dach-ai-mvps`  
**Direct Link**: https://console.firebase.google.com/project/dach-ai-mvps/firestore/rules
