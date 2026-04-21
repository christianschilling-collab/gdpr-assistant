'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/contexts/AuthContext';
import { formatRecentCaseTime } from '@/lib/utils/recentCases';
import { OnboardingBanner } from './OnboardingBanner';

export function Navigation() {
  const pathname = usePathname();
  const { user, isAdmin, userProfile, userRole } = useAuth();
  const [recentCases, setRecentCases] = useState<Array<{ id: string; caseId: string; title: string }>>([]);

  // Load recent cases from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('recentCases');
    if (recent) {
      try {
        setRecentCases(JSON.parse(recent).slice(0, 5));
      } catch (e) {
        console.error('Error parsing recent cases:', e);
      }
    }
  }, [pathname]); // Reload when route changes

  // Debug logging
  useEffect(() => {
    console.log('🔍 Navigation Debug:');
    console.log('  - User email:', user?.email);
    console.log('  - User profile:', userProfile);
    console.log('  - User role:', userRole);
    console.log('  - isAdmin:', isAdmin);
  }, [user, userProfile, userRole, isAdmin]);

  // TEMPORARY FALLBACK: Check email directly if Firestore profile not loaded yet
  const ADMIN_EMAILS = [
    'christian.schilling@hellofresh.com',
    'christian.schilling@ext.hellofresh.com',
    'christian.schilling@hellofresh.de',
  ];
  const isAdminByEmail = user?.email && ADMIN_EMAILS.includes(user.email);
  const hasAdminAccess = isAdmin || isAdminByEmail;

  const isAdminPage = pathname?.startsWith('/admin');
  const isTrainingPage = pathname?.startsWith('/training');
  const isBoardPage = pathname === '/board';

  // Dark mode styling for board page
  const navBg = isBoardPage ? 'bg-[#111827] border-gray-800' : 'bg-white border-gray-200';
  const textColor = isBoardPage ? 'text-white' : 'text-gray-600';
  const textColorHover = isBoardPage ? 'hover:text-[#6abf69]' : 'hover:text-gray-900';
  const activeBg = isBoardPage ? 'bg-[#1a2332]' : 'bg-blue-100';
  const activeText = isBoardPage ? 'text-[#6abf69]' : 'text-blue-700';
  const hoverBg = isBoardPage ? 'hover:bg-[#1a2332]' : 'hover:bg-gray-100';
  
  // Special styling for Board link when active
  const boardActiveBg = isBoardPage ? 'bg-[#1a2332]' : 'bg-blue-100';
  const boardActiveText = isBoardPage ? 'text-[#6abf69]' : 'text-blue-700';

  return (
    <>
      <nav className={`border-b shadow-sm ${navBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <Image 
                src="/hellofresh-logo.png" 
                alt="HelloFresh Logo" 
                width={180} 
                height={56}
                priority
                className="object-contain"
                style={{ 
                  mixBlendMode: isBoardPage ? 'normal' : 'multiply', 
                  filter: isBoardPage ? 'brightness(0) invert(1)' : 'none',
                  width: '180px',
                  height: 'auto',
                  maxHeight: '56px'
                }}
              />
            </Link>
            <div className={`h-8 w-px ${isBoardPage ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
            <Link 
              href="/"
              className={`text-sm font-semibold ${textColor} ${textColorHover} transition-colors flex items-center gap-2 whitespace-nowrap`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-5 h-5 flex-shrink-0">
                <path d="M50 2 L92 20 L92 48 Q92 75 50 98 Q8 75 8 48 L8 20 Z" fill="#91C11E"/>
                <path d="M30 50 L43 65 L72 32" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              GDPR Assistant
            </Link>
            <div className="hidden lg:flex items-center gap-2 ml-2">
                     <Link
                       href="/board"
                       className={`px-2.5 py-2 rounded-md text-xs font-medium flex items-center gap-1 whitespace-nowrap ${
                         isBoardPage
                           ? `${boardActiveBg} ${boardActiveText}`
                           : `${textColor} ${hoverBg}`
                       }`}
                     >
                       <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2z" />
                       </svg>
                       Board
                     </Link>
                     <Link
                       href="/cases"
                       className={`px-2.5 py-2 rounded-md text-xs font-medium flex items-center gap-1 whitespace-nowrap ${
                         pathname?.startsWith('/cases')
                           ? `${activeBg} ${activeText}`
                           : `${textColor} ${hoverBg}`
                       }`}
                     >
                       <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                       </svg>
                       Cases
                     </Link>
                     <Link
                       href="/escalations"
                       className={`px-2.5 py-2 rounded-md text-xs font-medium flex items-center gap-1 whitespace-nowrap ${
                         pathname?.startsWith('/escalations')
                           ? `${activeBg} ${activeText}`
                           : `${textColor} ${hoverBg}`
                       }`}
                     >
                       <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                       </svg>
                       Escalations
                     </Link>
                     <Link
                       href="/incidents"
                       className={`px-2.5 py-2 rounded-md text-xs font-medium flex items-center gap-1 whitespace-nowrap ${
                         pathname?.startsWith('/incidents')
                           ? 'bg-red-100 text-red-700'
                           : `${textColor} ${hoverBg}`
                       }`}
                     >
                       <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                       </svg>
                       Incidents
                     </Link>
                     <Link
                       href="/reporting/view"
                       className={`px-2.5 py-2 rounded-md text-xs font-medium flex items-center gap-1 whitespace-nowrap ${
                         pathname?.startsWith('/reporting')
                           ? `${activeBg} ${activeText}`
                           : `${textColor} ${hoverBg}`
                       }`}
                     >
                       <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                       </svg>
                       Reporting
                     </Link>
              {hasAdminAccess && (
                      <Link
                        href="/admin"
                        className={`px-2.5 py-2 rounded-md text-xs font-medium flex items-center gap-1 whitespace-nowrap ${
                          isAdminPage
                            ? 'bg-gray-100 text-gray-900'
                            : `${textColor} ${hoverBg}`
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Admin
                      </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Recent Cases Dropdown */}
            {user && recentCases.length > 0 && (
              <div className="relative group hidden lg:block">
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">Recent Cases</p>
                  </div>
                  {recentCases.map((recentCase) => (
                    <Link
                      key={recentCase.id}
                      href={`/cases/${recentCase.id}`}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{recentCase.caseId}</div>
                          <div className="text-xs text-gray-500 truncate">{recentCase.title}</div>
                        </div>
                        <div className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                          {formatRecentCaseTime(recentCase.timestamp)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {user && (
              <>
                <div className={`text-xs ${textColor} hidden xl:block max-w-[180px] truncate`}>
                  {user.email}
                </div>
                <button
                  onClick={async () => {
                    const { signOutUser } = await import('@/lib/firebase/auth');
                    await signOutUser();
                    window.location.href = '/';
                  }}
                  className={`px-2.5 py-1.5 text-xs ${isBoardPage ? 'text-gray-300 bg-[#1a2332] hover:bg-[#222b3d] border-gray-700' : 'text-gray-700 bg-white hover:bg-gray-50 border-gray-300'} border rounded-lg transition-colors whitespace-nowrap`}
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
    <OnboardingBanner />
    </>
  );
}
