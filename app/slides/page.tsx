'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon, ShieldExclamationIcon, XCircleIcon, UserGroupIcon, ClipboardDocumentListIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function SlidesPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = React.useState(0);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  const slides = [
    {
      title: "The Problem",
      subtitle: "Lack of Standardized Escalation & Incident Process",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Large Incidents */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <ShieldExclamationIcon className="w-8 h-8 text-red-600" />
                <h3 className="text-xl font-bold text-red-900">Large Cross-Market Incidents</h3>
              </div>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>Communication scattered across multiple channels (Slack threads, emails)</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>Overnight Slack threads with dozens of messages become difficult to track</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>Documentation spread across different locations</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>Lack of structured action items and clear accountability</span>
                </li>
              </ul>
            </div>

            {/* Customer Complaints */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <UserGroupIcon className="w-8 h-8 text-blue-600" />
                <h3 className="text-xl font-bold text-blue-900">Customer Complaints & Escalations</h3>
              </div>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <XCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>No standardized format for complaint information</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>Multiple back-and-forth communications not documented chronologically</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>Draft answers need legal review - difficult to track versions</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>Difficult to maintain SLAs (2-day deadline for first response)</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Recent Examples */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-orange-300 rounded-lg p-6">
            <h3 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
              <ClipboardDocumentListIcon className="w-6 h-6" />
              Recent Examples
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <h4 className="font-semibold text-gray-900 mb-2">1. Salesforce Unsubscribe Issue</h4>
                <p className="text-sm text-gray-600">Technical failure affecting multiple markets</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <h4 className="font-semibold text-gray-900 mb-2">2. Mobile Automation Failure</h4>
                <p className="text-sm text-gray-600">iOS & Android failed to forward GDPR deletion requests</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <h4 className="font-semibold text-gray-900 mb-2">3. Jira Process Change</h4>
                <p className="text-sm text-gray-600">Failure to assign Data Deletion Requests to correct queue</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <h4 className="font-semibold text-gray-900 mb-2">4. CRM Tool Sunsetting (BOB → OWL)</h4>
                <p className="text-sm text-gray-600">New tool lacked GDPR feature parity</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Potential Solution",
      subtitle: "Jira Workflow with Standardized Forms",
      content: (
        <div className="space-y-6">
          {/* The Plan */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300 rounded-lg p-6">
            <h3 className="text-xl font-bold text-green-900 mb-6">The Plan</h3>
            <div className="flex items-center justify-around">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-3">1</div>
                <p className="text-center text-sm font-semibold text-gray-700">Create Jira Forms</p>
                <p className="text-center text-xs text-gray-500">Standardized fields</p>
              </div>
              <div className="w-12 h-1 bg-gradient-to-r from-green-400 to-blue-400"></div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-3">2</div>
                <p className="text-center text-sm font-semibold text-gray-700">Define Workflow</p>
                <p className="text-center text-xs text-gray-500">Status transitions</p>
              </div>
              <div className="w-12 h-1 bg-gradient-to-r from-blue-400 to-purple-400"></div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-3">3</div>
                <p className="text-center text-sm font-semibold text-gray-700">Launch & Train</p>
                <p className="text-center text-xs text-gray-500">Roll out to teams</p>
              </div>
            </div>
          </div>

          {/* The Challenge */}
          <h3 className="text-xl font-bold text-gray-800">The Challenge</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border-2 border-red-200 rounded-lg p-5">
              <div className="text-red-600 mb-3">
                <XCircleIcon className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Not Jira Owners</h4>
              <p className="text-sm text-gray-600">We don't control Jira configuration and workflows</p>
            </div>
            <div className="bg-white border-2 border-orange-200 rounded-lg p-5">
              <div className="text-orange-600 mb-3">
                <ArrowPathIcon className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Slow Implementation</h4>
              <p className="text-sm text-gray-600">Changes take weeks/months to implement through IT</p>
            </div>
            <div className="bg-white border-2 border-yellow-200 rounded-lg p-5">
              <div className="text-yellow-600 mb-3">
                <ClipboardDocumentListIcon className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Limited Flexibility</h4>
              <p className="text-sm text-gray-600">Hard to iterate on forms and fields quickly</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Interim Solution",
      subtitle: "GDPR Assistant Extension",
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-300 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-blue-900 mb-4">Why GDPR Assistant?</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Already Built</h4>
                    <p className="text-sm text-gray-600">Existing infrastructure we control</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Full Control</h4>
                    <p className="text-sm text-gray-600">We can iterate and add features instantly</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Ready to Use</h4>
                    <p className="text-sm text-gray-600">Can be deployed immediately</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Compliance-Ready</h4>
                    <p className="text-sm text-gray-600">Built with audit trails and data protection in mind</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-100 border-2 border-purple-300 rounded-lg p-6">
            <h3 className="text-xl font-bold text-purple-900 mb-4">New Features</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                <h4 className="font-semibold text-blue-900 mb-2">Escalation Management</h4>
                <p className="text-sm text-gray-600">Handle customer complaints with structured workflows, communication timelines, and SLA tracking</p>
              </div>
              <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
                <h4 className="font-semibold text-red-900 mb-2">Incident Management</h4>
                <p className="text-sm text-gray-600">Manage cross-market technical incidents with containment tracking and automated action plans</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Features Overview",
      subtitle: "Escalation & Incident Management",
      content: (
        <div className="grid grid-cols-2 gap-6">
          {/* Escalation Management */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-400 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-blue-900 mb-4">Escalation Management</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">Key Features</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Communication Timeline:</strong> Track all customer interactions chronologically</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>GDPR Classification:</strong> Tag cases with specific GDPR rights (DSAR, Erasure, etc.)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>SLA Tracking:</strong> Auto-calculate 2-day deadline for first response</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Action Items:</strong> Pre-defined tasks with owner assignment</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-blue-800 mb-2">Benefits</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">→</span>
                    <span>Single source of truth for all complaint information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">→</span>
                    <span>Legal can easily review draft answers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">→</span>
                    <span>Copy case URL to share in Slack/Jira/Email</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-blue-800 mb-2">Export Options</h4>
                <p className="text-sm text-gray-700">Export case summary (Markdown) or full audit trail for local legal drive or Jira attachment</p>
              </div>
            </div>
          </div>

          {/* Incident Management */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-400 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-red-900 mb-4">Incident Management</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-red-800 mb-2">Key Features</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Multi-Step Process:</strong> Discovery → Containment → Root Cause → Resolution</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Country Impact Tracking:</strong> Document which markets are affected</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Automated Action Plans:</strong> Task generator based on incident type</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Complete Audit Trail:</strong> Every change tracked with user + timestamp</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-red-800 mb-2">Benefits</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">→</span>
                    <span>All incident info in one place (no more Slack hunting)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">→</span>
                    <span>Clear ownership and accountability for tasks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">→</span>
                    <span>Visual highlights for pending tasks (no pop-ups)</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-red-800 mb-2">Export Options</h4>
                <p className="text-sm text-gray-700">Generate beautifully designed HelloFresh 2026 PDF report or CSV export for technical backup</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          GDPR Assistant – Escalation & Incident Management
        </h1>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium transition-colors"
        >
          Back to Home
        </button>
      </div>

      {/* Slide Container */}
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Slide Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white p-8">
          <h2 className="text-4xl font-bold mb-2">{slides[currentSlide].title}</h2>
          <p className="text-xl text-blue-100">{slides[currentSlide].subtitle}</p>
        </div>

        {/* Slide Content */}
        <div className="p-8 min-h-[500px]">
          {slides[currentSlide].content}
        </div>

        {/* Slide Navigation */}
        <div className="bg-gray-50 px-8 py-4 flex items-center justify-between border-t">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentSlide === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <ChevronLeftIcon className="w-5 h-5" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentSlide ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentSlide === slides.length - 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Next
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="fixed bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg">
        Use ← → arrow keys to navigate
      </div>
    </div>
  );
}
