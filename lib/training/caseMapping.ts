/**
 * Map Case Errors to Training Categories
 * 
 * Provides recommendations for training based on case characteristics
 */

import { GDPRCase } from '../types';
import { TrainingErrorCategory } from '../types';
import { ERROR_CATEGORIES } from './categories';

/**
 * Get recommended training categories based on case
 */
export function getRecommendedTrainingCategories(
  caseData: GDPRCase
): string[] {
  const recommendations: string[] = [];

  // If case has review flag, recommend general training
  if (caseData.reviewFlag) {
    // Add all categories for review-flagged cases
    recommendations.push(...ERROR_CATEGORIES.map((cat) => cat.id));
  }

  // Map based on primary category
  if (caseData.primaryCategory) {
    const categoryLower = caseData.primaryCategory.toLowerCase();

    // Map case categories to training categories
    if (categoryLower.includes('identification') || categoryLower.includes('verify')) {
      recommendations.push('incorrect-identification');
    }
    if (categoryLower.includes('data') && (categoryLower.includes('scope') || categoryLower.includes('export'))) {
      recommendations.push('wrong-data-scope');
    }
    if (categoryLower.includes('verification') || categoryLower.includes('verify')) {
      recommendations.push('missing-verification');
    }
    if (categoryLower.includes('template') || categoryLower.includes('response')) {
      recommendations.push('wrong-response-template');
    }
    if (categoryLower.includes('incomplete') || categoryLower.includes('missing')) {
      recommendations.push('incomplete-data-request');
    }
    if (categoryLower.includes('privacy') || categoryLower.includes('consent')) {
      recommendations.push('privacy-violation');
    }
    if (categoryLower.includes('timeline') || categoryLower.includes('deadline')) {
      recommendations.push('timeline-violation');
    }
    if (categoryLower.includes('format') || categoryLower.includes('structure')) {
      recommendations.push('incorrect-data-format');
    }
    if (categoryLower.includes('follow') || categoryLower.includes('confirm')) {
      recommendations.push('missing-follow-up');
    }
  }

  // If low confidence, recommend verification training
  if (caseData.confidence && caseData.confidence < 0.7) {
    recommendations.push('missing-verification');
  }

  // Remove duplicates
  return Array.from(new Set(recommendations));
}

/**
 * Get training recommendation message
 */
export function getTrainingRecommendationMessage(
  caseData: GDPRCase,
  categories: TrainingErrorCategory[]
): string {
  const recommendedIds = getRecommendedTrainingCategories(caseData);
  
  if (recommendedIds.length === 0) {
    return 'No specific training recommendations for this case.';
  }

  const recommendedCategories = categories.filter((cat) =>
    recommendedIds.includes(cat.id)
  );

  if (recommendedCategories.length === 0) {
    return 'Training recommendations available.';
  }

  if (recommendedCategories.length === 1) {
    return `Based on this case, we recommend reviewing: ${recommendedCategories[0].title}`;
  }

  return `Based on this case, we recommend reviewing ${recommendedCategories.length} training categories.`;
}
