'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createIncident, autoCalculateRisk } from '@/lib/firebase/incidents';
import { Incident, CountryImpact, LegalRiskType, IncidentCountry } from '@/lib/types';
import { useToast } from '@/lib/contexts/ToastContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ChartBarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const NATURE_MAX = 2000;
const ADDITIONAL_MAX = 12000;

const AFFECTED_SYSTEMS = [
  'CRM',
  'Payment System',
  'Email Platform',
  'Website',
  'Mobile App',
  'Internal Tools',
  'Order Management',
  'Customer Database',
  'Other',
] as const;

const DATA_CATEGORIES = [
  'Contact Data (name, email, address, phone)',
  'Financial Data (payment, IBAN, credit card)',
  'Authentication Data (passwords, tokens)',
  'Health / Dietary Data',
  'Order & Delivery Data',
  'Behavioral / Usage Data',
  'Special Category Data (Art. 9 GDPR)',
  'Other',
] as const;

const OTHER_CHOICE = 'Other';

// Country groups for better UX
const COUNTRY_GROUPS = {
  'BNL + France': [
    { code: 'BE' as const, flag: '🇧🇪', name: 'Belgium' },
    { code: 'LU' as const, flag: '🇱🇺', name: 'Luxembourg' },
    { code: 'NL' as const, flag: '🇳🇱', name: 'Netherlands' },
    { code: 'FR' as const, flag: '🇫🇷', name: 'France' },
  ],
  'DACH': [
    { code: 'DE' as const, flag: '🇩🇪', name: 'Germany' },
    { code: 'AT' as const, flag: '🇦🇹', name: 'Austria' },
    { code: 'CH' as const, flag: '🇨🇭', name: 'Switzerland' },
  ],
  'Nordics': [
    { code: 'SE' as const, flag: '🇸🇪', name: 'Sweden' },
    { code: 'DK' as const, flag: '🇩🇰', name: 'Denmark' },
    { code: 'NO' as const, flag: '🇳🇴', name: 'Norway' },
  ],
};

const ALL_COUNTRIES = [
  ...COUNTRY_GROUPS['BNL + France'],
  ...COUNTRY_GROUPS['DACH'],
  ...COUNTRY_GROUPS['Nordics'],
];

export default function NewIncidentPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  /** Two steps: initial report → impact (then create). Risk / legal assessment happens in the incident record. */
  const [currentStep, setCurrentStep] = useState(1);
  
  // Get user email for audit trail, fallback to 'system'
  const userEmail = user?.email || 'system';
  
  // Form data
  const [natureOfIncident, setNatureOfIncident] = useState('');
  const [additionalDescription, setAdditionalDescription] = useState('');
  const [affectedSystems, setAffectedSystems] = useState<string[]>([]);
  const [otherSystemDetail, setOtherSystemDetail] = useState('');
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [otherDataCategoryDetail, setOtherDataCategoryDetail] = useState('');
  const [discoveryDate, setDiscoveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [impactStart, setImpactStart] = useState(new Date().toISOString().split('T')[0]);
  const [impactEnd, setImpactEnd] = useState('');
  const [breachTypes, setBreachTypes] = useState<LegalRiskType[]>([]);
  const [breachOtherDetails, setBreachOtherDetails] = useState('');
  
  // Country impact data - initialized with all regions
  const [countryImpact, setCountryImpact] = useState<CountryImpact[]>(
    ALL_COUNTRIES.map(c => ({
      country: c.code,
      impactedVolume: 0,
      complaintsReceived: 0,
      riskLevel: 'Low' as const,
    }))
  );

  const totalImpacted = countryImpact.reduce((sum, c) => sum + c.impactedVolume, 0);

  function toggleSystem(system: string) {
    setAffectedSystems((prev) => {
      const next = prev.includes(system) ? prev.filter((s) => s !== system) : [...prev, system];
      if (system === OTHER_CHOICE && prev.includes(OTHER_CHOICE)) {
        setOtherSystemDetail('');
      }
      return next;
    });
  }

  function toggleDataCategory(category: string) {
    setDataCategories((prev) => {
      const next = prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category];
      if (category === OTHER_CHOICE && prev.includes(OTHER_CHOICE)) {
        setOtherDataCategoryDetail('');
      }
      return next;
    });
  }

  function toggleBreachType(type: LegalRiskType) {
    setBreachTypes((prev) => {
      if (prev.includes(type)) {
        if (type === 'Other / not solely CIA') {
          setBreachOtherDetails('');
        }
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  }

  function updateCountryImpact(country: IncidentCountry, field: 'impactedVolume' | 'complaintsReceived', value: number) {
    setCountryImpact(prev =>
      prev.map(c => {
        if (c.country === country) {
          const updated = { ...c, [field]: value };
          // Auto-calculate risk
          if (field === 'impactedVolume') {
            updated.riskLevel = autoCalculateRisk(value);
          }
          return updated;
        }
        return c;
      })
    );
  }

  function buildAffectedSystemsForSave(): string[] {
    const base = affectedSystems.filter((s) => s !== OTHER_CHOICE);
    if (affectedSystems.includes(OTHER_CHOICE) && otherSystemDetail.trim()) {
      base.push(`Other — ${otherSystemDetail.trim()}`);
    }
    return base;
  }

  function buildDataCategoriesForSave(): string[] {
    const base = dataCategories.filter((c) => c !== OTHER_CHOICE);
    if (dataCategories.includes(OTHER_CHOICE) && otherDataCategoryDetail.trim()) {
      base.push(`Other — ${otherDataCategoryDetail.trim()}`);
    }
    return base;
  }

  function canProceedToStep2(): boolean {
    const natureOk =
      natureOfIncident.trim().length > 0 &&
      natureOfIncident.length <= NATURE_MAX &&
      additionalDescription.length <= ADDITIONAL_MAX;
    const systemsOk =
      affectedSystems.length > 0 &&
      (!affectedSystems.includes(OTHER_CHOICE) || otherSystemDetail.trim().length >= 2);
    const categoriesOk =
      dataCategories.length > 0 &&
      (!dataCategories.includes(OTHER_CHOICE) || otherDataCategoryDetail.trim().length >= 2);
    return (
      natureOk &&
      systemsOk &&
      categoriesOk &&
      discoveryDate.length > 0 &&
      impactStart.length > 0
    );
  }

  function canSubmitImpactStep(): boolean {
    if (!canProceedToStep2()) return false;
    if (breachTypes.length === 0) return false;
    if (breachTypes.includes('Other / not solely CIA')) {
      return breachOtherDetails.trim().length >= 10;
    }
    return true;
  }

  async function handleSubmit() {
    if (!canSubmitImpactStep()) {
      addToast('Please complete all required fields (including breach details if “Other” is selected).', 'error');
      return;
    }

    setSaving(true);
    try {
      const systemsSaved = buildAffectedSystemsForSave();
      const categoriesSaved = buildDataCategoriesForSave();

      const incidentData: Omit<Incident, 'id' | 'incidentId' | 'createdAt' | 'updatedAt'> = {
        natureOfIncident: natureOfIncident.trim(),
        ...(additionalDescription.trim()
          ? { additionalDescription: additionalDescription.trim() }
          : {}),
        affectedSystems: systemsSaved,
        dataCategories: categoriesSaved,
        impactPeriod: {
          start: new Date(impactStart),
          end: impactEnd ? new Date(impactEnd) : undefined,
        },
        discoveryDate: new Date(discoveryDate),
        breachTypes,
        ...(breachTypes.includes('Other / not solely CIA') && breachOtherDetails.trim()
          ? { breachOtherDetails: breachOtherDetails.trim() }
          : {}),
        countryImpact,
        status: 'Reporting',
        createdBy: userEmail,
      };

      const id = await createIncident(incidentData);
      
      if (!id) {
        throw new Error('Failed to create incident - no ID returned');
      }
      
      addToast('Incident created successfully!', 'success');
      
      // Small delay to ensure Firestore propagation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      router.push(`/incidents/${id}`);
    } catch (error) {
      console.error('Error creating incident:', error);
      addToast('Failed to create incident. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ErrorBoundary componentName="New Incident Form">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Incident</h1>
              <p className="text-gray-600 mt-2">Document a data breach incident</p>
            </div>
            <button
              onClick={() => router.push('/incidents')}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          {/* Progress — risk & legal assessment happens after creation in the incident record */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                Step 1
              </span>
              <span className={`text-sm font-medium ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                Step 2
              </span>
            </div>
            <div className="relative">
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / 2) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-600">Initial report</span>
              <span className="text-xs text-gray-600">Impact &amp; create</span>
            </div>
          </div>

          {/* Step 1: Executive Summary */}
          {currentStep === 1 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Executive Summary
              </h2>

              {/* Nature of Incident */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Short summary / headline *
                </label>
                <textarea
                  value={natureOfIncident}
                  onChange={(e) => setNatureOfIncident(e.target.value)}
                  placeholder="Concise title for lists and dashboards (you can add detail below)."
                  maxLength={NATURE_MAX}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {natureOfIncident.length}/{NATURE_MAX} characters
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Further details (optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Timeline, links, who reported, technical context — everything you already know. Legal risk assessment
                  is recorded later in the incident.
                </p>
                <textarea
                  value={additionalDescription}
                  onChange={(e) => setAdditionalDescription(e.target.value)}
                  placeholder="Optional longer description…"
                  maxLength={ADDITIONAL_MAX}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={8}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {additionalDescription.length}/{ADDITIONAL_MAX} characters
                </div>
              </div>

              {/* Affected Systems */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Affected systems * (multi-select)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {AFFECTED_SYSTEMS.map((system) => (
                    <button
                      key={system}
                      type="button"
                      onClick={() => toggleSystem(system)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        affectedSystems.includes(system)
                          ? 'bg-blue-100 border-blue-600 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {affectedSystems.includes(system) && '✓ '}
                      {system}
                    </button>
                  ))}
                </div>
                {affectedSystems.includes(OTHER_CHOICE) && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Describe “Other” *</label>
                    <input
                      type="text"
                      value={otherSystemDetail}
                      onChange={(e) => setOtherSystemDetail(e.target.value)}
                      placeholder="e.g. vendor ticketing tool, warehouse scanner app…"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Data Categories Affected */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data categories affected * (multi-select)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {DATA_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleDataCategory(category)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                        dataCategories.includes(category)
                          ? 'bg-blue-100 border-blue-600 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {dataCategories.includes(category) && '✓ '}
                      {category}
                    </button>
                  ))}
                </div>
                {dataCategories.includes(OTHER_CHOICE) && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Describe “Other” *</label>
                    <input
                      type="text"
                      value={otherDataCategoryDetail}
                      onChange={(e) => setOtherDataCategoryDetail(e.target.value)}
                      placeholder="e.g. employee IDs, CCTV metadata…"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Discovery Date */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discovery Date *
                </label>
                <input
                  type="date"
                  value={discoveryDate}
                  onChange={(e) => setDiscoveryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Impact Period */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Impact Period *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">From</label>
                    <input
                      type="date"
                      value={impactStart}
                      onChange={(e) => setImpactStart(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">To (optional)</label>
                    <input
                      type="date"
                      value={impactEnd}
                      onChange={(e) => setImpactEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedToStep2()}
                  className={`px-6 py-3 font-semibold rounded-lg ${
                    canProceedToStep2()
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Next: Impact Analysis →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Impact Analysis */}
          {currentStep === 2 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <ChartBarIcon className="w-6 h-6 text-blue-600" />
                Impact Analysis
              </h2>

              {/* Breach Types (Multi-Select) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Breach characterisation * (multi-select)
                </label>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  Most personal-data incidents map to the <strong>CIA triad</strong> (availability, confidentiality,
                  integrity). Choose <strong>Other</strong> for mixed cases, early unclear facts, or issues that do not
                  fit these three (e.g. some Art. 32 security failures). Legal will refine the formal assessment in the
                  incident record.
                </p>
                <div className="space-y-2">
                  {(
                    [
                      'Loss of Availability',
                      'Loss of Confidentiality',
                      'Loss of Integrity',
                      'Other / not solely CIA',
                    ] as const
                  ).map((risk) => (
                    <label key={risk} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        value={risk}
                        checked={breachTypes.includes(risk)}
                        onChange={() => toggleBreachType(risk)}
                        className="mt-1 text-blue-600 focus:ring-blue-500 rounded"
                      />
                      <span>{risk}</span>
                    </label>
                  ))}
                </div>
                {breachTypes.includes('Other / not solely CIA') && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Describe “Other” * (min. 10 characters)
                    </label>
                    <textarea
                      value={breachOtherDetails}
                      onChange={(e) => setBreachOtherDetails(e.target.value)}
                      placeholder="What happened and why it is not covered by the three types above?"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Country Impact Table */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country-Specific Impact
                </label>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-700">Country</th>
                        <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-700">Impacted Volume</th>
                        <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-700">Complaints Received</th>
                        <th className="px-4 py-2 border-b text-left text-sm font-medium text-gray-700">Risk Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(COUNTRY_GROUPS).map(([groupName, countries]) => (
                        <Fragment key={groupName}>
                          {/* Group Header */}
                          <tr className="bg-gray-50">
                            <td colSpan={4} className="px-4 py-2 text-xs font-bold text-gray-600 uppercase border-t-2 border-gray-300">
                              {groupName}
                            </td>
                          </tr>
                          {/* Countries in this group */}
                          {countries.map((c) => {
                            const impactData = countryImpact.find(ci => ci.country === c.code);
                            if (!impactData) return null;
                            return (
                              <tr key={c.code} className="hover:bg-gray-50">
                                <td className="px-4 py-2 border-b font-medium">
                                  {c.flag} {c.name}
                                </td>
                                <td className="px-4 py-2 border-b">
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={impactData.impactedVolume || ''}
                                    onChange={(e) => updateCountryImpact(c.code, 'impactedVolume', parseInt(e.target.value) || 0)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded"
                                  />
                                </td>
                                <td className="px-4 py-2 border-b">
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={impactData.complaintsReceived || ''}
                                    onChange={(e) => updateCountryImpact(c.code, 'complaintsReceived', parseInt(e.target.value) || 0)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded"
                                  />
                                </td>
                                <td className="px-4 py-2 border-b">
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    impactData.riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                                    impactData.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {impactData.riskLevel}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">
                    Total Impacted: {totalImpacted.toLocaleString()} customers
                  </div>
                  {totalImpacted >= 1000 && (
                    <div className="text-sm text-red-600 mt-1">
                      ⚠️ High risk: Notification to authority recommended
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2 text-sm text-amber-950">
                  <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block mb-1">After you create the incident</strong>
                    Legal completes risk assessment, notification decision, and reasoning in the incident record (not in
                    this form). You can still edit investigation fields as facts emerge.
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmitImpactStep() || saving}
                  className={`px-6 py-3 font-semibold rounded-lg ${
                    canSubmitImpactStep() && !saving
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {saving ? 'Creating…' : 'Create incident'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
