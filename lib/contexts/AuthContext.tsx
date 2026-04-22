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
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  userRole: null,
  isAdmin: false,
  loading: true,
  isAuthenticated: false,
  refreshUserProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
          
          // Update last login time
          const { updateDoc, doc, Timestamp } = await import('firebase/firestore');
          const { getDb } = await import('@/lib/firebase/config');
          const db = getDb();
          if (db) {
            await updateDoc(doc(db, 'users', firebaseUser.email), {
              lastLoginAt: Timestamp.now(),
            });
          }
          
          setUserProfile(profile);
        } else {
          // User NOT in database - deny access
          console.warn('⚠️ User not authorized:', firebaseUser.email);
          setUserProfile(null);
          
          // Sign out unauthorized user
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

    void consumeAuthRedirectResult().finally(() => {
      if (cancelled) return;
      unsubscribe = onAuthChange((firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          loadUserProfile(firebaseUser).finally(() => setLoading(false));
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
