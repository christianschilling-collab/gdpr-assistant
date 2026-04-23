'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import {
  getWeeklyReports,
  getWeeklyReport,
  upsertWeeklyReport,
  getActivityLog,
  updateActivityLogEntry,
  deleteActivityLogEntry,
  deleteWeeklyReport,
  deleteActivityLogForReport,
} from '@/lib/firebase/weeklyReports';
import type { WeeklyReport, WeeklyReportActivityItem, ActivityLogEntry, ActivityLogKind } from '@/lib/types';
import { ACTIVITY_LOG_KINDS, ACTIVITY_KIND_LABELS } from '@/lib/types';
import {
  normalizeWeeklyReportOptionalText,
  parseWeeklyReportCount,
} from '@/lib/reporting/weekReportNormalize';
import { resolveActivityKind, activityKindBadgeClass } from '@/lib/reporting/activityLogKinds';
import { REPORT_MARKETS, reportMatchesChartMarket, type ReportMarketKey } from '@/lib/reporting/yearAggregates';

function emptyRow(): WeeklyReportActivityItem {
  return { kind: 'observation', title: '', description: '' };
}

function formatWeek(d: Date): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export default function AdminReportingEditPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [year, setYear] = useState(new Date().getFullYear());
  const [editMarket, setEditMarket] = useState<'all' | ReportMarketKey>('all');
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [weeklyModal, setWeeklyModal] = useState<WeeklyReport | null>(null);
  const [savingWeekly, setSavingWeekly] = useState(false);

  const [activityModal, setActivityModal] = useState<ActivityLogEntry | null>(null);
  const [savingActivity, setSavingActivity] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, a] = await Promise.all([getWeeklyReports(), getActivityLog()]);
      setReports(r);
      setActivity(a);
    } catch (e) {
      console.error(e);
      showToast('Could not load data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const reportsYear = useMemo(
    () => reports.filter(rep => new Date(rep.weekOf).getFullYear() === year),
    [reports, year]
  );

  const activityYear = useMemo(
    () => activity.filter(e => new Date(e.weekOf).getFullYear() === year),
    [activity, year]
  );

  const reportsYearFiltered = useMemo(() => {
    if (editMarket === 'all') return reportsYear;
    return reportsYear.filter(r => reportMatchesChartMarket(r, editMarket));
  }, [reportsYear, editMarket]);

  const activityYearFiltered = useMemo(() => {
    if (editMarket === 'all') return activityYear;
    return activityYear.filter(e => reportMatchesChartMarket(e, editMarket));
  }, [activityYear, editMarket]);

  async function openWeeklyEdit(id: string) {
    try {
      const r = await getWeeklyReport(id);
      if (!r) {
        showToast('Report not found.', 'error');
        return;
      }
      setWeeklyModal(r);
    } catch (e) {
      showToast('Could not load report.', 'error');
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <h1 className="text-xl font-bold text-gray-900">Admin only</h1>
        <p className="text-gray-600 mt-2">You need admin access to edit reporting data.</p>
        <Link href="/reporting" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to reporting
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-20">
      <p className="text-sm text-gray-500 mb-2">
        <Link href="/admin" className="text-blue-600 hover:underline">
          Admin
        </Link>
        <span className="mx-2">/</span>
        <span>Reporting data</span>
      </p>
      <h1 className="text-2xl font-bold text-gray-900">Edit weekly reports &amp; activity log</h1>
      <p className="text-gray-600 mt-2 text-sm max-w-3xl">
        Correct numbers, risk text, structured activity rows, or legacy narrative fields. Saving a weekly report runs the
        same upsert as the team form (activity log lines for that market/week are rebuilt). Activity-line edits below change
        only that Firestore document.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700">
          Year filter
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="ml-2 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {[0, 1, 2].map(off => {
              const y = new Date().getFullYear() - off;
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              );
            })}
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700">
          Market filter
          <select
            value={editMarket}
            onChange={e => setEditMarket(e.target.value as 'all' | ReportMarketKey)}
            className="ml-2 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All markets</option>
            {REPORT_MARKETS.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="text-sm px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
        <Link href="/reporting" className="text-sm text-blue-600 hover:underline">
          Reporting dashboard
        </Link>
      </div>

      {loading ? (
        <p className="mt-8 text-gray-500">Loading…</p>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Weekly reports ({reportsYearFiltered.length}
              {editMarket !== 'all' ? ` · ${editMarket} only` : ''})
            </h2>
            <div className="border border-gray-200 rounded-lg overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3">Market</th>
                    <th className="text-left py-2 px-3">Week of</th>
                    <th className="text-right py-2 px-3">Del</th>
                    <th className="text-right py-2 px-3">Port</th>
                    <th className="text-center py-2 px-3">Risk</th>
                    <th className="text-left py-2 px-3">id</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsYearFiltered
                    .slice()
                    .sort((a, b) => new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime())
                    .map(r => (
                      <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium">{r.market}</td>
                        <td className="py-2 px-3 whitespace-nowrap">{formatWeek(r.weekOf)}</td>
                        <td className="py-2 px-3 text-right">{r.deletionRequests}</td>
                        <td className="py-2 px-3 text-right">{r.portabilityRequests}</td>
                        <td className="py-2 px-3 text-center">{r.riskStatus}</td>
                        <td className="py-2 px-3 font-mono text-xs text-gray-500 max-w-[140px] truncate">{r.id}</td>
                        <td className="py-2 px-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => void openWeeklyEdit(r.id)}
                            className="text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                !confirm(
                                  `Weekly report ${r.market} · ${formatWeek(r.weekOf)} wirklich löschen? Alle zugehörigen Activity-Log-Zeilen dieser Woche werden mit entfernt.`
                                )
                              ) {
                                return;
                              }
                              void (async () => {
                                try {
                                  await deleteActivityLogForReport(r.market, new Date(r.weekOf));
                                  await deleteWeeklyReport(r.id);
                                  showToast('Weekly report gelöscht.', 'success');
                                  await load();
                                } catch (e) {
                                  console.error(e);
                                  showToast(e instanceof Error ? e.message : 'Löschen fehlgeschlagen', 'error');
                                }
                              })();
                            }}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Activity log lines ({activityYearFiltered.length}
              {editMarket !== 'all' ? ` · ${editMarket} only` : ''})
            </h2>
            <div className="border border-gray-200 rounded-lg overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3">Date</th>
                    <th className="text-left py-2 px-3">Market</th>
                    <th className="text-left py-2 px-3">Kind</th>
                    <th className="text-left py-2 px-3">Title</th>
                    <th className="text-left py-2 px-3">Details</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activityYearFiltered
                    .slice()
                    .sort((a, b) => new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime())
                    .map(e => (
                      <tr key={e.id} className="border-t border-gray-100 align-top hover:bg-gray-50">
                        <td className="py-2 px-3 whitespace-nowrap">{formatWeek(e.weekOf)}</td>
                        <td className="py-2 px-3">{e.market}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${activityKindBadgeClass(resolveActivityKind(e))}`}
                          >
                            {ACTIVITY_KIND_LABELS[resolveActivityKind(e)]}
                          </span>
                        </td>
                        <td className="py-2 px-3 max-w-[160px] truncate">{e.title || '—'}</td>
                        <td className="py-2 px-3 max-w-md text-gray-700 line-clamp-2">{e.details}</td>
                        <td className="py-2 px-3 text-right space-x-2 whitespace-nowrap">
                          <button type="button" onClick={() => setActivityModal(e)} className="text-blue-600 hover:underline">
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!confirm('Diese Activity-Log-Zeile dauerhaft löschen?')) return;
                              void (async () => {
                                try {
                                  await deleteActivityLogEntry(e.id);
                                  showToast('Zeile gelöscht.', 'success');
                                  await load();
                                } catch (err) {
                                  console.error(err);
                                  showToast(err instanceof Error ? err.message : 'Löschen fehlgeschlagen', 'error');
                                }
                              })();
                            }}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {weeklyModal && (
        <WeeklyEditModal
          report={weeklyModal}
          onClose={() => setWeeklyModal(null)}
          saving={savingWeekly}
          setSaving={setSavingWeekly}
          onSaved={() => {
            showToast('Weekly report saved.', 'success');
            setWeeklyModal(null);
            void load();
          }}
          showToast={showToast}
        />
      )}

      {activityModal && (
        <ActivityEditModal
          entry={activityModal}
          onClose={() => setActivityModal(null)}
          saving={savingActivity}
          setSaving={setSavingActivity}
          onSaved={() => {
            showToast('Activity line saved.', 'success');
            setActivityModal(null);
            void load();
          }}
          onDeleted={() => {
            showToast('Activity line deleted.', 'success');
            setActivityModal(null);
            void load();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function WeeklyEditModal({
  report,
  onClose,
  saving,
  setSaving,
  onSaved,
  showToast,
}: {
  report: WeeklyReport;
  onClose: () => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onSaved: () => void;
  showToast: (m: string, t?: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const [deletionRequests, setDeletionRequests] = useState(report.deletionRequests);
  const [portabilityRequests, setPortabilityRequests] = useState(report.portabilityRequests);
  const [legalEscalations, setLegalEscalations] = useState(report.legalEscalations);
  const [regulatorInquiries, setRegulatorInquiries] = useState(report.regulatorInquiries);
  const [privacyIncidents, setPrivacyIncidents] = useState(report.privacyIncidents);
  const [riskStatus, setRiskStatus] = useState(report.riskStatus);
  const [riskExplanation, setRiskExplanation] = useState(report.riskExplanation || '');
  const [escalationDetails, setEscalationDetails] = useState(report.escalationDetails || '');
  const [currentInitiatives, setCurrentInitiatives] = useState(report.currentInitiatives || '');
  const [winsGoodNews, setWinsGoodNews] = useState(report.winsGoodNews || '');
  const [activityItems, setActivityItems] = useState<WeeklyReportActivityItem[]>(() =>
    report.activityItems?.length
      ? report.activityItems.map(a => ({ ...a }))
      : [emptyRow()]
  );

  async function save() {
    if (riskStatus !== 'green' && !normalizeWeeklyReportOptionalText(riskExplanation)) {
      showToast('Risk explanation required for yellow/red.', 'warning');
      return;
    }
    const filled = activityItems.filter(i => i.title.trim() || i.description.trim());
    setSaving(true);
    try {
      const payload: Omit<WeeklyReport, 'id' | 'createdAt' | 'updatedAt'> = {
        market: report.market,
        weekOf: new Date(report.weekOf),
        yourName: normalizeWeeklyReportOptionalText(report.yourName) ?? '',
        deletionRequests,
        portabilityRequests,
        currentBacklog: report.currentBacklog ?? 0,
        legalEscalations,
        regulatorInquiries,
        privacyIncidents,
        complaints: report.complaints ?? 0,
        crossFunctionalCases: report.crossFunctionalCases ?? 0,
        noteworthyEdgeCases: report.noteworthyEdgeCases ?? 0,
        riskStatus,
        riskExplanation: normalizeWeeklyReportOptionalText(riskExplanation),
        ...(filled.length > 0
          ? { activityItems: filled }
          : {
              escalationDetails: normalizeWeeklyReportOptionalText(escalationDetails),
              currentInitiatives: normalizeWeeklyReportOptionalText(currentInitiatives),
              winsGoodNews: normalizeWeeklyReportOptionalText(winsGoodNews),
            }),
      };
      await upsertWeeklyReport(payload);
      onSaved();
    } catch (e) {
      console.error(e);
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Edit weekly report</h3>
            <p className="text-sm text-gray-600 mt-1">
              {report.market} · week of {formatWeek(report.weekOf)} · <span className="font-mono text-xs">{report.id}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ['Deletion requests', deletionRequests, setDeletionRequests],
              ['Portability requests', portabilityRequests, setPortabilityRequests],
              ['Legal escalations', legalEscalations, setLegalEscalations],
              ['Regulator inquiries', regulatorInquiries, setRegulatorInquiries],
              ['Privacy incidents', privacyIncidents, setPrivacyIncidents],
            ] as const
          ).map(([label, val, setVal]) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input
                type="number"
                min={0}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                value={val}
                onChange={e => setVal(parseWeeklyReportCount(e.target.value))}
              />
            </div>
          ))}
        </div>

        <div>
          <span className="text-xs font-medium text-gray-600">Risk</span>
          <div className="flex gap-3 mt-1">
            {(['green', 'yellow', 'red'] as const).map(s => (
              <label key={s} className="text-sm inline-flex items-center gap-1">
                <input type="radio" checked={riskStatus === s} onChange={() => setRiskStatus(s)} />
                {s}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Risk explanation</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
            rows={2}
            value={riskExplanation}
            onChange={e => setRiskExplanation(e.target.value)}
          />
        </div>

        <div className="border-t border-gray-200 pt-3">
          <p className="text-xs text-gray-500 mb-2">
            If any activity row has text, structured rows are saved and replace auto-generated log lines for this week.
            Otherwise the three legacy boxes below are used (same as CSV-era behaviour).
          </p>
          {activityItems.map((row, idx) => (
            <div key={idx} className="border border-gray-100 rounded-lg p-3 mb-2 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <select
                  value={row.kind}
                  className="border border-gray-300 rounded text-sm flex-1 min-w-[160px]"
                  onChange={e =>
                    setActivityItems(prev =>
                      prev.map((x, i) =>
                        i === idx ? { ...x, kind: e.target.value as WeeklyReportActivityItem['kind'] } : x
                      )
                    )
                  }
                >
                  {ACTIVITY_LOG_KINDS.map(k => (
                    <option key={k} value={k}>
                      {ACTIVITY_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="text-xs text-red-600"
                  onClick={() =>
                    setActivityItems(prev => (prev.length <= 1 ? [emptyRow()] : prev.filter((_, i) => i !== idx)))
                  }
                >
                  Remove
                </button>
              </div>
              <input
                placeholder="Title (optional)"
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                value={row.title}
                onChange={e =>
                  setActivityItems(prev => prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)))
                }
              />
              <textarea
                placeholder="Description"
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                rows={2}
                value={row.description}
                onChange={e =>
                  setActivityItems(prev => prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))
                }
              />
            </div>
          ))}
          <button type="button" className="text-sm text-blue-600" onClick={() => setActivityItems(p => [...p, emptyRow()])}>
            + Row
          </button>
        </div>

        <div className="border-t border-gray-200 pt-3 space-y-2">
          <p className="text-xs font-semibold text-gray-700">Legacy narrative (used only if no structured rows above)</p>
          <textarea
            placeholder="Escalation details"
            className="w-full border border-gray-300 rounded text-sm"
            rows={2}
            value={escalationDetails}
            onChange={e => setEscalationDetails(e.target.value)}
          />
          <textarea
            placeholder="Current initiatives"
            className="w-full border border-gray-300 rounded text-sm"
            rows={2}
            value={currentInitiatives}
            onChange={e => setCurrentInitiatives(e.target.value)}
          />
          <textarea
            placeholder="Wins / good news"
            className="w-full border border-gray-300 rounded text-sm"
            rows={2}
            value={winsGoodNews}
            onChange={e => setWinsGoodNews(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save & rebuild activity log'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityEditModal({
  entry,
  onClose,
  saving,
  setSaving,
  onSaved,
  onDeleted,
  showToast,
}: {
  entry: ActivityLogEntry;
  onClose: () => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onSaved: () => void;
  onDeleted: () => void;
  showToast: (m: string, t?: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const [title, setTitle] = useState(entry.title || '');
  const [details, setDetails] = useState(entry.details || '');
  const [kind, setKind] = useState<ActivityLogKind>(resolveActivityKind(entry));

  async function save() {
    if (!details.trim()) {
      showToast('Details cannot be empty.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await updateActivityLogEntry(entry.id, {
        title: title.trim() || undefined,
        details: details.trim(),
        kind,
      });
      onSaved();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm('Diese Zeile dauerhaft aus dem Activity Log löschen?')) return;
    setSaving(true);
    try {
      await deleteActivityLogEntry(entry.id);
      onDeleted();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-3">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold text-gray-900">Edit activity line</h3>
          <button type="button" onClick={onClose} className="text-gray-500">
            ✕
          </button>
        </div>
        <p className="text-xs text-gray-500 font-mono">{entry.id}</p>
        <div>
          <label className="text-xs font-medium text-gray-600">Classification</label>
          <select
            className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-2 text-sm"
            value={kind}
            onChange={e => setKind(e.target.value as ActivityLogKind)}
          >
            {ACTIVITY_LOG_KINDS.map(k => (
              <option key={k} value={k}>
                {ACTIVITY_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Title (optional)</label>
          <input
            className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-2 text-sm"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Details</label>
          <textarea
            className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-2 text-sm"
            rows={5}
            value={details}
            onChange={e => setDetails(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void remove()}
            className="px-4 py-2 text-sm text-red-700 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            Delete line
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
