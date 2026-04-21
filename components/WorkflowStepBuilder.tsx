/**
 * Workflow Step Builder Component
 * UI for creating and editing workflow steps in templates
 */

'use client';

import { useState } from 'react';
import { ProcessStep, EmailDraft } from '@/lib/types';

interface WorkflowStepBuilderProps {
  steps: ProcessStep[];
  onChange: (steps: ProcessStep[]) => void;
}

export function WorkflowStepBuilder({ steps, onChange }: WorkflowStepBuilderProps) {
  const [editingStep, setEditingStep] = useState<number | null>(null);

  function addStep() {
    const newStep: ProcessStep = {
      order: steps.length,
      title: 'New Step',
      description: '',
      required: true,
      stepType: 'manual',
    };
    onChange([...steps, newStep]);
    setEditingStep(steps.length);
  }

  function updateStep(index: number, updates: Partial<ProcessStep>) {
    const updated = [...steps];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  }

  function deleteStep(index: number) {
    const updated = steps.filter((_, idx) => idx !== index);
    // Renumber steps
    updated.forEach((step, idx) => {
      step.order = idx;
    });
    onChange(updated);
    if (editingStep === index) {
      setEditingStep(null);
    }
  }

  function moveStep(index: number, direction: 'up' | 'down') {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    const updated = [...steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    
    // Renumber
    updated.forEach((step, idx) => {
      step.order = idx;
    });
    
    onChange(updated);
    if (editingStep === index) {
      setEditingStep(newIndex);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">Workflow Steps</h3>
        <button
          onClick={addStep}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          + Add Step
        </button>
      </div>

      {steps.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <p className="text-gray-600">No workflow steps yet. Click "Add Step" to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${
                editingStep === index ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-white'
              }`}
            >
              {/* Step Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm font-bold text-gray-600">Step {index + 1}</span>
                  {editingStep === index ? (
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => updateStep(index, { title: e.target.value })}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded"
                      placeholder="Step title"
                    />
                  ) : (
                    <span className="font-semibold text-gray-900">{step.title}</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => moveStep(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveStep(index, 'down')}
                    disabled={index === steps.length - 1}
                    className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => setEditingStep(editingStep === index ? null : index)}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    {editingStep === index ? 'Collapse' : 'Edit'}
                  </button>
                  <button
                    onClick={() => deleteStep(index)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Step Details (when editing) */}
              {editingStep === index && (
                <div className="space-y-4 mt-4 border-t border-gray-300 pt-4">
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold mb-1">Description</label>
                    <textarea
                      value={step.description}
                      onChange={(e) => updateStep(index, { description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      rows={2}
                      placeholder="Describe what should be done in this step"
                    />
                  </div>

                  {/* Step Type */}
                  <div>
                    <label className="block text-sm font-semibold mb-1">Step Type</label>
                    <select
                      value={step.stepType || 'manual'}
                      onChange={(e) => updateStep(index, { stepType: e.target.value as ProcessStep['stepType'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    >
                      <option value="manual">Manual Task</option>
                      <option value="email">Email</option>
                      <option value="decision">Decision Point</option>
                      <option value="wait">Wait/Delay</option>
                    </select>
                  </div>

                  {/* Email Template (if email type) */}
                  {step.stepType === 'email' && (
                    <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                      <h4 className="font-semibold text-gray-900">Email Template</h4>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-1">Subject</label>
                        <input
                          type="text"
                          value={step.emailTemplate?.subject || ''}
                          onChange={(e) => updateStep(index, {
                            emailTemplate: { ...step.emailTemplate!, subject: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          placeholder="Email subject line"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-1">Email Category</label>
                        <select
                          value={step.emailTemplate?.category || 'other'}
                          onChange={(e) => updateStep(index, {
                            emailTemplate: { 
                              ...step.emailTemplate!, 
                              category: e.target.value as EmailDraft['category']
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                        >
                          <option value="acknowledgement">Acknowledgement</option>
                          <option value="id_request">ID Request</option>
                          <option value="negative_response">Negative Response</option>
                          <option value="data_package">Data Package</option>
                          <option value="marketing_opt_out">Marketing Opt-Out</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-1">Body Template</label>
                        <textarea
                          value={step.emailTemplate?.bodyTemplate || ''}
                          onChange={(e) => updateStep(index, {
                            emailTemplate: { ...step.emailTemplate!, bodyTemplate: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                          rows={8}
                          placeholder="Email body template. Use {{CASE_ID}}, {{CUSTOMER_NAME}} for placeholders."
                        />
                      </div>

                      <div className="text-xs text-gray-600">
                        <strong>Available placeholders:</strong> {'{{'} CASE_ID {'}}'}, {'{{'} CUSTOMER_NAME {'}}'}, {'{{'} MARKET {'}}'}
                      </div>
                    </div>
                  )}

                  {/* Checklist */}
                  <div>
                    <label className="block text-sm font-semibold mb-1">Checklist Items (optional)</label>
                    <textarea
                      value={step.checklist?.join('\n') || ''}
                      onChange={(e) => updateStep(index, { 
                        checklist: e.target.value.split('\n').filter(l => l.trim())
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      rows={4}
                      placeholder="One item per line"
                    />
                  </div>

                  {/* Confluence Link */}
                  <div>
                    <label className="block text-sm font-semibold mb-1">Confluence Link (optional)</label>
                    <input
                      type="url"
                      value={step.confluenceLink || ''}
                      onChange={(e) => updateStep(index, { confluenceLink: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="https://..."
                    />
                  </div>

                  {/* Required Checkbox */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={step.required}
                      onChange={(e) => updateStep(index, { required: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label className="text-sm font-semibold">Required step (cannot be skipped)</label>
                  </div>
                </div>
              )}

              {/* Quick Summary (when not editing) */}
              {editingStep !== index && (
                <div className="mt-2 text-sm text-gray-600">
                  <div className="flex gap-4">
                    <span className="font-semibold">{step.stepType || 'manual'}</span>
                    <span>{step.required ? '🔴 Required' : '⚪️ Optional'}</span>
                    {step.emailTemplate && <span>📧 Email</span>}
                    {step.checklist && step.checklist.length > 0 && (
                      <span>✓ {step.checklist.length} items</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
