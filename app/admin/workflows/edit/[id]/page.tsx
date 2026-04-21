'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAllWorkflowTemplates } from '@/lib/workflows/standardWorkflows';
import { saveCustomWorkflow, getCustomWorkflow } from '@/lib/firebase/customWorkflows';
import { ProcessStep, EmailDraft } from '@/lib/types';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Workflow Editor
 * Create and edit workflow templates with steps, email templates, and dependencies
 */
export default function WorkflowEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const workflowId = params?.id as string;
  
  const [workflowName, setWorkflowName] = useState('');
  const [workflowNameEn, setWorkflowNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [isStandard, setIsStandard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (workflowId && workflowId !== 'new') {
      loadWorkflow(workflowId);
    } else {
      setLoading(false);
      // Initialize with one empty step
      setSteps([createEmptyStep(0)]);
    }
  }, [workflowId]);

  async function loadWorkflow(id: string) {
    // Try to load from standard workflows first
    const templates = getAllWorkflowTemplates();
    const template = templates.find(t => t.id === id);
    
    if (template) {
      setWorkflowName(template.name);
      setWorkflowNameEn(template.nameEn);
      setDescription(template.description || '');
      setIsStandard(true);
      
      // Load steps from standard workflow
      const { getWorkflowTemplate } = require('@/lib/workflows/standardWorkflows');
      const workflowSteps = getWorkflowTemplate(id);
      setSteps(workflowSteps || []);
    } else {
      // Try to load from custom workflows
      try {
        const customWorkflow = await getCustomWorkflow(id);
        if (customWorkflow) {
          setWorkflowName(customWorkflow.name);
          setWorkflowNameEn(customWorkflow.nameEn);
          setDescription(customWorkflow.description);
          setSteps(customWorkflow.steps);
          setIsStandard(false);
        }
      } catch (error) {
        console.error('Error loading custom workflow:', error);
      }
    }
    setLoading(false);
  }

  function createEmptyStep(order: number): ProcessStep {
    return {
      order: order + 1,
      title: '',
      description: '',
      required: true,
      stepType: 'manual',
      skipConditions: [],
      dependsOn: [],
    };
  }

  function addStep() {
    setSteps([...steps, createEmptyStep(steps.length)]);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  function updateStep(index: number, field: keyof ProcessStep, value: any) {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  }

  function moveStep(index: number, direction: 'up' | 'down') {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;
    
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    
    // Update order numbers
    newSteps.forEach((step, i) => {
      step.order = i + 1;
    });
    
    setSteps(newSteps);
  }

  async function saveWorkflow() {
    if (!workflowName || !workflowNameEn || steps.length === 0) {
      alert('Please fill in workflow name (both languages) and add at least one step.');
      return;
    }

    if (isStandard) {
      alert('⚠️ Cannot edit standard workflows. Please create a copy as a custom workflow instead.');
      return;
    }

    setSaving(true);
    setSuccessMessage('');
    
    try {
      const workflowData = {
        id: workflowId === 'new' ? `custom_${Date.now()}` : workflowId,
        name: workflowName,
        nameEn: workflowNameEn,
        description,
        steps,
      };
      
      await saveCustomWorkflow(workflowData, user?.email || undefined);
      
      setSuccessMessage('✅ Workflow saved successfully!');
      
      // Redirect to workflow list after 1.5s
      setTimeout(() => {
        router.push('/admin/workflows/list');
      }, 1500);
      
    } catch (error) {
      console.error('Error saving workflow:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to save workflow: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading workflow...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-400 rounded-lg p-4 shadow-sm">
            <p className="text-green-800 text-sm font-medium">{successMessage}</p>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {workflowId === 'new' ? 'Create New Workflow' : `Edit Workflow: ${workflowName}`}
            </h1>
            <p className="text-gray-600 mt-2">Define steps, email templates, and dependencies</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={saveWorkflow}
              disabled={isStandard || saving}
              className={`px-4 py-2 rounded-lg font-semibold ${
                isStandard || saving
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {saving ? '⏳ Saving...' : '💾 Save Workflow'}
            </button>
            <Link
              href="/admin/workflows/list"
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Back
            </Link>
          </div>
        </div>

        {/* Standard Workflow Warning */}
        {isStandard && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <span className="font-semibold text-yellow-900">Standard Workflow (Read-Only)</span>
                <p className="text-sm text-yellow-800 mt-1">
                  This is a standard workflow template defined in code. To customize it, create a copy or create a new custom workflow.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Workflow Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workflow Name (German)
              </label>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                disabled={isStandard}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="z.B. Datenauskunft Workflow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workflow Name (English)
              </label>
              <input
                type="text"
                value={workflowNameEn}
                onChange={(e) => setWorkflowNameEn(e.target.value)}
                disabled={isStandard}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="e.g. Data Access Workflow"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isStandard}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Describe when to use this workflow..."
              />
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Workflow Steps ({steps.length})</h2>
            {!isStandard && (
              <button
                onClick={addStep}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                ➕ Add Step
              </button>
            )}
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {step.order}
                    </span>
                    <span className="font-semibold text-gray-900">Step {step.order}</span>
                  </div>
                  <div className="flex gap-2">
                    {!isStandard && index > 0 && (
                      <button
                        onClick={() => moveStep(index, 'up')}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-xs"
                      >
                        ↑
                      </button>
                    )}
                    {!isStandard && index < steps.length - 1 && (
                      <button
                        onClick={() => moveStep(index, 'down')}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-xs"
                      >
                        ↓
                      </button>
                    )}
                    {!isStandard && (
                      <button
                        onClick={() => removeStep(index)}
                        className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-xs"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => updateStep(index, 'title', e.target.value)}
                      disabled={isStandard}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                      placeholder="Step title..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Step Type</label>
                    <select
                      value={step.stepType || 'manual'}
                      onChange={(e) => updateStep(index, 'stepType', e.target.value)}
                      disabled={isStandard}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                    >
                      <option value="manual">Manual</option>
                      <option value="email">Email</option>
                      <option value="decision">Decision</option>
                      <option value="wait">Wait</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={step.description}
                      onChange={(e) => updateStep(index, 'description', e.target.value)}
                      disabled={isStandard}
                      rows={2}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                      placeholder="Step description..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={step.required}
                      onChange={(e) => updateStep(index, 'required', e.target.checked)}
                      disabled={isStandard}
                      className="rounded"
                    />
                    <label className="text-xs text-gray-700">Required Step</label>
                  </div>
                </div>

                {/* Email Template Editor (only for email steps) */}
                {step.stepType === 'email' && !isStandard && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs font-medium text-gray-700 mb-3">📧 Email Template</div>
                    
                    {/* Create template button if none exists */}
                    {!step.emailTemplate ? (
                      <button
                        onClick={() => {
                          updateStep(index, 'emailTemplate', {
                            subject: '',
                            bodyTemplate: '',
                            placeholders: ['CASE_ID', 'CUSTOMER_NAME'],
                            category: 'other'
                          });
                        }}
                        className="px-3 py-2 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                      >
                        + Add Email Template
                      </button>
                    ) : (
                      <div className="space-y-3 bg-blue-50 border border-blue-200 rounded p-3">
                        {/* Subject */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Email Subject
                          </label>
                          <input
                            type="text"
                            value={step.emailTemplate.subject}
                            onChange={(e) => {
                              const newTemplate = { ...step.emailTemplate!, subject: e.target.value };
                              updateStep(index, 'emailTemplate', newTemplate);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            placeholder="e.g. Eingangsbestätigung Ihrer Anfrage - {{CASE_ID}}"
                          />
                        </div>

                        {/* Category */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Email Category
                          </label>
                          <select
                            value={step.emailTemplate.category}
                            onChange={(e) => {
                              const newTemplate = { ...step.emailTemplate!, category: e.target.value as any };
                              updateStep(index, 'emailTemplate', newTemplate);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          >
                            <option value="acknowledgement">Acknowledgement</option>
                            <option value="id_request">ID Request</option>
                            <option value="negative_response">Negative Response</option>
                            <option value="data_package">Data Package</option>
                            <option value="marketing_opt_out">Marketing Opt-Out</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        {/* Body Template */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Email Body Template
                          </label>
                          <textarea
                            value={step.emailTemplate.bodyTemplate}
                            onChange={(e) => {
                              const newTemplate = { ...step.emailTemplate!, bodyTemplate: e.target.value };
                              updateStep(index, 'emailTemplate', newTemplate);
                            }}
                            rows={6}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                            placeholder="Sehr geehrte Damen und Herren,&#10;&#10;vielen Dank für Ihre Anfrage.&#10;&#10;Referenznummer: {{CASE_ID}}&#10;&#10;Mit freundlichen Grüßen"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            💡 Available placeholders: {'{{CASE_ID}}, {{CUSTOMER_NAME}}, {{CUSTOMER_EMAIL}}, {{MARKET}}, {{RECEIVED_DATE}}, {{REASON}}'}
                          </div>
                        </div>

                        {/* Placeholders (optional, advanced) */}
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                            Advanced: Custom Placeholders
                          </summary>
                          <div className="mt-2">
                            <input
                              type="text"
                              value={step.emailTemplate.placeholders?.join(', ') || ''}
                              onChange={(e) => {
                                const placeholders = e.target.value.split(',').map(p => p.trim()).filter(Boolean);
                                const newTemplate = { ...step.emailTemplate!, placeholders };
                                updateStep(index, 'emailTemplate', newTemplate);
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              placeholder="CASE_ID, CUSTOMER_NAME, CUSTOM_FIELD"
                            />
                          </div>
                        </details>

                        {/* Remove template button */}
                        <button
                          onClick={() => updateStep(index, 'emailTemplate', undefined)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          🗑️ Remove Email Template
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Read-only email template display for standard workflows */}
                {step.stepType === 'email' && isStandard && step.emailTemplate && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs font-medium text-gray-700 mb-2">📧 Email Template (Read-Only)</div>
                    <div className="bg-white rounded p-2 text-xs text-gray-600">
                      <div><strong>Subject:</strong> {step.emailTemplate.subject}</div>
                      <div><strong>Category:</strong> {step.emailTemplate.category}</div>
                      <div className="mt-1 text-gray-500 line-clamp-2">
                        {step.emailTemplate.bodyTemplate.substring(0, 150)}...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">📝 Next Steps</h2>
          <ul className="text-sm text-gray-700 space-y-2 list-disc ml-5">
            <li>Define all workflow steps with clear titles and descriptions</li>
            <li>Set step types (manual, email, decision, wait) for automation</li>
            <li>Mark required vs. optional steps</li>
            <li>Add email templates for email-type steps</li>
            <li>Save workflow and assign it to Case Types in <Link href="/admin/workflows" className="text-blue-600 underline">Workflow Management</Link></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
