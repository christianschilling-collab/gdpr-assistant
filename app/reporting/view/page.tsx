'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getWeeklyReports, getActivityLog } from '@/lib/firebase/weeklyReports';
import { generateTrainingReport } from '@/lib/firebase/trainingCases';
import { WeeklyReport, ActivityLogEntry } from '@/lib/types';
import { TrainingReport } from '@/lib/types/training';
import { MarketDeepDive } from '@/lib/types/marketDeepDive';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/lib/contexts/AuthContext';
import { LoginButton } from '@/components/LoginButton';
import { useToast } from '@/lib/contexts/ToastContext';
import { buildMergedMarketDeepDive } from '@/lib/reporting/marketDeepDiveMerge';
import {
  calculateMonthlySummary,
  extractHighlights,
  formatMonthDisplay,
  getMarketBreakdown,
  getMarketStatusData,
  getGreenMarkets,
} from '@/lib/reporting/reportMetrics';
import { generateMonthlySummaryHTML, translateErrorDescription } from '@/lib/reporting/gdprEmailReport';

type ViewMode = 'week' | 'month';

export default function ReportingPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [trainingReport, setTrainingReport] = useState<TrainingReport | null>(null);
  const [marketDeepDive, setMarketDeepDive] = useState<MarketDeepDive | null>(null);
  const [previousMonthDeepDive, setPreviousMonthDeepDive] = useState<MarketDeepDive | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());

  useEffect(() => {
    // Only load data if user is authenticated
    if (user) {
      loadData();
    }
  }, [selectedMonth, user]);

  const loadData = async () => {
    try {
      const [reportsData, activityData] = await Promise.all([
        getWeeklyReports(),
        getActivityLog(),
      ]);
      setReports(reportsData);
      setActivityLog(activityData);

      // Load training report for the selected month
      try {
        const [year, month] = selectedMonth.split('-').map(Number);
        const prevDate = new Date(year, month - 2, 1);
        const previousMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
        const trainingData = await generateTrainingReport(selectedMonth, previousMonth);
        setTrainingReport(trainingData);
      } catch (err) {
        console.log('No training data available for this month');
        setTrainingReport(null);
      }

      try {
        const prevMonthKey = getPreviousMonth(selectedMonth);
        const [currentDive, prevDive] = await Promise.all([
          buildMergedMarketDeepDive(selectedMonth),
          buildMergedMarketDeepDive(prevMonthKey),
        ]);
        setMarketDeepDive(currentDive);
        setPreviousMonthDeepDive(prevDive);
      } catch (error) {
        console.warn('Market Deep Dive not available:', error);
        setMarketDeepDive(null);
        setPreviousMonthDeepDive(null);
      }
    } catch (error) {
      console.error('Error loading reporting data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get current month in YYYY-MM format
  function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // Filter reports based on view mode and selected period
  const filteredReports = reports.filter(report => {
    if (selectedMarket !== 'all' && report.market !== selectedMarket) return false;
    
    if (viewMode === 'month') {
      const reportMonth = formatMonthKey(report.weekOf);
      return reportMonth === selectedMonth;
    }
    
    return true;
  });

  // Calculate Monthly Summary
  const monthlySummary = calculateMonthlySummary(filteredReports, selectedMonth);
  
  // Get previous month for comparison
  const previousMonth = getPreviousMonth(selectedMonth);
  const previousMonthReports = reports.filter(r => formatMonthKey(r.weekOf) === previousMonth);
  const previousMonthlySummary = calculateMonthlySummary(previousMonthReports, previousMonth);

  // Calculate Highlights & Lowlights
  const highlights = extractHighlights(filteredReports, activityLog.filter(a => formatMonthKey(a.weekOf) === selectedMonth));

  // Prepare chart data
  const trendsData = prepareTrendsData(reports, selectedMonth);

  // Filter activity log
  const filteredActivityLog = activityLog.filter(entry => {
    if (selectedMarket !== 'all' && entry.market !== selectedMarket) return false;
    if (viewMode === 'month') {
      return formatMonthKey(entry.weekOf) === selectedMonth;
    }
    return true;
  });

  async function copyActivityLog(activities: ActivityLogEntry[]) {
    const text = generateActivityLogText(activities);
    await navigator.clipboard.writeText(text);
    showToast('Activity log copied to clipboard.');
  }

  function formatMonthKey(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function getPreviousMonth(monthKey: string): string {
    const [year, month] = monthKey.split('-').map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
  }

  function getNextMonth(monthKey: string): string {
    const [year, month] = monthKey.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
  }

  async function copyMonthlySummary() {
    const htmlSummary = generateMonthlySummaryHTML(
      monthlySummary,
      previousMonthlySummary,
      highlights,
      selectedMonth,
      filteredReports,
      filteredActivityLog,
      trainingReport,
      marketDeepDive,
      previousMonthDeepDive
    );

    const blob = new Blob([htmlSummary], { type: 'text/html' });
    const data = [new ClipboardItem({ 'text/html': blob })];

    try {
      await navigator.clipboard.write(data);
      showToast('GDPR report copied. Paste directly into your email.');
    } catch (err) {
      await navigator.clipboard.writeText(htmlSummary);
      showToast('HTML copied as plain text. Paste into your email (HTML mode).', 'info');
    }
  }

  function exportCSV() {
    const csv = generateCSV(filteredReports);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gdpr-report-${selectedMonth}.csv`;
    a.click();
  }

  // Show auth loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-16 h-16 mx-auto mb-4">
              <path d="M50 2 L92 20 L92 48 Q92 75 50 98 Q8 75 8 48 L8 20 Z" fill="#91C11E"/>
              <path d="M30 50 L43 65 L72 32" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">GDPR Reporting Dashboard</h1>
            <p className="text-gray-600">Sign in to access reporting data</p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 mb-4">
              This dashboard requires authentication with a HelloFresh Google account.
            </p>
            <LoginButton />
          </div>

          <p className="text-xs text-gray-500">
            If you don't have access, please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reporting data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header - No Navigation */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-10 h-10">
              <path d="M50 2 L92 20 L92 48 Q92 75 50 98 Q8 75 8 48 L8 20 Z" fill="#91C11E"/>
              <path d="M30 50 L43 65 L72 32" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">GDPR Reporting Dashboard</h1>
              <p className="text-gray-600 mt-1">HelloFresh - European Markets Overview</p>
              <p className="mt-2 text-sm">
                <Link href="/reporting/submit" className="text-emerald-700 font-medium hover:underline">
                  Submit weekly market data (sign-in required)
                </Link>
              </p>
            </div>
          </div>
        </div>

      {/* View Mode Toggle & Month Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          {/* View Mode */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Week View
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                viewMode === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Month View
            </button>
          </div>

          {/* Month Selector (only show in month view) */}
          {viewMode === 'month' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedMonth(getPreviousMonth(selectedMonth))}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                ◀
              </button>
              <span className="font-semibold text-gray-900 min-w-[150px] text-center">
                {formatMonthDisplay(selectedMonth)}
              </span>
              <button
                onClick={() => setSelectedMonth(getNextMonth(selectedMonth))}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                ▶
              </button>
            </div>
          )}

          {/* Market Filter */}
          <div>
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Markets</option>
              <option value="DACH">DACH</option>
              <option value="France">France</option>
              <option value="Nordics">Nordics</option>
              <option value="NL">NL</option>
              <option value="Be / Lux">Be / Lux</option>
            </select>
          </div>
        </div>
      </div>

      {/* Monthly Summary Section */}
      {viewMode === 'month' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">📊 Monthly Summary</h2>
              <p className="text-gray-600 text-sm mt-1">{formatMonthDisplay(selectedMonth)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyMonthlySummary}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
              >
                📋 Copy Summary
              </button>
              <button
                onClick={exportCSV}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
              >
                📥 Export CSV
              </button>
            </div>
          </div>

          {/* Textual Summary */}
          <div className="bg-white rounded-lg p-4 mb-4 border border-blue-200">
            <p className="text-gray-800 leading-relaxed">
              {generateTextualSummary(monthlySummary, previousMonthlySummary, filteredReports, selectedMonth)}
            </p>
          </div>

          {/* Market Breakdown Table */}
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Market</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Deletion Requests</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Portability Requests</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Legal Support</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {getMarketBreakdown(filteredReports).map((market) => (
                  <tr key={market.market} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{market.market}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-center">{market.deletion}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-center">{market.portability}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-center">{market.legalSupport}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xl">
                        {market.status === 'green' ? '🟢' : market.status === 'yellow' ? '🟡' : '🔴'}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                  <td className="px-4 py-3 text-sm text-gray-900">TOTAL</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center">{monthlySummary.totalDeletionRequests}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center">{monthlySummary.totalPortabilityRequests}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center">{monthlySummary.totalEscalations}</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Market Status & All Clear Markets */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <MarketStatusCard markets={getMarketStatusData(filteredReports)} activityLog={filteredActivityLog} />
          <AllClearMarketsCard markets={getGreenMarkets(filteredReports)} />
        </div>
      )}

      {/* Trends Chart - By Market */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">📈 Total Requests Trend by Market</h2>
          <p className="text-sm text-gray-600">Last 8 weeks (Deletion + Portability combined)</p>
        </div>
        {trendsData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {['DACH', 'France', 'Nordics', 'NL', 'Be / Lux'].map(market => {
              const marketData = prepareMarketTrendData(reports, market);
              return (
                <div key={market} className="border border-gray-200 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">{market}</h3>
                  {marketData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={marketData}>
                        <Line type="monotone" dataKey="requests" stroke="#3B82F6" strokeWidth={2} dot={false} />
                        <XAxis dataKey="week" hide />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ fontSize: '12px' }}
                          formatter={(value) => [`${value} requests`]}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-8">No data</p>
                  )}
                  {marketData.length > 0 && (
                    <div className="mt-2 text-center">
                      <span className="text-xs text-gray-600">
                        Latest: {marketData[marketData.length - 1]?.requests || 0}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-12">No data available</p>
        )}
      </div>

      {/* Activity Log */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">🗂️ Activity Log</h2>
            <p className="text-xs text-gray-500 mt-1">
              Detailed descriptions from weekly reports. Numbers above reflect total reported cases, entries below show textual details.
            </p>
          </div>
          {filteredActivityLog.length > 0 && (
            <button
              onClick={() => copyActivityLog(filteredActivityLog)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              📋 Copy Activity Log
            </button>
          )}
        </div>
        
        {filteredActivityLog.length > 0 ? (
          <ActivityLogGrouped activities={filteredActivityLog} />
        ) : (
          <p className="text-center text-gray-500 py-8">No activity log entries found</p>
        )}
      </div>

      {/* Agent Training Snapshot */}
      {trainingReport && trainingReport.totalCases > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">📚 Agent Training Snapshot</h2>
              <p className="text-sm text-gray-600">
                Common 1st Line Agent errors requiring training intervention
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-600">{trainingReport.totalCases}</div>
              <div className="text-xs text-gray-500">Training Cases</div>
            </div>
          </div>

          {/* By Market */}
          <div className="space-y-6">
            {Object.entries(
              trainingReport.topErrors.reduce((acc, error) => {
                if (!acc[error.market]) acc[error.market] = [];
                acc[error.market].push(error);
                return acc;
              }, {} as Record<string, typeof trainingReport.topErrors>)
            ).map(([market, errors]) => (
              <div key={market} className="border-2 border-purple-200 rounded-lg overflow-hidden">
                <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900">{market}</span>
                    <span className="px-3 py-1 bg-purple-200 text-purple-800 rounded-full text-sm font-bold">
                      {errors.reduce((sum, e) => sum + e.count, 0)} cases
                    </span>
                  </div>
                </div>
                <div className="bg-white p-4">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 text-sm text-gray-600">
                        <th className="text-left py-2">Error Type</th>
                        <th className="text-right py-2 w-24">Count</th>
                        <th className="text-center py-2 w-20">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.slice(0, 5).map((error, idx) => {
                        const trendIcon = error.trend === 'up' ? '📈' : error.trend === 'down' ? '📉' : '➡️';
                        const trendColor = error.trend === 'up' ? 'text-red-600' : error.trend === 'down' ? 'text-green-600' : 'text-gray-600';
                        const englishDescription = translateErrorDescription(error.errorDescription);
                        return (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="py-3 text-sm text-gray-900">{englishDescription}</td>
                            <td className="py-3 text-right font-bold text-gray-900">{error.count}</td>
                            <td className={`py-3 text-center text-2xl ${trendColor}`}>{trendIcon}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// Activity Log Grouped Component
function ActivityLogGrouped({ activities }: { activities: ActivityLogEntry[] }) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'Escalation': true,
    'Initiative': true,
  });

  // Group by category
  const grouped = activities.reduce((acc, entry) => {
    if (!acc[entry.category]) {
      acc[entry.category] = [];
    }
    acc[entry.category].push(entry);
    return acc;
  }, {} as Record<string, ActivityLogEntry[]>);

  // Further group each category by market, then sort by date
  const structuredData = Object.entries(grouped).map(([category, entries]) => {
    const byMarket = entries.reduce((acc, entry) => {
      if (!acc[entry.market]) {
        acc[entry.market] = [];
      }
      acc[entry.market].push(entry);
      return acc;
    }, {} as Record<string, ActivityLogEntry[]>);

    // Sort entries within each market by date (newest first)
    Object.keys(byMarket).forEach(market => {
      byMarket[market].sort((a, b) => b.weekOf.getTime() - a.weekOf.getTime());
    });

    return {
      category,
      totalCount: entries.length,
      markets: Object.entries(byMarket).map(([market, marketEntries]) => ({
        market,
        count: marketEntries.length,
        entries: marketEntries,
      })),
    };
  });

  // Sort categories: Escalations first, then others
  structuredData.sort((a, b) => {
    if (a.category === 'Escalation') return -1;
    if (b.category === 'Escalation') return 1;
    return 0;
  });

  const toggleSection = (category: string) => {
    setOpenSections(prev => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <div className="space-y-4">
      {structuredData.map(({ category, totalCount, markets }) => {
        const isOpen = openSections[category] !== false;
        const isEscalation = category === 'Escalation';
        const bgColor = isEscalation ? 'bg-red-50' : 'bg-blue-50';
        const borderColor = isEscalation ? 'border-red-200' : 'border-blue-200';
        const textColor = isEscalation ? 'text-red-900' : 'text-blue-900';
        const icon = isEscalation ? '🚨' : category === 'Initiative' ? '📊' : '✅';

        return (
          <div key={category} className={`border-2 ${borderColor} rounded-lg overflow-hidden`}>
            {/* Category Header */}
            <button
              onClick={() => toggleSection(category)}
              className={`w-full ${bgColor} px-6 py-4 flex items-center justify-between hover:opacity-90 transition`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <h3 className={`text-lg font-bold ${textColor}`}>
                  {category === 'Escalation' ? 'ESCALATIONS' : category === 'Initiative' ? 'INITIATIVES' : 'WINS'}
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  isEscalation ? 'bg-red-200 text-red-800' : 'bg-blue-200 text-blue-800'
                }`}>
                  {totalCount}
                </span>
              </div>
              <span className="text-gray-600 text-xl">{isOpen ? '▼' : '▶'}</span>
            </button>

            {/* Category Content */}
            {isOpen && (
              <div className="bg-white">
                {markets.map(({ market, count, entries }) => (
                  <div key={market} className="border-t border-gray-200">
                    {/* Market Header */}
                    <div className="bg-gray-50 px-6 py-3">
                      <span className="font-bold text-gray-900">{market}</span>
                    </div>

                    {/* Entries */}
                    <div className="divide-y divide-gray-100">
                      {entries.map((entry) => (
                        <div key={entry.id} className="px-6 py-4 hover:bg-gray-50 transition">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-20 text-sm text-gray-600">
                              {formatDate(entry.weekOf)}
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-800 leading-relaxed">{entry.details}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Helper Components

function SummaryCard({ label, value, previous, isRisk = false }: { label: string; value: number; previous: number; isRisk?: boolean }) {
  const change = previous > 0 ? ((value - previous) / previous) * 100 : 0;
  const isIncrease = change > 0;
  const showChange = previous > 0 && change !== 0;
  
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {showChange && (
          <span
            className={`text-sm font-medium ${
              isRisk
                ? isIncrease
                  ? 'text-red-600'
                  : 'text-green-600'
                : isIncrease
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          >
            {isIncrease ? '↑' : '↓'} {Math.abs(change).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

function MarketStatusCard({ markets, activityLog }: { markets: Array<{ market: string; status: 'green' | 'yellow' | 'red'; reason: string }>; activityLog: ActivityLogEntry[] }) {
  const atRisk = markets.filter(m => m.status === 'yellow' || m.status === 'red');
  
  return (
    <div className="rounded-lg p-6 border-2 bg-yellow-50 border-yellow-200">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <span>🔴🟡 Attention</span>
        {atRisk.length > 0 && (
          <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full text-xs font-bold">
            {atRisk.length}
          </span>
        )}
      </h3>
      {atRisk.length > 0 ? (
        <div className="space-y-4">
          {atRisk.map((m, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">
                {m.status === 'red' ? '🔴' : '🟡'}
              </span>
              <div>
                <p className="font-semibold text-gray-900">{m.market}</p>
                <p className="text-sm text-gray-700 mt-1">{m.reason}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 italic">All markets green! 🎉</p>
      )}
    </div>
  );
}

function AllClearMarketsCard({ markets }: { markets: Array<{ market: string; requests: number }> }) {
  return (
    <div className="rounded-lg p-6 border-2 bg-green-50 border-green-200">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <span>✅ All Clear</span>
        {markets.length > 0 && (
          <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-xs font-bold">
            {markets.length}
          </span>
        )}
      </h3>
      {markets.length > 0 ? (
        <div className="space-y-2">
          {markets.map((m, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xl flex-shrink-0">🟢</span>
              <p className="text-gray-800">
                <span className="font-semibold">{m.market}:</span> {m.requests} requests handled
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 italic">No green markets this period</p>
      )}
    </div>
  );
}

function HighlightsCard({ title, items, type }: { title: string; items: string[]; type: 'positive' | 'negative' }) {
  return (
    <div className={`rounded-lg p-6 border-2 ${type === 'negative' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-gray-800">
              <span className="text-gray-600">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-600 italic">No items to report</p>
      )}
    </div>
  );
}

// Helper Functions

function prepareMarketTrendData(reports: WeeklyReport[], market: string) {
  const marketReports = reports
    .filter(r => r.market === market)
    .sort((a, b) => a.weekOf.getTime() - b.weekOf.getTime())
    .slice(-8); // Last 8 weeks
  
  return marketReports.map(r => ({
    week: formatDateShort(r.weekOf),
    requests: r.deletionRequests + r.portabilityRequests,
  }));
}

function formatDateShort(date: Date): string {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function prepareTrendsData(reports: WeeklyReport[], currentMonth: string) {
  // Get last 8 weeks of data
  const sortedReports = [...reports].sort((a, b) => a.weekOf.getTime() - b.weekOf.getTime());
  const weekMap = new Map<string, any>();
  
  sortedReports.forEach(report => {
    const weekKey = formatDate(report.weekOf);
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { week: weekKey, 'Total Requests': 0, 'Escalations': 0 });
    }
    const weekData = weekMap.get(weekKey)!;
    weekData['Total Requests'] += report.deletionRequests + report.portabilityRequests;
    weekData['Escalations'] += report.legalEscalations + report.regulatorInquiries + report.privacyIncidents;
  });
  
  return Array.from(weekMap.values()).slice(-8);
}

function generateTextualSummary(
  current: any, 
  previous: any, 
  reports: WeeklyReport[], 
  month: string
): string {
  const monthName = formatMonthDisplay(month);
  const changePercent = previous.totalRequests > 0 
    ? (((current.totalRequests - previous.totalRequests) / previous.totalRequests) * 100).toFixed(0)
    : 0;
  const trend = Number(changePercent) > 0 ? 'increase' : Number(changePercent) < 0 ? 'decrease' : 'stable';
  
  // Get market status
  const marketMap = new Map<string, WeeklyReport>();
  reports.forEach(rep => {
    const existing = marketMap.get(rep.market);
    if (!existing || rep.weekOf > existing.weekOf) {
      marketMap.set(rep.market, rep);
    }
  });
  
  const atRiskCount = Array.from(marketMap.values()).filter(r => r.riskStatus === 'yellow' || r.riskStatus === 'red').length;

  let summary = `In ${monthName}, we processed a total of ${current.totalRequests} GDPR requests `;
  summary += `(${current.totalDeletionRequests} deletion, ${current.totalPortabilityRequests} portability) `;
  summary += `across our European markets. `;
  
  if (Number(changePercent) !== 0) {
    summary += `This represents a ${Math.abs(Number(changePercent))}% ${trend} compared to the previous month. `;
  }
  
  if (current.totalEscalations > 0) {
    summary += `We handled ${current.totalEscalations} legal escalation${current.totalEscalations > 1 ? 's' : ''}, `;
    summary += `requiring coordination with our legal teams. `;
  }
  
  if (atRiskCount > 0) {
    summary += `${atRiskCount} market${atRiskCount > 1 ? 's require' : ' requires'} attention this month. `;
  } else {
    summary += `All markets are operating smoothly with green status. `;
  }

  return summary;
}

function generateCSV(reports: WeeklyReport[]): string {
  const headers = ['Market', 'Week Of', 'Deletion Requests', 'Portability Requests', 'Legal Escalations', 'Regulator Inquiries', 'Privacy Incidents', 'Risk Status'];
  const rows = reports.map(r => [
    r.market,
    formatDate(r.weekOf),
    r.deletionRequests,
    r.portabilityRequests,
    r.legalEscalations,
    r.regulatorInquiries,
    r.privacyIncidents,
    r.riskStatus,
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function generateActivityLogText(activities: ActivityLogEntry[]): string {
  // Group by category
  const grouped = activities.reduce((acc, entry) => {
    if (!acc[entry.category]) {
      acc[entry.category] = [];
    }
    acc[entry.category].push(entry);
    return acc;
  }, {} as Record<string, ActivityLogEntry[]>);

  let text = '🗂️ ACTIVITY LOG\n';
  text += '(Detailed descriptions from weekly reports)\n\n';

  // Escalations first
  if (grouped['Escalation']) {
    text += `🚨 ESCALATIONS\n`;
    text += formatCategoryText(grouped['Escalation']);
    text += '\n';
  }

  // Initiatives
  if (grouped['Initiative']) {
    text += `📊 INITIATIVES\n`;
    text += formatCategoryText(grouped['Initiative']);
  }

  return text;
}

function formatCategoryText(entries: ActivityLogEntry[]): string {
  // Group by market
  const byMarket = entries.reduce((acc, entry) => {
    if (!acc[entry.market]) {
      acc[entry.market] = [];
    }
    acc[entry.market].push(entry);
    return acc;
  }, {} as Record<string, ActivityLogEntry[]>);

  let text = '';
  Object.entries(byMarket).forEach(([market, marketEntries]) => {
    marketEntries.sort((a, b) => b.weekOf.getTime() - a.weekOf.getTime());
    text += `\n  ${market}:\n`;
    marketEntries.forEach(entry => {
      text += `    • ${formatDate(entry.weekOf)}: ${entry.details}\n`;
    });
  });

  return text;
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}
