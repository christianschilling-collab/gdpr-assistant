/**
 * Firestore CRUD operations for Templates
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  limit,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { getDb } from './config';
import { Template } from '../types';
import { appCache, CacheKeys } from '../utils/cache';

const TEMPLATES_COLLECTION = 'templates';

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured. Please set up Firebase in .env.local');
  }
  return db;
}

/**
 * Convert Firestore document to Template
 */
function docToTemplate(id: string, data: DocumentData): Template {
  return {
    id,
    primaryCategory: data.primaryCategory,
    subCategory: data.subCategory,
    requesterType: data.requesterType || data.customerType, // Support both old and new field names
    templateName: data.templateName,
    templateText: data.templateText,
    whenToUse: data.whenToUse,
    keywords: data.keywords || [],
    confluenceLink: data.confluenceLink,
    mineosAuto: data.mineosAuto,
    processSteps: data.processSteps || [],
    jiraNoteTemplate: data.jiraNoteTemplate,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    version: data.version,
    versionHistory: data.versionHistory,
  };
}

/**
 * Create a new template
 */
export async function createTemplate(
  templateData: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getDbOrThrow();
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, TEMPLATES_COLLECTION), {
    ...templateData,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

/**
 * Get a single template by ID
 */
export async function getTemplate(id: string): Promise<Template | null> {
  const db = getDbOrThrow();
  const docRef = doc(db, TEMPLATES_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docToTemplate(docSnap.id, docSnap.data());
}

/**
 * Get all templates (with caching)
 */
export async function getTemplates(): Promise<Template[]> {
  // Check cache first
  const cached = appCache.get<Template[]>(CacheKeys.TEMPLATES);
  if (cached) {
    return cached;
  }

  const db = getDbOrThrow();
  // Templates change less frequently, so we can load more
  const q = query(
    collection(db, TEMPLATES_COLLECTION),
    limit(500)
  );

  const querySnapshot = await getDocs(q);
  const templates = querySnapshot.docs.map((doc) => docToTemplate(doc.id, doc.data()));
  
  // Client-side sorting by primaryCategory
  templates.sort((a, b) => {
    const catA = (a.primaryCategory || '').toLowerCase();
    const catB = (b.primaryCategory || '').toLowerCase();
    return catA.localeCompare(catB);
  });
  
  // Cache for 5 minutes
  appCache.set(CacheKeys.TEMPLATES, templates);
  
  return templates;
}

/**
 * Update a template
 */
export async function updateTemplate(
  id: string,
  updates: Partial<Template>,
  saveVersion: boolean = true,
  changedBy?: string,
  changeReason?: string
): Promise<void> {
  const db = getDbOrThrow();
  const docRef = doc(db, TEMPLATES_COLLECTION, id);
  
  // Get current template to save version
  if (saveVersion && updates.templateText) {
    const currentTemplate = await getTemplate(id);
    if (currentTemplate) {
      const currentVersion = currentTemplate.version || 1;
      const newVersion = currentVersion + 1;
      
      // Save version history
      const { saveTemplateVersion } = await import('./templateVersions');
      await saveTemplateVersion(id, {
        version: currentVersion,
        templateText: currentTemplate.templateText,
        changedBy,
        changedAt: new Date(),
        changeReason: 'Auto-saved before update',
      });
      
      updates.version = newVersion;
    }
  }
  
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
  
  // Clear cache after update
  appCache.clear(CacheKeys.TEMPLATES);
}
