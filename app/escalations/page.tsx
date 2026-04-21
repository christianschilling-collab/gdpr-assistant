'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAllEscalations } from '@/lib/firebase/escalations';
import { Escalation } from '@/lib/types/escalations';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ChatBubbleLeftRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function EscalationsListPage() {
  const router = useRouter();
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadEscalations();
  }, []);

  async function loadEscalations() {
    try {
      setLoading(true);
      setError('');
      const data = await getAllEscalations();
      setEscalations(data);
    } catch (error) {
      console.error('Error loading escalations:', error);
      setError('Failed to load escalations. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  // Stats
  const activeEscalations = escalations.filter(e => e.status !== 'Closed').length;
  const overdueEscalations = escalations.filter(e => 
    e.status !== 'Closed' && e.deadlineFirstReply < new Date()
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading escalations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-red-800 font-semibold mb-1">Error Loading Escalations</h3>
                <p className="text-red-700 mb-4">{error}</p>
                <button 
                  onClick={loadEscalations}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary componentName="EscalationsListPage">
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <ChatBubbleLeftRightIcon className="w-10 h-10 text-blue-600" />
                Escalations
              </h1>
              
              <button
                onClick={() => router.push('/escalations/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                + New Escalation
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Total Escalations</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{escalations.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Active</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{activeEscalations}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Overdue</div>
              <div className="text-2xl font-bold text-orange-600 mt-1">{overdueEscalations}</div>
            </div>
          </div>

          {/* List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {escalations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 italic">
                No escalations found. Create a new escalation to get started.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {escalations
                  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                  .map((escalation) => (
                    <Link
                      key={escalation.id}
                      href={`/escalations/${escalation.id}`}
                      className="block p-6 hover:bg-gray-50 transition-colors"
                    >
                      <EscalationRow escalation={escalation} />
                    </Link>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function EscalationRow({ escalation }: { escalation: Escalation }) {
  const isOverdue = escalation.status !== 'Closed' && 
    escalation.deadlineFirstReply < new Date();

  return (
    <div className="flex items-center justify-between gap-6">
      {/* Left: Icon + ID + Status */}
      <div className="flex items-center gap-3 min-w-[280px]">
        <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
        <div>
          <div className="font-semibold text-gray-900">{escalation.escalationId}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              escalation.status === 'Closed' ? 'bg-gray-100 text-gray-700' :
              escalation.status === 'Blocked' ? 'bg-red-100 text-red-700' :
              escalation.status === 'Pending External Response' ? 'bg-purple-100 text-purple-700' :
              escalation.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {escalation.status}
            </span>
            {isOverdue && (
              <ExclamationTriangleIcon className="w-4 h-4 text-orange-600" title="Reply deadline passed" />
            )}
          </div>
        </div>
      </div>

      {/* Middle: Description */}
      <div className="flex-1 min-w-0">
        <p className="text-gray-900 font-medium truncate">{escalation.summary}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700 font-medium">
            {escalation.subject}
          </span>
          <span className="text-sm text-gray-600">{escalation.market}</span>
          <span className="text-sm text-gray-600">• {escalation.classification}</span>
        </div>
      </div>

      {/* Right: Deadline */}
      <div className="text-right min-w-[140px]">
        <div className="text-sm text-gray-600">Reply by:</div>
        <div className={`font-semibold ${isOverdue ? 'text-orange-600' : 'text-gray-900'}`}>
          {escalation.deadlineFirstReply.toLocaleDateString()}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          Created: {escalation.createdAt.toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
