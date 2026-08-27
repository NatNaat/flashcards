/** Local day key (year-month-day, month 0-indexed), stable for grouping "same calendar day" events. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * ISO-8601 week key ("2026-W35"). Weeks start Monday, and the year is the ISO week-year —
 * so the days around New Year group with the week they actually belong to instead of
 * splitting a single week across two keys.
 */
export function weekKey(ts: number): string {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  // Shift to the Thursday of this week: the ISO week-year is whatever year that Thursday is in.
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const isoYear = d.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}
