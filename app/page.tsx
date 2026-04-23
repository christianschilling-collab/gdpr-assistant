'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { LoginButton } from '@/components/LoginButton';
import { postAuthRedirectPath } from '@/lib/firebase/users';

export default function Home() {
  const router = useRouter();
  const { user, userProfile, loading, accessNotice } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (!userProfile) return;
    router.replace(postAuthRedirectPath(userProfile.role));
  }, [loading, user, userProfile, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50 px-4">
        <h1 className="text-2xl font-semibold text-gray-900">GDPR Assistant</h1>
        <p className="text-gray-600 text-center max-w-md">
          Sign in with your Google account to continue.
        </p>
        {accessNotice ? (
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 max-w-lg text-center">
            {accessNotice}
          </p>
        ) : null}
        <LoginButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}
