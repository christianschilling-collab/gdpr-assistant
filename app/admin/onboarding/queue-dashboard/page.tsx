'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { isGdprAssistantAdminEmail } from '@/lib/auth/gdprAssistantAdmins';

interface QueueItem {
  id: string;
  type: 'deletion' | 'dsar' | 'complaint' | 'ad_revocation' | 'special_case';
  description: string;
  priority: 'high' | 'medium' | 'low';
  sla: string;
  status: 'pending' | 'in_progress' | 'completed' | 'escalated';
  assignee?: string;
  dueDate: Date;
  source: string;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: 'morning' | 'ongoing' | 'evening';
  tools: string[];
}

export default function QueueDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentDate] = useState(new Date());
  const [selectedTab, setSelectedTab] = useState<'queue' | 'checklist'>('queue');
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  
  // Sample queue data based on GDPR workflows
  const sampleQueue: QueueItem[] = [
    {
      id: '1',
      type: 'deletion',
      description: 'Customer deletion request - MineOS flagged exception',
      priority: 'high',
      sla: '30 days',
      status: 'pending',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      source: 'MineOS Exception'
    },
    {
      id: '2', 
      type: 'dsar',
      description: 'Data Subject Access Request - new customer',
      priority: 'high',
      sla: '30 days',
      status: 'in_progress',
      assignee: user?.email,
      dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      source: 'Gmail GDPR Inbox'
    },
    {
      id: '3',
      type: 'complaint',
      description: 'Customer complaint about data processing',
      priority: 'high',
      sla: '30 days', 
      status: 'pending',
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      source: 'Customer Care Escalation'
    },
    {
      id: '4',
      type: 'ad_revocation',
      description: 'Non-customer email opt-out request',
      priority: 'medium',
      sla: '3 days',
      status: 'completed',
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      source: 'Stop Email Sheet'
    }
  ];

  // Daily checklist based on "Daily Queue Processing Checklist" from GDPR Hub
  const dailyChecklist: ChecklistItem[] = [
    // Morning Tasks
    {
      id: 'morning_1',
      title: 'Check MineOS Exception Queue',
      description: 'Review deletion requests flagged by autopilot',
      completed: false,
      category: 'morning',
      tools: ['MineOS']
    },
    {
      id: 'morning_2', 
      title: 'Review Gmail GDPR Inbox',
      description: 'Check new requests with GDPR label filter',
      completed: false,
      category: 'morning',
      tools: ['Gmail']
    },
    {
      id: 'morning_3',
      title: 'Check Jira Dashboard',
      description: 'Review assigned tickets and approaching deadlines',
      completed: false,
      category: 'morning', 
      tools: ['Jira']
    },
    {
      id: 'morning_4',
      title: 'Review Jira Deadline Filter',
      description: 'Check tickets approaching 30-day SLA',
      completed: false,
      category: 'morning',
      tools: ['Jira Deadline Filter']
    },
    
    // Ongoing Tasks
    {
      id: 'ongoing_1',
      title: 'Process Priority Cases',
      description: 'Work on high-priority GDPR requests',
      completed: false,
      category: 'ongoing',
      tools: ['OWL', 'PureCloud/Genesys', 'Various']
    },
    {
      id: 'ongoing_2',
      title: 'Update Customer Records',
      description: 'Maintain accurate customer data in OWL',
      completed: false,
      category: 'ongoing',
      tools: ['OWL']
    },
    {
      id: 'ongoing_3',
      title: 'Handle Escalations',
      description: 'Process escalated cases using POC Directory',
      completed: false,
      category: 'ongoing',
      tools: ['POC Directory', 'Escalation Criteria']
    },
    {
      id: 'ongoing_4',
      title: 'Maintain Google Sheets',
      description: 'Update Stop Email Sheet and DP Blacklist',
      completed: false,
      category: 'ongoing',
      tools: ['Stop Email Sheet', 'DP Blacklist']
    },
    
    // Evening Tasks
    {
      id: 'evening_1',
      title: 'Update Jira Tickets',
      description: 'Add progress notes and update status',
      completed: false,
      category: 'evening',
      tools: ['Jira']
    },
    {
      id: 'evening_2',
      title: 'Log Serious Cases',
      description: 'Document any incidents in Incident Log',
      completed: false,
      category: 'evening',
      tools: ['Incident Log']
    },
    {
      id: 'evening_3',
      title: 'Clean DSAR Drive',
      description: 'Verify auto-deletion of 6+ week old files',
      completed: false,
      category: 'evening',
      tools: ['DSAR Google Drive']
    }
  ];

  useEffect(() => {
    if (!user?.email || !isGdprAssistantAdminEmail(user.email)) {
      router.push('/cases');
      return;
    }
    
    setQueueItems(sampleQueue);
    setChecklist(dailyChecklist);
  }, [user, router]);

  const handleQueueStatusUpdate = (itemId: string, newStatus: QueueItem['status']) => {
    setQueueItems(items => items.map(item => 
      item.id === itemId ? { ...item, status: newStatus } : item
    ));
  };

  const handleChecklistToggle = (itemId: string) => {
    setChecklist(items => items.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'escalated': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'deletion': return 'bg-red-100 text-red-800';
      case 'dsar': return 'bg-blue-100 text-blue-800';
      case 'complaint': return 'bg-orange-100 text-orange-800';
      case 'ad_revocation': return 'bg-green-100 text-green-800';
      case 'special_case': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const completedTasks = checklist.filter(item => item.completed).length;
  const totalTasks = checklist.length;
  const progressPercentage = (completedTasks / totalTasks) * 100;

  const categorizedChecklist = {
    morning: checklist.filter(item => item.category === 'morning'),
    ongoing: checklist.filter(item => item.category === 'ongoing'), 
    evening: checklist.filter(item => item.category === 'evening')
  };

  if (!user?.email || !isGdprAssistantAdminEmail(user.email)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Daily Queue Processing Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {currentDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="text-2xl font-bold text-blue-600">
              {queueItems.filter(item => item.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending Items</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="text-2xl font-bold text-orange-600">
              {queueItems.filter(item => item.status === 'in_progress').length}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="text-2xl font-bold text-red-600">
              {queueItems.filter(item => item.dueDate < new Date()).length}
            </div>
            <div className="text-sm text-gray-600">Overdue</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="text-2xl font-bold text-green-600">
              {Math.round(progressPercentage)}%
            </div>
            <div className="text-sm text-gray-600">Daily Progress</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setSelectedTab('queue')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'queue'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                GDPR Queue
              </button>
              <button
                onClick={() => setSelectedTab('checklist')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'checklist'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Daily Checklist
              </button>
            </nav>
          </div>
        </div>

        {/* Queue Tab */}
        {selectedTab === 'queue' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">Current Queue Items</h2>
              <p className="text-sm text-gray-600 mt-1">Based on GDPR Team Hub workflows</p>
            </div>
            <div className="p-6">
              {queueItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No queue items for today
                </div>
              ) : (
                <div className="space-y-4">
                  {queueItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                              {item.type.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className={`px-2 py-1 rounded border text-xs ${getPriorityColor(item.priority)}`}>
                              {item.priority.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">SLA: {item.sla}</span>
                          </div>
                          <h3 className="font-medium text-gray-900 mb-1">{item.description}</h3>
                          <div className="text-sm text-gray-600">
                            <span>Source: {item.source}</span>
                            <span className="mx-2">•</span>
                            <span>Due: {item.dueDate.toLocaleDateString()}</span>
                            {item.assignee && (
                              <>
                                <span className="mx-2">•</span>
                                <span>Assigned: {item.assignee}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full border text-sm ${getStatusColor(item.status)}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                          <select
                            value={item.status}
                            onChange={(e) => handleQueueStatusUpdate(item.id, e.target.value as QueueItem['status'])}
                            className="border border-gray-300 rounded px-3 py-1 text-sm"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="escalated">Escalated</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Checklist Tab */}
        {selectedTab === 'checklist' && (
          <div className="space-y-6">
            {Object.entries(categorizedChecklist).map(([category, items]) => (
              <div key={category} className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b">
                  <h2 className="text-xl font-bold text-gray-900 capitalize">
                    {category} Tasks
                  </h2>
                  <div className="text-sm text-gray-600 mt-1">
                    {items.filter(item => item.completed).length} of {items.length} completed
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleChecklistToggle(item.id)}
                          className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <h3 className={`font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {item.title}
                          </h3>
                          <p className={`text-sm ${item.completed ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                            {item.description}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {item.tools.map((tool, index) => (
                              <span 
                                key={index}
                                className={`px-2 py-1 rounded text-xs ${item.completed ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-800'}`}
                              >
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}