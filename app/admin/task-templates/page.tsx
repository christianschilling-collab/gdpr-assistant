'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAllTaskTemplates,
  deleteTaskTemplate,
  initializeDefaultTaskTemplates,
} from '@/lib/firebase/taskTemplates';
import { TaskTemplate } from '@/lib/types/taskTemplates';
import { IncidentStatus } from '@/lib/types';
import { useToast } from '@/lib/contexts/ToastContext';

const PHASES: IncidentStatus[] = [
  'Reporting',
  'Investigation',
  'Containment',
  'Resolution',
  'Post-Incident Review',
  'Closed',
];

export default function TaskTemplatesAdminPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<IncidentStatus>('Reporting');

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const data = await getAllTaskTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      addToast('Failed to load task templates', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleInitializeDefaults() {
    if (!confirm('This will create default task templates. Continue?')) return;
    
    try {
      await initializeDefaultTaskTemplates();
      addToast('Default templates created successfully!', 'success');
      await loadTemplates();
    } catch (error) {
      console.error('Error initializing defaults:', error);
      addToast('Failed to initialize default templates', 'error');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await deleteTaskTemplate(id);
      addToast('Template deleted', 'success');
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      addToast('Failed to delete template', 'error');
    }
  }

  function startEdit(template: TaskTemplate) {
    router.push(`/admin/task-templates/${template.id}`);
  }

  function startCreate() {
    router.push('/admin/task-templates/new');
  }

  const phaseTemplates = templates.filter(t => t.phase === selectedPhase);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
          >
            ← Back to Admin
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Task Templates</h1>
              <p className="text-gray-600 mt-1">Configure auto-generated tasks for each incident phase</p>
            </div>
            <div className="flex gap-3">
              {templates.length === 0 && (
                <button
                  onClick={handleInitializeDefaults}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Initialize Defaults
                </button>
              )}
              <button
                onClick={startCreate}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
              >
                + New Template
              </button>
            </div>
          </div>
        </div>

        {/* Phase Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex overflow-x-auto">
            {PHASES.map(phase => (
              <button
                key={phase}
                onClick={() => setSelectedPhase(phase)}
                className={`px-6 py-4 font-medium whitespace-nowrap border-b-2 transition-colors ${
                  selectedPhase === phase
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {phase}
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100">
                  {templates.filter(t => t.phase === phase).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Templates List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {selectedPhase} Phase Templates
          </h2>
          
          {phaseTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No templates for this phase yet</p>
              <button
                onClick={startCreate}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                + Create First Template
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {phaseTemplates.map(template => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-gray-900">{template.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          template.priority === 'High' ? 'bg-red-100 text-red-800' :
                          template.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {template.priority}
                        </span>
                        {template.isRequired && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                            Required
                          </span>
                        )}
                      </div>
                      
                      {template.description && (
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span>⏱️ Due: +{template.dueDateOffset}h</span>
                        <span>👤 {template.defaultOwnerRole || template.defaultOwner || 'Unassigned'}</span>
                        {template.externalLinks.length > 0 && (
                          <span>🔗 {template.externalLinks.length} link(s)</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(template)}
                        className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
