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

// ============================================
// WEEKLY REPORTS CRUD
// ============================================

export async function createWeeklyReport(reportData: Omit<WeeklyReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const db = getFirestore();
    const weeklyReportsRef = collection(db, 'weeklyReports');
    const docRef = await addDoc(weeklyReportsRef, {
      ...reportData,
      weekOf: Timestamp.fromDate(reportData.weekOf),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
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
      limit(100)
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
    const docRef = await addDoc(collection(db, 'activityLog'), {
      ...entryData,
      weekOf: Timestamp.fromDate(entryData.weekOf),
      createdAt: Timestamp.now(),
    });
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
      limit(200)
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

// ============================================
// BULK IMPORT FROM CSV (with UPSERT logic)
// ============================================

/**
 * Generate a deterministic ID for a weekly report based on market and week
 * This allows us to upsert (update if exists, create if not)
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
 * Delete existing activity log entries for a specific report (market + week)
 */
async function deleteActivityLogForReport(market: string, weekOf: Date): Promise<void> {
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
async function upsertWeeklyReport(reportData: Omit<WeeklyReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ created: boolean; id: string }> {
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
    await setDoc(docRef, data);
    
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
  const entries: Omit<ActivityLogEntry, 'id' | 'createdAt'>[] = [];
  
  // Escalation Details → Escalation entry
  if (reportData.escalationDetails && reportData.escalationDetails.trim() !== '' && reportData.escalationDetails !== '—') {
    entries.push({
      market: reportData.market,
      weekOf: reportData.weekOf,
      category: 'Escalation',
      details: reportData.escalationDetails.trim(),
    });
  }
  
  // Current Initiatives → Initiative entry
  if (reportData.currentInitiatives && reportData.currentInitiatives.trim() !== '' && reportData.currentInitiatives !== '—') {
    entries.push({
      market: reportData.market,
      weekOf: reportData.weekOf,
      category: 'Initiative',
      details: reportData.currentInitiatives.trim(),
    });
  }
  
  // Wins/Good News → Initiative entry
  if (reportData.winsGoodNews && reportData.winsGoodNews.trim() !== '' && reportData.winsGoodNews !== '—') {
    entries.push({
      market: reportData.market,
      weekOf: reportData.weekOf,
      category: 'Initiative',
      details: `✅ ${reportData.winsGoodNews.trim()}`,
    });
  }
  
  // Save all entries
  for (const entry of entries) {
    try {
      await createActivityLogEntry(entry);
    } catch (error) {
      console.error('Failed to create activity log entry:', error);
    }
  }
}

export async function bulkImportWeeklyReports(reports: Omit<WeeklyReport, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<{ success: number; failed: number; created: number; updated: number }> {
  let success = 0;
  let failed = 0;
  let created = 0;
  let updated = 0;

  for (const report of reports) {
    try {
      const result = await upsertWeeklyReport(report);
      success++;
      if (result.created) {
        created++;
      } else {
        updated++;
      }
    } catch (error) {
      console.error('Failed to import report:', error);
      failed++;
    }
  }

  return { success, failed, created, updated };
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
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

function docToActivityLogEntry(doc: any): ActivityLogEntry {
  const data = doc.data();
  return {
    id: doc.id,
    market: data.market,
    weekOf: data.weekOf?.toDate() || new Date(),
    category: data.category,
    details: data.details,
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}
