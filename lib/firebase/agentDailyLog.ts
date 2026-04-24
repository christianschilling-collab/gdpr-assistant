import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import type { AgentDailyChecklistItem, AgentDailyLog } from '../types';
import { getDb } from './config';
import { buildDefaultChecklistItems } from '../operations/agentDailyChecklistSeed';

const COLLECTION = 'agentDailyLogs';

function getDbOrThrow() {
  const db = getDb();
  if (!db) throw new Error('Firebase is not configured');
  return db;
}

function sanitizeEmailForDocId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'user';
}

export function agentDailyLogDocId(userEmail: string, dayKey: string): string {
  return `${dayKey}__${sanitizeEmailForDocId(userEmail)}`;
}

function docToAgentDailyLog(id: string, data: Record<string, unknown>): AgentDailyLog {
  const items = (data.items as AgentDailyChecklistItem[] | undefined) ?? [];
  return {
    id,
    dayKey: String(data.dayKey ?? ''),
    userEmail: String(data.userEmail ?? ''),
    displayName: data.displayName ? String(data.displayName) : undefined,
    items,
    rosterNotes: data.rosterNotes ? String(data.rosterNotes) : undefined,
    dayNote: data.dayNote ? String(data.dayNote) : undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
  };
}

/**
 * Merge stored items with current template (checked state preserved by id).
 * Unknown ids from older templates are kept at the end until the user saves again.
 */
function mergeItemsWithTemplate(stored: AgentDailyChecklistItem[]): AgentDailyChecklistItem[] {
  const defaults = buildDefaultChecklistItems();
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

export async function getAgentDailyLog(userEmail: string, dayKey: string): Promise<AgentDailyLog | null> {
  const db = getDbOrThrow();
  const em = userEmail.trim().toLowerCase();
  const ref = doc(db, COLLECTION, agentDailyLogDocId(em, dayKey));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return docToAgentDailyLog(snap.id, snap.data() as Record<string, unknown>);
}

export async function getOrCreateAgentDailyLogState(
  userEmail: string,
  displayName: string | undefined,
  dayKey: string
): Promise<AgentDailyLog> {
  const em = userEmail.trim().toLowerCase();
  const existing = await getAgentDailyLog(em, dayKey);
  if (existing) {
    return {
      ...existing,
      items: mergeItemsWithTemplate(existing.items),
      displayName: displayName ?? existing.displayName,
      userEmail: em,
    };
  }
  const now = new Date();
  return {
    id: agentDailyLogDocId(em, dayKey),
    dayKey,
    userEmail: em,
    displayName,
    items: buildDefaultChecklistItems(),
    rosterNotes: '',
    dayNote: '',
    createdAt: now,
    updatedAt: now,
  };
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export async function saveAgentDailyLog(log: AgentDailyLog): Promise<void> {
  const db = getDbOrThrow();
  const id = log.id || agentDailyLogDocId(log.userEmail, log.dayKey);
  const ref = doc(db, COLLECTION, id);
  const now = Timestamp.now();
  const createdAt = log.createdAt ? Timestamp.fromDate(log.createdAt) : now;
  await setDoc(
    ref,
    omitUndefined({
      dayKey: log.dayKey,
      userEmail: log.userEmail.trim().toLowerCase(),
      displayName: log.displayName,
      items: log.items,
      rosterNotes: log.rosterNotes?.trim() || undefined,
      dayNote: log.dayNote?.trim() || undefined,
      createdAt,
      updatedAt: now,
    }),
    { merge: true }
  );
}

export async function listRecentAgentDailyLogs(userEmail: string, max = 25): Promise<AgentDailyLog[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, COLLECTION),
    where('userEmail', '==', userEmail.toLowerCase()),
    orderBy('dayKey', 'desc'),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToAgentDailyLog(d.id, d.data() as Record<string, unknown>));
}
