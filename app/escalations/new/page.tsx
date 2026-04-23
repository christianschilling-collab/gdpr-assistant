'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEscalation } from '@/lib/firebase/escalations';
import {
  EscalationSubject,
  EscalationMarket,
  EscalationClassification,
} from '@/lib/types/escalations';
import { useToast } from '@/lib/contexts/ToastContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  resolveAssigneeInputToStoredEmail,
  BOARD_UNASSIGNED,
} from '@/lib/board/assigneeEmailDirectory';

const SUBJECTS: EscalationSubject[] = [
  'Privacy',
  'Right of Access (DSAR)',
  'Right to Rectification',
  'Right to Erasure',
  'Right to Restriction of Processing',
  'Right to Data Portability',
  'Right to Object to Processing',
  'Other/Specific Request',
  'DPA Inquiry',
  'Customer Complaint',
  'Logistic',
  'Payment',
  'Product Quality',
  'Customer Service',
];

const MARKETS: EscalationMarket[] = [
  'Germany',
  'Austria',
  'Switzerland',
  'France',
  'Belgium',
  'Netherlands',
  'Luxembourg',
  'Sweden',
  'Norway',
  'Denmark',
];

export default function NewEscalationPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();
  
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    summary: '',
    subject: 'Privacy' as EscalationSubject,
    market: 'Germany' as EscalationMarket,
    classification: 'Customer' as EscalationClassification,
    cidOrEmail: '',
    assignedTo: '',
    jiraReference: '',
    deadlineFirstReply: '',
    purecloudInteractionLink: '',
  });

  // Auto-suggest deadline based on subject
  function suggestDeadline(subject: EscalationSubject): string {
    const today = new Date();
    
    if (subject === 'Privacy' || 
        subject.includes('Right of') || 
        subject.includes('(DSAR)')) {
      // Art. 15-22 requests: 30 days
      const deadline = new Date(today);
      deadline.setDate(deadline.getDate() + 30);
      return deadline.toISOString().split('T')[0];
    } else if (subject === 'DPA Inquiry') {
      // Leave empty, user must set based on DPA's specified deadline
      return '';
    } else if (subject === 'Customer Complaint') {
      // Customer Complaints: 7 days acknowledgment
      const deadline = new Date(today);
      deadline.setDate(deadline.getDate() + 7);
      return deadline.toISOString().split('T')[0];
    }
    
    // Default: no suggestion
    return '';
  }

  // Handle subject change with auto-suggestion
  function handleSubjectChange(subject: EscalationSubject) {
    const suggestedDeadline = suggestDeadline(subject);
    setFormData({ 
      ...formData, 
      subject,
      deadlineFirstReply: suggestedDeadline 
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});
    const newErrors: Record<string, string> = {};
    
    if (!user?.email) {
      addToast('You must be logged in to create an escalation', 'error');
      return;
    }
    
    if (!formData.summary.trim()) {
      newErrors.summary = 'Summary is required';
    }
    
    if (!formData.cidOrEmail.trim()) {
      newErrors.cidOrEmail = 'CID or Email is required';
    }
    
    if (!formData.deadlineFirstReply) {
      newErrors.deadlineFirstReply = 'Deadline for first reply is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setSubmitting(true);
    
    try {
      const assigneeRaw = formData.assignedTo.trim();
      const resolvedAssignee = assigneeRaw
        ? await resolveAssigneeInputToStoredEmail(assigneeRaw)
        : BOARD_UNASSIGNED;
      if (
        assigneeRaw &&
        !assigneeRaw.includes('@') &&
        resolvedAssignee === BOARD_UNASSIGNED
      ) {
        addToast(
          'Assignee: bitte Arbeits-E-Mail eintragen oder in Admin → Users ein Profil mit Anzeigenamen anlegen.',
          'warning'
        );
      }
      const { assignedTo: _assignDraft, ...restForm } = formData;
      const escalationId = await createEscalation({
        ...restForm,
        deadlineFirstReply: new Date(formData.deadlineFirstReply),
        relatedCases: [],
        status: 'Not Started',
        createdBy: user.email,
        ...(resolvedAssignee !== BOARD_UNASSIGNED ? { assignedTo: resolvedAssignee } : {}),
      });
      
      addToast('Escalation created successfully', 'success');
      
      // Wait a bit for Firestore propagation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      router.push(`/escalations/${escalationId}`);
    } catch (error) {
      console.error('Error creating escalation:', error);
      addToast('Failed to create escalation', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => router.push('/escalations')}
          className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
        >
          ← Back to list
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">New Escalation</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Summary of the Complaint *
              </label>
              <textarea
                value={formData.summary}
                onChange={(e) => {
                  setFormData({ ...formData, summary: e.target.value });
                  if (errors.summary) setErrors({ ...errors, summary: '' });
                }}
                className={`w-full px-3 py-2 border rounded-lg ${errors.summary ? 'border-red-300' : 'border-gray-300'}`}
                rows={4}
                placeholder="Brief description of the escalation..."
              />
              {errors.summary && (
                <p className="text-red-600 text-sm mt-1">{errors.summary}</p>
              )}
            </div>

            {/* Subject & Market */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => handleSubjectChange(e.target.value as EscalationSubject)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  {SUBJECTS.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Market *
                </label>
                <select
                  value={formData.market}
                  onChange={(e) => setFormData({ ...formData, market: e.target.value as EscalationMarket })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  {MARKETS.map(market => (
                    <option key={market} value={market}>{market}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Classification */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Classification *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={formData.classification === 'Customer'}
                    onChange={() => setFormData({ ...formData, classification: 'Customer' })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Customer</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={formData.classification === 'Non-Customer'}
                    onChange={() => setFormData({ ...formData, classification: 'Non-Customer' })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Non-Customer</span>
                </label>
              </div>
            </div>

            {/* Assignee (optional — trackboard owner) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned agent <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Name or work email — shown on GDPR trackboard"
              />
              {user?.email && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, assignedTo: user.email || '' })}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Use my account ({user.email})
                </button>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to create as unassigned; you can set this later on the escalation page.
              </p>
            </div>

            {/* CID or Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CID or Email *
              </label>
              <input
                type="text"
                value={formData.cidOrEmail}
                onChange={(e) => {
                  setFormData({ ...formData, cidOrEmail: e.target.value });
                  if (errors.cidOrEmail) setErrors({ ...errors, cidOrEmail: '' });
                }}
                className={`w-full px-3 py-2 border rounded-lg ${errors.cidOrEmail ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="Customer ID or Email address"
              />
              {errors.cidOrEmail && (
                <p className="text-red-600 text-sm mt-1">{errors.cidOrEmail}</p>
              )}
            </div>

            {/* Jira Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jira Reference
              </label>
              <input
                type="text"
                value={formData.jiraReference}
                onChange={(e) => setFormData({ ...formData, jiraReference: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., GDPR-1234"
              />
            </div>

            {/* Deadline - First Reply */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deadline – First Reply *
              </label>
              <input
                type="date"
                value={formData.deadlineFirstReply}
                onChange={(e) => {
                  setFormData({ ...formData, deadlineFirstReply: e.target.value });
                  if (errors.deadlineFirstReply) setErrors({ ...errors, deadlineFirstReply: '' });
                }}
                className={`w-full px-3 py-2 border rounded-lg ${errors.deadlineFirstReply ? 'border-red-300' : 'border-gray-300'}`}
              />
              {errors.deadlineFirstReply && (
                <p className="text-red-600 text-sm mt-1">{errors.deadlineFirstReply}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                GDPR Art. 15-22 requests: 30 days | DPA Inquiries: check authority's specified deadline | Customer Complaints: 7 days acknowledgment
              </p>
            </div>

            {/* Purecloud Interaction Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purecloud Interaction Link
              </label>
              <input
                type="url"
                value={formData.purecloudInteractionLink}
                onChange={(e) => setFormData({ ...formData, purecloudInteractionLink: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="https://..."
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.push('/escalations')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Escalation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
