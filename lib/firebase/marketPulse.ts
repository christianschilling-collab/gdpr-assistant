/**
 * Market Pulse Check Management
 * 
 * CRUD operations for weekly market pulse checks
 */

import { getDb } from './config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { MarketPulseCheck } from '../types';

const MARKET_PULSE_COLLECTION = 'marketPulseChecks';

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured. Please set up Firebase in .env.local');
  }
  return db;
}

/**
 * Create or update a market pulse check
 */
export async function saveMarketPulseCheck(
  pulseCheck: MarketPulseCheck
): Promise<string> {
  const db = getDbOrThrow();

  if (pulseCheck.id) {
    // Update existing
    const pulseRef = doc(db, MARKET_PULSE_COLLECTION, pulseCheck.id);
    await updateDoc(pulseRef, {
      market: pulseCheck.market,
      week: pulseCheck.week,
      responses: pulseCheck.responses,
      overallScore: pulseCheck.overallScore,
      status: pulseCheck.status,
      notes: pulseCheck.notes || null,
      submittedAt: Timestamp.fromDate(pulseCheck.submittedAt),
    });
    return pulseCheck.id;
  } else {
    // Create new
    const pulseRef = doc(collection(db, MARKET_PULSE_COLLECTION));
    await setDoc(pulseRef, {
      market: pulseCheck.market,
      week: pulseCheck.week,
      submittedBy: pulseCheck.submittedBy,
      responses: pulseCheck.responses,
      overallScore: pulseCheck.overallScore || null,
      status: pulseCheck.status,
      notes: pulseCheck.notes || null,
      submittedAt: Timestamp.fromDate(pulseCheck.submittedAt),
    });
    return pulseRef.id;
  }
}

/**
 * Get pulse check by ID
 */
export async function getMarketPulseCheck(
  pulseId: string
): Promise<MarketPulseCheck | null> {
  const db = getDbOrThrow();

  try {
    const pulseRef = doc(db, MARKET_PULSE_COLLECTION, pulseId);
    const pulseSnap = await getDoc(pulseRef);

    if (!pulseSnap.exists()) {
      return null;
    }

    const data = pulseSnap.data();
    return {
      id: pulseSnap.id,
      market: data.market,
      week: data.week,
      submittedBy: data.submittedBy,
      responses: data.responses || [],
      overallScore: data.overallScore || undefined,
      status: data.status || 'draft',
      notes: data.notes || undefined,
      submittedAt: data.submittedAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error getting market pulse check:', error);
    return null;
  }
}

/**
 * Get pulse checks for a specific week
 */
export async function getPulseChecksByWeek(week: string): Promise<MarketPulseCheck[]> {
  const db = getDbOrThrow();

  try {
    const q = query(
      collection(db, MARKET_PULSE_COLLECTION),
      where('week', '==', week),
      orderBy('market', 'asc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        market: data.market,
        week: data.week,
        submittedBy: data.submittedBy,
        responses: data.responses || [],
        overallScore: data.overallScore || undefined,
        status: data.status || 'draft',
        notes: data.notes || undefined,
        submittedAt: data.submittedAt?.toDate() || new Date(),
      };
    });
  } catch (error) {
    console.error('Error getting pulse checks by week:', error);
    return [];
  }
}

/**
 * Get pulse checks for a specific market
 */
export async function getPulseChecksByMarket(
  market: string,
  limit?: number
): Promise<MarketPulseCheck[]> {
  const db = getDbOrThrow();

  try {
    const q = query(
      collection(db, MARKET_PULSE_COLLECTION),
      where('market', '==', market),
      orderBy('week', 'desc')
    );
    const querySnapshot = await getDocs(q);

    const checks = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        market: data.market,
        week: data.week,
        submittedBy: data.submittedBy,
        responses: data.responses || [],
        overallScore: data.overallScore || undefined,
        status: data.status || 'draft',
        notes: data.notes || undefined,
        submittedAt: data.submittedAt?.toDate() || new Date(),
      };
    });

    return limit ? checks.slice(0, limit) : checks;
  } catch (error) {
    console.error('Error getting pulse checks by market:', error);
    return [];
  }
}

/**
 * Get all pulse checks (with optional filters)
 */
export async function getAllPulseChecks(
  options?: {
    week?: string;
    market?: string;
    status?: MarketPulseCheck['status'];
    limit?: number;
  }
): Promise<MarketPulseCheck[]> {
  const db = getDbOrThrow();

  try {
    let q = query(collection(db, MARKET_PULSE_COLLECTION));

    if (options?.week) {
      q = query(q, where('week', '==', options.week));
    }
    if (options?.market) {
      q = query(q, where('market', '==', options.market));
    }
    if (options?.status) {
      q = query(q, where('status', '==', options.status));
    }

    q = query(q, orderBy('week', 'desc'), orderBy('market', 'asc'));

    const querySnapshot = await getDocs(q);

    let checks = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        market: data.market,
        week: data.week,
        submittedBy: data.submittedBy,
        responses: data.responses || [],
        overallScore: data.overallScore || undefined,
        status: data.status || 'draft',
        notes: data.notes || undefined,
        submittedAt: data.submittedAt?.toDate() || new Date(),
      };
    });

    if (options?.limit) {
      checks = checks.slice(0, options.limit);
    }

    return checks;
  } catch (error) {
    console.error('Error getting all pulse checks:', error);
    return [];
  }
}

/**
 * Calculate average score for a week
 */
export async function getAverageScoreForWeek(week: string): Promise<number> {
  const checks = await getPulseChecksByWeek(week);
  if (checks.length === 0) {
    return 0;
  }

  const scores = checks
    .map((c) => c.overallScore)
    .filter((s): s is number => s !== undefined);

  if (scores.length === 0) {
    return 0;
  }

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * Get week trends (comparing current week to previous)
 */
export async function getWeekTrends(
  currentWeek: string
): Promise<{ market: string; trend: 'improving' | 'stable' | 'declining'; change: number }[]> {
  // Extract year and week number from format "2024-W01"
  const [year, weekNum] = currentWeek.split('-W').map(Number);
  const prevWeekNum = weekNum === 1 ? 52 : weekNum - 1;
  const prevYear = weekNum === 1 ? year - 1 : year;
  const previousWeek = `${prevYear}-W${prevWeekNum.toString().padStart(2, '0')}`;

  const currentChecks = await getPulseChecksByWeek(currentWeek);
  const previousChecks = await getPulseChecksByWeek(previousWeek);

  const trends = currentChecks.map((current) => {
    const previous = previousChecks.find((p) => p.market === current.market);
    const currentScore = current.overallScore || 0;
    const previousScore = previous?.overallScore || 0;

    const change = currentScore - previousScore;
    let trend: 'improving' | 'stable' | 'declining';
    if (change > 2) {
      trend = 'improving';
    } else if (change < -2) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    return {
      market: current.market,
      trend,
      change: previousScore > 0 ? Math.round((change / previousScore) * 100) : 0,
    };
  });

  return trends;
}

/**
 * Generate ISO week string from date
 */
export function getWeekString(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}
