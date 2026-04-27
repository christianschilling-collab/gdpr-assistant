/**
 * Firebase utilities for Onboarding & Training System
 */

import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, setDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { getDbOrThrow } from './config';
import { 
  OnboardingStatus, 
  OnboardingNote, 
  SystemAccessStatus, 
  TrainingModule, 
  TrainingProgress, 
  Certification, 
  OnboardingPlan,
  OnboardingUserProfile,
  GdprSystemConfig
} from '../types/onboarding';

// Collections
const ONBOARDING_STATUS_COLLECTION = 'onboardingStatus';
const TRAINING_MODULES_COLLECTION = 'trainingModules';
const TRAINING_PROGRESS_COLLECTION = 'trainingProgress';
const CERTIFICATIONS_COLLECTION = 'certifications';
const ONBOARDING_PLANS_COLLECTION = 'onboardingPlans';
const GDPR_SYSTEM_CONFIGS_COLLECTION = 'gdprSystemConfigs';
const TRAINING_CONTENT_COLLECTION = 'trainingContent';

// ===== ONBOARDING STATUS MANAGEMENT =====

export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus | null> {
  try {
    const db = getDbOrThrow();
    const docRef = doc(db, ONBOARDING_STATUS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      ...data,
      startDate: data.startDate?.toDate() || new Date(),
      expectedCompletionDate: data.expectedCompletionDate?.toDate() || new Date(),
      actualCompletionDate: data.actualCompletionDate?.toDate(),
      notes: data.notes?.map((note: any) => ({
        ...note,
        date: note.date?.toDate() || new Date()
      })) || [],
      systemAccess: data.systemAccess?.map((access: any) => ({
        ...access,
        requestDate: access.requestDate?.toDate() || new Date(),
        grantedDate: access.grantedDate?.toDate()
      })) || []
    } as OnboardingStatus;
  } catch (error) {
    console.error('Error getting onboarding status:', error);
    throw error;
  }
}

export async function createOnboardingStatus(
  userId: string,
  planId: string,
  manager: string,
  startDate: Date = new Date()
): Promise<string> {
  try {
    const db = getDbOrThrow();
    
    // Calculate expected completion date (4 working days)
    const expectedCompletionDate = new Date(startDate);
    expectedCompletionDate.setDate(startDate.getDate() + 6); // 4 working days + weekend buffer
    
    // Get all active GDPR systems to initialize system access
    const gdprSystems = await getActiveSystemConfigs();
    console.log('🔧 Initializing onboarding with systems:', gdprSystems.map(s => s.name));
    
    // Initialize system access for all GDPR systems
    const systemAccess = gdprSystems.map(system => ({
      system: system.organization ? `${system.name} (${system.organization})` : system.name,
      status: 'not_requested' as const,
      priority: system.priority,
      slaHours: system.slaHours,
      requestDate: Timestamp.now()
    }));
    
    const onboardingStatus: Omit<OnboardingStatus, 'notes'> & {
      notes: never[];
    } = {
      status: 'not_started',
      currentDay: 0,
      startDate,
      expectedCompletionDate,
      completedTasks: [],
      manager,
      notes: [],
      systemAccess
    };
    
    const docRef = doc(db, ONBOARDING_STATUS_COLLECTION, userId);
    await setDoc(docRef, {
      ...onboardingStatus,
      startDate: Timestamp.fromDate(startDate),
      expectedCompletionDate: Timestamp.fromDate(expectedCompletionDate),
      planId
    });
    
    console.log(`✅ Onboarding created for ${userId} with ${systemAccess.length} systems`);
    return userId;
  } catch (error) {
    console.error('Error creating onboarding status:', error);
    throw error;
  }
}

export async function updateOnboardingStatus(
  userId: string,
  updates: Partial<OnboardingStatus>
): Promise<void> {
  try {
    const db = getDbOrThrow();
    const docRef = doc(db, ONBOARDING_STATUS_COLLECTION, userId);
    
    // Convert Date objects to Timestamps
    const timestampUpdates: any = { ...updates };
    if (updates.startDate) {
      timestampUpdates.startDate = Timestamp.fromDate(updates.startDate);
    }
    if (updates.expectedCompletionDate) {
      timestampUpdates.expectedCompletionDate = Timestamp.fromDate(updates.expectedCompletionDate);
    }
    if (updates.actualCompletionDate) {
      timestampUpdates.actualCompletionDate = Timestamp.fromDate(updates.actualCompletionDate);
    }
    
    await updateDoc(docRef, timestampUpdates);
  } catch (error) {
    console.error('Error updating onboarding status:', error);
    throw error;
  }
}

export async function addOnboardingNote(
  userId: string,
  note: Omit<OnboardingNote, 'id' | 'date'>
): Promise<void> {
  try {
    const db = getDbOrThrow();
    const docRef = doc(db, ONBOARDING_STATUS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Onboarding status not found');
    }
    
    const currentData = docSnap.data();
    const newNote: OnboardingNote = {
      ...note,
      id: Date.now().toString(),
      date: new Date()
    };
    
    const updatedNotes = [...(currentData.notes || []), {
      ...newNote,
      date: Timestamp.fromDate(newNote.date)
    }];
    
    await updateDoc(docRef, { notes: updatedNotes });
  } catch (error) {
    console.error('Error adding onboarding note:', error);
    throw error;
  }
}

// ===== SYSTEM ACCESS MANAGEMENT =====

export async function updateSystemAccessStatus(
  userId: string,
  system: string,
  updates: Partial<SystemAccessStatus>
): Promise<void> {
  try {
    const db = getDbOrThrow();
    const docRef = doc(db, ONBOARDING_STATUS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Onboarding status not found');
    }
    
    const currentData = docSnap.data();
    const systemAccess = currentData.systemAccess || [];
    
    const existingIndex = systemAccess.findIndex((access: any) => access.system === system);
    
    if (existingIndex >= 0) {
      // Update existing - clean undefined values
      const cleanUpdates: any = { ...systemAccess[existingIndex] };
      
      // Update only provided fields
      if (updates.status !== undefined) cleanUpdates.status = updates.status;
      if (updates.notes !== undefined) cleanUpdates.notes = updates.notes;
      if (updates.requestDate !== undefined) {
        cleanUpdates.requestDate = Timestamp.fromDate(updates.requestDate);
      }
      if (updates.grantedDate !== undefined) {
        cleanUpdates.grantedDate = Timestamp.fromDate(updates.grantedDate);
      }
      
      systemAccess[existingIndex] = cleanUpdates;
    } else {
      // Add new - only include defined values
      const newAccess: any = {
        system,
        requestDate: Timestamp.now()
      };
      
      if (updates.status !== undefined) newAccess.status = updates.status;
      if (updates.notes !== undefined) newAccess.notes = updates.notes;
      if (updates.requestDate !== undefined) {
        newAccess.requestDate = Timestamp.fromDate(updates.requestDate);
      }
      if (updates.grantedDate !== undefined) {
        newAccess.grantedDate = Timestamp.fromDate(updates.grantedDate);
      }
      
      systemAccess.push(newAccess);
    }
    
    await updateDoc(docRef, { systemAccess });
  } catch (error) {
    console.error('Error updating system access status:', error);
    throw error;
  }
}

// ===== TRAINING MODULES MANAGEMENT =====

export async function getAllTrainingModules(): Promise<TrainingModule[]> {
  try {
    const db = getDbOrThrow();
    const q = query(
      collection(db, TRAINING_MODULES_COLLECTION),
      where('isActive', '==', true),
      orderBy('category', 'asc'),
      orderBy('title', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as TrainingModule;
    });
  } catch (error) {
    console.error('Error getting training modules:', error);
    throw error;
  }
}

export async function getTrainingModulesByRole(targetRole: string): Promise<TrainingModule[]> {
  try {
    const db = getDbOrThrow();
    const q = query(
      collection(db, TRAINING_MODULES_COLLECTION),
      where('isActive', '==', true),
      where('targetRole', 'in', ['all', targetRole]),
      orderBy('category', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as TrainingModule;
    });
  } catch (error) {
    console.error('Error getting training modules by role:', error);
    throw error;
  }
}

// ===== TRAINING PROGRESS MANAGEMENT =====

export async function getTrainingProgress(userId: string, moduleId?: string): Promise<TrainingProgress[]> {
  try {
    const db = getDbOrThrow();
    let q;
    
    if (moduleId) {
      q = query(
        collection(db, TRAINING_PROGRESS_COLLECTION),
        where('userId', '==', userId),
        where('moduleId', '==', moduleId)
      );
    } else {
      q = query(
        collection(db, TRAINING_PROGRESS_COLLECTION),
        where('userId', '==', userId)
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
        lastActivityAt: data.lastActivityAt?.toDate(),
        quizResults: data.quizResults ? {
          ...data.quizResults,
          attempts: data.quizResults.attempts?.map((attempt: any) => ({
            ...attempt,
            startedAt: attempt.startedAt?.toDate() || new Date(),
            completedAt: attempt.completedAt?.toDate()
          })) || []
        } : undefined,
        practicalResults: data.practicalResults?.map((result: any) => ({
          ...result,
          assessmentDate: result.assessmentDate?.toDate()
        })) || [],
        managerApproval: data.managerApproval ? {
          ...data.managerApproval,
          approvedAt: data.managerApproval.approvedAt?.toDate() || new Date()
        } : undefined
      } as TrainingProgress;
    });
  } catch (error) {
    console.error('Error getting training progress:', error);
    throw error;
  }
}

export async function updateTrainingProgress(
  userId: string,
  moduleId: string,
  updates: Partial<TrainingProgress>
): Promise<string> {
  try {
    const db = getDbOrThrow();
    const progressId = `${userId}_${moduleId}`;
    const docRef = doc(db, TRAINING_PROGRESS_COLLECTION, progressId);
    
    // Convert Date objects to Timestamps
    const timestampUpdates: any = { ...updates };
    if (updates.startedAt) {
      timestampUpdates.startedAt = Timestamp.fromDate(updates.startedAt);
    }
    if (updates.completedAt) {
      timestampUpdates.completedAt = Timestamp.fromDate(updates.completedAt);
    }
    if (updates.lastActivityAt) {
      timestampUpdates.lastActivityAt = Timestamp.fromDate(updates.lastActivityAt);
    }
    
    // Handle nested timestamp conversions for quizResults and practicalResults
    if (updates.quizResults) {
      timestampUpdates.quizResults = {
        ...updates.quizResults,
        attempts: updates.quizResults.attempts?.map(attempt => ({
          ...attempt,
          startedAt: Timestamp.fromDate(attempt.startedAt),
          completedAt: attempt.completedAt ? Timestamp.fromDate(attempt.completedAt) : null
        }))
      };
    }
    
    await updateDoc(docRef, {
      userId,
      moduleId,
      ...timestampUpdates,
      lastActivityAt: Timestamp.now()
    });
    
    return progressId;
  } catch (error) {
    console.error('Error updating training progress:', error);
    throw error;
  }
}

// ===== CERTIFICATION MANAGEMENT =====

export async function getUserCertifications(userId: string): Promise<Certification[]> {
  try {
    const db = getDbOrThrow();
    const q = query(
      collection(db, CERTIFICATIONS_COLLECTION),
      where('issuedTo', '==', userId),
      where('isActive', '==', true),
      orderBy('issuedDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        issuedDate: data.issuedDate?.toDate() || new Date(),
        expiryDate: data.expiryDate?.toDate()
      } as Certification;
    });
  } catch (error) {
    console.error('Error getting user certifications:', error);
    throw error;
  }
}

export async function issueCertification(
  userId: string,
  certification: Omit<Certification, 'id' | 'issuedDate'>
): Promise<string> {
  try {
    const db = getDbOrThrow();
    
    const docRef = await addDoc(collection(db, CERTIFICATIONS_COLLECTION), {
      ...certification,
      issuedTo: userId,
      issuedDate: Timestamp.now(),
      expiryDate: certification.expiryDate ? Timestamp.fromDate(certification.expiryDate) : null,
      verificationCode: generateVerificationCode(),
      isActive: true
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error issuing certification:', error);
    throw error;
  }
}

// ===== ONBOARDING PLANS MANAGEMENT =====

export async function getOnboardingPlan(planId: string): Promise<OnboardingPlan | null> {
  try {
    const db = getDbOrThrow();
    const docRef = doc(db, ONBOARDING_PLANS_COLLECTION, planId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    } as OnboardingPlan;
  } catch (error) {
    console.error('Error getting onboarding plan:', error);
    throw error;
  }
}

export async function getActiveOnboardingPlans(): Promise<OnboardingPlan[]> {
  try {
    const db = getDbOrThrow();
    const q = query(
      collection(db, ONBOARDING_PLANS_COLLECTION),
      where('isActive', '==', true),
      orderBy('targetRole', 'asc'),
      orderBy('name', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as OnboardingPlan;
    });
  } catch (error) {
    console.error('Error getting active onboarding plans:', error);
    throw error;
  }
}

// ===== UTILITY FUNCTIONS =====

function generateVerificationCode(): string {
  return `GDPR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

// Get onboarding dashboard data for managers
export async function getOnboardingDashboard(): Promise<{
  activeOnboardings: (OnboardingStatus & { userId: string })[];
  recentCompletions: (OnboardingStatus & { userId: string })[];
  systemAccessPending: SystemAccessStatus[];
}> {
  try {
    const db = getDbOrThrow();
    
    // Get active onboardings (including not_started)
    const activeQuery = query(
      collection(db, ONBOARDING_STATUS_COLLECTION),
      where('status', 'in', ['not_started', 'day_1', 'day_2', 'day_3', 'day_4']),
      orderBy('startDate', 'desc')
    );
    const activeSnapshot = await getDocs(activeQuery);
    
    // Get recent completions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const completedQuery = query(
      collection(db, ONBOARDING_STATUS_COLLECTION),
      where('status', '==', 'completed'),
      where('actualCompletionDate', '>=', Timestamp.fromDate(thirtyDaysAgo)),
      orderBy('actualCompletionDate', 'desc')
    );
    const completedSnapshot = await getDocs(completedQuery);
    
    const activeOnboardings = activeSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        userId: doc.id, // Add the document ID as userId
        startDate: data.startDate?.toDate() || new Date(),
        expectedCompletionDate: data.expectedCompletionDate?.toDate() || new Date(),
        actualCompletionDate: data.actualCompletionDate?.toDate(),
        // Convert notes timestamps
        notes: (data.notes || []).map((note: any) => ({
          ...note,
          date: note.date?.toDate() || new Date()
        })),
        // Convert systemAccess timestamps  
        systemAccess: (data.systemAccess || []).map((access: any) => ({
          ...access,
          requestDate: access.requestDate?.toDate() || new Date(),
          grantedDate: access.grantedDate?.toDate()
        }))
      } as OnboardingStatus & { userId: string };
    });
    
    const recentCompletions = completedSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        userId: doc.id, // Add the document ID as userId
        startDate: data.startDate?.toDate() || new Date(),
        expectedCompletionDate: data.expectedCompletionDate?.toDate() || new Date(),
        actualCompletionDate: data.actualCompletionDate?.toDate(),
        // Convert notes timestamps
        notes: (data.notes || []).map((note: any) => ({
          ...note,
          date: note.date?.toDate() || new Date()
        })),
        // Convert systemAccess timestamps
        systemAccess: (data.systemAccess || []).map((access: any) => ({
          ...access,
          requestDate: access.requestDate?.toDate() || new Date(),
          grantedDate: access.grantedDate?.toDate()
        }))
      } as OnboardingStatus & { userId: string };
    });
    
    // Extract pending system access from active onboardings
    const systemAccessPending: SystemAccessStatus[] = [];
    activeOnboardings.forEach(onboarding => {
      if (onboarding.systemAccess && Array.isArray(onboarding.systemAccess)) {
        onboarding.systemAccess.forEach(access => {
          if (access && access.status && 
              ['pending', 'requested'].includes(access.status)) {
            systemAccessPending.push(access);
          }
        });
      }
    });
    
    return {
      activeOnboardings,
      recentCompletions,
      systemAccessPending
    };
  } catch (error) {
    console.error('Error getting onboarding dashboard:', error);
    throw error;
  }
}

/**
 * Delete an onboarding status (ADMIN ONLY)
 */
export async function deleteOnboardingStatus(userId: string): Promise<void> {
  try {
    const db = getDbOrThrow();
    const docRef = doc(db, ONBOARDING_STATUS_COLLECTION, userId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting onboarding status:', error);
    throw error;
  }
}

// ===== GDPR SYSTEM CONFIGURATION MANAGEMENT =====

/**
 * Get all system configurations
 */
export async function getAllSystemConfigs(): Promise<GdprSystemConfig[]> {
  try {
    const db = getDbOrThrow();
    const q = query(
      collection(db, GDPR_SYSTEM_CONFIGS_COLLECTION),
      orderBy('priority', 'asc'),
      orderBy('name', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate()
      } as GdprSystemConfig;
    });
  } catch (error) {
    console.error('Error getting system configs:', error);
    throw error;
  }
}

/**
 * Get active system configurations only
 */
export async function getActiveSystemConfigs(): Promise<GdprSystemConfig[]> {
  try {
    const db = getDbOrThrow();
    const q = query(
      collection(db, GDPR_SYSTEM_CONFIGS_COLLECTION),
      where('isActive', '==', true),
      orderBy('priority', 'asc'),
      orderBy('name', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate()
      } as GdprSystemConfig;
    });
  } catch (error) {
    console.error('Error getting active system configs:', error);
    throw error;
  }
}

/**
 * Create a new system configuration
 */
export async function createSystemConfig(config: Omit<GdprSystemConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const db = getDbOrThrow();
    const now = Timestamp.now();
    
    // Clean the config - remove undefined values that Firestore doesn't accept
    const cleanConfig: any = {
      name: config.name,
      priority: config.priority,
      slaHours: config.slaHours,
      isActive: config.isActive,
      createdAt: now,
      updatedAt: now
    };
    
    // Only add optional fields if they have actual values
    if (config.organization) cleanConfig.organization = config.organization;
    if (config.description) cleanConfig.description = config.description;
    if (config.contactInfo) cleanConfig.contactInfo = config.contactInfo;
    if (config.accessUrl) cleanConfig.accessUrl = config.accessUrl;
    
    const docRef = await addDoc(collection(db, GDPR_SYSTEM_CONFIGS_COLLECTION), cleanConfig);
    return docRef.id;
  } catch (error) {
    console.error('Error creating system config:', error);
    throw error;
  }
}

/**
 * Update a system configuration
 */
export async function updateSystemConfig(id: string, updates: Partial<Omit<GdprSystemConfig, 'id' | 'createdAt'>>): Promise<void> {
  try {
    const db = getDbOrThrow();
    const docRef = doc(db, GDPR_SYSTEM_CONFIGS_COLLECTION, id);
    
    // Clean the updates - remove undefined values
    const cleanUpdates: any = {
      updatedAt: Timestamp.now()
    };
    
    // Only add fields with actual values
    if (updates.name !== undefined) cleanUpdates.name = updates.name;
    if (updates.organization !== undefined) cleanUpdates.organization = updates.organization;
    if (updates.priority !== undefined) cleanUpdates.priority = updates.priority;
    if (updates.slaHours !== undefined) cleanUpdates.slaHours = updates.slaHours;
    if (updates.description !== undefined) cleanUpdates.description = updates.description;
    if (updates.contactInfo !== undefined) cleanUpdates.contactInfo = updates.contactInfo;
    if (updates.accessUrl !== undefined) cleanUpdates.accessUrl = updates.accessUrl;
    if (updates.isActive !== undefined) cleanUpdates.isActive = updates.isActive;
    
    await updateDoc(docRef, cleanUpdates);
  } catch (error) {
    console.error('Error updating system config:', error);
    throw error;
  }
}

/**
 * Delete a system configuration
 */
export async function deleteSystemConfig(id: string): Promise<void> {
  try {
    const db = getDbOrThrow();
    const docRef = doc(db, GDPR_SYSTEM_CONFIGS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting system config:', error);
    throw error;
  }
}