import { Timestamp } from 'firebase/firestore';

/**
 * Escalation Status
 */
export type EscalationStatus = 
  | 'Not Started'
  | 'In Progress'
  | 'Pending External Response'
  | 'Blocked'
  | 'Closed';

/**
 * Escalation Subject Categories
 */
export type EscalationSubject =
  | 'Logistic'
  | 'Payment'
  | 'Privacy'
  | 'Product Quality'
  | 'Customer Service'
  | 'Right of Access (DSAR)'
  | 'Right to Rectification'
  | 'Right to Erasure'
  | 'Right to Restriction of Processing'
  | 'Right to Data Portability'
  | 'Right to Object to Processing'
  | 'Other/Specific Request'
  | 'DPA Inquiry'
  | 'Customer Complaint';

/**
 * Escalation Market
 */
export type EscalationMarket =
  | 'Germany'
  | 'Austria'
  | 'Switzerland'
  | 'France'
  | 'Belgium'
  | 'Netherlands'
  | 'Luxembourg'
  | 'Sweden'
  | 'Norway'
  | 'Denmark';

/**
 * Escalation Classification
 */
export type EscalationClassification = 'Customer' | 'Non-Customer';

/**
 * Link Type for external resources
 */
export type EscalationLinkType = 'Google Drive' | 'Google NotebookLM' | 'Jira' | 'Purecloud' | 'Other';

/**
 * Action Item Owner Teams
 */
export type ActionItemOwner = 'Customer Care' | 'GDPR Team' | 'Legal' | 'Marketing/PR';

/**
 * Action Item Status
 */
export type ActionItemStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Blocked' | 'N/A – Not Required';

/**
 * Escalation Action Item
 */
export interface EscalationActionItem {
  id: string;
  title: string;
  owner: ActionItemOwner;
  status: ActionItemStatus;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * External Link
 */
export interface EscalationLink {
  id: string;
  type: EscalationLinkType;
  url: string;
  label?: string;
  addedAt: Date;
}

/**
 * Communication Entry for Timeline
 */
export interface CommunicationEntry {
  id: string;
  timestamp: Date;
  sender: 'Customer' | 'Customer Care' | 'Legal' | 'GDPR Team';
  summary: string;
  interactionLink?: string;
  addedBy: string;
}

/**
 * Escalation Audit Log Entry
 */
export interface EscalationAuditLog {
  id: string;
  escalationId: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  action: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
}

/**
 * Main Escalation Interface
 */
export interface Escalation {
  id: string;
  escalationId: string;          // Human-readable: ESC-2026-001
  
  // Basic Info
  status: EscalationStatus;
  summary: string;                // Summary of the complaint
  subject: EscalationSubject;
  market: EscalationMarket;
  classification: EscalationClassification;
  
  // Status-specific fields
  waitingForResponseFrom?: string;  // Used when status is "Pending External Response"
  
  // Customer Info
  cidOrEmail: string;             // Customer ID or Email
  
  // References
  jiraReference?: string;
  purecloudInteractionLink?: string;
  relatedCases: string[];            // Array of related case IDs
  
  // Dates
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;              // Email of creator
  deadlineFirstReply: Date;       // createdAt + 2 days
  
  // External Links
  links: EscalationLink[];
  
  // Communication Timeline
  communications: CommunicationEntry[];
  
  // Investigation & Drafts (kept for backward compatibility)
  investigationResult?: string;         // Big text field
  draftAnswer?: string;                 // Big text field
  
  // Action Items
  actionItems: EscalationActionItem[];
}

/**
 * Firestore timestamp conversion helpers
 */
export function escalationFromFirestore(data: any): Escalation {
  return {
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    deadlineFirstReply: data.deadlineFirstReply?.toDate() || new Date(),
    links: (data.links || []).map((link: any) => ({
      ...link,
      addedAt: link.addedAt?.toDate() || new Date(),
    })),
    communications: (data.communications || []).map((comm: any) => ({
      ...comm,
      timestamp: comm.timestamp?.toDate() || new Date(),
    })),
    actionItems: (data.actionItems || []).map((item: any) => ({
      ...item,
      createdAt: item.createdAt?.toDate() || new Date(),
      completedAt: item.completedAt?.toDate(),
    })),
  };
}

export function escalationToFirestore(escalation: Partial<Escalation>): any {
  const data: any = { ...escalation };
  
  if (data.createdAt instanceof Date) {
    data.createdAt = Timestamp.fromDate(data.createdAt);
  }
  if (data.updatedAt instanceof Date) {
    data.updatedAt = Timestamp.fromDate(data.updatedAt);
  }
  if (data.deadlineFirstReply instanceof Date) {
    data.deadlineFirstReply = Timestamp.fromDate(data.deadlineFirstReply);
  }
  if (data.links) {
    data.links = data.links.map((link: EscalationLink) => ({
      ...link,
      addedAt: link.addedAt instanceof Date ? Timestamp.fromDate(link.addedAt) : link.addedAt,
    }));
  }
  if (data.communications) {
    data.communications = data.communications.map((comm: any) => ({
      ...comm,
      timestamp: comm.timestamp instanceof Date ? Timestamp.fromDate(comm.timestamp) : comm.timestamp,
    }));
  }
  if (data.actionItems) {
    data.actionItems = data.actionItems.map((item: EscalationActionItem) => {
      const firestoreItem: any = {
        id: item.id,
        title: item.title,
        owner: item.owner,
        status: item.status,
        createdAt: item.createdAt instanceof Date ? Timestamp.fromDate(item.createdAt) : item.createdAt,
      };
      // Only add completedAt if it exists (not undefined)
      if (item.completedAt) {
        firestoreItem.completedAt = item.completedAt instanceof Date 
          ? Timestamp.fromDate(item.completedAt) 
          : item.completedAt;
      }
      return firestoreItem;
    });
  }
  
  return data;
}

/**
 * Default Action Items Template
 */
export const DEFAULT_ACTION_ITEMS: Omit<EscalationActionItem, 'id' | 'createdAt'>[] = [
  {
    title: 'Initial assessment by Customer Care',
    owner: 'Customer Care',
    status: 'Not Started',
  },
  {
    title: 'Legal review required',
    owner: 'Legal',
    status: 'Not Started',
  },
  {
    title: 'Prepare draft response',
    owner: 'GDPR Team',
    status: 'Not Started',
  },
  {
    title: 'Review by GDPR Team',
    owner: 'GDPR Team',
    status: 'Not Started',
  },
  {
    title: 'Send response to customer',
    owner: 'Customer Care',
    status: 'Not Started',
  },
  {
    title: 'Document outcome',
    owner: 'Customer Care',
    status: 'Not Started',
  },
];
