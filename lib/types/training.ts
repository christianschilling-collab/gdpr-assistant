export interface TrainingCase {
  id: string;
  month: string; // e.g., "2026-03"
  timestamp: Date; // From CSV
  interactionDate: Date; // "Datum der Interaktion"
  channel: string; // "Kanal" - JIRA, E-Mail, etc.
  market: string; // Derived from link or "Unknown"
  errorType: 'misclassification' | 'wrong_template' | 'process_error' | 'escalation_error' | 'missing_info' | 'wrong_country' | 'other';
  errorDescription: string; // "Art des Fehlers" - original text
  notes?: string; // "Zusätzlicher Kommentar"
  link?: string; // "Interaktions-Link oder Jira-Link"
  reporter?: string; // "Reporter"
  forwarded?: string; // "Weitergeleitet"
  createdAt: Date;
}

export interface TrainingReport {
  month: string;
  totalCases: number;
  byMarket: Record<string, {
    total: number;
    byErrorType: Record<string, number>;
    trend: 'up' | 'down' | 'flat';
  }>;
  topErrors: Array<{
    market: string;
    errorType: string;
    errorDescription: string;
    count: number;
    trend: 'up' | 'down' | 'flat';
  }>;
}
