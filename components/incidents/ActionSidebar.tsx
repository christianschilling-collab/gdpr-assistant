'use client';

import { useState } from 'react';
import { 
  ClockIcon,
  UsersIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  DocumentChartBarIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { Incident, IncidentTask, IncidentAuditLog, TaskForceMember } from '@/lib/types';
import { TaskAssigneeDisplay } from './TaskAssigneeDisplay';

interface ActionSidebarProps {
  incident: Incident;
  tasks: IncidentTask[];
  auditLog: IncidentAuditLog[];
  taskForceMembers?: TaskForceMember[];
  onCompleteTask: (taskId: string) => Promise<void>;
  onReopenTask: (taskId: string) => Promise<void>;
  onExportPDF: () => Promise<void>;
  onExportCSV: () => void;
  onOpenTaskForceModal?: () => void;
  onOpenUpdateModal?: () => void;
  className?: string;
}

export function ActionSidebar({
  incident,
  tasks,
  auditLog,
  taskForceMembers = [],
  onCompleteTask,
  onReopenTask,
  onExportPDF,
  onExportCSV,
  onOpenTaskForceModal,
  onOpenUpdateModal,
  className = ''
}: ActionSidebarProps) {
  const [expandedSections, setExpandedSections] = useState({
    quickActions: true,
    nextSteps: true,
    taskForce: true,
    recentActivity: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Calculate stats
  const openTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const highPriorityTasks = openTasks.filter(t => t.priority === 'High');
  
  // Art. 33 calculations  
  const art33Deadline = incident.notificationDeadline || new Date(incident.discoveryDate.getTime() + 72 * 60 * 60 * 1000);
  const hoursRemaining = Math.floor((art33Deadline.getTime() - Date.now()) / (1000 * 60 * 60));
  const isArt33Overdue = hoursRemaining < 0 && !incident.authorityNotifiedAt;

  // Get assigned task-force members
  const assignedMembers = taskForceMembers.filter(m => 
    incident.assignedTaskForce?.assignedMembers.includes(m.id)
  );

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm h-fit sticky top-6 ${className}`}>
      {/* Quick Actions */}
      <div className="p-6 border-b border-gray-100">
        <button
          onClick={() => toggleSection('quickActions')}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
          {expandedSections.quickActions ? (
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.quickActions && (
          <div className="mt-4 space-y-2">
            {/* Export Actions */}
            <div className="flex gap-2">
              <button
                onClick={onExportPDF}
                className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={onExportCSV}
                className="flex-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <DocumentChartBarIcon className="w-4 h-4" />
                Export CSV
              </button>
            </div>
            
            {/* Task-Force Actions */}
            <button
              onClick={onOpenTaskForceModal}
              className="w-full px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <UsersIcon className="w-4 h-4" />
              {assignedMembers.length > 0 ? 'Manage Task-Force' : 'Assign Task-Force'}
            </button>
            
            {/* Add Update */}
            <button
              onClick={onOpenUpdateModal}
              className="w-full px-3 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Add Update
            </button>
          </div>
        )}
      </div>

      {/* Art. 33 Status */}
      <div className={`p-6 border-b border-gray-100 ${
        incident.authorityNotifiedAt ? 'bg-green-50' :
        isArt33Overdue ? 'bg-red-50' :
        hoursRemaining < 24 ? 'bg-amber-50' : ''
      }`}>
        <div className="flex items-center gap-3 mb-2">
          <ClockIcon className={`w-5 h-5 ${
            incident.authorityNotifiedAt ? 'text-green-600' :
            isArt33Overdue ? 'text-red-600' :
            hoursRemaining < 24 ? 'text-amber-600' : 'text-gray-600'
          }`} />
          <h3 className="font-semibold text-gray-900">Art. 33 Status</h3>
        </div>
        
        {incident.authorityNotifiedAt ? (
          <div className="text-sm text-green-800">
            ✅ Authority notified on {incident.authorityNotifiedAt.toLocaleDateString()}
          </div>
        ) : isArt33Overdue ? (
          <div className="text-sm text-red-800">
            ⚠️ OVERDUE - Review notification status
          </div>
        ) : (
          <div>
            <div className="text-sm font-medium text-gray-900">
              {hoursRemaining}h remaining
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Deadline: {art33Deadline.toLocaleString()}
            </div>
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  hoursRemaining < 12 ? 'bg-red-500' :
                  hoursRemaining < 24 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ 
                  width: `${Math.max(0, Math.min(100, (72 - (72 - hoursRemaining)) / 72 * 100))}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Next Steps / Open Tasks */}
      <div className="p-6 border-b border-gray-100">
        <button
          onClick={() => toggleSection('nextSteps')}
          className="flex items-center justify-between w-full text-left mb-4"
        >
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">Next Steps</h3>
            {openTasks.length > 0 && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                {openTasks.length}
              </span>
            )}
          </div>
          {expandedSections.nextSteps ? (
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.nextSteps && (
          <div className="space-y-3">
            {openTasks.length === 0 ? (
              <div className="text-sm text-gray-500 italic text-center py-4">
                No pending tasks
              </div>
            ) : (
              <>
                {/* High Priority Tasks First */}
                {highPriorityTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onComplete={() => onCompleteTask(task.id)}
                    onReopen={() => onReopenTask(task.id)}
                    compact
                  />
                ))}
                
                {/* Regular Tasks */}
                {openTasks.filter(t => t.priority !== 'High').slice(0, 3).map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onComplete={() => onCompleteTask(task.id)}
                    onReopen={() => onReopenTask(task.id)}
                    compact
                  />
                ))}
                
                {openTasks.length > 3 && (
                  <div className="text-center">
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      View all {openTasks.length} tasks
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Task-Force */}
      {assignedMembers.length > 0 && (
        <div className="p-6 border-b border-gray-100">
          <button
            onClick={() => toggleSection('taskForce')}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Task-Force</h3>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {assignedMembers.length}
              </span>
            </div>
            {expandedSections.taskForce ? (
              <ChevronDownIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {expandedSections.taskForce && (
            <div className="space-y-2">
              {assignedMembers.slice(0, 3).map(member => (
                <div key={member.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 font-semibold text-sm">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{member.name}</div>
                    <div className="text-xs text-gray-600">{member.title}</div>
                  </div>
                  {incident.assignedTaskForce?.leadMember === member.id && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      Lead
                    </span>
                  )}
                </div>
              ))}
              
              {assignedMembers.length > 3 && (
                <div className="text-center">
                  <button 
                    onClick={onOpenTaskForceModal}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View all {assignedMembers.length} members
                  </button>
                </div>
              )}

              {/* Slack Channel */}
              {incident.assignedTaskForce?.slackChannelName && (
                <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-purple-900">
                      #{incident.assignedTaskForce.slackChannelName}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="p-6">
        <button
          onClick={() => toggleSection('recentActivity')}
          className="flex items-center justify-between w-full text-left mb-4"
        >
          <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          {expandedSections.recentActivity ? (
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.recentActivity && (
          <div className="space-y-3">
            {auditLog.length === 0 ? (
              <div className="text-sm text-gray-500 italic text-center py-4">
                No recent activity
              </div>
            ) : (
              <>
                {auditLog.slice(0, 5).map(entry => (
                  <div key={entry.id} className="border-l-2 border-blue-300 pl-3 py-1">
                    <div className="text-sm font-medium text-gray-900">{entry.action}</div>
                    {entry.fieldChanged && (
                      <div className="text-xs text-gray-600">
                        {entry.fieldChanged}: {entry.oldValue} → {entry.newValue}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      {entry.timestamp.toLocaleDateString()} • {entry.userEmail.split('@')[0]}
                    </div>
                  </div>
                ))}
                
                {auditLog.length > 5 && (
                  <div className="text-center">
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      View full audit log
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Progress Summary */}
      <div className="p-6 bg-gray-50 rounded-b-xl">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {completedTasks.length}/{tasks.length}
          </div>
          <div className="text-sm text-gray-600">Tasks Completed</div>
          {tasks.length > 0 && (
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-green-600 h-1.5 rounded-full transition-all"
                style={{ width: `${(completedTasks.length / tasks.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact Task Card for Sidebar
interface TaskCardProps {
  task: IncidentTask;
  onComplete: () => Promise<void>;
  onReopen: () => Promise<void>;
  compact?: boolean;
}

function TaskCard({ task, onComplete, onReopen, compact = false }: TaskCardProps) {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      if (task.status === 'completed') {
        await onReopen();
      } else {
        await onComplete();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`p-3 rounded-lg border-2 transition-all ${
      task.status === 'completed' 
        ? 'bg-gray-50 border-gray-200' 
        : task.priority === 'High' 
          ? 'bg-red-50 border-red-300' 
          : 'bg-white border-yellow-300'
    }`}>
      <div className="flex items-start gap-2">
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
            task.status === 'completed'
              ? 'bg-green-600 border-green-600 text-white'
              : 'border-gray-300 hover:border-green-500 hover:bg-green-50'
          }`}
        >
          {loading ? (
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
          ) : task.status === 'completed' ? (
            <CheckCircleIcon className="w-3 h-3" />
          ) : null}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${
            task.status === 'completed' ? 'text-gray-600 line-through' : 'text-gray-900'
          }`}>
            {task.title}
          </div>
          
          {compact && (
            <div className="flex items-center gap-2 mt-1">
              {task.priority === 'High' && (
                <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded">
                  High
                </span>
              )}
              <TaskAssigneeDisplay 
                task={task} 
                className="text-xs text-gray-500 flex items-center gap-1"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}