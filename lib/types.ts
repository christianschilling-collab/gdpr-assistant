/**
 * Type definitions for GDPR Assistant
 */

// ===== NEW: Configurable Categories & Requester Types =====

export interface Category {
  id: string;
  name: string;              // "Datenlöschung"
  nameEn: string;            // "Data Deletion"
  description: string;
  icon?: string;
  isActive: boolean;
  sortOrder?: number;        // For display ordering
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface RequesterType {
  id: string;
  name: string;              // "Kunde", "Bestattungsunternehmen"
  nameEn: string;            // "Customer", "Funeral Home"
  description: string;
  isActive: boolean;
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface HandoverNotes {
  summary: string;           // AI-generated or manual summary
  keyPoints: string[];       // Bullet points
  urgencyLevel: 'low' | 'medium' | 'high';
  previousActions: string[]; // Was wurde schon probiert?
  specificQuestion: string;  // Freitext: Was genau ist unklar?
  suggestedNextSteps?: string; // Optional: von Admin befüllt
}

export interface CaseNotes {
  jiraNote: string;          // Vorschlag für Jira Aktennotiz
  internalNote: string;      // Interne Notiz
}

export interface GDPRCase {
  id: string;
  caseId: string;
  timestamp: Date;
  teamMember: string;
  
  // GDPR-compliant: NO PII stored!
  customerNumber?: string;       // OK: Customer reference (e.g., "12345678")
  market: string;                // OK: "DE", "AT", "CH"
  
  // External links (NO PII)
  jiraLink?: string;
  mineosLink?: string;
  owlLink?: string;
  isGmail?: boolean;             // Checkbox for Gmail cases
  
  // Request description (PII-sanitized by AI)
  caseDescription: string;       // PII removed: Names → [NAME], Emails → [EMAIL]
  specificQuestion?: string;
  urgency: 'Low' | 'Medium' | 'High';

  // AI-generated fields
  primaryCategory?: string;      // Now references Category.id
  subCategory?: string;
  customerType?: string;         // Now references RequesterType.id
  confidence?: number;
  templateMatches?: TemplateMatch[];
  suggestedReply?: string;
  keyDetails?: Record<string, string>;
  similarCases?: string[];
  reviewFlag?: boolean;

  // Classification Method
  classificationMethod?: 'manual' | 'ai' | 'batch-ai';
  aiConfidence?: number;         // AI classification confidence

  // Missing Guidance Flag
  needsGuidance?: boolean;
  guidanceRequestedAt?: Date;
  guidanceProvidedBy?: string;
  guidanceNotes?: string;

  // Handover Notes (strukturiert)
  handoverNotes?: HandoverNotes;

  // Case Notes (AI-generiert)
  caseNotes?: CaseNotes;

  // Workflow fields
  status: 'New' | 'AI Processed' | 'Under Review' | 'Resolved';
  assignedTo?: string;
  notes?: string;
  resolutionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Activity history
  statusHistory?: CaseStatusChange[];
  activityLog?: CaseActivity[];
  
  // Multi-Step Workflow (NEW)
  workflow?: CaseWorkflow;
  currentWorkflowStep?: number;
  workflowHistory?: WorkflowStepInstance[];
}

export interface CaseStatusChange {
  fromStatus: string;
  toStatus: string;
  changedBy?: string;
  changedAt: Date;
  reason?: string;
}

export interface CaseActivity {
  type: 'status_change' | 'assignment' | 'note_added' | 'ai_processed' | 'resolved';
  user?: string;
  timestamp: Date;
  description: string;
  details?: Record<string, any>;
}

export interface ProcessStep {
  order: number;
  title: string;
  description: string;
  required: boolean;
  confluenceLink?: string;
  checklist?: string[]; // Optional: Unterpunkte für diesen Schritt
  
  // Workflow-spezifische Felder
  stepType?: 'manual' | 'email' | 'decision' | 'wait';
  emailTemplate?: EmailDraft;  // Für email-Steps
  skipConditions?: string[];   // Wann kann dieser Schritt übersprungen werden?
  dependsOn?: number[];        // Step-IDs, die vorher completed sein müssen
}

// Email-Draft Struktur
export interface EmailDraft {
  subject: string;
  bodyTemplate: string;
  placeholders: string[];  // z.B. ["CUSTOMER_NAME", "CASE_ID"]
  category: 'acknowledgement' | 'id_request' | 'negative_response' | 'data_package' | 'marketing_opt_out' | 'other';
}

// Workflow-Instanz pro Case
export interface CaseWorkflow {
  caseId: string;
  templateId: string;
  steps: WorkflowStepInstance[];
  currentStepIndex: number;
  startedAt: Date;
  expectedCompletionDate?: Date;
}

export interface WorkflowStepInstance {
  stepOrder: number;
  stepDefinition: ProcessStep;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  completedBy?: string;  // Agent email
  emailDraft?: string;   // Generierter E-Mail-Text
  notes?: string;
  attachments?: string[];  // Falls Dateien angehängt werden
  skipReason?: string;     // Grund für Skip
}

export interface Template {
  id: string;
  primaryCategory: string;       // Now references Category.id
  subCategory?: string;
  requesterType: string;          // Now references RequesterType.id (was: customerType)
  templateName: string;
  templateText: string;
  whenToUse: string;
  keywords: string[];
  confluenceLink?: string;
  mineosAuto?: boolean;
  processSteps?: ProcessStep[];   // Checkliste/Prozess-Schritte für Agents
  jiraNoteTemplate?: string;      // NEW: Template für Jira Aktennotiz
  createdAt: Date;
  updatedAt: Date;
  // Versioning
  version?: number;
  versionHistory?: TemplateVersion[];
}

export interface TemplateVersion {
  version: number;
  templateText: string;
  changedBy?: string;
  changedAt: Date;
  changeReason?: string;
}

export interface Classification {
  primaryCategory: string;        // Now references Category.id
  subCategory?: string;
  requesterType: string;          // Now references RequesterType.id (was: customerType)
  confidence: number;
}

export interface TemplateMatch {
  template: Template;
  confidence: number;
  reason: string;
}

export interface TrainingErrorCategory {
  id: string;
  title: string;
  description: string;
  commonMistakes: string[];
  correctApproach: string;
  examples: { wrong: string; correct: string }[];
  resources?: string[];
  videoUrl?: string; // Added for video tutorials
}

export interface TrainingRequest {
  id?: string;
  agentEmail: string;
  categoryIds: string[];
  sentAt: Date;
  sentBy?: string;
  status: 'sent' | 'opened' | 'completed';
  completedAt?: Date;
}

export type QuestionType = 'multiple-choice' | 'true-false' | 'scenario';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // For multiple-choice
  correctAnswer: string | boolean; // For multiple-choice, true-false
  explanation?: string;
  scenario?: string; // For scenario-based questions
}

export interface Quiz {
  id?: string;
  categoryId: string;
  categoryTitle: string;
  questions: QuizQuestion[];
  passingScore: number; // Percentage
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizAttempt {
  id?: string;
  quizId: string;
  categoryId: string;
  agentId: string;
  agentEmail: string;
  attemptedAt: Date;
  score: number; // Percentage
  passed: boolean;
  answers: {
    questionId: string;
    selectedAnswer: string | boolean;
    isCorrect: boolean;
  }[];
}

export interface QuizCertificate {
  id?: string;
  agentId: string;
  agentEmail: string;
  categoryId: string;
  categoryTitle: string;
  issuedAt: Date;
  quizAttemptId: string;
  score: number;
  certificateNumber: string; // Unique certificate ID
}

export interface TrainingTemplate {
  id?: string;
  name: string;
  description: string;
  categoryIds: string[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Management Reporting Types
export interface MarketPulseCheck {
  id?: string;
  market: string; // e.g., "DE", "FR", "UK"
  week: string; // ISO week format "2024-W01"
  submittedAt: Date;
  submittedBy: string;
  responses: {
    questionId: string;
    question: string;
    answer: string | number | boolean;
    category?: string;
  }[];
  overallScore?: number; // 0-100
  status: 'draft' | 'submitted' | 'reviewed';
  notes?: string;
}

export interface ManagementReport {
  period: string; // "2024-01" or "2024-W01"
  generatedAt: Date;
  summary: {
    totalCases: number;
    casesByStatus: Record<string, number>;
    casesByMarket: Record<string, number>;
    averageProcessingTime?: number; // in hours
    trainingCompletions: number;
    trainingCompletionRate: number; // percentage
  };
  marketPulse: {
    markets: MarketPulseCheck[];
    averageScore: number;
    trends: {
      market: string;
      trend: 'improving' | 'stable' | 'declining';
      change: number; // percentage change
    }[];
  };
  topIssues: {
    category: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  recommendations: string[];
}

// Agent Progress Types
export interface AgentProgress {
  agentId: string;
  agentEmail: string;
  completedCategories: string[];
  completedAt: Record<string, Date>; // categoryId -> completion date
  quizAttempts: string[]; // quizAttempt IDs
  certificates: string[]; // certificate IDs
  lastUpdated: Date;
}

// Feedback Types
export interface TrainingFeedback {
  id?: string;
  trainingCategoryId: string;
  agentEmail: string;
  rating: number; // 1-5 stars
  comment?: string;
  helpful: boolean;
  submittedAt: Date;
  needsClarification?: boolean;
}

export interface CaseFeedback {
  id?: string;
  caseId: string;
  agentEmail: string;
  rating: number; // 1-5 stars
  comment?: string;
  helpful: boolean;
  aiSuggestionRating?: number; // Rating for AI suggestions
  submittedAt: Date;
  improvementSuggestions?: string;
}

// Agent Performance Types
export interface AgentPerformance {
  agentEmail: string;
  period: string; // "2024-W01" or "2024-01"
  casesProcessed: number;
  averageResolutionTime: number; // in hours
  qualityScore: number; // 0-100, based on review flags
  trainingCompletionRate: number; // percentage
  quizAverageScore: number; // percentage
  certificatesEarned: number;
  lastUpdated: Date;
}

export interface AgentTrainingRecord {
  id: string;
  agentName?: string;
  agentEmail: string;
  caseId: string;
  caseCategory: string;
  caseRequesterType: string;
  errorType: string; // e.g., 'Misclassification', 'WrongDataScope'
  notes?: string;
  status: 'pending' | 'sent' | 'completed' | 'failed';
  sentAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// Weekly Reporting Types
/** Structured weekly narrative items (web form); each becomes one activityLog document. */
export const ACTIVITY_LOG_KINDS = [
  'win',
  'initiative',
  'noteworthy',
  'observation',
  'complaint',
  'privacy_incident',
  'escalation',
] as const;

export type ActivityLogKind = (typeof ACTIVITY_LOG_KINDS)[number];

/** Short labels for UI (form dropdown, email badges). */
export const ACTIVITY_KIND_LABELS: Record<ActivityLogKind, string> = {
  win: 'Win / good news',
  initiative: 'Initiative',
  noteworthy: 'Noteworthy',
  observation: 'Observation',
  complaint: 'Complaint',
  privacy_incident: 'Privacy incident (narrative)',
  escalation: 'Escalation',
};

export interface WeeklyReportActivityItem {
  kind: ActivityLogKind;
  title: string;
  description: string;
}

export interface WeeklyReport {
  id: string;
  market: 'DACH' | 'NL' | 'France' | 'Be / Lux' | 'Nordics';
  weekOf: Date;
  yourName?: string;
  deletionRequests: number;
  portabilityRequests: number;
  currentBacklog: number;
  legalEscalations: number;
  regulatorInquiries: number;
  privacyIncidents: number;
  complaints: number;
  crossFunctionalCases: number;
  noteworthyEdgeCases: number;
  escalationDetails?: string;
  riskStatus: 'green' | 'yellow' | 'red';
  riskExplanation?: string;
  currentInitiatives?: string;
  supportNeeded?: string;
  winsGoodNews?: string;
  anythingElse?: string;
  /** When set (non-empty after save), replaces legacy text fields for activity log generation. */
  activityItems?: WeeklyReportActivityItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityLogEntry {
  id: string;
  market: string;
  weekOf: Date;
  category: 'Initiative' | 'Escalation';
  /** When set, drives grouping in UI and email (legacy rows infer from category / ✅ prefix). */
  kind?: ActivityLogKind;
  title?: string;
  details: string;
  createdAt: Date;
}

/** Single check-off event for a checklist row (shared queue, same calendar day). */
export interface AgentDailyCheckLogEntry {
  userEmail: string;
  displayName?: string;
  at: Date;
}

/**
 * One checklist row — template from Firestore `dailyQueueSettings/checklistTemplate` (fallback: defaults).
 * Stored on shared `agentDailyQueueLogs/{dayKey}` (team queue) and legacy `agentDailyLogs`.
 */
export interface AgentDailyChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  /** Link to SOP / Confluence section. */
  docUrl?: string;
  /** In-app path (e.g. `/board`) or external tool URL. */
  toolUrl?: string;
  /** Append-only log when someone sets the row to checked for the day. */
  checkLog?: AgentDailyCheckLogEntry[];
}

/**
 * Saved per signed-in user per calendar day (local date picker).
 * Checklist template is seeded in the app; align with Confluence SOPs in `lib/operations/agentDailyChecklistSeed.ts`.
 */
export interface AgentDailyLog {
  id: string;
  dayKey: string;
  userEmail: string;
  displayName?: string;
  items: AgentDailyChecklistItem[];
  /** Shift / vacation / coverage (free text). */
  rosterNotes?: string;
  /** Optional end-of-day note. */
  dayNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Shared team queue checklist for one calendar day (Firestore: `agentDailyQueueLogs/{dayKey}`). */
export interface AgentDailyQueueLog {
  id: string;
  dayKey: string;
  items: AgentDailyChecklistItem[];
  rosterNotes?: string;
  dayNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Admin-managed "What do you want to do next?" (`dailyQueueSettings/nextActions`). */
export interface DailyNextActionConfig {
  id: string;
  title: string;
  description: string;
  href: string;
  external?: boolean;
  sortOrder: number;
}

/** Admin-managed checklist template row (`dailyQueueSettings/checklistTemplate`). */
export interface DailyChecklistTemplateRow {
  id: string;
  label: string;
  docUrl?: string;
  toolUrl?: string;
  sortOrder: number;
}

/** Firestore: `teamAbsences` — shared team leave / absence (shown on agent daily log). */
export type TeamAbsenceKind = 'vacation' | 'sick' | 'training' | 'other';

export interface TeamAbsence {
  id: string;
  userEmail: string;
  displayName?: string;
  /** Inclusive YYYY-MM-DD */
  startDate: string;
  /** Inclusive YYYY-MM-DD */
  endDate: string;
  kind: TeamAbsenceKind;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===== GDPR INCIDENT ASSISTANT (Art. 33 Data Breaches) =====

export type IncidentStatus = 
  | 'Reporting'             // Initial report
  | 'Investigation'         // Root cause analysis
  | 'Containment'           // Containment measures
  | 'Resolution'            // Fixing the issue
  | 'Post-Incident Review'  // Post-mortem
  | 'Closed';               // Incident resolved

export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type LegalRiskType =
  | 'Loss of Availability'
  | 'Loss of Confidentiality'
  | 'Loss of Integrity'
  /** Early reporting / mixed cases not captured by CIA alone (requires `breachOtherDetails` when used). */
  | 'Other / not solely CIA';

export type NotificationDecision = 
  | 'notify_authority'    // Must notify DPA
  | 'no_action'           // No notification required
  | 'under_review';       // Still evaluating

/** Intake “what happened” keywords (labels in `lib/constants/incidentScenarioTags.ts`). */
export type IncidentScenarioTagId =
  | 'unintended_disclosure'
  | 'data_leak'
  | 'third_party_access'
  | 'technical_error'
  | 'misconfiguration'
  | 'lost_stolen_device'
  | 'ransomware_malware'
  | 'insider_threat'
  | 'other_mixed';

export type IncidentCountry = 
  | 'BE' | 'LU' | 'NL' | 'FR'           // BNL + France
  | 'DE' | 'AT' | 'CH'                  // DACH
  | 'SE' | 'DK' | 'NO';                 // Nordics

export interface CountryImpact {
  country: IncidentCountry;
  impactedVolume: number;        // Number of affected customers
  complaintsReceived: number;
  riskLevel: RiskLevel;
}

export interface IncidentTask {
  id: string;
  incidentId: string;
  title: string;
  description?: string;
  owner: string;                 // Team member email
  dueDate?: Date;
  status: 'pending' | 'completed';
  priority?: 'High' | 'Medium' | 'Low';
  externalLinks?: Array<{
    label: string;
    url: string;
  }>;
  createdAt: Date;
  completedAt?: Date;
}

export interface IncidentAuditLog {
  id: string;
  incidentId: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  action: string;               // "Status changed", "Field updated", etc.
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  notes?: string;
}

export interface Incident {
  id: string;
  incidentId: string;           // Human-readable ID: INC-2024-001
  
  // Section 1: Executive Summary
  natureOfIncident: string;     // Short summary / headline (intake)
  /** Optional longer narrative at intake (before investigation). */
  additionalDescription?: string;
  affectedSystems: string[];    // Multi-select: CRM, Payment, Email, etc.
  dataCategories: string[];     // Multi-select: Contact Data, Financial Data, etc.
  /** Markets / regions (or “EU-wide”) selected at intake. */
  affectedMarkets?: string[];
  /** Intake scenario tags — shown on detail header and board/list badges. */
  scenarioTags?: IncidentScenarioTagId[];
  impactPeriod: {
    start: Date;
    end?: Date;
  };
  discoveryDate: Date;
  rootCause?: string;           // Only visible in Investigation status
  /** Legacy / optional label from older Firestore payloads */
  primaryLegalRisk?: string;

  // Section 2: Impact Analysis
  breachTypes?: LegalRiskType[];       // Multi-select: Loss of Availability, Confidentiality, Integrity
  /** Free text when `Other / not solely CIA` is selected (intake or legal). */
  breachOtherDetails?: string;
  classification?: string;
  countryImpact: CountryImpact[];  // BE, LU, NL, FR
  totalImpacted?: number;          // Calculated from countryImpact
  
  // Section 3: Remediation (shown in Remediation status)
  technicalResolution?: string;
  workaroundCS?: string;           // Customer Service workaround
  communicationInternal?: string;
  communicationExternal?: string;
  
  // Section 3a: Containment (shown in Containment status)
  containmentMeasures?: string;    // What was done to stop the breach
  containmentVerified?: boolean;   // Has containment been verified?
  containmentVerifiedBy?: string;
  containmentVerifiedAt?: Date;
  
  // Section 3b: Resolution (shown in Resolution status)
  resolutionDescription?: string;   // Final resolution details
  preventiveMeasures?: string;      // What will prevent recurrence
  resolutionVerified?: boolean;     // Has resolution been verified?
  resolutionVerifiedBy?: string;
  resolutionVerifiedAt?: Date;
  
  // Section 4: Notification Assessment (Legal Review status)
  riskAssessment?: RiskLevel;
  legalReasoning?: string;
  notificationDecision?: NotificationDecision;
  validatedBy?: string;            // Legal team member
  validatedAt?: Date;
  
  // Workflow
  status: IncidentStatus;
  assignedTo?: string;
  
  // Timestamps & Compliance
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Art. 33 Compliance: 72h window
  notificationDeadline?: Date;     // Discovery + 72 hours
  authorityNotifiedAt?: Date;      // When DPA was notified
  
  // Related data
  tasks?: IncidentTask[];          // Auto-generated tasks
  auditLog?: IncidentAuditLog[];   // Change history
}

