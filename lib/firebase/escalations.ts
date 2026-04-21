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
  limit,
  Timestamp,
} from 'firebase/firestore';
// Import getDbOrThrow helper function
import { getDbOrThrow } from './config';
import {
  Escalation,
  EscalationAuditLog,
  EscalationStatus,
  escalationFromFirestore,
  escalationToFirestore,
  DEFAULT_ACTION_ITEMS,
} from '../types/escalations';

const ESCALATIONS_COLLECTION = 'escalations';
const ESCALATION_AUDIT_LOG_COLLECTION = 'escalationAuditLog';

/**
 * Generate next escalation ID
 */
async function generateEscalationId(): Promise<string> {
  const db = getDbOrThrow();
  const year = new Date().getFullYear();
  
  // Get all escalations for this year
  const q = query(
    collection(db, ESCALATIONS_COLLECTION),
    where('escalationId', '>=', `ESC-${year}-`),
    where('escalationId', '<', `ESC-${year + 1}-`)
  );
  
  const snapshot = await getDocs(q);
  const count = snapshot.size + 1;
  
  return `ESC-${year}-${String(count).padStart(4, '0')}`;
}

/**
 * Create new escalation
 */
export async function createEscalation(
  data: Omit<Escalation, 'id' | 'escalationId' | 'createdAt' | 'updatedAt' | 'deadlineFirstReply' | 'actionItems' | 'links' | 'communications'>
): Promise<string> {
  const db = getDbOrThrow();
  const escalationId = await generateEscalationId();
  const now = new Date();
  const deadlineFirstReply = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 days
  
  // Initialize action items from template
  const actionItems = DEFAULT_ACTION_ITEMS.map((template, index) => ({
    id: `action-${index + 1}`,
    ...template,
    createdAt: now,
  }));
  
  const escalation: Escalation = {
    ...data,
    id: escalationId,
    escalationId,
    createdAt: now,
    updatedAt: now,
    deadlineFirstReply,
    links: [],
    communications: [],
    actionItems,
  };
  
  const firestoreData = escalationToFirestore(escalation);
  await setDoc(doc(db, ESCALATIONS_COLLECTION, escalationId), firestoreData);
  
  // Log creation
  await logEscalationChange(escalationId, data.createdBy, 'Escalation created', 'status', '', data.status);
  
  return escalationId;
}

/**
 * Get escalation by ID
 */
export async function getEscalation(id: string): Promise<Escalation | null> {
  const db = getDbOrThrow();
  const docRef = doc(db, ESCALATIONS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return escalationFromFirestore({ id: docSnap.id, ...docSnap.data() });
}

/**
 * Get all escalations
 */
export async function getAllEscalations(): Promise<Escalation[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, ESCALATIONS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(150)
  );
  
  const querySnapshot = await getDocs(q);
  const escalations = querySnapshot.docs.map(doc =>
    escalationFromFirestore({ id: doc.id, ...doc.data() })
  );
  
  return escalations;
}

/**
 * Update escalation status
 */
export async function updateEscalationStatus(
  id: string,
  newStatus: EscalationStatus,
  userId: string
): Promise<void> {
  const db = getDbOrThrow();
  const escalation = await getEscalation(id);
  if (!escalation) throw new Error('Escalation not found');
  
  const oldStatus = escalation.status;
  
  await updateDoc(doc(db, ESCALATIONS_COLLECTION, id), {
    status: newStatus,
    updatedAt: Timestamp.fromDate(new Date()),
  });
  
  await logEscalationChange(id, userId, 'Status changed', 'status', oldStatus, newStatus);
}

/**
 * Update escalation field
 */
export async function updateEscalationField<K extends keyof Escalation>(
  id: string,
  fieldName: K,
  value: Escalation[K],
  userId: string
): Promise<void> {
  const db = getDbOrThrow();
  const escalation = await getEscalation(id);
  if (!escalation) throw new Error('Escalation not found');
  
  const oldValue = escalation[fieldName];
  
  await updateDoc(doc(db, ESCALATIONS_COLLECTION, id), {
    [fieldName]: value,
    updatedAt: Timestamp.fromDate(new Date()),
  });
  
  const fieldDisplayNames: Record<string, string> = {
    summary: 'Summary',
    customerCareCommunication: 'Customer Care Communication',
    investigationResult: 'Investigation Result',
    draftAnswer: 'Draft Answer',
    subject: 'Subject',
    market: 'Market',
    classification: 'Classification',
    cidOrEmail: 'CID/Email',
    jiraReference: 'Jira Reference',
    purecloudInteractionLink: 'Purecloud Link',
  };
  
  const displayName = fieldDisplayNames[String(fieldName)] || String(fieldName);
  await logEscalationChange(
    id,
    userId,
    `Updated ${displayName}`,
    String(fieldName),
    String(oldValue || '(empty)').substring(0, 100),
    String(value || '').substring(0, 100)
  );
}

/**
 * Add link to escalation
 */
export async function addEscalationLink(
  id: string,
  link: Omit<import('../types/escalations').EscalationLink, 'id' | 'addedAt'>,
  userId: string
): Promise<void> {
  const db = getDbOrThrow();
  const escalation = await getEscalation(id);
  if (!escalation) throw new Error('Escalation not found');
  
  const newLink = {
    ...link,
    id: `link-${Date.now()}`,
    addedAt: new Date(),
  };
  
  const updatedLinks = [...escalation.links, newLink];
  
  await updateDoc(doc(db, ESCALATIONS_COLLECTION, id), {
    links: updatedLinks.map(l => ({
      ...l,
      addedAt: Timestamp.fromDate(l.addedAt),
    })),
    updatedAt: Timestamp.fromDate(new Date()),
  });
  
  await logEscalationChange(id, userId, `Added ${link.type} link`, 'links', '', link.url);
}

/**
 * Update action item
 */
export async function updateActionItem(
  escalationId: string,
  actionItemId: string,
  updates: Partial<import('../types/escalations').EscalationActionItem>,
  userId: string
): Promise<void> {
  const db = getDbOrThrow();
  const escalation = await getEscalation(escalationId);
  if (!escalation) throw new Error('Escalation not found');
  
  const updatedActionItems = escalation.actionItems.map(item => {
    if (item.id === actionItemId) {
      const updated = { ...item, ...updates };
      // If status changed to Completed, set completedAt
      if (updates.status === 'Completed' && !item.completedAt) {
        updated.completedAt = new Date();
      }
      // If status changed from Completed to something else, clear completedAt
      if (updates.status && updates.status !== 'Completed') {
        updated.completedAt = undefined;
      }
      return updated;
    }
    return item;
  });
  
  await updateDoc(doc(db, ESCALATIONS_COLLECTION, escalationId), {
    actionItems: updatedActionItems.map(item => ({
      ...item,
      createdAt: Timestamp.fromDate(item.createdAt),
      completedAt: item.completedAt ? Timestamp.fromDate(item.completedAt) : null,
    })),
    updatedAt: Timestamp.fromDate(new Date()),
  });
  
  const item = escalation.actionItems.find(i => i.id === actionItemId);
  if (item) {
    await logEscalationChange(
      escalationId,
      userId,
      `Updated action item: ${item.title}`,
      'actionItem',
      JSON.stringify({ status: item.status, owner: item.owner }),
      JSON.stringify({ status: updates.status || item.status, owner: updates.owner || item.owner })
    );
  }
}

/**
 * Add new action item
 */
export async function addActionItem(
  escalationId: string,
  title: string,
  owner: import('../types/escalations').ActionItemOwner,
  userId: string
): Promise<void> {
  const db = getDbOrThrow();
  const escalation = await getEscalation(escalationId);
  if (!escalation) throw new Error('Escalation not found');
  
  const newItem: import('../types/escalations').EscalationActionItem = {
    id: `action-${Date.now()}`,
    title,
    owner,
    status: 'Not Started',
    createdAt: new Date(),
  };
  
  const updatedActionItems = [...escalation.actionItems, newItem];
  
  await updateDoc(doc(db, ESCALATIONS_COLLECTION, escalationId), {
    actionItems: updatedActionItems.map(item => ({
      ...item,
      createdAt: Timestamp.fromDate(item.createdAt),
      completedAt: item.completedAt ? Timestamp.fromDate(item.completedAt) : null,
    })),
    updatedAt: Timestamp.fromDate(new Date()),
  });
  
  await logEscalationChange(escalationId, userId, `Added action item: ${title}`, 'actionItems', '', title);
}

/**
 * Add communication entry to escalation
 */
export async function addCommunicationEntry(
  escalationId: string,
  entry: Omit<import('../types/escalations').CommunicationEntry, 'id' | 'timestamp'>,
  userId: string
): Promise<void> {
  const db = getDbOrThrow();
  const escalation = await getEscalation(escalationId);
  if (!escalation) throw new Error('Escalation not found');
  
  const newEntry = {
    ...entry,
    id: `comm-${Date.now()}`,
    timestamp: new Date(),
  };
  
  const updatedCommunications = [...escalation.communications, newEntry];
  
  await updateDoc(doc(db, ESCALATIONS_COLLECTION, escalationId), {
    communications: updatedCommunications.map(c => ({
      ...c,
      timestamp: Timestamp.fromDate(c.timestamp),
    })),
    updatedAt: Timestamp.fromDate(new Date()),
  });
  
  await logEscalationChange(
    escalationId,
    userId,
    `Added communication entry from ${entry.sender}`,
    'communications',
    '',
    entry.summary.substring(0, 100)
  );
}

/**
 * Update communication entry
 */
export async function updateCommunicationEntry(
  escalationId: string,
  entryId: string,
  updates: Partial<Omit<import('../types/escalations').CommunicationEntry, 'id' | 'timestamp'>>,
  userId: string
): Promise<void> {
  const db = getDbOrThrow();
  const escalation = await getEscalation(escalationId);
  if (!escalation) throw new Error('Escalation not found');
  
  const updatedCommunications = escalation.communications.map(comm => 
    comm.id === entryId ? { ...comm, ...updates } : comm
  );
  
  await updateDoc(doc(db, ESCALATIONS_COLLECTION, escalationId), {
    communications: updatedCommunications.map(c => ({
      ...c,
      timestamp: Timestamp.fromDate(c.timestamp),
    })),
    updatedAt: Timestamp.fromDate(new Date()),
  });
  
  await logEscalationChange(
    escalationId,
    userId,
    `Updated communication entry`,
    'communications',
    '',
    ''
  );
}

/**
 * Get escalation audit log
 */
export async function getEscalationAuditLog(escalationId: string): Promise<EscalationAuditLog[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, ESCALATION_AUDIT_LOG_COLLECTION),
    where('escalationId', '==', escalationId)
  );
  
  const querySnapshot = await getDocs(q);
  const logs = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp?.toDate() || new Date(),
  })) as EscalationAuditLog[];
  
  // Client-side sort
  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Log escalation change
 */
async function logEscalationChange(
  escalationId: string,
  userId: string,
  action: string,
  fieldChanged?: string,
  oldValue?: string,
  newValue?: string
): Promise<void> {
  const db = getDbOrThrow();
  const logId = doc(collection(db, ESCALATION_AUDIT_LOG_COLLECTION)).id;
  
  await setDoc(doc(db, ESCALATION_AUDIT_LOG_COLLECTION, logId), {
    id: logId,
    escalationId,
    timestamp: Timestamp.fromDate(new Date()),
    userId,
    userEmail: userId,
    action,
    fieldChanged,
    oldValue,
    newValue,
  });
}
