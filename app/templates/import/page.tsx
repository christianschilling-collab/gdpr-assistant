'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createTemplate } from '@/lib/firebase/templates';
import { getCategories } from '@/lib/firebase/categories';
import { getRequesterTypes } from '@/lib/firebase/requesterTypes';
import { useToast } from '@/lib/contexts/ToastContext';

interface TemplateImportData {
  name: string;
  categoryId: string;
  requesterTypeId: string;
  content: string;
  processSteps?: Array<{ title: string; description: string }>;
  confluenceLinks?: string[];
  jiraTemplate?: string;
}

export default function TemplateImportPage() {
  const router = useRouter();
  const { addToast } = useToast();
  
  const [importing, setImporting] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [preview, setPreview] = useState<TemplateImportData | null>(null);
  const [error, setError] = useState('');

  async function handleParseJson() {
    setError('');
    setPreview(null);
    
    try {
      const data = JSON.parse(jsonInput);
      
      // Validate required fields
      if (!data.name || !data.categoryId || !data.requesterTypeId || !data.content) {
        throw new Error('Missing required fields: name, categoryId, requesterTypeId, content');
      }
      
      setPreview(data);
    } catch (err: any) {
      setError(err.message || 'Invalid JSON format');
    }
  }

  async function handleImport() {
    if (!preview) return;
    
    setImporting(true);
    try {
      await createTemplate({
        name: preview.name,
        categoryId: preview.categoryId,
        requesterTypeId: preview.requesterTypeId,
        content: preview.content,
        processSteps: preview.processSteps || [],
        confluenceLinks: preview.confluenceLinks || [],
        jiraTemplate: preview.jiraTemplate || '',
        isActive: true,
      });
      
      addToast('Template imported successfully!', 'success');
      router.push('/templates');
    } catch (err: any) {
      console.error('Import error:', err);
      addToast(err.message || 'Failed to import template', 'error');
      setError(err.message || 'Failed to import template');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/templates"
            className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block"
          >
            ← Back to Templates
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Import Template (JSON)</h1>
          <p className="text-gray-600">
            Import templates from JSON format - perfect for AI-generated templates from your documentation
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-blue-900 mb-3">📝 How to use AI to create templates</h2>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Copy your existing documentation (Confluence, Google Docs, etc.)</li>
            <li>Ask AI (ChatGPT, Claude, etc.): "Create a GDPR template in JSON format with these fields..."</li>
            <li>Paste the JSON here and click "Parse JSON"</li>
            <li>Review the preview</li>
            <li>Click "Import Template"</li>
          </ol>
        </div>

        {/* JSON Format Example */}
        <details className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <summary className="font-semibold text-gray-900 cursor-pointer">
            📋 JSON Format Example (click to expand)
          </summary>
          <pre className="mt-4 text-xs bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
{`{
  "name": "Data Deletion Request - Customer",
  "categoryId": "data-deletion",
  "requesterTypeId": "customer",
  "content": "Dear {{customerName}},\\n\\nThank you for your request...",
  "processSteps": [
    {
      "title": "Verify Customer Identity",
      "description": "Check customer number in MineOS and verify email address"
    },
    {
      "title": "Check Active Subscriptions",
      "description": "Ensure all subscriptions are cancelled before proceeding"
    }
  ],
  "confluenceLinks": [
    "https://hellofresh.atlassian.net/wiki/spaces/GDPR/pages/123456",
    "https://hellofresh.atlassian.net/wiki/spaces/GDPR/pages/789012"
  ],
  "jiraTemplate": "Customer requested data deletion. Identity verified via email."
}`}
          </pre>
        </details>

        <div className="grid grid-cols-2 gap-6">
          {/* Input Section */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">1. Paste JSON</h2>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste your JSON template here..."
                className="w-full h-96 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500"
              />
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              
              <button
                onClick={handleParseJson}
                disabled={!jsonInput.trim()}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                2. Parse JSON
              </button>
            </div>
          </div>

          {/* Preview Section */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">3. Preview & Import</h2>
              
              {!preview && (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <p>Parse JSON to see preview</p>
                </div>
              )}
              
              {preview && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                      {preview.name}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category ID</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                        {preview.categoryId}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Requester Type ID</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                        {preview.requesterTypeId}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content Preview</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm max-h-32 overflow-y-auto">
                      {preview.content.substring(0, 200)}
                      {preview.content.length > 200 && '...'}
                    </div>
                  </div>
                  
                  {preview.processSteps && preview.processSteps.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Process Steps</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                        {preview.processSteps.length} step(s)
                      </div>
                    </div>
                  )}
                  
                  {preview.confluenceLinks && preview.confluenceLinks.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confluence Links</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                        {preview.confluenceLinks.length} link(s)
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {importing ? 'Importing...' : '✅ Import Template'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
