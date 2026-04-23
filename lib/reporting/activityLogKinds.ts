import type { ActivityLogEntry, ActivityLogKind } from '@/lib/types';
import { ACTIVITY_LOG_KINDS } from '@/lib/types';

/** Tailwind classes for kind badges (Events list, filters). */
export const ACTIVITY_KIND_BADGE_CLASSES: Record<ActivityLogKind, string> = {
  win: 'bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-200',
  initiative: 'bg-blue-100 text-blue-900 ring-1 ring-inset ring-blue-200',
  noteworthy: 'bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-200',
  observation: 'bg-sky-100 text-sky-900 ring-1 ring-inset ring-sky-200',
  complaint: 'bg-orange-100 text-orange-900 ring-1 ring-inset ring-orange-200',
  privacy_incident: 'bg-rose-100 text-rose-900 ring-1 ring-inset ring-rose-200',
  escalation: 'bg-red-100 text-red-900 ring-1 ring-inset ring-red-200',
};

export function activityKindBadgeClass(kind: ActivityLogKind): string {
  return ACTIVITY_KIND_BADGE_CLASSES[kind];
}

const BNL_STORED = new Set(['NL', 'Be / Lux']);

/** Single HF display label: NL and Be / Lux → BNL. */
export function displayMarketLabel(stored: string): string {
  if (BNL_STORED.has(stored)) return 'BNL';
  return stored;
}

const DISPLAY_MARKET_SORT = ['DACH', 'France', 'Nordics', 'BNL'] as const;

function displayMarketSortKey(m: string): number {
  const i = (DISPLAY_MARKET_SORT as readonly string[]).indexOf(m);
  return i === -1 ? 100 : i;
}

export function isValidActivityKind(k: string): k is ActivityLogKind {
  return (ACTIVITY_LOG_KINDS as readonly string[]).includes(k);
}

export function kindToCategory(kind: ActivityLogKind): 'Initiative' | 'Escalation' {
  if (kind === 'escalation' || kind === 'complaint' || kind === 'privacy_incident') return 'Escalation';
  return 'Initiative';
}

export function resolveActivityKind(e: ActivityLogEntry): ActivityLogKind {
  if (e.kind && isValidActivityKind(e.kind)) return e.kind;
  if (e.category === 'Escalation') return 'escalation';
  const d = e.details || '';
  if (d.startsWith('✅')) return 'win';
  return 'initiative';
}

export function isActivityLowlightKind(kind: ActivityLogKind): boolean {
  return kind === 'escalation' || kind === 'complaint' || kind === 'privacy_incident';
}

export function isActivityHighlightKind(kind: ActivityLogKind): boolean {
  return !isActivityLowlightKind(kind);
}

export type ActivityLogSection =
  | 'privacy_incidents'
  | 'escalations'
  | 'complaints'
  | 'noteworthy'
  | 'observations'
  | 'initiatives'
  | 'wins';

const ACTIVITY_SECTION_ORDER: ActivityLogSection[] = [
  'privacy_incidents',
  'escalations',
  'complaints',
  'noteworthy',
  'observations',
  'initiatives',
  'wins',
];

export function sectionForKind(kind: ActivityLogKind): ActivityLogSection {
  switch (kind) {
    case 'privacy_incident':
      return 'privacy_incidents';
    case 'escalation':
      return 'escalations';
    case 'complaint':
      return 'complaints';
    case 'noteworthy':
      return 'noteworthy';
    case 'observation':
      return 'observations';
    case 'initiative':
      return 'initiatives';
    case 'win':
      return 'wins';
  }
}

const SECTION_META: Record<
  ActivityLogSection,
  { label: string; icon: string; tone: 'danger' | 'warning' | 'info' | 'success' }
> = {
  privacy_incidents: { label: 'PRIVACY INCIDENTS (narrative)', icon: '⚠️', tone: 'danger' },
  escalations: { label: 'ESCALATIONS', icon: '🚨', tone: 'danger' },
  complaints: { label: 'COMPLAINTS', icon: '📣', tone: 'warning' },
  noteworthy: { label: 'NOTEWORTHY', icon: '⭐', tone: 'warning' },
  observations: { label: 'OBSERVATIONS', icon: '👁️', tone: 'info' },
  initiatives: { label: 'INITIATIVES', icon: '📊', tone: 'info' },
  wins: { label: 'WINS', icon: '✅', tone: 'success' },
};

export interface ActivitySectionGroup {
  section: ActivityLogSection;
  label: string;
  icon: string;
  tone: 'danger' | 'warning' | 'info' | 'success';
  totalCount: number;
  markets: { market: string; entries: ActivityLogEntry[] }[];
}

function byMarketSorted(entries: ActivityLogEntry[]): { market: string; entries: ActivityLogEntry[] }[] {
  const acc: Record<string, ActivityLogEntry[]> = {};
  for (const e of entries) {
    const m = displayMarketLabel(e.market);
    if (!acc[m]) acc[m] = [];
    acc[m].push(e);
  }
  return Object.entries(acc)
    .sort(([a], [b]) => displayMarketSortKey(a) - displayMarketSortKey(b) || a.localeCompare(b))
    .map(([market, list]) => ({
      market,
      entries: [...list].sort((a, b) => b.weekOf.getTime() - a.weekOf.getTime()),
    }));
}

export function groupActivityLogForDisplay(activities: ActivityLogEntry[]): ActivitySectionGroup[] {
  const map = new Map<ActivityLogSection, ActivityLogEntry[]>();
  for (const e of activities) {
    const sec = sectionForKind(resolveActivityKind(e));
    if (!map.has(sec)) map.set(sec, []);
    map.get(sec)!.push(e);
  }
  return ACTIVITY_SECTION_ORDER.filter(sec => map.has(sec)).map(sec => {
    const entries = map.get(sec)!;
    return {
      section: sec,
      ...SECTION_META[sec],
      totalCount: entries.length,
      markets: byMarketSorted(entries),
    };
  });
}

export function formatActivityEntryPlainText(e: ActivityLogEntry): string {
  const t = e.title?.trim();
  const d = (e.details || '').trim();
  if (t && d) return `${t} — ${d}`;
  return t || d;
}

function formatDateShort(date: Date): string {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

/** Plain-text activity log for clipboard (grouped by classification). */
export function generateActivityLogPlainText(activities: ActivityLogEntry[]): string {
  const groups = groupActivityLogForDisplay(activities);
  let text = '🗂️ ACTIVITY LOG\n';
  text += '(Structured notes from weekly reports)\n\n';
  for (const g of groups) {
    text += `${g.icon} ${g.label} (${g.totalCount})\n`;
    for (const { market, entries } of g.markets) {
      text += `\n  ${market}:\n`;
      for (const e of entries) {
        text += `    • ${formatDateShort(e.weekOf)}: ${formatActivityEntryPlainText(e)}\n`;
      }
    }
    text += '\n';
  }
  return text;
}
