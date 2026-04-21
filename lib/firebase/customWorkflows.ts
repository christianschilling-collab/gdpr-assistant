/**
 * Firestore CRUD operations for Custom Workflow Templates
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { getDb } from './config';
import { ProcessStep } from '../types';

const CUSTOM_WORKFLOWS_COLLECTION = 'customWorkflowTemplates';

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured. Please set up Firebase in .env.local');
  }
  return db;
}

export interface CustomWorkflowTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  steps: ProcessStep[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

/**
 * Save or update a custom workflow template
 */
export async function saveCustomWorkflow(
  workflow: Omit<CustomWorkflowTemplate, 'createdAt' | 'updatedAt'>,
  userId?: string
): Promise<void> {
  const db = getDbOrThrow();
  const docRef = doc(db, CUSTOM_WORKFLOWS_COLLECTION, workflow.id);
  
  const existingDoc = await getDoc(docRef);
  const now = new Date();
  
  const data = {
    ...workflow,
    updatedAt: Timestamp.fromDate(now),
    ...(existingDoc.exists()
      ? {}
      : {
          createdAt: Timestamp.fromDate(now),
          createdBy: userId || 'Unknown',
        }),
  };
  
  await setDoc(docRef, data, { merge: true });
}

/**
 * Get a custom workflow template by ID
 */
export async function getCustomWorkflow(id: string): Promise<CustomWorkflowTemplate | null> {
  const db = getDbOrThrow();
  const docRef = doc(db, CUSTOM_WORKFLOWS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name,
    nameEn: data.nameEn,
    description: data.description,
    steps: data.steps,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    createdBy: data.createdBy,
  };
}

/**
 * Get all custom workflow templates
 */
export async function getAllCustomWorkflows(): Promise<CustomWorkflowTemplate[]> {
  const db = getDbOrThrow();
  const querySnapshot = await getDocs(collection(db, CUSTOM_WORKFLOWS_COLLECTION));
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      nameEn: data.nameEn,
      description: data.description,
      steps: data.steps,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      createdBy: data.createdBy,
    };
  });
}

/**
 * Delete a custom workflow template
 */
export async function deleteCustomWorkflow(id: string): Promise<void> {
  const db = getDbOrThrow();
  const docRef = doc(db, CUSTOM_WORKFLOWS_COLLECTION, id);
  await deleteDoc(docRef);
}
