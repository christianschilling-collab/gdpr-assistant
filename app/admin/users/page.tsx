'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  getAllUsers,
  updateUserRole,
  updateUserAssigneeAliases,
  activateUser,
  deactivateUser,
  UserProfile,
  UserRole,
} from '@/lib/firebase/users';
import { useToast } from '@/lib/contexts/ToastContext';

// TEMPORARY FALLBACK: Admin emails
const ADMIN_EMAILS = [
  'christian.schilling@hellofresh.com',
  'christian.schilling@ext.hellofresh.com',
  'christian.schilling@hellofresh.de',
];

const ROLE_ORDER: Record<UserRole, number> = {
  admin: 0,
  team_lead: 1,
  legal: 2,
  agent: 3,
};

function userRoleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'team_lead':
      return 'Team lead';
    case 'legal':
      return 'Legal';
    case 'agent':
      return 'Agent';
    default:
      return role;
  }
}

export default function UserManagementPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('agent');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [addingUser, setAddingUser] = useState(false);
  /** Comma-separated alias drafts keyed by user email (trackboard assignee resolution). */
  const [aliasDraftByEmail, setAliasDraftByEmail] = useState<Record<string, string>>({});

  // Check if user is admin by email (fallback)
  const isAdminByEmail = user?.email && ADMIN_EMAILS.includes(user.email);
  const hasAdminAccess = isAdmin || isAdminByEmail;

  useEffect(() => {
    console.log('🔍 User Management - Auth Check:');
    console.log('  - authLoading:', authLoading);
    console.log('  - user:', user?.email);
    console.log('  - isAdmin:', isAdmin);
    console.log('  - isAdminByEmail:', isAdminByEmail);
    console.log('  - hasAdminAccess:', hasAdminAccess);

    if (!authLoading) {
      if (!user) {
        console.log('❌ No user, redirecting to /');
        router.push('/');
        return;
      }
      if (!hasAdminAccess) {
        console.log('❌ Not admin, redirecting to /cases');
        router.push('/cases');
        return;
      }
      console.log('✅ Loading users...');
      loadUsers();
    }
  }, [user, isAdmin, authLoading, router, hasAdminAccess, isAdminByEmail]);

  async function loadUsers() {
    try {
      setLoading(true);
      
      // For local dev without Firestore Rules: Generate user list from ADMIN_EMAILS
      const mockUsers: UserProfile[] = ADMIN_EMAILS.map((email) => ({
        id: email,
        email,
        role: 'admin' as UserRole,
        displayName: email.split('@')[0],
        createdAt: new Date(),
        lastLoginAt: new Date(),
        isActive: true,
      }));
      
      // Try to load from Firestore (will fail if rules not deployed)
      try {
        const allUsers = await getAllUsers();
        // If successful, use Firestore data
        allUsers.sort((a, b) => {
          const ra = ROLE_ORDER[a.role] ?? 9;
          const rb = ROLE_ORDER[b.role] ?? 9;
          if (ra !== rb) return ra - rb;
          return a.email.localeCompare(b.email);
        });
        setUsers(allUsers);
        const drafts: Record<string, string> = {};
        for (const u of allUsers) {
          drafts[u.email] = (u.assigneeAliases ?? []).join(', ');
        }
        setAliasDraftByEmail(drafts);
        console.log('✅ Users loaded from Firestore');
      } catch (firestoreError) {
        // Fallback to mock data for local dev
        console.warn('⚠️ Firestore Rules not deployed, using local admin list');
        setUsers(mockUsers);
      }
    } catch (error: any) {
      console.error('Error loading users:', error);
      addToast(error.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(email: string, newRole: UserRole) {
    try {
      setUpdating(email);
      await updateUserRole(email, newRole);
      addToast(`User role updated to ${newRole}`, 'success');
      await loadUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      addToast(error.message || 'Failed to update role', 'error');
    } finally {
      setUpdating(null);
    }
  }

  async function handleToggleActive(email: string, currentStatus: boolean) {
    try {
      setUpdating(email);
      if (currentStatus) {
        await deactivateUser(email);
        addToast('User deactivated', 'success');
      } else {
        await activateUser(email);
        addToast('User activated', 'success');
      }
      await loadUsers();
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      addToast(error.message || 'Failed to update user status', 'error');
    } finally {
      setUpdating(null);
    }
  }

  async function handleSaveAliases(email: string) {
    const raw = aliasDraftByEmail[email] ?? '';
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      setUpdating(email);
      await updateUserAssigneeAliases(email, parts);
      addToast('Trackboard aliases saved.', 'success');
      await loadUsers();
    } catch (error: any) {
      console.error('Error saving aliases:', error);
      addToast(error.message || 'Failed to save aliases', 'error');
    } finally {
      setUpdating(null);
    }
  }

  async function handleAddUser() {
    if (!newUserEmail || !newUserEmail.includes('@')) {
      addToast('Please enter a valid email address', 'error');
      return;
    }

    try {
      setAddingUser(true);
      
      // Add user to Firestore
      const { addNewUser } = await import('@/lib/firebase/addUser');
      await addNewUser(newUserEmail, newUserRole, newUserDisplayName || undefined);
      
      addToast(`User ${newUserEmail} added successfully!`, 'success');
      
      // Reset form and close modal
      setNewUserEmail('');
      setNewUserRole('agent');
      setNewUserDisplayName('');
      setShowAddUserModal(false);
      
      // Reload users list
      await loadUsers();
    } catch (error: any) {
      console.error('Error adding user:', error);
      addToast(error.message || 'Failed to add user', 'error');
    } finally {
      setAddingUser(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return null; // Redirect handled in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block"
          >
            ← Back to Admin Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">👥</span>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-600 mt-1">Manage user roles and access permissions</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed opacity-60"
              disabled
              title="Available in production with Firestore Rules"
            >
              + Add User (Production Only)
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Local Development Mode</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li><strong>Current Status:</strong> Using email-based authentication (no Firestore Rules required)</li>
            <li><strong>Admin Access:</strong> Defined in code via ADMIN_EMAILS array</li>
            <li><strong>Add New Admins:</strong> Edit ADMIN_EMAILS in Navigation.tsx, AuthGuard.tsx, admin/page.tsx, and admin/users/page.tsx</li>
            <li><strong>Production:</strong> Will migrate to Firestore-based user management with proper Rules</li>
            <li>
              <strong>Roles:</strong> <code className="rounded bg-blue-100 px-1">agent</code> opens the case list after
              login; <code className="rounded bg-blue-100 px-1">admin</code>, <code className="rounded bg-blue-100 px-1">team_lead</code>, and{' '}
              <code className="rounded bg-blue-100 px-1">legal</code> open the tracking board.
            </li>
          </ul>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Current Admins</h2>
            <p className="text-sm text-gray-600 mt-1">Configured via ADMIN_EMAILS in code</p>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px] max-w-md">
                  Trackboard aliases
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((userProfile) => (
                <tr key={userProfile.email} className={!userProfile.isActive ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {userProfile.displayName || userProfile.email.split('@')[0]}
                        </div>
                        <div className="text-sm text-gray-500">{userProfile.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 align-top">
                    <p className="text-xs text-gray-500 mb-1">
                      Kommagetrennt (z. B. <span className="font-mono">Chris</span>) — wird zur E-Mail dieses Users
                      aufgelöst.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={aliasDraftByEmail[userProfile.email] ?? ''}
                        onChange={(e) =>
                          setAliasDraftByEmail((prev) => ({
                            ...prev,
                            [userProfile.email]: e.target.value,
                          }))
                        }
                        className="min-w-[10rem] flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                        placeholder="Chris, CS"
                        disabled={updating === userProfile.email}
                      />
                      <button
                        type="button"
                        onClick={() => void handleSaveAliases(userProfile.email)}
                        disabled={updating === userProfile.email}
                        className="shrink-0 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <label className="sr-only" htmlFor={`role-${userProfile.email}`}>
                      Role for {userProfile.email}
                    </label>
                    <select
                      id={`role-${userProfile.email}`}
                      value={userProfile.role}
                      onChange={(e) => void handleRoleChange(userProfile.email, e.target.value as UserRole)}
                      disabled={updating === userProfile.email}
                      className="mt-0.5 block max-w-[11rem] rounded-md border border-gray-300 bg-white py-1.5 pl-2 pr-8 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="agent">{userRoleLabel('agent')}</option>
                      <option value="team_lead">{userRoleLabel('team_lead')}</option>
                      <option value="legal">{userRoleLabel('legal')}</option>
                      <option value="admin">{userRoleLabel('admin')}</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {userProfile.lastLoginAt
                      ? new Date(userProfile.lastLoginAt).toLocaleDateString('de-DE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="text-gray-400">—</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Total Users</div>
            <div className="text-2xl font-bold text-gray-900">{users.length}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Admins</div>
            <div className="text-2xl font-bold text-orange-600">
              {users.filter(u => u.role === 'admin').length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Active Users</div>
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.isActive).length}
            </div>
          </div>
        </div>

        {/* Add User Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New User</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@hellofresh.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={addingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name (optional)
                  </label>
                  <input
                    type="text"
                    value={newUserDisplayName}
                    onChange={(e) => setNewUserDisplayName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={addingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={addingUser}
                  >
                    <option value="agent">{userRoleLabel('agent')}</option>
                    <option value="team_lead">{userRoleLabel('team_lead')}</option>
                    <option value="legal">{userRoleLabel('legal')}</option>
                    <option value="admin">{userRoleLabel('admin')}</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddUser}
                  disabled={addingUser || !newUserEmail}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {addingUser ? 'Adding...' : 'Add User'}
                </button>
                <button
                  onClick={() => {
                    setShowAddUserModal(false);
                    setNewUserEmail('');
                    setNewUserRole('agent');
                    setNewUserDisplayName('');
                  }}
                  disabled={addingUser}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
