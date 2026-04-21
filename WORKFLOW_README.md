# Multi-Step Workflow System

## Overview

The GDPR Assistant now supports multi-step workflows for handling GDPR requests. This enables structured processing of cases with multiple stages, automatic email draft generation, and detailed progress tracking.

## Key Features

### 1. Workflow Automation
- **Auto-advance**: Automatically progress to the next step when current step is completed
- **Email generation**: AI-powered email draft generation using Gemini 2.0 Flash
- **SLA monitoring**: Track overdue steps and identify bottlenecks
- **Smart suggestions**: AI recommendations for next actions

### 2. Step Types
- **Email**: Automatically generate email drafts with templates
- **Manual**: Tasks requiring human action (data collection, system updates)
- **Decision**: Decision points that may skip subsequent steps
- **Wait**: Time-based delays or waiting for external input

### 3. Standard Workflows

#### Data Access Request (Datenauskunft)
6 steps: Acknowledgement → ID Check → ID Request (conditional) → Data Collection → Data Package → Close

#### Marketing Opt-Out (Werbewiderruf)
4 steps: Acknowledgement → Opt-Out Processing → Confirmation → Close

#### Data Deletion (Datenlöschung)
6 steps: Acknowledgement → ID Check → Deletion Scope → Execute Deletion → Confirmation → Close

#### Data Portability (Datenübertragbarkeit)
5 steps: Acknowledgement → ID Check → Structured Export → Send Package → Close

#### Data Correction (Datenberichtigung)
4 steps: Acknowledgement → Verify & Correct → Confirmation → Close

## Architecture

```
lib/
  workflows/
    automation.ts         # Workflow automation logic
    standardWorkflows.ts  # Pre-defined workflow templates
  firebase/
    workflows.ts         # Firestore CRUD operations
  gemini/
    emailDrafts.ts       # AI email generation
  types.ts               # Extended with workflow types

components/
  WorkflowComponents.tsx    # UI components (Timeline, CurrentStep, History)
  WorkflowStepBuilder.tsx   # Template editor for workflows

app/
  analytics/workflows/
    page.tsx             # Workflow analytics dashboard
```

## Usage

### Creating a Workflow

```typescript
import { initializeWorkflow } from '@/lib/firebase/workflows';

// Initialize workflow from template
await initializeWorkflow(caseId, templateId);
```

### Advancing Workflow

```typescript
import { updateStepStatus, autoAdvanceWorkflow } from '@/lib/firebase/workflows';

// Mark step as completed
await updateStepStatus(caseId, stepOrder, 'completed', userEmail, notes);

// Auto-advance to next step
await autoAdvanceWorkflow(caseId);
```

### Generating Email Drafts

```typescript
import { generateEmailDraft } from '@/lib/gemini/emailDrafts';

const draft = await generateEmailDraft(step, caseData);
```

### Monitoring SLA

```typescript
import { checkWorkflowSLA } from '@/lib/workflows/automation';

const { hasViolations, overdueSteps } = await checkWorkflowSLA(caseId);
```

## UI Components

### WorkflowTimeline
Visual progress indicator showing all steps with their current status.

```tsx
import { WorkflowTimeline } from '@/components/WorkflowComponents';

<WorkflowTimeline workflow={workflow} onStepClick={handleStepClick} />
```

### CurrentStepCard
Detailed view of current step with email editor and completion actions.

```tsx
import { CurrentStepCard } from '@/components/WorkflowComponents';

<CurrentStepCard
  step={currentStep}
  stepIndex={index}
  caseData={caseData}
  onComplete={handleComplete}
  onSkip={handleSkip}
/>
```

### WorkflowHistoryPanel
History of completed/skipped steps with notes and email content.

```tsx
import { WorkflowHistoryPanel } from '@/components/WorkflowComponents';

<WorkflowHistoryPanel workflow={workflow} />
```

## Analytics

Visit `/analytics/workflows` to view:
- Total workflows and completion rates
- Average completion time
- Step performance analysis
- Stuck points (overdue steps)
- SLA violations

## Backwards Compatibility

Old cases without workflows continue to work with the existing process steps UI. New cases can opt-in to workflows by initializing a workflow from a template.

Check if case has workflow:
```typescript
import { hasWorkflow } from '@/lib/firebase/cases';

if (hasWorkflow(caseData)) {
  // Show workflow UI
} else {
  // Show legacy process steps
}
```

## Email Templates

Email drafts are market-specific (DE/AT/CH) with appropriate greetings and closings:

- **DE**: "Sehr geehrte Damen und Herren", "Mit freundlichen Grüßen"
- **AT**: "Sehr geehrte Damen und Herren", "Mit freundlichen Grüßen"
- **CH**: "Sehr geehrte Damen und Herren", "Freundliche Grüsse"

Placeholders: `{{CASE_ID}}`, `{{CUSTOMER_NAME}}`, `{{MARKET}}`

## SLA Thresholds

- **Email steps**: 1 day
- **Manual steps**: 3 days
- **Decision steps**: 1 day
- **Wait steps**: 7 days

## Testing

Run tests:
```bash
npm test __tests__/workflows/
```

Test files:
- `__tests__/workflows/automation.test.ts` - Workflow automation logic tests

## Future Enhancements

- [ ] Workflow templates marketplace (pre-built workflows)
- [ ] Conditional branching based on case data
- [ ] Parallel steps execution
- [ ] Integration with external systems (Jira, Slack notifications)
- [ ] Workflow version control
- [ ] A/B testing different workflows
- [ ] Machine learning for step duration prediction

## Migration Guide

### For Existing Templates

1. Open template in `/templates/[id]/edit`
2. Use Workflow Step Builder to convert process steps to workflow steps
3. Define step types (email, manual, decision, wait)
4. Add email templates for email steps
5. Save template

### For New Cases

Workflows are automatically initialized when:
- Template has workflow steps defined
- Case is created with a workflow-enabled template

## Troubleshooting

### Email generation fails
- Check Gemini API key in `.env.local`
- Verify template has `emailTemplate` defined
- Check case data has required fields (market, caseId)

### Workflow not advancing
- Ensure current step is marked as 'completed'
- Check if step has dependencies (`dependsOn`)
- Verify next step exists and is not already completed

### SLA violations not showing
- Confirm step has `startedAt` timestamp
- Check if step status is 'in_progress'
- Verify SLA thresholds are met

## Support

For questions or issues, contact the development team or check the Confluence documentation.
