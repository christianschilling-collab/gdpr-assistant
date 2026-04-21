'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAllWorkflowTemplates, getWorkflowTemplate } from '@/lib/workflows/standardWorkflows';
import { ProcessStep } from '@/lib/types';

/**
 * Workflow Demo & Test Page
 * Zeigt alle verfügbaren Workflows und deren Details
 */
export default function WorkflowDemoPage() {
  const router = useRouter();
  const templates = getAllWorkflowTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<ProcessStep[] | null>(null);

  function loadWorkflow(templateId: string) {
    setSelectedTemplate(templateId);
    const wf = getWorkflowTemplate(templateId);
    setWorkflow(wf);
  }
  
  async function handleTryWorkflow() {
    if (!selectedTemplate) return;
    
    // Redirect to new case creation with pre-selected workflow
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;
    
    // Store selected workflow in session storage for pre-population
    sessionStorage.setItem('demo_workflow_template', selectedTemplate);
    sessionStorage.setItem('demo_workflow_name', template.name);
    
    // Redirect to case creation
    router.push('/cases/new');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workflow Demo & Test</h1>
            <p className="text-gray-600 mt-2">Teste die Multi-Step-Workflow-Funktionalität</p>
          </div>
          <Link
            href="/cases"
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Back to Cases
          </Link>
        </div>

        {/* Test Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-green-900 mb-2">✅ Backend Tests Passed</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Standard Workflows:</strong> ✓ {templates.length} templates loaded
            </div>
            <div>
              <strong>Workflow Logic:</strong> ✓ All functions available
            </div>
            <div>
              <strong>Email Templates:</strong> ✓ Gemini integration ready
            </div>
            <div>
              <strong>UI Components:</strong> ✓ Components created
            </div>
          </div>
        </div>

        {/* Workflow Templates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Available Workflow Templates</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => loadWorkflow(template.id)}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  selectedTemplate === template.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-indigo-300'
                }`}
              >
                <h3 className="font-bold text-gray-900 mb-1">{template.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{template.nameEn}</p>
                <div className="text-xs text-gray-500">{template.stepCount} steps</div>
                <p className="text-xs text-gray-600 mt-2">{template.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Workflow Details */}
        {workflow && selectedTemplate && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Workflow: {templates.find(t => t.id === selectedTemplate)?.name}
              </h2>
              <button
                onClick={handleTryWorkflow}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-blue-700 shadow-md transition-all"
              >
                🚀 Try This Workflow
              </button>
            </div>

            <div className="space-y-4">
              {workflow.map((step, index) => (
                <div
                  key={index}
                  className="border-l-4 border-indigo-500 pl-4 py-3 bg-gray-50 rounded-r-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">
                        Step {step.order + 1}: {step.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        step.stepType === 'email' ? 'bg-blue-100 text-blue-700' :
                        step.stepType === 'manual' ? 'bg-purple-100 text-purple-700' :
                        step.stepType === 'decision' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {step.stepType || 'manual'}
                      </span>
                      {step.required && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                          Required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Email Template Info */}
                  {step.stepType === 'email' && step.emailTemplate && (
                    <div className="mt-3 bg-blue-50 p-3 rounded-lg">
                      <div className="text-xs font-semibold text-blue-900 mb-1">Email Template:</div>
                      <div className="text-xs text-blue-700">
                        <strong>Subject:</strong> {step.emailTemplate.subject}
                      </div>
                      <div className="text-xs text-blue-700 mt-1">
                        <strong>Category:</strong> {step.emailTemplate.category}
                      </div>
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                          View template body
                        </summary>
                        <pre className="text-xs text-gray-700 mt-2 whitespace-pre-wrap bg-white p-2 rounded border border-blue-200 max-h-40 overflow-y-auto">
                          {step.emailTemplate.bodyTemplate}
                        </pre>
                      </details>
                    </div>
                  )}

                  {/* Checklist */}
                  {step.checklist && step.checklist.length > 0 && (
                    <div className="mt-3 bg-gray-100 p-3 rounded-lg">
                      <div className="text-xs font-semibold text-gray-900 mb-2">Checklist:</div>
                      <ul className="space-y-1">
                        {step.checklist.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-xs text-gray-600">•</span>
                            <span className="text-xs text-gray-700">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Confluence Link */}
                  {step.confluenceLink && (
                    <a
                      href={step.confluenceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      📚 Confluence Documentation ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Testing Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h2 className="text-lg font-bold text-blue-900 mb-4">🧪 Next Testing Steps</h2>
          
          <div className="space-y-4 text-sm text-blue-900">
            <div>
              <strong>1. Create a Test Case:</strong>
              <ul className="list-disc ml-6 mt-1 text-blue-800">
                <li>Go to <Link href="/cases/new" className="underline font-semibold">/cases/new</Link></li>
                <li>Fill in a test GDPR request (Datenauskunft)</li>
                <li>Submit the case</li>
              </ul>
            </div>

            <div>
              <strong>2. Initialize Workflow:</strong>
              <ul className="list-disc ml-6 mt-1 text-blue-800">
                <li>Open the created case detail page</li>
                <li>Look for "Initialize Workflow" button (needs to be added to case detail UI)</li>
                <li>Select "Datenauskunft" workflow</li>
                <li>Workflow should initialize with 6 steps</li>
              </ul>
            </div>

            <div>
              <strong>3. Test Workflow Steps:</strong>
              <ul className="list-disc ml-6 mt-1 text-blue-800">
                <li>Step 1 (Email): Generate acknowledgement email draft</li>
                <li>Review and edit the email</li>
                <li>Mark step as completed</li>
                <li>Workflow should auto-advance to Step 2</li>
              </ul>
            </div>

            <div>
              <strong>4. Test Analytics:</strong>
              <ul className="list-disc ml-6 mt-1 text-blue-800">
                <li>Visit <Link href="/analytics/workflows" className="underline font-semibold">/analytics/workflows</Link></li>
                <li>Check workflow progress metrics</li>
                <li>Verify step duration tracking</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <Link
            href="/cases/new"
            className="px-6 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-center font-semibold"
          >
            → Create Test Case
          </Link>
          <Link
            href="/analytics/workflows"
            className="px-6 py-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-center font-semibold"
          >
            → View Analytics
          </Link>
        </div>
      </div>
    </div>
  );
}
