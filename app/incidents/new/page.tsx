'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createIncident } from '@/lib/firebase/incidents';
import type { Incident, IncidentScenarioTagId } from '@/lib/types';
import { useToast } from '@/lib/contexts/ToastContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { emptyCountryImpactRows } from '@/lib/constants/incidentCountryImpact';
import { INCIDENT_SCENARIO_TAG_DEFS } from '@/lib/constants/incidentScenarioTags';
import { INCIDENT_INTAKE_MARKETS } from '@/lib/constants/incidentIntakeMarkets';

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

export default function NewIncidentPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const userEmail = user?.email || 'system';

  const [natureOfIncident, setNatureOfIncident] = useState('');
  const [additionalDescription, setAdditionalDescription] = useState('');
  const [affectedMarkets, setAffectedMarkets] = useState<string[]>([]);
  const [scenarioTags, setScenarioTags] = useState<IncidentScenarioTagId[]>([]);
  const [affectedSystems, setAffectedSystems] = useState<string[]>([]);
  const [otherSystemDetail, setOtherSystemDetail] = useState('');
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [otherDataCategoryDetail, setOtherDataCategoryDetail] = useState('');
  const [discoveryDate, setDiscoveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [impactStart, setImpactStart] = useState(new Date().toISOString().split('T')[0]);
  const [impactEnd, setImpactEnd] = useState('');

  function toggleMarket(market: string) {
    setAffectedMarkets((prev) =>
      prev.includes(market) ? prev.filter((m) => m !== market) : [...prev, market]
    );
  }

  function toggleScenarioTag(id: IncidentScenarioTagId) {
    setScenarioTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

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

  function canSubmit(): boolean {
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
    const marketsOk = affectedMarkets.length > 0;
    const scenarioOk = scenarioTags.length > 0;
    return (
      natureOk &&
      systemsOk &&
      categoriesOk &&
      marketsOk &&
      scenarioOk &&
      discoveryDate.length > 0 &&
      impactStart.length > 0
    );
  }

  async function handleSubmit() {
    if (!canSubmit()) {
      addToast(
        'Please complete all required fields: summary, markets, scenario type(s), systems, data categories, and dates.',
        'error'
      );
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
        affectedMarkets: [...affectedMarkets],
        scenarioTags: [...scenarioTags],
        affectedSystems: systemsSaved,
        dataCategories: categoriesSaved,
        impactPeriod: {
          start: new Date(impactStart),
          end: impactEnd ? new Date(impactEnd) : undefined,
        },
        discoveryDate: new Date(discoveryDate),
        countryImpact: emptyCountryImpactRows(),
        status: 'Reporting',
        createdBy: userEmail,
      };

      const id = await createIncident(incidentData);

      if (!id) {
        throw new Error('Failed to create incident - no ID returned');
      }

      addToast('Incident created successfully!', 'success');
      await new Promise((resolve) => setTimeout(resolve, 500));
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
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create new incident</h1>
              <p className="mt-2 text-gray-600">
                Record the case first. Impact analysis (CIA, countries, authority decision) is completed in the
                incident after creation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/incidents')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-bold text-gray-900">Intake</h2>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Short summary / headline *
              </label>
              <textarea
                value={natureOfIncident}
                onChange={(e) => setNatureOfIncident(e.target.value)}
                placeholder="Concise title for lists and dashboards (add detail below if needed)."
                maxLength={NATURE_MAX}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
              <div className="mt-1 text-xs text-gray-500">
                {natureOfIncident.length}/{NATURE_MAX} characters
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">Further details (optional)</label>
              <p className="mb-2 text-xs text-gray-500">
                Timeline, links, who reported, technical context — anything you already know.
              </p>
              <textarea
                value={additionalDescription}
                onChange={(e) => setAdditionalDescription(e.target.value)}
                placeholder="Optional longer description…"
                maxLength={ADDITIONAL_MAX}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                rows={8}
              />
              <div className="mt-1 text-xs text-gray-500">
                {additionalDescription.length}/{ADDITIONAL_MAX} characters
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Affected markets / regions * (multi-select)
              </label>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {INCIDENT_INTAKE_MARKETS.map((market) => (
                  <button
                    key={market}
                    type="button"
                    onClick={() => toggleMarket(market)}
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                      affectedMarkets.includes(market)
                        ? 'border-blue-600 bg-blue-100 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {affectedMarkets.includes(market) && '✓ '}
                    {market}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                What happened? * (scenario keywords — multi-select)
              </label>
              <p className="mb-3 text-xs text-gray-600">
                These tags appear on the incident and on the board so cases are easy to tell apart (not only “data
                breach”).
              </p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {INCIDENT_SCENARIO_TAG_DEFS.map((def) => (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => toggleScenarioTag(def.id)}
                    className={`rounded-lg border-2 px-4 py-2 text-left text-sm font-medium transition-all ${
                      scenarioTags.includes(def.id)
                        ? 'border-amber-600 bg-amber-50 text-amber-950'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-amber-300'
                    }`}
                  >
                    {scenarioTags.includes(def.id) && '✓ '}
                    <span className="font-semibold">{def.labelEn}</span>
                    <span className="mt-0.5 block text-xs font-normal text-gray-600">{def.labelDe}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Affected systems * (multi-select)
              </label>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {AFFECTED_SYSTEMS.map((system) => (
                  <button
                    key={system}
                    type="button"
                    onClick={() => toggleSystem(system)}
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                      affectedSystems.includes(system)
                        ? 'border-blue-600 bg-blue-100 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {affectedSystems.includes(system) && '✓ '}
                    {system}
                  </button>
                ))}
              </div>
              {affectedSystems.includes(OTHER_CHOICE) && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Describe “Other” *</label>
                  <input
                    type="text"
                    value={otherSystemDetail}
                    onChange={(e) => setOtherSystemDetail(e.target.value)}
                    placeholder="e.g. vendor ticketing tool, warehouse scanner app…"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Data categories possibly involved * (multi-select)
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {DATA_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleDataCategory(category)}
                    className={`rounded-lg border-2 px-4 py-2 text-left text-sm font-medium transition-all ${
                      dataCategories.includes(category)
                        ? 'border-blue-600 bg-blue-100 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {dataCategories.includes(category) && '✓ '}
                    {category}
                  </button>
                ))}
              </div>
              {dataCategories.includes(OTHER_CHOICE) && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Describe “Other” *</label>
                  <input
                    type="text"
                    value={otherDataCategoryDetail}
                    onChange={(e) => setOtherDataCategoryDetail(e.target.value)}
                    placeholder="e.g. employee IDs, CCTV metadata…"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">Discovery date *</label>
              <input
                type="date"
                value={discoveryDate}
                onChange={(e) => setDiscoveryDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">Impact period *</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-600">From</label>
                  <input
                    type="date"
                    value={impactStart}
                    onChange={(e) => setImpactStart(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600">To (optional)</label>
                  <input
                    type="date"
                    value={impactEnd}
                    onChange={(e) => setImpactEnd(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-100 pt-6">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!canSubmit() || saving}
                className={`rounded-lg px-6 py-3 font-semibold ${
                  canSubmit() && !saving
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'cursor-not-allowed bg-gray-300 text-gray-500'
                }`}
              >
                {saving ? 'Creating…' : 'Create incident'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
