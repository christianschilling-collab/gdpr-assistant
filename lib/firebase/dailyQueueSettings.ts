import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import type { DailyChecklistTemplateRow, DailyNextActionConfig } from '../types';
import { getDb } from './config';
import { DEFAULT_CHECKLIST_TEMPLATE_ROWS, DEFAULT_DAILY_NEXT_ACTIONS } from '../constants/dailyQueueDefaults';

const COLLECTION = 'dailyQueueSettings';
const DOC_NEXT = 'nextActions';
const DOC_CHECKLIST = 'checklistTemplate';

function getDbOrThrow() {
  const db = getDb();
  if (!db) throw new Error('Firebase is not configured');
  return db;
}

function sortByOrder<T extends { sortOrder: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
}

function parseNextActions(data: Record<string, unknown>): DailyNextActionConfig[] {
  const raw = data.items;
  if (!Array.isArray(raw)) return [...DEFAULT_DAILY_NEXT_ACTIONS];
  const out: DailyNextActionConfig[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const id = String(o.id ?? '').trim();
    const title = String(o.title ?? '').trim();
    const href = String(o.href ?? '').trim();
    if (!id || !title || !href) continue;
    out.push({
      id,
      title,
      description: String(o.description ?? '').trim(),
      href,
      external: Boolean(o.external),
      sortOrder: typeof o.sortOrder === 'number' ? o.sortOrder : Number(o.sortOrder) || 0,
    });
  }
  return out.length ? sortByOrder(out) : [...DEFAULT_DAILY_NEXT_ACTIONS];
}

function parseChecklistTemplate(data: Record<string, unknown>): DailyChecklistTemplateRow[] {
  const raw = data.items;
  if (!Array.isArray(raw)) return [...DEFAULT_CHECKLIST_TEMPLATE_ROWS];
  const out: DailyChecklistTemplateRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const id = String(o.id ?? '').trim();
    const label = String(o.label ?? '').trim();
    if (!id || !label) continue;
    out.push({
      id,
      label,
      docUrl: o.docUrl ? String(o.docUrl).trim() : undefined,
      toolUrl: o.toolUrl ? String(o.toolUrl).trim() : undefined,
      sortOrder: typeof o.sortOrder === 'number' ? o.sortOrder : Number(o.sortOrder) || 0,
    });
  }
  return out.length ? sortByOrder(out) : [...DEFAULT_CHECKLIST_TEMPLATE_ROWS];
}

export async function getDailyNextActions(): Promise<DailyNextActionConfig[]> {
  const db = getDbOrThrow();
  const snap = await getDoc(doc(db, COLLECTION, DOC_NEXT));
  if (!snap.exists()) return [...DEFAULT_DAILY_NEXT_ACTIONS];
  return parseNextActions(snap.data() as Record<string, unknown>);
}

export async function saveDailyNextActions(items: DailyNextActionConfig[]): Promise<void> {
  const db = getDbOrThrow();
  const normalized = sortByOrder(
    items.map((r, i) => ({
      ...r,
      id: r.id.trim(),
      title: r.title.trim(),
      description: r.description.trim(),
      href: r.href.trim(),
      sortOrder: r.sortOrder || (i + 1) * 10,
    }))
  ).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    href: r.href,
    external: r.external === true,
    sortOrder: r.sortOrder,
  }));
  await setDoc(
    doc(db, COLLECTION, DOC_NEXT),
    {
      items: normalized,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}

export async function getDailyChecklistTemplate(): Promise<DailyChecklistTemplateRow[]> {
  const db = getDbOrThrow();
  const snap = await getDoc(doc(db, COLLECTION, DOC_CHECKLIST));
  if (!snap.exists()) return [...DEFAULT_CHECKLIST_TEMPLATE_ROWS];
  return parseChecklistTemplate(snap.data() as Record<string, unknown>);
}

export async function saveDailyChecklistTemplate(items: DailyChecklistTemplateRow[]): Promise<void> {
  const db = getDbOrThrow();
  const normalized = sortByOrder(
    items.map((r, i) => ({
      ...r,
      id: r.id.trim().replace(/\s+/g, '_'),
      label: r.label.trim(),
      docUrl: r.docUrl?.trim() || undefined,
      toolUrl: r.toolUrl?.trim() || undefined,
      sortOrder: r.sortOrder || (i + 1) * 10,
    }))
  ).map((r) => ({
    id: r.id,
    label: r.label,
    docUrl: r.docUrl ?? null,
    toolUrl: r.toolUrl ?? null,
    sortOrder: r.sortOrder,
  }));
  await setDoc(
    doc(db, COLLECTION, DOC_CHECKLIST),
    {
      items: normalized,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}
