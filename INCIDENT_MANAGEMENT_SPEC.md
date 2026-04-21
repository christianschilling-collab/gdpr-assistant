# Incident Management - Feature Specification

## Overview

The Incident Management system provides comprehensive tracking and documentation of data breach incidents in compliance with GDPR Article 33 and Article 34 requirements. It ensures systematic handling of personal data breaches from discovery through resolution and regulatory notification.

## Purpose

- **GDPR Art. 33 Compliance**: Track 72-hour notification window to supervisory authorities
- **Risk Assessment**: Structured evaluation of breach severity and required actions
- **Notification Tracking**: Document DPA notifications and affected individual communications
- **Audit & Documentation**: Complete incident lifecycle for regulatory reporting and internal review

## Key Features

### 1. Incident Creation (`/incidents/new`)

**Multi-Step Wizard:**

#### Step 1: Executive Summary
- **Nature of Incident**: Brief description of the breach
- **Discovery Date**: When the breach was identified (triggers 72h clock)
- **Affected Systems**: Multi-select checkboxes
  - Customer Database
  - Order Management
  - Payment Processing
  - Email Systems
  - Cloud Storage
  - Internal Tools
  - Third-Party Services
  - Other (with text field)
- **Data Categories Affected**: Multi-select checkboxes
  - Contact Data (name, email, address, phone)
  - Financial Data (payment, IBAN, credit card)
  - Authentication Data (passwords, tokens)
  - Health / Dietary Data
  - Order & Delivery Data
  - Behavioral / Usage Data
  - Special Category Data (Art. 9 GDPR)

#### Step 2: Impact Analysis
- **Affected Individuals**: Number of data subjects impacted
- **Breach Types**: Multi-select checkboxes for types of breach
  - Loss of Availability
  - Loss of Confidentiality
  - Loss of Integrity
- **Data Categories**: Types of personal data involved
  - Names, addresses, contact details
  - Financial data (credit cards, bank accounts)
  - Health information
  - Biometric data
  - Location data
  - Authentication credentials
  - Behavioral data
  - Special category data (race, religion, etc.)
- **Breach Period**: Start and end dates of exposure
- **Markets Affected**: Multi-select for jurisdictions

#### Step 3: Risk Assessment
- **Severity Level**: Critical, High, Medium, Low
- **DPA Notification Required?**: Yes/No with reasoning
- **DPA Reference Number**: Optional field (can be filled later if notification required)
- **Legal Reasoning**: Basis for notification decisions (Art. 33 GDPR considerations)
- **Helper Link**: "Art. 33 Decision Tree" for guidance on notification requirements

#### Step 4: Review & Submit
- Summary of all entered information
- Confirmation before incident creation

**Auto-Generated:**
- **Incident ID**: Format `INC-YYYY-####` (e.g., INC-2026-8142)
- **Created Date**: Timestamp
- **Status**: Defaults to "Reporting"
- **72-Hour Deadline**: Auto-calculated from discovery date

### 2. Incident Detail View (`/incidents/[id]`)

**Status Workflow:**
```
Reporting → Investigation → Containment → Resolution → Post-Incident Review → Closed
```

**Workflow Confirmation Dialogs:**
When moving between stages, users see confirmation dialog with:
- Current stage and target stage
- **Special for Reporting → Investigation**: Warning about Art. 33 GDPR 72-hour notification window with:
  - Discovery date
  - Time elapsed since discovery
  - Reminder about DPA notification tracking

**Key Sections:**

#### A. Workflow Progress Bar
- Visual timeline showing current stage
- Blue progress bar (not red) for completed/active stages
- "Move to [Next Stage]" button with confirmation dialog

#### B. Executive Summary (Always Visible)
- Nature of incident
- Affected systems (as tags)
- Discovery date
- Impact period
- Total individuals impacted

#### C. Investigation Details (Unlocked in Investigation Stage)
**Editable Fields:**
- **Root Cause**: Technical explanation of how breach occurred
- **Risk Assessment**: Detailed impact analysis
- **Technical Resolution**: How the vulnerability was addressed

#### D. Containment Measures (Unlocked in Containment Stage)
**Editable Fields:**
- **Containment Measures**: Actions taken to limit breach scope
- **Workaround for CS**: Customer-facing explanation/guidance

#### E. Resolution Details (Unlocked in Resolution Stage)
**Editable Fields:**
- **Resolution Description**: Final technical fix
- **Preventive Measures**: Steps to prevent recurrence
- **Legal Reasoning**: Final compliance assessment

#### F. Notifications Tracking
- **DPA Notification**:
  - Checkbox: "Authority Notified"
  - Date/time of notification
  - Reference number
  - Upload confirmation
- **Individual Notifications**:
  - Checkbox: "Individuals Notified"
  - Date/time of notification
  - Communication method
  - Number notified

#### G. Tasks (Auto-Generated)
Based on current stage, tasks are auto-created:
- **Reporting**: "Document initial findings", "Assess notification requirements"
- **Investigation**: "Determine root cause", "Assess full scope"
- **Containment**: "Implement containment measures", "Verify effectiveness"
- **Resolution**: "Deploy permanent fix", "Document preventive measures"
- **Post-Incident Review**: "Conduct lessons learned", "Update incident response plan"

Tasks can be checked off as completed.

#### H. Audit Trail
Complete log of all actions:
- Status changes
- Field updates
- Task completions
- User and timestamp for each action

#### I. Export Functions
- **PDF Export**: Full incident report for DPA submission
- **CSV Export**: Data for incident log/registry

### 3. Incidents List (`/incidents`)

**Display:**
- Incident ID, status, nature of incident, affected systems
- Total impacted count
- Discovery date and time
- Urgency indicators:
  - **Red**: DPA notification overdue (>72h since discovery, not yet notified)
  - **Orange**: Approaching deadline
  - **Grey**: Normal

**Filters:**
- Status
- Severity
- Market
- Date range

**Stats:**
- Total incidents
- Active incidents (not closed)
- Overdue DPA notifications

### 4. GDPR Management Page (`/incidents`)

Combined view of Incidents + Escalations:
- **Default view**: Board (kanban-style)
- **Alternative view**: List
- **Item type filter**: All / Incidents Only / Escalations Only
- **Stats**: Total items, Active Incidents, Active Escalations, Overdue count

### 5. Trackboard Integration (`/board`)

Incidents appear on the Command Center with:
- **Red left border**: High severity visual indicator
- **Red glow**: Critical incidents (overdue notification)
- **Deadline progress bar**: 72-hour window visualization
- **Urgency sorting**: Overdue incidents at top automatically

## Data Model

```typescript
interface Incident {
  id: string;                              // Firestore document ID
  incidentId: string;                      // Display ID (INC-YYYY-####)
  
  // Executive Summary
  natureOfIncident: string;
  discoveryDate: Date;                     // Triggers 72h clock
  affectedSystems: string[];
  dataCategories: string[];                // Multi-select: Contact Data, Financial Data, etc.
  
  // Impact Analysis
  breachTypes: string[];                       // Multi-select: Loss of Availability, Confidentiality, Integrity
  totalImpacted: number;
  dataCategories: string[];
  impactPeriod: {
    start: Date;
    end?: Date;
  };
  marketsAffected: string[];
  
  // Section 3: Risk Assessment
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  riskAssessment?: string;
  dpaNotificationRequired: boolean;
  individualNotificationRequired: boolean;
  legalReasoning: string;
  
  // Investigation (editable in Investigation stage)
  rootCause?: string;
  technicalResolution?: string;
  
  // Containment (editable in Containment stage)
  containmentMeasures?: string;
  workaroundCS?: string;
  
  // Resolution (editable in Resolution stage)
  resolutionDescription?: string;
  preventiveMeasures?: string;
  
  // Notification Tracking
  authorityNotifiedAt?: Date;
  authorityNotificationRef?: string;
  individualsNotifiedAt?: Date;
  individualsNotificationMethod?: string;
  
  // Workflow
  status: 'Reporting' | 'Investigation' | 'Containment' | 
          'Resolution' | 'Post-Incident Review' | 'Closed';
  
  // Metadata
  teamMember: string;                      // Incident owner
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

interface IncidentTask {
  id: string;
  incidentId: string;
  phase: string;                           // Reporting, Investigation, etc.
  title: string;
  description: string;
  required: boolean;
  status: 'pending' | 'completed';
  completedBy?: string;
  completedAt?: Date;
}

interface IncidentAuditLog {
  id: string;
  incidentId: string;
  action: string;                          // "Status changed to X", "Field updated", etc.
  userEmail: string;
  timestamp: Date;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
}
```

## Firestore Collections

- `/incidents/{incidentId}`: Main incident documents
- `/incidentTasks/{taskId}`: Auto-generated tasks
- `/incidentTaskTemplates/{templateId}`: Task templates by phase
- `/incidentAuditLog/{logId}`: Audit trail

## Workflows

### Standard Incident Response Flow

#### 1. Discovery & Reporting (0-4 hours)
- Breach discovered by team member or reported by customer/partner
- Create incident in system within 4 hours of discovery
- Initial triage: assess severity and scope
- **Key Decision**: Is DPA notification required?

#### 2. Investigation (4-24 hours)
- Determine root cause
- Map full scope of data exposure
- Identify all affected systems and data categories
- Refine count of affected individuals
- Document findings in incident record

#### 3. Containment (24-48 hours)
- Implement measures to stop ongoing exposure
- Secure compromised systems
- Change credentials if needed
- Verify containment effectiveness
- Document all actions

#### 4. DPA Notification (Within 72 hours of discovery)
- If required, notify supervisory authority
- Include: nature of breach, data categories, approximate number of individuals, likely consequences, measures taken/proposed
- Upload confirmation to incident record
- **CRITICAL**: Must occur within 72 hours of discovery

#### 5. Individual Notification (Within 72 hours if high risk)
- If required due to high risk to individuals
- Notify affected data subjects
- Clear language describing breach and recommended actions
- Document notification in incident record

#### 6. Resolution (Days-Weeks)
- Deploy permanent technical fix
- Implement preventive measures
- Update security protocols
- Conduct security review

#### 7. Post-Incident Review (After resolution)
- Lessons learned session
- Update incident response plan
- Document improvements
- Share findings with relevant teams

#### 8. Closure
- All actions complete
- Documentation finalized
- Incident marked as closed
- Added to incident registry for annual DPA reporting

### Example: Customer Database Breach

**Day 1 (Discovery):**
- 09:00 - Security team identifies unauthorized access to customer database
- 09:30 - Incident created: INC-2026-8142, Status = "Reporting"
- 10:00 - Initial assessment: 5,000 customers, names + emails exposed
- 11:00 - Move to "Investigation" (confirmation dialog shown)

**Day 1-2 (Investigation):**
- Root cause identified: Misconfigured S3 bucket permissions
- Full scope: 5,247 customers, only names + emails (no payment data)
- Risk assessment: Medium risk (no financial data, no special categories)
- Decision: DPA notification NOT required (low risk), individual notification YES (transparency)

**Day 2 (Containment):**
- 13:00 - S3 bucket secured, access logs reviewed
- 14:00 - No evidence of data download/exfiltration
- Containment verified
- Move to "Resolution"

**Day 2-3 (Resolution):**
- Permanent fix: S3 bucket policy updated + IAM review
- Preventive measures: Automated S3 permission audits implemented
- Email draft prepared for affected customers
- Move to "Post-Incident Review"

**Day 3 (Notifications & Closure):**
- 10:00 - Email sent to 5,247 affected customers
- "Individuals Notified" checkbox marked
- Lessons learned documented
- Incident moved to "Closed"

## Compliance & Regulatory Considerations

### GDPR Article 33 (Notification to Supervisory Authority)
- **Deadline**: 72 hours from when organization becomes aware
- **Content Requirements**:
  - Nature of personal data breach
  - Name and contact details of DPO (if applicable)
  - Likely consequences
  - Measures taken or proposed
- **Exceptions**: Not required if "unlikely to result in a risk to rights and freedoms"

### GDPR Article 34 (Communication to Data Subjects)
- **Deadline**: Without undue delay
- **Trigger**: High risk to rights and freedoms
- **Content Requirements**:
  - Nature of breach in clear and plain language
  - Name and contact details of DPO
  - Likely consequences
  - Measures taken or proposed
- **Exceptions**: Can be avoided if data was encrypted, subsequent measures remove high risk, or would involve disproportionate effort

### Documentation Requirements (GDPR Article 33.5)
All breaches must be documented regardless of notification requirement:
- Facts of the breach
- Effects
- Remedial action taken
- This documentation must be available for supervisory authority inspection

## Integration Points

### With Escalations
- DPA follow-up inquiries about incidents become escalations
- Incident detail view can show related escalations
- Shared reference IDs for linking

### With Cases
- Individual "Right to be informed" requests about breaches may create cases
- Cases can reference incident IDs

### With Trackboard
- Real-time visibility of all active incidents
- "CRITICAL" counter includes overdue DPA notifications
- Urgency-based sorting ensures critical incidents appear first

## Reporting & Analytics

**Metrics:**
- Total incidents per period
- Incidents by severity level
- Average time to containment
- Average time to resolution
- DPA notification rate
- Individual notification rate
- Incidents by affected system
- Incidents by market
- Repeat incidents (same root cause)

**Use Cases:**
- Monthly security team review
- Quarterly board reporting
- Annual DPA incident registry submission
- ISO 27001 / SOC 2 audit evidence
- Insurance claims (cyber insurance)

## Future Enhancements

- **Real-time alerts**: Slack/email when 72h deadline approaching
- **Template library**: Standard DPA notification templates by jurisdiction
- **Automated DPA submission**: API integration with supervisory authorities where available
- **Customer self-service**: Status page for affected individuals to check incident updates
- **AI-powered risk assessment**: Automated severity scoring based on data categories + scope
- **Integration**: SIEM integration for automated incident creation from security alerts
- **Forensics**: Built-in timeline builder for root cause analysis
- **Regulatory mapping**: Automatic identification of applicable breach notification laws by market

## Security & Access Control

- All incidents visible to GDPR team and security team
- Legal/sensitive fields may have restricted access
- Audit log immutable
- PII in incident descriptions must be minimized (use customer counts, not names)

## Success Metrics

- **100%** DPA notification on-time rate (within 72h when required)
- **0** regulatory penalties for notification failures
- Average time to containment < 48 hours
- Complete documentation for all incidents
- Post-incident review completed for 100% of incidents
