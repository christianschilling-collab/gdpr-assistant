'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { isGdprAssistantAdminEmail } from '@/lib/auth/gdprAssistantAdmins';
import {
  getOnboardingDashboard,
  updateSystemAccessStatus,
  addOnboardingNote,
  createOnboardingStatus,
  deleteOnboardingStatus,
  getActiveSystemConfigs
} from '@/lib/firebase/onboarding';
import { getAllUsers, createOrUpdateUserProfile } from '@/lib/firebase/users';
import type { OnboardingStatus, SystemAccessStatus, GdprSystemConfig } from '@/lib/types/onboarding';
import type { UserProfile, UserRole } from '@/lib/firebase/users';

export default function SystemAccessTrackerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<{
    activeOnboardings: (OnboardingStatus & { userId: string })[];
    recentCompletions: (OnboardingStatus & { userId: string })[];
    systemAccessPending: SystemAccessStatus[];
  } | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [gdprSystems, setGdprSystems] = useState<GdprSystemConfig[]>([]);
  const [showNewOnboardingModal, setShowNewOnboardingModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [newUserData, setNewUserData] = useState({
    email: '',
    displayName: '',
    role: 'agent' as UserRole
  });

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    // Allow Admin, Team Lead, and Legal to access (not just admin)
    if (!user.email || (!isGdprAssistantAdminEmail(user.email) && 
        !['admin', 'team_lead', 'legal'].includes(user.role || ''))) {
      router.push('/cases');
      return;
    }

    loadData();
  }, [user, router]);

  const loadData = async () => {
    try {
      console.log('🔄 Loading data...');
      
      // Load users
      try {
        const testUsers = await getAllUsers();
        setAllUsers(testUsers);
      } catch (userError) {
        console.error('❌ Error loading users:', userError);
        setAllUsers([]);
      }

      // Load system configs
      try {
        const systemConfigs = await getActiveSystemConfigs();
        setGdprSystems(systemConfigs);
      } catch (systemError) {
        console.error('❌ Error loading system configs:', systemError);
        setGdprSystems([]);
      }
      
      // Load dashboard data
      try {
        const dashboard = await getOnboardingDashboard();
        console.log('📊 Dashboard data:', dashboard);
        setDashboardData(dashboard);
      } catch (dashboardError) {
        console.error('❌ Error loading dashboard:', dashboardError);
        setDashboardData({ activeOnboardings: [], recentCompletions: [], systemAccessPending: [] });
      }
      
    } catch (error) {
      console.error('❌ General error loading data:', error);
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserData.email || !user?.email) return;
    
    try {
      // Create user with specified role (pre-configuration)
      await createOrUpdateUserProfile(newUserData.email, newUserData.displayName, newUserData.role);
      setShowCreateUserModal(false);
      setNewUserData({ email: '', displayName: '', role: 'agent' });
      loadData(); // Reload user list
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user: ' + (error as Error).message);
    }
  };

  const handleCreateOnboarding = async () => {
    if (!selectedUser || !user?.email) {
      alert('Error: Missing user selection or authentication');
      return;
    }
    
    try {
      await createOnboardingStatus(selectedUser, 'gdpr-team-onboarding', user.email);
      
      setShowNewOnboardingModal(false);
      setSelectedUser('');
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300';
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <span>✅</span>
          <span>Onboarding started successfully for ${selectedUser}</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
      
      // Reload data
      loadData();
    } catch (error) {
      console.error('❌ Error creating onboarding:', error);
      alert('Error creating onboarding: ' + (error as Error).message);
    }
  };

  const handleAddNote = async () => {
    if (!showNoteModal || !noteContent.trim()) return;
    
    try {
      await addOnboardingNote(showNoteModal, {
        author: user?.email || '',
        authorName: user?.displayName || user?.email || '',
        type: 'manual',
        content: noteContent.trim(),
      });
      
      setShowNoteModal(null);
      setNoteContent('');
      loadData();
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.innerHTML = '<div class="flex items-center gap-2"><span>📝</span><span>Note added successfully</span></div>';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Error adding note: ' + (error as Error).message);
    }
  };

  const handleDeleteOnboarding = async (userId: string) => {
    if (!confirm(`Delete onboarding for user "${userId}"?\n\nThis will permanently remove:\n- Onboarding progress\n- System access requests\n- Notes and updates\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await deleteOnboardingStatus(userId);
      loadData();
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <span>🗑️</span>
          <span>Onboarding deleted for ${userId}</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } catch (error) {
      console.error('Error deleting onboarding:', error);
      alert('Error deleting onboarding: ' + (error as Error).message);
    }
  };

  const handleSystemAccessUpdate = async (
    userId: string, 
    system: string, 
    newStatus: SystemAccessStatus['status'],
    notes?: string
  ) => {
    try {
      // Get current status for note tracking
      const currentOnboarding = dashboardData?.activeOnboardings.find(o => o.userId === userId);
      const currentAccess = currentOnboarding?.systemAccess?.find(a => a.system === system);
      const oldStatus = currentAccess?.status || 'requested';
      
      // Clean the update object - only include defined values
      const updates: any = { status: newStatus };
      
      if (newStatus === 'granted') {
        updates.grantedDate = new Date();
      }
      
      if (user?.email) {
        updates.grantedBy = user.email;
      }
      
      if (notes) {
        updates.notes = notes;
      }
      
      await updateSystemAccessStatus(userId, system, updates);
      
      // Auto-track status change as note
      if (oldStatus !== newStatus) {
        const userName = user?.displayName || user?.email || 'Unknown';
        const statusNote = `System access status changed from "${oldStatus}" to "${newStatus}" by ${userName}`;
        
        await addOnboardingNote(userId, {
          author: user?.email || '',
          authorName: userName,
          type: 'system_access',
          content: `${system}: ${statusNote}`,
        });
      }
      
      // Add custom notes if provided
      if (notes) {
        await addOnboardingNote(userId, {
          author: user?.email || '',
          authorName: user?.displayName || user?.email || '',
          type: 'system_issue',
          content: `${system}: ${notes}`,
        });
      }
      
      loadData();
    } catch (error) {
      console.error('Error updating system access:', error);
      alert('Error updating system access: ' + (error as Error).message);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'granted': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'requested': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'denied': return 'text-red-600 bg-red-50 border-red-200';
      case 'not_requested': return 'text-gray-500 bg-gray-50 border-gray-200';
      case 'not_applicable': return 'text-gray-400 bg-gray-100 border-gray-300 opacity-75';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const isOverdue = (requestDate: Date | string | undefined, slaHours: number) => {
    if (!requestDate || !slaHours) return false;
    
    try {
      const now = new Date();
      const date = requestDate instanceof Date ? requestDate : new Date(requestDate);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) return false;
      
      const deadline = new Date(date.getTime() + (slaHours * 60 * 60 * 1000));
      return now > deadline;
    } catch (error) {
      console.error('Error calculating overdue status:', error);
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Access Tracker</h1>
              <p className="text-gray-600 mt-1">Track GDPR team onboarding and system access progress</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Create User
              </button>
              <button
                onClick={() => setShowNewOnboardingModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Start New Onboarding
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="text-2xl font-bold text-blue-600">
              {dashboardData?.activeOnboardings.length || 0}
            </div>
            <div className="text-sm text-gray-600">Active Onboardings</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="text-2xl font-bold text-green-600">
              {dashboardData?.recentCompletions.length || 0}
            </div>
            <div className="text-sm text-gray-600">Completed (30d)</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="text-2xl font-bold text-orange-600">
              {dashboardData?.systemAccessPending.length || 0}
            </div>
            <div className="text-sm text-gray-600">Pending Access</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="text-2xl font-bold text-red-600">
              {dashboardData?.systemAccessPending.filter(access => {
                if (!access || !access.system || !access.requestDate) {
                  return false;
                }
                const system = gdprSystems.find(s => 
                  (s.organization ? `${s.name} (${s.organization})` : s.name) === access.system
                );
                return system && isOverdue(access.requestDate, system.slaHours);
              }).length || 0}
            </div>
            <div className="text-sm text-gray-600">Overdue</div>
          </div>
        </div>

        {/* Active Onboardings */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">Active Onboardings</h2>
          </div>
          <div className="p-6">
            {dashboardData?.activeOnboardings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No active onboardings
              </div>
            ) : (
              <div className="space-y-6">
                {dashboardData?.activeOnboardings.map((onboarding, idx) => (
                  <div key={idx} className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          User ID: {onboarding.userId}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span>Status: {onboarding.status}</span>
                          <span>Day: {onboarding.currentDay}/4</span>
                          <span>Started: {onboarding.startDate.toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Expected Completion</div>
                          <div className="font-medium">
                            {onboarding.expectedCompletionDate.toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => setShowNoteModal(onboarding.userId)}
                          className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded border border-blue-300 hover:bg-blue-50 mr-2"
                          title="Add a note"
                        >
                          📝 Add Note
                        </button>
                        <button
                          onClick={() => handleDeleteOnboarding(onboarding.userId)}
                          className="text-red-600 hover:text-red-900 px-3 py-1 rounded border border-red-300 hover:bg-red-50"
                          title="Delete this onboarding"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>

                    {/* System Access Progress */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {gdprSystems.map((system) => {
                        if (!system || !system.id) return null;
                        
                        const systemName = system.organization ? `${system.name} (${system.organization})` : system.name;
                        const accessStatus = onboarding.systemAccess?.find(a => a && a.system === systemName);
                        const status = accessStatus?.status || 'not_requested';
                        const overdue = accessStatus && accessStatus.requestDate && 
                          isOverdue(accessStatus.requestDate, system.slaHours);
                        
                        return (
                          <div 
                            key={system.id}
                            className={`p-3 rounded border ${getStatusColor(status)} ${overdue ? 'ring-2 ring-red-300' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">
                                  {systemName}
                                </div>
                                <div className={`text-xs px-2 py-1 rounded-full border inline-block mt-1 ${getPriorityColor(system.priority)}`}>
                                  {system.priority}
                                </div>
                              </div>
                              <select
                                value={status}
                                onChange={(e) => handleSystemAccessUpdate(
                                  onboarding.userId,
                                  systemName,
                                  e.target.value as SystemAccessStatus['status']
                                )}
                                className="text-xs border rounded px-2 py-1"
                              >
                                <option value="not_requested">Not Requested</option>
                                <option value="requested">Requested</option>
                                <option value="pending">Pending</option>
                                <option value="granted">Granted</option>
                                <option value="denied">Denied</option>
                                <option value="not_applicable">Not Applicable</option>
                              </select>
                            </div>
                            {overdue && (
                              <div className="text-xs text-red-600 mt-1 font-medium">
                                ⚠️ Overdue (SLA: {system.slaHours}h)
                              </div>
                            )}
                          </div>
                        );
                      }).filter(Boolean)}
                    </div>

                    {/* Onboarding Notes */}
                    {onboarding.notes && onboarding.notes.length > 0 && (
                      <div className="mt-6 border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          📝 Onboarding Notes & Activity Log
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {onboarding.notes
                            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((note: any, noteIdx: number) => (
                            <div key={noteIdx} className="bg-gray-50 rounded p-3 text-sm">
                              <div className="flex items-start justify-between mb-1">
                                <div className="font-medium text-gray-900">
                                  {note.authorName || note.author}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(note.date).toLocaleString()}
                                </div>
                              </div>
                              <div className="text-gray-700">
                                {note.content}
                              </div>
                              {note.type && (
                                <div className="mt-1">
                                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                    note.type === 'system_access' ? 'bg-blue-100 text-blue-800' :
                                    note.type === 'system_issue' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {note.type.replace('_', ' ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Access Templates */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">GDPR System Access Requirements</h2>
            <p className="text-sm text-gray-600 mt-1">Based on GDPR Team Hub workflows</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gdprSystems.map((system) => (
                <div key={system.id} className={`p-4 rounded-lg border ${getPriorityColor(system.priority)}`}>
                  <div className="font-medium text-sm mb-2">
                    {system.organization ? `${system.name} (${system.organization})` : system.name}
                  </div>
                  <div className="text-xs space-y-1">
                    <div>Priority: <span className="font-medium">{system.priority}</span></div>
                    <div>SLA: <span className="font-medium">{system.slaHours}h</span></div>
                    {system.description && (
                      <div className="mt-2 text-gray-600">{system.description}</div>
                    )}
                  </div>
                </div>
              ))}
              {gdprSystems.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No system configurations found. 
                  <a href="/admin/system-config" className="text-blue-600 hover:text-blue-800 ml-1">
                    Configure systems
                  </a>
                  to get started.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create User Modal */}
        {showCreateUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Create New User</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="user@hellofresh.de"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={newUserData.displayName}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="agent">Agent</option>
                    <option value="team_lead">Team Lead</option>
                    <option value="legal">Legal</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Note:</strong> This creates a user profile. The user will still need to sign in 
                    with their HelloFresh Google account to activate their account.
                  </p>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowCreateUserModal(false);
                      setNewUserData({ email: '', displayName: '', role: 'agent' });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateUser}
                    disabled={!newUserData.email}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Create User
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Onboarding Modal */}
        {showNewOnboardingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Start New Onboarding</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select User
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Choose a user...</option>
                    {allUsers.length === 0 ? (
                      <option disabled>No users found - create a user first</option>
                    ) : (
                      allUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName || u.email} ({u.role})
                        </option>
                      ))
                    )}
                  </select>
                </div>
                {allUsers.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 mb-2">
                      📋 <strong>No users found.</strong> This could be because:
                    </p>
                    <ul className="text-sm text-yellow-800 list-disc ml-4 mb-3">
                      <li>Users were created in User Management but aren't loading</li>
                      <li>Firestore connection issue</li>
                      <li>No users exist in the database yet</li>
                    </ul>
                    <div className="flex gap-2">
                      <button
                        onClick={loadData}
                        className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded text-sm hover:bg-yellow-300"
                      >
                        🔄 Reload Users
                      </button>
                      <a
                        href="/admin/users"
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        📝 Go to User Management
                      </a>
                    </div>
                  </div>
                )}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowNewOnboardingModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateOnboarding}
                    disabled={!selectedUser}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Onboarding
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Note Modal */}
        {showNoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Add Note for {showNoteModal}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note Content
                  </label>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Enter your note about this onboarding process..."
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Tip:</strong> This note will be visible to all team members managing this onboarding.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowNoteModal(null);
                    setNoteContent('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNote}
                  disabled={!noteContent.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  📝 Add Note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}