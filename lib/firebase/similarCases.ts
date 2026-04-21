/**
 * Find Similar Cases
 * 
 * Identifies similar cases based on category, keywords, and description
 */

import { getDb } from './config';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { GDPRCase } from '../types';

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured. Please set up Firebase in .env.local');
  }
  return db;
}

/**
 * Find similar cases based on various criteria
 */
export async function findSimilarCases(
  currentCase: GDPRCase,
  options?: {
    limit?: number;
    minSimilarity?: number;
  }
): Promise<Array<{ case: GDPRCase; similarity: number; reason: string }>> {
  const db = getDbOrThrow();
  const maxResults = options?.limit || 5;

  try {
    // Get all resolved cases first
    const q = query(
      collection(db, 'cases'),
      where('status', '==', 'Resolved'),
      orderBy('updatedAt', 'desc'),
      limit(50) // Get more to filter from
    );
    const querySnapshot = await getDocs(q);

    const allCases = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        caseId: data.caseId,
        timestamp: data.timestamp?.toDate() || new Date(),
        teamMember: data.teamMember,
        sourceLink: data.sourceLink,
        market: data.market,
        caseDescription: data.caseDescription,
        specificQuestion: data.specificQuestion,
        urgency: data.urgency,
        primaryCategory: data.primaryCategory,
        subCategory: data.subCategory,
        customerType: data.customerType,
        confidence: data.confidence,
        templateMatches: data.templateMatches,
        suggestedReply: data.suggestedReply,
        keyDetails: data.keyDetails,
        similarCases: data.similarCases,
        reviewFlag: data.reviewFlag,
        status: data.status,
        assignedTo: data.assignedTo,
        notes: data.notes,
        resolutionDate: data.resolutionDate?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as GDPRCase;
    });

    // Calculate similarity scores
    const similarCases = allCases
      .filter((c) => c.id !== currentCase.id) // Exclude current case
      .map((c) => {
        let similarity = 0;
        const reasons: string[] = [];

        // Match by primary category (40% weight)
        if (currentCase.primaryCategory && c.primaryCategory) {
          if (currentCase.primaryCategory === c.primaryCategory) {
            similarity += 0.4;
            reasons.push('Same primary category');
          }
        }

        // Match by sub category (30% weight)
        if (currentCase.subCategory && c.subCategory) {
          if (currentCase.subCategory === c.subCategory) {
            similarity += 0.3;
            reasons.push('Same sub category');
          }
        }

        // Match by customer type (10% weight)
        if (currentCase.customerType && c.customerType) {
          if (currentCase.customerType === c.customerType) {
            similarity += 0.1;
            reasons.push('Same customer type');
          }
        }

        // Match by market (10% weight)
        if (currentCase.market && c.market) {
          if (currentCase.market === c.market) {
            similarity += 0.1;
            reasons.push('Same market');
          }
        }

        // Keyword matching in description (10% weight)
        if (currentCase.caseDescription && c.caseDescription) {
          const currentWords = currentCase.caseDescription.toLowerCase().split(/\s+/);
          const otherWords = c.caseDescription.toLowerCase().split(/\s+/);
          const commonWords = currentWords.filter((w) => w.length > 3 && otherWords.includes(w));
          if (commonWords.length > 0) {
            similarity += Math.min(0.1, (commonWords.length / currentWords.length) * 0.1);
            reasons.push(`${commonWords.length} common keywords`);
          }
        }

        return {
          case: c,
          similarity,
          reason: reasons.join(', ') || 'Low similarity',
        };
      })
      .filter((item) => item.similarity >= (options?.minSimilarity || 0.3))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);

    return similarCases;
  } catch (error) {
    console.error('Error finding similar cases:', error);
    return [];
  }
}
