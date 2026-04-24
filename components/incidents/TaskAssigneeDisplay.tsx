'use client';

import { useState, useEffect } from 'react';
import { UserIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { TaskForceMember } from '@/lib/types';
import { getAllTaskForceMembers } from '@/lib/firebase/taskForce';

interface TaskAssigneeDisplayProps {
  task: {
    owner: string; // Legacy email-based assignment
    assignedTo?: {
      id: string;
      name: string;
      email?: string;
      type: 'user' | 'taskforce_member' | 'external';
    };
  };
  className?: string;
}

export function TaskAssigneeDisplay({ task, className = "text-gray-500 flex items-center gap-1" }: TaskAssigneeDisplayProps) {
  const [taskForceMembers, setTaskForceMembers] = useState<TaskForceMember[]>([]);
  const [memberFound, setMemberFound] = useState<TaskForceMember | null>(null);

  useEffect(() => {
    loadTaskForceMembers();
  }, []);

  useEffect(() => {
    if (taskForceMembers.length > 0 && task.owner) {
      // Try to find task-force member by email
      const member = taskForceMembers.find(m => m.email === task.owner);
      setMemberFound(member || null);
    }
  }, [taskForceMembers, task.owner]);

  async function loadTaskForceMembers() {
    try {
      const members = await getAllTaskForceMembers();
      setTaskForceMembers(members);
    } catch (error) {
      console.error('Error loading task-force members:', error);
    }
  }

  // If new assignedTo format is used
  if (task.assignedTo) {
    return (
      <span className={className}>
        <UserIcon className="w-3 h-3" />
        <span className="font-medium">
          {task.assignedTo.name}
        </span>
        {task.assignedTo.type === 'taskforce_member' && (
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium ml-1">
            Task-Force
          </span>
        )}
        {task.assignedTo.type === 'external' && (
          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium ml-1">
            External
          </span>
        )}
      </span>
    );
  }

  // Legacy format - try to enhance with task-force member info
  const displayName = task.owner.split('@')[0];

  return (
    <span className={className}>
      <UserIcon className="w-3 h-3" />
      {memberFound ? (
        <>
          <span className="font-medium" title={`${memberFound.title} (${memberFound.email})`}>
            {memberFound.name}
          </span>
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium ml-1">
            Task-Force
          </span>
        </>
      ) : (
        <span title={task.owner}>{displayName}</span>
      )}
    </span>
  );
}

interface TaskAssignmentSelectorProps {
  currentOwner: string;
  currentAssignedTo?: {
    id: string;
    name: string;
    email?: string;
    type: 'user' | 'taskforce_member' | 'external';
  };
  taskForceMembers: TaskForceMember[];
  onAssignmentChange: (assignment: {
    owner: string;
    assignedTo?: {
      id: string;
      name: string;
      email?: string;
      type: 'user' | 'taskforce_member' | 'external';
    };
  }) => void;
  className?: string;
}

export function TaskAssignmentSelector({
  currentOwner,
  currentAssignedTo,
  taskForceMembers,
  onAssignmentChange,
  className = "w-full px-3 py-2 border border-gray-300 rounded-lg"
}: TaskAssignmentSelectorProps) {
  const [selectedType, setSelectedType] = useState<'user' | 'taskforce' | 'external'>(
    currentAssignedTo?.type === 'taskforce_member' ? 'taskforce' :
    currentAssignedTo?.type === 'external' ? 'external' : 'user'
  );
  const [selectedValue, setSelectedValue] = useState<string>(
    currentAssignedTo ? currentAssignedTo.id : currentOwner
  );
  const [customName, setCustomName] = useState<string>('');
  const [customEmail, setCustomEmail] = useState<string>('');

  function handleChange() {
    if (selectedType === 'user') {
      onAssignmentChange({
        owner: selectedValue,
        assignedTo: undefined // Use legacy format
      });
    } else if (selectedType === 'taskforce') {
      const member = taskForceMembers.find(m => m.id === selectedValue);
      if (member) {
        onAssignmentChange({
          owner: member.email, // Keep legacy compatibility
          assignedTo: {
            id: member.id,
            name: member.name,
            email: member.email,
            type: 'taskforce_member'
          }
        });
      }
    } else if (selectedType === 'external') {
      onAssignmentChange({
        owner: customEmail || 'external@example.com', // Fallback
        assignedTo: {
          id: `external-${Date.now()}`,
          name: customName,
          email: customEmail,
          type: 'external'
        }
      });
    }
  }

  return (
    <div className="space-y-3">
      {/* Assignment Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assignment Type
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="assignmentType"
              value="user"
              checked={selectedType === 'user'}
              onChange={(e) => setSelectedType('user')}
              className="mr-2"
            />
            User (Email)
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="assignmentType"
              value="taskforce"
              checked={selectedType === 'taskforce'}
              onChange={(e) => setSelectedType('taskforce')}
              className="mr-2"
            />
            Task-Force Member
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="assignmentType"
              value="external"
              checked={selectedType === 'external'}
              onChange={(e) => setSelectedType('external')}
              className="mr-2"
            />
            External Person
          </label>
        </div>
      </div>

      {/* Assignment Selection */}
      {selectedType === 'user' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            User Email
          </label>
          <input
            type="email"
            value={selectedValue}
            onChange={(e) => setSelectedValue(e.target.value)}
            onBlur={handleChange}
            className={className}
            placeholder="user@hellofresh.de"
          />
        </div>
      )}

      {selectedType === 'taskforce' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Task-Force Member
          </label>
          <select
            value={selectedValue}
            onChange={(e) => { setSelectedValue(e.target.value); handleChange(); }}
            className={className}
          >
            <option value="">Select a task-force member...</option>
            {taskForceMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} - {member.title} ({member.department})
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedType === 'external' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Person Name
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onBlur={handleChange}
              className={className}
              placeholder="External Team Lead"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email (Optional)
            </label>
            <input
              type="email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              onBlur={handleChange}
              className={className}
              placeholder="external.lead@partner.com"
            />
          </div>
        </div>
      )}
    </div>
  );
}