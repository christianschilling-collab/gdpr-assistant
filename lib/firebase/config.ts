/**
 * Firebase Configuration
 *
 * Setup Instructions:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project or select existing
 * 3. Go to Project Settings > General
 * 4. Under "Your apps", click "Add app" > Web
 * 5. Copy the firebaseConfig and add to .env.local
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// Check if we're in a browser environment
// Note: In Next.js API routes, we're on the server, but Firebase Client SDK can still work
const isBrowser = typeof window !== 'undefined';

// Get Firebase config from environment variables (read at runtime)
function getFirebaseConfig() {
  // In Next.js, NEXT_PUBLIC_ variables are available on both server and client
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

// Check if Firebase is properly configured
function isFirebaseConfigured() {
  const config = getFirebaseConfig();
  const hasAllValues = !!(
    config.apiKey &&
    config.authDomain &&
    config.projectId &&
    config.storageBucket &&
    config.messagingSenderId &&
    config.appId
  );
  
  const hasNoPlaceholders = !!(
    config.apiKey &&
    !config.apiKey.includes('your_') &&
    !config.apiKey.includes('your-') &&
    !config.projectId?.includes('your-')
  );
  
  return hasAllValues && hasNoPlaceholders;
}

// Initialize Firebase (only once) - with error handling
let app: FirebaseApp | null = null;
let _db: Firestore | null = null;

function initializeFirebase() {
  // If already initialized, return existing instances
  if (app && _db) {
    return { app, db: _db };
  }

  // Firebase Client SDK can work in Next.js API routes (server-side)
  // The SDK uses fetch() which is available in Node.js 18+
  // We only skip initialization if Firebase is not configured
  if (!isFirebaseConfigured()) {
    const config = getFirebaseConfig();
    const missing = [];
    if (!config.apiKey || config.apiKey.includes('your_') || config.apiKey.includes('your-')) missing.push('apiKey');
    if (!config.authDomain || config.authDomain.includes('your-')) missing.push('authDomain');
    if (!config.projectId || config.projectId.includes('your-')) missing.push('projectId');
    if (!config.storageBucket || config.storageBucket.includes('your-')) missing.push('storageBucket');
    if (!config.messagingSenderId) missing.push('messagingSenderId');
    if (!config.appId) missing.push('appId');
    
    if (missing.length > 0) {
      console.warn('Firebase: Cannot initialize. Missing or placeholder values for:', missing.join(', '));
    }
    return { app: null, db: null };
  }

  try {
    if (isFirebaseConfigured()) {
      const firebaseConfig = getFirebaseConfig();
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      _db = getFirestore(app);
      if (!_db) {
        console.error('Firebase: getFirestore returned null');
      }
    } else {
      // Log what's missing for debugging
      const config = getFirebaseConfig();
      const missing = [];
      if (!config.apiKey || config.apiKey.includes('your_') || config.apiKey.includes('your-')) missing.push('apiKey');
      if (!config.authDomain || config.authDomain.includes('your-')) missing.push('authDomain');
      if (!config.projectId || config.projectId.includes('your-')) missing.push('projectId');
      if (!config.storageBucket || config.storageBucket.includes('your-')) missing.push('storageBucket');
      if (!config.messagingSenderId) missing.push('messagingSenderId');
      if (!config.appId) missing.push('appId');
      
      if (missing.length > 0) {
        console.warn('Firebase is not fully configured. Missing or placeholder values for:', missing.join(', '));
      } else {
        console.warn('Firebase configuration check failed but all values appear to be set');
      }
    }
  } catch (error: any) {
    console.error('Firebase initialization error:', error);
    console.error('Error details:', error.message);
    app = null;
    _db = null;
  }

  return { app, db: _db };
}

// Export getter functions to ensure initialization
export function getDb(): Firestore | null {
  // Firebase Client SDK can work in Next.js API routes (Node.js 18+)
  // Initialize if not already done
  if (!_db) {
    const result = initializeFirebase();
    // Update module-level variables
    app = result.app;
    _db = result.db;
  }
  return _db;
}

export function getApp(): FirebaseApp | null {
  // Firebase Client SDK can work in Next.js API routes (Node.js 18+)
  // Initialize if not already done
  if (!app) {
    const result = initializeFirebase();
    // Update module-level variables
    app = result.app;
    _db = result.db;
  }
  return app;
}

/**
 * Throws error if Firestore is not initialized
 */
export function getDbOrThrow(): Firestore {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore is not initialized. Check your Firebase configuration.');
  }
  return db;
}

// Export db - use getDb() function instead of direct export to avoid module load issues
// For backward compatibility, we'll export null here and users should use getDb()
export const db: Firestore | null = null;
export default app;
