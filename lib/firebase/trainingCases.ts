import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  getDoc, 
  query, 
  where,
  orderBy,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { getDb } from '../firebase/config';
import { TrainingCase, TrainingReport } from '../types/training';

const TRAINING_CASES_COLLECTION = 'trainingCases';

function getDbOrThrow() {
  const db = getDb();
  if (!db) throw new Error('Firebase not initialized');
  return db;
}

/**
 * Upload training cases from CSV
 */
export async function uploadTrainingCases(cases: Omit<TrainingCase, 'id' | 'createdAt'>[]): Promise<{
  success: number;
  failed: number;
  created: number;
  updated: number;
  errors: string[];
}> {
  const db = getDbOrThrow();
  let success = 0;
  let failed = 0;
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const caseData of cases) {
    try {
      // Create unique document ID from link (for deduplication)
      const linkHash = caseData.link ? caseData.link.split('/').pop() : `${Date.now()}_${Math.random()}`;
      const docId = `${caseData.month}_${linkHash}`;
      
      // Check if document already exists (simple check via getDoc)
      const docRef = doc(db, TRAINING_CASES_COLLECTION, docId);
      const existingDoc = await getDoc(docRef);
      const isUpdate = existingDoc.exists();

      // Remove undefined fields (Firestore doesn't accept undefined)
      const cleanData: any = {
        month: caseData.month,
        timestamp: Timestamp.fromDate(caseData.timestamp),
        interactionDate: Timestamp.fromDate(caseData.interactionDate),
        channel: caseData.channel,
        market: caseData.market,
        errorType: caseData.errorType,
        errorDescription: caseData.errorDescription,
        createdAt: isUpdate ? (existingDoc.data()?.createdAt || Timestamp.now()) : Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Only add optional fields if they have values
      if (caseData.notes) cleanData.notes = caseData.notes;
      if (caseData.link) cleanData.link = caseData.link;
      if (caseData.reporter) cleanData.reporter = caseData.reporter;
      if (caseData.forwarded) cleanData.forwarded = caseData.forwarded;
      
      await setDoc(docRef, cleanData);
      
      if (isUpdate) {
        updated++;
      } else {
        created++;
      }
      success++;
    } catch (error) {
      failed++;
      errors.push(`Failed to upload case: ${error}`);
      console.error('Error uploading training case:', error);
    }
  }

  return { success, failed, created, updated, errors };
}

/**
 * Get training cases for a specific month
 */
export async function getTrainingCasesByMonth(month: string): Promise<TrainingCase[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, TRAINING_CASES_COLLECTION),
    where('month', '==', month)
  );
  
  const snapshot = await getDocs(q);
  const cases = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate() || new Date(),
      interactionDate: data.interactionDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
    } as TrainingCase;
  });
  
  // Sort client-side to avoid composite index requirement
  return cases.sort((a, b) => b.interactionDate.getTime() - a.interactionDate.getTime());
}

/**
 * Get all training cases
 */
export async function getAllTrainingCases(): Promise<TrainingCase[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, TRAINING_CASES_COLLECTION)
  );
  
  const snapshot = await getDocs(q);
  const cases = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate() || new Date(),
      interactionDate: data.interactionDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
    } as TrainingCase;
  });
  
  // Sort client-side to avoid composite index requirement
  return cases.sort((a, b) => b.interactionDate.getTime() - a.interactionDate.getTime());
}

/**
 * Generate training report for a month
 */
export async function generateTrainingReport(month: string, previousMonth?: string): Promise<TrainingReport> {
  const cases = await getTrainingCasesByMonth(month);
  const previousCases = previousMonth ? await getTrainingCasesByMonth(previousMonth) : [];

  // Aggregate by market
  const byMarket: Record<string, {
    total: number;
    byErrorType: Record<string, number>;
    trend: 'up' | 'down' | 'flat';
  }> = {};

  // Count current month
  for (const c of cases) {
    if (!byMarket[c.market]) {
      byMarket[c.market] = {
        total: 0,
        byErrorType: {},
        trend: 'flat',
      };
    }
    byMarket[c.market].total++;
    byMarket[c.market].byErrorType[c.errorType] = 
      (byMarket[c.market].byErrorType[c.errorType] || 0) + 1;
  }

  // Calculate trends
  const previousByMarket: Record<string, number> = {};
  for (const c of previousCases) {
    previousByMarket[c.market] = (previousByMarket[c.market] || 0) + 1;
  }

  for (const market in byMarket) {
    const current = byMarket[market].total;
    const previous = previousByMarket[market] || 0;
    
    if (previous === 0) {
      byMarket[market].trend = 'flat';
    } else {
      const change = ((current - previous) / previous) * 100;
      if (change > 10) byMarket[market].trend = 'up';
      else if (change < -10) byMarket[market].trend = 'down';
      else byMarket[market].trend = 'flat';
    }
  }

  // Generate top errors with descriptions
  const errorMap = new Map<string, {
    market: string;
    errorType: string;
    errorDescription: string;
    count: number;
    trend: 'up' | 'down' | 'flat';
  }>();

  for (const c of cases) {
    const key = `${c.market}_${c.errorType}`;
    if (!errorMap.has(key)) {
      errorMap.set(key, {
        market: c.market,
        errorType: c.errorType,
        errorDescription: c.errorDescription,
        count: 0,
        trend: byMarket[c.market].trend,
      });
    }
    errorMap.get(key)!.count++;
  }

  const topErrors = Array.from(errorMap.values()).sort((a, b) => b.count - a.count);

  return {
    month,
    totalCases: cases.length,
    byMarket,
    topErrors: topErrors.slice(0, 20), // Top 20
  };
}

/**
 * Delete training cases for a specific month
 */
export async function deleteTrainingCasesByMonth(month: string): Promise<number> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, TRAINING_CASES_COLLECTION),
    where('month', '==', month)
  );
  
  const snapshot = await getDocs(q);
  let deleted = 0;
  
  for (const docSnapshot of snapshot.docs) {
    await deleteDoc(doc(db, TRAINING_CASES_COLLECTION, docSnapshot.id));
    deleted++;
  }
  
  return deleted;
}
