'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to cases (dashboard is now integrated there)
    router.push('/cases');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to Cases...</p>
      </div>
    </div>
  );
}

function DashboardPageOld() {
  const [cases, setCases] = useState<GDPRCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateCount, setTemplateCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [casesData, templatesData] = await Promise.all([
        getCases(),
        getTemplates()
      ]);
      setCases(casesData);
      setTemplateCount(templatesData.length);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate statistics
  const stats = {
    total: cases.length,
    new: cases.filter(c => c.status === 'New').length,
    underReview: cases.filter(c => c.status === 'Under Review').length,
    resolved: cases.filter(c => c.status === 'Resolved').length,
    high: cases.filter(c => c.urgency === 'High').length,
    aiClassified: cases.filter(c => c.classificationMethod === 'ai').length,
    gmail: cases.filter(c => c.isGmail).length,
  };

  // Recent cases (last 5)
  const recentCases = cases
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  // Cases by market
  const casesByMarket = cases.reduce((acc, c) => {
    acc[c.market] = (acc[c.market] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Cases by team member
  const casesByAgent = cases.reduce((acc, c) => {
    acc[c.teamMember] = (acc[c.teamMember] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-32"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Overview of your GDPR case management system</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Cases */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Total Cases</h3>
              <span className="text-2xl">📋</span>
            </div>
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-xs opacity-75 mt-1">{templateCount} templates available</p>
          </div>

          {/* New Cases */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">New Cases</h3>
              <span className="text-2xl">🆕</span>
            </div>
            <p className="text-3xl font-bold">{stats.new}</p>
            <p className="text-xs opacity-75 mt-1">
              {((stats.new / stats.total) * 100 || 0).toFixed(0)}% of total
            </p>
          </div>

          {/* Under Review */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Under Review</h3>
              <span className="text-2xl">⏳</span>
            </div>
            <p className="text-3xl font-bold">{stats.underReview}</p>
            <p className="text-xs opacity-75 mt-1">{stats.high} high urgency</p>
          </div>

          {/* Resolved */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Resolved</h3>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-3xl font-bold">{stats.resolved}</p>
            <p className="text-xs opacity-75 mt-1">
              {((stats.resolved / stats.total) * 100 || 0).toFixed(0)}% success rate
            </p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Cases - Takes 2 columns */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Recent Cases</h2>
              <Link
                href="/cases"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All →
              </Link>
            </div>
            {recentCases.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No cases yet. Create your first case!</p>
            ) : (
              <div className="space-y-3">
                {recentCases.map(c => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="block p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{c.caseId}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            c.status === 'New' ? 'bg-green-100 text-green-800' :
                            c.status === 'Under Review' ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {c.status}
                          </span>
                          {c.urgency === 'High' && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-medium">
                              🔴 High
                            </span>
                          )}
                          {c.isGmail && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              📧 Gmail
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1">
                          {c.caseDescription.substring(0, 100)}...
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>👨‍💼 {c.teamMember}</span>
                          <span>•</span>
                          <span>🌍 {c.market}</span>
                          <span>•</span>
                          <span>📅 {new Date(c.timestamp).toLocaleDateString('de-DE')}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Stats Sidebar - Takes 1 column */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">AI Classified</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {stats.aiClassified} ({((stats.aiClassified / stats.total) * 100 || 0).toFixed(0)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Gmail Cases</span>
                  <span className="text-sm font-semibold text-gray-900">{stats.gmail}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">High Priority</span>
                  <span className="text-sm font-semibold text-red-600">{stats.high}</span>
                </div>
              </div>
            </div>

            {/* Cases by Market */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">By Market</h3>
              <div className="space-y-2">
                {Object.entries(casesByMarket)
                  .sort(([, a], [, b]) => b - a)
                  .map(([market, count]) => (
                    <div key={market} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{market}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${(count / stats.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Top Agents */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top Agents</h3>
              <div className="space-y-2">
                {Object.entries(casesByAgent)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([agent, count], idx) => (
                    <div key={agent} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                        <span className="text-sm text-gray-700">{agent}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link
              href="/cases/new"
              className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
            >
              <span className="text-2xl mb-2 block">➕</span>
              <span className="font-semibold">Create New Case</span>
            </Link>
            <Link
              href="/templates"
              className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md"
            >
              <span className="text-2xl mb-2 block">📄</span>
              <span className="font-semibold">Manage Templates</span>
            </Link>
            <Link
              href="/training"
              className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md"
            >
              <span className="text-2xl mb-2 block">📚</span>
              <span className="font-semibold">Training Materials</span>
            </Link>
            <Link
              href="/analytics"
              className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-md"
            >
              <span className="text-2xl mb-2 block">📊</span>
              <span className="font-semibold">View Analytics</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
