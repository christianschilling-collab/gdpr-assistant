import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

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

async function createUserProfile() {
  const email = 'christian.schilling@hellofresh.de';
  
  const userProfile = {
    email: email,
    role: 'admin',
    displayName: 'Christian Schilling',
    isActive: true,
    createdAt: Timestamp.now(),
    lastLoginAt: Timestamp.now(),
  };

  try {
    await setDoc(doc(db, 'users', email), userProfile);
    console.log('✅ User profile created successfully for:', email);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user profile:', error);
    process.exit(1);
  }
}

createUserProfile();
