// Script to set yourself as admin on first login
// Run this once after signing in for the first time

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Your Firebase config from .env.local
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function setAdmin(email: string) {
  try {
    await setDoc(doc(db, 'users', email), {
      email,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    }, { merge: true });
    
    console.log(`✅ ${email} is now an admin!`);
  } catch (error) {
    console.error('Error setting admin:', error);
  }
}

// Run this:
setAdmin('christian.schilling@hellofresh.de');
