'use client';

import { useEffect, useState } from 'react';
import { getTemplates } from '@/lib/firebase/templates';
import { getCategories } from '@/lib/firebase/categories';
import { getRequesterTypes } from '@/lib/firebase/requesterTypes';
import { Template, Category, RequesterType } from '@/lib/types';
import Link from 'next/link';
import { HelpModal, HelpButton } from '@/components/HelpModal';
import { HELP_CONTENT } from '@/lib/constants/helpContent';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [requesterTypes, setRequesterTypes] = useState<RequesterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [error, setError] = useState<string>('');
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      // Re-filter when filter changes
      filterTemplates();
    }
  }, [filter]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [templatesData, categoriesData, typesData] = await Promise.all([
        getTemplates(),
        getCategories(true),
        getRequesterTypes(true),
      ]);
      setTemplates(templatesData);
      setCategories(categoriesData);
      setRequesterTypes(typesData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load templates. Check Firebase configuration.');
    } finally {
      setLoading(false);
    }
  }

  function filterTemplates() {
    // This function exists for the useEffect dependency
    // The actual filtering happens in the render
  }

  function getCategoryName(categoryId: string): string {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  }

  function getRequesterTypeName(typeId: string): string {
    const type = requesterTypes.find(t => t.id === typeId);
    return type ? type.name : typeId;
  }

  function exportTemplate(template: Template) {
    const exportData = {
      name: template.name,
      categoryId: template.primaryCategory,
      requesterTypeId: template.customerType,
      content: template.content,
      processSteps: template.processSteps || [],
      confluenceLinks: template.confluenceLinks || [],
      jiraTemplate: template.jiraTemplate || '',
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template-${template.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportAllTemplates() {
    const filteredTemplates = templates.filter(t => {
      if (filter === 'all') return true;
      return t.primaryCategory === filter;
    });
    
    const exportData = filteredTemplates.map(t => ({
      name: t.name,
      categoryId: t.primaryCategory,
      requesterTypeId: t.customerType,
      content: t.content,
      processSteps: t.processSteps || [],
      confluenceLinks: t.confluenceLinks || [],
      jiraTemplate: t.jiraTemplate || '',
    }));
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `templates-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const getCustomerTypeColor = (typeId: string) => {
    const typeName = getRequesterTypeName(typeId);
    if (typeName.includes('Kunde') || typeName.toLowerCase().includes('customer')) {
      return 'bg-green-100 text-green-800';
    }
    if (typeName.includes('Nichtkunde') || typeName.toLowerCase().includes('non-customer')) {
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  // Get unique categories for filter buttons
  const uniqueCategoryIds = Array.from(
    new Set(templates.map(t => t.primaryCategory))
  ).sort();

  // Filter templates based on selected filter
  const filteredTemplates = filter !== 'all'
    ? templates.filter(t => t.primaryCategory === filter)
    : templates;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Response Templates</h1>
            <p className="text-gray-600 mt-1">Manage GDPR response templates and keywords</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Back to Home
            </Link>
          <div className="flex items-center gap-4">
            <HelpButton onClick={() => setShowHelp(true)} />
            <Link
              href="/templates/import"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import JSON
            </Link>
            <button
              onClick={exportAllTemplates}
              disabled={templates.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export All
            </button>
            <Link
              href="/templates/new"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Template
            </Link>
          </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Categories
            </button>
            {uniqueCategoryIds.map((categoryId) => (
              <button
                key={categoryId}
                onClick={() => setFilter(categoryId)}
                className={`px-4 py-2 rounded ${
                  filter === categoryId
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getCategoryName(categoryId)}
              </button>
            ))}
          </div>
        </div>

        {/* Templates List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {error ? (
            <div className="p-8 text-center">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-semibold">⚠️ Error loading templates</p>
                <p className="text-red-600 text-sm mt-2">{error}</p>
                <p className="text-gray-600 text-sm mt-4">
                  Make sure Firestore is enabled in your Firebase project:
                  <br />
                  <a
                    href="https://console.firebase.google.com/"
                    target="_blank"
                    className="text-blue-600 underline"
                  >
                    Open Firebase Console
                  </a>
                </p>
              </div>
            </div>
          ) : loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-4">No templates found.</p>
              <Link
                href="/templates/new"
                className="text-indigo-600 hover:text-indigo-700 underline"
              >
                Create your first template
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {template.templateName}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getCustomerTypeColor(
                            template.requesterType
                          )}`}
                        >
                          {getRequesterTypeName(template.requesterType)}
                        </span>
                        {template.mineosAuto && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            Auto
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Category:</span> {getCategoryName(template.primaryCategory)}
                        {template.subCategory && (
                          <span> → {template.subCategory}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{template.whenToUse}</p>
                      {template.keywords && template.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {template.keywords.map((keyword, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                      {expandedTemplate === template.id ? (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Template Text:</span>
                            <button
                              onClick={() => setExpandedTemplate(null)}
                              className="text-sm text-gray-500 hover:text-gray-700"
                            >
                              Collapse
                            </button>
                          </div>
                          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                            {template.templateText}
                          </pre>
                          {template.confluenceLink && (
                            <a
                              href={template.confluenceLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-indigo-600 hover:text-indigo-700 mt-2 inline-block"
                            >
                              View in Confluence →
                            </a>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setExpandedTemplate(template.id)}
                          className="text-sm text-indigo-600 hover:text-indigo-700 mt-2"
                        >
                          View template text →
                        </button>
                      )}
                    </div>
                    <div className="ml-4 flex flex-col gap-2">
                      <button
                        onClick={() => exportTemplate(template)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap flex items-center gap-1.5"
                        title="Export as JSON"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export
                      </button>
                      <Link
                        href={`/templates/${template.id}/edit`}
                        className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 text-center flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Link>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-3">
                    Created: {new Date(template.createdAt).toLocaleDateString()} • 
                    Updated: {new Date(template.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <HelpModal 
        isOpen={showHelp} 
        onClose={() => setShowHelp(false)}
        title={HELP_CONTENT.templates.title}
        sections={HELP_CONTENT.templates.sections}
      />
    </div>
  );
}
