/**
 * Case History & Activity Tracking
 */

import { getDb } from './config';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { CaseStatusChange, CaseActivity } from '../types';

const CASE_HISTORY_COLLECTION = 'caseHistory';
const CASE_ACTIVITY_COLLECTION = 'caseActivity';

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured. Please set up Firebase in .env.local');
  }
  return db;
}

/**
 * Log a status change
 */
export async function logStatusChange(
  caseId: string,
  change: CaseStatusChange
): Promise<string> {
  const db = getDbOrThrow();
  const docRef = await addDoc(collection(db, CASE_HISTORY_COLLECTION), {
    caseId,
    fromStatus: change.fromStatus,
    toStatus: change.toStatus,
    changedBy: change.changedBy || null,
    changedAt: Timestamp.fromDate(change.changedAt),
    reason: change.reason || null,
  });
  return docRef.id;
}

/**
 * Get status history for a case
 */
export async function getCaseStatusHistory(caseId: string): Promise<CaseStatusChange[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, CASE_HISTORY_COLLECTION),
    where('caseId', '==', caseId),
    orderBy('changedAt', 'desc')
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      fromStatus: data.fromStatus,
      toStatus: data.toStatus,
      changedBy: data.changedBy,
      changedAt: data.changedAt?.toDate() || new Date(),
      reason: data.reason,
    };
  });
}

/**
 * Log an activity
 */
export async function logCaseActivity(
  caseId: string,
  activity: CaseActivity
): Promise<string> {
  const db = getDbOrThrow();
  const docRef = await addDoc(collection(db, CASE_ACTIVITY_COLLECTION), {
    caseId,
    type: activity.type,
    user: activity.user || null,
    timestamp: Timestamp.fromDate(activity.timestamp),
    description: activity.description,
    details: activity.details || null,
  });
  return docRef.id;
}

/**
 * Get activity log for a case
 */
export async function getCaseActivityLog(caseId: string): Promise<CaseActivity[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, CASE_ACTIVITY_COLLECTION),
    where('caseId', '==', caseId),
    orderBy('timestamp', 'desc')
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      type: data.type,
      user: data.user,
      timestamp: data.timestamp?.toDate() || new Date(),
      description: data.description,
      details: data.details,
    };
  });
}
