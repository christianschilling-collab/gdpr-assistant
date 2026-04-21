'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getTaskTemplate, createTaskTemplate, updateTaskTemplate } from '@/lib/firebase/taskTemplates';
import { TaskTemplate, TaskTemplateFormData } from '@/lib/types/taskTemplates';
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

export default function TaskTemplateFormPage() {
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const templateId = params.id as string;
  const isNew = templateId === 'new';
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<TaskTemplateFormData>({
    phase: 'Reporting',
    title: '',
    description: '',
    dueDateOffset: 24,
    priority: 'Medium',
    defaultOwnerRole: '',
    defaultOwner: '',
    externalLinks: [],
    order: 1,
    isRequired: false,
  });

  useEffect(() => {
    if (!isNew) {
      loadTemplate();
    }
  }, [templateId]);

  async function loadTemplate() {
    try {
      const template = await getTaskTemplate(templateId);
      if (!template) {
        addToast('Template not found', 'error');
        router.push('/admin/task-templates');
        return;
      }
      setFormData({
        phase: template.phase,
        title: template.title,
        description: template.description || '',
        dueDateOffset: template.dueDateOffset,
        priority: template.priority,
        defaultOwnerRole: template.defaultOwnerRole || '',
        defaultOwner: template.defaultOwner || '',
        externalLinks: template.externalLinks,
        order: template.order,
        isRequired: template.isRequired,
      });
    } catch (error) {
      console.error('Error loading template:', error);
      addToast('Failed to load template', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (isNew) {
        await createTaskTemplate(formData);
        addToast('Template created successfully', 'success');
      } else {
        await updateTaskTemplate(templateId, formData);
        addToast('Template updated successfully', 'success');
      }
      router.push('/admin/task-templates');
    } catch (error) {
      console.error('Error saving template:', error);
      addToast('Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  }

  function addExternalLink() {
    setFormData(prev => ({
      ...prev,
      externalLinks: [...prev.externalLinks, { label: '', url: '' }],
    }));
  }

  function updateExternalLink(index: number, field: 'label' | 'url', value: string) {
    setFormData(prev => ({
      ...prev,
      externalLinks: prev.externalLinks.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      ),
    }));
  }

  function removeExternalLink(index: number) {
    setFormData(prev => ({
      ...prev,
      externalLinks: prev.externalLinks.filter((_, i) => i !== index),
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push('/admin/task-templates')}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
        >
          ← Back to Templates
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {isNew ? 'Create Template' : 'Edit Template'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phase */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phase *</label>
              <select
                value={formData.phase}
                onChange={(e) => setFormData(prev => ({ ...prev, phase: e.target.value as IncidentStatus }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                {PHASES.map(phase => (
                  <option key={phase} value={phase}>{phase}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Document root cause analysis"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Detailed description of the task..."
              />
            </div>

            {/* Grid: Due Date, Priority, Order */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due (hours) *</label>
                <input
                  type="number"
                  value={formData.dueDateOffset}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDateOffset: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order *</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min="1"
                  required
                />
              </div>
            </div>

            {/* Default Owner */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Owner (Role or Email)</label>
              <input
                type="text"
                value={formData.defaultOwnerRole || formData.defaultOwner || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.includes('@')) {
                    setFormData(prev => ({ ...prev, defaultOwner: value, defaultOwnerRole: '' }));
                  } else {
                    setFormData(prev => ({ ...prev, defaultOwnerRole: value, defaultOwner: '' }));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Data Protection Officer or email@hellofresh.com"
              />
            </div>

            {/* Required Checkbox */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isRequired}
                  onChange={(e) => setFormData(prev => ({ ...prev, isRequired: e.target.checked }))}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Required (must be completed before phase change)
                </span>
              </label>
            </div>

            {/* External Links */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">External Links</label>
                <button
                  type="button"
                  onClick={addExternalLink}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  + Add Link
                </button>
              </div>
              {formData.externalLinks.map((link, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => updateExternalLink(index, 'label', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Label (e.g., Root Cause Template)"
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateExternalLink(index, 'url', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    onClick={() => removeExternalLink(index)}
                    className="px-2 py-1 text-red-600 hover:text-red-800 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <button
                type="button"
                onClick={() => router.push('/admin/task-templates')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50"
                disabled={saving}
              >
                {saving ? 'Saving...' : isNew ? 'Create Template' : 'Update Template'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
