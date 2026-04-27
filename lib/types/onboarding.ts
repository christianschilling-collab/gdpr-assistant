/**
 * Type definitions for Onboarding & Training System
 */

// ===== ONBOARDING & TRAINING SYSTEM =====

export interface OnboardingStatus {
  status: 'not_started' | 'day_1' | 'day_2' | 'day_3' | 'day_4' | 'completed' | 'on_hold';
  currentDay?: number;
  startDate: Date;
  expectedCompletionDate: Date;
  actualCompletionDate?: Date;
  completedTasks: string[]; // Task IDs
  assignedBuddy?: string; // User ID of assigned buddy
  manager: string; // User ID of manager/trainer
  notes?: OnboardingNote[];
  systemAccess: SystemAccessStatus[];
}

export interface OnboardingNote {
  id: string;
  date: Date;
  author: string;
  authorName: string;
  type: 'progress' | 'concern' | 'achievement' | 'system_issue';
  content: string;
  isPrivate?: boolean; // Only visible to managers
}

export interface SystemAccessStatus {
  system: string; // "GDPR Assistant", "Jira", "Confluence", etc.
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'not_requested' | 'requested' | 'pending' | 'granted' | 'denied' | 'revoked' | 'not_applicable';
  requestDate: Date;
  grantedDate?: Date;
  requestedBy: string;
  grantedBy?: string;
  ticketId?: string; // Jira or IT ticket reference
  notes?: string;
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  type: 'self_study' | 'instructor_led' | 'hands_on' | 'assessment' | 'certification';
  category: 'gdpr_basics' | 'incident_response' | 'system_training' | 'compliance' | 'soft_skills';
  targetRole: 'all' | 'gdpr_expert' | 'team_member';
  estimatedDuration: number; // in minutes
  requiredForCertification: boolean;
  prerequisites?: string[]; // Module IDs that must be completed first
  
  // Content
  content?: {
    bridgeModuleId?: string; // Link to Bridge E-Learning
    confluencePages?: string[]; // Page IDs to read
    practicalExercises?: PracticalExercise[];
    assessmentQuestions?: AssessmentQuestion[];
  };
  
  // Tracking
  completionCriteria: {
    readingRequired?: boolean;
    quizMinScore?: number; // Percentage
    practicalAssessment?: boolean;
    managerApproval?: boolean;
  };
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface PracticalExercise {
  id: string;
  title: string;
  description: string;
  type: 'incident_simulation' | 'customer_call' | 'system_navigation' | 'documentation';
  instructions: string[];
  successCriteria: string[];
  timeLimit?: number; // in minutes
  resources?: {
    name: string;
    url: string;
    type: 'confluence' | 'app_link' | 'external';
  }[];
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'free_text';
  options?: string[]; // For choice questions
  correctAnswer: string | string[]; // Correct answer(s)
  explanation?: string; // Shown after answering
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

export interface TrainingProgress {
  userId: string;
  moduleId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  lastActivityAt?: Date;
  
  // Progress Details
  readingProgress?: {
    pagesRead: string[];
    totalPages: number;
    percentage: number;
  };
  
  quizResults?: {
    attempts: QuizAttempt[];
    bestScore: number;
    passed: boolean;
  };
  
  practicalResults?: {
    exerciseId: string;
    completed: boolean;
    feedback?: string;
    assessorId?: string;
    assessorName?: string;
    assessmentDate?: Date;
  }[];
  
  managerNotes?: string;
  managerApproval?: {
    approved: boolean;
    approvedBy: string;
    approvedAt: Date;
    notes?: string;
  };
}

export interface QuizAttempt {
  attemptNumber: number;
  startedAt: Date;
  completedAt?: Date;
  answers: {
    questionId: string;
    answer: string | string[];
    correct: boolean;
  }[];
  score: number; // Percentage
  timeSpent: number; // in seconds
}

export interface Certification {
  id: string;
  name: string; // "GDPR Team Member Certified"
  description: string;
  issuedDate: Date;
  expiryDate?: Date;
  issuedBy: string;
  issuedByName: string;
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
  
  // Requirements met
  requiredModules: string[];
  completedModules: string[];
  finalAssessmentScore?: number;
  
  // Certificate Details
  certificateUrl?: string; // Link to certificate PDF/image
  badgeUrl?: string; // Digital badge
  verificationCode?: string;
  
  isActive: boolean;
}

export interface OnboardingPlan {
  id: string;
  name: string; // "GDPR Team Onboarding"
  description: string;
  targetRole: 'gdpr_expert' | 'team_member';
  estimatedDays: number;
  
  // Days and Tasks
  days: OnboardingDay[];
  
  // Templates
  systemAccessTemplate: SystemAccessRequest[];
  
  isActive: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface OnboardingDay {
  dayNumber: number;
  title: string;
  description: string;
  learningObjectives: string[];
  
  // Sessions
  sessions: OnboardingSession[];
  
  // Success Criteria
  completionCriteria: {
    requiredSessions: string[];
    managerCheckIn: boolean;
    systemAccessRequired: string[];
  };
}

export interface OnboardingSession {
  id: string;
  title: string;
  type: 'setup' | 'reading' | 'training' | 'practical' | 'assessment' | 'meeting';
  timeSlot: 'morning' | 'afternoon' | 'flexible';
  estimatedDuration: number; // in minutes
  
  // Content
  description: string;
  instructor?: string; // User ID, null for self-study
  location?: 'office' | 'online' | 'self_study';
  
  // Resources
  trainingModules?: string[]; // Module IDs
  resources?: {
    name: string;
    url: string;
    type: 'confluence' | 'bridge' | 'app_link' | 'external';
    required: boolean;
  }[];
  
  // Prerequisites
  prerequisites?: string[]; // Session IDs that must be completed first
  systemAccessRequired?: string[];
}

export interface SystemAccessRequest {
  system: string;
  role: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  slaHours: number;
  requestTemplate?: string;
  contactEmail?: string;
  instructions?: string;
}

// Extended UserProfile for onboarding
export interface OnboardingUserProfile {
  // Onboarding & Training
  onboardingStatus?: OnboardingStatus;
  completedTrainings?: string[]; // Training Module IDs
  certifications?: Certification[];
  
  // Profile additions
  department?: 'Legal' | 'Tech' | 'Compliance' | 'Customer Care' | 'Management';
  market?: 'DACH' | 'FR' | 'NORDICS' | 'BNLX' | 'ALL';
  employmentType?: 'full_time' | 'part_time' | 'contractor' | 'intern';
  startDate?: Date;
  
  // Manager/Buddy relationships
  managerId?: string;
  buddyId?: string;
  reportsTo?: string[];
}

export interface GdprSystemConfig {
  id: string;
  name: string;
  organization?: string; // e.g., "HelloFresh", "Factor DE"
  priority: 'critical' | 'high' | 'medium' | 'low';
  slaHours: number;
  description?: string;
  contactInfo?: string;
  accessUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}