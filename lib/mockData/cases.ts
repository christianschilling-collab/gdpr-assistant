/**
 * Mock Data for Cases
 * Used when Firebase is not available or Rules are not configured
 * 
 * IMPORTANT: This file uses lazy evaluation to avoid server-side rendering issues
 */

import { GDPRCase, CaseStatusChange, CaseActivity } from '../types';

// Helper function to create dates
function createDate(dateString: string): Date {
  return new Date(dateString);
}

// Export as functions to avoid evaluation during import
export function getMockCases(): Record<string, GDPRCase> {
  return {
    'case-1': {
      id: 'case-1',
      caseId: 'HELP-2024-001',
      timestamp: createDate('2024-01-15T10:30:00'),
      teamMember: 'agent1@example.com',
      sourceLink: 'https://support.example.com/ticket/12345',
      market: 'DE',
      caseDescription: 'Der Kunde möchte alle seine gespeicherten Daten einsehen. Er hat bereits vor 2 Wochen eine Anfrage gestellt, aber noch keine Antwort erhalten. Er ist unzufrieden und möchte wissen, welche Daten wir über ihn speichern.',
      specificQuestion: 'Wie lange dauert die Bearbeitung einer Datenauskunft?',
      urgency: 'High',
      primaryCategory: 'Data Access Request',
      subCategory: 'General Access',
      customerType: 'Customer',
      confidence: 0.95,
      status: 'AI Processed',
      assignedTo: 'agent1@example.com',
      notes: 'Kunde ist unzufrieden wegen Wartezeit. Priorität erhöhen.',
      reviewFlag: false,
      suggestedReply: 'Sehr geehrter Kunde,\n\nvielen Dank für Ihre Anfrage bezüglich Ihrer gespeicherten Daten.\n\nWir bearbeiten Ihre Anfrage derzeit und werden Ihnen innerhalb der gesetzlichen Frist von 30 Tagen eine vollständige Übersicht über alle bei uns gespeicherten Daten zukommen lassen.\n\nBei Fragen stehen wir Ihnen gerne zur Verfügung.\n\nMit freundlichen Grüßen\nIhr GDPR Team',
      templateMatches: [
        {
          template: {
            id: 'template-1',
            templateName: 'Data Access Request - Standard',
            primaryCategory: 'Data Access Request',
            subCategory: 'General Access',
            customerType: 'Customer',
            templateText: 'Standard template for data access requests',
            whenToUse: 'For general data access requests from customers',
            keywords: ['Datenauskunft', 'DSGVO', 'Zugriff'],
            createdAt: createDate('2024-01-15T10:30:00'),
            updatedAt: createDate('2024-01-15T10:30:00'),
          },
          confidence: 0.92,
          reason: 'Perfect match for data access request',
        },
      ],
      keyDetails: {
        customerEmail: 'customer@example.com',
        requestDate: '2024-01-01',
        previousRequest: 'Yes',
      },
      createdAt: createDate('2024-01-15T10:30:00'),
      updatedAt: createDate('2024-01-15T11:00:00'),
    },
    'case-2': {
      id: 'case-2',
      caseId: 'HELP-2024-002',
      timestamp: createDate('2024-01-16T14:20:00'),
      teamMember: 'agent2@example.com',
      sourceLink: 'https://support.example.com/ticket/12346',
      market: 'FR',
      caseDescription: 'Le client souhaite supprimer son compte et toutes ses données personnelles. Il mentionne qu\'il ne souhaite plus utiliser notre service.',
      specificQuestion: 'Comment supprimer mon compte et mes données?',
      urgency: 'Medium',
      primaryCategory: 'Data Deletion Request',
      subCategory: 'Account Deletion',
      customerType: 'Customer',
      confidence: 0.88,
      status: 'Under Review',
      assignedTo: 'agent2@example.com',
      notes: 'Client wants complete account deletion. Verify identity first.',
      reviewFlag: true,
      suggestedReply: 'Cher client,\n\nNous avons bien reçu votre demande de suppression de compte.\n\nAfin de procéder à la suppression, nous devons d\'abord vérifier votre identité. Veuillez nous fournir les informations suivantes...\n\nCordialement\nVotre équipe GDPR',
      templateMatches: [],
      keyDetails: {
        customerEmail: 'client@example.com',
        accountType: 'Premium',
      },
      createdAt: createDate('2024-01-16T14:20:00'),
      updatedAt: createDate('2024-01-16T15:00:00'),
    },
    'case-3': {
      id: 'case-3',
      caseId: 'HELP-2024-003',
      timestamp: createDate('2024-01-17T09:15:00'),
      teamMember: 'agent3@example.com',
      sourceLink: 'https://support.example.com/ticket/12347',
      market: 'UK',
      caseDescription: 'Customer wants to correct their email address in our system. They provided the wrong email when signing up and now cannot access their account.',
      specificQuestion: 'How can I update my email address?',
      urgency: 'Low',
      primaryCategory: 'Data Rectification Request',
      subCategory: 'Email Update',
      customerType: 'Customer',
      confidence: 0.75,
      status: 'Resolved',
      assignedTo: 'agent3@example.com',
      notes: 'Email updated successfully. Customer verified.',
      resolutionDate: createDate('2024-01-17T10:30:00'),
      reviewFlag: false,
      suggestedReply: 'Dear Customer,\n\nThank you for your request to update your email address.\n\nWe have successfully updated your email address in our system. Please verify your new email address by clicking the link we sent you.\n\nBest regards\nYour GDPR Team',
      templateMatches: [],
      keyDetails: {
        oldEmail: 'old@example.com',
        newEmail: 'new@example.com',
      },
      createdAt: createDate('2024-01-17T09:15:00'),
      updatedAt: createDate('2024-01-17T10:30:00'),
    },
  };
}

export function getMockStatusHistory(): Record<string, CaseStatusChange[]> {
  return {
    'case-1': [
      {
        fromStatus: 'New',
        toStatus: 'AI Processed',
        changedBy: 'system',
        changedAt: createDate('2024-01-15T10:35:00'),
        reason: 'Automated AI processing',
      },
    ],
    'case-2': [
      {
        fromStatus: 'New',
        toStatus: 'AI Processed',
        changedBy: 'system',
        changedAt: createDate('2024-01-16T14:25:00'),
        reason: 'Automated AI processing',
      },
      {
        fromStatus: 'AI Processed',
        toStatus: 'Under Review',
        changedBy: 'agent2@example.com',
        changedAt: createDate('2024-01-16T15:00:00'),
        reason: 'Flagged for manual review due to deletion request',
      },
    ],
    'case-3': [
      {
        fromStatus: 'New',
        toStatus: 'AI Processed',
        changedBy: 'system',
        changedAt: createDate('2024-01-17T09:20:00'),
        reason: 'Automated AI processing',
      },
      {
        fromStatus: 'AI Processed',
        toStatus: 'Resolved',
        changedBy: 'agent3@example.com',
        changedAt: createDate('2024-01-17T10:30:00'),
        reason: 'Email updated successfully',
      },
    ],
  };
}

export function getMockActivityLog(): Record<string, CaseActivity[]> {
  return {
    'case-1': [
      {
        type: 'ai_processed',
        user: 'system',
        timestamp: createDate('2024-01-15T10:35:00'),
        description: 'Case processed with AI - Category: Data Access Request',
        details: {
          category: 'Data Access Request',
          confidence: 0.95,
        },
      },
      {
        type: 'assignment',
        user: 'admin@example.com',
        timestamp: createDate('2024-01-15T10:40:00'),
        description: 'Case assigned to agent1@example.com',
        details: {
          from: null,
          to: 'agent1@example.com',
        },
      },
    ],
    'case-2': [
      {
        type: 'ai_processed',
        user: 'system',
        timestamp: createDate('2024-01-16T14:25:00'),
        description: 'Case processed with AI - Category: Data Deletion Request',
        details: {
          category: 'Data Deletion Request',
          confidence: 0.88,
        },
      },
      {
        type: 'note_added',
        user: 'agent2@example.com',
        timestamp: createDate('2024-01-16T15:00:00'),
        description: 'Notes updated',
      },
    ],
    'case-3': [
      {
        type: 'ai_processed',
        user: 'system',
        timestamp: createDate('2024-01-17T09:20:00'),
        description: 'Case processed with AI - Category: Data Rectification Request',
        details: {
          category: 'Data Rectification Request',
          confidence: 0.75,
        },
      },
      {
        type: 'resolved',
        user: 'agent3@example.com',
        timestamp: createDate('2024-01-17T10:30:00'),
        description: 'Case marked as resolved by agent3@example.com',
      },
    ],
  };
}

export function getMockSimilarCases(): Record<string, Array<{ case: GDPRCase; similarity: number; reason: string }>> {
  const cases = getMockCases();
  return {
    'case-1': [
      {
        case: cases['case-3'],
        similarity: 0.65,
        reason: 'Same primary category, Same market',
      },
    ],
    'case-2': [],
    'case-3': [
      {
        case: cases['case-1'],
        similarity: 0.60,
        reason: 'Same primary category, Same customer type',
      },
    ],
  };
}

// Lazy-loaded constants (only evaluated on client-side)
// Use empty objects for server-side to avoid SSR issues
export const MOCK_CASES: Record<string, GDPRCase> = typeof window !== 'undefined' 
  ? getMockCases() 
  : ({} as Record<string, GDPRCase>);

export const MOCK_STATUS_HISTORY: Record<string, CaseStatusChange[]> = typeof window !== 'undefined'
  ? getMockStatusHistory()
  : ({} as Record<string, CaseStatusChange[]>);

export const MOCK_ACTIVITY_LOG: Record<string, CaseActivity[]> = typeof window !== 'undefined'
  ? getMockActivityLog()
  : ({} as Record<string, CaseActivity[]>);

export const MOCK_SIMILAR_CASES: Record<string, Array<{ case: GDPRCase; similarity: number; reason: string }>> = typeof window !== 'undefined'
  ? getMockSimilarCases()
  : ({} as Record<string, Array<{ case: GDPRCase; similarity: number; reason: string }>>);
