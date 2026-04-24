'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TeamAbsence, TeamAbsenceKind } from '@/lib/types';
import { addTeamAbsence, deleteTeamAbsence, listTeamAbsences } from '@/lib/firebase/teamAbsence';
import { useToast } from '@/lib/contexts/ToastContext';

const YEAR_START = 2026;
const YEAR_END = 2027;
const WINDOW_FIRST = `${YEAR_START}-01-01`;
const WINDOW_LAST = `${YEAR_END}-12-31`;

const KIND_LABELS: Record<TeamAbsenceKind, string> = {
  vacation: 'Urlaub',
  sick: 'Krank',
  training: 'Schulung',
  other: 'Sonstiges',
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function monthFirstDay(y: number, m0: number) {
  return `${y}-${pad2(m0 + 1)}-01`;
}

function monthLastDayKey(y: number, m0: number) {
  const d = new Date(y, m0 + 1, 0);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function overlapsMonth(abs: Pick<TeamAbsence, 'startDate' | 'endDate'>, y: number, m0: number) {
  const first = monthFirstDay(y, m0);
  const last = monthLastDayKey(y, m0);
  return abs.startDate <= last && abs.endDate >= first;
}

function formatRangeDe(startDate: string, endDate: string) {
  const a = new Date(`${startDate}T12:00:00`);
  const b = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return `${startDate} – ${endDate}`;
  if (startDate === endDate) {
    return a.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const sameMonth = a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  if (sameMonth) {
    return `${a.getDate()}.–${b.getDate()}. ${a.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}`;
  }
  return `${a.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} – ${b.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function monthTitle(y: number, m0: number) {
  return new Date(y, m0, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDayKey(s: string): boolean {
  const m = DAY_KEY.exec(s.trim());
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return !Number.isNaN(d.getTime());
}

type Props = {
  actorEmail: string;
  displayName?: string;
};

export function TeamAbsenceCalendar({ actorEmail, displayName }: Props) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<TeamAbsence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [kind, setKind] = useState<TeamAbsenceKind>('vacation');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listTeamAbsences();
      setRows(list.filter((a) => a.startDate <= WINDOW_LAST && a.endDate >= WINDOW_FIRST));
    } catch (e) {
      console.error(e);
      showToast(e instanceof Error ? e.message : 'Teamkalender konnte nicht geladen werden.', 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const monthsByYear = useMemo(() => {
    const by: Record<number, { y: number; m: number }[]> = {};
    for (let y = YEAR_START; y <= YEAR_END; y++) {
      by[y] = [];
      for (let m = 0; m < 12; m++) by[y].push({ y, m });
    }
    return by;
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) {
      showToast('Bitte Start- und Enddatum wählen.', 'error');
      return;
    }
    if (!parseDayKey(startDate) || !parseDayKey(endDate)) {
      showToast('Datumsformat ungültig (YYYY-MM-DD).', 'error');
      return;
    }
    if (startDate > endDate) {
      showToast('Start darf nicht nach dem Ende liegen.', 'error');
      return;
    }
    if (endDate < WINDOW_FIRST || startDate > WINDOW_LAST) {
      showToast('Einträge sollen in den Jahren 2026–2027 liegen.', 'error');
      return;
    }
    setSaving(true);
    try {
      await addTeamAbsence({
        userEmail: actorEmail,
        displayName,
        startDate,
        endDate,
        kind,
        note: note.trim() || undefined,
      });
      showToast('Abwesenheit gespeichert.', 'success');
      setNote('');
      await load();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Diesen Eintrag löschen?')) return;
    try {
      await deleteTeamAbsence(id);
      showToast('Eintrag gelöscht.', 'success');
      await load();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.', 'error');
    }
  }

  return (
    <section
      id="team-absence-calendar"
      className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6"
      aria-labelledby="team-absence-heading"
    >
      <div>
        <h2 id="team-absence-heading" className="text-sm font-bold text-gray-900 uppercase tracking-wide">
          Teamkalender Abwesenheit
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          Urlaub und andere Abwesenheiten für {YEAR_START}–{YEAR_END} (teamweit sichtbar). Nur eigene Einträge bearbeiten
          bzw. löschen.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-emerald-600" />
        </div>
      ) : (
        <div className="space-y-10">
          {([YEAR_START, YEAR_END] as const).map((year) => (
            <div key={year}>
              <h3 className="text-base font-semibold text-gray-900 mb-3">{year}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {monthsByYear[year].map(({ y, m }) => {
                  const entries = rows
                    .filter((a) => overlapsMonth(a, y, m))
                    .sort((a, b) => a.startDate.localeCompare(b.startDate));
                  return (
                    <div
                      key={`${y}-${m}`}
                      className="border border-gray-100 rounded-lg p-3 bg-gray-50/80 min-h-[7.5rem] flex flex-col"
                    >
                      <p className="text-xs font-semibold text-emerald-900 mb-2 border-b border-gray-200 pb-1">
                        {monthTitle(y, m)}
                      </p>
                      {entries.length === 0 ? (
                        <p className="text-xs text-gray-400 mt-auto">—</p>
                      ) : (
                        <ul className="space-y-1.5 text-xs text-gray-800 flex-1">
                          {entries.map((a) => {
                            const mine = a.userEmail === actorEmail;
                            const label = a.displayName || a.userEmail.split('@')[0] || a.userEmail;
                            return (
                              <li key={a.id} className="leading-snug flex gap-1 justify-between items-start">
                                <span>
                                  <span className="font-medium text-gray-900">{label}</span>
                                  <span className="text-gray-600">
                                    {' '}
                                    · {formatRangeDe(a.startDate, a.endDate)} · {KIND_LABELS[a.kind]}
                                  </span>
                                  {a.note ? <span className="block text-gray-500 mt-0.5">{a.note}</span> : null}
                                </span>
                                {mine ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleDelete(a.id)}
                                    className="shrink-0 text-red-600 hover:underline text-[11px] font-medium"
                                  >
                                    Löschen
                                  </button>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={(ev) => void handleAdd(ev)} className="border-t border-gray-200 pt-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-900">Eigene Abwesenheit eintragen</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="abs-start">
              Von
            </label>
            <input
              id="abs-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="abs-end">
              Bis (einschließlich)
            </label>
            <input
              id="abs-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="abs-kind">
              Art
            </label>
            <select
              id="abs-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as TeamAbsenceKind)}
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {(Object.keys(KIND_LABELS) as TeamAbsenceKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Speichern…' : 'Eintragen'}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="abs-note">
            Notiz (optional)
          </label>
          <input
            id="abs-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="z. B. Halber Tag, Ersatz: …"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </form>
    </section>
  );
}
