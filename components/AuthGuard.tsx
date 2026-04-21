'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/', 
  '/reporting/view', 
  '/workflows/demo',
  '/welcome',                          // AI Trailblazers Landing Page
  '/onboarding/self-evaluation',      // Self-Evaluation (requires login but no profile yet)
  '/onboarding/recommendations',      // Recommendations
];

// Routes that require admin access
const ADMIN_ROUTES = [
  '/admin',
  '/templates',
  '/analytics',
  '/reporting',
];

// DEVELOPMENT MODE: Bypass auth for specific routes (REMOVE IN PRODUCTION!)
const DEV_BYPASS_ROUTES = [
  '/admin/workflows',
  '/admin/workflows/list',
  '/admin/workflows/edit',
  '/admin/task-templates',  // Task Templates admin page
  '/incidents',              // Bypass for testing
  '/incidents/new',          // Bypass for testing
  '/escalations',            // Escalations list
  '/escalations/new',        // New escalation form
  '/slides',                 // Presentation slides
];
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// TEMPORARY FALLBACK: Admin emails for direct access
const ADMIN_EMAILS = [
  'christian.schilling@hellofresh.com',
  'christian.schilling@ext.hellofresh.com',
  'christian.schilling@hellofresh.de',
];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, loading, isAuthenticated } = useAuth();

  // Check if user is admin by email (fallback)
  const isAdminByEmail = user?.email && ADMIN_EMAILS.includes(user.email);
  const hasAdminAccess = isAdmin || isAdminByEmail;

  useEffect(() => {
    // Don't do anything while loading
    if (loading) return;

    // DEVELOPMENT MODE: Bypass auth for testing specific routes
    if (IS_DEVELOPMENT && DEV_BYPASS_ROUTES.some(route => pathname?.startsWith(route))) {
      console.log('🔓 DEV MODE: Bypassing auth for', pathname);
      return;
    }

    // Allow public routes
    if (PUBLIC_ROUTES.includes(pathname || '')) {
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      console.log('❌ AuthGuard: Not authenticated, redirecting to /');
      router.push('/');
      return;
    }

    // Check admin routes
    const isAdminRoute = ADMIN_ROUTES.some(route => pathname?.startsWith(route));
    if (isAdminRoute && !hasAdminAccess) {
      console.log('❌ AuthGuard: Not admin, redirecting to /cases');
      console.log('   - isAdmin:', isAdmin);
      console.log('   - isAdminByEmail:', isAdminByEmail);
      console.log('   - user email:', user?.email);
      // Not an admin trying to access admin route - redirect to cases
      router.push('/cases');
      return;
    }

    console.log('✅ AuthGuard: Access granted');
    console.log('   - pathname:', pathname);
    console.log('   - isAuthenticated:', isAuthenticated);
    console.log('   - hasAdminAccess:', hasAdminAccess);
  }, [user, isAdmin, loading, isAuthenticated, pathname, router, hasAdminAccess, isAdminByEmail]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if redirecting
  if (!PUBLIC_ROUTES.includes(pathname || '')) {
    // DEVELOPMENT MODE: Allow dev bypass routes
    if (IS_DEVELOPMENT && DEV_BYPASS_ROUTES.some(route => pathname?.startsWith(route))) {
      return <>{children}</>;
    }

    if (!isAuthenticated) {
      return null;
    }

    const isAdminRoute = ADMIN_ROUTES.some(route => pathname?.startsWith(route));
    if (isAdminRoute && !hasAdminAccess) {
      return null;
    }
  }

  return <>{children}</>;
}
