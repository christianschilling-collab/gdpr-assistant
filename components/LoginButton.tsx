'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { signInWithGoogle, signOutUser } from '@/lib/firebase/auth';

export function LoginButton() {
  const { user, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  async function handleSignIn() {
    setSignInError(null);
    try {
      setSigningIn(true);
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Sign in error:', error);
      const code = error?.code ? `${error.code}: ` : '';
      const msg = error?.message || String(error);
      setSignInError(`${code}${msg}`);
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOutUser();
    } catch (error: any) {
      console.error('Sign out error:', error);
      console.error('Failed to sign out:', error);
      // Error is handled by the UI state
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg">
        Loading...
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-700">
          <div className="font-medium">{user.displayName || user.email}</div>
          <div className="text-xs text-gray-500">Signed in</div>
        </div>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={signingIn}
        className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {signingIn ? (
          <>
            <span className="animate-spin">⏳</span>
            Signing in...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </>
        )}
      </button>
      {signInError ? (
        <p className="text-sm text-red-600 max-w-md text-center" role="alert">
          {signInError}
        </p>
      ) : null}
    </div>
  );
}
