'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAllIncidents, updateIncidentStatus } from '@/lib/firebase/incidents';
import { getAllEscalations } from '@/lib/firebase/escalations';
import { Incident } from '@/lib/types';
import { Escalation } from '@/lib/types/escalations';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ShieldExclamationIcon, ExclamationTriangleIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { BoardView } from '@/components/BoardView';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function IncidentsListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board'); // Default to board
  const [itemTypeFilter, setItemTypeFilter] = useState<'all' | 'incidents' | 'escalations'>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const [incidentsData, escalationsData] = await Promise.all([
        getAllIncidents(),
        getAllEscalations(),
      ]);
      setIncidents(incidentsData);
      setEscalations(escalationsData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load incidents and escalations. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  // Get filtered items based on type filter
  const filteredIncidents = itemTypeFilter === 'escalations' ? [] : incidents;
  const filteredEscalations = itemTypeFilter === 'incidents' ? [] : escalations;

  // Stats
  const activeIncidents = filteredIncidents.filter(i => i.status !== 'Closed').length;
  const activeEscalations = filteredEscalations.filter(e => e.status !== 'Closed').length;
  const overdueIncidents = filteredIncidents.filter(i => 
    i.status !== 'Closed' && !i.authorityNotifiedAt && 
    ((Date.now() - i.discoveryDate.getTime()) / (1000 * 60 * 60)) > 48
  ).length;
  const overdueEscalations = filteredEscalations.filter(e =>
    e.status !== 'Closed' && e.deadlineFirstReply < new Date()
  ).length;

  // Combine items for board view
  const boardItems = [
    ...filteredIncidents.map(i => ({ type: 'incident' as const, data: i, id: i.id })),
    ...filteredEscalations.map(e => ({ type: 'escalation' as const, data: e, id: e.id })),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading incidents...</p>
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
                <h3 className="text-red-800 font-semibold mb-1">Error Loading Data</h3>
                <p className="text-red-700 mb-4">{error}</p>
                <button 
                  onClick={loadData}
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
    <ErrorBoundary componentName="IncidentsListPage">
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <ShieldExclamationIcon className="w-10 h-10 text-red-600" />
                GDPR Management
              </h1>
              
              <div className="flex gap-3">
                {/* View Toggle */}
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                      viewMode === 'list'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    title="List View"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('board')}
                    className={`px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                      viewMode === 'board'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    title="Board View"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2z" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={() => router.push('/incidents/new')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  + New Incident
                </button>
                <button
                  onClick={() => router.push('/escalations/new')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  + New Escalation
                </button>
              </div>
            </div>

            {/* Item Type Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Show:</label>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setItemTypeFilter('all')}
                  className={`px-4 py-2 text-sm transition-colors ${
                    itemTypeFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setItemTypeFilter('incidents')}
                  className={`px-4 py-2 text-sm transition-colors border-l border-gray-300 ${
                    itemTypeFilter === 'incidents'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Incidents Only
                </button>
                <button
                  onClick={() => setItemTypeFilter('escalations')}
                  className={`px-4 py-2 text-sm transition-colors border-l border-gray-300 ${
                    itemTypeFilter === 'escalations'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Escalations Only
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Total Items</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {filteredIncidents.length + filteredEscalations.length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Active Incidents</div>
              <div className="text-2xl font-bold text-red-600 mt-1">{activeIncidents}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Active Escalations</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{activeEscalations}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Overdue</div>
              <div className="text-2xl font-bold text-orange-600 mt-1">
                {overdueIncidents + overdueEscalations}
              </div>
            </div>
          </div>

          {/* Board or List View */}
          {viewMode === 'board' ? (
            <BoardView
              items={boardItems}
              onStatusChange={async (itemId, itemType, newStatus) => {
                if (itemType === 'incident') {
                  await updateIncidentStatus(itemId, newStatus as any, user?.email || 'system');
                }
                // TODO: Add escalation status update
                await loadData();
              }}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {filteredIncidents.length === 0 && filteredEscalations.length === 0 ? (
                <div className="p-8 text-center text-gray-500 italic">
                  No items found. Create a new incident or escalation to get started.
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {/* Incidents */}
                  {filteredIncidents
                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                    .map((incident) => (
                      <Link
                        key={incident.id}
                        href={`/incidents/${incident.id}`}
                        className="block p-6 hover:bg-gray-50 transition-colors"
                      >
                        <IncidentRow incident={incident} />
                      </Link>
                    ))}
                  
                  {/* Escalations */}
                  {filteredEscalations
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
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

function IncidentRow({ incident }: { incident: Incident }) {
  const isOverdue = incident.status !== 'Closed' && !incident.authorityNotifiedAt && 
    ((Date.now() - incident.discoveryDate.getTime()) / (1000 * 60 * 60)) > 48;

  return (
    <div className="flex items-center justify-between gap-6">
      {/* Left: Icon + ID + Status */}
      <div className="flex items-center gap-3 min-w-[280px]">
        <ShieldExclamationIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div>
          <div className="font-semibold text-gray-900">{incident.incidentId}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              incident.status === 'Closed' ? 'bg-gray-100 text-gray-700' :
              'bg-red-100 text-red-700'
            }`}>
              {incident.status}
            </span>
            {isOverdue && (
              <ExclamationTriangleIcon className="w-4 h-4 text-red-600" title="Notification overdue" />
            )}
          </div>
        </div>
      </div>

      {/* Middle: Description */}
      <div className="flex-1 min-w-0">
        <p className="text-gray-900 font-medium truncate">{incident.natureOfIncident}</p>
        <p className="text-sm text-gray-600 mt-1">
          {incident.affectedSystems.slice(0, 2).join(', ')}
          {incident.affectedSystems.length > 2 && ` +${incident.affectedSystems.length - 2} more`}
        </p>
      </div>

      {/* Right: Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div className="text-right">
          <div className="font-semibold text-gray-900">{incident.totalImpacted.toLocaleString()}</div>
          <div className="text-gray-600">impacted</div>
        </div>
        <div className="text-right min-w-[100px]">
          <div className="text-gray-600">{incident.createdAt.toLocaleDateString()}</div>
          <div className="text-xs text-gray-500">
            {incident.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
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
