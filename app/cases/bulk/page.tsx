'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCases, updateCase } from '@/lib/firebase/cases';
import { GDPRCase } from '@/lib/types';

export default function BulkOperationsPage() {
  const router = useRouter();
  const [cases, setCases] = useState<GDPRCase[]>([]);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [bulkAction, setBulkAction] = useState<{
    type: 'status' | 'assign' | 'urgency' | null;
    value: string;
  }>({ type: null, value: '' });

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    setLoading(true);
    try {
      const data = await getCases();
      setCases(data);
    } catch (error: any) {
      console.error('Error loading cases:', error);
      setError(error.message || 'Failed to load cases.');
    } finally {
      setLoading(false);
    }
  }

  function toggleCase(caseId: string) {
    const newSelected = new Set(selectedCases);
    if (newSelected.has(caseId)) {
      newSelected.delete(caseId);
    } else {
      newSelected.add(caseId);
    }
    setSelectedCases(newSelected);
  }

  function selectAll() {
    if (selectedCases.size === cases.length) {
      setSelectedCases(new Set());
    } else {
      setSelectedCases(new Set(cases.map((c) => c.id)));
    }
  }

  async function handleBulkAction() {
    if (selectedCases.size === 0) {
      setError('Please select at least one case');
      return;
    }

    if (!bulkAction.type || !bulkAction.value) {
      setError('Please select an action and value');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const updates: Record<string, any> = {};
      if (bulkAction.type === 'status') {
        updates.status = bulkAction.value;
      } else if (bulkAction.type === 'assign') {
        updates.assignedTo = bulkAction.value;
      } else if (bulkAction.type === 'urgency') {
        updates.urgency = bulkAction.value;
      }

      const promises = Array.from(selectedCases).map((caseId) =>
        updateCase(caseId, updates)
      );

      await Promise.all(promises);
      await loadCases();
      setSelectedCases(new Set());
      setBulkAction({ type: null, value: '' });
      // Success is shown via page state/UI
      console.log(`Successfully updated ${promises.length} case(s)`);
    } catch (error: any) {
      console.error('Error performing bulk action:', error);
      setError(error.message || 'Failed to perform bulk action.');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-500">Loading cases...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bulk Operations</h1>
            <p className="text-gray-600 mt-1">
              Select multiple cases and perform bulk actions
            </p>
          </div>
          <Link
            href="/cases"
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Back to Cases
          </Link>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold">Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Bulk Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Bulk Actions</h2>
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
              <select
                value={bulkAction.type || ''}
                onChange={(e) =>
                  setBulkAction({ type: e.target.value as any, value: '' })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select action...</option>
                <option value="status">Change Status</option>
                <option value="assign">Assign To</option>
                <option value="urgency">Change Urgency</option>
              </select>
            </div>

            {bulkAction.type === 'status' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={bulkAction.value}
                  onChange={(e) => setBulkAction({ ...bulkAction, value: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select status...</option>
                  <option value="New">New</option>
                  <option value="AI Processed">AI Processed</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            )}

            {bulkAction.type === 'assign' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign To (Email)
                </label>
                <input
                  type="email"
                  value={bulkAction.value}
                  onChange={(e) => setBulkAction({ ...bulkAction, value: e.target.value })}
                  placeholder="agent@example.com"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {bulkAction.type === 'urgency' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
                <select
                  value={bulkAction.value}
                  onChange={(e) => setBulkAction({ ...bulkAction, value: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select urgency...</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            )}

            <button
              onClick={handleBulkAction}
              disabled={processing || selectedCases.size === 0 || !bulkAction.type || !bulkAction.value}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {processing ? 'Processing...' : `Apply to ${selectedCases.size} case(s)`}
            </button>
          </div>
        </div>

        {/* Cases List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={selectedCases.size === cases.length && cases.length > 0}
                onChange={selectAll}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                {selectedCases.size} of {cases.length} selected
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {cases.map((case_) => (
              <div
                key={case_.id}
                className={`p-4 hover:bg-gray-50 ${selectedCases.has(case_.id) ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedCases.has(case_.id)}
                    onChange={() => toggleCase(case_.id)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/cases/${case_.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        {case_.caseId}
                      </Link>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          case_.status === 'Resolved'
                            ? 'bg-green-100 text-green-800'
                            : case_.status === 'Under Review'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {case_.status}
                      </span>
                      <span className="text-sm text-gray-500">{case_.market}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                      {case_.caseDescription}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
