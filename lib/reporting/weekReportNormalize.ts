/** Sheet / form placeholders meaning “nothing here” — treat as empty for Firestore & activity log */
export function normalizeWeeklyReportOptionalText(val: string | undefined): string | undefined {
  if (val == null) return undefined;
  const t = val.trim();
  if (!t) return undefined;
  const compact = t.replace(/\s+/g, '');
  if (/^x+$/i.test(compact)) return undefined;
  if (/^[.\-–—_]+$/i.test(t)) return undefined;
  if (/^(n\/?a|n\.a\.?|none|nichts|no|n\/v|nil)$/i.test(t)) return undefined;
  if (t === '×') return undefined;
  return t;
}

export function parseWeeklyReportCount(val: string | undefined): number {
  if (!val) return 0;
  const num = parseInt(String(val).replace(/[^\d]/g, ''), 10);
  return Number.isNaN(num) ? 0 : num;
}
