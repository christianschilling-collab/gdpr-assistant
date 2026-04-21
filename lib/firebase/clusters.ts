/**
 * AI Trailblazers - Cluster Management
 * Firebase functions for Cluster CRUD operations
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
  setDoc,
} from 'firebase/firestore';
import { getDb } from './config';
import { Cluster, CreateClusterData } from '../types/teams';

const CLUSTERS_COLLECTION = 'clusters';

function getDbOrThrow() {
  const db = getDb();
  if (!db) throw new Error('Firebase not initialized');
  return db;
}

// ============================================
// CREATE
// ============================================

export async function createCluster(data: CreateClusterData): Promise<string> {
  const db = getDbOrThrow();
  
  const clusterData = {
    name: data.name,
    description: data.description,
    clusterLead: data.clusterLead,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, CLUSTERS_COLLECTION), clusterData);
  return docRef.id;
}

// ============================================
// READ
// ============================================

export async function getCluster(clusterId: string): Promise<Cluster | null> {
  const db = getDbOrThrow();
  const docRef = doc(db, CLUSTERS_COLLECTION, clusterId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name,
    description: data.description,
    clusterLead: data.clusterLead,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

export async function getAllClusters(): Promise<Cluster[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, CLUSTERS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      description: data.description,
      clusterLead: data.clusterLead,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

export async function getClustersByLead(email: string): Promise<Cluster[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, CLUSTERS_COLLECTION),
    where('clusterLead', '==', email),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      description: data.description,
      clusterLead: data.clusterLead,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

// ============================================
// UPDATE
// ============================================

export async function updateCluster(
  clusterId: string,
  data: Partial<CreateClusterData>
): Promise<void> {
  const db = getDbOrThrow();
  const docRef = doc(db, CLUSTERS_COLLECTION, clusterId);
  
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ============================================
// DELETE
// ============================================

export async function deleteCluster(clusterId: string): Promise<void> {
  const db = getDbOrThrow();
  const docRef = doc(db, CLUSTERS_COLLECTION, clusterId);
  await deleteDoc(docRef);
}

// ============================================
// HELPERS
// ============================================

export async function isClusterLead(clusterId: string, email: string): Promise<boolean> {
  const cluster = await getCluster(clusterId);
  return cluster?.clusterLead === email;
}
