'use client';

import { getMarketDeepDive } from '@/lib/firebase/marketDeepDive';
import { getAllCases } from '@/lib/firebase/cases';
import { getCategories } from '@/lib/firebase/categories';
import { getWeeklyReports, getActivityLog } from '@/lib/firebase/weeklyReports';
import { resolveActivityKind, isActivityLowlightKind } from '@/lib/reporting/activityLogKinds';
import type { MarketDeepDive, MarketData } from '@/lib/types/marketDeepDive';

export async function aggregateMarketDeepDive(month: string): Promise<MarketDeepDive> {
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
        return isActivityLowlightKind(resolveActivityKind(a)) && logDate >= startDate && logDate <= endDate;
      } catch {
        return false;
      }
    });

    const deletionCategory = categories.find(c => c.nameEn?.toLowerCase().includes('deletion'));
    const dsarCategory = categories.find(
      c =>
        c.nameEn?.toLowerCase().includes('access') ||
        c.nameEn?.toLowerCase().includes('portability') ||
        c.nameEn?.toLowerCase().includes('dsar')
    );

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

    monthReports.forEach(report => {
      const marketGroup = mapMarket(report.market);
      if (!marketGroup) return;

      result[marketGroup].deletionRequests += report.deletionRequests || 0;
      result[marketGroup].dsarRequests += report.portabilityRequests || 0;
    });

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

export async function buildMergedMarketDeepDive(monthKey: string): Promise<MarketDeepDive> {
  let savedDeepDive = await getMarketDeepDive(monthKey).catch(() => null);

  if (!savedDeepDive) {
    try {
      const localData = localStorage.getItem(`marketDeepDive_${monthKey}`);
      if (localData) {
        const parsed = JSON.parse(localData);
        savedDeepDive = {
          id: monthKey,
          month: monthKey,
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

  const emptyDeepDive = (): MarketDeepDive => ({
    id: monthKey,
    month: monthKey,
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
  });

  const aggregatedDeepDive = await Promise.race([
    aggregateMarketDeepDive(monthKey),
    new Promise<MarketDeepDive>((_, reject) =>
      setTimeout(() => reject(new Error('Aggregation timeout')), 10000)
    ),
  ]).catch((): MarketDeepDive => emptyDeepDive());

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

  return aggregatedDeepDive;
}
