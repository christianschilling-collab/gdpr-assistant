'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { 
  PROFICIENCY_CATEGORIES,
  PROFICIENCY_LEVEL_LABELS,
  ProficiencyCategory,
  ProficiencyLevel 
} from '@/lib/types/teams';

export default function SelfEvaluationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentCategory, setCurrentCategory] = useState(0);
  const [evaluations, setEvaluations] = useState<Record<ProficiencyCategory, ProficiencyLevel>>({} as any);
  const [notes, setNotes] = useState<Record<ProficiencyCategory, string>>({} as any);
  const [loading, setLoading] = useState(false);
  const [teamId, setTeamId] = useState('');
  const [clusterId, setClusterId] = useState('');

  const category = PROFICIENCY_CATEGORIES[currentCategory];
  const isLastCategory = currentCategory === PROFICIENCY_CATEGORIES.length - 1;
  const progress = ((currentCategory + 1) / PROFICIENCY_CATEGORIES.length) * 100;

  function handleLevelSelect(level: ProficiencyLevel) {
    setEvaluations(prev => ({ ...prev, [category]: level }));
  }

  function handleNext() {
    if (!evaluations[category]) {
      alert('Please select a proficiency level');
      return;
    }

    if (isLastCategory) {
      handleSubmit();
    } else {
      setCurrentCategory(prev => prev + 1);
    }
  }

  function handleBack() {
    if (currentCategory > 0) {
      setCurrentCategory(prev => prev - 1);
    }
  }

  async function handleSubmit() {
    if (!user) return;

    setLoading(true);
    try {
      // Store in localStorage for demo (will be replaced with Firestore later)
      const evaluationData: Record<string, number> = {};
      PROFICIENCY_CATEGORIES.forEach(cat => {
        evaluationData[cat] = evaluations[cat];
      });
      localStorage.setItem('self-evaluation', JSON.stringify(evaluationData));

      // TODO: In production, submit to Firestore
      // const { submitSelfEvaluation } = await import('@/lib/firebase/userProfiles');
      // await submitSelfEvaluation(user.email!, { ... });

      // Redirect to resource recommendations
      router.push('/onboarding/recommendations');
    } catch (error) {
      console.error('Error submitting self-evaluation:', error);
      alert('Error submitting evaluation. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to continue</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Submitting your evaluation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Skills Self-Evaluation</h1>
          <p className="text-gray-600">
            Help us understand your current AI proficiency to provide personalized recommendations
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Category {currentCategory + 1} of {PROFICIENCY_CATEGORIES.length}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Evaluation Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{category}</h2>
            <p className="text-gray-600">
              {getCategoryDescription(category)}
            </p>
          </div>

          {/* Level Selection */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Select your proficiency level:
            </p>
            
            {([1, 2, 3, 4, 5] as ProficiencyLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => handleLevelSelect(level)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  evaluations[category] === level
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      evaluations[category] === level
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {level}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{PROFICIENCY_LEVEL_LABELS[level]}</div>
                    </div>
                  </div>
                  {evaluations[category] === level && (
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Optional Notes */}
          {evaluations[category] && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes[category] || ''}
                onChange={(e) => setNotes(prev => ({ ...prev, [category]: e.target.value }))}
                placeholder="Any specific context about your experience with this skill?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={currentCategory === 0}
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back
          </button>

          <div className="flex gap-2">
            {PROFICIENCY_CATEGORIES.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index < currentCategory
                    ? 'bg-blue-600'
                    : index === currentCategory
                    ? 'bg-blue-400'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={!evaluations[category]}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLastCategory ? 'Complete Evaluation →' : 'Next →'}
          </button>
        </div>

        {/* Skip Option */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip for now (you can complete this later)
          </button>
        </div>
      </div>
    </div>
  );
}

function getCategoryDescription(category: ProficiencyCategory): string {
  const descriptions: Record<ProficiencyCategory, string> = {
    'Prompt Engineering': 'Ability to craft effective prompts for AI models like ChatGPT, Gemini, or Claude to get desired outputs.',
    'AI Tools Usage': 'Familiarity with AI tools and platforms (ChatGPT, Gemini, Midjourney, GitHub Copilot, etc.).',
    'Data Privacy & Ethics': 'Understanding of data privacy concerns, ethical AI usage, and GDPR compliance when using AI.',
    'Use Case Identification': 'Ability to identify opportunities where AI can improve workflows or solve business problems.',
    'Coding with AI': 'Using AI assistants like GitHub Copilot, Cursor, or ChatGPT to write, debug, or improve code.',
  };
  return descriptions[category];
}
