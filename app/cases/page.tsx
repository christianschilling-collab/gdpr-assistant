'use client';

import { useEffect, useState } from 'react';
import { getCases, updateCase } from '@/lib/firebase/cases';
import { getCategories } from '@/lib/firebase/categories';
import { getRequesterTypes } from '@/lib/firebase/requesterTypes';
import { GDPRCase, Category, RequesterType } from '@/lib/types';
import Link from 'next/link';
import { SkeletonTable } from '@/components/Skeleton';
import { HelpModal, HelpButton } from '@/components/HelpModal';
import { HELP_CONTENT } from '@/lib/constants/helpContent';
import { useAuth } from '@/lib/contexts/AuthContext';
import { BoardView } from '@/components/BoardView';
import { useDebounce } from '@/lib/hooks/useDebounce';

export default function CasesPage() {
  const { user } = useAuth();
  const [allCases, setAllCases] = useState<GDPRCase[]>([]);
  const [filteredCases, setFilteredCases] = useState<GDPRCase[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [requesterTypes, setRequesterTypes] = useState<RequesterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showHelp, setShowHelp] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all'); // Changed to 'all' for legal leaders
  const [sortBy, setSortBy] = useState<'date' | 'urgency' | 'caseId'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Debounce search query to avoid filtering on every keystroke
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [allCases, debouncedSearchQuery, statusFilter, urgencyFilter, marketFilter, agentFilter, sortBy, sortOrder]);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const [casesData, cats, types] = await Promise.all([
        getCases(),
        getCategories(true),
        getRequesterTypes(true),
      ]);
      setAllCases(casesData);
      setCategories(cats);
      setRequesterTypes(types);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load cases. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function applyFiltersAndSort() {
    let result = [...allCases];

    // Search filter - now uses debounced value
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      result = result.filter(c => 
        c.caseId.toLowerCase().includes(query) ||
        c.caseDescription.toLowerCase().includes(query) ||
        c.teamMember.toLowerCase().includes(query) ||
        (c.customerNumber && c.customerNumber.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }

    // Urgency filter
    if (urgencyFilter !== 'all') {
      result = result.filter(c => c.urgency === urgencyFilter);
    }

    // Market filter
    if (marketFilter !== 'all') {
      result = result.filter(c => c.market === marketFilter);
    }

    // Agent filter
    if (agentFilter === 'my-cases') {
      // Filter to show only current user's cases
      if (user?.email) {
        result = result.filter(c => c.teamMember === user.email);
      }
    } else if (agentFilter !== 'all') {
      // Filter to specific agent
      result = result.filter(c => c.teamMember === agentFilter);
    }
    // If agentFilter === 'all', show all cases (no filtering)

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          break;
        case 'urgency':
          const urgencyMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
          comparison = (urgencyMap[b.urgency] || 0) - (urgencyMap[a.urgency] || 0);
          break;
        case 'caseId':
          comparison = a.caseId.localeCompare(b.caseId);
          break;
      }
      
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    setFilteredCases(result);
  }

  function getCategoryName(categoryId: string): string {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  }

  function getRequesterTypeName(typeId: string): string {
    const type = requesterTypes.find(t => t.id === typeId);
    return type ? type.name : typeId;
  }

  function resetFilters() {
    setSearchQuery('');
    setStatusFilter('all');
    setUrgencyFilter('all');
    setMarketFilter('all');
    setAgentFilter('my-cases'); // Reset to my-cases instead of 'all'
  }

  function exportToCSV() {
    const headers = ['Case ID', 'Status', 'Urgency', 'Market', 'Agent', 'Created', 'Description'];
    const rows = filteredCases.map(c => [
      c.caseId,
      c.status,
      c.urgency,
      c.market,
      c.teamMember,
      new Date(c.timestamp).toLocaleDateString('de-DE'),
      `"${c.caseDescription.replace(/"/g, '""').substring(0, 100)}..."`,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gdpr-cases-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Get unique values for dropdowns
  const uniqueMarkets = [...new Set(allCases.map(c => c.market))].sort();
  const uniqueAgents = [...new Set(allCases.map(c => c.teamMember))].sort();

  // Calculate stats based on current agent filter
  const getStatsSource = () => {
    if (agentFilter === 'my-cases' && user?.email) {
      return allCases.filter(c => c.teamMember === user.email);
    } else if (agentFilter !== 'all' && agentFilter !== 'my-cases') {
      return allCases.filter(c => c.teamMember === agentFilter);
    }
    return allCases; // 'all' - show all cases
  };

  const statsSource = getStatsSource();
  const statsLabel = 
    agentFilter === 'my-cases' ? 'Showing your cases' :
    agentFilter === 'all' ? 'Showing all cases' :
    `Showing cases for ${agentFilter}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'AI Processed': return 'bg-purple-100 text-purple-800';
      case 'Under Review': return 'bg-yellow-100 text-yellow-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <SkeletonTable rows={10} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-red-800 font-semibold mb-1">Error Loading Cases</h3>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <HelpModal 
        isOpen={showHelp} 
        onClose={() => setShowHelp(false)}
        title={HELP_CONTENT.casesList.title}
        sections={HELP_CONTENT.casesList.sections}
      />
      
      <div className="max-w-7xl mx-auto">
        {/* Header with Compact Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-6 mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h1 className="text-2xl font-bold text-gray-900">GDPR Cases</h1>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">Total:</span>
                    <span className="font-bold text-gray-900">{statsSource.length}</span>
                  </div>
                  <div className="h-4 w-px bg-gray-200"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-600">New:</span>
                    <span className="font-bold text-blue-700">{statsSource.filter(c => c.status === 'New').length}</span>
                  </div>
                  <div className="h-4 w-px bg-gray-200"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-orange-600">Review:</span>
                    <span className="font-bold text-orange-700">{statsSource.filter(c => c.status === 'Under Review').length}</span>
                  </div>
                  <div className="h-4 w-px bg-gray-200"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-green-600">Resolved:</span>
                    <span className="font-bold text-green-700">{statsSource.filter(c => c.status === 'Resolved').length}</span>
                  </div>
                </div>
              </div>
              {/* Stats Label */}
              <p className="text-xs text-gray-500 ml-8 italic">{statsLabel}</p>
            </div>
            <div className="flex flex-wrap gap-3">
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
              
              <HelpButton onClick={() => setShowHelp(true)} />
              <button
                onClick={exportToCSV}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Export CSV
              </button>
              <Link
                href="/cases/new"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Case
              </Link>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          {/* Search Bar */}
          <div className="mb-3 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Case ID, Description, Agent, or Customer Number..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="New">New</option>
                <option value="AI Processed">AI Processed</option>
                <option value="Under Review">Under Review</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            {/* Urgency Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Urgencies</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {/* Market Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Market</label>
              <select
                value={marketFilter}
                onChange={(e) => setMarketFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Markets</option>
                {uniqueMarkets.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Agent Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agent</label>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="my-cases">My Cases</option>
                <option value="all">All Agents</option>
                {uniqueAgents.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort & Reset */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Date</option>
                <option value="urgency">Urgency</option>
                <option value="caseId">Case ID</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
            <button
              onClick={resetFilters}
              className="ml-auto px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
            >
              🔄 Reset Filters
            </button>
          </div>
        </div>

        {/* Cases List or Board View */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {viewMode === 'board' ? (
          <BoardView
            items={filteredCases.map(c => ({ type: 'case' as const, data: c, id: c.id }))}
            onStatusChange={async (itemId, itemType, newStatus) => {
              // Update case status
              const caseToUpdate = allCases.find(c => c.id === itemId);
              if (caseToUpdate) {
                await updateCase(itemId, { ...caseToUpdate, status: newStatus as any });
                await loadData(); // Reload data
              }
            }}
          />
        ) : filteredCases.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 mb-3">No cases found matching your criteria</p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-blue-600 hover:text-blue-700 text-sm flex items-center gap-2 mx-auto"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">{filteredCases.map((c) => (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base font-bold text-gray-900">{c.caseId}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(c.status)}`}>
                        {c.status}
                      </span>
                      {c.urgency === 'High' && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          High
                        </span>
                      )}
                      {c.isGmail && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Gmail
                        </span>
                      )}
                      {c.classificationMethod === 'ai' && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                          AI
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                      {c.caseDescription}
                    </p>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {c.teamMember}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {c.market}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(c.timestamp).toLocaleDateString('de-DE')}
                      </span>
                      {c.primaryCategory && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-600 font-medium">
                            {getCategoryName(c.primaryCategory)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
