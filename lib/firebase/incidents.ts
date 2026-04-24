/**
 * Firestore CRUD operations for GDPR Incidents (Art. 33)
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
  limit,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { getDb } from './config';
import {
  Incident,
  IncidentTask,
  IncidentAuditLog,
  IncidentStatus,
  CountryImpact,
  IncidentScenarioTagId,
} from '../types';
import { isIncidentScenarioTagId } from '../constants/incidentScenarioTags';

const INCIDENTS_COLLECTION = 'incidents';
const TASKS_COLLECTION = 'incidentTasks';
const AUDIT_LOG_COLLECTION = 'incidentAuditLog';

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured');
  }
  return db;
}

/**
 * Generate human-readable incident ID
 */
export function generateIncidentId(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INC-${year}-${random}`;
}

/**
 * Calculate 72h notification deadline (Art. 33 GDPR)
 */
export function calculateNotificationDeadline(discoveryDate: Date): Date {
  const deadline = new Date(discoveryDate);
  deadline.setHours(deadline.getHours() + 72);
  return deadline;
}

/**
 * Calculate total impacted customers across countries
 */
export function calculateTotalImpacted(countryImpact: CountryImpact[]): number {
  return countryImpact.reduce((sum, country) => sum + country.impactedVolume, 0);
}

/**
 * Auto-determine risk level based on volume
 */
export function autoCalculateRisk(volume: number): 'High' | 'Medium' | 'Low' {
  if (volume >= 1000) return 'High';
  if (volume >= 100) return 'Medium';
  return 'Low';
}

/**
 * Convert Firestore document to Incident
 */
function docToIncident(data: DocumentData): Incident {
  return {
    id: data.id,
    incidentId: data.incidentId,
    natureOfIncident: data.natureOfIncident,
    additionalDescription: data.additionalDescription,
    affectedSystems: data.affectedSystems || [],
    dataCategories: data.dataCategories || [],
    affectedMarkets: Array.isArray(data.affectedMarkets) ? data.affectedMarkets : undefined,
    scenarioTags: Array.isArray(data.scenarioTags)
      ? (data.scenarioTags.filter((x: unknown) => typeof x === 'string' && isIncidentScenarioTagId(x)) as IncidentScenarioTagId[])
      : undefined,
    breachTypes: data.breachTypes,
    breachOtherDetails: data.breachOtherDetails,
    impactPeriod: {
      start: data.impactPeriod?.start?.toDate() || new Date(),
      end: data.impactPeriod?.end?.toDate(),
    },
    discoveryDate: data.discoveryDate?.toDate() || new Date(),
    rootCause: data.rootCause,
    primaryLegalRisk: data.primaryLegalRisk,
    classification: data.classification,
    countryImpact: data.countryImpact || [],
    totalImpacted: data.totalImpacted,
    technicalResolution: data.technicalResolution,
    workaroundCS: data.workaroundCS,
    communicationInternal: data.communicationInternal,
    communicationExternal: data.communicationExternal,
    riskAssessment: data.riskAssessment,
    legalReasoning: data.legalReasoning,
    notificationDecision: data.notificationDecision,
    validatedBy: data.validatedBy,
    validatedAt: data.validatedAt?.toDate(),
    status: data.status,
    assignedTo: data.assignedTo,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    createdBy: data.createdBy,
    notificationDeadline: data.notificationDeadline?.toDate(),
    authorityNotifiedAt: data.authorityNotifiedAt?.toDate(),
  };
}

/**
 * Convert Incident to Firestore format
 */
function incidentToDoc(incident: Incident): DocumentData {
  return {
    ...incident,
    impactPeriod: {
      start: Timestamp.fromDate(incident.impactPeriod.start),
      end: incident.impactPeriod.end ? Timestamp.fromDate(incident.impactPeriod.end) : null,
    },
    discoveryDate: Timestamp.fromDate(incident.discoveryDate),
    validatedAt: incident.validatedAt ? Timestamp.fromDate(incident.validatedAt) : null,
    createdAt: Timestamp.fromDate(incident.createdAt),
    updatedAt: Timestamp.fromDate(incident.updatedAt),
    notificationDeadline: incident.notificationDeadline
      ? Timestamp.fromDate(incident.notificationDeadline)
      : null,
    authorityNotifiedAt: incident.authorityNotifiedAt
      ? Timestamp.fromDate(incident.authorityNotifiedAt)
      : null,
  };
}

/**
 * Create new incident
 */
export async function createIncident(
  incidentData: Omit<Incident, 'id' | 'incidentId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getDbOrThrow();
  const incidentId = generateIncidentId();
  const id = doc(collection(db, INCIDENTS_COLLECTION)).id;
  
  const now = new Date();
  const notificationDeadline = calculateNotificationDeadline(incidentData.discoveryDate);
  const totalImpacted = calculateTotalImpacted(incidentData.countryImpact);
  
  const incident: Incident = {
    ...incidentData,
    id,
    incidentId,
    totalImpacted,
    notificationDeadline,
    /** Trackboard owner: always the reporter unless explicitly overridden (legacy). */
    assignedTo: (incidentData.assignedTo?.trim() || incidentData.createdBy) as string,
    createdAt: now,
    updatedAt: now,
  };
  
  await setDoc(doc(db, INCIDENTS_COLLECTION, id), incidentToDoc(incident));
  
  // Create initial audit log entry
  await logIncidentChange(id, incidentData.createdBy, 'Incident created', 'status', '', 'Reporting');
  
  // Generate initial tasks for Reporting phase
  await generateAutoTasks(id, 'Reporting', incidentData.createdBy);
  
  return id;
}

/**
 * Get incident by ID
 */
export async function getIncident(id: string): Promise<Incident | null> {
  const db = getDbOrThrow();
  const docRef = doc(db, INCIDENTS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docToIncident({ id: docSnap.id, ...docSnap.data() });
}

/**
 * Get all incidents
 */
export async function getAllIncidents(): Promise<Incident[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, INCIDENTS_COLLECTION), 
    orderBy('createdAt', 'desc'),
    limit(200)
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => docToIncident({ id: doc.id, ...doc.data() }));
}

/**
 * Get incidents by status
 */
export async function getIncidentsByStatus(status: IncidentStatus): Promise<Incident[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, INCIDENTS_COLLECTION),
    where('status', '==', status),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => docToIncident({ id: doc.id, ...doc.data() }));
}

/**
 * Update incident
 */
export async function updateIncident(
  id: string,
  updates: Partial<Incident>,
  userId: string
): Promise<void> {
  const db = getDbOrThrow();
  const docRef = doc(db, INCIDENTS_COLLECTION, id);
  
  // Get current incident for audit trail
  const current = await getIncident(id);
  if (!current) throw new Error('Incident not found');
  
  const now = new Date();
  const updatedData = {
    ...updates,
    updatedAt: Timestamp.fromDate(now),
  };
  
  // If country impact changed, recalculate total
  if (updates.countryImpact) {
    updatedData.totalImpacted = calculateTotalImpacted(updates.countryImpact);
  }
  
  await updateDoc(docRef, updatedData);
  
  // Log changes
  for (const [key, value] of Object.entries(updates)) {
    if (key !== 'updatedAt') {
      await logIncidentChange(
        id,
        userId,
        `Field updated: ${key}`,
        key,
        String((current as any)[key] || ''),
        String(value)
      );
    }
  }
}

/**
 * Update incident status (triggers auto-tasks)
 */
export async function updateIncidentStatus(
  id: string,
  newStatus: IncidentStatus,
  userId: string
): Promise<void> {
  const db = getDbOrThrow();
  
  // Get current incident
  const incident = await getIncident(id);
  if (!incident) throw new Error('Incident not found');
  
  const oldStatus = incident.status;
  
  // Update status
  await updateDoc(doc(db, INCIDENTS_COLLECTION, id), {
    status: newStatus,
    updatedAt: Timestamp.fromDate(new Date()),
  });
  
  // Log status change
  await logIncidentChange(id, userId, 'Status changed', 'status', oldStatus, newStatus);
  
  // Auto-generate tasks based on new status
  await generateAutoTasks(id, newStatus, userId);
}

/**
 * Update incident field (generic)
 */
export async function updateIncidentField<K extends keyof Incident>(
  id: string,
  fieldName: K,
  value: Incident[K],
  userId: string
): Promise<void> {
  console.log('🔥 Firestore: Updating field', fieldName, 'for incident', id);
  const db = getDbOrThrow();
  
  // Get current value for audit log
  const incident = await getIncident(id);
  if (!incident) throw new Error('Incident not found');
  
  const oldValue = incident[fieldName];
  const oldValueStr = oldValue ? String(oldValue).substring(0, 50) + '...' : 'empty';
  const newValueStr = value ? String(value).substring(0, 50) + '...' : 'empty';
  
  console.log('📝 Old value:', oldValueStr);
  console.log('📝 New value:', newValueStr);
  
  // Update field
  await updateDoc(doc(db, INCIDENTS_COLLECTION, id), {
    [fieldName]: value,
    updatedAt: Timestamp.fromDate(new Date()),
  });
  
  console.log('✅ Firestore: Field updated successfully');
  
  // Friendly field names for audit log
  const fieldDisplayNames: Record<string, string> = {
    rootCause: 'Root Cause',
    technicalResolution: 'Technical Resolution',
    riskAssessment: 'Risk Assessment',
    workaroundCS: 'CS Workaround',
    legalReasoning: 'Legal Reasoning',
    communicationInternal: 'Internal Communication',
    communicationExternal: 'External Communication',
    containmentMeasures: 'Containment Measures',
    resolutionDescription: 'Resolution Description',
    preventiveMeasures: 'Preventive Measures',
    assignedTo: 'Assigned agent',
  };
  
  const displayName = fieldDisplayNames[String(fieldName)] || String(fieldName);
  
  // Log change with friendly name
  await logIncidentChange(
    id,
    userId,
    `Updated ${displayName}`,
    String(fieldName),
    oldValueStr,
    newValueStr
  );
}

/**
 * Generate automatic tasks when status changes (from templates)
 */
async function generateAutoTasks(
  incidentId: string,
  status: IncidentStatus,
  userId: string
): Promise<void> {
  const db = getDbOrThrow();
  
  // Import task templates
  const { getTaskTemplatesByPhase } = await import('./taskTemplates');
  
  // Get templates for this phase
  const templates = await getTaskTemplatesByPhase(status);
  
  if (templates.length === 0) {
    console.log(`No task templates found for phase: ${status}`);
    return;
  }
  
  // Create tasks from templates
  for (const template of templates) {
    const taskId = doc(collection(db, TASKS_COLLECTION)).id;
    const dueDate = new Date(Date.now() + template.dueDateOffset * 60 * 60 * 1000);
    
    await setDoc(doc(db, TASKS_COLLECTION, taskId), {
      id: taskId,
      incidentId,
      title: template.title,
      description: template.description,
      owner: template.defaultOwner || template.defaultOwnerRole || userId,
      dueDate: Timestamp.fromDate(dueDate),
      status: 'pending',
      priority: template.priority,
      externalLinks: template.externalLinks,
      createdAt: Timestamp.fromDate(new Date()),
    });
  }
}

/**
 * Get tasks for incident
 */
export async function getIncidentTasks(incidentId: string): Promise<IncidentTask[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, TASKS_COLLECTION),
    where('incidentId', '==', incidentId)
    // Note: orderBy removed to avoid composite index requirement
    // We'll sort client-side instead
  );
  const querySnapshot = await getDocs(q);
  
  const tasks = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    dueDate: doc.data().dueDate?.toDate(),
    completedAt: doc.data().completedAt?.toDate(),
  })) as IncidentTask[];
  
  // Sort client-side by createdAt
  return tasks.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * Mark task as completed
 */
export async function completeIncidentTask(
  taskId: string,
  userId: string
): Promise<void> {
  const db = getDbOrThrow();
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), {
    status: 'completed',
    completedAt: Timestamp.fromDate(new Date()),
  });
  
  // Get task details for audit log
  const taskDoc = await getDoc(doc(db, TASKS_COLLECTION, taskId));
  if (taskDoc.exists()) {
    const task = taskDoc.data();
    await logIncidentChange(
      task.incidentId,
      userId,
      `Task completed: ${task.title}`,
      'taskStatus',
      'pending',
      'completed'
    );
  }
}

/**
 * Reopen a completed task
 */
export async function reopenIncidentTask(
  taskId: string,
  userId: string
): Promise<void> {
  const db = getDbOrThrow();
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), {
    status: 'pending',
    completedAt: null,
  });
  
  // Get task details for audit log
  const taskDoc = await getDoc(doc(db, TASKS_COLLECTION, taskId));
  if (taskDoc.exists()) {
    const task = taskDoc.data();
    await logIncidentChange(
      task.incidentId,
      userId,
      `Task reopened: ${task.title}`,
      'taskStatus',
      'completed',
      'pending'
    );
  }
}

/**
 * Create custom task
 */
export async function createCustomTask(
  taskData: Omit<IncidentTask, 'id' | 'createdAt'>
): Promise<string> {
  const db = getDbOrThrow();
  const taskId = doc(collection(db, TASKS_COLLECTION)).id;
  
  await setDoc(doc(db, TASKS_COLLECTION, taskId), {
    ...taskData,
    id: taskId,
    createdAt: Timestamp.fromDate(new Date()),
    dueDate: taskData.dueDate ? Timestamp.fromDate(taskData.dueDate) : null,
  });
  
  return taskId;
}

/**
 * Update task details
 */
export async function updateIncidentTask(
  taskId: string,
  updates: Partial<Omit<IncidentTask, 'id' | 'incidentId' | 'createdAt'>>,
  userId: string
): Promise<void> {
  const db = getDbOrThrow();
  
  // Get current task for audit log
  const taskDoc = await getDoc(doc(db, TASKS_COLLECTION, taskId));
  if (!taskDoc.exists()) throw new Error('Task not found');
  
  const currentTask = taskDoc.data();
  
  // Prepare update data
  const updateData: any = { ...updates };
  if (updates.dueDate) {
    updateData.dueDate = Timestamp.fromDate(updates.dueDate);
  }
  
  // Update task
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), updateData);
  
  // Log changes in audit trail
  const changedFields = Object.keys(updates);
  for (const field of changedFields) {
    const oldValue = (currentTask as any)[field];
    const newValue = (updates as any)[field];
    
    // Skip unchanged values
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
    
    await logIncidentChange(
      currentTask.incidentId,
      userId,
      `Updated task "${currentTask.title}": ${field}`,
      `task.${field}`,
      oldValue ? JSON.stringify(oldValue).substring(0, 100) : '(empty)',
      newValue ? JSON.stringify(newValue).substring(0, 100) : '(empty)'
    );
  }
}

/**
 * Log incident change to audit trail
 */
export async function logIncidentChange(
  incidentId: string,
  userId: string,
  action: string,
  fieldChanged?: string,
  oldValue?: string,
  newValue?: string
): Promise<void> {
  const db = getDbOrThrow();
  const logId = doc(collection(db, AUDIT_LOG_COLLECTION)).id;
  
  await setDoc(doc(db, AUDIT_LOG_COLLECTION, logId), {
    id: logId,
    incidentId,
    timestamp: Timestamp.fromDate(new Date()),
    userId,
    userEmail: userId, // Assuming userId is email for now
    action,
    fieldChanged,
    oldValue,
    newValue,
  });
}

/**
 * Get audit log for incident
 */
export async function getIncidentAuditLog(incidentId: string): Promise<IncidentAuditLog[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, AUDIT_LOG_COLLECTION),
    where('incidentId', '==', incidentId)
    // Note: orderBy removed to avoid composite index requirement
    // We'll sort client-side instead
  );
  const querySnapshot = await getDocs(q);
  
  const logs = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp?.toDate() || new Date(),
  })) as IncidentAuditLog[];
  
  // Sort client-side by timestamp (descending - newest first)
  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
