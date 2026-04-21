/**
 * AI Trailblazers - Team Management  
 * Firebase functions for Team CRUD operations
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getDb } from './config';
import { Team, CreateTeamData, TeamMember } from '../types/teams';

function getDbOrThrow() {
  const db = getDb();
  if (!db) throw new Error('Firebase not initialized');
  return db;
}

// ============================================
// TEAMS CRUD
// ============================================

export async function createTeam(data: CreateTeamData): Promise<string> {
  const db = getDbOrThrow();
  
  const teamData = {
    clusterId: data.clusterId,
    name: data.name,
    description: data.description,
    teamLead: data.teamLead,
    members: [data.teamLead], // Team lead is automatically a member
    privacy: data.privacy || 'cluster', // Default: cluster-visible
    status: 'active', // No approval needed (per your requirement)
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  // Create team in: /clusters/{clusterId}/teams/{teamId}
  const teamsRef = collection(db, 'clusters', data.clusterId, 'teams');
  const docRef = await addDoc(teamsRef, teamData);
  
  return docRef.id;
}

export async function getTeam(clusterId: string, teamId: string): Promise<Team | null> {
  const db = getDbOrThrow();
  const docRef = doc(db, 'clusters', clusterId, 'teams', teamId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  return {
    id: docSnap.id,
    clusterId: data.clusterId,
    name: data.name,
    description: data.description,
    teamLead: data.teamLead,
    members: data.members || [],
    privacy: data.privacy || 'cluster',
    status: data.status || 'active',
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    approvedBy: data.approvedBy,
    approvedAt: data.approvedAt?.toDate(),
  };
}

export async function getTeamsInCluster(clusterId: string): Promise<Team[]> {
  const db = getDbOrThrow();
  const teamsRef = collection(db, 'clusters', clusterId, 'teams');
  const q = query(teamsRef, where('status', '==', 'active'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      clusterId: data.clusterId,
      name: data.name,
      description: data.description,
      teamLead: data.teamLead,
      members: data.members || [],
      privacy: data.privacy || 'cluster',
      status: data.status || 'active',
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      approvedBy: data.approvedBy,
      approvedAt: data.approvedAt?.toDate(),
    };
  });
}

export async function getUserTeams(userEmail: string): Promise<Team[]> {
  // Note: This requires querying across all clusters
  // For better performance, maintain a user → teams mapping in userProfile
  const db = getDbOrThrow();
  
  // Get all clusters first
  const clustersSnapshot = await getDocs(collection(db, 'clusters'));
  const allTeams: Team[] = [];
  
  for (const clusterDoc of clustersSnapshot.docs) {
    const teamsRef = collection(db, 'clusters', clusterDoc.id, 'teams');
    const q = query(
      teamsRef,
      where('members', 'array-contains', userEmail),
      where('status', '==', 'active')
    );
    const teamsSnapshot = await getDocs(q);
    
    teamsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      allTeams.push({
        id: doc.id,
        clusterId: clusterDoc.id,
        name: data.name,
        description: data.description,
        teamLead: data.teamLead,
        members: data.members || [],
        privacy: data.privacy || 'cluster',
        status: data.status || 'active',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt?.toDate(),
      });
    });
  }
  
  return allTeams;
}

export async function updateTeam(
  clusterId: string,
  teamId: string,
  data: Partial<Omit<Team, 'id' | 'clusterId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const db = getDbOrThrow();
  const docRef = doc(db, 'clusters', clusterId, 'teams', teamId);
  
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteTeam(clusterId: string, teamId: string): Promise<void> {
  const db = getDbOrThrow();
  // Soft delete: mark as archived
  await updateTeam(clusterId, teamId, { status: 'archived' });
}

// ============================================
// TEAM MEMBERS
// ============================================

export async function addTeamMember(
  clusterId: string,
  teamId: string,
  email: string
): Promise<void> {
  const db = getDbOrThrow();
  const team = await getTeam(clusterId, teamId);
  
  if (!team) throw new Error('Team not found');
  if (team.members.includes(email)) return; // Already a member
  
  const updatedMembers = [...team.members, email];
  await updateTeam(clusterId, teamId, { members: updatedMembers });
}

export async function removeTeamMember(
  clusterId: string,
  teamId: string,
  email: string
): Promise<void> {
  const db = getDbOrThrow();
  const team = await getTeam(clusterId, teamId);
  
  if (!team) throw new Error('Team not found');
  if (email === team.teamLead) throw new Error('Cannot remove team lead');
  
  const updatedMembers = team.members.filter(m => m !== email);
  await updateTeam(clusterId, teamId, { members: updatedMembers });
}

export async function promoteToTeamLead(
  clusterId: string,
  teamId: string,
  newLeadEmail: string,
  currentLeadEmail: string
): Promise<void> {
  const team = await getTeam(clusterId, teamId);
  
  if (!team) throw new Error('Team not found');
  if (team.teamLead !== currentLeadEmail) throw new Error('Only current team lead can promote');
  if (!team.members.includes(newLeadEmail)) throw new Error('New lead must be a team member');
  
  await updateTeam(clusterId, teamId, { teamLead: newLeadEmail });
}

// ============================================
// HELPERS
// ============================================

export async function isTeamLead(clusterId: string, teamId: string, email: string): Promise<boolean> {
  const team = await getTeam(clusterId, teamId);
  return team?.teamLead === email;
}

export async function isTeamMember(clusterId: string, teamId: string, email: string): Promise<boolean> {
  const team = await getTeam(clusterId, teamId);
  return team?.members.includes(email) || false;
}
