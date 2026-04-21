/**
 * Pre-built Training Templates
 */

import { TrainingTemplate } from '../types';

// Default templates that are always available
export const DEFAULT_TEMPLATES: Omit<TrainingTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'New Agent Onboarding',
    description: 'Complete training package for new agents - includes all 8 error categories',
    categoryIds: [
      'incorrect-identification',
      'missing-verification',
      'wrong-response-template',
      'incomplete-data-request',
      'privacy-violation',
      'timeline-violation',
      'incorrect-data-format',
      'missing-follow-up',
    ],
    isDefault: true,
  },
  {
    name: 'Common Mistakes Refresher',
    description: 'Top 3 most common error categories for quick refresher training',
    categoryIds: [
      'incorrect-identification',
      'missing-verification',
      'wrong-response-template',
    ],
    isDefault: true,
  },
  {
    name: 'Monthly Refresher',
    description: 'Standard monthly refresher covering all categories',
    categoryIds: [
      'incorrect-identification',
      'missing-verification',
      'wrong-response-template',
      'incomplete-data-request',
      'privacy-violation',
      'timeline-violation',
      'incorrect-data-format',
      'missing-follow-up',
    ],
    isDefault: true,
  },
  {
    name: 'Data Request Focus',
    description: 'Training focused on data request handling',
    categoryIds: [
      'incomplete-data-request',
      'incorrect-data-format',
      'missing-verification',
    ],
    isDefault: true,
  },
  {
    name: 'Privacy & Compliance',
    description: 'Training focused on privacy violations and compliance',
    categoryIds: [
      'privacy-violation',
      'timeline-violation',
      'missing-follow-up',
    ],
    isDefault: true,
  },
];
