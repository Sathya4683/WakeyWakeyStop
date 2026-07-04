/**
 * Time-of-day helpers for alarm active windows.
 *
 * Windows are stored as minutes since local midnight (0–1439). A window may
 * cross midnight: { start: 1380 (23:00), end: 60 (01:00) } is active from
 * 11 pm to 1 am.
 */

/** Minutes since local midnight, right now. */
export function minutesNow(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Local calendar day key, e.g. "2026-06-12". */
export function todayKey(d: Date = new Date()): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Whether `now` falls inside [start, end), handling midnight wrap. */
export function isWindowActive(start: number, end: number, now: number = minutesNow()): boolean {
  if (start === end) return false; // zero-length window — never active
  if (start < end) return now >= start && now < end;
  // Crosses midnight (e.g. 23:00 → 01:00).
  return now >= start || now < end;
}

/**
 * Minutes from `now` until the window next becomes active (0 if active now).
 */
export function minutesUntilWindow(
  start: number,
  end: number,
  now: number = minutesNow(),
): number {
  if (isWindowActive(start, end, now)) return 0;
  return (start - now + 1440) % 1440;
}

/** "5:00 pm" style label for minutes-since-midnight. */
export function formatMinutes(min: number): string {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ampm = h24 >= 12 ? 'pm' : 'am';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${`${m}`.padStart(2, '0')} ${ampm}`;
}

/** "5–6 pm" / "11 pm–1 am" style label for a window. */
export function formatWindow(start: number, end: number): string {
  return `${formatMinutes(start)} – ${formatMinutes(end)}`;
}

/** Build a Date carrying the given minutes-since-midnight (for time pickers). */
export function minutesToDate(min: number): Date {
  const d = new Date();
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  return d;
}

/** Extract minutes-since-midnight from a Date (from time pickers). */
export function dateToMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}
