'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { upsertWeeklyReport } from '@/lib/firebase/weeklyReports';
import type { WeeklyReport, WeeklyReportActivityItem } from '@/lib/types';
import { ACTIVITY_LOG_KINDS, ACTIVITY_KIND_LABELS } from '@/lib/types';
import { useToast } from '@/lib/contexts/ToastContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { LoginButton } from '@/components/LoginButton';
import {
  normalizeWeeklyReportOptionalText,
  parseWeeklyReportCount,
} from '@/lib/reporting/weekReportNormalize';

const MARKETS: WeeklyReport['market'][] = ['DACH', 'NL', 'France', 'Be / Lux', 'Nordics'];

function defaultWeekOfIso(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function parseWeekOfFromInput(isoDate: string): Date {
  const [y, m, day] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, day, 12, 0, 0, 0);
}

export default function WeeklyReportSubmitPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [market, setMarket] = useState<WeeklyReport['market']>('DACH');
  const [weekOfIso, setWeekOfIso] = useState(defaultWeekOfIso);
  const [yourName, setYourName] = useState('');

  const [deletionRequests, setDeletionRequests] = useState(0);
  const [portabilityRequests, setPortabilityRequests] = useState(0);
  const [legalEscalations, setLegalEscalations] = useState(0);
  const [regulatorInquiries, setRegulatorInquiries] = useState(0);
  const [privacyIncidents, setPrivacyIncidents] = useState(0);

  const [riskStatus, setRiskStatus] = useState<'green' | 'yellow' | 'red'>('green');
  const [riskExplanation, setRiskExplanation] = useState('');

  const emptyActivityRow = (): WeeklyReportActivityItem => ({
    kind: 'observation',
    title: '',
    description: '',
  });
  const [activityItems, setActivityItems] = useState<WeeklyReportActivityItem[]>([emptyActivityRow()]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fromProfile = user.displayName?.trim();
    const fromEmail = user.email?.split('@')[0]?.replace(/\./g, ' ');
    setYourName(prev => (prev.trim() ? prev : fromProfile || fromEmail || ''));
  }, [user]);

  const weekOfDate = useMemo(() => parseWeekOfFromInput(weekOfIso), [weekOfIso]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      showToast('Please sign in to submit.', 'warning');
      return;
    }

    if (riskStatus !== 'green' && !normalizeWeeklyReportOptionalText(riskExplanation)) {
      showToast('Please explain why the market is yellow or red.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const filledItems = activityItems.filter(
        row => row.title.trim() || row.description.trim()
      );

      const payload: Omit<WeeklyReport, 'id' | 'createdAt' | 'updatedAt'> = {
        market,
        weekOf: weekOfDate,
        yourName: normalizeWeeklyReportOptionalText(yourName) ?? '',
        deletionRequests,
        portabilityRequests,
        currentBacklog: 0,
        legalEscalations,
        regulatorInquiries,
        privacyIncidents,
        complaints: 0,
        crossFunctionalCases: 0,
        noteworthyEdgeCases: 0,
        riskStatus,
        riskExplanation: normalizeWeeklyReportOptionalText(riskExplanation),
        ...(filledItems.length > 0 ? { activityItems: filledItems } : {}),
      };

      const { created } = await upsertWeeklyReport(payload);
      showToast(
        created ? 'Weekly report saved (new entry).' : 'Weekly report updated (same market & week).',
        'success'
      );
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Could not save report.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900">Weekly market report</h1>
          <p className="text-gray-600 mt-2 text-sm">Sign in with your HelloFresh account to submit numbers for your market.</p>
          <div className="mt-6 flex justify-center">
            <LoginButton />
          </div>
          <Link href="/reporting" className="inline-block mt-6 text-sm text-emerald-700 hover:underline">
            View public reporting dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-16">
      <div className="mb-8">
        <p className="text-sm text-emerald-800 font-medium">
          <Link href="/reporting" className="hover:underline">
            Reporting
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span>Submit weekly data</span>
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Submit weekly market report</h1>
        <p className="text-gray-600 mt-2 text-sm leading-relaxed">
          Use the same <strong>week-of</strong> date as in the Google Sheet (usually the Monday of that week). Submitting again
          for the same market and week <strong>updates</strong> the existing row and refreshes linked activity highlights.
        </p>
        <p className="text-gray-500 mt-2 text-xs leading-relaxed">
          Request volumes and risk feed the dashboard. Use <strong>activity rows</strong> below for structured notes (type,
          optional title, description) — they appear grouped in the report and monthly GDPR email.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">Week &amp; market</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Market</label>
              <select
                value={market}
                onChange={e => setMarket(e.target.value as WeeklyReport['market'])}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {MARKETS.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Week of (date)</label>
              <input
                type="date"
                required
                value={weekOfIso}
                onChange={e => setWeekOfIso(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Your name (optional)</label>
              <input
                type="text"
                value={yourName}
                onChange={e => setYourName(e.target.value)}
                placeholder="Shown in reporting metadata"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">Volumes</h2>
          <p className="text-xs text-gray-500 -mt-2">
            These five counts roll up into the monthly summary and risk view (same as the spreadsheet columns you already use).
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {(
              [
                ['Deletion requests', deletionRequests, setDeletionRequests],
                ['Portability / access requests', portabilityRequests, setPortabilityRequests],
                ['Legal escalations', legalEscalations, setLegalEscalations],
                ['Regulator inquiries', regulatorInquiries, setRegulatorInquiries],
                ['Privacy incidents', privacyIncidents, setPrivacyIncidents],
              ] as const
            ).map(([label, val, setVal]) => (
              <div key={label}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={val}
                  onChange={e => setVal(parseWeeklyReportCount(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">Risk status</h2>
          <div className="flex flex-wrap gap-4">
            {(['green', 'yellow', 'red'] as const).map(s => (
              <label key={s} className="inline-flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" name="risk" checked={riskStatus === s} onChange={() => setRiskStatus(s)} />
                <span className="capitalize">{s}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              If yellow or red — explain <span className="text-red-600">*</span>
            </label>
            <textarea
              value={riskExplanation}
              onChange={e => setRiskExplanation(e.target.value)}
              rows={3}
              placeholder="Required when status is not green"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">
            Activity notes (optional)
          </h2>
          <p className="text-xs text-gray-500 -mt-2">
            Add a row per topic. <strong>Type</strong> controls where it appears (wins &amp; initiatives vs complaints &amp;
            incidents). <strong>Title</strong> is optional; <strong>description</strong> is the main text.
          </p>

          <div className="space-y-4">
            {activityItems.map((row, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/50"
              >
                <div className="flex flex-wrap gap-3 items-end justify-between">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Classification</label>
                    <select
                      value={row.kind}
                      onChange={e =>
                        setActivityItems(prev =>
                          prev.map((r, i) =>
                            i === idx ? { ...r, kind: e.target.value as WeeklyReportActivityItem['kind'] } : r
                          )
                        )
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    >
                      {ACTIVITY_LOG_KINDS.map(k => (
                        <option key={k} value={k}>
                          {ACTIVITY_KIND_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setActivityItems(prev =>
                        prev.length <= 1 ? [emptyActivityRow()] : prev.filter((_, i) => i !== idx)
                      )
                    }
                    className="text-sm text-red-700 hover:underline px-2 py-1"
                  >
                    Remove row
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                  <input
                    type="text"
                    value={row.title}
                    onChange={e =>
                      setActivityItems(prev =>
                        prev.map((r, i) => (i === idx ? { ...r, title: e.target.value } : r))
                      )
                    }
                    placeholder="Short headline, e.g. IBAN mix-up"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={row.description}
                    onChange={e =>
                      setActivityItems(prev =>
                        prev.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r))
                      )
                    }
                    rows={3}
                    placeholder="Context, status, links…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setActivityItems(prev => [...prev, emptyActivityRow()])}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            + Add another row
          </button>
        </section>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : 'Save weekly report'}
          </button>
          <Link href="/reporting" className="text-sm text-gray-600 hover:text-emerald-700 hover:underline">
            View dashboard
          </Link>
        </div>
      </form>
    </div>
  );
}
