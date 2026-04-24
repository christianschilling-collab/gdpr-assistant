'use client';

import { Fragment, useEffect, useState } from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { updateIncident, autoCalculateRisk } from '@/lib/firebase/incidents';
import { useToast } from '@/lib/contexts/ToastContext';
import type {
  CountryImpact,
  Incident,
  IncidentCountry,
  LegalRiskType,
  NotificationDecision,
} from '@/lib/types';
import { INCIDENT_COUNTRY_GROUPS, normalizeCountryImpact } from '@/lib/constants/incidentCountryImpact';

const CIA_BREACH_TYPES: readonly LegalRiskType[] = [
  'Loss of Availability',
  'Loss of Confidentiality',
  'Loss of Integrity',
  'Other / not solely CIA',
] as const;

const NOTIFICATION_OPTIONS: { value: NotificationDecision; label: string }[] = [
  { value: 'under_review', label: 'Under review' },
  { value: 'notify_authority', label: 'Supervisory authority must be notified' },
  { value: 'no_action', label: 'No authority notification required' },
];

type Props = {
  incident: Incident;
  userEmail: string;
  onUpdated: () => Promise<void>;
};

export function ImpactAnalysisSection({ incident, userEmail, onUpdated }: Props) {
  const { addToast } = useToast();
  const [breachTypes, setBreachTypes] = useState<LegalRiskType[]>([]);
  const [breachOtherDetails, setBreachOtherDetails] = useState('');
  const [countryImpact, setCountryImpact] = useState<CountryImpact[]>([]);
  const [notificationDecision, setNotificationDecision] = useState<NotificationDecision | ''>('');
  const [legalReasoning, setLegalReasoning] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setBreachTypes(incident.breachTypes ?? []);
    setBreachOtherDetails(incident.breachOtherDetails ?? '');
    setCountryImpact(normalizeCountryImpact(incident.countryImpact));
    setNotificationDecision(incident.notificationDecision ?? '');
    setLegalReasoning(incident.legalReasoning ?? '');
    setDirty(false);
  }, [incident.id, incident.updatedAt]);

  function toggleBreachType(type: LegalRiskType) {
    setDirty(true);
    setBreachTypes((prev) => {
      if (prev.includes(type)) {
        if (type === 'Other / not solely CIA') setBreachOtherDetails('');
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  }

  function updateCountryImpact(
    country: IncidentCountry,
    field: 'impactedVolume' | 'complaintsReceived',
    value: number
  ) {
    setDirty(true);
    setCountryImpact((prev) =>
      prev.map((c) => {
        if (c.country !== country) return c;
        const updated = { ...c, [field]: value };
        if (field === 'impactedVolume') {
          updated.riskLevel = autoCalculateRisk(value);
        }
        return updated;
      })
    );
  }

  const totalImpacted = countryImpact.reduce((s, c) => s + (c.impactedVolume ?? 0), 0);

  async function handleSave() {
    if (breachTypes.includes('Other / not solely CIA') && breachOtherDetails.trim().length < 10) {
      return;
    }
    setSaving(true);
    try {
      await updateIncident(
        incident.id,
        {
          breachTypes: breachTypes.length ? breachTypes : [],
          breachOtherDetails: breachTypes.includes('Other / not solely CIA')
            ? breachOtherDetails.trim()
            : '',
          countryImpact,
          ...(notificationDecision ? { notificationDecision } : {}),
          legalReasoning: legalReasoning.trim(),
        },
        userEmail
      );
      setDirty(false);
      await onUpdated();
      addToast('Impact analysis saved', 'success');
    } catch (e) {
      console.error(e);
      addToast('Could not save impact analysis', 'error');
    } finally {
      setSaving(false);
    }
  }

  const ciaOtherInvalid =
    breachTypes.includes('Other / not solely CIA') && breachOtherDetails.trim().length < 10;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 text-xl font-bold text-gray-900">
        <ChartBarIcon className="h-6 w-6 shrink-0 text-blue-600" />
        Impact analysis
      </h2>
      <p className="mb-6 text-sm leading-relaxed text-gray-600">
        Legal and DPO record the formal breach characterisation (CIA), per-country volumes, and the supervisory
        authority notification decision. Intake scenario tags stay in the executive summary above.
      </p>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Breach characterisation (CIA) — multi-select
        </label>
        <p className="mb-3 text-xs leading-relaxed text-gray-600">
          Map the incident to the CIA triad where possible. Use <strong>Other</strong> for mixed or unclear early
          facts.
        </p>
        <div className="space-y-2">
          {CIA_BREACH_TYPES.map((risk) => (
            <label key={risk} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={breachTypes.includes(risk)}
                onChange={() => toggleBreachType(risk)}
                className="mt-1 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>{risk}</span>
            </label>
          ))}
        </div>
        {breachTypes.includes('Other / not solely CIA') && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Describe “Other” * (min. 10 characters)
            </label>
            <textarea
              value={breachOtherDetails}
              onChange={(e) => {
                setDirty(true);
                setBreachOtherDetails(e.target.value);
              }}
              placeholder="What happened and why it is not covered by the three types above?"
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-700">Country-specific impact</label>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border-b px-4 py-2 text-left text-sm font-medium text-gray-700">Country</th>
                <th className="border-b px-4 py-2 text-left text-sm font-medium text-gray-700">Impacted volume</th>
                <th className="border-b px-4 py-2 text-left text-sm font-medium text-gray-700">Complaints</th>
                <th className="border-b px-4 py-2 text-left text-sm font-medium text-gray-700">Risk</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(INCIDENT_COUNTRY_GROUPS).map(([groupName, countries]) => (
                <Fragment key={groupName}>
                  <tr className="bg-gray-50">
                    <td
                      colSpan={4}
                      className="border-t-2 border-gray-300 px-4 py-2 text-xs font-bold uppercase text-gray-600"
                    >
                      {groupName}
                    </td>
                  </tr>
                  {countries.map((c) => {
                    const impactData = countryImpact.find((ci) => ci.country === c.code);
                    if (!impactData) return null;
                    return (
                      <tr key={c.code} className="hover:bg-gray-50">
                        <td className="border-b px-4 py-2 font-medium">
                          {c.flag} {c.name}
                        </td>
                        <td className="border-b px-4 py-2">
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={impactData.impactedVolume || ''}
                            onChange={(e) =>
                              updateCountryImpact(c.code, 'impactedVolume', parseInt(e.target.value, 10) || 0)
                            }
                            className="w-full rounded border border-gray-300 px-2 py-1"
                          />
                        </td>
                        <td className="border-b px-4 py-2">
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={impactData.complaintsReceived || ''}
                            onChange={(e) =>
                              updateCountryImpact(c.code, 'complaintsReceived', parseInt(e.target.value, 10) || 0)
                            }
                            className="w-full rounded border border-gray-300 px-2 py-1"
                          />
                        </td>
                        <td className="border-b px-4 py-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              impactData.riskLevel === 'High'
                                ? 'bg-red-100 text-red-800'
                                : impactData.riskLevel === 'Medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : impactData.riskLevel === 'Critical'
                                    ? 'bg-red-200 text-red-900'
                                    : 'bg-green-100 text-green-800'
                            }`}
                          >
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
        <div className="mt-4 rounded-lg bg-gray-50 p-4">
          <div className="text-lg font-bold text-gray-900">
            Total impacted: {totalImpacted.toLocaleString()} (reporting units)
          </div>
        </div>
      </div>

      <div className="mb-6 border-t border-gray-200 pt-6">
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Supervisory authority (Art. 33 / 34)</h3>
        <label className="mb-2 block text-sm font-medium text-gray-700">Notification decision</label>
        <select
          value={notificationDecision}
          onChange={(e) => {
            setDirty(true);
            setNotificationDecision((e.target.value || '') as NotificationDecision | '');
          }}
          className="mb-4 w-full max-w-xl rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Not recorded yet</option>
          {NOTIFICATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Legal reasoning (why notify or why not)
        </label>
        <textarea
          value={legalReasoning}
          onChange={(e) => {
            setDirty(true);
            setLegalReasoning(e.target.value);
          }}
          rows={6}
          placeholder="Record the assessment, including why the authority was informed or why notification is not required…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || ciaOtherInvalid}
          className={`rounded-lg px-6 py-2.5 text-sm font-semibold text-white ${
            saving || ciaOtherInvalid ? 'cursor-not-allowed bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {saving ? 'Saving…' : 'Save impact analysis'}
        </button>
        {dirty && !saving && (
          <span className="text-xs text-amber-700">You have unsaved changes.</span>
        )}
        {ciaOtherInvalid && (
          <span className="text-xs text-red-600">“Other” needs at least 10 characters.</span>
        )}
      </div>
    </div>
  );
}
