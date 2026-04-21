'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createIncident, autoCalculateRisk } from '@/lib/firebase/incidents';
import { Incident, CountryImpact, LegalRiskType, IncidentCountry, RiskLevel } from '@/lib/types';
import { useToast } from '@/lib/contexts/ToastContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ChartBarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const AFFECTED_SYSTEMS = [
  'CRM',
  'Payment System',
  'Email Platform',
  'Website',
  'Mobile App',
  'Internal Tools',
  'Order Management',
  'Customer Database',
];

const DATA_CATEGORIES = [
  'Contact Data (name, email, address, phone)',
  'Financial Data (payment, IBAN, credit card)',
  'Authentication Data (passwords, tokens)',
  'Health / Dietary Data',
  'Order & Delivery Data',
  'Behavioral / Usage Data',
  'Special Category Data (Art. 9 GDPR)',
];

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
  const [currentStep, setCurrentStep] = useState(1);
  
  // Get user email for audit trail, fallback to 'system'
  const userEmail = user?.email || 'system';
  
  // Form data
  const [natureOfIncident, setNatureOfIncident] = useState('');
  const [affectedSystems, setAffectedSystems] = useState<string[]>([]);
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [discoveryDate, setDiscoveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [impactStart, setImpactStart] = useState(new Date().toISOString().split('T')[0]);
  const [impactEnd, setImpactEnd] = useState('');
  const [breachTypes, setBreachTypes] = useState<LegalRiskType[]>([]);
  
  // Risk Assessment fields (Step 3)
  const [severity, setSeverity] = useState<'Low' | 'Medium' | 'High' | 'Critical' | ''>('');
  const [dpaNotificationRequired, setDpaNotificationRequired] = useState<'Yes' | 'No' | ''>('');
  const [dpaReferenceNumber, setDpaReferenceNumber] = useState('');
  const [legalReasoningText, setLegalReasoningText] = useState('');
  
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
    setAffectedSystems(prev =>
      prev.includes(system) ? prev.filter(s => s !== system) : [...prev, system]
    );
  }

  function toggleDataCategory(category: string) {
    setDataCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  }

  function toggleBreachType(type: LegalRiskType) {
    setBreachTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
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

  function canProceedToStep2(): boolean {
    return (
      natureOfIncident.trim().length > 0 &&
      affectedSystems.length > 0 &&
      dataCategories.length > 0 &&
      discoveryDate.length > 0 &&
      impactStart.length > 0
    );
  }

  function canProceedToStep3(): boolean {
    // At least one breach type must be selected
    return breachTypes.length > 0;
  }

  function canProceedToStep4(): boolean {
    // Risk Assessment validation
    return (
      severity !== '' &&
      dpaNotificationRequired !== '' &&
      legalReasoningText.trim().length > 0
    );
  }

  async function handleSubmit() {
    if (!canProceedToStep2() || !canProceedToStep3() || !canProceedToStep4()) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    setSaving(true);
    try {
      const incidentData: Omit<Incident, 'id' | 'incidentId' | 'createdAt' | 'updatedAt'> = {
        natureOfIncident,
        affectedSystems,
        dataCategories,
        impactPeriod: {
          start: new Date(impactStart),
          end: impactEnd ? new Date(impactEnd) : undefined,
        },
        discoveryDate: new Date(discoveryDate),
        breachTypes: breachTypes,
        countryImpact,
        status: 'Reporting',
        createdBy: userEmail,
        // Risk Assessment fields
        riskAssessment: severity as RiskLevel,
        legalReasoning: legalReasoningText,
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

          {/* Progress Indicator */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                Step 1
              </span>
              <span className={`text-sm font-medium ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                Step 2
              </span>
              <span className={`text-sm font-medium ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                Step 3
              </span>
              <span className={`text-sm font-medium ${currentStep >= 4 ? 'text-blue-600' : 'text-gray-400'}`}>
                Step 4
              </span>
            </div>
            <div className="relative">
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-600">Summary</span>
              <span className="text-xs text-gray-600">Impact</span>
              <span className="text-xs text-gray-600">Risk</span>
              <span className="text-xs text-gray-600">Review</span>
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
                  Nature of Incident *
                </label>
                <textarea
                  value={natureOfIncident}
                  onChange={(e) => setNatureOfIncident(e.target.value)}
                  placeholder="Brief description (max 200 chars)"
                  maxLength={200}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {natureOfIncident.length}/200 characters
                </div>
              </div>

              {/* Affected Systems */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Affected Systems * (Multi-Select)
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
              </div>

              {/* Data Categories Affected */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Categories Affected * (Multi-Select)
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
                  Breach Types * (Multi-Select)
                </label>
                <div className="space-y-2">
                  {(['Loss of Availability', 'Loss of Confidentiality', 'Loss of Integrity'] as LegalRiskType[]).map((risk) => (
                    <label key={risk} className="flex items-center">
                      <input
                        type="checkbox"
                        value={risk}
                        checked={breachTypes.includes(risk)}
                        onChange={() => toggleBreachType(risk)}
                        className="mr-2 text-blue-600 focus:ring-blue-500 rounded"
                      />
                      {risk}
                    </label>
                  ))}
                </div>
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
                        <>
                          {/* Group Header */}
                          <tr key={`group-${groupName}`} className="bg-gray-50">
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
                        </>
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

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!canProceedToStep3()}
                  className={`px-6 py-3 font-semibold rounded-lg ${
                    canProceedToStep3()
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Next: Risk Assessment →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Risk Assessment */}
          {currentStep === 3 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
                Risk Assessment
              </h2>

              {/* Severity Dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity Level *
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select severity...</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              {/* DPA Notification Required */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DPA Notification Required? *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="dpaNotification"
                      value="Yes"
                      checked={dpaNotificationRequired === 'Yes'}
                      onChange={(e) => setDpaNotificationRequired(e.target.value as 'Yes')}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="dpaNotification"
                      value="No"
                      checked={dpaNotificationRequired === 'No'}
                      onChange={(e) => setDpaNotificationRequired(e.target.value as 'No')}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    No
                  </label>
                </div>
              </div>

              {/* DPA Reference Number (conditional) */}
              {dpaNotificationRequired === 'Yes' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    DPA Reference Number (optional)
                  </label>
                  <input
                    type="text"
                    value={dpaReferenceNumber}
                    onChange={(e) => setDpaReferenceNumber(e.target.value)}
                    placeholder="Can be filled later if not yet available"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Legal Reasoning */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Legal Reasoning *
                </label>
                <textarea
                  value={legalReasoningText}
                  onChange={(e) => setLegalReasoningText(e.target.value)}
                  placeholder="Document the basis for the notification decision (Art. 33 GDPR considerations, risk to rights and freedoms of data subjects, etc.)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={5}
                />
              </div>

              {/* Helper Link */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-900">
                    <strong>Need help deciding?</strong> Consult the{' '}
                    <a 
                      href="https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/personal-data-breaches/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Art. 33 Decision Tree
                    </a>
                    {' '}for guidance on notification requirements.
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  disabled={!canProceedToStep4()}
                  className={`px-6 py-3 font-semibold rounded-lg ${
                    canProceedToStep4()
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Next: Review →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Review & Submit
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <div className="text-sm font-medium text-gray-700">Nature of Incident:</div>
                  <div className="text-gray-900">{natureOfIncident}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Affected Systems:</div>
                  <div className="text-gray-900">{affectedSystems.join(', ')}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Data Categories Affected:</div>
                  <div className="text-gray-900">{dataCategories.join(', ')}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Discovery Date:</div>
                  <div className="text-gray-900">{new Date(discoveryDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Breach Types:</div>
                  <div className="text-gray-900">{breachTypes.join(', ')}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Total Impacted:</div>
                  <div className="text-gray-900 text-2xl font-bold">{totalImpacted.toLocaleString()} customers</div>
                </div>
                
                {/* Risk Assessment Summary */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-700 mb-2">Risk Assessment:</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Severity:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        severity === 'Critical' ? 'bg-red-100 text-red-800' :
                        severity === 'High' ? 'bg-orange-100 text-orange-800' :
                        severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {severity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">DPA Notification:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        dpaNotificationRequired === 'Yes' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {dpaNotificationRequired}
                      </span>
                    </div>
                    {dpaNotificationRequired === 'Yes' && dpaReferenceNumber && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">DPA Reference:</span>
                        <span className="text-sm text-gray-900">{dpaReferenceNumber}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-gray-600">Legal Reasoning:</span>
                      <div className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                        {legalReasoningText}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="text-sm text-blue-900">
                  <strong className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Next Steps:
                  </strong> After creating this incident, it will be assigned status "Reporting". 
                  You can then proceed to Investigation phase to add root cause analysis.
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className={`px-6 py-3 font-semibold rounded-lg ${
                    saving
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {saving ? 'Creating...' : 'Create Incident'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
