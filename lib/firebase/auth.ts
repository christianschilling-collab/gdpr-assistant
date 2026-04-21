/**
 * Firebase Authentication
 * 
 * Provides Google Sign-In for agents to track their training progress
 */

import { getApp } from './config';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';

let _auth: Auth | null = null;

export function getAuthInstance(): Auth | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!_auth) {
    const app = getApp();
    if (app) {
      _auth = getAuth(app);
    }
  }

  return _auth;
}

export async function signInWithGoogle(): Promise<User | null> {
  const auth = getAuthInstance();
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  const auth = getAuthInstance();
  if (!auth) {
    return;
  }

  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Error signing out:', error);
    throw error;
  }
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  const auth = getAuthInstance();
  if (!auth) {
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  const auth = getAuthInstance();
  if (!auth) {
    return null;
  }

  return auth.currentUser;
}
