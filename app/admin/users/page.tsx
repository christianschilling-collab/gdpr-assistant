'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { isGdprAssistantAdminEmail } from '@/lib/auth/gdprAssistantAdmins';
import { getAllUsers, createOrUpdateUserProfile, updateUserRole, deactivateUser, activateUser, deleteUserProfile } from '@/lib/firebase/users';
import type { UserProfile, UserRole } from '@/lib/firebase/users';

export default function UserManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newUserData, setNewUserData] = useState({
    email: '',
    displayName: '',
    role: 'agent' as UserRole,
    department: '',
    market: ''
  });

  // Predefined team structure
  const TEAM_ROLES = [
    { value: 'admin', label: 'Admin', description: 'Full system access, can manage all users' },
    { value: 'team_lead', label: 'Team Lead', description: 'Manage team members, view reports' },
    { value: 'legal', label: 'Legal Expert', description: 'Legal review, escalations, compliance' },
    { value: 'agent', label: 'Agent', description: 'Handle cases, basic access' }
  ] as const;

  const DEPARTMENTS = [
    'Legal',
    'Customer Care', 
    'Compliance',
    'IT',
    'Management'
  ];

  const MARKETS = [
    'DACH',
    'France', 
    'NORDICS',
    'BENELUX',
    'ALL'
  ];

  useEffect(() => {
    if (!user?.email || !isGdprAssistantAdminEmail(user.email)) {
      router.push('/cases');
      return;
    }
    loadUsers();
  }, [user, router]);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserData.email) return;
    
    try {
      await createOrUpdateUserProfile(newUserData.email, newUserData.displayName);
      
      // Update with additional fields
      if (newUserData.role !== 'agent') {
        await updateUserRole(newUserData.email, newUserData.role);
      }
      
      setShowCreateModal(false);
      setNewUserData({ email: '', displayName: '', role: 'agent', department: '', market: '' });
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user. Check console for details.');
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      if (updates.role) {
        await updateUserRole(userId, updates.role);
      }
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user. Check console for details.');
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await activateUser(userId);
      } else {
        await deactivateUser(userId);
      }
      loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const handleDeleteUser = async (userId: string, userDisplayName?: string) => {
    const userName = userDisplayName || userId;
    if (!confirm(`Are you sure you want to DELETE user "${userName}"?\n\nThis action cannot be undone and will:\n- Remove the user from the system\n- Delete all their data\n- Cancel any ongoing onboarding\n\nType 'DELETE' if you're sure.`)) {
      return;
    }

    const confirmation = prompt(`To confirm deletion of "${userName}", type 'DELETE' (all caps):`);
    if (confirmation !== 'DELETE') {
      alert('Deletion cancelled. You must type exactly "DELETE" to confirm.');
      return;
    }

    try {
      await deleteUserProfile(userId);
      loadUsers();
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.innerHTML = `<div class="flex items-center gap-2"><span>🗑️</span><span>User "${userName}" deleted successfully</span></div>`;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 4000);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user: ' + (error as Error).message);
    }
  };

  const handleEditUser = () => {
    // Future: Could add inline editing or extended modal
    // For now, users can use the table controls
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'team_lead': return 'bg-blue-100 text-blue-800';
      case 'legal': return 'bg-purple-100 text-purple-800';
      case 'agent': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading users...</div>
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
              <h1 className="text-3xl font-bold text-gray-900">GDPR Team User Management</h1>
              <p className="text-gray-600 mt-1">Configure team members BEFORE their first login</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Add Team Member
            </button>
          </div>
        </div>

        {/* Team Structure Overview */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">Team Roles & Permissions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {TEAM_ROLES.map((role) => (
                <div key={role.value} className="border rounded-lg p-4">
                  <div className={`inline-block px-2 py-1 rounded text-sm font-medium mb-2 ${getRoleColor(role.value)}`}>
                    {role.label}
                  </div>
                  <p className="text-sm text-gray-600">{role.description}</p>
                  <div className="text-xs text-gray-500 mt-2">
                    Count: {users.filter(u => u.role === role.value).length}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">Team Members ({users.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.displayName || 'No name'}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateUser(user.id, { role: e.target.value as UserRole })}
                        className={`text-sm px-2 py-1 rounded border ${getRoleColor(user.role)}`}
                      >
                        {TEAM_ROLES.map(role => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={user.isActive}
                          onChange={(e) => handleToggleActive(user.id, e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className={`ml-2 text-sm ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLoginAt ? (
                        <>
                          <div>{user.lastLoginAt.toLocaleDateString()}</div>
                          <div className="text-xs">{user.lastLoginAt.toLocaleTimeString()}</div>
                        </>
                      ) : (
                        <span className="text-yellow-600 font-medium">Never logged in</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded border border-blue-300 hover:bg-blue-50"
                          title="Edit user details"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(user.id, !user.isActive)}
                          className={`px-2 py-1 rounded border ${
                            user.isActive 
                              ? 'text-orange-600 hover:text-orange-900 border-orange-300 hover:bg-orange-50' 
                              : 'text-green-600 hover:text-green-900 border-green-300 hover:bg-green-50'
                          }`}
                          title={user.isActive ? 'Deactivate user' : 'Activate user'}
                        >
                          {user.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.displayName)}
                          className="text-red-600 hover:text-red-900 px-2 py-1 rounded border border-red-300 hover:bg-red-50"
                          title="Permanently delete user"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="text-lg mb-2">No team members configured yet</div>
                      <div className="text-sm">Click "Add Team Member" to set up your GDPR team</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Team Member</h3>
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
                    placeholder="vorname.nachname@hellofresh.de"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This person can log in with their HelloFresh Google account once configured
                  </p>
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
                    placeholder="Vorname Nachname"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Role *
                  </label>
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {TEAM_ROLES.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <select
                    value={newUserData.department}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select department...</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Market Assignment
                  </label>
                  <select
                    value={newUserData.market}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, market: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select market...</option>
                    {MARKETS.map(market => (
                      <option key={market} value={market}>{market}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-blue-900 mb-1">Pre-Login Configuration</h4>
                  <p className="text-sm text-blue-800">
                    ✅ User profile will be created immediately<br/>
                    ✅ When they log in, they'll get the correct role automatically<br/>
                    ✅ Ready for onboarding assignment
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewUserData({ email: '', displayName: '', role: 'agent', department: '', market: '' });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateUser}
                    disabled={!newUserData.email}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Add Team Member
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Edit User: {editingUser.displayName || editingUser.email}</h3>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Current User Details</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div><strong>Email:</strong> {editingUser.email}</div>
                    <div><strong>Role:</strong> {editingUser.role}</div>
                    <div><strong>Status:</strong> {editingUser.isActive ? 'Active' : 'Inactive'}</div>
                    <div><strong>Last Login:</strong> {editingUser.lastLoginAt ? editingUser.lastLoginAt.toLocaleString() : 'Never'}</div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">Available Actions</h4>
                  <div className="text-sm text-yellow-800 space-y-2">
                    <div>• <strong>Change Role:</strong> Use the dropdown in the main table</div>
                    <div>• <strong>Toggle Status:</strong> Use Activate/Deactivate buttons</div>
                    <div>• <strong>Delete User:</strong> Use the Delete button (permanent)</div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <strong>Note:</strong> Advanced editing features (display name, department, market) 
                  will be added in a future update. For now, use the inline controls in the table.
                </div>
              </div>
              
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}