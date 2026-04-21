import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './config';

export interface AgentTrainingRecord {
  id?: string;
  caseId: string;
  caseNumber: string;
  agentEmail: string;
  agentName?: string;
  categoryId: string;
  categoryName: string;
  requesterType: string;
  errorType: 'misclassification' | 'wrong_template' | 'process_error' | 'escalation_error' | 'other';
  notes?: string;
  trainingContent?: string;
  status: 'pending' | 'sent' | 'completed' | 'failed';
  sentAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}

/**
 * Add a new agent training record
 */
export async function createTrainingRecord(data: Omit<AgentTrainingRecord, 'id' | 'createdAt'>): Promise<string> {
  const trainingRef = collection(db, 'agentTraining');
  const docRef = await addDoc(trainingRef, {
    ...data,
    createdAt: Timestamp.now(),
    sentAt: data.sentAt ? Timestamp.fromDate(data.sentAt) : null,
    completedAt: data.completedAt ? Timestamp.fromDate(data.completedAt) : null,
  });
  return docRef.id;
}

/**
 * Get training records for a specific case
 */
export async function getTrainingRecordsByCase(caseId: string): Promise<AgentTrainingRecord[]> {
  const trainingRef = collection(db, 'agentTraining');
  const q = query(
    trainingRef,
    where('caseId', '==', caseId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      sentAt: data.sentAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
    } as AgentTrainingRecord;
  });
}

/**
 * Get training records for a specific agent
 */
export async function getTrainingRecordsByAgent(agentEmail: string): Promise<AgentTrainingRecord[]> {
  const trainingRef = collection(db, 'agentTraining');
  const q = query(
    trainingRef,
    where('agentEmail', '==', agentEmail),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      sentAt: data.sentAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
    } as AgentTrainingRecord;
  });
}

/**
 * Get all pending training records
 */
export async function getPendingTrainingRecords(): Promise<AgentTrainingRecord[]> {
  const trainingRef = collection(db, 'agentTraining');
  const q = query(
    trainingRef,
    where('status', '==', 'pending'),
    orderBy('createdAt', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      sentAt: data.sentAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
    } as AgentTrainingRecord;
  });
}

/**
 * Update training record status
 */
export async function updateTrainingStatus(
  recordId: string,
  status: 'pending' | 'sent' | 'completed' | 'failed',
  additionalData?: { sentAt?: Date; completedAt?: Date }
): Promise<void> {
  const recordRef = doc(db, 'agentTraining', recordId);
  const updateData: any = { status };

  if (additionalData?.sentAt) {
    updateData.sentAt = Timestamp.fromDate(additionalData.sentAt);
  }
  if (additionalData?.completedAt) {
    updateData.completedAt = Timestamp.fromDate(additionalData.completedAt);
  }

  await updateDoc(recordRef, updateData);
}
