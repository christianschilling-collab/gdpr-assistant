'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { bulkImportWeeklyReports, getWeeklyReports, deleteWeeklyReport } from '@/lib/firebase/weeklyReports';
import { WeeklyReport } from '@/lib/types';
import { useToast } from '@/lib/contexts/ToastContext';

export default function ReportingUploadPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{ success: number; failed: number; created: number; updated: number } | null>(null);
  const [existingReports, setExistingReports] = useState<WeeklyReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(true);

  useEffect(() => {
    // Check if admin session exists
    const adminSession = sessionStorage.getItem('admin_authenticated');
    if (adminSession === 'true') {
      setIsAdmin(true);
      setShowPasswordPrompt(false);
      loadExistingReports();
    }
  }, []);

  function handleLogin() {
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
    if (password === adminPassword) {
      setIsAdmin(true);
      setShowPasswordPrompt(false);
      sessionStorage.setItem('admin_authenticated', 'true');
      addToast('Admin access granted', 'success');
      loadExistingReports();
    } else {
      addToast('Incorrect password', 'error');
      setMessage('❌ Incorrect password');
    }
  }

  async function loadExistingReports() {
    try {
      setLoadingReports(true);
      const reports = await getWeeklyReports();
      setExistingReports(reports);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoadingReports(false);
    }
  }

  async function handleDelete(reportId: string, market: string, weekOf: Date) {
    if (!confirm(`Delete report for ${market} - ${formatDate(weekOf)}?`)) {
      return;
    }

    try {
      setDeletingId(reportId);
      await deleteWeeklyReport(reportId);
      addToast(`Deleted report for ${market}`, 'success');
      setMessage(`✅ Deleted report for ${market} - ${formatDate(weekOf)}`);
      await loadExistingReports();
    } catch (error: any) {
      addToast(error.message || 'Failed to delete report', 'error');
      setMessage(`❌ Error deleting report: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteAll() {
    if (!confirm(`Delete ALL ${existingReports.length} reports? This cannot be undone!`)) {
      return;
    }

    try {
      setProcessing(true);
      setMessage('Deleting all reports...');
      
      for (const report of existingReports) {
        await deleteWeeklyReport(report.id);
      }
      
      setMessage(`✅ Successfully deleted ${existingReports.length} reports!`);
      await loadExistingReports();
    } catch (error: any) {
      setMessage(`❌ Error deleting reports: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  }

  function formatDate(date: Date): string {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setMessage('❌ Please select a CSV file');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setMessage('');
      setResult(null);
    }
  };

  const parseCSV = (text: string): Omit<WeeklyReport, 'id' | 'createdAt' | 'updatedAt'>[] => {
    // Better CSV parsing that handles quoted fields with commas
    const lines = text.split('\n').filter(line => line.trim());
    
    // Parse CSV line considering quoted fields
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    
    const headers = parseCSVLine(lines[0]);
    console.log('CSV Headers:', headers);
    
    const reports: Omit<WeeklyReport, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    // Find column indices
    const marketIndex = headers.findIndex(h => h.toLowerCase().includes('market'));
    const weekOfIndex = headers.findIndex(h => h.toLowerCase().includes('week of'));
    const deletionIndex = headers.findIndex(h => h.toLowerCase().includes('deletion'));
    const portabilityIndex = headers.findIndex(h => h.toLowerCase().includes('portability'));
    const legalIndex = headers.findIndex(h => h.toLowerCase().includes('legal'));
    const regulatorIndex = headers.findIndex(h => h.toLowerCase().includes('regulator'));
    const incidentsIndex = headers.findIndex(h => h.toLowerCase().includes('incident'));
    const riskStatusIndex = headers.findIndex(h => h.toLowerCase().includes('risk status'));
    const riskExplanationIndex = headers.findIndex(h => h.toLowerCase().includes('if yellow or red') || h.toLowerCase().includes('explain why'));
    const escalationDetailsIndex = headers.findIndex(h => h.toLowerCase().includes('escalation details'));
    const initiativesIndex = headers.findIndex(h => h.toLowerCase().includes('initiatives'));
    const winsIndex = headers.findIndex(h => h.toLowerCase().includes('wins'));

    console.log('Column Indices:', { marketIndex, weekOfIndex, deletionIndex, portabilityIndex });

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        
        if (values.length < 3) {
          console.warn(`Skipping row ${i}: not enough columns (${values.length})`);
          continue;
        }

        if (marketIndex === -1 || weekOfIndex === -1) {
          console.error('Missing required columns: market or week of');
          continue;
        }

        const market = values[marketIndex]?.trim();
        const weekOfStr = values[weekOfIndex]?.trim();
        
        if (!market || !weekOfStr) {
          console.warn(`Skipping row ${i}: empty market or week`);
          continue;
        }

        // Validate market
        const validMarkets = ['DACH', 'NL', 'France', 'Be / Lux', 'Nordics'];
        if (!validMarkets.includes(market)) {
          console.warn(`Skipping row ${i}: invalid market "${market}"`);
          continue;
        }

        // Parse date from various formats
        let weekOf: Date;
        try {
          // Try direct parsing first
          weekOf = new Date(weekOfStr);
          
          if (isNaN(weekOf.getTime())) {
            // Try M/D/YYYY format
            const parts = weekOfStr.split('/');
            if (parts.length === 3) {
              const month = parseInt(parts[0]);
              const day = parseInt(parts[1]);
              const year = parseInt(parts[2]);
              weekOf = new Date(year, month - 1, day);
            } else {
              throw new Error('Invalid date format');
            }
          }
          
          if (isNaN(weekOf.getTime())) {
            throw new Error('Invalid date');
          }
        } catch (err) {
          console.warn(`Skipping row ${i}: invalid date "${weekOfStr}"`);
          continue;
        }

        // Extract risk status (might include emoji)
        let riskStatus: 'green' | 'yellow' | 'red' = 'green';
        if (riskStatusIndex !== -1 && values[riskStatusIndex]) {
          const status = values[riskStatusIndex].toLowerCase();
          if (status.includes('yellow') || status.includes('🟡')) riskStatus = 'yellow';
          else if (status.includes('red') || status.includes('🔴')) riskStatus = 'red';
          else riskStatus = 'green';
        }

        // Parse numbers safely
        const parseNum = (val: string | undefined): number => {
          if (!val) return 0;
          const num = parseInt(val.replace(/[^\d]/g, ''));
          return isNaN(num) ? 0 : num;
        };

        const report = {
          market: market as any,
          weekOf,
          yourName: values[headers.findIndex(h => h.toLowerCase().includes('your name'))]?.trim() || '',
          deletionRequests: parseNum(values[deletionIndex]),
          portabilityRequests: parseNum(values[portabilityIndex]),
          currentBacklog: parseNum(values[headers.findIndex(h => h.toLowerCase().includes('backlog'))]),
          legalEscalations: parseNum(values[legalIndex]),
          regulatorInquiries: parseNum(values[regulatorIndex]),
          privacyIncidents: parseNum(values[incidentsIndex]),
          complaints: parseNum(values[headers.findIndex(h => h.toLowerCase().includes('complaint'))]),
          crossFunctionalCases: parseNum(values[headers.findIndex(h => h.toLowerCase().includes('cross-functional'))]),
          noteworthyEdgeCases: parseNum(values[headers.findIndex(h => h.toLowerCase().includes('noteworthy'))]),
          riskStatus,
          riskExplanation: riskExplanationIndex !== -1 ? values[riskExplanationIndex]?.trim() : undefined,
          escalationDetails: escalationDetailsIndex !== -1 ? values[escalationDetailsIndex]?.trim() : undefined,
          currentInitiatives: initiativesIndex !== -1 ? values[initiativesIndex]?.trim() : undefined,
          winsGoodNews: winsIndex !== -1 ? values[winsIndex]?.trim() : undefined,
        };

        console.log(`Parsed row ${i}:`, report);
        reports.push(report);
      } catch (err: any) {
        console.error(`Error parsing row ${i}:`, err.message);
      }
    }

    console.log(`Successfully parsed ${reports.length} reports`);
    return reports;
  };

  const handleUpload = async () => {
    if (!file) {
      addToast('Please select a file first', 'warning');
      setMessage('❌ Please select a file first');
      return;
    }

    setProcessing(true);
    setMessage('');

    try {
      const text = await file.text();
      const reports = parseCSV(text);

      if (reports.length === 0) {
        addToast('No valid data found in CSV file', 'error');
        setMessage('❌ No valid data found in CSV file');
        setProcessing(false);
        return;
      }

      const importResult = await bulkImportWeeklyReports(reports);
      setResult(importResult);
      
      if (importResult.failed === 0) {
        addToast(`Successfully imported ${importResult.success} reports! (${importResult.created} new, ${importResult.updated} updated)`, 'success');
        setMessage(`✅ Successfully imported ${importResult.success} reports! (${importResult.created} new, ${importResult.updated} updated)`);
        await loadExistingReports(); // Reload the list
        setTimeout(() => {
          router.push('/reporting');
        }, 2000);
      } else {
        addToast(`Import completed: ${importResult.success} succeeded, ${importResult.failed} failed`, 'warning');
        setMessage(`⚠️ Imported ${importResult.success} reports (${importResult.created} new, ${importResult.updated} updated), ${importResult.failed} failed`);
        await loadExistingReports(); // Reload the list
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      addToast(error.message || 'Failed to upload CSV', 'error');
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/admin/training" 
          className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
        >
          ← Back to Admin
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Upload Weekly Reports</h1>
        <p className="text-gray-600 mt-2">Import weekly GDPR reports from CSV file</p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Instructions:
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
          <li>Open the Google Sheet: <a href="https://docs.google.com/spreadsheets/d/1VwMitEUSgdchTRjy0fVopNQptH5VgZqDNrR5VNQwH0M/edit" target="_blank" rel="noopener noreferrer" className="underline">European GDPR Dashboard - Data</a></li>
          <li>Go to the <strong>"Form Responses 1"</strong> tab</li>
          <li>Click <strong>File → Download → Comma Separated Values (.csv)</strong></li>
          <li>Upload the CSV file below</li>
        </ol>
      </div>

      {/* Upload Area */}
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        
        <label htmlFor="file-upload" className="cursor-pointer">
          <span className="mt-2 block text-sm font-medium text-gray-900">
            {file ? file.name : 'Choose CSV file'}
          </span>
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={handleFileChange}
            disabled={processing}
          />
          <span className="mt-1 block text-xs text-gray-500">
            or drag and drop
          </span>
        </label>
      </div>

      {/* Message */}
      {message && (
        <div className={`mt-4 p-4 rounded-lg ${
          message.includes('✅') ? 'bg-green-50 text-green-800' :
          message.includes('⚠️') ? 'bg-yellow-50 text-yellow-800' :
          'bg-red-50 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {/* Result Summary */}
      {result && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Import Summary:</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-green-600 font-medium">✓ Success:</span> {result.success}
            </div>
            <div>
              <span className="text-red-600 font-medium">✗ Failed:</span> {result.failed}
            </div>
            <div>
              <span className="text-blue-600 font-medium">➕ Created:</span> {result.created}
            </div>
            <div>
              <span className="text-orange-600 font-medium">🔄 Updated:</span> {result.updated}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={handleUpload}
          disabled={!file || processing}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          {processing ? 'Uploading...' : 'Upload & Import'}
        </button>
        <Link
          href="/reporting"
          className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
        >
          Cancel
        </Link>
      </div>

      {/* Existing Reports List */}
      <div className="mt-12 border-t pt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Existing Reports</h2>
            <p className="text-gray-600 text-sm mt-1">
              {existingReports.length} report{existingReports.length !== 1 ? 's' : ''} in database
            </p>
          </div>
          {existingReports.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={processing}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 transition text-sm"
            >
              🗑️ Delete All
            </button>
          )}
        </div>

        {loadingReports ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Loading reports...
          </div>
        ) : existingReports.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
            No reports in database yet. Upload a CSV to get started!
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Market</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Week Of</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Deletion Requests</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Portability Requests</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Risk Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {existingReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{report.market}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(report.weekOf)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-center">{report.deletionRequests}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-center">{report.portabilityRequests}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        report.riskStatus === 'green' ? 'bg-green-100 text-green-800' :
                        report.riskStatus === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          report.riskStatus === 'green' ? 'bg-green-500' :
                          report.riskStatus === 'yellow' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></span>
                        {report.riskStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDelete(report.id, report.market, report.weekOf)}
                        disabled={deletingId === report.id}
                        className="text-red-600 hover:text-red-800 font-medium disabled:text-gray-400"
                      >
                        {deletingId === report.id ? '...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

