'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getWeeklyReports, getActivityLog } from '@/lib/firebase/weeklyReports';
import { generateTrainingReport } from '@/lib/firebase/trainingCases';
import { ACTIVITY_KIND_LABELS, type ActivityLogKind, type WeeklyReport, type ActivityLogEntry } from '@/lib/types';
import { TrainingReport } from '@/lib/types/training';
import { MarketDeepDive, MarketData } from '@/lib/types/marketDeepDive';
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
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
import {
  generateActivityLogPlainText,
  resolveActivityKind,
  isActivityHighlightKind,
  isActivityLowlightKind,
  displayMarketLabel,
  activityKindBadgeClass,
} from '@/lib/reporting/activityLogKinds';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  REPORT_MARKETS,
  buildYearChartRows,
  reportMatchesChartMarket,
  reportsInCalendarYear,
} from '@/lib/reporting/yearAggregates';

export default function ReportingPage() {
  const { showToast } = useToast();
  const { isAdmin } = useAuth();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [trainingReport, setTrainingReport] = useState<TrainingReport | null>(null);
  const [marketDeepDive, setMarketDeepDive] = useState<MarketDeepDive | null>(null);
  const [previousMonthDeepDive, setPreviousMonthDeepDive] = useState<MarketDeepDive | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  /** 1–12: month used for GDPR/MBR export, deep dive, and highlight cards (same calendar year as `selectedYear`). */
  const [reportMonth, setReportMonth] = useState(() => new Date().getMonth() + 1);
  const exportMonthKey = `${selectedYear}-${String(reportMonth).padStart(2, '0')}`;
  const [eventMarket, setEventMarket] = useState<string>('all');
  const [eventKind, setEventKind] = useState<string>('all');
  const [eventSortDesc, setEventSortDesc] = useState(true);
  const [chartMarketsOn, setChartMarketsOn] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(REPORT_MARKETS.map(m => [m, true]))
  );

  useEffect(() => {
    loadData();
  }, [exportMonthKey]);

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
        const [year, month] = exportMonthKey.split('-').map(Number);
        const prevDate = new Date(year, month - 2, 1);
        const previousMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
        const trainingData = await generateTrainingReport(exportMonthKey, previousMonth);
        setTrainingReport(trainingData);
      } catch (err) {
        console.log('No training data available for this month');
        setTrainingReport(null);
      }

      // Load market deep dive for selected month + previous month (MoM in UI / GDPR report)
      try {
        const prevMonthKey = getPreviousMonth(exportMonthKey);
        console.log('Aggregating market deep dive data (current + previous month)...');
        const [currentDive, prevDive] = await Promise.all([
          buildMergedMarketDeepDive(exportMonthKey),
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

  const reportsYearAll = useMemo(
    () => reportsInCalendarYear(reports, selectedYear),
    [reports, selectedYear]
  );

  const reportsExportMonth = useMemo(
    () => reports.filter(r => formatMonthKey(r.weekOf) === exportMonthKey),
    [reports, exportMonthKey]
  );

  const activityExportMonth = useMemo(
    () => activityLog.filter(a => formatMonthKey(a.weekOf) === exportMonthKey),
    [activityLog, exportMonthKey]
  );

  const monthlySummary = calculateMonthlySummary(reportsExportMonth, exportMonthKey);

  const previousMonthKey = getPreviousMonth(exportMonthKey);
  const previousMonthReports = reports.filter(r => formatMonthKey(r.weekOf) === previousMonthKey);
  const previousMonthlySummary = calculateMonthlySummary(previousMonthReports, previousMonthKey);

  const highlights = extractHighlights(reportsExportMonth, activityExportMonth);

  const chartRows = useMemo(() => buildYearChartRows(reportsYearAll, selectedYear), [reportsYearAll, selectedYear]);

  const activityInYear = useMemo(() => {
    return activityLog.filter(e => {
      if (new Date(e.weekOf).getFullYear() !== selectedYear) return false;
      if (eventMarket !== 'all') {
        if (eventMarket === 'BNL') {
          if (e.market !== 'NL' && e.market !== 'Be / Lux') return false;
        } else if (e.market !== eventMarket) {
          return false;
        }
      }
      if (eventKind !== 'all' && resolveActivityKind(e) !== eventKind) return false;
      return true;
    });
  }, [activityLog, selectedYear, eventMarket, eventKind]);

  const eventsSorted = useMemo(() => {
    const arr = [...activityInYear];
    arr.sort((a, b) =>
      eventSortDesc ? b.weekOf.getTime() - a.weekOf.getTime() : a.weekOf.getTime() - b.weekOf.getTime()
    );
    return arr;
  }, [activityInYear, eventSortDesc]);

  const prevYearReports = useMemo(
    () => reportsInCalendarYear(reports, selectedYear - 1),
    [reports, selectedYear]
  );
  const prevChartRows = useMemo(
    () => buildYearChartRows(prevYearReports, selectedYear - 1),
    [prevYearReports, selectedYear]
  );

  const monthlyTotalRequests = useMemo(
    () =>
      chartRows.map(r =>
        REPORT_MARKETS.reduce((sum, mk) => sum + (r[mk] as number), 0)
      ),
    [chartRows]
  );
  const ytdTotalRequests = useMemo(() => monthlyTotalRequests.reduce((a, b) => a + b, 0), [monthlyTotalRequests]);
  const sparklineData = useMemo(
    () => monthlyTotalRequests.map((v, i) => ({ i, v })),
    [monthlyTotalRequests]
  );

  const ytdDeletions = useMemo(
    () => reportsYearAll.reduce((s, r) => s + r.deletionRequests, 0),
    [reportsYearAll]
  );
  const ytdPortability = useMemo(
    () => reportsYearAll.reduce((s, r) => s + r.portabilityRequests, 0),
    [reportsYearAll]
  );
  const ytdLegal = useMemo(
    () =>
      reportsYearAll.reduce(
        (s, r) => s + r.legalEscalations + r.regulatorInquiries + r.privacyIncidents,
        0
      ),
    [reportsYearAll]
  );

  const prevYtdTotal = useMemo(
    () =>
      prevChartRows.reduce(
        (sum, r) => sum + REPORT_MARKETS.reduce((s, mk) => s + (r[mk] as number), 0),
        0
      ),
    [prevChartRows]
  );

  const marketPerformanceRows = useMemo(() => {
    const totals = REPORT_MARKETS.map(mk =>
      reportsYearAll
        .filter(r => reportMatchesChartMarket(r, mk))
        .reduce((s, r) => s + r.deletionRequests + r.portabilityRequests, 0)
    );
    const maxT = Math.max(...totals, 1);
    return REPORT_MARKETS.map((mk, idx) => {
      const total = totals[idx];
      const prev = prevYearReports
        .filter(r => reportMatchesChartMarket(r, mk))
        .reduce((s, r) => s + r.deletionRequests + r.portabilityRequests, 0);
      const del = reportsYearAll
        .filter(r => reportMatchesChartMarket(r, mk))
        .reduce((s, r) => s + r.deletionRequests, 0);
      const port = reportsYearAll
        .filter(r => reportMatchesChartMarket(r, mk))
        .reduce((s, r) => s + r.portabilityRequests, 0);
      return { mk, total, prev, del, port, barPct: (total / maxT) * 100 };
    });
  }, [reportsYearAll, prevYearReports]);

  const LINE_COLORS: Record<string, string> = {
    DACH: '#7c3aed',
    France: '#0d9488',
    Nordics: '#db2777',
    BNL: '#0284c7',
  };

  const prevYtdDel = useMemo(
    () => prevYearReports.reduce((s, r) => s + r.deletionRequests, 0),
    [prevYearReports]
  );
  const prevYtdPort = useMemo(
    () => prevYearReports.reduce((s, r) => s + r.portabilityRequests, 0),
    [prevYearReports]
  );
  const prevYtdLegal = useMemo(
    () =>
      prevYearReports.reduce(
        (s, r) => s + r.legalEscalations + r.regulatorInquiries + r.privacyIncidents,
        0
      ),
    [prevYearReports]
  );

  const monthlyDelSpark = useMemo(() => {
    const sums = Array.from({ length: 12 }, () => 0);
    reportsYearAll.forEach(r => {
      const d = new Date(r.weekOf);
      if (d.getFullYear() !== selectedYear) return;
      sums[d.getMonth()] += r.deletionRequests;
    });
    return sums;
  }, [reportsYearAll, selectedYear]);

  const delSparklineData = useMemo(
    () => monthlyDelSpark.map((v, i) => ({ i, v })),
    [monthlyDelSpark]
  );

  const monthlyPortSpark = useMemo(() => {
    const sums = Array.from({ length: 12 }, () => 0);
    reportsYearAll.forEach(r => {
      const d = new Date(r.weekOf);
      if (d.getFullYear() !== selectedYear) return;
      sums[d.getMonth()] += r.portabilityRequests;
    });
    return sums;
  }, [reportsYearAll, selectedYear]);
  const portSparklineData = useMemo(
    () => monthlyPortSpark.map((v, i) => ({ i, v })),
    [monthlyPortSpark]
  );

  const monthlyLegalSpark = useMemo(() => {
    const sums = Array.from({ length: 12 }, () => 0);
    reportsYearAll.forEach(r => {
      const d = new Date(r.weekOf);
      if (d.getFullYear() !== selectedYear) return;
      sums[d.getMonth()] +=
        r.legalEscalations + r.regulatorInquiries + r.privacyIncidents;
    });
    return sums;
  }, [reportsYearAll, selectedYear]);
  const legalSparklineData = useMemo(
    () => monthlyLegalSpark.map((v, i) => ({ i, v })),
    [monthlyLegalSpark]
  );

  async function copyActivityLog(activities: ActivityLogEntry[]) {
    const text = generateActivityLogPlainText(activities);
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

  async function copyGdprReport() {
    const htmlSummary = generateMonthlySummaryHTML(
      monthlySummary,
      previousMonthlySummary,
      highlights,
      exportMonthKey,
      reportsExportMonth,
      activityExportMonth,
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
    
    const htmlReport = generateMBRReportHTML(exportMonthKey, marketDeepDive.markets, marketDeepDive.significantIncidents, marketDeepDive.summaryAndOutlook || '');
    
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
    const csv = generateCSV(reportsExportMonth);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gdpr-report-${exportMonthKey}.csv`;
    a.click();
  }

  function formatYoy(cur: number, prev: number): string | null {
    if (prev <= 0) return null;
    const p = ((cur - prev) / prev) * 100;
    return `${p > 0 ? '+' : ''}${p.toFixed(1)}%`;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-gray-600">Loading reporting data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">GDPR performance</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">Reporting</h1>
          <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 shadow-sm">
            <span className="text-gray-500">Range</span>
            <span className="font-medium text-gray-900">
              Jan 1, {selectedYear} – Dec 31, {selectedYear}
            </span>
          </p>
          <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
            <Link href="/reporting" className="text-blue-600 hover:underline">
              Dashboard (shareable)
            </Link>
            <span className="text-gray-300" aria-hidden>
              |
            </span>
            <Link href="/reporting/overrides" className="text-blue-600 hover:underline">
              Overrides (GDPR &amp; MBR)
            </Link>
            <span className="text-gray-300" aria-hidden>
              |
            </span>
            <Link href="/reporting/submit" className="text-blue-600 hover:underline">
              Submit weekly data
            </Link>
            {isAdmin && (
              <>
                <span className="text-gray-300" aria-hidden>
                  |
                </span>
                <Link href="/admin/reporting/edit" className="text-blue-600 hover:underline">
                  Admin: edit data
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/reporting/submit"
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Submit weekly data
          </Link>
          <Link
            href="/admin/training-cases/upload"
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
          >
            Upload training cases
          </Link>
          <Link
            href="/admin/training-cases/report"
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
          >
            Training report
          </Link>
        </div>
      </div>

      {/* Year + report month + chart filters */}
      <div className="mb-6 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Dashboard year
            </label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900"
            >
              {[0, 1, 2, 3, 4].map(off => {
                const y = new Date().getFullYear() - off;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Report &amp; export month
            </label>
            <select
              value={reportMonth}
              onChange={e => setReportMonth(Number(e.target.value))}
              className="min-w-[180px] rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>
                  {new Date(selectedYear, m - 1, 1).toLocaleDateString('en-US', { month: 'long' })} ({selectedYear})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Chart: markets</p>
          <div className="flex flex-wrap gap-2">
            {REPORT_MARKETS.map(mk => (
              <button
                key={mk}
                type="button"
                onClick={() => setChartMarketsOn(prev => ({ ...prev, [mk]: !prev[mk] }))}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  chartMarketsOn[mk]
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                }`}
              >
                {mk}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Lines = deletion + portability per month (dashboard year). Deep dive and GDPR copy use the selected report
            month only.
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total requests (YTD)</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{ytdTotalRequests.toLocaleString()}</p>
          {formatYoy(ytdTotalRequests, prevYtdTotal) && (
            <p className="mt-1 text-xs text-gray-500">
              vs prior calendar year:{' '}
              <span className="font-semibold text-gray-800">{formatYoy(ytdTotalRequests, prevYtdTotal)}</span>
            </p>
          )}
          <div className="mt-3 h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id="gSparkTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="i" hide />
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Area type="monotone" dataKey="v" stroke="#c4b5fd" strokeWidth={2} fill="url(#gSparkTotal)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Deletions (YTD)</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{ytdDeletions.toLocaleString()}</p>
          {formatYoy(ytdDeletions, prevYtdDel) && (
            <p className="mt-1 text-xs text-gray-500">
              vs prior year: <span className="font-semibold text-gray-800">{formatYoy(ytdDeletions, prevYtdDel)}</span>
            </p>
          )}
          <div className="mt-3 h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={delSparklineData}>
                <defs>
                  <linearGradient id="gSparkDel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="i" hide />
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Area type="monotone" dataKey="v" stroke="#5eead4" strokeWidth={2} fill="url(#gSparkDel)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Portability (YTD)</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{ytdPortability.toLocaleString()}</p>
          {formatYoy(ytdPortability, prevYtdPort) && (
            <p className="mt-1 text-xs text-gray-500">
              vs prior year:{' '}
              <span className="font-semibold text-gray-800">{formatYoy(ytdPortability, prevYtdPort)}</span>
            </p>
          )}
          <div className="mt-3 h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portSparklineData}>
                <defs>
                  <linearGradient id="gSparkPort" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f472b6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f472b6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="i" hide />
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Area type="monotone" dataKey="v" stroke="#f9a8d4" strokeWidth={2} fill="url(#gSparkPort)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Legal &amp; incidents (YTD)</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{ytdLegal.toLocaleString()}</p>
          {formatYoy(ytdLegal, prevYtdLegal) && (
            <p className="mt-1 text-xs text-gray-500">
              vs prior year: <span className="font-semibold text-gray-800">{formatYoy(ytdLegal, prevYtdLegal)}</span>
            </p>
          )}
          <div className="mt-3 h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={legalSparklineData}>
                <defs>
                  <linearGradient id="gSparkLeg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="i" hide />
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Area type="monotone" dataKey="v" stroke="#fdba74" strokeWidth={2} fill="url(#gSparkLeg)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Year trend + market comparison */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Requests by month</h2>
              <p className="text-xs text-gray-500">Deletion + portability, all toggled markets</p>
            </div>
          </div>
          {chartRows.some(r => REPORT_MARKETS.some(mk => chartMarketsOn[mk] && (r[mk] as number) > 0)) ? (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#d1d5db' }} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    width={36}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#111827' }}
                    formatter={(v: number) => [`${v} requests`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#4b5563' }} />
                  {REPORT_MARKETS.filter(mk => chartMarketsOn[mk]).map(mk => (
                    <Line
                      key={mk}
                      type="monotone"
                      dataKey={mk}
                      name={mk}
                      stroke={LINE_COLORS[mk] ?? '#94a3b8'}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-gray-500">No request data for this year yet.</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">Markets (YTD volume)</h2>
          <p className="mb-3 text-xs text-gray-500">Deletion + portability vs strongest market</p>
          <div className="space-y-3">
            {marketPerformanceRows.map(row => (
              <div key={row.mk}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-800">{row.mk}</span>
                  <span className="font-mono text-gray-600">{row.total.toLocaleString()}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-teal-500"
                    style={{ width: `${row.barPct}%` }}
                  />
                </div>
                <div className="mt-0.5 flex justify-between text-[10px] text-gray-500">
                  <span>
                    del {row.del} · port {row.port}
                  </span>
                  {formatYoy(row.total, row.prev) && (
                    <span className="text-gray-600">YoY {formatYoy(row.total, row.prev)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Copy Buttons */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{formatMonthDisplay(exportMonthKey)} report</h2>
            <p className="text-sm text-gray-600">Export or copy your GDPR report for email</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyGdprReport}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Copy GDPR report
            </button>
            <button
              onClick={copyMBRReport}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Copy MBR report
            </button>
            <button
              onClick={exportCSV}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Export CSV
            </button>
          </div>
        </div>

      {/* 1. Summary & Outlook (Market Deep Dive) */}
      {marketDeepDive && marketDeepDive.summaryAndOutlook && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Summary & Outlook
            </h2>
            <Link
              href="/reporting/overrides"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Edit →
            </Link>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{marketDeepDive.summaryAndOutlook}</p>
        </div>
      )}

      {/* 2. GDPR Related Incidents */}
      {marketDeepDive && marketDeepDive.significantIncidents && marketDeepDive.significantIncidents.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">GDPR related incidents & compliance risks</h2>
            <Link
              href="/reporting/overrides"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Edit →
            </Link>
          </div>
          <div className="space-y-3">
            {marketDeepDive.significantIncidents.map((incident, idx) => (
              <div
                key={idx}
                className="rounded-r-lg border border-red-200 border-l-4 border-l-red-500 bg-red-50 py-3 pl-4"
              >
                <h4 className="mb-1 text-sm font-semibold text-red-900">
                  Incident {String.fromCharCode(65 + idx)}: {incident.title}
                </h4>
                <p className="whitespace-pre-wrap text-sm text-gray-800">{incident.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {marketDeepDive && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Market snapshot — {formatMonthDisplay(exportMonthKey)} (detail)</h2>
            <Link
              href="/reporting/overrides"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Edit →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700">Market</th>
                  <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700">Deletions</th>
                  <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700">Access requests</th>
                  <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700">Legal escalations</th>
                  <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {['DACH', 'Fr', 'BNL', 'Nordics'].map(market => {
                  const data = marketDeepDive.markets[market as keyof typeof marketDeepDive.markets];
                  const prevData = previousMonthDeepDive?.markets?.[market as keyof typeof marketDeepDive.markets];
                  const marketStatus = getMarketStatusData(reportsExportMonth).find(m => {
                    if (market === 'Fr') return m.market === 'France';
                    if (market === 'BNL') return m.market === 'BNL';
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
                    <tr key={market} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-3 font-semibold text-gray-900">{market === 'Fr' ? 'France' : market}</td>
                      <td className="px-3 py-3 text-center text-sm">
                        <div className="font-mono font-medium text-gray-900">{del}</div>
                        {previousMonthDeepDive && (
                          <div className={`text-xs font-semibold ${momClass(del, delP)}`}>{momText(del, delP)}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-sm">
                        <div className="font-mono font-medium text-gray-900">{acc}</div>
                        {previousMonthDeepDive && (
                          <div className={`text-xs font-semibold ${momClass(acc, accP)}`}>{momText(acc, accP)}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-sm">
                        <div className="font-mono font-medium text-gray-900">{esc}</div>
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

      {/* 4. Highlights (report month) */}
      {activityExportMonth.filter(a => isActivityHighlightKind(resolveActivityKind(a))).length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Highlights — {formatMonthDisplay(exportMonthKey)}</h2>
          <HighlightsSectionComponent activityLog={activityExportMonth} />
        </div>
      )}

      {/* 5. Lowlights (report month) */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Lowlights &amp; attention — {formatMonthDisplay(exportMonthKey)}</h2>
        <LowlightsSectionComponent reports={reportsExportMonth} activityLog={activityExportMonth} />
      </div>

      {/* 6. Agent Training Snapshot */}
      {trainingReport && trainingReport.totalCases > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Agent training snapshot</h2>
              <p className="text-sm text-gray-600">
                Common 1st Line Agent errors requiring training intervention
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">{trainingReport.totalCases}</div>
              <div className="text-xs text-gray-500">Training cases</div>
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
              <div key={market} className="overflow-hidden rounded-lg border border-gray-200">
                <div className="border-b border-purple-200 bg-purple-50 px-4 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-purple-900">{displayMarketLabel(market)}</span>
                    <span className="rounded-full bg-purple-200 px-2 py-1 text-xs font-bold text-purple-900">
                      {errors.reduce((sum, e) => sum + e.count, 0)} cases
                    </span>
                  </div>
                </div>
                <div className="bg-white p-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs text-gray-600">
                        <th className="py-1 text-left">Error type</th>
                        <th className="w-16 py-1 text-right">Count</th>
                        <th className="w-12 py-1 text-center">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.slice(0, 5).map((error, idx) => {
                        const trendIcon = error.trend === 'up' ? '📈' : error.trend === 'down' ? '📉' : '➡️';
                        const trendColor =
                          error.trend === 'up'
                            ? 'text-red-600'
                            : error.trend === 'down'
                              ? 'text-green-600'
                              : 'text-gray-500';
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

      {/* Events (year, scrollable, filters) */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Events ({selectedYear})</h2>
            <p className="mt-1 max-w-xl text-xs text-gray-500">
              All activity notes in the dashboard year. Filter by market and type, sort by date. Use{' '}
              <strong className="text-gray-800">Copy</strong> for the filtered list as plain text.
            </p>
          </div>
          {eventsSorted.length > 0 && (
            <button
              type="button"
              onClick={() => copyActivityLog(eventsSorted)}
              className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Copy filtered list
            </button>
          )}
        </div>
        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={eventMarket}
            onChange={e => setEventMarket(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            <option value="all">All markets</option>
            <option value="DACH">DACH</option>
            <option value="France">France</option>
            <option value="Nordics">Nordics</option>
            <option value="BNL">BNL</option>
          </select>
          <select
            value={eventKind}
            onChange={e => setEventKind(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            <option value="all">All types</option>
            {(Object.keys(ACTIVITY_KIND_LABELS) as ActivityLogKind[]).map(k => (
              <option key={k} value={k}>
                {ACTIVITY_KIND_LABELS[k]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setEventSortDesc(d => !d)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
          >
            Date: {eventSortDesc ? 'newest first' : 'oldest first'}
          </button>
        </div>
        <div className="max-h-[520px] divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
          {eventsSorted.length === 0 ? (
            <p className="py-10 text-center text-gray-500">No events for these filters.</p>
          ) : (
            eventsSorted.map(entry => {
              const k = resolveActivityKind(entry);
              return (
                <div key={entry.id} className="p-4 hover:bg-gray-50">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="font-mono">{formatDate(entry.weekOf)}</span>
                    <span className="font-semibold text-gray-800">{displayMarketLabel(entry.market)}</span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${activityKindBadgeClass(k)}`}
                    >
                      {ACTIVITY_KIND_LABELS[k]}
                    </span>
                  </div>
                  {entry.title?.trim() && <p className="text-sm font-semibold text-gray-900">{entry.title}</p>}
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{entry.details}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

// Helper Components

function HighlightsSectionComponent({ activityLog }: { activityLog: ActivityLogEntry[] }) {
  const wins = activityLog.filter(a => resolveActivityKind(a) === 'win');
  const initiatives = activityLog.filter(a => resolveActivityKind(a) === 'initiative');
  const noteworthy = activityLog.filter(a => resolveActivityKind(a) === 'noteworthy');
  const observations = activityLog.filter(a => resolveActivityKind(a) === 'observation');

  const empty =
    wins.length === 0 && initiatives.length === 0 && noteworthy.length === 0 && observations.length === 0;

  if (empty) {
    return <p className="text-sm italic text-gray-500">No highlights reported this month.</p>;
  }

  const block = (
    title: string,
    emoji: string,
    border: string,
    bg: string,
    entries: ActivityLogEntry[]
  ) => {
    if (entries.length === 0) return null;
    return (
      <div className={`${bg} border-l-4 ${border} p-4 rounded`}>
        <h3 className="font-semibold text-gray-900 mb-2 text-sm">
          {emoji} {title}
        </h3>
        <ul className="space-y-2 text-sm">
          {entries.map((e, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-gray-600">•</span>
              <span>
                <span className="font-semibold">{displayMarketLabel(e.market)}:</span>{' '}
                {e.title?.trim() && <span className="font-medium text-gray-900">{e.title.trim()} — </span>}
                <span className="text-gray-800">{(e.details || '').replace(/^\u2705\s*/, '')}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {block('Wins & achievements', '🎉', 'border-green-400', 'bg-green-50', wins)}
      {block('Current initiatives', '📊', 'border-blue-400', 'bg-blue-50', initiatives)}
      {block('Noteworthy', '⭐', 'border-amber-400', 'bg-amber-50', noteworthy)}
      {block('Observations', '👁️', 'border-sky-400', 'bg-sky-50', observations)}
    </div>
  );
}

function LowlightsSectionComponent({ reports, activityLog }: { reports: WeeklyReport[]; activityLog: ActivityLogEntry[] }) {
  const atRiskMarkets = getMarketStatusData(reports).filter(m => m.status === 'yellow' || m.status === 'red');
  const attention = activityLog.filter(a => isActivityLowlightKind(resolveActivityKind(a)));

  if (atRiskMarkets.length === 0 && attention.length === 0) {
    return <p className="text-sm font-medium text-green-600">All markets green — no major issues to report.</p>;
  }

  return (
    <div className="space-y-4">
      {atRiskMarkets.length > 0 && (
        <div className="rounded-lg border border-amber-200 border-l-4 border-l-amber-500 bg-amber-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-amber-900">Markets requiring attention</h3>
          <ul className="space-y-1 text-sm text-gray-800">
            {atRiskMarkets.map((m, idx) => {
              const emoji = m.status === 'red' ? '🔴' : '🟡';
              return (
                <li key={idx} className="flex items-start gap-2">
                  <span>{emoji}</span>
                  <span>
                    <span className="font-semibold">{displayMarketLabel(m.market)}:</span> {m.reason}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {attention.length > 0 && (
        <div className="rounded-lg border border-red-200 border-l-4 border-l-red-600 bg-red-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-red-900">Complaints, incidents &amp; escalations</h3>
          {Object.entries(
            attention.reduce((acc, e) => {
              const dm = displayMarketLabel(e.market);
              if (!acc[dm]) acc[dm] = [];
              acc[dm].push(e);
              return acc;
            }, {} as Record<string, ActivityLogEntry[]>)
          ).map(([market, entries]) => (
            <div key={market} className="mb-3 last:mb-0">
              <h4 className="mb-1 text-xs font-semibold text-gray-700">{market}:</h4>
              <ul className="space-y-2 pl-2 text-sm">
                {entries.map((e, idx) => {
                  const k = resolveActivityKind(e);
                  return (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-gray-500">•</span>
                      <span>
                        <span className="text-xs font-semibold uppercase tracking-wide text-red-800">
                          {ACTIVITY_KIND_LABELS[k]}
                        </span>
                        {e.title?.trim() && (
                          <>
                            {' '}
                            <span className="font-medium text-gray-900">{e.title.trim()}</span>
                          </>
                        )}
                        <span className="mt-0.5 block text-gray-800">{e.details}</span>
                      </span>
                    </li>
                  );
                })}
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
  const wins = activityLog.filter(a => resolveActivityKind(a) === 'win');
  const initiatives = activityLog.filter(a => resolveActivityKind(a) === 'initiative');
  const noteworthy = activityLog.filter(a => resolveActivityKind(a) === 'noteworthy');
  const observations = activityLog.filter(a => resolveActivityKind(a) === 'observation');

  const pushBlock = (label: string, emoji: string, entries: ActivityLogEntry[]) => {
    if (entries.length === 0) return;
    text += `\n${emoji} ${label}:\n`;
    entries.forEach(e => {
      const k = resolveActivityKind(e);
      const line = [ACTIVITY_KIND_LABELS[k], e.title?.trim(), (e.details || '').replace(/^\u2705\s*/, '')]
        .filter(Boolean)
        .join(' — ');
      text += `  • [${e.market}] ${line}\n`;
    });
  };

  pushBlock('Wins & Achievements', '🎉', wins);
  pushBlock('Current Initiatives', '📊', initiatives);
  pushBlock('Noteworthy', '⭐', noteworthy);
  pushBlock('Observations', '👁️', observations);

  if (wins.length === 0 && initiatives.length === 0 && noteworthy.length === 0 && observations.length === 0) {
    text += `No highlights reported this month.\n`;
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
  
  const attention = activityLog.filter(a => isActivityLowlightKind(resolveActivityKind(a)));
  if (attention.length > 0) {
    text += `\n🚨 Complaints, incidents & escalations:\n`;
    attention.forEach(e => {
      const k = resolveActivityKind(e);
      const line = [ACTIVITY_KIND_LABELS[k], e.title?.trim(), e.details].filter(Boolean).join(' — ');
      text += `  • [${e.market}] ${line}\n`;
    });
  }

  if (atRiskMarkets.length === 0 && attention.length === 0) {
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

function formatDate(date: Date): string {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}
