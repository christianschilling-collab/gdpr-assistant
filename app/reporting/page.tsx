'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getWeeklyReports, getActivityLog } from '@/lib/firebase/weeklyReports';
import { generateTrainingReport } from '@/lib/firebase/trainingCases';
import { WeeklyReport, ActivityLogEntry } from '@/lib/types';
import { TrainingReport } from '@/lib/types/training';
import { MarketDeepDive, MarketData } from '@/lib/types/marketDeepDive';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useToast } from '@/lib/contexts/ToastContext';
import { buildMergedMarketDeepDive } from '@/lib/reporting/marketDeepDiveMerge';
import {
  calculateMonthlySummary,
  extractHighlights,
  formatMonthDisplay,
  getMarketBreakdown,
  getMarketStatusData,
} from '@/lib/reporting/reportMetrics';
import { generateMonthlySummaryHTML, translateErrorDescription } from '@/lib/reporting/gdprEmailReport';

type ViewMode = 'week' | 'month';

export default function ReportingPage() {
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
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
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

      // Load market deep dive for selected month + previous month (MoM in UI / GDPR report)
      try {
        const prevMonthKey = getPreviousMonth(selectedMonth);
        console.log('Aggregating market deep dive data (current + previous month)...');
        const [currentDive, prevDive] = await Promise.all([
          buildMergedMarketDeepDive(selectedMonth),
          buildMergedMarketDeepDive(prevMonthKey),
        ]);
        setMarketDeepDive(currentDive);
        setPreviousMonthDeepDive(prevDive);
        console.log('Market deep dive loaded successfully');
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

  async function copyGdprReport() {
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

  async function copyMBRReport() {
    if (!marketDeepDive) {
      showToast('No Market Deep Dive data available for this month.', 'warning');
      return;
    }
    
    const htmlReport = generateMBRReportHTML(selectedMonth, marketDeepDive.markets, marketDeepDive.significantIncidents, marketDeepDive.summaryAndOutlook || '');
    
    // Create a temporary element to copy HTML
    const blob = new Blob([htmlReport], { type: 'text/html' });
    const data = [new ClipboardItem({ 'text/html': blob })];
    
    try {
      await navigator.clipboard.write(data);
      showToast('MBR report copied. Paste directly into your email.');
    } catch (err) {
      // Fallback: copy as text
      await navigator.clipboard.writeText(htmlReport);
      showToast('MBR report copied as plain text. Paste into your email (HTML mode).', 'info');
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reporting</h1>
          <p className="text-gray-600 mt-1">European GDPR Dashboard</p>
          <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
            <Link href="/reporting/view" className="text-blue-600 hover:underline">
              Online view
            </Link>
            <span className="text-gray-300" aria-hidden>
              |
            </span>
            <Link href="/reporting/upload" className="text-blue-600 hover:underline">
              Upload / import
            </Link>
            <span className="text-gray-300" aria-hidden>
              |
            </span>
            <Link href="/reporting/overrides" className="text-blue-600 hover:underline">
              Overrides (GDPR & MBR)
            </Link>
            <span className="text-gray-300" aria-hidden>
              |
            </span>
            <Link href="/reporting/submit" className="text-blue-600 hover:underline">
              Submit weekly data
            </Link>
          </nav>
        </div>
        <div className="flex gap-3">
          <Link
            href="/reporting/submit"
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition"
          >
            ✏️ Submit weekly data
          </Link>
          <Link
            href="/reporting/upload"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            📊 Upload CSV
          </Link>
          <Link
            href="/admin/training-cases/upload"
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition"
          >
            📚 Upload Training Cases
          </Link>
          <Link
            href="/admin/training-cases/report"
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition"
          >
            📊 View Training Report
          </Link>
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

      {/* Copy Buttons */}
      {viewMode === 'month' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">📊 {formatMonthDisplay(selectedMonth)} Report</h2>
            <p className="text-sm text-gray-600">Export or copy your GDPR report for email</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyGdprReport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              Copy GDPR Report
            </button>
            <button
              onClick={copyMBRReport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Copy MBR Report
            </button>
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
            >
              📥 Export CSV
            </button>
          </div>
        </div>
      )}

      {/* 1. Summary & Outlook (Market Deep Dive) */}
      {viewMode === 'month' && marketDeepDive && marketDeepDive.summaryAndOutlook && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Summary & Outlook
            </h2>
            <Link
              href="/reporting/overrides"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit →
            </Link>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{marketDeepDive.summaryAndOutlook}</p>
        </div>
      )}

      {/* 2. GDPR Related Incidents */}
      {viewMode === 'month' && marketDeepDive && marketDeepDive.significantIncidents && marketDeepDive.significantIncidents.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">⚠️ GDPR Related Incidents & Compliance Risks</h2>
            <Link
              href="/reporting/overrides"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit →
            </Link>
          </div>
          <div className="space-y-3">
            {marketDeepDive.significantIncidents.map((incident, idx) => (
              <div key={idx} className="border-l-4 border-red-400 bg-red-50 pl-4 py-3 rounded">
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Incident {String.fromCharCode(65 + idx)}: {incident.title}</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{incident.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Market Snapshot */}
      {viewMode === 'month' && marketDeepDive && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">🌍 Market Snapshot</h2>
            <Link
              href="/reporting/overrides"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Market</th>
                  <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">Deletions</th>
                  <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">Access requests</th>
                  <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">Legal escalations</th>
                  <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {['DACH', 'Fr', 'BNL', 'Nordics'].map(market => {
                  const data = marketDeepDive.markets[market as keyof typeof marketDeepDive.markets];
                  const prevData = previousMonthDeepDive?.markets?.[market as keyof typeof marketDeepDive.markets];
                  const marketStatus = getMarketStatusData(filteredReports).find(m => {
                    if (market === 'Fr') return m.market === 'France';
                    if (market === 'BNL') return m.market === 'NL' || m.market === 'Be / Lux';
                    return m.market === market;
                  });
                  const statusEmoji = marketStatus?.status === 'green' ? '🟢' : marketStatus?.status === 'yellow' ? '🟡' : marketStatus?.status === 'red' ? '🔴' : '-';

                  const del = data?.deletionRequests || 0;
                  const delP = prevData?.deletionRequests || 0;
                  const acc = data?.dsarRequests || 0;
                  const accP = prevData?.dsarRequests || 0;
                  const esc = data?.escalations || 0;
                  const escP = prevData?.escalations || 0;

                  const momClass = (cur: number, prev: number) => {
                    const d = cur - prev;
                    if (d > 0) return 'text-red-600';
                    if (d < 0) return 'text-green-600';
                    return 'text-gray-400';
                  };
                  const momText = (cur: number, prev: number) => {
                    const d = cur - prev;
                    if (previousMonthDeepDive == null) return '';
                    return `Δ ${d > 0 ? '+' : ''}${d}`;
                  };

                  return (
                    <tr key={market} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-3 font-semibold text-gray-900">{market === 'Fr' ? 'France' : market}</td>
                      <td className="py-3 px-3 text-center text-sm">
                        <div className="font-mono font-medium">{del}</div>
                        {previousMonthDeepDive && (
                          <div className={`text-xs font-semibold ${momClass(del, delP)}`}>{momText(del, delP)}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-sm">
                        <div className="font-mono font-medium">{acc}</div>
                        {previousMonthDeepDive && (
                          <div className={`text-xs font-semibold ${momClass(acc, accP)}`}>{momText(acc, accP)}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-sm">
                        <div className="font-mono font-medium">{esc}</div>
                        {previousMonthDeepDive && (
                          <div className={`text-xs font-semibold ${momClass(esc, escP)}`}>{momText(esc, escP)}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-xl">{statusEmoji}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Highlights */}
      {viewMode === 'month' && (filteredActivityLog.filter(a => a.category === 'Initiative').length > 0) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">✅ Highlights</h2>
          <HighlightsSectionComponent activityLog={filteredActivityLog} />
        </div>
      )}

      {/* 5. Lowlights & Attention Areas */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">⚠️ Lowlights & Attention Areas</h2>
          <LowlightsSectionComponent reports={filteredReports} activityLog={filteredActivityLog} />
        </div>
      )}

      {/* Trends Chart - By Market */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">📈 Total Requests Trend by Market</h2>
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

      {/* 6. Agent Training Snapshot */}
      {trainingReport && trainingReport.totalCases > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">📚 Agent Training Snapshot</h2>
              <p className="text-sm text-gray-600">
                Common 1st Line Agent errors requiring training intervention
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">{trainingReport.totalCases}</div>
              <div className="text-xs text-gray-500">Training Cases</div>
            </div>
          </div>

          {/* By Market */}
          <div className="space-y-4">
            {Object.entries(
              trainingReport.topErrors.reduce((acc, error) => {
                if (!acc[error.market]) acc[error.market] = [];
                acc[error.market].push(error);
                return acc;
              }, {} as Record<string, typeof trainingReport.topErrors>)
            ).map(([market, errors]) => (
              <div key={market} className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-purple-50 px-4 py-2 border-b border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 text-sm">{market}</span>
                    <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded-full text-xs font-bold">
                      {errors.reduce((sum, e) => sum + e.count, 0)} cases
                    </span>
                  </div>
                </div>
                <div className="bg-white p-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs text-gray-600">
                        <th className="text-left py-1">Error Type</th>
                        <th className="text-right py-1 w-16">Count</th>
                        <th className="text-center py-1 w-12">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.slice(0, 5).map((error, idx) => {
                        const trendIcon = error.trend === 'up' ? '📈' : error.trend === 'down' ? '📉' : '➡️';
                        const trendColor = error.trend === 'up' ? 'text-red-600' : error.trend === 'down' ? 'text-green-600' : 'text-gray-600';
                        const englishDescription = translateErrorDescription(error.errorDescription);
                        return (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="py-2 text-xs text-gray-900">{englishDescription}</td>
                            <td className="py-2 text-right font-bold text-gray-900">{error.count}</td>
                            <td className={`py-2 text-center ${trendColor}`}>{trendIcon}</td>
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

      {/* Activity Log */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">🗂️ Activity Log (Detailed View)</h2>
            <p className="text-xs text-gray-500 mt-1">
              Full activity log with escalations, initiatives, and wins grouped by category and market.
            </p>
          </div>
          {filteredActivityLog.length > 0 && (
            <button
              onClick={() => copyActivityLog(filteredActivityLog)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              Copy Activity Log
            </button>
          )}
        </div>
        
        {filteredActivityLog.length > 0 ? (
          <ActivityLogGrouped activities={filteredActivityLog} />
        ) : (
          <p className="text-center text-gray-500 py-8">No activity log entries found</p>
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

function HighlightsSectionComponent({ activityLog }: { activityLog: ActivityLogEntry[] }) {
  const wins = activityLog.filter(a => a.category === 'Initiative' && a.details.startsWith('✅'));
  const initiatives = activityLog.filter(a => a.category === 'Initiative' && !a.details.startsWith('✅'));
  
  if (wins.length === 0 && initiatives.length === 0) {
    return <p className="text-gray-500 text-sm italic">No major wins or initiatives reported this month.</p>;
  }
  
  return (
    <div className="space-y-4">
      {wins.length > 0 && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">🎉 Wins & Achievements</h3>
          <ul className="space-y-1 text-sm">
            {wins.map((w, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-gray-600">•</span>
                <span><span className="font-semibold">{w.market}:</span> {w.details.replace('✅ ', '')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {initiatives.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">📊 Current Initiatives</h3>
          <ul className="space-y-1 text-sm">
            {initiatives.map((i, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-gray-600">•</span>
                <span><span className="font-semibold">{i.market}:</span> {i.details}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LowlightsSectionComponent({ reports, activityLog }: { reports: WeeklyReport[]; activityLog: ActivityLogEntry[] }) {
  const atRiskMarkets = getMarketStatusData(reports).filter(m => m.status === 'yellow' || m.status === 'red');
  const escalations = activityLog.filter(a => a.category === 'Escalation');
  
  if (atRiskMarkets.length === 0 && escalations.length === 0) {
    return <p className="text-green-600 text-sm font-medium">🎉 All markets green - no major issues to report!</p>;
  }
  
  return (
    <div className="space-y-4">
      {atRiskMarkets.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">🚦 Markets Requiring Attention</h3>
          <ul className="space-y-1 text-sm">
            {atRiskMarkets.map((m, idx) => {
              const emoji = m.status === 'red' ? '🔴' : '🟡';
              return (
                <li key={idx} className="flex items-start gap-2">
                  <span>{emoji}</span>
                  <span><span className="font-semibold">{m.market}:</span> {m.reason}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      
      {escalations.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">🚨 Noteworthy Complaints & Issues</h3>
          
          {/* Group by market */}
          {Object.entries(
            escalations.reduce((acc, e) => {
              if (!acc[e.market]) acc[e.market] = [];
              acc[e.market].push(e);
              return acc;
            }, {} as Record<string, ActivityLogEntry[]>)
          ).map(([market, entries]) => (
            <div key={market} className="mb-3 last:mb-0">
              <h4 className="font-semibold text-gray-800 text-xs mb-1">{market}:</h4>
              <ul className="space-y-1 text-sm pl-2">
                {entries.map((e, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-gray-600">•</span>
                    <span>{e.details}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

function generateMonthlySummaryText(current: any, previous: any, highlights: any, selectedMonth: string, reports: WeeklyReport[], activityLog: ActivityLogEntry[]): string {
  const monthName = formatMonthDisplay(selectedMonth);
  let text = `═══════════════════════════════════════════════════════════\n`;
  text += `  GDPR MONTHLY REPORT - ${monthName}\n`;
  text += `═══════════════════════════════════════════════════════════\n\n`;
  
  // Textual Summary
  text += `📝 EXECUTIVE SUMMARY\n`;
  text += `${'─'.repeat(60)}\n`;
  text += generateTextualSummary(current, previous, reports, selectedMonth);
  text += `\n\n`;
  
  // Data Table
  text += `📊 REQUEST VOLUME BY MARKET\n`;
  text += `${'─'.repeat(60)}\n`;
  const breakdown = getMarketBreakdown(reports);
  breakdown.forEach(m => {
    text += `${m.market.padEnd(15)} | `;
    text += `Deletion: ${String(m.deletion).padStart(3)} | `;
    text += `Portability: ${String(m.portability).padStart(3)} | `;
    text += `Legal: ${String(m.legalSupport).padStart(2)} | `;
    text += `Status: ${m.status === 'green' ? '🟢' : m.status === 'yellow' ? '🟡' : '🔴'}\n`;
  });
  text += `${'─'.repeat(60)}\n`;
  text += `TOTAL           | Deletion: ${String(current.totalDeletionRequests).padStart(3)} | `;
  text += `Portability: ${String(current.totalPortabilityRequests).padStart(3)} | `;
  text += `Legal: ${String(current.totalEscalations).padStart(2)}\n\n`;
  
  // Highlights (Wins + Initiatives)
  text += `✅ HIGHLIGHTS\n`;
  text += `${'─'.repeat(60)}\n`;
  const wins = activityLog.filter(a => a.category === 'Initiative' && a.details.startsWith('✅'));
  const initiatives = activityLog.filter(a => a.category === 'Initiative' && !a.details.startsWith('✅'));
  
  if (wins.length > 0) {
    text += `\n🎉 Wins & Achievements:\n`;
    wins.forEach(w => {
      text += `  • [${w.market}] ${w.details.replace('✅ ', '')}\n`;
    });
  }
  
  if (initiatives.length > 0) {
    text += `\n📊 Current Initiatives:\n`;
    initiatives.forEach(i => {
      text += `  • [${i.market}] ${i.details}\n`;
    });
  }
  
  if (wins.length === 0 && initiatives.length === 0) {
    text += `No major wins or initiatives reported this month.\n`;
  }
  text += `\n`;
  
  // Lowlights (Risk Status + Escalations)
  text += `⚠️  LOWLIGHTS & ATTENTION AREAS\n`;
  text += `${'─'.repeat(60)}\n`;
  
  const atRiskMarkets = getMarketStatusData(reports).filter(m => m.status === 'yellow' || m.status === 'red');
  if (atRiskMarkets.length > 0) {
    text += `\n🚦 Markets Requiring Attention:\n`;
    atRiskMarkets.forEach(m => {
      text += `  ${m.status === 'red' ? '🔴' : '🟡'} ${m.market}: ${m.reason}\n`;
    });
  }
  
  const escalations = activityLog.filter(a => a.category === 'Escalation');
  if (escalations.length > 0) {
    text += `\n🚨 Noteworthy Complaints & Issues:\n`;
    escalations.forEach(e => {
      text += `  • [${e.market}] ${e.details}\n`;
    });
  }
  
  if (atRiskMarkets.length === 0 && escalations.length === 0) {
    text += `All markets green - no major issues to report! 🎉\n`;
  }
  
  text += `\n═══════════════════════════════════════════════════════════\n`;
  text += `Report generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
  text += `═══════════════════════════════════════════════════════════\n`;
  
  return text;
}

function generateMarketDeepDiveHTML(marketDeepDive: MarketDeepDive): string {
  let html = '';
  
  // Market Overview Table
  html += '<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">';
  html += '<thead><tr style="border-bottom: 2px solid #ddd;">';
  html += '<th style="text-align: left; padding: 10px;">Market</th>';
  html += '<th style="text-align: center; padding: 10px;">Deletions</th>';
  html += '<th style="text-align: center; padding: 10px;">DSAR</th>';
  html += '<th style="text-align: left; padding: 10px;">Status / Remarks</th>';
  html += '</tr></thead><tbody>';
  
  Object.entries(marketDeepDive.markets).forEach(([market, data]) => {
    const statusDot = data?.statusText 
      ? (data.statusText.toLowerCase().includes('increase') || data.statusText.toLowerCase().includes('busy') 
        ? '🟡' 
        : '🟢')
      : '';
    html += '<tr style="border-bottom: 1px solid #eee;">';
    html += `<td style="padding: 10px;"><strong>${market}</strong></td>`;
    html += `<td style="padding: 10px; text-align: center; font-family: monospace;">${data?.deletionRequests || 0}</td>`;
    html += `<td style="padding: 10px; text-align: center; font-family: monospace;">${data?.dsarRequests || 0}</td>`;
    html += `<td style="padding: 10px;">${statusDot} ${data?.statusText || '-'}</td>`;
    html += '</tr>';
  });
  
  html += '</tbody></table>';
  
  // Significant Incidents
  if (marketDeepDive.significantIncidents && marketDeepDive.significantIncidents.length > 0) {
    html += '<div style="margin: 20px 0;">';
    html += '<h3 style="margin: 15px 0 10px 0; font-size: 16px;">⚠️ Significant Incidents</h3>';
    marketDeepDive.significantIncidents.forEach(incident => {
      html += '<div style="margin: 10px 0; padding: 12px; background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">';
      html += `<h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">${incident.title}</h4>`;
      
      // Parse the description to extract structured parts
      const desc = incident.description;
      if (desc.includes('What happened:')) {
        const parts = desc.split(/(?=What happened:|Compliance Risk:|Status\/Impact:)/);
        html += '<ul style="margin: 0; padding-left: 20px; font-size: 13px;">';
        parts.forEach(part => {
          if (part.trim()) {
            const cleanPart = part.trim();
            html += `<li style="margin: 5px 0;">${cleanPart}</li>`;
          }
        });
        html += '</ul>';
      } else {
        html += `<p style="margin: 0; font-size: 13px;">${desc}</p>`;
      }
      html += '</div>';
    });
    html += '</div>';
  }
  
  // Summary & Outlook
  if (marketDeepDive.summaryAndOutlook) {
    html += '<div style="margin: 20px 0;">';
    html += '<h3 style="margin: 15px 0 10px 0; font-size: 16px;">📋 Summary & Outlook</h3>';
    html += `<p style="margin: 0; font-size: 14px; line-height: 1.8; color: #333;">${marketDeepDive.summaryAndOutlook.replace(/\n/g, '<br>')}</p>`;
    html += '</div>';
  }
  
  return html;
}

// MBR Report Generator (short format for TL)
function generateMBRReportHTML(month: string, markets: Record<string, MarketData>, incidents: any[], summaryAndOutlook: string): string {
  const [year, monthNum] = month.split('-');
  const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  const marketRows = Object.entries(markets).map(([market, data]) => `
    <tr>
      <td><strong>${market}</strong></td>
      <td style="text-align: center;">${data.deletionRequests}</td>
      <td style="text-align: center;">${data.dsarRequests}</td>
      <td>${data.statusText ? '<span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ' + (data.statusText.toLowerCase().includes('increase') || data.statusText.toLowerCase().includes('busy') ? '#fbbf24' : '#10b981') + '; margin-right: 8px;"></span>' : ''}${data.statusText || '-'}</td>
    </tr>
  `).join('');

  const incidentsHTML = incidents.length > 0
    ? incidents.map((inc, idx) => `
      <div style="margin: 15px 0;">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">Incident ${String.fromCharCode(65 + idx)}: ${inc.title}</h4>
        <ul style="margin: 0; padding-left: 20px;">
          <li style="color: #4a4a4a; font-size: 13px; line-height: 1.6;">
            <strong>What happened:</strong> ${inc.description.split('Compliance Risk:')[0].replace('What happened:', '').trim()}
          </li>
          ${inc.description.includes('Compliance Risk:') ? `<li style="color: #4a4a4a; font-size: 13px; line-height: 1.6;">
            <strong>Compliance Risk:</strong> ${inc.description.split('Compliance Risk:')[1].split('Status/Impact:')[0].trim()}
          </li>` : ''}
          ${inc.description.includes('Status/Impact:') ? `<li style="color: #4a4a4a; font-size: 13px; line-height: 1.6;">
            <strong>Status/Impact:</strong> ${inc.description.split('Status/Impact:')[1].trim()}
          </li>` : ''}
        </ul>
      </div>
    `).join('')
    : '<p style="color: #888; font-style: italic;">No significant incidents reported this month.</p>';
  
  const summaryHTML = summaryAndOutlook
    ? `<p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.8;">${summaryAndOutlook.replace(/\n/g, '<br>')}</p>`
    : '<p style="color: #888; font-style: italic;">No summary provided.</p>';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
  
  <h2 style="font-size: 20px; font-weight: 600; margin: 20px 0 10px 0; color: #1a1a1a;">GDPR & Privacy Operations</h2>
  
  <h3 style="font-size: 16px; font-weight: 600; margin: 20px 0 10px 0; color: #1a1a1a;">1. Market Overview & Figures (Reporting Period)</h3>
  <p style="margin: 0 0 15px 0; font-size: 14px; color: #4a4a4a;">Overall stable, DACH and BNL region showed an increase in GDPR related issues.</p>
  
  <table style="width: 100%; border-collapse: collapse; margin: 15px 0; background: white;">
    <thead>
      <tr style="background: #f0f0f0;">
        <th style="padding: 10px; text-align: left; font-size: 13px; font-weight: 600; color: #555; border: 1px solid #ddd;">Market</th>
        <th style="padding: 10px; text-align: center; font-size: 13px; font-weight: 600; color: #555; border: 1px solid #ddd;">Data Deletion</th>
        <th style="padding: 10px; text-align: center; font-size: 13px; font-weight: 600; color: #555; border: 1px solid #ddd;">DSAR</th>
        <th style="padding: 10px; text-align: left; font-size: 13px; font-weight: 600; color: #555; border: 1px solid #ddd;">Status / Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${marketRows}
    </tbody>
  </table>
  
  <h3 style="font-size: 16px; font-weight: 600; margin: 25px 0 10px 0; color: #1a1a1a;">2. GDPR Related Incidents & Compliance Risks</h3>
  ${incidentsHTML}
  
  <h3 style="font-size: 16px; font-weight: 600; margin: 25px 0 10px 0; color: #1a1a1a;">3. Summary & Outlook</h3>
  ${summaryHTML}

</body>
</html>
  `.trim();
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
