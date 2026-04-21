import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  limit,
  Timestamp 
} from 'firebase/firestore';
import { getDb } from './config';
import { Category } from '../types';
import { appCache, CacheKeys } from '../utils/cache';

const COLLECTION_NAME = 'categories';

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore is not initialized. Check your Firebase configuration.');
  }
  return db;
}

/**
 * Convert Firestore document to Category
 */
function docToCategory(docData: any, id: string): Category {
  return {
    id,
    name: docData.name || '',
    nameEn: docData.nameEn || '',
    description: docData.description || '',
    icon: docData.icon,
    isActive: docData.isActive ?? true,
    sortOrder: docData.sortOrder ?? 0,
    createdAt: docData.createdAt?.toDate?.() || new Date(),
    updatedAt: docData.updatedAt?.toDate?.() || new Date(),
    createdBy: docData.createdBy,
  };
}

/**
 * Convert Category to Firestore data
 */
function categoryToDoc(category: Partial<Category>) {
  const doc: any = {};
  
  if (category.name !== undefined) doc.name = category.name;
  if (category.nameEn !== undefined) doc.nameEn = category.nameEn;
  if (category.description !== undefined) doc.description = category.description;
  if (category.icon !== undefined) doc.icon = category.icon;
  if (category.isActive !== undefined) doc.isActive = category.isActive;
  if (category.sortOrder !== undefined) doc.sortOrder = category.sortOrder;
  if (category.createdBy !== undefined) doc.createdBy = category.createdBy;
  
  if (category.createdAt) doc.createdAt = Timestamp.fromDate(category.createdAt);
  if (category.updatedAt) doc.updatedAt = Timestamp.fromDate(category.updatedAt);
  
  return doc;
}

/**
 * Get all categories (optionally only active ones) - with caching
 * NOTE: Filtering and sorting done client-side to avoid needing Firestore composite indexes
 */
export async function getCategories(activeOnly: boolean = false): Promise<Category[]> {
  // Check cache first
  const cacheKey = activeOnly ? `${CacheKeys.CATEGORIES}_active` : CacheKeys.CATEGORIES;
  const cached = appCache.get<Category[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const db = getDbOrThrow();
  const categoriesRef = collection(db, COLLECTION_NAME);
  
  // Categories are typically small in number (<100), but add limit for safety
  const q = query(categoriesRef, limit(200));
  const snapshot = await getDocs(q);
  let categories = snapshot.docs.map(doc => docToCategory(doc.data(), doc.id));
  
  // Client-side filtering
  if (activeOnly) {
    categories = categories.filter(cat => cat.isActive);
  }
  
  // Client-side sorting
  categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  
  // Cache for 5 minutes
  appCache.set(cacheKey, categories);
  
  return categories;
}

/**
 * Get a single category by ID
 */
export async function getCategory(id: string): Promise<Category | null> {
  const db = getDbOrThrow();
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docToCategory(docSnap.data(), docSnap.id);
}

/**
 * Create a new category
 */
export async function createCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const db = getDbOrThrow();
  const categoriesRef = collection(db, COLLECTION_NAME);
  
  const now = new Date();
  const docData = categoryToDoc({
    ...category,
    createdAt: now,
    updatedAt: now,
  });
  
  const docRef = await addDoc(categoriesRef, docData);
  
  // Clear cache after create
  appCache.clear(CacheKeys.CATEGORIES);
  appCache.clear(`${CacheKeys.CATEGORIES}_active`);
  
  return docRef.id;
}

/**
 * Update an existing category
 */
export async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  const db = getDbOrThrow();
  const docRef = doc(db, COLLECTION_NAME, id);
  
  const docData = categoryToDoc({
    ...updates,
    updatedAt: new Date(),
  });
  
  await updateDoc(docRef, docData);
  
  // Clear cache after update
  appCache.clear(CacheKeys.CATEGORIES);
  appCache.clear(`${CacheKeys.CATEGORIES}_active`);
}

/**
 * Delete a category (or soft-delete by setting isActive = false)
 */
export async function deleteCategory(id: string, softDelete: boolean = true): Promise<void> {
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
