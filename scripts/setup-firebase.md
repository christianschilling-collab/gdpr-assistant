# 🔥 Firebase Setup Guide - Step by Step

Follow these steps to configure Firebase for your GDPR Assistant:

## Step 1: Create/Select Firebase Project

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Click "Add project"** (or select an existing project)
3. **Enter project name**: `gdpr-assistant` (or your preferred name)
4. Click **"Continue"**
5. **Google Analytics**: You can disable this (not required)
6. Click **"Create project"**
7. Wait ~30 seconds for project creation
8. Click **"Continue"**

## Step 2: Enable Firestore Database

1. In the Firebase Console, click **"Build"** in the left sidebar
2. Click **"Firestore Database"**
3. Click **"Create database"**
4. Select **"Start in production mode"** (we'll set up rules later)
5. **Choose a location**:
   - For Germany/Europe: `europe-west3` (Frankfurt)
   - For US: `us-central1`
   - Or choose closest to your users
6. Click **"Enable"**
7. Wait ~1 minute for database creation

## Step 3: Get Firebase Configuration

1. In Firebase Console, click the **gear icon (⚙️)** next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"** section
4. If you see a web app already, click on it. Otherwise:
   - Click the **Web icon (`</>`)** to add a web app
   - **App nickname**: `GDPR Assistant` (or any name)
   - **Firebase Hosting**: Leave unchecked (optional)
   - Click **"Register app"**

5. **Copy the `firebaseConfig` object** - it looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## Step 4: Update .env.local

Open `.env.local` and replace the placeholder values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...your_actual_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

**Important**: 
- Copy the exact values from your Firebase config
- No quotes needed
- Keep the `NEXT_PUBLIC_` prefix

## Step 5: Set Up Firestore Security Rules (Optional but Recommended)

1. In Firebase Console, go to **"Firestore Database"**
2. Click **"Rules"** tab
3. Replace with these basic rules (for development):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents
    // ⚠️ For production, implement proper authentication
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

4. Click **"Publish"**

## Step 6: Test Your Configuration

Run the test script:

```bash
npm run test:connections
```

You should see:
- ✅ Gemini API: PASS
- ✅ Firebase: PASS

## Step 7: Restart Dev Server

After updating `.env.local`, restart your dev server:

1. Stop the current server (Ctrl+C)
2. Run: `npm run dev`

## 🆘 Troubleshooting

### "Configuration incomplete" error
- Make sure all 6 Firebase variables are set
- Check for typos in variable names
- Ensure no quotes around values

### "Permission denied" error
- Check Firestore security rules
- Make sure Firestore is enabled in your project

### "Project not found" error
- Verify `NEXT_PUBLIC_FIREBASE_PROJECT_ID` matches your Firebase project ID
- Check Firebase Console to confirm project exists

## ✅ Quick Checklist

- [ ] Firebase project created
- [ ] Firestore Database enabled
- [ ] Web app registered in Firebase
- [ ] Configuration values copied to `.env.local`
- [ ] All 6 `NEXT_PUBLIC_FIREBASE_*` variables set
- [ ] Test script shows Firebase: ✅ PASS
- [ ] Dev server restarted

---

**Need help?** Check the main `SETUP_GUIDE.md` or Firebase documentation: https://firebase.google.com/docs
