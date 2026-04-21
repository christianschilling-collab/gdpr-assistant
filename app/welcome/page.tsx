'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { LoginButton } from '@/components/LoginButton';
import Link from 'next/link';

export default function WelcomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Redirect logic based on user state
    if (!loading && user) {
      // Check if user needs onboarding
      checkUserOnboardingStatus();
    }
  }, [user, loading]);

  async function checkUserOnboardingStatus() {
    if (!user) return;
    
    try {
      // Import dynamically to avoid SSR issues
      const { getUserProfile } = await import('@/lib/firebase/userProfiles');
      const profile = await getUserProfile(user.email!);
      
      if (!profile) {
        // New user - needs profile creation
        router.push('/onboarding/self-evaluation');
      } else if (!profile.hasCompletedSelfEvaluation) {
        // Has profile but no self-evaluation
        router.push('/onboarding/self-evaluation');
      } else if (profile.teams.length === 0) {
        // Has evaluation but no team
        router.push('/onboarding/join-team');
      } else {
        // All set - go to dashboard
        router.push(`/clusters/${profile.clusters[0]}/teams/${profile.teams[0]}/dashboard`);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">AI</span>
            </div>
            <span className="text-xl font-bold text-gray-900">AI Trailblazers</span>
          </div>
          <LoginButton />
        </div>
      </div>

      {/* Hero Section */}
      <div className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                AI Trailblazers
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              HelloFresh's AI upskilling platform for Customer Care teams. Track your progress, 
              share resources, and grow your AI capabilities together.
            </p>
            
            {!user && (
              <div className="inline-block">
                <LoginButton />
                <p className="text-sm text-gray-500 mt-4">
                  Sign in with your @hellofresh.com email
                </p>
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Track Your Progress</h3>
              <p className="text-gray-600">
                Self-evaluate your AI skills, track improvements over time, and see how you compare to your team.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Personalized Resources</h3>
              <p className="text-gray-600">
                Get AI learning resources tailored to your skill level. From beginner tutorials to advanced workflows.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Team Collaboration</h3>
              <p className="text-gray-600">
                Share AI projects, workshops, and best practices across Customer Care teams.
              </p>
            </div>
          </div>

          {/* How It Works */}
          <div className="mt-20 bg-white rounded-2xl p-12 shadow-lg">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              How It Works
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Sign In</h3>
                <p className="text-gray-600 text-sm">
                  Use your HelloFresh Google account to get started
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Self-Evaluate</h3>
                <p className="text-gray-600 text-sm">
                  Quick 5-minute assessment of your current AI skills
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Join Your Team</h3>
                <p className="text-gray-600 text-sm">
                  Connect with your team lead and start learning
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-pink-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  4
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Grow Together</h3>
                <p className="text-gray-600 text-sm">
                  Track progress, attend workshops, share knowledge
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          {!user && (
            <div className="mt-20 text-center">
              <div className="inline-flex flex-col items-center gap-4">
                <LoginButton />
                <p className="text-gray-600">
                  Ready to start your AI journey?
                </p>
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="mt-20 text-center text-sm text-gray-500">
            <p>
              Part of the <strong>Customer Care Cluster</strong> AI upskilling initiative
            </p>
            <p className="mt-2">
              Questions? Contact{' '}
              <a href="mailto:christian.schilling@hellofresh.de" className="text-blue-600 hover:underline">
                christian.schilling@hellofresh.de
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
