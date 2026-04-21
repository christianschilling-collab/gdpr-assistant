/**
 * Quiz Management
 * 
 * CRUD operations for quizzes and quiz attempts
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
import { Quiz, QuizQuestion, QuizAttempt, QuizCertificate } from '../types';

const QUIZZES_COLLECTION = 'quizzes';
const QUIZ_ATTEMPTS_COLLECTION = 'quizAttempts';
const QUIZ_CERTIFICATES_COLLECTION = 'quizCertificates';

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured. Please set up Firebase in .env.local');
  }
  return db;
}

/**
 * Create or update a quiz
 */
export async function saveQuiz(quiz: Quiz): Promise<string> {
  const db = getDbOrThrow();

  if (quiz.id) {
    // Update existing quiz
    const quizRef = doc(db, QUIZZES_COLLECTION, quiz.id);
    await updateDoc(quizRef, {
      ...quiz,
      updatedAt: Timestamp.now(),
    });
    return quiz.id;
  } else {
    // Create new quiz
    const quizRef = doc(collection(db, QUIZZES_COLLECTION));
    await setDoc(quizRef, {
      ...quiz,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return quizRef.id;
  }
}

/**
 * Get quiz by ID
 */
export async function getQuiz(quizId: string): Promise<Quiz | null> {
  const db = getDbOrThrow();

  try {
    const quizRef = doc(db, QUIZZES_COLLECTION, quizId);
    const quizSnap = await getDoc(quizRef);

    if (!quizSnap.exists()) {
      return null;
    }

    const data = quizSnap.data();
    return {
      id: quizSnap.id,
      categoryId: data.categoryId,
      categoryTitle: data.categoryTitle,
      questions: data.questions || [],
      passingScore: data.passingScore || 80,
      timeLimit: data.timeLimit || undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error getting quiz:', error);
    return null;
  }
}

/**
 * Get quiz by category ID
 */
export async function getQuizByCategory(categoryId: string): Promise<Quiz | null> {
  const db = getDbOrThrow();

  try {
    const q = query(
      collection(db, QUIZZES_COLLECTION),
      where('categoryId', '==', categoryId),
      orderBy('updatedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      categoryId: data.categoryId,
      categoryTitle: data.categoryTitle,
      questions: data.questions || [],
      passingScore: data.passingScore || 80,
      timeLimit: data.timeLimit || undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error getting quiz by category:', error);
    return null;
  }
}

/**
 * Get all quizzes
 */
export async function getAllQuizzes(): Promise<Quiz[]> {
  const db = getDbOrThrow();

  try {
    const q = query(collection(db, QUIZZES_COLLECTION), orderBy('categoryTitle', 'asc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        categoryId: data.categoryId,
        categoryTitle: data.categoryTitle,
        questions: data.questions || [],
        passingScore: data.passingScore || 80,
        timeLimit: data.timeLimit || undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
  } catch (error) {
    console.error('Error getting all quizzes:', error);
    return [];
  }
}

/**
 * Delete a quiz
 */
export async function deleteQuiz(quizId: string): Promise<void> {
  const db = getDbOrThrow();
  const quizRef = doc(db, QUIZZES_COLLECTION, quizId);
  await deleteDoc(quizRef);
}

/**
 * Save quiz attempt
 */
export async function saveQuizAttempt(attempt: QuizAttempt): Promise<string> {
  const db = getDbOrThrow();

  const attemptRef = doc(collection(db, QUIZ_ATTEMPTS_COLLECTION));
  await setDoc(attemptRef, {
    ...attempt,
    startedAt: Timestamp.fromDate(attempt.startedAt),
    completedAt: Timestamp.fromDate(attempt.completedAt),
  });

  return attemptRef.id;
}

/**
 * Get quiz attempts for an agent
 */
export async function getAgentQuizAttempts(agentId: string): Promise<QuizAttempt[]> {
  const db = getDbOrThrow();

  try {
    const q = query(
      collection(db, QUIZ_ATTEMPTS_COLLECTION),
      where('agentId', '==', agentId),
      orderBy('completedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        agentId: data.agentId,
        agentEmail: data.agentEmail,
        categoryId: data.categoryId,
        categoryTitle: data.categoryTitle,
        quizId: data.quizId,
        answers: data.answers || [],
        score: data.score,
        passed: data.passed,
        startedAt: data.startedAt?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate() || new Date(),
        timeSpent: data.timeSpent || 0,
      };
    });
  } catch (error) {
    console.error('Error getting agent quiz attempts:', error);
    return [];
  }
}

/**
 * Get best quiz attempt for a category
 */
export async function getBestQuizAttempt(
  agentId: string,
  categoryId: string
): Promise<QuizAttempt | null> {
  const attempts = await getAgentQuizAttempts(agentId);
  const categoryAttempts = attempts.filter((a) => a.categoryId === categoryId);
  
  if (categoryAttempts.length === 0) {
    return null;
  }

  // Return the attempt with highest score
  return categoryAttempts.reduce((best, current) => 
    current.score > best.score ? current : best
  );
}

/**
 * Save quiz certificate
 */
export async function saveQuizCertificate(certificate: QuizCertificate): Promise<string> {
  const db = getDbOrThrow();

  const certRef = doc(collection(db, QUIZ_CERTIFICATES_COLLECTION));
  await setDoc(certRef, {
    ...certificate,
    issuedAt: Timestamp.fromDate(certificate.issuedAt),
  });

  return certRef.id;
}

/**
 * Get certificates for an agent
 */
export async function getAgentCertificates(agentId: string): Promise<QuizCertificate[]> {
  const db = getDbOrThrow();

  try {
    const q = query(
      collection(db, QUIZ_CERTIFICATES_COLLECTION),
      where('agentId', '==', agentId),
      orderBy('issuedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        agentId: data.agentId,
        agentEmail: data.agentEmail,
        agentName: data.agentName,
        categoryId: data.categoryId,
        categoryTitle: data.categoryTitle,
        quizAttemptId: data.quizAttemptId,
        score: data.score,
        issuedAt: data.issuedAt?.toDate() || new Date(),
        certificateNumber: data.certificateNumber,
      };
    });
  } catch (error) {
    console.error('Error getting agent certificates:', error);
    return [];
  }
}

/**
 * Generate unique certificate number
 */
export function generateCertificateNumber(categoryId: string, agentId: string): string {
  const timestamp = Date.now();
  const shortId = agentId.substring(0, 6);
  const shortCategory = categoryId.substring(0, 4).toUpperCase();
  return `GDPR-${shortCategory}-${shortId}-${timestamp}`;
}
