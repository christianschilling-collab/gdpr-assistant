/**
 * Canonical rules for weekly market reporting.
 *
 * - **Stored `weekOf`**: always the **Monday** (local date, noon) of the reporting week Mon–Sun.
 * - **Month buckets** (charts, GDPR export, deep dive): calendar month of the **Thursday**
 *   of that same week. So a week Mon 30 Mar – Sun 5 Apr counts as **April** (Thu 2 Apr is in April).
 * - **Submit form**: completed weeks only, as **Monday noon** anchors. `completedWeeksBack === 1` is the
 *   last full Mon–Sun block before the current week; larger values go further back (late submissions).
 */

/** Local noon avoids DST edge cases when adding/subtracting whole days. */
export function atLocalNoon(y: number, month0: number, day: number): Date {
  return new Date(y, month0, day, 12, 0, 0, 0);
}

/** Monday 12:00 local of the Mon–Sun week that contains `ref`. */
export function getMondayOfLocalWeekContaining(ref: Date = new Date()): Date {
  const d = atLocalNoon(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Monday 12:00 local of the week **before** the week that contains `ref`. */
export function getPreviousWeekMonday(ref: Date = new Date()): Date {
  const thisMon = getMondayOfLocalWeekContaining(ref);
  const d = atLocalNoon(thisMon.getFullYear(), thisMon.getMonth(), thisMon.getDate());
  d.setDate(d.getDate() - 7);
  return d;
}

/**
 * Monday 12:00 local of the n-th completed reporting week before the week that contains `fromRef`.
 * `n === 1`: same as {@link getPreviousWeekMonday}. `n === 2`: the week before that, etc.
 */
export function getNthCompletedWeekMonday(fromRef: Date, completedWeeksBack: number): Date {
  let n = Math.floor(Number(completedWeeksBack));
  if (!Number.isFinite(n) || n < 1) n = 1;
  if (n > 52) n = 52;
  const first = getPreviousWeekMonday(fromRef);
  if (n === 1) return first;
  const d = atLocalNoon(first.getFullYear(), first.getMonth(), first.getDate());
  d.setDate(d.getDate() - 7 * (n - 1));
  return d;
}

/** Sunday 12:00 local at end of the Mon–Sun block that starts on `monday`. */
export function getSundayEndOfWeekStartingMonday(monday: Date): Date {
  const d = atLocalNoon(monday.getFullYear(), monday.getMonth(), monday.getDate());
  d.setDate(d.getDate() + 6);
  return d;
}

/** Thursday 12:00 local of the week that starts on `monday` (Mon + 3 days). */
export function getThursdayOfWeekStartingMonday(monday: Date): Date {
  const d = atLocalNoon(monday.getFullYear(), monday.getMonth(), monday.getDate());
  d.setDate(d.getDate() + 3);
  return d;
}

/** `YYYY-MM` for dashboard / export month columns — from week-start Monday, via Thursday. */
export function formatReportingMonthKeyFromWeekOf(weekStartMonday: Date): string {
  const m = weekStartMonday instanceof Date ? weekStartMonday : new Date(weekStartMonday);
  const thu = getThursdayOfWeekStartingMonday(m);
  return `${thu.getFullYear()}-${String(thu.getMonth() + 1).padStart(2, '0')}`;
}

/** Calendar year that owns this week for year filters (same as reporting month’s year). */
export function reportingYearFromWeekOf(weekStartMonday: Date): number {
  return parseInt(formatReportingMonthKeyFromWeekOf(weekStartMonday).slice(0, 4), 10);
}

export function toIsoDateOnly(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

export function parseIsoDateToLocalNoon(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number);
  return atLocalNoon(y, m - 1, day);
}

export function isSameLocalCalendarDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
