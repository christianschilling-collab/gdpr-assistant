/**
 * AI Trailblazers - User Profiles & Self-Evaluation
 * Firebase functions for User Profile management and Proficiency tracking
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { getDb } from './config';
import { 
  UserProfile,
  Proficiency,
  SelfEvaluationData,
  ProficiencyHistory,
  ProficiencyCategory,
  ProficiencyLevel
} from '../types/teams';

const USERS_COLLECTION = 'users';
const PLATFORM_ADMINS_COLLECTION = 'platformAdmins';

function getDbOrThrow() {
  const db = getDb();
  if (!db) throw new Error('Firebase not initialized');
  return db;
}

// ============================================
// USER PROFILES
// ============================================

export async function createOrUpdateUserProfile(
  email: string,
  data: Partial<UserProfile>
): Promise<void> {
  const db = getDbOrThrow();
  const docRef = doc(db, USERS_COLLECTION, email);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    // Update existing profile
    await updateDoc(docRef, {
      ...data,
      lastLoginAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } else {
    // Create new profile
    await setDoc(docRef, {
      email,
      name: data.name || email.split('@')[0],
      displayName: data.displayName || data.name || email.split('@')[0],
      photoURL: data.photoURL || null,
      hasCompletedSelfEvaluation: false,
      teams: [],
      clusters: [],
      savedResources: [],
      isPlatformAdmin: false,
      createdAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ...data,
    });
  }
}

export async function getUserProfile(email: string): Promise<UserProfile | null> {
  const db = getDbOrThrow();
  const docRef = doc(db, USERS_COLLECTION, email);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  return {
    email: data.email,
    name: data.name,
    displayName: data.displayName,
    photoURL: data.photoURL,
    hasCompletedSelfEvaluation: data.hasCompletedSelfEvaluation || false,
    selfEvaluationDate: data.selfEvaluationDate?.toDate(),
    teams: data.teams || [],
    clusters: data.clusters || [],
    savedResources: data.savedResources || [],
    isPlatformAdmin: data.isPlatformAdmin || false,
    createdAt: data.createdAt?.toDate() || new Date(),
    lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

export async function updateUserTeams(email: string, teamIds: string[]): Promise<void> {
  const db = getDbOrThrow();
  const docRef = doc(db, USERS_COLLECTION, email);
  
  await updateDoc(docRef, {
    teams: teamIds,
    updatedAt: Timestamp.now(),
  });
}

export async function addUserToTeam(email: string, teamId: string): Promise<void> {
  const profile = await getUserProfile(email);
  if (!profile) throw new Error('User profile not found');
  
  if (!profile.teams.includes(teamId)) {
    const updatedTeams = [...profile.teams, teamId];
    await updateUserTeams(email, updatedTeams);
  }
}

export async function removeUserFromTeam(email: string, teamId: string): Promise<void> {
  const profile = await getUserProfile(email);
  if (!profile) throw new Error('User profile not found');
  
  const updatedTeams = profile.teams.filter(t => t !== teamId);
  await updateUserTeams(email, updatedTeams);
}

// ============================================
// PLATFORM ADMINS
// ============================================

export async function isPlatformAdmin(email: string): Promise<boolean> {
  const db = getDbOrThrow();
  const docRef = doc(db, PLATFORM_ADMINS_COLLECTION, email);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
}

export async function addPlatformAdmin(email: string): Promise<void> {
  const db = getDbOrThrow();
  const docRef = doc(db, PLATFORM_ADMINS_COLLECTION, email);
  await setDoc(docRef, {
    email,
    addedAt: Timestamp.now(),
  });
  
  // Also update user profile
  await createOrUpdateUserProfile(email, { isPlatformAdmin: true });
}

export async function removePlatformAdmin(email: string): Promise<void> {
  const db = getDbOrThrow();
  const docRef = doc(db, PLATFORM_ADMINS_COLLECTION, email);
  await setDoc(docRef, { _deleted: true }); // Soft delete
  
  // Also update user profile
  const userDocRef = doc(db, USERS_COLLECTION, email);
  await updateDoc(userDocRef, { isPlatformAdmin: false });
}

// ============================================
// SELF-EVALUATION & PROFICIENCY
// ============================================

export async function submitSelfEvaluation(
  userEmail: string,
  data: SelfEvaluationData
): Promise<void> {
  const db = getDbOrThrow();
  const batch = writeBatch(db);
  
  // 1. Create proficiency records for each category
  const proficiencyRef = collection(
    db,
    'clusters',
    data.clusterId,
    'teams',
    data.teamId,
    'proficiency'
  );
  
  data.evaluations.forEach(evaluation => {
    const docRef = doc(proficiencyRef);
    batch.set(docRef, {
      teamId: data.teamId,
      clusterId: data.clusterId,
      participantEmail: userEmail,
      category: evaluation.category,
      level: evaluation.level,
      assessedAt: Timestamp.now(),
      assessedBy: 'self',
      notes: evaluation.notes || null,
      visibility: 'cluster', // Kirsten can see for aggregation
    });
  });
  
  // 2. Update user profile
  const userDocRef = doc(db, USERS_COLLECTION, userEmail);
  batch.update(userDocRef, {
    hasCompletedSelfEvaluation: true,
    selfEvaluationDate: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  
  await batch.commit();
}

export async function getProficiency(
  clusterId: string,
  teamId: string,
  participantEmail: string
): Promise<Proficiency[]> {
  const db = getDbOrThrow();
  const proficiencyRef = collection(
    db,
    'clusters',
    clusterId,
    'teams',
    teamId,
    'proficiency'
  );
  
  const q = query(
    proficiencyRef,
    where('participantEmail', '==', participantEmail),
    orderBy('assessedAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      teamId: data.teamId,
      clusterId: data.clusterId,
      participantEmail: data.participantEmail,
      category: data.category,
      level: data.level,
      assessedAt: data.assessedAt?.toDate() || new Date(),
      assessedBy: data.assessedBy,
      notes: data.notes,
      visibility: data.visibility || 'cluster',
    };
  });
}

export async function getLatestProficiencyForUser(
  clusterId: string,
  teamId: string,
  participantEmail: string
): Promise<Record<ProficiencyCategory, Proficiency>> {
  const allProficiency = await getProficiency(clusterId, teamId, participantEmail);
  
  // Get latest proficiency for each category
  const latest: Record<string, Proficiency> = {};
  
  allProficiency.forEach(prof => {
    if (!latest[prof.category] || prof.assessedAt > latest[prof.category].assessedAt) {
      latest[prof.category] = prof;
    }
  });
  
  return latest as Record<ProficiencyCategory, Proficiency>;
}

export async function getProficiencyHistory(
  clusterId: string,
  teamId: string,
  participantEmail: string,
  category: ProficiencyCategory
): Promise<ProficiencyHistory> {
  const allProficiency = await getProficiency(clusterId, teamId, participantEmail);
  
  const categoryProficiency = allProficiency
    .filter(p => p.category === category)
    .sort((a, b) => a.assessedAt.getTime() - b.assessedAt.getTime());
  
  return {
    participantEmail,
    category,
    timeline: categoryProficiency.map(p => ({
      date: p.assessedAt,
      level: p.level,
      assessedBy: p.assessedBy,
    })),
  };
}

// ============================================
// TEAM PROFICIENCY AGGREGATION
// ============================================

export async function getTeamProficiency(
  clusterId: string,
  teamId: string
): Promise<Proficiency[]> {
  const db = getDbOrThrow();
  const proficiencyRef = collection(
    db,
    'clusters',
    clusterId,
    'teams',
    teamId,
    'proficiency'
  );
  
  const snapshot = await getDocs(proficiencyRef);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      teamId: data.teamId,
      clusterId: data.clusterId,
      participantEmail: data.participantEmail,
      category: data.category,
      level: data.level,
      assessedAt: data.assessedAt?.toDate() || new Date(),
      assessedBy: data.assessedBy,
      notes: data.notes,
      visibility: data.visibility || 'cluster',
    };
  });
}

export async function getClusterProficiency(clusterId: string): Promise<Proficiency[]> {
  const db = getDbOrThrow();
  
  // Get all teams in cluster
  const teamsSnapshot = await getDocs(collection(db, 'clusters', clusterId, 'teams'));
  const allProficiency: Proficiency[] = [];
  
  for (const teamDoc of teamsSnapshot.docs) {
    const teamProficiency = await getTeamProficiency(clusterId, teamDoc.id);
    allProficiency.push(...teamProficiency);
  }
  
  return allProficiency;
}

// ============================================
// RESOURCE BOOKMARKING
// ============================================

export async function saveResource(email: string, resourceId: string): Promise<void> {
  const profile = await getUserProfile(email);
  if (!profile) throw new Error('User profile not found');
  
  if (!profile.savedResources.includes(resourceId)) {
    const updated = [...profile.savedResources, resourceId];
    const db = getDbOrThrow();
    await updateDoc(doc(db, USERS_COLLECTION, email), {
      savedResources: updated,
      updatedAt: Timestamp.now(),
    });
  }
}

export async function unsaveResource(email: string, resourceId: string): Promise<void> {
  const profile = await getUserProfile(email);
  if (!profile) throw new Error('User profile not found');
  
  const updated = profile.savedResources.filter(id => id !== resourceId);
  const db = getDbOrThrow();
  await updateDoc(doc(db, USERS_COLLECTION, email), {
    savedResources: updated,
    updatedAt: Timestamp.now(),
  });
}
