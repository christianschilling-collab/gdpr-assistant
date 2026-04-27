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
  
  // User Switching for Admin Testing
  isImpersonating: boolean;
  originalUser: UserProfile | null;
  switchToUser: (email: string) => Promise<void>;
  switchBackToOriginal: () => void;
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
  
  // User Switching defaults
  isImpersonating: false,
  originalUser: null,
  switchToUser: async () => {},
  switchBackToOriginal: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessNotice, setAccessNotice] = useState<string | null>(null);
  
  // User Switching State
  const [originalUser, setOriginalUser] = useState<UserProfile | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const clearAccessNotice = () => setAccessNotice(null);

  // User Switching Functions (Only for christian.schilling@hellofresh.de)
  const switchToUser = async (email: string) => {
    if (!user?.email || user.email !== 'christian.schilling@hellofresh.de') {
      console.warn('User switching only allowed for christian.schilling@hellofresh.de');
      return;
    }
    
    try {
      const targetProfile = await getUserProfile(email);
      if (targetProfile) {
        // Save original user if not already impersonating
        if (!isImpersonating && userProfile) {
          setOriginalUser(userProfile);
        }
        
        setUserProfile(targetProfile);
        setIsImpersonating(true);
        
        // Save to sessionStorage for persistence across page reloads
        sessionStorage.setItem('impersonatedUser', email);
        if (!sessionStorage.getItem('originalUser')) {
          sessionStorage.setItem('originalUser', JSON.stringify(userProfile));
        }
        
        console.log(`🔄 Switched to user: ${targetProfile.displayName || targetProfile.email} (${targetProfile.role})`);
      } else {
        alert(`User ${email} not found`);
      }
    } catch (error) {
      console.error('Error switching user:', error);
      alert('Error switching user');
    }
  };
  
  const switchBackToOriginal = () => {
    if (!user?.email || user.email !== 'christian.schilling@hellofresh.de') {
      return;
    }
    
    if (originalUser) {
      setUserProfile(originalUser);
      setIsImpersonating(false);
      setOriginalUser(null);
      
      // Clear sessionStorage
      sessionStorage.removeItem('impersonatedUser');
      sessionStorage.removeItem('originalUser');
      
      console.log('🔙 Switched back to original user');
    }
  };

  async function loadUserProfile(firebaseUser: User) {
    try {
      if (firebaseUser.email) {
        console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
        console.log('🔍 Development check:', process.env.NODE_ENV === 'development');
        
        // TEMPORARY DEV MODE: Skip user profile check to unblock work
        if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
          console.log('🔓 DEV MODE: Creating temporary admin profile');
          const tempProfile: UserProfile = {
            id: firebaseUser.email,
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

          // Check for impersonation in session (for christian.schilling@hellofresh.de)
          if (firebaseUser.email === 'christian.schilling@hellofresh.de') {
            const impersonatedEmail = sessionStorage.getItem('impersonatedUser');
            const originalUserData = sessionStorage.getItem('originalUser');
            
            if (impersonatedEmail && originalUserData) {
              try {
                const impersonatedProfile = await getUserProfile(impersonatedEmail);
                if (impersonatedProfile) {
                  setOriginalUser(JSON.parse(originalUserData));
                  setUserProfile(impersonatedProfile);
                  setIsImpersonating(true);
                  console.log(`🔄 Restored impersonation: ${impersonatedProfile.displayName || impersonatedProfile.email}`);
                }
              } catch (error) {
                console.error('Error restoring impersonation:', error);
                // Clean up invalid session data
                sessionStorage.removeItem('impersonatedUser');
                sessionStorage.removeItem('originalUser');
              }
            }
          }

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
        
        // User Switching
        isImpersonating,
        originalUser,
        switchToUser,
        switchBackToOriginal,
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
