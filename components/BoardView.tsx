'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GDPRCase, Incident, Escalation } from '@/lib/types';

type BoardItem = 
  | { type: 'case'; data: GDPRCase; id: string; }
  | { type: 'incident'; data: Incident; id: string; }
  | { type: 'escalation'; data: Escalation; id: string; };

interface BoardViewProps {
  items: BoardItem[];
  onStatusChange?: (itemId: string, itemType: string, newStatus: string) => Promise<void>;
}

type ColumnStatus = 'new' | 'in-progress' | 'blocked' | 'resolved';

interface Column {
  id: ColumnStatus;
  title: string;
  statuses: string[];
}

const COLUMNS: Column[] = [
  { id: 'new', title: 'New / Not Started', statuses: ['New', 'Not Started', 'Reporting'] },
  { id: 'in-progress', title: 'In Progress', statuses: ['In Progress', 'Under Review', 'AI Processed', 'Investigation', 'Containment', 'Resolution'] },
  { id: 'blocked', title: 'Blocked', statuses: ['Blocked'] },
  { id: 'resolved', title: 'Resolved / Closed', statuses: ['Resolved', 'Closed', 'Post-Incident Review'] },
];

export function BoardView({ items, onStatusChange }: BoardViewProps) {
  const [draggedItem, setDraggedItem] = useState<BoardItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnStatus | null>(null);

  // Helper functions
  function getItemStatus(item: BoardItem): string {
    return item.data.status;
  }

  function getItemColumn(status: string): ColumnStatus {
    for (const col of COLUMNS) {
      if (col.statuses.includes(status)) {
        return col.id;
      }
    }
    return 'new';
  }

  function getIncidentArt33Deadline(incident: Incident): Date {
    return (
      incident.notificationDeadline ??
      new Date(incident.discoveryDate.getTime() + 72 * 60 * 60 * 1000)
    );
  }

  function getItemDeadline(item: BoardItem): Date | null {
    if (item.type === 'escalation') {
      return item.data.deadlineFirstReply;
    }
    if (item.type === 'incident') {
      return getIncidentArt33Deadline(item.data);
    }
    // Cases don't have explicit deadlines
    return null;
  }

  function getUrgencyLevel(deadline: Date | null): 'overdue' | 'critical' | 'warning' | 'normal' {
    if (!deadline) return 'normal';
    
    const now = new Date();
    const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntil < 0) return 'overdue';
    if (hoursUntil <= 24) return 'critical';
    if (hoursUntil <= 48) return 'warning';
    return 'normal';
  }

  function sortItemsByUrgency(items: BoardItem[]): BoardItem[] {
    return [...items].sort((a, b) => {
      const deadlineA = getItemDeadline(a);
      const deadlineB = getItemDeadline(b);
      
      const urgencyA = getUrgencyLevel(deadlineA);
      const urgencyB = getUrgencyLevel(deadlineB);
      
      const urgencyOrder = { overdue: 0, critical: 1, warning: 2, normal: 3 };
      
      // Sort by urgency first
      if (urgencyOrder[urgencyA] !== urgencyOrder[urgencyB]) {
        return urgencyOrder[urgencyA] - urgencyOrder[urgencyB];
      }
      
      // Then by deadline if both have one
      if (deadlineA && deadlineB) {
        return deadlineA.getTime() - deadlineB.getTime();
      }
      
      // Then by creation date
      const dateA = a.data.createdAt || a.data.timestamp;
      const dateB = b.data.createdAt || b.data.timestamp;
      return dateB.getTime() - dateA.getTime();
    });
  }

  // Group items by column
  const columnItems: Record<ColumnStatus, BoardItem[]> = {
    'new': [],
    'in-progress': [],
    'blocked': [],
    'resolved': [],
  };

  items.forEach(item => {
    const status = getItemStatus(item);
    const columnId = getItemColumn(status);
    columnItems[columnId].push(item);
  });

  // Sort items in each column
  Object.keys(columnItems).forEach(key => {
    columnItems[key as ColumnStatus] = sortItemsByUrgency(columnItems[key as ColumnStatus]);
  });

  // Drag handlers
  function handleDragStart(item: BoardItem) {
    setDraggedItem(item);
  }

  function handleDragOver(e: React.DragEvent, columnId: ColumnStatus) {
    e.preventDefault();
    setDragOverColumn(columnId);
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  async function handleDrop(e: React.DragEvent, targetColumnId: ColumnStatus) {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedItem || !onStatusChange) return;
    
    const currentColumn = getItemColumn(getItemStatus(draggedItem));
    if (currentColumn === targetColumnId) return;
    
    // Map column to status
    const newStatus = COLUMNS.find(c => c.id === targetColumnId)?.statuses[0];
    if (!newStatus) return;
    
    await onStatusChange(draggedItem.id, draggedItem.type, newStatus);
    setDraggedItem(null);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(column => (
          <div
            key={column.id}
            className={`flex-shrink-0 w-80 bg-gray-50 rounded-lg p-4 ${
              dragOverColumn === column.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">{column.title}</h3>
              <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs font-semibold">
                {columnItems[column.id].length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {columnItems[column.id].map(item => (
                <BoardCard
                  key={item.id}
                  item={item}
                  onDragStart={() => handleDragStart(item)}
                />
              ))}
              
              {columnItems[column.id].length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-8">
                  No items
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BoardCardProps {
  item: BoardItem;
  onDragStart: () => void;
}

function incidentMarketLabel(incident: Incident): string {
  const codes = (incident.countryImpact || [])
    .filter((c) => c.impactedVolume > 0 || c.complaintsReceived > 0)
    .map((c) => c.country);
  if (codes.length === 0) return '—';
  if (codes.length <= 3) return codes.join(', ');
  return `${codes.slice(0, 3).join(', ')} +${codes.length - 3}`;
}

function boardCardAssignee(item: BoardItem): string {
  if (item.type === 'case') {
    return item.data.teamMember || item.data.assignedTo || 'Unassigned';
  }
  if (item.type === 'incident') {
    return item.data.assignedTo || item.data.createdBy || 'Unassigned';
  }
  return item.data.assignedTo || 'Unassigned';
}

function BoardCard({ item, onDragStart }: BoardCardProps) {
  const deadline =
    item.type === 'escalation'
      ? item.data.deadlineFirstReply
      : item.type === 'incident'
        ? item.data.notificationDeadline ??
          new Date(item.data.discoveryDate.getTime() + 72 * 60 * 60 * 1000)
        : null;
  const urgency = deadline ? getUrgencyLevel(deadline) : 'normal';
  
  // Get item details
  const itemId = 
    item.type === 'case' ? item.data.caseId :
    item.type === 'incident' ? item.data.incidentId :
    item.data.escalationId;
  
  const summary = 
    item.type === 'case' ? item.data.caseDescription :
    item.type === 'incident' ? item.data.natureOfIncident :
    item.data.summary;
  
  const assignee = boardCardAssignee(item);
  const market =
    item.type === 'case' || item.type === 'escalation'
      ? item.data.market
      : incidentMarketLabel(item.data);
  
  const category = 
    item.type === 'case' ? (item.data.primaryCategory || 'Uncategorized') :
    item.type === 'incident' ? item.data.affectedSystems[0] :
    item.data.subject;
  
  // Type colors
  const borderColor = 
    item.type === 'case' ? 'border-l-blue-500' :
    item.type === 'incident' ? 'border-l-red-500' :
    'border-l-orange-500';
  
  // Urgency background
  const bgColor = urgency === 'overdue' ? 'bg-red-50' : 'bg-white';
  
  // Deadline chip color
  const chipColor = 
    urgency === 'overdue' ? 'bg-red-100 text-red-700 border-red-300' :
    urgency === 'critical' ? 'bg-orange-100 text-orange-700 border-orange-300' :
    urgency === 'warning' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
    'bg-gray-100 text-gray-600 border-gray-300';
  
  const href = 
    item.type === 'case' ? `/cases/${item.id}` :
    item.type === 'incident' ? `/incidents/${item.id}` :
    `/escalations/${item.id}`;

  function getUrgencyLevel(deadline: Date | null): 'overdue' | 'critical' | 'warning' | 'normal' {
    if (!deadline) return 'normal';
    const now = new Date();
    const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntil < 0) return 'overdue';
    if (hoursUntil <= 24) return 'critical';
    if (hoursUntil <= 48) return 'warning';
    return 'normal';
  }

  return (
    <Link
      href={href}
      draggable
      onDragStart={onDragStart}
      className={`block border-l-4 ${borderColor} ${bgColor} rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-move border border-gray-200`}
    >
      {/* ID */}
      <div className="font-mono text-xs text-gray-500 mb-2">{itemId}</div>
      
      {/* Summary */}
      <p className="text-sm text-gray-900 line-clamp-2 mb-3 font-medium">
        {summary}
      </p>
      
      {/* Tags Row */}
      <div className="flex flex-wrap gap-2 mb-2">
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
          {market}
        </span>
        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
          {category}
        </span>
      </div>
      
      {/* Bottom Row */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">{assignee}</span>
        {deadline && (
          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${chipColor}`}>
            {deadline.toLocaleDateString()}
          </span>
        )}
      </div>
    </Link>
  );
}
