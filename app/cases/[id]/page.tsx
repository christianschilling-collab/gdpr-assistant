'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCase, updateCase } from '@/lib/firebase/cases';
import { GDPRCase, Category, RequesterType, ProcessStep, Template } from '@/lib/types';
import { getTemplates } from '@/lib/firebase/templates';
import { getCategories } from '@/lib/firebase/categories';
import { getRequesterTypes } from '@/lib/firebase/requesterTypes';
import { getAllEscalations } from '@/lib/firebase/escalations';
import { Escalation } from '@/lib/types/escalations';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { addToRecentCases } from '@/lib/utils/recentCases';
import { HelpModal, HelpButton } from '@/components/HelpModal';
import { HELP_CONTENT } from '@/lib/constants/helpContent';
// NEW: Workflow imports
import { initializeWorkflow, getWorkflow, getCurrentStep } from '@/lib/firebase/workflows';
import { getAllWorkflowTemplates } from '@/lib/workflows/standardWorkflows';
import { WorkflowTimeline, CurrentStepCard, WorkflowHistoryPanel } from '@/components/WorkflowComponents';
import type { CaseWorkflow, WorkflowStepInstance } from '@/lib/types';
import ErrorBoundary from '@/components/ErrorBoundary';

// Helper to convert Firestore timestamps
function safeToDate(value: any): Date {
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return new Date();
}

// Helper to replace template variables
function replaceTemplateVariables(template: string, caseData: GDPRCase): string {
  let result = template;
  
  // Replace {{caseId}}
  result = result.replace(/\{\{caseId\}\}/g, caseData.caseId || '[Case ID]');
  
  // Replace {{market}}
  result = result.replace(/\{\{market\}\}/g, caseData.market || '[Market]');
  
  // Replace {{date}}
  const today = new Date().toLocaleDateString('de-DE', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
  result = result.replace(/\{\{date\}\}/g, today);
  
  // Replace {{agentName}}
  result = result.replace(/\{\{agentName\}\}/g, caseData.teamMember || '[Agent Name]');
  
  return result;
}

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;
  const { user } = useAuth();
  const { addToast } = useToast();

  const [caseData, setCaseData] = useState<GDPRCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [requesterTypes, setRequesterTypes] = useState<RequesterType[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [relatedEscalations, setRelatedEscalations] = useState<Escalation[]>([]);
  
  // UI State
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // NEW: Workflow State
  const [workflow, setWorkflow] = useState<CaseWorkflow | null>(null);
  const [showWorkflowInit, setShowWorkflowInit] = useState(false);
  const [selectedWorkflowTemplate, setSelectedWorkflowTemplate] = useState<string>('');

  useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        const [caseDoc, cats, types, temps, escalations] = await Promise.all([
          getCase(caseId),
          getCategories(true),
          getRequesterTypes(true),
          getTemplates(),
          getAllEscalations(),
        ]);

        if (isCancelled) return;

        if (!caseDoc) {
          setError('Case not found');
          setLoading(false);
          return;
        }

        setCaseData(caseDoc);
        setCategories(cats);
        setRequesterTypes(types);
        setTemplates(temps);
        
        // Filter escalations that reference this case
        const related = escalations.filter(esc => 
          esc.relatedCases && esc.relatedCases.includes(caseId)
        );
        setRelatedEscalations(related);
        
        // NEW: Try to load workflow (workflows are in separate collection)
        try {
          console.log('🔄 Attempting to load workflow for case:', caseId);
          const wf = await getWorkflow(caseId);
          if (isCancelled) return;
          if (wf) {
            console.log('✅ Workflow found:', wf);
            setWorkflow(wf);
          } else {
            console.log('ℹ️ No workflow found for this case');
            setWorkflow(null);
          }
        } catch (workflowError) {
          if (!isCancelled) {
            console.warn('⚠️ Error loading workflow (may not exist):', workflowError);
            setWorkflow(null);
          }
        }

        if (isCancelled) return;

        // Add to recent cases
        const categoryName = cats.find(c => c.id === caseDoc.primaryCategory)?.name || 'Unknown';
        const requesterName = types.find(r => r.id === caseDoc.customerType)?.name || 'Unknown';
        addToRecentCases(
          caseDoc.id,
          `${requesterName} - ${categoryName}`,
          caseDoc.caseId
        );

        // Load matched template if exists
        if ((caseDoc as any).suggestedTemplate) {
          const matchedTemplate = temps.find(t => t.id === (caseDoc as any).suggestedTemplate);
          if (matchedTemplate) {
            setSelectedTemplate(matchedTemplate);
            if (matchedTemplate.processSteps) {
              setProcessSteps(matchedTemplate.processSteps);
            }
          }
        } else {
          // If no suggestedTemplate, try to find a matching template based on category + requester type
          if (caseDoc.primaryCategory && caseDoc.customerType) {
            console.log('🔍 Template Matching Debug:');
            console.log('  Case primaryCategory:', caseDoc.primaryCategory);
            console.log('  Case customerType:', caseDoc.customerType);
            console.log('  Available templates:', temps.length);
            
            const matchingTemplates = temps.filter(t => {
              const matches = t.primaryCategory === caseDoc.primaryCategory && 
                             t.requesterType === caseDoc.customerType;
              console.log(`  Template "${t.templateName}":`, {
                primaryCategory: t.primaryCategory,
                requesterType: t.requesterType,
                matches: matches
              });
              return matches;
            });
            
            console.log('  Matching templates found:', matchingTemplates.length);
            
            if (matchingTemplates.length > 0) {
              // Auto-select the first matching template
              const firstMatch = matchingTemplates[0];
              console.log('  ✅ Selected template:', firstMatch.templateName);
              setSelectedTemplate(firstMatch);
              if (firstMatch.processSteps) {
                setProcessSteps(firstMatch.processSteps);
              }
            } else {
              console.log('  ❌ No matching templates found');
            }
          } else {
            console.log('  ⚠️ Case missing primaryCategory or customerType');
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error loading case:', err);
          setError(err.message || 'Failed to load case');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [caseId]);

  async function handleProcessWithAI() {
    if (!caseData?.customerType) {
      addToast('Cannot process with AI: Requester Type is not set. Please edit the case and select a requester type first.', 'error');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      // Call API route (server-side AI classification)
      const response = await fetch('/api/classify-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseDescription: caseData.caseDescription,
          requesterTypeId: caseData.customerType,
          specificQuestion: caseData.specificQuestion,
          market: caseData.market,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI classification failed');
      }

      const result = await response.json();
      
      // Update case with AI results
      await updateCase(caseData.id, {
        primaryCategory: result.classification.primaryCategory,
        classificationMethod: 'ai',
      });

      addToast('Case processed with AI successfully!', 'success');
      // TODO: Reload data - needs refactoring
      window.location.reload();
    } catch (err: any) {
      console.error('AI Processing Error:', err);
      addToast(err.message || 'Failed to process case with AI', 'error');
    } finally {
      setProcessing(false);
    }
  }
  
  // NEW: Workflow Functions
  async function handleInitializeWorkflow() {
    if (!selectedWorkflowTemplate) {
      setError('Please select a workflow template');
      return;
    }
    
    try {
      setProcessing(true);
      setError('');
      
      console.log('🔄 Initializing workflow...');
      console.log('  Case ID:', caseId);
      console.log('  Template:', selectedWorkflowTemplate);
      
      // Initialize workflow
      const newWorkflow = await initializeWorkflow(caseId, selectedWorkflowTemplate);
      
      console.log('✅ Workflow created:', newWorkflow);
      setWorkflow(newWorkflow);
      setShowWorkflowInit(false);
      
      addToast('✅ Workflow initialized successfully!', 'success');
      window.location.reload(); // TODO: Refactor to use proper state reload
      
    } catch (err: any) {
      console.error('❌ Workflow init error:', err);
      console.error('  Error message:', err.message);
      console.error('  Error stack:', err.stack);
      
      setError(err.message || 'Failed to initialize workflow');
      addToast(err.message || 'Failed to initialize workflow', 'error');
      
      // Show user-friendly error with more details
      alert(`Failed to initialize workflow:\n\n${err.message}\n\nCheck browser console (F12) for more details.`);
    } finally {
      setProcessing(false);
    }
  }
  
  async function handleStepComplete() {
    console.log('🔄 Reloading workflow after completion...');
    try {
      // Directly reload workflow from Firestore
      const updatedWorkflow = await getWorkflow(caseId);
      if (updatedWorkflow) {
        console.log('✅ Workflow reloaded:', updatedWorkflow);
        setWorkflow(updatedWorkflow);
        addToast('✅ Step completed!', 'success');
      } else {
        console.warn('⚠️ No workflow found after reload');
        // Fallback: reload everything
        window.location.reload();
      }
    } catch (error: any) {
      console.error('❌ Error reloading workflow:', error);
      addToast('Step completed, but failed to refresh view', 'warning');
      // Try full reload as fallback
      window.location.reload();
    }
  }
  
  async function handleStepSkip() {
    console.log('🔄 Reloading workflow after skip...');
    try {
      const updatedWorkflow = await getWorkflow(caseId);
      if (updatedWorkflow) {
        console.log('✅ Workflow reloaded:', updatedWorkflow);
        setWorkflow(updatedWorkflow);
        addToast('Step skipped', 'info');
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('❌ Error reloading workflow:', error);
      window.location.reload();
    }
  }

  async function handleMarkResolved() {
    try {
      await updateCase(caseData!.id, { status: 'Resolved' });
      addToast('Case marked as resolved!', 'success');
      window.location.reload();
    } catch (err: any) {
      addToast(err.message || 'Failed to mark as resolved', 'error');
    }
  }

  function handleCopyJiraNote() {
    if (!caseData) return;

    const categoryName = categories.find(c => c.id === caseData.primaryCategory)?.name || 'Unknown Category';
    const requesterName = requesterTypes.find(r => r.id === caseData.customerType)?.name || 'Unknown Type';

    // Generate structured note for Jira
    const jiraNote = `
📋 GDPR Case Summary - ${caseData.caseId}

🏷️ Classification:
• Requester Type: ${requesterName}
• Category: ${categoryName}
${caseData.classificationMethod === 'ai' ? '• Method: AI Classification ✨' : '• Method: Manual Selection'}

📝 Request Description:
${caseData.caseDescription}

${caseData.specificQuestion ? `❓ Specific Question:\n${caseData.specificQuestion}\n\n` : ''}📊 Case Details:
• Market: ${caseData.market}
• Urgency: ${caseData.urgency}
• Status: ${caseData.status}
• Assigned to: ${caseData.teamMember}
• Created: ${safeToDate(caseData.timestamp).toLocaleDateString('de-DE')}
${caseData.customerNumber ? `• Customer #: ${caseData.customerNumber}` : ''}

${processSteps.length > 0 ? `✅ Process Steps:\n${processSteps.map((step, idx) => `${idx + 1}. ${step.title}`).join('\n')}\n\n` : ''}${selectedTemplate ? `📄 Template Used: ${selectedTemplate.templateName}\n\n` : ''}🔗 Links:
${caseData.jiraLink ? `• Jira: ${caseData.jiraLink}` : ''}
${caseData.mineosLink ? `• MineOS: ${caseData.mineosLink}` : ''}
${caseData.owlLink ? `• OWL: ${caseData.owlLink}` : ''}
${caseData.isGmail ? '• Source: Gmail' : ''}
`.trim();

    // Copy to clipboard
    navigator.clipboard.writeText(jiraNote).then(() => {
      setSuccessMessage('📋 Jira note copied to clipboard!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }).catch(() => {
      setError('Failed to copy to clipboard');
    });
  }

  async function handleDeleteCase() {
    try {
      // Call delete API or Firestore delete
      const db = (await import('@/lib/firebase/config')).getDb();
      if (!db) {
        throw new Error('Firebase not initialized');
      }
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'cases', caseData!.id));
      
      addToast('Case deleted successfully!', 'success');
      // Redirect to cases list after a short delay
      setTimeout(() => {
        router.push('/cases');
      }, 1000);
    } catch (err: any) {
      addToast(err.message || 'Failed to delete case', 'error');
    }
  }

  function toggleProcessStep(index: number) {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedSteps(newCompleted);
  }

  async function handleRequestGuidance() {
    // TODO: Implement guidance feature
    // Temporarily disabled for deployment
    setError('Guidance feature temporarily unavailable');
    return;
  }

  async function handleAddTrainingAgent() {
    // TODO: Implement training agent feature
    // Temporarily disabled for deployment
    setError('Training agent feature temporarily unavailable');
    return;
  }

  function copySuggestedReply() {
    if (!selectedTemplate?.templateText || !caseData) return;
    const textWithVariables = replaceTemplateVariables(selectedTemplate.templateText, caseData);
    navigator.clipboard.writeText(textWithVariables);
    setSuccessMessage('✅ Reply copied to clipboard!');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-7xl mx-auto text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error && !caseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>
          <Link href="/cases" className="mt-4 inline-block px-4 py-2 bg-gray-200 rounded-lg">
            ← Back to Cases
          </Link>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-7xl mx-auto text-center text-gray-500">Case not found</div>
      </div>
    );
  }

  const categoryName = categories.find(c => c.id === caseData.primaryCategory)?.name || caseData.primaryCategory || 'Not classified';
  const requesterName = requesterTypes.find(t => t.id === caseData.customerType)?.name || caseData.customerType || 'Unknown';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Notifications */}
        {successMessage && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-400 rounded-lg p-4 shadow-sm">
            <p className="text-green-800 text-sm font-medium">{successMessage}</p>
          </div>
        )}
        {error && caseData && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 rounded-lg p-4 shadow-sm">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* NEW: Workflow Section */}
        {workflow ? (
          <div className="space-y-6 mb-6">
            <ErrorBoundary componentName="WorkflowTimeline">
              <WorkflowTimeline workflow={workflow} />
            </ErrorBoundary>
            {workflow.steps[workflow.currentStepIndex] && (
              <ErrorBoundary componentName="CurrentStepCard">
                <CurrentStepCard
                  step={workflow.steps[workflow.currentStepIndex]}
                  stepIndex={workflow.currentStepIndex}
                  caseData={caseData}
                  onComplete={handleStepComplete}
                  onSkip={handleStepSkip}
                />
              </ErrorBoundary>
            )}
            
            {/* Suggested Reply - moved here from bottom */}
            {selectedTemplate ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Suggested Reply</h2>
                  <button
                    onClick={copySuggestedReply}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {replaceTemplateVariables(selectedTemplate.templateText, caseData)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Suggested Reply</h2>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 italic">
                    No template matched. Create a template for this case type to see suggested replies.
                  </p>
                </div>
              </div>
            )}
            
            <ErrorBoundary componentName="WorkflowHistoryPanel">
              <WorkflowHistoryPanel workflow={workflow} />
            </ErrorBoundary>

            {/* Related Escalations */}
            {relatedEscalations.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Related Escalations</h2>
                <div className="space-y-2">
                  {relatedEscalations.map(esc => (
                    <Link
                      key={esc.id}
                      href={`/escalations/${esc.id}`}
                      className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-blue-600 hover:text-blue-800">
                            {esc.escalationId}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{esc.summary}</div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            esc.status === 'Closed' ? 'bg-gray-100 text-gray-700' :
                            esc.status === 'Blocked' ? 'bg-red-100 text-red-700' :
                            esc.status === 'Pending External Response' ? 'bg-purple-100 text-purple-700' :
                            esc.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {esc.status}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Multi-Step Workflow (NEW!)
                </h3>
                <p className="text-sm text-blue-700 mb-4">
                  Initialize a structured workflow with automated email drafts and progress tracking.
                </p>
                
                {!showWorkflowInit ? (
                  <button
                    onClick={() => {
                      setShowWorkflowInit(true);
                      // Log warning for missing workflow
                      console.warn(
                        `⚠️ No workflow found for case type: ${categoryName} + ${requesterName}`,
                        `\nCase ID: ${caseData.caseId}`,
                        `\nPrimary Category: ${caseData.primaryCategory}`,
                        `\nRequester Type: ${caseData.customerType}`
                      );
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    + Initialize Workflow
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-blue-900 mb-2">
                        Select Workflow Template:
                      </label>
                      <select
                        value={selectedWorkflowTemplate}
                        onChange={(e) => setSelectedWorkflowTemplate(e.target.value)}
                        className="w-full max-w-md px-3 py-2 border border-blue-300 rounded-lg"
                      >
                        <option value="">-- Select Template --</option>
                        {getAllWorkflowTemplates().map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name} ({tpl.stepCount} steps)
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={handleInitializeWorkflow}
                        disabled={!selectedWorkflowTemplate || processing}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
                      >
                        {processing ? 'Initializing...' : '✓ Create Workflow'}
                      </button>
                      <button
                        onClick={() => setShowWorkflowInit(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <Link
                href="/workflows/demo"
                className="text-xs text-blue-600 hover:text-blue-800 underline ml-4"
              >
                View all workflows →
              </Link>
            </div>
          </div>
        )}

        {/* Minimal Header - One Line */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            {/* Left: Case ID & Key Info */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-gray-900">{caseData.caseId}</h1>
              <span className="text-gray-400">|</span>
              
              {/* Status - subtle unless important */}
              <span className={`px-2 py-0.5 rounded text-xs ${
                caseData.status === 'New' ? 'text-gray-600' :
                caseData.status === 'Under Review' ? 'bg-yellow-50 text-yellow-700 font-medium' :
                caseData.status === 'Resolved' ? 'bg-green-50 text-green-700 font-medium' :
                'text-gray-600'
              }`}>
                {caseData.status}
              </span>
              <span className="text-gray-400">|</span>
              
              {/* Urgency - only highlight if High */}
              <span className={`px-2 py-0.5 rounded text-xs ${
                caseData.urgency === 'High' ? 'bg-red-100 text-red-800 font-semibold' :
                'text-gray-500'
              }`}>
                {caseData.urgency}
              </span>
              <span className="text-gray-400">|</span>
              
              {/* Market - subtle */}
              <span className="text-gray-500 text-xs">
                {caseData.market}
              </span>
              <span className="text-gray-400">|</span>
              
              {/* Gmail Badge - PROMINENT if Gmail */}
              {caseData.isGmail && (
                <>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold border border-blue-300">
                    📧 Gmail
                  </span>
                  <span className="text-gray-400">|</span>
                </>
              )}
              
              {/* Quick Links to External Systems */}
              <div className="flex items-center gap-2 text-xs">
                {caseData.jiraLink && (
                  <a 
                    href={caseData.jiraLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Jira ↗
                  </a>
                )}
                {caseData.mineosLink && (
                  <>
                    {caseData.jiraLink && <span className="text-gray-300">•</span>}
                    <a 
                      href={caseData.mineosLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      MineOS ↗
                    </a>
                  </>
                )}
                {caseData.owlLink && (
                  <>
                    {(caseData.jiraLink || caseData.mineosLink) && <span className="text-gray-300">•</span>}
                    <a 
                      href={caseData.owlLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      OWL ↗
                    </a>
                  </>
                )}
                {!caseData.jiraLink && !caseData.mineosLink && !caseData.owlLink && !caseData.isGmail && (
                  <span className="text-gray-400">No external links</span>
                )}
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex gap-3">
              <Link 
                href="/cases" 
                className="px-3 py-1.5 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 text-xs font-medium whitespace-nowrap flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Cases
              </Link>
              <div className="flex items-center gap-2">
                <HelpButton onClick={() => setShowHelp(true)} />
                <Link 
                  href="/cases/new" 
                  className="px-4 py-1.5 text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 text-xs font-medium whitespace-nowrap flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Case
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Split Screen Layout: Left (60%) + Right (40% sticky) */}
        <div className="grid grid-cols-5 gap-6">
          {/* LEFT COLUMN (3/5 = 60%) - Work Area */}
          <div className="col-span-3 space-y-6">
            {/* 1. Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Actions
              </h2>
              
              {/* Primary Action - Dominant */}
              <div className="mb-4">
                <button
                  onClick={handleProcessWithAI}
                  disabled={processing || caseData.classificationMethod === 'ai'}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-sm"
                >
                  {processing ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Process with AI
                    </>
                  )}
                </button>
              </div>

              {/* Secondary Actions - Grouped */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={handleMarkResolved}
                  disabled={caseData.status === 'Resolved'}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mark as Resolved
                </button>
                <button
                  onClick={handleCopyJiraNote}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Copy Jira Note
                </button>
                <Link
                  href={`/cases/${caseData.id}/edit`}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </Link>
              </div>

              {/* Destructive Action - Isolated */}
              <div className="pt-3 border-t border-gray-200">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="text-red-600 hover:text-red-700 flex items-center gap-1.5 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Case
                </button>
              </div>
            </div>

            {/* Matching Templates - Only show if there are MULTIPLE matching templates */}
            {(() => {
              const matchingTemplates = templates.filter(t => 
                t.requesterType === caseData.customerType && 
                t.primaryCategory === caseData.primaryCategory
              );
              
              // Only show this section if there are 2+ templates to choose from
              if (matchingTemplates.length <= 1) return null;
              
              return (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-2">Alternative Templates</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    {matchingTemplates.length} templates available for this case type. Select one to apply it:
                  </p>
                  <div className="space-y-2">
                    {matchingTemplates.map(template => {
                      const isActive = selectedTemplate?.id === template.id;
                      return (
                        <div 
                          key={template.id} 
                          className={`flex justify-between items-center p-3 rounded-lg border-2 ${
                            isActive 
                              ? 'bg-indigo-50 border-indigo-600' 
                              : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{template.templateName}</p>
                              {isActive && (
                                <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                                  Currently Selected
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{template.whenToUse}</p>
                          </div>
                          {!isActive && (
                            <button
                              onClick={() => {
                                setSelectedTemplate(template);
                                if (template.processSteps) {
                                  setProcessSteps(template.processSteps);
                                  setCompletedSteps(new Set());
                                }
                                setSuccessMessage('✅ Template applied!');
                              }}
                              className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 whitespace-nowrap"
                            >
                              Switch to This
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* RIGHT COLUMN (2/5 = 40%) - Context (Sticky) */}
          <div className="col-span-2 space-y-4">
            {/* CLASSIFICATION BANNER - Prominent */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border-2 border-indigo-200 p-3 shadow-sm sticky top-4">
              <div className="flex items-center justify-center gap-2">
                <span className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
                  requesterName.toLowerCase().includes('kunde') || requesterName.toLowerCase().includes('customer')
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {requesterName}
                </span>
                <span className="text-indigo-400 font-bold text-lg">»</span>
                <span className="px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-lg font-bold text-sm flex items-center gap-1.5">
                  {categoryName}
                  {caseData.classificationMethod === 'ai' && (
                    <span 
                      className="text-2xl animate-pulse" 
                      style={{ 
                        filter: 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.8))',
                        color: '#fbbf24'
                      }}
                      title="AI classified"
                      role="img" 
                      aria-label="AI classified"
                    >
                      ✨
                    </span>
                  )}
                </span>
                {caseData.classificationMethod === 'ai' && (
                  <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full border border-yellow-300">
                    AI
                  </span>
                )}
              </div>
            </div>

            {/* REQUEST DESCRIPTION - Always visible */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm sticky top-20">
              <h3 className="text-sm font-bold text-gray-900 mb-3">📝 Request Description</h3>
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 max-h-64 overflow-y-auto">
                <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{caseData.caseDescription}</p>
              </div>
            </div>

            {/* CASE INFORMATION - Below request */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 sticky top-[26rem]">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Case Information</h3>
              <div className="space-y-3 text-xs">
                {/* Customer Information - GDPR compliant */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="font-semibold text-gray-800 mb-2">👤 Customer</p>
                  <div className="space-y-1.5">
                    {caseData.customerNumber && (
                      <div>
                        <span className="text-gray-600 block text-xs">Customer #:</span>
                        <span className="text-gray-900 text-sm font-medium">{caseData.customerNumber}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600 block text-xs">Market:</span>
                      <span className="text-gray-900 text-sm">{caseData.market || 'Not specified'}</span>
                    </div>
                    
                    {/* Source - Gmail Badge */}
                    {caseData.isGmail && (
                      <div>
                        <span className="text-gray-600 block text-xs mb-1">Source:</span>
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold border border-blue-300">
                          📧 Gmail
                        </span>
                      </div>
                    )}
                    
                    {/* External Links */}
                    {(caseData.jiraLink || caseData.mineosLink || caseData.owlLink) && (
                      <div>
                        <span className="text-gray-600 block text-xs mb-1">Links:</span>
                        <div className="flex flex-wrap gap-2">
                          {caseData.jiraLink && (
                            <a 
                              href={caseData.jiraLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs"
                            >
                              Jira ↗
                            </a>
                          )}
                          {caseData.mineosLink && (
                            <a 
                              href={caseData.mineosLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs"
                            >
                              MineOS ↗
                            </a>
                          )}
                          {caseData.owlLink && (
                            <a 
                              href={caseData.owlLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs"
                            >
                              OWL ↗
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="font-semibold text-gray-800 mb-2">ℹ️ Details</p>
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div>👨‍💼 <span className="text-gray-900">{caseData.teamMember}</span></div>
                    <div>📅 <span className="text-gray-900">{safeToDate(caseData.timestamp).toLocaleDateString('de-DE', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-red-600 mb-4">Delete Case</h3>
              <p className="text-sm text-gray-700 mb-2">
                Are you sure you want to delete this case?
              </p>
              <p className="text-sm text-red-600 font-semibold mb-4">
                This action cannot be undone!
              </p>
              <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200">
                <p className="text-xs text-gray-600">Case ID:</p>
                <p className="text-sm font-medium text-gray-900">{caseData.caseId}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    handleDeleteCase();
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete Case
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <HelpModal 
        isOpen={showHelp} 
        onClose={() => setShowHelp(false)}
        title={HELP_CONTENT.caseDetail.title}
        sections={HELP_CONTENT.caseDetail.sections}
      />
    </div>
  );
}
