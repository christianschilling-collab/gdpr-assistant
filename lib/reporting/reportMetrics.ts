import type { WeeklyReport } from '@/lib/types';
import type { ActivityLogEntry } from '@/lib/types';

export function formatMonthDisplay(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getMarketBreakdown(reports: WeeklyReport[]) {
  const markets = ['DACH', 'France', 'Nordics', 'NL', 'Be / Lux'];

  return markets.map(market => {
    const marketReports = reports.filter(r => r.market === market);

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
    reports.filter(r => r.riskStatus === 'yellow' || r.riskStatus === 'red').map(r => r.market)
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

  return Array.from(marketMap.values()).map(r => ({
    market: r.market,
    status: r.riskStatus,
    reason:
      r.riskExplanation ||
      (r.riskStatus === 'green' ? 'All systems operational' : 'No explanation provided'),
  }));
}

export function getGreenMarkets(reports: WeeklyReport[]) {
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

export function extractHighlights(reports: WeeklyReport[], activityLog: ActivityLogEntry[]) {
  const negative: string[] = [];
  const positive: string[] = [];

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

  activityLog.forEach(a => {
    if (a.category === 'Escalation') {
      negative.push(`${a.market}: ${a.details}`);
    } else if (a.details.startsWith('✅')) {
      positive.push(`${a.market}: ${a.details.replace('✅ ', '')}`);
    }
  });

  return { negative: negative.slice(0, 5), positive: positive.slice(0, 5) };
}
