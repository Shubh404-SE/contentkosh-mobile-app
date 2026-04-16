export const DEFAULT_ANNOUNCEMENT_END_DAYS = 7;

export function defaultEndDate(days = DEFAULT_ANNOUNCEMENT_END_DAYS): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * Convert ISO or date input to ISO string, or to `datetime-local` slice for inputs.
 */
export function toISODateTime(
  date?: string | Date,
  options?: { format?: 'iso' | 'datetimeLocal' }
): string | undefined {
  if (!date) return undefined;
  const format = options?.format ?? 'iso';

  const asDate = (() => {
    if (date instanceof Date) return date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Date(`${date}T00:00:00.000Z`);
    }
    return new Date(date);
  })();

  if (Number.isNaN(asDate.getTime())) return undefined;

  if (format === 'datetimeLocal') {
    const offsetMs = asDate.getTimezoneOffset() * 60_000;
    return new Date(asDate.getTime() - offsetMs).toISOString().slice(0, 16);
  }

  return asDate.toISOString();
}

export function toggleSetItem<T>(current: Set<T>, item: T): Set<T> {
  const next = new Set(current);
  if (next.has(item)) next.delete(item);
  else next.add(item);
  return next;
}
