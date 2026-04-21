'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTemplate, updateTemplate } from '@/lib/firebase/templates';
import { getTemplateVersions, getTemplateVersion } from '@/lib/firebase/templateVersions';
import { getCategories } from '@/lib/firebase/categories';
import { getRequesterTypes } from '@/lib/firebase/requesterTypes';
import { Template, TemplateVersion, ProcessStep, Category, RequesterType } from '@/lib/types';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';

const AVAILABLE_VARIABLES = [
  { key: '{{caseId}}', description: 'Case ID' },
  { key: '{{market}}', description: 'Market (DE, AT, CH)' },
  { key: '{{date}}', description: 'Current date' },
  { key: '{{agentName}}', description: 'Agent name' },
];

export default function TemplateEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [requesterTypes, setRequesterTypes] = useState<RequesterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [previewData, setPreviewData] = useState({
    caseId: 'HELP-2024-001',
    market: 'DE',
    date: new Date().toLocaleDateString(),
    agentName: 'Agent Name',
  });

  const [formData, setFormData] = useState({
    templateName: '',
    templateText: '',
    primaryCategory: '',
    subCategory: '',
    customerType: 'Customer' as 'Customer' | 'Non-Customer' | 'Unknown',
    whenToUse: '',
    keywords: [] as string[],
    confluenceLink: '',
    mineosAuto: false,
  });

  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  // Auto-hide success messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  async function loadTemplate() {
    setLoading(true);
    setError(''); // Clear previous errors
    try {
      const [data, cats, types] = await Promise.all([
        getTemplate(templateId),
        getCategories(true),
        getRequesterTypes(true),
      ]);
      
      if (!data) {
        setError('Template not found');
        return;
      }
      
      setTemplate(data);
      setCategories(cats);
      setRequesterTypes(types);
      
      setFormData({
        templateName: data.templateName,
        templateText: data.templateText,
        primaryCategory: data.primaryCategory, // Now an ID
        subCategory: data.subCategory || '',
        customerType: data.requesterType || '', // Now an ID
        whenToUse: data.whenToUse,
        keywords: data.keywords || [],
        confluenceLink: data.confluenceLink || '',
        mineosAuto: data.mineosAuto || false,
      });
      setProcessSteps(data.processSteps || []);
    } catch (error: any) {
      console.error('Error loading template:', error);
      setError(error.message || 'Failed to load template.');
    } finally {
      setLoading(false);
    }
  }

  async function loadVersions() {
    try {
      const vers = await getTemplateVersions(templateId);
      setVersions(vers);
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  }

  function insertVariable(variable: string) {
    const textarea = document.querySelector('textarea[placeholder*="template text"]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + variable + text.substring(end);
      setFormData({ ...formData, templateText: newText });
      setTimeout(() => {
        textarea.setSelectionRange(start + variable.length, start + variable.length);
        textarea.focus();
      }, 0);
    }
  }

  function renderPreview(text: string): string {
    let preview = text;
    Object.entries(previewData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });
    return preview;
  }

  async function handleSave() {
    if (!template) return;

    setSaving(true);
    setError('');

    try {
      // Build update object without undefined fields
      const updateData: any = {
        templateName: formData.templateName,
        templateText: formData.templateText,
        primaryCategory: formData.primaryCategory,
        requesterType: formData.customerType,
        whenToUse: formData.whenToUse,
        keywords: formData.keywords,
        mineosAuto: formData.mineosAuto,
      };

      // Only add optional fields if they have values
      if (formData.subCategory && formData.subCategory.trim()) {
        updateData.subCategory = formData.subCategory;
      }
      
      if (formData.confluenceLink && formData.confluenceLink.trim()) {
        updateData.confluenceLink = formData.confluenceLink;
      }
      
      if (processSteps.length > 0) {
        updateData.processSteps = processSteps;
      }

      await updateTemplate(
        templateId,
        updateData,
        true, // saveVersion
        user?.email,
        'Template updated via editor'
      );
      setSuccessMessage('✅ Template saved successfully!');
      setTimeout(() => router.push('/templates'), 1500);
    } catch (error: any) {
      console.error('Error saving template:', error);
      setError(error.message || 'Failed to save template.');
      showToast(error.message || 'Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleRollback(version: number) {
    if (!confirm(`Rollback to version ${version}? This will replace the current template.`)) {
      return;
    }

    try {
      const versionData = await getTemplateVersion(templateId, version);
      if (!versionData) {
        setError('Version not found');
        return;
      }

      setFormData({ ...formData, templateText: versionData.templateText });
      await updateTemplate(
        templateId,
        { templateText: versionData.templateText },
        true,
        user?.email,
        `Rolled back to version ${version}`
      );
      
      showToast(`Rolled back to version ${version}`, 'success');
      await loadTemplate();
      setSuccessMessage('Template rolled back successfully');
    } catch (error: any) {
      console.error('Error rolling back:', error);
      setError('Failed to rollback: ' + (error.message || 'Unknown error'));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center text-gray-500">Loading template...</div>
        </div>
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold">Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <Link href="/templates" className="text-blue-600 hover:underline mt-4 inline-block">
              ← Back to Templates
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!template) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-400 rounded-lg p-4 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="ml-3 text-sm font-medium text-green-800">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage('')}
              className="ml-4 text-green-400 hover:text-green-600"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 rounded-lg p-4 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="ml-3 text-sm font-medium text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="ml-4 text-red-400 hover:text-red-600"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Template</h1>
            <p className="text-gray-600 mt-1">{template.templateName}</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/templates"
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold">Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Template Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={formData.templateName}
                    onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Category
                    </label>
                    <select
                      value={formData.primaryCategory}
                      onChange={(e) =>
                        setFormData({ ...formData, primaryCategory: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select a category...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Requester Type
                    </label>
                    <select
                      value={formData.customerType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customerType: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select a requester type...</option>
                      {requesterTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Template Editor */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Template Text</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    {showPreview ? 'Edit' : 'Preview'}
                  </button>
                  <button
                    onClick={() => {
                      setShowVersions(!showVersions);
                      if (!showVersions) loadVersions();
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Versions
                  </button>
                </div>
              </div>

              {/* Variables */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Available Variables:</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_VARIABLES.map((var_) => (
                    <button
                      key={var_.key}
                      onClick={() => insertVariable(var_.key)}
                      className="px-2 py-1 text-xs bg-white border border-blue-200 rounded hover:bg-blue-50"
                      title={var_.description}
                    >
                      {var_.key}
                    </button>
                  ))}
                </div>
              </div>

              {showPreview ? (
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 min-h-[300px]">
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderPreview(formData.templateText) }}
                  />
                </div>
              ) : (
                <div className="border border-gray-300 rounded-lg">
                  <textarea
                    value={formData.templateText}
                    onChange={(e) => setFormData({ ...formData, templateText: e.target.value })}
                    rows={12}
                    className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    placeholder="Enter the template text here. You can use variables like {{caseId}}, {{market}}, {{agentName}}..."
                  />
                </div>
              )}
            </div>

            {/* Version History */}
            {showVersions && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Version History</h3>
                {versions.length === 0 ? (
                  <p className="text-sm text-gray-500">No version history available.</p>
                ) : (
                  <div className="space-y-3">
                    {versions.map((version) => (
                      <div
                        key={version.version}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-900">Version {version.version}</p>
                            <p className="text-xs text-gray-500">
                              {version.changedAt.toLocaleString()}
                              {version.changedBy && ` by ${version.changedBy}`}
                            </p>
                            {version.changeReason && (
                              <p className="text-xs text-gray-600 mt-1">{version.changeReason}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRollback(version.version)}
                            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                          >
                            Rollback
                          </button>
                        </div>
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700 line-clamp-3">
                          {version.templateText.replace(/<[^>]*>/g, '').substring(0, 200)}...
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview Data */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview Data</h3>
              <div className="space-y-3">
                {Object.entries(previewData).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {key}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) =>
                        setPreviewData({ ...previewData, [key]: e.target.value })
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Fields */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Fields</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    When to Use
                  </label>
                  <textarea
                    value={formData.whenToUse}
                    onChange={(e) => setFormData({ ...formData, whenToUse: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.keywords.join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        keywords: e.target.value.split(',').map((k) => k.trim()),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confluence Link
                  </label>
                  <input
                    type="url"
                    value={formData.confluenceLink}
                    onChange={(e) =>
                      setFormData({ ...formData, confluenceLink: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="mineosAuto"
                    checked={formData.mineosAuto}
                    onChange={(e) =>
                      setFormData({ ...formData, mineosAuto: e.target.checked })
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="mineosAuto" className="ml-2 text-sm text-gray-700">
                    Mineos Auto
                  </label>
                </div>

                {/* Process Steps / Checklist */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Process Steps / Checklist
                      </label>
                      <p className="text-xs text-gray-500">
                        Schritt-für-Schritt Anleitung für Agents
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newStep: ProcessStep = {
                          order: processSteps.length + 1,
                          title: '',
                          description: '',
                          required: true,
                          checklist: [],
                        };
                        setProcessSteps([...processSteps, newStep]);
                      }}
                      className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
                    >
                      + Add Step
                    </button>
                  </div>

                  {processSteps.length > 0 && (
                    <div className="space-y-4">
                      {processSteps.map((step, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                {step.order}
                              </span>
                              <input
                                type="text"
                                value={step.title}
                                onChange={(e) => {
                                  const updated = [...processSteps];
                                  updated[index].title = e.target.value;
                                  setProcessSteps(updated);
                                }}
                                placeholder="Step title"
                                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = processSteps.filter((_, i) => i !== index);
                                updated.forEach((s, i) => { s.order = i + 1; });
                                setProcessSteps(updated);
                              }}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              ✕
                            </button>
                          </div>
                          <textarea
                            value={step.description}
                            onChange={(e) => {
                              const updated = [...processSteps];
                              updated[index].description = e.target.value;
                              setProcessSteps(updated);
                            }}
                            placeholder="Step description..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm mb-2"
                          />
                          <div className="flex items-center gap-4 mb-2">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={step.required}
                                onChange={(e) => {
                                  const updated = [...processSteps];
                                  updated[index].required = e.target.checked;
                                  setProcessSteps(updated);
                                }}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                              />
                              Required
                            </label>
                            <input
                              type="url"
                              value={step.confluenceLink || ''}
                              onChange={(e) => {
                                const updated = [...processSteps];
                                updated[index].confluenceLink = e.target.value;
                                setProcessSteps(updated);
                              }}
                              placeholder="Confluence Link (optional)"
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {processSteps.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-sm text-gray-500">No process steps added yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
