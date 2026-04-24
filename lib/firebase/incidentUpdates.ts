/**
 * Firebase operations for Incident Updates and Task-Force Coordination
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { getDbOrThrow } from './config';
import { IncidentUpdate } from '../types';

// ===== COLLECTIONS =====
const INCIDENT_UPDATES_COLLECTION = 'incidentUpdates';

// ===== INCIDENT UPDATES CRUD =====

/**
 * Get all updates for a specific incident
 */
export async function getIncidentUpdates(incidentId: string): Promise<IncidentUpdate[]> {
  try {
    const db = getDbOrThrow();
    const q = query(
      collection(db, INCIDENT_UPDATES_COLLECTION),
      where('incidentId', '==', incidentId),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    })) as IncidentUpdate[];
  } catch (error) {
    console.error('Error fetching incident updates:', error);
    throw error;
  }
}

/**
 * Add new incident update
 */
export async function addIncidentUpdate(
  incidentId: string,
  type: IncidentUpdate['type'],
  title: string,
  content: string,
  author: string,
  authorName: string,
  visibility: IncidentUpdate['visibility'] = 'task-force'
): Promise<string> {
  try {
    const db = getDbOrThrow();
    const docRef = await addDoc(collection(db, INCIDENT_UPDATES_COLLECTION), {
      incidentId,
      type,
      title,
      content,
      author,
      authorName,
      visibility,
      timestamp: Timestamp.now(),
      attachments: [],
    });
    
    console.log('Incident update created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating incident update:', error);
    throw error;
  }
}

/**
 * Update incident task-force assignment
 */
export async function updateIncidentTaskForce(
  incidentId: string,
  taskForceAssignment: {
    taskForceId: string;
    assignedMembers: string[];
    leadMember?: string;
    slackChannelId?: string;
    slackChannelName?: string;
  },
  assignedBy: string
): Promise<void> {
  try {
    const db = getDbOrThrow();
    const docRef = doc(db, 'incidents', incidentId);
    
    await updateDoc(docRef, {
      'assignedTaskForce': {
        ...taskForceAssignment,
        assignedAt: Timestamp.now(),
        assignedBy,
      },
      updatedAt: Timestamp.now(),
    });
    
    console.log('Incident task-force assignment updated:', incidentId);
  } catch (error) {
    console.error('Error updating incident task-force assignment:', error);
    throw error;
  }
}