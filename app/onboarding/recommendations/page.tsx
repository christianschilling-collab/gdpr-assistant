'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { 
  ProficiencyCategory, 
  Resource,
  Proficiency
} from '@/lib/types/teams';
import { 
  getResourceRecommendations, 
  getHighPriorityRecommendations,
  DEFAULT_RESOURCES 
} from '@/lib/recommendations/resourceRecommendations';
import Link from 'next/link';

export default function RecommendationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Record<ProficiencyCategory, any[]>>({} as any);
  const [proficiencyLevels, setProficiencyLevels] = useState<Record<ProficiencyCategory, number>>({} as any);
  const [savedResources, setSavedResources] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user]);

  async function loadRecommendations() {
    if (!user) return;

    try {
      setLoading(true);
      
      // For demo purposes, use localStorage to get proficiency from self-evaluation
      // In production, this would come from Firestore
      const storedEvaluation = localStorage.getItem('self-evaluation');
      
      if (!storedEvaluation) {
        // No evaluation found, redirect back
        router.push('/onboarding/self-evaluation');
        return;
      }

      const evaluation = JSON.parse(storedEvaluation);
      setProficiencyLevels(evaluation);

      // Use default resources for demo
      // In production: load from Firestore
      const allResources: Resource[] = DEFAULT_RESOURCES.map((r, idx) => ({
        ...r,
        id: `resource-${idx}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const recs = getResourceRecommendations(evaluation, allResources);
      setRecommendations(recs);

    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveResource(resourceId: string) {
    setSavedResources(prev => new Set(prev).add(resourceId));
    // In production: call saveResource(user.email, resourceId)
  }

  async function handleContinue() {
    // In production: redirect to team join or dashboard
    router.push('/welcome');
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
          <p className="text-gray-600">Generating your personalized recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Personalized Learning Path</h1>
          <p className="text-gray-600">
            Based on your self-evaluation, here are resources tailored to your skill level
          </p>
        </div>

        {/* Recommendations by Category */}
        <div className="space-y-8 mb-12">
          {Object.entries(recommendations).map(([category, recs]) => {
            if (recs.length === 0) return null;

            return (
              <div key={category} className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{category}</h2>
                    <p className="text-gray-600 text-sm mt-1">
                      Your level: {proficiencyLevels[category as ProficiencyCategory]}/5
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${
                          i <= proficiencyLevels[category as ProficiencyCategory]
                            ? 'bg-blue-600'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {recs.slice(0, 3).map((rec: any) => (
                    <div
                      key={rec.resource.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-gray-900">{rec.resource.title}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              rec.priority === 'high'
                                ? 'bg-red-100 text-red-700'
                                : rec.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {rec.priority} priority
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {rec.resource.type}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{rec.resource.description}</p>
                          <p className="text-blue-600 text-sm italic">{rec.reason}</p>
                          {rec.resource.estimatedTime && (
                            <p className="text-gray-500 text-xs mt-1">
                              ⏱ ~{rec.resource.estimatedTime} minutes
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <a
                            href={rec.resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
                          >
                            Open →
                          </a>
                          <button
                            onClick={() => handleSaveResource(rec.resource.id)}
                            disabled={savedResources.has(rec.resource.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                              savedResources.has(rec.resource.id)
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {savedResources.has(rec.resource.id) ? '✓ Saved' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 text-white text-center mb-8">
          <h3 className="text-2xl font-bold mb-2">Ready to Start Learning?</h3>
          <p className="mb-6 opacity-90">
            You can always find these resources in your dashboard. They'll update as your skills grow!
          </p>
          <button
            onClick={handleContinue}
            className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-bold text-lg"
          >
            Continue to Dashboard
          </button>
        </div>

        {/* Info */}
        <div className="text-center text-sm text-gray-600">
          <p>
            More resources will be added regularly. Check back often!
          </p>
        </div>
      </div>
    </div>
  );
}
