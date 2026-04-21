import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getDb } from './config';
import { TaskTemplate, TaskTemplateFormData } from '../types/taskTemplates';
import { IncidentStatus } from '../types';

const TASK_TEMPLATES_COLLECTION = 'incidentTaskTemplates';

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured');
  }
  return db;
}

/**
 * Get all task templates for a specific phase
 */
export async function getTaskTemplatesByPhase(phase: IncidentStatus): Promise<TaskTemplate[]> {
  const db = getDbOrThrow();
  const q = query(
    collection(db, TASK_TEMPLATES_COLLECTION),
    where('phase', '==', phase)
    // Note: orderBy removed to avoid composite index requirement
  );
  
  const snapshot = await getDocs(q);
  const templates = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as TaskTemplate[];
  
  // Sort client-side by order
  return templates.sort((a, b) => a.order - b.order);
}

/**
 * Get all task templates
 */
export async function getAllTaskTemplates(): Promise<TaskTemplate[]> {
  const db = getDbOrThrow();
  const snapshot = await getDocs(collection(db, TASK_TEMPLATES_COLLECTION));
  
  const templates = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as TaskTemplate[];
  
  // Sort client-side by phase then order
  return templates.sort((a, b) => {
    if (a.phase === b.phase) {
      return a.order - b.order;
    }
    return a.phase.localeCompare(b.phase);
  });
}

/**
 * Get single task template
 */
export async function getTaskTemplate(id: string): Promise<TaskTemplate | null> {
  const db = getDbOrThrow();
  const docRef = doc(db, TASK_TEMPLATES_COLLECTION, id);
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
  } as TaskTemplate;
}

/**
 * Create task template
 */
export async function createTaskTemplate(
  templateData: TaskTemplateFormData
): Promise<string> {
  const db = getDbOrThrow();
  const templateId = doc(collection(db, TASK_TEMPLATES_COLLECTION)).id;
  
  const now = new Date();
  const template: Omit<TaskTemplate, 'id'> = {
    ...templateData,
    createdAt: now,
    updatedAt: now,
  };
  
  await setDoc(doc(db, TASK_TEMPLATES_COLLECTION, templateId), {
    ...template,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  
  return templateId;
}

/**
 * Update task template
 */
export async function updateTaskTemplate(
  id: string,
  updates: Partial<TaskTemplateFormData>
): Promise<void> {
  const db = getDbOrThrow();
  
  await updateDoc(doc(db, TASK_TEMPLATES_COLLECTION, id), {
    ...updates,
    updatedAt: Timestamp.fromDate(new Date()),
  });
}

/**
 * Delete task template
 */
export async function deleteTaskTemplate(id: string): Promise<void> {
  const db = getDbOrThrow();
  await deleteDoc(doc(db, TASK_TEMPLATES_COLLECTION, id));
}

/**
 * Initialize default task templates (run once)
 */
export async function initializeDefaultTaskTemplates(): Promise<void> {
  console.log('🔧 Starting initialization of default task templates...');
  
  const defaultTemplates: TaskTemplateFormData[] = [
    // Reporting Phase
    {
      phase: 'Reporting',
      title: 'Assess impact and gather initial information',
      description: 'Collect all relevant information about the data breach',
      dueDateOffset: 6, // 6 hours
      priority: 'High',
      defaultOwnerRole: 'Data Protection Officer',
      externalLinks: [
        { label: 'Initial Assessment Checklist', url: 'https://confluence.hellofresh.io/display/GDPR/Initial+Assessment' },
      ],
      order: 1,
      isRequired: true,
    },
    {
      phase: 'Reporting',
      title: 'Determine if DPA notification required',
      description: 'Evaluate if breach meets Art. 33 GDPR notification threshold',
      dueDateOffset: 24, // 24 hours
      priority: 'High',
      defaultOwnerRole: 'Legal',
      externalLinks: [
        { label: 'Art. 33 Decision Tree', url: 'https://confluence.hellofresh.io/display/GDPR/Art33+Decision' },
      ],
      order: 2,
      isRequired: true,
    },
    
    // Investigation Phase
    {
      phase: 'Investigation',
      title: 'Document root cause analysis',
      description: 'Identify and document the underlying cause of the incident',
      dueDateOffset: 48, // 2 days
      priority: 'High',
      defaultOwnerRole: 'Tech Lead',
      externalLinks: [
        { label: 'Root Cause Analysis Template', url: 'https://confluence.hellofresh.io/display/GDPR/RCA+Template' },
      ],
      order: 1,
      isRequired: true,
    },
    {
      phase: 'Investigation',
      title: 'Identify affected data categories',
      description: 'Determine what types of personal data were affected',
      dueDateOffset: 24, // 1 day
      priority: 'High',
      defaultOwnerRole: 'Data Protection Officer',
      externalLinks: [],
      order: 2,
      isRequired: true,
    },
    {
      phase: 'Investigation',
      title: 'Develop technical resolution plan',
      description: 'Create action plan to resolve the technical issue',
      dueDateOffset: 48, // 2 days
      priority: 'Medium',
      defaultOwnerRole: 'Tech Lead',
      externalLinks: [],
      order: 3,
      isRequired: false,
    },
    {
      phase: 'Investigation',
      title: 'Conduct legal risk assessment',
      description: 'Evaluate legal implications and potential regulatory consequences',
      dueDateOffset: 48, // 2 days
      priority: 'Medium',
      defaultOwnerRole: 'Legal',
      externalLinks: [
        { label: 'Risk Assessment Guide', url: 'https://confluence.hellofresh.io/display/GDPR/Risk+Assessment' },
      ],
      order: 4,
      isRequired: false,
    },
    
    // Containment Phase
    {
      phase: 'Containment',
      title: 'Implement containment measures',
      description: 'Deploy immediate fixes to stop the breach from continuing',
      dueDateOffset: 12, // 12 hours
      priority: 'High',
      defaultOwnerRole: 'Tech Lead',
      externalLinks: [],
      order: 1,
      isRequired: true,
    },
    {
      phase: 'Containment',
      title: 'Verify containment effectiveness',
      description: 'Test and confirm that containment measures are working',
      dueDateOffset: 24, // 1 day
      priority: 'High',
      defaultOwnerRole: 'Tech Lead',
      externalLinks: [],
      order: 2,
      isRequired: true,
    },
    
    // Remediation Phase
    {
      phase: 'Remediation',
      title: 'Fill incident log and escalate',
      description: 'Document incident in official log and escalate to management',
      dueDateOffset: 24, // 1 day
      priority: 'High',
      defaultOwnerRole: 'Data Protection Officer',
      externalLinks: [
        { label: 'Incident Log Template', url: 'https://docs.google.com/spreadsheets/d/...' },
      ],
      order: 1,
      isRequired: true,
    },
    {
      phase: 'Remediation',
      title: 'Register issue in local register BNL/FR',
      description: 'Update local data breach registers for affected countries',
      dueDateOffset: 48, // 2 days
      priority: 'Medium',
      defaultOwnerRole: 'Legal',
      externalLinks: [],
      order: 2,
      isRequired: false,
    },
    
    // Closed Phase
    {
      phase: 'Closed',
      title: 'Verify complaint rate',
      description: 'Check if complaint rate has returned to normal levels',
      dueDateOffset: 720, // 30 days
      priority: 'Low',
      defaultOwnerRole: 'Customer Service Manager',
      externalLinks: [],
      order: 1,
      isRequired: false,
    },
  ];
  
  console.log(`📦 Creating ${defaultTemplates.length} templates...`);
  
  let created = 0;
  for (const template of defaultTemplates) {
    try {
      await createTaskTemplate(template);
      created++;
      console.log(`✅ Created: ${template.phase} - ${template.title}`);
    } catch (error) {
      console.error(`❌ Failed to create template: ${template.title}`, error);
      throw error; // Re-throw to stop initialization
    }
  }
  
  console.log(`✅ Successfully created ${created}/${defaultTemplates.length} templates!`);
}
