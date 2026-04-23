'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { saveMarketDeepDive, getMarketDeepDive } from '@/lib/firebase/marketDeepDive';
import { MarketDeepDive, MarketData, SignificantIncident } from '@/lib/types/marketDeepDive';
import { useToast } from '@/lib/contexts/ToastContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { HelpButton } from '@/components/HelpModal';
import { getAllCases } from '@/lib/firebase/cases';
import { getWeeklyReports, getActivityLog } from '@/lib/firebase/weeklyReports';
import { getCategories } from '@/lib/firebase/categories';

const MARKETS = ['DACH', 'Nordics', 'BNL', 'Fr'] as const;

export default function MarketDeepDivePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [markets, setMarkets] = useState<Record<string, MarketData>>({
    DACH: { deletionRequests: 0, dsarRequests: 0, escalations: 0, statusText: '' },
    Nordics: { deletionRequests: 0, dsarRequests: 0, escalations: 0, statusText: '' },
    BNL: { deletionRequests: 0, dsarRequests: 0, escalations: 0, statusText: '' },
    Fr: { deletionRequests: 0, dsarRequests: 0, escalations: 0, statusText: '' },
  });
  const [loadingData, setLoadingData] = useState(false);
  const [incidents, setIncidents] = useState<SignificantIncident[]>([]);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [summaryAndOutlook, setSummaryAndOutlook] = useState<string>('');
  const [attributions, setAttributions] = useState<string[]>([]);
  const [attributionInput, setAttributionInput] = useState<string>('');
  const [highlightsOverride, setHighlightsOverride] = useState<string>('');
  const [lowlightsOverride, setLowlightsOverride] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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

  async function loadData() {
    setLoading(true);
    setLoadingData(true);
    
    // Load saved deep dive data (status texts and incidents) - optional, can fail
    let savedData: MarketDeepDive | null = null;
    try {
      savedData = await getMarketDeepDive(selectedMonth);
    } catch (error: any) {
      console.warn('Could not load saved market deep dive data (Firestore Rules may not allow access):', error);
      // Try localStorage fallback
      try {
        const localData = localStorage.getItem(`marketDeepDive_${selectedMonth}`);
        if (localData) {
          const parsed = JSON.parse(localData);
          savedData = {
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
    
    try {
      // Aggregate numbers directly in component (client-side)
      const aggregatedData = await aggregateMarketData(selectedMonth);
      
      // Merge: Use aggregated numbers, but keep saved status texts
      const mergedMarkets: Record<string, MarketData> = {
        DACH: {
          deletionRequests: aggregatedData.DACH.deletionRequests,
          deletionsHC: savedData?.markets.DACH.deletionsHC,
          dsarRequests: aggregatedData.DACH.dsarRequests,
          escalations: aggregatedData.DACH.escalations,
          statusText: savedData?.markets.DACH.statusText || '',
        },
        Nordics: {
          deletionRequests: aggregatedData.Nordics.deletionRequests,
          deletionsHC: savedData?.markets.Nordics.deletionsHC,
          dsarRequests: aggregatedData.Nordics.dsarRequests,
          escalations: aggregatedData.Nordics.escalations,
          statusText: savedData?.markets.Nordics.statusText || '',
        },
        BNL: {
          deletionRequests: aggregatedData.BNL.deletionRequests,
          deletionsHC: savedData?.markets.BNL.deletionsHC,
          dsarRequests: aggregatedData.BNL.dsarRequests,
          escalations: aggregatedData.BNL.escalations,
          statusText: savedData?.markets.BNL.statusText || '',
        },
        Fr: {
          deletionRequests: aggregatedData.Fr.deletionRequests,
          deletionsHC: savedData?.markets.Fr.deletionsHC,
          dsarRequests: aggregatedData.Fr.dsarRequests,
          escalations: aggregatedData.Fr.escalations,
          statusText: savedData?.markets.Fr.statusText || '',
        },
      };
      
      setMarkets(mergedMarkets);
      setIncidents(savedData?.significantIncidents || []);
      setSummaryAndOutlook(savedData?.summaryAndOutlook || '');
      setAttributions(savedData?.attributions || []);
      setHighlightsOverride(savedData?.highlightsOverride || '');
      setLowlightsOverride(savedData?.lowlightsOverride || '');
      setDataLoadError(null);
    } catch (error: any) {
      console.error('Error aggregating market data:', error);
      const errorMessage = error?.message || 'Failed to load data';
      console.error('Full error:', error);
      
      // Check if it's a permissions error
      if (errorMessage.includes('permission') || errorMessage.includes('permissions')) {
        setDataLoadError('Firestore Rules do not allow access to required collections. Numbers cannot be auto-loaded. You can still manually enter data.');
        // Don't show toast for permissions errors - show info banner instead
      } else {
        addToast(`Failed to load data: ${errorMessage}`, 'error');
        setDataLoadError(`Error loading data: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
      setLoadingData(false);
    }
  }

  async function aggregateMarketData(month: string): Promise<Record<string, { deletionRequests: number; dsarRequests: number; escalations: number }>> {
    // Get month boundaries
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);
    
    // Initialize result
    const result: Record<string, { deletionRequests: number; dsarRequests: number; escalations: number }> = {
      DACH: { deletionRequests: 0, dsarRequests: 0, escalations: 0 },
      Nordics: { deletionRequests: 0, dsarRequests: 0, escalations: 0 },
      BNL: { deletionRequests: 0, dsarRequests: 0, escalations: 0 },
      Fr: { deletionRequests: 0, dsarRequests: 0, escalations: 0 },
    };
    
    try {
      // Get all data sources with individual error handling
      let allCases: any[] = [];
      let categories: any[] = [];
      let weeklyReports: any[] = [];
      let activityLog: any[] = [];
      
      try {
        allCases = await getAllCases();
      } catch (error: any) {
        console.warn('Could not load cases:', error?.message);
      }
      
      try {
        categories = await getCategories();
      } catch (error: any) {
        console.warn('Could not load categories:', error?.message);
      }
      
      try {
        weeklyReports = await getWeeklyReports();
      } catch (error: any) {
        console.warn('Could not load weekly reports:', error?.message);
      }
      
      try {
        activityLog = await getActivityLog();
      } catch (error: any) {
        console.warn('Could not load activity log:', error?.message);
      }
      
      // Filter cases for the month
      const monthCases = allCases.filter(c => {
        try {
          const caseDate = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt);
          return caseDate >= startDate && caseDate <= endDate;
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
      
      // Filter weekly reports for the month
      const monthReports = weeklyReports.filter(r => {
        try {
          const reportDate = r.weekOf instanceof Date ? r.weekOf : new Date(r.weekOf);
          return reportDate >= startDate && reportDate <= endDate;
        } catch {
          return false;
        }
      });
      
      // Filter escalations for the month
      const monthEscalations = activityLog.filter(a => {
        try {
          const logDate = a.weekOf instanceof Date ? a.weekOf : new Date(a.weekOf);
          return a.category === 'Escalation' && logDate >= startDate && logDate <= endDate;
        } catch {
          return false;
        }
      });
      
      // Market mapping functions
      const mapCaseMarketToMarketGroup = (market: string): string | null => {
        if (!market) return null;
        const upper = market.toUpperCase();
        if (['DE', 'AT', 'CH'].includes(upper)) return 'DACH';
        if (['SE', 'NO', 'DK', 'FI'].includes(upper)) return 'Nordics';
        if (['NL'].includes(upper)) return 'BNL';
        if (['BE', 'LU'].includes(upper)) return 'BNL';
        if (['FR'].includes(upper)) return 'Fr';
        return null;
      };
      
      const mapWeeklyReportMarket = (market: string): string | null => {
        if (!market) return null;
        if (market === 'DACH') return 'DACH';
        if (market === 'Nordics') return 'Nordics';
        if (market === 'NL' || market === 'Be / Lux') return 'BNL';
        if (market === 'France') return 'Fr';
        return null;
      };
      
      // Count cases by category and market
      for (const caseItem of monthCases) {
        const marketGroup = mapCaseMarketToMarketGroup(caseItem.market);
        if (!marketGroup) continue;
        
        if (deletionCategory && caseItem.primaryCategory === deletionCategory.id) {
          result[marketGroup].deletionRequests++;
        }
        if (dsarCategory && caseItem.primaryCategory === dsarCategory.id) {
          result[marketGroup].dsarRequests++;
        }
      }
      
      // Aggregate from weekly reports (more reliable for monthly totals)
      for (const report of monthReports) {
        const marketGroup = mapWeeklyReportMarket(report.market);
        if (!marketGroup) continue;
        
        result[marketGroup].deletionRequests += (report.deletionRequests || 0);
        result[marketGroup].dsarRequests += (report.portabilityRequests || 0);
      }
      
      // Count escalations from activity log
      for (const escalation of monthEscalations) {
        const marketGroup = mapWeeklyReportMarket(escalation.market);
        if (!marketGroup) continue;
        
        result[marketGroup].escalations++;
      }
    } catch (error) {
      console.error('Error aggregating market data:', error);
    }
    
    return result;
  }

  function updateMarket(market: string, field: keyof MarketData, value: string | number) {
    setMarkets(prev => ({
      ...prev,
      [market]: {
        ...prev[market],
        [field]: value,
      },
    }));
  }

  function addIncident() {
    setIncidents(prev => [...prev, { title: '', description: '' }]);
  }

  function updateIncident(index: number, field: keyof SignificantIncident, value: string) {
    setIncidents(prev => prev.map((inc, i) => 
      i === index ? { ...inc, [field]: value } : inc
    ));
  }

  function removeIncident(index: number) {
    setIncidents(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Save status texts, deletionsHC, and incidents (other numbers are auto-loaded)
      const dataToSave: Record<string, MarketData> = {
        DACH: { 
          deletionRequests: 0, 
          deletionsHC: markets.DACH.deletionsHC,
          dsarRequests: 0, 
          escalations: 0, 
          statusText: markets.DACH.statusText 
        },
        Nordics: { 
          deletionRequests: 0, 
          deletionsHC: markets.Nordics.deletionsHC,
          dsarRequests: 0, 
          escalations: 0, 
          statusText: markets.Nordics.statusText 
        },
        BNL: { 
          deletionRequests: 0, 
          deletionsHC: markets.BNL.deletionsHC,
          dsarRequests: 0, 
          escalations: 0, 
          statusText: markets.BNL.statusText 
        },
        Fr: { 
          deletionRequests: 0, 
          deletionsHC: markets.Fr.deletionsHC,
          dsarRequests: 0, 
          escalations: 0, 
          statusText: markets.Fr.statusText 
        },
      };
      
      const deepDiveData = {
        markets: dataToSave,
        significantIncidents: incidents.filter(inc => inc.title.trim() && inc.description.trim()),
        summaryAndOutlook: summaryAndOutlook,
        attributions: attributions,
        highlightsOverride: highlightsOverride,
        lowlightsOverride: lowlightsOverride,
        createdBy: user?.email || undefined,
      };
      
      try {
        await saveMarketDeepDive(selectedMonth, deepDiveData as any);
        addToast('Market Deep Dive saved successfully!', 'success');
      } catch (firestoreError: any) {
        // Fallback to localStorage for local development
        const errorMessage = firestoreError?.message || '';
        if (errorMessage.includes('permission') || errorMessage.includes('permissions')) {
          // Save to localStorage as fallback
          localStorage.setItem(`marketDeepDive_${selectedMonth}`, JSON.stringify(deepDiveData));
          addToast('Saved locally (Firestore Rules not configured). Data available for reporting.', 'success');
        } else {
          throw firestoreError;
        }
      }
    } catch (error: any) {
      console.error('Error saving market deep dive:', error);
      addToast(`Failed to save: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function copyMBRReport() {
    const htmlReport = generateMBRReportHTML(selectedMonth, markets, incidents, summaryAndOutlook);
    
    // Create a temporary element to copy HTML
    const blob = new Blob([htmlReport], { type: 'text/html' });
    const data = [new ClipboardItem({ 'text/html': blob })];
    
    try {
      await navigator.clipboard.write(data);
      addToast('✅ MBR Report copied! Paste directly into your email.', 'success');
    } catch (err) {
      // Fallback: copy as text
      await navigator.clipboard.writeText(htmlReport);
      addToast('✅ MBR Report copied as text! Paste into your email (HTML mode).', 'success');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const [year, month] = selectedMonth.split('-');
  const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/reporting"
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">GDPR Market Deep Dive</h1>
              <p className="text-gray-600 mt-1">Monthly report for management</p>
            </div>
          </div>
          <button 
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-300 hover:border-blue-300"
            title="Help - Market Deep Dive"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {/* Month Selector */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Report Month
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedMonth(getPreviousMonth(selectedMonth))}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-semibold text-gray-900 min-w-[150px] text-center">
              {formatMonthDisplay(selectedMonth)}
            </span>
            <button
              onClick={() => setSelectedMonth(getNextMonth(selectedMonth))}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Data Load Error Banner */}
        {dataLoadError && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">{dataLoadError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Market Data */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Market Data</h2>
          </div>
          <div className="p-6 space-y-6">
            {MARKETS.map(market => (
              <div key={market} className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{market}</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deletion Requests
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 flex items-center justify-between">
                      <span>{markets[market].deletionRequests}</span>
                      {loadingData && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Auto-loaded from database</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deletions HC
                    </label>
                    <input
                      type="number"
                      value={markets[market].deletionsHC || ''}
                      onChange={(e) => updateMarket(market, 'deletionsHC', e.target.value ? parseInt(e.target.value) : 0)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Manual entry (optional)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      DSAR Requests
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 flex items-center justify-between">
                      <span>{markets[market].dsarRequests}</span>
                      {loadingData && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Auto-loaded from database</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Escalations
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 flex items-center justify-between">
                      <span>{markets[market].escalations}</span>
                      {loadingData && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Auto-loaded from database</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status Text (Deep Dive)
                    </label>
                    <input
                      type="text"
                      value={markets[market].statusText}
                      onChange={(e) => updateMarket(market, 'statusText', e.target.value)}
                      placeholder="e.g., busier than usual, increased ad revocation..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Manual entry</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Significant Incidents */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Significant Incidents</h2>
            <button
              onClick={addIncident}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Incident
            </button>
          </div>
          <div className="p-6 space-y-4">
            {incidents.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No incidents added yet. Click "Add Incident" to add one.</p>
            ) : (
              incidents.map((incident, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700">Incident #{index + 1}</h3>
                    <button
                      onClick={() => removeIncident(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={incident.title}
                        onChange={(e) => updateIncident(index, 'title', e.target.value)}
                        placeholder="e.g., Salesforce Unsubscribe Issue"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (2-3 sentences)
                      </label>
                      <textarea
                        value={incident.description}
                        onChange={(e) => updateIncident(index, 'description', e.target.value)}
                        placeholder="Explain the incident in 2-3 sentences..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Summary & Outlook */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Summary & Outlook</h2>
            <p className="text-sm text-gray-600 mt-1">
              Provide an overall summary and future outlook (e.g., "While operations remained stable across most markets, the technical issues involving Salesforce and the mobile application required significant remediation efforts during February. Moving forward, we are transitioning to a unified GDPR log for all regions...")
            </p>
          </div>
          <div className="p-6">
            <textarea
              value={summaryAndOutlook}
              onChange={(e) => setSummaryAndOutlook(e.target.value)}
              placeholder="Enter summary and outlook..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={6}
            />
          </div>
        </div>

        {/* Attributions */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Attributions</h2>
            <p className="text-sm text-gray-600 mt-1">
              Add email addresses of team members who contributed to this report. They will be thanked at the end of the email.
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {/* Input to add new attribution */}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={attributionInput}
                  onChange={(e) => setAttributionInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && attributionInput.trim()) {
                      e.preventDefault();
                      if (!attributions.includes(attributionInput.trim())) {
                        setAttributions([...attributions, attributionInput.trim()]);
                      }
                      setAttributionInput('');
                    }
                  }}
                  placeholder="Enter email address and press Enter..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => {
                    if (attributionInput.trim() && !attributions.includes(attributionInput.trim())) {
                      setAttributions([...attributions, attributionInput.trim()]);
                      setAttributionInput('');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Add
                </button>
              </div>

              {/* List of attributions */}
              {attributions.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {attributions.sort().map((email, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
                      >
                        <span>{email}</span>
                        <button
                          onClick={() => setAttributions(attributions.filter((_, i) => i !== index))}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Highlights Override */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Highlights Override (Optional)</h2>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Leave empty to auto-generate from Activity Log.</span> Use this to manually edit Wins & Achievements for the final report.
            </p>
          </div>
          <div className="p-6">
            <textarea
              value={highlightsOverride}
              onChange={(e) => setHighlightsOverride(e.target.value)}
              placeholder="Leave empty to use auto-aggregated data from Activity Log. Or enter custom highlights here..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={5}
            />
            <p className="text-xs text-gray-500 mt-2">
              Tip: You can copy the auto-generated text from the Reporting page and modify it here for last-minute adjustments.
            </p>
          </div>
        </div>

        {/* Lowlights Override */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Lowlights Override (Optional)</h2>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Leave empty to auto-generate from Activity Log.</span> Use this to manually edit Noteworthy Complaints & Issues for the final report.
            </p>
          </div>
          <div className="p-6">
            <textarea
              value={lowlightsOverride}
              onChange={(e) => setLowlightsOverride(e.target.value)}
              placeholder="Leave empty to use auto-aggregated data from Activity Log. Or enter custom lowlights here..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={5}
            />
            <p className="text-xs text-gray-500 mt-2">
              Tip: You can copy the auto-generated text from the Reporting page and modify it here for last-minute adjustments.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow p-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Report
              </>
            )}
          </button>
          <button
            onClick={copyMBRReport}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Copy MBR Report
          </button>
        </div>
      </div>
    </div>
  );
}

function generateMBRReportHTML(month: string, markets: Record<string, MarketData>, incidents: SignificantIncident[], summaryAndOutlook: string): string {
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
    ? incidents.map(inc => `
      <div style="margin: 15px 0;">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">${inc.title}</h4>
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
