/**
 * Firestore CRUD operations for GDPR Cases
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { getDb } from './config';
import { GDPRCase } from '../types';

const CASES_COLLECTION = 'cases';

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured. Please set up Firebase in .env.local');
  }
  return db;
}

/**
 * Convert Firestore document to GDPRCase
 */
function docToCase(id: string, data: DocumentData): GDPRCase {
  return {
    id,
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
    // Customer Details (GDPR-compliant)
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerNumber: data.customerNumber,
    customerAddress: data.customerAddress,
    // External Links
    jiraLink: data.jiraLink,
    mineosLink: data.mineosLink,
    owlLink: data.owlLink,
    isGmail: data.isGmail || false,
    // Additional fields
    classificationMethod: data.classificationMethod,
    aiConfidence: data.aiConfidence,
    suggestedTemplate: data.suggestedTemplate,
    needsGuidance: data.needsGuidance,
    guidanceRequestedAt: data.guidanceRequestedAt?.toDate(),
    guidanceProvidedBy: data.guidanceProvidedBy,
    guidanceNotes: data.guidanceNotes,
    handoverNotes: data.handoverNotes,
    caseNotes: data.caseNotes,
    // Activity history
    statusHistory: data.statusHistory,
    activityLog: data.activityLog,
    // Multi-Step Workflow fields (NEW)
    workflow: data.workflow,
    currentWorkflowStep: data.currentWorkflowStep,
    workflowHistory: data.workflowHistory,
  };
}

/**
 * Create a new GDPR case
 */
export async function createCase(
  caseData: Omit<GDPRCase, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getDbOrThrow();
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, CASES_COLLECTION), {
    ...caseData,
    timestamp: Timestamp.fromDate(caseData.timestamp),
    resolutionDate: caseData.resolutionDate
      ? Timestamp.fromDate(caseData.resolutionDate)
      : null,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

/**
 * Get a single case by ID
 */
export async function getCase(id: string): Promise<GDPRCase | null> {
  const db = getDbOrThrow();
  const docRef = doc(db, CASES_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docToCase(docSnap.id, docSnap.data());
}

/**
 * Get all cases (with optional filters)
 */
export async function getCases(filters?: {
  status?: string;
  market?: string;
  limit?: number;
}): Promise<GDPRCase[]> {
  const db = getDbOrThrow();
  const maxLimit = filters?.limit || 100;
  
  // Build query with server-side ordering and limit
  let q = query(
    collection(db, CASES_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(maxLimit)
  );

  const querySnapshot = await getDocs(q);
  let cases = querySnapshot.docs.map((doc) => docToCase(doc.id, doc.data()));

  // Client-side filtering for status and market
  // TODO: Add composite indexes and move these filters to Firestore queries
  if (filters?.status) {
    cases = cases.filter(c => c.status === filters.status);
  }

  if (filters?.market) {
    cases = cases.filter(c => c.market === filters.market);
  }

  return cases;
}

/**
 * Update a case
 */
export async function updateCase(
  id: string,
  updates: Partial<GDPRCase>
): Promise<void> {
  const db = getDbOrThrow();
  const docRef = doc(db, CASES_COLLECTION, id);
  const updateData: any = {
    ...updates,
    updatedAt: Timestamp.now(),
  };

  // Convert dates to Timestamps
  if (updates.timestamp) {
    updateData.timestamp = Timestamp.fromDate(updates.timestamp);
  }
  if (updates.resolutionDate) {
    updateData.resolutionDate = Timestamp.fromDate(updates.resolutionDate);
  }

  await updateDoc(docRef, updateData);
}

/**
 * Get all cases (alias for getCases without filters)
 */
export async function getAllCases(): Promise<GDPRCase[]> {
  return getCases();
}

/**
 * Generate a new case ID (format: HELP-YYYY-NNN)
 */
export function generateCaseId(year: number, count: number): string {
  const paddedCount = String(count).padStart(3, '0');
  return `HELP-${year}-${paddedCount}`;
}

/**
 * Update case with workflow reference
 */
export async function linkWorkflowToCase(
  caseId: string,
  workflowId: string,
  currentStepIndex: number = 0
): Promise<void> {
  await updateCase(caseId, {
    currentWorkflowStep: currentStepIndex,
  });
}
