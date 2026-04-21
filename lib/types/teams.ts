/**
 * AI Trailblazers - Multi-Team Architecture
 * Type definitions for Clusters, Teams, and related entities
 */

import { Timestamp } from 'firebase/firestore';

// ============================================
// CLUSTER
// ============================================

export interface Cluster {
  id: string;
  name: string;
  description: string;
  clusterLead: string; // email
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClusterData {
  name: string;
  description: string;
  clusterLead: string;
}

// ============================================
// TEAM
// ============================================

export interface Team {
  id: string;
  clusterId: string;
  name: string;
  description: string;
  teamLead: string; // email
  members: string[]; // emails
  privacy: 'cluster' | 'private'; // cluster = Kirsten can see, private = team only
  status: 'pending' | 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string; // email (optional approval workflow)
  approvedAt?: Date;
}

export interface CreateTeamData {
  clusterId: string;
  name: string;
  description: string;
  teamLead: string;
  privacy?: 'cluster' | 'private';
}

// ============================================
// TEAM MEMBER
// ============================================

export interface TeamMember {
  id: string;
  teamId: string;
  email: string;
  name: string;
  role: 'lead' | 'member';
  joinedAt: Date;
  invitedBy?: string; // email
}

// ============================================
// USER PROFILE
// ============================================

export interface UserProfile {
  email: string;
  name: string;
  displayName?: string;
  photoURL?: string;
  
  // Onboarding
  hasCompletedSelfEvaluation: boolean;
  selfEvaluationDate?: Date;
  
  // Teams & Clusters
  teams: string[]; // Team IDs user belongs to
  clusters: string[]; // Cluster IDs user belongs to (derived from teams)
  
  // Resources
  savedResources: string[]; // Resource IDs user bookmarked
  
  // Platform Admin
  isPlatformAdmin: boolean;
  
  // Metadata
  createdAt: Date;
  lastLoginAt: Date;
  updatedAt: Date;
}

// ============================================
// PROFICIENCY
// ============================================

export type ProficiencyLevel = 1 | 2 | 3 | 4 | 5;

export type ProficiencyCategory = 
  | 'Prompt Engineering'
  | 'AI Tools Usage'
  | 'Data Privacy & Ethics'
  | 'Use Case Identification'
  | 'Coding with AI';

export interface Proficiency {
  id: string;
  teamId: string;
  clusterId: string;
  participantEmail: string;
  category: ProficiencyCategory;
  level: ProficiencyLevel;
  assessedAt: Date;
  assessedBy: string; // "self" | email
  notes?: string;
  visibility: 'team' | 'cluster'; // Never public for individuals!
}

export interface ProficiencyHistory {
  participantEmail: string;
  category: ProficiencyCategory;
  timeline: {
    date: Date;
    level: ProficiencyLevel;
    assessedBy: string;
  }[];
}

export interface SelfEvaluationData {
  teamId: string;
  clusterId: string;
  evaluations: {
    category: ProficiencyCategory;
    level: ProficiencyLevel;
    notes?: string;
  }[];
}

// ============================================
// WORKSHOP
// ============================================

export interface Workshop {
  id: string;
  teamId: string;
  clusterId: string;
  title: string;
  description: string;
  date: Date;
  duration?: number; // minutes
  location?: string; // "Online", "Office", etc.
  visibility: 'team' | 'cluster' | 'public';
  createdBy: string; // email
  facilitator?: string; // email
  attendees: string[]; // emails
  materials?: {
    title: string;
    url: string;
  }[];
  categories?: ProficiencyCategory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkshopData {
  teamId: string;
  title: string;
  description: string;
  date: Date;
  visibility?: 'team' | 'cluster' | 'public';
  duration?: number;
  location?: string;
  facilitator?: string;
  categories?: ProficiencyCategory[];
}

// ============================================
// RESOURCE
// ============================================

export type ResourceSkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type ResourceType = 'article' | 'video' | 'tutorial' | 'tool' | 'documentation' | 'course';

export interface Resource {
  id: string;
  teamId?: string; // Optional - can be global
  clusterId?: string; // Optional - can be global
  title: string;
  url: string;
  description: string;
  category: ProficiencyCategory;
  skillLevel: ResourceSkillLevel; // NEW: For recommendations!
  type: ResourceType;
  visibility: 'team' | 'cluster' | 'public';
  addedBy: string; // email
  tags?: string[];
  estimatedTime?: number; // minutes
  language?: string; // 'en', 'de', etc.
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateResourceData {
  teamId?: string;
  clusterId?: string;
  title: string;
  url: string;
  description: string;
  category: ProficiencyCategory;
  skillLevel: ResourceSkillLevel;
  type: ResourceType;
  visibility?: 'team' | 'cluster' | 'public';
  tags?: string[];
  estimatedTime?: number;
  language?: string;
}

// ============================================
// AI PROJECT
// ============================================

export interface AIProject {
  id: string;
  clusterId?: string; // Optional: which cluster it belongs to
  teamId?: string; // Optional: which team created it
  name: string;
  description: string;
  owner: string; // email
  coOwners: string[];
  status: 'Idea' | 'In Progress' | 'Live' | 'On Hold';
  category: 'Process Automation' | 'Analytics' | 'Training' | 'Compliance' | 'Other';
  
  // Benefits
  benefitsTeam: string;
  benefitsCompany: string;
  benefitsCustomers: string;
  
  // Metrics
  metricsBefore: string;
  metricsAfter: string;
  keyImpactNumber: string;
  
  // Showcase
  technologies: string[];
  demoLink?: string;
  screenshots?: string[];
  
  // Timeline
  startedDate: Date;
  completedDate?: Date;
  
  // Additional
  nextSteps?: string;
  learnings?: string;
  
  // Metadata
  visibility: 'public'; // Always public!
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CreateAIProjectData {
  clusterId?: string;
  teamId?: string;
  name: string;
  description: string;
  owner: string;
  coOwners?: string[];
  status: AIProject['status'];
  category: AIProject['category'];
  benefitsTeam: string;
  benefitsCompany: string;
  benefitsCustomers: string;
  metricsBefore: string;
  metricsAfter: string;
  keyImpactNumber: string;
  technologies: string[];
  demoLink?: string;
  startedDate: Date;
  completedDate?: Date;
  nextSteps?: string;
  learnings?: string;
}

// ============================================
// AGGREGATION / REPORTING
// ============================================

export interface ClusterProficiencyReport {
  clusterId: string;
  totalParticipants: number;
  totalTeams: number;
  categoryAverages: {
    category: ProficiencyCategory;
    averageLevel: number;
    participantCount: number;
    distribution: {
      beginner: number; // Level 1-2
      intermediate: number; // Level 3
      advanced: number; // Level 4-5
    };
  }[];
  trend?: {
    previousPeriod?: Date;
    currentPeriod: Date;
    improvement: number; // percentage
  };
  generatedAt: Date;
}

export interface TeamProficiencyReport {
  teamId: string;
  teamName: string;
  totalParticipants: number;
  categoryAverages: {
    category: ProficiencyCategory;
    averageLevel: number;
    participantCount: number;
  }[];
  generatedAt: Date;
}

// ============================================
// HELPERS
// ============================================

export const PROFICIENCY_CATEGORIES: ProficiencyCategory[] = [
  'Prompt Engineering',
  'AI Tools Usage',
  'Data Privacy & Ethics',
  'Use Case Identification',
  'Coding with AI',
];

export const PROFICIENCY_LEVEL_LABELS: Record<ProficiencyLevel, string> = {
  1: 'Beginner - No experience',
  2: 'Aware - Heard about it, not used practically',
  3: 'Practical - Use occasionally',
  4: 'Proficient - Use regularly and successfully',
  5: 'Expert - Can train others',
};

export const RESOURCE_SKILL_LEVELS: Record<ResourceSkillLevel, string> = {
  beginner: 'Beginner (Level 1-2)',
  intermediate: 'Intermediate (Level 3)',
  advanced: 'Advanced (Level 4-5)',
};
