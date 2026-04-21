# 🔥 Firebase Quick Setup Guide

## Quick Steps to Configure Firebase

### 1. Go to Firebase Console
👉 **https://console.firebase.google.com/**

### 2. Create or Select Project
- Click **"Add project"** (or select existing)
- Enter project name
- Click **"Continue"** → **"Create project"**

### 3. Enable Firestore Database
1. Click **"Build"** → **"Firestore Database"**
2. Click **"Create database"**
3. Select **"Start in production mode"**
4. Choose location (e.g., `europe-west3` for Germany)
5. Click **"Enable"**

### 4. Get Configuration Values
1. Click **⚙️** (gear icon) → **"Project settings"**
2. Scroll to **"Your apps"** section
3. Click **Web icon (`</>`)** to add web app
4. Register app (nickname: "GDPR Assistant")
5. **Copy the `firebaseConfig`** values

### 5. Add to `.env.local`

Open `.env.local` in the project root and add/update these values:

```env
# Firebase Configuration (required for AI processing)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...your_actual_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

**Important:**
- ✅ Use `NEXT_PUBLIC_` prefix for all variables
- ✅ No quotes around values
- ✅ No spaces around `=`

### 6. Restart Dev Server

After updating `.env.local`:
```bash
# Stop the server (Ctrl+C) and restart:
npm run dev
```

### 7. Configure Firestore Rules (Required!)

Go to **Firestore Database** → **Rules** tab and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cases collection
    match /cases/{caseId} {
      allow read, write: if true;
    }
    // Templates collection
    match /templates/{templateId} {
      allow read, write: if true;
    }
    // Case history
    match /caseHistory/{historyId} {
      allow read, write: if true;
    }
    match /caseActivity/{activityId} {
      allow read, write: if true;
    }
  }
}
```

Click **"Publish"** to save rules.

---

## ✅ Verification

After setup, try processing a case with AI. If you see errors, check:
1. All 6 Firebase variables are set in `.env.local`
2. Dev server was restarted after changes
3. Firestore Rules are published
4. Firestore Database is enabled

---

## 🆘 Still Having Issues?

Check the browser console for specific error messages. Common issues:
- **"Missing or insufficient permissions"** → Check Firestore Rules
- **"Firebase is not configured"** → Check `.env.local` values
- **"Invalid API key"** → Verify API key is correct (no extra spaces)
