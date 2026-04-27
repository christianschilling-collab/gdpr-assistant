'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function OnboardingDynamicPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    // Redirect any /onboarding/[id] requests back to main onboarding page
    console.log('🔄 Redirecting from /onboarding/' + params.id + ' to /onboarding');
    router.replace('/onboarding');
  }, [router, params.id]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to onboarding...</p>
      </div>
    </div>
  );
}