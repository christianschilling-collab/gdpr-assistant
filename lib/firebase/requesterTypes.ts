import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { getDb } from './config';
import { RequesterType } from '../types';

const COLLECTION_NAME = 'requesterTypes';

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore is not initialized. Check your Firebase configuration.');
  }
  return db;
}

/**
 * Convert Firestore document to RequesterType
 */
function docToRequesterType(docData: any, id: string): RequesterType {
  return {
    id,
    name: docData.name || '',
    nameEn: docData.nameEn || '',
    description: docData.description || '',
    isActive: docData.isActive ?? true,
    sortOrder: docData.sortOrder ?? 0,
    createdAt: docData.createdAt?.toDate?.() || new Date(),
    updatedAt: docData.updatedAt?.toDate?.() || new Date(),
    createdBy: docData.createdBy,
  };
}

/**
 * Convert RequesterType to Firestore data
 */
function requesterTypeToDoc(requesterType: Partial<RequesterType>) {
  const doc: any = {};
  
  if (requesterType.name !== undefined) doc.name = requesterType.name;
  if (requesterType.nameEn !== undefined) doc.nameEn = requesterType.nameEn;
  if (requesterType.description !== undefined) doc.description = requesterType.description;
  if (requesterType.isActive !== undefined) doc.isActive = requesterType.isActive;
  if (requesterType.sortOrder !== undefined) doc.sortOrder = requesterType.sortOrder;
  if (requesterType.createdBy !== undefined) doc.createdBy = requesterType.createdBy;
  
  if (requesterType.createdAt) doc.createdAt = Timestamp.fromDate(requesterType.createdAt);
  if (requesterType.updatedAt) doc.updatedAt = Timestamp.fromDate(requesterType.updatedAt);
  
  return doc;
}

/**
 * Get all requester types (optionally only active ones)
 * NOTE: Filtering and sorting done client-side to avoid needing Firestore composite indexes
 */
export async function getRequesterTypes(activeOnly: boolean = false): Promise<RequesterType[]> {
  const db = getDbOrThrow();
  const typesRef = collection(db, COLLECTION_NAME);
  
  // Get all documents (no server-side filtering to avoid index requirements)
  const snapshot = await getDocs(typesRef);
  let types = snapshot.docs.map(doc => docToRequesterType(doc.data(), doc.id));
  
  // Client-side filtering
  if (activeOnly) {
    types = types.filter(type => type.isActive);
  }
  
  // Client-side sorting
  types.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  
  return types;
}

/**
 * Get a single requester type by ID
 */
export async function getRequesterType(id: string): Promise<RequesterType | null> {
  const db = getDbOrThrow();
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docToRequesterType(docSnap.data(), docSnap.id);
}

/**
 * Create a new requester type
 */
export async function createRequesterType(requesterType: Omit<RequesterType, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const db = getDbOrThrow();
  const typesRef = collection(db, COLLECTION_NAME);
  
  const now = new Date();
  const docData = requesterTypeToDoc({
    ...requesterType,
    createdAt: now,
    updatedAt: now,
  });
  
  const docRef = await addDoc(typesRef, docData);
  return docRef.id;
}

/**
 * Update an existing requester type
 */
export async function updateRequesterType(id: string, updates: Partial<RequesterType>): Promise<void> {
  const db = getDbOrThrow();
  const docRef = doc(db, COLLECTION_NAME, id);
  
  const docData = requesterTypeToDoc({
    ...updates,
    updatedAt: new Date(),
  });
  
  await updateDoc(docRef, docData);
}

/**
 * Delete a requester type (or soft-delete by setting isActive = false)
 */
export async function deleteRequesterType(id: string, softDelete: boolean = true): Promise<void> {
  const db = getDbOrThrow();
  const docRef = doc(db, COLLECTION_NAME, id);
  
  if (softDelete) {
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  } else {
    await deleteDoc(docRef);
  }
}
