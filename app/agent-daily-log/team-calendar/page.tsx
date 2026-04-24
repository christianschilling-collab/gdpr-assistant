'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { TeamAbsenceCalendar } from '@/components/agent-daily-log/TeamAbsenceCalendar';

export default function TeamCalendarPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const email = user?.email?.trim().toLowerCase() ?? '';

  if (authLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user || !email) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">Team calendar</h1>
        <p className="text-gray-600 mt-2 text-sm">Sign in to view and edit absences.</p>
        <Link href="/" className="inline-block mt-6 text-emerald-700 font-medium hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
      <h1 className="text-2xl font-bold text-gray-900">Team absence calendar</h1>
      <p className="text-gray-600 mt-2 text-sm max-w-3xl">
        Plan Urlaub und andere Abwesenheiten für das Team. Zurück zum{' '}
        <Link href="/agent-daily-log" className="text-emerald-700 font-medium hover:underline">
          Daily log
        </Link>
        .
      </p>
      <div className="mt-8">
        <TeamAbsenceCalendar actorEmail={email} displayName={user.displayName ?? undefined} />
      </div>
    </div>
  );
}
