import type { WeeklyReport } from '@/lib/types';
import type { ActivityLogEntry } from '@/lib/types';
import {
  resolveActivityKind,
  isActivityLowlightKind,
  formatActivityEntryPlainText,
  displayMarketLabel,
} from '@/lib/reporting/activityLogKinds';
import { REPORT_MARKETS, reportMatchesChartMarket, type ReportMarketKey } from '@/lib/reporting/yearAggregates';

function riskRank(s: string): number {
  return { red: 3, yellow: 2, green: 1 }[s] ?? 0;
}

function worseRiskStatus(a: WeeklyReport['riskStatus'], b: WeeklyReport['riskStatus']): WeeklyReport['riskStatus'] {
  return riskRank(b) > riskRank(a) ? b : a;
}

export function formatMonthDisplay(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getMarketBreakdown(reports: WeeklyReport[]) {
  return (REPORT_MARKETS as readonly ReportMarketKey[]).map(market => {
    const marketReports = reports.filter(r => reportMatchesChartMarket(r, market));

    const latestReport =
      marketReports.length > 0
        ? marketReports.reduce((latest, r) => (r.weekOf > latest.weekOf ? r : latest))
        : null;

    return {
      market,
      deletion: marketReports.reduce((sum, r) => sum + r.deletionRequests, 0),
      portability: marketReports.reduce((sum, r) => sum + r.portabilityRequests, 0),
      legalSupport: marketReports.reduce(
        (sum, r) => sum + r.legalEscalations + r.regulatorInquiries + r.privacyIncidents,
        0
      ),
      status: latestReport?.riskStatus || 'green',
    };
  });
}

export function calculateMonthlySummary(reports: WeeklyReport[], month: string) {
  const totalDeletionRequests = reports.reduce((sum, r) => sum + r.deletionRequests, 0);
  const totalPortabilityRequests = reports.reduce((sum, r) => sum + r.portabilityRequests, 0);
  const totalRequests = totalDeletionRequests + totalPortabilityRequests;
  const totalEscalations = reports.reduce(
    (sum, r) => sum + r.legalEscalations + r.regulatorInquiries + r.privacyIncidents,
    0
  );
  const marketsAtRisk = new Set(
    reports
      .filter(r => r.riskStatus === 'yellow' || r.riskStatus === 'red')
      .map(r => displayMarketLabel(r.market))
  ).size;
  const avgBacklog =
    reports.length > 0 ? reports.reduce((sum, r) => sum + r.currentBacklog, 0) / reports.length : 0;

  return {
    totalRequests,
    totalDeletionRequests,
    totalPortabilityRequests,
    totalEscalations,
    marketsAtRisk,
    avgBacklog,
  };
}

export function getMarketStatusData(reports: WeeklyReport[]) {
  const marketMap = new Map<string, WeeklyReport>();

  reports.forEach(report => {
    const existing = marketMap.get(report.market);
    if (!existing || report.weekOf > existing.weekOf) {
      marketMap.set(report.market, report);
    }
  });

  return (REPORT_MARKETS as readonly ReportMarketKey[]).map(dm => {
    const latestForDisplay: WeeklyReport[] =
      dm === 'BNL'
        ? (['NL', 'Be / Lux'] as const).map(m => marketMap.get(m)).filter((r): r is WeeklyReport => Boolean(r))
        : marketMap.get(dm)
          ? [marketMap.get(dm)!]
          : [];

    if (latestForDisplay.length === 0) {
      return {
        market: dm,
        status: 'green' as const,
        reason: 'No weekly data',
      };
    }

    let status: WeeklyReport['riskStatus'] = 'green';
    for (const r of latestForDisplay) {
      status = worseRiskStatus(status, r.riskStatus);
    }

    const reasons = latestForDisplay.map(
      r =>
        r.riskExplanation ||
        (r.riskStatus === 'green' ? 'All systems operational' : 'No explanation provided')
    );

    return {
      market: dm,
      status,
      reason: [...new Set(reasons)].join(' · '),
    };
  });
}

export function getGreenMarkets(reports: WeeklyReport[]) {
  const marketMap = new Map<string, WeeklyReport>();

  reports.forEach(report => {
    const existing = marketMap.get(report.market);
    if (!existing || report.weekOf > existing.weekOf) {
      marketMap.set(report.market, report);
    }
  });

  return (REPORT_MARKETS as readonly ReportMarketKey[]).filter(dm => {
    const latest =
      dm === 'BNL'
        ? (['NL', 'Be / Lux'] as const).map(m => marketMap.get(m)).filter((r): r is WeeklyReport => Boolean(r))
        : marketMap.get(dm)
          ? [marketMap.get(dm)!]
          : [];
    return latest.length > 0 && latest.every(r => r.riskStatus === 'green');
  }).map(dm => {
    const latest =
      dm === 'BNL'
        ? (['NL', 'Be / Lux'] as const).map(m => marketMap.get(m)).filter((r): r is WeeklyReport => Boolean(r))
        : [marketMap.get(dm)!];
    const requests = latest.reduce((s, r) => s + r.deletionRequests + r.portabilityRequests, 0);
    return { market: dm, requests };
  });
}

export function extractHighlights(reports: WeeklyReport[], activityLog: ActivityLogEntry[]) {
  const negative: string[] = [];
  const positive: string[] = [];

  reports.forEach(r => {
    const m = displayMarketLabel(r.market);
    if (r.riskStatus === 'red') {
      negative.push(`${m}: Red status${r.escalationDetails ? ` - ${r.escalationDetails}` : ''}`);
    }
    if (r.legalEscalations > 0) {
      negative.push(`${m}: ${r.legalEscalations} legal escalation(s)`);
    }
    if (r.riskStatus === 'green' && r.deletionRequests + r.portabilityRequests > 0) {
      positive.push(`${m}: All green, ${r.deletionRequests + r.portabilityRequests} requests handled`);
    }
  });

  activityLog.forEach(a => {
    const m = displayMarketLabel(a.market);
    const k = resolveActivityKind(a);
    if (isActivityLowlightKind(k)) {
      negative.push(`${m}: ${formatActivityEntryPlainText(a)}`);
    } else {
      positive.push(`${m}: ${formatActivityEntryPlainText(a).replace(/^\u2705\s*/, '')}`);
    }
  });

  return { negative: negative.slice(0, 5), positive: positive.slice(0, 5) };
}
