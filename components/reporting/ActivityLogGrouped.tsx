'use client';

import { useMemo, useState } from 'react';
import type { ActivityLogEntry } from '@/lib/types';
import { groupActivityLogForDisplay, type ActivityLogSection } from '@/lib/reporting/activityLogKinds';

const TONE_STYLES = {
  danger: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    badge: 'bg-red-200 text-red-800',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    badge: 'bg-amber-200 text-amber-900',
  },
  info: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-900',
    badge: 'bg-sky-200 text-sky-900',
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
    badge: 'bg-green-200 text-green-800',
  },
} as const;

function formatDate(date: Date): string {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

function entryBody(entry: ActivityLogEntry): { title?: string; body: string } {
  const raw = (entry.details || '').replace(/^\u2705\s*/, '');
  const t = entry.title?.trim();
  return t ? { title: t, body: raw } : { body: raw };
}

export function ActivityLogGrouped({ activities }: { activities: ActivityLogEntry[] }) {
  const structured = useMemo(() => groupActivityLogForDisplay(activities), [activities]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: ActivityLogSection) => {
    setOpenSections(prev => {
      const open = prev[section] !== false;
      return { ...prev, [section]: !open };
    });
  };

  return (
    <div className="space-y-4">
      {structured.map(({ section, label, icon, tone, totalCount, markets }) => {
        const isOpen = openSections[section] !== false;
        const s = TONE_STYLES[tone];
        return (
          <div key={section} className={`border-2 ${s.border} rounded-lg overflow-hidden`}>
            <button
              type="button"
              onClick={() => toggleSection(section)}
              className={`w-full ${s.bg} px-6 py-4 flex items-center justify-between hover:opacity-90 transition`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <h3 className={`text-lg font-bold ${s.text}`}>{label}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${s.badge}`}>{totalCount}</span>
              </div>
              <span className="text-gray-600 text-xl">{isOpen ? '▼' : '▶'}</span>
            </button>

            {isOpen && (
              <div className="bg-white">
                {markets.map(({ market, entries }) => (
                  <div key={market} className="border-t border-gray-200">
                    <div className="bg-gray-50 px-6 py-3">
                      <span className="font-bold text-gray-900">{market}</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {entries.map(entry => {
                        const { title, body } = entryBody(entry);
                        return (
                          <div key={entry.id} className="px-6 py-4 hover:bg-gray-50 transition">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-20 text-sm text-gray-600">{formatDate(entry.weekOf)}</div>
                              <div className="flex-1 space-y-1">
                                {title && <p className="font-semibold text-gray-900">{title}</p>}
                                <p className="text-gray-800 leading-relaxed text-sm whitespace-pre-wrap">{body}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
