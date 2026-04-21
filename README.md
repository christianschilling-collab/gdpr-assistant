# 🤖 GDPR AI Assistant

Intelligent GDPR Request Intake & Classification System built with Next.js, Firebase, and Gemini AI.

## 🚀 Features

- **AI-Powered Classification**: Automatically classify GDPR cases using Gemini 2.0
- **Template Matching**: Match cases to response templates with confidence scoring
- **Draft Generation**: Auto-generate draft responses with placeholder filling
- **Similar Case Detection**: Find similar historical cases
- **Real-time Database**: Firebase Firestore for scalable data storage
- **Review Flagging**: Automatic flagging for high-risk cases
- **Case Management UI**: Modern React interface for managing cases

## 📋 Prerequisites

Before you begin, make sure you have:

- Node.js 18+ installed
- A Google Cloud account (for Gemini API)
- A Firebase account (free tier works fine)
- Cursor IDE installed (optional but recommended)

## 🛠️ Setup Instructions

### Step 1: Install Dependencies

First, you need to fix the npm cache issue if you haven't already:

```bash
# Run this in your terminal (requires sudo password)
sudo chown -R $(whoami) "/Users/christian.schilling/.npm"
```

Then install dependencies:

```bash
cd /Users/christian.schilling/gdpr-assistant-cursor
npm install
```

### Step 2: Set up Gemini API

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the API key

### Step 3: Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or select existing project
3. Enter project name (e.g., "gdpr-assistant")
4. Follow the setup wizard

#### Enable Firestore

1. In Firebase Console, go to "Build" > "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode"
4. Select a region (e.g., europe-west3 for Germany)

#### Get Firebase Config

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click the Web icon (`</>`)
4. Register app (name: "GDPR Assistant")
5. Copy the `firebaseConfig` object

### Step 4: Configure Environment Variables

1. Copy the example env file:
```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and fill in your credentials:
```env
GEMINI_API_KEY=your_actual_gemini_api_key
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Step 5: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 Using with Cursor IDE

### Opening in Cursor

1. Open Cursor IDE
2. File > Open Folder
3. Navigate to `/Users/christian.schilling/gdpr-assistant-cursor`
4. Click "Open"

### Cursor AI Features to Use

- **Chat**: Press `Cmd+L` to chat with Cursor AI
- **Inline Edit**: Press `Cmd+K` to edit code inline
- **Auto-complete**: Cursor provides smart code completion
- **Ask about code**: Select code and press `Cmd+L` to ask questions

### Recommended Cursor Prompts

```
"Add a new field to the GDPRCase type"
"Create a component to display case statistics"
"Add filtering by date range to the cases list"
"Implement pagination for the cases table"
```

## 📁 Project Structure

```
gdpr-assistant-cursor/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   └── cases/           # Cases endpoints
│   ├── cases/               # Cases pages
│   ├── templates/           # Templates pages
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles
├── lib/                      # Shared libraries
│   ├── firebase/            # Firebase utilities
│   │   ├── config.ts       # Firebase initialization
│   │   ├── cases.ts        # Cases CRUD
│   │   └── templates.ts    # Templates CRUD
│   ├── gemini/             # Gemini AI utilities
│   │   └── client.ts       # Gemini API client
│   └── types.ts            # TypeScript types
├── components/              # React components
├── public/                  # Static files
└── README.md               # This file
```

## 🔄 Migration from Google Apps Script

Your existing Google Apps Script logic has been migrated to:

- `Main.gs` → `lib/gemini/client.ts` + API routes
- `Classifier.gs` → `lib/gemini/client.ts` (classifyCase)
- `TemplateManager.gs` → `lib/gemini/client.ts` (matchTemplates)
- `Config.gs` → `lib/types.ts` + `.env.local`
- Spreadsheet → Firestore collections (`cases`, `templates`)

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your GitHub repository
5. Add environment variables from `.env.local`
6. Click "Deploy"

### Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

## 📝 Next Steps

1. ✅ Project structure created
2. ⏳ Add sample data to Firestore (templates, test cases)
3. ⏳ Build the Cases management UI
4. ⏳ Build the Templates management UI
5. ⏳ Create API endpoints for processing cases
6. ⏳ Add authentication (optional)
7. ⏳ Deploy to production

## 🆘 Troubleshooting

### "Cannot find module" errors

```bash
rm -rf node_modules package-lock.json
npm install
```

### Firebase connection issues

- Check that all Firebase environment variables are set correctly
- Verify your Firebase project has Firestore enabled
- Check browser console for detailed error messages

### Gemini API errors

- Verify your API key is correct
- Check you have API quota available
- Ensure you're using a supported model (gemini-2.0-flash-exp)

## 📧 Support

For questions or issues, contact Christian Schilling at christian.schilling@hellofresh.de

## 📄 License

Internal HelloFresh tool - not for public distribution
