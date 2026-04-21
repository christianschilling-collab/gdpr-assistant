/**
 * Workflow UI Components
 * Reusable components for displaying and managing workflow steps in case details
 */

'use client';

import { useState } from 'react';
import { CaseWorkflow, WorkflowStepInstance, GDPRCase } from '@/lib/types';
import { updateStepStatus, skipStep, updateEmailDraft } from '@/lib/firebase/workflows';
import { generateEmailDraft } from '@/lib/gemini/emailDrafts';
import dynamic from 'next/dynamic';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

interface WorkflowTimelineProps {
  workflow: CaseWorkflow;
  onStepClick?: (stepIndex: number) => void;
}

/**
 * Visual timeline showing all workflow steps with their current status
 */
export function WorkflowTimeline({ workflow, onStepClick }: WorkflowTimelineProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Workflow Progress</h2>
      
      <div className="relative">
        {/* Progress bar */}
        <div className="absolute top-5 left-0 w-full h-1 bg-gray-200">
          <div
            className="h-1 bg-indigo-600 transition-all duration-500"
            style={{
              width: `${(workflow.steps.filter(s => s.status === 'completed' || s.status === 'skipped').length / workflow.steps.length) * 100}%`
            }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {workflow.steps.map((step, index) => (
            <button
              key={index}
              onClick={() => onStepClick?.(index)}
              className={`flex flex-col items-center group ${
                index === workflow.currentStepIndex ? 'scale-110' : ''
              } transition-transform`}
            >
              {/* Step circle */}
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold z-10 ${
                  step.status === 'completed'
                    ? 'bg-green-500 border-green-600 text-white'
                    : step.status === 'skipped'
                    ? 'bg-gray-400 border-gray-500 text-white'
                    : step.status === 'in_progress'
                    ? 'bg-blue-500 border-blue-600 text-white animate-pulse'
                    : 'bg-white border-gray-300 text-gray-600'
                }`}
              >
                {step.status === 'completed' ? '✓' : step.status === 'skipped' ? '−' : index + 1}
              </div>

              {/* Step label */}
              <div className="mt-2 text-xs text-center max-w-24 group-hover:text-indigo-600 transition-colors">
                {step.stepDefinition.title}
              </div>
              
              {/* Current indicator */}
              {index === workflow.currentStepIndex && (
                <div className="mt-1 text-xs text-indigo-600 font-semibold">Current</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 flex justify-between text-sm text-gray-600">
        <div>
          <span className="font-semibold">
            {workflow.steps.filter(s => s.status === 'completed' || s.status === 'skipped').length}
          </span>
          {' '}/{' '}
          <span>{workflow.steps.length}</span> steps completed
        </div>
        <div>
          Started: {new Date(workflow.startedAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

interface CurrentStepCardProps {
  step: WorkflowStepInstance;
  stepIndex: number;
  caseData: GDPRCase;
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Card displaying the current workflow step with actions
 */
export function CurrentStepCard({ step, stepIndex, caseData, onComplete, onSkip }: CurrentStepCardProps) {
  const [emailDraft, setEmailDraft] = useState(step.emailDraft || '');
  const [notes, setNotes] = useState(step.notes || '');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [skipReason, setSkipReason] = useState('');

  async function handleGenerateEmail() {
    if (!step.stepDefinition.emailTemplate) return;
    
    const isDev = process.env.NODE_ENV === 'development';
    setGenerating(true);
    try {
      if (isDev) {
        console.log('🔄 Generating email draft via API...');
        console.log('Step:', step.stepDefinition);
        console.log('Case:', caseData);
      }
      
      let draft: string;
      
      try {
        // 🔥 NEW: Call server-side API instead of client-side Gemini
        const response = await fetch('/api/workflows/generate-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stepDefinition: step.stepDefinition,
            caseData,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        draft = data.emailDraft;
        
        if (isDev) console.log('✅ Email draft generated via API');
      } catch (apiError) {
        if (isDev) console.warn('⚠️ API generation failed, using static template:', apiError);
        
        // Simple fallback: Just replace placeholders in the template
        draft = step.stepDefinition.emailTemplate.bodyTemplate
          .replace(/\{\{CASE_ID\}\}/g, caseData.caseId || '[CASE_ID]')
          .replace(/\{\{CUSTOMER_NAME\}\}/g, 'Sehr geehrte Damen und Herren')
          .replace(/\{\{CUSTOMER_EMAIL\}\}/g, caseData.market || '[EMAIL]')
          .replace(/\{\{RECEIVED_DATE\}\}/g, new Date().toLocaleDateString('de-DE'))
          .replace(/\{\{REASON\}\}/g, '[Grund wird noch angegeben]')
          .replace(/\{\{MARKET\}\}/g, caseData.market || 'DE');
      }
      
      if (isDev) console.log('✅ Final email draft:', draft);
      setEmailDraft(draft);
      await updateEmailDraft(caseData.id, step.stepOrder, draft);
      
    } catch (error) {
      console.error('❌ Error generating email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to generate email draft: ${errorMessage}\n\nPlease check:\n1. Gemini API Key is configured\n2. Approved templates exist in Firestore\n3. Network connection is working`);
    } finally {
      setGenerating(false);
    }
  }

  async function handleComplete() {
    // For required steps, show confirmation dialog
    if (step.stepDefinition.required) {
      setShowCompleteDialog(true);
      return;
    }
    
    // For optional steps, complete directly
    await handleCompleteConfirm();
  }

  async function handleCompleteConfirm() {
    const isDev = process.env.NODE_ENV === 'development';
    setSaving(true);
    try {
      if (isDev) {
        console.log('🔄 Completing step:', step.stepOrder);
        console.log('Notes:', notes);
        console.log('Email draft:', emailDraft ? 'Present' : 'None');
      }
      
      await updateStepStatus(
        caseData.id,
        step.stepOrder,
        'completed',
        caseData.teamMember || 'Unknown User', // Use case team member as fallback
        notes,
        emailDraft
      );
      
      if (isDev) console.log('✅ Step completed successfully');
      setShowCompleteDialog(false);
      onComplete();
      
    } catch (error) {
      console.error('❌ Error completing step:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to complete step: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSkipConfirm() {
    const trimmedReason = skipReason.trim();
    
    // Validation
    if (!trimmedReason) {
      alert('⚠️ Please provide a reason for skipping this step.');
      return;
    }
    
    if (trimmedReason.length < 10) {
      alert('⚠️ Skip reason must be at least 10 characters. Please provide more detail.');
      return;
    }
    
    if (step.stepDefinition.required) {
      const confirmed = confirm(
        `⚠️ This is a REQUIRED step!\n\nSkipping required steps may impact compliance or case resolution.\n\nReason: ${trimmedReason}\n\nAre you sure you want to skip?`
      );
      if (!confirmed) return;
    }
    
    setSaving(true);
    try {
      await skipStep(caseData.id, step.stepOrder, trimmedReason);
      setShowSkipDialog(false);
      setSkipReason(''); // Reset
      onSkip();
    } catch (error) {
      console.error('Error skipping step:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to skip step: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-indigo-200 p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Current Step</h2>
          <p className="text-sm text-gray-600 mt-1">
            Step {step.stepOrder + 1}: {step.stepDefinition.title}
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            step.stepDefinition.stepType === 'email' ? 'bg-blue-100 text-blue-700' :
            step.stepDefinition.stepType === 'manual' ? 'bg-purple-100 text-purple-700' :
            step.stepDefinition.stepType === 'decision' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {step.stepDefinition.stepType || 'manual'}
          </span>
          {step.stepDefinition.required && (
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
              Required
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-700 mb-4">{step.stepDefinition.description}</p>

      {/* Checklist (if available) */}
      {step.stepDefinition.checklist && step.stepDefinition.checklist.length > 0 && (
        <div className="mb-4 bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Checklist:</h3>
          <ul className="space-y-2">
            {step.stepDefinition.checklist.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" />
                <span className="text-sm text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Email Draft Section (for email steps) */}
      {step.stepDefinition.stepType === 'email' && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-900">Email Draft</h3>
            {!emailDraft && (
              <button
                onClick={handleGenerateEmail}
                disabled={generating}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>✨ Generate Email</>
                )}
              </button>
            )}
          </div>

          {emailDraft ? (
            <div className="border border-gray-300 rounded-lg">
              <ReactQuill
                value={emailDraft}
                onChange={setEmailDraft}
                className="bg-white"
                theme="snow"
              />
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-gray-600">Click "Generate Email" to create a draft</p>
            </div>
          )}
        </div>
      )}

      {/* Notes Section */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes or observations about this step..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          rows={3}
        />
      </div>

      {/* Confluence Link */}
      {step.stepDefinition.confluenceLink && (
        <a
          href={step.stepDefinition.confluenceLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 mb-4"
        >
          📚 View Confluence Documentation ↗
        </a>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={handleComplete}
          disabled={saving}
          className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : '✓ Mark as Completed'}
        </button>
        
        {!step.stepDefinition.required && (
          <button
            onClick={() => setShowSkipDialog(true)}
            disabled={saving}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            Skip Step
          </button>
        )}
      </div>

      {/* Skip Dialog */}
      {showSkipDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {step.stepDefinition.required ? '⚠️ Skip Required Step?' : 'Skip this step?'}
            </h3>
            
            {step.stepDefinition.required && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 font-semibold">
                  Warning: This is a required step! Skipping may impact case compliance.
                </p>
              </div>
            )}
            
            <p className="text-sm text-gray-600 mb-3">
              Please provide a detailed reason for skipping this step (min. 10 characters):
            </p>
            
            <textarea
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="Example: Customer requested to pause process, awaiting additional documentation, etc."
              className={`w-full px-3 py-2 border rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 ${
                skipReason.trim().length > 0 && skipReason.trim().length < 10
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300'
              }`}
              rows={4}
            />
            
            <div className="text-xs text-gray-500 mb-4">
              Characters: {skipReason.length} {skipReason.trim().length < 10 && skipReason.length > 0 && '(minimum 10 required)'}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSkipDialog(false);
                  setSkipReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSkipConfirm}
                disabled={saving || skipReason.trim().length < 10}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                  step.stepDefinition.required
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                }`}
              >
                {saving ? 'Skipping...' : 'Confirm Skip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Step Confirmation Dialog (for required steps only) */}
      {showCompleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Mark Step as Completed?
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              You are about to mark <span className="font-semibold">Step {step.stepOrder + 1}: {step.stepDefinition.title}</span> as completed.
              {step.stepDefinition.required && (
                <span className="block mt-2 text-red-700 font-semibold">
                  This is a required step.
                </span>
              )}
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowCompleteDialog(false)}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteConfirm}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Confirm: Mark as Completed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface WorkflowHistoryPanelProps {
  workflow: CaseWorkflow;
}

/**
 * Panel showing completed/skipped workflow steps history
 */
export function WorkflowHistoryPanel({ workflow }: WorkflowHistoryPanelProps) {
  const completedSteps = workflow.steps.filter(
    s => s.status === 'completed' || s.status === 'skipped'
  );

  if (completedSteps.length === 0) {
    return null;
  }

  // Create reversed copy without mutating original
  const reversedSteps = [...completedSteps].reverse();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Workflow History</h2>
      
      <div className="space-y-4">
        {reversedSteps.map((step, idx) => (
          <div
            key={idx}
            className="border-l-4 border-gray-300 pl-4 pb-4 last:pb-0"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {step.stepDefinition.title}
                </h3>
                <div className="flex gap-2 items-center mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    step.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {step.status}
                  </span>
                  {step.completedBy && (
                    <span className="text-xs text-gray-600">by {step.completedBy}</span>
                  )}
                </div>
              </div>
              <div className="text-right text-xs text-gray-600">
                {step.completedAt && new Date(step.completedAt).toLocaleDateString()}
                <br />
                {step.completedAt && new Date(step.completedAt).toLocaleTimeString()}
              </div>
            </div>

            {/* Notes */}
            {step.notes && (
              <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                {step.notes}
              </p>
            )}

            {/* Skip reason */}
            {step.status === 'skipped' && step.skipReason && (
              <p className="text-sm text-gray-700 mt-2 bg-yellow-50 p-2 rounded">
                <strong>Skip reason:</strong> {step.skipReason}
              </p>
            )}

            {/* Email draft (collapsed) */}
            {step.emailDraft && (
              <details className="mt-2">
                <summary className="text-sm text-indigo-600 cursor-pointer hover:text-indigo-800">
                  View email sent
                </summary>
                <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                  <div dangerouslySetInnerHTML={{ __html: step.emailDraft }} />
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
