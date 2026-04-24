import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import type { TeamAbsence, TeamAbsenceKind } from '../types';
import { getDb } from './config';

const COLLECTION = 'teamAbsences';
const LIST_LIMIT = 400;

function getDbOrThrow() {
  const db = getDb();
  if (!db) throw new Error('Firebase is not configured');
  return db;
}

const KINDS: TeamAbsenceKind[] = ['vacation', 'sick', 'training', 'other'];

function isKind(v: unknown): v is TeamAbsenceKind {
  return typeof v === 'string' && (KINDS as string[]).includes(v);
}

function docToTeamAbsence(id: string, data: Record<string, unknown>): TeamAbsence {
  return {
    id,
    userEmail: String(data.userEmail ?? '').trim().toLowerCase(),
    displayName: data.displayName ? String(data.displayName) : undefined,
    startDate: String(data.startDate ?? ''),
    endDate: String(data.endDate ?? ''),
    kind: isKind(data.kind) ? data.kind : 'other',
    note: data.note ? String(data.note) : undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
  };
}

export async function listTeamAbsences(): Promise<TeamAbsence[]> {
  const db = getDbOrThrow();
  const q = query(collection(db, COLLECTION), orderBy('startDate', 'desc'), limit(LIST_LIMIT));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToTeamAbsence(d.id, d.data() as Record<string, unknown>));
}

export async function addTeamAbsence(input: {
  userEmail: string;
  displayName?: string;
  startDate: string;
  endDate: string;
  kind: TeamAbsenceKind;
  note?: string;
}): Promise<string> {
  const db = getDbOrThrow();
  const now = Timestamp.now();
  const em = input.userEmail.trim().toLowerCase();
  const ref = await addDoc(collection(db, COLLECTION), {
    userEmail: em,
    displayName: input.displayName ?? null,
    startDate: input.startDate,
    endDate: input.endDate,
    kind: input.kind,
    note: input.note?.trim() || null,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function deleteTeamAbsence(id: string): Promise<void> {
  const db = getDbOrThrow();
  await deleteDoc(doc(db, COLLECTION, id));
}
