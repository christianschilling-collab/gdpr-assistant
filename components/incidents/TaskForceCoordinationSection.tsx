'use client';

import { useState, useEffect } from 'react';
import { 
  getAllTaskForceMembers, 
  getTaskForceMembersByMarket 
} from '@/lib/firebase/taskForce';
import { 
  getIncidentUpdates, 
  addIncidentUpdate, 
  updateIncidentTaskForce 
} from '@/lib/firebase/incidentUpdates';
import { TaskForceMember, Incident, IncidentUpdate } from '@/lib/types';
import { useToast } from '@/lib/contexts/ToastContext';
import { 
  UsersIcon, 
  ChatBubbleLeftRightIcon, 
  PlusIcon,
  UserIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  TagIcon,
  CalendarIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

interface TaskForceCoordinationSectionProps {
  incident: Incident;
  userEmail: string;
  onUpdated: () => Promise<void>;
}

export function TaskForceCoordinationSection({ 
  incident, 
  userEmail, 
  onUpdated 
}: TaskForceCoordinationSectionProps) {
  const { addToast } = useToast();
  const [allMembers, setAllMembers] = useState<TaskForceMember[]>([]);
  const [updates, setUpdates] = useState<IncidentUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAddUpdateModal, setShowAddUpdateModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, [incident.id]);

  async function loadData() {
    try {
      setLoading(true);
      const [membersData, updatesData] = await Promise.all([
        getAllTaskForceMembers(),
        getIncidentUpdates(incident.id)
      ]);
      
      setAllMembers(membersData);
      setUpdates(updatesData);
    } catch (error) {
      console.error('Error loading task-force data:', error);
      addToast('Failed to load task-force data', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignTaskForce(assignment: {
    assignedMembers: string[];
    leadMember?: string;
    slackChannelId?: string;
    slackChannelName?: string;
  }) {
    try {
      setUpdating(true);
      
      // Create a default task-force if not specified
      const taskForceAssignment = {
        taskForceId: 'default-gdpr-incident-taskforce',
        ...assignment,
      };
      
      await updateIncidentTaskForce(incident.id, taskForceAssignment, userEmail);
      
      // Add audit update
      const memberNames = allMembers
        .filter(m => assignment.assignedMembers.includes(m.id))
        .map(m => m.name)
        .join(', ');
        
      await addIncidentUpdate(
        incident.id,
        'action',
        'Task-Force Assignment Updated',
        `Assigned task-force members: ${memberNames}${assignment.leadMember ? 
          `. Lead: ${allMembers.find(m => m.id === assignment.leadMember)?.name || 'Unknown'}` : ''
        }${assignment.slackChannelName ? `. Slack: #${assignment.slackChannelName}` : ''}`,
        userEmail,
        userEmail.split('@')[0], // Simple name from email
        'task-force'
      );
      
      addToast('Task-force assignment updated', 'success');
      setShowAssignModal(false);
      await onUpdated();
      await loadData();
    } catch (error) {
      console.error('Error assigning task-force:', error);
      addToast('Failed to assign task-force', 'error');
    } finally {
      setUpdating(false);
    }
  }

  async function handleAddUpdate(updateData: {
    type: IncidentUpdate['type'];
    title: string;
    content: string;
    visibility: IncidentUpdate['visibility'];
  }) {
    try {
      setUpdating(true);
      
      await addIncidentUpdate(
        incident.id,
        updateData.type,
        updateData.title,
        updateData.content,
        userEmail,
        userEmail.split('@')[0], // Simple name from email
        updateData.visibility
      );
      
      addToast('Update added successfully', 'success');
      setShowAddUpdateModal(false);
      await loadData();
    } catch (error) {
      console.error('Error adding update:', error);
      addToast('Failed to add update', 'error');
    } finally {
      setUpdating(false);
    }
  }

  const assignedMembers = incident.assignedTaskForce?.assignedMembers || [];
  const currentAssignedMembers = allMembers.filter(m => assignedMembers.includes(m.id));
  const leadMember = incident.assignedTaskForce?.leadMember 
    ? allMembers.find(m => m.id === incident.assignedTaskForce?.leadMember)
    : null;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-blue-600" />
            Task-Force Coordination
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
            >
              <UserIcon className="w-4 h-4" />
              {currentAssignedMembers.length > 0 ? 'Manage Members' : 'Assign Team'}
            </button>
            <button
              onClick={() => setShowAddUpdateModal(true)}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" />
              Add Update
            </button>
          </div>
        </div>

        {/* Current Assignment */}
        {currentAssignedMembers.length > 0 ? (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Active Task-Force Members ({currentAssignedMembers.length})
            </h3>
            <div className="space-y-2">
              {currentAssignedMembers.map((member) => (
                <div 
                  key={member.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    leadMember?.id === member.id 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {member.name}
                        {leadMember?.id === member.id && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                            Lead
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">{member.title}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <BuildingOfficeIcon className="w-4 h-4" />
                      {member.department}
                    </div>
                    <div className="flex items-center gap-1">
                      <GlobeAltIcon className="w-4 h-4" />
                      <span className="flex gap-1">
                        {member.markets.slice(0, 3).map(m => (
                          <span key={m} className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                            {m}
                          </span>
                        ))}
                        {member.markets.length > 3 && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            +{member.markets.length - 3}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Slack Channel */}
            {incident.assignedTaskForce?.slackChannelName && (
              <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-900">Slack Channel:</span>
                  {incident.assignedTaskForce.slackChannelId ? (
                    <a 
                      href={`slack://channel?team=${incident.assignedTaskForce.slackChannelId}`}
                      className="text-purple-700 hover:text-purple-900 flex items-center gap-1"
                    >
                      #{incident.assignedTaskForce.slackChannelName}
                      <LinkIcon className="w-4 h-4" />
                    </a>
                  ) : (
                    <span className="text-purple-700">
                      #{incident.assignedTaskForce.slackChannelName}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <UsersIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">No Task-Force Assigned</p>
                <p className="text-sm text-amber-800 mt-1">
                  This incident hasn't been assigned to a task-force yet. Click "Assign Team" to select members.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Updates */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Recent Updates ({updates.length})
          </h3>
          {updates.length === 0 ? (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-500 text-sm italic">
              No updates yet. Add the first update to start tracking coordination activities.
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {updates.slice(0, 5).map((update) => (
                <div key={update.id} className="border-l-4 border-blue-300 pl-4 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          update.type === 'status' ? 'bg-blue-100 text-blue-800' :
                          update.type === 'communication' ? 'bg-green-100 text-green-800' :
                          update.type === 'decision' ? 'bg-purple-100 text-purple-800' :
                          update.type === 'action' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {update.type}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          update.visibility === 'internal' ? 'bg-gray-100 text-gray-700' :
                          update.visibility === 'legal-only' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {update.visibility}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 text-sm">{update.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{update.content}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500 flex-shrink-0">
                      <div>{update.timestamp.toLocaleDateString()}</div>
                      <div>{update.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="font-medium">by {update.authorName}</div>
                    </div>
                  </div>
                </div>
              ))}
              {updates.length > 5 && (
                <div className="text-center">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View all {updates.length} updates
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Task-Force Assignment Modal */}
      {showAssignModal && (
        <TaskForceAssignmentModal
          incident={incident}
          allMembers={allMembers}
          currentAssignment={incident.assignedTaskForce}
          onSave={handleAssignTaskForce}
          onCancel={() => setShowAssignModal(false)}
          updating={updating}
        />
      )}

      {/* Add Update Modal */}
      {showAddUpdateModal && (
        <AddUpdateModal
          onSave={handleAddUpdate}
          onCancel={() => setShowAddUpdateModal(false)}
          updating={updating}
        />
      )}
    </>
  );
}

// Task-Force Assignment Modal
interface TaskForceAssignmentModalProps {
  incident: Incident;
  allMembers: TaskForceMember[];
  currentAssignment?: Incident['assignedTaskForce'];
  onSave: (assignment: {
    assignedMembers: string[];
    leadMember?: string;
    slackChannelId?: string;
    slackChannelName?: string;
  }) => Promise<void>;
  onCancel: () => void;
  updating: boolean;
}

function TaskForceAssignmentModal({
  incident,
  allMembers,
  currentAssignment,
  onSave,
  onCancel,
  updating
}: TaskForceAssignmentModalProps) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    currentAssignment?.assignedMembers || []
  );
  const [leadMember, setLeadMember] = useState<string>(
    currentAssignment?.leadMember || ''
  );
  const [slackChannelName, setSlackChannelName] = useState<string>(
    currentAssignment?.slackChannelName || ''
  );

  // Filter members by incident markets if available
  const relevantMembers = incident.affectedMarkets && incident.affectedMarkets.length > 0
    ? allMembers.filter(member => 
        incident.affectedMarkets!.some(market => member.markets.includes(market))
      )
    : allMembers;

  function toggleMember(memberId: string) {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
    
    // Clear lead if they're being removed
    if (leadMember === memberId && !selectedMembers.includes(memberId)) {
      setLeadMember('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedMembers.length === 0) return;

    await onSave({
      assignedMembers: selectedMembers,
      leadMember: leadMember || undefined,
      slackChannelName: slackChannelName.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Assign Task-Force Members
          </h2>

          {/* Incident Context */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">Incident Context</h3>
            <div className="text-sm text-blue-800">
              <p><strong>ID:</strong> {incident.incidentId}</p>
              <p><strong>Nature:</strong> {incident.natureOfIncident}</p>
              {incident.affectedMarkets && incident.affectedMarkets.length > 0 && (
                <p><strong>Markets:</strong> {incident.affectedMarkets.join(', ')}</p>
              )}
            </div>
          </div>

          {/* Member Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Select Members ({selectedMembers.length} selected)
            </h3>
            {incident.affectedMarkets && incident.affectedMarkets.length > 0 && (
              <p className="text-sm text-gray-600 mb-3">
                Showing members with expertise in affected markets: <strong>{incident.affectedMarkets.join(', ')}</strong>
              </p>
            )}
            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {relevantMembers.map((member) => (
                <label key={member.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => toggleMember(member.id)}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{member.name}</div>
                    <div className="text-sm text-gray-600">{member.title} • {member.department}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-1">
                        {member.markets.slice(0, 4).map(market => (
                          <span key={market} className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                            {market}
                          </span>
                        ))}
                      </div>
                      {member.specialties.length > 0 && (
                        <div className="flex gap-1">
                          {member.specialties.slice(0, 2).map(specialty => (
                            <span key={specialty} className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-xs">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Lead Member */}
          {selectedMembers.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead Member (Optional)
              </label>
              <select
                value={leadMember}
                onChange={(e) => setLeadMember(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No lead assigned</option>
                {selectedMembers.map(memberId => {
                  const member = allMembers.find(m => m.id === memberId);
                  return member ? (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.title})
                    </option>
                  ) : null;
                })}
              </select>
            </div>
          )}

          {/* Slack Channel */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slack Channel (Optional)
            </label>
            <input
              type="text"
              value={slackChannelName}
              onChange={(e) => setSlackChannelName(e.target.value)}
              placeholder="incident-2024-001-gdpr"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Channel name only (without #). Link will be displayed in the incident.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating || selectedMembers.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {updating ? 'Saving...' : 'Assign Task-Force'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Update Modal
interface AddUpdateModalProps {
  onSave: (updateData: {
    type: IncidentUpdate['type'];
    title: string;
    content: string;
    visibility: IncidentUpdate['visibility'];
  }) => Promise<void>;
  onCancel: () => void;
  updating: boolean;
}

function AddUpdateModal({ onSave, onCancel, updating }: AddUpdateModalProps) {
  const [type, setType] = useState<IncidentUpdate['type']>('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<IncidentUpdate['visibility']>('task-force');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    await onSave({
      type,
      title: title.trim(),
      content: content.trim(),
      visibility,
    });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Add Task-Force Update
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Update Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as IncidentUpdate['type'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="note">Note</option>
                <option value="status">Status Update</option>
                <option value="communication">Communication</option>
                <option value="decision">Decision</option>
                <option value="action">Action Taken</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility *
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as IncidentUpdate['visibility'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="task-force">Task-Force</option>
                <option value="internal">Internal</option>
                <option value="legal-only">Legal Only</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief update title"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Detailed update information..."
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating || !title.trim() || !content.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {updating ? 'Adding...' : 'Add Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}