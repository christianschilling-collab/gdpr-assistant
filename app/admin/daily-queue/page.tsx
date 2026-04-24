'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { isGdprAssistantAdminEmail } from '@/lib/auth/gdprAssistantAdmins';
import type { DailyChecklistTemplateRow, DailyNextActionConfig } from '@/lib/types';
import {
  getDailyNextActions,
  getDailyChecklistTemplate,
  saveDailyNextActions,
  saveDailyChecklistTemplate,
} from '@/lib/firebase/dailyQueueSettings';
import { DEFAULT_CHECKLIST_TEMPLATE_ROWS, DEFAULT_DAILY_NEXT_ACTIONS } from '@/lib/constants/dailyQueueDefaults';

function uniqueIds<T extends { id: string }>(rows: T[]): boolean {
  const s = new Set<string>();
  for (const r of rows) {
    const id = r.id.trim().toLowerCase();
    if (!id) return false;
    if (s.has(id)) return false;
    s.add(id);
  }
  return true;
}

export default function AdminDailyQueuePage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { showToast } = useToast();

  const allowed = isAdmin || isGdprAssistantAdminEmail(user?.email);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nextActions, setNextActions] = useState<DailyNextActionConfig[]>([]);
  const [checklist, setChecklist] = useState<DailyChecklistTemplateRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [na, cl] = await Promise.all([getDailyNextActions(), getDailyChecklistTemplate()]);
      setNextActions(na.map((r) => ({ ...r })));
      setChecklist(cl.map((r) => ({ ...r })));
    } catch (e) {
      console.error(e);
      showToast(e instanceof Error ? e.message : 'Load failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (!allowed) {
      router.replace('/cases');
      return;
    }
    void load();
  }, [authLoading, user, allowed, router, load]);

  const nextValid = useMemo(() => {
    return (
      nextActions.length > 0 &&
      nextActions.every((r) => r.id.trim() && r.title.trim() && r.href.trim()) &&
      uniqueIds(nextActions)
    );
  }, [nextActions]);

  const checklistValid = useMemo(() => {
    return (
      checklist.length > 0 &&
      checklist.every((r) => r.id.trim() && r.label.trim()) &&
      uniqueIds(checklist)
    );
  }, [checklist]);

  async function handleSaveAll() {
    if (!nextValid || !checklistValid) {
      showToast('Please fix validation: unique non-empty IDs, titles, hrefs / labels.', 'error');
      return;
    }
    setSaving(true);
    try {
      await Promise.all([saveDailyNextActions(nextActions), saveDailyChecklistTemplate(checklist)]);
      showToast('Daily queue configuration saved.', 'success');
      await load();
    } catch (e) {
      console.error(e);
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDefaults() {
    if (!window.confirm('Replace Firestore config with built-in defaults? This overwrites current entries.')) return;
    setNextActions(DEFAULT_DAILY_NEXT_ACTIONS.map((r) => ({ ...r })));
    setChecklist(DEFAULT_CHECKLIST_TEMPLATE_ROWS.map((r) => ({ ...r })));
    setSaving(true);
    try {
      await Promise.all([
        saveDailyNextActions(DEFAULT_DAILY_NEXT_ACTIONS),
        saveDailyChecklistTemplate(DEFAULT_CHECKLIST_TEMPLATE_ROWS),
      ]);
      showToast('Reset to defaults and saved.', 'success');
      await load();
    } catch (e) {
      console.error(e);
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || (!user && !loading)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-500 text-sm">Loading…</div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-16">
      <p className="text-sm text-gray-500">
        <Link href="/admin" className="text-blue-600 hover:underline">
          Admin
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800 font-medium">Daily queue</span>
      </p>
      <h1 className="text-2xl font-bold text-gray-900 mt-2">Daily queue configuration</h1>
      <p className="text-gray-600 text-sm mt-2 max-w-3xl">
        Controls the &quot;What do you want to do next?&quot; links and the checklist template on the agent daily log.
        Changes apply after save; checklist rows keep tick state by stable <code className="text-xs bg-gray-100 px-1">id</code>
        . Firestore writes require <code className="text-xs bg-gray-100 px-1">users/&lt;email&gt;.role == admin</code> or{' '}
        <code className="text-xs bg-gray-100 px-1">platformAdmins/&lt;email&gt;</code>.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving || !nextValid || !checklistValid}
          onClick={() => void handleSaveAll()}
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save all'}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleResetDefaults()}
          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Reset to built-in defaults
        </button>
        <Link href="/agent-daily-log" className="inline-flex items-center px-4 py-2 text-sm text-emerald-800 hover:underline">
          Open agent daily log
        </Link>
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Next actions</h2>
              <p className="text-xs text-gray-600 mt-1">Sort order controls display order (lower first).</p>
            </div>
            <div className="overflow-x-auto p-4 space-y-3">
              {nextActions.map((row, idx) => (
                <div
                  key={`next-${idx}`}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 border border-gray-100 rounded-lg p-3 bg-gray-50/50"
                >
                  <input
                    className="md:col-span-2 border rounded px-2 py-1.5 text-xs font-mono"
                    placeholder="id"
                    value={row.id}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNextActions((prev) => prev.map((r, i) => (i === idx ? { ...r, id: v } : r)));
                    }}
                  />
                  <input
                    className="md:col-span-2 border rounded px-2 py-1.5 text-xs w-full"
                    type="number"
                    placeholder="sort"
                    value={row.sortOrder}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setNextActions((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, sortOrder: Number.isNaN(n) ? 0 : n } : r))
                      );
                    }}
                  />
                  <input
                    className="md:col-span-2 border rounded px-2 py-1.5 text-sm"
                    placeholder="Title"
                    value={row.title}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNextActions((prev) => prev.map((r, i) => (i === idx ? { ...r, title: v } : r)));
                    }}
                  />
                  <input
                    className="md:col-span-4 border rounded px-2 py-1.5 text-sm"
                    placeholder="Description"
                    value={row.description}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNextActions((prev) => prev.map((r, i) => (i === idx ? { ...r, description: v } : r)));
                    }}
                  />
                  <input
                    className="md:col-span-2 border rounded px-2 py-1.5 text-xs"
                    placeholder="/path or https://…"
                    value={row.href}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNextActions((prev) => prev.map((r, i) => (i === idx ? { ...r, href: v } : r)));
                    }}
                  />
                  <label className="md:col-span-12 flex items-center gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={row.external === true}
                      onChange={(e) => {
                        const c = e.target.checked;
                        setNextActions((prev) => prev.map((r, i) => (i === idx ? { ...r, external: c } : r)));
                      }}
                    />
                    External link (new tab)
                  </label>
                  <div className="md:col-span-12 flex justify-end">
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => setNextActions((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="text-sm text-emerald-700 font-medium hover:underline"
                onClick={() =>
                  setNextActions((prev) => [
                    ...prev,
                    {
                      id: `action-${Date.now()}`,
                      title: 'New link',
                      description: '',
                      href: '/',
                      external: false,
                      sortOrder: (prev[prev.length - 1]?.sortOrder ?? 0) + 10,
                    },
                  ])
                }
              >
                + Add next action
              </button>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Checklist template</h2>
              <p className="text-xs text-gray-600 mt-1">
                Stable <code className="text-xs bg-white px-1 rounded border">id</code> per row (do not rename lightly —
                open queue days merge by id).
              </p>
            </div>
            <div className="overflow-x-auto p-4 space-y-3">
              {checklist.map((row, idx) => (
                <div
                  key={`checklist-row-${idx}`}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 border border-gray-100 rounded-lg p-3 bg-gray-50/50"
                >
                  <input
                    className="md:col-span-2 border rounded px-2 py-1.5 text-xs font-mono"
                    placeholder="id"
                    value={row.id}
                    onChange={(e) => {
                      const v = e.target.value;
                      setChecklist((prev) => prev.map((r, i) => (i === idx ? { ...r, id: v } : r)));
                    }}
                  />
                  <input
                    className="md:col-span-1 border rounded px-2 py-1.5 text-xs w-full"
                    type="number"
                    placeholder="sort"
                    value={row.sortOrder}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setChecklist((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, sortOrder: Number.isNaN(n) ? 0 : n } : r))
                      );
                    }}
                  />
                  <input
                    className="md:col-span-5 border rounded px-2 py-1.5 text-sm"
                    placeholder="Label"
                    value={row.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      setChecklist((prev) => prev.map((r, i) => (i === idx ? { ...r, label: v } : r)));
                    }}
                  />
                  <input
                    className="md:col-span-2 border rounded px-2 py-1.5 text-xs"
                    placeholder="Doc URL"
                    value={row.docUrl ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setChecklist((prev) => prev.map((r, i) => (i === idx ? { ...r, docUrl: v || undefined } : r)));
                    }}
                  />
                  <input
                    className="md:col-span-2 border rounded px-2 py-1.5 text-xs"
                    placeholder="Tool URL"
                    value={row.toolUrl ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setChecklist((prev) => prev.map((r, i) => (i === idx ? { ...r, toolUrl: v || undefined } : r)));
                    }}
                  />
                  <div className="md:col-span-12 flex justify-end">
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => setChecklist((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="text-sm text-emerald-700 font-medium hover:underline"
                onClick={() =>
                  setChecklist((prev) => [
                    ...prev,
                    {
                      id: `row_${Date.now()}`,
                      label: 'New checklist row',
                      docUrl: undefined,
                      toolUrl: undefined,
                      sortOrder: (prev[prev.length - 1]?.sortOrder ?? 0) + 10,
                    },
                  ])
                }
              >
                + Add checklist row
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
