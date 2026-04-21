'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getWeeklyReports, getActivityLog } from '@/lib/firebase/weeklyReports';
import { generateTrainingReport } from '@/lib/firebase/trainingCases';
import { getMarketDeepDive } from '@/lib/firebase/marketDeepDive';
import { getAllCases } from '@/lib/firebase/cases';
import { getCategories } from '@/lib/firebase/categories';
import { WeeklyReport, ActivityLogEntry } from '@/lib/types';
import { TrainingReport } from '@/lib/types/training';
import { MarketDeepDive, MarketData } from '@/lib/types/marketDeepDive';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type ViewMode = 'week' | 'month';

// German to English mapping for error descriptions
function translateErrorDescription(germanText: string): string {
  const mappings: Record<string, string> = {
    // Main categories (exact matches)
    'Werbewiderruf: Präferenzen im Kundenkonto nicht deaktiviert': 'Marketing Opt-Out: Preferences not deactivated in customer account',
    'Allg. Ticketfehler: Falsche Kategorie gewählt': 'General Ticket Error: Wrong category selected',
    'Falsche Länder-Angabe im Ticket (DE/CH/AT)': 'Wrong country specified in ticket (DE/CH/AT)',
    'Ticket unvollständig (z.B. Kundennummer fehlt)': 'Incomplete ticket (e.g., customer number missing)',
    'Data Deletion/Removal - Konto wurde nicht gekündigt': 'Data Deletion/Removal: Account not cancelled',
    'Kunden-Verifikation angefordert anstelle Data-Privacy-Anliegen per Jira-Ticket zu eskalieren': 'Customer verification requested instead of escalating data privacy issue via Jira',
    'Sonstige falsche Bearbeitung (bitte im Kommentar ergänzen)': 'Other incorrect processing (see notes)',
    
    // Partial matches (fallback)
    'Werbewiderruf': 'Marketing Opt-Out',
    'Präferenzen': 'Preferences not deactivated',
    'Falsche Kategorie': 'Wrong category selected',
    'Falsche Länder': 'Wrong country specified',
    'Ticket unvollständig': 'Incomplete ticket',
    'Datenlöschung': 'Data Deletion',
    'Konto nicht gekündigt': 'Account not cancelled',
    'Verifikation': 'Customer verification issue',
    'Sonstige': 'Other',
  };
  
  // Try exact match first
  if (mappings[germanText]) {
    return mappings[germanText];
  }
  
  // Try partial matches
  for (const [german, english] of Object.entries(mappings)) {
    if (germanText.includes(german)) {
      return english;
    }
  }
  
  // Return original if no match (already in English or new category)
  return germanText;
}

export default function ReportingPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [trainingReport, setTrainingReport] = useState<TrainingReport | null>(null);
  const [marketDeepDive, setMarketDeepDive] = useState<MarketDeepDive | null>(null);
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

      // Load market deep dive for the selected month
      try {
        // Try to load saved data first
        let savedDeepDive = await getMarketDeepDive(selectedMonth).catch(() => null);
        
        // If Firestore fails, try localStorage
        if (!savedDeepDive) {
          try {
            const localData = localStorage.getItem(`marketDeepDive_${selectedMonth}`);
            if (localData) {
              const parsed = JSON.parse(localData);
              savedDeepDive = {
                id: selectedMonth,
                month: selectedMonth,
                markets: parsed.markets,
                significantIncidents: parsed.significantIncidents || [],
                summaryAndOutlook: parsed.summaryAndOutlook || '',
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: parsed.createdBy,
              };
            }
          } catch (localError) {
            console.warn('Could not load from localStorage:', localError);
          }
        }
        
        // Aggregate numbers on-the-fly (with timeout)
        console.log('Aggregating market deep dive data...');
        const aggregatedDeepDive = await Promise.race([
          aggregateMarketDeepDive(selectedMonth),
          new Promise<MarketDeepDive>((_, reject) => 
            setTimeout(() => reject(new Error('Aggregation timeout')), 10000)
          )
        ]).catch(err => {
          console.warn('Failed to aggregate market deep dive:', err);
          // Return empty structure
          return {
            id: selectedMonth,
            month: selectedMonth,
            markets: {
              DACH: { deletionRequests: 0, dsarRequests: 0, escalations: 0, statusText: '' },
              Nordics: { deletionRequests: 0, dsarRequests: 0, escalations: 0, statusText: '' },
              BNL: { deletionRequests: 0, dsarRequests: 0, escalations: 0, statusText: '' },
              Fr: { deletionRequests: 0, dsarRequests: 0, escalations: 0, statusText: '' },
            },
            significantIncidents: [],
            summaryAndOutlook: '',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });
        
        // Merge: Use aggregated numbers but keep saved texts and deletionsHC
        if (savedDeepDive) {
          aggregatedDeepDive.markets.DACH.statusText = savedDeepDive.markets.DACH?.statusText || '';
          aggregatedDeepDive.markets.DACH.deletionsHC = savedDeepDive.markets.DACH?.deletionsHC;
          aggregatedDeepDive.markets.Nordics.statusText = savedDeepDive.markets.Nordics?.statusText || '';
          aggregatedDeepDive.markets.Nordics.deletionsHC = savedDeepDive.markets.Nordics?.deletionsHC;
          aggregatedDeepDive.markets.BNL.statusText = savedDeepDive.markets.BNL?.statusText || '';
          aggregatedDeepDive.markets.BNL.deletionsHC = savedDeepDive.markets.BNL?.deletionsHC;
          aggregatedDeepDive.markets.Fr.statusText = savedDeepDive.markets.Fr?.statusText || '';
          aggregatedDeepDive.markets.Fr.deletionsHC = savedDeepDive.markets.Fr?.deletionsHC;
          aggregatedDeepDive.significantIncidents = savedDeepDive.significantIncidents || [];
          aggregatedDeepDive.summaryAndOutlook = savedDeepDive.summaryAndOutlook || '';
          aggregatedDeepDive.attributions = savedDeepDive.attributions || [];
          aggregatedDeepDive.highlightsOverride = savedDeepDive.highlightsOverride || '';
          aggregatedDeepDive.lowlightsOverride = savedDeepDive.lowlightsOverride || '';
        }
        
        setMarketDeepDive(aggregatedDeepDive);
        console.log('Market deep dive loaded successfully');
      } catch (error) {
        console.warn('Market Deep Dive not available:', error);
        setMarketDeepDive(null);
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
    alert('✅ Activity Log copied to clipboard!');
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

  function formatMonthDisplay(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  async function copyMonthlySummary() {
    const htmlSummary = generateMonthlySummaryHTML(monthlySummary, previousMonthlySummary, highlights, selectedMonth, filteredReports, filteredActivityLog, trainingReport, marketDeepDive);
    
    // Create a temporary element to copy HTML
    const blob = new Blob([htmlSummary], { type: 'text/html' });
    const data = [new ClipboardItem({ 'text/html': blob })];
    
    try {
      await navigator.clipboard.write(data);
      alert('✅ Full Monthly Report copied! Paste directly into your email.');
    } catch (err) {
      // Fallback: copy as text
      await navigator.clipboard.writeText(htmlSummary);
      alert('✅ HTML copied as text! Paste into your email (HTML mode).');
    }
  }

  async function copyMBRReport() {
    if (!marketDeepDive) {
      alert('⚠️ No Market Deep Dive data available for this month.');
      return;
    }
    
    const htmlReport = generateMBRReportHTML(selectedMonth, marketDeepDive.markets, marketDeepDive.significantIncidents, marketDeepDive.summaryAndOutlook || '');
    
    // Create a temporary element to copy HTML
    const blob = new Blob([htmlReport], { type: 'text/html' });
    const data = [new ClipboardItem({ 'text/html': blob })];
    
    try {
      await navigator.clipboard.write(data);
      alert('✅ MBR Report copied! Paste directly into your email.');
    } catch (err) {
      // Fallback: copy as text
      await navigator.clipboard.writeText(htmlReport);
      alert('✅ MBR Report copied as text! Paste into your email (HTML mode).');
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
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/reporting/upload"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            📊 Upload Weekly Report
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
            <p className="text-sm text-gray-600">Export or copy your monthly compliance summary</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyMonthlySummary}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              Copy Monthly Summary
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
              href="/admin/market-deep-dive"
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
              href="/admin/market-deep-dive"
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
              href="/admin/market-deep-dive"
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
                  <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">Deletions HC</th>
                  <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">DSAR</th>
                  <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">Legal Escalations</th>
                  <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {['DACH', 'Fr', 'BNL', 'Nordics'].map(market => {
                  const data = marketDeepDive.markets[market as keyof typeof marketDeepDive.markets];
                  const marketStatus = getMarketStatusData(filteredReports).find(m => {
                    if (market === 'Fr') return m.market === 'France';
                    if (market === 'BNL') return m.market === 'NL' || m.market === 'Be / Lux';
                    return m.market === market;
                  });
                  const statusEmoji = marketStatus?.status === 'green' ? '🟢' : marketStatus?.status === 'yellow' ? '🟡' : marketStatus?.status === 'red' ? '🔴' : '-';
                  
                  return (
                    <tr key={market} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-3 font-semibold text-gray-900">{market === 'Fr' ? 'France' : market}</td>
                      <td className="py-3 px-3 text-center font-mono text-sm">{data?.deletionRequests || 0}</td>
                      <td className="py-3 px-3 text-center font-mono text-sm">{data?.deletionsHC || '-'}</td>
                      <td className="py-3 px-3 text-center font-mono text-sm">{data?.dsarRequests || 0}</td>
                      <td className="py-3 px-3 text-center font-mono text-sm">{data?.escalations || 0}</td>
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

function getMarketBreakdown(reports: WeeklyReport[]) {
  const markets = ['DACH', 'France', 'Nordics', 'NL', 'Be / Lux'];
  
  return markets.map(market => {
    const marketReports = reports.filter(r => r.market === market);
    
    // Get latest report for status
    const latestReport = marketReports.length > 0 
      ? marketReports.reduce((latest, r) => r.weekOf > latest.weekOf ? r : latest)
      : null;
    
    return {
      market,
      deletion: marketReports.reduce((sum, r) => sum + r.deletionRequests, 0),
      portability: marketReports.reduce((sum, r) => sum + r.portabilityRequests, 0),
      legalSupport: marketReports.reduce((sum, r) => sum + r.legalEscalations + r.regulatorInquiries + r.privacyIncidents, 0),
      status: latestReport?.riskStatus || 'green',
    };
  });
}

function calculateMonthlySummary(reports: WeeklyReport[], month: string) {
  const totalDeletionRequests = reports.reduce((sum, r) => sum + r.deletionRequests, 0);
  const totalPortabilityRequests = reports.reduce((sum, r) => sum + r.portabilityRequests, 0);
  const totalRequests = totalDeletionRequests + totalPortabilityRequests;
  const totalEscalations = reports.reduce((sum, r) => sum + r.legalEscalations + r.regulatorInquiries + r.privacyIncidents, 0);
  const marketsAtRisk = new Set(reports.filter(r => r.riskStatus === 'yellow' || r.riskStatus === 'red').map(r => r.market)).size;
  const avgBacklog = reports.length > 0 ? reports.reduce((sum, r) => sum + r.currentBacklog, 0) / reports.length : 0;
  
  return { totalRequests, totalDeletionRequests, totalPortabilityRequests, totalEscalations, marketsAtRisk, avgBacklog };
}

function getMarketStatusData(reports: WeeklyReport[]) {
  // Get latest report per market
  const marketMap = new Map<string, WeeklyReport>();
  
  reports.forEach(report => {
    const existing = marketMap.get(report.market);
    if (!existing || report.weekOf > existing.weekOf) {
      marketMap.set(report.market, report);
    }
  });

  return Array.from(marketMap.values()).map(r => ({
    market: r.market,
    status: r.riskStatus,
    reason: r.riskExplanation || (r.riskStatus === 'green' ? 'All systems operational' : 'No explanation provided'),
  }));
}

function getGreenMarkets(reports: WeeklyReport[]) {
  // Get latest report per market
  const marketMap = new Map<string, WeeklyReport>();
  
  reports.forEach(report => {
    const existing = marketMap.get(report.market);
    if (!existing || report.weekOf > existing.weekOf) {
      marketMap.set(report.market, report);
    }
  });

  return Array.from(marketMap.values())
    .filter(r => r.riskStatus === 'green')
    .map(r => ({
      market: r.market,
      requests: r.deletionRequests + r.portabilityRequests,
    }));
}

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

function calculateMonthlySummary_OLD(reports: WeeklyReport[], month: string) {
  const totalRequests = reports.reduce((sum, r) => sum + r.deletionRequests + r.portabilityRequests, 0);
  const totalEscalations = reports.reduce((sum, r) => sum + r.legalEscalations + r.regulatorInquiries + r.privacyIncidents, 0);
  const marketsAtRisk = new Set(reports.filter(r => r.riskStatus === 'yellow' || r.riskStatus === 'red').map(r => r.market)).size;
  const avgBacklog = reports.length > 0 ? reports.reduce((sum, r) => sum + r.currentBacklog, 0) / reports.length : 0;
  
  return { totalRequests, totalEscalations, marketsAtRisk, avgBacklog };
}

function extractHighlights(reports: WeeklyReport[], activityLog: ActivityLogEntry[]) {
  const negative: string[] = [];
  const positive: string[] = [];
  
  // From reports
  reports.forEach(r => {
    if (r.riskStatus === 'red') {
      negative.push(`${r.market}: Red status${r.escalationDetails ? ` - ${r.escalationDetails}` : ''}`);
    }
    if (r.legalEscalations > 0) {
      negative.push(`${r.market}: ${r.legalEscalations} legal escalation(s)`);
    }
    if (r.riskStatus === 'green' && r.deletionRequests + r.portabilityRequests > 0) {
      positive.push(`${r.market}: All green, ${r.deletionRequests + r.portabilityRequests} requests handled`);
    }
  });
  
  // From activity log
  activityLog.forEach(a => {
    if (a.category === 'Escalation') {
      negative.push(`${a.market}: ${a.details}`);
    } else if (a.details.startsWith('✅')) {
      positive.push(`${a.market}: ${a.details.replace('✅ ', '')}`);
    }
  });
  
  return { negative: negative.slice(0, 5), positive: positive.slice(0, 5) };
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

function generateMonthlySummaryHTML(current: any, previous: any, highlights: any, selectedMonth: string, reports: WeeklyReport[], activityLog: ActivityLogEntry[], trainingReport: TrainingReport | null, marketDeepDive: MarketDeepDive | null): string {
  const monthName = formatMonthDisplay(selectedMonth);
  const breakdown = getMarketBreakdown(reports);
  
  // Get market status for traffic lights
  const marketStatusData = getMarketStatusData(reports);
  
  // Calculate metrics for Executive Summary Box
  const totalDeletions = marketDeepDive ? Object.values(marketDeepDive.markets).reduce((sum, m) => sum + (m?.deletionRequests || 0) + (m?.deletionsHC || 0), 0) : current.totalDeletionRequests;
  const totalDSAR = marketDeepDive ? Object.values(marketDeepDive.markets).reduce((sum, m) => sum + (m?.dsarRequests || 0), 0) : current.totalPortabilityRequests;
  const totalLegalEscalations = marketDeepDive ? Object.values(marketDeepDive.markets).reduce((sum, m) => sum + (m?.escalations || 0), 0) : current.totalEscalations;
  const criticalIncidentsCount = marketDeepDive?.significantIncidents?.length || 0;
  
  // Market Deep Dive rows (if available) - ordered by importance: DACH, France, BNL, Nordics
  const marketOrder = ['DACH', 'Fr', 'BNL', 'Nordics'] as const;
  const deepDiveMarketRows = marketDeepDive ? marketOrder.map(market => {
    const data = marketDeepDive.markets[market as keyof typeof marketDeepDive.markets];
    if (!data) return '';
    
    // Find status from reporting data
    const marketStatus = marketStatusData.find(m => {
      if (market === 'Fr') return m.market === 'France';
      if (market === 'BNL') return m.market === 'NL' || m.market === 'Be / Lux';
      return m.market === market;
    });
    
    const statusEmoji = marketStatus?.status === 'green' ? '🟢' : marketStatus?.status === 'yellow' ? '🟡' : marketStatus?.status === 'red' ? '🔴' : '-';
    
    return `
      <tr>
        <td style="padding: 10px 12px;"><strong>${market === 'Fr' ? 'France' : market}</strong></td>
        <td style="text-align: center; padding: 10px 12px;">${data.deletionRequests}</td>
        <td style="text-align: center; padding: 10px 12px;">${data.deletionsHC || '-'}</td>
        <td style="text-align: center; padding: 10px 12px;">${data.dsarRequests}</td>
        <td style="text-align: center; padding: 10px 12px;">${data.escalations || 0}</td>
        <td style="text-align: center; padding: 10px 12px; font-size: 18px;">${statusEmoji}</td>
      </tr>`;
  }).join('') : '';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f9fafb; }
    .container { max-width: 800px; margin: 0 auto; background: white; }
    .header { background: #7FB838; color: white; padding: 24px 30px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .header p { margin: 5px 0 0 0; opacity: 0.95; font-size: 12px; }
    .executive-summary { background: #f5f5f5; padding: 20px 30px; margin: 20px 30px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .executive-summary h2 { margin: 0 0 15px 0; font-size: 16px; color: #111827; font-weight: 600; }
    .summary-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 15px; }
    .summary-metric { text-align: center; }
    .summary-metric .value { font-size: 28px; font-weight: 700; color: #111827; display: block; margin-bottom: 4px; }
    .summary-metric .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .section { background: #ffffff; padding: 20px 30px; border-bottom: 1px solid #e5e7eb; }
    .section h2 { margin: 0 0 10px 0; font-size: 15px; color: #111827; font-weight: 600; }
    .section h3 { margin: 12px 0 6px 0; font-size: 14px; color: #374151; font-weight: 600; }
    .section p { margin: 0; color: #4b5563; font-size: 13px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; background: white; border: 1px solid #e5e7eb; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    th { background: #f9fafb; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #374151; border-bottom: 2px solid #e5e7eb; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #374151; }
    tr:hover { background: #f9fafb; transition: background 0.15s; }
    .info-box { background: #f9fafb; border-left: 3px solid #d1d5db; padding: 10px 14px; margin: 8px 0; border-radius: 2px; }
    .incident-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 8px 0; border-radius: 2px; line-height: 1.6; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .incident-title { font-weight: 600; font-size: 13px; color: #111827; margin: 0 0 4px 0; }
    .incident-list { margin: 4px 0; padding-left: 18px; font-size: 12px; color: #4b5563; }
    .incident-list li { margin: 3px 0; }
    ul { margin: 6px 0; padding-left: 18px; }
    li { margin: 5px 0; color: #4b5563; font-size: 12px; line-height: 1.5; }
    .market-tag { display: inline-block; background: #e5e7eb; color: #374151; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; margin-right: 4px; }
    .footer { background: #f9fafb; padding: 16px 30px; text-align: center; color: #6b7280; font-size: 11px; border-top: 1px solid #e5e7eb; }
    .footer a { color: #7FB838; text-decoration: none; font-weight: 500; }
    .footer a:hover { text-decoration: underline; }
    .training-footnote { font-size: 0.9em; color: #666; font-style: italic; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>GDPR Monthly Report - ${monthName}</h1>
      <p>GDPR Compliance Summary for HelloFresh DACH, France, BNL and Nordics</p>
    </div>

    <!-- Executive Summary Box -->
    <div class="executive-summary">
      <h2>📊 ${monthName} Summary</h2>
      <div class="summary-metrics">
        <div class="summary-metric">
          <span class="value">${totalDeletions}</span>
          <span class="label">Deletions</span>
        </div>
        <div class="summary-metric">
          <span class="value">${totalDSAR}</span>
          <span class="label">DSAR Requests</span>
        </div>
        <div class="summary-metric">
          <span class="value">${totalLegalEscalations}</span>
          <span class="label">Legal Escalations</span>
        </div>
        <div class="summary-metric">
          <span class="value">${criticalIncidentsCount}</span>
          <span class="label">Incidents</span>
        </div>
      </div>
    </div>

    ${marketDeepDive && marketDeepDive.summaryAndOutlook ? `
    <div class="section">
      <h2>Summary & Outlook</h2>
      <p style="line-height: 1.6;">${marketDeepDive.summaryAndOutlook.replace(/\n/g, '<br>')}</p>
    </div>
    ` : ''}

    ${marketDeepDive && marketDeepDive.significantIncidents && marketDeepDive.significantIncidents.length > 0 ? `
    <div class="section">
      <h2>GDPR Related Incidents & Compliance Risks</h2>
      ${marketDeepDive.significantIncidents.map((inc, idx) => `
        <div class="incident-box">
          <div class="incident-title">Incident ${String.fromCharCode(65 + idx)}: ${inc.title}</div>
          <ul class="incident-list">
            <li><strong>What happened:</strong> ${inc.description.split('Compliance Risk:')[0].replace('What happened:', '').trim()}</li>
            ${inc.description.includes('Compliance Risk:') ? `<li><strong>Compliance Risk:</strong> ${inc.description.split('Compliance Risk:')[1].split('Status/Impact:')[0].trim()}</li>` : ''}
            ${inc.description.includes('Status/Impact:') ? `<li><strong>Status/Impact:</strong> ${inc.description.split('Status/Impact:')[1].trim()}</li>` : ''}
          </ul>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${marketDeepDive ? `
    <div class="section">
      <h2>Market Snapshot</h2>
      <table>
        <thead>
          <tr>
            <th style="font-weight: 700;">Market</th>
            <th style="text-align: center; font-weight: 700;">Deletions</th>
            <th style="text-align: center; font-weight: 700;">Deletions HC</th>
            <th style="text-align: center; font-weight: 700;">DSAR</th>
            <th style="text-align: center; font-weight: 700;">Legal Escalations</th>
            <th style="text-align: center; font-weight: 700;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${deepDiveMarketRows}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="section">
      <h2>Highlights</h2>
      ${marketDeepDive && marketDeepDive.highlightsOverride ? 
        `<p style="line-height: 1.6; white-space: pre-wrap;">${marketDeepDive.highlightsOverride}</p>` : 
        generateHighlightsHTML(activityLog)
      }
    </div>

    <div class="section">
      <h2>Lowlights & Attention Areas</h2>
      ${marketDeepDive && marketDeepDive.lowlightsOverride ? 
        `<p style="line-height: 1.6; white-space: pre-wrap;">${marketDeepDive.lowlightsOverride}</p>` : 
        generateLowlightsHTML_Improved(reports, activityLog)
      }
    </div>

    ${trainingReport && trainingReport.totalCases > 0 ? `
    <div class="section">
      <h2>Agent Training Snapshot</h2>
      ${generateTrainingHTML(trainingReport)}
      <div class="training-footnote">*Currently showing data for DACH market only. Additional markets will be included in future reports as training data becomes available.</div>
    </div>
    ` : ''}

    <div class="footer">
      <p>Report generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} | <a href="https://gdpr-assistant.hellofresh.com/reporting/view" target="_blank">View Online</a></p>
      <p style="margin: 6px 0 0 0;"><strong>HelloFresh GDPR Team</strong></p>
      ${marketDeepDive && marketDeepDive.attributions && marketDeepDive.attributions.length > 0 ? `
      <p style="margin: 8px 0 0 0;">Thank you for your contributions: ${marketDeepDive.attributions.sort().map(email => `<strong>${email}</strong>`).join(', ')}.</p>
      ` : ''}
    </div>
  </div>
</body>
</html>
  `.trim();
}

function generateHighlightsHTML(activityLog: ActivityLogEntry[]): string {
  const wins = activityLog.filter(a => a.category === 'Initiative' && a.details.startsWith('✅'));
  const initiatives = activityLog.filter(a => a.category === 'Initiative' && !a.details.startsWith('✅'));
  
  let html = '';
  
  if (wins.length > 0) {
    html += '<div class="info-box">';
    html += '<h3 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600;">Wins & Achievements</h3>';
    html += '<ul style="margin: 4px 0;">';
    wins.forEach(w => {
      const dateStr = w.weekOf ? new Date(w.weekOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      html += `<li><span class="market-tag">${w.market}</span>${w.details.replace('✅ ', '')} <span style="color: #9ca3af; font-size: 11px;">(${dateStr})</span></li>`;
    });
    html += '</ul>';
    html += '</div>';
  }
  
  if (initiatives.length > 0) {
    html += '<div class="info-box">';
    html += '<h3 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600;">Current Initiatives</h3>';
    html += '<ul style="margin: 4px 0;">';
    initiatives.forEach(i => {
      html += `<li><span class="market-tag">${i.market}</span>${i.details}</li>`;
    });
    html += '</ul>';
    html += '</div>';
  }
  
  if (wins.length === 0 && initiatives.length === 0) {
    html += '<p style="color: #9ca3af; font-style: italic; font-size: 12px;">No major wins or initiatives reported this month.</p>';
  }
  
  return html;
}

function generateLowlightsHTML(reports: WeeklyReport[], activityLog: ActivityLogEntry[]): string {
  const atRiskMarkets = getMarketStatusData(reports).filter(m => m.status === 'yellow' || m.status === 'red');
  const escalations = activityLog.filter(a => a.category === 'Escalation');
  
  let html = '';
  
  if (atRiskMarkets.length > 0) {
    html += '<div class="info-box">';
    html += '<h3 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600;">Markets Requiring Attention</h3>';
    html += '<ul style="margin: 4px 0;">';
    atRiskMarkets.forEach(m => {
      const emoji = m.status === 'red' ? '🔴' : '🟡';
      html += `<li>${emoji} <span class="market-tag">${m.market}</span>${m.reason}</li>`;
    });
    html += '</ul>';
    html += '</div>';
  }
  
  if (escalations.length > 0) {
    html += '<div class="info-box">';
    html += '<h3 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600;">Noteworthy Complaints & Issues</h3>';
    
    // Group escalations by market
    const escalationsByMarket = escalations.reduce((acc, e) => {
      if (!acc[e.market]) acc[e.market] = [];
      acc[e.market].push(e);
      return acc;
    }, {} as Record<string, ActivityLogEntry[]>);
    
    // Display grouped by market
    Object.entries(escalationsByMarket).forEach(([market, entries]) => {
      html += `<div style="margin: 8px 0;"><strong style="color: #374151; font-size: 12px;">${market}:</strong><ul style="margin: 2px 0; padding-left: 20px;">`;
      entries.forEach(e => {
        html += `<li>${e.details}</li>`;
      });
      html += '</ul></div>';
    });
    html += '</div>';
  }
  
  if (atRiskMarkets.length === 0 && escalations.length === 0) {
    html += '<p style="color: #9ca3af; font-style: italic; font-size: 12px;">All markets green - no major issues to report.</p>';
  }
  
  return html;
}

// Improved version with better spacing and market-based structure
function generateLowlightsHTML_Improved(reports: WeeklyReport[], activityLog: ActivityLogEntry[]): string {
  const atRiskMarkets = getMarketStatusData(reports).filter(m => m.status === 'yellow' || m.status === 'red');
  const escalations = activityLog.filter(a => a.category === 'Escalation');
  
  let html = '';
  
  if (atRiskMarkets.length > 0) {
    html += '<div class="info-box">';
    html += '<h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600;">Markets Requiring Attention</h3>';
    html += '<ul style="margin: 4px 0; line-height: 1.6;">';
    atRiskMarkets.forEach(m => {
      const emoji = m.status === 'red' ? '🔴' : '🟡';
      html += `<li style="margin: 6px 0;">${emoji} <span class="market-tag">${m.market}</span>${m.reason}</li>`;
    });
    html += '</ul>';
    html += '</div>';
  }
  
  if (escalations.length > 0) {
    html += '<div class="info-box" style="margin-top: 12px;">';
    html += '<h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600;">Noteworthy Complaints & Issues</h3>';
    
    // Group escalations by market
    const escalationsByMarket = escalations.reduce((acc, e) => {
      if (!acc[e.market]) acc[e.market] = [];
      acc[e.market].push(e);
      return acc;
    }, {} as Record<string, ActivityLogEntry[]>);
    
    // Display grouped by market with better structure
    Object.entries(escalationsByMarket).forEach(([market, entries], idx) => {
      html += `<div style="margin: ${idx > 0 ? '15px' : '0'} 0;">`;
      html += `<h4 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #111827;">${market}</h4>`;
      html += '<ul style="margin: 0; padding-left: 20px; line-height: 1.6;">';
      entries.forEach(e => {
        const dateStr = e.weekOf ? new Date(e.weekOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        html += `<li style="margin: 5px 0; color: #4b5563;">${e.details} <span style="color: #9ca3af; font-size: 11px;">(${dateStr})</span></li>`;
      });
      html += '</ul></div>';
    });
    html += '</div>';
  }
  
  if (atRiskMarkets.length === 0 && escalations.length === 0) {
    html += '<p style="color: #10b981; font-weight: 600; font-size: 13px;">🎉 All markets green - no major issues to report!</p>';
  }
  
  return html;
}

function generateTrainingHTML(trainingReport: TrainingReport): string {
  let html = '<p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">Common 1st Line Agent errors identified this month requiring training intervention.</p>';
  
  // Group by market
  const marketGroups = new Map<string, typeof trainingReport.topErrors>();
  trainingReport.topErrors.forEach(error => {
    if (!marketGroups.has(error.market)) {
      marketGroups.set(error.market, []);
    }
    marketGroups.get(error.market)!.push(error);
  });

  marketGroups.forEach((errors, market) => {
    html += `<div style="margin-bottom: 15px;">`;
    html += `<h3 style="margin: 0 0 10px 0; font-size: 16px;"><span class="market-tag">${market}</span> Top Errors (${errors.reduce((sum, e) => sum + e.count, 0)} cases)</h3>`;
    html += '<table style="width: 100%; border-collapse: collapse; font-size: 13px;">';
    html += '<thead><tr style="border-bottom: 2px solid #ddd;">';
    html += '<th style="text-align: left; padding: 8px;">Error Type</th>';
    html += '<th style="text-align: right; padding: 8px;">Count</th>';
    html += '<th style="text-align: center; padding: 8px;">Trend</th>';
    html += '</tr></thead><tbody>';
    
    errors.slice(0, 5).forEach(error => {
      const trendIcon = error.trend === 'up' ? '📈' : error.trend === 'down' ? '📉' : '➡️';
      const trendColor = error.trend === 'up' ? '#DC2626' : error.trend === 'down' ? '#059669' : '#6B7280';
      const englishDescription = translateErrorDescription(error.errorDescription);
      html += '<tr style="border-bottom: 1px solid #eee;">';
      html += `<td style="padding: 8px; color: #333;">${englishDescription}</td>`;
      html += `<td style="padding: 8px; text-align: right; font-weight: bold;">${error.count}</td>`;
      html += `<td style="padding: 8px; text-align: center; color: ${trendColor};">${trendIcon}</td>`;
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    html += '</div>';
  });

  if (marketGroups.size === 0) {
    html += '<p style="color: #888; font-style: italic;">No training cases reported this month.</p>';
  }

  return html;
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

// Helper function to aggregate Market Deep Dive data on-the-fly
async function aggregateMarketDeepDive(month: string): Promise<MarketDeepDive> {
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0, 23, 59, 59);
  
  const result: Record<string, MarketData> = {
    DACH: { deletionRequests: 0, dsarRequests: 0, escalations: 0, statusText: '' },
    Nordics: { deletionRequests: 0, dsarRequests: 0, escalations: 0, statusText: '' },
    BNL: { deletionRequests: 0, dsarRequests: 0, escalations: 0, statusText: '' },
    Fr: { deletionRequests: 0, dsarRequests: 0, escalations: 0, statusText: '' },
  };
  
  try {
    const [allCases, categories, weeklyReports, activityLog] = await Promise.all([
      getAllCases().catch(() => []),
      getCategories().catch(() => []),
      getWeeklyReports().catch(() => []),
      getActivityLog().catch(() => []),
    ]);
    
    // Filter for the month
    const monthCases = allCases.filter(c => {
      try {
        const caseDate = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt);
        return caseDate >= startDate && caseDate <= endDate;
      } catch {
        return false;
      }
    });
    
    const monthReports = weeklyReports.filter(r => {
      try {
        const reportDate = r.weekOf instanceof Date ? r.weekOf : new Date(r.weekOf);
        return reportDate >= startDate && reportDate <= endDate;
      } catch {
        return false;
      }
    });
    
    const monthEscalations = activityLog.filter(a => {
      try {
        const logDate = a.weekOf instanceof Date ? a.weekOf : new Date(a.weekOf);
        return a.category === 'Escalation' && logDate >= startDate && logDate <= endDate;
      } catch {
        return false;
      }
    });
    
    // Find categories
    const deletionCategory = categories.find(c => c.nameEn?.toLowerCase().includes('deletion'));
    const dsarCategory = categories.find(c => 
      c.nameEn?.toLowerCase().includes('access') || 
      c.nameEn?.toLowerCase().includes('portability') ||
      c.nameEn?.toLowerCase().includes('dsar')
    );
    
    // Market mapping
    const mapMarket = (market: string): string | null => {
      if (!market) return null;
      const upper = market.toUpperCase();
      if (['DE', 'AT', 'CH', 'DACH'].includes(upper)) return 'DACH';
      if (['SE', 'NO', 'DK', 'FI', 'NORDICS'].includes(upper)) return 'Nordics';
      if (['NL', 'BE', 'LU', 'BNL'].includes(upper)) return 'BNL';
      if (['FR', 'FRANCE'].includes(upper)) return 'Fr';
      if (market === 'Be / Lux') return 'BNL';
      if (market === 'France') return 'Fr';
      return null;
    };
    
    // Count from cases
    monthCases.forEach(caseItem => {
      const marketGroup = mapMarket(caseItem.market);
      if (!marketGroup) return;
      
      if (deletionCategory && caseItem.primaryCategory === deletionCategory.id) {
        result[marketGroup].deletionRequests++;
      }
      if (dsarCategory && caseItem.primaryCategory === dsarCategory.id) {
        result[marketGroup].dsarRequests++;
      }
    });
    
    // Count from weekly reports
    monthReports.forEach(report => {
      const marketGroup = mapMarket(report.market);
      if (!marketGroup) return;
      
      result[marketGroup].deletionRequests += (report.deletionRequests || 0);
      result[marketGroup].dsarRequests += (report.portabilityRequests || 0);
    });
    
    // Count escalations
    monthEscalations.forEach(escalation => {
      const marketGroup = mapMarket(escalation.market);
      if (!marketGroup) return;
      
      result[marketGroup].escalations++;
    });
  } catch (error) {
    console.error('Error aggregating market deep dive:', error);
  }
  
  return {
    id: month,
    month,
    markets: {
      DACH: result.DACH,
      Nordics: result.Nordics,
      BNL: result.BNL,
      Fr: result.Fr,
    },
    significantIncidents: [],
    summaryAndOutlook: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function formatMonthDisplay(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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
