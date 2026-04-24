'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { isGdprAssistantAdminEmail } from '@/lib/auth/gdprAssistantAdmins';
import type { AgentDailyCheckLogEntry, AgentDailyQueueLog } from '@/lib/types';
import {
  getOrCreateAgentDailyQueueLog,
  saveAgentDailyQueueLog,
  listRecentAgentDailyQueueLogs,
} from '@/lib/firebase/agentDailyQueueLog';
import { getDailyNextActions } from '@/lib/firebase/dailyQueueSettings';
import type { DailyNextActionConfig } from '@/lib/types';

const CONFLUENCE_HUB =
  'https://hellofresh.atlassian.net/wiki/spaces/CCDACH/pages/4692772632/GDPR+Team+Hub';
const CONFLUENCE_DAILY_QUEUE =
  'https://hellofresh.atlassian.net/wiki/spaces/CCDACH/pages/5893488642/Daily+Queue+Processing+Checklist';

function firestoreErrorMessage(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string'
      ? (err as { code: string }).code
      : null;
  const msg = err instanceof Error ? err.message : 'Could not load daily log';
  if (code === 'permission-denied') {
    return (
      'Firestore: permission denied. Deploy firestore.rules (collections agentDailyQueueLogs, agentDailyLogs) ' +
      'with firebase deploy --only firestore:rules --project team-cc-gdpr.'
    );
  }
  if (code === 'failed-precondition' && msg.toLowerCase().includes('index')) {
    return (
      'Firestore needs an index for recent days. Deploy firestore.indexes.json or use the console link from the browser.'
    );
  }
  return msg;
}

function formatDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDayKey(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatCheckLog(entries: AgentDailyCheckLogEntry[] | undefined): string {
  if (!entries?.length) return '';
  return entries
    .map((e) => {
      const who = (e.displayName || e.userEmail.split('@')[0] || e.userEmail).trim();
      const t = e.at.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${who} @ ${t}`;
    })
    .join('\n');
}

function CellLink({ href, label }: { href?: string; label: string }) {
  if (!href) return <span className="text-gray-400">—</span>;
  const cls = 'text-emerald-700 font-medium hover:underline text-xs whitespace-nowrap';
  if (href.startsWith('http')) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {label}
    </Link>
  );
}

export default function AgentDailyLogPage() {
  const { user, loading: authLoading, isAuthenticated, isAdmin } = useAuth();
  const { showToast } = useToast();
  const canClearChecks = isAdmin || isGdprAssistantAdminEmail(user?.email);

  const [dayKey, setDayKey] = useState(() => formatDayKey(new Date()));
  const [queueLog, setQueueLog] = useState<AgentDailyQueueLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<AgentDailyQueueLog[]>([]);
  const [nextActions, setNextActions] = useState<DailyNextActionConfig[]>([]);

  const email = user?.email?.trim().toLowerCase() ?? '';
  const displayName = user?.displayName ?? undefined;

  const loadLog = useCallback(async () => {
    setLoading(true);
    try {
      const [state, actions] = await Promise.all([
        getOrCreateAgentDailyQueueLog(dayKey),
        getDailyNextActions(),
      ]);
      setQueueLog(state);
      setNextActions(actions);
      try {
        const hist = await listRecentAgentDailyQueueLogs(20);
        setHistory(hist);
      } catch (histErr) {
        console.error(histErr);
        setHistory([]);
        showToast(firestoreErrorMessage(histErr), 'error');
      }
    } catch (e) {
      console.error(e);
      setQueueLog(null);
      setHistory([]);
      setNextActions([]);
      showToast(firestoreErrorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- showToast stable
  }, [dayKey]);

  useEffect(() => {
    void loadLog();
  }, [loadLog]);

  async function handleSave() {
    if (!queueLog) return;
    setSaving(true);
    try {
      await saveAgentDailyQueueLog({
        ...queueLog,
        rosterNotes: queueLog.rosterNotes ?? '',
        dayNote: queueLog.dayNote ?? '',
      });
      showToast('Team daily log saved.', 'success');
      await loadLog();
    } catch (e) {
      console.error(e);
      showToast(firestoreErrorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user || !email) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">Agent daily log</h1>
        <p className="text-gray-600 mt-2 text-sm">Sign in to use the team checklist.</p>
        <Link href="/" className="inline-block mt-6 text-emerald-700 font-medium hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
      <h1 className="text-2xl font-bold text-gray-900 mt-2">Daily checklist &amp; log</h1>
      <p className="text-gray-600 mt-2 text-sm leading-relaxed max-w-3xl">
        Shared team queue for the selected calendar day: anyone can tick a row; each check records who and when.
        Clearing a tick is only possible for{' '}
        <strong className="font-semibold text-gray-800">admins</strong> (Firestore role or configured admin email).
        Rows mirror the{' '}
        <a
          href={CONFLUENCE_DAILY_QUEUE}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-700 font-medium hover:underline"
        >
          Daily Queue Processing Checklist
        </a>{' '}
        (see{' '}
        <a
          href={CONFLUENCE_HUB}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-700 font-medium hover:underline"
        >
          GDPR Team Hub
        </a>
        ). Template:{' '}
        <code className="text-xs bg-gray-100 px-1 rounded">dailyQueueSettings</code> in Firestore (fallback defaults in
        code). Admins edit links and checklist under{' '}
        {canClearChecks ? (
          <Link href="/admin/daily-queue" className="text-emerald-700 font-medium hover:underline">
            Admin → Daily queue
          </Link>
        ) : (
          <span className="text-gray-500">Admin → Daily queue</span>
        )}
        .
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="log-day" className="block text-sm font-medium text-gray-700 mb-1">
            Date (team queue day)
          </label>
          <input
            id="log-day"
            type="date"
            value={dayKey}
            onChange={(e) => {
              const v = e.target.value;
              if (parseDayKey(v)) setDayKey(v);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 items-start">
        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm lg:col-span-1 min-w-0">
          <h2 className="text-base font-bold text-gray-900">What do you want to do next?</h2>
          <p className="text-gray-600 text-sm mt-1 mb-4">Quick links for common queue actions.</p>
          <ul className="space-y-3">
            {nextActions.map((a) => (
              <li key={a.id}>
                {a.external ? (
                  <a
                    href={a.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/40 px-4 py-3 transition-colors"
                  >
                    <span className="font-semibold text-gray-900 text-sm">{a.title}</span>
                    <span className="block text-xs text-gray-600 mt-0.5">{a.description}</span>
                  </a>
                ) : (
                  <Link
                    href={a.href}
                    className="block rounded-lg border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/40 px-4 py-3 transition-colors"
                  >
                    <span className="font-semibold text-gray-900 text-sm">{a.title}</span>
                    <span className="block text-xs text-gray-600 mt-0.5">{a.description}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className="min-w-0 lg:col-span-2">
          {loading || !queueLog ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
            </div>
          ) : (
            <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Checklist</h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Doc = SOP, Tool = queue system, Log = who ticked today. Done can only be cleared by an admin.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[820px] w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="py-2.5 pl-4 pr-2 w-12 font-semibold">Done</th>
                      <th className="py-2.5 pr-3 font-semibold min-w-[200px]">Task</th>
                      <th className="py-2.5 pr-2 w-20 font-semibold">Doc</th>
                      <th className="py-2.5 pr-2 w-20 font-semibold">Tool</th>
                      <th className="py-2.5 pr-4 font-semibold w-[220px]">Check log</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueLog.items.map((item, idx) => (
                      <tr key={item.id} className="border-b border-gray-100 align-top hover:bg-gray-50/80">
                        <td className="py-3 pl-4 pr-2">
                          <input
                            type="checkbox"
                            id={`chk-${item.id}`}
                            checked={item.checked}
                            disabled={item.checked && !canClearChecks}
                            title={
                              item.checked && !canClearChecks
                                ? 'Nur Admins können das Häkchen zurücknehmen.'
                                : undefined
                            }
                            onChange={(e) => {
                              const checked = e.target.checked;
                              if (!checked && item.checked && !canClearChecks) {
                                showToast('Nur Admins können ein gesetztes Häkchen zurücknehmen.', 'error');
                                return;
                              }
                              setQueueLog((prev) => {
                                if (!prev) return prev;
                                const items = prev.items.map((it, i) => {
                                  if (i !== idx) return it;
                                  if (checked) {
                                    const entry: AgentDailyCheckLogEntry = {
                                      userEmail: email,
                                      displayName,
                                      at: new Date(),
                                    };
                                    return {
                                      ...it,
                                      checked: true,
                                      checkLog: [...(it.checkLog ?? []), entry],
                                    };
                                  }
                                  return { ...it, checked: false };
                                });
                                return { ...prev, items };
                              });
                            }}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="py-3 pr-3">
                          <label
                            htmlFor={`chk-${item.id}`}
                            className={`text-gray-800 leading-snug ${
                              item.checked && !canClearChecks ? 'cursor-default' : 'cursor-pointer'
                            }`}
                          >
                            {item.label}
                          </label>
                        </td>
                        <td className="py-3 pr-2">
                          <CellLink href={item.docUrl} label="Open" />
                        </td>
                        <td className="py-3 pr-2">
                          <CellLink href={item.toolUrl} label="Open" />
                        </td>
                        <td className="py-3 pr-4 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {formatCheckLog(item.checkLog) || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>

      {!loading && queueLog ? (
        <div className="mt-10 space-y-8">
          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Shift &amp; coverage</h2>
            <textarea
              value={queueLog.rosterNotes ?? ''}
              onChange={(e) => setQueueLog((prev) => (prev ? { ...prev, rosterNotes: e.target.value } : prev))}
              rows={3}
              placeholder="e.g. on leave tomorrow, backfill by X; swapped afternoon with Y; public holiday in NL…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">End of day note</h2>
            <textarea
              value={queueLog.dayNote ?? ''}
              onChange={(e) => setQueueLog((prev) => (prev ? { ...prev, dayNote: e.target.value } : prev))}
              rows={4}
              placeholder="Anything leadership should know (optional)."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save log'}
            </button>
          </div>

          {history.length > 0 && (
            <section className="border-t border-gray-200 pt-8">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Recent team days</h2>
              <ul className="text-sm text-gray-700 space-y-2">
                {history.map((h) => {
                  const done = h.items.filter((i) => i.checked).length;
                  const total = h.items.length;
                  return (
                    <li key={h.id} className="flex justify-between gap-4 border-b border-gray-100 pb-2">
                      <button
                        type="button"
                        onClick={() => setDayKey(h.dayKey)}
                        className="text-left text-emerald-800 hover:underline font-medium"
                      >
                        {h.dayKey}
                      </button>
                      <span className="text-gray-500 shrink-0">
                        {done}/{total} checked
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}
