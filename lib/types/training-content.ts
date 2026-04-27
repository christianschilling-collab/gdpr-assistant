/**
 * Training Content Management Types
 */

// Training Module Types
export interface TrainingContent {
  id: string;
  title: string;
  description: string;
  type: 'classification_tree' | 'queue_dashboard' | 'escalation_assistant' | 'certification' | 'custom';
  category: 'fundamentals' | 'tools' | 'processes' | 'practice';
  day?: number; // Which training day this belongs to
  isActive: boolean;
  content: any; // Flexible content structure
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Classification Tree specific types
export interface DecisionTreeContent {
  nodes: Record<string, DecisionNode>;
  startNodeId: string;
  metadata: {
    version: string;
    lastUpdated: Date;
    source: string; // e.g., "GDPR Team Hub"
  };
}

export interface DecisionNode {
  id: string;
  question: string;
  explanation?: string;
  options: DecisionOption[];
}

export interface DecisionOption {
  text: string;
  nextId?: string;
  result?: ClassificationResult;
}

export interface ClassificationResult {
  type: string;
  description: string;
  actions: string[];
  tools: string[];
  sla?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

// Queue Dashboard specific types
export interface QueueDashboardContent {
  checklist: ChecklistSection[];
  sampleQueue: QueueItem[];
  workflows: WorkflowStep[];
}

export interface ChecklistSection {
  id: string;
  title: string;
  category: 'morning' | 'ongoing' | 'evening';
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  tools: string[];
  estimatedTime?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface QueueItem {
  id: string;
  type: 'deletion' | 'dsar' | 'complaint' | 'ad_revocation' | 'special_case';
  description: string;
  priority: 'high' | 'medium' | 'low';
  sla: string;
  status: 'pending' | 'in_progress' | 'completed' | 'escalated';
  dueDate: Date;
  source: string;
}

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  order: number;
  tools: string[];
  timeEstimate: string;
}

// Escalation Assistant specific types
export interface EscalationContent {
  pocDirectory: POC[];
  scenarios: EscalationScenario[];
  criteria: EscalationCriteria[];
}

export interface POC {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone?: string;
  specialties: string[];
  markets: string[];
  escalationType: string[];
  availability: 'always' | 'business_hours' | 'emergency_only';
  isActive: boolean;
}

export interface EscalationScenario {
  id: string;
  title: string;
  description: string;
  criteria: string[];
  recommendedPOCs: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  maxResponseTime: string;
  tools: string[];
  examples?: string[];
}

export interface EscalationCriteria {
  id: string;
  condition: string;
  action: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  responsibleRole: string[];
}

// Certification specific types
export interface CertificationContent {
  modules: CertificationModule[];
  passingScore: number;
  retakePolicy: {
    allowRetakes: boolean;
    maxRetakes?: number;
    waitPeriod?: string; // e.g., "24 hours"
  };
}

export interface CertificationModule {
  id: string;
  title: string;
  description: string;
  day: number;
  questions: CertificationQuestion[];
  timeLimit?: number; // in minutes
  requiredScore: number;
}

export interface CertificationQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'scenario';
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string; // e.g., "classification", "tools", "process"
}

// Admin Content Management
export interface ContentTemplate {
  id: string;
  name: string;
  type: TrainingContent['type'];
  template: any; // JSON template structure
  description: string;
  isDefault: boolean;
}