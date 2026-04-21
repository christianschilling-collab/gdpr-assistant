'use client';

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCases } from '@/lib/firebase/cases';
import { getAllIncidents } from '@/lib/firebase/incidents';
import { getAllEscalations } from '@/lib/firebase/escalations';
import { GDPRCase, Incident } from '@/lib/types';
import { Escalation } from '@/lib/types/escalations';

type BoardItem = {
  id: string;
  type: 'case' | 'incident' | 'escalation';
  itemId: string;
  category: string;
  subject: string;
  owner: string;
  deadline: Date | null;
  source: string;
  status: string;
  createdAt: Date;
  raw: GDPRCase | Incident | Escalation;
};

type UrgencyLevel = 'critical' | 'escalated' | 'warning' | 'open' | 'closed';

export default function CommandCenterPage() {
  const router = useRouter();
  const [items, setItems] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<string[]>(['all']);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [hideClosed, setHideClosed] = useState<boolean>(true); // Default: hide closed items
  
  const [uniqueAgents, setUniqueAgents] = useState<string[]>([]);

  useEffect(() => {
    loadData();
    
    // Refresh data every 60 seconds
    const dataInterval = setInterval(() => {
      loadData();
    }, 60000);
    
    return () => {
      clearInterval(dataInterval);
    };
  }, []);
  
  // Separate effect for time updates to avoid re-rendering entire component
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => {
      clearInterval(timeInterval);
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [cases, incidents, escalations] = await Promise.all([
        getCases(),
        getAllIncidents(),
        getAllEscalations(),
      ]);
      
      const allItems: BoardItem[] = [
        ...cases.map(c => ({
          id: c.id,
          type: 'case' as const,
          itemId: c.caseId,
          category: c.primaryCategory || 'Unknown',
          subject: c.caseDescription,
          owner: c.teamMember,
          deadline: null, // Cases don't have explicit deadlines
          source: c.isGmail ? 'Gmail' : 'E-Mail',
          status: c.status,
          createdAt: c.timestamp,
          raw: c,
        })),
        ...incidents.map(i => ({
          id: i.id,
          type: 'incident' as const,
          itemId: i.incidentId,
          category: 'Data Breach',
          subject: i.natureOfIncident,
          owner: (i as any).assignedTo || 'Unassigned',
          deadline: new Date(i.discoveryDate.getTime() + 72 * 60 * 60 * 1000), // 72h from discovery
          source: 'Internal',
          status: i.status,
          createdAt: i.createdAt,
          raw: i,
        })),
        ...escalations.map(e => ({
          id: e.id,
          type: 'escalation' as const,
          itemId: e.escalationId,
          category: 'Escalation',
          subject: e.summary,
          owner: (e as any).assignedTo || 'Unassigned',
          deadline: e.deadlineFirstReply,
          source: 'Escalation',
          status: e.status,
          createdAt: e.createdAt,
          raw: e,
        })),
      ];
      
      setItems(allItems);
      
      // Extract unique agents
      const agents = [...new Set(allItems.map(i => i.owner))].filter(a => a).sort();
      setUniqueAgents(agents);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoize urgency level calculation
  const getUrgencyLevel = useCallback((item: BoardItem): UrgencyLevel => {
    if (item.status === 'Closed' || item.status === 'Resolved') return 'closed';
    
    if (!item.deadline) {
      return item.type === 'escalation' ? 'escalated' : 'open';
    }
    
    const now = new Date();
    const hoursRemaining = (item.deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursRemaining < 0 || hoursRemaining < 24) return 'critical';
    if (item.type === 'escalation') return 'escalated';
    
    const totalHours = (item.deadline.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60);
    const elapsedPercent = ((totalHours - hoursRemaining) / totalHours) * 100;
    
    if (elapsedPercent > 50) return 'warning';
    return 'open';
  }, []);

  // Memoize filtered items to avoid recalculation on every render
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Hide closed/resolved items if toggle is on
      if (hideClosed && (item.status === 'Closed' || item.status === 'Resolved')) {
        return false;
      }
      
      // Type filter
      if (!typeFilter.includes('all')) {
        const itemCategory = item.category.toLowerCase();
        const matchesType = typeFilter.some(t => {
          if (t === 'data-breach') return item.type === 'incident';
          if (t === 'sar') return itemCategory.includes('access') || itemCategory.includes('auskunft');
          if (t === 'complaint') return itemCategory.includes('complaint') || itemCategory.includes('beschwerde');
          if (t === 'escalation') return item.type === 'escalation';
          return false;
        });
        if (!matchesType) return false;
      }
      
      // Agent filter
      if (agentFilter !== 'all') {
        if (agentFilter === 'unassigned') {
          if (item.owner && item.owner !== 'Unassigned') return false;
        } else {
          if (item.owner !== agentFilter) return false;
        }
      }
      
      return true;
    });
  }, [items, hideClosed, typeFilter, agentFilter]);

  // Memoize sorted items
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const urgencyA = getUrgencyLevel(a);
      const urgencyB = getUrgencyLevel(b);
      
      const urgencyOrder = { critical: 0, escalated: 1, warning: 2, open: 3, closed: 4 };
      
      if (urgencyOrder[urgencyA] !== urgencyOrder[urgencyB]) {
        return urgencyOrder[urgencyA] - urgencyOrder[urgencyB];
      }
      
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [filteredItems, getUrgencyLevel]);

  // Memoize counts - only recalculate when items change
  const criticalCount = useMemo(() => {
    return items.filter(i => {
      // Must NOT be closed or resolved
      if (i.status === 'Closed' || i.status === 'Resolved') return false;
      
      // Must have deadline with less than 24h remaining OR be overdue
      if (!i.deadline) return false;
      
      const now = new Date();
      const hoursRemaining = (i.deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      return hoursRemaining < 24; // Includes overdue (negative hours)
    }).length;
  }, [items]);
  
  const escalatedCount = useMemo(() => {
    return items.filter(i => {
      // Must NOT be closed or resolved
      if (i.status === 'Closed' || i.status === 'Resolved') return false;
      
      // Must be escalation type
      return i.type === 'escalation';
    }).length;
  }, [items]);

  const toggleTypeFilter = useCallback((type: string) => {
    if (type === 'all') {
      setTypeFilter(['all']);
    } else {
      let newFilters = typeFilter.filter(t => t !== 'all');
      if (newFilters.includes(type)) {
        newFilters = newFilters.filter(t => t !== type);
      } else {
        newFilters = [...newFilters, type];
      }
      setTypeFilter(newFilters.length === 0 ? ['all'] : newFilters);
    }
  }, [typeFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#6abf69] mx-auto"></div>
          <p className="mt-4 text-[#94a3b8]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#111827] px-6 py-4">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/cases"
                className="text-sm text-[#94a3b8] hover:text-white flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                ← Back to App
              </Link>
            </div>
            <h1 className="text-3xl font-bold">
              GDPR | <span className="text-[#6abf69]">TRACKBOARD</span>
            </h1>
            <p className="text-sm text-[#94a3b8] mt-1">
              Real-time Overview · Updated: {currentTime.toLocaleTimeString('en-US')}
            </p>
          </div>
          
          <div className="flex gap-4">
            {/* Critical Counter */}
            <div className={`bg-[#111827] border-2 border-red-500 rounded-lg px-6 py-3 shadow-[0_0_20px_rgba(239,68,68,0.3)] ${criticalCount > 0 ? 'animate-[pulse_1s_ease-in-out_3]' : ''}`}>
              <div className="text-xs text-[#94a3b8] uppercase mb-1">Critical</div>
              <div className="text-3xl font-bold text-red-500">{criticalCount}</div>
            </div>
            
            {/* Escalated Counter */}
            <div className="bg-[#111827] border-2 border-orange-500 rounded-lg px-6 py-3 shadow-[0_0_20px_rgba(249,115,22,0.3)]">
              <div className="text-xs text-[#94a3b8] uppercase mb-1">Escalated</div>
              <div className="text-3xl font-bold text-orange-500">{escalatedCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-800 bg-[#0f1419] px-6 py-4">
        <div className="max-w-[1800px] mx-auto space-y-3">
          {/* Toggle Row: Hide Closed */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setHideClosed(!hideClosed)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:bg-[#1a2332]"
            >
              <div className={`w-10 h-5 rounded-full transition-colors ${hideClosed ? 'bg-blue-600' : 'bg-gray-600'} relative`}>
                <div className={`absolute top-0.5 ${hideClosed ? 'right-0.5' : 'left-0.5'} w-4 h-4 bg-white rounded-full transition-all`}></div>
              </div>
              <span className="text-sm text-[#94a3b8]">Hide Closed</span>
            </button>
          </div>
          
          {/* Row 1: Type Filter */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#94a3b8] uppercase font-semibold w-24">Type:</span>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'all', label: 'All Types' },
                { id: 'data-breach', label: 'Data Breach' },
                { id: 'sar', label: 'Subject Access Request' },
                { id: 'complaint', label: 'Complaint' },
                { id: 'escalation', label: 'Escalation' },
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => toggleTypeFilter(type.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    typeFilter.includes(type.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-transparent border border-gray-700 text-[#94a3b8] hover:border-gray-600'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Row 2: Agent Filter */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#94a3b8] uppercase font-semibold w-24">Agent:</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setAgentFilter('all')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  agentFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent border border-gray-700 text-[#94a3b8] hover:border-gray-600'
                }`}
              >
                All Agents
              </button>
              {uniqueAgents.map(agent => (
                <button
                  key={agent}
                  onClick={() => setAgentFilter(agent)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    agentFilter === agent
                      ? 'bg-blue-600 text-white'
                      : 'bg-transparent border border-gray-700 text-[#94a3b8] hover:border-gray-600'
                  }`}
                >
                  {agent}
                </button>
              ))}
              <button
                onClick={() => setAgentFilter('unassigned')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  agentFilter === 'unassigned'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent border border-gray-700 text-[#94a3b8] hover:border-gray-600'
                }`}
              >
                Unassigned
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 py-6">
        <div className="max-w-[1800px] mx-auto">
          {/* Column Headers */}
          <div className="grid grid-cols-[60px_140px_180px_1fr_140px_280px_140px] gap-4 px-4 py-3 text-xs text-[#94a3b8] uppercase font-semibold border-b border-gray-800">
            <div>Status</div>
            <div>ID</div>
            <div>Type</div>
            <div>Subject</div>
            <div>Owner</div>
            <div>Deadline</div>
            <div>Source</div>
          </div>

          {/* Rows */}
          <div className="space-y-2 mt-4">
            {sortedItems.map(item => (
              <TrackboardRow key={item.id} item={item} urgency={getUrgencyLevel(item)} />
            ))}
            
            {sortedItems.length === 0 && (
              <div className="text-center py-12 text-[#94a3b8]">
                No items found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#111827] border-t border-gray-800 px-6 py-4">
        <div className="max-w-[1800px] mx-auto flex items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-[#94a3b8]"><span className="font-semibold text-white">CRITICAL</span> = immediate action required (e.g. 72h breach notification)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-[#94a3b8]"><span className="font-semibold text-white">ESCALATED</span> = legal / regulatory involvement</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-[#94a3b8]"><span className="font-semibold text-white">WARNING</span> = deadline more than 50% elapsed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-[#94a3b8]"><span className="font-semibold text-white">OPEN</span> = in progress</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TrackboardRowProps {
  item: BoardItem;
  urgency: UrgencyLevel;
}

const TrackboardRow = memo(function TrackboardRow({ item, urgency }: TrackboardRowProps) {
  const href = 
    item.type === 'case' ? `/cases/${item.id}` :
    item.type === 'incident' ? `/incidents/${item.id}` :
    `/escalations/${item.id}`;

  // Calculate deadline progress
  let progressPercent = 0;
  let hoursOpen = 0;
  let hoursRemaining = 0;
  let isOverdue = false;
  
  if (item.deadline) {
    const now = new Date();
    const totalMs = item.deadline.getTime() - item.createdAt.getTime();
    const elapsedMs = now.getTime() - item.createdAt.getTime();
    progressPercent = Math.min((elapsedMs / totalMs) * 100, 100);
    
    hoursOpen = Math.floor(elapsedMs / (1000 * 60 * 60));
    hoursRemaining = Math.floor((item.deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
    isOverdue = hoursRemaining < 0;
  }

  // Urgency styling
  const glowColor = 
    urgency === 'critical' ? 'shadow-[0_0_30px_rgba(239,68,68,0.4)]' :
    urgency === 'escalated' ? 'shadow-[0_0_30px_rgba(249,115,22,0.3)]' :
    urgency === 'warning' ? 'shadow-[0_0_20px_rgba(234,179,8,0.2)]' :
    '';
  
  const borderColor = 
    urgency === 'critical' ? 'border-l-red-500' :
    urgency === 'escalated' ? 'border-l-orange-500' :
    urgency === 'warning' ? 'border-l-yellow-500' :
    urgency === 'open' ? 'border-l-green-700' :
    'border-l-gray-700';
  
  const dotColor = 
    urgency === 'critical' ? 'bg-red-500 animate-pulse' :
    urgency === 'escalated' ? 'bg-orange-500' :
    urgency === 'warning' ? 'bg-yellow-500' :
    urgency === 'open' ? 'bg-green-500' :
    'bg-gray-600';
  
  const progressBarColor = 
    progressPercent >= 100 ? 'bg-red-500 animate-pulse' :
    progressPercent >= 75 ? 'bg-orange-500' :
    progressPercent >= 50 ? 'bg-yellow-500' :
    'bg-green-500';
  
  const typeBadgeColor = 
    item.category === 'Data Breach' ? 'bg-red-600' :
    item.category.toLowerCase().includes('access') || item.category.toLowerCase().includes('auskunft') ? 'bg-blue-600' :
    item.category.toLowerCase().includes('complaint') || item.category.toLowerCase().includes('beschwerde') ? 'bg-purple-600' :
    item.category === 'Escalation' ? 'bg-orange-600' :
    'bg-gray-600';

  const opacity = urgency === 'closed' ? 'opacity-40' : '';

  return (
    <Link
      href={href}
      className={`block bg-[#111827] rounded-lg border-l-4 ${borderColor} ${glowColor} ${opacity} hover:bg-[#1a2332] transition-all`}
    >
      <div className="grid grid-cols-[60px_140px_180px_1fr_140px_280px_140px] gap-4 px-4 py-4 items-center">
        {/* Status Dot */}
        <div>
          <div className={`w-4 h-4 rounded-full ${dotColor}`}></div>
        </div>

        {/* ID */}
        <div className="font-mono text-sm text-white">{item.itemId}</div>

        {/* Type Badge */}
        <div>
          <span className={`px-3 py-1 rounded text-xs font-semibold text-white ${typeBadgeColor}`}>
            {item.category}
          </span>
        </div>

        {/* Subject */}
        <div className="font-bold text-white truncate" title={item.subject}>
          {item.subject.length > 60 ? item.subject.substring(0, 60) + '...' : item.subject}
        </div>

        {/* Owner */}
        <div className="text-sm text-[#94a3b8]">
          {item.owner && item.owner !== 'Unassigned' ? item.owner.split(' ')[0] : <span className="italic">Unassigned</span>}
        </div>

        {/* Deadline Progress */}
        <div>
          {item.deadline ? (
            <>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full ${progressBarColor} transition-all`}
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-[#94a3b8]">
                {hoursOpen}h open · {isOverdue ? <span className="text-red-500 font-semibold">OVERDUE</span> : `${hoursRemaining}h remaining`}
              </div>
            </>
          ) : (
            <>
              <div className="h-2 bg-gray-700 rounded-full mb-1"></div>
              <div className="text-xs text-[#94a3b8] italic">No Deadline</div>
            </>
          )}
        </div>

        {/* Source */}
        <div className="text-sm text-[#94a3b8] truncate">{item.source}</div>
      </div>
    </Link>
  );
});
