'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getAllTaskForceMembers,
  createTaskForceMember,
  updateTaskForceMember,
  deactivateTaskForceMember,
  AVAILABLE_MARKETS,
  MARKET_GROUPS
} from '@/lib/firebase/taskForce';
import { TaskForceMember } from '@/lib/types';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { 
  UsersIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  TagIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

export default function TaskForceAdminPage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { addToast } = useToast();

  const [members, setMembers] = useState<TaskForceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TaskForceMember | null>(null);

  // Check permissions (Admin or Legal roles)
  const hasAccess = userProfile?.role === 'admin' || 
                   userProfile?.department === 'Legal' ||
                   user?.email === 'christian.schilling@hellofresh.de' || // Temporary admin access
                   (user?.email && user.email.includes('hellofresh.de')); // Temporary: All HF emails for testing

  useEffect(() => {
    if (!hasAccess) {
      addToast('Access denied. Admin or Legal role required.', 'error');
      router.push('/dashboard');
      return;
    }
    loadMembers();
  }, [hasAccess, router, addToast]);

  async function loadMembers() {
    try {
      setLoading(true);
      const data = await getAllTaskForceMembers();
      setMembers(data);
    } catch (error) {
      console.error('Error loading task-force members:', error);
      
      // Check if it's an index-related error
      if (error instanceof Error && error.message.includes('index')) {
        addToast('Firestore indexes are building. Please wait a few minutes and refresh.', 'info');
      } else {
        addToast('Failed to load task-force members', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCreateNew() {
    setEditingMember(null);
    setShowModal(true);
  }

  function handleEdit(member: TaskForceMember) {
    setEditingMember(member);
    setShowModal(true);
  }

  async function handleDeactivate(member: TaskForceMember) {
    if (!window.confirm(`Are you sure you want to deactivate ${member.name}?`)) {
      return;
    }

    try {
      await deactivateTaskForceMember(member.id, user?.email || 'system');
      addToast(`${member.name} deactivated`, 'success');
      await loadMembers();
    } catch (error) {
      console.error('Error deactivating member:', error);
      addToast('Failed to deactivate member', 'error');
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditingMember(null);
  }

  async function handleSave(memberData: Omit<TaskForceMember, 'id' | 'createdAt' | 'updatedAt'>) {
    console.log('🔍 Saving member data:', { 
      name: memberData.name,
      email: memberData.email,
      marketsCount: memberData.markets.length 
    });
    
    try {
      if (editingMember) {
        // Update existing
        console.log('📝 Updating existing member:', editingMember.id);
        await updateTaskForceMember(editingMember.id, memberData, user?.email || 'system');
        addToast('Member updated successfully', 'success');
      } else {
        // Create new
        console.log('➕ Creating new member');
        const newId = await createTaskForceMember(memberData, user?.email || 'system');
        console.log('✅ Created with ID:', newId);
        addToast('Member created successfully', 'success');
      }
      
      closeModal();
      await loadMembers();
    } catch (error) {
      console.error('❌ Error saving member:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        memberData: { 
          name: memberData.name, 
          email: memberData.email, 
          markets: memberData.markets 
        }
      });
      
      // Show detailed error message
      const errorMessage = error instanceof Error 
        ? `Failed to save member: ${error.message}` 
        : 'Failed to save member: Unknown error';
      addToast(errorMessage, 'error');
    }
  }

  if (!hasAccess) {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading task-force members...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary componentName="TaskForceAdminPage">
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <UsersIcon className="w-10 h-10 text-blue-600" />
                  GDPR Task-Force Management
                </h1>
                <p className="mt-2 text-gray-600">
                  Manage incident response team members and their market assignments
                </p>
              </div>
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Add Member
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Total Members</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{members.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Lead Members</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {members.filter(m => m.role === 'lead').length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Specialists</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {members.filter(m => m.role === 'specialist').length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Market Coverage</div>
              <div className="text-2xl font-bold text-purple-600 mt-1">
                {new Set(members.flatMap(m => m.markets)).size} / {AVAILABLE_MARKETS.length}
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {members.length === 0 ? (
              <div className="p-8 text-center text-gray-500 italic">
                No task-force members yet. Add the first member to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role & Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Markets
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Specialties
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{member.name}</div>
                            <div className="text-sm text-gray-600">{member.title}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <EnvelopeIcon className="w-3 h-3" />
                              {member.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              member.role === 'lead' ? 'bg-blue-100 text-blue-800' :
                              member.role === 'specialist' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {member.role}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <BuildingOfficeIcon className="w-3 h-3" />
                            {member.department}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {member.markets.map((market) => (
                              <span 
                                key={market}
                                className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium"
                              >
                                {market}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {member.specialties.slice(0, 3).map((specialty) => (
                              <span 
                                key={specialty}
                                className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs"
                              >
                                {specialty}
                              </span>
                            ))}
                            {member.specialties.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                +{member.specialties.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(member)}
                              className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                              title="Edit member"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeactivate(member)}
                              className="text-red-600 hover:text-red-900 flex items-center gap-1"
                              title="Deactivate member"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for Create/Edit */}
      {showModal && (
        <TaskForceMemberModal
          member={editingMember}
          onSave={handleSave}
          onCancel={closeModal}
        />
      )}
    </ErrorBoundary>
  );
}

// Modal Component
interface TaskForceMemberModalProps {
  member: TaskForceMember | null;
  onSave: (member: Omit<TaskForceMember, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

function TaskForceMemberModal({ member, onSave, onCancel }: TaskForceMemberModalProps) {
  const [formData, setFormData] = useState({
    name: member?.name || '',
    title: member?.title || '',
    email: member?.email || '',
    department: member?.department || 'Legal',
    role: member?.role || 'member' as 'lead' | 'member' | 'specialist',
    specialties: member?.specialties || [],
    markets: member?.markets || [],
    isActive: member?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState('');

  const COMMON_SPECIALTIES = [
    'DPA Communication',
    'Technical Assessment', 
    'Legal Analysis',
    'Belgium GDPR',
    'DACH Compliance',
    'Nordic Regulations',
    'Customer Communication',
    'Risk Assessment',
    'Incident Documentation',
  ];

  function addSpecialty() {
    if (newSpecialty.trim() && !formData.specialties.includes(newSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }));
      setNewSpecialty('');
    }
  }

  function removeSpecialty(specialty: string) {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  }

  function toggleMarket(market: string) {
    setFormData(prev => ({
      ...prev,
      markets: prev.markets.includes(market)
        ? prev.markets.filter(m => m !== market)
        : [...prev.markets, market]
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.title) return;

    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {member ? 'Edit Task-Force Member' : 'Add Task-Force Member'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Chris Schilling"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="chris@hellofresh.de"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Legal Lead"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department *
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="Legal">Legal</option>
                <option value="Compliance">Compliance</option>
                <option value="Tech">Tech</option>
                <option value="Security">Security</option>
                <option value="Operations">Operations</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role *
            </label>
            <div className="flex gap-4">
              {(['lead', 'member', 'specialist'] as const).map((role) => (
                <label key={role} className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={formData.role === role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
                    className="mr-2"
                  />
                  <span className="capitalize">{role}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Markets */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Markets * (Select all markets this member can handle)
            </label>
            <div className="space-y-3">
              {Object.entries(MARKET_GROUPS).map(([groupName, markets]) => (
                <div key={groupName}>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">{groupName}</h4>
                  <div className="flex flex-wrap gap-2 ml-4">
                    {markets.map((market) => (
                      <label key={market} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.markets.includes(market)}
                          onChange={() => toggleMarket(market)}
                          className="mr-2"
                        />
                        <span className="text-sm">{market}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Specialties */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specialties
            </label>
            
            {/* Current specialties */}
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.specialties.map((specialty) => (
                <span 
                  key={specialty}
                  className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm flex items-center gap-2"
                >
                  {specialty}
                  <button
                    type="button"
                    onClick={() => removeSpecialty(specialty)}
                    className="text-amber-600 hover:text-amber-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Add specialty */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Add a specialty..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
              />
              <button
                type="button"
                onClick={addSpecialty}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
              >
                Add
              </button>
            </div>
            
            {/* Quick add buttons */}
            <div className="mt-2 flex flex-wrap gap-1">
              {COMMON_SPECIALTIES.filter(s => !formData.specialties.includes(s)).map((specialty) => (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    specialties: [...prev.specialties, specialty]
                  }))}
                  className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
                >
                  + {specialty}
                </button>
              ))}
            </div>
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
              disabled={saving || !formData.name || !formData.email || !formData.title || formData.markets.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : member ? 'Update Member' : 'Create Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}