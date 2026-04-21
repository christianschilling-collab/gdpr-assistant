'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { classifyCase } from '@/lib/gemini/client';
import { getTemplates } from '@/lib/firebase/templates';
import { createCase } from '@/lib/firebase/cases';
import { generateCaseId } from '@/lib/firebase/cases';

export default function QuickHelpPage() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) {
      setError('Bitte gib eine Frage ein');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Step 1: Classify the question
      const classification = await classifyCase(question);

      // Step 2: Get templates and match them
      const templates = await getTemplates();
      const templateMatches = await matchTemplates(question, classification, templates);

      // Step 3: Generate case ID (simple approach using timestamp)
      const now = new Date();
      const caseId = `HELP-${now.getFullYear()}-${String(Date.now()).slice(-6).padStart(3, '0')}`;
      const newCase = await createCase({
        caseId,
        timestamp: new Date(),
        teamMember: 'Quick Help',
        sourceLink: '',
        market: 'Unknown',
        caseDescription: question,
        specificQuestion: question,
        urgency: 'Medium',
        status: 'AI Processed',
        primaryCategory: classification.primaryCategory,
        subCategory: classification.subCategory,
        customerType: classification.customerType,
        confidence: classification.confidence,
        templateMatches: templateMatches.map((m) => ({
          template: m.template,
          confidence: m.confidence,
          reason: m.reason,
        })),
      });

      // Step 4: Redirect to the case detail page
      router.push(`/cases/${newCase}`);
    } catch (error: any) {
      console.error('Error processing quick help:', error);
      setError(error.message || 'Fehler beim Verarbeiten der Frage. Bitte versuche es erneut.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🤖 Quick Help</h1>
          <p className="text-gray-600">
            Stelle eine Frage und der Assistent erstellt automatisch einen Case mit dem richtigen Template und Prozess-Schritten
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deine Frage
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="z.B.: Wie bearbeite ich eine Datenlöschung? Oder: Was muss ich bei einem Werbewiderruf beachten?"
              />
              <p className="text-xs text-gray-500 mt-1">
                Der Assistent wird deine Frage klassifizieren und automatisch einen Case mit dem passenden Template und Prozess-Schritten erstellen.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
                <p className="text-red-800 font-semibold">⚠️ Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={processing || !question.trim()}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? '⏳ Verarbeite...' : '🚀 Case erstellen & öffnen'}
              </button>
              <Link
                href="/cases"
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Examples */}
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 Beispiel-Fragen:</h3>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li>• "Wie bearbeite ich eine Datenlöschung?"</li>
            <li>• "Was muss ich bei einem Werbewiderruf beachten?"</li>
            <li>• "Wie gehe ich mit einem Auskunftsersuchen um?"</li>
            <li>• "Prozess für Datenportabilität?"</li>
            <li>• "Wie bearbeite ich eine Berichtigungsanfrage?"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
