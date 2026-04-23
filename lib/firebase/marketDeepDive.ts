/**
 * Firestore operations for Market Deep Dive Reports
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { getDb } from './config';
import { MarketDeepDive, MarketData, SignificantIncident } from '../types/marketDeepDive';
import { resolveActivityKind, isActivityLowlightKind } from '../reporting/activityLogKinds';

const COLLECTION_NAME = 'marketDeepDive';

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured. Please set up Firebase in .env.local');
  }
  return db;
}

/**
 * Convert Firestore document to MarketDeepDive
 */
function docToMarketDeepDive(id: string, data: DocumentData): MarketDeepDive {
  // Helper to ensure market data has all fields
  const ensureMarketData = (marketData: any): MarketData => ({
    deletionRequests: marketData?.deletionRequests ?? 0,
    deletionsHC: marketData?.deletionsHC, // Keep undefined if not set
    dsarRequests: marketData?.dsarRequests ?? 0,
    escalations: marketData?.escalations ?? 0,
    statusText: marketData?.statusText ?? '',
  });
  
  return {
    id,
    month: data.month,
    markets: {
      DACH: ensureMarketData(data.markets?.DACH),
      Nordics: ensureMarketData(data.markets?.Nordics),
      BNL: ensureMarketData(data.markets?.BNL),
      Fr: ensureMarketData(data.markets?.Fr),
    },
    significantIncidents: data.significantIncidents || [],
    summaryAndOutlook: data.summaryAndOutlook || '',
    attributions: data.attributions || [],
    highlightsOverride: data.highlightsOverride || '',
    lowlightsOverride: data.lowlightsOverride || '',
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    createdBy: data.createdBy,
  };
}

/**
 * Create or update a Market Deep Dive report
 */
export async function saveMarketDeepDive(
  month: string,
  data: Omit<MarketDeepDive, 'id' | 'month' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getDbOrThrow();
  const now = Timestamp.now();
  
  // Use month as document ID for uniqueness
  const docRef = doc(db, COLLECTION_NAME, month);
  
  // Merge with existing data to preserve auto-loaded numbers
  const existingDoc = await getDoc(docRef);
  const existingData = existingDoc.exists() ? existingDoc.data() : null;
  
  // Merge markets: keep numbers from existing data or use provided, but always update statusText and deletionsHC
  const mergedMarkets: any = {};
  for (const [market, marketData] of Object.entries(data.markets)) {
    const existing = existingData?.markets?.[market];
    const marketEntry: any = {
      deletionRequests: existing?.deletionRequests ?? marketData.deletionRequests,
      dsarRequests: existing?.dsarRequests ?? marketData.dsarRequests,
      escalations: existing?.escalations ?? marketData.escalations,
      statusText: marketData.statusText, // Always update status text
    };
    
    // Only add deletionsHC if it has a value (not undefined/null)
    if (marketData.deletionsHC !== undefined && marketData.deletionsHC !== null) {
      marketEntry.deletionsHC = marketData.deletionsHC;
    }
    
    mergedMarkets[market] = marketEntry;
  }
  
  await setDoc(docRef, {
    month,
    markets: mergedMarkets,
    significantIncidents: data.significantIncidents,
    summaryAndOutlook: data.summaryAndOutlook || '',
    attributions: data.attributions || [],
    highlightsOverride: data.highlightsOverride || '',
    lowlightsOverride: data.lowlightsOverride || '',
    createdAt: existingData?.createdAt || (data.createdAt ? Timestamp.fromDate(data.createdAt) : now),
    updatedAt: now,
    createdBy: data.createdBy || existingData?.createdBy,
  }, { merge: true });
  
  return month;
}

/**
 * Get Market Deep Dive for a specific month
 */
export async function getMarketDeepDive(month: string): Promise<MarketDeepDive | null> {
  const db = getDbOrThrow();
  const docRef = doc(db, COLLECTION_NAME, month);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docToMarketDeepDive(docSnap.id, docSnap.data());
}

/**
 * Get all Market Deep Dive reports
 */
export async function getAllMarketDeepDives(): Promise<MarketDeepDive[]> {
  const db = getDbOrThrow();
  const q = query(collection(db, COLLECTION_NAME));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs
    .map((doc) => docToMarketDeepDive(doc.id, doc.data()))
    .sort((a, b) => {
      // Sort by month descending (newest first)
      return b.month.localeCompare(a.month);
    });
}

/**
 * Aggregate market data from Cases and Weekly Reports for a specific month
 */
export async function aggregateMarketDataForMonth(month: string): Promise<Record<string, { deletionRequests: number; dsarRequests: number; escalations: number }>> {
  try {
    const { getAllCases } = await import('./cases');
    const { getWeeklyReports, getActivityLog } = await import('./weeklyReports');
    const { getCategories } = await import('./categories');
    
    // Get month boundaries
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);
    
    // Initialize result
    const result: Record<string, { deletionRequests: number; dsarRequests: number; escalations: number }> = {
      DACH: { deletionRequests: 0, dsarRequests: 0, escalations: 0 },
      Nordics: { deletionRequests: 0, dsarRequests: 0, escalations: 0 },
      BNL: { deletionRequests: 0, dsarRequests: 0, escalations: 0 },
      Fr: { deletionRequests: 0, dsarRequests: 0, escalations: 0 },
    };
    
    // Get all cases for the month
    let allCases: any[] = [];
    try {
      allCases = await getAllCases();
    } catch (error) {
      console.warn('Could not load cases:', error);
    }
    
    const monthCases = allCases.filter(c => {
      try {
        const caseDate = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt);
        return caseDate >= startDate && caseDate <= endDate;
      } catch {
        return false;
      }
    });
    
    // Get categories to identify deletion and DSAR
    let categories: any[] = [];
    try {
      categories = await getCategories();
    } catch (error) {
      console.warn('Could not load categories:', error);
    }
    
    const deletionCategory = categories.find(c => c.nameEn?.toLowerCase().includes('deletion'));
    const dsarCategory = categories.find(c => 
      c.nameEn?.toLowerCase().includes('access') || 
      c.nameEn?.toLowerCase().includes('portability') ||
      c.nameEn?.toLowerCase().includes('dsar')
    );
    
    // Get weekly reports for the month
    let weeklyReports: any[] = [];
    try {
      weeklyReports = await getWeeklyReports();
    } catch (error) {
      console.warn('Could not load weekly reports:', error);
    }
    
    const monthReports = weeklyReports.filter(r => {
      try {
        const reportDate = r.weekOf instanceof Date ? r.weekOf : new Date(r.weekOf);
        return reportDate >= startDate && reportDate <= endDate;
      } catch {
        return false;
      }
    });
    
    // Get activity log for escalations
    let activityLog: any[] = [];
    try {
      activityLog = await getActivityLog();
    } catch (error) {
      console.warn('Could not load activity log:', error);
    }
    
    const monthEscalations = activityLog.filter(a => {
      try {
        const logDate = a.weekOf instanceof Date ? a.weekOf : new Date(a.weekOf);
        return isActivityLowlightKind(resolveActivityKind(a)) && logDate >= startDate && logDate <= endDate;
      } catch {
        return false;
      }
    });
  
    
    // Market mapping: Cases use country codes, we need to map to market groups
    const mapCaseMarketToMarketGroup = (market: string): string | null => {
      if (!market) return null;
      const upper = market.toUpperCase();
      if (['DE', 'AT', 'CH'].includes(upper)) return 'DACH';
      if (['SE', 'NO', 'DK', 'FI'].includes(upper)) return 'Nordics';
      if (['NL'].includes(upper)) return 'BNL';
      if (['BE', 'LU'].includes(upper)) return 'BNL';
      if (['FR'].includes(upper)) return 'Fr';
      return null;
    };
    
    const mapWeeklyReportMarket = (market: string): string | null => {
      if (!market) return null;
      if (market === 'DACH') return 'DACH';
      if (market === 'Nordics') return 'Nordics';
      if (market === 'NL' || market === 'Be / Lux') return 'BNL';
      if (market === 'France') return 'Fr';
      return null;
    };
    
    // Count cases by category and market
    for (const caseItem of monthCases) {
      const marketGroup = mapCaseMarketToMarketGroup(caseItem.market);
      if (!marketGroup) continue;
      
      if (deletionCategory && caseItem.primaryCategory === deletionCategory.id) {
        result[marketGroup].deletionRequests++;
      }
      if (dsarCategory && caseItem.primaryCategory === dsarCategory.id) {
        result[marketGroup].dsarRequests++;
      }
    }
    
    // Aggregate from weekly reports (more reliable for monthly totals)
    for (const report of monthReports) {
      const marketGroup = mapWeeklyReportMarket(report.market);
      if (!marketGroup) continue;
      
      result[marketGroup].deletionRequests += (report.deletionRequests || 0);
      result[marketGroup].dsarRequests += (report.portabilityRequests || 0); // Weekly reports still use "portability"
    }
    
    // Count escalations from activity log
    for (const escalation of monthEscalations) {
      const marketGroup = mapWeeklyReportMarket(escalation.market);
      if (!marketGroup) continue;
      
      result[marketGroup].escalations++;
    }
    
    return result;
  } catch (error) {
    console.error('Error aggregating market data:', error);
    // Return empty result on error
    return {
      DACH: { deletionRequests: 0, dsarRequests: 0, escalations: 0 },
      Nordics: { deletionRequests: 0, dsarRequests: 0, escalations: 0 },
      BNL: { deletionRequests: 0, dsarRequests: 0, escalations: 0 },
      Fr: { deletionRequests: 0, dsarRequests: 0, escalations: 0 },
    };
  }
}
