/**
 * AI Trailblazers - Resource Recommendations Engine
 * Generates personalized resource recommendations based on proficiency levels
 */

import { 
  ProficiencyLevel, 
  ProficiencyCategory, 
  Resource,
  ResourceSkillLevel 
} from '../types/teams';

export interface ResourceRecommendation {
  resource: Resource;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Get recommended skill level based on proficiency level
 */
export function getRecommendedSkillLevel(proficiencyLevel: ProficiencyLevel): ResourceSkillLevel {
  if (proficiencyLevel <= 2) return 'beginner';
  if (proficiencyLevel === 3) return 'intermediate';
  return 'advanced';
}

/**
 * Get resource recommendations based on user's proficiency evaluation
 */
export function getResourceRecommendations(
  proficiencyLevels: Record<ProficiencyCategory, ProficiencyLevel>,
  allResources: Resource[]
): Record<ProficiencyCategory, ResourceRecommendation[]> {
  const recommendations: Record<string, ResourceRecommendation[]> = {};

  // For each category, find matching resources
  Object.entries(proficiencyLevels).forEach(([category, level]) => {
    const recommendedLevel = getRecommendedSkillLevel(level);
    
    // Find resources matching category and skill level
    const matchingResources = allResources.filter(resource => 
      resource.category === category && 
      resource.skillLevel === recommendedLevel &&
      resource.visibility === 'public' // Only recommend public resources during onboarding
    );

    // Sort by creation date (newest first) and take top 5
    const topResources = matchingResources
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    recommendations[category] = topResources.map(resource => ({
      resource,
      reason: getRecommendationReason(level, recommendedLevel),
      priority: getRecommendationPriority(level),
    }));
  });

  return recommendations as Record<ProficiencyCategory, ResourceRecommendation[]>;
}

/**
 * Get recommendation reason based on proficiency level
 */
function getRecommendationReason(
  level: ProficiencyLevel,
  skillLevel: ResourceSkillLevel
): string {
  if (level === 1) {
    return 'Perfect for getting started - no prior experience needed';
  }
  if (level === 2) {
    return 'Build practical skills with beginner-friendly tutorials';
  }
  if (level === 3) {
    return 'Take your skills to the next level with intermediate content';
  }
  if (level === 4) {
    return 'Deepen your expertise with advanced techniques';
  }
  return 'Master advanced workflows and train others';
}

/**
 * Get recommendation priority based on proficiency level
 */
function getRecommendationPriority(level: ProficiencyLevel): 'high' | 'medium' | 'low' {
  if (level <= 2) return 'high'; // Beginners need most help
  if (level === 3) return 'medium'; // Intermediate users benefit from guidance
  return 'low'; // Advanced users can self-direct
}

/**
 * Default/starter resources (pre-populated for onboarding)
 * These should be seeded into Firestore via migration script
 */
export const DEFAULT_RESOURCES: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Prompt Engineering - Beginner
  {
    title: 'Intro to Prompt Engineering',
    url: 'https://platform.openai.com/docs/guides/prompt-engineering',
    description: 'Official OpenAI guide to crafting effective prompts',
    category: 'Prompt Engineering',
    skillLevel: 'beginner',
    type: 'documentation',
    visibility: 'public',
    addedBy: 'system',
    tags: ['prompts', 'basics', 'openai'],
    estimatedTime: 20,
    language: 'en',
  },
  {
    title: 'ChatGPT Prompt Engineering for Beginners',
    url: 'https://www.youtube.com/watch?v=jC4v5AS4RIM',
    description: 'Video tutorial covering prompt basics and examples',
    category: 'Prompt Engineering',
    skillLevel: 'beginner',
    type: 'video',
    visibility: 'public',
    addedBy: 'system',
    tags: ['prompts', 'chatgpt', 'tutorial'],
    estimatedTime: 30,
    language: 'en',
  },
  
  // Prompt Engineering - Intermediate
  {
    title: 'Advanced Prompt Techniques',
    url: 'https://www.promptingguide.ai/techniques',
    description: 'Chain-of-thought, few-shot learning, and more',
    category: 'Prompt Engineering',
    skillLevel: 'intermediate',
    type: 'documentation',
    visibility: 'public',
    addedBy: 'system',
    tags: ['prompts', 'advanced', 'techniques'],
    estimatedTime: 45,
    language: 'en',
  },
  
  // Prompt Engineering - Advanced
  {
    title: 'Building Custom GPTs',
    url: 'https://platform.openai.com/docs/guides/gpts',
    description: 'Create specialized AI assistants with custom instructions',
    category: 'Prompt Engineering',
    skillLevel: 'advanced',
    type: 'tutorial',
    visibility: 'public',
    addedBy: 'system',
    tags: ['gpts', 'custom', 'advanced'],
    estimatedTime: 60,
    language: 'en',
  },

  // AI Tools Usage - Beginner
  {
    title: 'ChatGPT Basics for Beginners',
    url: 'https://openai.com/chatgpt',
    description: 'Getting started with ChatGPT',
    category: 'AI Tools Usage',
    skillLevel: 'beginner',
    type: 'documentation',
    visibility: 'public',
    addedBy: 'system',
    tags: ['chatgpt', 'basics'],
    estimatedTime: 15,
    language: 'en',
  },
  {
    title: 'Google Gemini Introduction',
    url: 'https://gemini.google.com/faq',
    description: 'Overview of Google Gemini capabilities',
    category: 'AI Tools Usage',
    skillLevel: 'beginner',
    type: 'documentation',
    visibility: 'public',
    addedBy: 'system',
    tags: ['gemini', 'google', 'basics'],
    estimatedTime: 15,
    language: 'en',
  },

  // AI Tools Usage - Intermediate
  {
    title: 'Gemini 2.0 Best Practices',
    url: 'https://ai.google.dev/gemini-api/docs/thinking-mode',
    description: 'Advanced features and thinking mode',
    category: 'AI Tools Usage',
    skillLevel: 'intermediate',
    type: 'documentation',
    visibility: 'public',
    addedBy: 'system',
    tags: ['gemini', 'advanced', 'api'],
    estimatedTime: 30,
    language: 'en',
  },

  // Data Privacy & Ethics - Beginner
  {
    title: 'AI Ethics 101',
    url: 'https://www.ibm.com/topics/ai-ethics',
    description: 'Introduction to ethical AI usage',
    category: 'Data Privacy & Ethics',
    skillLevel: 'beginner',
    type: 'article',
    visibility: 'public',
    addedBy: 'system',
    tags: ['ethics', 'privacy', 'basics'],
    estimatedTime: 20,
    language: 'en',
  },
  {
    title: 'GDPR and AI: What You Need to Know',
    url: 'https://gdpr.eu/artificial-intelligence/',
    description: 'How GDPR applies to AI usage',
    category: 'Data Privacy & Ethics',
    skillLevel: 'beginner',
    type: 'article',
    visibility: 'public',
    addedBy: 'system',
    tags: ['gdpr', 'privacy', 'compliance'],
    estimatedTime: 25,
    language: 'en',
  },

  // Use Case Identification - Beginner
  {
    title: 'Identifying AI Opportunities in Your Workflow',
    url: 'https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai',
    description: 'Framework for finding AI use cases',
    category: 'Use Case Identification',
    skillLevel: 'beginner',
    type: 'article',
    visibility: 'public',
    addedBy: 'system',
    tags: ['use-cases', 'strategy', 'framework'],
    estimatedTime: 30,
    language: 'en',
  },

  // Coding with AI - Beginner
  {
    title: 'GitHub Copilot Quick Start',
    url: 'https://docs.github.com/en/copilot/quickstart',
    description: 'Get started with AI-powered coding',
    category: 'Coding with AI',
    skillLevel: 'beginner',
    type: 'documentation',
    visibility: 'public',
    addedBy: 'system',
    tags: ['copilot', 'coding', 'github'],
    estimatedTime: 20,
    language: 'en',
  },
  {
    title: 'Cursor AI Editor Tutorial',
    url: 'https://cursor.sh/docs',
    description: 'AI-first code editor for developers',
    category: 'Coding with AI',
    skillLevel: 'beginner',
    type: 'documentation',
    visibility: 'public',
    addedBy: 'system',
    tags: ['cursor', 'coding', 'editor'],
    estimatedTime: 25,
    language: 'en',
  },

  // Coding with AI - Intermediate
  {
    title: 'Advanced GitHub Copilot Techniques',
    url: 'https://github.blog/2023-06-20-how-to-write-better-prompts-for-github-copilot/',
    description: 'Write better prompts for code generation',
    category: 'Coding with AI',
    skillLevel: 'intermediate',
    type: 'article',
    visibility: 'public',
    addedBy: 'system',
    tags: ['copilot', 'advanced', 'prompts'],
    estimatedTime: 30,
    language: 'en',
  },
];

/**
 * Filter recommendations by priority
 */
export function getHighPriorityRecommendations(
  recommendations: Record<ProficiencyCategory, ResourceRecommendation[]>
): ResourceRecommendation[] {
  const allRecommendations: ResourceRecommendation[] = [];
  
  Object.values(recommendations).forEach(categoryRecs => {
    allRecommendations.push(...categoryRecs);
  });
  
  return allRecommendations
    .filter(rec => rec.priority === 'high')
    .slice(0, 10); // Top 10 high-priority recommendations
}
