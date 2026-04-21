/**
 * Feedback Management
 */

import { getDb } from './config';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { TrainingFeedback, CaseFeedback } from '../types';

const TRAINING_FEEDBACK_COLLECTION = 'trainingFeedback';
const CASE_FEEDBACK_COLLECTION = 'caseFeedback';

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured. Please set up Firebase in .env.local');
  }
  return db;
}

/**
 * Submit training feedback
 */
export async function submitTrainingFeedback(
  feedback: Omit<TrainingFeedback, 'id' | 'submittedAt'>
): Promise<string> {
  const db = getDbOrThrow();
  const docRef = await addDoc(collection(db, TRAINING_FEEDBACK_COLLECTION), {
    trainingCategoryId: feedback.trainingCategoryId,
    agentEmail: feedback.agentEmail,
    rating: feedback.rating,
    comment: feedback.comment || null,
    helpful: feedback.helpful,
    needsClarification: feedback.needsClarification || false,
    submittedAt: Timestamp.now(),
  });
  return docRef.id;
}

/**
 * Get feedback for a training category
 */
export async function getTrainingFeedback(categoryId: string): Promise<TrainingFeedback[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, TRAINING_FEEDBACK_COLLECTION),
    where('trainingCategoryId', '==', categoryId),
    orderBy('submittedAt', 'desc')
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      trainingCategoryId: data.trainingCategoryId,
      agentEmail: data.agentEmail,
      rating: data.rating,
      comment: data.comment,
      helpful: data.helpful,
      needsClarification: data.needsClarification,
      submittedAt: data.submittedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Get feedback by agent
 */
export async function getTrainingFeedbackByAgent(
  agentEmail: string
): Promise<TrainingFeedback[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, TRAINING_FEEDBACK_COLLECTION),
    where('agentEmail', '==', agentEmail),
    orderBy('submittedAt', 'desc')
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      trainingCategoryId: data.trainingCategoryId,
      agentEmail: data.agentEmail,
      rating: data.rating,
      comment: data.comment,
      helpful: data.helpful,
      needsClarification: data.needsClarification,
      submittedAt: data.submittedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Submit case feedback
 */
export async function submitCaseFeedback(
  feedback: Omit<CaseFeedback, 'id' | 'submittedAt'>
): Promise<string> {
  const db = getDbOrThrow();
  const docRef = await addDoc(collection(db, CASE_FEEDBACK_COLLECTION), {
    caseId: feedback.caseId,
    agentEmail: feedback.agentEmail,
    rating: feedback.rating,
    comment: feedback.comment || null,
    helpful: feedback.helpful,
    aiSuggestionRating: feedback.aiSuggestionRating || null,
    improvementSuggestions: feedback.improvementSuggestions || null,
    submittedAt: Timestamp.now(),
  });
  return docRef.id;
}

/**
 * Get feedback for a case
 */
export async function getCaseFeedback(caseId: string): Promise<CaseFeedback[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, CASE_FEEDBACK_COLLECTION),
    where('caseId', '==', caseId),
    orderBy('submittedAt', 'desc')
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      caseId: data.caseId,
      agentEmail: data.agentEmail,
      rating: data.rating,
      comment: data.comment,
      helpful: data.helpful,
      aiSuggestionRating: data.aiSuggestionRating,
      improvementSuggestions: data.improvementSuggestions,
      submittedAt: data.submittedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Get average rating for a training category
 */
export async function getAverageTrainingRating(categoryId: string): Promise<number> {
  const feedback = await getTrainingFeedback(categoryId);
  if (feedback.length === 0) return 0;
  const sum = feedback.reduce((acc, f) => acc + f.rating, 0);
  return sum / feedback.length;
}
