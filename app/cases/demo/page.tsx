'use client';

import Link from 'next/link';
import { GDPRCase } from '@/lib/types';

/**
 * Demo Page to preview the Case Detail UI
 * This shows what the detail page will look like with sample data
 */
export default function CaseDemoPage() {
  // Mock case data for preview
  const mockCase: GDPRCase = {
    id: 'demo-case-123',
    caseId: 'HELP-2024-001',
    timestamp: new Date(),
    teamMember: 'John Doe',
    sourceLink: 'https://example.com/case/123',
    market: 'DE',
    caseDescription: 'Customer requests access to all personal data stored in our systems. They want to know what information we have about them, including order history, account details, and marketing preferences.',
    specificQuestion: 'Can you provide a complete data export in JSON format?',
    urgency: 'High',
    primaryCategory: 'Data Access Request',
    subCategory: 'Right to Access (DSAR)',
    customerType: 'Customer',
    confidence: 0.92,
    suggestedReply: 'Sehr geehrte/r ((Anrede)) ((Nachname)),\n\nvielen Dank für Ihre Anfrage bezüglich Ihrer personenbezogenen Daten.\n\nWir haben Ihre Anfrage erhalten und werden diese gemäß der DSGVO bearbeiten. Bitte haben Sie etwas Geduld, während wir Ihre Daten zusammenstellen.\n\nMit freundlichen Grüßen,\nGDPR Team',
    templateMatches: [
      {
        template: {
          id: 't1',
          primaryCategory: 'Data Access Request',
          subCategory: 'Right to Access',
          customerType: 'Customer',
          templateName: 'DSAR - Data Export Request',
          templateText: 'Template text here...',
          whenToUse: 'When customer requests data export',
          keywords: ['data export', 'access', 'DSAR'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        confidence: 0.95,
        reason: 'High match: Customer type and category match perfectly',
      },
    ],
    keyDetails: {
      firstName: 'Max',
      lastName: 'Mustermann',
      email: 'max.mustermann@example.com',
    },
    reviewFlag: false,
    status: 'AI Processed',
    assignedTo: 'Jane Smith',
    notes: 'Customer requested JSON format. Need to check if we can provide this format.',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    updatedAt: new Date(),
  };

  function getStatusColor(status: string) {
    switch (status) {
      case 'New':
        return 'bg-blue-100 text-blue-800';
      case 'AI Processed':
        return 'bg-purple-100 text-purple-800';
      case 'Under Review':
        return 'bg-yellow-100 text-yellow-800';
      case 'Resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getUrgencyColor(urgency: string) {
    switch (urgency) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Case: {mockCase.caseId}</h1>
            <p className="text-gray-600 mt-1">
              Created: {new Date(mockCase.createdAt).toLocaleString()}
            </p>
            <p className="text-sm text-yellow-600 mt-2">
              ⚠️ This is a DEMO page to preview the UI. Real cases will look like this.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/cases"
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Back to Cases
            </Link>
            <button
              disabled
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 opacity-50 cursor-not-allowed"
            >
              Edit (Demo)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case Description */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Case Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{mockCase.caseDescription}</p>
              {mockCase.specificQuestion && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Specific Question</h3>
                  <p className="text-gray-700">{mockCase.specificQuestion}</p>
                </div>
              )}
            </div>

            {/* AI Results */}
            {mockCase.primaryCategory && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Classification</h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Primary Category:</span>
                    <span className="ml-2 text-gray-900">{mockCase.primaryCategory}</span>
                  </div>
                  {mockCase.subCategory && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Sub Category:</span>
                      <span className="ml-2 text-gray-900">{mockCase.subCategory}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-gray-500">Customer Type:</span>
                    <span className="ml-2 text-gray-900">{mockCase.customerType || 'Unknown'}</span>
                  </div>
                  {mockCase.confidence !== undefined && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Confidence:</span>
                      <span className="ml-2 text-gray-900">
                        {(mockCase.confidence * 100).toFixed(1)}%
                      </span>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${mockCase.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Suggested Reply */}
            {mockCase.suggestedReply && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Suggested Reply</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                    {mockCase.suggestedReply}
                  </pre>
                </div>
              </div>
            )}

            {/* Template Matches */}
            {mockCase.templateMatches && mockCase.templateMatches.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Matched Templates</h2>
                <div className="space-y-3">
                  {mockCase.templateMatches.map((match, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">
                          {match.template.templateName}
                        </span>
                        <span className="text-sm text-gray-500">
                          {(match.confidence * 100).toFixed(0)}% match
                        </span>
                      </div>
                      {match.reason && (
                        <p className="text-sm text-gray-600 mt-1">{match.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Notes</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {mockCase.notes || 'No notes yet.'}
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Status & Actions</h2>
              <div className="space-y-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <span
                    className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusColor(
                      mockCase.status
                    )}`}
                  >
                    {mockCase.status}
                  </span>
                </div>

                {/* Urgency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
                  <span
                    className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getUrgencyColor(
                      mockCase.urgency
                    )}`}
                  >
                    {mockCase.urgency}
                  </span>
                </div>

                {/* Assigned To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned To
                  </label>
                  <p className="text-gray-700">{mockCase.assignedTo || 'Unassigned'}</p>
                </div>

                {/* Review Flag */}
                {mockCase.reviewFlag && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-yellow-800">⚠️ Review Required</p>
                    <p className="text-xs text-yellow-600 mt-1">
                      This case has been flagged for manual review.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Case Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Case Information</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Case ID:</span>
                  <span className="ml-2 text-gray-900">{mockCase.caseId}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Team Member:</span>
                  <span className="ml-2 text-gray-900">{mockCase.teamMember}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Market:</span>
                  <span className="ml-2 text-gray-900">{mockCase.market}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Source:</span>
                  <a
                    href={mockCase.sourceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    View Link →
                  </a>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Created:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(mockCase.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Updated:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(mockCase.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
