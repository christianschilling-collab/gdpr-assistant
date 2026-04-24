/**
 * Firebase operations for GDPR Incident Task-Force Management
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { getDbOrThrow } from './config';
import { TaskForce, TaskForceMember } from '../types';

// ===== COLLECTIONS =====
const TASK_FORCE_MEMBERS_COLLECTION = 'taskForceMembers';

// ===== TASK-FORCE MEMBERS CRUD =====

/**
 * Get all active task-force members
 */
export async function getAllTaskForceMembers(): Promise<TaskForceMember[]> {
  try {
    const db = getDbOrThrow();
    const q = query(
      collection(db, TASK_FORCE_MEMBERS_COLLECTION),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as TaskForceMember[];
  } catch (error) {
    console.error('Error fetching task-force members:', error);
    throw error;
  }
}

/**
 * Get task-force members by market
 */
export async function getTaskForceMembersByMarket(market: string): Promise<TaskForceMember[]> {
  try {
    const db = getDbOrThrow();
    const q = query(
      collection(db, TASK_FORCE_MEMBERS_COLLECTION),
      where('isActive', '==', true),
      where('markets', 'array-contains', market),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as TaskForceMember[];
  } catch (error) {
    console.error('Error fetching task-force members by market:', error);
    throw error;
  }
}

/**
 * Get single task-force member by ID
 */
export async function getTaskForceMember(id: string): Promise<TaskForceMember | null> {
  try {
    const db = getDbOrThrow();
    const docRef = doc(db, TASK_FORCE_MEMBERS_COLLECTION, id);
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
    } as TaskForceMember;
  } catch (error) {
    console.error('Error fetching task-force member:', error);
    throw error;
  }
}

/**
 * Create new task-force member
 */
export async function createTaskForceMember(
  member: Omit<TaskForceMember, 'id' | 'createdAt' | 'updatedAt'>,
  createdBy: string
): Promise<string> {
  try {
    const db = getDbOrThrow();
    const now = Timestamp.now();
    
    console.log('🔍 Creating task-force member:', { 
      name: member.name,
      email: member.email,
      createdBy 
    });
    
    const docRef = await addDoc(collection(db, TASK_FORCE_MEMBERS_COLLECTION), {
      ...member,
      createdAt: now,
      updatedAt: now,
      createdBy,
    });
    
    console.log('✅ Task-force member created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating task-force member:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Update existing task-force member
 */
export async function updateTaskForceMember(
  id: string,
  updates: Partial<Omit<TaskForceMember, 'id' | 'createdAt' | 'updatedAt'>>,
  updatedBy: string
): Promise<void> {
  try {
    const db = getDbOrThrow();
    const docRef = doc(db, TASK_FORCE_MEMBERS_COLLECTION, id);
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
      updatedBy,
    });
    
    console.log('Task-force member updated:', id);
  } catch (error) {
    console.error('Error updating task-force member:', error);
    throw error;
  }
}

/**
 * Deactivate task-force member (soft delete)
 */
export async function deactivateTaskForceMember(id: string, deactivatedBy: string): Promise<void> {
  try {
    const db = getDbOrThrow();
    const docRef = doc(db, TASK_FORCE_MEMBERS_COLLECTION, id);
    
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: Timestamp.now(),
      deactivatedBy,
      deactivatedAt: Timestamp.now(),
    });
    
    console.log('Task-force member deactivated:', id);
  } catch (error) {
    console.error('Error deactivating task-force member:', error);
    throw error;
  }
}

/**
 * Permanently delete task-force member (hard delete - use with caution)
 */
export async function deleteTaskForceMember(id: string): Promise<void> {
  try {
    const db = getDbOrThrow();
    const docRef = doc(db, TASK_FORCE_MEMBERS_COLLECTION, id);
    await deleteDoc(docRef);
    
    console.log('Task-force member permanently deleted:', id);
  } catch (error) {
    console.error('Error deleting task-force member:', error);
    throw error;
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Get task-force members by role
 */
export async function getTaskForceMembersByRole(role: 'lead' | 'member' | 'specialist'): Promise<TaskForceMember[]> {
  try {
    const db = getDbOrThrow();
    const q = query(
      collection(db, TASK_FORCE_MEMBERS_COLLECTION),
      where('isActive', '==', true),
      where('role', '==', role),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as TaskForceMember[];
  } catch (error) {
    console.error('Error fetching task-force members by role:', error);
    throw error;
  }
}

/**
 * Search task-force members by specialty
 */
export async function searchTaskForceMembersBySpecialty(specialty: string): Promise<TaskForceMember[]> {
  try {
    const db = getDbOrThrow();
    const q = query(
      collection(db, TASK_FORCE_MEMBERS_COLLECTION),
      where('isActive', '==', true),
      where('specialties', 'array-contains', specialty),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as TaskForceMember[];
  } catch (error) {
    console.error('Error searching task-force members by specialty:', error);
    throw error;
  }
}

// ===== MARKETS CONSTANTS =====
export const AVAILABLE_MARKETS = [
  'DE', 'AT', 'CH',          // DACH
  'BE', 'NL', 'LU',          // Benelux  
  'FR',                      // France
  'SE', 'DK', 'NO',          // Nordics
  'IT', 'ES',                // Southern Europe
  'AU', 'US', 'CA',          // Other markets
] as const;

export const MARKET_GROUPS = {
  'DACH': ['DE', 'AT', 'CH'],
  'Benelux': ['BE', 'NL', 'LU'],
  'Nordics': ['SE', 'DK', 'NO'],
  'Southern Europe': ['IT', 'ES'],
  'Other': ['AU', 'US', 'CA', 'FR']
} as const;