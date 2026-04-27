/**
 * Firebase utilities for Training Content Management
 */

import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { getDbOrThrow } from './config';
import type { 
  TrainingContent, 
  DecisionTreeContent, 
  QueueDashboardContent, 
  EscalationContent,
  CertificationContent,
  ContentTemplate
} from '../types/training-content';

// Collections
const TRAINING_CONTENT_COLLECTION = 'trainingContent';
const CONTENT_TEMPLATES_COLLECTION = 'contentTemplates';

// Helper to filter out undefined values for Firestore
const filterUndefined = (obj: any) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  );
};

// ===== TRAINING CONTENT MANAGEMENT =====

export async function getAllTrainingContent(): Promise<TrainingContent[]> {
  try {
    const db = getDbOrThrow();
    const q = query(
      collection(db, TRAINING_CONTENT_COLLECTION),
      orderBy('type'),
      orderBy('day'),
      orderBy('title')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as TrainingContent[];
  } catch (error) {
    console.error('Error fetching training content:', error);
    return [];
  }
}

export async function getTrainingContentByType(type: TrainingContent['type']): Promise<TrainingContent[]> {
  try {
    const db = getDbOrThrow();
    const q = query(
      collection(db, TRAINING_CONTENT_COLLECTION),
      where('type', '==', type),
      where('isActive', '==', true),
      orderBy('day'),
      orderBy('title')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as TrainingContent[];
  } catch (error) {
    console.error('Error fetching training content by type:', error);
    return [];
  }
}

export async function getTrainingContentByDay(day: number): Promise<TrainingContent[]> {
  try {
    const db = getDbOrThrow();
    const q = query(
      collection(db, TRAINING_CONTENT_COLLECTION),
      where('day', '==', day),
      where('isActive', '==', true),
      orderBy('type'),
      orderBy('title')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as TrainingContent[];
  } catch (error) {
    console.error('Error fetching training content by day:', error);
    return [];
  }
}

export async function getTrainingContent(id: string): Promise<TrainingContent | null> {
  try {
    const db = getDbOrThrow();
    const docRef = doc(db, TRAINING_CONTENT_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as TrainingContent;
  } catch (error) {
    console.error('Error fetching training content:', error);
    return null;
  }
}

export async function createTrainingContent(
  content: Omit<TrainingContent, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const db = getDbOrThrow();
    const now = Timestamp.now();
    
    const contentData = filterUndefined({
      ...content,
      createdAt: now,
      updatedAt: now,
    });

    const docRef = await addDoc(collection(db, TRAINING_CONTENT_COLLECTION), contentData);
    console.log('✅ Training content created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating training content:', error);
    throw error;
  }
}

export async function updateTrainingContent(
  id: string,
  updates: Partial<Omit<TrainingContent, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const db = getDbOrThrow();
    const docRef = doc(db, TRAINING_CONTENT_COLLECTION, id);
    
    const updateData = filterUndefined({
      ...updates,
      updatedAt: Timestamp.now(),
    });

    await updateDoc(docRef, updateData);
    console.log('✅ Training content updated:', id);
  } catch (error) {
    console.error('❌ Error updating training content:', error);
    throw error;
  }
}

export async function deleteTrainingContent(id: string): Promise<void> {
  try {
    const db = getDbOrThrow();
    const docRef = doc(db, TRAINING_CONTENT_COLLECTION, id);
    await deleteDoc(docRef);
    console.log('✅ Training content deleted:', id);
  } catch (error) {
    console.error('❌ Error deleting training content:', error);
    throw error;
  }
}

// ===== CONTENT TEMPLATES =====

export async function getAllContentTemplates(): Promise<ContentTemplate[]> {
  try {
    const db = getDbOrThrow();
    const q = query(
      collection(db, CONTENT_TEMPLATES_COLLECTION),
      orderBy('type'),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ContentTemplate[];
  } catch (error) {
    console.error('Error fetching content templates:', error);
    return [];
  }
}

export async function createContentTemplate(
  template: Omit<ContentTemplate, 'id'>
): Promise<string> {
  try {
    const db = getDbOrThrow();
    
    const templateData = filterUndefined(template);
    const docRef = await addDoc(collection(db, CONTENT_TEMPLATES_COLLECTION), templateData);
    
    console.log('✅ Content template created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating content template:', error);
    throw error;
  }
}

// ===== SPECIFIC CONTENT TYPE HELPERS =====

export async function getDecisionTreeContent(): Promise<DecisionTreeContent | null> {
  const content = await getTrainingContentByType('classification_tree');
  const activeTree = content.find(c => c.isActive);
  return activeTree?.content as DecisionTreeContent || null;
}

export async function getQueueDashboardContent(): Promise<QueueDashboardContent | null> {
  const content = await getTrainingContentByType('queue_dashboard');
  const activeDashboard = content.find(c => c.isActive);
  return activeDashboard?.content as QueueDashboardContent || null;
}

export async function getEscalationContent(): Promise<EscalationContent | null> {
  const content = await getTrainingContentByType('escalation_assistant');
  const activeEscalation = content.find(c => c.isActive);
  return activeEscalation?.content as EscalationContent || null;
}

export async function getCertificationContent(): Promise<CertificationContent | null> {
  const content = await getTrainingContentByType('certification');
  const activeCertification = content.find(c => c.isActive);
  return activeCertification?.content as CertificationContent || null;
}

// ===== SEED FUNCTIONS =====

export async function seedDefaultTrainingContent(): Promise<void> {
  console.log('🌱 Seeding default training content...');
  
  // Check if content already exists
  const existing = await getAllTrainingContent();
  if (existing.length > 0) {
    console.log('⚠️ Training content already exists, skipping seed');
    return;
  }
  
  try {
    // Create default classification tree
    await createTrainingContent({
      title: 'GDPR Request Classification Tree',
      description: 'Interactive decision tree for classifying GDPR requests based on Team Hub workflows',
      type: 'classification_tree',
      category: 'fundamentals',
      day: 1,
      isActive: true,
      createdBy: 'system',
      content: {
        // This would contain the decision tree structure
        // For now, we'll reference the existing hardcoded structure
        source: 'gdpr_team_hub',
        version: '1.0'
      }
    });

    // Create default queue dashboard
    await createTrainingContent({
      title: 'Daily Queue Processing Dashboard',
      description: 'Learn daily workflows and queue management for GDPR requests',
      type: 'queue_dashboard', 
      category: 'processes',
      day: 2,
      isActive: true,
      createdBy: 'system',
      content: {
        source: 'gdpr_team_hub',
        version: '1.0'
      }
    });

    // Create default escalation assistant
    await createTrainingContent({
      title: 'POC Directory & Escalation Assistant',
      description: 'Learn when and how to escalate GDPR issues with POC directory',
      type: 'escalation_assistant',
      category: 'processes', 
      day: 3,
      isActive: true,
      createdBy: 'system',
      content: {
        source: 'gdpr_team_hub',
        version: '1.0'
      }
    });

    console.log('✅ Default training content seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding training content:', error);
    throw error;
  }
}