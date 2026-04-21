'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getRequesterTypes, deleteRequesterType } from '@/lib/firebase/requesterTypes';
import { RequesterType } from '@/lib/types';

export default function RequesterTypesAdminPage() {
  const [requesterTypes, setRequesterTypes] = useState<RequesterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadRequesterTypes();
  }, [showInactive]);

  const loadRequesterTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRequesterTypes(!showInactive); // activeOnly = !showInactive
      setRequesterTypes(data);
    } catch (err: any) {
      console.error('Error loading requester types:', err);
      setError(err.message || 'Failed to load requester types');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate "${name}"?`)) {
      return;
    }

    try {
      await deleteRequesterType(id, true); // soft delete
      loadRequesterTypes();
    } catch (err: any) {
      console.error('Error deleting requester type:', err);
      setError(err.message || 'Failed to delete requester type');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link href="/" className="hover:text-indigo-600">Home</Link>
            <span>/</span>
            <Link href="/admin/training" className="hover:text-indigo-600">Admin</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Requester Types</span>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">👥 Requester Types</h1>
                <p className="text-gray-600 mt-2">
                  Manage who can submit GDPR requests
                </p>
              </div>
              <Link
                href="/admin/requester-types/new"
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                + New Requester Type
              </Link>
            </div>
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="mb-6 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Show inactive requester types</span>
          </label>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">⚠️ {error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-gray-600 mt-4">Loading requester types...</p>
          </div>
        ) : requesterTypes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-600">No requester types found.</p>
            <Link
              href="/admin/requester-types/new"
              className="inline-block mt-4 text-indigo-600 hover:text-indigo-800"
            >
              Create your first requester type →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Name (DE)
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Name (EN)
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-40">
                      Actions
                    </th>
                  </tr>
                </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requesterTypes.map((type) => (
                  <tr 
                    key={type.id} 
                    onClick={() => window.location.href = `/admin/requester-types/${type.id}/edit`}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {type.sortOrder ?? 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {type.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {type.nameEn}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                      {type.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {type.isActive ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/admin/requester-types/${type.id}/edit`}
                          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                        >
                          Edit
                        </Link>
                        {type.isActive && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(type.id, type.name);
                            }}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8">
          <Link
            href="/admin/training"
            className="text-indigo-600 hover:text-indigo-800 text-sm"
          >
            ← Back to Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
