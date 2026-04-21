'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getEscalation,
  getEscalationAuditLog,
  updateEscalationStatus,
  updateEscalationField,
  addEscalationLink,
  updateActionItem,
  addActionItem,
  addCommunicationEntry,
  updateCommunicationEntry,
} from '@/lib/firebase/escalations';
import {
  Escalation,
  EscalationAuditLog,
  EscalationStatus,
  EscalationLinkType,
  ActionItemOwner,
  ActionItemStatus,
  CommunicationEntry,
} from '@/lib/types/escalations';
import { useToast } from '@/lib/contexts/ToastContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  DocumentTextIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

const STATUS_OPTIONS: EscalationStatus[] = ['Not Started', 'In Progress', 'Pending External Response', 'Blocked', 'Closed'];
const LINK_TYPES: EscalationLinkType[] = ['Google Drive', 'Google NotebookLM', 'Jira', 'Purecloud', 'Other'];
const OWNER_OPTIONS: ActionItemOwner[] = ['Customer Care', 'GDPR Team', 'Legal', 'Marketing/PR'];
const ACTION_STATUS_OPTIONS: ActionItemStatus[] = ['Not Started', 'In Progress', 'Completed', 'Blocked', 'N/A – Not Required'];

const SUBJECT_OPTIONS: import('@/lib/types/escalations').EscalationSubject[] = [
  'Privacy',
  'Right of Access (DSAR)',
  'Right to Rectification',
  'Right to Erasure',
  'Right to Restriction of Processing',
  'Right to Data Portability',
  'Right to Object to Processing',
  'Other/Specific Request',
  'Logistic',
  'Payment',
  'Product Quality',
  'Customer Service',
];

export default function EscalationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();
  const escalationId = params.id as string;
  const userEmail = user?.email || 'system';

  const [escalation, setEscalation] = useState<Escalation | null>(null);
  const [auditLog, setAuditLog] = useState<EscalationAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Edit states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<any>({
    summary: '',
    subject: '' as import('@/lib/types/escalations').EscalationSubject,
    investigationResult: '',
    draftAnswer: '',
    waitingForResponseFrom: '',
  });

  // Link adding
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLink, setNewLink] = useState({ type: 'Google Drive' as EscalationLinkType, url: '', label: '' });

  // Action item adding
  const [showAddAction, setShowAddAction] = useState(false);
  const [newAction, setNewAction] = useState({ title: '', owner: 'Customer Care' as ActionItemOwner });

  // Communication entry adding
  const [showAddComm, setShowAddComm] = useState(false);
  const [newComm, setNewComm] = useState({
    sender: 'Customer' as CommunicationEntry['sender'],
    summary: '',
    interactionLink: '',
  });
  const [editingComm, setEditingComm] = useState<string | null>(null);
  const [editCommValues, setEditCommValues] = useState({
    sender: 'Customer' as CommunicationEntry['sender'],
    summary: '',
    interactionLink: '',
  });

  // Related cases management
  const [showAddCase, setShowAddCase] = useState(false);
  const [newCaseId, setNewCaseId] = useState('');

  useEffect(() => {
    loadData();
  }, [escalationId]);

  async function loadData() {
    try {
      const [escalationData, auditData] = await Promise.all([
        getEscalation(escalationId),
        getEscalationAuditLog(escalationId),
      ]);

      if (!escalationData) {
        addToast('Escalation not found', 'error');
        return;
      }

      setEscalation(escalationData);
      setAuditLog(auditData);
      setFieldValues({
        summary: escalationData.summary || '',
        subject: escalationData.subject,
        investigationResult: escalationData.investigationResult || '',
        draftAnswer: escalationData.draftAnswer || '',
        waitingForResponseFrom: escalationData.waitingForResponseFrom || '',
      });
    } catch (error) {
      console.error('Error loading escalation:', error);
      addToast('Failed to load escalation', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus: EscalationStatus) {
    if (!escalation) return;
    setUpdating(true);
    try {
      await updateEscalationStatus(escalation.id, newStatus, userEmail);
      addToast(`Status updated to: ${newStatus}`, 'success');
      await loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      addToast('Failed to update status', 'error');
    } finally {
      setUpdating(false);
    }
  }

  async function handleSaveField(fieldName: string, value: string) {
    if (!escalation) return;
    setUpdating(true);
    try {
      await updateEscalationField(escalation.id, fieldName, value, userEmail);
      setEscalation({ ...escalation, [fieldName]: value });
      addToast('Field updated successfully', 'success');
      setEditingField(null);
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadData();
    } catch (error) {
      console.error('Error saving field:', error);
      addToast('Failed to save field', 'error');
    } finally {
      setUpdating(false);
    }
  }

  async function handleAddLink() {
    if (!escalation || !newLink.url.trim()) return;
    try {
      await addEscalationLink(escalation.id, newLink, userEmail);
      addToast('Link added successfully', 'success');
      setShowAddLink(false);
      setNewLink({ type: 'Google Drive', url: '', label: '' });
      await loadData();
    } catch (error) {
      console.error('Error adding link:', error);
      addToast('Failed to add link', 'error');
    }
  }

  async function handleUpdateActionItem(itemId: string, updates: any) {
    if (!escalation) return;
    try {
      await updateActionItem(escalation.id, itemId, updates, userEmail);
      await loadData();
    } catch (error) {
      console.error('Error updating action item:', error);
      addToast('Failed to update action item', 'error');
    }
  }

  async function handleAddAction() {
    if (!escalation || !newAction.title.trim()) return;
    try {
      await addActionItem(escalation.id, newAction.title, newAction.owner, userEmail);
      addToast('Action item added', 'success');
      setShowAddAction(false);
      setNewAction({ title: '', owner: 'Customer Care' });
      await loadData();
    } catch (error) {
      console.error('Error adding action:', error);
      addToast('Failed to add action item', 'error');
    }
  }

  async function handleAddCommunication() {
    if (!escalation || !newComm.summary.trim()) return;
    try {
      await addCommunicationEntry(
        escalation.id,
        {
          sender: newComm.sender,
          summary: newComm.summary,
          interactionLink: newComm.interactionLink || undefined,
          addedBy: userEmail,
        },
        userEmail
      );
      addToast('Communication entry added', 'success');
      setShowAddComm(false);
      setNewComm({ sender: 'Customer', summary: '', interactionLink: '' });
      await loadData();
    } catch (error) {
      console.error('Error adding communication:', error);
      addToast('Failed to add communication entry', 'error');
    }
  }

  async function handleUpdateCommunication(commId: string) {
    if (!escalation || !editCommValues.summary.trim()) return;
    try {
      await updateCommunicationEntry(
        escalation.id,
        commId,
        {
          sender: editCommValues.sender,
          summary: editCommValues.summary,
          interactionLink: editCommValues.interactionLink || undefined,
        },
        userEmail
      );
      addToast('Communication updated', 'success');
      setEditingComm(null);
      await loadData();
    } catch (error) {
      console.error('Error updating communication:', error);
      addToast('Failed to update communication', 'error');
    }
  }

  async function handleAddCase() {
    if (!escalation || !newCaseId.trim()) return;
    try {
      const updatedCases = [...(escalation.relatedCases || []), newCaseId.trim()];
      await updateEscalationField(escalation.id, 'relatedCases', updatedCases, userEmail);
      addToast('Related case added', 'success');
      setShowAddCase(false);
      setNewCaseId('');
      await loadData();
    } catch (error) {
      console.error('Error adding related case:', error);
      addToast('Failed to add related case', 'error');
    }
  }

  async function handleRemoveCase(caseId: string) {
    if (!escalation) return;
    try {
      const updatedCases = (escalation.relatedCases || []).filter(id => id !== caseId);
      await updateEscalationField(escalation.id, 'relatedCases', updatedCases, userEmail);
      addToast('Related case removed', 'success');
      await loadData();
    } catch (error) {
      console.error('Error removing related case:', error);
      addToast('Failed to remove related case', 'error');
    }
  }

  function copyURL() {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    addToast('URL copied to clipboard', 'success');
  }

  function copySummary() {
    if (!escalation) return;
    
    // Exclude N/A items from progress calculations
    const relevantItems = escalation.actionItems.filter(i => i.status !== 'N/A – Not Required');
    const completed = relevantItems.filter(i => i.status === 'Completed').length;
    const total = relevantItems.length;
    
    const summary = `# Escalation ${escalation.escalationId}

**Status:** ${escalation.status}  
**Subject:** ${escalation.subject}  
**Market:** ${escalation.market}  
**Classification:** ${escalation.classification}  
**Date:** ${escalation.createdAt.toLocaleDateString()}  
**Deadline:** ${escalation.deadlineFirstReply.toLocaleDateString()}

## Summary
${escalation.summary}

## Action Items (${completed}/${total} completed)
${escalation.actionItems.map(item => 
  `- [${item.status === 'Completed' ? 'x' : ' '}] ${item.title} (${item.owner})`
).join('\n')}

## Timeline
${auditLog.slice(-10).reverse().map(entry =>
  `- ${entry.timestamp.toLocaleDateString()} ${entry.timestamp.toLocaleTimeString()} - ${entry.action} by ${entry.userEmail}`
).join('\n')}`;

    navigator.clipboard.writeText(summary);
    addToast('Summary copied to clipboard', 'success');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading escalation...</p>
        </div>
      </div>
    );
  }

  if (!escalation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-900 text-lg mb-4">Escalation not found</p>
          <button
            onClick={() => router.push('/incidents')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to List
          </button>
        </div>
      </div>
    );
  }

  const isOverdue = escalation.status !== 'Closed' && escalation.deadlineFirstReply < new Date();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <button
            onClick={() => router.push('/incidents')}
            className="text-gray-600 hover:text-gray-900 mb-3 flex items-center gap-2 text-sm"
          >
            ← Back to List
          </button>
          
          {/* Compact Header Layout */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-6">
              {/* Left: Title + Summary */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  Escalation {escalation.escalationId}
                </h1>
                
                {/* Compact Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700 uppercase">Summary</span>
                    {editingField !== 'summary' && (
                      <button
                        onClick={() => {
                          setEditingField('summary');
                          setFieldValues({ ...fieldValues, summary: escalation.summary });
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  
                  {editingField === 'summary' ? (
                    <div>
                      <textarea
                        value={(fieldValues as any).summary || ''}
                        onChange={(e) => setFieldValues({ ...fieldValues, summary: e.target.value } as any)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        rows={2}
                      />
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => handleSaveField('summary', (fieldValues as any).summary)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingField(null);
                            setFieldValues({ ...fieldValues, summary: escalation.summary } as any);
                          }}
                          className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900 leading-snug">{escalation.summary}</p>
                  )}
                </div>
              </div>

              {/* Right: Status + Dates + Actions */}
              <div className="flex flex-col gap-3 min-w-[320px]">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 font-semibold">Status:</span>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                    escalation.status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                    escalation.status === 'Blocked' ? 'bg-red-100 text-red-800' :
                    escalation.status === 'Pending External Response' ? 'bg-purple-100 text-purple-800' :
                    escalation.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {escalation.status}
                  </span>
                </div>

                {/* Important Dates */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 font-medium">Date of Submission:</span>
                      <span className="font-semibold text-gray-900">
                        {escalation.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                    <div className={`flex items-center justify-between text-sm p-2 rounded ${
                      isOverdue ? 'bg-red-50 border border-red-300' : 'bg-white border border-gray-200'
                    }`}>
                      <span className={`font-medium ${isOverdue ? 'text-red-700' : 'text-gray-600'}`}>
                        Deadline First Reply:
                      </span>
                      <span className={`font-bold ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                        {escalation.deadlineFirstReply.toLocaleDateString()}
                        {isOverdue && ' ⚠️'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={copyURL}
                    className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-semibold flex items-center justify-center gap-2"
                    title="Copy Case URL"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    URL
                  </button>
                  <button
                    onClick={copySummary}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold flex items-center justify-center gap-2"
                    title="Copy Summary"
                  >
                    <ClipboardDocumentCheckIcon className="w-4 h-4" />
                    Summary
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats - More Compact */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          {/* Case Classification */}
          <div className={`rounded-lg shadow-sm border-2 p-3 ${
            escalation.subject.includes('Right') || escalation.subject === 'Privacy' || escalation.subject === 'Other/Specific Request'
              ? 'bg-red-50 border-red-300'
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-gray-600 font-semibold">Case Classification</div>
              {editingField !== 'subject' && (
                <button
                  onClick={() => {
                    setEditingField('subject');
                    setFieldValues({ ...fieldValues, subject: escalation.subject });
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  <PencilSquareIcon className="w-3 h-3" />
                </button>
              )}
            </div>
            
            {editingField === 'subject' ? (
              <div>
                <select
                  value={(fieldValues as any).subject}
                  onChange={(e) => setFieldValues({ ...fieldValues, subject: e.target.value } as any)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-semibold mb-1"
                >
                  {SUBJECT_OPTIONS.map(subj => (
                    <option key={subj} value={subj}>{subj}</option>
                  ))}
                </select>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleSaveField('subject', (fieldValues as any).subject)}
                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 font-medium flex-1"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingField(null);
                      setFieldValues({ ...fieldValues, subject: escalation.subject } as any);
                    }}
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={`text-sm font-bold mt-1 ${
                  escalation.subject.includes('Right') || escalation.subject === 'Privacy' || escalation.subject === 'Other/Specific Request'
                    ? 'text-red-800'
                    : 'text-gray-900'
                }`}>
                  {escalation.subject.includes('Right') || escalation.subject === 'Privacy' ? '⚖️ ' : ''}
                  {escalation.subject}
                </div>
                {(escalation.subject.includes('Right') || escalation.subject === 'Privacy') && (
                  <div className="text-xs text-red-700 mt-0.5 font-semibold">Art. 15-22 GDPR</div>
                )}
              </>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <div className="text-xs text-gray-600">Market</div>
            <div className="text-lg font-bold text-gray-900 mt-1">{escalation.market}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <div className="text-xs text-gray-600">Customer</div>
            <div className="text-lg font-bold text-gray-900 mt-1">{escalation.classification}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <div className="text-xs text-gray-600">Created By</div>
            <div className="text-sm font-bold text-gray-900 mt-1">{escalation.createdBy.split('@')[0]}</div>
          </div>
        </div>

        {/* Status Change */}
        {escalation.status !== 'Closed' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Status</h2>
            <div className="flex gap-3">
              {STATUS_OPTIONS.map(status => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={updating || status === escalation.status}
                  className={`px-4 py-2 rounded-lg font-semibold disabled:opacity-50 ${
                    status === escalation.status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            
            {/* Conditional field for "Pending External Response" */}
            {escalation.status === 'Pending External Response' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Waiting for response from (optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={fieldValues.waitingForResponseFrom}
                    onChange={(e) => setFieldValues({ ...fieldValues, waitingForResponseFrom: e.target.value })}
                    placeholder="e.g., Bundesdatenschutzbehörde, External Counsel"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleSaveField('waitingForResponseFrom', fieldValues.waitingForResponseFrom)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Save
                  </button>
                </div>
                {escalation.waitingForResponseFrom && (
                  <p className="text-sm text-gray-600 mt-2">
                    Current: <span className="font-semibold">{escalation.waitingForResponseFrom}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
              <div className="space-y-3 text-sm">
                <div><span className="font-semibold">CID/Email:</span> {escalation.cidOrEmail}</div>
                {escalation.jiraReference && (
                  <div>
                    <span className="font-semibold">Jira:</span>{' '}
                    {escalation.jiraReference.startsWith('http') ? (
                      <a href={escalation.jiraReference} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {escalation.jiraReference}
                      </a>
                    ) : (
                      <a 
                        href={`https://hellofresh.atlassian.net/browse/${escalation.jiraReference}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-600 hover:underline"
                      >
                        {escalation.jiraReference}
                      </a>
                    )}
                  </div>
                )}
                {escalation.purecloudInteractionLink && (
                  <div>
                    <span className="font-semibold">Purecloud:</span>{' '}
                    <a href={escalation.purecloudInteractionLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Open Interaction
                    </a>
                  </div>
                )}
                <div><span className="font-semibold">Created:</span> {escalation.createdAt.toLocaleString()}</div>
                <div><span className="font-semibold">Created By:</span> {escalation.createdBy}</div>
              </div>
            </div>

            {/* Related Cases */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Related Cases</h2>
                <button
                  onClick={() => setShowAddCase(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Case
                </button>
              </div>
              
              {showAddCase && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={newCaseId}
                    onChange={(e) => setNewCaseId(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
                    placeholder="Enter Case ID (e.g., GDPR-123)"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddCase}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddCase(false);
                        setNewCaseId('');
                      }}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {escalation.relatedCases && escalation.relatedCases.length > 0 ? (
                <div className="space-y-2">
                  {escalation.relatedCases.map((caseId) => (
                    <div key={caseId} className="flex items-center justify-between p-2 border border-gray-200 rounded-lg">
                      <Link
                        href={`/cases/${caseId}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        {caseId}
                      </Link>
                      <button
                        onClick={() => handleRemoveCase(caseId)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">No related cases yet.</div>
              )}
            </div>

            {/* Links */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">External Links</h2>
                <button
                  onClick={() => setShowAddLink(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Link
                </button>
              </div>
              
              {showAddLink && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <select
                      value={newLink.type}
                      onChange={(e) => setNewLink({ ...newLink, type: e.target.value as EscalationLinkType })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      {LINK_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <input
                      type="text"
                      value={newLink.label}
                      onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Label (optional)"
                    />
                    <input
                      type="url"
                      value={newLink.url}
                      onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddLink}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddLink(false);
                        setNewLink({ type: 'Google Drive', url: '', label: '' });
                      }}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {escalation.links.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No links added yet</p>
              ) : (
                <div className="space-y-2">
                  {escalation.links.map(link => (
                    <div key={link.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <LinkIcon className="w-4 h-4 text-gray-600" />
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">{link.type}</span>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex-1">
                        {link.label || link.url}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Communication Timeline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Communication Timeline</h2>
                <button
                  onClick={() => setShowAddComm(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Entry
                </button>
              </div>
              
              {showAddComm && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-blue-200">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">From</label>
                      <select
                        value={newComm.sender}
                        onChange={(e) => setNewComm({ ...newComm, sender: e.target.value as CommunicationEntry['sender'] })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      >
                        <option value="Customer">Customer</option>
                        <option value="Customer Care">Customer Care</option>
                        <option value="Legal">Legal</option>
                        <option value="GDPR Team">GDPR Team</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Summary *</label>
                      <textarea
                        value={newComm.summary}
                        onChange={(e) => setNewComm({ ...newComm, summary: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        rows={3}
                        placeholder="Brief summary of communication..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Interaction Link (optional)</label>
                      <input
                        type="url"
                        value={newComm.interactionLink}
                        onChange={(e) => setNewComm({ ...newComm, interactionLink: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleAddCommunication}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium"
                    >
                      Add Entry
                    </button>
                    <button
                      onClick={() => {
                        setShowAddComm(false);
                        setNewComm({ sender: 'Customer', summary: '', interactionLink: '' });
                      }}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {escalation.communications.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No communication entries yet</p>
              ) : (
                <div className="space-y-3">
                  {escalation.communications
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                    .map(comm => (
                      <div key={comm.id} className="border-l-4 border-blue-400 pl-4 py-3 bg-gray-50 rounded-r">
                        {editingComm === comm.id ? (
                          // Edit Mode
                          <div className="space-y-2">
                            <select
                              value={editCommValues.sender}
                              onChange={(e) => setEditCommValues({ ...editCommValues, sender: e.target.value as CommunicationEntry['sender'] })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="Customer">Customer</option>
                              <option value="Customer Care">Customer Care</option>
                              <option value="Legal">Legal</option>
                              <option value="GDPR Team">GDPR Team</option>
                            </select>
                            <textarea
                              value={editCommValues.summary}
                              onChange={(e) => setEditCommValues({ ...editCommValues, summary: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              rows={3}
                            />
                            <input
                              type="url"
                              value={editCommValues.interactionLink}
                              onChange={(e) => setEditCommValues({ ...editCommValues, interactionLink: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Interaction link (optional)"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateCommunication(comm.id)}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingComm(null)}
                                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs px-2 py-1 rounded font-semibold ${
                                  comm.sender === 'Customer' ? 'bg-purple-100 text-purple-800' :
                                  comm.sender === 'Customer Care' ? 'bg-blue-100 text-blue-800' :
                                  comm.sender === 'Legal' ? 'bg-red-100 text-red-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {comm.sender}
                                </span>
                                <span className="text-xs text-gray-600">
                                  {comm.timestamp.toLocaleDateString()} {comm.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {comm.interactionLink && (
                                  <a
                                    href={comm.interactionLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 font-medium flex items-center gap-1"
                                  >
                                    <LinkIcon className="w-3 h-3" />
                                    View Communication
                                  </a>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingComm(comm.id);
                                    setEditCommValues({
                                      sender: comm.sender,
                                      summary: comm.summary,
                                      interactionLink: comm.interactionLink || '',
                                    });
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 hover:bg-blue-50 rounded"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap mb-2">{comm.summary}</p>
                            <p className="text-xs text-gray-500">Added by {comm.addedBy}</p>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Investigation & Draft Answer Fields (kept for backward compatibility) */}
            {['investigationResult', 'draftAnswer'].map((field) => {
              const labels = {
                investigationResult: 'Result of the Investigation',
                draftAnswer: 'Draft Answer',
              };
              return (
                <div key={field} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-gray-900">{labels[field as keyof typeof labels]}</h2>
                    {editingField !== field && (
                      <button
                        onClick={() => setEditingField(field)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <DocumentTextIcon className="w-3 h-3" />
                        Edit
                      </button>
                    )}
                  </div>
                  {editingField === field ? (
                    <div>
                      <textarea
                        value={fieldValues[field as keyof typeof fieldValues]}
                        onChange={(e) => setFieldValues({ ...fieldValues, [field]: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={8}
                        placeholder={`Enter ${labels[field as keyof typeof labels].toLowerCase()}...`}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleSaveField(field, fieldValues[field as keyof typeof fieldValues])}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingField(null);
                            setFieldValues({
                              ...fieldValues,
                              [field]: escalation[field as keyof Escalation] || '',
                            });
                          }}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-900 whitespace-pre-wrap">
                      {(escalation[field as keyof Escalation] as string) || (
                        <span className="text-gray-400 italic">Not documented yet</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column (1/3) */}
          <div className="space-y-6">
            {/* Action Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Action Items</h2>
                <button
                  onClick={() => setShowAddAction(true)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  + Add
                </button>
              </div>
              
              {showAddAction && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={newAction.title}
                    onChange={(e) => setNewAction({ ...newAction, title: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
                    placeholder="Action item title..."
                  />
                  <select
                    value={newAction.owner}
                    onChange={(e) => setNewAction({ ...newAction, owner: e.target.value as ActionItemOwner })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
                  >
                    {OWNER_OPTIONS.map(owner => <option key={owner} value={owner}>{owner}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddAction}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddAction(false);
                        setNewAction({ title: '', owner: 'Customer Care' });
                      }}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {escalation.actionItems.map(item => (
                  <div 
                    key={item.id} 
                    className={`p-3 border border-gray-200 rounded-lg ${
                      item.status === 'N/A – Not Required' ? 'opacity-60' : ''
                    }`}
                  >
                    <div className={`font-medium text-sm mb-2 ${
                      item.status === 'N/A – Not Required' ? 'line-through text-gray-500' : ''
                    }`}>
                      {item.title}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={item.owner}
                        onChange={(e) => handleUpdateActionItem(item.id, { owner: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-xs"
                      >
                        {OWNER_OPTIONS.map(owner => <option key={owner} value={owner}>{owner}</option>)}
                      </select>
                      <select
                        value={item.status}
                        onChange={(e) => handleUpdateActionItem(item.id, { status: e.target.value })}
                        className={`px-2 py-1 border border-gray-300 rounded text-xs font-semibold ${
                          item.status === 'Completed' ? 'bg-green-50 text-green-800' :
                          item.status === 'In Progress' ? 'bg-blue-50 text-blue-800' :
                          item.status === 'Blocked' ? 'bg-red-50 text-red-800' :
                          item.status === 'N/A – Not Required' ? 'bg-gray-50 text-gray-600' :
                          'bg-gray-50 text-gray-800'
                        }`}
                      >
                        {ACTION_STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                    {item.completedAt && (
                      <div className="text-xs text-gray-600 mt-1">
                        Completed: {item.completedAt.toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Trail */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Audit Trail</h2>
              {auditLog.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No audit entries yet</p>
              ) : (
                <div className="space-y-3">
                  {auditLog.slice(0, 10).map(entry => (
                    <div key={entry.id} className="border-l-2 border-gray-300 pl-4 py-2">
                      <div className="text-sm font-medium text-gray-900">{entry.action}</div>
                      {entry.fieldChanged && (
                        <div className="text-xs text-gray-600 mt-1">
                          {entry.fieldChanged}: {entry.oldValue} → {entry.newValue}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {entry.timestamp.toLocaleString()} by {entry.userEmail}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
