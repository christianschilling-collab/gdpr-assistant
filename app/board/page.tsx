'use client';

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import { getCases } from '@/lib/firebase/cases';
import { getAllIncidents } from '@/lib/firebase/incidents';
import { getAllEscalations } from '@/lib/firebase/escalations';
import { getCategories } from '@/lib/firebase/categories';
import { getAllUsers } from '@/lib/firebase/users';
import {
  buildAssigneeDirectory,
  emptyAssigneeDirectory,
  BOARD_UNASSIGNED,
  type AssigneeEmailDirectory,
} from '@/lib/board/assigneeEmailDirectory';
import { GDPRCase, Incident } from '@/lib/types';
import { Escalation, EscalationMarket } from '@/lib/types/escalations';

/** Same column template for header + rows — minmax(0,…) avoids overlap into neighbour columns */
const BOARD_TABLE_GRID =
  'grid grid-cols-[40px_minmax(0,6.5rem)_minmax(0,4.75rem)_minmax(0,7rem)_minmax(0,1fr)_minmax(0,9.5rem)_minmax(0,10rem)_minmax(0,4.25rem)] gap-x-2 gap-y-1 sm:gap-x-3';

type MarketBucket = 'DACH' | 'France' | 'BNL' | 'Nordics' | 'Other';

function categoryLabelFromMap(
  categoryId: string | undefined,
  nameById: Map<string, string>
): string {
  if (!categoryId?.trim()) return 'Uncategorized';
  return nameById.get(categoryId) ?? 'Uncategorized';
}

function isoMarketToBucket(code: string | undefined | null): MarketBucket {
  if (!code || typeof code !== 'string') return 'Other';
  const c = code.trim().toUpperCase();
  if (['DE', 'AT', 'CH'].includes(c)) return 'DACH';
  if (['BE', 'LU', 'NL'].includes(c)) return 'BNL';
  if (c === 'FR') return 'France';
  if (['SE', 'DK', 'NO'].includes(c)) return 'Nordics';
  return 'Other';
}

function escalationMarketToBucket(m: EscalationMarket | string | undefined): MarketBucket {
  if (!m) return 'Other';
  const map: Record<string, MarketBucket> = {
    Germany: 'DACH',
    Austria: 'DACH',
    Switzerland: 'DACH',
    France: 'France',
    Belgium: 'BNL',
    Netherlands: 'BNL',
    Luxembourg: 'BNL',
    Sweden: 'Nordics',
    Norway: 'Nordics',
    Denmark: 'Nordics',
  };
  return map[String(m)] ?? 'Other';
}

function caseMarketBuckets(c: GDPRCase): { label: string; buckets: MarketBucket[] } {
  const b = isoMarketToBucket(c.market);
  const label = b === 'Other' && c.market?.trim() ? c.market.trim() : b;
  return { label, buckets: [b] };
}

function incidentMarketBuckets(i: Incident): { label: string; buckets: MarketBucket[] } {
  const countries = (i.countryImpact || []).map((x) => x.country);
  if (countries.length === 0) {
    return { label: '—', buckets: ['Other'] };
  }
  const buckets = [...new Set(countries.map((c) => isoMarketToBucket(c)))];
  const order: MarketBucket[] = ['DACH', 'BNL', 'France', 'Nordics', 'Other'];
  buckets.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return { label: buckets.join(', '), buckets };
}

function escalationMarketBuckets(e: Escalation): { label: string; buckets: MarketBucket[] } {
  const b = escalationMarketToBucket(e.market);
  return { label: b === 'Other' ? String(e.market) : b, buckets: [b] };
}

type BoardItem = {
  id: string;
  type: 'case' | 'incident' | 'escalation';
  itemId: string;
  category: string;
  subject: string;
  owner: string;
  marketLabel: string;
  marketBuckets: MarketBucket[];
  deadline: Date | null;
  source: string;
  status: string;
  createdAt: Date;
  raw: GDPRCase | Incident | Escalation;
};

type UrgencyLevel = 'critical' | 'escalated' | 'warning' | 'open' | 'closed';

export default function CommandCenterPage() {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<string[]>(['all']);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [marketFilters, setMarketFilters] = useState<string[]>(['all']);
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
      const [cases, incidents, escalations, categoryDocs, users] = await Promise.all([
        getCases(),
        getAllIncidents(),
        getAllEscalations(),
        getCategories(false),
        getAllUsers().catch((err) => {
          console.warn('Board: could not load users for email-only assignees', err);
          return [];
        }),
      ]);

      const assigneeDir: AssigneeEmailDirectory =
        users.length > 0 ? buildAssigneeDirectory(users) : emptyAssigneeDirectory();

      const nameById = new Map<string, string>();
      for (const cat of categoryDocs) {
        const label = (cat.nameEn || cat.name || '').trim();
        if (label) nameById.set(cat.id, label);
      }
      
      const allItems: BoardItem[] = [
        ...cases.map((c) => {
          const { label, buckets } = caseMarketBuckets(c);
          return {
            id: c.id,
            type: 'case' as const,
            itemId: c.caseId,
            category: categoryLabelFromMap(c.primaryCategory, nameById),
            subject: c.caseDescription,
            owner: assigneeDir.toEmail((c.teamMember || c.assignedTo || '').trim()),
            marketLabel: label,
            marketBuckets: buckets,
            deadline: null, // Cases don't have explicit deadlines
            source: c.isGmail ? 'Gmail' : 'E-Mail',
            status: c.status,
            createdAt: c.timestamp,
            raw: c,
          };
        }),
        ...incidents.map((i) => {
          const { label, buckets } = incidentMarketBuckets(i);
          const art33Deadline =
            i.notificationDeadline ??
            new Date(i.discoveryDate.getTime() + 72 * 60 * 60 * 1000);
          return {
            id: i.id,
            type: 'incident' as const,
            itemId: i.incidentId,
            category: 'Data Breach',
            subject: i.natureOfIncident,
            owner: assigneeDir.toEmail((i.assignedTo || i.createdBy || '').trim()),
            marketLabel: label,
            marketBuckets: buckets,
            deadline: art33Deadline,
            source: 'Internal',
            status: i.status,
            createdAt: i.createdAt,
            raw: i,
          };
        }),
        ...escalations.map((e) => {
          const { label, buckets } = escalationMarketBuckets(e);
          return {
            id: e.id,
            type: 'escalation' as const,
            itemId: e.escalationId,
            category: 'Escalation',
            subject: e.summary,
            owner: assigneeDir.toEmail((e.assignedTo || '').trim()),
            marketLabel: label,
            marketBuckets: buckets,
            deadline: e.deadlineFirstReply,
            source: 'Escalation',
            status: e.status,
            createdAt: e.createdAt,
            raw: e,
          };
        }),
      ];
      
      setItems(allItems);
      
      const agents = [...new Set(allItems.map((i) => i.owner))]
        .filter((a) => a && a !== BOARD_UNASSIGNED)
        .sort((a, b) => a.localeCompare(b));
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
    
    const windowStart =
      item.type === 'incident'
        ? (item.raw as Incident).discoveryDate
        : item.createdAt;
    const totalHours = (item.deadline.getTime() - windowStart.getTime()) / (1000 * 60 * 60);
    const elapsedPercent = totalHours > 0 ? ((totalHours - hoursRemaining) / totalHours) * 100 : 0;
    
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
        const matchesType = typeFilter.some((t) => {
          if (t === 'data-breach') return item.type === 'incident';
          if (t === 'sar') {
            return (
              itemCategory.includes('access') ||
              itemCategory.includes('auskunft') ||
              itemCategory.includes('subject access') ||
              itemCategory.includes('dsar') ||
              itemCategory.includes('right of access')
            );
          }
          if (t === 'complaint') {
            return (
              itemCategory.includes('complaint') ||
              itemCategory.includes('beschwerde') ||
              itemCategory.includes('customer complaint')
            );
          }
          if (t === 'escalation') return item.type === 'escalation';
          return false;
        });
        if (!matchesType) return false;
      }
      
      // Agent filter
      if (agentFilter !== 'all') {
        if (agentFilter === 'unassigned') {
          if (item.owner !== BOARD_UNASSIGNED) return false;
        } else {
          if (item.owner !== agentFilter) return false;
        }
      }

      if (!marketFilters.includes('all')) {
        const matchesMarket = item.marketBuckets.some((b) => marketFilters.includes(b));
        if (!matchesMarket) return false;
      }
      
      return true;
    });
  }, [items, hideClosed, typeFilter, agentFilter, marketFilters]);

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

  const toggleMarketFilter = useCallback((id: string) => {
    if (id === 'all') {
      setMarketFilters(['all']);
      return;
    }
    let next = marketFilters.filter((m) => m !== 'all');
    if (next.includes(id)) {
      next = next.filter((m) => m !== id);
    } else {
      next = [...next, id];
    }
    setMarketFilters(next.length === 0 ? ['all'] : next);
  }, [marketFilters]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  const marketChipOptions = [
    { id: 'all', label: 'All Markets' },
    { id: 'DACH', label: 'DACH' },
    { id: 'France', label: 'France' },
    { id: 'BNL', label: 'BNL' },
    { id: 'Nordics', label: 'Nordics' },
    { id: 'Other', label: 'Other' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-28">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/cases"
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                ← Back to App
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              GDPR | <span className="text-emerald-600">TRACKBOARD</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Real-time overview · Updated: {currentTime.toLocaleTimeString('en-US')}
            </p>
          </div>

          <div className="flex gap-4">
            <div
              className={`bg-white border-2 border-red-500 rounded-lg px-6 py-3 shadow-sm ${
                criticalCount > 0 ? 'ring-2 ring-red-200' : ''
              }`}
            >
              <div className="text-xs text-gray-500 uppercase mb-1">Critical</div>
              <div className="text-3xl font-bold text-red-600">{criticalCount}</div>
            </div>

            <div className="bg-white border-2 border-orange-500 rounded-lg px-6 py-3 shadow-sm">
              <div className="text-xs text-gray-500 uppercase mb-1">Escalated</div>
              <div className="text-3xl font-bold text-orange-600">{escalatedCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters — compact: agent as select (scales to many users); markets in one scroll row */}
      <div className="border-b border-gray-200 bg-white px-4 sm:px-6 py-2">
        <div className="max-w-[1800px] mx-auto flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <button
              type="button"
              onClick={() => setHideClosed(!hideClosed)}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 sm:text-sm"
            >
              <div
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  hideClosed ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 ${
                    hideClosed ? 'right-0.5' : 'left-0.5'
                  } h-4 w-4 rounded-full bg-white shadow transition-all`}
                />
              </div>
              <span>Hide closed</span>
            </button>

            <span className="hidden h-4 w-px bg-gray-200 sm:inline" aria-hidden />

            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1">
              <span className="shrink-0 pr-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Type
              </span>
              {[
                { id: 'all', label: 'All' },
                { id: 'data-breach', label: 'Breach' },
                { id: 'sar', label: 'SAR' },
                { id: 'complaint', label: 'Complaint' },
                { id: 'escalation', label: 'Escalation' },
              ].map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => toggleTypeFilter(type.id)}
                  className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium transition-all sm:px-2.5 sm:text-[13px] ${
                    typeFilter.includes(type.id)
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                  title={type.id === 'all' ? 'All types' : type.label}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <span className="hidden h-4 w-px bg-gray-200 md:inline" aria-hidden />

            <div className="flex min-w-[12rem] max-w-full flex-1 basis-[14rem] items-center gap-2 sm:basis-auto sm:flex-none md:min-w-[16rem]">
              <label htmlFor="board-agent-filter" className="shrink-0 text-[10px] font-semibold uppercase text-gray-500">
                Agent
              </label>
              <select
                id="board-agent-filter"
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white py-1 pl-2 pr-7 text-xs text-gray-900 sm:text-sm"
              >
                <option value="all">All agents</option>
                {uniqueAgents.map((agent) => (
                  <option key={agent} value={agent}>
                    {agent}
                  </option>
                ))}
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <span
              className="shrink-0 text-[10px] font-semibold uppercase text-gray-500"
              title="Select multiple regions"
            >
              Market
            </span>
            <div className="flex min-w-0 flex-1 flex-nowrap gap-1 overflow-x-auto py-0.5 [scrollbar-width:thin]">
              {marketChipOptions.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMarketFilter(m.id)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium transition-all ${
                    marketFilters.includes(m.id)
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 py-6">
        <div className="max-w-[1800px] mx-auto">
          <div
            className={`${BOARD_TABLE_GRID} border-b border-gray-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:px-4 sm:text-xs`}
          >
            <div className="min-w-0">St</div>
            <div className="min-w-0 truncate">ID</div>
            <div className="min-w-0 truncate">Mkt</div>
            <div className="min-w-0 truncate">Type</div>
            <div className="min-w-0">Subject</div>
            <div className="min-w-0 truncate">Owner</div>
            <div className="min-w-0 truncate">Deadline</div>
            <div className="min-w-0 truncate">Src</div>
          </div>

          <div className="space-y-2 mt-4">
            {sortedItems.map((item) => (
              <TrackboardRow key={item.id} item={item} urgency={getUrgencyLevel(item)} />
            ))}

            {sortedItems.length === 0 && (
              <div className="text-center py-12 text-gray-500">No items found</div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
            <span>
              <span className="font-semibold text-gray-900">Critical</span> — immediate action (e.g. 72h breach window)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
            <span>
              <span className="font-semibold text-gray-900">Escalated</span> — legal / regulatory track
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500 shrink-0" />
            <span>
              <span className="font-semibold text-gray-900">Warning</span> — over 50% of deadline elapsed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
            <span>
              <span className="font-semibold text-gray-900">Open</span> — in progress
            </span>
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
    const windowStart =
      item.type === 'incident'
        ? (item.raw as Incident).discoveryDate
        : item.createdAt;
    const totalMs = Math.max(item.deadline.getTime() - windowStart.getTime(), 1);
    const elapsedMs = now.getTime() - windowStart.getTime();
    progressPercent = Math.min((elapsedMs / totalMs) * 100, 100);
    
    hoursOpen = Math.floor(elapsedMs / (1000 * 60 * 60));
    hoursRemaining = Math.floor((item.deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
    isOverdue = hoursRemaining < 0;
  }

  const catLower = item.category.toLowerCase();
  const looksLikeSar =
    catLower.includes('access') ||
    catLower.includes('auskunft') ||
    catLower.includes('subject access') ||
    catLower.includes('dsar') ||
    catLower.includes('right of access');

  // Urgency styling
  const glowColor =
    urgency === 'critical'
      ? 'shadow-md shadow-red-100 ring-1 ring-red-100'
      : urgency === 'escalated'
        ? 'shadow-md shadow-orange-100 ring-1 ring-orange-100'
        : urgency === 'warning'
          ? 'shadow-sm shadow-amber-100'
          : '';

  const borderColor =
    urgency === 'critical'
      ? 'border-l-red-500'
      : urgency === 'escalated'
        ? 'border-l-orange-500'
        : urgency === 'warning'
          ? 'border-l-yellow-500'
          : urgency === 'open'
            ? 'border-l-emerald-600'
            : 'border-l-gray-300';
  
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
    item.category === 'Data Breach'
      ? 'bg-red-600'
      : looksLikeSar
        ? 'bg-blue-600'
        : catLower.includes('complaint') ||
            catLower.includes('beschwerde') ||
            catLower.includes('customer complaint')
          ? 'bg-purple-600'
          : item.category === 'Escalation'
            ? 'bg-orange-600'
            : 'bg-gray-600';

  const opacity = urgency === 'closed' ? 'opacity-40' : '';

  return (
    <Link
      href={href}
      className={`block overflow-hidden bg-white rounded-lg border border-gray-200 border-l-4 ${borderColor} ${glowColor} ${opacity} hover:bg-gray-50 transition-all`}
    >
      <div className={`${BOARD_TABLE_GRID} items-start px-3 py-3 sm:px-4 sm:py-4`}>
        <div className="min-w-0 flex items-center pt-1.5">
          <div className={`h-3.5 w-3.5 shrink-0 rounded-full sm:h-4 sm:w-4 ${dotColor}`} />
        </div>

        <div className="min-w-0 font-mono text-xs text-gray-900 truncate sm:text-sm" title={item.itemId}>
          {item.itemId}
        </div>

        <div className="min-w-0 truncate text-[11px] font-medium text-gray-700 sm:text-xs" title={item.marketLabel}>
          {item.marketLabel}
        </div>

        <div className="min-w-0">
          <span
            className={`inline-block max-w-full truncate rounded px-1.5 py-0.5 text-[10px] font-semibold text-white sm:px-2 sm:text-xs ${typeBadgeColor}`}
            title={item.category}
          >
            {item.category}
          </span>
        </div>

        <div className="min-w-0 font-semibold text-gray-900 truncate text-sm" title={item.subject}>
          {item.subject.length > 80 ? item.subject.substring(0, 80) + '…' : item.subject}
        </div>

        <div className="min-w-0 truncate text-xs text-gray-700 sm:text-sm" title={item.owner}>
          {item.owner !== BOARD_UNASSIGNED ? (
            <span className="block truncate">{item.owner}</span>
          ) : (
            <span className="italic text-gray-500">Unassigned</span>
          )}
        </div>

        <div className="min-w-0">
          {item.deadline ? (
            <>
              <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-gray-200 sm:h-2">
                <div
                  className={`h-full ${progressBarColor} transition-all`}
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
              <div className="whitespace-nowrap text-[10px] leading-tight text-gray-500 sm:text-xs">
                {hoursOpen}h ·{' '}
                {isOverdue ? (
                  <span className="font-semibold text-red-600">OVERDUE</span>
                ) : (
                  <span>{hoursRemaining}h left</span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mb-1 h-1.5 rounded-full bg-gray-200 sm:h-2" />
              <div className="text-[10px] italic text-gray-500 sm:text-xs">None</div>
            </>
          )}
        </div>

        <div className="min-w-0 truncate text-xs text-gray-600 sm:text-sm" title={item.source}>
          {item.source}
        </div>
      </div>
    </Link>
  );
});
