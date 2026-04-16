import { toISODateTime } from '../isoDateTime';

describe('isoDateTime', () => {
  test('returns undefined when date is undefined', () => {
    expect(toISODateTime(undefined)).toBeUndefined();
  });

  test('returns ISO string when date provided', () => {
    const d = new Date('2026-04-16T10:00:00.000Z');
    expect(toISODateTime(d)).toBe('2026-04-16T10:00:00.000Z');
  });
});

