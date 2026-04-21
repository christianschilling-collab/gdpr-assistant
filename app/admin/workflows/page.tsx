'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllWorkflowTemplates } from '@/lib/workflows/standardWorkflows';
import { getCategories } from '@/lib/firebase/categories';
import { getRequesterTypes } from '@/lib/firebase/requesterTypes';
import { getAllWorkflowMappings, saveWorkflowMappings } from '@/lib/firebase/workflowMappings';
import { Category, RequesterType } from '@/lib/types';

/**
 * Workflow Template Management
 * Admin page to assign workflows to Case Types + Requester Types
 */
export default function WorkflowManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [requesterTypes, setRequesterTypes] = useState<RequesterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Workflow mappings: { categoryId-requesterTypeId: workflowId }
  const [mappings, setMappings] = useState<Record<string, string>>({});
  
  const workflowTemplates = getAllWorkflowTemplates();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [cats, types] = await Promise.all([
        getCategories(true),
        getRequesterTypes(true),
      ]);
      setCategories(cats);
      setRequesterTypes(types);
      
      // Try to load saved mappings from Firestore
      let loadedMappings: Record<string, string> = {};
      try {
        const savedMappings = await getAllWorkflowMappings();
        savedMappings.forEach(mapping => {
          loadedMappings[mapping.id] = mapping.workflowTemplateId;
        });
      } catch (firestoreError) {
        console.warn('⚠️ Could not load workflow mappings from Firestore (Rules not deployed?). Using defaults.', firestoreError);
      }
      
      // If no saved mappings, use defaults
      if (Object.keys(loadedMappings).length === 0) {
        const defaultMappings: Record<string, string> = {};
        cats.forEach(cat => {
          types.forEach(type => {
            const key = `${cat.id}-${type.id}`;
            // Auto-assign based on category name
            if (cat.name.includes('Auskunft') || cat.nameEn.includes('Access')) {
              defaultMappings[key] = 'data_access';
            } else if (cat.name.includes('Löschung') || cat.nameEn.includes('Deletion')) {
              defaultMappings[key] = 'data_deletion';
            } else if (cat.name.includes('Werbung') || cat.nameEn.includes('Marketing')) {
              defaultMappings[key] = 'marketing_opt_out';
            } else if (cat.name.includes('Übertragbar') || cat.nameEn.includes('Portability')) {
              defaultMappings[key] = 'data_portability';
            } else if (cat.name.includes('Berichtigung') || cat.nameEn.includes('Correction')) {
              defaultMappings[key] = 'data_correction';
            }
          });
        });
        setMappings(defaultMappings);
      } else {
        setMappings(loadedMappings);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading categories/requester types. Check Firebase connection.');
    } finally {
      setLoading(false);
    }
  }

  function handleMappingChange(categoryId: string, requesterTypeId: string, workflowId: string) {
    const key = `${categoryId}-${requesterTypeId}`;
    setMappings(prev => ({
      ...prev,
      [key]: workflowId,
    }));
    // Clear success message when making changes
    setSuccessMessage('');
  }

  async function saveMappings() {
    try {
      setSaving(true);
      setSuccessMessage('');
      
      // Build lookup maps
      const categoryMap: Record<string, string> = {};
      categories.forEach(cat => {
        categoryMap[cat.id] = cat.name;
      });
      
      const requesterTypeMap: Record<string, string> = {};
      requesterTypes.forEach(type => {
        requesterTypeMap[type.id] = type.name;
      });
      
      const workflowTemplateMap: Record<string, string> = {};
      workflowTemplates.forEach(wf => {
        workflowTemplateMap[wf.id] = wf.name;
      });
      
      // Save to Firestore
      await saveWorkflowMappings(mappings, categoryMap, requesterTypeMap, workflowTemplateMap);
      
      setSuccessMessage('✅ Workflow mappings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error saving mappings:', error);
      alert('Error saving workflow mappings. See console for details.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workflow Management</h1>
            <p className="text-gray-600 mt-2">Assign workflows to Case Types + Requester Types</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/workflows/demo"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              View Demo
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Back to Admin
            </Link>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-blue-900 mb-2">💡 How it works</h2>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• Assign a workflow template to each <strong>Case Type</strong> + <strong>Requester Type</strong> combination</li>
            <li>• When a case is created, the matching workflow will be automatically initialized</li>
            <li>• You can customize workflows by editing the standard templates or creating custom ones</li>
          </ul>
        </div>

        {/* Workflow Templates Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Available Workflow Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflowTemplates.map((template) => (
              <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{template.nameEn}</p>
                  </div>
                  <Link
                    href={`/admin/workflows/edit/${template.id}`}
                    className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"
                    title="Edit Workflow"
                  >
                    ✏️ Edit
                  </Link>
                </div>
                <div className="text-xs text-gray-500 mt-2">{template.stepCount} steps</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mappings Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Workflow Assignments</h2>
            <div className="flex items-center gap-3">
              {successMessage && (
                <span className="text-sm text-green-600 font-medium">{successMessage}</span>
              )}
              <button
                onClick={saveMappings}
                disabled={saving}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  saving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {saving ? '💾 Saving...' : '💾 Save Mappings'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Case Type</th>
                  {requesterTypes.map((type) => (
                    <th key={type.id} className="px-4 py-3 text-left font-semibold text-gray-900">
                      {type.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {category.name}
                      <div className="text-xs text-gray-500">{category.nameEn}</div>
                    </td>
                    {requesterTypes.map((type) => {
                      const key = `${category.id}-${type.id}`;
                      const selectedWorkflow = mappings[key] || '';
                      
                      return (
                        <td key={type.id} className="px-4 py-3">
                          <select
                            value={selectedWorkflow}
                            onChange={(e) => handleMappingChange(category.id, type.id, e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          >
                            <option value="">-- None --</option>
                            {workflowTemplates.map((wf) => (
                              <option key={wf.id} value={wf.id}>
                                {wf.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">📝 Next Steps</h2>
          <ol className="text-sm text-gray-700 space-y-2 list-decimal ml-5">
            <li>Assign workflows to each Case Type + Requester Type combination</li>
            <li>Click "Save Mappings" to persist your configuration</li>
            <li>Create a new case - the matching workflow will auto-initialize</li>
            <li>Customize workflow templates in the code or create custom ones in Firestore</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
