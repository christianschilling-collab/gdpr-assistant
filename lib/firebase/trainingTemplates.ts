/**
 * Training Template Management
 * 
 * CRUD operations for training templates
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
import { TrainingTemplate } from '../types';
import { DEFAULT_TEMPLATES } from '../training/templates';

const TRAINING_TEMPLATES_COLLECTION = 'trainingTemplates';

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured. Please set up Firebase in .env.local');
  }
  return db;
}

/**
 * Get all training templates (including defaults)
 */
export async function getAllTrainingTemplates(): Promise<TrainingTemplate[]> {
  const db = getDbOrThrow();

  try {
    // Get custom templates from Firestore
    const q = query(
      collection(db, TRAINING_TEMPLATES_COLLECTION),
      orderBy('name', 'asc')
    );
    const querySnapshot = await getDocs(q);

    const customTemplates: TrainingTemplate[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        categoryIds: data.categoryIds || [],
        isDefault: false,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });

    // Add default templates (without IDs, they're virtual)
    const defaultTemplates: TrainingTemplate[] = DEFAULT_TEMPLATES.map((template) => ({
      ...template,
      id: `default-${template.name.toLowerCase().replace(/\s+/g, '-')}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Combine: defaults first, then custom
    return [...defaultTemplates, ...customTemplates];
  } catch (error) {
    console.error('Error getting training templates:', error);
    // Return defaults only if Firestore fails
    return DEFAULT_TEMPLATES.map((template) => ({
      ...template,
      id: `default-${template.name.toLowerCase().replace(/\s+/g, '-')}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }
}

/**
 * Get a specific template by ID
 */
export async function getTrainingTemplate(templateId: string): Promise<TrainingTemplate | null> {
  // Check if it's a default template
  if (templateId.startsWith('default-')) {
    const templateName = templateId.replace('default-', '').replace(/-/g, ' ');
    const defaultTemplate = DEFAULT_TEMPLATES.find(
      (t) => t.name.toLowerCase().replace(/\s+/g, '-') === templateName
    );
    if (defaultTemplate) {
      return {
        ...defaultTemplate,
        id: templateId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  // Get from Firestore
  const db = getDbOrThrow();
  try {
    const templateRef = doc(db, TRAINING_TEMPLATES_COLLECTION, templateId);
    const templateSnap = await getDoc(templateRef);

    if (!templateSnap.exists()) {
      return null;
    }

    const data = templateSnap.data();
    return {
      id: templateSnap.id,
      name: data.name,
      description: data.description,
      categoryIds: data.categoryIds || [],
      isDefault: false,
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error getting training template:', error);
    return null;
  }
}

/**
 * Create or update a training template
 */
export async function saveTrainingTemplate(
  template: TrainingTemplate,
  createdBy?: string
): Promise<string> {
  if (template.isDefault) {
    throw new Error('Cannot save default templates. They are read-only.');
  }

  const db = getDbOrThrow();

  if (template.id) {
    // Update existing template
    const templateRef = doc(db, TRAINING_TEMPLATES_COLLECTION, template.id);
    await updateDoc(templateRef, {
      name: template.name,
      description: template.description,
      categoryIds: template.categoryIds,
      updatedAt: Timestamp.now(),
    });
    return template.id;
  } else {
    // Create new template
    const templateRef = doc(collection(db, TRAINING_TEMPLATES_COLLECTION));
    await setDoc(templateRef, {
      name: template.name,
      description: template.description,
      categoryIds: template.categoryIds,
      isDefault: false,
      createdBy: createdBy || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return templateRef.id;
  }
}

/**
 * Delete a training template
 */
export async function deleteTrainingTemplate(templateId: string): Promise<void> {
  if (templateId.startsWith('default-')) {
    throw new Error('Cannot delete default templates. They are read-only.');
  }

  const db = getDbOrThrow();
  const templateRef = doc(db, TRAINING_TEMPLATES_COLLECTION, templateId);
  await deleteDoc(templateRef);
}
