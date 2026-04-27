'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/contexts/AuthContext';
import { formatRecentCaseTime } from '@/lib/utils/recentCases';
import { OnboardingBanner } from './OnboardingBanner';
import { UserSwitcher } from './UserSwitcher';
import { isGdprAssistantAdminEmail } from '@/lib/auth/gdprAssistantAdmins';

export function Navigation() {
  const pathname = usePathname();
  const { user, isAdmin, userProfile, userRole, isImpersonating, originalUser } = useAuth();
  const [recentCases, setRecentCases] = useState<Array<{ id: string; caseId: string; title: string }>>([]);
  const [navMenuOpen, setNavMenuOpen] = useState(false);

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

  useEffect(() => {
    setNavMenuOpen(false);
  }, [pathname]);

  // Debug logging
  useEffect(() => {
    console.log('🔍 Navigation Debug:');
    console.log('  - User email:', user?.email);
    console.log('  - User profile:', userProfile);
    console.log('  - User role:', userRole);
    console.log('  - isAdmin:', isAdmin);
  }, [user, userProfile, userRole, isAdmin]);

  // TEMPORARY FALLBACK: Check email directly if Firestore profile not loaded yet
  const isAdminByEmail = user?.email && isGdprAssistantAdminEmail(user.email);
  
  // Use current profile role - this handles impersonation correctly
  const currentUserRole = userProfile?.role || 'agent';
  const isAgentRole = currentUserRole === 'agent';
  
  // Admin access should be based ONLY on the current user role when impersonating
  // If impersonating, only use currentUserRole. If not impersonating, can use original permissions too
  const hasAdminAccess = isImpersonating ? 
    currentUserRole === 'admin' || currentUserRole === 'legal' :
    (currentUserRole === 'admin' || currentUserRole === 'legal' || isAdmin || isAdminByEmail);
  
  // Debug role detection
  console.log('🔍 Role Debug:', {
    currentUserRole,
    isAgentRole,
    hasAdminAccess,
    isImpersonating,
    userProfile: userProfile?.email,
    originalFirebaseUser: user?.email
  });

  const isAdminPage = pathname?.startsWith('/admin');
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

  const isCasesTab = pathname?.startsWith('/cases');
  const isEscalationsTab = pathname?.startsWith('/escalations');
  const isIncidentsTab = pathname?.startsWith('/incidents');

  const workTabBase =
    'shrink-0 rounded-md px-2 py-1.5 text-xs font-medium flex items-center gap-1 whitespace-nowrap transition-colors';
  const workTabClass = (active: boolean, incidentTab: boolean) => {
    if (incidentTab && active) {
      return isBoardPage
        ? 'bg-red-950/50 text-red-200 ring-1 ring-red-800/60'
        : 'bg-red-100 text-red-700 ring-1 ring-red-200';
    }
    if (active) {
      return `${activeBg} ${activeText}`;
    }
    return `${textColor} ${hoverBg}`;
  };

  return (
    <>
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="bg-yellow-400 text-yellow-900 px-4 py-2 text-center text-sm font-medium">
          🔄 <strong>Testing Mode:</strong> You are viewing as {userProfile?.displayName || userProfile?.email} ({userProfile?.role})
          {originalUser && (
            <span className="ml-2">
              • Original: {originalUser.displayName || originalUser.email}
            </span>
          )}
        </div>
      )}
      
      <nav className={`relative z-50 border-b shadow-sm ${navBg}`}>
        {navMenuOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            aria-label="Close navigation menu"
            onClick={() => setNavMenuOpen(false)}
          />
        ) : null}
        <div className="relative z-50 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 min-w-0 items-center justify-between gap-3 py-1">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-3 lg:gap-4">
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
                  width: 'clamp(7rem, 28vw, 180px)',
                  height: 'auto',
                  maxHeight: '56px'
                }}
              />
            </Link>
            <div className={`h-8 w-px ${isBoardPage ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
            <Link 
              href="/"
              className={`inline-flex min-w-0 max-w-full shrink-0 items-center gap-2 text-sm font-semibold ${textColor} ${textColorHover} transition-colors sm:whitespace-nowrap`}
            >
              {/* width/height attributes: fallback if Tailwind fails so the shield never fills the viewport */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 100 100"
                width={20}
                height={20}
                className="h-5 w-5 max-h-5 max-w-5 shrink-0"
                aria-hidden
              >
                <path d="M50 2 L92 20 L92 48 Q92 75 50 98 Q8 75 8 48 L8 20 Z" fill="#91C11E"/>
                <path d="M30 50 L43 65 L72 32" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="min-w-0 max-w-[9rem] truncate sm:max-w-none sm:whitespace-normal sm:overflow-visible">
                GDPR Assistant
              </span>
            </Link>
            <div className="ml-0.5 hidden min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5 py-1 lg:flex">
                     {/* Primary Work Section - Prioritized for Agents */}
                     <div
                       className={`flex shrink-0 items-stretch gap-0.5 rounded-lg border p-0.5 ${
                         isBoardPage ? 'border-gray-700 bg-[#0d1420]/90' : 'border-gray-200 bg-gray-100'
                       }`}
                       role="group"
                       aria-label="Daily Work"
                     >
                       <span
                         className={`hidden xl:flex items-center px-1.5 text-[10px] font-bold uppercase tracking-wide ${
                           isBoardPage ? 'text-gray-500' : 'text-gray-400'
                         }`}
                       >
                         Daily Work
                       </span>
                       <Link
                         href="/cases"
                         className={`${workTabBase} ${workTabClass(isCasesTab, false)}`}
                       >
                         <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                         </svg>
                         Cases
                       </Link>
                       <Link
                         href="/escalations"
                         className={`${workTabBase} ${workTabClass(isEscalationsTab, false)}`}
                       >
                         <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                         </svg>
                         Escalations
                       </Link>
                       <Link
                         href="/incidents"
                         className={`${workTabBase} ${workTabClass(isIncidentsTab, true)}`}
                       >
                         <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                         </svg>
                         Incidents
                       </Link>
                     </div>
                     
                     {/* Board - Only for Team Lead, Legal, Admin */}
                     {!isAgentRole && (
                       <Link
                         href="/board"
                         className={`shrink-0 px-2.5 py-2 rounded-md text-xs font-medium flex items-center gap-1 whitespace-nowrap ${
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
                     )}

                     {/* Agent Tools */}
                     <Link
                       href="/agent-daily-log"
                       className={`shrink-0 px-2.5 py-2 rounded-md text-xs font-medium flex items-center gap-1 whitespace-nowrap ${
                         pathname?.startsWith('/agent-daily-log')
                           ? `${activeBg} ${activeText}`
                           : `${textColor} ${hoverBg}`
                       }`}
                     >
                       <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                       </svg>
                       Daily Log
                     </Link>

                     {/* Learning & Development */}
                     <Link
                       href="/onboarding"
                       className={`shrink-0 px-2.5 py-2 rounded-md text-xs font-medium flex items-center gap-1 whitespace-nowrap ${
                         pathname?.startsWith('/onboarding')
                           ? `${activeBg} ${activeText}`
                           : `${textColor} ${hoverBg}`
                       }`}
                     >
                       <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                       </svg>
                       Training
                     </Link>

                     {/* Reporting Section - For Team Leads and Admin */}
                     {(currentUserRole === 'team_lead' || currentUserRole === 'legal' || hasAdminAccess) && (
                       <>
                         <div className={`h-6 w-px ${isBoardPage ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                         <Link
                           href="/reporting"
                           className={`shrink-0 px-2.5 py-2 rounded-md text-xs font-medium flex items-center gap-1 whitespace-nowrap ${
                             pathname?.startsWith('/reporting') && !pathname?.startsWith('/reporting/submit')
                               ? `${activeBg} ${activeText}`
                               : `${textColor} ${hoverBg}`
                           }`}
                         >
                           <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                           </svg>
                           Reports
                         </Link>
                         <Link
                           href="/reporting/submit"
                           className={`shrink-0 px-2.5 py-2 rounded-md text-xs font-medium flex items-center gap-1 whitespace-nowrap ${
                             pathname?.startsWith('/reporting/submit')
                               ? `${activeBg} ${activeText}`
                               : `${textColor} ${hoverBg}`
                           }`}
                         >
                           <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                           </svg>
                           Submit Week
                         </Link>
                       </>
                     )}

                     {/* Admin Access - Only for actual Admin users and originalUser in impersonation mode */}
                     {(hasAdminAccess && (!isImpersonating || originalUser?.role === 'admin')) && (
                       <>
                         <div className={`h-6 w-px ${isBoardPage ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                         <Link
                           href="/admin"
                           className={`shrink-0 px-2.5 py-2 rounded-md text-xs font-medium flex items-center gap-1 whitespace-nowrap ${
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
                       </>
                     )}
            </div>
            <button
              type="button"
              className={`ml-auto shrink-0 rounded-lg p-2 lg:hidden ${
                isBoardPage
                  ? 'text-gray-200 hover:bg-[#1a2332] hover:text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setNavMenuOpen((o) => !o)}
              aria-expanded={navMenuOpen}
              aria-controls="main-nav-mobile-panel"
            >
              {navMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
                <div
                  className={`hidden max-w-[10rem] truncate text-xs sm:max-w-[14rem] xl:block ${textColor}`}
                  title={user.email || undefined}
                >
                  {user.email}
                </div>
                <UserSwitcher />
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
        {navMenuOpen ? (
          <div
            id="main-nav-mobile-panel"
            className={`absolute left-0 right-0 top-full z-50 border-t shadow-lg lg:hidden ${
              isBoardPage ? 'border-gray-700 bg-[#111827]' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="max-h-[min(70vh,28rem)] overflow-y-auto px-4 py-3">
              <div className="flex flex-col gap-1">
                {/* Daily Work Section - Priority for Agents */}
                <div
                  className={`rounded-lg border p-2 ${
                    isBoardPage ? 'border-gray-700 bg-[#0d1420]' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <p
                    className={`mb-2 px-1 text-[10px] font-bold uppercase tracking-wide ${
                      isBoardPage ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    Daily Work
                  </p>
                  <div className="flex flex-col gap-0.5">
                    <Link
                      href="/cases"
                      onClick={() => setNavMenuOpen(false)}
                      className={`rounded-md px-3 py-2 text-sm font-medium ${workTabClass(isCasesTab, false)}`}
                    >
                      Cases
                    </Link>
                    <Link
                      href="/escalations"
                      onClick={() => setNavMenuOpen(false)}
                      className={`rounded-md px-3 py-2 text-sm font-medium ${workTabClass(isEscalationsTab, false)}`}
                    >
                      Escalations
                    </Link>
                    <Link
                      href="/incidents"
                      onClick={() => setNavMenuOpen(false)}
                      className={`rounded-md px-3 py-2 text-sm font-medium ${workTabClass(isIncidentsTab, true)}`}
                    >
                      Incidents
                    </Link>
                  </div>
                </div>

                {/* Board - Only for non-agents */}
                {!isAgentRole && (
                  <Link
                    href="/board"
                    onClick={() => setNavMenuOpen(false)}
                    className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                      isBoardPage ? `${boardActiveBg} ${boardActiveText}` : `${textColor} ${hoverBg}`
                    }`}
                  >
                    Board
                  </Link>
                )}

                {/* Agent Tools */}
                <Link
                  href="/agent-daily-log"
                  onClick={() => setNavMenuOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                    pathname?.startsWith('/agent-daily-log')
                      ? `${activeBg} ${activeText}`
                      : `${textColor} ${hoverBg}`
                  }`}
                >
                  Daily Log
                </Link>

                {/* Training */}
                <Link
                  href="/onboarding"
                  onClick={() => setNavMenuOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                    pathname?.startsWith('/onboarding')
                      ? `${activeBg} ${activeText}`
                      : `${textColor} ${hoverBg}`
                  }`}
                >
                  Training
                </Link>

                {/* Reporting - Only for Team Leads and Admin */}
                {(currentUserRole === 'team_lead' || currentUserRole === 'legal' || hasAdminAccess) && (
                  <>
                    <Link
                      href="/reporting"
                      onClick={() => setNavMenuOpen(false)}
                      className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                        pathname?.startsWith('/reporting') && !pathname?.startsWith('/reporting/submit')
                          ? `${activeBg} ${activeText}`
                          : `${textColor} ${hoverBg}`
                      }`}
                    >
                      Reports
                    </Link>
                    <Link
                      href="/reporting/submit"
                      onClick={() => setNavMenuOpen(false)}
                      className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                        pathname?.startsWith('/reporting/submit')
                          ? `${activeBg} ${activeText}`
                          : `${textColor} ${hoverBg}`
                      }`}
                    >
                      Submit Week
                    </Link>
                  </>
                )}

                {/* Admin - Only for real admins, not impersonated agents */}
                {(hasAdminAccess && (!isImpersonating || originalUser?.role === 'admin')) && (
                  <Link
                    href="/admin"
                    onClick={() => setNavMenuOpen(false)}
                    className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                      isAdminPage
                        ? isBoardPage
                          ? 'bg-[#1a2332] text-white'
                          : 'bg-gray-100 text-gray-900'
                        : `${textColor} ${hoverBg}`
                    }`}
                  >
                    Admin
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : null}
    </nav>
    <OnboardingBanner />
    </>
  );
}
