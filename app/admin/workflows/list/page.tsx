'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllWorkflowTemplates } from '@/lib/workflows/standardWorkflows';

/**
 * Workflow Templates Overview
 * Lists all available workflow templates with edit options
 */
export default function WorkflowsListPage() {
  const [workflows, setWorkflows] = useState(getAllWorkflowTemplates());
  const [filter, setFilter] = useState('all');

  const filteredWorkflows = workflows.filter(wf => {
    if (filter === 'all') return true;
    return wf.id.includes(filter);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workflow Templates</h1>
            <p className="text-gray-600 mt-2">Create and manage multi-step workflow templates</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/workflows/edit/new"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              ➕ Create New Workflow
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Back to Admin
            </Link>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by type:</label>
            <div className="flex gap-2">
              {['all', 'data', 'marketing', 'deletion'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-blue-900 mb-2">💡 About Workflow Templates</h2>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• <strong>Standard Workflows</strong> are pre-built and read-only (defined in code)</li>
            <li>• <strong>Custom Workflows</strong> can be created and edited here</li>
            <li>• Each workflow defines steps with email templates, dependencies, and conditions</li>
            <li>• Assign workflows to Case Types in <Link href="/admin/workflows" className="underline">Workflow Management</Link></li>
          </ul>
        </div>

        {/* Workflows Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkflows.map((workflow) => (
            <div
              key={workflow.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{workflow.name}</h3>
                  <p className="text-sm text-gray-500">{workflow.nameEn}</p>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                  Standard
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-900">{workflow.stepCount}</div>
                  <div className="text-xs text-gray-600">Steps</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-900">
                    {workflow.estimatedDays || '—'}
                  </div>
                  <div className="text-xs text-gray-600">Est. Days</div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {workflow.description || 'Multi-step workflow for GDPR requests'}
              </p>

              {/* Actions */}
              <div className="flex gap-2">
                <Link
                  href={`/admin/workflows/edit/${workflow.id}`}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center text-sm font-medium"
                >
                  ✏️ Edit
                </Link>
                <Link
                  href={`/workflows/demo?workflow=${workflow.id}`}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center text-sm font-medium"
                >
                  👁️ Preview
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredWorkflows.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
            <p className="text-gray-600 mb-4">Try changing the filter or create a new workflow.</p>
            <Link
              href="/admin/workflows/edit/new"
              className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Create New Workflow
            </Link>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Total Workflows</div>
            <div className="text-2xl font-bold text-gray-900">{workflows.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Standard Templates</div>
            <div className="text-2xl font-bold text-blue-600">{workflows.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Custom Workflows</div>
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-xs text-gray-500 mt-1">Coming soon</div>
          </div>
        </div>
      </div>
    </div>
  );
}
