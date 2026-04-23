'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, getAuthInstance, consumeAuthRedirectResult } from '@/lib/firebase/auth';
import { getUserProfile, createOrUpdateUserProfile, UserProfile, UserRole } from '@/lib/firebase/users';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  userRole: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  /** Shown after Google login if the account is not in Firestore `users` (production). */
  accessNotice: string | null;
  clearAccessNotice: () => void;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  userRole: null,
  isAdmin: false,
  loading: true,
  isAuthenticated: false,
  accessNotice: null,
  clearAccessNotice: () => {},
  refreshUserProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessNotice, setAccessNotice] = useState<string | null>(null);

  const clearAccessNotice = () => setAccessNotice(null);

  async function loadUserProfile(firebaseUser: User) {
    try {
      if (firebaseUser.email) {
        console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
        console.log('🔍 Development check:', process.env.NODE_ENV === 'development');
        
        // TEMPORARY DEV MODE: Skip user profile check to unblock work
        if (process.env.NODE_ENV === 'development') {
          console.log('🔓 DEV MODE: Creating temporary admin profile');
          const tempProfile = {
            email: firebaseUser.email,
            role: 'admin' as UserRole,
            displayName: firebaseUser.displayName || firebaseUser.email,
            isActive: true,
            createdAt: new Date(),
            lastLoginAt: new Date(),
          };
          console.log('🔓 DEV MODE: Profile created:', tempProfile);
          setUserProfile(tempProfile);
          return;
        }
        
        // Only load existing user profile - DO NOT create automatically
        const profile = await getUserProfile(firebaseUser.email);
        
        if (profile) {
          // User exists in database
          console.log('✅ User profile loaded:', profile);
          setAccessNotice(null);
          setUserProfile(profile);

          // Best-effort last login (must not block or undo profile on failure)
          try {
            const { updateDoc, doc, Timestamp } = await import('firebase/firestore');
            const { getDb } = await import('@/lib/firebase/config');
            const db = getDb();
            if (db) {
              await updateDoc(doc(db, 'users', firebaseUser.email), {
                lastLoginAt: Timestamp.now(),
              });
            }
          } catch (e) {
            console.warn('Could not update lastLoginAt (non-fatal):', e);
          }
        } else {
          // User NOT in database - deny access (production: no auto-provision)
          console.warn('⚠️ User not authorized:', firebaseUser.email);
          setAccessNotice(
            'Dieses Google-Konto ist noch nicht freigeschaltet: In Firestore fehlt ein Eintrag in der Collection „users“ mit deiner E-Mail als Dokument-ID. Bitte einen Admin oder die Person, die Firebase pflegt – danach erneut anmelden.'
          );
          setUserProfile(null);

          const { signOutUser } = await import('@/lib/firebase/auth');
          await signOutUser();
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUserProfile(null);
    }
  }

  async function refreshUserProfile() {
    if (user?.email) {
      try {
        const profile = await getUserProfile(user.email);
        setUserProfile(profile);
      } catch (error) {
        console.error('Error refreshing user profile:', error);
      }
    }
  }

  useEffect(() => {
    // Wait for Firebase Auth to restore the session from the browser.
    // getCurrentUser() is often null on the first tick; using it caused AuthGuard
    // to redirect to "/" before onAuthStateChanged fired → "/" ↔ "/board" flicker.
    if (typeof window === 'undefined') {
      return;
    }

    const auth = getAuthInstance();
    if (!auth) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const PROFILE_LOAD_MS = 25_000;

    void consumeAuthRedirectResult()
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return;
        unsubscribe = onAuthChange((firebaseUser) => {
          setUser(firebaseUser);
          if (firebaseUser) {
            let finished = false;
            const finish = () => {
              if (cancelled || finished) return;
              finished = true;
              setLoading(false);
            };
            const timeoutId = window.setTimeout(() => {
              console.warn('Auth: profile load exceeded timeout; releasing loading state.');
              finish();
            }, PROFILE_LOAD_MS);

            void loadUserProfile(firebaseUser)
              .catch((e) => console.error('loadUserProfile failed:', e))
              .finally(() => {
                window.clearTimeout(timeoutId);
                finish();
              });
          } else {
            setUserProfile(null);
            setLoading(false);
          }
        });
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        userRole: userProfile?.role || null,
        isAdmin: userProfile?.role === 'admin' && userProfile?.isActive,
        loading,
        isAuthenticated: !!user && userProfile?.isActive !== false,
        accessNotice,
        clearAccessNotice,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
