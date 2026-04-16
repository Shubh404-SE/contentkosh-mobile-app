import { DEFAULT_ANNOUNCEMENT_END_DAYS, defaultEndDate, toISODateTime, toggleSetItem } from '../announcementDate';

describe('announcementDate', () => {
  test('defaultEndDate returns ISO string', () => {
    const iso = defaultEndDate();
    expect(typeof iso).toBe('string');
    expect(() => new Date(iso)).not.toThrow();
  });

  test('defaultEndDate respects provided days', () => {
    const isoA = defaultEndDate(DEFAULT_ANNOUNCEMENT_END_DAYS);
    const isoB = defaultEndDate(DEFAULT_ANNOUNCEMENT_END_DAYS + 1);
    expect(Date.parse(isoB)).toBeGreaterThan(Date.parse(isoA));
  });

  test('toISODateTime returns undefined for invalid values', () => {
    expect(toISODateTime(undefined)).toBeUndefined();
    expect(toISODateTime('not-a-date')).toBeUndefined();
  });

  test('toISODateTime normalizes YYYY-MM-DD strings', () => {
    expect(toISODateTime('2026-01-02')).toBe('2026-01-02T00:00:00.000Z');
  });

  test('toggleSetItem toggles membership immutably', () => {
    const s1 = new Set(['a']);
    const s2 = toggleSetItem(s1, 'b');
    expect(s1.has('b')).toBe(false);
    expect(s2.has('a')).toBe(true);
    expect(s2.has('b')).toBe(true);

    const s3 = toggleSetItem(s2, 'a');
    expect(s3.has('a')).toBe(false);
    expect(s2.has('a')).toBe(true);
  });
});

