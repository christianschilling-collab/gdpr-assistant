/**
 * Firestore CRUD operations for Workflow Mappings
 * Maps Case Type + Requester Type -> Workflow Template ID
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { getDb } from './config';

const WORKFLOW_MAPPINGS_COLLECTION = 'workflowMappings';

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured. Please set up Firebase in .env.local');
  }
  return db;
}

export interface WorkflowMapping {
  id: string; // Format: categoryId-requesterTypeId
  categoryId: string;
  categoryName: string;
  requesterTypeId: string;
  requesterTypeName: string;
  workflowTemplateId: string;
  workflowTemplateName?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Convert Firestore document to WorkflowMapping
 */
function docToMapping(id: string, data: DocumentData): WorkflowMapping {
  return {
    id,
    categoryId: data.categoryId,
    categoryName: data.categoryName,
    requesterTypeId: data.requesterTypeId,
    requesterTypeName: data.requesterTypeName,
    workflowTemplateId: data.workflowTemplateId,
    workflowTemplateName: data.workflowTemplateName,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Save workflow mapping
 */
export async function saveWorkflowMapping(
  categoryId: string,
  categoryName: string,
  requesterTypeId: string,
  requesterTypeName: string,
  workflowTemplateId: string,
  workflowTemplateName?: string
): Promise<void> {
  const db = getDbOrThrow();
  const mappingId = `${categoryId}-${requesterTypeId}`;
  const now = Timestamp.now();
  
  const docRef = doc(db, WORKFLOW_MAPPINGS_COLLECTION, mappingId);
  const docSnap = await getDoc(docRef);
  
  await setDoc(docRef, {
    categoryId,
    categoryName,
    requesterTypeId,
    requesterTypeName,
    workflowTemplateId,
    workflowTemplateName,
    createdAt: docSnap.exists() ? docSnap.data().createdAt : now,
    updatedAt: now,
  });
}

/**
 * Get workflow mapping by category + requester type
 */
export async function getWorkflowMapping(
  categoryId: string,
  requesterTypeId: string
): Promise<WorkflowMapping | null> {
  const db = getDbOrThrow();
  const mappingId = `${categoryId}-${requesterTypeId}`;
  const docRef = doc(db, WORKFLOW_MAPPINGS_COLLECTION, mappingId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docToMapping(docSnap.id, docSnap.data());
}

/**
 * Get all workflow mappings
 */
export async function getAllWorkflowMappings(): Promise<WorkflowMapping[]> {
  const db = getDbOrThrow();
  const q = query(collection(db, WORKFLOW_MAPPINGS_COLLECTION));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => docToMapping(doc.id, doc.data()));
}

/**
 * Get workflow template ID for a case
 */
export async function getWorkflowTemplateForCase(
  categoryId: string,
  requesterTypeId: string
): Promise<string | null> {
  const mapping = await getWorkflowMapping(categoryId, requesterTypeId);
  return mapping?.workflowTemplateId || null;
}

/**
 * Batch save multiple mappings
 */
export async function saveWorkflowMappings(
  mappings: Record<string, string>, // key: categoryId-requesterTypeId, value: workflowTemplateId
  categoryMap: Record<string, string>, // categoryId -> name
  requesterTypeMap: Record<string, string>, // requesterTypeId -> name
  workflowTemplateMap: Record<string, string> // workflowTemplateId -> name
): Promise<void> {
  const promises = Object.entries(mappings).map(([key, workflowTemplateId]) => {
    const [categoryId, requesterTypeId] = key.split('-');
    return saveWorkflowMapping(
      categoryId,
      categoryMap[categoryId] || categoryId,
      requesterTypeId,
      requesterTypeMap[requesterTypeId] || requesterTypeId,
      workflowTemplateId,
      workflowTemplateMap[workflowTemplateId]
    );
  });
  
  await Promise.all(promises);
}
