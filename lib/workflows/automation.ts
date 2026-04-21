/**
 * Workflow Automation Logic
 * Auto-advance workflows, check SLAs, suggest next actions
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GDPRCase, CaseWorkflow, WorkflowStepInstance } from '../types';
import { getWorkflow, updateStepStatus, getCurrentStep } from '../firebase/workflows';
import { getCase } from '../firebase/cases';
import { generateEmailDraft } from '../gemini/emailDrafts';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

/**
 * Auto-advance workflow to next step after current step is completed
 * Automatically generates email drafts for email-type steps
 */
export async function autoAdvanceWorkflow(caseId: string): Promise<{
  advanced: boolean;
  newStepIndex?: number;
  emailDraftGenerated?: boolean;
}> {
  const workflow = await getWorkflow(caseId);
  const caseData = await getCase(caseId);
  
  if (!workflow || !caseData) {
    return { advanced: false };
  }

  const currentStep = workflow.steps[workflow.currentStepIndex];
  
  // Only advance if current step is completed or skipped
  if (currentStep.status !== 'completed' && currentStep.status !== 'skipped') {
    return { advanced: false };
  }

  // Find next incomplete step
  const nextStepIndex = workflow.steps.findIndex(
    (step, idx) => 
      idx > workflow.currentStepIndex && 
      step.status !== 'completed' && 
      step.status !== 'skipped'
  );

  if (nextStepIndex === -1) {
    // No more steps - workflow complete
    return { advanced: false };
  }

  const nextStep = workflow.steps[nextStepIndex];
  
  // Set next step to in_progress
  await updateStepStatus(caseId, nextStep.stepOrder, 'in_progress');

  // Auto-generate email draft if it's an email step
  let emailDraftGenerated = false;
  if (nextStep.stepDefinition.stepType === 'email' && nextStep.stepDefinition.emailTemplate) {
    try {
      const emailDraft = await generateEmailDraft(nextStep.stepDefinition, caseData);
      await updateStepStatus(caseId, nextStep.stepOrder, 'in_progress', undefined, undefined, emailDraft);
      emailDraftGenerated = true;
    } catch (error) {
      console.error('Failed to generate email draft:', error);
      // Continue anyway - agent can manually create draft
    }
  }

  return {
    advanced: true,
    newStepIndex: nextStepIndex,
    emailDraftGenerated,
  };
}

/**
 * Check if workflow steps are overdue (SLA violation)
 * Returns steps that are taking longer than expected
 */
export async function checkWorkflowSLA(caseId: string): Promise<{
  hasViolations: boolean;
  overdueSteps: Array<{
    stepOrder: number;
    stepTitle: string;
    daysOverdue: number;
    startedAt: Date;
  }>;
}> {
  const workflow = await getWorkflow(caseId);
  
  if (!workflow) {
    return { hasViolations: false, overdueSteps: [] };
  }

  const now = new Date();
  const overdueSteps: Array<{
    stepOrder: number;
    stepTitle: string;
    daysOverdue: number;
    startedAt: Date;
  }> = [];

  // Define SLA thresholds (in days) per step type
  const SLA_THRESHOLDS: Record<string, number> = {
    email: 1,      // Email steps should complete within 1 day
    manual: 3,     // Manual steps: 3 days
    decision: 1,   // Decision steps: 1 day
    wait: 7,       // Wait steps: 7 days
  };

  workflow.steps.forEach((step) => {
    if (step.status === 'in_progress' && step.startedAt) {
      const stepType = step.stepDefinition.stepType || 'manual';
      const slaThreshold = SLA_THRESHOLDS[stepType] || 3;
      
      const daysSinceStart = (now.getTime() - step.startedAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceStart > slaThreshold) {
        overdueSteps.push({
          stepOrder: step.stepOrder,
          stepTitle: step.stepDefinition.title,
          daysOverdue: Math.floor(daysSinceStart - slaThreshold),
          startedAt: step.startedAt,
        });
      }
    }
  });

  return {
    hasViolations: overdueSteps.length > 0,
    overdueSteps,
  };
}

/**
 * AI-based suggestion for next action
 * Analyzes case details and workflow status to suggest what agent should do next
 */
export async function suggestNextAction(caseId: string): Promise<string> {
  const workflow = await getWorkflow(caseId);
  const caseData = await getCase(caseId);
  
  if (!workflow || !caseData) {
    return 'No workflow or case data found.';
  }

  const currentStep = workflow.steps[workflow.currentStepIndex];
  const completedSteps = workflow.steps.filter(s => s.status === 'completed').length;
  const totalSteps = workflow.steps.length;

  // Check for SLA violations
  const slaCheck = await checkWorkflowSLA(caseId);
  
  const prompt = `You are a GDPR workflow assistant. Analyze this case and suggest the best next action.

Case Details:
- Case ID: ${caseData.caseId}
- Category: ${caseData.primaryCategory}
- Urgency: ${caseData.urgency}
- Market: ${caseData.market}
- Status: ${caseData.status}
- Description: ${caseData.caseDescription.substring(0, 300)}

Workflow Progress:
- Completed: ${completedSteps}/${totalSteps} steps
- Current Step: ${currentStep.stepDefinition.title}
- Step Type: ${currentStep.stepDefinition.stepType || 'manual'}
- Step Status: ${currentStep.status}
- Started: ${currentStep.startedAt ? new Date(currentStep.startedAt).toISOString() : 'Not started'}

${slaCheck.hasViolations ? `⚠️ SLA VIOLATIONS:
${slaCheck.overdueSteps.map(s => `- ${s.stepTitle}: ${s.daysOverdue} days overdue`).join('\n')}` : ''}

Recent Step History:
${workflow.steps
  .filter(s => s.status === 'completed' || s.status === 'skipped')
  .slice(-3)
  .map(s => `- ${s.stepDefinition.title}: ${s.status} ${s.notes ? `(Notes: ${s.notes})` : ''}`)
  .join('\n')}

Instructions:
1. Consider the current step status and type
2. Factor in urgency level (${caseData.urgency})
3. Consider any SLA violations
4. Provide ONE clear, actionable recommendation
5. Be specific (e.g., "Generate and send ID verification email" not just "Continue workflow")

Respond in 1-2 sentences with a clear action item.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Determine if a step can be automatically skipped based on conditions
 */
export async function checkSkipConditions(
  caseId: string,
  stepOrder: number
): Promise<{
  shouldSkip: boolean;
  reason?: string;
}> {
  const workflow = await getWorkflow(caseId);
  const caseData = await getCase(caseId);
  
  if (!workflow || !caseData) {
    return { shouldSkip: false };
  }

  const step = workflow.steps.find(s => s.stepOrder === stepOrder);
  if (!step || !step.stepDefinition.skipConditions) {
    return { shouldSkip: false };
  }

  // Evaluate skip conditions
  for (const condition of step.stepDefinition.skipConditions) {
    // Simple condition evaluation (can be expanded)
    if (condition.includes('identity_verified') && caseData.customerNumber) {
      return {
        shouldSkip: true,
        reason: 'Customer identity already verified via customer number',
      };
    }
    
    if (condition.includes('no_data_found')) {
      // Check if previous steps indicate no data
      const prevSteps = workflow.steps.filter(s => s.stepOrder < stepOrder);
      const noDataIndicator = prevSteps.some(s => 
        s.notes?.toLowerCase().includes('no data') || 
        s.notes?.toLowerCase().includes('keine daten')
      );
      
      if (noDataIndicator) {
        return {
          shouldSkip: true,
          reason: 'No data found - data package step not applicable',
        };
      }
    }
  }

  return { shouldSkip: false };
}

/**
 * Calculate estimated completion date based on remaining steps
 */
export async function calculateExpectedCompletion(caseId: string): Promise<Date | null> {
  const workflow = await getWorkflow(caseId);
  
  if (!workflow) {
    return null;
  }

  const now = new Date();
  let totalDaysRemaining = 0;

  // Estimate days per step type
  const AVERAGE_DAYS: Record<string, number> = {
    email: 0.5,    // Email steps: half a day
    manual: 1.5,   // Manual steps: 1.5 days
    decision: 0.5, // Decision steps: half a day
    wait: 3,       // Wait steps: 3 days
  };

  workflow.steps.forEach((step) => {
    if (step.status === 'pending' || step.status === 'in_progress') {
      const stepType = step.stepDefinition.stepType || 'manual';
      totalDaysRemaining += AVERAGE_DAYS[stepType] || 1.5;
    }
  });

  const completionDate = new Date(now);
  completionDate.setDate(completionDate.getDate() + Math.ceil(totalDaysRemaining));
  
  return completionDate;
}

/**
 * Get workflow progress summary
 */
export async function getWorkflowProgress(caseId: string): Promise<{
  totalSteps: number;
  completedSteps: number;
  currentStep: number;
  percentComplete: number;
  estimatedCompletion: Date | null;
  hasOverdueSteps: boolean;
}> {
  const workflow = await getWorkflow(caseId);
  
  if (!workflow) {
    return {
      totalSteps: 0,
      completedSteps: 0,
      currentStep: 0,
      percentComplete: 0,
      estimatedCompletion: null,
      hasOverdueSteps: false,
    };
  }

  const completedSteps = workflow.steps.filter(
    s => s.status === 'completed' || s.status === 'skipped'
  ).length;
  
  const slaCheck = await checkWorkflowSLA(caseId);
  const estimatedCompletion = await calculateExpectedCompletion(caseId);

  return {
    totalSteps: workflow.steps.length,
    completedSteps,
    currentStep: workflow.currentStepIndex,
    percentComplete: Math.round((completedSteps / workflow.steps.length) * 100),
    estimatedCompletion,
    hasOverdueSteps: slaCheck.hasViolations,
  };
}

/**
 * Check if workflow is complete
 */
export async function isWorkflowComplete(caseId: string): Promise<boolean> {
  const workflow = await getWorkflow(caseId);
  
  if (!workflow) {
    return false;
  }

  return workflow.steps.every(
    step => step.status === 'completed' || step.status === 'skipped'
  );
}

/**
 * Get next required action for agent
 */
export async function getNextRequiredAction(caseId: string): Promise<{
  action: 'generate_email' | 'review_draft' | 'complete_manual_task' | 'make_decision' | 'wait' | 'none';
  stepTitle: string;
  stepOrder: number;
  details?: string;
} | null> {
  const workflow = await getWorkflow(caseId);
  
  if (!workflow) {
    return null;
  }

  const currentStep = workflow.steps[workflow.currentStepIndex];
  
  if (!currentStep || currentStep.status === 'completed' || currentStep.status === 'skipped') {
    return null;
  }

  const stepType = currentStep.stepDefinition.stepType || 'manual';
  
  let action: 'generate_email' | 'review_draft' | 'complete_manual_task' | 'make_decision' | 'wait' | 'none' = 'none';
  let details = '';

  switch (stepType) {
    case 'email':
      if (!currentStep.emailDraft) {
        action = 'generate_email';
        details = 'Generate email draft for this step';
      } else {
        action = 'review_draft';
        details = 'Review and send the email draft';
      }
      break;
    case 'manual':
      action = 'complete_manual_task';
      details = currentStep.stepDefinition.description;
      break;
    case 'decision':
      action = 'make_decision';
      details = 'Make a decision to proceed or skip to next step';
      break;
    case 'wait':
      action = 'wait';
      details = 'Waiting for external input or time-based condition';
      break;
  }

  return {
    action,
    stepTitle: currentStep.stepDefinition.title,
    stepOrder: currentStep.stepOrder,
    details,
  };
}
