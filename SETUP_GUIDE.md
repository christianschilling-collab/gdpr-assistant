# 🔑 Environment Variables Setup Guide

This guide will help you configure all the required API keys and environment variables for the GDPR Assistant.

## ✅ Step 1: Files Created

- ✅ `.env.local.example` - Template file (do not commit to git)
- ✅ `.env.local` - Your actual configuration file (already created, fill in the values)

## 📋 Required API Keys

You need **2 main services** configured:

1. **Gemini API** - For AI-powered case classification
2. **Firebase** - For database storage (6 configuration values)

---

## 🤖 Gemini API Setup

### What You Need:
- `GEMINI_API_KEY` - Your Google AI Studio API key

### Where to Get It:

1. **Go to Google AI Studio**: https://aistudio.google.com/app/apikey
2. **Sign in** with your Google account
3. **Click "Create API Key"**
4. **Select or create a Google Cloud project** (you can use the default)
5. **Copy the API key** (starts with `AIza...`)

### Add to `.env.local`:
```env
GEMINI_API_KEY=AIzaSy...your_actual_key_here
```

### ✅ Status:
I can see you've already added your Gemini API key! 🎉

---

## 🔥 Firebase Setup

### What You Need:
Firebase requires **6 configuration values**:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Step-by-Step Instructions:

#### 1. Create/Select Firebase Project

1. Go to **Firebase Console**: https://console.firebase.google.com/
2. Click **"Add project"** (or select existing project)
3. Enter project name: `gdpr-assistant` (or your preferred name)
4. Click **"Continue"**
5. **Disable Google Analytics** (optional, not needed for this project) or enable if you want
6. Click **"Create project"**
7. Wait for project creation (takes ~30 seconds)
8. Click **"Continue"**

#### 2. Enable Firestore Database

1. In Firebase Console, click **"Build"** in the left sidebar
2. Click **"Firestore Database"**
3. Click **"Create database"**
4. Select **"Start in production mode"** (we'll set up security rules later)
5. Choose a **location** (recommended: `europe-west3` for Germany, or `us-central1` for US)
6. Click **"Enable"**
7. Wait for database creation (~1 minute)

#### 3. Get Firebase Configuration Values

1. In Firebase Console, click the **gear icon (⚙️)** next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **Web icon (`</>`)** to add a web app
5. Register your app:
   - **App nickname**: `GDPR Assistant` (or any name)
   - **Firebase Hosting**: Leave unchecked (optional)
   - Click **"Register app"**
6. **Copy the `firebaseConfig` object** - it looks like this:

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

#### 4. Add Values to `.env.local`

Open `.env.local` and replace the placeholder values with your actual Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...your_actual_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

**Important**: 
- Keep the `NEXT_PUBLIC_` prefix for all Firebase variables
- Use the exact values from your Firebase config
- No quotes needed around the values

---

## 🔒 Security Rules (Optional but Recommended)

After setting up Firestore, you should configure security rules:

1. In Firebase Console, go to **Firestore Database**
2. Click **"Rules"** tab
3. Replace with basic rules (adjust as needed):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents (adjust for production)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

4. Click **"Publish"**

**⚠️ Note**: The above rules allow full access. For production, implement proper authentication and authorization.

---

## ✅ Verification Checklist

After configuration, verify:

- [ ] `.env.local` file exists
- [ ] `GEMINI_API_KEY` is set (✅ Already done!)
- [ ] All 6 Firebase variables are set with `NEXT_PUBLIC_` prefix
- [ ] Firebase project has Firestore enabled
- [ ] No quotes around values in `.env.local`
- [ ] File is in `.gitignore` (should not be committed)

---

## 🧪 Test Your Configuration

After setting up, test the connection:

```bash
npm run dev
```

Then visit: http://localhost:3000

If you see errors in the console, check:
1. All environment variables are set correctly
2. Firebase project has Firestore enabled
3. API keys are valid (no extra spaces or quotes)

---

## 📚 Quick Reference Links

- **Gemini API**: https://aistudio.google.com/app/apikey
- **Firebase Console**: https://console.firebase.google.com/
- **Firebase Docs**: https://firebase.google.com/docs
- **Firestore Docs**: https://firebase.google.com/docs/firestore

---

## 🆘 Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"
- Check that `NEXT_PUBLIC_FIREBASE_API_KEY` matches your Firebase config exactly
- Ensure no extra spaces or quotes

### "Firestore permission denied"
- Check Firestore security rules
- Ensure Firestore is enabled in your Firebase project

### "Gemini API error"
- Verify your API key is correct
- Check you have API quota available
- Ensure the key hasn't been revoked

### Environment variables not loading
- Restart your Next.js dev server (`npm run dev`)
- Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Check `.env.local` is in the project root

---

## 📝 Next Steps

Once configured:
1. ✅ Test the application: `npm run dev`
2. ✅ Create your first GDPR case
3. ✅ Add response templates
4. ✅ Test AI classification

Good luck! 🚀
