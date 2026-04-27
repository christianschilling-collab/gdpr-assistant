'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { isGdprAssistantAdminEmail } from '@/lib/auth/gdprAssistantAdmins';
import {
  getAllSystemConfigs,
  createSystemConfig,
  updateSystemConfig,
  deleteSystemConfig
} from '@/lib/firebase/onboarding';
import type { GdprSystemConfig } from '@/lib/types/onboarding';

export default function SystemConfigPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [configs, setConfigs] = useState<GdprSystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<GdprSystemConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    priority: 'medium' as 'critical' | 'high' | 'medium' | 'low',
    slaHours: 48,
    description: '',
    contactInfo: '',
    accessUrl: '',
    isActive: true
  });

  useEffect(() => {
    if (!user?.email || !isGdprAssistantAdminEmail(user.email)) {
      router.push('/');
      return;
    }
    loadConfigs();
  }, [user, router]);

  const loadConfigs = async () => {
    try {
      const systemConfigs = await getAllSystemConfigs();
      setConfigs(systemConfigs);
    } catch (error) {
      console.error('Error loading system configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      organization: '',
      priority: 'medium',
      slaHours: 48,
      description: '',
      contactInfo: '',
      accessUrl: '',
      isActive: true
    });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert('System name is required');
      return;
    }

    try {
      await createSystemConfig(formData);
      setShowCreateModal(false);
      resetForm();
      loadConfigs();
      
      // Show success toast
      showToast('✅', `System "${formData.name}" created successfully`, 'green');
    } catch (error) {
      console.error('Error creating system config:', error);
      alert('Error creating system config: ' + (error as Error).message);
    }
  };

  const handleEdit = (config: GdprSystemConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      organization: config.organization || '',
      priority: config.priority,
      slaHours: config.slaHours,
      description: config.description || '',
      contactInfo: config.contactInfo || '',
      accessUrl: config.accessUrl || '',
      isActive: config.isActive
    });
  };

  const handleUpdate = async () => {
    if (!editingConfig || !formData.name.trim()) {
      alert('System name is required');
      return;
    }

    try {
      await updateSystemConfig(editingConfig.id, formData);
      setEditingConfig(null);
      resetForm();
      loadConfigs();
      
      showToast('✅', `System "${formData.name}" updated successfully`, 'green');
    } catch (error) {
      console.error('Error updating system config:', error);
      alert('Error updating system config: ' + (error as Error).message);
    }
  };

  const handleDelete = async (config: GdprSystemConfig) => {
    if (!confirm(`Delete system "${config.name}"${config.organization ? ` (${config.organization})` : ''}?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await deleteSystemConfig(config.id);
      loadConfigs();
      
      showToast('🗑️', `System "${config.name}" deleted successfully`, 'red');
    } catch (error) {
      console.error('Error deleting system config:', error);
      alert('Error deleting system config: ' + (error as Error).message);
    }
  };

  const showToast = (icon: string, message: string, color: string) => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 bg-${color}-600 text-white px-6 py-3 rounded-lg shadow-lg z-50`;
    toast.innerHTML = `<div class="flex items-center gap-2"><span>${icon}</span><span>${message}</span></div>`;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 4000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading system configurations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">GDPR System Configuration</h1>
              <p className="mt-2 text-gray-600">
                Manage system access requirements for onboarding workflows
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              ➕ Add System
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{configs.length}</div>
            <div className="text-sm text-gray-600">Total Systems</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-red-600">
              {configs.filter(c => c.priority === 'critical' && c.isActive).length}
            </div>
            <div className="text-sm text-gray-600">Critical Systems</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">
              {configs.filter(c => c.isActive).length}
            </div>
            <div className="text-sm text-gray-600">Active Systems</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-600">
              {configs.filter(c => !c.isActive).length}
            </div>
            <div className="text-sm text-gray-600">Inactive Systems</div>
          </div>
        </div>

        {/* Systems Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">System Access Requirements</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">System</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SLA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {configs.map((config) => (
                  <tr key={config.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{config.name}</div>
                        {config.description && (
                          <div className="text-sm text-gray-500">{config.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {config.organization || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(config.priority)}`}>
                        {config.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {config.slaHours}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        config.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {config.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(config)}
                          className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded border border-blue-300 hover:bg-blue-50"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(config)}
                          className="text-red-600 hover:text-red-900 px-2 py-1 rounded border border-red-300 hover:bg-red-50"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {configs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No system configurations found. Add your first system to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create/Edit Modal */}
        {(showCreateModal || editingConfig) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {editingConfig ? 'Edit System Configuration' : 'Add New System Configuration'}
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      System Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., OWL, Jira, MineOS"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization
                    </label>
                    <input
                      type="text"
                      value={formData.organization}
                      onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                      placeholder="e.g., HelloFresh, Factor DE"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SLA (Hours)
                    </label>
                    <input
                      type="number"
                      value={formData.slaHours}
                      onChange={(e) => setFormData(prev => ({ ...prev, slaHours: parseInt(e.target.value) || 24 }))}
                      min="1"
                      max="168"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the system and its purpose"
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Information
                  </label>
                  <input
                    type="text"
                    value={formData.contactInfo}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactInfo: e.target.value }))}
                    placeholder="Contact person or department for access requests"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access URL
                  </label>
                  <input
                    type="url"
                    value={formData.accessUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, accessUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Active (include in onboarding workflows)
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingConfig(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={editingConfig ? handleUpdate : handleCreate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingConfig ? 'Update System' : 'Create System'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}