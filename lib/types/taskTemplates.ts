// Task Template Types for Admin Configuration
import { IncidentStatus } from '../types';

export type TaskTemplate = {
  id: string;
  phase: IncidentStatus;          // Which phase this task belongs to
  title: string;
  description?: string;
  dueDateOffset: number;          // Hours from status change (e.g., 48 for 2 days)
  priority: 'High' | 'Medium' | 'Low';
  defaultOwnerRole?: string;      // Role-based assignment (e.g., "DPO", "Legal", "Tech Lead")
  defaultOwner?: string;          // Or specific email
  externalLinks: Array<{
    label: string;
    url: string;
  }>;
  order: number;                  // Display order
  isRequired: boolean;            // Must be completed before phase change
  createdAt: Date;
  updatedAt: Date;
};

export type TaskTemplateFormData = Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'>;
