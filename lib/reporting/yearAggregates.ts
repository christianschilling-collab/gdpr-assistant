import type { WeeklyReport } from '@/lib/types';
import { formatReportingMonthKeyFromWeekOf, reportingYearFromWeekOf } from '@/lib/reporting/weekReporting';

/** Display markets for charts and reporting (NL + Be / Lux = BNL). */
export const REPORT_MARKETS = ['DACH', 'France', 'Nordics', 'BNL'] as const;
export type ReportMarketKey = (typeof REPORT_MARKETS)[number];

/** Raw upload markets that roll up into BNL. */
export const BNL_SOURCE_MARKETS = ['NL', 'Be / Lux'] as const;

export function reportMatchesChartMarket(r: { market: string }, mk: ReportMarketKey): boolean {
  if (mk === 'BNL') return r.market === 'NL' || r.market === 'Be / Lux';
  return r.market === mk;
}

export type MonthChartRow = {
  monthKey: string;
  label: string;
} & Record<ReportMarketKey, number>;

/** One column per month in `year`: total deletion+portability per market (sums all weeks in that month). */
export function buildYearChartRows(reports: WeeklyReport[], year: number): MonthChartRow[] {
  const rows: MonthChartRow[] = [];
  for (let m = 1; m <= 12; m++) {
    const monthKey = `${year}-${String(m).padStart(2, '0')}`;
    const label = new Date(year, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
    const row = { monthKey, label } as MonthChartRow;
    REPORT_MARKETS.forEach(mk => {
      const inMonth = reports.filter(
        r =>
          reportMatchesChartMarket(r, mk) &&
          formatReportingMonthKeyFromWeekOf(new Date(r.weekOf)) === monthKey
      );
      row[mk] = inMonth.reduce((s, r) => s + r.deletionRequests + r.portabilityRequests, 0);
    });
    rows.push(row);
  }
  return rows;
}

/** Weeks whose **reporting month** (month of Thursday) falls in `year`. */
export function reportsInReportingYear(reports: WeeklyReport[], year: number): WeeklyReport[] {
  return reports.filter(r => reportingYearFromWeekOf(new Date(r.weekOf)) === year);
}

/** @deprecated Use reportsInReportingYear — kept name for gradual migration if imported elsewhere. */
export const reportsInCalendarYear = reportsInReportingYear;
