'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getCase, updateCase } from '@/lib/firebase/cases';
import { getCategories } from '@/lib/firebase/categories';
import { getRequesterTypes } from '@/lib/firebase/requesterTypes';
import { GDPRCase, Category, RequesterType } from '@/lib/types';

export default function EditCasePage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [caseData, setCaseData] = useState<GDPRCase | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [requesterTypes, setRequesterTypes] = useState<RequesterType[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    caseDescription: '',
    customerName: '',
    customerEmail: '',
    customerNumber: '',
    customerAddress: '',
    teamMember: '',
    market: '',
    urgency: 'Medium' as 'Low' | 'Medium' | 'High',
    sourceLink: '',
    specificQuestion: '',
  });

  const [selectedRequesterType, setSelectedRequesterType] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [caseId]);

  async function loadData() {
    try {
      setLoading(true);
      const [caseResult, categoriesResult, requesterTypesResult] = await Promise.all([
        getCase(caseId),
        getCategories(),
        getRequesterTypes(),
      ]);

      if (!caseResult) {
        setError('Case not found');
        return;
      }

      setCaseData(caseResult);
      setCategories(categoriesResult);
      setRequesterTypes(requesterTypesResult);

      // Populate form with existing data
      setFormData({
        caseDescription: caseResult.caseDescription || '',
        customerName: (caseResult as any).customerName || '',
        customerEmail: (caseResult as any).customerEmail || '',
        customerNumber: (caseResult as any).customerNumber || '',
        customerAddress: (caseResult as any).customerAddress || '',
        teamMember: caseResult.teamMember || '',
        market: caseResult.market || '',
        urgency: caseResult.urgency || 'Medium',
        sourceLink: (caseResult as any).sourceLink || '',
        specificQuestion: (caseResult as any).specificQuestion || '',
      });

      setSelectedRequesterType(caseResult.customerType || '');
      setSelectedCategories(caseResult.primaryCategory ? [caseResult.primaryCategory] : []);
    } catch (err: any) {
      console.error('Error loading case:', err);
      setError(err.message || 'Failed to load case');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedRequesterType) {
      setError('Please select a Requester Type');
      return;
    }

    if (selectedCategories.length === 0) {
      setError('Please select at least one Category');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updateData: any = {
        caseDescription: formData.caseDescription,
        customerType: selectedRequesterType,
        primaryCategory: selectedCategories[0],
        teamMember: formData.teamMember,
        market: formData.market,
        urgency: formData.urgency,
      };

      // Add optional fields if they have values
      if (formData.customerName?.trim()) {
        updateData.customerName = formData.customerName;
      }
      if (formData.customerEmail?.trim()) {
        updateData.customerEmail = formData.customerEmail;
      }
      if (formData.customerNumber?.trim()) {
        updateData.customerNumber = formData.customerNumber;
      }
      if (formData.customerAddress?.trim()) {
        updateData.customerAddress = formData.customerAddress;
      }
      if (formData.sourceLink?.trim()) {
        updateData.sourceLink = formData.sourceLink;
      }
      if (formData.specificQuestion?.trim()) {
        updateData.specificQuestion = formData.specificQuestion;
      }

      await updateCase(caseId, updateData);

      setSuccessMessage('✅ Case updated successfully!');
      
      // Redirect after short delay
      setTimeout(() => {
        router.push(`/cases/${caseId}`);
      }, 1500);
    } catch (err: any) {
      console.error('Error updating case:', err);
      setError(err.message || 'Failed to update case');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-gray-600 mt-4">Loading case...</p>
        </div>
      </div>
    );
  }

  if (error && !caseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
          <Link href="/cases" className="mt-4 inline-block px-4 py-2 bg-gray-200 rounded-lg">
            ← Back to Cases
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Case</h1>
            <p className="text-gray-600 mt-1">{caseData?.caseId}</p>
          </div>
          <Link
            href={`/cases/${caseId}`}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Back to Case
          </Link>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-400 rounded-lg p-4">
            <p className="text-green-800 font-semibold">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
            <p className="text-red-800 font-semibold">{error}</p>
          </div>
        )}

        {/* Edit Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            {/* Requester Type */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-4">
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Who is making the request? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {requesterTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedRequesterType(type.id)}
                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                      selectedRequesterType === type.id
                        ? 'border-indigo-600 bg-white shadow-md'
                        : 'border-gray-200 bg-white hover:border-indigo-300'
                    }`}
                  >
                    <h4 className="font-semibold text-gray-900 text-sm">{type.name}</h4>
                    <p className="text-xs text-gray-600 mt-1">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What type(s) of request is this? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-3">
                {categories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCategories(selectedCategories.filter(id => id !== cat.id));
                        } else {
                          setSelectedCategories([...selectedCategories, cat.id]);
                        }
                      }}
                      className={`p-3 border-2 rounded-lg text-left transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <span className="text-lg">✅</span>
                        ) : (
                          <span className="text-lg">⬜</span>
                        )}
                      </div>
                      {cat.icon && <span className="text-2xl">{cat.icon}</span>}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{cat.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">{cat.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Case Description */}
            <div>
              <label htmlFor="caseDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Case Description / Customer Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="caseDescription"
                required
                rows={8}
                value={formData.caseDescription}
                onChange={(e) => setFormData({ ...formData, caseDescription: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Customer Details */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Customer Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="customerName" className="block text-xs text-gray-600 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="customerEmail" className="block text-xs text-gray-600 mb-1">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    id="customerEmail"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="customerNumber" className="block text-xs text-gray-600 mb-1">
                    Customer Number
                  </label>
                  <input
                    type="text"
                    id="customerNumber"
                    value={formData.customerNumber}
                    onChange={(e) => setFormData({ ...formData, customerNumber: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="customerAddress" className="block text-xs text-gray-600 mb-1">
                    Customer Address
                  </label>
                  <input
                    type="text"
                    id="customerAddress"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Case Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="teamMember" className="block text-sm font-medium text-gray-700 mb-1">
                  Team Member <span className="text-red-500">*</span>
                </label>
                <select
                  id="teamMember"
                  required
                  value={formData.teamMember}
                  onChange={(e) => setFormData({ ...formData, teamMember: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select team member</option>
                  <option value="Chris">Chris</option>
                  <option value="Sema">Sema</option>
                  <option value="Melina">Melina</option>
                </select>
              </div>

              <div>
                <label htmlFor="market" className="block text-sm font-medium text-gray-700 mb-1">
                  Market <span className="text-red-500">*</span>
                </label>
                <select
                  id="market"
                  required
                  value={formData.market}
                  onChange={(e) => setFormData({ ...formData, market: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select market</option>
                  <option value="DE">DE</option>
                  <option value="AT">AT</option>
                  <option value="CH">CH</option>
                </select>
              </div>

              <div>
                <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-1">
                  Urgency
                </label>
                <select
                  id="urgency"
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label htmlFor="sourceLink" className="block text-sm font-medium text-gray-700 mb-1">
                  Source Link
                </label>
                <input
                  type="text"
                  id="sourceLink"
                  value={formData.sourceLink}
                  onChange={(e) => setFormData({ ...formData, sourceLink: e.target.value })}
                  placeholder="Jira, Gmail, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Specific Question */}
            <div>
              <label htmlFor="specificQuestion" className="block text-sm font-medium text-gray-700 mb-1">
                Specific Question (Optional)
              </label>
              <textarea
                id="specificQuestion"
                rows={3}
                value={formData.specificQuestion}
                onChange={(e) => setFormData({ ...formData, specificQuestion: e.target.value })}
                placeholder="Any specific questions or notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
            <Link
              href={`/cases/${caseId}`}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  💾 Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
