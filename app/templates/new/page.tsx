'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createTemplate } from '@/lib/firebase/templates';
import { getCategories } from '@/lib/firebase/categories';
import { getRequesterTypes } from '@/lib/firebase/requesterTypes';
import { ProcessStep, Category, RequesterType } from '@/lib/types';
import { useToast } from '@/lib/contexts/ToastContext';

export default function NewTemplatePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [requesterTypes, setRequesterTypes] = useState<RequesterType[]>([]);
  
  const [formData, setFormData] = useState({
    templateName: '',
    templateText: '',
    primaryCategory: '',
    subCategory: '',
    customerType: '',
    whenToUse: '',
    keywords: '',
    confluenceLink: '',
    mineosAuto: false,
  });

  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [showProcessSteps, setShowProcessSteps] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    const fetchLists = async () => {
      const [cats, types] = await Promise.all([
        getCategories(true),
        getRequesterTypes(true),
      ]);
      setCategories(cats);
      setRequesterTypes(types);
    };

    try {
      await fetchLists();
    } catch (err: any) {
      console.error('Error loading data:', err);
      try {
        await new Promise((r) => setTimeout(r, 300));
        await fetchLists();
      } catch (e2: any) {
        console.error('Error loading data (retry):', e2);
        setError('Failed to load categories and requester types');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Parse keywords from comma-separated string
      const keywordsArray = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      // Validate required fields
      if (!formData.templateName || !formData.templateText || !formData.primaryCategory || !formData.customerType) {
        setError('Please fill in all required fields (Template Name, Template Text, Primary Category, Requester Type)');
        setSaving(false);
        return;
      }

      // Build template object without undefined fields
      const templateData: any = {
        templateName: formData.templateName,
        templateText: formData.templateText,
        primaryCategory: formData.primaryCategory,
        requesterType: formData.customerType,
        whenToUse: formData.whenToUse,
        keywords: keywordsArray,
        mineosAuto: formData.mineosAuto,
      };

      // Only add optional fields if they have values
      if (formData.subCategory && formData.subCategory.trim()) {
        templateData.subCategory = formData.subCategory;
      }
      
      if (formData.confluenceLink && formData.confluenceLink.trim()) {
        templateData.confluenceLink = formData.confluenceLink;
      }
      
      if (processSteps.length > 0) {
        templateData.processSteps = processSteps;
      }

      await createTemplate(templateData);
      
      // Redirect to templates list
      router.push('/templates');
    } catch (error: any) {
      console.error('Error creating template:', error);
      setError(error.message || 'Failed to create template. Please try again.');
      showToast(error.message || 'Failed to create template', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Template</h1>
            <p className="text-gray-600 mt-1">Add a new GDPR response template</p>
          </div>
          <Link
            href="/templates"
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Back to Templates
          </Link>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
            <p className="text-red-800 font-semibold">⚠️ Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading...</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form - Left Column (2/3) */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.templateName}
              onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Right to Access - Customer"
              required
            />
          </div>

          {/* Primary Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.primaryCategory}
              onChange={(e) => setFormData({ ...formData, primaryCategory: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">Select a category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sub Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sub Category (optional)
            </label>
            <input
              type="text"
              value={formData.subCategory}
              onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Access Request, Erasure Request"
            />
          </div>

          {/* Customer Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requester Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.customerType}
              onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">Select a requester type...</option>
              {requesterTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Template Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Text <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.templateText}
              onChange={(e) => setFormData({ ...formData, templateText: e.target.value })}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
              placeholder="Enter the template text here. You can use variables like {{caseId}}, {{market}}, {{agentName}}..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Available variables: {'{{caseId}}'}, {'{{market}}'}, {'{{agentName}}'}, {'{{date}}'}
            </p>
          </div>

          {/* When to Use */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              When to Use
            </label>
            <textarea
              value={formData.whenToUse}
              onChange={(e) => setFormData({ ...formData, whenToUse: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Describe when this template should be used..."
            />
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., access, data, GDPR, request"
            />
            <p className="text-xs text-gray-500 mt-1">
              Separate multiple keywords with commas
            </p>
          </div>

          {/* Confluence Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confluence Link (optional)
            </label>
            <input
              type="url"
              value={formData.confluenceLink}
              onChange={(e) => setFormData({ ...formData, confluenceLink: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="https://confluence.example.com/..."
            />
          </div>

          {/* Mineos Auto */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="mineosAuto"
              checked={formData.mineosAuto}
              onChange={(e) => setFormData({ ...formData, mineosAuto: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="mineosAuto" className="ml-2 text-sm font-medium text-gray-700">
              Mineos Auto (automated processing)
            </label>
          </div>

          {/* Process Steps / Checklist */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Process Steps / Checklist
                </label>
                <p className="text-xs text-gray-500">
                  Füge Schritt-für-Schritt Anleitungen hinzu, die Agents bei der Bearbeitung helfen
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newStep: ProcessStep = {
                    order: processSteps.length + 1,
                    title: '',
                    description: '',
                    required: true,
                    checklist: [],
                  };
                  setProcessSteps([...processSteps, newStep]);
                  setShowProcessSteps(true);
                }}
                className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
              >
                + Add Step
              </button>
            </div>

            {processSteps.length > 0 && (
              <div className="space-y-4">
                {processSteps.map((step, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {step.order}
                        </span>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => {
                            const updated = [...processSteps];
                            updated[index].title = e.target.value;
                            setProcessSteps(updated);
                          }}
                          placeholder="Step title (e.g., 'Verify customer identity')"
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = processSteps.filter((_, i) => i !== index);
                          // Reorder
                          updated.forEach((s, i) => { s.order = i + 1; });
                          setProcessSteps(updated);
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    <textarea
                      value={step.description}
                      onChange={(e) => {
                        const updated = [...processSteps];
                        updated[index].description = e.target.value;
                        setProcessSteps(updated);
                      }}
                      placeholder="Step description / instructions..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm mb-2"
                    />
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={step.required}
                          onChange={(e) => {
                            const updated = [...processSteps];
                            updated[index].required = e.target.checked;
                            setProcessSteps(updated);
                          }}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                        />
                        Required
                      </label>
                      <input
                        type="url"
                        value={step.confluenceLink || ''}
                        onChange={(e) => {
                          const updated = [...processSteps];
                          updated[index].confluenceLink = e.target.value;
                          setProcessSteps(updated);
                        }}
                        placeholder="Confluence Link (optional)"
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {processSteps.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">No process steps added yet</p>
                <p className="text-xs text-gray-400">Click "Add Step" to create a checklist for agents</p>
              </div>
            )}
          </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Link
                  href="/templates"
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating...' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>

          {/* Help Panel - Right Column (1/3) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>📚</span> Field Guide
              </h2>
              
              <div className="space-y-6">
                {/* Template Name */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-indigo-600">Template Name</span>
                    <span className="text-red-500 text-xs">*</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Ein eindeutiger, beschreibender Name für dieses Template.
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>Beispiel:</strong> "Right to Access - Customer"<br/>
                    <strong>Verwendung:</strong> Wird in der Template-Liste und bei der AI-Klassifizierung angezeigt.
                  </p>
                </div>

                {/* Primary Category */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-indigo-600">Primary Category</span>
                    <span className="text-red-500 text-xs">*</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Die Hauptkategorie des GDPR-Rechts (z.B. "Right to Access", "Right to Erasure").
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>Beispiele:</strong> Right to Access, Right to Erasure, Data Portability, Right to Rectification<br/>
                    <strong>Funktion:</strong> Wird von der AI verwendet, um Cases zu klassifizieren und passende Templates zu finden.
                  </p>
                </div>

                {/* Sub Category */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    <span className="text-indigo-600">Sub Category</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Eine optional Unterkategorie für detailliertere Klassifizierung.
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>Beispiele:</strong> Access Request, Erasure Request, Portability Request<br/>
                    <strong>Funktion:</strong> Hilft bei der genaueren Zuordnung von Cases zu Templates.
                  </p>
                </div>

                {/* Customer Type */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    <span className="text-indigo-600">Customer Type</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Gibt an, ob das Template für Kunden, Nicht-Kunden oder unbekannt gilt.
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>Optionen:</strong> Customer, Non-Customer, Unknown<br/>
                    <strong>Funktion:</strong> Ermöglicht unterschiedliche Templates für verschiedene Kundentypen. Die AI berücksichtigt dies bei der Template-Auswahl.
                  </p>
                </div>

                {/* Template Text */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-indigo-600">Template Text</span>
                    <span className="text-red-500 text-xs">*</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Der eigentliche Antworttext, der als Vorlage dient.
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    <strong>Variables:</strong> Du kannst Platzhalter verwenden, die automatisch ersetzt werden:
                  </p>
                  <ul className="text-xs text-gray-500 list-disc list-inside space-y-1 mb-2">
                    <li><code className="bg-gray-100 px-1 rounded">{'{{caseId}}'}</code> - Case-ID</li>
                    <li><code className="bg-gray-100 px-1 rounded">{'{{market}}'}</code> - Markt (DE, AT, CH)</li>
                    <li><code className="bg-gray-100 px-1 rounded">{'{{agentName}}'}</code> - Name des Agents</li>
                    <li><code className="bg-gray-100 px-1 rounded">{'{{date}}'}</code> - Aktuelles Datum</li>
                  </ul>
                  <p className="text-xs text-gray-500">
                    <strong>Funktion:</strong> Dieser Text wird als vorgeschlagene Antwort bei der AI-Klassifizierung verwendet und kann direkt in Cases übernommen werden.
                  </p>
                </div>

                {/* When to Use */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    <span className="text-indigo-600">When to Use</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Beschreibung, wann dieses Template verwendet werden sollte.
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>Funktion:</strong> Hilft Agents zu verstehen, wann dieses Template passend ist. Wird in der Template-Detailansicht angezeigt.
                  </p>
                </div>

                {/* Keywords */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    <span className="text-indigo-600">Keywords</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Relevante Suchbegriffe, die mit diesem Template verbunden sind (komma-separiert).
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>Beispiel:</strong> "access, data, GDPR, request, information"<br/>
                    <strong>Funktion:</strong> Werden von der AI verwendet, um Cases diesem Template zuzuordnen. Je relevanter die Keywords, desto besser das Matching.
                  </p>
                </div>

                {/* Confluence Link */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    <span className="text-indigo-600">Confluence Link</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Link zur Confluence-Dokumentation für dieses Template.
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>Funktion:</strong> Ermöglicht Agents, zusätzliche Informationen und Kontext zu finden. Wird in der Template-Detailansicht als Link angezeigt.
                  </p>
                </div>

                {/* Mineos Auto */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    <span className="text-indigo-600">Mineos Auto</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Aktiviert automatische Verarbeitung über das Mineos-System.
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>Funktion:</strong> Wenn aktiviert, kann dieses Template automatisch verarbeitet werden, ohne manuelle Agent-Intervention. Wird für standardisierte, wiederkehrende Anfragen verwendet.
                  </p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">💡 Tipps</h3>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Verwende klare, beschreibende Namen</li>
                  <li>• Füge relevante Keywords hinzu für besseres AI-Matching</li>
                  <li>• Teste Variables in der Template-Vorschau</li>
                  <li>• Templates können später bearbeitet werden</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
