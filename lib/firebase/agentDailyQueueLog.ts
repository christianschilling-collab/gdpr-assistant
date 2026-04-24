import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import type {
  AgentDailyChecklistItem,
  AgentDailyCheckLogEntry,
  AgentDailyQueueLog,
  DailyChecklistTemplateRow,
} from '../types';
import { getDb } from './config';
import { getDailyChecklistTemplate } from './dailyQueueSettings';

const COLLECTION = 'agentDailyQueueLogs';

function getDbOrThrow() {
  const db = getDb();
  if (!db) throw new Error('Firebase is not configured');
  return db;
}

function sortTemplate(rows: DailyChecklistTemplateRow[]): DailyChecklistTemplateRow[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
}

function templateRowsToDefaultItems(template: DailyChecklistTemplateRow[]): AgentDailyChecklistItem[] {
  return sortTemplate(template).map((r) => ({
    id: r.id,
    label: r.label,
    docUrl: r.docUrl,
    toolUrl: r.toolUrl,
    checked: false,
    checkLog: [],
  }));
}

function parseCheckLog(raw: unknown): AgentDailyCheckLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: AgentDailyCheckLogEntry[] = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    const userEmail = String(o.userEmail ?? '').trim().toLowerCase();
    if (!userEmail) continue;
    const atTs = o.at as Timestamp | undefined;
    const at = atTs?.toDate?.() ?? (o.at instanceof Date ? o.at : new Date(String(o.at)));
    out.push({
      userEmail,
      displayName: o.displayName ? String(o.displayName) : undefined,
      at: Number.isNaN(at.getTime()) ? new Date() : at,
    });
  }
  return out;
}

function parseItem(raw: unknown): AgentDailyChecklistItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? '');
  const label = String(o.label ?? '');
  if (!id || !label) return null;
  return {
    id,
    label,
    checked: Boolean(o.checked),
    docUrl: o.docUrl ? String(o.docUrl) : undefined,
    toolUrl: o.toolUrl ? String(o.toolUrl) : undefined,
    checkLog: parseCheckLog(o.checkLog),
  };
}

function mergeQueueItemsWithTemplate(
  stored: AgentDailyChecklistItem[],
  template: DailyChecklistTemplateRow[]
): AgentDailyChecklistItem[] {
  const defaults = templateRowsToDefaultItems(template);
  const byId = new Map(stored.map((i) => [i.id, i]));
  const defaultIds = new Set(defaults.map((d) => d.id));
  const merged = defaults.map((d) => {
    const prev = byId.get(d.id);
    if (!prev) return { ...d, checked: false, checkLog: [] };
    return {
      ...d,
      checked: prev.checked,
      checkLog: prev.checkLog ?? [],
    };
  });
  const extras = stored.filter((s) => !defaultIds.has(s.id));
  return extras.length ? [...merged, ...extras] : merged;
}

function docToQueueLog(id: string, data: Record<string, unknown>): AgentDailyQueueLog {
  const rawItems = data.items;
  const items: AgentDailyChecklistItem[] = Array.isArray(rawItems)
    ? (rawItems.map(parseItem).filter(Boolean) as AgentDailyChecklistItem[])
    : [];
  return {
    id,
    dayKey: String(data.dayKey ?? id),
    items,
    rosterNotes: data.rosterNotes ? String(data.rosterNotes) : undefined,
    dayNote: data.dayNote ? String(data.dayNote) : undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
  };
}

export async function getAgentDailyQueueLog(dayKey: string): Promise<AgentDailyQueueLog | null> {
  const db = getDbOrThrow();
  const ref = doc(db, COLLECTION, dayKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return docToQueueLog(snap.id, snap.data() as Record<string, unknown>);
}

export async function getOrCreateAgentDailyQueueLog(dayKey: string): Promise<AgentDailyQueueLog> {
  const template = await getDailyChecklistTemplate();
  const existing = await getAgentDailyQueueLog(dayKey);
  if (existing) {
    return {
      ...existing,
      items: mergeQueueItemsWithTemplate(existing.items, template),
    };
  }
  const now = new Date();
  return {
    id: dayKey,
    dayKey,
    items: templateRowsToDefaultItems(template),
    rosterNotes: '',
    dayNote: '',
    createdAt: now,
    updatedAt: now,
  };
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function serializeItems(items: AgentDailyChecklistItem[]): Record<string, unknown>[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    checked: item.checked,
    docUrl: item.docUrl ?? null,
    toolUrl: item.toolUrl ?? null,
    checkLog: (item.checkLog ?? []).map((e) => ({
      userEmail: e.userEmail.trim().toLowerCase(),
      displayName: e.displayName ?? null,
      at: Timestamp.fromDate(e.at instanceof Date ? e.at : new Date(e.at)),
    })),
  }));
}

export async function saveAgentDailyQueueLog(log: AgentDailyQueueLog): Promise<void> {
  const db = getDbOrThrow();
  const id = log.dayKey;
  const ref = doc(db, COLLECTION, id);
  const now = Timestamp.now();
  const createdAt = log.createdAt ? Timestamp.fromDate(log.createdAt) : now;
  await setDoc(
    ref,
    omitUndefined({
      dayKey: log.dayKey,
      items: serializeItems(log.items),
      rosterNotes: log.rosterNotes?.trim() || undefined,
      dayNote: log.dayNote?.trim() || undefined,
      createdAt,
      updatedAt: now,
    }),
    { merge: true }
  );
}

export async function listRecentAgentDailyQueueLogs(max = 25): Promise<AgentDailyQueueLog[]> {
  const db = getDbOrThrow();
  const template = await getDailyChecklistTemplate();
  const q = query(collection(db, COLLECTION), orderBy('dayKey', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const row = docToQueueLog(d.id, d.data() as Record<string, unknown>);
    return { ...row, items: mergeQueueItemsWithTemplate(row.items, template) };
  });
}
