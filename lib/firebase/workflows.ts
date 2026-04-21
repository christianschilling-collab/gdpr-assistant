/**
 * Firestore CRUD operations for GDPR Case Workflows
 */

import {
  collection,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { getDb } from './config';
import { CaseWorkflow, WorkflowStepInstance, ProcessStep } from '../types';
import { getTemplate } from './templates';

const WORKFLOWS_COLLECTION = 'workflows';

function getDbOrThrow() {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase is not configured. Please set up Firebase in .env.local');
  }
  return db;
}

/**
 * Convert Firestore document to CaseWorkflow
 */
function docToWorkflow(data: DocumentData): CaseWorkflow {
  return {
    caseId: data.caseId,
    templateId: data.templateId,
    steps: data.steps?.map((step: DocumentData) => docToStepInstance(step)) || [],
    currentStepIndex: data.currentStepIndex || 0,
    startedAt: data.startedAt?.toDate() || new Date(),
    expectedCompletionDate: data.expectedCompletionDate?.toDate(),
  };
}

/**
 * Convert Firestore step to WorkflowStepInstance
 */
function docToStepInstance(data: DocumentData): WorkflowStepInstance {
  return {
    stepOrder: data.stepOrder,
    stepDefinition: data.stepDefinition,
    status: data.status || 'pending',
    startedAt: data.startedAt?.toDate(),
    completedAt: data.completedAt?.toDate(),
    completedBy: data.completedBy,
    emailDraft: data.emailDraft,
    notes: data.notes,
    attachments: data.attachments || [],
    skipReason: data.skipReason,
  };
}

/**
 * Convert WorkflowStepInstance to Firestore format
 */
function stepInstanceToDoc(step: WorkflowStepInstance): DocumentData {
  return {
    stepOrder: step.stepOrder,
    stepDefinition: step.stepDefinition,
    status: step.status,
    startedAt: step.startedAt ? Timestamp.fromDate(step.startedAt) : null,
    completedAt: step.completedAt ? Timestamp.fromDate(step.completedAt) : null,
    completedBy: step.completedBy || null,
    emailDraft: step.emailDraft || null,
    notes: step.notes || null,
    attachments: step.attachments || [],
    skipReason: step.skipReason || null,
  };
}

/**
 * Initialize a workflow for a case based on a template
 * Supports both Firestore templates and standard workflow templates
 */
export async function initializeWorkflow(
  caseId: string,
  templateId: string
): Promise<CaseWorkflow> {
  const db = getDbOrThrow();
  
  let processSteps: ProcessStep[] | null = null;
  
  // Try to load from standard workflows first
  const { getWorkflowTemplate } = await import('../workflows/standardWorkflows');
  processSteps = getWorkflowTemplate(templateId);
  
  // If not found in standard workflows, try Firestore template
  if (!processSteps) {
    const template = await getTemplate(templateId);
    if (template && template.processSteps) {
      processSteps = template.processSteps;
    }
  }
  
  if (!processSteps || processSteps.length === 0) {
    throw new Error('Template not found or has no process steps');
  }

  // Create workflow step instances from template steps
  const steps: WorkflowStepInstance[] = processSteps.map((step, index) => ({
    stepOrder: step.order || index,
    stepDefinition: step,
    status: index === 0 ? 'in_progress' : 'pending', // First step starts as in_progress
    startedAt: index === 0 ? new Date() : undefined,
    completedAt: undefined,
    completedBy: undefined,
    emailDraft: undefined,
    notes: undefined,
    attachments: [],
  }));

  const workflow: CaseWorkflow = {
    caseId,
    templateId,
    steps,
    currentStepIndex: 0,
    startedAt: new Date(),
  };

  // Save to Firestore
  const workflowRef = doc(db, WORKFLOWS_COLLECTION, caseId);
  await setDoc(workflowRef, {
    caseId: workflow.caseId,
    templateId: workflow.templateId,
    steps: workflow.steps.map(stepInstanceToDoc),
    currentStepIndex: workflow.currentStepIndex,
    startedAt: Timestamp.fromDate(workflow.startedAt),
    expectedCompletionDate: workflow.expectedCompletionDate
      ? Timestamp.fromDate(workflow.expectedCompletionDate)
      : null,
  });

  return workflow;
}

/**
 * Get workflow for a case
 */
export async function getWorkflow(caseId: string): Promise<CaseWorkflow | null> {
  const db = getDbOrThrow();
  const workflowRef = doc(db, WORKFLOWS_COLLECTION, caseId);
  const workflowSnap = await getDoc(workflowRef);

  if (!workflowSnap.exists()) {
    return null;
  }

  return docToWorkflow(workflowSnap.data());
}

/**
 * Update step status and related fields
 */
export async function updateStepStatus(
  caseId: string,
  stepOrder: number,
  status: 'pending' | 'in_progress' | 'completed' | 'skipped',
  completedBy?: string,
  notes?: string,
  emailDraft?: string
): Promise<void> {
  const db = getDbOrThrow();
  const workflow = await getWorkflow(caseId);
  
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  // Find and update the step
  const stepIndex = workflow.steps.findIndex(s => s.stepOrder === stepOrder);
  if (stepIndex === -1) {
    throw new Error(`Step with order ${stepOrder} not found`);
  }

  const updatedStep = { ...workflow.steps[stepIndex] };
  updatedStep.status = status;
  
  if (status === 'in_progress' && !updatedStep.startedAt) {
    updatedStep.startedAt = new Date();
  }
  
  if (status === 'completed') {
    updatedStep.completedAt = new Date();
    updatedStep.completedBy = completedBy;
  }
  
  if (notes) {
    updatedStep.notes = notes;
  }
  
  if (emailDraft) {
    updatedStep.emailDraft = emailDraft;
  }

  workflow.steps[stepIndex] = updatedStep;

  // Auto-advance to next step if current step is completed
  if (status === 'completed' && workflow.currentStepIndex === stepIndex) {
    const nextIncompleteIndex = workflow.steps.findIndex(
      (s, idx) => idx > stepIndex && s.status !== 'completed' && s.status !== 'skipped'
    );
    
    if (nextIncompleteIndex !== -1) {
      workflow.currentStepIndex = nextIncompleteIndex;
      workflow.steps[nextIncompleteIndex].status = 'in_progress';
      workflow.steps[nextIncompleteIndex].startedAt = new Date();
    }
  }

  // Save to Firestore
  const workflowRef = doc(db, WORKFLOWS_COLLECTION, caseId);
  await updateDoc(workflowRef, {
    steps: workflow.steps.map(stepInstanceToDoc),
    currentStepIndex: workflow.currentStepIndex,
  });
}

/**
 * Skip a step with a reason
 */
export async function skipStep(
  caseId: string,
  stepOrder: number,
  reason: string
): Promise<void> {
  const db = getDbOrThrow();
  const workflow = await getWorkflow(caseId);
  
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  const stepIndex = workflow.steps.findIndex(s => s.stepOrder === stepOrder);
  if (stepIndex === -1) {
    throw new Error(`Step with order ${stepOrder} not found`);
  }

  workflow.steps[stepIndex].status = 'skipped';
  workflow.steps[stepIndex].skipReason = reason;
  workflow.steps[stepIndex].completedAt = new Date();

  // Auto-advance to next step if this was the current step
  if (workflow.currentStepIndex === stepIndex) {
    const nextIncompleteIndex = workflow.steps.findIndex(
      (s, idx) => idx > stepIndex && s.status !== 'completed' && s.status !== 'skipped'
    );
    
    if (nextIncompleteIndex !== -1) {
      workflow.currentStepIndex = nextIncompleteIndex;
      workflow.steps[nextIncompleteIndex].status = 'in_progress';
      workflow.steps[nextIncompleteIndex].startedAt = new Date();
    }
  }

  const workflowRef = doc(db, WORKFLOWS_COLLECTION, caseId);
  await updateDoc(workflowRef, {
    steps: workflow.steps.map(stepInstanceToDoc),
    currentStepIndex: workflow.currentStepIndex,
  });
}

/**
 * Add a dynamic step to the workflow (for hybrid model)
 */
export async function addDynamicStep(
  caseId: string,
  step: ProcessStep,
  insertAfterOrder?: number
): Promise<void> {
  const db = getDbOrThrow();
  const workflow = await getWorkflow(caseId);
  
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  // Determine where to insert the step
  let insertIndex = workflow.steps.length;
  if (insertAfterOrder !== undefined) {
    insertIndex = workflow.steps.findIndex(s => s.stepOrder === insertAfterOrder) + 1;
  }

  // Create new step instance
  const newStep: WorkflowStepInstance = {
    stepOrder: step.order,
    stepDefinition: step,
    status: 'pending',
    startedAt: undefined,
    completedAt: undefined,
    completedBy: undefined,
    emailDraft: undefined,
    notes: undefined,
    attachments: [],
  };

  // Insert the step
  workflow.steps.splice(insertIndex, 0, newStep);

  // Renumber steps
  workflow.steps.forEach((s, idx) => {
    s.stepOrder = idx;
    s.stepDefinition.order = idx;
  });

  const workflowRef = doc(db, WORKFLOWS_COLLECTION, caseId);
  await updateDoc(workflowRef, {
    steps: workflow.steps.map(stepInstanceToDoc),
  });
}

/**
 * Get workflow history (completed/skipped steps)
 */
export async function getWorkflowHistory(caseId: string): Promise<WorkflowStepInstance[]> {
  const workflow = await getWorkflow(caseId);
  
  if (!workflow) {
    return [];
  }

  return workflow.steps.filter(
    s => s.status === 'completed' || s.status === 'skipped'
  );
}

/**
 * Update email draft for a step
 */
export async function updateEmailDraft(
  caseId: string,
  stepOrder: number,
  emailDraft: string
): Promise<void> {
  const db = getDbOrThrow();
  const workflow = await getWorkflow(caseId);
  
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  const stepIndex = workflow.steps.findIndex(s => s.stepOrder === stepOrder);
  if (stepIndex === -1) {
    throw new Error(`Step with order ${stepOrder} not found`);
  }

  workflow.steps[stepIndex].emailDraft = emailDraft;

  const workflowRef = doc(db, WORKFLOWS_COLLECTION, caseId);
  await updateDoc(workflowRef, {
    steps: workflow.steps.map(stepInstanceToDoc),
  });
}

/**
 * Get current step
 */
export async function getCurrentStep(caseId: string): Promise<WorkflowStepInstance | null> {
  const workflow = await getWorkflow(caseId);
  
  if (!workflow) {
    return null;
  }

  return workflow.steps[workflow.currentStepIndex] || null;
}
