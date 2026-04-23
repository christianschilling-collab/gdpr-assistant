import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { WeeklyReport, ActivityLogEntry } from '../types';
import { isValidActivityKind, kindToCategory } from '../reporting/activityLogKinds';

// Import Firebase getDb function
import { getDb } from './config';

// ============================================
// HELPER: Get Firestore instance
// ============================================
function getFirestore() {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase not initialized. Please check your Firebase configuration in .env.local');
  }
  return db;
}

/** Firestore rejects `undefined` field values; omit those keys before write. */
function omitUndefinedFields<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

// ============================================
// WEEKLY REPORTS CRUD
// ============================================

export async function createWeeklyReport(reportData: Omit<WeeklyReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const db = getFirestore();
    const weeklyReportsRef = collection(db, 'weeklyReports');
    const docRef = await addDoc(
      weeklyReportsRef,
      omitUndefinedFields({
        ...reportData,
        weekOf: Timestamp.fromDate(reportData.weekOf),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }) as Record<string, unknown>
    );
    return docRef.id;
  } catch (error) {
    console.error('Error creating weekly report:', error);
    throw error;
  }
}

export async function getWeeklyReports(marketFilter?: string, startDate?: Date, endDate?: Date): Promise<WeeklyReport[]> {
  try {
    const db = getFirestore();
    let q = query(
      collection(db, 'weeklyReports'), 
      orderBy('weekOf', 'desc'),
      limit(500)
    );

    const snapshot = await getDocs(q);
    let reports = snapshot.docs.map(docToWeeklyReport);

    // Client-side filtering
    if (marketFilter) {
      reports = reports.filter(r => r.market === marketFilter);
    }
    if (startDate) {
      reports = reports.filter(r => r.weekOf >= startDate);
    }
    if (endDate) {
      reports = reports.filter(r => r.weekOf <= endDate);
    }

    return reports;
  } catch (error) {
    console.error('Error fetching weekly reports:', error);
    throw error;
  }
}

export async function getWeeklyReport(id: string): Promise<WeeklyReport | null> {
  try {
    const db = getFirestore();
    const docRef = doc(db, 'weeklyReports', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return docToWeeklyReport(docSnap);
  } catch (error) {
    console.error('Error fetching weekly report:', error);
    throw error;
  }
}

export async function updateWeeklyReport(id: string, updates: Partial<WeeklyReport>): Promise<void> {
  try {
    const db = getFirestore();
    const docRef = doc(db, 'weeklyReports', id);
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    if (updates.weekOf) {
      updateData.weekOf = Timestamp.fromDate(updates.weekOf);
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating weekly report:', error);
    throw error;
  }
}

export async function deleteWeeklyReport(id: string): Promise<void> {
  try {
    const db = getFirestore();
    await deleteDoc(doc(db, 'weeklyReports', id));
  } catch (error) {
    console.error('Error deleting weekly report:', error);
    throw error;
  }
}

// ============================================
// ACTIVITY LOG CRUD
// ============================================

export async function createActivityLogEntry(entryData: Omit<ActivityLogEntry, 'id' | 'createdAt'>): Promise<string> {
  try {
    const db = getFirestore();
    const docRef = await addDoc(
      collection(db, 'activityLog'),
      omitUndefinedFields({
        ...entryData,
        weekOf: Timestamp.fromDate(entryData.weekOf),
        createdAt: Timestamp.now(),
      }) as Record<string, unknown>
    );
    return docRef.id;
  } catch (error) {
    console.error('Error creating activity log entry:', error);
    throw error;
  }
}

export async function getActivityLog(marketFilter?: string, startDate?: Date, endDate?: Date): Promise<ActivityLogEntry[]> {
  try {
    const db = getFirestore();
    let q = query(
      collection(db, 'activityLog'), 
      orderBy('weekOf', 'desc'),
      limit(500)
    );

    const snapshot = await getDocs(q);
    let entries = snapshot.docs.map(docToActivityLogEntry);

    // Client-side filtering
    if (marketFilter) {
      entries = entries.filter(e => e.market === marketFilter);
    }
    if (startDate) {
      entries = entries.filter(e => e.weekOf >= startDate);
    }
    if (endDate) {
      entries = entries.filter(e => e.weekOf <= endDate);
    }

    return entries;
  } catch (error) {
    console.error('Error fetching activity log:', error);
    throw error;
  }
}

/** Admin: correct typos or counts on a single activity-log line (does not re-run weekly upsert). */
export async function updateActivityLogEntry(
  id: string,
  updates: Partial<Pick<ActivityLogEntry, 'details' | 'title' | 'kind' | 'category' | 'market' | 'weekOf'>>
): Promise<void> {
  try {
    const db = getFirestore();
    const docRef = doc(db, 'activityLog', id);
    const patch: Record<string, unknown> = { ...updates };
    if (updates.weekOf) {
      patch.weekOf = Timestamp.fromDate(updates.weekOf);
    }
    if (updates.kind && updates.category === undefined) {
      patch.category = kindToCategory(updates.kind);
    }
    await updateDoc(docRef, omitUndefinedFields(patch) as Record<string, unknown>);
  } catch (error) {
    console.error('Error updating activity log entry:', error);
    throw error;
  }
}

/** Admin: remove a single activity-log document. */
export async function deleteActivityLogEntry(id: string): Promise<void> {
  try {
    const db = getFirestore();
    await deleteDoc(doc(db, 'activityLog', id));
  } catch (error) {
    console.error('Error deleting activity log entry:', error);
    throw error;
  }
}

// ============================================
// WEEKLY REPORT UPSERT (deterministic ID per market + week)
// ============================================

/**
 * Generate a deterministic ID for a weekly report based on market and week
 * (update if exists, create if not)
 */
function generateReportId(market: string, weekOf: Date): string {
  const year = weekOf.getFullYear();
  const month = String(weekOf.getMonth() + 1).padStart(2, '0');
  const day = String(weekOf.getDate()).padStart(2, '0');
  // Replace / with - to avoid Firestore path issues
  const safeMarket = market.replace(/\//g, '-').replace(/\s+/g, '_');
  // Format: DACH_2026-02-13 or Be-Lux_2026-02-13
  return `${safeMarket}_${year}-${month}-${day}`;
}

/**
 * Delete all activity-log documents for this market + week (used before regenerating from a weekly report).
 */
export async function deleteActivityLogForReport(market: string, weekOf: Date): Promise<void> {
  try {
    const db = getFirestore();
    // Query for all activity log entries matching this market and week
    const q = query(
      collection(db, 'activityLog'),
      where('market', '==', market),
      where('weekOf', '==', Timestamp.fromDate(weekOf))
    );
    
    const snapshot = await getDocs(q);
    
    // Delete all matching entries
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`Deleted ${snapshot.docs.length} activity log entries for ${market} - ${weekOf.toISOString()}`);
  } catch (error) {
    console.error('Error deleting activity log entries:', error);
    // Don't throw - we want the upsert to continue even if cleanup fails
  }
}

/**
 * Upsert a weekly report (create if new, update if exists)
 * Also creates/updates activity log entries from text fields
 */
/** Create or replace the report for this market + week; refreshes activity log from structured items or legacy text fields. */
export async function upsertWeeklyReport(
  reportData: Omit<WeeklyReport, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ created: boolean; id: string }> {
  try {
    const db = getFirestore();
    const reportId = generateReportId(reportData.market, reportData.weekOf);
    const docRef = doc(db, 'weeklyReports', reportId);
    
    // Check if document exists
    const docSnap = await getDoc(docRef);
    const exists = docSnap.exists();
    
    const timestamp = Timestamp.now();
    const data: any = {
      ...reportData,
      weekOf: Timestamp.fromDate(reportData.weekOf),
      updatedAt: timestamp,
    };
    
    if (!exists) {
      // New document - set createdAt
      data.createdAt = timestamp;
    } else {
      // Existing document - keep original createdAt
      data.createdAt = docSnap.data()?.createdAt || timestamp;
    }

    // Use setDoc to create or update (no merge needed, we want to replace)
    await setDoc(docRef, omitUndefinedFields(data) as Record<string, unknown>);
    
    // Always regenerate Activity Log entries (delete old ones first for updates)
    await deleteActivityLogForReport(reportData.market, reportData.weekOf);
    await generateActivityLogEntries(reportData);
    
    return { created: !exists, id: reportId };
  } catch (error) {
    console.error('Error upserting weekly report:', error);
    throw error;
  }
}

/**
 * Generate Activity Log entries from report text fields
 */
async function generateActivityLogEntries(reportData: Omit<WeeklyReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const structured = (reportData.activityItems ?? []).filter(
    item =>
      item &&
      isValidActivityKind(item.kind) &&
      (item.description?.trim() || item.title?.trim())
  );

  if (structured.length > 0) {
    for (const item of structured) {
      const title = (item.title || '').trim();
      const desc = (item.description || '').trim();
      const details = desc || title;
      if (!details) continue;
      try {
        await createActivityLogEntry({
          market: reportData.market,
          weekOf: reportData.weekOf,
          category: kindToCategory(item.kind),
          kind: item.kind,
          title: title || undefined,
          details,
        });
      } catch (error) {
        console.error('Failed to create activity log entry:', error);
      }
    }
    return;
  }

  const entries: Omit<ActivityLogEntry, 'id' | 'createdAt'>[] = [];

  if (reportData.escalationDetails && reportData.escalationDetails.trim() !== '' && reportData.escalationDetails !== '—') {
    entries.push({
      market: reportData.market,
      weekOf: reportData.weekOf,
      category: 'Escalation',
      kind: 'escalation',
      details: reportData.escalationDetails.trim(),
    });
  }

  if (reportData.currentInitiatives && reportData.currentInitiatives.trim() !== '' && reportData.currentInitiatives !== '—') {
    entries.push({
      market: reportData.market,
      weekOf: reportData.weekOf,
      category: 'Initiative',
      kind: 'initiative',
      details: reportData.currentInitiatives.trim(),
    });
  }

  if (reportData.winsGoodNews && reportData.winsGoodNews.trim() !== '' && reportData.winsGoodNews !== '—') {
    entries.push({
      market: reportData.market,
      weekOf: reportData.weekOf,
      category: 'Initiative',
      kind: 'win',
      details: `✅ ${reportData.winsGoodNews.trim()}`,
    });
  }

  for (const entry of entries) {
    try {
      await createActivityLogEntry(entry);
    } catch (error) {
      console.error('Failed to create activity log entry:', error);
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function docToWeeklyReport(doc: any): WeeklyReport {
  const data = doc.data();
  return {
    id: doc.id,
    market: data.market,
    weekOf: data.weekOf?.toDate() || new Date(),
    yourName: data.yourName,
    deletionRequests: data.deletionRequests || 0,
    portabilityRequests: data.portabilityRequests || 0,
    currentBacklog: data.currentBacklog || 0,
    legalEscalations: data.legalEscalations || 0,
    regulatorInquiries: data.regulatorInquiries || 0,
    privacyIncidents: data.privacyIncidents || 0,
    complaints: data.complaints || 0,
    crossFunctionalCases: data.crossFunctionalCases || 0,
    noteworthyEdgeCases: data.noteworthyEdgeCases || 0,
    escalationDetails: data.escalationDetails,
    riskStatus: data.riskStatus || 'green',
    riskExplanation: data.riskExplanation,
    currentInitiatives: data.currentInitiatives,
    supportNeeded: data.supportNeeded,
    winsGoodNews: data.winsGoodNews,
    anythingElse: data.anythingElse,
    activityItems: parseActivityItemsFromFirestore(data.activityItems),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

function parseActivityItemsFromFirestore(raw: unknown): WeeklyReport['activityItems'] {
  if (!Array.isArray(raw)) return undefined;
  const out: NonNullable<WeeklyReport['activityItems']> = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    if (typeof r.kind !== 'string' || !isValidActivityKind(r.kind)) continue;
    out.push({
      kind: r.kind,
      title: typeof r.title === 'string' ? r.title : '',
      description: typeof r.description === 'string' ? r.description : '',
    });
  }
  return out.length > 0 ? out : undefined;
}

function docToActivityLogEntry(doc: any): ActivityLogEntry {
  const data = doc.data();
  return {
    id: doc.id,
    market: data.market,
    weekOf: data.weekOf?.toDate() || new Date(),
    category: data.category === 'Escalation' || data.category === 'Initiative' ? data.category : 'Initiative',
    kind: typeof data.kind === 'string' && isValidActivityKind(data.kind) ? data.kind : undefined,
    title: typeof data.title === 'string' ? data.title : undefined,
    details: data.details ?? '',
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}
