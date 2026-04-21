'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { XMarkIcon } from '@heroicons/react/24/outline';

const STORAGE_KEY = 'gdpr_onboarding_dismissed';

export function OnboardingBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY);
    setIsVisible(!dismissed && pathname !== '/onboarding');
  }, [pathname]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  const handleBannerClick = () => {
    router.push('/onboarding');
  };

  if (!isVisible) return null;

  return (
    <div
      onClick={handleBannerClick}
      className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 px-6 py-2.5 cursor-pointer hover:from-amber-100 hover:to-orange-100 transition-all shadow-sm"
      style={{ height: '44px' }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <span className="text-sm text-amber-900 font-medium">
          👋 New here? Take a 2-minute tour of the GDPR Assistant →
        </span>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-amber-200 rounded transition-colors"
          aria-label="Dismiss onboarding banner"
        >
          <XMarkIcon className="w-5 h-5 text-amber-800" />
        </button>
      </div>
    </div>
  );
}
