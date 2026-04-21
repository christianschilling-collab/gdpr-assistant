'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createCase } from '@/lib/firebase/cases';
import { GDPRCase } from '@/lib/types';

export default function CaseImportPage() {
  const router = useRouter();
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState({ imported: 0, failed: 0, errors: [] as string[] });

  const csvTemplate = `caseId,timestamp,teamMember,sourceLink,market,caseDescription,specificQuestion,urgency
HELP-2024-001,2024-01-15,agent@example.com,https://...,DE,Customer wants to delete their data,How long does deletion take?,Medium
HELP-2024-002,2024-01-16,agent@example.com,https://...,FR,Customer wants to access their data,What information can I request?,High`;

  function downloadTemplate() {
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'case-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function parseCSV(text: string): any[] {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim());
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }

    return rows;
  }

  async function handleImport() {
    if (!csvText.trim()) {
      setError('Please paste CSV data');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess({ imported: 0, failed: 0, errors: [] });

    try {
      const rows = parseCSV(csvText);
      let imported = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const row of rows) {
        try {
          // Validate required fields
          if (!row.caseId || !row.teamMember || !row.market || !row.caseDescription) {
            throw new Error(`Row missing required fields: ${row.caseId || 'unknown'}`);
          }

          const caseData: Omit<GDPRCase, 'id' | 'createdAt' | 'updatedAt'> = {
            caseId: row.caseId,
            timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
            teamMember: row.teamMember,
            sourceLink: row.sourceLink || '',
            market: row.market,
            caseDescription: row.caseDescription,
            specificQuestion: row.specificQuestion || undefined,
            urgency: (row.urgency as 'Low' | 'Medium' | 'High') || 'Medium',
            status: 'New',
          };

          await createCase(caseData);
          imported++;
        } catch (err: any) {
          failed++;
          errors.push(`Row ${rows.indexOf(row) + 2}: ${err.message || 'Unknown error'}`);
        }
      }

      setSuccess({ imported, failed, errors });
      if (imported > 0) {
        setTimeout(() => {
          router.push('/cases');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import cases');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Import Cases</h1>
            <p className="text-gray-600 mt-1">Bulk import cases from CSV</p>
          </div>
          <Link
            href="/cases"
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Back to Cases
          </Link>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Instructions
          </h2>
          <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
            <li>Download the CSV template or use your own CSV file</li>
            <li>Required columns: caseId, teamMember, market, caseDescription</li>
            <li>Optional columns: timestamp, sourceLink, specificQuestion, urgency</li>
            <li>Paste your CSV data below and click "Import Cases"</li>
          </ol>
          <button
            onClick={downloadTemplate}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            📥 Download CSV Template
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold">Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {success.imported > 0 && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-semibold">
              ✅ Successfully imported {success.imported} case(s)
            </p>
            {success.failed > 0 && (
              <p className="text-green-700 text-sm mt-1">
                {success.failed} case(s) failed to import
              </p>
            )}
            <p className="text-green-600 text-xs mt-2">Redirecting to cases list...</p>
          </div>
        )}

        {/* CSV Input */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">CSV Data</h2>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Paste your CSV data here..."
            rows={15}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
          />
        </div>

        {/* Errors */}
        {success.errors.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">Import Errors</h3>
            <ul className="space-y-1">
              {success.errors.map((err, idx) => (
                <li key={idx} className="text-sm text-yellow-800">
                  • {err}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/cases"
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            onClick={handleImport}
            disabled={loading || !csvText.trim()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Importing...' : 'Import Cases'}
          </button>
        </div>
      </div>
    </div>
  );
}
